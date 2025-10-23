-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PurchaseRequestStatus" AS ENUM ('DRAFT', 'POSTED', 'REJECTED', 'APPROVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "RequestType" AS ENUM ('REGULAR', 'PROJECT_BASED', 'BUDGET_SHORTAGE', 'URGENT', 'EMERGENCY');

-- CreateTable
CREATE TABLE "BudgetRequest" (
    "id" SERIAL NOT NULL,
    "requestCode" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "requestedBy" TEXT NOT NULL,
    "requestedByName" TEXT,
    "requestedByEmail" TEXT,
    "requestedByRole" TEXT,
    "amountRequested" DECIMAL(12,2) NOT NULL,
    "purpose" TEXT NOT NULL,
    "justification" TEXT,
    "category" TEXT,
    "priority" TEXT,
    "urgencyReason" TEXT,
    "fiscalYear" INTEGER,
    "fiscalPeriod" TEXT,
    "linkedPurchaseRequestId" INTEGER,
    "linkedPurchaseRequestRefNo" TEXT,
    "linkedPurchaseRequestType" "RequestType",
    "linkedPurchaseRequestUrl" TEXT,
    "isAutoLinked" BOOLEAN NOT NULL DEFAULT false,
    "totalItemsRequested" INTEGER,
    "totalSuppliersInvolved" INTEGER,
    "itemBreakdown" TEXT,
    "supplierBreakdown" TEXT,
    "departmentBudgetRemaining" DECIMAL(12,2),
    "budgetShortfall" DECIMAL(12,2),
    "budgetUtilizationBeforeRequest" DECIMAL(5,2),
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedBy" TEXT,
    "reviewedByName" TEXT,
    "reviewNotes" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reservedAmount" DECIMAL(12,2),
    "bufferAmount" DECIMAL(12,2),
    "bufferPercentage" DECIMAL(5,2),
    "reservationExpiry" TIMESTAMP(3),
    "isReserved" BOOLEAN NOT NULL DEFAULT false,
    "reservedAt" TIMESTAMP(3),
    "actualAmountUtilized" DECIMAL(12,2),
    "utilizationDate" TIMESTAMP(3),
    "isFullyUtilized" BOOLEAN NOT NULL DEFAULT false,
    "remainingReserved" DECIMAL(12,2),
    "budgetBefore" DECIMAL(12,2),
    "budgetAfter" DECIMAL(12,2),
    "utilizationRate" DECIMAL(5,2),
    "attachmentUrls" TEXT,
    "isDraft" BOOLEAN NOT NULL DEFAULT false,
    "isExpired" BOOLEAN NOT NULL DEFAULT false,
    "isCancelled" BOOLEAN NOT NULL DEFAULT false,
    "cancelledBy" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "cancellationReason" TEXT,
    "escalationLevel" INTEGER NOT NULL DEFAULT 0,
    "escalatedTo" TEXT,
    "escalatedAt" TIMESTAMP(3),
    "slaDeadline" TIMESTAMP(3),
    "isOverdue" BOOLEAN NOT NULL DEFAULT false,
    "lastSyncedAt" TIMESTAMP(3),
    "lastSyncStatus" TEXT,
    "syncErrorMessage" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedBy" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "deletedBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "BudgetRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BudgetRequestItemAllocation" (
    "id" SERIAL NOT NULL,
    "budgetRequestId" INTEGER NOT NULL,
    "itemName" TEXT NOT NULL,
    "itemCode" TEXT,
    "itemCategory" TEXT,
    "quantity" INTEGER NOT NULL,
    "unitCost" DECIMAL(12,2) NOT NULL,
    "totalCost" DECIMAL(12,2) NOT NULL,
    "supplierId" TEXT,
    "supplierName" TEXT,
    "supplierRating" DECIMAL(3,2),
    "allocatedAmount" DECIMAL(12,2) NOT NULL,
    "isFullyAllocated" BOOLEAN NOT NULL DEFAULT true,
    "allocationPercentage" DECIMAL(5,2),
    "allocationNotes" TEXT,
    "itemPriority" TEXT,
    "isEssential" BOOLEAN NOT NULL DEFAULT true,
    "alternativeOptions" TEXT,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedBy" TEXT,
    "reviewNotes" TEXT,
    "actualAmountSpent" DECIMAL(12,2),
    "costVariance" DECIMAL(12,2),
    "isUtilized" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "approvedAt" TIMESTAMP(3),
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "BudgetRequestItemAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BudgetRequestApprovalHistory" (
    "id" SERIAL NOT NULL,
    "budgetRequestId" INTEGER NOT NULL,
    "fromStatus" "ApprovalStatus",
    "toStatus" "ApprovalStatus" NOT NULL,
    "changedBy" TEXT NOT NULL,
    "changedByName" TEXT,
    "changedByRole" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "action" TEXT NOT NULL,
    "comments" TEXT,
    "attachmentUrls" TEXT,
    "amountBefore" DECIMAL(12,2),
    "amountAfter" DECIMAL(12,2),
    "ipAddress" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "BudgetRequestApprovalHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BudgetRequestNotification" (
    "id" SERIAL NOT NULL,
    "budgetRequestId" INTEGER NOT NULL,
    "notificationType" TEXT NOT NULL,
    "recipientUserId" TEXT NOT NULL,
    "recipientEmail" TEXT,
    "recipientName" TEXT,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3),
    "deliveryStatus" TEXT NOT NULL DEFAULT 'pending',
    "deliveryError" TEXT,
    "deliveryProvider" TEXT,
    "readAt" TIMESTAMP(3),
    "clickedAt" TIMESTAMP(3),
    "actionTaken" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "nextRetryAt" TIMESTAMP(3),

    CONSTRAINT "BudgetRequestNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CachedDepartmentBudget" (
    "id" SERIAL NOT NULL,
    "budgetId" INTEGER NOT NULL,
    "department" TEXT NOT NULL,
    "fiscalYear" INTEGER NOT NULL,
    "fiscalPeriod" TEXT NOT NULL,
    "allocatedAmount" DECIMAL(12,2) NOT NULL,
    "usedAmount" DECIMAL(12,2) NOT NULL,
    "reservedAmount" DECIMAL(12,2) NOT NULL,
    "remainingAmount" DECIMAL(12,2) NOT NULL,
    "utilizationRate" DECIMAL(5,2),
    "availableRate" DECIMAL(5,2),
    "burnRate" DECIMAL(12,2),
    "projectedDepletion" TIMESTAMP(3),
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "daysRemaining" INTEGER,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sourceSystem" TEXT NOT NULL DEFAULT 'Finance',
    "isStale" BOOLEAN NOT NULL DEFAULT false,
    "nextSyncAt" TIMESTAMP(3),
    "syncFrequency" INTEGER NOT NULL DEFAULT 15,
    "isOverBudget" BOOLEAN NOT NULL DEFAULT false,
    "isNearingLimit" BOOLEAN NOT NULL DEFAULT false,
    "hasPendingRequests" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CachedDepartmentBudget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiAccessLog" (
    "id" SERIAL NOT NULL,
    "endpoint" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "sourceService" TEXT NOT NULL,
    "userId" TEXT,
    "requestPath" TEXT,
    "requestBody" TEXT,
    "requestHeaders" TEXT,
    "statusCode" INTEGER NOT NULL,
    "responseTimeMs" INTEGER,
    "responseSizeBytes" INTEGER,
    "errorMessage" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "isRateLimited" BOOLEAN NOT NULL DEFAULT false,
    "rateLimitKey" TEXT,

    CONSTRAINT "ApiAccessLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemConfig" (
    "id" SERIAL NOT NULL,
    "configKey" TEXT NOT NULL,
    "configValue" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "dataType" TEXT NOT NULL DEFAULT 'string',
    "validationRules" TEXT,
    "defaultValue" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isSystemManaged" BOOLEAN NOT NULL DEFAULT false,
    "requiresRestart" BOOLEAN NOT NULL DEFAULT false,
    "updatedBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SystemConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BudgetRequest_requestCode_key" ON "BudgetRequest"("requestCode");

-- CreateIndex
CREATE INDEX "BudgetRequest_department_status_idx" ON "BudgetRequest"("department", "status");

-- CreateIndex
CREATE INDEX "BudgetRequest_requestedBy_createdAt_idx" ON "BudgetRequest"("requestedBy", "createdAt");

-- CreateIndex
CREATE INDEX "BudgetRequest_status_createdAt_idx" ON "BudgetRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "BudgetRequest_isDeleted_idx" ON "BudgetRequest"("isDeleted");

-- CreateIndex
CREATE INDEX "BudgetRequest_linkedPurchaseRequestId_idx" ON "BudgetRequest"("linkedPurchaseRequestId");

-- CreateIndex
CREATE INDEX "BudgetRequest_fiscalYear_fiscalPeriod_idx" ON "BudgetRequest"("fiscalYear", "fiscalPeriod");

-- CreateIndex
CREATE INDEX "BudgetRequest_isReserved_reservationExpiry_idx" ON "BudgetRequest"("isReserved", "reservationExpiry");

-- CreateIndex
CREATE INDEX "BudgetRequest_isOverdue_slaDeadline_idx" ON "BudgetRequest"("isOverdue", "slaDeadline");

-- CreateIndex
CREATE INDEX "BudgetRequest_priority_status_idx" ON "BudgetRequest"("priority", "status");

-- CreateIndex
CREATE INDEX "BudgetRequestItemAllocation_budgetRequestId_idx" ON "BudgetRequestItemAllocation"("budgetRequestId");

-- CreateIndex
CREATE INDEX "BudgetRequestItemAllocation_status_idx" ON "BudgetRequestItemAllocation"("status");

-- CreateIndex
CREATE INDEX "BudgetRequestItemAllocation_supplierId_idx" ON "BudgetRequestItemAllocation"("supplierId");

-- CreateIndex
CREATE INDEX "BudgetRequestItemAllocation_isEssential_itemPriority_idx" ON "BudgetRequestItemAllocation"("isEssential", "itemPriority");

-- CreateIndex
CREATE INDEX "BudgetRequestApprovalHistory_budgetRequestId_changedAt_idx" ON "BudgetRequestApprovalHistory"("budgetRequestId", "changedAt");

-- CreateIndex
CREATE INDEX "BudgetRequestApprovalHistory_changedBy_changedAt_idx" ON "BudgetRequestApprovalHistory"("changedBy", "changedAt");

-- CreateIndex
CREATE INDEX "BudgetRequestApprovalHistory_action_changedAt_idx" ON "BudgetRequestApprovalHistory"("action", "changedAt");

-- CreateIndex
CREATE INDEX "BudgetRequestNotification_budgetRequestId_sentAt_idx" ON "BudgetRequestNotification"("budgetRequestId", "sentAt");

-- CreateIndex
CREATE INDEX "BudgetRequestNotification_recipientUserId_deliveryStatus_idx" ON "BudgetRequestNotification"("recipientUserId", "deliveryStatus");

-- CreateIndex
CREATE INDEX "BudgetRequestNotification_deliveryStatus_sentAt_idx" ON "BudgetRequestNotification"("deliveryStatus", "sentAt");

-- CreateIndex
CREATE INDEX "BudgetRequestNotification_notificationType_sentAt_idx" ON "BudgetRequestNotification"("notificationType", "sentAt");

-- CreateIndex
CREATE UNIQUE INDEX "CachedDepartmentBudget_budgetId_key" ON "CachedDepartmentBudget"("budgetId");

-- CreateIndex
CREATE INDEX "CachedDepartmentBudget_department_fiscalYear_fiscalPeriod_idx" ON "CachedDepartmentBudget"("department", "fiscalYear", "fiscalPeriod");

-- CreateIndex
CREATE INDEX "CachedDepartmentBudget_lastSyncedAt_idx" ON "CachedDepartmentBudget"("lastSyncedAt");

-- CreateIndex
CREATE INDEX "CachedDepartmentBudget_isStale_idx" ON "CachedDepartmentBudget"("isStale");

-- CreateIndex
CREATE INDEX "CachedDepartmentBudget_isOverBudget_isNearingLimit_idx" ON "CachedDepartmentBudget"("isOverBudget", "isNearingLimit");

-- CreateIndex
CREATE UNIQUE INDEX "CachedDepartmentBudget_department_fiscalYear_fiscalPeriod_key" ON "CachedDepartmentBudget"("department", "fiscalYear", "fiscalPeriod");

-- CreateIndex
CREATE INDEX "ApiAccessLog_sourceService_requestedAt_idx" ON "ApiAccessLog"("sourceService", "requestedAt");

-- CreateIndex
CREATE INDEX "ApiAccessLog_endpoint_method_idx" ON "ApiAccessLog"("endpoint", "method");

-- CreateIndex
CREATE INDEX "ApiAccessLog_statusCode_requestedAt_idx" ON "ApiAccessLog"("statusCode", "requestedAt");

-- CreateIndex
CREATE INDEX "ApiAccessLog_userId_requestedAt_idx" ON "ApiAccessLog"("userId", "requestedAt");

-- CreateIndex
CREATE UNIQUE INDEX "SystemConfig_configKey_key" ON "SystemConfig"("configKey");

-- CreateIndex
CREATE INDEX "SystemConfig_category_isActive_idx" ON "SystemConfig"("category", "isActive");

-- CreateIndex
CREATE INDEX "SystemConfig_isSystemManaged_idx" ON "SystemConfig"("isSystemManaged");

-- AddForeignKey
ALTER TABLE "BudgetRequestItemAllocation" ADD CONSTRAINT "BudgetRequestItemAllocation_budgetRequestId_fkey" FOREIGN KEY ("budgetRequestId") REFERENCES "BudgetRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetRequestApprovalHistory" ADD CONSTRAINT "BudgetRequestApprovalHistory_budgetRequestId_fkey" FOREIGN KEY ("budgetRequestId") REFERENCES "BudgetRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetRequestNotification" ADD CONSTRAINT "BudgetRequestNotification_budgetRequestId_fkey" FOREIGN KEY ("budgetRequestId") REFERENCES "BudgetRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
