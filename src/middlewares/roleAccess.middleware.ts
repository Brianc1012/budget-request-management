// src/middlewares/roleAccess.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { forbiddenResponse } from '../utils/response.util';
import { RoleLevel } from '../types/api';
import { UserContext } from '../types/express';

export const requireRole = (...allowedRoles: RoleLevel[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return forbiddenResponse(res, 'User context not found');
    }

    const userRole = determineRoleLevel(req.user.role);

    if (!allowedRoles.includes(userRole)) {
      return forbiddenResponse(
        res,
        `Access denied. Required role: ${allowedRoles.join(' or ')}`
      );
    }

    next();
  };
};

export function determineRoleLevel(role: string): RoleLevel {
  if (role === 'SuperAdmin') return 'superadmin';
  if (role.includes('Admin')) return 'admin';
  return 'user';
}

// Apply access filter to queries
export function applyAccessFilter(
  baseQuery: any,
  user: UserContext,
  serviceName?: string
): any {
  const roleLevel = determineRoleLevel(user.role);

  // SuperAdmin: No restrictions
  if (roleLevel === 'superadmin') {
    return baseQuery;
  }

  // Department Admin: Own department only
  if (roleLevel === 'admin') {
    return {
      ...baseQuery,
      department: user.department
    };
  }

  // Regular User: Own records only
  return {
    ...baseQuery,
    requestedBy: user.id
  };
}
