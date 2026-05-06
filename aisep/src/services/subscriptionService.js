import { apiClient } from './apiClient';

/**
 * Subscription Service
 * Handles user and global subscription data.
 */
const subscriptionService = {
  /**
   * Lấy gói đăng ký hiện tại của người dùng.
   * GET /api/Subscriptions/me
   * @returns {Promise<Object>} SubscriptionResponseDto
   */
  getMySubscription: async () => {
    try {
      const response = await apiClient.get('/api/Subscriptions/me');
      return (response && typeof response === 'object' && 'data' in response) ? response.data : response;
    } catch (error) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },

  /**
   * Lấy danh sách toàn bộ đăng ký trong hệ thống (Staff/Admin).
   * GET /api/Subscriptions
   * @param {Object} sieveModel { page, pageSize, filters, sorts }
   * @returns {Promise<Object>} PagedResult<SubscriptionResponseDto>
   */
  getAllSubscriptions: async (sieveModel = {}) => {
    const params = new URLSearchParams();
    if (sieveModel.page) params.append('page', sieveModel.page);
    if (sieveModel.pageSize) params.append('pageSize', sieveModel.pageSize);
    if (sieveModel.filters) params.append('filters', sieveModel.filters);
    if (sieveModel.sorts) params.append('sorts', sieveModel.sorts);

    const response = await apiClient.get(`/api/Subscriptions?${params.toString()}`);
    return (response && typeof response === 'object' && 'data' in response) ? response.data : response;
  }
};

export default subscriptionService;
