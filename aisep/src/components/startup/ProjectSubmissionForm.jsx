import React, { useState, useEffect } from 'react';
import { X, AlertCircle, Plus, Trash2, Upload, FileText, CheckCircle, Loader2 } from 'lucide-react';
import styles from './ProjectSubmissionForm.module.css';
import projectSubmissionService from '../../services/projectSubmissionService';
import { getStageNumericValue } from '../../constants/ProjectStatus';
import CustomSelect from '../common/CustomSelect';
import SuccessModal from '../common/SuccessModal';
import validationService from '../../services/validationService';
import enumService from '../../services/enumService';

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
    i.label.replace('_', ' ').toLowerCase() === String(industry).toLowerCase() ||
    i.label.replace(' ', '_').toLowerCase() === String(industry).toLowerCase()
  );
  
  return found ? String(found.value) : '';
};

/**
 * ProjectSubmissionForm - Form for submitting new startup projects
 * Improved with professional styling and theme support.
 */
export default function ProjectSubmissionForm({ onClose, onSuccess, user, initialData = null }) {
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
    marketSize: '',
    businessModel: '',
    revenue: '',
    competitors: '',
    teamMembers: [{ name: '', role: '' }],
    keySkills: '',
    teamExperience: '',
    projectImageFile: null,
  });

  // Fetch dynamic configuration
  const fetchConfig = async () => {
    setIsConfigLoading(true);
    setConfigError('');
    try {
      const formKey = isEdit ? 'project.update' : 'project.create';
      const [rules, indOptions, stageOptions] = await Promise.all([
        validationService.getFormRules(formKey),
        enumService.getEnumOptions('Industry'),
        enumService.getEnumOptions('DevelopmentStage')
      ]);

      if (!rules || Object.keys(rules).length === 0) {
        throw new Error(`Không tìm thấy cấu hình xác thực cho ${formKey}.`);
      }

      setValidationRules(rules);
      setIndustries(indOptions);
      setStages(stageOptions);

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

        setFormData({
          projectName: initialData.projectName || initialData.name || '',
          shortDescription: initialData.shortDescription || '',
          developmentStage: getDynamicStageValue(initialData.developmentStage),
          industry: getIndustryNumericValue(initialData.industry, indOptions),
          problemStatement: initialData.problemStatement || '',
          solutionDescription: initialData.solutionDescription || '',
          targetCustomers: initialData.targetCustomers || '',
          uniqueValueProposition: initialData.uniqueValueProposition || '',
          marketSize: initialData.marketSize || '',
          businessModel: initialData.businessModel || '',
          revenue: initialData.revenue || '',
          competitors: initialData.competitors || '',
          teamMembers: initialData.teamMembers 
            ? initialData.teamMembers.split(',').map(m => {
                const parts = m.trim().split('(');
                const name = parts[0];
                const role = parts[1];
                return { 
                  name: name.trim(), 
                  role: role ? role.replace(')', '').trim() : '' 
                };
              })
            : [{ name: '', role: '' }],
          keySkills: initialData.keySkills || '',
          teamExperience: initialData.teamExperience || '',
          projectImageFile: null,
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

  const isFirstRender = React.useRef(true);
  const prevStageRef = React.useRef(formData.developmentStage);
  const isIdea = String(formData.developmentStage) === '0';
  const isMVP = String(formData.developmentStage) === '1';
  const isGrowth = String(formData.developmentStage) === '2';

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
          marketSize: '',
          businessModel: '',
          revenue: '',
          competitors: '',
          teamMembers: [{ name: '', role: '' }],
          keySkills: '',
          teamExperience: '',
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
    
    const fieldKey = name.toLowerCase();
    // Dynamic validation as user inputs
    if (validationRules && validationRules[fieldKey]) {
      const error = validateField(name, value);
      setErrors(prev => ({ ...prev, [name]: error }));
    } else if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  /**
   * Validate a single field against fetched rules
   */
  const validateField = (name, value) => {
    const fieldKey = name.toLowerCase();
    if (!validationRules || !validationRules[fieldKey]) return '';
    
    const rule = validationRules[fieldKey];
    const val = String(value || '').trim();

    // Required check
    if (rule.required && !val) {
      return rule.requiredMessage || `${rule.label || name} là bắt buộc`;
    }

    // Min length check
    if (rule.minLength && val.length < rule.minLength) {
      return rule.minLengthMessage || `${rule.label || name} phải có ít nhất ${rule.minLength} ký tự`;
    }

    // Max length check
    if (rule.maxLength && val.length > rule.maxLength) {
      return rule.maxLengthMessage || `${rule.label || name} không được vượt quá ${rule.maxLength} ký tự`;
    }

    // Regex check
    if (rule.regex && val) {
      const regex = new RegExp(rule.regex);
      if (!regex.test(val)) {
        return rule.regexMessage || `${rule.label || name} không hợp lệ`;
      }
    }

    return '';
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

  const addTeamMember = () => {
    setFormData(prev => ({
      ...prev,
      teamMembers: [...prev.teamMembers, { name: '', role: '' }]
    }));
  };

  const removeTeamMember = (index) => {
    if (formData.teamMembers.length <= 1) return;
    const newMembers = [...formData.teamMembers];
    newMembers.splice(index, 1);
    setFormData(prev => ({ ...prev, teamMembers: newMembers }));
  };

  const handleMemberChange = (index, field, value) => {
    const newMembers = [...formData.teamMembers];
    newMembers[index][field] = value;
    setFormData(prev => ({ ...prev, teamMembers: newMembers }));
  };


  const validateStep = () => {
    if (!validationRules) return false;
    const newErrors = {};

    const checkField = (name) => {
      const error = validateField(name, formData[name]);
      if (error) newErrors[name] = error;
    };

    if (currentStep === 1) {
      checkField('projectName');
      checkField('shortDescription');
      checkField('developmentStage');
      checkField('industry');
      checkField('problemStatement');
    }

    if (currentStep === 2) {
      checkField('solutionDescription');
      checkField('targetCustomers');
      
      // MVP and Growth required fields based on rules (rules can define if they are required based on stage)
      if (isMVP || isGrowth) {
        checkField('uniqueValueProposition');
        checkField('businessModel');
      }

      // Growth specific
      if (isGrowth) {
        if (!formData.revenue || parseInt(formData.revenue) <= 0) {
          newErrors.revenue = validationRules.revenue?.requiredMessage || 'Doanh thu phải lớn hơn 0 cho giai đoạn Tăng trưởng';
        }
        if (!formData.marketSize || parseInt(formData.marketSize) <= 0) {
          newErrors.marketSize = validationRules.marketSize?.requiredMessage || 'Kích thước thị trường phải lớn hơn 0 cho giai đoạn Tăng trưởng';
        }
      }
    }

    if (currentStep === 3) {
      // Team members - at least 1 required for all
      const hasEmptyMembers = formData.teamMembers.some(m => !m.name.trim());
      if (hasEmptyMembers) newErrors.teamMembers = 'Vui lòng nhập tên thành viên';

      // MVP and Growth
      if (isMVP || isGrowth) {
        checkField('competitors');
        checkField('keySkills');
      }

      // Growth specific
      if (isGrowth) {
        checkField('teamExperience');
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep()) {
      setCurrentStep(prev => Math.min(prev + 1, totalSteps));
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');

    if (!validateStep()) return;

    setIsSubmitting(true);
    try {
      const payload = {
        ProjectName: formData.projectName.trim(),
        ShortDescription: formData.shortDescription.trim(),
        StageOptionId: formData.developmentStage ? parseInt(formData.developmentStage) : null,
        IndustryOptionIds: formData.industry ? [parseInt(formData.industry)] : [],
        ProblemStatement: formData.problemStatement.trim(),
        SolutionDescription: formData.solutionDescription.trim(),
        TargetCustomers: formData.targetCustomers.trim(),
        UniqueValueProposition: formData.uniqueValueProposition.trim(),
        MarketSize: formData.marketSize ? parseFloat(formData.marketSize) : null,
        BusinessModel: formData.businessModel.trim(),
        Revenue: formData.revenue ? parseFloat(formData.revenue) : null,
        Competitors: formData.competitors.trim(),
        TeamMembers: formData.teamMembers
          .filter(m => m.name.trim())
          .map(m => m.role.trim() ? `${m.name.trim()} (${m.role.trim()})` : m.name.trim())
          .join(', '),
        KeySkills: formData.keySkills.trim(),
        TeamExperience: formData.teamExperience.trim(),
        ProjectImageFile: formData.projectImageFile,
      };

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
                <p className={styles.headerSubtitle}>Bước {currentStep} của {totalSteps}</p>
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

        {/* Form Content */}
        <div 
          className={styles.formContent} 
          style={{ 
            position: 'relative', 
            minHeight: '350px',
            overflow: (isConfigLoading || configError) ? 'hidden' : 'auto'
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

          <form onSubmit={handleSubmit} className={styles.formElement} style={{ 
            opacity: isConfigLoading || configError ? 0.2 : 1, 
            pointerEvents: isConfigLoading || configError ? 'none' : 'auto',
            transition: 'opacity 0.3s ease'
          }}>
            {/* Helper to render label with char count */}
            {(() => {
              const renderFieldHeader = (name, label, isRequired) => {
                const fieldKey = (name || '').toLowerCase();
                // Map frontend names to potential backend names from DTO
                const rule = validationRules?.[fieldKey] || 
                             (fieldKey === 'industry' ? validationRules?.['industryoptionids'] : null) ||
                             (fieldKey === 'developmentstage' ? validationRules?.['stageoptionid'] : null);
                             
                const currentLength = String(formData[name] || '').length;
                const maxLength = rule?.maxLength;
                const isOverLimit = maxLength && currentLength > maxLength;

                return (
                  <div className={styles.label}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {label} {(isRequired || rule?.required) && <span className={styles.required}>*</span>}
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

                // Show regex hint if it exists and current value doesn't match
                if (rule.regex && currentVal.length > 0) {
                  const regex = new RegExp(rule.regex);
                  if (!regex.test(currentVal)) {
                    return (
                      <div className={styles.validationHint}>
                        <AlertCircle size={12} />
                        <span>{rule.regexMessage || 'Định dạng không hợp lệ'}</span>
                      </div>
                    );
                  }
                }
                
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
                        {renderFieldHeader('projectName', 'Tên Dự Án', true)}
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
                        {renderFieldHeader('shortDescription', 'Mô Tả Ngắn', true)}
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
                        <label className={styles.label}>
                          <span>Giai Đoạn Phát Triển <span className={styles.required}>*</span></span>
                        </label>
                        <CustomSelect
                          name="developmentStage"
                          value={String(formData.developmentStage)}
                          onChange={handleInputChange}
                          placeholder="Chọn giai đoạn..."
                          options={stages.map(s => ({ label: s.label, value: String(s.value) }))}
                        />
                        {errors.developmentStage && <span className={styles.errorText}>{errors.developmentStage}</span>}
                      </div>

                      <div className={styles.formGroup}>
                        <label className={styles.label}>
                          <span>Lĩnh Vực <span className={styles.required}>*</span></span>
                        </label>
                        <CustomSelect
                          name="industry"
                          value={String(formData.industry)}
                          onChange={handleInputChange}
                          placeholder="Chọn lĩnh vực..."
                          options={industries.map(ind => ({ label: ind.label, value: String(ind.value) }))}
                        />
                        {errors.industry && <span className={styles.errorText}>{errors.industry}</span>}
                      </div>

                      <div className={styles.formGroup}>
                        {renderFieldHeader('problemStatement', 'Vấn Đề Cần Giải Quyết', true)}
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

                  {/* Step 2: Solution & Market */}
                  {currentStep === 2 && (
                    <>
                      <div className={styles.formGroup}>
                        {renderFieldHeader('solutionDescription', 'Mô Tả Giải Pháp', true)}
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
                        {renderFieldHeader('targetCustomers', 'Khách Hàng Mục Tiêu', true)}
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
                        {renderFieldHeader('uniqueValueProposition', 'Giá Trị Độc Đáo (UVP)', !isIdea)}
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

                      {!isIdea && (
                        <div className={styles.row}>
                          <div className={styles.formGroup}>
                            {renderFieldHeader('marketSize', 'Quy mô thị trường (VND)', isGrowth)}
                            <input
                              type="number"
                              name="marketSize"
                              value={formData.marketSize}
                              onChange={handleInputChange}
                              className={styles.input}
                              placeholder="0"
                            />
                            {errors.marketSize && <span className={styles.errorText}>{errors.marketSize}</span>}
                          </div>
                          <div className={styles.formGroup}>
                            {renderFieldHeader('revenue', 'Doanh thu hiện thực (VND)', isGrowth)}
                            <input
                              type="number"
                              name="revenue"
                              value={formData.revenue}
                              onChange={handleInputChange}
                              className={styles.input}
                              placeholder="0"
                            />
                            {errors.revenue && <span className={styles.errorText}>{errors.revenue}</span>}
                          </div>
                        </div>
                      )}

                      <div className={styles.formGroup}>
                        {renderFieldHeader('businessModel', 'Mô Hình Kinh Doanh', !isIdea)}
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
                    </>
                  )}

                  {/* Step 3: Competition & Team */}
                  {currentStep === 3 && (
                    <>
                      <div className={styles.formGroup}>
                        {renderFieldHeader('competitors', 'Đối thủ cạnh tranh', !isIdea)}
                        <textarea
                          name="competitors"
                          value={formData.competitors}
                          onChange={handleInputChange}
                          className={styles.textarea}
                          placeholder="Liệt kê các đối thủ chính và điểm khác biệt của bạn"
                          rows={2}
                        />
                        {renderValidationHint('competitors')}
                        {errors.competitors && <span className={styles.errorText}>{errors.competitors}</span>}
                      </div>

                      <div className={styles.formGroup}>
                        <div className={styles.labelRow}>
                          <label className={styles.label}>
                            <span>Thành Viên Đội <span className={styles.required}>*</span></span>
                          </label>
                          <button 
                            type="button" 
                            onClick={addTeamMember}
                            className={styles.addMemberBtn}
                          >
                            <Plus size={14} /> Thêm người
                          </button>
                        </div>
                        
                        <div className={styles.membersList}>
                          {formData.teamMembers.map((member, index) => (
                            <div key={index} className={styles.memberRow}>
                              <input
                                type="text"
                                placeholder="Họ và tên"
                                value={member.name}
                                onChange={(e) => handleMemberChange(index, 'name', e.target.value)}
                                className={styles.input}
                              />
                              <input
                                type="text"
                                placeholder="Vai trò (VD: CEO, CTO)"
                                value={member.role}
                                onChange={(e) => handleMemberChange(index, 'role', e.target.value)}
                                className={styles.input}
                              />
                              <button 
                                type="button" 
                                onClick={() => removeTeamMember(index)}
                                className={styles.removeMemberBtn}
                                disabled={formData.teamMembers.length <= 1}
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          ))}
                        </div>
                        {errors.teamMembers && <span className={styles.errorText}>{errors.teamMembers}</span>}
                      </div>

                      <div className={styles.formGroup}>
                        {renderFieldHeader('keySkills', 'Kỹ năng cốt lõi', !isIdea)}
                        <input
                          type="text"
                          name="keySkills"
                          value={formData.keySkills}
                          onChange={handleInputChange}
                          className={styles.input}
                          placeholder="Ví dụ: AI, Machine Learning, Quản lý chuỗi cung ứng..."
                        />
                        <span className={styles.hintText}>Tập trung vào các kỹ năng chuyên môn giúp startup thành công.</span>
                        {renderValidationHint('keySkills')}
                        {errors.keySkills && <span className={styles.errorText}>{errors.keySkills}</span>}
                      </div>

                      <div className={styles.formGroup}>
                        {renderFieldHeader('teamExperience', 'Kinh nghiệm đội ngũ', isGrowth)}
                        <textarea
                          name="teamExperience"
                          value={formData.teamExperience}
                          onChange={handleInputChange}
                          className={styles.textarea}
                          placeholder="Các dự án hoặc thành tựu nổi bật của các thành viên"
                          rows={3}
                        />
                        {renderValidationHint('teamExperience')}
                        {errors.teamExperience && <span className={styles.errorText}>{errors.teamExperience}</span>}
                      </div>
                    </>
                  )}
                </>
              );
            })()}
          </form>
        </div>

        {/* Actions Footer */}
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
              type="submit"
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
      )}
    </>
  );
}
