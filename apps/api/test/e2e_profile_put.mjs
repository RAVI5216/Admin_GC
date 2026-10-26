/**
 * E2E Profile Put Test
 * Profiles are now authenticated and persisted in DynamoDB table: GarbageGuardianDashAdmin.
 */
import express from 'express';
import bodyParser from 'body-parser';
import { createProfileRouter } from '../routes/profile.js';
import { signToken } from '../middleware/auth.js';

const mockAdmin = {
  email: 'admin@marwadi.edu',
  name: 'Admin Test',
  collectorName: 'Admin Collector',
  recordType: 'admin',
  profileRole: 'Lead Administrator',
};

// Mock DynamoDB client for testing without live AWS credentials
const mockDynamo = {
  send: async (cmd) => {
    return { Item: mockAdmin };
  },
};

const app = express();
app.use(bodyParser.json({ limit: '2mb' }));
app.use('/profile', createProfileRouter({ dynamoDb: mockDynamo }));

const server = app.listen(5151, async () => {
  console.log('Test server listening on http://localhost:5151');
  const token = signToken({ email: mockAdmin.email, name: mockAdmin.name });

  try {
    const res = await fetch('http://localhost:5151/profile', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
    console.log('GET /profile status:', res.status);
    const json = await res.json();
    console.log('Response:', json);
  } catch (err) {
    console.error('Test error:', err);
  } finally {
    server.close(() => console.log('Test server closed'));
  }
});
