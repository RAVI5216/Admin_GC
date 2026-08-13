import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const getEnv = (name, required = true) => {
  const value = process.env[name];
  if (required && !value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

const resolveRequiredFile = (envName) => {
  const relativePath = getEnv(envName);
  const resolvedPath = path.resolve(__dirname, '..', relativePath);

  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`Certificate file not found for ${envName}: ${resolvedPath}`);
  }

  return resolvedPath;
};

export const awsConfig = {
  endpoint: getEnv('AWS_IOT_ENDPOINT'),
  clientId: getEnv('CLIENT_ID'),
  topic: getEnv('MQTT_TOPIC'),
  certPath: resolveRequiredFile('MQTT_CERT_PATH'),
  privateKeyPath: resolveRequiredFile('MQTT_PRIVATE_KEY_PATH'),
  caPath: resolveRequiredFile('MQTT_CA_PATH'),
};

export const serverConfig = {
  port: Number(getEnv('PORT')) || 5000,
};
