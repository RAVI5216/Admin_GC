import express from 'express';
import bcrypt from 'bcrypt';
import { PutCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { USERS_TABLE_NAME, dashboardDynamoDb } from '../db/dynamo.js';
import { requireAuth } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';

let lastGeneratedEmployerId = 0;

const generateTimestampId = () => {
  const timestamp = Date.now();
  lastGeneratedEmployerId = Math.max(timestamp, lastGeneratedEmployerId + 1);
  return String(lastGeneratedEmployerId);
};

const hasEmployerIdPrefix = (value) =>
  typeof value === 'string' && value.trim().toUpperCase().startsWith('EMP-');

export const isEmployerRecord = (user) =>
  Boolean(user) &&
  (hasEmployerIdPrefix(user.employeeId) ||
    (typeof user.role === 'string' && user.role.trim().toLowerCase() === 'employee') ||
    hasEmployerIdPrefix(user.userId));

const toUserResponse = (user) => {
  const safeAttributes = Object.fromEntries(
    Object.entries(user).filter(([key]) => !/(password|secret|token|credential|otp|resetcode)/i.test(key))
  );
  const userId = typeof user.userId === 'string' ? user.userId.trim() : '';

  return {
    ...safeAttributes,
    ...(userId
      ? { employerId: hasEmployerIdPrefix(userId) ? userId : `EMP-${userId}` }
      : {}),
  };
};

const normalizeId = (value) => value.trim().toUpperCase();

const scanExistingIds = async (dynamoDb) => {
  const existingIds = new Set();
  let lastEvaluatedKey;

  do {
    const result = await dynamoDb.send(
      new ScanCommand({
        TableName: USERS_TABLE_NAME,
        ProjectionExpression: '#userId, #employeeId',
        ExpressionAttributeNames: {
          '#userId': 'userId',
          '#employeeId': 'employeeId',
        },
        ConsistentRead: true,
        ...(lastEvaluatedKey ? { ExclusiveStartKey: lastEvaluatedKey } : {}),
      })
    );

    for (const user of result.Items ?? []) {
      if (typeof user.userId === 'string') existingIds.add(normalizeId(user.userId));
      if (typeof user.employeeId === 'string') existingIds.add(normalizeId(user.employeeId));
    }
    lastEvaluatedKey = result.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  return existingIds;
};

const generateUniqueIds = async (dynamoDb, generateId) => {
  const existingIds = await scanExistingIds(dynamoDb);
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const userId = `EMP-${generateId()}`;
    const employeeId = `EMP-${generateId()}`;
    if (
      !existingIds.has(normalizeId(userId)) &&
      !existingIds.has(normalizeId(employeeId)) &&
      normalizeId(userId) !== normalizeId(employeeId)
    ) {
      return { userId, employeeId };
    }
  }
  throw new Error('Unable to generate unique employer IDs');
};

export const createEmployerRouter = ({
  dynamoDb = dashboardDynamoDb,
  hashPassword = (password) => bcrypt.hash(password, 10),
  generateId = generateTimestampId,
  now = () => new Date(),
} = {}) => {
  const router = express.Router();

  router.use(requireAuth);

  router.get('/', async (req, res) => {
    try {
      const users = [];
      let lastEvaluatedKey;

      do {
        const result = await dynamoDb.send(
          new ScanCommand({
            TableName: USERS_TABLE_NAME,
            ...(lastEvaluatedKey ? { ExclusiveStartKey: lastEvaluatedKey } : {}),
          })
        );
        users.push(...(result.Items ?? []));
        lastEvaluatedKey = result.LastEvaluatedKey;
      } while (lastEvaluatedKey);

      res.json(users.filter(isEmployerRecord).map(toUserResponse));
    } catch (error) {
      logger.error('Unable to load employer users from DynamoDB', error instanceof Error ? error.message : String(error));
      res.status(500).json({ error: 'Unable to load employer users' });
    }
  });

  router.post('/ids', async (req, res) => {
    try {
      return res.json(await generateUniqueIds(dynamoDb, generateId));
    } catch (error) {
      logger.error(
        'Unable to generate unique employer IDs',
        error instanceof Error ? error.message : String(error)
      );
      return res.status(500).json({ error: 'Unable to generate unique employer IDs' });
    }
  });

  router.post('/', async (req, res) => {
    const userId = typeof req.body?.userId === 'string' ? req.body.userId.trim() : '';
    const employeeId = typeof req.body?.employeeId === 'string' ? req.body.employeeId.trim() : '';
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    const email = typeof req.body?.email === 'string' ? req.body.email.trim() : '';
    const phone = typeof req.body?.phone === 'string' ? req.body.phone.trim() : '';
    const department = typeof req.body?.department === 'string' ? req.body.department.trim() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    if (!userId || !employeeId || !name || !email || !password) {
      return res.status(400).json({
        error: 'userId, employeeId, name, email, and password are required',
      });
    }
    if (!hasEmployerIdPrefix(userId) || !hasEmployerIdPrefix(employeeId)) {
      return res.status(400).json({ error: 'Employer IDs must start with EMP-' });
    }
    if (normalizeId(userId) === normalizeId(employeeId)) {
      return res.status(400).json({ error: 'User ID and Employee ID must be different' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'A valid email address is required' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    try {
      const existingIds = await scanExistingIds(dynamoDb);
      if (existingIds.has(normalizeId(userId)) || existingIds.has(normalizeId(employeeId))) {
        return res.status(409).json({
          error: 'A generated ID is already in use. Generate new IDs and try again.',
        });
      }

      const passwordHash = await hashPassword(password);
      const employer = {
        userId,
        employeeId,
        name,
        email,
        role: 'employee',
        createdAt: now().toISOString(),
        passwordHash,
        ...(phone ? { phone } : {}),
        ...(department ? { department } : {}),
      };

      await dynamoDb.send(
        new PutCommand({
          TableName: USERS_TABLE_NAME,
          Item: employer,
          ConditionExpression: 'attribute_not_exists(userId)',
        })
      );

      return res.status(201).json(toUserResponse(employer));
    } catch (error) {
      if (error?.name === 'ConditionalCheckFailedException') {
        return res.status(409).json({ error: 'A user with this userId already exists' });
      }
      logger.error(
        'Unable to create employer user in DynamoDB',
        error instanceof Error ? error.message : String(error)
      );
      return res.status(500).json({ error: 'Unable to create employer user' });
    }
  });

  return router;
};
