import express from 'express';
import { ObjectId } from 'mongodb';
import { getDb } from '../db/mongo.js';

const employerRoles = [
  'Waste Collector',
  'Sanitation Worker',
  'Waste Segregation Worker',
  'Recycling Plant Operator',
  'Driver',
  'Waste Management Technician',
  'Environmental Technician',
];

const employerStatuses = ['available', 'assigned', 'off-duty'];

const normalizeEmployer = (body) => {
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const role = typeof body.role === 'string' && employerRoles.includes(body.role) ? body.role : 'Waste Collector';
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
  const location = typeof body.location === 'string' ? body.location.trim() : '';
  const status = typeof body.status === 'string' && employerStatuses.includes(body.status) ? body.status : 'available';
  const notes = typeof body.notes === 'string' ? body.notes.trim() : '';
  const lastActive = typeof body.lastActive === 'string' ? body.lastActive : new Date().toISOString();

  return { name, role, email, phone, location, status, notes, lastActive };
};

const ensureEmployerId = (id) => {
  try {
    return new ObjectId(id);
  } catch {
    return null;
  }
};

const mapEmployer = (item) => ({
  ...item,
  _id: item._id.toString(),
});

export const createEmployerRouter = () => {
  const router = express.Router();

  router.get('/', async (req, res) => {
    try {
      const db = getDb();
      const collection = db.collection('employers');
      const employers = await collection
        .find()
        .sort({ status: 1, name: 1 })
        .toArray();
      res.json(employers.map(mapEmployer));
    } catch (error) {
      res.status(500).json({ error: 'Unable to load employer records' });
    }
  });

  router.post('/', async (req, res) => {
    const employer = normalizeEmployer(req.body);
    if (!employer.name || !employer.email || !employer.phone) {
      return res.status(400).json({ error: 'Name, email, and phone are required' });
    }

    try {
      const db = getDb();
      const collection = db.collection('employers');
      const result = await collection.insertOne({
        ...employer,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      res.status(201).json(mapEmployer({ _id: result.insertedId, ...employer }));
    } catch (error) {
      res.status(500).json({ error: 'Unable to create employer record' });
    }
  });

  router.put('/:id', async (req, res) => {
    const id = ensureEmployerId(req.params.id);
    if (!id) {
      return res.status(400).json({ error: 'Invalid employer ID' });
    }

    const employer = normalizeEmployer(req.body);
    if (!employer.name || !employer.email || !employer.phone) {
      return res.status(400).json({ error: 'Name, email, and phone are required' });
    }

    try {
      const db = getDb();
      const collection = db.collection('employers');
      const update = {
        $set: {
          ...employer,
          updatedAt: new Date().toISOString(),
        },
      };
      const result = await collection.findOneAndUpdate({ _id: id }, update, { returnDocument: 'after' });
      if (!result.value) {
        return res.status(404).json({ error: 'Employer record not found' });
      }
      res.json(mapEmployer(result.value));
    } catch (error) {
      res.status(500).json({ error: 'Unable to update employer record' });
    }
  });

  router.delete('/:id', async (req, res) => {
    const id = ensureEmployerId(req.params.id);
    if (!id) {
      return res.status(400).json({ error: 'Invalid employer ID' });
    }

    try {
      const db = getDb();
      const collection = db.collection('employers');
      const result = await collection.deleteOne({ _id: id });
      if (result.deletedCount === 0) {
        return res.status(404).json({ error: 'Employer record not found' });
      }
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ error: 'Unable to delete employer record' });
    }
  });

  return router;
};
