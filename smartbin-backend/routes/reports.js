import express from 'express';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  ScanCommand,
  TransactWriteCommand,
} from '@aws-sdk/lib-dynamodb';
import { logger } from '../utils/logger.js';

const TABLE_NAME = 'GarbageGuardianReports';
const TASKS_TABLE_NAME = 'GarbageGuardianTasks';
const dynamoDb = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: process.env.AWS_REGION || 'ap-southeast-2' })
);

const normalizeAttributeName = (value) => value.toLowerCase().replace(/[^a-z0-9]/g, '');

export const createReportsRouter = ({ dynamoDb: client = dynamoDb } = {}) => {
  const router = express.Router();

  router.get('/', async (req, res) => {
    try {
      const reports = [];
      let lastEvaluatedKey;

      do {
        const result = await client.send(
          new ScanCommand({
            TableName: TABLE_NAME,
            ...(lastEvaluatedKey ? { ExclusiveStartKey: lastEvaluatedKey } : {}),
          })
        );
        reports.push(...(result.Items ?? []));
        lastEvaluatedKey = result.LastEvaluatedKey;
      } while (lastEvaluatedKey);

      res.json(reports);
    } catch (error) {
      logger.error('Unable to load reports from DynamoDB', error instanceof Error ? error.message : String(error));
      res.status(500).json({ error: 'Unable to load reports' });
    }
  });

  router.patch('/:reportId/status', async (req, res) => {
    const reportId = typeof req.params.reportId === 'string' ? req.params.reportId.trim() : '';
    const requestedStatus =
      typeof req.body?.status === 'string' ? req.body.status.trim().toLowerCase() : '';

    if (!reportId || requestedStatus !== 'unassigned') {
      return res.status(400).json({ error: 'A reportId and status "unassigned" are required' });
    }

    try {
      const { Item: report } = await client.send(
        new GetCommand({
          TableName: TABLE_NAME,
          Key: { reportId },
        })
      );

      if (!report) {
        return res.status(404).json({ error: 'The selected report was not found' });
      }

      const statusAttribute =
        Object.keys(report).find((key) => normalizeAttributeName(key) === 'status') ?? 'status';
      const currentReportStatus = report[statusAttribute];
      if (
        typeof currentReportStatus !== 'string' ||
        currentReportStatus.trim().toLowerCase() !== 'assigned'
      ) {
        return res.status(409).json({ error: 'Only an assigned report can be unassigned' });
      }

      const assignedTasks = [];
      let lastEvaluatedKey;
      do {
        const result = await client.send(
          new ScanCommand({
            TableName: TASKS_TABLE_NAME,
            FilterExpression: '#reportId = :reportId',
            ExpressionAttributeNames: { '#reportId': 'reportId' },
            ExpressionAttributeValues: { ':reportId': reportId },
            ConsistentRead: true,
            ...(lastEvaluatedKey ? { ExclusiveStartKey: lastEvaluatedKey } : {}),
          })
        );
        assignedTasks.push(
          ...(result.Items ?? []).filter(
            (task) =>
              typeof task.taskID === 'string' &&
              typeof task.status === 'string' &&
              task.status.trim().toLowerCase() === 'assigned'
          )
        );
        lastEvaluatedKey = result.LastEvaluatedKey;
      } while (lastEvaluatedKey);

      if (assignedTasks.length > 99) {
        return res.status(409).json({
          error: 'Too many tasks are linked to this report to unassign them in one operation',
        });
      }

      const transactItems = [
        {
          Update: {
            TableName: TABLE_NAME,
            Key: { reportId },
            UpdateExpression: 'SET #status = :unassigned',
            ConditionExpression: '#status = :expectedStatus',
            ExpressionAttributeNames: {
              '#status': statusAttribute,
            },
            ExpressionAttributeValues: {
              ':unassigned': 'unassigned',
              ':expectedStatus': currentReportStatus,
            },
          },
        },
        ...assignedTasks.map((task) => ({
          Update: {
            TableName: TASKS_TABLE_NAME,
            Key: { taskID: task.taskID },
            UpdateExpression: 'SET #status = :unassigned',
            ConditionExpression: '#status = :expectedStatus',
            ExpressionAttributeNames: {
              '#status': 'status',
            },
            ExpressionAttributeValues: {
              ':unassigned': 'unassigned',
              ':expectedStatus': task.status,
            },
          },
        })),
      ];

      await client.send(new TransactWriteCommand({ TransactItems: transactItems }));
      return res.json({ reportId, status: 'unassigned', updatedTaskCount: assignedTasks.length });
    } catch (error) {
      if (error?.name === 'TransactionCanceledException') {
        return res.status(409).json({
          error: 'The report or its task status changed. Refresh the report list and try again.',
        });
      }
      logger.error(
        'Unable to unassign report and linked tasks',
        error instanceof Error ? error.message : String(error)
      );
      return res.status(500).json({ error: 'Unable to unassign report' });
    }
  });

  return router;
};
