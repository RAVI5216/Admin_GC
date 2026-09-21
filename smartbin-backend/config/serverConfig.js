import dotenv from 'dotenv';

dotenv.config();

const port = Number(process.env.PORT ?? 5000);

export const serverConfig = {
  port: Number.isInteger(port) && port > 0 ? port : 5000,
};
