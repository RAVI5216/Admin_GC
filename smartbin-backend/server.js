import http from 'http';
import express from 'express';
import cors from 'cors';
import { serverConfig } from './config/serverConfig.js';
import { dbConfig } from './config/dbConfig.js';
import { connectMongo, getDb } from './db/mongo.js';
import { createHealthRouter } from './routes/health.js';
import { createProfileRouter } from './routes/profile.js';
import { createNotificationsRouter } from './routes/notifications.js';
import { createAuthRouter } from './routes/auth.js';
import { createEmployerRouter } from './routes/employers.js';
import { initializeSocket } from './socket/socket.js';
import { SmartBinIoTService } from './iot/smartbinService.js';
import { logger } from './utils/logger.js';

const app = express();
const httpServer = http.createServer(app);

const corsOptions = {
  origin: true,
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

let iotStatus = { iot: 'Disconnected' };

const saveAlertNotification = async (payload) => {
  try {
    const db = getDb();
    const { deviceId, location, status: rawStatus, fillLevel, fillPercentage, timestamp, lastUpdated } = payload;
    const effectiveFillLevel =
      typeof fillLevel === 'number'
        ? fillLevel
        : typeof fillPercentage === 'number'
        ? fillPercentage
        : undefined;
    const normalizedStatus = typeof rawStatus === 'string' ? rawStatus.trim().toLowerCase() : '';
    const effectiveStatus =
      normalizedStatus === 'almost full'
        ? 'warning'
        : normalizedStatus === 'full' || normalizedStatus === 'warning' || normalizedStatus === 'offline'
        ? normalizedStatus
        : typeof effectiveFillLevel === 'number' && effectiveFillLevel >= 90
        ? 'full'
        : typeof effectiveFillLevel === 'number' && effectiveFillLevel >= 70
        ? 'warning'
        : 'online';
    const shouldAlert = effectiveStatus === 'full' || effectiveStatus === 'warning' || effectiveStatus === 'offline';
    if (!shouldAlert) {
      return;
    }

    const title =
      effectiveStatus === 'full'
        ? 'Bin Full'
        : effectiveStatus === 'offline'
        ? 'Device Offline'
        : 'High Fill Level';
    const message =
      effectiveStatus === 'full'
        ? `${location ?? deviceId} is full and requires service.`
        : effectiveStatus === 'offline'
        ? `${location ?? deviceId} is offline and needs attention.`
        : `${location ?? deviceId} is ${effectiveFillLevel ?? 'unknown'}% full and approaching capacity.`;

    await db.collection('notifications').insertOne({
      title,
      message,
      severity: effectiveStatus === 'offline' ? 'critical' : 'warning',
      solved: false,
      problemSolved: false,
      time: timestamp ?? lastUpdated ?? new Date().toISOString(),
      deviceId: deviceId ?? null,
      location: location ?? null,
      createdAt: new Date().toISOString(),
      updatedAt: null,
    });
  } catch (error) {
    logger.error('Unable to persist alert notification', error instanceof Error ? error.message : String(error));
  }
};

const getStatus = () => iotStatus;
const healthRouter = createHealthRouter(getStatus);
const profileRouter = createProfileRouter();
const notificationsRouter = createNotificationsRouter();
const authRouter = createAuthRouter();
const employerRouter = createEmployerRouter();

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
app.use('/auth', authRouter);
app.use('/employers', employerRouter);

const { broadcastSmartbinData } = initializeSocket(httpServer, corsOptions, logger);

const iotService = new SmartBinIoTService({
  iotServiceUrl: process.env.SMARTBIN_IOT_SERVICE_URL,
  onData: async (payload) => {
    broadcastSmartbinData(payload);
    await saveAlertNotification(payload);
  },
  onStatusChange: (status) => {
    iotStatus = status;
  },
  logger,
});

const startServer = async () => {
  try {
    await connectMongo(dbConfig.uri);
    logger.info('Connected to MongoDB');

    try {
      const db = getDb();
      await db.createCollection('notifications');
      logger.info('Ensured notifications collection exists');
    } catch (createError) {
      if (createError.codeName === 'NamespaceExists' || createError.message.includes('already exists')) {
        logger.info('Notifications collection already exists');
      } else {
        logger.warn('Unable to create notifications collection', createError instanceof Error ? createError.message : String(createError));
      }
    }
  } catch (error) {
    logger.error('MongoDB connection failed', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }

  try {
    await iotService.initialize();
  } catch (error) {
    logger.warn('EC2 SmartBin IoT service initialization could not be completed; continuing with HTTP server startup', error instanceof Error ? error.message : String(error));
  }

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
  logger.info('Shutdown requested. Closing server and EC2 IoT connection.');
  httpServer.close(async (err) => {
    if (err) {
      logger.error('HTTP server shutdown error', err.message);
    }
    await iotService.disconnect();
    process.exit(0);
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

startServer();
