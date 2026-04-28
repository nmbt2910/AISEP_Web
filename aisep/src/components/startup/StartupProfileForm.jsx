import React, { useState, useEffect } from 'react';
import { Check, AlertCircle, Loader2, Upload, X, FileText, Globe, User, MapPin, Briefcase, Tag, Mail, ExternalLink } from 'lucide-react';
import styles from './StartupProfileForm.module.css';
import startupProfileService from '../../services/startupProfileService';
import validationService from '../../services/validationService';
import enumService from '../../services/enumService';
import CustomSelect from '../common/CustomSelect';

/**
 * StartupProfileForm - Form for updating startup profile information
 * Improved with professional styling and theme support.
 */
export default function StartupProfileForm({ initialData, user, onSuccess }) {
  const [formData, setFormData] = useState({
    companyName: '',
    logoUrl: '',
    founder: '',
    email: '',
    phoneNumber: '',
    countryCity: '',
    website: '',
    industry: 0,
    businessLicenseUrl: '',
  });

  const [logoFile, setLogoFile] = useState(null);
  const [licenseFile, setLicenseFile] = useState(null);

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const [validationRules, setValidationRules] = useState(null);
  const [industries, setIndustries] = useState([]);
  const [isConfigLoading, setIsConfigLoading] = useState(true);
  const [configError, setConfigError] = useState('');

  // Fetch dynamic configuration
  useEffect(() => {
    const fetchConfig = async () => {
      setIsConfigLoading(true);
      setConfigError('');
      try {
        const formKey = initialData ? 'startup.update' : 'startup.create';
        const [rules, indOptions] = await Promise.all([
          validationService.getFormRules(formKey),
          enumService.getEnumOptions('Industry')
        ]);
        
        if (!rules || Object.keys(rules).length === 0) {
          throw new Error(`Không tìm thấy cấu hình xác thực cho ${formKey}.`);
        }
        
        setValidationRules(rules);
        setIndustries(indOptions);

        if (initialData) {
          const getIndustryNumericValue = (data, options = []) => {
            // Try to find industry data in common backend field names
            const industryField = data.industry || (data.industries && data.industries[0]) || data.Industry || '';
            if (!industryField) return '';

            // 1. If it's an object, try to get ID or Name
            if (typeof industryField === 'object') {
              const id = industryField.id || industryField.value || industryField.industryId;
              if (id && options.some(opt => String(opt.value) === String(id))) return String(id);
              
              const name = industryField.name || industryField.label;
              if (name) {
                const found = options.find(i => 
                  i.label.toLowerCase() === name.toLowerCase() ||
                  i.label.replace('_', ' ').toLowerCase() === name.toLowerCase()
                );
                return found ? String(found.value) : '';
              }
            }

            // 2. If it's a primitive (ID or Label)
            const numeric = parseInt(industryField);
            if (!isNaN(numeric)) {
              if (options.some(i => String(i.value) === String(numeric))) return String(numeric);
            }

            const foundByLabel = options.find(i => 
              i.label.toLowerCase() === String(industryField).toLowerCase() ||
              i.label.replace('_', ' ').toLowerCase() === String(industryField).toLowerCase()
            );
            return foundByLabel ? String(foundByLabel.value) : '';
          };

          setFormData({
            companyName: initialData.companyName || initialData.CompanyName || '',
            logoUrl: initialData.logoUrl || initialData.LogoUrl || '',
            founder: initialData.founder || initialData.Founder || '',
            email: initialData.email || initialData.Email || '',
            phoneNumber: initialData.phoneNumber || initialData.PhoneNumber || '',
            countryCity: initialData.countryCity || initialData.CountryCity || '',
            website: initialData.website || initialData.Website || '',
            industry: getIndustryNumericValue(initialData, indOptions),
            businessLicenseUrl: initialData.businessLicenseUrl || initialData.BusinessLicenseUrl || '',
          });
        }
      } catch (err) {
        console.error('Config loading error:', err);
        setConfigError(err.message || 'Lỗi kết nối đến dịch vụ cấu hình.');
      } finally {
        setIsConfigLoading(false);
      }
    };
    fetchConfig();
  }, [initialData]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Real-time validation
    const error = validateField(name, value);
    setErrors(prev => ({ ...prev, [name]: error }));
  };

  const validateForm = () => {
    if (!validationRules) return true;
    
    // Create a mapping from state keys to validation rule field keys
  const fieldMapping = {
    companyName: 'companyName',
    founder: 'founder',
    email: 'email',
    phoneNumber: 'phoneNumber',
    countryCity: 'countryCity',
    website: 'website',
    industry: 'industryOptionIds',
    logoFile: 'logoFile',
    businessLicenseFile: 'businessLicenseFile'
  };

  const validateField = (name, value) => {
    if (!validationRules) return null;
    const ruleKey = fieldMapping[name]?.toLowerCase();
    if (!ruleKey || !validationRules[ruleKey]) return null;
    return validationService.validateField(value, validationRules[ruleKey]);
  };
    
    const { isValid, errors: validationErrors } = validationService.validateForm(
      formData,
      validationRules,
      fieldMapping
    );
    
    // Also validate files
    if (logoFile) {
        const logoRule = validationRules?.logofile;
        const logoError = validationService.validateFile(logoFile, logoRule);
        if (logoError) validationErrors.logoFile = logoError;
    } else if (validationRules?.logofile?.required && !formData.logoUrl) {
        validationErrors.logoFile = 'Vui lòng tải lên logo công ty';
    }

    if (licenseFile) {
        const licenseRule = validationRules?.businesslicensefile;
        const licenseError = validationService.validateFile(licenseFile, licenseRule);
        if (licenseError) validationErrors.businessLicenseFile = licenseError;
    } else if (validationRules?.businesslicensefile?.required && !formData.businessLicenseUrl) {
        validationErrors.businessLicenseFile = 'Vui lòng tải lên giấy phép kinh doanh';
    }

    setErrors(validationErrors);
    return Object.keys(validationErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccessMessage('');

    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      // Create FormData properly for multipart/form-data
      const dataPayload = new FormData();

      // Append basic fields matching backend DTO property names dokładnie
      dataPayload.append('CompanyName', formData.companyName);
      dataPayload.append('Founder', formData.founder);
      dataPayload.append('Email', formData.email);
      dataPayload.append('PhoneNumber', formData.phoneNumber);
      dataPayload.append('CountryCity', formData.countryCity);
      dataPayload.append('Website', formData.website);
      if (formData.industry && formData.industry !== '0' && formData.industry !== 0) {
          dataPayload.append('IndustryOptionIds', formData.industry);
      }

      // Append files with keys matching backend IFormFile properties
      if (logoFile) {
        dataPayload.append('LogoFile', logoFile);
      }
      if (licenseFile) {
        dataPayload.append('BusinessLicenseFile', licenseFile);
      }

      // Determine if we should create or update
      const isUpdate = !!(initialData && (initialData.id || initialData.startupId));
      let response;

      if (isUpdate) {
        const targetId = initialData.id || initialData.startupId;
        // Pass the dataPayload directly or convert carefully
        response = await startupProfileService.updateStartupProfile({
          formData: dataPayload,
          userId: targetId
        });
      } else {
        response = await startupProfileService.createStartupProfile(dataPayload);
      }

      if (response && (response.isSuccess || response.success)) {
        setSuccessMessage(isUpdate ? 'Thông tin startup đã được cập nhật thành công!' : 'Hồ sơ startup đã được tạo thành công!');
        if (onSuccess) {
          // Priority: response.data (actual updated object) -> response (if it is the object) -> formData (fallback)
          const updatedData = response.data || (response.companyName ? response : null) || formData;
          onSuccess(updatedData);
        }
      } else {
        setErrors({ submit: response?.message || (isUpdate ? 'Cập nhật thất bại. Vui lòng thử lại.' : 'Tạo hồ sơ thất bại. Vui lòng thử lại.') });
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      // Backend validation messages might come directly via catch block from apiClient reject
      setErrors({ submit: error?.message || 'Lỗi kết nối. Vui lòng kiểm tra kết nối mạng.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isConfigLoading) {
    return (
      <div className={styles.formCard} style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
        <Loader2 className={styles.spin} size={32} color="var(--primary-blue)" />
      </div>
    );
  }

  if (configError) {
    return (
      <div className={styles.formCard}>
        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#ef4444' }}>
          <AlertCircle size={48} style={{ margin: '0 auto 16px' }} />
          <h3 style={{ marginBottom: '8px', color: '#1e293b' }}>Không thể tải biểu mẫu</h3>
          <p style={{ marginBottom: '24px', color: '#64748b' }}>{configError}</p>
          <button 
            onClick={() => window.location.reload()} 
            style={{ padding: '8px 24px', backgroundColor: '#1e293b', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.formCard}>
      <h3 className={styles.title}>
        {initialData ? 'Cập nhật Thông tin Startup' : 'Tạo Hồ sơ Startup'}
      </h3>
      <p className={styles.subtitle}>
        {initialData
          ? 'Cập nhật thông tin công ty để nhà đầu tư và cố vấn hiểu rõ hơn về doanh nghiệp của bạn.'
          : 'Vì bạn chưa có hồ sơ, vui lòng điền các thông tin cơ bản của doanh nghiệp để bắt đầu.'}
      </p>

      <form onSubmit={handleSubmit} className={styles.formContainer}>
        {/* Section 1: Basic Information */}
        <section className={styles.formSection}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionIcon}>
              <Briefcase size={20} />
            </div>
            <div>
              <h4 className={styles.sectionTitle}>Thông tin cơ bản</h4>
              <p className={styles.sectionSubtitle}>Các thông tin chính về doanh nghiệp của bạn</p>
            </div>
          </div>

          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label className={styles.label}>
                Tên công ty <span className={styles.required}>*</span>
              </label>
              <div className={styles.inputWrapper}>
                <Briefcase className={styles.fieldIcon} size={18} />
                <input
                  type="text"
                  name="companyName"
                  value={formData.companyName}
                  onChange={handleInputChange}
                  className={`${styles.input} ${errors.companyName ? styles.inputError : ''}`}
                  placeholder="Tên chính thức của công ty"
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                <span className={styles.errorText}>{errors.companyName || ''}</span>
                <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                    {formData.companyName?.length || 0}/{validationRules?.companyname?.maxLength || 255}
                </span>
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>
                Người sáng lập <span className={styles.required}>*</span>
              </label>
              <div className={styles.inputWrapper}>
                <User className={styles.fieldIcon} size={18} />
                <input
                  type="text"
                  name="founder"
                  value={formData.founder}
                  onChange={handleInputChange}
                  className={`${styles.input} ${errors.founder ? styles.inputError : ''}`}
                  placeholder="Tên người sáng lập"
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                <span className={styles.errorText}>{errors.founder || ''}</span>
                <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                    {formData.founder?.length || 0}/{validationRules?.founder?.maxLength || 255}
                </span>
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>
                Email liên hệ <span className={styles.required}>*</span>
              </label>
              <div className={styles.inputWrapper}>
                <Mail className={styles.fieldIcon} size={18} />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`${styles.input} ${errors.email ? styles.inputError : ''}`}
                  placeholder="Ví dụ: contact@startup.com"
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                <span className={styles.errorText}>{errors.email || ''}</span>
                <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                    {formData.email?.length || 0}/{validationRules?.email?.maxLength || 100}
                </span>
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>
                Số điện thoại <span className={styles.required}>*</span>
              </label>
              <div className={styles.inputWrapper}>
                <span className={styles.fieldIcon} style={{
                  fontSize: '13px',
                  fontWeight: '800',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: 1, /* Full opacity for the prefix */
                  top: '50%',
                  transform: 'translateY(-50%)',
                  left: '12px',
                  color: 'var(--text-secondary)'
                }}>+84</span>
                <input
                  type="tel"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleInputChange}
                  className={`${styles.input} ${errors.phoneNumber ? styles.inputError : ''}`}
                  placeholder="090..."
                  style={{ paddingLeft: '48px' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                <span className={styles.errorText}>{errors.phoneNumber || ''}</span>
                <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                    {formData.phoneNumber?.length || 0}/{validationRules?.phonenumber?.maxLength || 20}
                </span>
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>
                Địa phương <span className={styles.required}>*</span>
              </label>
              <div className={styles.inputWrapper}>
                <MapPin className={styles.fieldIcon} size={18} />
                <input
                  type="text"
                  name="countryCity"
                  value={formData.countryCity}
                  onChange={handleInputChange}
                  className={`${styles.input} ${errors.countryCity ? styles.inputError : ''}`}
                  placeholder="Tỉnh/Thành phố"
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                <span className={styles.errorText}>{errors.countryCity || ''}</span>
                <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                    {formData.countryCity?.length || 0}/{validationRules?.countrycity?.maxLength || 255}
                </span>
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>
                Website <span className={styles.required}>*</span>
              </label>
              <div className={styles.inputWrapper}>
                <Globe className={styles.fieldIcon} size={18} />
                <input
                  type="url"
                  name="website"
                  value={formData.website}
                  onChange={handleInputChange}
                  className={`${styles.input} ${errors.website ? styles.inputError : ''}`}
                  placeholder="https://example.com"
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                <span className={styles.errorText}>{errors.website || ''}</span>
                <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                    {formData.website?.length || 0}/{validationRules?.website?.maxLength || 500}
                </span>
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Lĩnh vực</label>
              <div className={styles.inputWrapper}>
                <Tag className={styles.fieldIcon} size={18} />
                <CustomSelect
                  name="industry"
                  value={formData.industry}
                  onChange={handleInputChange}
                  options={industries}
                  placeholder="Chọn lĩnh vực..."
                />
              </div>
            </div>
          </div>
        </section>

        <hr className={styles.divider} />

        {/* Section 2: Branding & Legal */}
        <section className={styles.formSection}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionIcon}>
              <Upload size={20} />
            </div>
            <div>
              <h4 className={styles.sectionTitle}>Hình ảnh & Pháp lý</h4>
              <p className={styles.sectionSubtitle}>Tải lên logo và giấy phép kinh doanh của bạn</p>
            </div>
          </div>

          <div className={styles.uploadRow}>
            {/* Logo Upload */}
            <div className={styles.formGroup}>
              <label className={styles.label}>Logo công ty</label>
              <div
                className={`${styles.uploadCard} ${logoFile || formData.logoUrl ? styles.hasFile : ''}`}
                onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add(styles.dragOver); }}
                onDragLeave={(e) => { e.preventDefault(); e.currentTarget.classList.remove(styles.dragOver); }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.remove(styles.dragOver);
                  const file = e.dataTransfer.files[0];
                  if (file && file.type.startsWith('image/')) setLogoFile(file);
                }}
              >
                <input
                  type="file"
                  id="logoUpload"
                  accept="image/png, image/jpeg, image/jpg, image/webp"
                  onChange={(e) => {
                      const file = e.target.files[0];
                      if (!file) return;
                      const rule = validationRules?.logofile;
                      const error = validationService.validateFile(file, rule);
                      setErrors(prev => ({ ...prev, logoFile: error }));
                      if (!error) setLogoFile(file);
                  }}
                  className={styles.hiddenInput}
                />
                <label htmlFor="logoUpload" className={styles.uploadLabel}>
                  {logoFile || formData.logoUrl ? (
                    <div className={styles.previewContainer}>
                      <img src={logoFile ? URL.createObjectURL(logoFile) : formData.logoUrl} alt="Logo Preview" className={styles.logoPreview} />
                      <div className={styles.previewActions}>
                        <a
                          href={logoFile ? URL.createObjectURL(logoFile) : formData.logoUrl}
                          target="_blank"
                          rel="noreferrer"
                          className={styles.viewBtn}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink size={18} />
                        </a>
                        <button type="button" className={styles.removeBtn} onClick={(e) => { e.preventDefault(); e.stopPropagation(); setLogoFile(null); if (!logoFile) setFormData(p => ({ ...p, logoUrl: '' })); }}>
                          <X size={18} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className={styles.uploadPlaceholder}>
                      <div className={styles.uploadInfo}>
                  <p className={styles.uploadMainText}>Logo công ty</p>
                  <p className={styles.uploadSubText} style={{ color: errors.logoFile ? '#f4212e' : 'var(--text-secondary)' }}>
                    {errors.logoFile || `JPG, PNG, WEBP (Tối đa ${validationRules?.logofile?.maxFileSize ? (validationRules.logofile.maxFileSize / (1024 * 1024)).toFixed(0) : '5'}MB)`}
                  </p>
                </div>
                    </div>
                  )}
                </label>
              </div>
            </div>

            {/* License Upload */}
            <div className={styles.formGroup}>
              <label className={styles.label}>Giấy phép kinh doanh</label>
              <div
                className={`${styles.uploadCard} ${licenseFile || formData.businessLicenseUrl ? styles.hasFile : ''}`}
                onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add(styles.dragOver); }}
                onDragLeave={(e) => { e.preventDefault(); e.currentTarget.classList.remove(styles.dragOver); }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.remove(styles.dragOver);
                  const file = e.dataTransfer.files[0];
                  if (file) setLicenseFile(file);
                }}
              >
                <input
                  type="file"
                  id="licenseUpload"
                  accept="image/png, image/jpeg, image/jpg, application/pdf"
                  onChange={(e) => {
                      const file = e.target.files[0];
                      if (!file) return;
                      const rule = validationRules?.businesslicensefile;
                      const error = validationService.validateFile(file, rule);
                      setErrors(prev => ({ ...prev, businessLicenseFile: error }));
                      if (!error) setLicenseFile(file);
                  }}
                  className={styles.hiddenInput}
                />
                <label htmlFor="licenseUpload" className={styles.uploadLabel}>
                  {licenseFile || formData.businessLicenseUrl ? (
                    <div className={styles.filePreviewMini}>
                      <FileText size={20} className={styles.fileIcon} />
                      <div className={styles.fileInfoMini}>
                        <span className={styles.fileNameMini}>
                          {licenseFile ? licenseFile.name : 'Giấy phép hiện tại'}
                        </span>
                      </div>
                      <div className={styles.fileActionsMini}>
                        {(licenseFile || formData.businessLicenseUrl) && (
                          <a
                            href={licenseFile ? URL.createObjectURL(licenseFile) : formData.businessLicenseUrl}
                            target="_blank"
                            rel="noreferrer"
                            className={styles.viewBtnMini}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ExternalLink size={18} />
                          </a>
                        )}
                        <button type="button" className={styles.removeBtnMini} onClick={(e) => { e.preventDefault(); e.stopPropagation(); setLicenseFile(null); if (!licenseFile) setFormData(p => ({ ...p, businessLicenseUrl: '' })); }}>
                          <X size={18} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className={styles.uploadPlaceholder}>
                      <FileText size={20} className={styles.uploadIcon} />
                      <div className={styles.uploadText}>
                        <span className={styles.uploadLink}>Tải Giấy phép</span>
                        <div style={{ fontSize: '10px', color: errors.businessLicenseFile ? '#f4212e' : 'var(--text-secondary)', marginTop: '4px' }}>
                            {errors.businessLicenseFile || `Tối đa ${validationRules?.businesslicensefile?.maxFileSize ? (validationRules.businesslicensefile.maxFileSize / (1024 * 1024)).toFixed(0) : '10'}MB`}
                        </div>
                      </div>
                    </div>
                  )}
                </label>
              </div>
            </div>
          </div>
        </section>

        {/* Error/Success Feedbacks */}
        {errors.submit && (
          <div className={styles.errorBanner}>
            <AlertCircle size={18} />
            <span>{errors.submit}</span>
          </div>
        )}

        {successMessage && (
          <div className={styles.successBanner}>
            <Check size={18} />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Footer Actions */}
        <div className={styles.formFooter}>
          <button type="button" className={styles.cancelBtn} onClick={() => window.location.reload()}>
            Hủy thay đổi
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className={styles.saveBtn}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={18} className={styles.spin} />
                <span>Đang xử lý...</span>
              </>
            ) : (
              <>
                <Check size={18} />
                <span>{initialData ? 'Lưu thay đổi' : 'Tạo hồ sơ ngay'}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
