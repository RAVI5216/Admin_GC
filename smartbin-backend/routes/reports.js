import express from 'express';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { logger } from '../utils/logger.js';

const TABLE_NAME = 'GarbageGuardianReports';
const dynamoDb = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: process.env.AWS_REGION || 'ap-southeast-2' })
);

export const createReportsRouter = () => {
  const router = express.Router();

  router.get('/', async (req, res) => {
    try {
      const reports = [];
      let lastEvaluatedKey;

      do {
        const result = await dynamoDb.send(
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

  return router;
};
