import { apiClient } from './apiClient';

/**
 * Option Service
 * Fetches and manages industry and stage options.
 */
export const optionService = {
  /**
   * Get all industry options
   * @returns {Promise<Array>}
   */
  getIndustries: async () => {
    try {
      const response = await apiClient.get('/api/industry-options', { params: { pageSize: 100 } });
      const data = response?.data || response;
      const items = Array.isArray(data) ? data : (data.items || data.results || data.data || []);
      // Based on IndustryOptionResponse.cs: Id, Value, IsActive
      return items.map(item => ({
        label: item.value || 'Unknown Industry',
        value: item.id,
        isActive: item.isActive ?? true
      }));
    } catch (error) {
      console.error('Error fetching industries:', error);
      return [];
    }
  },

  /**
   * Get all development stage options
   * @returns {Promise<Array>}
   */
  getStages: async () => {
    try {
      const response = await apiClient.get('/api/stage-options', { params: { pageSize: 100 } });
      const data = response?.data || response;
      const items = Array.isArray(data) ? data : (data.items || data.results || data.data || []);
      // Based on StageOptionResponse.cs: Id, Value, IsActive
      return items.map(item => ({
        label: item.value || 'Unknown Stage',
        value: item.id,
        isActive: item.isActive ?? true
      }));
    } catch (error) {
      console.error('Error fetching stages:', error);
      return [];
    }
  }
};

export default optionService;
