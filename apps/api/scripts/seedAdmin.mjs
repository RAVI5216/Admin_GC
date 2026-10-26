import bcrypt from 'bcrypt';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const email = process.env.ADMIN_EMAIL?.trim();
const name = process.env.ADMIN_NAME?.trim();
const password = process.env.ADMIN_PASSWORD;
if (!email || !name || !password) {
  throw new Error('ADMIN_EMAIL, ADMIN_NAME, and ADMIN_PASSWORD are required to seed an admin');
}

const dynamoDb = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: process.env.AWS_REGION || 'ap-southeast-2' })
);

try {
  const passwordHash = await bcrypt.hash(password, 10);
  await dynamoDb.send(
    new PutCommand({
      TableName: 'GarbageGuardianDashAdmin',
      Item: {
        email,
        recordType: 'admin',
        name,
        passwordHash,
      },
      ConditionExpression: 'attribute_not_exists(email)',
    })
  );
  console.log('Admin account created in GarbageGuardianDashAdmin.');
} finally {
  dynamoDb.destroy();
}
