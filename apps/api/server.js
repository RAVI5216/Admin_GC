import http from 'http';
import express from 'express';
import cors from 'cors';
import { randomUUID } from 'crypto';
import { serverConfig } from './config/serverConfig.js';
import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { DASH_ADMIN_TABLE_NAME, dashboardDynamoDb, scanDashboardItems } from './db/dynamo.js';
import { createHealthRouter } from './routes/health.js';
import { createProfileRouter } from './routes/profile.js';
import { createNotificationsRouter } from './routes/notifications.js';
import { createReportsRouter } from './routes/reports.js';
import { createAuthRouter } from './routes/auth.js';
import { createEmployerRouter } from './routes/employers.js';
import { createTasksRouter } from './routes/tasks.js';
import { createBinsRouter, fetchAllBinsFromDynamo } from './routes/bins.js';
import { initializeSocket } from './socket/socket.js';
import { logger } from './utils/logger.js';
import { autoPruneOldAlerts } from './services/notificationHelper.js';

const app = express();
const httpServer = http.createServer(app);

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((s) => s.trim())
  : ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3000', 'http://localhost:5000'];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      callback(new Error('Blocked by CORS policy'));
    }
  },
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

let iotStatus = { iot: 'Disconnected' };

const getStatus = () => iotStatus;
const healthRouter = createHealthRouter(getStatus);
const profileRouter = createProfileRouter();
const notificationsRouter = createNotificationsRouter();
const reportsRouter = createReportsRouter();
const authRouter = createAuthRouter();
const employerRouter = createEmployerRouter();
const tasksRouter = createTasksRouter();
const binsRouter = createBinsRouter();

app.get('/', (req, res) => {
  res.send('SmartBin Backend Running');
});
app.use('/health', healthRouter);
app.use('/profile', profileRouter);
app.get("/test", (req, res) => {
  const testData = {
    deviceId: "BIN001",
    timestamp: new Date().toISOString(),
    level: 82,
    temperature: 30,
    humidity: 65,
    gasLevel: 120,
    battery: 3.8,
    rssi: -67,
    location: "Park Street",
    latitude: 22.3039,
    longitude: 70.8022
  };

  console.log("📤 Sending test data:", testData);

  broadcastSmartbinData(testData);

  res.json({
    success: true,
    message: "Test data sent to frontend"
  });
});
app.use('/notifications', notificationsRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/reports', reportsRouter);
app.use('/api/reports', reportsRouter);
app.use('/auth', authRouter);
app.use('/api/auth', authRouter);
app.use('/api/employers', employerRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/bins', binsRouter);

const { broadcastSmartbinData } = initializeSocket(httpServer, corsOptions, logger);

let binSyncInterval = null;

const syncBinsFromDynamo = async () => {
  try {
    const bins = await fetchAllBinsFromDynamo(dashboardDynamoDb);
    if (bins && bins.length > 0) {
      iotStatus = {
        iot: 'Connected',
        mode: 'Direct DynamoDB',
        binCount: bins.length,
        lastSync: new Date().toISOString(),
      };
      broadcastSmartbinData({ bins });
    }
  } catch (err) {
    logger.warn('Unable to sync bins from DynamoDB', err?.message);
    iotStatus = { iot: 'Error', error: err?.message };
  }
};

const startServer = async () => {
  // Sync smart bins directly from DynamoDB SmartBins table on startup
  try {
    await syncBinsFromDynamo();
  } catch (error) {
    logger.warn('Initial DynamoDB bin sync could not be completed; continuing with HTTP server startup', error instanceof Error ? error.message : String(error));
  }

  // Periodic background sync every 20 seconds
  binSyncInterval = setInterval(syncBinsFromDynamo, 20000);

  // Auto-retention: prune alerts older than 14 days on startup and daily
  void autoPruneOldAlerts(dashboardDynamoDb);
  setInterval(() => void autoPruneOldAlerts(dashboardDynamoDb), 24 * 60 * 60 * 1000);

  httpServer.once('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      logger.error(`Port ${serverConfig.port} is already in use`);
    } else {
      logger.error('HTTP server error', error.message);
    }
    process.exit(1);
  });

  httpServer.listen(serverConfig.port, () => {
    logger.info(`Server is running on port ${serverConfig.port}`);
  });
};

const shutdown = async () => {
  logger.info('Shutdown requested. Closing server and database connections.');
  if (binSyncInterval) clearInterval(binSyncInterval);
  httpServer.close(async (err) => {
    if (err) {
      logger.error('HTTP server shutdown error', err.message);
    }
    dashboardDynamoDb.destroy();
    process.exit(0);
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

startServer();
