// src/config/env.ts
import { z } from 'zod';

const envSchema = z.object({
  // Server
  PORT: z.string().default('4005'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  // Database
  BUDGET_REQUEST_DATABASE_URL: z.string().url(),
  
  // Redis
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.string().default('6379'),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_DB: z.string().default('0'),
  
  // JWT
  JWT_SECRET: z.string().min(32),
  
  // External Services
  FINANCE_API_URL: z.string().url().optional(),
  FINANCE_API_KEY: z.string().optional(),
  AUDIT_LOGS_API_URL: z.string().url().optional(),
  AUDIT_API_KEY: z.string().optional(),
  
  // Email
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  
  // Frontend
  FRONTEND_URL: z.string().url().optional(),
  
  // CORS
  CORS_ORIGIN: z.string().optional(),
  
  // Webhook
  WEBHOOK_SECRET: z.string().optional()
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(): Env {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors.map(err => err.path.join('.')).join(', ');
      throw new Error(`Invalid environment variables: ${missingVars}`);
    }
    throw error;
  }
}

// Export validated env
export const env = validateEnv();
