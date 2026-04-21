import React, { useState, useEffect } from 'react';
import { X, AlertCircle, Plus, Trash2, Upload, FileText, CheckCircle } from 'lucide-react';
import styles from './ProjectSubmissionForm.module.css';
import projectSubmissionService from '../../services/projectSubmissionService';
import { getStageNumericValue } from '../../constants/ProjectStatus';
import CustomSelect from '../common/CustomSelect';
import SuccessModal from '../common/SuccessModal';

/**
 * List of available industries matching API structure
 */
const INDUSTRIES = [
  { label: 'Fintech', value: 0 },
  { label: 'Edtech', value: 1 },
  { label: 'Healthtech', value: 2 },
  { label: 'Agritech', value: 3 },
  { label: 'E_Commerce', value: 4 },
  { label: 'Logistics', value: 5 },
  { label: 'Proptech', value: 6 },
  { label: 'Cleantech', value: 7 },
  { label: 'SaaS', value: 8 },
  { label: 'AI_BigData', value: 9 },
  { label: 'Web3_Crypto', value: 10 },
  { label: 'Food_Beverage', value: 11 },
  { label: 'Manufacturing', value: 12 },
  { label: 'Media_Entertainment', value: 13 },
  { label: 'Other', value: 14 },
];

/**
 * Get internal numeric value for industry from various formats
 * @param {any} industry - Industry label or value
 * @returns {string} - Numeric string value ("0" - "14")
 */
const getIndustryNumericValue = (industry) => {
  if (industry === null || industry === undefined || industry === '') return '';
  
  // If already numeric (as string or number)
  const numeric = parseInt(industry);
  if (!isNaN(numeric) && numeric >= 0 && numeric <= 14) {
      return String(numeric);
  }

  // If label (e.g., "Fintech")
  const found = INDUSTRIES.find(i => 
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

  const [formData, setFormData] = useState(initialData ? {
    projectName: initialData.projectName || initialData.name || '',
    shortDescription: initialData.shortDescription || '',
    developmentStage: getStageNumericValue(initialData.developmentStage),
    industry: getIndustryNumericValue(initialData.industry),
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
          const [name, role] = m.trim().split('(');
          return { 
            name: name.trim(), 
            role: role ? role.replace(')', '').trim() : '' 
          };
        })
      : [{ name: '', role: '' }],
    keySkills: initialData.keySkills || '',
    teamExperience: initialData.teamExperience || '',
    projectImageFile: null,
  } : {
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
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
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
    const newErrors = {};

    if (currentStep === 1) {
      if (!formData.projectName.trim()) newErrors.projectName = 'Tên dự án là bắt buộc';
      if (!formData.shortDescription.trim()) newErrors.shortDescription = 'Mô tả ngắn là bắt buộc';
      if (formData.developmentStage === '') newErrors.developmentStage = 'Vui lòng chọn giai đoạn phát triển';
      if (formData.industry === '') newErrors.industry = 'Vui lòng chọn lĩnh vực';
      if (!formData.problemStatement.trim()) newErrors.problemStatement = 'Mô tả vấn đề là bắt buộc';
    }

    if (currentStep === 2) {
      if (!formData.solutionDescription.trim()) newErrors.solutionDescription = 'Mô tả giải pháp là bắt buộc';
      if (!formData.targetCustomers.trim()) newErrors.targetCustomers = 'Mô tả khách hàng mục tiêu là bắt buộc';
      
      // MVP and Growth required fields
      if (isMVP || isGrowth) {
        if (!formData.uniqueValueProposition?.trim()) newErrors.uniqueValueProposition = 'Mô tả giá trị độc đáo là bắt buộc';
        if (!formData.businessModel?.trim()) newErrors.businessModel = 'Mô tả mô hình kinh doanh là bắt buộc';
      }

      // Growth specific
      if (isGrowth) {
        if (!formData.revenue || parseInt(formData.revenue) <= 0) newErrors.revenue = 'Doanh thu phải lớn hơn 0 cho giai đoạn Tăng trưởng';
        if (!formData.marketSize || parseInt(formData.marketSize) <= 0) newErrors.marketSize = 'Kích thước thị trường phải lớn hơn 0 cho giai đoạn Tăng trưởng';
      }
    }

    if (currentStep === 3) {
      // Team members - at least 1 required for all
      const hasEmptyMembers = formData.teamMembers.some(m => !m.name.trim());
      if (hasEmptyMembers) newErrors.teamMembers = 'Vui lòng nhập tên thành viên';

      // MVP and Growth
      if (isMVP || isGrowth) {
        if (!formData.competitors?.trim()) newErrors.competitors = 'Mô tả đối thủ cạnh tranh là bắt buộc';
        if (!formData.keySkills?.trim()) newErrors.keySkills = 'Kỹ năng chính là bắt buộc';
      }

      // Growth specific
      if (isGrowth) {
        if (!formData.teamExperience?.trim()) newErrors.teamExperience = 'Kinh nghiệm đội ngũ là bắt buộc';
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
        projectName: formData.projectName.trim(),
        shortDescription: formData.shortDescription.trim(),
        developmentStage: parseInt(formData.developmentStage),
        industry: parseInt(formData.industry) || 0,
        problemStatement: formData.problemStatement.trim(),
        solutionDescription: formData.solutionDescription.trim(),
        targetCustomers: formData.targetCustomers.trim(),
        uniqueValueProposition: formData.uniqueValueProposition.trim(),
        marketSize: parseInt(formData.marketSize) || 0,
        businessModel: formData.businessModel.trim(),
        revenue: parseInt(formData.revenue) || 0,
        competitors: formData.competitors.trim(),
        teamMembers: formData.teamMembers
          .filter(m => m.name.trim())
          .map(m => m.role.trim() ? `${m.name.trim()} (${m.role.trim()})` : m.name.trim())
          .join(', '),
        keySkills: formData.keySkills.trim(),
        teamExperience: formData.teamExperience.trim(),
        projectImageFile: formData.projectImageFile,
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
        <form onSubmit={handleSubmit} className={styles.formContent}>
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
                <label className={styles.label}>
                  Tên Dự Án <span className={styles.required}>*</span>
                </label>
                <input
                  type="text"
                  name="projectName"
                  value={formData.projectName}
                  onChange={handleInputChange}
                  className={styles.input}
                  placeholder="Ví dụ: AI Smart Assistant"
                />
                {errors.projectName && <span className={styles.errorText}>{errors.projectName}</span>}
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Hình Ảnh Dự Án <span className={styles.optional}>(Tùy chọn)</span>
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
                <label className={styles.label}>
                  Mô Tả Ngắn <span className={styles.required}>*</span>
                </label>
                <textarea
                  name="shortDescription"
                  value={formData.shortDescription}
                  onChange={handleInputChange}
                  className={styles.textarea}
                  placeholder="Mô tả tóm tắt dự án của bạn"
                  rows={2}
                />
                {errors.shortDescription && <span className={styles.errorText}>{errors.shortDescription}</span>}
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Giai Đoạn Phát Triển <span className={styles.required}>*</span>
                </label>
                <CustomSelect
                  name="developmentStage"
                  value={String(formData.developmentStage)}
                  onChange={handleInputChange}
                  placeholder="Chọn giai đoạn..."
                  options={[
                    { label: 'Ý tưởng (Idea)', value: '0' },
                    { label: 'MVP', value: '1' },
                    { label: 'Vận hành (Growth)', value: '2' }
                  ]}
                />
                {errors.developmentStage && <span className={styles.errorText}>{errors.developmentStage}</span>}
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Lĩnh Vực <span className={styles.required}>*</span>
                </label>
                <CustomSelect
                  name="industry"
                  value={String(formData.industry)}
                  onChange={handleInputChange}
                  placeholder="Chọn lĩnh vực..."
                  options={INDUSTRIES.map(ind => ({ label: ind.label, value: String(ind.value) }))}
                />
                {errors.industry && <span className={styles.errorText}>{errors.industry}</span>}
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Vấn Đề Cần Giải Quyết <span className={styles.required}>*</span>
                </label>
                <textarea
                  name="problemStatement"
                  value={formData.problemStatement}
                  onChange={handleInputChange}
                  className={styles.textarea}
                  placeholder="Vấn đề lớn nhất mà startup của bạn đang giải quyết là gì?"
                  rows={3}
                />
                {errors.problemStatement && <span className={styles.errorText}>{errors.problemStatement}</span>}
              </div>
            </>
          )}

          {/* Step 2: Solution & Market */}
          {currentStep === 2 && (
            <>
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Mô Tả Giải Pháp <span className={styles.required}>*</span>
                </label>
                <textarea
                  name="solutionDescription"
                  value={formData.solutionDescription}
                  onChange={handleInputChange}
                  className={styles.textarea}
                  placeholder="Giải pháp của bạn hoạt động như thế nào?"
                  rows={2}
                />
                {errors.solutionDescription && <span className={styles.errorText}>{errors.solutionDescription}</span>}
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Khách Hàng Mục Tiêu <span className={styles.required}>*</span>
                </label>
                <textarea
                  name="targetCustomers"
                  value={formData.targetCustomers}
                  onChange={handleInputChange}
                  className={styles.textarea}
                  placeholder="Ai là người sẽ trả tiền cho giải pháp của bạn?"
                  rows={2}
                />
                {errors.targetCustomers && <span className={styles.errorText}>{errors.targetCustomers}</span>}
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Giá Trị Độc Đáo (UVP) {isIdea ? <span className={styles.optional}>(Tùy chọn)</span> : <span className={styles.required}>*</span>}
                </label>
                <textarea
                  name="uniqueValueProposition"
                  value={formData.uniqueValueProposition}
                  onChange={handleInputChange}
                  className={styles.textarea}
                  placeholder="Tại sao khách hàng chọn bạn thay vì đối thủ?"
                  rows={2}
                />
                {errors.uniqueValueProposition && <span className={styles.errorText}>{errors.uniqueValueProposition}</span>}
              </div>

              {!isIdea && (
                <div className={styles.row}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>
                      Quy mô thị trường (VND) {!isGrowth ? <span className={styles.optional}>(Tùy chọn)</span> : <span className={styles.required}>*</span>}
                    </label>
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
                    <label className={styles.label}>
                      Doanh thu hiện thực (VND) {!isGrowth ? <span className={styles.optional}>(Tùy chọn)</span> : <span className={styles.required}>*</span>}
                    </label>
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
                <label className={styles.label}>
                  Mô Hình Kinh Doanh {isIdea ? <span className={styles.optional}>(Tùy chọn)</span> : <span className={styles.required}>*</span>}
                </label>
                <textarea
                  name="businessModel"
                  value={formData.businessModel}
                  onChange={handleInputChange}
                  className={styles.textarea}
                  placeholder="Bạn dự định kiếm tiền như thế nào?"
                  rows={2}
                />
                {errors.businessModel && <span className={styles.errorText}>{errors.businessModel}</span>}
              </div>
            </>
          )}

          {/* Step 3: Competition & Team */}
          {currentStep === 3 && (
            <>
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Đối thủ cạnh tranh {isIdea ? <span className={styles.optional}>(Tùy chọn)</span> : <span className={styles.required}>*</span>}
                </label>
                <textarea
                  name="competitors"
                  value={formData.competitors}
                  onChange={handleInputChange}
                  className={styles.textarea}
                  placeholder="Liệt kê các đối thủ chính và điểm khác biệt của bạn"
                  rows={2}
                />
                {errors.competitors && <span className={styles.errorText}>{errors.competitors}</span>}
              </div>

              <div className={styles.formGroup}>
                <div className={styles.labelRow}>
                  <label className={styles.label}>
                    Thành Viên Đội <span className={styles.required}>*</span>
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
                <label className={styles.label}>
                  Kỹ năng cốt lõi {isIdea ? <span className={styles.optional}>(Tùy chọn)</span> : <span className={styles.required}>*</span>}
                </label>
                <input
                  type="text"
                  name="keySkills"
                  value={formData.keySkills}
                  onChange={handleInputChange}
                  className={styles.input}
                  placeholder="Ví dụ: AI, Machine Learning, Quản lý chuỗi cung ứng..."
                />
                <span className={styles.hintText}>Tập trung vào các kỹ năng chuyên môn giúp startup thành công.</span>
                {errors.keySkills && <span className={styles.errorText}>{errors.keySkills}</span>}
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Kinh nghiệm đội ngũ {!isGrowth ? <span className={styles.optional}>(Tùy chọn)</span> : <span className={styles.required}>*</span>}
                </label>
                <textarea
                  name="teamExperience"
                  value={formData.teamExperience}
                  onChange={handleInputChange}
                  className={styles.textarea}
                  placeholder="Các dự án hoặc thành tựu nổi bật của các thành viên"
                  rows={3}
                />
                {errors.teamExperience && <span className={styles.errorText}>{errors.teamExperience}</span>}
              </div>
            </>
          )}
        </form>

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
              disabled={isSubmitting}
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
