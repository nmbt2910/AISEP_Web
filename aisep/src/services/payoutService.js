import apiClient from './apiClient';

/**
 * Service for managing Monthly Payouts and Batches
 */
const payoutService = {
  // Batch Endpoints (Staff/Admin)
  
  /**
   * Generate a monthly payout batch
   * @param {Object} data { fromDate: "YYYY-MM-DD", toDate: "YYYY-MM-DD", advisorId?: number }
   */
  async generateBatch(data) {
    const response = await apiClient.post('/api/payout-groups/generate', data);
    return response.data;
  },

  /**
   * Get all payout batches
   */
  async getBatches(params) {
    const response = await apiClient.get('/api/payout-groups', { params });
    return response.data;
  },

  /**
   * Get specific batch by ID
   */
  async getBatchById(id) {
    const response = await apiClient.get(`/api/payout-groups/${id}`);
    return response.data;
  },

  /**
   * Get all items (individual payouts) within a batch
   */
  async getBatchItems(id, params) {
    const response = await apiClient.get(`/api/payout-groups/${id}/items`, { params });
    return response.data;
  },

  // Individual Payout Endpoints (Staff/Admin & Advisor)

  async markPaid(id, data = {}) {
    // Check if we need to send multipart/form-data (for evidence image)
    if (data.evidenceImage instanceof File || data.evidenceImage instanceof Blob) {
      const formData = new FormData();
      if (data.note) formData.append('Note', data.note);
      formData.append('ProofFile', data.evidenceImage);
      
      const response = await apiClient.patch(`/api/payouts/${id}/mark-paid`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return response.data;
    }

    const response = await apiClient.patch(`/api/payouts/${id}/mark-paid`, data);
    return response.data;
  },

  /**
   * Staff/Admin: Reject a payout (works for Pending → Rejected and PendingRecheck → Rejected)
   * @param {number} id 
   * @param {Object} data { reason, note? }
   */
  async rejectPayout(id, data) {
    const response = await apiClient.patch(`/api/payouts/${id}/reject`, data);
    return response.data;
  },

  /**
   * Staff/Admin: Get all individual payouts (filterable by Status via Sieve)
   * e.g. params: { filters: 'Status==Rejected' }
   */
  async getAllPayouts(params) {
    const response = await apiClient.get('/api/payouts', { params });
    return response.data;
  },

  /**
   * Advisor: Get their own payout history
   */
  async getMyPayouts(params) {
    try {
      const response = await apiClient.get('/api/payouts/me', { params });
      return response.data;
    } catch (error) {
      if (error.response?.status === 404 || error.statusCode === 404) return [];
      throw error;
    }
  },

  /**
   * Advisor: Request a retry for a rejected payout (Rejected → PendingRecheck)
   * @param {number} id - The payoutId
   * @param {Object} data { resolutionNote: string } — required, non-empty
   */
  async requestRetry(id, data) {
    const response = await apiClient.patch(`/api/payouts/${id}/request-retry`, data);
    return response.data;
  },
};

export default payoutService;
