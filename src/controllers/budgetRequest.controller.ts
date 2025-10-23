// src/controllers/budgetRequest.controller.ts
import { Request, Response } from 'express';
import * as service from '../services/budgetRequest.service';
import auditLogger from '../services/auditLogger.service';
import webhookDispatcher from '../webhooks/dispatcher';
import { applyAccessFilter } from '../middlewares/roleAccess.middleware';
import { successResponse, successResponseWithPagination, errorResponse, notFoundResponse, forbiddenResponse } from '../utils/response.util';
import cache from '../utils/cache.util';

export async function listBudgetRequests(req: Request, res: Response) {
  try {
    const { 
      page = 1,
      limit = 20,
      status,
      department,
      dateFrom,
      dateTo,
      priority 
    } = req.query;

    // Build base filter
    let filter: any = {
      isDeleted: false
    };

    // Apply filters
    if (status) filter.status = status;
    if (department) filter.department = department;
    if (priority) filter.priority = priority;

    // Apply date range filter
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.gte = new Date(dateFrom as string);
      if (dateTo) filter.createdAt.lte = new Date(dateTo as string);
    }

    // Apply role-based access control
    filter = applyAccessFilter(filter, req.user!, req.serviceName);

    // Execute query with pagination
    const skip = (Number(page) - 1) * Number(limit);
    const [data, total] = await Promise.all([
      service.findMany(filter, {
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          itemAllocations: {
            select: {
              id: true,
              itemName: true,
              totalCost: true,
              status: true
            }
          }
        }
      }),
      service.count(filter)
    ]);

    return successResponseWithPagination(
      res,
      data,
      {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit))
      },
      'Budget requests retrieved successfully'
    );
  } catch (error: any) {
    console.error('List budget requests error:', error);
    return errorResponse(res, error.message || 'Failed to retrieve budget requests');
  }
}

export async function getBudgetRequest(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const budgetRequest = await service.findById(Number(id));

    if (!budgetRequest) {
      return notFoundResponse(res, 'Budget request');
    }

    // Verify access rights
    const hasAccess = service.checkAccess(budgetRequest, req.user!);
    if (!hasAccess) {
      return forbiddenResponse(res, 'You do not have permission to view this budget request');
    }

    // Log view action
    await auditLogger.view({
      id: budgetRequest.id,
      requestCode: budgetRequest.requestCode
    }, req.user!);

    return successResponse(res, budgetRequest, 'Budget request retrieved successfully');
  } catch (error: any) {
    console.error('Get budget request error:', error);
    return errorResponse(res, error.message || 'Failed to retrieve budget request');
  }
}

export async function createBudgetRequest(req: Request, res: Response) {
  try {
    const budgetRequest = await service.create(req.body, req.user!);

    // Log creation
    await auditLogger.create({
      id: budgetRequest.id,
      requestCode: budgetRequest.requestCode,
      department: budgetRequest.department,
      amountRequested: budgetRequest.amountRequested
    }, req.user!);

    // Invalidate related caches
    await cache.invalidateBudgetRequests();
    await cache.invalidateAnalytics();

    // Dispatch webhook
    await webhookDispatcher.dispatch('budget_request.created', {
      budgetRequestId: budgetRequest.id,
      requestCode: budgetRequest.requestCode,
      department: budgetRequest.department,
      amountRequested: Number(budgetRequest.amountRequested)
    });

    return successResponse(
      res,
      budgetRequest,
      'Budget request created successfully',
      201
    );
  } catch (error: any) {
    console.error('Create budget request error:', error);
    return errorResponse(res, error.message || 'Failed to create budget request');
  }
}

export async function submitBudgetRequest(req: Request, res: Response) {
  try {
    const { id } = req.params;

    // Get existing budget request
    const existing = await service.findById(Number(id));
    
    if (!existing) {
      return notFoundResponse(res, 'Budget request');
    }

    // Verify ownership or admin role
    if (existing.requestedBy !== req.user!.id && !req.user!.role.includes('Admin')) {
      return forbiddenResponse(res, 'Only the requester or admins can submit this request');
    }

    // Can only submit drafts
    if (existing.status !== 'PENDING' || !existing.isDraft) {
      return errorResponse(res, 'Only draft budget requests can be submitted', 400);
    }

    // Submit
    const updated = await service.submit(Number(id), req.user!);

    // Log submission
    await auditLogger.submit({
      id: updated.id,
      requestCode: updated.requestCode,
      amountRequested: updated.amountRequested
    }, req.user!);

    // Invalidate related caches
    await cache.invalidateBudgetRequests();
    await cache.invalidateAnalytics();

    // Dispatch webhook
    await webhookDispatcher.dispatch('budget_request.submitted', {
      budgetRequestId: updated.id,
      requestCode: updated.requestCode,
      department: updated.department,
      amountRequested: Number(updated.amountRequested),
      requestedBy: updated.requestedBy
    });

    return successResponse(res, updated, 'Budget request submitted successfully');
  } catch (error: any) {
    console.error('Submit budget request error:', error);
    return errorResponse(res, error.message || 'Failed to submit budget request');
  }
}

export async function approveBudgetRequest(req: Request, res: Response) {
  try {
    const { id } = req.params;

    // Get existing budget request
    const existing = await service.findById(Number(id));
    
    if (!existing) {
      return notFoundResponse(res, 'Budget request');
    }

    // Can only approve pending requests
    if (existing.status !== 'PENDING') {
      return errorResponse(res, 'Only pending budget requests can be approved', 400);
    }

    // Approve budget request
    const approved = await service.approve(Number(id), req.body, req.user!);

    // Log approval
    await auditLogger.approve({
      id: approved.id,
      requestCode: approved.requestCode,
      amountRequested: approved.amountRequested,
      reservedAmount: approved.reservedAmount,
      approvedBy: req.user!.id
    }, req.user!);

    // Invalidate related caches
    await cache.invalidateBudgetRequests();
    await cache.invalidateAnalytics();

    // Dispatch webhook
    await webhookDispatcher.dispatch('budget_request.approved', {
      budgetRequestId: approved.id,
      requestCode: approved.requestCode,
      department: approved.department,
      amountRequested: Number(approved.amountRequested),
      reservedAmount: Number(approved.reservedAmount),
      approvedBy: req.user!.id
    });

    return successResponse(res, approved, 'Budget request approved successfully');
  } catch (error: any) {
    console.error('Approve budget request error:', error);
    return errorResponse(res, error.message || 'Failed to approve budget request');
  }
}

export async function rejectBudgetRequest(req: Request, res: Response) {
  try {
    const { id } = req.params;

    // Get existing budget request
    const existing = await service.findById(Number(id));
    
    if (!existing) {
      return notFoundResponse(res, 'Budget request');
    }

    // Can only reject pending requests
    if (existing.status !== 'PENDING') {
      return errorResponse(res, 'Only pending budget requests can be rejected', 400);
    }

    // Reject budget request
    const rejected = await service.reject(Number(id), req.body, req.user!);

    // Log rejection
    await auditLogger.reject({
      id: rejected.id,
      requestCode: rejected.requestCode,
      amountRequested: rejected.amountRequested,
      rejectedBy: req.user!.id,
      reason: req.body.reviewNotes
    }, req.user!);

    // Invalidate related caches
    await cache.invalidateBudgetRequests();
    await cache.invalidateAnalytics();

    // Dispatch webhook
    await webhookDispatcher.dispatch('budget_request.rejected', {
      budgetRequestId: rejected.id,
      requestCode: rejected.requestCode,
      department: rejected.department,
      amountRequested: Number(rejected.amountRequested),
      rejectedBy: req.user!.id,
      reason: req.body.reviewNotes
    });

    return successResponse(res, rejected, 'Budget request rejected successfully');
  } catch (error: any) {
    console.error('Reject budget request error:', error);
    return errorResponse(res, error.message || 'Failed to reject budget request');
  }
}
