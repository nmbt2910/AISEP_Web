import React, { useState, useEffect } from 'react';
import { X, AlertCircle, Trash2, Upload, FileText, CheckCircle, Loader2, Info } from 'lucide-react';
import styles from './ProjectSubmissionForm.module.css';
import projectSubmissionService from '../../services/projectSubmissionService';
import { getStageNumericValue } from '../../constants/ProjectStatus';
import CustomSelect from '../common/CustomSelect';
import SuccessModal from '../common/SuccessModal';
import validationService from '../../services/validationService';
import optionService from '../../services/optionService';
import startupProfileService from '../../services/startupProfileService';
import ScorecardRadioGroup from './ScorecardRadioGroup';
import {
  SCORECARD_SECTIONS,
  SCORECARD_BOOLEAN_FIELD,
  SCORECARD_FORM_ENUM_KEYS,
  scorecardFromApiToFormState,
  getProjectScorecardFromProject,
} from '../../constants/projectScorecard';
import { formatIndustryOptionDisplayLabel, formatStageOptionDisplayLabel } from '../../utils/optionDisplayLabels';

const STEP_TITLES = [
  'Thông tin cơ bản',
  'Giải pháp & mô hình kinh doanh',
  'Bảng điểm dự án (Project Scorecard)',
];

/**
 * Get internal numeric value for industry from various formats
 * @param {any} industry - Industry label or value
 * @param {Array} industries - List of industry options
 * @returns {string} - Numeric string value
 */
const getIndustryNumericValue = (industry, industries = []) => {
  if (industry === null || industry === undefined || industry === '') return '';
  
  // If already numeric (as string or number)
  const numeric = parseInt(industry);
  if (!isNaN(numeric)) {
      // Check if it exists in our dynamic list
      const exists = industries.some(i => String(i.value) === String(numeric));
      if (exists) return String(numeric);
  }

  // If label (e.g., "Fintech")
  const found = industries.find(i =>
    i.label.toLowerCase() === String(industry).toLowerCase() ||
    i.label.replace(/_/g, ' ').toLowerCase() === String(industry).toLowerCase() ||
    i.label.replace(/\s+/g, '_').toLowerCase() === String(industry).toLowerCase()
  );
  
  return found ? String(found.value) : String(industry);
};

/**
 * Mapping of backend field keys to Vietnamese labels for localization.
 * If a fieldKey is not found here, it will fallback to the backend-provided displayName or fieldKey.
 */
const FIELD_LABEL_MAP = {
  'projectname': 'Tên dự án',
  'shortdescription': 'Mô tả ngắn',
  'stageoptionid': 'Giai đoạn phát triển',
  'industryoptionids': 'Lĩnh vực',
  'problemstatement': 'Vấn đề cần giải quyết',
  'solutiondescription': 'Mô tả giải pháp',
  'targetcustomers': 'Khách hàng mục tiêu',
  'uniquevalueproposition': 'Giá trị độc đáo (UVP)',
  'businessmodel': 'Mô hình kinh doanh',
  'competitors': 'Đối thủ cạnh tranh',
  'projectimagefile': 'Hình ảnh dự án',
};

/**
 * ProjectSubmissionForm - Form for submitting new startup projects
 * Improved with professional styling and theme support.
 */
export default function ProjectSubmissionForm({ onClose, onSuccess, user, initialData = null, isApproved = false, onRestrictedAction }) {
  const isEdit = !!initialData;
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 3;
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [successProjectId, setSuccessProjectId] = useState(null);

  // Configuration and dynamic validation states
  const [validationRules, setValidationRules] = useState(null);
  const [industries, setIndustries] = useState([]);
  const [stages, setStages] = useState([]);
  const [isConfigLoading, setIsConfigLoading] = useState(true);
  const [configError, setConfigError] = useState('');

  const [formData, setFormData] = useState({
    projectName: '',
    shortDescription: '',
    developmentStage: '',
    industry: '',
    problemStatement: '',
    solutionDescription: '',
    targetCustomers: '',
    uniqueValueProposition: '',
    businessModel: '',
    competitors: '',
    projectImageFile: null,
    ...scorecardFromApiToFormState(null),
  });

  // Fetch dynamic configuration
  const fetchConfig = async () => {
    setIsConfigLoading(true);
    setConfigError('');
    try {
      const formKey = isEdit ? 'project.update' : 'project.create';
      const [rules, indOptions, stageOptions] = await Promise.all([
        validationService.getFormRules(formKey),
        optionService.getIndustries(),
        optionService.getStages()
      ]);

      if (!rules || Object.keys(rules).length === 0) {
        throw new Error(`Không tìm thấy cấu hình xác thực cho ${formKey}.`);
      }

      if (rules && rules.industryoptionids) {
        rules.industryoptionids.minCount = 1;
        rules.industryoptionids.maxCount = 1;
        rules.industryoptionids.minCountMessage = 'Vui lòng chọn lĩnh vực.';
        rules.industryoptionids.maxCountMessage = 'Vui lòng chỉ chọn 1 lĩnh vực.';
      }

      setValidationRules(rules);
      setIndustries(indOptions.filter(i => i.isActive));
      setStages(stageOptions.filter(s => s.isActive));

      // Pre-populate data if editing, now that we have the options
      if (initialData) {
        // Helper to map stage to dynamic value
        const getDynamicStageValue = (stage) => {
          if (stage === null || stage === undefined || stage === '') return '';
          const val = String(stage);
          if (stageOptions.some(s => String(s.value) === val)) return val;
          const found = stageOptions.find(s => 
            s.label.toLowerCase() === val.toLowerCase() || 
            s.value.toString() === val
          );
          return found ? String(found.value) : (getStageNumericValue(stage) || '0');
        };

        const scForm = scorecardFromApiToFormState(getProjectScorecardFromProject(initialData));
        setFormData({
          projectName: initialData.projectName || initialData.name || '',
          shortDescription: initialData.shortDescription || '',
          developmentStage: getDynamicStageValue(initialData.developmentStage),
          industry: getIndustryNumericValue(initialData.industry, indOptions),
          problemStatement: initialData.problemStatement || '',
          solutionDescription: initialData.solutionDescription || '',
          targetCustomers: initialData.targetCustomers || '',
          uniqueValueProposition: initialData.uniqueValueProposition || '',
          businessModel: initialData.businessModel || '',
          competitors: initialData.competitors || '',
          projectImageFile: null,
          ...scForm,
        });
      }
    } catch (err) {
      console.error('Config loading error:', err);
      setConfigError(err.message || 'Lỗi kết nối đến dịch vụ cấu hình.');
    } finally {
      setIsConfigLoading(false);
    }
  };

  // Effect to fetch dynamic configuration
  useEffect(() => {
    fetchConfig();
  }, [initialData]);

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [imagePreview, setImagePreview] = useState(null);

  const formContentRef = React.useRef(null);
  const isFirstRender = React.useRef(true);
  const prevStageRef = React.useRef(formData.developmentStage);
  
  // Reset scroll position to top and clear errors when switching steps
  useEffect(() => {
    if (formContentRef.current) {
      formContentRef.current.scrollTop = 0;
    }
    // Clear validation states for a clean start on the new step
    setErrors({});
    setSubmitError('');
  }, [currentStep]);
  // Reset fields in Step 2 and 3 when Stage changes in Step 1
  useEffect(() => {
    // Only reset if it's NOT the first render, we are on Step 1,
    // and the development stage has actually changed from its previous value.
    if (!isFirstRender.current && currentStep === 1 && prevStageRef.current !== formData.developmentStage) {
      // Only auto-reset for new projects. For existing projects, let the user manually clear if needed.
      if (!isEdit) {
        setFormData(prev => ({
          ...prev,
          industry: '',
          solutionDescription: '',
          targetCustomers: '',
          uniqueValueProposition: '',
          businessModel: '',
          competitors: '',
          ...scorecardFromApiToFormState(null),
        }));
        setErrors({});
      }
    }
    
    // Update the ref to current value
    prevStageRef.current = formData.developmentStage;
    isFirstRender.current = false;
  }, [formData.developmentStage, currentStep, isEdit]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Perform real-time validation on every change
    const error = validateField(name, value);
    setErrors(prev => ({ ...prev, [name]: error }));
  };

  /**
   * Validate a single field against fetched rules
   */
  const validateField = (name, value) => {
    // Skip dynamic validation for scorecard enum fields as they use strings/enums
    // which may conflict with numeric rules from the backend (validated manually in validateStep)
    if (SCORECARD_FORM_ENUM_KEYS.includes(name)) {
      return '';
    }

    if (!validationRules) return '';

    const fieldKey = name.toLowerCase();
    // Map frontend field names to backend rule keys
    const ruleKey = (fieldKey === 'industry' ? 'industryoptionids' : 
                    (fieldKey === 'developmentstage' ? 'stageoptionid' : fieldKey));
                    
    const rule = validationRules[ruleKey];
    if (!rule) return '';

    // Delegate to validationService which already handles StageOptionIds logic
    return validationService.validateField(value, rule, formData.developmentStage);
  };

  const getStep3InlineError = (fieldKey) => {
    const message = errors[fieldKey] || '';
    // Ẩn cảnh báo kỹ thuật từ rule minValue (=1) ở step scorecard, tránh gây rối UX.
    if (currentStep === 3 && typeof message === 'string' && message.toLowerCase().includes('giá trị tối thiểu là 1')) {
      return '';
    }
    return message;
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setErrors(prev => ({ ...prev, projectImageFile: 'Vui lòng chọn tệp hình ảnh' }));
        return;
      }

      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        setErrors(prev => ({ ...prev, projectImageFile: 'Kích thước hình ảnh không quá 5MB' }));
        return;
      }

      setFormData(prev => ({ ...prev, projectImageFile: file }));
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
      
      if (errors.projectImageFile) setErrors(prev => ({ ...prev, projectImageFile: '' }));
    }
  };

  const handleRemoveImage = () => {
    setFormData(prev => ({ ...prev, projectImageFile: null }));
    setImagePreview(null);
  };

  const validateStep = () => {
    if (!validationRules) {
      setSubmitError('Chưa tải xong cấu hình form (validation). Vui lòng đợi vài giây hoặc đóng và mở lại form.');
      return false;
    }
    const newErrors = {};

    // Group fields by step for dynamic validation
    const stepFields = {
      1: ['projectName', 'shortDescription', 'developmentStage', 'industry', 'problemStatement'],
      2: ['solutionDescription', 'targetCustomers', 'uniqueValueProposition', 'businessModel', 'competitors'],
      3: [],
    };

    const currentFields = stepFields[currentStep] || [];

    currentFields.forEach((name) => {
      const error = validateField(name, formData[name]);
      if (error) newErrors[name] = error;
    });

    const requireScore = (keys) => {
      keys.forEach((k) => {
        if (!formData[k]) newErrors[k] = 'Vui lòng chọn';
      });
    };

    if (currentStep === 3) requireScore(SCORECARD_FORM_ENUM_KEYS);

    setErrors(newErrors);
    const ok = Object.keys(newErrors).length === 0;
    if (!ok) {
      setSubmitError('Vui lòng kiểm tra các ô được đánh dấu lỗi (viền đỏ / chữ đỏ) trước khi gửi hoặc chuyển bước.');
    }
    return ok;
  };

  const handleNext = () => {
    setSubmitError('');
    if (validateStep()) {
      setCurrentStep(prev => Math.min(prev + 1, totalSteps));
    }
  };

  const handlePrevious = () => {
    setSubmitError('');
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Defensive check: If Enter is pressed or submit is triggered on an early step, 
    // just treat it as clicking "Next" instead of trying to submit the whole form.
    if (currentStep < totalSteps) {
      handleNext();
      return;
    }

    setSubmitError('');

    if (!validateStep()) return;

    if (!isEdit) {
      // Re-check approval from backend before blocking submit.
      // This prevents stale FE state from falsely showing "chưa được duyệt".
      const isApprovedStatus = (rawStatus) => {
        if (rawStatus === null || rawStatus === undefined) return false;
        if (typeof rawStatus === 'number') return rawStatus === 1;
        const normalized = String(rawStatus).trim().toLowerCase();
        return normalized === '1' || normalized === 'approved';
      };

      let canCreateProject = isApproved;
      try {
        const latestStartupProfile = await startupProfileService.getStartupMe();
        const latestStatus = latestStartupProfile?.approvalStatus ?? latestStartupProfile?.status;
        if (latestStartupProfile) {
          canCreateProject = isApprovedStatus(latestStatus);
        }
      } catch (approvalCheckError) {
        // If approval re-check fails due transient network/API issue,
        // don't hard-block here; let backend be the source of truth on create API.
        console.warn('Startup approval re-check failed before submit:', approvalCheckError);
      }

      if (!canCreateProject) {
        const msg = 'Bạn cần được phê duyệt hồ sơ Startup để tạo dự án mới.';
        setSubmitError(msg);
        onRestrictedAction?.(msg);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const payload = {
        projectName: formData.projectName.trim(),
        shortDescription: formData.shortDescription.trim(),
        stageOptionId: formData.developmentStage ? parseInt(formData.developmentStage, 10) : null,
        problemStatement: formData.problemStatement.trim(),
        solutionDescription: formData.solutionDescription.trim(),
        targetCustomers: formData.targetCustomers.trim(),
        uniqueValueProposition: formData.uniqueValueProposition.trim(),
        businessModel: formData.businessModel.trim(),
        competitors: formData.competitors.trim(),
        projectImageFile: formData.projectImageFile,
        projectScorecard: {
          teamSize: formData.teamSize,
          teamExperience: formData.teamExperience,
          hasTechnicalCofounder: !!formData.hasTechnicalCofounder,
          targetMarketSize: formData.targetMarketSize,
          marketGrowth: formData.marketGrowth,
          productReadiness: formData.productReadiness,
          iPProtection: formData.ipProtection,
          barrierToEntry: formData.barrierToEntry,
          currentTraction: formData.currentTraction,
          runwayMonths: formData.runwayMonths,
        },
      };

      // Swagger: industryOptionId là integer đơn
      if (formData.industry) {
        const parsedIndustry = parseInt(formData.industry, 10);
        if (!Number.isNaN(parsedIndustry)) {
          payload.industryOptionId = parsedIndustry;
        }
      }

      // Handle documents separately if needed by projectSubmissionService
      // Note: projectSubmissionService.submitStartupInfo/updateProject uses FormData internally
      // and appends all keys from projectData. We need to handle the array of files.
      
      const response = isEdit 
        ? await projectSubmissionService.updateProject(initialData.projectId || initialData.id, payload)
        : await projectSubmissionService.submitStartupInfo(payload);
        

      if (response && response.success) {
        const projectId = response.data?.projectId || response.data?.id;
        setSuccessProjectId(projectId);
        setIsSuccessModalOpen(true);
        // Don't call onSuccess yet - wait for user to click "Đến Startup Dashboard" button
      } else {
        setSubmitError(response?.message || 'Lỗi khi gửi dự án. Vui lòng thử lại.');
      }
    } catch (error) {
      console.error('Error submitting project:', error);
      setSubmitError(error?.message || 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng.');
      if (error?.errors) {
        setErrors(prev => ({ ...prev, api: error.errors }));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Success Modal - Show when submission is successful */}
      {isSuccessModalOpen && (
        <SuccessModal
          onClose={onClose}
          type="success"
          title="Dự án được tạo thành công!"
          message="Dự án của bạn đã được tạo thành công. Bạn có thể tải lên các tài liệu bổ sung (Pitch Deck, Business Plan) và nộp dự án bất cứ lúc nào tại mục Quản lý dự án trong Startup Dashboard."
          secondaryBtnText="Đóng"
          onSecondaryClick={onClose}
          primaryBtnText="Đến Startup Dashboard"
          onPrimaryClick={() => {
            setIsSuccessModalOpen(false);
            setTimeout(() => {
              onClose();
              onSuccess?.(formData);
            }, 300);
          }}
        />
      )}

      {/* Form Modal - Show when not submitted successfully yet */}
      {!isSuccessModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            {/* Header */}
            <div className={styles.modalHeader}>
              <div>
                <h2 className={styles.headerTitle}>{isEdit ? 'Cập nhật dự án' : 'Đăng Dự Án'}</h2>
                <p className={styles.headerSubtitle}>
                  Bước {currentStep} / {totalSteps} — {STEP_TITLES[currentStep - 1]}
                </p>
              </div>
              <button onClick={onClose} className={styles.closeButton}>
                <X size={24} />
              </button>
            </div>

        {/* Progress Bar */}
        <div className={styles.progressBarTrack}>
          <div 
            className={styles.progressBarFill} 
            style={{ width: `${(currentStep / totalSteps) * 100}%` }} 
          />
        </div>

        {/* Form Container */}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          {/* Form Content (Scrollable) */}
          <div 
            ref={formContentRef}
            className={styles.formContent} 
            style={{ 
              position: 'relative', 
              minHeight: '350px',
              overflow: (isConfigLoading || configError) ? 'hidden' : 'auto',
              flex: 1
            }}
          >
          {isConfigLoading ? (
            <div style={{ 
              position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', 
              alignItems: 'center', justifyContent: 'center', gap: '16px', zIndex: 10,
              backgroundColor: 'rgba(var(--bg-primary-rgb, 20, 20, 20), 0.8)', backdropFilter: 'blur(8px)'
            }}>
              <div style={{ position: 'relative', width: '60px', height: '60px' }}>
                <Loader2 size={60} className="animate-spin" style={{ color: 'var(--primary-blue)', opacity: 0.2 }} />
                <Loader2 size={60} className="animate-spin" style={{ 
                  color: 'var(--primary-blue)', position: 'absolute', top: 0, left: 0, 
                  clipPath: 'inset(0 0 50% 0)', animationDuration: '1.5s' 
                }} />
              </div>
              <p style={{ fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.5px' }}>ĐANG TẢI CẤU HÌNH...</p>
            </div>
          ) : configError ? (
            <div style={{ 
              position: 'absolute', inset: '12px', display: 'flex', flexDirection: 'column', 
              alignItems: 'center', justifyContent: 'center', gap: '20px', zIndex: 10,
              padding: '32px', textAlign: 'center', borderRadius: '12px',
              background: 'linear-gradient(145deg, rgba(244, 33, 46, 0.05) 0%, rgba(0, 0, 0, 0) 100%)',
              border: '1px solid rgba(244, 33, 46, 0.2)'
            }}>
              <div style={{ 
                width: '64px', height: '64px', borderRadius: '50%', 
                backgroundColor: 'rgba(244, 33, 46, 0.1)', display: 'flex', 
                alignItems: 'center', justifyContent: 'center', marginBottom: '8px'
              }}>
                <AlertCircle size={32} style={{ color: 'var(--error-red, #f4212e)' }} />
              </div>
              <div>
                <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>Không thể khởi tạo biểu mẫu</h3>
                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.5, maxWidth: '280px' }}>
                  {configError}
                </p>
              </div>
              <button 
                onClick={(e) => { e.preventDefault(); fetchConfig(); }} 
                className={styles.secondaryBtn}
                style={{ 
                  flex: 'none', width: 'auto', padding: '10px 24px', 
                  borderRadius: '20px', fontSize: '14px',
                  backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)'
                }}
              >
                Thử lại ngay
              </button>
            </div>
          ) : null}

          <div className={styles.formElement} style={{ 
            opacity: isConfigLoading || configError ? 0.2 : 1, 
            pointerEvents: isConfigLoading || configError ? 'none' : 'auto',
            transition: 'opacity 0.3s ease'
          }}>
            {/* Helper to render label with char count */}
            {(() => {
              const renderFieldHeader = (name, label) => {
                const fieldKey = (name || '').toLowerCase();
                // Map frontend names to potential backend names from DTO
                const ruleKey = (fieldKey === 'industry' ? 'industryoptionids' : 
                                (fieldKey === 'developmentstage' ? 'stageoptionid' : fieldKey));
                
                const rule = validationRules?.[ruleKey];
                             
                const currentLength = String(formData[name] || '').length;
                const maxLength = rule?.maxLength;
                const isOverLimit = maxLength && currentLength > maxLength;

                // Determine dynamic required status using the same logic as validationService
                let isRequired = rule?.required;
                const currentStage = formData.developmentStage;
                if (currentStage !== null && currentStage !== undefined && rule?.stageOptionIds && rule.stageOptionIds.length > 0) {
                  const stageId = Number(currentStage);
                  const isStageInList = rule.stageOptionIds.some(id => Number(id) === stageId);
                  isRequired = isStageInList ? rule.required : !rule.required;
                }

                // Priority: 1. rule.displayName (from BE), 2. Local Map (Vietnamese), 3. hardcoded label, 4. rule.fieldKey
                const ruleLabel = rule?.displayName || FIELD_LABEL_MAP[ruleKey] || label || rule?.fieldKey;

                return (
                  <div className={styles.label}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {ruleLabel} {isRequired && <span className={styles.required}>*</span>}
                    </span>
                    {maxLength ? (
                      <span className={`${styles.charCount} ${isOverLimit ? styles.charCountError : ''}`} style={{ backgroundColor: isOverLimit ? 'rgba(244, 33, 46, 0.15)' : 'var(--bg-secondary)' }}>
                        {currentLength}/{maxLength}
                      </span>
                    ) : (
                      currentLength > 0 && (
                        <span className={styles.charCount} style={{ opacity: 0.8, backgroundColor: 'rgba(255,255,255,0.05)' }}>
                          {currentLength} ký tự
                        </span>
                      )
                    )}
                  </div>
                );
              };

              const renderValidationHint = (name) => {
                const fieldKey = (name || '').toLowerCase();
                const rule = validationRules?.[fieldKey] || 
                             (fieldKey === 'industry' ? validationRules?.['industryoptionids'] : null) ||
                             (fieldKey === 'developmentstage' ? validationRules?.['stageoptionid'] : null);
                             
                if (!rule) return null;
                const currentVal = String(formData[name] || '').trim();
                
                // Show hint if minLength is not met
                if (rule.minLength && currentVal.length > 0 && currentVal.length < rule.minLength) {
                  return (
                    <div className={styles.validationHint}>
                      <AlertCircle size={12} />
                      <span>Cần ít nhất {rule.minLength} ký tự</span>
                    </div>
                  );
                }

                // Show regex hint - REMOVED to avoid duplication with main error message
                
                return null;
              };

              return (
                <>
                  {submitError && (
                    <div className={styles.errorBanner}>
                      <div className={styles.errorHeader}>
                        <AlertCircle size={18} />
                        <span>{submitError}</span>
                      </div>
                      {errors.api && errors.api.length > 0 && (
                        <ul className={styles.errorList}>
                          {errors.api.map((err, idx) => (
                            <li key={idx}>{err}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}

                  {/* Step 1: Basic Project Info */}
                  {currentStep === 1 && (
                    <>
                      <div className={styles.formGroup}>
                        {renderFieldHeader('projectName', 'Tên Dự Án')}
                        <input
                          type="text"
                          name="projectName"
                          value={formData.projectName}
                          onChange={handleInputChange}
                          className={styles.input}
                          placeholder="Ví dụ: AI Smart Assistant"
                        />
                        {renderValidationHint('projectName')}
                        {errors.projectName && <span className={styles.errorText}>{errors.projectName}</span>}
                      </div>

                      <div className={styles.formGroup}>
                        <label className={styles.label}>
                          <span>Hình Ảnh Dự Án <span className={styles.optional}>(Tùy chọn)</span></span>
                        </label>
                        <div style={{ 
                          border: imagePreview ? '1px solid var(--border-color)' : '2px dashed var(--border-color)', 
                          borderRadius: '12px', 
                          padding: imagePreview ? '12px' : '32px 16px',
                          textAlign: 'center',
                          cursor: imagePreview ? 'default' : 'pointer',
                          transition: 'all 0.2s',
                          backgroundColor: imagePreview ? 'var(--bg-secondary)' : 'transparent',
                          position: 'relative'
                        }}
                        onClick={(e) => {
                          if (!imagePreview) {
                            document.getElementById('projectImageInput').click();
                          }
                        }}
                        >
                          {imagePreview ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              <div style={{ 
                                position: 'relative', 
                                width: '100%', 
                                height: '240px', 
                                borderRadius: '8px', 
                                overflow: 'hidden', 
                                backgroundColor: '#000',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.1) inset'
                              }}>
                                <img 
                                  src={imagePreview} 
                                  alt="Preview" 
                                  style={{ 
                                    width: '100%', 
                                    height: '100%', 
                                    objectFit: 'contain'
                                  }} 
                                />
                                <div style={{ 
                                  position: 'absolute', 
                                  top: '12px', 
                                  right: '12px', 
                                  display: 'flex', 
                                  gap: '8px' 
                                }}>
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); document.getElementById('projectImageInput').click(); }}
                                    style={{
                                      display: 'flex', alignItems: 'center', gap: '6px',
                                      padding: '6px 12px', backgroundColor: 'rgba(0,0,0,0.65)', color: 'white',
                                      border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px',
                                      cursor: 'pointer', fontSize: '13px', fontWeight: '600', backdropFilter: 'blur(8px)',
                                      transition: 'background-color 0.2s'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.85)'}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.65)'}
                                  >
                                    <Upload size={14} /> Thay đổi
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); handleRemoveImage(); }}
                                    style={{
                                      display: 'flex', alignItems: 'center', gap: '6px',
                                      padding: '6px 12px', backgroundColor: 'rgba(244, 33, 46, 0.85)', color: 'white',
                                      border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', 
                                      cursor: 'pointer', fontSize: '13px', fontWeight: '600', backdropFilter: 'blur(8px)',
                                      transition: 'background-color 0.2s'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(244, 33, 46, 1)'}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(244, 33, 46, 0.85)'}
                                  >
                                    <Trash2 size={14} /> Xoá
                                  </button>
                                </div>
                              </div>
                              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '500', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                <FileText size={14} /> {formData.projectImageFile?.name || 'project_image_preview'}
                              </div>
                            </div>
                          ) : (
                            <div>
                              <Upload size={32} style={{ margin: '0 auto 12px', color: 'var(--primary-blue)' }} />
                              <p style={{ margin: '0 0 6px', fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>
                                Nhấn để chọn hình ảnh
                              </p>
                              <p style={{ margin: '0', fontSize: '13px', color: 'var(--text-secondary)' }}>
                                PNG, JPG, GIF (Tối đa 5MB)
                              </p>
                            </div>
                          )}
                          <input
                            id="projectImageInput"
                            type="file"
                            accept="image/*"
                            onChange={handleImageChange}
                            style={{ display: 'none' }}
                          />
                        </div>
                        {errors.projectImageFile && <span className={styles.errorText}>{errors.projectImageFile}</span>}
                      </div>

                      <div className={styles.formGroup}>
                        {renderFieldHeader('shortDescription', 'Mô Tả Ngắn')}
                        <textarea
                          name="shortDescription"
                          value={formData.shortDescription}
                          onChange={handleInputChange}
                          className={styles.textarea}
                          placeholder="Mô tả tóm tắt dự án của bạn"
                          rows={2}
                        />
                        {renderValidationHint('shortDescription')}
                        {errors.shortDescription && <span className={styles.errorText}>{errors.shortDescription}</span>}
                      </div>

                      <div className={styles.formGroup}>
                        {renderFieldHeader('developmentStage', 'Giai Đoạn Phát Triển')}
                        <CustomSelect
                          name="developmentStage"
                          value={String(formData.developmentStage)}
                          onChange={handleInputChange}
                          placeholder="Chọn giai đoạn..."
                          options={stages.map((s) => ({
                            label: formatStageOptionDisplayLabel(s.label),
                            value: String(s.value),
                          }))}
                        />
                        {errors.developmentStage && <span className={styles.errorText}>{errors.developmentStage}</span>}
                      </div>

                      <div className={styles.formGroup}>
                        {renderFieldHeader('industry', 'Lĩnh Vực')}
                        <CustomSelect
                          name="industry"
                          value={String(formData.industry)}
                          onChange={handleInputChange}
                          placeholder="Chọn lĩnh vực..."
                          options={industries.map((ind) => ({
                            label: formatIndustryOptionDisplayLabel(ind.label),
                            value: String(ind.value),
                          }))}
                          disabled={!!(formData.industry && !industries.find(opt => String(opt.value) === String(formData.industry)))}
                        />
                        {/* Inactive Industry Warning */}
                        {formData.industry && !industries.find(opt => String(opt.value) === String(formData.industry)) && (
                          <div style={{ 
                            marginTop: '8px', 
                            padding: '6px 10px', 
                            backgroundColor: 'rgba(29, 155, 240, 0.1)', 
                            border: '1px dashed var(--primary-blue)', 
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            color: 'var(--primary-blue)',
                            fontSize: '11px',
                            fontWeight: '600'
                          }}>
                            <CheckCircle size={14} />
                            <span>Lĩnh vực: <strong>{formData.industry}</strong> (Ngừng hỗ trợ)</span>
                          </div>
                        )}
                        {errors.industry && <span className={styles.errorText}>{errors.industry}</span>}
                      </div>

                      <div className={styles.formGroup}>
                        {renderFieldHeader('problemStatement', 'Vấn Đề Cần Giải Quyết')}
                        <textarea
                          name="problemStatement"
                          value={formData.problemStatement}
                          onChange={handleInputChange}
                          className={styles.textarea}
                          placeholder="Vấn đề lớn nhất mà startup của bạn đang giải quyết là gì?"
                          rows={3}
                        />
                        {renderValidationHint('problemStatement')}
                        {errors.problemStatement && <span className={styles.errorText}>{errors.problemStatement}</span>}
                      </div>
                    </>
                  )}

                  {/* Step 2: Giải pháp, khách hàng, UVP, mô hình, đối thủ (mô tả — không gộp scorecard) */}
                  {currentStep === 2 && (
                    <>
                      <div className={styles.formGroup}>
                        {renderFieldHeader('solutionDescription', 'Mô Tả Giải Pháp')}
                        <textarea
                          name="solutionDescription"
                          value={formData.solutionDescription}
                          onChange={handleInputChange}
                          className={styles.textarea}
                          placeholder="Giải pháp của bạn hoạt động như thế nào?"
                          rows={2}
                        />
                        {renderValidationHint('solutionDescription')}
                        {errors.solutionDescription && <span className={styles.errorText}>{errors.solutionDescription}</span>}
                      </div>

                      <div className={styles.formGroup}>
                        {renderFieldHeader('targetCustomers', 'Khách Hàng Mục Tiêu')}
                        <textarea
                          name="targetCustomers"
                          value={formData.targetCustomers}
                          onChange={handleInputChange}
                          className={styles.textarea}
                          placeholder="Ai là người sẽ trả tiền cho giải pháp của bạn?"
                          rows={2}
                        />
                        {renderValidationHint('targetCustomers')}
                        {errors.targetCustomers && <span className={styles.errorText}>{errors.targetCustomers}</span>}
                      </div>

                      <div className={styles.formGroup}>
                        {renderFieldHeader('uniqueValueProposition', 'Giá Trị Độc Đáo (UVP)')}
                        <textarea
                          name="uniqueValueProposition"
                          value={formData.uniqueValueProposition}
                          onChange={handleInputChange}
                          className={styles.textarea}
                          placeholder="Tại sao khách hàng chọn bạn thay vì đối thủ?"
                          rows={2}
                        />
                        {renderValidationHint('uniqueValueProposition')}
                        {errors.uniqueValueProposition && <span className={styles.errorText}>{errors.uniqueValueProposition}</span>}
                      </div>

                      <div className={styles.formGroup}>
                        {renderFieldHeader('businessModel', 'Mô Hình Kinh Doanh')}
                        <textarea
                          name="businessModel"
                          value={formData.businessModel}
                          onChange={handleInputChange}
                          className={styles.textarea}
                          placeholder="Bạn dự định kiếm tiền như thế nào?"
                          rows={2}
                        />
                        {renderValidationHint('businessModel')}
                        {errors.businessModel && <span className={styles.errorText}>{errors.businessModel}</span>}
                      </div>

                      <div className={styles.formGroup}>
                        {renderFieldHeader('competitors', 'Đối thủ cạnh tranh')}
                        <textarea
                          name="competitors"
                          value={formData.competitors}
                          onChange={handleInputChange}
                          className={styles.textarea}
                          placeholder="Liệt kê đối thủ chính và điểm khác biệt (mô tả tự do, bổ sung cho mục rào cản gia nhập ở bước Scorecard)."
                          rows={3}
                        />
                        {renderValidationHint('competitors')}
                        {errors.competitors && <span className={styles.errorText}>{errors.competitors}</span>}
                      </div>

                      <p className={styles.scorecardIntro} style={{ marginTop: '8px' }}>
                        <strong>Bước tiếp theo:</strong> bạn sẽ điền <strong>Bảng điểm dự án (Project Scorecard)</strong> — các lựa chọn dạng checklist/radio kèm mô tả từng mức theo hướng dẫn, đúng thứ tự: Đội ngũ → Thị trường → Sản phẩm → Cạnh tranh → Traction → Gọi vốn (runway).
                      </p>
                    </>
                  )}

                  {/* Step 3: Toàn bộ scorecard theo tài liệu (radio + helper từng lựa chọn; co-founder kỹ thuật: Có/Không) */}
                  {currentStep === 3 && (
                    <>
                      <p className={styles.scorecardIntro}>
                        <strong>Project Scorecard.</strong> Với mỗi tiêu chí, chọn <strong>đúng một</strong> mức. Dòng chữ nhỏ dưới mỗi lựa chọn là mô tả chi tiết (theo spec API/UI).
                        Icon <strong>ℹ️</strong> cạnh tên tiêu chí gợi ý nhanh toàn bộ các mức. Trường <strong>calculatedScore</strong> không hiển thị và không gửi.
                      </p>

                      {SCORECARD_SECTIONS.map((section, secIdx) => (
                        <div key={section.title} className={styles.scorecardSection}>
                          <h3 className={styles.scorecardSectionTitle}>
                            {secIdx + 1}. {section.title}
                          </h3>
                          <p className={styles.scorecardSectionSubtitle}>{section.subtitle}</p>

                          {section.fields.map((field) => (
                            <ScorecardRadioGroup
                              key={field.key}
                              label={field.label}
                              name={field.key}
                              value={formData[field.key]}
                              onChange={handleInputChange}
                              options={field.options}
                              error={getStep3InlineError(field.key)}
                            />
                          ))}

                          {secIdx === 0 && (
                            <div className={styles.boolToggleWrap}>
                              <div className={styles.boolToggleLabel}>
                                <span>{SCORECARD_BOOLEAN_FIELD.label}</span>
                                <span className={styles.boolToggleLabelInfo} title={SCORECARD_BOOLEAN_FIELD.helper}>
                                  <Info size={16} aria-hidden />
                                </span>
                              </div>
                              <div className={styles.boolToggleRow} role="group" aria-label={SCORECARD_BOOLEAN_FIELD.label}>
                                <button
                                  type="button"
                                  aria-pressed={!formData.hasTechnicalCofounder}
                                  className={`${styles.boolToggleBtn} ${!formData.hasTechnicalCofounder ? styles.boolToggleBtnActive : ''}`}
                                  onClick={() => setFormData((prev) => ({ ...prev, hasTechnicalCofounder: false }))}
                                >
                                  Không
                                </button>
                                <button
                                  type="button"
                                  aria-pressed={formData.hasTechnicalCofounder}
                                  className={`${styles.boolToggleBtn} ${formData.hasTechnicalCofounder ? styles.boolToggleBtnActive : ''}`}
                                  onClick={() => setFormData((prev) => ({ ...prev, hasTechnicalCofounder: true }))}
                                >
                                  Có
                                </button>
                              </div>
                              <p className={styles.boolToggleHelper}>{SCORECARD_BOOLEAN_FIELD.helper}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </>
                  )}
                </>
              );
            })()}

          </div>
        </div>

        {/* Footer Actions (Pinned) */}
        <div className={styles.actions}>
          {currentStep > 1 && (
            <button
              type="button"
              onClick={handlePrevious}
              className={styles.secondaryBtn}
            >
              Quay lại
            </button>
          )}

          {currentStep < totalSteps ? (
            <button
              type="button"
              onClick={handleNext}
              className={styles.primaryBtn}
            >
              Tiếp theo
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || isConfigLoading || !!configError}
              className={styles.successBtn}
            >
              {isSubmitting ? '⏳ Đang gửi...' : 'Gửi Dự Án'}
            </button>
          )}
        </div>
      </div>
          </div>
        </div>
      )}
    </>
  );
}
