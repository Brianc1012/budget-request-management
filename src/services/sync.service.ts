// src/services/sync.service.ts
import axios from 'axios';
import { prisma } from '../config/database';
import cacheService from './cache.service';
import { FINANCE_API_URL, FINANCE_API_KEY } from '../config/constants';

class SyncService {
  // Sync department budget from Finance Main
  async syncDepartmentBudget(department: string, fiscalYear: number, fiscalPeriod: string) {
    try {
      // Check cache first
      const cached = await cacheService.getDepartmentBudget(department, fiscalPeriod);
      if (cached) return cached;

      // Fetch from Finance API
      const response = await axios.get(
        `${FINANCE_API_URL}/api/budgets/department/${department}`,
        {
          params: { fiscalYear, fiscalPeriod },
          headers: {
            'x-api-key': FINANCE_API_KEY,
            'Content-Type': 'application/json'
          }
        }
      );

      const financeData = response.data.data;

      // Upsert into cached budget table
      const budgetData = await prisma.cachedDepartmentBudget.upsert({
        where: {
          department_fiscalYear_fiscalPeriod: {
            department,
            fiscalYear,
            fiscalPeriod
          }
        },
        create: {
          budgetId: financeData.id,
          department,
          fiscalYear,
          fiscalPeriod,
          allocatedAmount: financeData.allocatedAmount,
          usedAmount: financeData.usedAmount,
          reservedAmount: financeData.reservedAmount,
          remainingAmount: financeData.remainingAmount,
          periodStart: new Date(financeData.periodStart),
          periodEnd: new Date(financeData.periodEnd),
          lastSyncedAt: new Date(),
          isStale: false
        },
        update: {
          allocatedAmount: financeData.allocatedAmount,
          usedAmount: financeData.usedAmount,
          reservedAmount: financeData.reservedAmount,
          remainingAmount: financeData.remainingAmount,
          lastSyncedAt: new Date(),
          isStale: false
        }
      });

      // Cache the result
      await cacheService.cacheDepartmentBudget(department, fiscalPeriod, budgetData);

      return budgetData;
    } catch (error: any) {
      console.error('Budget sync failed:', error.message);
      
      // Try to use stale cached data as fallback
      const staleData = await prisma.cachedDepartmentBudget.findUnique({
        where: {
          department_fiscalYear_fiscalPeriod: {
            department,
            fiscalYear,
            fiscalPeriod
          }
        }
      });

      if (staleData) {
        // Mark as stale
        await prisma.cachedDepartmentBudget.update({
          where: { id: staleData.id },
          data: { isStale: true }
        });
        return staleData;
      }

      throw new Error(`Unable to sync budget for ${department}`);
    }
  }

  // Notify Finance Main of budget reservation
  async notifyBudgetReservation(budgetRequestId: number) {
    try {
      const budgetRequest = await prisma.budgetRequest.findUnique({
        where: { id: budgetRequestId }
      });

      if (!budgetRequest) {
        throw new Error('Budget request not found');
      }

      await axios.post(
        `${FINANCE_API_URL}/api/budgets/reserve`,
        {
          department: budgetRequest.department,
          fiscalYear: budgetRequest.fiscalYear,
          fiscalPeriod: budgetRequest.fiscalPeriod,
          amount: Number(budgetRequest.reservedAmount),
          budgetRequestId: budgetRequest.id,
          requestCode: budgetRequest.requestCode,
          expiresAt: budgetRequest.reservationExpiry
        },
        {
          headers: {
            'x-api-key': FINANCE_API_KEY,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log(`Budget reservation notified for BR-${budgetRequestId}`);
    } catch (error: any) {
      console.error('Budget reservation notification failed:', error.message);
      // Don't throw - notification failure shouldn't break the approval flow
    }
  }
}

export default new SyncService();
