// src/jobs/expiryChecker.job.ts
/**
 * Expiry Checker Job
 * 
 * Checks for budget reservations that have expired
 * Runs daily at midnight to mark expired reservations
 */

import cron from 'node-cron';
import { prisma } from '../config/database';

export function startExpiryCheckerJob() {
  // Run daily at midnight (00:00)
  const job = cron.schedule('0 0 * * *', async () => {
    console.log('🕐 [Expiry Checker Job] Starting...');
    
    try {
      const now = new Date();

      // Find all reserved budget requests with expired reservations
      const expiredRequests = await prisma.budgetRequest.findMany({
        where: {
          isReserved: true,
          isExpired: false,
          reservationExpiry: {
            lt: now
          }
        }
      });

      console.log(`  Found ${expiredRequests.length} expired reservations`);

      // Mark them as expired
      const results = [];
      for (const request of expiredRequests) {
        try {
          await prisma.budgetRequest.update({
            where: { id: request.id },
            data: {
              isExpired: true,
              updatedAt: now,
              updatedBy: 'system:expiry-checker'
            }
          });

          // TODO: Send notification to requester about expiry
          // await sendExpiryNotification(request);

          results.push({ requestCode: request.requestCode, status: 'expired' });
          console.log(`  ✅ Marked request ${request.requestCode} as expired`);
        } catch (error) {
          console.error(`  ❌ Failed to mark ${request.requestCode} as expired:`, error);
          results.push({ 
            requestCode: request.requestCode, 
            status: 'failed', 
            error: error instanceof Error ? error.message : 'Unknown' 
          });
        }
      }

      console.log('✅ [Expiry Checker Job] Completed');
      console.log('  Results:', results);

      // Also check for overdue requests (past SLA deadline)
      const overdueRequests = await prisma.budgetRequest.updateMany({
        where: {
          status: 'PENDING',
          isOverdue: false,
          slaDeadline: {
            lt: now
          }
        },
        data: {
          isOverdue: true,
          updatedAt: now,
          updatedBy: 'system:expiry-checker'
        }
      });

      if (overdueRequests.count > 0) {
        console.log(`  ⚠️  Marked ${overdueRequests.count} requests as overdue`);
      }

    } catch (error) {
      console.error('❌ [Expiry Checker Job] Fatal error:', error);
    }
  });

  console.log('📅 Expiry Checker Job scheduled (daily at midnight)');
  return job;
}
