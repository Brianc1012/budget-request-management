// src/services/sync.service.ts
import axios from 'axios';
import { prisma } from '../config/database';
import cacheService from './cache.service';
import { FINANCE_API_URL, FINANCE_API_KEY } from '../config/constants';
import { createHttpClient, makeRequest } from '../lib/http.client';
import { generateIdempotencyKey } from '../lib/idempotency';

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
          },
          timeout: 5000 // 5 second timeout
        }
      );

      const financeData = (response.data as any).data;

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
        console.log('Using stale cached budget data');
        // Mark as stale
        await prisma.cachedDepartmentBudget.update({
          where: { id: staleData.id },
          data: { isStale: true }
        });
        return staleData;
      }

      // Create a default/mock budget record if no cached data exists
      console.warn(`No cached budget found for ${department}. Creating default budget.`);
      const now = new Date();
      const yearStart = new Date(fiscalYear, 0, 1);
      const yearEnd = new Date(fiscalYear, 11, 31);

      // Generate a unique negative ID for mock budgets (won't conflict with real Finance IDs)
      // Format: -YYYYPPD where YYYY=year, PP=period number (01-99), D=department hash
      const departmentHash = department.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 10;
      
      // Extract period number based on fiscal period format
      let periodNum = 0;
      if (fiscalPeriod.includes('Q')) {
        // Quarter format: Q1, Q2, Q3, Q4
        periodNum = parseInt(fiscalPeriod.replace('Q', '')) || 0;
      } else if (fiscalPeriod.includes('H')) {
        // Half-year format: H1, H2 -> map to 5, 6 to avoid conflicts with quarters
        periodNum = parseInt(fiscalPeriod.replace('H', '')) + 4 || 5;
      } else if (fiscalPeriod.match(/^\d{4}-\d{2}$/)) {
        // Month format: 2025-01 -> use month number (1-12) + 10 to avoid conflicts
        const month = parseInt(fiscalPeriod.split('-')[1]) || 0;
        periodNum = month + 10;
      } else {
        // Default/unknown format - use hash of the string
        periodNum = 90 + (fiscalPeriod.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 10);
      }
      
      const mockBudgetId = -(fiscalYear * 100 + periodNum * 10 + departmentHash);
      
      console.log(`Generating mock budget ID for ${department} ${fiscalYear} ${fiscalPeriod}: ${mockBudgetId} (periodNum: ${periodNum}, deptHash: ${departmentHash})`);

      // Use upsert to avoid unique constraint violation
      const defaultBudget = await prisma.cachedDepartmentBudget.upsert({
        where: {
          department_fiscalYear_fiscalPeriod: {
            department,
            fiscalYear,
            fiscalPeriod
          }
        },
        create: {
          budgetId: mockBudgetId, // Negative ID for mock budgets
          department,
          fiscalYear,
          fiscalPeriod,
          allocatedAmount: 10000000, // 10M default allocation
          usedAmount: 0,
          reservedAmount: 0,
          remainingAmount: 10000000,
          periodStart: yearStart,
          periodEnd: yearEnd,
          lastSyncedAt: now,
          isStale: true // Mark as stale since it's not real data
        },
        update: {
          // If it already exists, just update the sync time
          lastSyncedAt: now,
          isStale: true
        }
      });

      console.log('Default budget created/updated:', defaultBudget);
      return defaultBudget;
    }
  }

  // Notify Finance Main of budget reservation with idempotency and auth forwarding
  async notifyBudgetReservation(
    budgetRequestId: number,
    authToken?: string
  ) {
    try {
      const budgetRequest = await prisma.budgetRequest.findUnique({
        where: { id: budgetRequestId }
      });

      if (!budgetRequest) {
        throw new Error('Budget request not found');
      }

      // Generate idempotency key
      const idempotencyKey = generateIdempotencyKey(
        'budget',
        'reserve',
        budgetRequest.id
      );

      // Make request with headers
      const headers: any = {
        'x-api-key': FINANCE_API_KEY,
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey,
      };

      if (authToken) {
        headers['Authorization'] = authToken;
      }

      await axios.post(
        `${FINANCE_API_URL}/api/integration/budgets/reserve`,
        {
          budgetRequestId: budgetRequest.id,
          department: budgetRequest.department,
          fiscalYear: budgetRequest.fiscalYear,
          fiscalPeriod: budgetRequest.fiscalPeriod,
          amount: Number(budgetRequest.reservedAmount),
          requestCode: budgetRequest.requestCode,
          expiresAt: budgetRequest.reservationExpiry,
          idempotencyKey,
        },
        { headers }
      );

      console.log(`✅ Budget reservation notified for BR-${budgetRequestId}`);
    } catch (error: any) {
      console.error('❌ Budget reservation notification failed:', error.message);
      // Don't throw - notification failure shouldn't break the approval flow
    }
  }
}

export default new SyncService();
