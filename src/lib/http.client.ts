// ============================================================================
// HTTP CLIENT - Axios wrapper for outgoing requests to FTMS and Audit
// ============================================================================

import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';

export interface HttpClientConfig {
  baseURL: string;
  apiKey: string;
  timeout?: number;
}

export interface RequestOptions extends AxiosRequestConfig {
  idempotencyKey?: string;
  forwardAuthToken?: string;
}

/**
 * Create HTTP client for microservice communication
 */
export function createHttpClient(config: HttpClientConfig): AxiosInstance {
  const client = axios.create({
    baseURL: config.baseURL,
    timeout: config.timeout || 30000,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey,
    },
  });

  // Manual retry logic
  client.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const config = error.config as any;
      if (!config || !config.retry) {
        config.retry = { count: 0, limit: 3 };
      }

      // Retry on network errors and 5xx server errors
      if (
        config.retry.count < config.retry.limit &&
        (!error.response || error.response.status >= 500)
      ) {
        config.retry.count += 1;
        const delayMs = Math.min(1000 * Math.pow(2, config.retry.count), 10000);

        await new Promise((resolve) => setTimeout(resolve, delayMs));
        return client.request(config);
      }

      return Promise.reject(error);
    }
  );

  // Request logging
  client.interceptors.request.use(
    (config) => {
      console.log(`[HTTP Client] ${config.method?.toUpperCase()} ${config.url}`);
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Error logging
  client.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
      if (error.response) {
        console.error(
          `[HTTP Client Error] ${error.response.status} - ${error.response.statusText}`
        );
      } else {
        console.error(`[HTTP Client Error] ${error.message}`);
      }
      return Promise.reject(error);
    }
  );

  return client;
}

/**
 * Make request with idempotency and auth forwarding
 */
export async function makeRequest<T = any>(
  client: AxiosInstance,
  options: RequestOptions
): Promise<T> {
  const headers: any = {
    ...options.headers,
  };

  // Add idempotency key if provided
  if (options.idempotencyKey) {
    headers['Idempotency-Key'] = options.idempotencyKey;
  }

  // Forward authorization token if provided
  if (options.forwardAuthToken) {
    headers['Authorization'] = options.forwardAuthToken;
  }

  const response = await client.request<{ success: boolean; data: T; error?: any }>({
    ...options,
    headers,
  });

  if (!response.data.success) {
    throw new Error(response.data.error?.message || 'Request failed');
  }

  return response.data.data;
}
