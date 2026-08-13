import express from 'express';
import bodyParser from 'body-parser';
import { createProfileRouter } from '../routes/profile.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
app.use(bodyParser.json({ limit: '2mb' }));
app.use('/profile', createProfileRouter());

const server = app.listen(5151, async () => {
  console.log('Test server listening on http://localhost:5151');

  const testProfile = {
    collectorName: 'E2E Tester',
    role: 'Tester',
    email: 'e2e@local.test',
    phone: '+1 555 1234',
    avatar: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA' // truncated but valid-ish
  };

  try {
    const res = await fetch('http://localhost:5151/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testProfile),
    });
    console.log('PUT /profile status:', res.status);
    const json = await res.json();
    console.log('Response:', json);

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const profilePath = path.join(__dirname, '..', 'data', 'profile.json');
    const raw = await fs.readFile(profilePath, 'utf-8');
    console.log('\nprofile.json contents after PUT:\n', raw);
  } catch (err) {
    console.error('E2E test failed', err);
  } finally {
    server.close(() => console.log('Test server closed'));
  }
});
