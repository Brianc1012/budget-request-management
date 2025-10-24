// app/services/budgetRequest.service.ts
// Budget Request API service layer

import apiService, { ApiResponse } from './api.service';

export interface BudgetRequest {
  id: number;
  requestCode?: string;
  purpose: string;
  justification: string;
  amountRequested: number;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  category: string;
  priority?: string;
  urgencyReason?: string;
  createdBy: number;
  createdByName: string;
  department: string;
  fiscalYear: number;
  fiscalPeriod: string;
  reservedAmount?: number;
  bufferPercentage?: number;
  reviewedBy?: number;
  reviewedByName?: string;
  reviewNotes?: string;
  createdAt: string;
  updatedAt?: string;
  approvedAt?: string;
  rejectedAt?: string;
  cancelledAt?: string;
}

export interface CreateBudgetRequestDto {
  purpose: string;
  justification: string;
  amountRequested: number;
  category: string;
  priority?: string;
  urgencyReason?: string;
  fiscalYear: number;
  fiscalPeriod: string;
  department: string;
  createdByName: string;
  createdByRole: string;
  status: 'DRAFT' | 'SUBMITTED';
  start_date?: string;
  end_date?: string;
  items?: any[];
  supporting_documents?: File[];
}

export interface UpdateBudgetRequestDto {
  purpose?: string;
  justification?: string;
  amountRequested?: number;
  category?: string;
  fiscalPeriod?: string;
}

export interface ApprovalDto {
  reservedAmount?: number;
  bufferPercentage?: number;
  reviewNotes?: string;
}

export interface RejectionDto {
  reviewNotes: string;
}

export interface ListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  department?: string;
  fiscalYear?: number;
  fiscalPeriod?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

class BudgetRequestService {
  /**
   * Get the appropriate API endpoint based on user role and department
   */
  private getBaseEndpoint(): string {
    const role = apiService.getMockRole() || 'Finance Admin';
    const department = apiService.getMockDepartment() || 'finance';

    // Finance Admin has access to all departments
    if (department === 'finance' && role.toLowerCase().includes('admin')) {
      return '/finance/admin/budget-requests';
    }

    // Department Admin routes
    if (role.toLowerCase().includes('admin')) {
      return `/${department}/admin/budget-requests`;
    }

    // Non-Admin routes (department-specific)
    return `/${department}/non-admin/budget-requests`;
  }

  /**
   * Get approval endpoint (Finance Admin only)
   */
  private getApprovalEndpoint(): string {
    return '/finance/admin/approvals';
  }

  /**
   * List budget requests with filters and pagination
   */
  async list(params?: ListParams): Promise<ApiResponse<BudgetRequest[]>> {
    const endpoint = this.getBaseEndpoint();
    return apiService.get<BudgetRequest[]>(endpoint, params);
  }

  /**
   * Get single budget request by ID
   */
  async getById(id: number): Promise<ApiResponse<BudgetRequest>> {
    const endpoint = this.getBaseEndpoint();
    return apiService.get<BudgetRequest>(`${endpoint}/${id}`);
  }

  /**
   * Create new budget request
   */
  async create(data: CreateBudgetRequestDto): Promise<ApiResponse<BudgetRequest>> {
    const endpoint = this.getBaseEndpoint();
    
    // Remove files for now (would need multipart/form-data handling)
    const { supporting_documents, ...requestData } = data;
    
    return apiService.post<BudgetRequest>(endpoint, requestData);
  }

  /**
   * Update budget request (only DRAFT status)
   */
  async update(id: number, data: UpdateBudgetRequestDto): Promise<ApiResponse<BudgetRequest>> {
    const endpoint = this.getBaseEndpoint();
    return apiService.put<BudgetRequest>(`${endpoint}/${id}`, data);
  }

  /**
   * Delete budget request (only DRAFT status)
   */
  async delete(id: number): Promise<ApiResponse<void>> {
    const endpoint = this.getBaseEndpoint();
    return apiService.delete<void>(`${endpoint}/${id}`);
  }

  /**
   * Submit budget request for approval (DRAFT → SUBMITTED)
   */
  async submit(id: number): Promise<ApiResponse<BudgetRequest>> {
    const endpoint = this.getBaseEndpoint();
    return apiService.post<BudgetRequest>(`${endpoint}/${id}/submit`);
  }

  /**
   * Approve budget request (Finance Admin only)
   */
  async approve(id: number, approvalData?: ApprovalDto): Promise<ApiResponse<BudgetRequest>> {
    const endpoint = this.getApprovalEndpoint();
    return apiService.post<BudgetRequest>(`${endpoint}/${id}/approve`, approvalData);
  }

  /**
   * Reject budget request (Finance Admin only)
   */
  async reject(id: number, rejectionData: RejectionDto): Promise<ApiResponse<BudgetRequest>> {
    const endpoint = this.getApprovalEndpoint();
    return apiService.post<BudgetRequest>(`${endpoint}/${id}/reject`, rejectionData);
  }

  /**
   * Get audit trail for budget request
   */
  async getAuditTrail(id: number): Promise<ApiResponse<any[]>> {
    // This would call the audit logs service
    // For now, return mock data
    return {
      success: true,
      data: [
        {
          action: 'CREATED',
          user: 'John Doe',
          timestamp: new Date().toISOString(),
          details: 'Budget request created'
        }
      ]
    };
  }

  /**
   * Export budget request (CSV/Excel/PDF)
   */
  async export(id: number, format: 'csv' | 'excel' | 'pdf'): Promise<ApiResponse<Blob>> {
    // This would handle file download
    // Implementation depends on backend export endpoint
    return {
      success: false,
      error: 'Export not implemented yet'
    };
  }
}

// Export singleton instance
export const budgetRequestService = new BudgetRequestService();
export default budgetRequestService;
