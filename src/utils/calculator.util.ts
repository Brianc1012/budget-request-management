// src/utils/calculator.util.ts
import { CachedDepartmentBudget } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

export class BudgetCalculator {
  // Calculate budget utilization metrics
  static calculateUtilization(budget: CachedDepartmentBudget) {
    const allocated = Number(budget.allocatedAmount);
    const used = Number(budget.usedAmount);
    const reserved = Number(budget.reservedAmount);
    const remaining = Number(budget.remainingAmount);
    
    const utilizationRate = 
      allocated > 0 ? ((used + reserved) / allocated) * 100 : 0;
    
    const availableRate = 
      allocated > 0 ? (remaining / allocated) * 100 : 0;
    
    const daysPassed = this.getDaysPassed(budget.periodStart);
    const burnRate = daysPassed > 0 ? used / daysPassed : 0;
    
    const projectedDepletion = this.calculateDepletion(
      remaining,
      burnRate
    );

    return {
      utilizationRate: utilizationRate.toFixed(2),
      availableRate: availableRate.toFixed(2),
      burnRate: burnRate.toFixed(2),
      projectedDepletion,
      isOverBudget: remaining < 0,
      isNearingLimit: utilizationRate > 80
    };
  }

  private static getDaysPassed(startDate: Date): number {
    const now = new Date();
    const diff = now.getTime() - new Date(startDate).getTime();
    return Math.max(1, Math.floor(diff / (1000 * 60 * 60 * 24)));
  }

  private static calculateDepletion(remaining: number, dailyBurn: number): Date | null {
    if (dailyBurn <= 0 || remaining <= 0) return null;
    const daysRemaining = remaining / dailyBurn;
    const depletionDate = new Date();
    depletionDate.setDate(depletionDate.getDate() + Math.floor(daysRemaining));
    return depletionDate;
  }

  // Calculate buffer amount
  static calculateBuffer(amount: number, percentage: number): number {
    return (amount * percentage) / 100;
  }

  // Calculate total reserved with buffer
  static calculateTotalReserved(amount: number, bufferPercentage: number = 0): {
    reservedAmount: number;
    bufferAmount: number;
    totalReserved: number;
  } {
    const bufferAmount = this.calculateBuffer(amount, bufferPercentage);
    const totalReserved = amount + bufferAmount;
    
    return {
      reservedAmount: amount,
      bufferAmount,
      totalReserved
    };
  }
}
