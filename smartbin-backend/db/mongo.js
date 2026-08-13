import { MongoClient } from 'mongodb';

let client;
let db;

export async function connectMongo(uri) {
  if (!uri) {
    throw new Error('MONGODB_URI is required');
  }

  client = new MongoClient(uri);
  await client.connect();
  db = client.db();
  return db;
}

export function getDb() {
  if (!db) {
    throw new Error('MongoDB is not connected');
  }
  return db;
}

export async function disconnectMongo() {
  if (client) {
    await client.close();
  }
}
