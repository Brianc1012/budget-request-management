// src/jobs/index.ts
/**
 * Job Scheduler Index
 * 
 * Initializes and manages all scheduled jobs
 */

import { startBudgetSyncJob } from './budgetSync.job';
import { startExpiryCheckerJob } from './expiryChecker.job';
import { startAggregatesJob } from './aggregates.job';

export function startAllJobs() {
  console.log('🚀 Initializing scheduled jobs...\n');

  try {
    // Start budget sync job (every 15 minutes)
    const budgetSyncJob = startBudgetSyncJob();

    // Start expiry checker job (daily at midnight)
    const expiryCheckerJob = startExpiryCheckerJob();

    // Start aggregates job (every 30 minutes)
    const aggregatesJob = startAggregatesJob();

    console.log('\n✅ All scheduled jobs initialized successfully\n');

    return {
      budgetSyncJob,
      expiryCheckerJob,
      aggregatesJob
    };
  } catch (error) {
    console.error('❌ Failed to initialize scheduled jobs:', error);
    throw error;
  }
}

export function stopAllJobs(jobs: ReturnType<typeof startAllJobs>) {
  console.log('🛑 Stopping all scheduled jobs...');
  
  jobs.budgetSyncJob.stop();
  jobs.expiryCheckerJob.stop();
  jobs.aggregatesJob.stop();

  console.log('✅ All scheduled jobs stopped');
}
