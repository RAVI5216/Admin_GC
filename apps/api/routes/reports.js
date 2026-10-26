import express from 'express';
import {
  GetCommand,
  ScanCommand,
  TransactWriteCommand,
} from '@aws-sdk/lib-dynamodb';
import {
  REPORTS_TABLE_NAME as TABLE_NAME,
  TASKS_TABLE_NAME,
  dashboardDynamoDb,
} from '../db/dynamo.js';
import { requireAuth } from '../middleware/auth.js';
import { classifyReport, getPythonMLMetrics } from '../services/aiClassifier.js';
import { logger } from '../utils/logger.js';
import { recordNotification } from '../services/notificationHelper.js';

const normalizeAttributeName = (value) => value.toLowerCase().replace(/[^a-z0-9]/g, '');

export const createReportsRouter = ({ dynamoDb: client = dashboardDynamoDb } = {}) => {
  const router = express.Router();

  router.use(requireAuth);

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

      const enriched = await Promise.all(
        reports.map(async (r) => {
          if (r.aiClassification) return r;
          const text = [r.description, r.issueType, r.issue, r.category].filter(Boolean).join(' ');
          const classification = await classifyReport(text, r.location || '');
          return {
            ...r,
            aiClassification: classification,
          };
        })
      );
      res.json(enriched);
    } catch (error) {
      logger.error('Unable to load reports from DynamoDB', error instanceof Error ? error.message : String(error));
      res.status(500).json({ error: 'Unable to load reports' });
    }
  });

  router.post('/classify', async (req, res) => {
    const text = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
    const location = typeof req.body?.location === 'string' ? req.body.location.trim() : '';
    const shouldNotify = Boolean(req.body?.createNotification);
    if (!text) {
      return res.status(400).json({ error: 'Report text is required for AI classification' });
    }
    try {
      const result = await classifyReport(text, location);
      if (shouldNotify && (result.severity === 'critical' || result.severity === 'high')) {
        await recordNotification(client, {
          title: `🚨 AI Urgent Alert: ${result.category}`,
          message: `${text.slice(0, 100)}${text.length > 100 ? '…' : ''} (Location: ${location || result.extractedLocation || 'Campus Center'}, Urgency: ${result.severity.toUpperCase()}, Confidence: ${Math.round(result.confidence * 100)}%)`,
          severity: result.severity === 'critical' ? 'critical' : 'warning',
          location: location || result.extractedLocation || null,
        });
      }
      return res.json(result);
    } catch (error) {
      logger.error('AI classification error', error instanceof Error ? error.message : String(error));
      return res.status(500).json({ error: 'AI classification failed' });
    }
  });

  router.get('/ai-metrics', async (req, res) => {
    try {
      const metrics = await getPythonMLMetrics();
      if (!metrics) {
        return res.status(503).json({
          error: 'Python ML service is currently offline or metrics not generated. Start python app.py on port 5001.',
        });
      }
      return res.json(metrics);
    } catch (error) {
      logger.error('Unable to fetch AI metrics', error instanceof Error ? error.message : String(error));
      return res.status(500).json({ error: 'Unable to fetch AI evaluation metrics' });
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
