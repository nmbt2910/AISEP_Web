import React, { useState, useEffect } from 'react';
import { ArrowLeft, Buildings, MapPin, Target, TrendUp, CheckCircle, Briefcase, EnvelopeSimple, Wallet, WarningCircle, CalendarBlank, Scales, Handshake, Scroll, CurrencyCircleDollar } from '@phosphor-icons/react';
import styles from './InvestorDetail.module.css';
import investorService from '../../services/investorService';
import ProfileLoading from '../common/ProfileLoading';
import ProfileErrorScreen from '../common/ProfileErrorScreen';
import AuthRequirementScreen from '../common/AuthRequirementScreen';

export default function InvestorDetail({ investorId, onBack, user, onShowLogin }) {
    const [investor, setInvestor] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('overview');
    const [profileImageFailed, setProfileImageFailed] = useState(false);

    useEffect(() => {
        setProfileImageFailed(false);
    }, [investorId, investor?.profileImageUrl]);

    useEffect(() => {
        const fetchInvestorDetails = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const data = await investorService.getInvestorById(investorId);
                if (data) {
                    setInvestor(data);
                } else {
                    setError('Không tìm thấy thông tin nhà đầu tư.');
                }
            } catch (err) {
                setError('Lỗi khi tải thông tin nhà đầu tư.');
            } finally {
                setIsLoading(false);
            }
        };

        if (investorId) {
            fetchInvestorDetails();
        }
    }, [investorId]);

    // handlePitchClick removed as the button is no longer present

    if (!user) {
        return (
            <AuthRequirementScreen 
                type="nhà đầu tư" 
                onBack={onBack} 
                onLogin={onShowLogin} 
            />
        );
    }

    if (isLoading) {
        return <ProfileLoading message="Đang tải thông tin nhà đầu tư..." />;
    }

    if (error || !investor) {
        return (
            <ProfileErrorScreen
                title="nhà đầu tư"
                message={error}
                onBack={onBack}
                onRetry={() => {
                    setError(null);
                    setIsLoading(true);
                    investorService.getInvestorById(investorId)
                        .then(data => data ? setInvestor(data) : setError('Không tìm thấy thông tin nhà đầu tư.'))
                        .catch(() => setError('Lỗi khi tải thông tin nhà đầu tư.'))
                        .finally(() => setIsLoading(false));
                }}
            />
        );
    }

    // Formatting date safely
    const formatJoinDate = (dateString) => {
        if (!dateString) return null;
        const d = new Date(dateString);
        return `Tháng ${d.getMonth() + 1} ${d.getFullYear()}`;
    };

    const initial = (investor.organizationName || investor.userName || 'I').charAt(0).toUpperCase();

    return (
        <div className={styles.container}>
            {/* ─── 1. Glassmorphism Top Nav (Overlap) ─── */}
            <div className={styles.topNav}>
                <button className={styles.backBtn} onClick={onBack} aria-label="Back">
                    <ArrowLeft size={20} />
                </button>
                <div className={styles.navTitle}>
                    <h2>{investor.organizationName || investor.userName}</h2>
                    <span>Nhà đầu tư</span>
                </div>
            </div>

            {/* ─── 2. Cover Banner (Mesh Gradient) ─── */}
            <div className={styles.coverWrapper}>
                <div className={styles.coverOverlay} />
            </div>

            {/* ─── 3. Floating Profile Card (Compact) ─── */}
            <div className={styles.profileCard}>
                <div className={styles.cardHeaderRow}>
                    <div className={styles.avatar}>
                        {investor.profileImageUrl && !profileImageFailed ? (
                            <img
                                src={investor.profileImageUrl}
                                alt=""
                                className={styles.avatarImage}
                                onError={() => setProfileImageFailed(true)}
                            />
                        ) : null}
                        {(!investor.profileImageUrl || profileImageFailed) && (
                            <div className={styles.initialText}>{initial}</div>
                        )}
                    </div>
                    <div className={styles.headerActions}>
                        {/* Connect button removed as per user requirement */}
                    </div>
                </div>

                <div className={styles.profileInfo}>
                    <div className={styles.nameRow}>
                        <h1 className={styles.name}>{investor.organizationName || investor.userName}</h1>
                        <span className={styles.verifiedChip}>
                            <CheckCircle size={14} weight="fill" /> Đã xác minh
                        </span>
                    </div>

                    {Array.isArray(investor.industries) && investor.industries.length > 0 && (
                        <div className={styles.industryChips} style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px' }}>
                            {investor.industries.map((ind, idx) => (
                                <span key={idx} style={{ 
                                    fontSize: '11px', fontWeight: '700', padding: '4px 10px', 
                                    borderRadius: '99px', background: 'rgba(45, 126, 255, 0.1)', color: 'var(--primary-blue)',
                                    border: '1px solid rgba(45, 126, 255, 0.2)'
                                }}>
                                    #{ind}
                                </span>
                            ))}
                        </div>
                    )}

                    <p className={styles.bio}>
                        {investor.investmentTaste || 'Thông tin giới thiệu về nhà đầu tư đang được cập nhật.'}
                    </p>

                    <div className={styles.metaRow}>
                        <div className={styles.metaItem}>
                            <MapPin size={15} weight="duotone" style={{ color: 'var(--primary-blue)' }} />
                            <span>{investor.investmentRegion || 'Khu vực Đông Nam Á'}</span>
                        </div>
                        <div className={styles.metaItem}>
                            <CalendarBlank size={15} weight="duotone" style={{ color: 'var(--primary-blue)' }} />
                            <span>
                                {formatJoinDate(investor.investmentDate)
                                    ? `Tham gia ${formatJoinDate(investor.investmentDate)}`
                                    : 'Chưa cập nhật ngày tham gia'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Info Stats Strip */}
                <div className={styles.statsStrip}>
                    <div className={styles.statItem}>
                        <div className={styles.statIcon}><CurrencyCircleDollar size={24} weight="duotone" color="#10b981" /></div>
                        <div className={styles.statValue}>{investor.investmentAmount?.toLocaleString() || '0'}</div>
                        <div className={styles.statLabel}>Vốn (VND)</div>
                    </div>
                    <div className={styles.statItem}>
                        <div className={styles.statIcon}><TrendUp size={24} weight="duotone" color="var(--primary-blue)" /></div>
                        <div className={styles.statValue}>Stage {investor.preferredStage || 'Sớm'}</div>
                        <div className={styles.statLabel}>Giai đoạn</div>
                    </div>
                    <div className={styles.statItem}>
                        <div className={styles.statIcon}><Scales size={24} weight="duotone" color="#ffad1f" /></div>
                        <div className={styles.statValue}>{investor.riskTolerance || 'N/A'}</div>
                        <div className={styles.statLabel}>Rủi ro</div>
                    </div>
                    <div className={styles.statItem}>
                        <div className={styles.statIcon}><Handshake size={24} weight="duotone" color="#8b5cf6" /></div>
                        <div className={styles.statValue}>{investor.previousInvestments ? investor.previousInvestments.split(',').length : 0}</div>
                        <div className={styles.statLabel}>Khoản đầu tư</div>
                    </div>
                </div>
            </div>

            {/* ─── 4. Tabs & Content Feed ─── */}
            <div className={styles.tabs}>
                <button
                    className={`${styles.tab} ${activeTab === 'overview' ? styles.active : ''}`}
                    onClick={() => setActiveTab('overview')}
                >
                    Tổng quan
                    {activeTab === 'overview' && <div className={styles.indicator} />}
                </button>
                <button
                    className={`${styles.tab} ${activeTab === 'portfolio' ? styles.active : ''}`}
                    onClick={() => setActiveTab('portfolio')}
                >
                    Danh mục đầu tư
                    {activeTab === 'portfolio' && <div className={styles.indicator} />}
                </button>
            </div>

            <div className={styles.feedContent}>
                {activeTab === 'overview' && (
                    <>
                        {/* Feed Row: Strategy */}
                        <div className={styles.feedRow}>
                            <div className={`${styles.iconBox} ${styles.blueBox}`}>
                                <Target size={22} weight="duotone" />
                            </div>
                            <div className={styles.rowContent}>
                                <div className={styles.rowTitle}>Chiến lược đầu tư</div>
                                <div className={styles.rowText}>
                                    Nhà đầu tư quan tâm đến các dự án thuộc lĩnh vực {
                                        Array.isArray(investor.industries) && investor.industries.length > 0
                                            ? investor.industries.join(', ')
                                            : (investor.focusIndustry?.toLowerCase() || 'đa ngành')
                                    } với giai đoạn {investor.preferredStage?.toLowerCase() || 'vốn mồi'}.
                                </div>
                            </div>
                        </div>

                        {/* Feed Row: Region */}
                        <div className={styles.feedRow}>
                            <div className={`${styles.iconBox} ${styles.greenBox}`}>
                                <MapPin size={22} weight="duotone" />
                            </div>
                            <div className={styles.rowContent}>
                                <div className={styles.rowTitle}>Khu vực trọng điểm</div>
                                <div className={styles.rowText}>{investor.investmentRegion || 'Toàn quốc'}</div>
                            </div>
                        </div>

                        {/* Feed Row: Detailed Taste */}
                        <div className={styles.feedRow}>
                            <div className={`${styles.iconBox} ${styles.purpleBox}`}>
                                <Scroll size={22} weight="duotone" />
                            </div>
                            <div className={styles.rowContent}>
                                <div className={styles.rowTitle}>Khẩu vị đầu tư chi tiết</div>
                                <div className={styles.rowText}>{investor.investmentTaste || 'Xem phần giới thiệu chung.'}</div>
                                <div className={styles.chipRow}>
                                   <span className={styles.chip}>Risk Profile: {investor.riskTolerance || 'N/A'}</span>
                                   <span className={styles.chip}>Vốn: {investor.investmentAmount?.toLocaleString() || '0'} VND</span>
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {activeTab === 'portfolio' && (
                    <>
                        {/* Feed Row: Portfolio Highlights */}
                        <div className={styles.feedRow}>
                            <div className={`${styles.iconBox} ${styles.blueBox}`}>
                                <Briefcase size={22} weight="duotone" />
                            </div>
                            <div className={styles.rowContent}>
                                <div className={styles.rowTitle}>Các khoản đầu tư trước đây</div>
                                <div className={styles.rowText}>
                                    {investor.previousInvestments || 'Chưa cập nhật thông tin khoản đầu tư.'}
                                </div>
                                {investor.previousInvestments && (
                                    <div className={styles.chipRow}>
                                        {investor.previousInvestments.split(',').map((p, i) => (
                                            <span key={i} className={styles.chip}>{p.trim()}</span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
