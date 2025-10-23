// src/controllers/analytics.controller.ts
import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { successResponse, errorResponse } from '../utils/response.util';
import { Prisma } from '@prisma/client';

/**
 * Get department budget summary
 */
export async function getDepartmentSummary(req: Request, res: Response) {
  try {
    const { department } = req.params;
    const { fiscalYear, fiscalPeriod } = req.query;

    // Build filter
    const where: Prisma.BudgetRequestWhereInput = {
      department: department || req.user?.department,
      isDeleted: false
    };

    if (fiscalYear) {
      where.fiscalYear = parseInt(fiscalYear as string);
    }

    if (fiscalPeriod) {
      where.fiscalPeriod = fiscalPeriod as string;
    }

    // Get aggregate statistics
    const [
      totalRequests,
      pendingRequests,
      approvedRequests,
      rejectedRequests,
      totalRequestedAmount,
      totalApprovedAmount,
      totalReservedAmount,
      totalUtilizedAmount
    ] = await Promise.all([
      prisma.budgetRequest.count({ where }),
      prisma.budgetRequest.count({ where: { ...where, status: 'PENDING' } }),
      prisma.budgetRequest.count({ where: { ...where, status: 'APPROVED' } }),
      prisma.budgetRequest.count({ where: { ...where, status: 'REJECTED' } }),
      prisma.budgetRequest.aggregate({
        where,
        _sum: { amountRequested: true }
      }),
      prisma.budgetRequest.aggregate({
        where: { ...where, status: 'APPROVED' },
        _sum: { amountRequested: true }
      }),
      prisma.budgetRequest.aggregate({
        where: { ...where, isReserved: true },
        _sum: { reservedAmount: true }
      }),
      prisma.budgetRequest.aggregate({
        where: { ...where, isFullyUtilized: true },
        _sum: { actualAmountUtilized: true }
      })
    ]);

    // Calculate approval rate
    const approvalRate = totalRequests > 0 
      ? ((approvedRequests / totalRequests) * 100).toFixed(2)
      : '0.00';

    // Calculate utilization rate (% of reserved budget actually used)
    const reservedAmountValue = Number(totalReservedAmount._sum.reservedAmount) || 0;
    const utilizedAmountValue = Number(totalUtilizedAmount._sum.actualAmountUtilized) || 0;
    const utilizationRate = reservedAmountValue > 0
      ? ((utilizedAmountValue / reservedAmountValue) * 100).toFixed(2)
      : '0.00';

    const summary = {
      department: department || req.user?.department,
      fiscalYear: fiscalYear || 'All',
      fiscalPeriod: fiscalPeriod || 'All',
      requests: {
        total: totalRequests,
        pending: pendingRequests,
        approved: approvedRequests,
        rejected: rejectedRequests
      },
      amounts: {
        totalRequested: Number(totalRequestedAmount._sum.amountRequested) || 0,
        totalApproved: Number(totalApprovedAmount._sum.amountRequested) || 0,
        totalReserved: Number(totalReservedAmount._sum.reservedAmount) || 0,
        totalUtilized: Number(totalUtilizedAmount._sum.actualAmountUtilized) || 0
      },
      metrics: {
        approvalRate: `${approvalRate}%`,
        utilizationRate: `${utilizationRate}%`,
        averageRequestAmount: totalRequests > 0 
          ? ((Number(totalRequestedAmount._sum.amountRequested) || 0) / totalRequests).toFixed(2)
          : '0.00',
        averageApprovalAmount: approvedRequests > 0
          ? ((Number(totalApprovedAmount._sum.amountRequested) || 0) / approvedRequests).toFixed(2)
          : '0.00'
      }
    };

    return successResponse(res, summary, 'Department summary retrieved successfully');
  } catch (error) {
    console.error('Error fetching department summary:', error);
    return errorResponse(res, 'Failed to retrieve department summary');
  }
}

/**
 * Get spending trends over time
 */
export async function getSpendingTrends(req: Request, res: Response) {
  try {
    const { department, startDate, endDate, groupBy = 'month' } = req.query;

    const where: Prisma.BudgetRequestWhereInput = {
      isDeleted: false,
      status: 'APPROVED'
    };

    if (department) {
      where.department = department as string;
    } else if (req.user?.role !== 'SuperAdmin') {
      where.department = req.user?.department;
    }

    if (startDate) {
      where.createdAt = {
        gte: new Date(startDate as string)
      };
    }

    if (endDate) {
      if (where.createdAt && typeof where.createdAt === 'object' && 'gte' in where.createdAt) {
        where.createdAt = {
          gte: where.createdAt.gte,
          lte: new Date(endDate as string)
        };
      } else {
        where.createdAt = {
          lte: new Date(endDate as string)
        };
      }
    }

    // Get requests grouped by period
    const requests = await prisma.budgetRequest.findMany({
      where,
      select: {
        createdAt: true,
        amountRequested: true,
        reservedAmount: true,
        actualAmountUtilized: true,
        department: true
      },
      orderBy: { createdAt: 'asc' }
    });

    // Group by time period
    const trends = requests.reduce((acc: any[], request) => {
      const date = new Date(request.createdAt);
      let period: string;

      if (groupBy === 'day') {
        period = date.toISOString().split('T')[0];
      } else if (groupBy === 'week') {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        period = weekStart.toISOString().split('T')[0];
      } else if (groupBy === 'quarter') {
        const quarter = Math.floor(date.getMonth() / 3) + 1;
        period = `${date.getFullYear()}-Q${quarter}`;
      } else if (groupBy === 'year') {
        period = date.getFullYear().toString();
      } else {
        // Default: month
        period = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }

      const existing = acc.find(item => item.period === period);
      if (existing) {
        existing.requestCount++;
        existing.totalRequested += Number(request.amountRequested);
        existing.totalReserved += Number(request.reservedAmount || 0);
        existing.totalUtilized += Number(request.actualAmountUtilized || 0);
      } else {
        acc.push({
          period,
          requestCount: 1,
          totalRequested: Number(request.amountRequested),
          totalReserved: Number(request.reservedAmount || 0),
          totalUtilized: Number(request.actualAmountUtilized || 0)
        });
      }

      return acc;
    }, []);

    return successResponse(res, {
      department: department || 'All',
      groupBy,
      trends
    }, 'Spending trends retrieved successfully');
  } catch (error) {
    console.error('Error fetching spending trends:', error);
    return errorResponse(res, 'Failed to retrieve spending trends');
  }
}

/**
 * Get approval metrics and performance
 */
export async function getApprovalMetrics(req: Request, res: Response) {
  try {
    const { department, startDate, endDate } = req.query;

    const where: Prisma.BudgetRequestWhereInput = {
      isDeleted: false
    };

    if (department) {
      where.department = department as string;
    } else if (req.user?.role !== 'SuperAdmin') {
      where.department = req.user?.department;
    }

    if (startDate) {
      where.createdAt = {
        gte: new Date(startDate as string)
      };
    }

    if (endDate) {
      if (where.createdAt && typeof where.createdAt === 'object' && 'gte' in where.createdAt) {
        where.createdAt = {
          gte: where.createdAt.gte,
          lte: new Date(endDate as string)
        };
      } else {
        where.createdAt = {
          lte: new Date(endDate as string)
        };
      }
    }

    // Get approval statistics
    const [
      approvedRequests,
      rejectedRequests,
      pendingRequests,
      overdueRequests,
      escalatedRequests
    ] = await Promise.all([
      prisma.budgetRequest.findMany({
        where: { ...where, status: 'APPROVED' },
        select: {
          createdAt: true,
          approvedAt: true,
          amountRequested: true
        }
      }),
      prisma.budgetRequest.findMany({
        where: { ...where, status: 'REJECTED' },
        select: {
          createdAt: true,
          rejectedAt: true,
          amountRequested: true
        }
      }),
      prisma.budgetRequest.count({
        where: { ...where, status: 'PENDING' }
      }),
      prisma.budgetRequest.count({
        where: { ...where, isOverdue: true }
      }),
      prisma.budgetRequest.count({
        where: { ...where, escalationLevel: { gt: 0 } }
      })
    ]);

    // Calculate average approval time
    let totalApprovalTime = 0;
    let approvalTimeCount = 0;

    approvedRequests.forEach(req => {
      if (req.approvedAt) {
        const timeToApprove = req.approvedAt.getTime() - req.createdAt.getTime();
        totalApprovalTime += timeToApprove;
        approvalTimeCount++;
      }
    });

    const avgApprovalTimeMs = approvalTimeCount > 0 
      ? totalApprovalTime / approvalTimeCount
      : 0;
    const avgApprovalTimeHours = (avgApprovalTimeMs / (1000 * 60 * 60)).toFixed(2);

    // Calculate average rejection time
    let totalRejectionTime = 0;
    let rejectionTimeCount = 0;

    rejectedRequests.forEach(req => {
      if (req.rejectedAt) {
        const timeToReject = req.rejectedAt.getTime() - req.createdAt.getTime();
        totalRejectionTime += timeToReject;
        rejectionTimeCount++;
      }
    });

    const avgRejectionTimeMs = rejectionTimeCount > 0
      ? totalRejectionTime / rejectionTimeCount
      : 0;
    const avgRejectionTimeHours = (avgRejectionTimeMs / (1000 * 60 * 60)).toFixed(2);

    // Calculate approval rate by amount
    const totalApprovedAmount = approvedRequests.reduce((sum, req) => 
      sum + Number(req.amountRequested), 0);
    const totalRejectedAmount = rejectedRequests.reduce((sum, req) => 
      sum + Number(req.amountRequested), 0);
    const totalAmount = totalApprovedAmount + totalRejectedAmount;

    const approvalRateByAmount = totalAmount > 0
      ? ((totalApprovedAmount / totalAmount) * 100).toFixed(2)
      : '0.00';

    const metrics = {
      counts: {
        approved: approvedRequests.length,
        rejected: rejectedRequests.length,
        pending: pendingRequests,
        overdue: overdueRequests,
        escalated: escalatedRequests
      },
      rates: {
        approvalRate: approvedRequests.length + rejectedRequests.length > 0
          ? ((approvedRequests.length / (approvedRequests.length + rejectedRequests.length)) * 100).toFixed(2) + '%'
          : '0.00%',
        rejectionRate: approvedRequests.length + rejectedRequests.length > 0
          ? ((rejectedRequests.length / (approvedRequests.length + rejectedRequests.length)) * 100).toFixed(2) + '%'
          : '0.00%',
        approvalRateByAmount: approvalRateByAmount + '%'
      },
      timing: {
        avgApprovalTimeHours: parseFloat(avgApprovalTimeHours),
        avgRejectionTimeHours: parseFloat(avgRejectionTimeHours),
        avgResponseTimeHours: approvalTimeCount + rejectionTimeCount > 0
          ? ((totalApprovalTime + totalRejectionTime) / (approvalTimeCount + rejectionTimeCount) / (1000 * 60 * 60)).toFixed(2)
          : '0.00'
      },
      amounts: {
        totalApproved: totalApprovedAmount,
        totalRejected: totalRejectedAmount,
        avgApprovedAmount: approvedRequests.length > 0
          ? (totalApprovedAmount / approvedRequests.length).toFixed(2)
          : '0.00'
      }
    };

    return successResponse(res, metrics, 'Approval metrics retrieved successfully');
  } catch (error) {
    console.error('Error fetching approval metrics:', error);
    return errorResponse(res, 'Failed to retrieve approval metrics');
  }
}

/**
 * Get top requesters
 */
export async function getTopRequesters(req: Request, res: Response) {
  try {
    const { department, limit = 10 } = req.query;

    const where: Prisma.BudgetRequestWhereInput = {
      isDeleted: false
    };

    if (department) {
      where.department = department as string;
    } else if (req.user?.role !== 'SuperAdmin') {
      where.department = req.user?.department;
    }

    const requests = await prisma.budgetRequest.groupBy({
      by: ['requestedBy', 'requestedByName'],
      where,
      _count: { id: true },
      _sum: { amountRequested: true },
      orderBy: {
        _count: { id: 'desc' }
      },
      take: parseInt(limit as string)
    });

    const topRequesters = requests.map(requester => ({
      userId: requester.requestedBy,
      userName: requester.requestedByName || 'Unknown',
      requestCount: requester._count.id,
      totalRequested: Number(requester._sum.amountRequested) || 0,
      avgRequestAmount: requester._count.id > 0
        ? ((Number(requester._sum.amountRequested) || 0) / requester._count.id).toFixed(2)
        : '0.00'
    }));

    return successResponse(res, topRequesters, 'Top requesters retrieved successfully');
  } catch (error) {
    console.error('Error fetching top requesters:', error);
    return errorResponse(res, 'Failed to retrieve top requesters');
  }
}

/**
 * Get category breakdown
 */
export async function getCategoryBreakdown(req: Request, res: Response) {
  try {
    const { department } = req.query;

    const where: Prisma.BudgetRequestWhereInput = {
      isDeleted: false,
      status: 'APPROVED'
    };

    if (department) {
      where.department = department as string;
    } else if (req.user?.role !== 'SuperAdmin') {
      where.department = req.user?.department;
    }

    const categories = await prisma.budgetRequest.groupBy({
      by: ['category'],
      where,
      _count: { id: true },
      _sum: { amountRequested: true },
      orderBy: {
        _sum: { amountRequested: 'desc' }
      }
    });

    const breakdown = categories.map(cat => ({
      category: cat.category || 'Uncategorized',
      requestCount: cat._count.id,
      totalAmount: Number(cat._sum.amountRequested) || 0,
      avgAmount: cat._count.id > 0
        ? ((Number(cat._sum.amountRequested) || 0) / cat._count.id).toFixed(2)
        : '0.00'
    }));

    return successResponse(res, breakdown, 'Category breakdown retrieved successfully');
  } catch (error) {
    console.error('Error fetching category breakdown:', error);
    return errorResponse(res, 'Failed to retrieve category breakdown');
  }
}
