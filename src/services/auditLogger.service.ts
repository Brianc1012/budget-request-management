// src/services/auditLogger.service.ts
import axios from 'axios';
import { AUDIT_LOGS_API_URL, AUDIT_API_KEY } from '../config/constants';
import { UserContext } from '../types/express';
import { generateSimpleIdempotencyKey } from '../lib/idempotency';

class AuditLoggerService {
  async log(action: string, data: any, user: UserContext, authToken?: string) {
    try {
      const headers: any = {
        'x-api-key': AUDIT_API_KEY,
        'Content-Type': 'application/json',
      };

      // Forward auth token if provided
      if (authToken) {
        headers['Authorization'] = authToken;
      }

      await axios.post(
        `${AUDIT_LOGS_API_URL}/api/audit-logs`,
        {
          eventId: generateSimpleIdempotencyKey(), // Unique event ID for idempotency
          service: 'budget',
          module: 'budget-management',
          action,
          user: {
            id: user.id,
            username: user.username,
            role: user.role,
            department: user.department || 'unknown',
          },
          resourceType: 'BudgetRequest',
          resourceId: data.id || data.budgetRequestId || data.requestCode,
          payload: data,
          timestamp: new Date().toISOString(),
          meta: {
            source: 'api',
          },
        },
        { headers }
      );
    } catch (error: any) {
      console.error('❌ Audit log failed:', error.message);
      // Don't throw - audit logging shouldn't break the main flow
    }
  }

  // Convenience methods
  create(data: any, user: UserContext, authToken?: string) {
    return this.log('CREATE', { newValues: data, ...data }, user, authToken);
  }

  update(id: number, oldData: any, newData: any, user: UserContext, authToken?: string) {
    return this.log('UPDATE', {
      id,
      oldValues: oldData,
      newValues: newData,
      changedFields: Object.keys(newData)
    }, user, authToken);
  }

  delete(id: number, data: any, user: UserContext, authToken?: string) {
    return this.log('DELETE', { id, oldValues: data }, user, authToken);
  }

  approve(data: any, user: UserContext, authToken?: string) {
    return this.log('APPROVE', data, user, authToken);
  }

  reject(data: any, user: UserContext, authToken?: string) {
    return this.log('REJECT', data, user, authToken);
  }

  view(data: any, user: UserContext, authToken?: string) {
    return this.log('VIEW', data, user, authToken);
  }

  submit(data: any, user: UserContext, authToken?: string) {
    return this.log('SUBMIT', data, user, authToken);
  }
}

export default new AuditLoggerService();
