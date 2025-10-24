// src/types/budgetRequest.types.ts
// Type definitions matching schema.prisma

// Enum types matching schema.prisma
export type BudgetRequestStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
export type PurchaseRequestStatus = 'DRAFT' | 'POSTED' | 'REJECTED' | 'APPROVED' | 'CLOSED';
export type RequestType = 'REGULAR' | 'PROJECT_BASED' | 'BUDGET_SHORTAGE' | 'URGENT' | 'EMERGENCY';
export type UserRole = 'ADMIN' | 'NON_ADMIN';

export interface BudgetRequestCreate {
  // Creator Information (Auto-populated from JWT)
  createdBy: string;
  createdByName?: string;
  createdByEmail?: string;
  createdByRole: UserRole;
  department: string; // "finance" | "hr" | "inventory" | "operations"

  // Request Details (User Input)
  amountRequested: number;
  purpose: string;
  justification: string;
  category?: string; // "operational" | "capital" | "administrative" | "emergency"
  priority?: string; // "low" | "medium" | "high" | "urgent"
  urgencyReason?: string;

  // Budget Period Context (Optional)
  fiscalYear?: number;
  fiscalPeriod?: string;

  // Purchase Request Integration (Optional - from Inventory)
  linkedPurchaseRequestId?: number;
  linkedPurchaseRequestRefNo?: string;
  linkedPurchaseRequestType?: RequestType;
  linkedPurchaseRequestUrl?: string;

  // Multi-Item Support (Optional)
  totalItemsRequested?: number;
  totalSuppliersInvolved?: number;
  itemBreakdown?: string; // JSON string
  supplierBreakdown?: string; // JSON string

  // Supporting Documents
  attachmentUrls?: string; // JSON string

  // Item Allocations
  items?: BudgetRequestItemCreate[];
}

export interface BudgetRequestItemCreate {
  itemName: string;
  itemCode?: string;
  itemCategory?: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  supplierId?: string;
  supplierName?: string;
  supplierRating?: number;
  itemPriority?: string; // "must_have" | "should_have" | "nice_to_have"
  isEssential?: boolean;
  alternativeOptions?: string; // JSON string
}

export interface BudgetRequestUpdate {
  amountRequested?: number;
  purpose?: string;
  justification?: string;
  category?: string;
  priority?: string;
  urgencyReason?: string;
  fiscalYear?: number;
  fiscalPeriod?: string;
  attachmentUrls?: string;
}

export interface BudgetRequestApproval {
  reviewNotes?: string;
  reservedAmount?: number;
  bufferPercentage?: number; // Default 5%
}

export interface BudgetRequestRejection {
  reviewNotes: string; // Required
  rejectionReason?: string;
}

export interface BudgetRequestFilters {
  page?: number;
  limit?: number;
  status?: BudgetRequestStatus | string;
  department?: string;
  priority?: string;
  category?: string;
  dateFrom?: string;
  dateTo?: string;
  linkedPurchaseRequestId?: number;
  createdBy?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface BudgetRequestResponse {
  id: number;
  requestCode: string;
  
  // Creator Information
  createdBy: string;
  createdByName: string | null;
  createdByEmail: string | null;
  createdByRole: UserRole;
  department: string;

  // Request Details
  amountRequested: number;
  purpose: string;
  justification: string;
  category: string | null;
  priority: string | null;
  urgencyReason: string | null;

  // Budget Period
  fiscalYear: number | null;
  fiscalPeriod: string | null;

  // PR Integration
  linkedPurchaseRequestId: number | null;
  linkedPurchaseRequestRefNo: string | null;
  linkedPurchaseRequestType: RequestType | null;
  linkedPurchaseRequestUrl: string | null;
  isAutoLinked: boolean;

  // Multi-Item Support
  totalItemsRequested: number | null;
  totalSuppliersInvolved: number | null;
  itemBreakdown: string | null;
  supplierBreakdown: string | null;

  // Budget Context
  departmentBudgetRemaining: number | null;
  budgetShortfall: number | null;
  budgetUtilizationBeforeRequest: number | null;

  // Approval Workflow
  status: BudgetRequestStatus;
  reviewedBy: string | null;
  reviewedByName: string | null;
  reviewNotes: string | null;
  reviewedAt: Date | null;

  // Budget Reservation
  reservedAmount: number | null;
  bufferAmount: number | null;
  bufferPercentage: number | null;
  reservationExpiry: Date | null;
  isReserved: boolean;
  reservedAt: Date | null;

  // Utilization Tracking
  actualAmountUtilized: number | null;
  utilizationDate: Date | null;
  isFullyUtilized: boolean;
  remainingReserved: number | null;

  // Financial Impact
  budgetBefore: number | null;
  budgetAfter: number | null;
  utilizationRate: number | null;

  // Supporting Documents
  attachmentUrls: string | null;

  // Status Tracking
  isExpired: boolean;
  isCancelled: boolean;
  cancelledBy: string | null;
  cancelledAt: Date | null;
  cancellationReason: string | null;

  // Escalation & SLA
  escalationLevel: number;
  escalatedTo: string | null;
  escalatedAt: Date | null;
  slaDeadline: Date | null;
  isOverdue: boolean;

  // Audit Trail
  createdAt: Date;
  updatedBy: string | null;
  updatedAt: Date;
  approvedBy: string | null;
  approvedAt: Date | null;
  rejectedBy: string | null;
  rejectedAt: Date | null;
  deletedBy: string | null;
  deletedAt: Date | null;
  isDeleted: boolean;

  // Relations (optional, included with specific queries)
  itemAllocations?: BudgetRequestItemAllocationResponse[];
  approvalHistory?: BudgetRequestApprovalHistoryResponse[];
  notifications?: BudgetRequestNotificationResponse[];
}

export interface BudgetRequestItemAllocationResponse {
  id: number;
  budgetRequestId: number;
  itemName: string;
  itemCode: string | null;
  itemCategory: string | null;
  quantity: number;
  unitCost: number;
  totalCost: number;
  supplierId: string | null;
  supplierName: string | null;
  supplierRating: number | null;
  allocatedAmount: number;
  isFullyAllocated: boolean;
  allocationPercentage: number | null;
  allocationNotes: string | null;
  itemPriority: string | null;
  isEssential: boolean;
  alternativeOptions: string | null;
  status: BudgetRequestStatus;
  reviewedBy: string | null;
  reviewNotes: string | null;
  actualAmountSpent: number | null;
  costVariance: number | null;
  isUtilized: boolean;
  createdAt: Date;
  updatedAt: Date;
  approvedAt: Date | null;
  isDeleted: boolean;
}

export interface BudgetRequestApprovalHistoryResponse {
  id: number;
  budgetRequestId: number;
  fromStatus: BudgetRequestStatus | null;
  toStatus: BudgetRequestStatus;
  changedBy: string;
  changedByName: string | null;
  changedByRole: UserRole | null;
  changedAt: Date;
  action: string;
  comments: string | null;
  attachmentUrls: string | null;
  amountBefore: number | null;
  amountAfter: number | null;
  ipAddress: string | null;
  userAgent: string | null;
}

export interface BudgetRequestNotificationResponse {
  id: number;
  budgetRequestId: number;
  notificationType: string;
  recipientUserId: string;
  recipientEmail: string | null;
  recipientName: string | null;
  subject: string;
  message: string;
  sentAt: Date | null;
  deliveryStatus: string;
  deliveryError: string | null;
  deliveryProvider: string | null;
  readAt: Date | null;
  clickedAt: Date | null;
  actionTaken: string | null;
  retryCount: number;
  maxRetries: number;
  nextRetryAt: Date | null;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: {
    timestamp: string;
    version: string;
  };
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Array<{
      field: string;
      message: string;
    }>;
  };
  meta: {
    timestamp: string;
    version: string;
  };
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: PaginationMeta;
  meta: {
    timestamp: string;
    version: string;
  };
}
