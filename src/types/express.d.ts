// src/types/express.d.ts
import { Request } from 'express';

export interface UserContext {
  id: string;
  username: string;
  role: string;
  department: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: UserContext;
      serviceName?: string;
      apiKeyId?: number;
    }
  }
}
