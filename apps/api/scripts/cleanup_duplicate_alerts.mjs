import dotenv from 'dotenv';
dotenv.config();
import { BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import { dashboardDynamoDb, DASH_ADMIN_TABLE_NAME, scanDashboardItems } from '../db/dynamo.js';

async function cleanupDuplicates() {
  console.log('[Cleanup] Scanning GarbageGuardianDashAdmin for duplicate notifications...');

  const items = await scanDashboardItems(dashboardDynamoDb, {
    TableName: DASH_ADMIN_TABLE_NAME,
    FilterExpression: '#recordType = :notification',
    ExpressionAttributeNames: { '#recordType': 'recordType' },
    ExpressionAttributeValues: { ':notification': 'notification' },
  });

  console.log(`[Cleanup] Found ${items.length} total notification records.`);

  if (items.length <= 10) {
    console.log('[Cleanup] Table is already clean.');
    return;
  }

  // Group by deviceId
  const byDevice = {};
  for (const item of items) {
    const dev = item.deviceId || 'UNKNOWN';
    if (!byDevice[dev]) byDevice[dev] = [];
    byDevice[dev].push(item);
  }

  const toDelete = [];
  const toKeep = [];

  for (const [dev, list] of Object.entries(byDevice)) {
    // Sort descending by createdAt
    list.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
    // Keep the most recent 2 notifications per device
    const keep = list.slice(0, 2);
    const drop = list.slice(2);
    toKeep.push(...keep);
    toDelete.push(...drop);
    console.log(`Device ${dev}: Keeping ${keep.length}, Deleting ${drop.length} duplicate items.`);
  }

  console.log(`\n[Cleanup] Total to keep: ${toKeep.length}, Total to delete: ${toDelete.length}`);

  // Batch delete in chunks of 25 (DynamoDB BatchWrite limit)
  const chunkSize = 25;
  let deletedCount = 0;

  for (let i = 0; i < toDelete.length; i += chunkSize) {
    const chunk = toDelete.slice(i, i + chunkSize);
    const deleteRequests = chunk.map((item) => ({
      DeleteRequest: {
        Key: { email: item.email },
      },
    }));

    await dashboardDynamoDb.send(
      new BatchWriteCommand({
        RequestItems: {
          [DASH_ADMIN_TABLE_NAME]: deleteRequests,
        },
      })
    );

    deletedCount += chunk.length;
    process.stdout.write(`\r[Cleanup] Deleted ${deletedCount} / ${toDelete.length} duplicates...`);
  }

  console.log(`\n[Cleanup] Successfully purged ${deletedCount} duplicate spam notifications!`);
  console.log(`[Cleanup] Remaining notifications: ${toKeep.length}`);
}

cleanupDuplicates().catch((err) => {
  console.error('[Cleanup Error]', err);
  process.exit(1);
});
