// src/controllers/itemAllocation.controller.ts
import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { successResponse, errorResponse, notFoundResponse } from '../utils/response.util';
import { logAuditActivity } from '../services/auditLogger.service';
import { invalidateBudgetRequestCache } from '../services/cache.service';
import { Prisma } from '@prisma/client';

/**
 * Get all item allocations for a budget request
 */
export async function getItemAllocations(req: Request, res: Response) {
  try {
    const { requestId } = req.params;

    const request = await prisma.budgetRequest.findUnique({
      where: { request_id: parseInt(requestId) },
      include: {
        itemAllocations: {
          orderBy: { item_id: 'asc' }
        }
      }
    });

    if (!request) {
      return notFoundResponse(res, 'Budget request not found');
    }

    return successResponse(res, request.itemAllocations, 'Item allocations retrieved successfully');
  } catch (error) {
    console.error('Error fetching item allocations:', error);
    return errorResponse(res, 'Failed to retrieve item allocations');
  }
}

/**
 * Get a specific item allocation
 */
export async function getItemAllocation(req: Request, res: Response) {
  try {
    const { requestId, itemId } = req.params;

    const item = await prisma.budgetRequestItemAllocation.findUnique({
      where: {
        item_id: parseInt(itemId)
      },
      include: {
        budgetRequest: {
          select: {
            request_id: true,
            request_code: true,
            department: true,
            current_status: true
          }
        }
      }
    });

    if (!item || item.request_id !== parseInt(requestId)) {
      return notFoundResponse(res, 'Item allocation not found');
    }

    return successResponse(res, item, 'Item allocation retrieved successfully');
  } catch (error) {
    console.error('Error fetching item allocation:', error);
    return errorResponse(res, 'Failed to retrieve item allocation');
  }
}

/**
 * Add item allocation to a budget request
 */
export async function addItemAllocation(req: Request, res: Response) {
  try {
    const { requestId } = req.params;
    const { item_code, description, category, quantity, unit_price, justification } = req.body;

    // Check if budget request exists and is in DRAFT status
    const budgetRequest = await prisma.budgetRequest.findUnique({
      where: { request_id: parseInt(requestId) }
    });

    if (!budgetRequest) {
      return notFoundResponse(res, 'Budget request not found');
    }

    if (budgetRequest.current_status !== 'DRAFT') {
      return errorResponse(res, 'Can only add items to draft requests', 400);
    }

    // Check if user has permission to modify this request
    if (req.user?.role !== 'SuperAdmin' && 
        req.user?.department !== budgetRequest.department) {
      return errorResponse(res, 'You do not have permission to modify this request', 403);
    }

    // Calculate total amount
    const total_amount = quantity * unit_price;

    // Create item allocation
    const item = await prisma.budgetRequestItemAllocation.create({
      data: {
        request_id: parseInt(requestId),
        item_code,
        description,
        category,
        quantity,
        unit_price,
        total_amount,
        justification,
        approval_status: 'PENDING',
        created_by: req.user?.username || 'system',
        created_at: new Date()
      }
    });

    // Recalculate request total
    const items = await prisma.budgetRequestItemAllocation.findMany({
      where: { request_id: parseInt(requestId) }
    });

    const newTotal = items.reduce((sum, item) => sum + item.total_amount, 0);

    await prisma.budgetRequest.update({
      where: { request_id: parseInt(requestId) },
      data: {
        total_amount: newTotal,
        updated_at: new Date(),
        updated_by: req.user?.username || 'system'
      }
    });

    // Invalidate cache
    await invalidateBudgetRequestCache(parseInt(requestId));

    // Log audit activity
    await logAuditActivity({
      action: 'ITEM_ADDED',
      module: 'BUDGET_REQUEST',
      userId: req.user?.id || 'system',
      username: req.user?.username || 'system',
      department: req.user?.department || 'system',
      description: `Added item ${item_code} to budget request ${budgetRequest.request_code}`,
      ipAddress: req.ip || 'unknown',
      metadata: {
        requestId: budgetRequest.request_id,
        itemId: item.item_id,
        itemCode: item_code,
        amount: total_amount
      }
    });

    return successResponse(res, item, 'Item allocation added successfully', 201);
  } catch (error) {
    console.error('Error adding item allocation:', error);
    return errorResponse(res, 'Failed to add item allocation');
  }
}

/**
 * Update an item allocation
 */
export async function updateItemAllocation(req: Request, res: Response) {
  try {
    const { requestId, itemId } = req.params;
    const { description, category, quantity, unit_price, justification } = req.body;

    // Get the item
    const item = await prisma.budgetRequestItemAllocation.findUnique({
      where: { item_id: parseInt(itemId) },
      include: {
        budgetRequest: true
      }
    });

    if (!item || item.request_id !== parseInt(requestId)) {
      return notFoundResponse(res, 'Item allocation not found');
    }

    // Check if request is editable
    if (item.budgetRequest.current_status !== 'DRAFT') {
      return errorResponse(res, 'Can only update items in draft requests', 400);
    }

    // Check permissions
    if (req.user?.role !== 'SuperAdmin' && 
        req.user?.department !== item.budgetRequest.department) {
      return errorResponse(res, 'You do not have permission to modify this request', 403);
    }

    // Calculate new total
    const newQuantity = quantity ?? item.quantity;
    const newUnitPrice = unit_price ?? item.unit_price;
    const total_amount = newQuantity * newUnitPrice;

    // Update item
    const updatedItem = await prisma.budgetRequestItemAllocation.update({
      where: { item_id: parseInt(itemId) },
      data: {
        description: description ?? item.description,
        category: category ?? item.category,
        quantity: newQuantity,
        unit_price: newUnitPrice,
        total_amount,
        justification: justification ?? item.justification,
        updated_at: new Date(),
        updated_by: req.user?.username || 'system'
      }
    });

    // Recalculate request total
    const items = await prisma.budgetRequestItemAllocation.findMany({
      where: { request_id: parseInt(requestId) }
    });

    const newTotal = items.reduce((sum, item) => sum + item.total_amount, 0);

    await prisma.budgetRequest.update({
      where: { request_id: parseInt(requestId) },
      data: {
        total_amount: newTotal,
        updated_at: new Date(),
        updated_by: req.user?.username || 'system'
      }
    });

    // Invalidate cache
    await invalidateBudgetRequestCache(parseInt(requestId));

    // Log audit activity
    await logAuditActivity({
      action: 'ITEM_UPDATED',
      module: 'BUDGET_REQUEST',
      userId: req.user?.id || 'system',
      username: req.user?.username || 'system',
      department: req.user?.department || 'system',
      description: `Updated item ${item.item_code} in budget request ${item.budgetRequest.request_code}`,
      ipAddress: req.ip || 'unknown',
      metadata: {
        requestId: item.request_id,
        itemId: item.item_id,
        changes: { quantity, unit_price, total_amount }
      }
    });

    return successResponse(res, updatedItem, 'Item allocation updated successfully');
  } catch (error) {
    console.error('Error updating item allocation:', error);
    return errorResponse(res, 'Failed to update item allocation');
  }
}

/**
 * Delete an item allocation
 */
export async function deleteItemAllocation(req: Request, res: Response) {
  try {
    const { requestId, itemId } = req.params;

    // Get the item
    const item = await prisma.budgetRequestItemAllocation.findUnique({
      where: { item_id: parseInt(itemId) },
      include: {
        budgetRequest: true
      }
    });

    if (!item || item.request_id !== parseInt(requestId)) {
      return notFoundResponse(res, 'Item allocation not found');
    }

    // Check if request is editable
    if (item.budgetRequest.current_status !== 'DRAFT') {
      return errorResponse(res, 'Can only delete items from draft requests', 400);
    }

    // Check permissions
    if (req.user?.role !== 'SuperAdmin' && 
        req.user?.department !== item.budgetRequest.department) {
      return errorResponse(res, 'You do not have permission to modify this request', 403);
    }

    // Delete item
    await prisma.budgetRequestItemAllocation.delete({
      where: { item_id: parseInt(itemId) }
    });

    // Recalculate request total
    const items = await prisma.budgetRequestItemAllocation.findMany({
      where: { request_id: parseInt(requestId) }
    });

    const newTotal = items.reduce((sum, item) => sum + item.total_amount, 0);

    await prisma.budgetRequest.update({
      where: { request_id: parseInt(requestId) },
      data: {
        total_amount: newTotal,
        updated_at: new Date(),
        updated_by: req.user?.username || 'system'
      }
    });

    // Invalidate cache
    await invalidateBudgetRequestCache(parseInt(requestId));

    // Log audit activity
    await logAuditActivity({
      action: 'ITEM_DELETED',
      module: 'BUDGET_REQUEST',
      userId: req.user?.id || 'system',
      username: req.user?.username || 'system',
      department: req.user?.department || 'system',
      description: `Deleted item ${item.item_code} from budget request ${item.budgetRequest.request_code}`,
      ipAddress: req.ip || 'unknown',
      metadata: {
        requestId: item.request_id,
        itemId: item.item_id,
        itemCode: item.item_code
      }
    });

    return successResponse(res, null, 'Item allocation deleted successfully');
  } catch (error) {
    console.error('Error deleting item allocation:', error);
    return errorResponse(res, 'Failed to delete item allocation');
  }
}

/**
 * Approve an item allocation
 */
export async function approveItemAllocation(req: Request, res: Response) {
  try {
    const { requestId, itemId } = req.params;
    const { approved_amount, comments } = req.body;

    const item = await prisma.budgetRequestItemAllocation.findUnique({
      where: { item_id: parseInt(itemId) },
      include: {
        budgetRequest: true
      }
    });

    if (!item || item.request_id !== parseInt(requestId)) {
      return notFoundResponse(res, 'Item allocation not found');
    }

    // Only SuperAdmin can approve items
    if (req.user?.role !== 'SuperAdmin') {
      return errorResponse(res, 'Only SuperAdmin can approve items', 403);
    }

    const updatedItem = await prisma.budgetRequestItemAllocation.update({
      where: { item_id: parseInt(itemId) },
      data: {
        approval_status: 'APPROVED',
        approved_amount: approved_amount || item.total_amount,
        approval_notes: comments,
        approved_by: req.user?.username || 'system',
        approved_at: new Date()
      }
    });

    // Invalidate cache
    await invalidateBudgetRequestCache(parseInt(requestId));

    // Log audit activity
    await logAuditActivity({
      action: 'ITEM_APPROVED',
      module: 'BUDGET_REQUEST',
      userId: req.user?.id || 'system',
      username: req.user?.username || 'system',
      department: req.user?.department || 'system',
      description: `Approved item ${item.item_code} in budget request ${item.budgetRequest.request_code}`,
      ipAddress: req.ip || 'unknown',
      metadata: {
        requestId: item.request_id,
        itemId: item.item_id,
        approvedAmount: approved_amount || item.total_amount
      }
    });

    return successResponse(res, updatedItem, 'Item allocation approved successfully');
  } catch (error) {
    console.error('Error approving item allocation:', error);
    return errorResponse(res, 'Failed to approve item allocation');
  }
}
