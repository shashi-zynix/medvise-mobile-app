import apiClient, { ApiResponse } from './apiClient';
import { AUTH } from '../utils/literals/apiEndpointsliterals';

// Define types for the API response
interface EmrSystemDetails {
  id: number;
  emr_name: string;
  emr_version: string;
  emr_verbose_name: string;
  emr_code: string;
}

interface Settings {
  [key: string]: string;
}

interface User {
  user_id: number;
  practitioner_id: number;
  practitioner_role: string;
  first_name: string;
  last_name: string;
  timezone: string;
  language: string;
  has_accepted_terms: boolean;
  settings: Settings;
  is_emr_linked: boolean;
  emr_system_details: EmrSystemDetails;
  speciality: string;
  email: string;
  license_number: string;
}

interface LoginResponse extends User {
  token?: string;
}

interface LoginRequest {
  email: string;
  password: string;
}

/**
 * Authentication service to handle all auth-related API calls
 */
class AuthService {
  /**
   * Authenticate user and get token
   * @param email - User email
   * @param password - User password
   * @returns Promise with login response containing user data
   */
  async login(email: string, password: string): Promise<ApiResponse<LoginResponse>> {
    // Create a specific configuration for login request to match Postman format
    const config = {
      headers: {
        'accept': 'application/json, text/plain, */*',
        'content-type': 'application/json'
      },
      withCredentials: true
    };
    
    const response = await apiClient.post<any>(AUTH.LOGIN, { email, password }, config);
    
    if (response.success && response.data) {
      // The API response data already contains the user information
      return {
        success: true,
        data: {
          ...response.data,
        },
        statusCode: response.statusCode,
      };
    }
    
    // If there was an error, pass it through
    return response;
  }

  /**
   * Register a new user
   * @param userData - User registration data
   * @returns Promise with registration response
   */
  async register(userData: { email: string; password: string; name: string }): Promise<ApiResponse<LoginResponse>> {
    return apiClient.post<LoginResponse>(AUTH.REGISTER, userData);
  }

  /**
   * Request password reset
   * @param email - User email
   * @returns Promise with response
   */
  async forgotPassword(email: string): Promise<ApiResponse> {
    return apiClient.post(AUTH.FORGOT_PASSWORD, { email });
  }

  /**
   * Reset password with token
   * @param token - Reset token
   * @param newPassword - New password
   * @returns Promise with response
   */
  async resetPassword(token: string, newPassword: string): Promise<ApiResponse> {
    return apiClient.post(AUTH.RESET_PASSWORD, { token, password: newPassword });
  }

  /**
   * Logout user (invalidate token on the server)
   * @returns Promise with response
   */
  async logout(): Promise<ApiResponse> {
    return apiClient.post(AUTH.LOGOUT);
  }

  /**
   * Get current authenticated user profile
   * @returns Promise with user data
   */
  async getCurrentUser(): Promise<ApiResponse<User>> {
    return apiClient.get<User>(AUTH.CURRENT_USER);
  }
}

// Export singleton instance
export const authService = new AuthService();

// Default export
export default authService;