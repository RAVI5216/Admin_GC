import { randomUUID } from 'crypto';
import express from 'express';
import {
  DeleteCommand,
  GetCommand,
  PutCommand,
  TransactWriteCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import {
  REPORTS_TABLE_NAME,
  TASKS_TABLE_NAME,
  USERS_TABLE_NAME,
  dashboardDynamoDb,
  scanDashboardItems,
} from '../db/dynamo.js';
import { isEmployerRecord } from './employers.js';
import { logger } from '../utils/logger.js';
import { requireAuth } from '../middleware/auth.js';
import { recordNotification } from '../services/notificationHelper.js';

const normalizeAttributeName = (value) => value.toLowerCase().replace(/[^a-z0-9]/g, '');

const getStringField = (item, aliases, fallback = '') => {
  const normalizedAliases = aliases.map(normalizeAttributeName);
  const value = Object.entries(item).find(
    ([key, entry]) =>
      normalizedAliases.includes(normalizeAttributeName(key)) && typeof entry === 'string'
  )?.[1];
  return value ?? fallback;
};

const toTaskResponse = (item) => {
  const id = item.taskID || item._id || '';
  const title = item.title || item.taskName || 'Untitled Task';
  return {
    ...item,
    _id: id,
    taskID: id,
    title,
    taskName: title,
    priority: item.priority || 'medium',
    status: item.status || 'pending',
    createdAt: item.createdAt || new Date().toISOString(),
    updatedAt: item.updatedAt || item.createdAt || new Date().toISOString(),
  };
};

export const createTasksRouter = ({
  dynamoDb = dashboardDynamoDb,
  generateTaskId = randomUUID,
  now = () => new Date(),
} = {}) => {
  const router = express.Router();

  // All task routes require authentication
  router.use(requireAuth);

  // GET / - List all tasks
  router.get('/', async (req, res) => {
    try {
      const items = await scanDashboardItems(dynamoDb, {
        TableName: TASKS_TABLE_NAME,
      });
      items.sort((a, b) => String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? '')));
      return res.json(items.map(toTaskResponse));
    } catch (error) {
      logger.error('Unable to load tasks from DynamoDB', error instanceof Error ? error.message : String(error));
      return res.status(500).json({ error: 'Unable to load tasks' });
    }
  });

  // POST / - Create a task (supports report assignment & direct task creation)
  router.post('/', async (req, res) => {
    const body = req.body ?? {};
    const assignedUserId = typeof body.assignedUserId === 'string' ? body.assignedUserId.trim() : '';
    const employeeId = typeof body.employeeId === 'string' ? body.employeeId.trim() : assignedUserId;
    const reportId = typeof body.reportId === 'string' ? body.reportId.trim() : '';
    const title = typeof body.title === 'string' ? body.title.trim() : typeof body.taskName === 'string' ? body.taskName.trim() : '';

    if (!employeeId && !assignedUserId) {
      return res.status(400).json({ error: 'employeeId or assignedUserId is required' });
    }

    try {
      // Validate employee exists
      const targetUserId = employeeId || assignedUserId;
      let user = null;
      try {
        const result = await dynamoDb.send(
          new GetCommand({
            TableName: USERS_TABLE_NAME,
            Key: { userId: targetUserId },
          })
        );
        user = result.Item;
      } catch (userErr) {
        logger.warn('Failed to fetch user by userId, continuing', userErr?.message);
      }

      const taskID = generateTaskId();
      const timestamp = now().toISOString();

      // If report assignment workflow
      if (reportId) {
        let report = null;
        try {
          const reportRes = await dynamoDb.send(
            new GetCommand({
              TableName: REPORTS_TABLE_NAME,
              Key: { reportId },
            })
          );
          report = reportRes.Item;
        } catch (repErr) {
          logger.warn('Failed to fetch report, continuing', repErr?.message);
        }

        const issueType = report ? getStringField(report, ['issueType', 'issue', 'category'], 'User report') : (body.title || 'User report');
        const location = report ? getStringField(report, ['location']) : (body.binLocation || '');
        const binId = report ? getStringField(report, ['binId', 'deviceId']) : (body.binId || '');
        const taskTitle = title || `${issueType} - ${reportId}`.slice(0, 120);

        const task = {
          taskID,
          _id: taskID,
          assignedUserId: targetUserId,
          employeeId: targetUserId,
          employeeName: body.employeeName || user?.name || targetUserId,
          employeeEmail: body.employeeEmail || user?.email || '',
          employeeRole: body.employeeRole || user?.role || 'employee',
          reportId,
          reportTitle: body.reportTitle || reportId,
          binId: binId || null,
          binLocation: location || null,
          binStatus: body.binStatus || null,
          binFillLevel: typeof body.binFillLevel === 'number' ? body.binFillLevel : null,
          title: taskTitle,
          taskName: taskTitle,
          description: body.description || [
            `Report ID: ${reportId}`,
            `Issue type: ${issueType}`,
            `Location: ${location || 'Not provided'}`,
            `Bin ID: ${binId || 'Not provided'}`,
          ].join('\n'),
          priority: body.priority || 'medium',
          status: 'assigned',
          dueDate: body.dueDate || null,
          notes: body.notes || '',
          createdAt: timestamp,
          updatedAt: timestamp,
        };

        const transactItems = [
          {
            Put: {
              TableName: TASKS_TABLE_NAME,
              Item: task,
              ConditionExpression: 'attribute_not_exists(taskID)',
            },
          },
        ];

        if (report) {
          const statusAttribute =
            Object.keys(report).find((key) => normalizeAttributeName(key) === 'status') ?? 'status';
          transactItems.push({
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
          });
        }

        await dynamoDb.send(new TransactWriteCommand({ TransactItems: transactItems }));
        await recordNotification(dynamoDb, {
          title: '📋 Incident Task Dispatched',
          message: `Task for report ${reportId} assigned to ${task.employeeName}.`,
          severity: 'warning',
          taskId: task.taskID,
          reportId,
        });
        return res.status(201).json({ ...toTaskResponse(task), reportStatus: 'assigned' });
      }

      // Standalone direct task
      const taskTitle = title || `Task for ${targetUserId}`;
      const task = {
        taskID,
        _id: taskID,
        assignedUserId: targetUserId,
        employeeId: targetUserId,
        employeeName: body.employeeName || user?.name || targetUserId,
        employeeEmail: body.employeeEmail || user?.email || '',
        employeeRole: body.employeeRole || user?.role || 'employee',
        reportId: null,
        reportTitle: null,
        binId: body.binId || null,
        binLocation: body.binLocation || null,
        binStatus: body.binStatus || null,
        binFillLevel: typeof body.binFillLevel === 'number' ? body.binFillLevel : null,
        title: taskTitle,
        taskName: taskTitle,
        description: body.description || '',
        priority: body.priority || 'medium',
        status: 'pending',
        dueDate: body.dueDate || null,
        notes: body.notes || '',
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      await dynamoDb.send(
        new PutCommand({
          TableName: TASKS_TABLE_NAME,
          Item: task,
          ConditionExpression: 'attribute_not_exists(taskID)',
        })
      );

      await recordNotification(dynamoDb, {
        title: '📋 Pickup Task Assigned',
        message: `Task "${task.title}" assigned to ${task.employeeName} (${task.employeeRole}).`,
        severity: 'warning',
        taskId: task.taskID,
        deviceId: task.binId || null,
        location: task.binLocation || null,
      });

      return res.status(201).json(toTaskResponse(task));
    } catch (error) {
      if (error?.name === 'TransactionCanceledException') {
        return res.status(409).json({
          error: 'This report may already be assigned. Refresh the report list and try again.',
        });
      }
      logger.error('Unable to create task in DynamoDB', error instanceof Error ? error.message : String(error));
      return res.status(500).json({ error: 'Unable to create task' });
    }
  });

  // PATCH /:id/status - Update task status
  router.patch('/:id/status', async (req, res) => {
    const id = req.params.id;
    const status = typeof req.body?.status === 'string' ? req.body.status.trim().toLowerCase() : '';
    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    try {
      const updatedAt = now().toISOString();
      const result = await dynamoDb.send(
        new UpdateCommand({
          TableName: TASKS_TABLE_NAME,
          Key: { taskID: id },
          UpdateExpression: 'SET #status = :status, #updatedAt = :updatedAt',
          ExpressionAttributeNames: {
            '#status': 'status',
            '#updatedAt': 'updatedAt',
          },
          ExpressionAttributeValues: {
            ':status': status,
            ':updatedAt': updatedAt,
          },
          ReturnValues: 'ALL_NEW',
        })
      );
      if (status === 'completed') {
        const title = result.Attributes?.title || result.Attributes?.taskName || 'Waste Task';
        await recordNotification(dynamoDb, {
          title: '✅ Waste Pickup Completed',
          message: `Task "${title}" marked as completed.`,
          severity: 'warning',
          taskId: id,
        });
      }
      return res.json(toTaskResponse(result.Attributes));
    } catch (error) {
      logger.error('Unable to update task status', error instanceof Error ? error.message : String(error));
      return res.status(500).json({ error: 'Unable to update task status' });
    }
  });

  // DELETE /:id - Delete a task
  router.delete('/:id', async (req, res) => {
    const id = req.params.id;
    try {
      await dynamoDb.send(
        new DeleteCommand({
          TableName: TASKS_TABLE_NAME,
          Key: { taskID: id },
        })
      );
      return res.json({ success: true, message: 'Task deleted successfully' });
    } catch (error) {
      logger.error('Unable to delete task', error instanceof Error ? error.message : String(error));
      return res.status(500).json({ error: 'Unable to delete task' });
    }
  });

  return router;
};
