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
  },

  /**
   * Get dynamic form validation rules by formKey
   * GET /api/form-validation-rules/{formKey}
   * @param {string} formKey
   * @param {object} params - filters/sorts/page/pageSize
   * @returns {Promise<any>}
   */
  getFormValidationRules: async (formKey, params = {}) => {
    const response = await apiClient.get(`/api/form-validation-rules/${formKey}`, { params });
    return response;
  },

  /**
   * Update a dynamic validation rule by rule id
   * PUT /api/form-validation-rules/{id}
   * @param {number|string} id
   * @param {object} payload
   * @returns {Promise<any>}
   */
  updateFormValidationRule: async (id, payload = {}) => {
    const response = await apiClient.put(`/api/form-validation-rules/${id}`, payload);
    return response;
  },

  /**
   * List industry options (paged, Sieve)
   * GET /api/industry-options
   * @param {object} params - page, pageSize, filters, sorts
   */
  getIndustryOptions: async (params = {}) => {
    const queryParams = { page: 1, pageSize: 10, ...params };
    return await apiClient.get('/api/industry-options', { params: queryParams });
  },

  /**
   * Create industry option
   * POST /api/industry-options
   * @param {{ value: string, isActive: boolean }} payload
   */
  createIndustryOption: async (payload) => {
    return await apiClient.post('/api/industry-options', payload);
  },

  /**
   * Set industry option active (isActive = true)
   * PATCH /api/industry-options/{id}/activate
   */
  activateIndustryOption: async (id) => {
    return await apiClient.patch(`/api/industry-options/${id}/activate`);
  },

  /**
   * Set industry option inactive (isActive = false)
   * PATCH /api/industry-options/{id}/deactivate
   */
  deactivateIndustryOption: async (id) => {
    return await apiClient.patch(`/api/industry-options/${id}/deactivate`);
  },

  /**
   * List stage options (paged, Sieve)
   * GET /api/stage-options
   */
  getStageOptions: async (params = {}) => {
    const queryParams = { page: 1, pageSize: 10, ...params };
    return await apiClient.get('/api/stage-options', { params: queryParams });
  },

  /**
   * Create stage option
   * POST /api/stage-options
   */
  createStageOption: async (payload) => {
    return await apiClient.post('/api/stage-options', payload);
  },

  activateStageOption: async (id) => {
    return await apiClient.patch(`/api/stage-options/${id}/activate`);
  },

  deactivateStageOption: async (id) => {
    return await apiClient.patch(`/api/stage-options/${id}/deactivate`);
  },

  /**
   * Publish new system terms
   * POST /api/admin/terms
   * @param {object} payload - { contentHtml, version }
   */
  publishTerms: async (payload) => {
    return await apiClient.post('/api/admin/terms', payload);
  },

  /**
   * Get system terms history
   * GET /api/admin/terms/history
   * @param {object} params - page/pageSize/filters/sorts
   */
  getTermsHistory: async (params = {}) => {
    return await apiClient.get('/api/admin/terms/history', { params });
  }
};

export default adminService;
