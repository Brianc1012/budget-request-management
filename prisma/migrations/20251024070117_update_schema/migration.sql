/*
  Warnings:

  - You are about to drop the column `isDraft` on the `BudgetRequest` table. All the data in the column will be lost.
  - You are about to drop the column `requestedBy` on the `BudgetRequest` table. All the data in the column will be lost.
  - You are about to drop the column `requestedByEmail` on the `BudgetRequest` table. All the data in the column will be lost.
  - You are about to drop the column `requestedByName` on the `BudgetRequest` table. All the data in the column will be lost.
  - You are about to drop the column `requestedByRole` on the `BudgetRequest` table. All the data in the column will be lost.
  - The `status` column on the `BudgetRequest` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `fromStatus` column on the `BudgetRequestApprovalHistory` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `changedByRole` column on the `BudgetRequestApprovalHistory` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `BudgetRequestItemAllocation` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Added the required column `createdByRole` to the `BudgetRequest` table without a default value. This is not possible if the table is not empty.
  - Made the column `justification` on table `BudgetRequest` required. This step will fail if there are existing NULL values in that column.
  - Made the column `createdBy` on table `BudgetRequest` required. This step will fail if there are existing NULL values in that column.
  - Changed the type of `toStatus` on the `BudgetRequestApprovalHistory` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "BudgetRequestStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'NON_ADMIN');

-- DropIndex
DROP INDEX "public"."BudgetRequest_requestedBy_createdAt_idx";

-- AlterTable
ALTER TABLE "BudgetRequest" DROP COLUMN "isDraft",
DROP COLUMN "requestedBy",
DROP COLUMN "requestedByEmail",
DROP COLUMN "requestedByName",
DROP COLUMN "requestedByRole",
ADD COLUMN     "canBeDeletedBy" TEXT,
ADD COLUMN     "createdByEmail" TEXT,
ADD COLUMN     "createdByName" TEXT,
ADD COLUMN     "createdByRole" "UserRole" NOT NULL,
ADD COLUMN     "isVisibleToAllDepts" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "justification" SET NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" "BudgetRequestStatus" NOT NULL DEFAULT 'DRAFT',
ALTER COLUMN "createdBy" SET NOT NULL;

-- AlterTable
ALTER TABLE "BudgetRequestApprovalHistory" DROP COLUMN "fromStatus",
ADD COLUMN     "fromStatus" "BudgetRequestStatus",
DROP COLUMN "toStatus",
ADD COLUMN     "toStatus" "BudgetRequestStatus" NOT NULL,
DROP COLUMN "changedByRole",
ADD COLUMN     "changedByRole" "UserRole";

-- AlterTable
ALTER TABLE "BudgetRequestItemAllocation" DROP COLUMN "status",
ADD COLUMN     "status" "BudgetRequestStatus" NOT NULL DEFAULT 'DRAFT';

-- DropEnum
DROP TYPE "public"."ApprovalStatus";

-- CreateTable
CREATE TABLE "BudgetRequestExportLog" (
    "id" SERIAL NOT NULL,
    "budgetRequestId" INTEGER,
    "exportedBy" TEXT NOT NULL,
    "exportedByName" TEXT,
    "exportedByRole" "UserRole" NOT NULL,
    "exportedByDept" TEXT NOT NULL,
    "exportFormat" TEXT NOT NULL,
    "exportScope" TEXT NOT NULL,
    "recordCount" INTEGER NOT NULL,
    "filterCriteria" TEXT,
    "fileName" TEXT,
    "fileSizeKB" INTEGER,
    "downloadUrl" TEXT,
    "expiresAt" TIMESTAMP(3),
    "exportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "BudgetRequestExportLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BudgetRequestExportLog_exportedBy_exportedAt_idx" ON "BudgetRequestExportLog"("exportedBy", "exportedAt");

-- CreateIndex
CREATE INDEX "BudgetRequestExportLog_exportedByDept_exportedAt_idx" ON "BudgetRequestExportLog"("exportedByDept", "exportedAt");

-- CreateIndex
CREATE INDEX "BudgetRequestExportLog_exportFormat_exportedAt_idx" ON "BudgetRequestExportLog"("exportFormat", "exportedAt");

-- CreateIndex
CREATE INDEX "BudgetRequestExportLog_budgetRequestId_idx" ON "BudgetRequestExportLog"("budgetRequestId");

-- CreateIndex
CREATE INDEX "BudgetRequest_department_status_idx" ON "BudgetRequest"("department", "status");

-- CreateIndex
CREATE INDEX "BudgetRequest_createdBy_createdByRole_status_idx" ON "BudgetRequest"("createdBy", "createdByRole", "status");

-- CreateIndex
CREATE INDEX "BudgetRequest_createdBy_createdAt_idx" ON "BudgetRequest"("createdBy", "createdAt");

-- CreateIndex
CREATE INDEX "BudgetRequest_status_createdAt_idx" ON "BudgetRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "BudgetRequest_priority_status_idx" ON "BudgetRequest"("priority", "status");

-- CreateIndex
CREATE INDEX "BudgetRequest_department_status_isVisibleToAllDepts_idx" ON "BudgetRequest"("department", "status", "isVisibleToAllDepts");

-- CreateIndex
CREATE INDEX "BudgetRequestItemAllocation_status_idx" ON "BudgetRequestItemAllocation"("status");

-- AddForeignKey
ALTER TABLE "BudgetRequestExportLog" ADD CONSTRAINT "BudgetRequestExportLog_budgetRequestId_fkey" FOREIGN KEY ("budgetRequestId") REFERENCES "BudgetRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
