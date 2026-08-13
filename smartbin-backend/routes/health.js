import express from 'express';

export const createHealthRouter = (statusProvider) => {
  const router = express.Router();

  router.get('/', (req, res) => {
    const status = statusProvider();
    res.json({ status: 'OK', mqtt: status.mqtt });
  });

  return router;
};
