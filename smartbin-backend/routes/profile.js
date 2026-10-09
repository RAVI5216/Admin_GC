import express from 'express';
import bcrypt from 'bcrypt';
import {
  GetCommand,
  PutCommand,
  TransactWriteCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import {
  DASH_ADMIN_TABLE_NAME,
  dashboardDynamoDb,
  scanDashboardItems,
} from '../db/dynamo.js';
import { logger } from '../utils/logger.js';
import { requireAuth, signToken } from '../middleware/auth.js';

const PROFILE_ID = 'collector_profile';

const listAdminAccounts = async (dynamoDb) => {
  return scanDashboardItems(dynamoDb, {
    TableName: DASH_ADMIN_TABLE_NAME,
    FilterExpression: '#recordType = :admin',
    ExpressionAttributeNames: { '#recordType': 'recordType' },
    ExpressionAttributeValues: { ':admin': 'admin' },
  });
};

const findAccountByEmail = async (dynamoDb, email) => {
  const result = await dynamoDb.send(
    new GetCommand({ TableName: DASH_ADMIN_TABLE_NAME, Key: { email } })
  );
  return result.Item?.recordType === 'admin' ? result.Item : null;
};

const toProfileResponse = (account) => ({
  collectorName: account.collectorName ?? account.name ?? '',
  role: account.profileRole ?? 'Admin',
  email: account.email,
  phone: account.phone ?? '',
  avatar: account.avatar ?? null,
});

export const createProfileRouter = ({ dynamoDb = dashboardDynamoDb } = {}) => {
  const router = express.Router();

  router.get('/', requireAuth, async (req, res) => {
    try {
      // Use the authenticated user's email from the JWT
      const account = await findAccountByEmail(dynamoDb, req.adminUser.email);
      if (!account) {
        return res.status(404).json({ error: 'No dashboard admin profile is configured' });
      }
      return res.json(toProfileResponse(account));
    } catch (error) {
      logger.error('Unable to load dashboard profile', error instanceof Error ? error.message : String(error));
      return res.status(500).json({ error: 'Unable to load profile data' });
    }
  });

  router.put('/', requireAuth, async (req, res) => {
    const collectorName =
      typeof req.body?.collectorName === 'string' ? req.body.collectorName.trim() : '';
    const role = typeof req.body?.role === 'string' ? req.body.role.trim() : '';
    const email = typeof req.body?.email === 'string' ? req.body.email.trim() : '';
    const phone = typeof req.body?.phone === 'string' ? req.body.phone.trim() : '';
    const avatar =
      typeof req.body?.avatar === 'string' || req.body?.avatar === null ? req.body.avatar : null;
    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    if (!collectorName || !role || !email || !phone) {
      return res.status(400).json({ error: 'collectorName, role, email, and phone are required' });
    }

    try {
      const account = await findAccountByEmail(dynamoDb, req.adminUser.email);
      if (!account) {
        return res.status(404).json({ error: 'No dashboard admin profile is configured' });
      }

      const emailChanged = email !== account.email;
      if (emailChanged) {
        const accounts = await listAdminAccounts(dynamoDb);
        const duplicateEmail = accounts.some(
          (candidate) =>
            candidate.email !== account.email &&
            typeof candidate.email === 'string' &&
            candidate.email.toLowerCase() === email.toLowerCase()
        );
        if (duplicateEmail) {
          return res.status(409).json({ error: 'Another admin account already uses this email' });
        }
      }

      const passwordHash = password ? await bcrypt.hash(password, 10) : account.passwordHash;
      const updatedAccount = {
        ...account,
        email,
        name: collectorName,
        collectorName,
        profileId: PROFILE_ID,
        profileRole: role,
        phone,
        avatar,
        ...(passwordHash ? { passwordHash } : {}),
      };
      if (emailChanged) {
        delete updatedAccount.passwordResetCodeHash;
        delete updatedAccount.passwordResetExpiresAt;
        delete updatedAccount.passwordResetAttempts;
        delete updatedAccount.passwordResetRequestedAt;
      }

      if (emailChanged) {
        const existingAtNewEmail = await dynamoDb.send(
          new GetCommand({
            TableName: DASH_ADMIN_TABLE_NAME,
            Key: { email },
          })
        );
        if (existingAtNewEmail.Item) {
          return res.status(409).json({ error: 'An account already uses this email' });
        }
        await dynamoDb.send(
          new TransactWriteCommand({
            TransactItems: [
              {
                Put: {
                  TableName: DASH_ADMIN_TABLE_NAME,
                  Item: updatedAccount,
                  ConditionExpression: 'attribute_not_exists(email)',
                },
              },
              {
                Delete: {
                  TableName: DASH_ADMIN_TABLE_NAME,
                  Key: { email: account.email },
                  ConditionExpression: '#recordType = :admin',
                  ExpressionAttributeNames: { '#recordType': 'recordType' },
                  ExpressionAttributeValues: { ':admin': 'admin' },
                },
              },
            ],
          })
        );
      } else {
        await dynamoDb.send(
          new UpdateCommand({
            TableName: DASH_ADMIN_TABLE_NAME,
            Key: { email: account.email },
            UpdateExpression:
              'SET #name = :name, collectorName = :collectorName, profileId = :profileId, profileRole = :profileRole, phone = :phone, avatar = :avatar' +
              (passwordHash ? ', passwordHash = :passwordHash' : ''),
            ConditionExpression: '#recordType = :admin',
            ExpressionAttributeNames: {
              '#name': 'name',
              '#recordType': 'recordType',
            },
            ExpressionAttributeValues: {
              ':name': collectorName,
              ':collectorName': collectorName,
              ':profileId': PROFILE_ID,
              ':profileRole': role,
              ':phone': phone,
              ':avatar': avatar,
              ':admin': 'admin',
              ...(passwordHash ? { ':passwordHash': passwordHash } : {}),
            },
          })
        );
      }

      const response = toProfileResponse(updatedAccount);
      if (emailChanged) {
        response.token = signToken({
          email: updatedAccount.email,
          name: updatedAccount.name ?? updatedAccount.collectorName ?? '',
        });
      }
      return res.json(response);
    } catch (error) {
      logger.error('Unable to save dashboard profile', error instanceof Error ? error.message : String(error));
      return res.status(500).json({ error: 'Unable to save profile data' });
    }
  });

  return router;
};
