import { useState, useEffect } from 'react';
import { Calendar, MapPin } from 'lucide-react';
import styles from './ProfilePage.module.css';
import StartupAdvisorsList from '../components/profile/StartupAdvisorsList';
import advisorService from '../services/advisorService';

/**
 * ProfilePage - Twitter/X-style profile page with role-specific tabs
 */
export default function ProfilePage({ user, onShowAdvisors }) {
    const [activeTab, setActiveTab] = useState('profile');

    if (!user) {
        return (
            <div className={styles.container}>
                <div className={styles.message}>Please log in to view your profile</div>
            </div>
        );
    }

    // Role-specific tabs
    const getTabs = () => {
        const baseTabs = [
            { id: 'profile', label: 'Basic Profile' },
            // Add Document/other tabs if needed, but for now just Basic Profile as requested
        ];

        return baseTabs;
    };

    const tabs = getTabs();

    // Generate @handle from name or email
    const handle = user.email ? `@${user.email.split('@')[0]}` : `@${(user.name || 'user').toLowerCase().replace(/\s+/g, '')}`;

    // Mock data
    const joinDate = 'February 2024';

    return (
        <div className={styles.container}>
            {/* Cover Banner */}
            <div className={styles.coverBanner}></div>

            {/* Profile Header */}
            <div className={styles.profileHeader}>
                <div className={styles.avatarSection}>
                    <div className={styles.avatar}>
                        <span>{(user.name || user.email || 'U').charAt(0).toUpperCase()}</span>
                    </div>
                </div>

                <div className={styles.profileInfo}>
                    <div className={styles.nameSection}>
                        <h1 className={styles.name}>{user.name || user.email}</h1>
                        <div className={styles.handle}>{handle}</div>
                    </div>

                    <div className={styles.bio}>
                        {(user.role?.toLowerCase() === 'startup' || user.role === 0) && user.companyName && (
                            <p>Building {user.companyName} | Innovating in AI-powered solutions</p>
                        )}
                        {(user.role?.toLowerCase() === 'investor' || user.role === 1) && <p>Investor | Looking for promising AI startups</p>}
                        {(user.role?.toLowerCase() === 'advisor' || user.role === 2) && <p>Advisor | Helping startups scale and succeed</p>}
                    </div>

                    <div className={styles.metadata}>
                        <div className={styles.metaItem}>
                            <Calendar size={16} />
                            <span>Joined {joinDate}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className={styles.tabs}>
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        className={`${styles.tab} ${activeTab === tab.id ? styles.active : ''}`}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className={styles.tabContent}>
                {activeTab === 'profile' && <ProfileTab user={user} />}
            </div>
        </div>
    );
}

// Tab Components (inline for now, can be split later)

function OverviewTab({ user }) {
    return (
        <div className={styles.overview}>
            <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                    <div className={styles.cardValue}>42</div>
                    <div className={styles.cardLabel}>Profile Views</div>
                </div>
                <div className={styles.statCard}>
                    <div className={styles.cardValue}>8</div>
                    <div className={styles.cardLabel}>Interests</div>
                </div>
                {(user.role?.toLowerCase() === 'startup' || user.role === 0) && (
                    <>
                        <div className={styles.statCard}>
                            <div className={styles.cardValue}>3</div>
                            <div className={styles.cardLabel}>Requests</div>
                        </div>
                        <div className={styles.statCard}>
                            <div className={styles.cardValue}>75</div>
                            <div className={styles.cardLabel}>AI Score</div>
                        </div>
                    </>
                )}
                {(user.role?.toLowerCase() === 'investor' || user.role === 1) && (
                    <>
                        <div className={styles.statCard}>
                            <div className={styles.cardValue}>12</div>
                            <div className={styles.cardLabel}>Investments</div>
                        </div>
                        <div className={styles.statCard}>
                            <div className={styles.cardValue}>$2.5M</div>
                            <div className={styles.cardLabel}>Invested</div>
                        </div>
                    </>
                )}
                {(user.role?.toLowerCase() === 'advisor' || user.role === 2) && (
                    <>
                        <div className={styles.statCard}>
                            <div className={styles.cardValue}>15</div>
                            <div className={styles.cardLabel}>Active Clients</div>
                        </div>
                        <div className={styles.statCard}>
                            <div className={styles.cardValue}>98%</div>
                            <div className={styles.cardLabel}>Success Rate</div>
                        </div>
                    </>
                )}
            </div>

            <div className={styles.activity}>
                <h3>Recent Activity</h3>
                <ul className={styles.activityList}>
                    <li>Investor John Smith viewed your profile</li>
                    <li>Dr. Sarah Expert sent a consulting request</li>
                    <li>Your AI evaluation was updated (Score: 75/100)</li>
                    <li>Capital Ventures Fund showed interest</li>
                </ul>
            </div>
        </div>
    );
}

function ProfileTab({ user }) {
    const [formData, setFormData] = useState({});
    const [advisorProfile, setAdvisorProfile] = useState(null);
    const [isLoadingAdvisor, setIsLoadingAdvisor] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState('');

    // Fetch advisor profile if role is advisor
    useEffect(() => {
        console.log('[PROFILE_TAB] Current user:', { role: user?.role, name: user?.name, email: user?.email });
        console.log('[PROFILE_TAB] Is advisor?', user?.role?.toLowerCase() === 'advisor' || user?.role === 2);
        
        if (user.role?.toLowerCase() === 'advisor' || user.role === 2) {
            console.log('[PROFILE_TAB] Loading advisor profile...');
            fetchAdvisorProfile();
        } else {
            setFormData({
                name: user.name || '',
                companyName: user.companyName || '',
                bio: ''
            });
        }
    }, [user]);

    const fetchAdvisorProfile = async () => {
        setIsLoadingAdvisor(true);
        try {
            const profile = await advisorService.getMyProfile();
            console.log('[ADVISOR PROFILE] Response from API:', profile);
            console.log('[ADVISOR PROFILE] Profile keys:', profile ? Object.keys(profile) : 'null');
            
            if (profile) {
                setAdvisorProfile(profile);
                setFormData({
                    userName: profile.userName || '',
                    email: profile.email || '',
                    bio: profile.bio || '',
                    expertise: profile.expertise || '',
                    certifications: profile.certifications || '',
                    previousExperience: profile.previousExperience || '',
                    languagesSpoken: profile.languagesSpoken || '',
                    location: profile.location || '',
                    hourlyRate: profile.hourlyRate || '',
                    rating: profile.rating || 0,
                    approvalStatus: profile.status || profile.approvalStatus || 'Pending',
                    profileImage: profile.profileImage || ''
                });
                console.log('[ADVISOR PROFILE] FormData set successfully');
            } else {
                console.log('[ADVISOR PROFILE] No profile returned');
                setMessage('Không tìm thấy hồ sơ. Vui lòng liên hệ quản trị viên.');
            }
        } catch (error) {
            console.error('[ADVISOR PROFILE] Error fetching advisor profile:', error);
            console.error('[ADVISOR PROFILE] Error details:', {
                message: error.message,
                status: error.statusCode,
                data: error.data
            });
            setMessage('Không thể tải hồ sơ. Vui lòng thử lại.');
        } finally {
            setIsLoadingAdvisor(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        setMessage('');

        try {
            if (user.role?.toLowerCase() === 'advisor' || user.role === 2) {
                // Update advisor profile - only send editable fields
                const updateData = {
                    bio: formData.bio || '',
                    expertise: formData.expertise || '',
                    certifications: formData.certifications || '',
                    previousExperience: formData.previousExperience || '',
                    languagesSpoken: formData.languagesSpoken || '',
                    location: formData.location || '',
                    hourlyRate: formData.hourlyRate || 0
                };
                console.log('[PROFILE_SUBMIT] Updating advisor profile with:', updateData);
                await advisorService.updateMyProfile(updateData);
                setMessage('Hồ sơ đã được cập nhật thành công!');
            } else {
                // Update basic profile (startup/investor)
                // TODO: Add profileService.updateMyProfile() if needed
                setMessage('Hồ sơ đã được cập nhật thành công!');
            }
            setTimeout(() => setMessage(''), 3000);
        } catch (error) {
            console.error('Error updating profile:', error);
            setMessage('Lỗi cập nhật hồ sơ. Vui lòng thử lại.');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoadingAdvisor && (user.role?.toLowerCase() === 'advisor' || user.role === 2)) {
        return <div className={styles.profileEdit}><p>Đang tải hồ sơ...</p></div>;
    }

    console.log('[PROFILE_TAB RENDER] Current formData:', formData);
    console.log('[PROFILE_TAB RENDER] User role for conditional:', user.role?.toLowerCase() === 'advisor' || user.role === 2);
    console.log('[PROFILE_TAB RENDER] IsLoadingAdvisor:', isLoadingAdvisor);

    return (
        <div className={styles.profileEdit}>
            <h3>Chỉnh Sửa Hồ Sơ</h3>
            {message && (
                <div className={styles.message} style={{
                    padding: '12px 16px',
                    backgroundColor: message.includes('Lỗi') ? '#fee2e2' : '#dcfce7',
                    color: message.includes('Lỗi') ? '#991b1b' : '#166534',
                    borderRadius: '6px',
                    marginBottom: '16px'
                }}>
                    {message}
                </div>
            )}
            <form className={styles.form} onSubmit={handleSubmit}>
                {/* Advisor-specific form */}
                {(user.role?.toLowerCase() === 'advisor' || user.role === 2) ? (
                    <>
                        {/* Profile Image */}
                        {formData.profileImage && (
                            <div className={styles.formGroup}>
                                <label>Ảnh Đại Diện</label>
                                <div style={{ marginTop: '8px' }}>
                                    <img 
                                        src={formData.profileImage} 
                                        alt="Profile" 
                                        style={{ 
                                            width: '120px', 
                                            height: '120px', 
                                            borderRadius: '8px',
                                            objectFit: 'cover'
                                        }} 
                                    />
                                </div>
                            </div>
                        )}

                        {/* User Info - Read Only */}
                        <div className={styles.formRow}>
                            <div className={styles.formGroup}>
                                <label>Tên người dùng</label>
                                <input
                                    type="text"
                                    value={formData.userName || ''}
                                    disabled
                                    style={{ backgroundColor: '#f3f4f6' }}
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label>Email</label>
                                <input
                                    type="email"
                                    value={formData.email || ''}
                                    disabled
                                    style={{ backgroundColor: '#f3f4f6' }}
                                />
                            </div>
                        </div>

                        {/* Rating & Status - Read Only */}
                        <div className={styles.formRow}>
                            <div className={styles.formGroup}>
                                <label>Đánh Giá</label>
                                <input
                                    type="text"
                                    value={`${formData.rating || 0} ⭐`}
                                    disabled
                                    style={{ backgroundColor: '#f3f4f6' }}
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label>Trạng Thái Phê Duyệt</label>
                                <input
                                    type="text"
                                    value={formData.status || formData.approvalStatus || 'Pending'}
                                    disabled
                                    style={{ backgroundColor: '#f3f4f6' }}
                                />
                            </div>
                        </div>

                        {/* Editable Fields */}
                        <div className={styles.formRow}>
                            <div className={styles.formGroup}>
                                <label>Địa Chỉ</label>
                                <input
                                    type="text"
                                    name="location"
                                    value={formData.location || ''}
                                    onChange={handleChange}
                                    placeholder="City, Country"
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label>Giá Nhận Vấn (VNĐ/giờ)</label>
                                <input
                                    type="number"
                                    name="hourlyRate"
                                    value={formData.hourlyRate || ''}
                                    onChange={handleChange}
                                    placeholder="500000"
                                    min="0"
                                />
                            </div>
                        </div>

                        <div className={styles.formGroup}>
                            <label>Ngôn Ngữ Sử Dụng</label>
                            <input
                                type="text"
                                name="languagesSpoken"
                                value={formData.languagesSpoken || ''}
                                onChange={handleChange}
                                placeholder="Vietnamese, English, etc."
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label>Chứng Chỉ</label>
                            <input
                                type="text"
                                name="certifications"
                                value={formData.certifications || ''}
                                onChange={handleChange}
                                placeholder="CFA, PMP, AWS Solutions Architect, etc."
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label>Kinh Nghiệm Trước Đây</label>
                            <textarea
                                name="previousExperience"
                                rows={3}
                                value={formData.previousExperience || ''}
                                onChange={handleChange}
                                placeholder="Ex-CTO tại FPT Software, Co-founder tại TechVN, etc."
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label>Chuyên Môn</label>
                            <textarea
                                name="expertise"
                                rows={3}
                                value={formData.expertise || ''}
                                onChange={handleChange}
                                placeholder="FinTech, SaaS, AI/ML, etc."
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label>Giới Thiệu Bản Thân</label>
                            <textarea
                                name="bio"
                                rows={4}
                                value={formData.bio || ''}
                                onChange={handleChange}
                                placeholder="Tell startups about yourself and how you can help them..."
                            />
                        </div>

                        <button 
                            type="submit" 
                            className={styles.saveBtn}
                            disabled={isSaving}
                        >
                            {isSaving ? 'Đang lưu...' : '💾 Lưu Hồ Sơ'}
                        </button>
                    </>
                ) : (
                    // Startup/Investor basic form
                    <>
                        <div className={styles.formGroup}>
                            <label>Tên</label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name || ''}
                                onChange={handleChange}
                            />
                        </div>
                        {(user.role?.toLowerCase() === 'startup' || user.role === 0) && (
                            <div className={styles.formGroup}>
                                <label>Tên Công Ty</label>
                                <input
                                    type="text"
                                    name="companyName"
                                    value={formData.companyName || ''}
                                    onChange={handleChange}
                                />
                            </div>
                        )}
                        <div className={styles.formGroup}>
                            <label>Giới Thiệu</label>
                            <textarea
                                rows={4}
                                name="bio"
                                value={formData.bio || ''}
                                onChange={handleChange}
                                placeholder="Hãy kể về bạn..."
                            />
                        </div>
                        <button
                            type="submit"
                            className={styles.saveBtn}
                            disabled={isSaving}
                        >
                            {isSaving ? 'Đang lưu...' : 'Lưu Thay Đổi'}
                        </button>
                    </>
                )}
            </form>
        </div>
    );
}

function DocumentsTab({ user }) {
    return (
        <div className={styles.documents}>
            <h3>Note: Complete Information</h3>
            <p>For comprehensive startup information, head to your <strong>Startup Dashboard → Complete Info</strong> tab to fill out detailed information about your startup.</p>
        </div>
    );
}

function AdvisorsTab({ user, onShowAdvisors }) {
    // Show the booking management for startups
    if (user.role?.toLowerCase() === 'startup' || user.role === 0) {
        return <StartupAdvisorsList onExploreAdvisors={onShowAdvisors} />;
    }

    // For investors and advisors, show placeholder
    return (
        <div className={styles.message}>
            <h3>Coming Soon</h3>
            <p>This feature is currently under development.</p>
        </div>
    );
}
