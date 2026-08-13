import express from 'express';
import bcrypt from 'bcrypt';
import { getDb } from '../db/mongo.js';

export const createAuthRouter = () => {
  const router = express.Router();

  router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    try {
      const user = await getDb().collection('adminUsers').findOne({ email });
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const isMatch = await bcrypt.compare(password, user.passwordHash);
      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      return res.json({ email: user.email, name: user.name });
    } catch (error) {
      return res.status(500).json({ error: 'Login failed' });
    }
  });

  return router;
};
