// src/middlewares/permission.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { forbiddenResponse, notFoundResponse } from '../utils/response.util';
import { UserRole } from '../types/budgetRequest.types';

export interface Permission {
  action: 'view' | 'create' | 'edit' | 'delete' | 'approve' | 'submit';
  scope: 'own' | 'department' | 'all';
}

/**
 * Check if user has permission to perform an action
 * Based on IMPLEMENTATION_GUIDE.md Permission Matrix
 */
export const checkPermission = (requiredPermission: Permission) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user;
      if (!user) {
        return forbiddenResponse(res, 'User context not found');
      }

      const { id } = req.params;
      const { action, scope } = requiredPermission;

      // Finance Admin has full access to all departments
      if (user.department === 'finance' && user.role.toLowerCase().includes('admin')) {
        return next();
      }

      // Check department-specific permissions
      if (scope === 'department' && id) {
        const request = await prisma.budgetRequest.findUnique({
          where: { id: parseInt(id) },
          select: { department: true, isDeleted: true }
        });

        if (!request || request.isDeleted) {
          return notFoundResponse(res, 'Budget request');
        }

        // Non-Finance users can only access own department
        if (request.department !== user.department) {
          return forbiddenResponse(res, 'Access denied: Department mismatch');
        }
      }

      // Check ownership for 'own' scope
      if (scope === 'own' && id) {
        const request = await prisma.budgetRequest.findUnique({
          where: { id: parseInt(id) },
          select: { createdBy: true, department: true, status: true, isDeleted: true }
        });

        if (!request || request.isDeleted) {
          return notFoundResponse(res, 'Budget request');
        }

        // Must be creator
        if (request.createdBy !== user.id) {
          return forbiddenResponse(res, 'Access denied: Not the creator');
        }

        // For edit/delete, must be DRAFT status
        if (['edit', 'delete'].includes(action) && request.status !== 'DRAFT') {
          return forbiddenResponse(res, 'Can only edit/delete draft requests');
        }
      }

      // Check action-specific permissions
      if (action === 'approve' && user.department !== 'finance') {
        return forbiddenResponse(res, 'Only Finance can approve budget requests');
      }

      if (['edit', 'delete'].includes(action) && id) {
        const request = await prisma.budgetRequest.findUnique({
          where: { id: parseInt(id) },
          select: { status: true, createdBy: true, department: true, isDeleted: true }
        });

        if (!request || request.isDeleted) {
          return notFoundResponse(res, 'Budget request');
        }

        // Can only edit/delete DRAFT status
        if (request.status !== 'DRAFT') {
          return forbiddenResponse(res, 'Can only edit/delete draft requests');
        }

        // Finance Admin can edit/delete any department's drafts
        if (user.department === 'finance' && user.role.toLowerCase().includes('admin')) {
          return next();
        }

        // Department Admin can edit/delete own department's drafts
        if (user.role.toLowerCase().includes('admin') && request.department === user.department) {
          return next();
        }

        // Non-Admin can only edit/delete own drafts
        if (!user.role.toLowerCase().includes('admin') && request.createdBy !== user.id) {
          return forbiddenResponse(res, 'Can only edit/delete own requests');
        }
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      return forbiddenResponse(res, 'Permission check failed');
    }
  };
};

/**
 * Apply access filter to database queries based on user role and department
 */
export function applyAccessFilter(filter: any, user: any): any {
  // Finance users can see all departments
  if (user.department === 'finance') {
    return filter;
  }

  // Other departments can only see own department
  return {
    ...filter,
    department: user.department
  };
}

/**
 * Check if user can create for specific department
 */
export const canCreateForDepartment = (req: Request, res: Response, next: NextFunction) => {
  const user = req.user!;
  const { department } = req.body;

  // Finance Admin can create for any department
  if (user.department === 'finance' && user.role.toLowerCase().includes('admin')) {
    return next();
  }

  // Others can only create for own department
  if (department !== user.department) {
    return forbiddenResponse(res, 'Can only create requests for your own department');
  }

  next();
};

/**
 * Check if user can export all departments or only own
 */
export const canExportAllDepartments = (user: any): boolean => {
  return user.department === 'finance';
};

/**
 * Check if user can view all departments
 */
export const canViewAllDepartments = (user: any): boolean => {
  return user.department === 'finance';
};

/**
 * Extract user role type from role string
 * "Finance Admin" -> "ADMIN"
 * "Finance Staff" -> "NON_ADMIN"
 */
export function extractUserRoleType(roleString: string): UserRole {
  if (roleString.toLowerCase().includes('admin')) {
    return 'ADMIN';
  }
  return 'NON_ADMIN';
}

/**
 * Extract department from role string
 * "Finance Admin" -> "finance"
 * "Inventory Staff" -> "inventory"
 */
export function extractDepartment(roleString: string): string {
  const match = roleString.match(/^(Finance|HR|Inventory|Operations)/i);
  return match ? match[1].toLowerCase() : 'unknown';
}
