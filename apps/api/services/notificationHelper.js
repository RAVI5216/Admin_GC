import { randomUUID } from 'crypto';
import { DeleteCommand, PutCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { DASH_ADMIN_TABLE_NAME, dashboardDynamoDb } from '../db/dynamo.js';
import { logger } from '../utils/logger.js';

// Deduplication map: signature -> timestamp
const recentAlerts = new Map();
const DEDUPLICATION_WINDOW_MS = 10 * 60 * 1000; // 10 minute cooldown for identical alert
const ALERT_RETENTION_DAYS = 14;

export const recordNotification = async (
  dynamoDb = dashboardDynamoDb,
  {
    title,
    message,
    severity = 'warning',
    location = null,
    deviceId = null,
    reportId = null,
    taskId = null,
  } = {}
) => {
  try {
    const trimmedTitle = title.trim();
    const trimmedMessage = message.trim();
    const dedupKey = `${trimmedTitle}#${location || ''}#${trimmedMessage.slice(0, 50)}`;
    const now = Date.now();

    // Deduplication check: suppress identical notifications within the cooldown window
    if (recentAlerts.has(dedupKey)) {
      const lastTime = recentAlerts.get(dedupKey);
      if (now - lastTime < DEDUPLICATION_WINDOW_MS) {
        logger.info(`[Notification] Suppressed duplicate alert: "${trimmedTitle}" within 10m window`);
        return null;
      }
    }
    recentAlerts.set(dedupKey, now);

    const notificationId = randomUUID();
    const createdAt = new Date().toISOString();
    const expiresAt = Math.floor(now / 1000) + ALERT_RETENTION_DAYS * 24 * 60 * 60; // 14-day DynamoDB TTL

    const item = {
      email: `NOTIFICATION#${notificationId}`,
      notificationId,
      recordType: 'notification',
      title: trimmedTitle,
      message: trimmedMessage,
      severity,
      solved: false,
      problemSolved: false,
      time: createdAt,
      deviceId,
      location,
      reportId,
      taskId,
      createdAt,
      ttl: expiresAt,
      updatedAt: null,
    };

    await dynamoDb.send(
      new PutCommand({
        TableName: DASH_ADMIN_TABLE_NAME,
        Item: item,
      })
    );

    logger.info(`[Notification] Created: "${title}"`);
    return item;
  } catch (error) {
    logger.error('Failed to record notification', error instanceof Error ? error.message : String(error));
    return null;
  }
};

/**
 * Periodically deletes notification logs older than retention window (default 14 days)
 * to keep table lean and within high performance parameters.
 */
export const autoPruneOldAlerts = async (dynamoDb = dashboardDynamoDb, daysRetention = ALERT_RETENTION_DAYS) => {
  try {
    const cutoffDate = new Date(Date.now() - daysRetention * 24 * 60 * 60 * 1000).toISOString();
    const page = await dynamoDb.send(
      new ScanCommand({
        TableName: DASH_ADMIN_TABLE_NAME,
        FilterExpression: '#recordType = :notification AND #createdAt < :cutoff',
        ExpressionAttributeNames: { '#recordType': 'recordType', '#createdAt': 'createdAt' },
        ExpressionAttributeValues: { ':notification': 'notification', ':cutoff': cutoffDate },
        Limit: 50,
      })
    );
    const expired = page.Items ?? [];
    if (expired.length > 0) {
      await Promise.all(
        expired.map((item) =>
          dynamoDb.send(
            new DeleteCommand({
              TableName: DASH_ADMIN_TABLE_NAME,
              Key: { email: item.email },
            })
          )
        )
      );
      logger.info(`[AutoRetention] Purged ${expired.length} notifications older than ${daysRetention} days.`);
    }
  } catch (err) {
    logger.warn('[AutoRetention] Failed to prune old notifications:', err?.message);
  }
};
