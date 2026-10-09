import express from 'express';
import bcrypt from 'bcrypt';
import nodemailer from 'nodemailer';
import { randomInt } from 'crypto';
import { GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import {
  DASH_ADMIN_TABLE_NAME,
  dashboardDynamoDb,
  scanDashboardItems,
} from '../db/dynamo.js';
import { logger } from '../utils/logger.js';
import { signToken } from '../middleware/auth.js';

const RESET_CODE_TTL_MS = 10 * 60 * 1000;
const RESET_REQUEST_COOLDOWN_MS = 60 * 1000;
const MAX_RESET_ATTEMPTS = 5;
const LOGIN_CODE_TTL_MS = 10 * 60 * 1000;
const LOGIN_REQUEST_COOLDOWN_MS = 60 * 1000;
const MAX_LOGIN_ATTEMPTS = 5;
const GENERIC_RESET_RESPONSE = 'If the email belongs to an admin account, a reset code will be sent.';

const isConfiguredValue = (value) =>
  typeof value === 'string' &&
  value.trim().length > 0 &&
  !/^<[^>]+>$/.test(value.trim()) &&
  !/^(your\b|replace\b|placeholder\b)/i.test(value.trim());

const getMailDeliveryErrorMessage = (error, purpose) => {
  if (error?.code === 'EAUTH' || error?.responseCode === 535) {
    return 'The SMTP server rejected the configured email credentials. Check SMTP_USER and SMTP_PASSWORD; for Gmail, use a valid App Password. Restart the backend after updating .env.';
  }
  return `Unable to send the ${purpose} email. Check SMTP connectivity and backend email settings, then try again.`;
};

const getResetMailer = () => {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD } = process.env;
  const port = Number(SMTP_PORT);
  if (
    !isConfiguredValue(SMTP_HOST) ||
    !Number.isInteger(port) ||
    port <= 0 ||
    !isConfiguredValue(SMTP_USER) ||
    !isConfiguredValue(SMTP_PASSWORD)
  ) {
    return null;
  }

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASSWORD },
  });
};

const findAdminByEmail = async (dynamoDb, email) => {
  const exact = await dynamoDb.send(
    new GetCommand({
      TableName: DASH_ADMIN_TABLE_NAME,
      Key: { email },
    })
  );
  if (exact.Item?.recordType === 'admin') {
    return exact.Item;
  }

  const accounts = await scanDashboardItems(dynamoDb, {
    TableName: DASH_ADMIN_TABLE_NAME,
    FilterExpression: '#recordType = :admin',
    ExpressionAttributeNames: { '#recordType': 'recordType' },
    ExpressionAttributeValues: { ':admin': 'admin' },
  });
  const matches = accounts.filter(
    (item) =>
      typeof item.email === 'string' &&
      item.email.toLowerCase() === email.toLowerCase()
  );

  return matches.length === 1 ? matches[0] : null;
};

const clearResetFields = async (dynamoDb, email, codeHash) =>
  dynamoDb.send(
    new UpdateCommand({
      TableName: DASH_ADMIN_TABLE_NAME,
      Key: { email },
      UpdateExpression:
        'REMOVE passwordResetCodeHash, passwordResetExpiresAt, passwordResetAttempts, passwordResetRequestedAt',
      ConditionExpression: 'passwordResetCodeHash = :codeHash',
      ExpressionAttributeValues: { ':codeHash': codeHash },
    })
  );

const clearLoginFields = async (dynamoDb, email, codeHash) =>
  dynamoDb.send(
    new UpdateCommand({
      TableName: DASH_ADMIN_TABLE_NAME,
      Key: { email },
      UpdateExpression:
        'REMOVE loginOtpCodeHash, loginOtpExpiresAt, loginOtpAttempts, loginOtpRequestedAt',
      ConditionExpression: 'loginOtpCodeHash = :codeHash',
      ExpressionAttributeValues: { ':codeHash': codeHash },
    })
  );

export const createAuthRouter = ({
  dynamoDb = dashboardDynamoDb,
  now = () => new Date(),
  createMailer = getResetMailer,
  generateCode = () => String(randomInt(0, 1_000_000)).padStart(6, '0'),
} = {}) => {
  const router = express.Router();

  router.post('/login', async (req, res) => {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    try {
      const user = await findAdminByEmail(dynamoDb, email);
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      if (typeof user.passwordHash !== 'string' || !user.passwordHash) {
        return res.status(401).json({ error: 'Admin password is not set. Use Forgot password to set one.' });
      }

      const isMatch = await bcrypt.compare(password, user.passwordHash);
      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const mailer = createMailer();
      if (!mailer) {
        return res.status(503).json({
          error: 'Email delivery is not configured. Set real SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASSWORD values in the backend .env, then restart the backend.',
        });
      }

      const currentTime = now();
      const lastRequest = user.loginOtpRequestedAt
        ? new Date(user.loginOtpRequestedAt).getTime()
        : 0;
      if (
        Number.isFinite(lastRequest) &&
        currentTime.getTime() - lastRequest < LOGIN_REQUEST_COOLDOWN_MS
      ) {
        return res.json({
          otpRequired: true,
          email: user.email,
          message: 'A login verification code was recently sent to your email.',
        });
      }

      const code = generateCode();
      const codeHash = await bcrypt.hash(code, 10);
      const expiresAt = new Date(currentTime.getTime() + LOGIN_CODE_TTL_MS).toISOString();
      await dynamoDb.send(
        new UpdateCommand({
          TableName: DASH_ADMIN_TABLE_NAME,
          Key: { email: user.email },
          UpdateExpression:
            'SET loginOtpCodeHash = :codeHash, loginOtpExpiresAt = :expiresAt, loginOtpAttempts = :zero, loginOtpRequestedAt = :requestedAt',
          ConditionExpression:
            'recordType = :admin AND passwordHash = :passwordHash AND (attribute_not_exists(loginOtpRequestedAt) OR loginOtpRequestedAt <= :cooldownBefore)',
          ExpressionAttributeValues: {
            ':codeHash': codeHash,
            ':expiresAt': expiresAt,
            ':zero': 0,
            ':requestedAt': currentTime.toISOString(),
            ':admin': 'admin',
            ':passwordHash': user.passwordHash,
            ':cooldownBefore': new Date(currentTime.getTime() - LOGIN_REQUEST_COOLDOWN_MS).toISOString(),
          },
        })
      );

      try {
        await mailer.sendMail({
          from: process.env.SMTP_FROM || process.env.SMTP_USER,
          to: user.email,
          subject: 'GarbageGuardian login verification code',
          text: `Your GarbageGuardian login verification code is ${code}. It expires in 10 minutes. If you did not attempt to sign in, secure your account by changing your password.`,
        });
      } catch (error) {
        try {
          await clearLoginFields(dynamoDb, user.email, codeHash);
        } catch (clearError) {
          logger.error(
            'Unable to clear unsent login verification code',
            clearError instanceof Error ? clearError.message : String(clearError)
          );
        }
        logger.error(
          'Unable to send login verification email',
          error instanceof Error ? error.message : String(error)
        );
        return res.status(502).json({
          error: getMailDeliveryErrorMessage(error, 'login verification'),
        });
      }

      return res.json({
        otpRequired: true,
        email: user.email,
        message: 'A login verification code was sent to your email.',
      });
    } catch (error) {
      logger.error('Login failed', error instanceof Error ? error.message : String(error));
      return res.status(500).json({ error: 'Login failed' });
    }
  });

  router.post('/verify-login-otp', async (req, res) => {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim() : '';
    const code = typeof req.body?.code === 'string' ? req.body.code.trim() : '';
    if (!email || !code) {
      return res.status(400).json({ error: 'Email and login verification code are required' });
    }
    if (!/^\d{6}$/.test(code)) {
      return res.status(400).json({ error: 'Enter the six-digit login verification code' });
    }

    try {
      const user = await findAdminByEmail(dynamoDb, email);
      const expiresAt = user?.loginOtpExpiresAt
        ? new Date(user.loginOtpExpiresAt).getTime()
        : 0;
      if (
        !user?.loginOtpCodeHash ||
        !Number.isFinite(expiresAt) ||
        expiresAt <= now().getTime() ||
        user.loginOtpAttempts >= MAX_LOGIN_ATTEMPTS
      ) {
        return res.status(400).json({ error: 'Invalid or expired login code. Sign in again to request a new code.' });
      }

      const matches = await bcrypt.compare(code, user.loginOtpCodeHash);
      if (!matches) {
        try {
          await dynamoDb.send(
            new UpdateCommand({
              TableName: DASH_ADMIN_TABLE_NAME,
              Key: { email: user.email },
              UpdateExpression:
                'SET loginOtpAttempts = if_not_exists(loginOtpAttempts, :zero) + :one',
              ConditionExpression:
                'loginOtpCodeHash = :codeHash AND loginOtpExpiresAt > :now AND (attribute_not_exists(loginOtpAttempts) OR loginOtpAttempts < :maxAttempts)',
              ExpressionAttributeValues: {
                ':zero': 0,
                ':one': 1,
                ':codeHash': user.loginOtpCodeHash,
                ':now': now().toISOString(),
                ':maxAttempts': MAX_LOGIN_ATTEMPTS,
              },
            })
          );
        } catch (error) {
          if (error?.name !== 'ConditionalCheckFailedException') throw error;
        }
        return res.status(400).json({ error: 'Invalid or expired login code. Sign in again to request a new code.' });
      }

      await dynamoDb.send(
        new UpdateCommand({
          TableName: DASH_ADMIN_TABLE_NAME,
          Key: { email: user.email },
          UpdateExpression:
            'REMOVE loginOtpCodeHash, loginOtpExpiresAt, loginOtpAttempts, loginOtpRequestedAt',
          ConditionExpression:
            'loginOtpCodeHash = :codeHash AND loginOtpExpiresAt > :now AND (attribute_not_exists(loginOtpAttempts) OR loginOtpAttempts < :maxAttempts)',
          ExpressionAttributeValues: {
            ':codeHash': user.loginOtpCodeHash,
            ':now': now().toISOString(),
            ':maxAttempts': MAX_LOGIN_ATTEMPTS,
          },
        })
      );

      const token = signToken({ email: user.email, name: user.name ?? user.collectorName ?? '' });
      return res.json({ email: user.email, name: user.name ?? user.collectorName ?? '', token });
    } catch (error) {
      if (error?.name === 'ConditionalCheckFailedException') {
        return res.status(400).json({ error: 'Invalid or expired login code. Sign in again to request a new code.' });
      }
      logger.error(
        'Unable to verify login code',
        error instanceof Error ? error.message : String(error)
      );
      return res.status(500).json({ error: 'Unable to verify login code' });
    }
  });

  router.post('/forgot-password', async (req, res) => {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim() : '';
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const mailer = getResetMailer();
    if (!mailer) {
      return res.status(503).json({
        error: 'Email delivery is not configured. Set real SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASSWORD values in the backend .env, then restart the backend.',
      });
    }

    try {
      const user = await findAdminByEmail(dynamoDb, email);
      if (!user) {
        return res.json({ message: GENERIC_RESET_RESPONSE });
      }

      const currentTime = now();
      const lastRequest = user.passwordResetRequestedAt
        ? new Date(user.passwordResetRequestedAt).getTime()
        : 0;
      if (
        Number.isFinite(lastRequest) &&
        currentTime.getTime() - lastRequest < RESET_REQUEST_COOLDOWN_MS
      ) {
        return res.json({ message: GENERIC_RESET_RESPONSE });
      }

      const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
      const codeHash = await bcrypt.hash(code, 10);
      const expiresAt = new Date(currentTime.getTime() + RESET_CODE_TTL_MS).toISOString();
      await dynamoDb.send(
        new UpdateCommand({
          TableName: DASH_ADMIN_TABLE_NAME,
          Key: { email: user.email },
          UpdateExpression:
            'SET passwordResetCodeHash = :codeHash, passwordResetExpiresAt = :expiresAt, passwordResetAttempts = :zero, passwordResetRequestedAt = :requestedAt',
          ConditionExpression: 'recordType = :admin',
          ExpressionAttributeValues: {
            ':codeHash': codeHash,
            ':expiresAt': expiresAt,
            ':zero': 0,
            ':requestedAt': currentTime.toISOString(),
            ':admin': 'admin',
          },
        })
      );

      try {
        await mailer.sendMail({
          from: process.env.SMTP_FROM || process.env.SMTP_USER,
          to: user.email,
          subject: 'GarbageGuardian password reset code',
          text: `Your GarbageGuardian password reset code is ${code}. It expires in 10 minutes. If you did not request this, ignore this email.`,
        });
      } catch (error) {
        try {
          await clearResetFields(dynamoDb, user.email, codeHash);
        } catch (clearError) {
          logger.error(
            'Unable to clear unsent password reset code',
            clearError instanceof Error ? clearError.message : String(clearError)
          );
        }
        logger.error('Unable to send password reset email', error instanceof Error ? error.message : String(error));
        return res.status(502).json({
          error: getMailDeliveryErrorMessage(error, 'password reset'),
        });
      }

      return res.json({ message: GENERIC_RESET_RESPONSE });
    } catch (error) {
      logger.error('Unable to initiate password reset', error instanceof Error ? error.message : String(error));
      return res.status(500).json({ error: 'Unable to start password reset' });
    }
  });

  router.post('/reset-password', async (req, res) => {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim() : '';
    const code = typeof req.body?.code === 'string' ? req.body.code.trim() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    if (!email || !code || !password) {
      return res.status(400).json({ error: 'Email, reset code, and new password are required' });
    }
    if (!/^\d{6}$/.test(code)) {
      return res.status(400).json({ error: 'Enter the six-digit reset code' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    try {
      const user = await findAdminByEmail(dynamoDb, email);
      const expiresAt = user?.passwordResetExpiresAt
        ? new Date(user.passwordResetExpiresAt).getTime()
        : 0;
      if (
        !user?.passwordResetCodeHash ||
        !Number.isFinite(expiresAt) ||
        expiresAt <= now().getTime() ||
        user.passwordResetAttempts >= MAX_RESET_ATTEMPTS
      ) {
        return res.status(400).json({ error: 'Invalid or expired reset code. Request a new code.' });
      }

      const matches = await bcrypt.compare(code, user.passwordResetCodeHash);
      if (!matches) {
        try {
          await dynamoDb.send(
            new UpdateCommand({
              TableName: DASH_ADMIN_TABLE_NAME,
              Key: { email: user.email },
              UpdateExpression:
                'SET passwordResetAttempts = if_not_exists(passwordResetAttempts, :zero) + :one',
              ConditionExpression:
                'passwordResetCodeHash = :codeHash AND passwordResetExpiresAt > :now AND (attribute_not_exists(passwordResetAttempts) OR passwordResetAttempts < :maxAttempts)',
              ExpressionAttributeValues: {
                ':zero': 0,
                ':one': 1,
                ':codeHash': user.passwordResetCodeHash,
                ':now': now().toISOString(),
                ':maxAttempts': MAX_RESET_ATTEMPTS,
              },
            })
          );
        } catch (error) {
          if (error?.name !== 'ConditionalCheckFailedException') throw error;
        }
        return res.status(400).json({ error: 'Invalid or expired reset code. Request a new code.' });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      await dynamoDb.send(
        new UpdateCommand({
          TableName: DASH_ADMIN_TABLE_NAME,
          Key: { email: user.email },
          UpdateExpression:
            'SET passwordHash = :passwordHash REMOVE passwordResetCodeHash, passwordResetExpiresAt, passwordResetAttempts, passwordResetRequestedAt',
          ConditionExpression:
            'passwordResetCodeHash = :codeHash AND passwordResetExpiresAt > :now AND (attribute_not_exists(passwordResetAttempts) OR passwordResetAttempts < :maxAttempts)',
          ExpressionAttributeValues: {
            ':passwordHash': passwordHash,
            ':codeHash': user.passwordResetCodeHash,
            ':now': now().toISOString(),
            ':maxAttempts': MAX_RESET_ATTEMPTS,
          },
        })
      );

      return res.json({ message: 'Password updated. You can now sign in.' });
    } catch (error) {
      if (error?.name === 'ConditionalCheckFailedException') {
        return res.status(400).json({ error: 'Invalid or expired reset code. Request a new code.' });
      }
      logger.error('Unable to reset password', error instanceof Error ? error.message : String(error));
      return res.status(500).json({ error: 'Unable to reset password' });
    }
  });

  return router;
};
