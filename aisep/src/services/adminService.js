import { apiClient } from './apiClient';

const adminService = {
  /**
   * Get admin transactions
   * GET /api/admin/transactions
   * @param {object} params - page/pageSize/filters
   * @returns {Promise<any>}
   */
  getTransactions: async (params = {}) => {
    const queryParams = { page: 1, pageSize: 10, ...params };
    const response = await apiClient.get('/api/admin/transactions', { params: queryParams });
    return response;
  },

  /**
   * Get admin users
   * GET /api/admin/users
   * @param {object} params - page/pageSize/filters/sorts
   * @returns {Promise<any>}
   */
  getUsers: async (params = {}) => {
    const queryParams = { page: 1, pageSize: 1000, ...params };
    const response = await apiClient.get('/api/admin/users', { params: queryParams });
    return response;
  },

  /**
   * Create staff
   * POST /api/admin/create-staff
   * @param {object} staffData - userName, fullName, email, phoneNumber, password, confirmPassword, status, isPremium, dateOfBirth
   * @returns {Promise<any>}
   */
  createStaff: async (staffData = {}) => {
    const response = await apiClient.post('/api/admin/create-staff', staffData);
    return response;
  }
};

export default adminService;
