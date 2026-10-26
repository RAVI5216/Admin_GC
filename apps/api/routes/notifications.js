import { randomUUID } from 'crypto';
import express from 'express';
import {
  GetCommand,
  PutCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import {
  DASH_ADMIN_TABLE_NAME,
  dashboardDynamoDb,
  scanDashboardItems,
} from '../db/dynamo.js';
import { logger } from '../utils/logger.js';

const NOTIFICATION_KEY_PREFIX = 'NOTIFICATION#';

const toNotificationResponse = (item) => {
  const { email, recordType, notificationId, ...notification } = item;
  return { ...notification, _id: notificationId };
};

export const createNotificationsRouter = ({
  dynamoDb = dashboardDynamoDb,
  generateNotificationId = randomUUID,
  now = () => new Date(),
} = {}) => {
  const router = express.Router();

  router.get('/', async (req, res) => {
    try {
      const items = await scanDashboardItems(dynamoDb, {
        TableName: DASH_ADMIN_TABLE_NAME,
        FilterExpression: '#recordType = :notification',
        ExpressionAttributeNames: { '#recordType': 'recordType' },
        ExpressionAttributeValues: { ':notification': 'notification' },
      });
      items.sort((left, right) => String(right.createdAt ?? '').localeCompare(String(left.createdAt ?? '')));
      return res.json(items.map(toNotificationResponse));
    } catch (error) {
      logger.error(
        'Unable to load notifications from DynamoDB',
        error instanceof Error ? error.message : String(error)
      );
      return res.status(500).json({ error: 'Unable to load notifications' });
    }
  });

  router.post('/', async (req, res) => {
    const { title, message, severity = 'warning', time, solved = false, problemSolved = false } = req.body ?? {};
    if (typeof title !== 'string' || !title.trim() || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'title and message are required' });
    }

    const notificationId = generateNotificationId();
    const createdAt = now().toISOString();
    const notification = {
      notificationId,
      recordType: 'notification',
      title: title.trim(),
      message: message.trim(),
      severity,
      solved: Boolean(solved),
      problemSolved: Boolean(problemSolved),
      time: time || createdAt,
      deviceId: req.body.deviceId ?? null,
      location: req.body.location ?? null,
      createdAt,
      updatedAt: null,
    };

    try {
      await dynamoDb.send(
        new PutCommand({
          TableName: DASH_ADMIN_TABLE_NAME,
          Item: {
            ...notification,
            email: `${NOTIFICATION_KEY_PREFIX}${notificationId}`,
          },
          ConditionExpression: 'attribute_not_exists(email)',
        })
      );
      return res.status(201).json({ ...notification, _id: notificationId });
    } catch (error) {
      logger.error(
        'Unable to create notification in DynamoDB',
        error instanceof Error ? error.message : String(error)
      );
      return res.status(500).json({ error: 'Unable to create notification' });
    }
  });

  router.put('/:id', async (req, res) => {
    const updates = {};
    if (typeof req.body?.solved === 'boolean') updates.solved = req.body.solved;
    if (typeof req.body?.problemSolved === 'boolean') {
      updates.problemSolved = req.body.problemSolved;
    }
    if (!Object.keys(updates).length) {
      return res.status(400).json({ error: 'At least one of solved or problemSolved must be provided' });
    }

    const notificationId = req.params.id;
    const key = `${NOTIFICATION_KEY_PREFIX}${notificationId}`;
    try {
      const { Item } = await dynamoDb.send(
        new GetCommand({
          TableName: DASH_ADMIN_TABLE_NAME,
          Key: { email: key },
        })
      );
      if (Item?.recordType !== 'notification') {
        return res.status(404).json({ error: 'Notification not found' });
      }

      const updatedAt = now().toISOString();
      const names = { '#recordType': 'recordType', '#updatedAt': 'updatedAt' };
      const values = { ':notification': 'notification', ':updatedAt': updatedAt };
      const setExpressions = ['#updatedAt = :updatedAt'];
      for (const [field, value] of Object.entries(updates)) {
        const nameToken = `#${field}`;
        const valueToken = `:${field}`;
        names[nameToken] = field;
        values[valueToken] = value;
        setExpressions.push(`${nameToken} = ${valueToken}`);
      }

      const result = await dynamoDb.send(
        new UpdateCommand({
          TableName: DASH_ADMIN_TABLE_NAME,
          Key: { email: key },
          UpdateExpression: `SET ${setExpressions.join(', ')}`,
          ConditionExpression: '#recordType = :notification',
          ExpressionAttributeNames: names,
          ExpressionAttributeValues: values,
          ReturnValues: 'ALL_NEW',
        })
      );
      return res.json(toNotificationResponse(result.Attributes));
    } catch (error) {
      logger.error(
        'Unable to update notification in DynamoDB',
        error instanceof Error ? error.message : String(error)
      );
      return res.status(500).json({ error: 'Unable to update notification status' });
    }
  });

  return router;
};
