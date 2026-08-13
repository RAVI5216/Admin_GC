import bcrypt from 'bcrypt';
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const uri = process.env.MONGODB_URI;
if (!uri) {
  throw new Error('MONGODB_URI is required');
}

const client = new MongoClient(uri);

async function run() {
  await client.connect();
  const db = client.db();
  const passwordHash = await bcrypt.hash('Megha123', 10);
  await db.collection('adminUsers').updateOne(
    { email: 'Megha123@gmail.com' },
    {
      $set: {
        email: 'Megha123@gmail.com',
        name: 'Megha Mudholkar',
        passwordHash,
      },
    },
    { upsert: true }
  );
  console.log('Admin user seeded: Megha123@gmail.com / Megha123');
  await client.close();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
