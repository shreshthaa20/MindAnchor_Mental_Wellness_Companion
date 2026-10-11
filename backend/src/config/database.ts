import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

export const getRequiredEnv = (name: string): string => {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is not set`);
  }

  return value;
};

export const JWT_SECRET = getRequiredEnv("JWT_SECRET");

export const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: process.env.DB_SSL === 'true' || (!['localhost', '127.0.0.1', 'postgres', 'mindanchor-postgres'].includes(process.env.DB_HOST || '')),
});
