import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';

export const DASH_ADMIN_TABLE_NAME = 'GarbageGuardianDashAdmin';

export const dashboardDynamoDb = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: process.env.AWS_REGION || 'ap-southeast-2' })
);

export const scanDashboardItems = async (dynamoDb, input) => {
  const items = [];
  let lastEvaluatedKey;

  do {
    const page = await dynamoDb.send(
      new ScanCommand({
        ...input,
        ...(lastEvaluatedKey ? { ExclusiveStartKey: lastEvaluatedKey } : {}),
      })
    );
    items.push(...(page.Items ?? []));
    lastEvaluatedKey = page.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  return items;
};
