import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';

export const DASH_ADMIN_TABLE_NAME = 'GarbageGuardianDashAdmin';
export const USERS_TABLE_NAME = 'GarbageGuardianUsers';
export const REPORTS_TABLE_NAME = 'GarbageGuardianReports';
export const TASKS_TABLE_NAME = 'GarbageGuardianTasks';
export const SMARTBINS_TABLE_NAME = 'SmartBins';

const clientConfig = {
  region: process.env.AWS_REGION || 'ap-southeast-2',
  ...(process.env.DYNAMODB_ENDPOINT ? { endpoint: process.env.DYNAMODB_ENDPOINT } : {}),
};

export const dashboardDynamoDb = DynamoDBDocumentClient.from(
  new DynamoDBClient(clientConfig)
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
