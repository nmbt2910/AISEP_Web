import { apiClient } from './apiClient';

/**
 * Authentication Service
 * Handles user login, registration, and email confirmation
 */
export const authService = {
  /**
   * Register a new user
   * @param {Object} data - { email, password, confirmPassword, fullName, ... }
   * @returns {Promise<any>} Response from the backend
   */
  register: async (data) => {
    // Backend RegisterRequest fields: Name (Username), FullName, Email, Password, ConfirmPassword, Role
    const payload = {
      fullName: data.fullName || '',
      name: data.username || data.name || (data.fullName ? data.fullName.replace(/\s+/g, '').toLowerCase() : ''), 
      email: data.email,
      password: data.password,
      confirmPassword: data.confirmPassword,
      role: data.role ?? 0, // UserRole enum: 0=Startup, 1=Investor, 2=Advisor, 3=Staff, 4=Admin
      isTermsAccepted: data.isTermsAccepted || true,
      termsVersion: data.termsVersion || ''
    };

    const response = await apiClient.post('/api/Auth/register', payload);
    return response;
  },

  /**
   * Log in a user
   * @param {Object} credentials - { email, password }
   * @returns {Promise<any>} The whole ApiResponse containing the token
   */
  login: async (credentials) => {
    const response = await apiClient.post('/api/Auth/login', credentials);
    return response;
  },

  /**
   * Confirm an email address
   * @param {string} userId - ID from the confirmation link
   * @param {string} token - Token from the confirmation link
   * @returns {Promise<any>} 
   */
  confirmEmail: async (userId, token) => {
    const response = await apiClient.get('/api/Auth/confirm-email', {
      params: { userId, token }
    });
    return response;
  },
  
  /**
   * Refresh the access token
   * @param {string} refreshToken 
   * @returns {Promise<any>}
   */
  refreshToken: async (refreshToken) => {
     const response = await apiClient.post('/api/Auth/refresh-token', { refreshToken });
     return response;
  },
  
  /**
   * Logout user from backend
   * @returns {Promise<any>}
   */
  logout: async () => {
    const response = await apiClient.post('/api/Auth/logout');
    return response;
  },

  /**
   * Change password for the currently authenticated user
   * @param {string} currentPassword
   * @param {string} newPassword
   * @param {string} confirmPassword
   * @returns {Promise<any>}
   */
  changePassword: async (currentPassword, newPassword, confirmPassword) => {
    const response = await apiClient.post('/api/Auth/change-password', {
      currentPassword,
      newPassword,
      confirmPassword,
    });
    return response;
  },

  /**
   * Trigger a password reset email
   * @param {string} email
   * @returns {Promise<any>}
   */
  forgotPassword: async (email) => {
    const response = await apiClient.post('/api/Auth/forgot-password', { email });
    return response;
  },

  /**
   * Reset password using the token sent via email
   * @param {string} userId
   * @param {string} token
   * @param {string} newPassword
   * @param {string} confirmPassword
   * @returns {Promise<any>}
   */
  resetPassword: async (userId, token, newPassword, confirmPassword) => {
    const response = await apiClient.post('/api/Auth/reset-password', {
      userId,
      token,
      newPassword,
      confirmPassword,
    });
    return response;
  },
};

export default authService;
