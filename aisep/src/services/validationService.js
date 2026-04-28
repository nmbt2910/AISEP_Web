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
            regex: rule.customRegexPattern || rule.regexPattern,
            minValue: rule.minValue,
            maxValue: rule.maxValue,
            allowedFileTypes: rule.allowedFileTypes,
            maxFileSize: rule.maxFileSizeBytes || rule.maxFileSize,
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
  },

  /**
   * Validate a single field value against its rule
   * @param {any} value - The value to validate
   * @param {Object} rule - The rule object from getFormRules
   * @returns {string|null} Error message if invalid, null if valid
   */
  validateField: (value, rule) => {
    if (!rule) return null;
    
    const val = String(value || '').trim();

    // Required check
    if (rule.required && !val) {
      return rule.requiredMessage || `${rule.label || 'Trường này'} là bắt buộc`;
    }

    if (!val) return null; // If not required and empty, skip other checks

    // Min length check
    if (rule.minLength && val.length < rule.minLength) {
      return rule.minLengthMessage || `Tối thiểu ${rule.minLength} ký tự`;
    }

    // Max length check
    if (rule.maxLength && val.length > rule.maxLength) {
      return rule.maxLengthMessage || `Tối đa ${rule.maxLength} ký tự`;
    }
    
    // Min value check
    if (rule.minValue !== undefined && rule.minValue !== null) {
        const numVal = Number(val);
        if (isNaN(numVal) || numVal < rule.minValue) {
            return `Giá trị tối thiểu là ${rule.minValue}`;
        }
    }
    
    // Max value check
    if (rule.maxValue !== undefined && rule.maxValue !== null) {
        const numVal = Number(val);
        if (isNaN(numVal) || numVal > rule.maxValue) {
            return `Giá trị tối đa là ${rule.maxValue}`;
        }
    }

    // Regex check
    if (rule.regex) {
      try {
        const regex = new RegExp(rule.regex, 'u');
        if (!regex.test(val)) {
          return rule.regexMessage || 'Định dạng không hợp lệ';
        }
      } catch(e) {
          console.error("Invalid regex in validation rule", e);
      }
    }

    return null;
  },

  /**
   * Validate an entire form against rules
   * @param {Object} formData - Form data object
   * @param {Object} rules - Rules object from getFormRules
   * @param {Object} fieldMapping - Map of formData keys to rule keys
   * @returns {Object} { isValid: boolean, errors: Object }
   */
  validateForm: (formData, rules, fieldMapping) => {
    const errors = {};
    if (!rules) return { isValid: true, errors };

    Object.keys(fieldMapping).forEach(formKey => {
      const ruleKey = fieldMapping[formKey]?.toLowerCase();
      const rule = rules[ruleKey];
      
      if (rule) {
        const error = validationService.validateField(formData[formKey], rule);
        if (error) {
          errors[formKey] = error;
        }
      }
    });

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  },
  
  /**
   * Validate a file against rules
   * @param {File} file - File object
   * @param {Object} rule - Rule object
   * @returns {string|null} Error message or null
   */
  validateFile: (file, rule) => {
      if (!rule) return null;
      if (!file) {
          if (rule.required) return rule.requiredMessage || 'Bắt buộc tải lên tệp';
          return null;
      }
      
      if (rule.maxFileSize && file.size > rule.maxFileSize) {
          const mbSize = (rule.maxFileSize / (1024 * 1024)).toFixed(1);
          return `Kích thước tệp không được vượt quá ${mbSize}MB`;
      }
      
      if (rule.allowedFileTypes) {
          try {
              const types = typeof rule.allowedFileTypes === 'string' 
                ? JSON.parse(rule.allowedFileTypes) 
                : rule.allowedFileTypes;
              
              if (Array.isArray(types) && types.length > 0) {
                  if (!types.includes(file.type)) {
                      return 'Định dạng tệp không được hỗ trợ';
                  }
              }
          } catch(e) {
              console.error("Invalid allowedFileTypes format", e);
          }
      }
      return null;
  }
};

export default validationService;
