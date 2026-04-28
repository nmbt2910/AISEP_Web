import React, { useState, useEffect, useRef } from 'react';
import { 
    User, Mail, MapPin, Globe, Award, Briefcase, 
    DollarSign, Camera, FileText, CheckCircle, AlertCircle, 
    Loader, Trash2, Plus, X, ChevronRight, Save, Eye
} from 'lucide-react';
import styles from './AdvisorProfilePage.module.css';
import advisorService from '../services/advisorService';
import CustomSelect from '../components/common/CustomSelect';
import FeedHeader from '../components/feed/FeedHeader';
import SuccessModal from '../components/common/SuccessModal';
import ConfirmationModal from '../components/common/ConfirmationModal';
import validationService from '../services/validationService';
import enumService from '../services/enumService';
import AdvisorProfileBanner from '../components/advisor/AdvisorProfileBanner';

export default function AdvisorProfilePage({ user, onBack, banner, onNotificationNavigate }) {
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const [profile, setProfile] = useState(null);
    const [activeMenu, setActiveMenu] = useState('info'); // 'info', 'expertise', 'experience'
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);

    const [validationRules, setValidationRules] = useState(null);
    const [availableIndustries, setAvailableIndustries] = useState([]);
    const [configError, setConfigError] = useState('');
    const [fieldErrors, setFieldErrors] = useState({});

    // Form states
    const [formData, setFormData] = useState({
        bio: '',
        expertise: '',
        industries: [],
        previousExperience: '',
        languagesSpoken: '',
        location: '',
        hourlyRate: 0
    });

    const [files, setFiles] = useState({
        profileImage: null,
        certification: null
    });

    const [previews, setPreviews] = useState({
        profileImage: null,
        certificationName: '',
        certificationUrl: null
    });

    const fileInputRef = useRef(null);
    const certInputRef = useRef(null);
    
    // Section refs for scroll sync
    const sectionInfoRef = useRef(null);
    const sectionExpertiseRef = useRef(null);
    const sectionExperienceRef = useRef(null);

    const fieldMapping = {
        bio: 'bio',
        expertise: 'expertise',
        previousExperience: 'previousExperience',
        languagesSpoken: 'languagesSpoken',
        location: 'location',
        hourlyRate: 'hourlyRate',
        industryOptionIds: 'industryOptionIds',
        profileImageFile: 'profileImageFile',
        certificationFile: 'certificationFile'
    };

    const renderLabel = (label, fieldKey) => {
        const ruleKey = fieldMapping[fieldKey]?.toLowerCase() || fieldKey.toLowerCase();
        const rule = validationRules?.[ruleKey];
        return (
            <label>
                {label}
                {rule?.required && <span className={styles.requiredAsterisk}> *</span>}
            </label>
        );
    };

    const renderCharCounter = (value, fieldKey) => {
        const ruleKey = fieldMapping[fieldKey]?.toLowerCase() || fieldKey.toLowerCase();
        const maxLength = validationRules?.[ruleKey]?.maxLength;
        if (!maxLength) return null;
        
        const count = (value || '').length;
        const isOver = count > maxLength;
        return (
            <div className={`${styles.charCounter} ${isOver ? styles.counterError : ''}`}>
                {count}/{maxLength}
            </div>
        );
    };

    const renderFieldConstraints = (fieldKey) => {
        const ruleKey = fieldMapping[fieldKey]?.toLowerCase() || fieldKey.toLowerCase();
        const rule = validationRules?.[ruleKey];
        if (!rule) return null;

        const constraints = [];
        if (rule.minLength) constraints.push(`Tối thiểu ${rule.minLength} ký tự`);
        if (rule.regex && rule.regex.includes('03|05|07|08|09')) constraints.push('Định dạng số điện thoại Việt Nam');
        
        if (constraints.length === 0) return null;

        return (
            <div className={styles.fieldConstraints}>
                {constraints.join(' • ')}
            </div>
        );
    };

    useEffect(() => {
        loadProfile();
    }, []);

    // Intersection Observer for scroll sync
    useEffect(() => {
        const options = {
            root: null,
            rootMargin: '-20% 0px -60% 0px', // Trigger when section is in the middle-ish of viewport
            threshold: 0
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const id = entry.target.id;
                    if (id === 'section-info') setActiveMenu('info');
                    if (id === 'section-expertise') setActiveMenu('expertise');
                    if (id === 'section-experience') setActiveMenu('experience');
                }
            });
        }, options);

        if (sectionInfoRef.current) observer.observe(sectionInfoRef.current);
        if (sectionExpertiseRef.current) observer.observe(sectionExpertiseRef.current);
        if (sectionExperienceRef.current) observer.observe(sectionExperienceRef.current);

        return () => {
            if (sectionInfoRef.current) observer.unobserve(sectionInfoRef.current);
            if (sectionExpertiseRef.current) observer.unobserve(sectionExpertiseRef.current);
            if (sectionExperienceRef.current) observer.unobserve(sectionExperienceRef.current);
        };
    }, [isLoading]);

    const scrollToSection = (sectionId) => {
        const element = document.getElementById(`section-${sectionId}`);
        if (element) {
            const headerOffset = 100;
            const elementPosition = element.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });
        }
    };

    const loadProfile = async () => {
        setIsLoading(true);
        setConfigError('');
        try {
            const data = await advisorService.getMyProfile().catch(() => null);
            const formKey = data ? 'advisor.update' : 'advisor.create';
            
            const [rules, industriesData] = await Promise.all([
                validationService.getFormRules(formKey),
                enumService.getEnumOptions('Industry').catch(() => [])
            ]);
            
            if (!rules || Object.keys(rules).length === 0) {
              throw new Error(`Không tìm thấy cấu hình xác thực cho ${formKey}.`);
            }
            
            setValidationRules(rules);
            setAvailableIndustries(industriesData);

            if (data) {
                setProfile(data);
                setFormData({
                    bio: data.bio || '',
                    expertise: data.expertise || '',
                    industries: Array.isArray(data.industries) ? data.industries : [],
                    previousExperience: data.previousExperience || '',
                    languagesSpoken: data.languagesSpoken || '',
                    location: data.location || '',
                    hourlyRate: data.hourlyRate || 0
                });
                if (data.profileImage) {
                    setPreviews(prev => ({ ...prev, profileImage: data.profileImage }));
                }
                if (data.certifications) {
                    const filename = data.certifications.split('/').pop();
                    setPreviews(prev => ({ 
                        ...prev, 
                        certificationName: filename || 'Chứng chỉ hiện tại',
                        certificationUrl: data.certifications
                    }));
                }
            }
        } catch (err) {
            console.error('Config error:', err);
            setConfigError(err.message || 'Lỗi tải cấu hình biểu mẫu.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        if (name === 'hourlyRate') {
            const numVal = value === '' ? 0 : parseInt(value, 10);
            setFormData(prev => ({ ...prev, [name]: numVal }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
        
        // Live checking if validationRules present
        if (validationRules) {
            const mappedName = fieldMapping[name]?.toLowerCase();
            if (mappedName && validationRules[mappedName]) {
                const errorMsg = validationService.validateField(value, validationRules[mappedName]);
                setFieldErrors(prev => ({ ...prev, [name]: errorMsg }));
            }
        }
    };

    const handleIndustryToggle = (ind) => {
        setFormData(prev => {
            const industries = prev.industries.includes(ind)
                ? prev.industries.filter(i => i !== ind)
                : [...prev.industries, ind];
            
            // Validate industries immediately
            if (validationRules?.industryoptionids) {
                const errorMsg = validationService.validateField(
                    industries.length > 0 ? industries.join(',') : '', 
                    validationRules.industryoptionids
                );
                setFieldErrors(errors => ({ ...errors, industryOptionIds: errorMsg }));
            }
            
            return { ...prev, industries };
        });
    };

    const handleFileChange = (e, type) => {
        const file = e.target.files[0];
        if (!file) return;

        setFiles(prev => ({ ...prev, [type]: file }));
        
        if (type === 'profileImage') {
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreviews(prev => ({ ...prev, profileImage: reader.result }));
            };
            reader.readAsDataURL(file);
        } else {
            setPreviews(prev => ({ ...prev, certificationName: file.name }));
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        
        if (!validationRules) return;

        const validationData = {
            ...formData,
            industryOptionIds: formData.industries.length > 0 ? formData.industries.join(',') : ''
        };
        
        const { isValid, errors: validationErrs } = validationService.validateForm(
            validationData,
            validationRules,
            fieldMapping
        );
        
        const newErrors = { ...validationErrs };
        
        if (validationRules.profileImageFile) {
            const fileErr = validationService.validateFile(files.profileImage, validationRules.profileImageFile);
            if (fileErr) newErrors.profileImageFile = fileErr;
            else if (validationRules.profileImageFile.isRequired && !files.profileImage && !previews.profileImage) {
                newErrors.profileImageFile = 'Vui lòng tải lên ảnh đại diện';
            }
        }
        
        if (validationRules.certificationFile) {
            const fileErr = validationService.validateFile(files.certification, validationRules.certificationFile);
            if (fileErr) newErrors.certificationFile = fileErr;
            else if (validationRules.certificationFile.isRequired && !files.certification && !previews.certificationUrl) {
                newErrors.certificationFile = 'Vui lòng tải lên chứng chỉ';
            }
        }
        
        if (Object.keys(newErrors).length > 0) {
            setFieldErrors(newErrors);
            setError('Vui lòng kiểm tra lại thông tin và cung cấp đủ giấy tờ.');
            return;
        }
        
        setFieldErrors({});
        setShowConfirmModal(true);
    };

    const executeSubmit = async () => {
        setShowConfirmModal(false);
        setIsSaving(true);
        setError(null);
        setSuccess(false);

        try {
            const submitData = new FormData();
            submitData.append('Bio', formData.bio);
            submitData.append('Expertise', formData.expertise);
            
            // Append multiple industries
            formData.industries.forEach(ind => {
                submitData.append('Industries', ind);
            });

            submitData.append('PreviousExperience', formData.previousExperience);
            submitData.append('LanguagesSpoken', formData.languagesSpoken);
            submitData.append('Location', formData.location);
            submitData.append('HourlyRate', formData.hourlyRate);

            if (files.profileImage) {
                submitData.append('ProfileImageFile', files.profileImage);
            }
            if (files.certification) {
                submitData.append('CertificationFile', files.certification);
            }

            if (profile?.advisorId) {
                await advisorService.updateMyProfile(profile.advisorId, submitData);
            } else {
                await advisorService.createMyProfile(submitData);
            }
            setShowSuccessModal(true);
            loadProfile(); // Refresh data
        } catch (err) {
            setError(err.message || 'Lỗi khi cập nhật hồ sơ.');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className={styles.loadingContainer}>
                <Loader className={styles.spin} size={32} />
                <p>Đang tải hồ sơ chuyên gia...</p>
            </div>
        );
    }

    if (configError) {
        return (
            <div className={styles.pageContainer}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '50vh' }}>
                    <AlertCircle size={64} color="#ef4444" style={{ marginBottom: '16px' }} />
                    <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>Lỗi tải cấu hình</h2>
                    <p style={{ color: '#6b7280' }}>{configError}</p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.pageContainer}>
            <FeedHeader 
                title="Hồ sơ chuyên gia"
                subtitle="Quản lý thông tin cá nhân và chuyên môn để kết nối với startup."
                showFilter={false}
                user={user}
                onNotificationNavigate={onNotificationNavigate}
                showNotification={true}
            />

            {banner ? (
                <div style={{ marginBottom: '24px' }}>
                    {banner}
                </div>
            ) : (!profile || (profile.approvalStatus !== 1 && profile.approvalStatus !== 'Approved')) && !isLoading ? (
                <div style={{ marginBottom: '24px' }}>
                    <AdvisorProfileBanner
                        status={profile?.status}
                        approvalStatus={profile?.approvalStatus}
                    />
                </div>
            ) : null}

            <form onSubmit={handleSubmit} className={styles.formLayout}>
                {/* Left Column: Visual Profile */}
                <div className={styles.leftCol}>
                    <div className={styles.glassCard}>
                        <div className={styles.avatarSection}>
                            <div className={styles.avatarWrapper}>
                                {previews.profileImage ? (
                                    <img src={previews.profileImage} alt="Avatar" className={styles.avatar} />
                                ) : (
                                    <div className={styles.avatarPlaceholder}>
                                        <User size={40} />
                                    </div>
                                )}
                                <button 
                                    type="button" 
                                    className={styles.uploadBtn}
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <Camera size={16} />
                                </button>
                                <input 
                                    ref={fileInputRef}
                                    type="file" 
                                    hidden 
                                    accept="image/*"
                                    onChange={(e) => {
                                        handleFileChange(e, 'profileImage');
                                        setFieldErrors(prev => ({ ...prev, profileImageFile: null }));
                                    }}
                                />
                            </div>
                            {fieldErrors.profileImageFile && <p style={{ color: 'red', fontSize: '12px', marginTop: '4px', textAlign: 'center' }}>{fieldErrors.profileImageFile}</p>}
                            <h2 className={styles.userName}>{profile?.userName || user?.name || user?.fullName}</h2>
                            <p className={styles.userEmail}>{profile?.email || user?.email}</p>
                            <div className={styles.roleBadge}>{profile ? 'Advisor Specialist' : 'New Advisor Onboarding'}</div>
                        </div>

                        <div className={styles.menuItems}>
                            <div 
                                className={`${styles.menuItem} ${activeMenu === 'info' ? styles.menuActive : ''}`}
                                onClick={() => scrollToSection('info')}
                            >
                                <User size={18} />
                                <span>Thông tin chung</span>
                                <ChevronRight size={16} className={styles.chevron} />
                            </div>
                            <div 
                                className={`${styles.menuItem} ${activeMenu === 'expertise' ? styles.menuActive : ''}`}
                                onClick={() => scrollToSection('expertise')}
                            >
                                <Award size={18} />
                                <span>Kinh nghiệm & Kỹ năng</span>
                                <ChevronRight size={16} className={styles.chevron} />
                            </div>
                            <div 
                                className={`${styles.menuItem} ${activeMenu === 'experience' ? styles.menuActive : ''}`}
                                onClick={() => scrollToSection('experience')}
                            >
                                <FileText size={18} />
                                <span>Chứng chỉ & Tài liệu</span>
                                <ChevronRight size={16} className={styles.chevron} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Editor */}
                <div className={styles.rightCol}>
                    {/* General Info Section */}
                    <div id="section-info" ref={sectionInfoRef} className={styles.glassCard}>
                        <div className={styles.cardHeader}>
                            <h3 className={styles.cardTitle}>
                                {profile ? 'Thông tin cá nhân' : 'Khởi tạo thông tin cá nhân'}
                            </h3>
                        </div>
                        <div className={styles.cardBody}>
                            <div className={styles.grid2}>
                                <div className={styles.formGroup}>
                                    {renderLabel('Vị trí / Địa điểm hiện tại', 'location')}
                                    <div className={styles.inputWrapper}>
                                        <MapPin size={16} className={styles.inputIcon} />
                                        <input 
                                            name="location"
                                            value={formData.location}
                                            onChange={handleInputChange}
                                            placeholder="VD: Hà Nội, Việt Nam" 
                                        />
                                    </div>
                                    {renderFieldConstraints('location')}
                                    {fieldErrors.location && <span style={{ color: 'red', fontSize: '12px' }}>{fieldErrors.location}</span>}
                                </div>
                                <div className={styles.formGroup}>
                                    {renderLabel('Ngôn ngữ', 'languagesSpoken')}
                                    <div className={styles.inputWrapper}>
                                        <Globe size={16} className={styles.inputIcon} />
                                        <input 
                                            name="languagesSpoken"
                                            value={formData.languagesSpoken}
                                            onChange={handleInputChange}
                                            placeholder="VD: Tiếng Việt, Tiếng Anh" 
                                        />
                                    </div>
                                    {renderFieldConstraints('languagesSpoken')}
                                    {fieldErrors.languagesSpoken && <span style={{ color: 'red', fontSize: '12px' }}>{fieldErrors.languagesSpoken}</span>}
                                </div>
                            </div>

                            <div className={styles.formGroup}>
                                {renderLabel('Giới thiệu bản thân', 'bio')}
                                <textarea 
                                    name="bio"
                                    value={formData.bio}
                                    onChange={handleInputChange}
                                    rows={4} 
                                    placeholder="Chia sẻ về hành trình chuyên môn và đam mê hỗ trợ startup của bạn..."
                                />
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    {renderFieldConstraints('bio')}
                                    {renderCharCounter(formData.bio, 'bio')}
                                </div>
                                {fieldErrors.bio && <span style={{ color: 'red', fontSize: '12px' }}>{fieldErrors.bio}</span>}
                            </div>
                        </div>
                    </div>

                    {/* Expertise Section */}
                    <div id="section-expertise" ref={sectionExpertiseRef} className={styles.glassCard}>
                        <div className={styles.cardHeader}>
                            <h3 className={styles.cardTitle}>Chuyên môn & Lĩnh vực</h3>
                        </div>
                        <div className={styles.cardBody}>
                            <div className={styles.grid2}>
                                <div className={styles.formGroup}>
                                    {renderLabel('Kỹ năng chuyên sâu', 'expertise')}
                                    <div className={styles.inputWrapper}>
                                        <Briefcase size={16} className={styles.inputIcon} />
                                        <input 
                                            name="expertise"
                                            value={formData.expertise}
                                            onChange={handleInputChange}
                                            placeholder="VD: Gọi vốn, Growth Hacking, Quản trị rủi ro..." 
                                        />
                                    </div>
                                    {renderFieldConstraints('expertise')}
                                    {fieldErrors.expertise && <span style={{ color: 'red', fontSize: '12px' }}>{fieldErrors.expertise}</span>}
                                </div>
                                <div className={styles.formGroup}>
                                    {renderLabel('Phí tư vấn theo giờ (VNĐ)', 'hourlyRate')}
                                    <div className={styles.inputWrapper}>
                                        <span className={styles.currencyIcon}>₫</span>
                                        <input 
                                            type="number"
                                            name="hourlyRate"
                                            value={formData.hourlyRate === 0 ? '' : formData.hourlyRate}
                                            onChange={handleInputChange}
                                            placeholder="500,000" 
                                        />
                                    </div>
                                    {renderFieldConstraints('hourlyRate')}
                                    {fieldErrors.hourlyRate && <span style={{ color: 'red', fontSize: '12px' }}>{fieldErrors.hourlyRate}</span>}
                                </div>
                            </div>

                            <div className={styles.formGroup}>
                                {renderLabel('Lĩnh vực chuyên môn', 'industryOptionIds')}
                                <div className={styles.industryPills}>
                                    {availableIndustries.map(ind => (
                                        <button
                                            key={ind.value}
                                            type="button"
                                            className={`${styles.pill} ${formData.industries.includes(ind.label) ? styles.pillActive : ''}`}
                                            onClick={() => handleIndustryToggle(ind.label)}
                                        >
                                            {ind.label}
                                            {formData.industries.includes(ind.label) ? <X size={12} /> : <Plus size={12} />}
                                        </button>
                                    ))}
                                </div>
                                {fieldErrors.industryOptionIds && <span style={{ color: 'red', fontSize: '12px', marginTop: '4px', display: 'block' }}>{fieldErrors.industryOptionIds}</span>}
                            </div>
                        </div>
                    </div>

                    {/* Experience & Certification */}
                    <div id="section-experience" ref={sectionExperienceRef} className={styles.glassCard}>
                        <div className={styles.cardHeader}>
                            <h3 className={styles.cardTitle}>Kinh nghiệm & Chứng chỉ</h3>
                        </div>
                        <div className={styles.cardBody}>
                            <div className={styles.formGroup}>
                                {renderLabel('Quá trình làm việc & Kinh nghiệm', 'previousExperience')}
                                <textarea 
                                    name="previousExperience"
                                    value={formData.previousExperience}
                                    onChange={handleInputChange}
                                    rows={4} 
                                    placeholder="Liệt kê các vị trí quan trọng hoặc dự án thành công..."
                                />
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    {renderFieldConstraints('previousExperience')}
                                    {renderCharCounter(formData.previousExperience, 'previousExperience')}
                                </div>
                                {fieldErrors.previousExperience && <span style={{ color: 'red', fontSize: '12px' }}>{fieldErrors.previousExperience}</span>}
                            </div>

                            <div className={styles.formGroup}>
                                {renderLabel('Chứng chỉ chuyên môn', 'certificationFile')}
                                <div 
                                    className={styles.fileDropZone}
                                    onClick={() => certInputRef.current?.click()}
                                >
                                    <FileText size={24} className={styles.fileIcon} />
                                    <div className={styles.fileInfo}>
                                        <p className={styles.fileName}>
                                            {previews.certificationName || 'Tải lên chứng chỉ (PDF, PNG, JPG)'}
                                        </p>
                                        <p className={styles.fileHint}>Kích thước tối đa 5MB</p>
                                    </div>
                                    {previews.certificationUrl && (
                                        <button
                                            type="button"
                                            className={styles.viewBtn}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                window.open(previews.certificationUrl, '_blank');
                                            }}
                                            title="Xem chứng chỉ"
                                        >
                                            <Eye size={16} />
                                        </button>
                                    )}
                                    </div>
                                    <input 
                                        ref={certInputRef}
                                        type="file" 
                                        hidden 
                                        onChange={(e) => {
                                            handleFileChange(e, 'certification');
                                            setFieldErrors(prev => ({ ...prev, certificationFile: null }));
                                        }}
                                    />
                                </div>
                                {fieldErrors.certificationFile && <span style={{ color: 'red', fontSize: '12px', display: 'block', marginTop: '4px' }}>{fieldErrors.certificationFile}</span>}
                            </div>
                        </div>

                    {/* Action Bar */}
                    <div className={styles.actionBar}>
                        {error && (
                            <div className={styles.errorBanner}>
                                <AlertCircle size={16} />
                                <span>{error}</span>
                                <button 
                                    type="button" 
                                    className={styles.dismissBtn}
                                    onClick={() => setError(null)}
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        )}
                        <div className={styles.actionButtons}>
                            <button 
                                type="button" 
                                className={styles.cancelBtn}
                                onClick={() => loadProfile()} // Reset
                            >
                                Hủy thay đổi
                            </button>
                            <button 
                                type="submit" 
                                className={styles.saveBtn}
                                disabled={isSaving}
                            >
                                {isSaving ? <Loader size={18} className={styles.spin} /> : <Save size={18} />}
                                {isSaving ? 'Đang lưu...' : 'Lưu hồ sơ'}
                            </button>
                        </div>
                    </div>
                </div>
            </form>

            {showSuccessModal && (
                <SuccessModal 
                    title={profile?.advisorId ? "Cập nhật thành công!" : "Khởi tạo thành công!"}
                    message={profile?.advisorId 
                        ? "Hồ sơ chuyên gia của bạn đã được cập nhật thành công." 
                        : "Chúc mừng! Bạn đã hoàn tất hồ sơ chuyên gia và có thể bắt đầu nhận lịch hẹn tư vấn."
                    }
                    onClose={() => setShowSuccessModal(false)}
                    primaryBtnText="Tiếp tục"
                    onPrimaryClick={() => {
                        setShowSuccessModal(false);
                        if (!profile?.advisorId && onBack) onBack(); // Go back to dashboard if new
                    }}
                />
            )}

            <ConfirmationModal
                isOpen={showConfirmModal}
                title={profile?.advisorId ? "Cập nhật hồ sơ" : "Tạo mới hồ sơ"}
                message={`Sau khi gửi thông tin, đội ngũ AISEP sẽ cần từ 2–4 ngày để xét duyệt hồ sơ của bạn.\n\n${
                    profile?.advisorId
                        ? "• Ví thu nhập sẽ tạm thời bị đóng băng cho đến khi quá trình xét duyệt hoàn tất."
                        : "• Ví thu nhập sẽ được kích hoạt sau khi thông tin được xác nhận thành công."
                }`}
                type="info"
                primaryBtnText="Tiếp tục gửi"
                secondaryBtnText="Hủy"
                onPrimaryClick={executeSubmit}
                onSecondaryClick={() => setShowConfirmModal(false)}
                onClose={() => setShowConfirmModal(false)}
            />
        </div>
    );
}

// Re-using common components if needed, or creating localized ones.
const SectionHeader = ({ icon: Icon, children }) => (
    <div className={styles.sectionHeader}>
        <Icon size={16} />
        <h4>{children}</h4>
    </div>
);
