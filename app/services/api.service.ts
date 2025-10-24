// app/services/api.service.ts
// Centralized API service for all backend communication

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4005/api';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

class ApiService {
  private baseUrl: string;
  private token: string | null = null;
  private mockRole: string | null = null;
  private mockDepartment: string | null = null;

  constructor() {
    this.baseUrl = API_BASE_URL;
    
    // Load token from localStorage if available (client-side only)
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('auth_token');
      this.mockRole = localStorage.getItem('mock_role') || 'Finance Admin';
      this.mockDepartment = localStorage.getItem('mock_department') || 'finance';
    }
  }

  /**
   * Set authentication token
   */
  setToken(token: string) {
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token);
    }
  }

  /**
   * Set mock role for testing (when JWT_DISABLED=true)
   */
  setMockRole(role: string, department: string) {
    this.mockRole = role;
    this.mockDepartment = department;
    if (typeof window !== 'undefined') {
      localStorage.setItem('mock_role', role);
      localStorage.setItem('mock_department', department);
    }
  }

  /**
   * Get current mock role
   */
  getMockRole() {
    return this.mockRole;
  }

  /**
   * Get current mock department
   */
  getMockDepartment() {
    return this.mockDepartment;
  }

  /**
   * Clear authentication
   */
  clearAuth() {
    this.token = null;
    this.mockRole = null;
    this.mockDepartment = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('mock_role');
      localStorage.removeItem('mock_department');
    }
  }

  /**
   * Get default headers for API requests
   */
  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    // Add JWT token if available
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    // Add mock headers for testing (when JWT_DISABLED=true on backend)
    if (this.mockRole) {
      headers['x-mock-role'] = this.mockRole;
    }
    if (this.mockDepartment) {
      headers['x-mock-department'] = this.mockDepartment;
    }

    return headers;
  }

  /**
   * Generic fetch wrapper with error handling
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      const headers = this.getHeaders();

      const response = await fetch(url, {
        ...options,
        headers: {
          ...headers,
          ...options.headers,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.message || data.error || 'An error occurred',
          message: data.message,
        };
      }

      return data;
    } catch (error: any) {
      console.error('API Request Error:', error);
      return {
        success: false,
        error: error.message || 'Network error occurred',
      };
    }
  }

  /**
   * GET request
   */
  async get<T>(endpoint: string, params?: Record<string, any>): Promise<ApiResponse<T>> {
    const queryString = params
      ? '?' + new URLSearchParams(params).toString()
      : '';
    return this.request<T>(endpoint + queryString, { method: 'GET' });
  }

  /**
   * POST request
   */
  async post<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  /**
   * PUT request
   */
  async put<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<ApiResponse> {
    return this.get('/health');
  }
}

// Export singleton instance
export const apiService = new ApiService();
export default apiService;
