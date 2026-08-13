import express from 'express';
import { ObjectId } from 'mongodb';
import { getDb } from '../db/mongo.js';

export const createNotificationsRouter = () => {
  const router = express.Router();

  router.get('/', async (req, res) => {
    try {
      const db = getDb();
      const notifications = await db
        .collection('notifications')
        .find()
        .sort({ createdAt: -1 })
        .toArray();
      res.json(notifications);
    } catch (error) {
      res.status(500).json({ error: 'Unable to load notifications' });
    }
  });

  router.post('/', async (req, res) => {
    const { title, message, severity = 'warning', time, solved = false, problemSolved = false, deviceId, location } = req.body;
    if (!title || !message) {
      return res.status(400).json({ error: 'title and message are required' });
    }

    const notification = {
      title,
      message,
      severity,
      solved: Boolean(solved),
      problemSolved: Boolean(problemSolved),
      time: time || new Date().toISOString(),
      deviceId: deviceId ?? null,
      location: location ?? null,
      createdAt: new Date().toISOString(),
      updatedAt: null,
    };

    try {
      const db = getDb();
      const result = await db.collection('notifications').insertOne(notification);
      const created = await db.collection('notifications').findOne({ _id: result.insertedId });
      res.status(201).json(created);
    } catch (error) {
      res.status(500).json({ error: 'Unable to create notification' });
    }
  });

  router.put('/:id', async (req, res) => {
    const { solved, problemSolved } = req.body;
    const updateFields = {};
    if (typeof solved === 'boolean') updateFields.solved = solved;
    if (typeof problemSolved === 'boolean') updateFields.problemSolved = problemSolved;
    if (!Object.keys(updateFields).length) {
      return res.status(400).json({ error: 'At least one of solved or problemSolved must be provided' });
    }

    updateFields.updatedAt = new Date().toISOString();

    try {
      const db = getDb();
      const result = await db.collection('notifications').findOneAndUpdate(
        { _id: new ObjectId(req.params.id) },
        { $set: updateFields },
        { returnDocument: 'after' }
      );
      if (!result.value) {
        return res.status(404).json({ error: 'Notification not found' });
      }
      res.json(result.value);
    } catch (error) {
      res.status(500).json({ error: 'Unable to update notification' });
    }
  });

  return router;
};
