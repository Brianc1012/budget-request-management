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

// Map user role to Prisma UserRole enum
function mapUserRoleToPrismaEnum(role: string): 'ADMIN' | 'NON_ADMIN' {
  const roleLower = role.toLowerCase();
  if (roleLower.includes('admin') || roleLower.includes('superadmin')) {
    return 'ADMIN';
  }
  return 'NON_ADMIN';
}

export async function create(data: any, user: UserContext) {
  console.log('Service create called with data:', JSON.stringify(data, null, 2));
  
  // Sync department budget from Finance
  const fiscalYear = data.fiscalYear || new Date().getFullYear();
  const fiscalPeriod = data.fiscalPeriod || getCurrentFiscalPeriod();
  
  const budget = await syncService.syncDepartmentBudget(
    data.department,
    fiscalYear,
    fiscalPeriod
  );

  // Calculate budget metrics
  const budgetShortfall = Number(data.amountRequested) - Number(budget.remainingAmount);
  const requiresBudgetApproval = budgetShortfall > 0;

  // Calculate itemBreakdown and supplierBreakdown if items exist
  let itemBreakdown: string | null = null;
  let supplierBreakdown: string | null = null;
  let totalItemsRequested: number | null = null;
  let totalSuppliersInvolved: number | null = null;

  if (data.items && data.items.length > 0) {
    console.log('Processing items:', JSON.stringify(data.items, null, 2));
    
    // Create item breakdown - INCLUDE ALL FIELDS
    const itemBreakdownData = data.items.map((item: any) => {
      const mapped = {
        itemName: item.item_name || item.itemName,
        quantity: item.quantity,
        unitMeasure: item.unit_measure || item.unitMeasure || 'pcs',
        estimatedCost: item.unit_cost || item.unitCost,
        supplierName: item.supplier || item.supplierName,
        supplierId: item.supplier_id || item.supplierId || null,
        itemPriority: item.itemPriority || null,
        isEssential: item.isEssential !== undefined ? item.isEssential : true,
        subtotal: item.subtotal || (item.quantity * (item.unit_cost || item.unitCost))
      };
      console.log('Mapped item:', JSON.stringify(mapped, null, 2));
      return mapped;
    });
    itemBreakdown = JSON.stringify(itemBreakdownData);
    console.log('Final itemBreakdown JSON:', itemBreakdown);
    totalItemsRequested = data.items.length;

    // Create supplier breakdown (group by supplier)
    const supplierMap = new Map();
    data.items.forEach((item: any) => {
      const supplierId = item.supplier_id || item.supplierId || item.supplier || item.supplierName;
      const supplierName = item.supplier || item.supplierName;
      const itemCost = item.subtotal || item.totalCost || (item.quantity * (item.unit_cost || item.unitCost));

      if (supplierMap.has(supplierId)) {
        const existing = supplierMap.get(supplierId);
        existing.totalAmount += itemCost;
        existing.itemCount += 1;
      } else {
        supplierMap.set(supplierId, {
          supplierId,
          supplierName,
          totalAmount: itemCost,
          itemCount: 1
        });
      }
    });
    supplierBreakdown = JSON.stringify(Array.from(supplierMap.values()));
    totalSuppliersInvolved = supplierMap.size;
  }

  // Create budget request with items in transaction
  const budgetRequest = await prisma.$transaction(async (tx: any) => {
    // Create main budget request
    const br = await tx.budgetRequest.create({
      data: {
        department: data.department,
        createdBy: user.id,
        createdByName: user.username,
        createdByEmail: data.createdByEmail || null,
        createdByRole: mapUserRoleToPrismaEnum(user.role),
        amountRequested: data.amountRequested,
        purpose: data.purpose,
        justification: data.justification,
        category: data.category || 'operational',
        priority: data.priority || null,
        urgencyReason: data.urgencyReason || null,
        start_date: data.start_date ? new Date(data.start_date) : null,
        end_date: data.end_date ? new Date(data.end_date) : null,
        fiscalYear,
        fiscalPeriod,
        linkedPurchaseRequestId: data.linkedPurchaseRequestId,
        linkedPurchaseRequestRefNo: data.linkedPurchaseRequestRefNo,
        itemBreakdown,
        supplierBreakdown,
        totalItemsRequested,
        totalSuppliersInvolved,
        departmentBudgetRemaining: budget.remainingAmount,
        budgetShortfall: budgetShortfall > 0 ? budgetShortfall : 0,
        budgetBefore: budget.remainingAmount,
        status: data.status || 'DRAFT'
      }
    });

    // Create item allocations if provided
    // Map frontend field names to backend field names
    if (data.items && data.items.length > 0) {
      const mappedItems = data.items.map((item: any) => ({
        budgetRequestId: br.id,
        itemName: item.item_name || item.itemName,
        itemCode: item.item_code || item.itemCode || null,
        quantity: item.quantity,
        unitMeasure: item.unit_measure || item.unitMeasure || 'pcs',
        unitCost: item.unit_cost || item.unitCost,
        totalCost: item.subtotal || item.totalCost || (item.quantity * (item.unit_cost || item.unitCost)),
        supplierId: item.supplier_id || item.supplierId || null,
        supplierName: item.supplier || item.supplierName,
        allocatedAmount: item.subtotal || item.totalCost || (item.quantity * (item.unit_cost || item.unitCost)),
        itemPriority: item.itemPriority || 'must_have',
        isEssential: item.isEssential !== false,
        status: data.status || 'DRAFT'
      }));

      console.log('Creating item allocations:', JSON.stringify(mappedItems, null, 2));

      await tx.budgetRequestItemAllocation.createMany({
        data: mappedItems
      });
    }

    return br;
  });

  console.log('Budget request created successfully:', budgetRequest.id);
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
