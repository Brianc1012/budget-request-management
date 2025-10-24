// src/services/budgetRequest.service.ts
import { prisma } from '../config/database';
import cacheService from './cache.service';
import syncService from './sync.service';
import notificationService from './notification.service';
import { BudgetCalculator } from '../utils/calculator.util';
import { UserContext } from '../types/express';

export async function findMany(filter: any, options: any = {}) {
  return prisma.budgetRequest.findMany({
    where: filter,
    ...options
  });
}

export async function count(filter: any) {
  return prisma.budgetRequest.count({ where: filter });
}

export async function findById(id: number, options: any = {}) {
  // Try cache first
  const cached = await cacheService.getBudgetRequest(id);
  if (cached) return cached;

  // Fetch from database
  const budgetRequest = await prisma.budgetRequest.findUnique({
    where: { id },
    include: {
      itemAllocations: true,
      approvalHistory: {
        orderBy: { changedAt: 'desc' },
        take: 10
      }
    },
    ...options
  });

  // Cache result
  if (budgetRequest) {
    await cacheService.cacheBudgetRequest(id, budgetRequest);
  }

  return budgetRequest;
}

export async function create(data: any, user: UserContext) {
  // Sync department budget from Finance
  const fiscalYear = new Date().getFullYear();
  const fiscalPeriod = getCurrentFiscalPeriod();
  
  const budget = await syncService.syncDepartmentBudget(
    data.department,
    fiscalYear,
    fiscalPeriod
  );

  // Calculate budget metrics
  const budgetShortfall = Number(data.amountRequested) - Number(budget.remainingAmount);
  const requiresBudgetApproval = budgetShortfall > 0;

  // Create budget request with items in transaction
  const budgetRequest = await prisma.$transaction(async (tx: any) => {
    // Create main budget request
    const br = await tx.budgetRequest.create({
      data: {
        department: data.department,
        createdBy: user.id,
        createdByName: user.username,
        createdByEmail: data.createdByEmail,
        createdByRole: user.role,
        amountRequested: data.amountRequested,
        purpose: data.purpose,
        justification: data.justification,
        category: data.category,
        priority: data.priority,
        urgencyReason: data.urgencyReason,
        fiscalYear,
        fiscalPeriod,
        linkedPurchaseRequestId: data.linkedPurchaseRequestId,
        linkedPurchaseRequestRefNo: data.linkedPurchaseRequestRefNo,
        departmentBudgetRemaining: budget.remainingAmount,
        budgetShortfall: budgetShortfall > 0 ? budgetShortfall : 0,
        budgetBefore: budget.remainingAmount,
        status: 'DRAFT'
      }
    });

    // Create item allocations if provided
    if (data.items && data.items.length > 0) {
      await tx.budgetRequestItemAllocation.createMany({
        data: data.items.map((item: any) => ({
          budgetRequestId: br.id,
          itemName: item.itemName,
          itemCode: item.itemCode,
          quantity: item.quantity,
          unitCost: item.unitCost,
          totalCost: item.totalCost,
          supplierId: item.supplierId,
          supplierName: item.supplierName,
          allocatedAmount: item.totalCost,
          itemPriority: item.itemPriority || 'must_have',
          isEssential: item.isEssential !== false
        }))
      });
    }

    return br;
  });

  return budgetRequest;
}

export async function submit(id: number, user: UserContext) {
  const updated = await prisma.budgetRequest.update({
    where: { id },
    data: {
      status: 'SUBMITTED',
      updatedBy: user.id,
      updatedAt: new Date()
    }
  });

  // Invalidate cache
  await cacheService.invalidateBudgetRequest(id);

  // Send notification to admins
  await notificationService.notifyAdminsNewRequest(updated);

  // Create approval history entry
  await prisma.budgetRequestApprovalHistory.create({
    data: {
      budgetRequestId: id,
      fromStatus: 'DRAFT',
      toStatus: 'SUBMITTED',
      changedBy: user.id,
      changedByName: user.username,
      action: 'SUBMITTED',
      comments: 'Budget request submitted for review'
    }
  });

  return updated;
}

export async function approve(id: number, approvalData: any, user: UserContext) {
  const existingRequest = await findById(id);
  if (!existingRequest) {
    throw new Error('Budget request not found');
  }

  const { reservedAmount, bufferPercentage } = approvalData;
  const bufferCalc = BudgetCalculator.calculateTotalReserved(
    Number(reservedAmount || existingRequest.amountRequested),
    bufferPercentage || 0
  );

  const approved = await prisma.$transaction(async (tx: any) => {
    // Update budget request
    const br = await tx.budgetRequest.update({
      where: { id },
      data: {
        status: 'APPROVED',
        reviewedBy: user.id,
        reviewedByName: user.username,
        reviewNotes: approvalData.reviewNotes,
        reviewedAt: new Date(),
        reservedAmount: bufferCalc.totalReserved,
        bufferAmount: bufferCalc.bufferAmount,
        bufferPercentage,
        isReserved: true,
        reservedAt: new Date(),
        approvedBy: user.id,
        approvedAt: new Date(),
        updatedBy: user.id
      }
    });

    // Create approval history
    await tx.budgetRequestApprovalHistory.create({
      data: {
        budgetRequestId: id,
        fromStatus: existingRequest.status,
        toStatus: 'APPROVED',
        changedBy: user.id,
        changedByName: user.username,
        changedByRole: user.role.includes('Admin') ? 'ADMIN' : 'NON_ADMIN',
        action: 'APPROVED',
        comments: approvalData.reviewNotes,
        amountBefore: existingRequest.amountRequested,
        amountAfter: bufferCalc.totalReserved
      }
    });

    return br;
  });

  // Invalidate cache
  await cacheService.invalidateBudgetRequest(id);

  // Notify Finance Main about reservation
  await syncService.notifyBudgetReservation(id);

  // Send approval notification
  await notificationService.notifyRequestApproved(approved);

  return approved;
}

export async function reject(id: number, rejectionData: any, user: UserContext) {
  const existingRequest = await findById(id);
  if (!existingRequest) {
    throw new Error('Budget request not found');
  }

  const rejected = await prisma.$transaction(async (tx: any) => {
    // Update budget request
    const br = await tx.budgetRequest.update({
      where: { id },
      data: {
        status: 'REJECTED',
        reviewedBy: user.id,
        reviewedByName: user.username,
        reviewNotes: rejectionData.reviewNotes,
        reviewedAt: new Date(),
        rejectedBy: user.id,
        rejectedAt: new Date(),
        updatedBy: user.id
      }
    });

    // Create approval history
    await tx.budgetRequestApprovalHistory.create({
      data: {
        budgetRequestId: id,
        fromStatus: existingRequest.status,
        toStatus: 'REJECTED',
        changedBy: user.id,
        changedByName: user.username,
        changedByRole: user.role.includes('Admin') ? 'ADMIN' : 'NON_ADMIN',
        action: 'REJECTED',
        comments: rejectionData.reviewNotes
      }
    });

    return br;
  });

  // Invalidate cache
  await cacheService.invalidateBudgetRequest(id);

  // Send rejection notification
  await notificationService.notifyRequestRejected(rejected);

  return rejected;
}

export function checkAccess(budgetRequest: any, user: UserContext): boolean {
  // SuperAdmin: full access
  if (user.role === 'SuperAdmin') return true;

  // Department Admin: own department only
  if (user.role.includes('Admin')) {
    return budgetRequest.department === user.department;
  }

  // Regular user: own requests only
  return budgetRequest.createdBy === user.id;
}

function getCurrentFiscalPeriod(): string {
  const now = new Date();
  const month = now.getMonth() + 1;
  const quarter = Math.ceil(month / 3);
  return `Q${quarter}`;
}
