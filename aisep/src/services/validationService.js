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
            stageOptionIds: rule.stageOptionIds || [],
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
            fieldKey: rule.fieldKey,
            displayName: rule.displayName,
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
   * @param {any} value - The value to validate (can be string, number, array, or comma-separated string)
   * @param {Object} rule - The rule object from getFormRules
   * @param {string|number} developmentStage - The currently selected stage ID
   * @returns {string|null} Error message if invalid, null if valid
   */
  validateField: (value, rule, developmentStage = null) => {
    if (!rule) return null;
    
    // Normalize value for multi-select fields (arrays or comma-separated strings)
    let arrayValue = [];
    if (Array.isArray(value)) {
      arrayValue = [...new Set(value.filter(item => item !== null && item !== undefined && item !== ''))];
    } else if (typeof value === 'string' && value.trim() !== '') {
      // Check if it's potentially a comma-separated list of IDs or labels
      // We only treat it as an array if we are checking counts
      arrayValue = [...new Set(value.split(',').map(s => s.trim()).filter(Boolean))];
    }

    const val = String(value || '').trim();

    // Determine if the field is required based on stage
    let isRequired = rule.required;
    if (developmentStage !== null && developmentStage !== undefined && rule.stageOptionIds && rule.stageOptionIds.length > 0) {
      const stageId = Number(developmentStage);
      const isStageInList = rule.stageOptionIds.some(id => Number(id) === stageId);
      
      if (isStageInList) {
        isRequired = rule.required; // Follow isRequired
      } else {
        isRequired = !rule.required; // Follow inverse of isRequired
      }
    }

    // Required check
    if (isRequired && (!val || (Array.isArray(value) && value.length === 0))) {
      return rule.requiredMessage || `${rule.label || 'Trường này'} là bắt buộc`;
    }

    // Min Count check (for multi-select)
    if (rule.minCount !== undefined && rule.minCount !== null) {
      if (arrayValue.length < rule.minCount) {
        return rule.minCountMessage || `Phải chọn ít nhất ${rule.minCount} lĩnh vực.`;
      }
    }

    // Max Count check (for multi-select)
    if (rule.maxCount !== undefined && rule.maxCount !== null) {
      if (arrayValue.length > rule.maxCount) {
        return rule.maxCountMessage || `Chỉ được chọn tối đa ${rule.maxCount} lĩnh vực.`;
      }
    }

    if (!val && (!Array.isArray(value) || value.length === 0)) return null; // If not required and empty, skip other checks

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
        // Only perform numeric check if the value is actually numeric and not empty
        if (val !== '' && !isNaN(numVal) && numVal < rule.minValue) {
            return `Giá trị tối thiểu là ${rule.minValue}`;
        }
    }
    
    // Max value check
    if (rule.maxValue !== undefined && rule.maxValue !== null) {
        const numVal = Number(val);
        // Only perform numeric check if the value is actually numeric and not empty
        if (val !== '' && !isNaN(numVal) && numVal > rule.maxValue) {
            return `Giá trị tối đa là ${rule.maxValue}`;
        }
    }

    // Regex check
    if (rule.regex && typeof rule.regex === 'string' && rule.regex.trim() !== '' && rule.regex !== 'null') {
      try {
        let pattern = rule.regex;
        // Strip forward slashes if present
        if (pattern.startsWith('/') && pattern.endsWith('/')) {
          pattern = pattern.substring(1, pattern.length - 1);
        }
        
        // Ensure Unicode property escapes like \p{L} work correctly
        const regex = new RegExp(pattern, 'u');
        if (!regex.test(val)) {
          // Attempt to identify specific invalid characters
          let invalidChars = '';
          try {
            // If it's a character set regex like ^[...]*, we can find what's NOT in the set
            if (pattern.startsWith('^[') && pattern.endsWith(']*$')) {
              const inner = pattern.substring(2, pattern.length - 3);
              const forbiddenRegex = new RegExp(`[^${inner}]`, 'gu');
              const matches = val.match(forbiddenRegex);
              if (matches) {
                invalidChars = Array.from(new Set(matches)).join(', ');
              }
            }
          } catch (err) { /* ignore fallback to generic message */ }

          const baseMessage = rule.regexMessage || 'Định dạng không hợp lệ';
          return invalidChars ? `${baseMessage}. Ký tự không hợp lệ: ${invalidChars}` : baseMessage;
        }
      } catch(e) {
          console.error("Invalid regex pattern from backend:", rule.regex, e);
          // If regex is invalid/unsupported, don't block the user
          return null;
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
  validateForm: (formData, rules, fieldMapping, developmentStage = null) => {
    const errors = {};
    if (!rules) return { isValid: true, errors };

    Object.keys(fieldMapping).forEach(formKey => {
      const ruleKey = fieldMapping[formKey]?.toLowerCase();
      const rule = rules[ruleKey];
      
      if (rule) {
        const error = validationService.validateField(formData[formKey], rule, developmentStage);
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
