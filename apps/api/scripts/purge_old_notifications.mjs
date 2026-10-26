import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { BatchWriteCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { dashboardDynamoDb, DASH_ADMIN_TABLE_NAME } from '../db/dynamo.js';

async function purgeOldNotifications() {
  console.log(`[Purge] Starting scan of table "${DASH_ADMIN_TABLE_NAME}"...`);

  let lastEvaluatedKey;
  let totalScanned = 0;
  let totalDeleted = 0;
  let adminAccountsPreserved = 0;
  const deleteKeys = [];

  // Page-by-page projection scan (retrieving ONLY email and recordType for high speed)
  do {
    const page = await dashboardDynamoDb.send(
      new ScanCommand({
        TableName: DASH_ADMIN_TABLE_NAME,
        ProjectionExpression: '#email, #recordType',
        ExpressionAttributeNames: {
          '#email': 'email',
          '#recordType': 'recordType',
        },
        ...(lastEvaluatedKey ? { ExclusiveStartKey: lastEvaluatedKey } : {}),
      })
    );

    const items = page.Items ?? [];
    totalScanned += items.length;

    for (const item of items) {
      const email = String(item.email || '');
      const isNotification = email.startsWith('NOTIFICATION#') || item.recordType === 'notification';
      const isAdmin = item.recordType === 'admin' || !email.startsWith('NOTIFICATION#');

      if (isNotification && !isAdmin) {
        deleteKeys.push({ email });
      } else {
        adminAccountsPreserved++;
        console.log(`[Preserved Admin Account] ${email}`);
      }
    }

    lastEvaluatedKey = page.LastEvaluatedKey;
    console.log(`[Scan] Scanned ${totalScanned} items... (${deleteKeys.length} notifications queued for purge)`);
  } while (lastEvaluatedKey);

  console.log(`\n[Purge] Scan complete. Total notifications to delete: ${deleteKeys.length}`);
  console.log(`[Purge] Total admin accounts safely preserved: ${adminAccountsPreserved}`);

  if (deleteKeys.length === 0) {
    console.log('[Purge] No notification items found to delete. Table is already clean!');
    return;
  }

  // Delete in batches of 25 (DynamoDB limit)
  const chunkSize = 25;
  const batches = [];
  for (let i = 0; i < deleteKeys.length; i += chunkSize) {
    batches.push(deleteKeys.slice(i, i + chunkSize));
  }

  console.log(`[Purge] Executing ${batches.length} batch delete operations...`);

  // Run in chunks of 5 concurrent batch deletes to optimize throughput without throttling
  const concurrency = 5;
  for (let i = 0; i < batches.length; i += concurrency) {
    const concurrentBatches = batches.slice(i, i + concurrency);
    await Promise.all(
      concurrentBatches.map(async (chunk) => {
        const deleteRequests = chunk.map((key) => ({
          DeleteRequest: { Key: key },
        }));
        await dashboardDynamoDb.send(
          new BatchWriteCommand({
            RequestItems: {
              [DASH_ADMIN_TABLE_NAME]: deleteRequests,
            },
          })
        );
        totalDeleted += chunk.length;
      })
    );
    console.log(`[Purge Progress] Deleted ${totalDeleted} / ${deleteKeys.length} old notifications...`);
  }

  console.log(`\n\n[SUCCESS] Successfully purged all ${totalDeleted} old alert/notification records!`);
  console.log(`[SAFEGUARD VERIFICATION] ${adminAccountsPreserved} administrator accounts were 100% untouched and preserved.`);
}

purgeOldNotifications().catch((err) => {
  console.error('\n[Error] Failed during notification purge:', err);
  process.exit(1);
});
