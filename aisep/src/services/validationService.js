import { apiClient } from './apiClient';

/**
 * Validation Service
 * Fetches dynamic validation rules from the backend for forms.
 * Endpoint: /api/form-validation-rules/{formKey}
 */
export const validationService = {
  /**
   * Get validation rules for a specific form
   * @param {string} formKey - The key of the form (e.g., 'project.create', 'startup.update')
   * @returns {Promise<Object|null>} Object containing validation rules per field
   */
  getFormRules: async (formKey) => {
    try {
      const response = await apiClient.get(`/api/form-validation-rules/${formKey}`);
      const data = response?.data || response;
      
      if (!data) return null;

      // Extract the rules array regardless of wrapping
      const rulesArray = Array.isArray(data) ? data : (data.items || data.data || (Array.isArray(data.rules) ? data.rules : null));
      
      if (rulesArray && Array.isArray(rulesArray)) {
        const rulesMap = {};
        rulesArray.forEach(rule => {
          const key = (rule.fieldKey || '').toLowerCase();
          rulesMap[key] = {
            required: rule.isRequired,
            minLength: rule.minLength,
            maxLength: rule.maxLength,
            regex: rule.regexPattern,
            minValue: rule.minValue,
            maxValue: rule.maxValue,
            allowedFileTypes: rule.allowedFileTypes,
            maxFileSize: rule.maxFileSize,
            // Custom messages if provided by backend, otherwise defaults
            requiredMessage: rule.requiredMessage,
            minLengthMessage: rule.minLengthMessage,
            maxLengthMessage: rule.maxLengthMessage,
            regexMessage: rule.regexMessage,
            label: rule.displayName || rule.fieldKey
          };
        });
        return rulesMap;
      }
      
      return data;
    } catch (error) {
      console.error(`Error fetching validation rules for ${formKey}:`, error);
      return null;
    }
  }
};

export default validationService;
