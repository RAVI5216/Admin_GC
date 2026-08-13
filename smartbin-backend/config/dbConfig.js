import dotenv from 'dotenv';

dotenv.config();

const getEnv = (name, required = true) => {
  const value = process.env[name];
  if (required && !value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

export const dbConfig = {
  uri: getEnv('MONGODB_URI'),
};
