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
  }
};

export default adminService;
