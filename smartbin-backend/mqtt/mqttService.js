import { mqtt, iot } from 'aws-iot-device-sdk-v2';
import { awsConfig } from '../config/awsConfig.js';

const buildClient = () => {
  const config = iot.AwsIotMqttConnectionConfigBuilder
    .new_mtls_builder_from_path(awsConfig.certPath, awsConfig.privateKeyPath)
    .with_certificate_authority_from_path(undefined, awsConfig.caPath)
    .with_clean_session(false)
    .with_client_id(awsConfig.clientId)
    .with_endpoint(awsConfig.endpoint)
    .with_keep_alive_seconds(120)
    .with_ping_timeout_ms(60000)
    .with_protocol_operation_timeout_ms(120000)
    .with_reconnect_min_sec(5)
    .with_reconnect_max_sec(30)
    .build();

  const client = new mqtt.MqttClient();
  return client.new_connection(config);
};

export class MqttService {
  constructor({ onMessage, onStatusChange, logger }) {
    this.connection = null;
    this.onMessage = onMessage;
    this.onStatusChange = onStatusChange;
    this.logger = logger;
    this.connected = false;
  }

  async initialize() {
    try {
      this.connection = buildClient();

      this.connection.on('connect', () => {
        this.connected = true;
        this.logger.info('AWS IoT MQTT connected');
        this.onStatusChange?.({ mqtt: 'Connected' });
      });

      this.connection.on('disconnect', () => {
        this.connected = false;
        this.logger.warn('AWS IoT MQTT disconnected');
        this.onStatusChange?.({ mqtt: 'Disconnected' });
      });

      this.connection.on('interrupt', (error) => {
        this.connected = false;
        this.logger.warn('AWS IoT MQTT interrupted', { error: error?.message ?? String(error) });
        this.onStatusChange?.({ mqtt: 'Interrupted', error: error?.message });
      });

      this.connection.on('resume', () => {
        this.connected = true;
        this.logger.info('AWS IoT MQTT resumed connection');
        this.onStatusChange?.({ mqtt: 'Connected' });
      });

      this.connection.on('error', (error) => {
        this.connected = false;
        this.logger.error('AWS IoT MQTT error', error instanceof Error ? error.message : String(error));
        this.onStatusChange?.({ mqtt: 'Error', error: error?.message ?? String(error) });
      });

      await this.connection.connect();
      await this.subscribeToTopic(awsConfig.topic);
    } catch (error) {
      this.connected = false;
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn('AWS IoT MQTT initialization failed; continuing without MQTT', message);
      this.onStatusChange?.({ mqtt: 'Disconnected', error: message });
    }
  }

  async subscribeToTopic(topic) {
    if (!this.connection) {
      throw new Error('MQTT connection is not initialized');
    }

    this.logger.info(`Subscribing to topic: ${topic}`);

    await this.connection.subscribe(topic, mqtt.QoS.AtLeastOnce, (topicName, payload) => {
      const rawPayload = payload.toString();
      this.logger.debug(`MQTT message received on ${topicName}: ${rawPayload}`);
      this.handleIncomingMessage(rawPayload);
    });
  }

  async handleIncomingMessage(rawPayload) {
    try {
      const parsed = JSON.parse(rawPayload);
      const validated = this.validatePayload(parsed);

      this.logger.info('Valid sensor payload received', { topic: awsConfig.topic, payload: validated });
      this.onMessage?.(validated);
    } catch (error) {
      this.logger.error('Failed to parse or validate MQTT payload', error instanceof Error ? error.message : String(error));
    }
  }

  validatePayload(payload) {
    if (!payload || typeof payload !== 'object') {
      throw new Error('Payload must be a JSON object');
    }

    const parseNumber = (value) => {
      if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
      }
      if (typeof value === 'string' && value.trim() !== '') {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : undefined;
      }
      return undefined;
    };

    const getCoordinate = (payload, keys) => {
      for (const key of keys) {
        const parsed = parseNumber(payload[key]);
        if (parsed !== undefined) {
          return parsed;
        }
      }
      return undefined;
    };

    const {
      deviceId,
      timestamp,
      level,
      temperature,
      humidity,
      location,
      gasLevel,
      battery,
      rssi,
      status,
    } = payload;

    const latitude = getCoordinate(payload, ['latitude', 'lat']);
    const longitude = getCoordinate(payload, ['longitude', 'lng', 'lon', 'long']);

    if (!deviceId || typeof deviceId !== 'string') {
      throw new Error('Invalid or missing deviceId');
    }
    if (!timestamp || typeof timestamp !== 'string') {
      throw new Error('Invalid or missing timestamp');
    }
    if (parseNumber(level) === undefined || parseNumber(level) < 0 || parseNumber(level) > 100) {
      throw new Error('Invalid or missing level');
    }
    if (typeof temperature !== 'number') {
      throw new Error('Invalid or missing temperature');
    }
    if (typeof humidity !== 'number') {
      throw new Error('Invalid or missing humidity');
    }

    const derivedStatus =
      typeof status === 'string' && status
        ? status
        : parseNumber(level) >= 90
        ? 'full'
        : 'online';

    return {
      deviceId,
      timestamp,
      location: typeof location === 'string' ? location : `Bin ${deviceId}`,
      latitude,
      longitude,
      fillLevel: parseNumber(level) ?? 0,
      temperature,
      humidity,
      gasLevel: parseNumber(gasLevel) ?? 0,
      battery: parseNumber(battery) ?? 0,
      rssi: parseNumber(rssi) ?? 0,
      status: derivedStatus,
      lastUpdated: timestamp,
    };
  }

  async disconnect() {
    if (this.connection) {
      await this.connection.disconnect();
      this.connected = false;
    }
  }
}
