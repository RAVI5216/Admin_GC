import { randomUUID } from 'crypto';
import express from 'express';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  TransactWriteCommand,
} from '@aws-sdk/lib-dynamodb';
import { isEmployerRecord } from './employers.js';
import { logger } from '../utils/logger.js';

const USERS_TABLE_NAME = 'GarbageGuardianUsers';
const REPORTS_TABLE_NAME = 'GarbageGuardianReports';
const TASKS_TABLE_NAME = 'GarbageGuardianTasks';
const defaultDynamoDb = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: process.env.AWS_REGION || 'ap-southeast-2' })
);

const normalizeAttributeName = (value) => value.toLowerCase().replace(/[^a-z0-9]/g, '');

const getStringField = (item, aliases, fallback = '') => {
  const normalizedAliases = aliases.map(normalizeAttributeName);
  const value = Object.entries(item).find(
    ([key, entry]) =>
      normalizedAliases.includes(normalizeAttributeName(key)) && typeof entry === 'string'
  )?.[1];
  return value ?? fallback;
};

export const createTasksRouter = ({
  dynamoDb = defaultDynamoDb,
  generateTaskId = randomUUID,
  now = () => new Date(),
} = {}) => {
  const router = express.Router();

  router.post('/', async (req, res) => {
    const assignedUserId =
      typeof req.body?.assignedUserId === 'string' ? req.body.assignedUserId : '';
    const reportId = typeof req.body?.reportId === 'string' ? req.body.reportId.trim() : '';

    if (!assignedUserId.trim() || !reportId) {
      return res.status(400).json({ error: 'assignedUserId and reportId are required' });
    }

    try {
      const { Item: user } = await dynamoDb.send(
        new GetCommand({
          TableName: USERS_TABLE_NAME,
          Key: { userId: assignedUserId },
        })
      );

      if (!user || !isEmployerRecord(user)) {
        return res.status(404).json({ error: 'The selected employee was not found' });
      }

      const { Item: report } = await dynamoDb.send(
        new GetCommand({
          TableName: REPORTS_TABLE_NAME,
          Key: { reportId },
        })
      );

      if (!report) {
        return res.status(404).json({ error: 'The selected report was not found' });
      }
      const statusAttribute =
        Object.keys(report).find((key) => normalizeAttributeName(key) === 'status') ?? 'status';
      if (
        typeof report[statusAttribute] === 'string' &&
        report[statusAttribute].trim().toLowerCase() === 'assigned'
      ) {
        return res.status(409).json({ error: 'This report has already been assigned' });
      }

      const issueType = getStringField(report, ['issueType', 'issue', 'category'], 'User report');
      const location = getStringField(report, ['location']);
      const binId = getStringField(report, ['binId', 'deviceId']);
      const createdAt = getStringField(report, ['createdAt']);
      const task = {
        taskID: generateTaskId(),
        assignedUserId,
        reportId,
        taskName: `${issueType} - ${reportId}`.slice(0, 120),
        description: [
          `Report ID: ${reportId}`,
          `Issue type: ${issueType}`,
          `Location: ${location || 'Not provided'}`,
          `Bin ID: ${binId || 'Not provided'}`,
          `Created at: ${createdAt || 'Not provided'}`,
        ].join('\n'),
        status: 'assigned',
        createdAt: now().toISOString(),
      };

      await dynamoDb.send(
        new TransactWriteCommand({
          TransactItems: [
            {
              Put: {
                TableName: TASKS_TABLE_NAME,
                Item: task,
                ConditionExpression: 'attribute_not_exists(taskID)',
              },
            },
            {
              Update: {
                TableName: REPORTS_TABLE_NAME,
                Key: { reportId },
                UpdateExpression: 'SET #status = :assigned',
                ConditionExpression:
                  'attribute_exists(#reportId) AND (attribute_not_exists(#status) OR #status <> :assigned)',
                ExpressionAttributeNames: {
                  '#reportId': 'reportId',
                  '#status': statusAttribute,
                },
                ExpressionAttributeValues: {
                  ':assigned': 'assigned',
                },
              },
            },
          ],
        })
      );

      return res.status(201).json({ ...task, reportStatus: 'assigned' });
    } catch (error) {
      if (error?.name === 'TransactionCanceledException') {
        return res.status(409).json({
          error: 'This report may already be assigned. Refresh the report list and try again.',
        });
      }
      logger.error(
        'Unable to assign report task in DynamoDB',
        error instanceof Error ? error.message : String(error)
      );
      return res.status(500).json({ error: 'Unable to assign report task' });
    }
  });

  return router;
};
