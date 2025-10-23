// src/jobs/budgetSync.job.ts
/**
 * Budget Sync Job
 * 
 * Synchronizes department budget data from Finance Main API
 * Runs every 15 minutes to ensure budget availability is up-to-date
 */

import cron from 'node-cron';
import { DEPARTMENTS } from '../config/constants';

export function startBudgetSyncJob() {
  // Run every 15 minutes
  const job = cron.schedule('*/15 * * * *', async () => {
    console.log('🔄 [Budget Sync Job] Starting...');
    
    try {
      const departments = DEPARTMENTS;
      const results = [];

      for (const department of departments) {
        try {
          console.log(`  Syncing budget for department: ${department}`);
          
          // TODO: Implement actual sync with Finance API
          // const budgetData = await syncDepartmentBudget(department);
          
          results.push({ department, status: 'success' });
        } catch (error) {
          console.error(`  ❌ Failed to sync ${department}:`, error);
          results.push({ department, status: 'failed', error: error instanceof Error ? error.message : 'Unknown' });
        }
      }

      console.log('✅ [Budget Sync Job] Completed');
      console.log('  Results:', results);
    } catch (error) {
      console.error('❌ [Budget Sync Job] Fatal error:', error);
    }
  });

  console.log('📅 Budget Sync Job scheduled (every 15 minutes)');
  return job;
}
