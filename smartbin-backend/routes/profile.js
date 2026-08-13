import express from 'express';
import bcrypt from 'bcrypt';
import { getDb } from '../db/mongo.js';

const PROFILE_ID = 'collector_profile';

const ensureProfileData = async () => {
  const db = getDb();
  const existing = await db.collection('profiles').findOne({ _id: PROFILE_ID });
  if (existing) {
    return existing;
  }

  const defaultProfile = {
    _id: PROFILE_ID,
    collectorName: 'Megha Mudholkar',
    role: 'Field Collector',
    email: 'Megha123@gmail.com',
    phone: '+91 98765 43210',
    avatar: null,
  };
  await db.collection('profiles').insertOne(defaultProfile);
  return defaultProfile;
};

const saveProfileData = async (profile) => {
  const db = getDb();
  await db.collection('profiles').updateOne({ _id: PROFILE_ID }, { $set: profile }, { upsert: true });
};

export const createProfileRouter = () => {
  const router = express.Router();

  router.get('/', async (req, res) => {
    try {
      const profile = await ensureProfileData();
      res.json(profile);
    } catch (error) {
      res.status(500).json({ error: 'Unable to load profile data' });
    }
  });

  router.put('/', async (req, res) => {
    const { collectorName, role, email, phone, avatar, password } = req.body;
    if (!collectorName || !role || !email || !phone) {
      return res.status(400).json({ error: 'collectorName, role, email, and phone are required' });
    }

    const updatedProfile = { collectorName, role, email, phone, avatar: avatar ?? null };
    try {
      const db = getDb();
      const currentProfile = await ensureProfileData();
      const authUpdate = {
        email,
        name: collectorName,
      };
      if (password) {
        authUpdate.passwordHash = await bcrypt.hash(password, 10);
      }

      await db.collection('adminUsers').updateOne(
        { email: currentProfile.email },
        { $set: authUpdate },
        { upsert: true }
      );

      await saveProfileData(updatedProfile);
      res.json(updatedProfile);
    } catch (error) {
      res.status(500).json({ error: 'Unable to save profile data' });
    }
  });

  return router;
};
