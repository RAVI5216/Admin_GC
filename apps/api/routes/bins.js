import express from 'express';
import { GetCommand } from '@aws-sdk/lib-dynamodb';
import {
  SMARTBINS_TABLE_NAME,
  dashboardDynamoDb,
  scanDashboardItems,
} from '../db/dynamo.js';
import { requireAuth } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';

export const normalizeBinItem = (item) => {
  if (!item || typeof item !== 'object') return null;

  const fillLevel =
    typeof item.fillPercentage === 'number'
      ? item.fillPercentage
      : typeof item.fillLevel === 'number'
      ? item.fillLevel
      : Number(item.fillPercentage ?? item.fillLevel ?? item.level) || 0;

  const rawStatus = typeof item.status === 'string' ? item.status.trim() : '';
  const lowerStatus = rawStatus.toLowerCase();

  // Normalize status for UI badges and alert thresholds
  let normalizedStatus = 'online';
  if (lowerStatus === 'full' || fillLevel >= 90) {
    normalizedStatus = 'full';
  } else if (
    lowerStatus.includes('almost') ||
    lowerStatus.includes('about') ||
    lowerStatus.includes('warning') ||
    fillLevel >= 70
  ) {
    normalizedStatus = 'warning';
  } else if (lowerStatus === 'offline' || item.online === false) {
    normalizedStatus = 'offline';
  } else {
    normalizedStatus = 'online';
  }

  const latitude =
    typeof item.latitude === 'number'
      ? item.latitude
      : Number(item.latitude ?? item.lat) || undefined;

  const longitude =
    typeof item.longitude === 'number'
      ? item.longitude
      : Number(item.longitude ?? item.lng ?? item.long) || undefined;

  return {
    ...item,
    deviceId: item.deviceId,
    location: item.location || `Bin ${item.deviceId}`,
    latitude,
    longitude,
    fillLevel,
    fillPercentage: fillLevel,
    distance: typeof item.distance === 'number' ? item.distance : Number(item.distance) || 0,
    status: normalizedStatus,
    rawStatus: rawStatus || normalizedStatus,
    lastUpdated: item.lastUpdated || item.locationUpdatedAt || new Date().toISOString(),
    locationUpdatedAt: item.locationUpdatedAt || null,
    uptime: typeof item.uptime === 'number' ? item.uptime : Number(item.uptime) || 0,
    temperature: typeof item.temperature === 'number' ? item.temperature : Number(item.temperature) || 28,
    humidity: typeof item.humidity === 'number' ? item.humidity : Number(item.humidity) || 55,
    gasLevel: typeof item.gasLevel === 'number' ? item.gasLevel : Number(item.gasLevel) || 45,
    battery: typeof item.battery === 'number' ? item.battery : Number(item.battery) || 3.8,
    rssi: typeof item.rssi === 'number' ? item.rssi : Number(item.rssi) || -67,
  };
};

export const fetchAllBinsFromDynamo = async (dynamoDb = dashboardDynamoDb) => {
  const items = await scanDashboardItems(dynamoDb, {
    TableName: SMARTBINS_TABLE_NAME,
  });
  return items.map(normalizeBinItem).filter(Boolean);
};

export const createBinsRouter = ({ dynamoDb = dashboardDynamoDb } = {}) => {
  const router = express.Router();

  // Protect all bin data routes with authentication
  router.use(requireAuth);

  // GET /api/bins - List all smart bins directly from DynamoDB SmartBins table
  router.get('/', async (req, res) => {
    try {
      const bins = await fetchAllBinsFromDynamo(dynamoDb);
      bins.sort((a, b) => String(a.deviceId).localeCompare(String(b.deviceId)));
      return res.json(bins);
    } catch (error) {
      logger.error('Unable to load smart bins from DynamoDB', error instanceof Error ? error.message : String(error));
      return res.status(500).json({ error: 'Unable to load smart bins' });
    }
  });

  // GET /api/bins/:id - Fetch single bin by deviceId
  router.get('/:id', async (req, res) => {
    const id = req.params.id;
    try {
      const { Item } = await dynamoDb.send(
        new GetCommand({
          TableName: SMARTBINS_TABLE_NAME,
          Key: { deviceId: id },
        })
      );

      if (Item) {
        return res.json(normalizeBinItem(Item));
      }

      // Fallback: search by case-insensitive deviceId
      const allBins = await fetchAllBinsFromDynamo(dynamoDb);
      const matched = allBins.find(
        (b) => String(b.deviceId).toLowerCase() === String(id).toLowerCase()
      );

      if (matched) {
        return res.json(matched);
      }

      return res.status(404).json({ error: `SmartBin ${id} not found` });
    } catch (error) {
      logger.error(`Unable to load bin ${id} from DynamoDB`, error instanceof Error ? error.message : String(error));
      return res.status(500).json({ error: 'Unable to load smart bin details' });
    }
  });

  return router;
};
