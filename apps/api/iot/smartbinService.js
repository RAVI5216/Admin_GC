import { io } from 'socket.io-client';

/**
 * SmartBin IoT Service
 * Connects to EC2 SmartBin IoT service and relays smartbin-data events to the backend Socket.IO server
 */
export class SmartBinIoTService {
  constructor({ iotServiceUrl, onData, onStatusChange, logger }) {
    if (!iotServiceUrl) {
      throw new Error('iotServiceUrl is required');
    }
    this.iotServiceUrl = iotServiceUrl;
    this.socket = null;
    this.onData = onData;
    this.onStatusChange = onStatusChange;
    this.logger = logger || console;
    this.connected = false;
    this.reconnectAttempts = 0;
  }

  /**
   * Initialize connection to EC2 SmartBin IoT service
   */
  async initialize() {
    try {
      this.logger.info('Initializing SmartBin IoT service', { url: this.iotServiceUrl });

      this.socket = io(this.iotServiceUrl, {
        path: '/socket.io',
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 2000,
        reconnectionDelayMax: 10000,
      });

      this.socket.on('connect', () => {
        this.connected = true;
        this.reconnectAttempts = 0;
        this.logger.info('Connected to EC2 SmartBin IoT service', { socketId: this.socket.id });
        this.onStatusChange?.({ iot: 'Connected' });
      });

      this.socket.on('disconnect', (reason) => {
        this.connected = false;
        this.logger.warn('Disconnected from EC2 SmartBin IoT service', { reason });
        this.onStatusChange?.({ iot: 'Disconnected' });
      });

      this.socket.on('connect_error', (error) => {
        this.connected = false;
        this.reconnectAttempts++;
        this.logger.error('EC2 SmartBin IoT connection error', {
          error: error?.message ?? String(error),
          reconnectAttempts: this.reconnectAttempts,
        });
        this.onStatusChange?.({ iot: 'Error', error: error?.message ?? String(error) });
      });

      this.socket.on('smartbin-data', (data) => {
        this.handleSmartbinData(data);
      });

      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          // Don't reject if we're just waiting to connect - allow async connection
          this.logger.info('SmartBin IoT service initialization timeout, but continuing...');
          resolve();
        }, 5000);

        this.socket.once('connect', () => {
          clearTimeout(timeout);
          resolve();
        });

        this.socket.once('connect_error', (error) => {
          clearTimeout(timeout);
          this.logger.warn('SmartBin IoT service initial connection failed, continuing without data', error?.message ?? String(error));
          resolve();
        });
      });

      this.logger.info('SmartBin IoT service initialization complete');
    } catch (error) {
      this.logger.error('SmartBin IoT service initialization error', error instanceof Error ? error.message : String(error));
      this.onStatusChange?.({ iot: 'Error', error: error?.message ?? String(error) });
      throw error;
    }
  }

  /**
   * Validate incoming payload from EC2 SmartBin IoT service
   */
  validatePayload(payload) {
    if (!payload || typeof payload !== 'object') {
      throw new Error('Payload must be a JSON object');
    }

    const {
      deviceId,
      lastUpdated,
      fillPercentage,
      distance,
      status,
      online,
      uptime,
    } = payload;

    // Validate required fields
    if (!deviceId || typeof deviceId !== 'string') {
      throw new Error('Invalid or missing deviceId');
    }

    // Validate optional numeric fields
    const validateNumeric = (value, name) => {
      if (value !== undefined && value !== null) {
        if (typeof value !== 'number' || !Number.isFinite(value)) {
          throw new Error(`${name} must be numeric when provided`);
        }
      }
      return value;
    };

    // Validate optional boolean fields
    const validateBoolean = (value, name) => {
      if (value !== undefined && value !== null) {
        if (typeof value !== 'boolean') {
          throw new Error(`${name} must be boolean when provided`);
        }
      }
      return value;
    };

    // Validate optional string fields
    const validateString = (value, name) => {
      if (value !== undefined && value !== null) {
        if (typeof value !== 'string') {
          throw new Error(`${name} must be a string when provided`);
        }
      }
      return value;
    };

    // Validate timestamp
    if (lastUpdated !== undefined && lastUpdated !== null) {
      if (typeof lastUpdated !== 'string') {
        throw new Error('lastUpdated must be a valid timestamp string when provided');
      }
      // Try to parse as date
      const date = new Date(lastUpdated);
      if (isNaN(date.getTime())) {
        throw new Error('lastUpdated must be a valid ISO 8601 timestamp');
      }
    }

    const validated = {
      deviceId,
      ...(payload.location ? { location: validateString(payload.location, 'location') } : {}),
      ...(payload.latitude !== undefined ? { latitude: validateNumeric(payload.latitude, 'latitude') } : {}),
      ...(payload.longitude !== undefined ? { longitude: validateNumeric(payload.longitude, 'longitude') } : {}),
      ...(payload.temperature !== undefined ? { temperature: validateNumeric(payload.temperature, 'temperature') } : {}),
      ...(payload.humidity !== undefined ? { humidity: validateNumeric(payload.humidity, 'humidity') } : {}),
      ...(payload.gasLevel !== undefined ? { gasLevel: validateNumeric(payload.gasLevel, 'gasLevel') } : {}),
      ...(payload.battery !== undefined ? { battery: validateNumeric(payload.battery, 'battery') } : {}),
      ...(payload.rssi !== undefined ? { rssi: validateNumeric(payload.rssi, 'rssi') } : {}),
      ...(payload.timestamp ? { timestamp: validateString(payload.timestamp, 'timestamp') } : {}),
      ...(payload.fillLevel !== undefined ? { fillLevel: validateNumeric(payload.fillLevel, 'fillLevel') } : {}),
      ...(payload.level !== undefined ? { level: validateNumeric(payload.level, 'level') } : {}),
    };

    // Add optional validated fields
    if (lastUpdated !== undefined) {
      validated.lastUpdated = validateString(lastUpdated, 'lastUpdated');
    }
    if (fillPercentage !== undefined) {
      validated.fillPercentage = validateNumeric(fillPercentage, 'fillPercentage');
    }
    if (distance !== undefined) {
      validated.distance = validateNumeric(distance, 'distance');
    }
    if (status !== undefined) {
      validated.status = validateString(status, 'status');
    }
    if (online !== undefined) {
      validated.online = validateBoolean(online, 'online');
    }
    if (uptime !== undefined) {
      validated.uptime = validateNumeric(uptime, 'uptime');
    }

    return validated;
  }

  /**
   * Handle incoming smartbin-data event from EC2 service
   */
  handleSmartbinData(data) {
    try {
      const validated = this.validatePayload(data);
      this.logger.debug('Validated smartbin data from EC2', { deviceId: validated.deviceId });
      this.onData?.(validated);
    } catch (error) {
      this.logger.error('Failed to validate smartbin-data payload', error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Check if service is connected
   */
  isConnected() {
    return this.connected;
  }

  /**
   * Gracefully disconnect from EC2 service
   */
  async disconnect() {
    if (this.socket) {
      this.logger.info('Disconnecting from EC2 SmartBin IoT service');
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
    }
  }
}
