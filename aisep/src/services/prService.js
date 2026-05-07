import { apiClient } from './apiClient';

/**
 * PR (Press Release) Service
 * Handles posting press releases for investment deals
 */
const prService = {
  /**
   * Post a new PR for a deal
   * POST /api/PostPRs
   * @param {number} dealId - The deal ID
   * @param {string} title - PR title
   * @param {string} content - PR content/body
   * @returns {Promise<any>} - API response
   */
  postPR: async (dealId, title, content) => {
    try {
      console.log('[prService] POST /api/PostPRs', {
        dealId,
        title,
        contentLength: content?.length || 0
      });

      const payload = {
        dealId: dealId,
        title: title,
        content: content
      };

      const response = await apiClient.post('/api/PostPRs', payload);
      
      console.log('[prService] POST /api/PostPRs - Success:', {
        success: response?.success,
        message: response?.message
      });

      return response;
    } catch (error) {
      console.error('[prService] POST /api/PostPRs - Error:', {
        status: error.response?.status,
        message: error.message,
        errorData: error.response?.data
      });
      throw error;
    }
  },

  /**
   * Get all posted PRs (optional - for viewing PR history)
   * @returns {Promise<any>} - API response with paginated PR list
   */
  getPRs: async (params = { pageSize: 100 }) => {
    try {
      console.log('[prService] GET /api/PostPRs', params);
      const response = await apiClient.get('/api/PostPRs', { params });
      console.log('[prService] GET /api/PostPRs - Response:', response);
      
      // Handle nested response structure
      // axios returns: { data: apiResponse }
      // API returns: { success, data: { items: [...], page, pageSize, totalCount, ... }, ... }
      const apiResponse = response?.data || response;
      console.log('[prService] GET /api/PostPRs - API response:', apiResponse);
      
      return apiResponse;
    } catch (error) {
      console.error('[prService] GET /api/PostPRs - Error:', error);
      throw error;
    }
  },

  /**
   * Get PR by ID
   * @param {number} prId - The PR ID
   * @returns {Promise<any>} - API response with PR detail
   */
  getPRById: async (prId) => {
    try {
      console.log('[prService] GET /api/PostPRs/' + prId);
      const response = await apiClient.get(`/api/PostPRs/${prId}`);
      console.log('[prService] GET /api/PostPRs/' + prId + ' - Success');
      return response?.data || response;
    } catch (error) {
      console.error('[prService] GET /api/PostPRs/' + prId + ' - Error:', error);
      throw error;
    }
  },

  /**
   * Update an existing PR
   * PUT /api/PostPRs/{id}
   * @param {number} prId - The PR ID
   * @param {string} title - Updated PR title
   * @param {string} content - Updated PR content
   * @returns {Promise<any>} - API response
   */
  updatePR: async (prId, title, content) => {
    try {
      console.log('[prService] PUT /api/PostPRs/' + prId, { title, contentLength: content?.length });
      
      const payload = {
        title: title,
        content: content
      };
      
      const response = await apiClient.put(`/api/PostPRs/${prId}`, payload);
      console.log('[prService] PUT /api/PostPRs/' + prId + ' - Success');
      return response?.data || response;
    } catch (error) {
      console.error('[prService] PUT /api/PostPRs/' + prId + ' - Error:', error);
      throw error;
    }
  },

  /**
   * Delete a PR (soft delete)
   * PATCH /api/PostPRs/{id}/delete
   * @param {number} prId - The PR ID
   * @returns {Promise<any>} - API response
   */
  deletePR: async (prId) => {
    try {
      console.log('[prService] PATCH /api/PostPRs/' + prId + '/delete');
      const response = await apiClient.patch(`/api/PostPRs/${prId}/delete`, { isDelete: true });
      console.log('[prService] PATCH /api/PostPRs/' + prId + '/delete - Success');
      return response?.data || response;
    } catch (error) {
      console.error('[prService] PATCH /api/PostPRs/' + prId + '/delete - Error:', error);
      throw error;
    }
  },

  /**
   * Create a new PR (alias for postPR with object parameter)
   * POST /api/PostPRs
   * @param {object} prData - PR data { dealId, title, content }
   * @returns {Promise<any>} - API response
   */
  createPR: async (prData) => {
    return prService.postPR(prData.dealId, prData.title, prData.content);
  },

};

export default prService;
