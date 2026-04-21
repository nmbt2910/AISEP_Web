import { apiClient } from './apiClient';

// Status mapping for deals
const STATUS_MAP = {
  0: { label: 'Pending', labelVi: 'Chờ xác nhận', color: '#f59e0b', value: 0 },
  1: { label: 'Confirmed', labelVi: 'Đã xác nhận', color: '#10b981', value: 1 },
  2: { label: 'Waiting_For_Startup_Signature', labelVi: 'Chờ ký từ Startup', color: '#f97316', value: 2 },
  3: { label: 'Contract_Signed', labelVi: 'Đã ký kết', color: '#667eea', value: 3 },
  4: { label: 'Minted_NFT', labelVi: 'Đã mint NFT', color: '#8b5cf6', value: 4 },
  5: { label: 'Rejected', labelVi: 'Bị từ chối', color: '#ef4444', value: 5 },
  6: { label: 'Failed', labelVi: 'Thất bại', color: '#dc2626', value: 6 }
};

// String to numeric status mapping
const STRING_STATUS_MAP = {
  'Pending': 0,
  'Confirmed': 1,
  'Waiting_For_Startup_Signature': 2,
  'Contract_Signed': 3,
  'Minted_NFT': 4,
  'Rejected': 5,
  'Failed': 6
};

const dealsService = {
  /**
   * Create a new investment deal
   * @param {number} projectId - The ID of the project to invest in
   * @returns {Promise} - API response with deal details
   */
  createDeal: async (projectId) => {
    try {
      console.log('[dealsService] POST /api/Deals with projectId:', projectId);
      const response = await apiClient.post('/api/Deals', {
        projectId: projectId,
      });
      console.log('[dealsService] POST /api/Deals - Response received:', {
        success: response?.success,
        dealId: response?.data?.dealId,
        status: response?.data?.status
      });
      return response;
    } catch (error) {
      console.error('[dealsService] POST /api/Deals - Error:', {
        status: error.response?.status,
        message: error.message,
        errorData: error.response?.data
      });
      throw error;
    }
  },

  /**
   * Get all deals for current investor
   * @param {object} params - Query params (pageNumber, pageSize, status, etc.)
   * @returns {Promise} - API response with deals list
   */
  getInvestorDeals: async (params = {}) => {
    try {
      // Default pageSize to 100 to fetch more deals at once (pagination)
      const queryParams = { pageSize: 100, ...params };
      const queryString = new URLSearchParams(queryParams).toString();
      const url = queryString ? `/api/Deals?${queryString}` : '/api/Deals';
      
      console.log('[dealsService] GET /api/Deals - Starting request with params:', queryParams);
      const response = await apiClient.get(url);
      console.log('[dealsService] GET /api/Deals - Response:', {
        success: response?.success,
        statusCode: response?.statusCode,
        dataLength: Array.isArray(response?.data) ? response.data.length : response?.data?.items?.length || 0
      });
      return response;
    } catch (error) {
      console.error('[dealsService] GET /api/Deals - Error:', {
        status: error.response?.status,
        message: error.message,
        errorResponse: error.response?.data,
        errorMessage: error.response?.data?.message
      });
      throw error;
    }
  },

  /**
   * Get all signed deals (for staff/admin)
   * @param {object} params - Query params (pageNumber, pageSize, etc.)
   * @returns {Promise} - API response with all deals (will be filtered client-side for Contract_Signed)
   */
  getAllSignedDeals: async (params = {}) => {
    try {
      // Default pageSize to 100 to fetch all deals without status filter
      const queryParams = { pageSize: 100, ...params };
      const queryString = new URLSearchParams(queryParams).toString();
      const url = `/api/Deals?${queryString}`;
      
      console.log('[dealsService] GET /api/Deals - Fetching all deals with params:', queryParams);
      const response = await apiClient.get(url);
      console.log('[dealsService] GET /api/Deals - Response:', {
        success: response?.success,
        statusCode: response?.statusCode,
        dataLength: Array.isArray(response?.data) ? response.data.length : response?.data?.items?.length || 0
      });
      return response;
    } catch (error) {
      console.error('[dealsService] GET /api/Deals - Error:', {
        status: error.response?.status,
        message: error.message,
        errorResponse: error.response?.data
      });
      throw error;
    }
  },

  /**
   * Get deal details by ID
   * @param {number} dealId - The ID of the deal
   * @returns {Promise} - API response with deal details
   */
  getDealById: async (dealId) => {
    try {
      const response = await apiClient.get(`/api/Deals/${dealId}`);
      return response;
    } catch (error) {
      console.error('Error fetching deal details:', error);
      throw error;
    }
  },

  /**
   * Get investment contract status
   * @param {number} dealId - The ID of the deal
   * @returns {Promise} - API response with contract status
   */
  getContractStatus: async (dealId) => {
    try {
      console.log(`[dealsService] GET /api/Deals/${dealId}/contract-status`);
      const response = await apiClient.get(`/api/Deals/${dealId}/contract-status`);
      console.log(`[dealsService] Status for dealId ${dealId}:`, response?.data?.status);
      return response;
    } catch (error) {
      console.error(`[dealsService] GET /api/Deals/${dealId}/contract-status - Error:`, {
        status: error.response?.status,
        message: error.message,
        dealId: dealId
      });
      throw error;
    }
  },

  /**
   * Get status display info
   * @param {number|string} statusValue - The status value (numeric 0-4 or string like "Pending")
   * @returns {Object} - Status display info {label, labelVi, color, value}
   */
  getStatusInfo: (statusValue) => {
    // Convert string status to numeric if needed
    let numericStatus = statusValue;
    if (typeof statusValue === 'string') {
      numericStatus = STRING_STATUS_MAP[statusValue] !== undefined ? STRING_STATUS_MAP[statusValue] : 0;
    } else {
      numericStatus = typeof statusValue === 'number' ? statusValue : 0;
    }
    
    return STATUS_MAP[numericStatus] || STATUS_MAP[0]; // Default to Pending if invalid
  },

  /**
   * Get all available statuses
   * @returns {Array} - Array of all status options
   */
  getAllStatuses: () => {
    return Object.values(STATUS_MAP);
  },

  /**
   * Respond to a deal (approve or reject) - For startups
   * @param {number} dealId - The ID of the deal
   * @param {boolean} isAccepted - Whether to accept the deal
   * @param {string} reason - Optional rejection reason
   * @returns {Promise} - API response
   */
  respondToDeal: async (dealId, isAccepted, reason = '') => {
    try {
      const payload = {
        isAccepted: isAccepted,
        reason: reason || ''
      };
      console.log(`[dealsService] PATCH /api/Deals/${dealId}/respond`, payload);
      const response = await apiClient.patch(`/api/Deals/${dealId}/respond`, {
        isAccepted: payload.isAccepted,
        reason: payload.reason
      });
      console.log(`[dealsService] PATCH /api/Deals/${dealId}/respond - Response:`, {
        success: response?.success,
        dealId: dealId,
        isAccepted: isAccepted,
        reasonLength: payload.reason.length
      });
      return response;
    } catch (error) {
      console.error(`[dealsService] PATCH /api/Deals/${dealId}/respond - Error:`, {
        status: error.response?.status,
        message: error.message,
        dealId: dealId,
        errorData: error.response?.data
      });
      throw error;
    }
  },

  /**
   * Get deals for startup (pending to be responded)
   * @returns {Promise} - API response with deals list
   */
  getStartupDeals: async () => {
    try {
      console.log('[dealsService] GET /api/Deals - For Startup');
      const response = await apiClient.get('/api/Deals');
      // Startup sees all deals they need to respond to
      return response;
    } catch (error) {
      console.error('[dealsService] GET /api/Deals - Error:', error);
      throw error;
    }
  },

  /**
   * Get contract preview (HTML template)
   * @param {number} dealId - The ID of the deal
   * @returns {Promise} - API response with HTML contract template
   */
  getContractPreview: async (dealId) => {
    try {
      console.log(`[dealsService] GET /api/Deals/${dealId}/contract-preview`);
      const response = await apiClient.get(`/api/Deals/${dealId}/contract-preview`);
      console.log(`[dealsService] Contract preview for dealId ${dealId} - Success:`, response?.success);
      return response;
    } catch (error) {
      console.error(`[dealsService] GET /api/Deals/${dealId}/contract-preview - Error:`, {
        status: error.response?.status,
        message: error.message,
        dealId: dealId
      });
      throw error;
    }
  },

  /**
   * Sign a contract (Investor signing)
   * @param {number} dealId - The ID of the deal
   * @param {object} signData - Contract signing data
   * @param {number} signData.finalAmount - Final investment amount
   * @param {number} signData.finalEquityPercentage - Final equity percentage
   * @param {string} signData.additionalTerms - Additional terms
   * @param {string} signData.signatureBase64 - Base64 encoded signature
   * @returns {Promise} - API response
   */
  signContract: async (dealId, signData = {}) => {
    try {
      const payload = {
        finalAmount: signData.finalAmount || 0,
        finalEquityPercentage: signData.finalEquityPercentage || 0,
        additionalTerms: signData.additionalTerms || '',
        signatureBase64: signData.signatureBase64 || ''
      };
      console.log(`[dealsService] POST /api/Deals/${dealId}/investor-sign`, payload);
      const response = await apiClient.post(`/api/Deals/${dealId}/investor-sign`, payload);
      console.log(`[dealsService] Contract signed for dealId ${dealId} - Success:`, response?.success);
      return response;
    } catch (error) {
      console.error(`[dealsService] POST /api/Deals/${dealId}/investor-sign - Error:`, {
        status: error.response?.status,
        message: error.message,
        dealId: dealId
      });
      throw error;
    }
  },

  /**
   * Sign a contract (Startup signing)
   * @param {number} dealId - The ID of the deal
   * @param {object} signData - Contract signing data
   * @param {number} signData.finalAmount - Final investment amount
   * @param {number} signData.finalEquityPercentage - Final equity percentage
   * @param {string} signData.additionalTerms - Additional terms
   * @param {string} signData.signatureBase64 - Base64 encoded signature
   * @returns {Promise} - API response
   */
  signContractStartup: async (dealId, signData = {}) => {
    try {
      const payload = {
        finalAmount: signData.finalAmount || 0,
        finalEquityPercentage: signData.finalEquityPercentage || 0,
        additionalTerms: signData.additionalTerms || '',
        signatureBase64: signData.signatureBase64 || ''
      };
      console.log(`[dealsService] POST /api/Deals/${dealId}/startup-sign`, payload);
      const response = await apiClient.post(`/api/Deals/${dealId}/startup-sign`, payload);
      console.log(`[dealsService] Contract signed by startup for dealId ${dealId} - Success:`, response?.success);
      return response;
    } catch (error) {
      console.error(`[dealsService] POST /api/Deals/${dealId}/startup-sign - Error:`, {
        status: error.response?.status,
        message: error.message,
        dealId: dealId
      });
      throw error;
    }
  },

  /**
   * Reject a contract by startup after investor signed
   * @param {number} dealId - The ID of the deal
   * @param {string} reason - Rejection reason
   * @returns {Promise} - API response
   */
  rejectContractByStartup: async (dealId, reason) => {
    try {
      const payload = {
        reason: reason || ''
      };
      console.log(`[dealsService] PATCH /api/Deals/${dealId}/startup-reject`, payload);
      const response = await apiClient.patch(`/api/Deals/${dealId}/startup-reject`, payload);
      console.log(`[dealsService] Startup rejected contract for dealId ${dealId} - Success:`, response?.success);
      return response;
    } catch (error) {
      console.error(`[dealsService] PATCH /api/Deals/${dealId}/startup-reject - Error:`, {
        status: error.response?.status,
        message: error.message,
        dealId
      });
      throw error;
    }
  },
};

export default dealsService;
