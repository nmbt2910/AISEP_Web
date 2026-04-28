import { apiClient } from './apiClient';

/**
 * Investor Service
 * Interacts with /api/Investor endpoints
 */
const investorService = {
  /**
   * Fetch all investors (optionally with Sieve filters)
   * @param {Object} queryParams - e.g., { page, pageSize, filters }
   * @returns {Promise<Object>} Object containing data.items and pagination info
   */
  getAllInvestors: async (queryParams = {}) => {
    try {
      const response = await apiClient.get('/api/Investor', { params: queryParams });
      
      // Handle the success response where items might be empty
      if (response && response.data) {
        return response.data;
      }
      return { items: [], totalCount: 0 };
    } catch (error) {
       // If 404 is returned because there are no investors, handle gracefully
       if (error?.statusCode === 404 || error?.response?.status === 404) {
          return { items: [], totalCount: 0 };
       }
       console.error('Error fetching all investors:', error);
       throw error;
    }
  },

  /**
   * Fetch investor details by ID
   * @param {number|string} investorId 
   * @returns {Promise<Object>} Investor details
   */
  getInvestorById: async (investorId) => {
    try {
      const response = await apiClient.get(`/api/Investor/${investorId}`);
      if (response && response.data) {
        return response.data;
      }
      return null;
    } catch (error) {
      // If 404, return null cleanly
      if (error?.statusCode === 404 || error?.response?.status === 404) {
         return null;
      }
      console.error(`Error fetching investor ${investorId}:`, error);
      throw error;
    }
  },

  /**
   * Fetch current authenticated investor's profile
   * @returns {Promise<Object>} Investor profile
   */
  getMyProfile: async () => {
    try {
      const response = await apiClient.get('/api/Investor/me');
      if (response) {
        // Handle ApiResponse wrapper: { success, message, data, ... }
        return response?.data?.data ?? response?.data ?? response;
      }
      return null;
    } catch (error) {
      if (error?.statusCode === 404 || error?.response?.status === 404) {
        return null;
      }
      console.error('Error fetching my investor profile:', error);
      throw error;
    }
  },

  updateInvestor: async (investorId, data) => {
    try {
      const isFormData = data instanceof FormData;
      const response = await apiClient.put(`/api/Investor/${investorId}`, data, {
        headers: {
          'Content-Type': isFormData ? 'multipart/form-data' : 'application/json'
        }
      });
      return response;
    } catch (error) {
      console.error(`Error updating investor ${investorId}:`, error);
      throw error;
    }
  },

  /**
   * Create a new investor profile
   * @param {FormData|Object} data 
   * @returns {Promise<Object>} Created investor details
   */
  createInvestor: async (data) => {
    try {
      const isFormData = data instanceof FormData;
      const response = await apiClient.post('/api/Investor', data, {
        headers: {
          'Content-Type': isFormData ? 'multipart/form-data' : 'application/json'
        }
      });
      return response;
    } catch (error) {
      console.error('Error creating investor profile:', error);
      throw error;
    }
  },

  /**
   * Approve a pending investor (Staff only)
   * @param {number|string} investorId 
   * @returns {Promise<Object>} 
   */
  approveInvestor: async (investorId) => {
    try {
      const response = await apiClient.patch(`/api/Investor/${investorId}/approve`);
      return response;
    } catch (error) {
      console.error(`Error approving investor ${investorId}:`, error);
      throw error;
    }
  },

  /**
   * Reject a pending investor (Staff only)
   * @param {number|string} investorId 
   * @param {string} reason 
   * @returns {Promise<Object>} 
   */
  rejectInvestor: async (investorId, reason) => {
    try {
      const response = await apiClient.patch(`/api/Investor/${investorId}/reject`, { reason });
      return response;
    } catch (error) {
      console.error(`Error rejecting investor ${investorId}:`, error);
      throw error;
    }
  }
};

export default investorService;
