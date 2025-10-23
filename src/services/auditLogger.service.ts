// src/services/auditLogger.service.ts
import axios from 'axios';
import { AUDIT_LOGS_API_URL, AUDIT_API_KEY } from '../config/constants';
import { UserContext } from '../types/express';

class AuditLoggerService {
  async log(action: string, data: any, user: UserContext) {
    try {
      await axios.post(
        `${AUDIT_LOGS_API_URL}/api/audit-logs`,
        {
          service: 'budget-request-microservice',
          action,
          userId: user.id,
          username: user.username,
          userRole: user.role,
          resourceType: 'BudgetRequest',
          resourceId: data.id || data.budgetRequestId,
          details: data,
          timestamp: new Date().toISOString()
        },
        {
          headers: {
            'x-api-key': AUDIT_API_KEY,
            'Content-Type': 'application/json'
          }
        }
      );
    } catch (error: any) {
      console.error('Audit log failed:', error.message);
      // Don't throw - audit logging shouldn't break the main flow
    }
  }

  // Convenience methods
  create(data: any, user: UserContext) {
    return this.log('CREATE', { newValues: data, ...data }, user);
  }

  update(id: number, oldData: any, newData: any, user: UserContext) {
    return this.log('UPDATE', {
      id,
      oldValues: oldData,
      newValues: newData,
      changedFields: Object.keys(newData)
    }, user);
  }

  delete(id: number, data: any, user: UserContext) {
    return this.log('DELETE', { id, oldValues: data }, user);
  }

  approve(data: any, user: UserContext) {
    return this.log('APPROVE', data, user);
  }

  reject(data: any, user: UserContext) {
    return this.log('REJECT', data, user);
  }

  view(data: any, user: UserContext) {
    return this.log('VIEW', data, user);
  }

  submit(data: any, user: UserContext) {
    return this.log('SUBMIT', data, user);
  }
}

export default new AuditLoggerService();
