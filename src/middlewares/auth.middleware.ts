// src/middlewares/auth.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt.util';
import { unauthorizedResponse } from '../utils/response.util';
import { JWTPayload } from '../types/api';
import { env } from '../config/env';

export const verifyJWT = (req: Request, res: Response, next: NextFunction) => {
  try {
    // If JWT is disabled, create a mock user context for testing
    if (env.JWT_DISABLED) {
      console.log('⚠️  JWT Validation is DISABLED - Using mock user for testing');
      
      // Create mock user based on x-mock-role header (for testing different roles)
      const mockRole = (req.headers['x-mock-role'] as string) || 'SuperAdmin';
      const mockDepartment = (req.headers['x-mock-department'] as string) || 'finance';
      
      req.user = {
        id: '1',
        username: 'test_user',
        role: mockRole,
        department: mockDepartment
      };
      
      return next();
    }

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
