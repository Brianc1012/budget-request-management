// src/middlewares/auth.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt.util';
import { unauthorizedResponse } from '../utils/response.util';
import { JWTPayload } from '../types/api';

export const verifyJWT = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader?.startsWith('Bearer ')) {
      return unauthorizedResponse(res, 'Missing or invalid authorization token');
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token) as JWTPayload;

    // Attach user context to request
    req.user = {
      id: decoded.sub,
      username: decoded.username,
      role: decoded.role,
      department: extractDepartment(decoded.role)
    };

    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      return unauthorizedResponse(res, 'Token has expired');
    }

    return unauthorizedResponse(res, 'Invalid token');
  }
};

function extractDepartment(role: string): string {
  // "Finance Admin" → "finance"
  // "Inventory Staff" → "inventory"
  const match = role.match(/^(Finance|HR|Inventory|Operations)/i);
  return match ? match[1].toLowerCase() : 'unknown';
}
