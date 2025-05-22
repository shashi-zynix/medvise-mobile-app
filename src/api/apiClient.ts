// filepath: /Users/shashi/Projects/medvise/MedviseApp/src/api/apiClient.ts
import axiosInstance from '../axios/instance';
import { AxiosRequestConfig, AxiosResponse } from 'axios';
import logger from '../utils/logger';

/**
 * Interface for API response
 * @template T - The type of data returned by the API
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
    endpoint?: string;
    method?: string;
  };
  statusCode?: number;
}

/**
 * Generic API class with methods for making HTTP requests
 */
class ApiClient {
  /**
   * Make a GET request to the specified endpoint
   * 
   * @param endpoint - The API endpoint to call
   * @param params - Query parameters 
   * @param config - Additional axios config
   * @returns Promise with the response data
   */
  async get<T = any>(endpoint: string, params?: Record<string, any>, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response: AxiosResponse = await axiosInstance.get(endpoint, {
        params,
        ...config,
      });
      
      return {
        success: true,
        data: response.data,
        statusCode: response.status,
      };
    } catch (error: any) {
      return this.handleApiError<T>(error);
    }
  }

  /**
   * Make a POST request to the specified endpoint
   * 
   * @param endpoint - The API endpoint to call
   * @param data - The data to send in the request body
   * @param config - Additional axios config
   * @returns Promise with the response data
   */
  async post<T = any>(endpoint: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response: AxiosResponse = await axiosInstance.post(endpoint, data, config);
      
      return {
        success: true,
        data: response.data,
        statusCode: response.status,
      };
    } catch (error: any) {
      return this.handleApiError<T>(error);
    }
  }

  /**
   * Make a PUT request to the specified endpoint
   * 
   * @param endpoint - The API endpoint to call
   * @param data - The data to send in the request body
   * @param config - Additional axios config
   * @returns Promise with the response data
   */
  async put<T = any>(endpoint: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response: AxiosResponse = await axiosInstance.put(endpoint, data, config);
      
      return {
        success: true,
        data: response.data,
        statusCode: response.status,
      };
    } catch (error: any) {
      return this.handleApiError<T>(error);
    }
  }

  /**
   * Make a PATCH request to the specified endpoint
   * 
   * @param endpoint - The API endpoint to call
   * @param data - The data to send in the request body
   * @param config - Additional axios config
   * @returns Promise with the response data
   */
  async patch<T = any>(endpoint: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response: AxiosResponse = await axiosInstance.patch(endpoint, data, config);
      
      return {
        success: true,
        data: response.data,
        statusCode: response.status,
      };
    } catch (error: any) {
      return this.handleApiError<T>(error);
    }
  }

  /**
   * Make a DELETE request to the specified endpoint
   * 
   * @param endpoint - The API endpoint to call
   * @param config - Additional axios config
   * @returns Promise with the response data
   */
  async delete<T = any>(endpoint: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response: AxiosResponse = await axiosInstance.delete(endpoint, config);
      
      return {
        success: true,
        data: response.data,
        statusCode: response.status,
      };
    } catch (error: any) {
      return this.handleApiError<T>(error);
    }
  }

  /**
   * Handle API errors and standardize the error response format
   * 
   * @param error - The error object from axios
   * @returns Standardized error response
   */
  private handleApiError<T = any>(error: any): ApiResponse<T> {
    const errorResponse: ApiResponse<T> = {
      success: false,
      error: {
        code: 'UNKNOWN_ERROR',
        message: 'An unexpected error occurred',
        endpoint: error.config?.url || 'unknown',
        method: error.config?.method?.toUpperCase() || 'UNKNOWN',
      },
      statusCode: 500,
    };

    if (error.response) {
      // Server responded with an error status code
      const { status, data, statusText } = error.response;
      errorResponse.statusCode = status;
      
      // Extract error message from various possible response formats
      const errorMessage = 
        data?.message || 
        data?.error?.message || 
        data?.error || 
        statusText || 
        `Error ${status}`;
      
      errorResponse.error = {
        code: `ERROR_${status}`,
        message: errorMessage,
        details: data,
        endpoint: error.config?.url,
        method: error.config?.method?.toUpperCase(),
      };
      
      // Console log the detailed error
      logger.group(`🔴 API Error [${status}]`, false, () => {
        logger.error(`${error.config?.method?.toUpperCase() || 'REQUEST'} ${error.config?.url} failed with status ${status}`, null);
        logger.error('Error message:', errorMessage);
        logger.debug('Response data:', data);
        logger.debug('Request details:', {
          url: error.config?.url,
          method: error.config?.method,
          headers: error.config?.headers,
          data: error.config?.data
        });
      });
      
    } else if (error.request) {
      // Request was made but no response received (network error)
      errorResponse.error = {
        code: 'NETWORK_ERROR',
        message: 'Network error, no response received from server',
        details: { 
          request: error.request,
          requestUrl: error.config?.url,
          requestMethod: error.config?.method
        },
        endpoint: error.config?.url,
        method: error.config?.method?.toUpperCase(),
      };
      
      // Console log the network error
      logger.group('🔴 API Network Error', false, () => {
        logger.error(`${error.config?.method?.toUpperCase() || 'REQUEST'} ${error.config?.url} failed - No response received`, null);
        logger.error('Error:', error.message);
        logger.debug('Request details:', {
          url: error.config?.url,
          method: error.config?.method,
          headers: error.config?.headers,
          data: error.config?.data
        });
      });
      
    } else {
      // Something happened in setting up the request
      errorResponse.error = {
        code: 'REQUEST_SETUP_ERROR',
        message: error.message || 'Error setting up the request',
        endpoint: error.config?.url,
        method: error.config?.method?.toUpperCase(),
      };
      
      // Console log the setup error
      logger.group('🔴 API Request Setup Error', false, () => {
        logger.error('Failed to setup API request', error.message);
        if (error.config) {
          logger.debug('Request configuration:', error.config);
        }
        logger.debug('Error stack:', error.stack);
      });
    }

    return errorResponse;
  }

  /**
   * Upload a file to the specified endpoint
   * 
   * @param endpoint - The API endpoint to upload to
   * @param file - The file to upload
   * @param fieldName - The field name for the file in the form data
   * @param additionalData - Any additional data to include in the form
   * @param config - Additional axios config
   * @returns Promise with the response data
   */
  async uploadFile<T = any>(
    endpoint: string,
    file: any,
    fieldName: string = 'file',
    additionalData?: Record<string, any>,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    try {
      const formData = new FormData();
      formData.append(fieldName, file);

      // Add any additional data to the form
      if (additionalData) {
        Object.entries(additionalData).forEach(([key, value]) => {
          formData.append(key, value);
        });
      }

      const response: AxiosResponse = await axiosInstance.post(endpoint, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        ...config,
      });

      return {
        success: true,
        data: response.data,
        statusCode: response.status,
      };
    } catch (error: any) {
      return this.handleApiError<T>(error);
    }
  }

  /**
   * Download a file from the specified endpoint
   * 
   * @param endpoint - The API endpoint to download from
   * @param params - Query parameters
   * @param config - Additional axios config
   * @returns Promise with the response data including a blob
   */
  async downloadFile<T = Blob>(
    endpoint: string, 
    params?: Record<string, any>,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    try {
      const response: AxiosResponse = await axiosInstance.get(endpoint, {
        params,
        responseType: 'blob',
        ...config,
      });

      return {
        success: true,
        data: response.data,
        statusCode: response.status,
      };
    } catch (error: any) {
      return this.handleApiError<T>(error);
    }
  }

  /**
   * Make a request with custom configuration
   * 
   * @param config - Complete axios request config
   * @returns Promise with the response data
   */
  async request<T = any>(config: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response: AxiosResponse = await axiosInstance.request(config);
      
      return {
        success: true,
        data: response.data,
        statusCode: response.status,
      };
    } catch (error: any) {
      return this.handleApiError<T>(error);
    }
  }
}

// Export a singleton instance
export const apiClient = new ApiClient();

// Default export for direct import
export default apiClient;