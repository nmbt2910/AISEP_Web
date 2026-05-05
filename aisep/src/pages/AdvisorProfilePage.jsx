import React, { useState, useEffect, useRef } from 'react';
import {
    User, Mail, MapPin, Globe, Award, Briefcase,
    DollarSign, Camera, FileText, CheckCircle, AlertCircle,
    Loader, Trash2, Plus, X, ChevronRight, Save, Eye, Lock
} from 'lucide-react';
import styles from './AdvisorProfilePage.module.css';
import advisorService from '../services/advisorService';
import CustomSelect from '../components/common/CustomSelect';
import FeedHeader from '../components/feed/FeedHeader';
import SuccessModal from '../components/common/SuccessModal';
import ConfirmationModal from '../components/common/ConfirmationModal';
import validationService from '../services/validationService';
import enumService from '../services/enumService';
import optionService from '../services/optionService';
import AdvisorProfileBanner from '../components/advisor/AdvisorProfileBanner';
import { useProfile } from '../context/ProfileContext';

/**
 * Mapping of backend field keys to Vietnamese labels for advisor profile localization.
 */
const FIELD_LABEL_MAP = {
    'bio': 'Giới thiệu bản thân',
    'expertise': 'Chuyên môn',
    'previousexperience': 'Kinh nghiệm làm việc',
    'industryoptionids': 'Lĩnh vực tư vấn',
    'languagesspoken': 'Ngôn ngữ',
    'location': 'Địa điểm',
    'hourlyrate': 'Phí tư vấn theo giờ (VND)',
    'profileimagefile': 'Ảnh đại diện',
    'certificationfile': 'Chứng chỉ & Bằng cấp'
};

export default function AdvisorProfilePage({ user, onBack, banner, onNotificationNavigate }) {
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const [profile, setProfile] = useState(null);
    const [activeMenu, setActiveMenu] = useState('info'); // 'info', 'expertise', 'experience'
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [showPendingModal, setShowPendingModal] = useState(false);

    // Use global profile status from context — available immediately without waiting for loadProfile()
    const { advisorProfile: ctxAdvisorProfile, advisorProfileStatus, refreshProfile } = useProfile();

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
        industryOptionIds: 'industryOptionIds'
    };

    const renderLabel = (label, fieldKey) => {
        const ruleKey = fieldMapping[fieldKey]?.toLowerCase() || fieldKey.toLowerCase();
        const rule = validationRules?.[ruleKey];

        // Priority: 1. rule.displayName (from BE), 2. Local Map (Vietnamese), 3. hardcoded label, 4. rule.fieldKey
        const ruleLabel = rule?.displayName || FIELD_LABEL_MAP[ruleKey] || label || rule?.fieldKey;

        return (
            <label>
                {ruleLabel}
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

        // Show file constraints if applicable
        if (rule.maxFileSize) {
            const mbSize = (rule.maxFileSize / (1024 * 1024)).toFixed(0);
            constraints.push(`Tối đa ${mbSize}MB`);
        }

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
                optionService.getIndustries()
            ]);

            // Inject industry count constraints (1-4 for Advisors)
            if (rules && rules.industryoptionids) {
                rules.industryoptionids.minCount = 1;
                rules.industryoptionids.maxCount = 4;
                rules.industryoptionids.minCountMessage = 'Vui lòng chọn ít nhất 1 lĩnh vực.';
                rules.industryoptionids.maxCountMessage = 'Bạn chỉ được chọn tối đa 4 lĩnh vực.';
            }

            setValidationRules(rules);
            setAvailableIndustries(industriesData);

            if (data) {
                setProfile(data);

                // Normalize industries: backend may return IDs (numbers), objects, or label strings
                const rawIndustries = Array.isArray(data.industries) ? data.industries : [];
                const normalizedIndustries = rawIndustries
                    .map(item => {
                        if (typeof item === 'string') {
                            // Already a label string — verify it matches an available option
                            const match = industriesData.find(
                                opt => opt.label.toLowerCase() === item.toLowerCase()
                            );
                            return match ? match.label : item; // Keep raw string if no match (inactive)
                        }
                        if (typeof item === 'number' || (typeof item === 'string' && !isNaN(Number(item)))) {
                            // It's an ID — find the matching label
                            const match = industriesData.find(opt => String(opt.value) === String(item));
                            return match ? match.label : null;
                        }
                        if (typeof item === 'object' && item !== null) {
                            // It's an object — try common id/name fields
                            const id = item.id ?? item.value ?? item.industryId;
                            const name = item.name ?? item.label ?? item.industryName;
                            if (id) {
                                const match = industriesData.find(opt => String(opt.value) === String(id));
                                if (match) return match.label;
                            }
                            if (name) {
                                const match = industriesData.find(
                                    opt => opt.label.toLowerCase() === String(name).toLowerCase()
                                );
                                if (match) return match.label;
                                return name;
                            }
                        }
                        return null;
                    })
                    .filter(Boolean); // Remove nulls

                setFormData({
                    bio: data.bio || '',
                    expertise: data.expertise || '',
                    industries: normalizedIndustries,
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

    const MAX_INDUSTRIES = 4;
    const MIN_INDUSTRIES = 1;

    const handleIndustryToggle = (ind) => {
        setFormData(prev => {
            const isSelected = prev.industries.includes(ind);

            // Silently block selecting beyond max — no error shown on block
            if (!isSelected && prev.industries.length >= MAX_INDUSTRIES) {
                return prev; // No state change, no error message
            }

            const industries = isSelected
                ? prev.industries.filter(i => i !== ind)
                : [...prev.industries, ind];

            // Only show error when user deselects back to 0
            const errorMsg = industries.length === 0
                ? `Vui lòng chọn ít nhất ${MIN_INDUSTRIES} lĩnh vực.`
                : null;
            setFieldErrors(errs => ({ ...errs, industryOptionIds: errorMsg }));

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

        // Block update while profile is pending review
        const currentStatus = profile?.approvalStatus ?? ctxAdvisorProfile?.approvalStatus ?? advisorProfileStatus;
        if (currentStatus === 'Pending') {
            setShowPendingModal(true);
            return;
        }

        const newErrors = {};

        // Hardcoded industry count check (independent of backend rules)
        if (formData.industries.length < MIN_INDUSTRIES) {
            newErrors.industryOptionIds = `Vui lòng chọn ít nhất ${MIN_INDUSTRIES} lĩnh vực.`;
        } else if (formData.industries.length > MAX_INDUSTRIES) {
            newErrors.industryOptionIds = `Bạn chỉ được chọn tối đa ${MAX_INDUSTRIES} lĩnh vực.`;
        }

        if (validationRules) {
            const validationData = {
                ...formData,
                industryOptionIds: formData.industries
            };

            const { errors: validationErrs } = validationService.validateForm(
                validationData,
                validationRules,
                fieldMapping
            );
            // Merge backend errors but DON'T override industry error we already set
            Object.keys(validationErrs).forEach(key => {
                if (key !== 'industryOptionIds') {
                    newErrors[key] = validationErrs[key];
                }
            });

            // Manual validation for files (since they are in 'files' state, not 'formData')
            const profileImageRule = validationRules.profileimagefile;
            if (profileImageRule) {
                const fileErr = validationService.validateFile(files.profileImage, profileImageRule);
                // If there's no new file but an existing preview exists, it's NOT an error for 'required'
                if (fileErr) {
                    if (profileImageRule.required && !files.profileImage && previews.profileImage) {
                        // Keep existing image - no error
                    } else {
                        newErrors.profileImageFile = fileErr;
                    }
                }
            }

            const certificationRule = validationRules.certificationfile;
            if (certificationRule) {
                const fileErr = validationService.validateFile(files.certification, certificationRule);
                // If there's no new file but an existing preview/URL exists, it's NOT an error for 'required'
                if (fileErr) {
                    if (certificationRule.required && !files.certification && previews.certificationUrl) {
                        // Keep existing cert - no error
                    } else {
                        newErrors.certificationFile = fileErr;
                    }
                }
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

            // Append multiple industries: use IDs for active ones, labels for legacy ones
            formData.industries.forEach(ind => {
                const activeOption = availableIndustries.find(opt => opt.label === ind);
                if (activeOption) {
                    submitData.append('IndustryOptionIds', activeOption.value);
                } else {
                    submitData.append('Industries', ind);
                }
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
            loadProfile(); // Refresh local form data
            refreshProfile(); // Sync global ProfileContext status immediately
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

            {/* Banner: prefer the prop passed by parent, then use ProfileContext (instant),
                falling back to local profile only if context not yet loaded */}
            {banner ? (
                <div style={{ marginBottom: '24px' }}>
                    {banner}
                </div>
            ) : (advisorProfileStatus && advisorProfileStatus !== 'Approved') ? (
                <div style={{ marginBottom: '24px' }}>
                    <AdvisorProfileBanner
                        status={ctxAdvisorProfile?.status ?? advisorProfileStatus}
                        approvalStatus={ctxAdvisorProfile?.approvalStatus ?? advisorProfileStatus}
                        reason={ctxAdvisorProfile?.rejectionReason}
                    />
                </div>
            ) : (!profile || (profile.approvalStatus !== 1 && profile.approvalStatus !== 'Approved')) && !isLoading ? (
                <div style={{ marginBottom: '24px' }}>
                    <AdvisorProfileBanner
                        status={profile?.status}
                        approvalStatus={profile?.approvalStatus}
                        reason={profile?.rejectionReason}
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
                                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                        {renderCharCounter(formData.location, 'location')}
                                    </div>
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
                                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                        {renderCharCounter(formData.languagesSpoken, 'languagesSpoken')}
                                    </div>
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
                                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                        {renderCharCounter(formData.expertise, 'expertise')}
                                    </div>
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
                                <div style={{ marginBottom: '8px', fontSize: '12px', color: formData.industries.length >= MAX_INDUSTRIES ? 'var(--primary-blue)' : 'var(--text-secondary)' }}>
                                    Đã chọn {formData.industries.length}/{MAX_INDUSTRIES} lĩnh vực
                                </div>
                                <div className={styles.industryPills}>
                                    {availableIndustries.map(ind => {
                                        const isSelected = formData.industries.includes(ind.label);
                                        const isMaxReached = !isSelected && formData.industries.length >= MAX_INDUSTRIES;
                                        return (
                                            <button
                                                key={ind.value}
                                                type="button"
                                                className={`${styles.pill} ${isSelected ? styles.pillActive : ''}`}
                                                onClick={() => handleIndustryToggle(ind.label)}
                                                style={isMaxReached ? { opacity: 0.4, cursor: 'not-allowed' } : {}}
                                                title={isMaxReached ? `Đã đạt tối đa ${MAX_INDUSTRIES} lĩnh vực` : ''}
                                            >
                                                {ind.label}
                                                {isSelected ? <X size={12} /> : <Plus size={12} />}
                                            </button>
                                        );
                                    })}

                                    {/* Inactive (Legacy) Industries */}
                                    {formData.industries
                                        .filter(label => !availableIndustries.some(opt => opt.label === label))
                                        .map(label => (
                                            <div
                                                key={`inactive-${label}`}
                                                className={styles.pill}
                                                style={{
                                                    display: 'flex', alignItems: 'center', gap: '6px',
                                                    padding: '8px 16px', borderRadius: '20px', 
                                                    border: '1px dashed var(--primary-blue)',
                                                    backgroundColor: 'rgba(29, 155, 240, 0.1)',
                                                    color: 'var(--primary-blue)',
                                                    fontSize: '13px', fontWeight: '600', 
                                                    cursor: 'not-allowed', opacity: 0.8
                                                }}
                                                title="Lĩnh vực này hiện đã ngừng hỗ trợ và không thể thay đổi"
                                            >
                                                {label}
                                                <Lock size={12} />
                                            </div>
                                        ))
                                    }
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
                                        {renderFieldConstraints('certificationFile')}
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
                message={`Sau khi gửi thông tin, đội ngũ AISEP sẽ cần từ 2–4 ngày để xét duyệt hồ sơ của bạn.\n\n${profile?.advisorId
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

            {/* Pending Status Block Modal */}
            {showPendingModal && (
                <ConfirmationModal
                    isOpen={showPendingModal}
                    title="Hồ sơ đang chờ xét duyệt"
                    message={"Hồ sơ của bạn hiện đang trong quá trình xét duyệt bởi đội ngũ AISEP.\n\nBạn không thể cập nhật hồ sơ cho đến khi quá trình xét duyệt hoàn tất. Vui lòng chờ phản hồi từ hệ thống."}
                    type="warning"
                    primaryBtnText="Tôi đã hiểu"
                    onPrimaryClick={() => setShowPendingModal(false)}
                    onClose={() => setShowPendingModal(false)}
                />
            )}
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
