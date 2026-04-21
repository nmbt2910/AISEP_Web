import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
    Users, Calendar, FileText, Star, Clock, CheckCircle, MessageSquare,
    PlusCircle, TrendingUp, Trash2, Edit2, X, AlertCircle, Loader, Loader2,
    ChevronDown, ChevronUp, ChevronLeft, ChevronRight, CreditCard,
    Eye, Check, ShieldCheck, ShieldAlert
} from 'lucide-react';
import userReportService from '../services/userReportService';
import styles from '../styles/SharedDashboard.module.css';
import avStyles from './AdvisorDashboard.module.css';
import FeedHeader from '../components/feed/FeedHeader';
import advisorService from '../services/advisorService';
import advisorAvailabilityService from '../services/advisorAvailabilityService';
import bookingService from '../services/bookingService';
import chatService from '../services/chatService';
import ConsultingReportModal from '../components/booking/ConsultingReportModal';
import signalRService from '../services/signalRService';
import BookingDetailModal from '../components/booking/BookingDetailModal';
import FloatingChatWidget from '../components/common/FloatingChatWidget';
import CustomSelect from '../components/common/CustomSelect';
import NewsPRSection from '../components/common/NewsPRSection';
import ProjectDetailView from '../components/feed/ProjectDetailView';
import AdvisorPayoutSection from '../components/advisor/AdvisorPayoutSection';
import AdvisorWalletSection from '../components/advisor/AdvisorWalletSection';
import AccountProfileTab from '../components/common/AccountProfileTab';
import BookingRejectionModal from '../components/booking/BookingRejectionModal';
import UserReportStatusModal from '../components/booking/UserReportStatusModal';


/**
 * AdvisorDashboard – Dashboard cho Advisor
 */
export default function AdvisorDashboard({ user, initialSection = 'overview', targetId, onSectionChange, onShowProfile, onLogout, onNotificationNavigate }) {
    const [activeSection, setActiveSection] = useState(initialSection);
    const [advisorProfile, setAdvisorProfile] = useState(null);
    const [activeChatSession, setActiveChatSession] = useState(null);

    const handleOpenChat = (sessionId) => {
        console.log('[AdvisorDashboard] Opening chat session:', sessionId);
        setActiveChatSession(sessionId);
    };

    // Initialize SignalR on mount
    useEffect(() => {
        const initSignalR = async () => {
            try {
                const token = localStorage.getItem('aisep_token');
                if (token && user?.userId) {
                    await signalRService.initialize(token);
                }
            } catch (error) {
                console.error('[AdvisorDashboard] Failed to initialize SignalR:', error);
            }
        };

        if (user?.userId) {
            initSignalR();
        }

        return () => {
            signalRService.disconnect();
        };
    }, [user?.userId]);

    // Sync internal state with prop changes from sidebar
    useEffect(() => {
        if (initialSection) {
            setActiveSection(initialSection);
        }
    }, [initialSection]);

    // Handle navigation that should also update the Sidebar
    const handleNavigate = (section) => {
        if (section === 'profile' && onShowProfile) {
            onShowProfile();
            return;
        }

        setActiveSection(section);
        if (onSectionChange) {
            onSectionChange(section);
        }
    };

    // ── Advisor profile ────────────────────────────────────────────────────
    useEffect(() => {
        const loadProfile = async () => {
            try {
                const profile = await advisorService.getMyProfile();
                setAdvisorProfile(profile);
            } catch (e) {
                console.error('Could not load advisor profile', e);
            }
        };
        loadProfile();
    }, []);

    const advisorId = advisorProfile?.advisorId;

    // ── Stats từ real data ─────────────────────────────────────────────────
    const [availabilities, setAvailabilities] = useState([]);
    const [incomingBookings, setIncomingBookings] = useState([]);
    const [userReportsReported, setUserReportsReported] = useState([]);
    const [availabilitiesLoading, setAvailabilitiesLoading] = useState(false);
    const [bookingsLoading, setBookingsLoading] = useState(false);

    const loadAvailabilities = useCallback(async () => {
        setAvailabilitiesLoading(true);
        try {
            const [data] = await Promise.all([
                advisorAvailabilityService.getMyAvailabilities(),
                new Promise(resolve => setTimeout(resolve, 1000))
            ]);
            setAvailabilities(data);
        } catch (e) {
            console.error('Failed to load availabilities', e);
        } finally {
            setAvailabilitiesLoading(false);
        }
    }, []);

    const loadIncomingBookings = useCallback(async () => {
        if (!advisorId) return;
        setBookingsLoading(true);
        try {
            const [data, reportRes] = await Promise.all([
                bookingService.getMyAdvisorBookings('', '-Id', 1, 100),
                userReportService.getMyReportsAsReported(),
                new Promise(resolve => setTimeout(resolve, 1000))
            ]);
            const items = data?.items ?? (Array.isArray(data) ? data : []);
            const reports = reportRes?.items ?? (Array.isArray(reportRes) ? reportRes : []);
            
            setUserReportsReported(reports);

            // Sort newest to oldest (descending ID)
            const sortedItems = [...items].sort((a, b) => (b.id || 0) - (a.id || 0));
            setIncomingBookings(sortedItems);
        } catch (e) {
            console.error('Failed to load incoming bookings', e);
        } finally {
            setBookingsLoading(false);
        }
    }, [advisorId]);

    useEffect(() => {
        loadAvailabilities();
    }, [loadAvailabilities]);

    useEffect(() => {
        if (advisorId) {
            loadIncomingBookings();
        }
    }, [advisorId, loadIncomingBookings]);

    const pendingBookingCount = incomingBookings.filter(b => b.status === 0 || b.status === 'Pending').length;
    const availableSlotCount = availabilities.filter(a => a.status === 0 || a.status === 'Available').length;

    const dashboardData = {
        averageRating: advisorProfile?.rating ?? 0,
        pendingBookings: pendingBookingCount,
        availableSlots: availableSlotCount,
    };

    const isNewAdvisor = !advisorProfile && !availabilitiesLoading;

    return (
        <div className={styles.container}>
            {!activeSection.startsWith('project_') && activeSection !== 'pr_news' && (
                <FeedHeader
                    title={
                        activeSection === 'account_profile' ? "Hồ sơ người dùng" :
                            activeSection === 'wallet' ? "Thu nhập" :
                                activeSection === 'approve_bookings' ? "Duyệt Booking" :
                                    "Bảng điều khiển Cố vấn"
                    }
                    subtitle={
                        activeSection === 'account_profile'
                            ? "Quản lý thông tin tài khoản và mật khẩu của bạn."
                            : activeSection === 'wallet'
                                ? "Quản lý số dư và lịch sử thu nhập của bạn."
                                : activeSection === 'approve_bookings'
                                    ? "Các yêu cầu tư vấn mới cần bạn xác nhận."
                                    : (isNewAdvisor
                                        ? `Chào mừng ${user?.fullName || user?.name || ''}, hãy bắt đầu bằng việc thiết lập hồ sơ của bạn.`
                                        : `Xin chào, ${user?.fullName || user?.name || 'Cố vấn'}! Quản lý hoạt động tư vấn của bạn.`)
                    }
                    stats={!isNewAdvisor && activeSection === 'overview' ? dashboardData : null}
                    onNavigate={handleNavigate}
                    activeSection={activeSection}
                    onOpenChat={handleOpenChat}
                    showFilter={false}
                    user={user}
                    onNotificationNavigate={onNotificationNavigate}
                />
            )}

            {isNewAdvisor && activeSection !== 'profile' && (
                <div className={avStyles.onboardingBanner}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                        <div style={{
                            width: 32, height: 32, borderRadius: '8px', flexShrink: 0,
                            background: 'rgba(29,155,240,0.12)', color: 'var(--primary-blue)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <AlertCircle size={16} />
                        </div>
                        <div style={{ minWidth: 0 }}>
                            <span style={{ fontWeight: 800, fontSize: '14px', color: 'var(--text-primary)', display: 'block' }}>Hoàn tất hồ sơ chuyên gia</span>
                            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                                Bạn cần khởi tạo hồ sơ trong tab <strong>Hồ sơ</strong> để đăng ký lịch rảnh và nhận yêu cầu tư vấn từ Startup.
                            </span>
                        </div>
                    </div>
                    <button
                        className={styles.primaryBtn}
                        onClick={() => handleNavigate('profile')}
                        style={{ whiteSpace: 'nowrap', flexShrink: 0, borderRadius: '9999px', padding: '8px 18px', fontSize: '13px' }}
                    >
                        Thiết lập hồ sơ ngay <ChevronRight size={14} />
                    </button>
                </div>
            )}

            {activeSection === 'overview' && (
                <div className={`${styles.statsGrid} ${isNewAdvisor ? styles.disabledOpacity : ''}`}>
                    <div className={styles.statCard} onClick={() => !isNewAdvisor && handleNavigate('approve_bookings')}>
                        <div className={`${styles.statIcon} ${styles.iconYellow}`}><MessageSquare size={20} /></div>
                        <div className={styles.statInfo}>
                            <div className={styles.statValue}>{isNewAdvisor ? '-' : dashboardData.pendingBookings}</div>
                            <div className={styles.statLabel}>Booking chờ xác nhận</div>
                        </div>
                    </div>
                    <div className={styles.statCard} onClick={() => !isNewAdvisor && handleNavigate('availability')}>
                        <div className={`${styles.statIcon} ${styles.iconBlue}`}><Calendar size={20} /></div>
                        <div className={styles.statInfo}>
                            <div className={styles.statValue}>{isNewAdvisor ? '-' : dashboardData.availableSlots}</div>
                            <div className={styles.statLabel}>Slot còn rảnh</div>
                        </div>
                    </div>
                    <div className={styles.statCard}>
                        <div className={`${styles.statIcon} ${styles.iconGreen}`}><CheckCircle size={20} /></div>
                        <div className={styles.statInfo}>
                            <div className={styles.statValue}>{isNewAdvisor ? '-' : availabilities.filter(a => a.status === 1 || a.status === 'Booked').length}</div>
                            <div className={styles.statLabel}>Slot đã đặt</div>
                        </div>
                    </div>
                    <div className={styles.statCard}>
                        <div className={`${styles.statIcon} ${styles.iconRed}`}><Star size={20} /></div>
                        <div className={styles.statInfo}>
                            <div className={styles.statValue}>{isNewAdvisor ? '-' : (dashboardData.averageRating > 0 ? dashboardData.averageRating.toFixed(1) : '-')}</div>
                            <div className={styles.statLabel}>Đánh giá trung bình</div>
                        </div>
                    </div>
                </div>
            )}

            <div className={`${styles.content} ${styles.scrollableSection}`} style={activeSection.startsWith('project_') ? { padding: 0 } : activeSection === 'pr_news' ? { padding: 0 } : {}}>
                {activeSection === 'account_profile' && (
                    <AccountProfileTab user={user} onLogout={onLogout} />
                )}
                {activeSection === 'overview' && (
                    isNewAdvisor ? (
                        <div className={styles.emptyState} style={{ padding: '40px', background: 'var(--bg-secondary)', borderRadius: '16px', border: '1px dashed var(--border-color)' }}>
                            <AlertCircle size={40} color="var(--primary-blue)" />
                            <h3 style={{ marginTop: '16px', color: 'var(--text-primary)' }}>Chưa có dữ liệu tổng quan</h3>
                            <p style={{ color: 'var(--text-secondary)', maxWidth: '400px', textAlign: 'center' }}>
                                Vui lòng hoàn tất hồ sơ chuyên gia để chúng tôi có thể hiển thị thống kê và gợi ý phù hợp cho bạn.
                            </p>
                        </div>
                    ) : (
                        <OverviewSection
                            availabilities={availabilities}
                            incomingBookings={incomingBookings}
                            onNavigate={handleNavigate}
                            loadingBookings={bookingsLoading}
                            loadingAvailabilities={availabilitiesLoading}
                        />
                    )
                )}
                {activeSection === 'approve_bookings' && (
                    isNewAdvisor ? (
                        <div className={styles.emptyState} style={{ padding: '40px' }}>
                            <AlertCircle size={40} />
                            <p>Bạn cần hoàn tất hồ sơ trước khi xét duyệt các yêu cầu.</p>
                        </div>
                    ) : (
                        <BookingApprovalSection bookings={incomingBookings} targetId={targetId} loading={bookingsLoading} onRefresh={loadIncomingBookings} user={user} onNavigate={handleNavigate} />
                    )
                )}
                {activeSection === 'bookings' && (
                    isNewAdvisor ? (
                        <div className={styles.emptyState} style={{ padding: '40px' }}>
                            <AlertCircle size={40} />
                            <p>Bạn cần hoàn tất hồ sơ trước khi xem danh sách Booking.</p>
                        </div>
                    ) : (
                        <IncomingBookingsSection bookings={incomingBookings} targetId={targetId} loading={bookingsLoading} onRefresh={loadIncomingBookings} user={user} activeSection={activeSection} onNavigate={handleNavigate} />
                    )
                )}
                {activeSection === 'availability' && (
                    isNewAdvisor ? (
                        <div className={styles.emptyState} style={{ padding: '40px' }}>
                            <AlertCircle size={40} />
                            <p>Bạn cần hoàn tất hồ sơ trước khi quản lý lịch rảnh.</p>
                        </div>
                    ) : (
                        <AvailabilitySection availabilities={availabilities} loading={availabilitiesLoading} onRefresh={loadAvailabilities} />
                    )
                )}
                {activeSection === 'reports' && (
                    isNewAdvisor ? (
                        <div className={styles.emptyState} style={{ padding: '40px' }}>
                            <AlertCircle size={40} />
                            <p>Bạn cần hoàn tất hồ sơ trước khi xem báo cáo tư vấn.</p>
                        </div>
                    ) : (
                        <ReportsSection />
                    )
                )}

                {activeSection === 'pr_news' && (
                    <NewsPRSection user={user} onNotificationNavigate={onNotificationNavigate} />
                )}


                {activeSection === 'payouts' && (
                    isNewAdvisor ? (
                        <div className={styles.emptyState} style={{ padding: '40px' }}>
                            <AlertCircle size={40} />
                            <p>Bạn cần hoàn tất hồ sơ trước khi quản lý thanh toán.</p>
                        </div>
                    ) : (
                        <AdvisorPayoutSection user={user} />
                    )
                )}
                {activeSection === 'wallet' && (
                    <AdvisorWalletSection user={user} />
                )}
                {activeSection.startsWith('project_') && (
                    <ProjectDetailView
                        projectId={activeSection.split('_')[1]}
                        onBack={() => handleNavigate('bookings')}
                        user={user}
                        isFullView={true}
                    />
                )}
                {activeChatSession && (
                    <FloatingChatWidget
                        sessionId={activeChatSession}
                        onClose={() => setActiveChatSession(null)}
                        user={user}
                    />
                )}
            </div>
        </div>
    );
}

function BookingSkeleton({ index = 0 }) {
    return (
        <div
            className={`${styles.listItem} ${styles.staggerEntry}`}
            style={{
                flexDirection: 'column',
                alignItems: 'stretch',
                gap: '12px',
                padding: '16px',
                animationDelay: `${index * 0.1}s`
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div className={`${styles.listIcon} ${styles.skeleton} ${styles.skeletonCircle}`}></div>
                <div className={styles.skeletonContent}>
                    <div className={`${styles.skeleton} ${styles.skeletonTitle}`} style={{ width: '40%', height: '14px', marginBottom: '4px' }}></div>
                    <div className={`${styles.skeleton} ${styles.skeletonText}`} style={{ width: '70%', height: '10px', marginBottom: 0 }}></div>
                </div>
                <div className={`${styles.skeleton} ${styles.skeletonBadge}`}></div>
            </div>
            <div style={{ display: 'flex', gap: '8px', paddingLeft: '48px' }}>
                <div className={`${styles.skeleton}`} style={{ width: '100px', height: '32px', borderRadius: '9999px' }}></div>
                <div className={`${styles.skeleton}`} style={{ width: '80px', height: '32px', borderRadius: '9999px' }}></div>
            </div>
        </div>
    );
}

function OverviewSection({ availabilities, incomingBookings, onNavigate, loadingBookings, loadingAvailabilities }) {
    const nextSlots = [...availabilities]
        .filter(a => a.status === 0 || a.status === 'Available')
        .sort((a, b) => new Date(`${a.slotDate}T${a.startTime}`) - new Date(`${b.slotDate}T${b.startTime}`))
        .slice(0, 5);

    const pending = incomingBookings.filter(b => b.status === 0 || b.status === 'Pending').slice(0, 3);

    return (
        <div className={styles.section}>
            <div className={styles.sectionGrid}>
                <div className={styles.card}>
                    <div className={styles.cardHeader}>
                        <h3 className={styles.cardTitle}>Slot rảnh sắp tới</h3>
                        <button className={styles.linkBtn} onClick={() => onNavigate('availability')}>Quản lý &rsaquo;</button>
                    </div>
                    <div className={styles.list}>
                        {loadingAvailabilities ? (
                            [1, 2, 3, 4, 5].map(i => (
                                <div key={i} className={`${styles.listItem} ${styles.staggerEntry}`} style={{ animationDelay: `${i * 0.1}s` }}>
                                    <div className={`${styles.listIcon} ${styles.skeleton} ${styles.skeletonCircle}`}></div>
                                    <div className={styles.skeletonContent}>
                                        <div className={`${styles.skeleton} ${styles.skeletonTitle}`} style={{ width: '50%', height: '14px', marginBottom: '4px' }}></div>
                                        <div className={`${styles.skeleton} ${styles.skeletonText}`} style={{ width: '40%', height: '10px', marginBottom: 0 }}></div>
                                    </div>
                                    <div className={`${styles.skeleton} ${styles.skeletonBadge}`}></div>
                                </div>
                            ))
                        ) : nextSlots.length === 0 ? (
                            <div className={styles.emptyState} style={{ padding: '16px' }}>
                                <Calendar size={28} />
                                <p style={{ margin: 0, fontSize: '13px' }}>Chưa có slot rảnh nào. Hãy tạo lịch rảnh.</p>
                            </div>
                        ) : nextSlots.map((s, idx) => {
                            const date = new Date(s.slotDate).toLocaleDateString('vi-VN', { weekday: 'short', month: 'short', day: 'numeric' });
                            return (
                                <div
                                    key={s.advisorAvailabilityId}
                                    className={`${styles.mobileCardItem} ${styles.staggerEntry}`}
                                    style={{ animationDelay: `${idx * 0.1}s` }}
                                >
                                    <div className={styles.mobileCardItemContent}>
                                        <div className={styles.listIcon} style={{ background: 'rgba(29, 155, 240, 0.1)', color: 'var(--primary-blue)' }}>
                                            <Calendar size={18} />
                                        </div>
                                        <div className={styles.listContent}>
                                            <div className={styles.mobileCardItemTitle}>{date}</div>
                                            <div className={styles.mobileCardItemMeta}>
                                                <Clock size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                                                {s.startTime?.slice(0, 5)} – {s.endTime?.slice(0, 5)}
                                            </div>
                                        </div>
                                        <span className={`${styles.badge} ${styles.badgeSuccess}`}>Rảnh</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className={styles.card}>
                    <div className={styles.cardHeader}>
                        <h3 className={styles.cardTitle}>Booking chờ xét duyệt</h3>
                        <button className={styles.linkBtn} onClick={() => onNavigate('approve_bookings')}>Xem tất cả &rsaquo;</button>
                    </div>
                    <div className={styles.list}>
                        {loadingBookings ? (
                            [1, 2, 3].map(i => (
                                <BookingSkeleton key={i} index={i} />
                            ))
                        ) : pending.length === 0 ? (
                            <div className={styles.emptyState} style={{ padding: '16px' }}>
                                <MessageSquare size={28} />
                                <p style={{ margin: 0, fontSize: '13px' }}>Không có booking nào đang chờ.</p>
                            </div>
                        ) : pending.map((b, idx) => (
                            <div
                                key={b.id}
                                className={`${styles.mobileCardItem} ${styles.staggerEntry}`}
                                style={{ animationDelay: `${(idx + 2) * 0.1}s` }} // Delay after slots
                            >
                                <div className={styles.mobileCardItemContent}>
                                    <div className={styles.listIcon} style={{ background: 'rgba(255, 173, 31, 0.1)', color: '#d97706' }}>
                                        <Users size={18} />
                                    </div>
                                    <div className={styles.listContent}>
                                        <div className={styles.mobileCardItemTitle}>{b.projectName || 'Dự án chưa rõ'}</div>
                                        <div className={styles.mobileCardItemMeta}>Từ: <strong>{b.customerName}</strong></div>
                                    </div>
                                    <span className={`${styles.badge} ${styles.badgePending}`}>Chờ</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

/**
 * AdvisorBookingKanbanCard - Single card for the Advisor Kanban board
 */
const AdvisorBookingKanbanCard = ({ booking, onDetail, onApprove, onReject, onChat, onReport, isActioning, isChatLoading }) => {
    const status = booking.status;
    let statusLabel = 'Chờ duyệt';
    let localStatus = 'pend';
    let statusColor = '#ff7a00';
    let statusBg = 'rgba(255, 122, 0, 0.1)';

    if (status === 2 || status === 'Confirmed') {
        statusLabel = 'Đã xác nhận';
        localStatus = 'conf';
        statusColor = '#1d9bf0';
        statusBg = 'rgba(29, 155, 240, 0.1)';
    } else if (status === 3 || status === 'Completed') {
        statusLabel = 'Hoàn thành';
        localStatus = 'comp';
        statusColor = '#10b981';
        statusBg = 'rgba(16, 185, 129, 0.1)';
    } else if (status === 4 || status === 'ComplaintAccepted') {
        statusLabel = 'Khiếu nại chấp nhận';
        localStatus = 'complaint';
        statusColor = '#7c3aed';
        statusBg = 'rgba(124, 58, 237, 0.1)';
    } else if (status === 5 || status === 'ComplaintRejected') {
        statusLabel = 'Khiếu nại từ chối';
        localStatus = 'complaint';
        statusColor = '#7c3aed';
        statusBg = 'rgba(124, 58, 237, 0.1)';
    } else if (status === 6 || status === 'Cancel' || status === 'Cancelled') {
        statusLabel = 'Đã hủy';
        localStatus = 'rej';
        statusColor = '#f4212e';
        statusBg = 'rgba(244, 33, 46, 0.1)';
    } else if (status === 7 || status === 'NoResponse') {
        statusLabel = 'Không phản hồi';
        localStatus = 'rej';
        statusColor = '#f4212e';
        statusBg = 'rgba(244, 33, 46, 0.1)';
    } else if (status === 1 || status === 'ApprovedAwaitingPayment' || status === 'AwaitingPayment') {
        statusLabel = 'Chờ thanh toán';
        localStatus = 'pend';
        statusColor = '#ff7a00';
        statusBg = 'rgba(255, 122, 0, 0.1)';
    }

    // Helper for literal UTC time display
    const formatTimeUTC = (dateStr) => {
        if (!dateStr) return '—';
        const d = new Date(dateStr);
        return d.getUTCHours().toString().padStart(2, '0') + ':' + 
               d.getUTCMinutes().toString().padStart(2, '0');
    };

    return (
        <div className={avStyles.bcard}>
            <div className={`${avStyles.bcardStrip} ${avStyles[localStatus]}`}></div>
            <div className={avStyles.bcardBody}>
                <div className={avStyles.bcardRow1}>
                    <div className={avStyles.bcardMainInfo}>
                        <div className={avStyles.bcardName} style={{ fontFamily: 'monospace', fontSize: '13px', color: 'var(--text-primary)', fontWeight: '700' }}>
                            #{booking.id}
                        </div>
                        <span className={avStyles.btag} style={{ background: statusBg, color: statusColor }}>
                            {statusLabel}
                        </span>
                    </div>
                </div>

                <div className={avStyles.bcardFields}>
                    <div className={avStyles.bf}>
                        <div className={avStyles.bfKey}>DỰ ÁN</div>
                        <div className={avStyles.bfVal} title={booking.projectName || 'Trống'}>
                            {booking.projectName || '—'}
                        </div>
                    </div>
                    <div className={avStyles.bf}>
                        <div className={avStyles.bfKey}>KHÁCH</div>
                        <div className={avStyles.bfVal}>{booking.customerName}</div>
                    </div>
                    <div className={avStyles.bf}>
                        <div className={avStyles.bfKey}>GIÁ</div>
                        <div className={avStyles.bfVal} style={{ color: '#f59e0b' }}>
                            {Number(booking.price || 0).toLocaleString('vi-VN')}
                            <span style={{ fontSize: '10px', marginLeft: '2px', color: 'var(--text-secondary)', fontWeight: '400' }}>VND</span>
                        </div>
                    </div>
                </div>

                <div className={avStyles.bcardTeam}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Calendar size={13} style={{ color: 'var(--primary-blue)' }} />
                        <span>{new Date(booking.startTime).toLocaleDateString('vi-VN')}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: 'auto' }}>
                        <Clock size={13} style={{ color: 'var(--primary-blue)' }} />
                        <span>{formatTimeUTC(booking.startTime)} - {formatTimeUTC(booking.endTime)}</span>
                    </div>
                </div>

                <div className={avStyles.bcardActions}>
                    <button className={avStyles.baBtn} onClick={onDetail} title="Chi tiết">
                        <Eye size={16} />
                    </button>
                    {(status === 0 || status === 'Pending') && (
                        <>
                            <button className={`${avStyles.baBtn} ${avStyles.rej}`} onClick={onReject} disabled={!!isActioning} title="Từ chối">
                                {isActioning === 'reject' ? <Loader size={16} className={styles.spinner} /> : <X size={16} />}
                            </button>
                            <button className={`${avStyles.baBtn} ${avStyles.apr}`} onClick={onApprove} disabled={!!isActioning} title="Chấp nhận">
                                {isActioning === 'approve' ? <Loader size={16} className={styles.spinner} /> : <Check size={16} />}
                            </button>
                        </>
                    )}
                    {(status === 2 || status === 'Confirmed') && (
                        <>
                            <button
                                className={`${avStyles.baBtn} ${avStyles.chat} ${isChatLoading ? avStyles.btnDisabled : ''}`}
                                onClick={onChat}
                                disabled={isChatLoading}
                                title="Chat với khách hàng"
                            >
                                {isChatLoading ? (
                                    <Loader2 size={16} className={styles.spinner} />
                                ) : (
                                    <MessageSquare size={16} />
                                )}
                            </button>
                            <button className={avStyles.baBtn} onClick={onReport} title="Báo cáo công việc">
                                <FileText size={16} />
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

const KanbanSkeleton = ({ count = 3 }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px 0' }}>
        {Array.from({ length: count }).map((_, i) => (
            <div key={i} className={avStyles.skeletonCard}>
                <div className={avStyles.shimmer}></div>
                <div className={avStyles.skTitle}></div>
                <div className={avStyles.skDesc}></div>
                <div className={avStyles.skDesc} style={{ width: '70%' }}></div>
                <div className={avStyles.skBottom}></div>
            </div>
        ))}
    </div>
);

const EmptyState = ({ icon: Icon, title, message }) => (
    <div className={avStyles.emptyStateContainer}>
        <div className={avStyles.emptyStateIcon}><Icon size={48} strokeWidth={1.5} color="var(--text-muted)" /></div>
        <h4 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)' }}>{title}</h4>
        <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '280px', lineHeight: '1.5' }}>{message}</p>
    </div>
);

/**
 * BookingApprovalSection - Dedicated section for approving NEW bookings (status 0)
 */
function BookingApprovalSection({ bookings, targetId, loading, onRefresh, user, onNavigate }) {
    const [actionLoading, setActionLoading] = useState({});
    const [actionError, setActionError] = useState({});
    const [selectedBooking, setSelectedBooking] = useState(null);
    const [rejectingBooking, setRejectingBooking] = useState(null);
    const [showRejectionModal, setShowRejectionModal] = useState(false);
    
    // Deep Linking State Tracking
    const [hasAttemptedDeepLink, setHasAttemptedDeepLink] = useState(false);
    
    const pendingBookings = bookings.filter(b => b.status === 0 || b.status === 'Pending');

    // Deep Linking Hook
    useEffect(() => {
        if (targetId && pendingBookings.length > 0 && !hasAttemptedDeepLink) {
            const match = pendingBookings.find(b => String(b.id || b.bookingId) === String(targetId));
            if (match) {
                setSelectedBooking(match);
                setHasAttemptedDeepLink(true);
                console.log(`[DeepLink] Auto-opened Booking Approval Details for ID: ${targetId}`);
            }
        }
    }, [targetId, pendingBookings, hasAttemptedDeepLink]);

    // Helper for literal UTC time display
    const formatTimeUTC = (dateStr) => {
        if (!dateStr) return '—';
        const d = new Date(dateStr);
        return d.getUTCHours().toString().padStart(2, '0') + ':' +
               d.getUTCMinutes().toString().padStart(2, '0');
    };

    const handleApprove = async (bookingId) => {
        setActionLoading(prev => ({ ...prev, [bookingId]: 'approve' }));
        setActionError(prev => ({ ...prev, [bookingId]: null }));
        try {
            await bookingService.approveBooking(bookingId);
            onRefresh();
        } catch (e) {
            setActionError(prev => ({
                ...prev,
                [bookingId]: e.message || 'Không thể chấp nhận booking. Vui lòng thử lại.'
            }));
        } finally {
            setActionLoading(prev => ({ ...prev, [bookingId]: null }));
        }
    };

    const handleRejectClick = (booking) => {
        setRejectingBooking(booking);
        setShowRejectionModal(true);
    };

    const handleConfirmReject = async (reason) => {
        if (!rejectingBooking) return;
        setActionLoading(prev => ({ ...prev, [rejectingBooking.id]: 'reject' }));
        setActionError(prev => ({ ...prev, [rejectingBooking.id]: null }));
        try {
            await bookingService.rejectBooking(rejectingBooking.id, reason);
            onRefresh();
            setShowRejectionModal(false);
            setRejectingBooking(null);
        } catch (e) {
            setActionError(prev => ({
                ...prev,
                [rejectingBooking.id]: e.message || 'Không thể từ chối booking. Vui lòng thử lại.'
            }));
            // Keep modal open so user can retry
        } finally {
            setActionLoading(prev => ({ ...prev, [rejectingBooking?.id]: null }));
        }
    };

    const handleCancelReject = () => {
        setShowRejectionModal(false);
        setRejectingBooking(null);
    };

    return (
        <div className={styles.section} style={{ padding: '0 4px' }}>


            {loading ? (
                <div className={styles.card}>
                    <div className={styles.list}>
                        {[1, 2, 3].map(i => <BookingSkeleton key={i} index={i} />)}
                    </div>
                </div>
            ) : pendingBookings.length === 0 ? (
                <div style={{ marginTop: '40px' }}>
                    <EmptyState
                        icon={ShieldCheck}
                        title="Tất cả đã xong!"
                        message="Hiện tại không có yêu cầu nào đang chờ bạn phê duyệt."
                    />
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingBottom: '40px' }}>
                    {pendingBookings.map((b, idx) => (
                        <div
                            key={b.id}
                            className={`${styles.listItem} ${styles.staggerEntry} ${avStyles.approvalItem}`}
                            style={{ animationDelay: `${idx * 0.05}s` }}
                        >
                            {/* Left: Info */}
                            <div className={avStyles.approvalInfo}>
                                <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(29, 155, 240, 0.1)', color: 'var(--primary-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <Users size={24} />
                                </div>
                                <div style={{ minWidth: 0 }}>
                                    <h4 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {b.projectName || 'Dự án mới'}
                                    </h4>
                                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                                        Khách: <strong style={{ color: 'var(--text-primary)' }}>{b.customerName}</strong>
                                    </div>
                                </div>
                                <span className={`${styles.badge} ${styles.badgePending}`} style={{ padding: '6px 12px', fontSize: '12px', marginLeft: 'auto', whiteSpace: 'nowrap' }}>Chờ duyệt</span>
                            </div>

                            {/* Middle: Metrics - Inline compact */}
                            <div className={avStyles.approvalMetrics}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600' }}>Thời gian</span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>
                                        <Calendar size={14} style={{ color: 'var(--primary-blue)' }} />
                                        {formatTimeUTC(b.startTime)} - {formatTimeUTC(b.endTime)}
                                    </div>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600' }}>Chi phí</span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '14px', fontWeight: '800', color: '#f59e0b' }}>
                                        {Number(b.price || 0).toLocaleString('vi-VN')} <span style={{ fontSize: '11px', fontWeight: '600' }}>VND</span>
                                    </div>
                                </div>
                            </div>

                            {/* Right: Actions */}
                            <div className={avStyles.approvalActions}>
                                <button
                                    onClick={() => setSelectedBooking(b)}
                                    style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s', flexShrink: 0 }}
                                    title="Xem chi tiết"
                                    onMouseOver={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
                                    onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                                >
                                    <Eye size={18} />
                                </button>
                                <button
                                    onClick={() => handleRejectClick(b)}
                                    disabled={!!actionLoading[b.id]}
                                    style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(244, 33, 46, 0.1)', border: 'none', color: '#f4212e', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s', flexShrink: 0 }}
                                    title="Từ chối"
                                    onMouseOver={(e) => e.currentTarget.style.background = 'rgba(244, 33, 46, 0.2)'}
                                    onMouseOut={(e) => e.currentTarget.style.background = 'rgba(244, 33, 46, 0.1)'}
                                >
                                    {actionLoading[b.id] === 'reject' ? <Loader size={18} className={styles.spinner} /> : <X size={18} />}
                                </button>
                                <button
                                    className={styles.primaryBtn}
                                    onClick={() => handleApprove(b.id)}
                                    disabled={!!actionLoading[b.id]}
                                    style={{ borderRadius: '10px', height: '40px', padding: '0 20px', fontSize: '14px', fontWeight: '700' }}
                                >
                                    {actionLoading[b.id] === 'approve' ? <Loader size={16} className={styles.spinner} /> : 'Chấp nhận'}
                                </button>
                            </div>

                            {/* Error message for this booking */}
                            {actionError[b.id] && (
                                <div style={{
                                    gridColumn: '1 / -1',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    marginTop: '8px',
                                    padding: '8px 12px',
                                    background: 'rgba(244, 33, 46, 0.05)',
                                    border: '1px solid rgba(244, 33, 46, 0.2)',
                                    borderRadius: '8px',
                                    color: '#f4212e',
                                    fontSize: '13px',
                                    fontWeight: '500'
                                }}>
                                    <AlertCircle size={14} />
                                    <span>{actionError[b.id]}</span>
                                    <button
                                        onClick={() => setActionError(prev => ({ ...prev, [b.id]: null }))}
                                        style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#f4212e', cursor: 'pointer', padding: '4px' }}
                                        title="Đóng"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {selectedBooking && createPortal(
                <BookingDetailModal
                    booking={selectedBooking}
                    onClose={() => setSelectedBooking(null)}
                    userRole="Advisor"
                    onAction={(act, b) => {
                        if (act === 'approve') handleApprove(b.id);
                        if (act === 'reject') {
                            handleRejectClick(b);
                            setSelectedBooking(null);
                        }
                        if (act === 'viewComplaint') {
                            setSelectedReportForView(b);
                            setSelectedBooking(null);
                        }
                        if (act !== 'reject') setSelectedBooking(null);
                    }}
                />,
                document.body
            )}

            {/* Booking Rejection Modal */}
            {showRejectionModal && rejectingBooking && createPortal(
                <BookingRejectionModal
                    booking={rejectingBooking}
                    onSubmit={handleConfirmReject}
                    onCancel={handleCancelReject}
                    submitError={actionError[rejectingBooking.id]}
                />,
                document.body
            )}
        </div>
    );
}

function IncomingBookingsSection({ bookings, userReports = [], targetId, loading, onRefresh, user, activeSection, onNavigate }) {
    const [actionLoading, setActionLoading] = useState({});
    const [actionError, setActionError] = useState({});
    const [reportModal, setReportModal] = useState(null);
    const [chatSession, setChatSession] = useState(null);
    const [chatLoading, setChatLoading] = useState({});
    const [selectedBooking, setSelectedBooking] = useState(null);
    const [selectedReportForView, setSelectedReportForView] = useState(null);
    const [activeMobileTab, setActiveMobileTab] = useState('pend'); // pend, conf, comp, complaint, canc
    const tabSwitcherRef = React.useRef(null);
    const [showLeftTabIndicator, setShowLeftTabIndicator] = useState(false);
    const [showRightTabIndicator, setShowRightTabIndicator] = useState(false);
    const [rejectingBooking, setRejectingBooking] = useState(null);
    const [showRejectionModal, setShowRejectionModal] = useState(false);
    
    // Deep Linking State Tracking
    const [hasAttemptedDeepLink, setHasAttemptedDeepLink] = useState(false);

    // Deep Linking Hook
    useEffect(() => {
        if (targetId && bookings.length > 0 && !hasAttemptedDeepLink) {
            const match = bookings.find(b => String(b.id || b.bookingId) === String(targetId));
            if (match) {
                setSelectedBooking(match);
                setHasAttemptedDeepLink(true);
                console.log(`[DeepLink] Auto-opened Incoming Booking Details for ID: ${targetId}`);
            }
        }
    }, [targetId, bookings, hasAttemptedDeepLink]);

    const checkTabScroll = () => {
        if (tabSwitcherRef.current) {
            const { scrollLeft, scrollWidth, clientWidth } = tabSwitcherRef.current;
            setShowLeftTabIndicator(scrollLeft > 5);
            setShowRightTabIndicator(scrollLeft < scrollWidth - clientWidth - 5);
        }
    };

    // Responsive check
    const [windowWidth, setWindowWidth] = useState(window.innerWidth);
    useEffect(() => {
        const h = () => {
            setWindowWidth(window.innerWidth);
            checkTabScroll();
        };
        window.addEventListener('resize', h);
        return () => window.removeEventListener('resize', h);
    }, []);

    useEffect(() => {
        if (activeSection === 'bookings') {
            const timer = setTimeout(checkTabScroll, 100);
            return () => clearTimeout(timer);
        }
    }, [activeSection, activeMobileTab, bookings.length]);

    const isMobile = windowWidth <= 1024;

    const groupPending = bookings.filter(b => b.status === 1 || b.status === 'ApprovedAwaitingPayment' || b.status === 'AwaitingPayment');
    const groupConfirmed = bookings.filter(b => b.status === 2 || b.status === 'Confirmed');
    const groupCompleted = bookings.filter(b => b.status === 3 || b.status === 'Completed');
    const groupComplaint = bookings.filter(b => {
        const hasReport = userReports.some(r => String(r.bookingId) === String(b.id || b.bookingId));
        return hasReport || b.status === 4 || b.status === 5 || b.status === 'ComplaintAccepted' || b.status === 'ComplaintRejected';
    });
    const groupDone = [...groupCompleted, ...groupComplaint].sort((a, b) => (b.id || 0) - (a.id || 0));

    const groupCancelled = bookings.filter(b => {
        const isComp = groupComplaint.some(x => x.id === (b.id || b.bookingId));
        if (isComp) return false;
        return b.status === 6 || b.status === 7 || b.status === 'Cancel' || b.status === 'Cancelled' || b.status === 'NoResponse' || b.status === 4 || b.status === 5;
    });

    const handleApprove = async (bookingId) => {
        setActionLoading(prev => ({ ...prev, [bookingId]: 'approve' }));
        try {
            await bookingService.approveBooking(bookingId);
            onRefresh();
        } catch (e) {
            setActionError(prev => ({ ...prev, [bookingId]: e.message || 'Lỗi khi chấp nhận.' }));
        } finally {
            setActionLoading(prev => ({ ...prev, [bookingId]: null }));
        }
    };

    const handleRejectClick = (booking) => {
        setRejectingBooking(booking);
        setShowRejectionModal(true);
    };

    const handleConfirmReject = async (reason) => {
        if (!rejectingBooking) return;
        setActionLoading(prev => ({ ...prev, [rejectingBooking.id]: 'reject' }));
        setActionError(prev => ({ ...prev, [rejectingBooking.id]: null }));
        try {
            await bookingService.rejectBooking(rejectingBooking.id, reason);
            onRefresh();
            setShowRejectionModal(false);
            setRejectingBooking(null);
        } catch (e) {
            setActionError(prev => ({
                ...prev,
                [rejectingBooking.id]: e.message || 'Không thể từ chối booking. Vui lòng thử lại.'
            }));
            // Keep modal open so user can retry with corrected reason if needed
        } finally {
            setActionLoading(prev => ({ ...prev, [rejectingBooking?.id]: null }));
        }
    };

    const handleCancelReject = () => {
        setShowRejectionModal(false);
        setRejectingBooking(null);
    };

    const handleOpenChat = async (booking) => {
        setChatLoading(prev => ({ ...prev, [booking.id]: true }));
        try {
            const session = await chatService.openBookingSession(booking.id);
            const chatData = session?.data || session || {};
            // For Advisor, the other party is the customer
            const otherPartyTitle = chatData.customerFullName || chatData.customerName || chatData.startupName || chatData.investorName || booking.projectName || `Booking #${booking.id}`;
            const otherPartyHandle = chatData.customerName || chatData.startupName || chatData.investorName;

            setChatSession({
                chatSessionId: chatData.chatSessionId || session.chatSessionId,
                displayName: otherPartyTitle,
                handle: otherPartyHandle,
                currentUserId: user?.userId,
                sentTime: chatData.startTime || session.startTime || new Date().toISOString(),
            });
        } catch (e) {
            console.error('Cannot open booking chat session:', e);
        } finally {
            setChatLoading(prev => ({ ...prev, [booking.id]: false }));
        }
    };

    const renderColumn = (title, items, statusId) => {
        if (isMobile && activeMobileTab !== statusId) return null;
        return (
            <div className={avStyles.bcol}>
                {!isMobile && (
                    <div className={`${avStyles.bcolHead} ${avStyles[statusId]}`}>
                        <div className={avStyles.bcolTitle}>
                            {statusId === 'mixed' ? (
                                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                    <div className={`${avStyles.bctDot} ${avStyles.comp}`}></div>
                                    <div className={`${avStyles.bctDot} ${avStyles.complaint}`}></div>
                                </div>
                            ) : (
                                <div className={`${avStyles.bctDot} ${avStyles[statusId]}`}></div>
                            )}
                            {title}
                        </div>
                        <div className={`${avStyles.bcolN} ${avStyles[statusId]}`}>{items.length}</div>
                    </div>
                )}
                <div className={avStyles.bcolCards}>
                    {loading ? (
                        <KanbanSkeleton count={3} />
                    ) : items.length === 0 ? (
                        <EmptyState icon={FileText} title="Trống" message={`Không có booking nào ở trạng thái ${title.toLowerCase()}`} />
                    ) : (
                        items.map(b => (
                            <AdvisorBookingKanbanCard
                                key={b.id}
                                booking={b}
                                isActioning={actionLoading[b.id]}
                                onDetail={() => setSelectedBooking(b)}
                                onApprove={() => handleApprove(b.id)}
                                onReject={() => handleRejectClick(b)}
                                onChat={() => handleOpenChat(b)}
                                isChatLoading={!!chatLoading[b.id]}
                                onReport={() => setReportModal({ bookingId: b.id, advisorName: b.customerName, userRole: 'Advisor' })}
                            />
                        ))
                    )}
                </div>
            </div>
        );
    };

    return (
        <>
            <div className={styles.section} style={{ background: 'transparent', boxShadow: 'none', padding: 0, flex: 1, display: 'flex', flexDirection: 'column' }}>
                {/* Mobile Tab Switcher */}
                {isMobile && (
                    <div className={avStyles.tabSwitcherWrapper}>
                        {showLeftTabIndicator && <div className={`${avStyles.scrollIndicator} ${avStyles.scrollIndicatorLeft}`} />}
                        <div
                            className={avStyles.mobileTabSwitcher}
                            data-tabs="4"
                            ref={tabSwitcherRef}
                            onScroll={checkTabScroll}
                        >
                            <button className={`${avStyles.mobileTab} ${activeMobileTab === 'pend' ? avStyles.activeMobileTab : ''}`} onClick={() => setActiveMobileTab('pend')} data-status="pend">
                                <div className={`${avStyles.bctDot} ${avStyles.pend}`}></div>
                                <span>Chờ thanh toán</span>
                                <span className={avStyles.mobileTabCount}>{groupPending.length}</span>
                            </button>
                            <button className={`${avStyles.mobileTab} ${activeMobileTab === 'conf' ? avStyles.activeMobileTab : ''}`} onClick={() => setActiveMobileTab('conf')} data-status="conf">
                                <div className={`${avStyles.bctDot} ${avStyles.conf}`}></div>
                                <span>Đã xác nhận</span>
                                <span className={avStyles.mobileTabCount}>{groupConfirmed.length}</span>
                            </button>
                            <button className={`${avStyles.mobileTab} ${activeMobileTab === 'mixed' ? avStyles.activeMobileTab : ''}`} onClick={() => setActiveMobileTab('mixed')} data-status="mixed">
                                <div style={{ display: 'flex', gap: '3px' }}>
                                    <div className={`${avStyles.bctDot} ${avStyles.comp}`}></div>
                                    <div className={`${avStyles.bctDot} ${avStyles.complaint}`}></div>
                                </div>
                                <span style={{ marginLeft: '4px' }}>Hoàn thành & Khiếu nại</span>
                                <span className={avStyles.mobileTabCount}>{groupDone.length}</span>
                            </button>
                            <button className={`${avStyles.mobileTab} ${activeMobileTab === 'canc' ? avStyles.activeMobileTab : ''}`} onClick={() => setActiveMobileTab('canc')} data-status="rej">
                                <div className={`${avStyles.bctDot} ${avStyles.rej}`}></div>
                                <span>Đã hủy</span>
                                <span className={avStyles.mobileTabCount}>{groupCancelled.length}</span>
                            </button>
                        </div>
                        {showRightTabIndicator && <div className={`${avStyles.scrollIndicator} ${avStyles.scrollIndicatorRight}`} />}
                    </div>
                )}

                <div className={avStyles.boardGrid}>
                    {renderColumn('Chờ thanh toán', groupPending, 'pend')}
                    {renderColumn('Đã xác nhận', groupConfirmed, 'conf')}
                    {renderColumn('Hoàn thành & Khiếu nại', groupDone, 'mixed')}
                    {renderColumn('Đã hủy', groupCancelled, 'rej')}
                </div>
            </div>

            {selectedBooking && (
                <BookingDetailModal
                    booking={selectedBooking}
                    onClose={() => setSelectedBooking(null)}
                    userRole="Advisor"
                    onAction={(act, b) => {
                        if (act === 'approve') handleApprove(b.id);
                        if (act === 'reject') {
                            handleRejectClick(b);
                            setSelectedBooking(null);
                        }
                        if (act === 'chat') handleOpenChat(b);
                        if (act === 'report') setReportModal({ bookingId: b.id, advisorName: b.customerName, userRole: 'Advisor' });
                        if (act === 'viewComplaint') {
                            setSelectedReportForView(b);
                            setSelectedBooking(null);
                        }
                        if (act !== 'reject') setSelectedBooking(null);
                    }}
                />
            )}

            {/* Booking Rejection Modal for IncomingBookingsSection */}
            {showRejectionModal && rejectingBooking && createPortal(
                <BookingRejectionModal
                    booking={rejectingBooking}
                    onSubmit={handleConfirmReject}
                    onCancel={handleCancelReject}
                    submitError={actionError[rejectingBooking.id]}
                />,
                document.body
            )}

            {reportModal && (
                <ConsultingReportModal
                    bookingId={reportModal.bookingId}
                    userRole={reportModal.userRole}
                    advisorName={reportModal.advisorName}
                    onClose={() => setReportModal(null)}
                    onDone={() => { setReportModal(null); onRefresh(); }}
                />
            )}

            {selectedReportForView && (
                <UserReportStatusModal
                    report={selectedReportForView}
                    onClose={() => setSelectedReportForView(null)}
                />
            )}

            <FloatingChatWidget
                chatSessionId={chatSession?.chatSessionId}
                displayName={chatSession?.displayName}
                currentUserId={chatSession?.currentUserId}
                sentTime={chatSession?.sentTime}
                onClose={() => setChatSession(null)}
            />
        </>
    );
}

function AvailabilitySection({ availabilities, loading, onRefresh }) {
    const todayVal = new Date();
    const todayStr = `${todayVal.getFullYear()}-${String(todayVal.getMonth() + 1).padStart(2, '0')}-${String(todayVal.getDate()).padStart(2, '0')}`;
    const [selectedDate, setSelectedDate] = useState(todayStr);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [showAddSlotModal, setShowAddSlotModal] = useState(false);
    const [modalDate, setModalDate] = useState(todayStr);
    const [modalMonth, setModalMonth] = useState(new Date());
    const [isClosingAddSlotModal, setIsClosingAddSlotModal] = useState(false);
    const [showMobileCalendar, setShowMobileCalendar] = useState(false);
    const [formData, setFormData] = useState({ startTime: '08:00', endTime: '17:00' });
    const [formError, setFormError] = useState(null);
    const [formSubmitting, setFormSubmitting] = useState(false);
    const [previewSlots, setPreviewSlots] = useState([]);
    const [deletingId, setDeletingId] = useState(null);
    const [deleteError, setDeleteError] = useState(null);
    const [hasInitializedDate, setHasInitializedDate] = useState(false);
    const [isClosingMobileCalendar, setIsClosingMobileCalendar] = useState(false);

    const closeMobileCalendar = () => {
        setIsClosingMobileCalendar(true);
        setTimeout(() => {
            setShowMobileCalendar(false);
            setIsClosingMobileCalendar(false);
        }, 300);
    };

    useEffect(() => {
        if (!loading && availabilities.length > 0 && !hasInitializedDate) {
            const todayObj = new Date();
            todayObj.setHours(0, 0, 0, 0);

            const datesWithSlots = [...new Set(availabilities.map(s => s.slotDate?.split('T')[0]))]
                .filter(d => !!d)
                .map(d => ({ str: d, date: new Date(d + 'T00:00:00') }))
                .filter(d => d.date >= todayObj)
                .sort((a, b) => a.date - b.date);

            if (datesWithSlots.length > 0) {
                setSelectedDate(datesWithSlots[0].str);
                setCurrentMonth(datesWithSlots[0].date);
            }
            setHasInitializedDate(true);
        }
    }, [loading, availabilities, hasInitializedDate]);

    const hourOptions = Array.from({ length: 18 }, (_, i) => {
        const h = i + 6;
        return `${String(h).padStart(2, '0')}:00`;
    });

    const timeOptions = hourOptions.map(h => ({ value: h, label: h }));

    useEffect(() => {
        const startH = parseInt(formData.startTime.split(':')[0]);
        const endH = parseInt(formData.endTime.split(':')[0]);
        if (endH <= startH) { setPreviewSlots([]); return; }
        const slots = [];
        for (let h = startH; h < endH; h++) {
            slots.push({ start: `${String(h).padStart(2, '0')}:00`, end: `${String(h + 1).padStart(2, '0')}:00` });
        }
        setPreviewSlots(slots);
    }, [formData.startTime, formData.endTime]);

    const closeAddSlotModal = () => {
        setIsClosingAddSlotModal(true);
        setTimeout(() => {
            setShowAddSlotModal(false);
            setIsClosingAddSlotModal(false);
            setFormError(null);
        }, 300);
    };

    const handleOpenAddSlot = () => {
        setModalDate(selectedDate);
        setModalMonth(new Date(currentMonth));
        setShowAddSlotModal(true);
    };

    const handleCreate = async () => {
        setFormError(null);
        if (previewSlots.length === 0) { setFormError('Thời gian kết thúc phải sau thời gian bắt đầu.'); return; }

        setFormSubmitting(true);
        try {
            await Promise.all(
                previewSlots.map(s =>
                    advisorAvailabilityService.createMyAvailability({
                        slotDate: modalDate,
                        startTime: `${s.start}:00`,
                        endTime: `${s.end}:00`,
                    })
                )
            );
            closeAddSlotModal();
            onRefresh();
        } catch (e) {
            setFormError(e.message || 'Không thể tạo lịch rảnh.');
        } finally {
            setFormSubmitting(false);
        }
    };

    const handleDelete = async (slotId, isBooked) => {
        if (isBooked) return;
        setDeletingId(slotId);
        setDeleteError(null);
        try {
            await advisorAvailabilityService.deleteMyAvailability(slotId);
            onRefresh();
        } catch (e) {
            setDeleteError(e.message || 'Không thể xóa slot.');
        } finally {
            setDeletingId(null);
        }
    };

    const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

    const changeMonth = (offset) => {
        const next = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + offset, 1);
        setCurrentMonth(next);
    };

    const renderCalendar = (
        targetMonth = currentMonth,
        targetSelectedDate = selectedDate,
        onSelectDate = setSelectedDate,
        onCloseModal = null
    ) => {
        const year = targetMonth.getFullYear();
        const month = targetMonth.getMonth();
        const daysInMonth = getDaysInMonth(year, month);
        const firstDay = getFirstDayOfMonth(year, month);

        const days = [];
        for (let i = 0; i < firstDay; i++) {
            days.push(<div key={`empty-${i}`} className={`${styles.calendarDay} ${styles.dayEmpty}`}></div>);
        }

        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const isSelected = targetSelectedDate === dateStr;
            const isToday = todayStr === dateStr;
            const hasSlots = availabilities.some(s => s.slotDate?.split('T')[0] === dateStr);

            days.push(
                <div
                    key={d}
                    className={`${styles.calendarDay} ${isSelected ? styles.daySelected : ''} ${isToday ? styles.dayToday : ''}`}
                    onClick={() => {
                        onSelectDate(dateStr);
                        if (onCloseModal && window.innerWidth <= 850) {
                            onCloseModal();
                        }
                    }}
                >
                    <div className={styles.dayInner}>{d}</div>
                    {hasSlots && <div className={styles.dotIndicator}></div>}
                </div>
            );
        }
        return days;
    };

    const currentDaySlots = availabilities
        .filter(s => s.slotDate?.split('T')[0] === selectedDate)
        .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));

    const displayDateLabel = new Date(selectedDate + 'T00:00:00').toLocaleDateString('vi-VN', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    const CalendarComponent = ({
        extraClass = '',
        extraStyle = {},
        month = currentMonth,
        selected = selectedDate,
        onSelect = setSelectedDate,
        onMonthChange = (offset) => {
            const next = new Date(month.getFullYear(), month.getMonth() + offset, 1);
            setCurrentMonth(next);
        },
        onCloseModal = null
    }) => (
        <div className={`${styles.calendarContainer} ${extraClass}`} style={extraStyle}>
            <div className={styles.calendarHeader}>
                <div className={styles.monthLabel}>
                    {month.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' }).replace(/^t/, 'T')}
                </div>
                <div className={styles.calendarNav}>
                    <button className={styles.navBtn} onClick={(e) => { e.stopPropagation(); onMonthChange(-1); }}><ChevronLeft size={18} /></button>
                    <button className={styles.navBtn} onClick={(e) => { e.stopPropagation(); onMonthChange(1); }}><ChevronRight size={18} /></button>
                </div>
            </div>
            <div className={styles.calendarGrid}>
                {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map(d => (
                    <div key={d} className={styles.weekdayLabel}>{d}</div>
                ))}
                {renderCalendar(month, selected, onSelect, onCloseModal)}
            </div>
        </div>
    );

    if (loading) {
        return (
            <div className={styles.section}>
                {/* Mobile-only date bar skeleton */}
                <div className={`${styles.mobileDateSelector} ${styles.skeleton}`} style={{ border: 'none', height: '54px', marginBottom: '16px' }}></div>

                <div className={styles.availabilityLayout}>
                    {/* Desktop Calendar Skeleton */}
                    <div className={`${styles.calendarContainer} ${styles.desktopOnly}`} style={{ background: 'transparent', border: '1px solid var(--border-color)' }}>
                        <div className={styles.calendarHeader} style={{ paddingBottom: '12px', borderBottom: '1px solid var(--border-color)', marginBottom: '12px' }}>
                            <div className={`${styles.skeleton}`} style={{ width: '120px', height: '20px' }}></div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <div className={`${styles.skeleton}`} style={{ width: '28px', height: '28px', borderRadius: '8px' }}></div>
                                <div className={`${styles.skeleton}`} style={{ width: '28px', height: '28px', borderRadius: '8px' }}></div>
                            </div>
                        </div>
                        <div className={styles.calendarGrid}>
                            {[...Array(7)].map((_, i) => (
                                <div key={`w-${i}`} className={`${styles.skeleton}`} style={{ width: '24px', height: '10px', margin: '4px auto 12px', borderRadius: '2px' }}></div>
                            ))}
                            {[...Array(35)].map((_, i) => (
                                <div key={`d-${i}`} className={`${styles.calendarDay}`}>
                                    <div className={`${styles.skeleton}`} style={{ width: '32px', height: '32px', borderRadius: '50%' }}></div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Slots List Skeleton */}
                    <div className={styles.slotsSection}>
                        <div className={styles.slotsHeader}>
                            <div className={`${styles.skeleton}`} style={{ width: '180px', height: '24px' }}></div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <div className={`${styles.skeleton}`} style={{ width: '42px', height: '36px', borderRadius: '10px' }}></div>
                                <div className={`${styles.skeleton}`} style={{ width: '130px', height: '36px', borderRadius: '10px' }}></div>
                            </div>
                        </div>
                        <div className={styles.slotsList} style={{ gap: '16px', marginTop: '20px' }}>
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className={`${styles.slotItemStyled} ${styles.skeleton}`} style={{ height: '78px', border: 'none', background: 'var(--bg-secondary)', opacity: 1 - (i * 0.15) }}></div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.section}>
            <div className={styles.mobileDateSelector} onClick={() => setShowMobileCalendar(true)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Calendar size={20} color="var(--primary-blue)" />
                    <span style={{ fontWeight: 700 }}>{displayDateLabel}</span>
                </div>
                <ChevronDown size={20} />
            </div>

            {showMobileCalendar && createPortal(
                <div className={`${styles.modalOverlay} ${isClosingMobileCalendar ? styles.fadeOutOverlay : ''}`} onClick={closeMobileCalendar}>
                    <div className={`${styles.modalContent} ${isClosingMobileCalendar ? styles.slideDownContent : ''}`} onClick={e => e.stopPropagation()}>
                        <div className={styles.calendarModalHeader}>
                            <h4 className={styles.calendarModalTitle}>Chọn ngày</h4>
                            <button className={styles.calendarModalCloseBtn} onClick={closeMobileCalendar}><X size={18} /></button>
                        </div>
                        <CalendarComponent
                            extraClass={styles.calendarInModal}
                            extraStyle={{ '--day-size': 'calc((100vw - 40px) / 7)', '--day-font-size': '16px' }}
                        />
                    </div>
                </div>,
                document.body
            )}

            {showAddSlotModal && createPortal(
                <div className={`${styles.modalOverlay} ${isClosingAddSlotModal ? styles.fadeOutOverlay : ''}`} onClick={closeAddSlotModal}>
                    <div className={`${styles.modalContent} ${isClosingAddSlotModal ? styles.slideDownContent : ''}`} onClick={e => e.stopPropagation()}>
                        <div className={styles.calendarModalHeader}>
                            <h4 className={styles.calendarModalTitle}>Thêm lịch rảnh</h4>
                            <button className={styles.calendarModalCloseBtn} onClick={closeAddSlotModal}><X size={18} /></button>
                        </div>

                        <div className={styles.addSlotBody}>
                            <div className={styles.miniCalendarSection}>
                                <div className={styles.miniCalendarHeader}>
                                    <span className={styles.miniCalendarSub}>Chọn ngày và thiết lập khung giờ rảnh</span>
                                    <span className={styles.miniCalendarDate}>
                                        {new Date(modalDate + 'T00:00:00').toLocaleDateString('vi-VN', { weekday: 'long', month: 'long', day: 'numeric' })}
                                    </span>
                                </div>
                                <CalendarComponent
                                    extraClass={styles.miniCalendarInModal}
                                    selected={modalDate}
                                    onSelect={setModalDate}
                                    month={modalMonth}
                                    onMonthChange={(offset) => {
                                        const next = new Date(modalMonth.getFullYear(), modalMonth.getMonth() + offset, 1);
                                        setModalMonth(next);
                                    }}
                                />
                            </div>

                            <div className={styles.timeSelectionRow}>
                                <div className={styles.formField}>
                                    <label className={styles.fieldLabel}>Từ thời gian</label>
                                    <CustomSelect
                                        value={formData.startTime}
                                        onChange={e => setFormData(p => ({ ...p, startTime: e.target.value }))}
                                        options={timeOptions.slice(0, -1)}
                                    />
                                </div>
                                <div className={styles.formField}>
                                    <label className={styles.fieldLabel}>Đến thời gian</label>
                                    <CustomSelect
                                        value={formData.endTime}
                                        onChange={e => setFormData(p => ({ ...p, endTime: e.target.value }))}
                                        options={timeOptions.slice(1)}
                                    />
                                </div>
                            </div>

                            {formError && <div className={styles.formError} style={{ margin: '0 24px 16px' }}><AlertCircle size={14} /><span>{formError}</span></div>}
                        </div>

                        <div className={styles.addSlotFooter}>
                            <button className={styles.secondaryBtn} onClick={closeAddSlotModal} style={{ flex: 1, padding: '14px' }}>Hủy</button>
                            <button className={styles.primaryBtn} onClick={handleCreate} disabled={formSubmitting} style={{ flex: 1.5, padding: '14px' }}>
                                {formSubmitting ? 'Đang tạo...' : `Xác nhận tạo ${previewSlots.length} slot`}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            <div className={styles.availabilityLayout}>
                <div className={styles.desktopOnly}>
                    <CalendarComponent />
                </div>

                <div className={styles.slotsSection}>
                    <div className={styles.slotsHeader}>
                        <div className={styles.slotsTitle}>{displayDateLabel}</div>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button className={styles.secondaryBtn} onClick={onRefresh} style={{ padding: '6px 12px', fontSize: '12px' }}>
                                <Loader size={12} className={loading ? styles.spinIcon : ''} />
                            </button>
                            <button className={styles.primaryBtn} onClick={handleOpenAddSlot} style={{ padding: '8px 16px', fontSize: '13px', minWidth: 'auto' }}>
                                <PlusCircle size={16} />
                                Thêm lịch
                            </button>
                        </div>
                    </div>


                    <div className={styles.slotsList}>
                        {currentDaySlots.length === 0 ? (
                            <div className={styles.emptyState} style={{ gridColumn: '1 / -1', padding: '80px 20px' }}>
                                <Calendar size={48} color="var(--text-secondary)" opacity={0.3} />
                                <p style={{ fontSize: '15px', fontWeight: 600 }}>Không có lịch rảnh trong ngày này.</p>
                                <button className={styles.primaryBtn} onClick={handleOpenAddSlot} style={{ marginTop: 8 }}>+ Thêm lịch rảnh</button>
                            </div>
                        ) : (
                            currentDaySlots.map(slot => {
                                const isBooked = slot.status === 1 || slot.status === 'Booked';
                                const isDeleting = deletingId === slot.advisorAvailabilityId;
                                return (
                                    <div
                                        key={slot.advisorAvailabilityId}
                                        className={`${styles.slotItemStyled} ${isBooked ? styles.slotBookedStyled : styles.slotAvailableStyled}`}
                                    >
                                        <div className={styles.slotTimeRow}>
                                            <span className={styles.slotTimeText}>
                                                {slot.startTime?.slice(0, 5)} – {slot.endTime?.slice(0, 5)}
                                            </span>
                                            <div className={styles.slotFooter}>
                                                <span className={`${styles.badge} ${isBooked ? styles.badgeInfo : styles.badgeSuccess}`} style={{ fontSize: 10, padding: '2px 8px', minWidth: '60px', textAlign: 'center' }}>
                                                    {isBooked ? 'Đã đặt' : 'Rảnh'}
                                                </span>
                                            </div>
                                        </div>
                                        <button
                                            className={styles.slotDeleteBtn}
                                            onClick={() => handleDelete(slot.advisorAvailabilityId, isBooked)}
                                            disabled={isBooked || isDeleting}
                                            title={isBooked ? "Không thể xóa slot đã đặt" : "Xóa slot"}
                                        >
                                            {isDeleting ? <Loader size={14} className={styles.spinIcon} /> : <Trash2 size={16} />}
                                        </button>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>
            {deleteError && <div style={{ marginTop: 12, color: '#f4212e', fontSize: 13, display: 'flex', gap: 8 }}><AlertCircle size={14} />{deleteError}</div>}
        </div>
    );
}

function ReportsSection() {
    return (
        <div className={styles.section}>
            <div className={styles.card}>
                <div className={styles.cardHeader}>
                    <h3 className={styles.cardTitle}>Báo cáo tư vấn</h3>
                    <button className={styles.primaryBtn} style={{ minWidth: 'auto', padding: '8px 16px', fontSize: '13px' }}>
                        <PlusCircle size={16} />
                        Tạo báo cáo
                    </button>
                </div>
                <div className={styles.emptyState}>
                    <FileText size={40} />
                    <p>Chưa có báo cáo tư vấn nào.</p>
                </div>
            </div>
        </div>
    );
}

