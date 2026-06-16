import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(8),
  REDIS_URL: z.string().url(),
  R2_ENDPOINT: z.string().url(),
  R2_ACCESS_KEY_ID: z.string(),
  R2_SECRET_ACCESS_KEY: z.string(),
  R2_BUCKET_NAME: z.string(),
  FRONTEND_URL: z.string().url(),
  PORT: z.string().optional(),
  METRICS_BEARER_TOKEN: z.string().optional(),
});

export const env = envSchema.parse(process.env);
