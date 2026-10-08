import express from 'express';
import bcrypt from 'bcrypt';
import nodemailer from 'nodemailer';
import { randomInt } from 'crypto';
import { getDb } from '../db/mongo.js';
import { logger } from '../utils/logger.js';

const RESET_CODE_TTL_MS = 10 * 60 * 1000;
const RESET_REQUEST_COOLDOWN_MS = 60 * 1000;
const MAX_RESET_ATTEMPTS = 5;
const GENERIC_RESET_RESPONSE = 'If the email belongs to an admin account, a reset code will be sent.';

const getResetMailer = () => {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD } = process.env;
  const port = Number(SMTP_PORT);
  if (!SMTP_HOST || !Number.isInteger(port) || !SMTP_USER || !SMTP_PASSWORD) {
    return null;
  }

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASSWORD },
  });
};

const findAdminByEmail = async (collection, email) => {
  const exactMatch = await collection.findOne({ email });
  if (exactMatch) {
    return exactMatch;
  }

  const caseInsensitiveMatches = await collection
    .find({ email }, { collation: { locale: 'en', strength: 2 } })
    .limit(2)
    .toArray();
  return caseInsensitiveMatches.length === 1 ? caseInsensitiveMatches[0] : null;
};

export const createAuthRouter = () => {
  const router = express.Router();

  router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    try {
      const user = await getDb().collection('adminUsers').findOne({ email });
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

      return res.json({ email: user.email, name: user.name });
    } catch (error) {
      return res.status(500).json({ error: 'Login failed' });
    }
  });

  router.post('/forgot-password', async (req, res) => {
    const email = typeof req.body.email === 'string' ? req.body.email.trim() : '';
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const mailer = getResetMailer();
    if (!mailer) {
      return res.status(503).json({ error: 'Password reset email is not configured on the backend' });
    }

    try {
      const collection = getDb().collection('adminUsers');
      const user = await findAdminByEmail(collection, email);

      if (!user) {
        return res.json({ message: GENERIC_RESET_RESPONSE });
      }

      const now = new Date();
      const lastRequest = user.passwordResetRequestedAt
        ? new Date(user.passwordResetRequestedAt).getTime()
        : 0;
      if (Number.isFinite(lastRequest) && now.getTime() - lastRequest < RESET_REQUEST_COOLDOWN_MS) {
        return res.json({ message: GENERIC_RESET_RESPONSE });
      }

      const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
      const codeHash = await bcrypt.hash(code, 10);
      const expiresAt = new Date(now.getTime() + RESET_CODE_TTL_MS);
      await collection.updateOne(
        { _id: user._id },
        {
          $set: {
            passwordResetCodeHash: codeHash,
            passwordResetExpiresAt: expiresAt,
            passwordResetAttempts: 0,
            passwordResetRequestedAt: now,
          },
        }
      );

      try {
        await mailer.sendMail({
          from: process.env.SMTP_FROM || process.env.SMTP_USER,
          to: user.email,
          subject: 'GarbageGuardian password reset code',
          text: `Your GarbageGuardian password reset code is ${code}. It expires in 10 minutes. If you did not request this, ignore this email.`,
        });
      } catch (error) {
        await collection.updateOne(
          { _id: user._id, passwordResetCodeHash: codeHash },
          {
            $unset: {
              passwordResetCodeHash: '',
              passwordResetExpiresAt: '',
              passwordResetAttempts: '',
              passwordResetRequestedAt: '',
            },
          }
        );
        logger.error('Unable to send password reset email', error instanceof Error ? error.message : String(error));
        return res.status(502).json({ error: 'Unable to send the reset email. Check the backend SMTP configuration and try again.' });
      }

      return res.json({ message: GENERIC_RESET_RESPONSE });
    } catch (error) {
      logger.error('Unable to initiate password reset', error instanceof Error ? error.message : String(error));
      return res.status(500).json({ error: 'Unable to start password reset' });
    }
  });

  router.post('/reset-password', async (req, res) => {
    const email = typeof req.body.email === 'string' ? req.body.email.trim() : '';
    const code = typeof req.body.code === 'string' ? req.body.code.trim() : '';
    const password = typeof req.body.password === 'string' ? req.body.password : '';
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
      const collection = getDb().collection('adminUsers');
      const user = await findAdminByEmail(collection, email);
      const expiresAt = user?.passwordResetExpiresAt
        ? new Date(user.passwordResetExpiresAt).getTime()
        : 0;
      if (
        !user?.passwordResetCodeHash ||
        !Number.isFinite(expiresAt) ||
        expiresAt <= Date.now() ||
        user.passwordResetAttempts >= MAX_RESET_ATTEMPTS
      ) {
        return res.status(400).json({ error: 'Invalid or expired reset code. Request a new code.' });
      }

      const matches = await bcrypt.compare(code, user.passwordResetCodeHash);
      if (!matches) {
        await collection.updateOne(
          {
            _id: user._id,
            passwordResetCodeHash: user.passwordResetCodeHash,
            passwordResetAttempts: { $lt: MAX_RESET_ATTEMPTS },
          },
          { $inc: { passwordResetAttempts: 1 } }
        );
        return res.status(400).json({ error: 'Invalid or expired reset code. Request a new code.' });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const result = await collection.updateOne(
        {
          _id: user._id,
          passwordResetCodeHash: user.passwordResetCodeHash,
          passwordResetExpiresAt: { $gt: new Date() },
          passwordResetAttempts: { $lt: MAX_RESET_ATTEMPTS },
        },
        {
          $set: { passwordHash },
          $unset: {
            passwordResetCodeHash: '',
            passwordResetExpiresAt: '',
            passwordResetAttempts: '',
            passwordResetRequestedAt: '',
          },
        }
      );
      if (result.modifiedCount !== 1) {
        return res.status(400).json({ error: 'Invalid or expired reset code. Request a new code.' });
      }

      return res.json({ message: 'Password updated. You can now sign in.' });
    } catch (error) {
      logger.error('Unable to reset password', error instanceof Error ? error.message : String(error));
      return res.status(500).json({ error: 'Unable to reset password' });
    }
  });

  return router;
};
