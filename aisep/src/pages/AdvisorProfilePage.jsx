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

const INDUSTRIES = [
    'Fintech', 'Edtech', 'Healthtech', 'Agritech', 'E_Commerce', 
    'Logistics', 'Proptech', 'Cleantech', 'SaaS', 'AI_BigData', 
    'Web3_Crypto', 'Food_Beverage', 'Manufacturing', 'Media_Entertainment', 'Other'
];

const INDUSTRY_OPTIONS = INDUSTRIES.map(ind => ({ value: ind, label: ind }));

export default function AdvisorProfilePage({ user, onBack }) {
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const [profile, setProfile] = useState(null);
    const [activeMenu, setActiveMenu] = useState('info'); // 'info', 'expertise', 'experience'
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);

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
        try {
            const data = await advisorService.getMyProfile();
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
    };

    const handleIndustryToggle = (ind) => {
        setFormData(prev => {
            const industries = prev.industries.includes(ind)
                ? prev.industries.filter(i => i !== ind)
                : [...prev.industries, ind];
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

    return (
        <div className={styles.pageContainer}>
            <FeedHeader 
                title="Hồ sơ chuyên gia"
                subtitle="Quản lý thông tin cá nhân và chuyên môn để kết nối với startup."
                showFilter={false}
                user={user}
            />

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
                                    onChange={(e) => handleFileChange(e, 'profileImage')}
                                />
                            </div>
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
                                    <label>Vị trí / Địa điểm hiện tại</label>
                                    <div className={styles.inputWrapper}>
                                        <MapPin size={16} className={styles.inputIcon} />
                                        <input 
                                            name="location"
                                            value={formData.location}
                                            onChange={handleInputChange}
                                            placeholder="VD: Hà Nội, Việt Nam" 
                                        />
                                    </div>
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Ngôn ngữ</label>
                                    <div className={styles.inputWrapper}>
                                        <Globe size={16} className={styles.inputIcon} />
                                        <input 
                                            name="languagesSpoken"
                                            value={formData.languagesSpoken}
                                            onChange={handleInputChange}
                                            placeholder="VD: Tiếng Việt, Tiếng Anh" 
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className={styles.formGroup}>
                                <label>Giới thiệu bản thân</label>
                                <textarea 
                                    name="bio"
                                    value={formData.bio}
                                    onChange={handleInputChange}
                                    rows={4} 
                                    placeholder="Chia sẻ về hành trình chuyên môn và đam mê hỗ trợ startup của bạn..."
                                />
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
                                    <label>Kỹ năng chuyên sâu</label>
                                    <div className={styles.inputWrapper}>
                                        <Briefcase size={16} className={styles.inputIcon} />
                                        <input 
                                            name="expertise"
                                            value={formData.expertise}
                                            onChange={handleInputChange}
                                            placeholder="VD: Gọi vốn, Growth Hacking, Quản trị rủi ro..." 
                                        />
                                    </div>
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Phí tư vấn theo giờ (VNĐ)</label>
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
                                </div>
                            </div>

                            <div className={styles.formGroup}>
                                <label>Lĩnh vực chuyên môn</label>
                                <div className={styles.industryPills}>
                                    {INDUSTRIES.map(ind => (
                                        <button
                                            key={ind}
                                            type="button"
                                            className={`${styles.pill} ${formData.industries.includes(ind) ? styles.pillActive : ''}`}
                                            onClick={() => handleIndustryToggle(ind)}
                                        >
                                            {ind}
                                            {formData.industries.includes(ind) ? <X size={12} /> : <Plus size={12} />}
                                        </button>
                                    ))}
                                </div>
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
                                <label>Quá trình làm việc & Kinh nghiệm</label>
                                <textarea 
                                    name="previousExperience"
                                    value={formData.previousExperience}
                                    onChange={handleInputChange}
                                    rows={4} 
                                    placeholder="Liệt kê các vị trí quan trọng hoặc dự án thành công..."
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label>Chứng chỉ chuyên môn</label>
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
                                        onChange={(e) => handleFileChange(e, 'certification')}
                                    />
                                </div>
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
