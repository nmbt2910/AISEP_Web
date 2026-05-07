import React, { useState, useEffect, useCallback } from 'react';
import { ChatCircleText, FileText, CheckCircle, Clock, WarningCircle, X, CreditCard, CaretRight, CircleNotch, Calendar, MagnifyingGlass, ArrowsClockwise, ShieldCheck, ShieldWarning, Gavel, Star, Sparkle } from '@phosphor-icons/react';
import styles from '../../styles/SharedDashboard.module.css';
import bookingService from '../../services/bookingService';
import chatService from '../../services/chatService';
import userReportService from '../../services/userReportService';
import signalRService from '../../services/signalRService';
import ConsultingReportModal from '../booking/ConsultingReportModal';
import FloatingChatWidget from '../common/FloatingChatWidget';
import PaymentModal from '../booking/PaymentModal';
import BookingWizard from '../booking/BookingWizard';
import BookingDetailModal from '../booking/BookingDetailModal';
import UserReportModal from '../booking/UserReportModal';
import UserReportStatusModal from '../booking/UserReportStatusModal';
import reviewService from '../../services/reviewService';
import ReviewModal from '../booking/ReviewModal';
import DashboardStatusFilter from '../common/DashboardStatusFilter';

const BOOKING_STATUS_LABELS = {
    0: { label: 'Chờ xác nhận', cls: 'badgePending', color: 'var(--text-secondary)' },
    'Pending': { label: 'Chờ xác nhận', cls: 'badgePending', color: 'var(--text-secondary)' },
    1: { label: 'Chờ thanh toán', cls: 'badgeInfo', color: '#1d9bf0' },
    'ApprovedAwaitingPayment': { label: 'Chờ thanh toán', cls: 'badgeInfo', color: '#1d9bf0' },
    2: { label: 'Đã xác nhận', cls: 'badgeSuccess', color: '#1d9bf0' },
    'Confirmed': { label: 'Đã xác nhận', cls: 'badgeSuccess', color: '#1d9bf0' },
    3: { label: 'Hoàn thành', cls: 'badgeSuccess', color: '#17bf63' },
    'Completed': { label: 'Hoàn thành', cls: 'badgeSuccess', color: '#17bf63' },
    4: { label: 'Khiếu nại chấp nhận', cls: 'badgeSuccess', color: '#17bf63' },
    'ComplaintAccepted': { label: 'Khiếu nại chấp nhận', cls: 'badgeSuccess', color: '#17bf63' },
    5: { label: 'Khiếu nại từ chối', cls: 'badgeError', color: '#f4212e' },
    'ComplaintRejected': { label: 'Khiếu nại từ chối', cls: 'badgeError', color: '#f4212e' },
    6: { label: 'Đã hủy', cls: 'badgeError', color: '#f4212e' },
    'Cancel': { label: 'Đã hủy', cls: 'badgeError', color: '#f4212e' },
    7: { label: 'Không phản hồi', cls: 'badgeError', color: '#f4212e' },
    'NoResponse': { label: 'Không phản hồi', cls: 'badgeError', color: '#f4212e' },
    8: { label: 'Quá hạn báo cáo', cls: 'badgeError', color: '#f4212e' },
    'ConsultingReportOverdue': { label: 'Quá hạn báo cáo', cls: 'badgeError', color: '#f4212e' },
    9: { label: 'Đang khiếu nại', cls: 'badgeInfo', color: '#1d9bf0' },
    'ComplaintPending': { label: 'Đang khiếu nại', cls: 'badgeInfo', color: '#1d9bf0' },
};

const FILTER_OPTIONS = [
    { id: 'all', label: 'Tất cả' },
    { id: 'Pending', label: 'Chờ duyệt' },
    { id: 'ApprovedAwaitingPayment', label: 'Chờ thanh toán' },
    { id: 'Confirmed', label: 'Đã xác nhận' },
    { id: 'Completed', label: 'Hoàn thành' },
    { id: 'NoResponse', label: 'Không phản hồi' },
    { id: 'Cancel', label: 'Đã hủy' },
    { id: 'Complaint', label: 'Khiếu nại' }
];

export default function InvestorBookings({ user, targetId, onViewProject, onOpenChat, initialFilterStatus, onFilterStatusChange, onUpdateProfile, isApproved, onRestrictedAction }) {
    const [bookings, setBookings] = useState([]);
    const [userReports, setUserReports] = useState([]);
    const [userReviews, setUserReviews] = useState([]);
    const [loading, setLoading] = useState(true);

    // Filter & Search State
    const [filterStatus, setFilterStatus] = useState(initialFilterStatus || 'all');
    const [searchTerm, setSearchTerm] = useState('');

    // UI state
    const [reportModal, setReportModal] = useState(null);
    const [chatSession, setChatSession] = useState(null);
    const [chatLoading, setChatLoading] = useState({});
    const [paymentBooking, setPaymentBooking] = useState(null);
    const [detailBooking, setDetailBooking] = useState(null);
    const [complainBooking, setComplainBooking] = useState(null);
    const [rateBooking, setRateBooking] = useState(null);
    const [viewReport, setViewReport] = useState(null);

    // Booking Wizard State (for re-booking)
    const [showBookingWizard, setShowBookingWizard] = useState(false);
    const [rebookData, setRebookData] = useState({ projectId: null, advisorId: null, sourceBookingId: null });

    // Deep Linking State Tracking
    const [hasAttemptedDeepLink, setHasAttemptedDeepLink] = useState(false);

    const loadBookings = useCallback(async (isSilent = false) => {
        if (!isSilent) setLoading(true);
        try {
            const [bookingRes, reportRes, reviewRes] = await Promise.all([
                bookingService.getMyCustomerBookings('', '-Id', 1, 100).catch(() => []),
                userReportService.getMyReportsAsReporter().catch(() => []),
                reviewService.getMyReviews().catch(() => [])
            ]);
            
            const items = bookingRes?.items ?? (Array.isArray(bookingRes) ? bookingRes : []);
            setBookings(items);

            const reports = reportRes?.items ?? (Array.isArray(reportRes) ? reportRes : []);
            setUserReports(reports);

            const reviews = reviewRes?.items ?? (Array.isArray(reviewRes) ? reviewRes : []);
            setUserReviews(reviews);
        } catch (error) {
            console.error('Failed to load investor bookings', error);
        } finally {
            if (!isSilent) setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadBookings();
    }, [loadBookings]);

    // Apply Deep Linking target
    useEffect(() => {
        if (targetId && bookings.length > 0 && !hasAttemptedDeepLink) {
            const match = bookings.find(b => String(b.id || b.bookingId) === String(targetId));
            if (match) {
                setDetailBooking(match);
                setHasAttemptedDeepLink(true); // Ensure it only pops open once
                console.log(`[DeepLink] Auto-opened Booking Details for ID: ${targetId}`);
            }
        }
    }, [targetId, bookings, hasAttemptedDeepLink]);

    // Initialize SignalR on mount
    useEffect(() => {
        const initSignalR = async () => {
            try {
                // Get JWT token from localStorage or auth context
                const token = localStorage.getItem('aisep_token') || sessionStorage.getItem('token');
                if (token && user?.userId) {
                    await signalRService.initialize(token);
                    console.log('[InvestorBookings] SignalR initialized successfully');
                }
            } catch (error) {
                console.error('[InvestorBookings] Failed to initialize SignalR:', error);
            }
        };

        if (user?.userId) {
            initSignalR();
        }

        // Cleanup on unmount
        return () => {
            signalRService.disconnect();
        };
    }, [user?.userId]);

    const handleOpenChat = async (booking) => {
        if (!isApproved) {
            onRestrictedAction?.('Bạn cần được phê duyệt hồ sơ Nhà đầu tư để sử dụng tính năng Chat.');
            return;
        }
        setChatLoading(prev => ({ ...prev, [booking.id]: true }));
        try {
            const result = await chatService.createOrGetBookingChat(booking.id);
            const chatData = result?.data || result || {};
            const sessionData = {
                chatSessionId: chatData.chatSessionId || result.chatSessionId,
                displayName: chatData.advisorFullName || chatData.advisorName || result.advisorName || 'Cố vấn',
                handle: chatData.advisorName || result.advisorName,
                currentUserId: user?.userId,
                sentTime: chatData.startTime || result.startTime || new Date().toISOString()
            };
            
            if (onOpenChat) {
                onOpenChat(sessionData);
            } else {
                setChatSession(sessionData);
            }
        } catch (error) {
            console.error('Failed to access chat', error);
        } finally {
            setChatLoading(prev => ({ ...prev, [booking.id]: false }));
        }
    };

    const handleRebook = (booking) => {
        if (!isApproved) {
            onRestrictedAction?.('Bạn cần được phê duyệt hồ sơ Nhà đầu tư để thực hiện Đặt lịch lại.');
            return;
        }
        setRebookData({
            projectId: booking.projectId,
            advisorId: booking.advisorId,
            sourceBookingId: null
        });
        setShowBookingWizard(true);
    };

    const handleRebookReplacement = (booking) => {
        const bId = booking.id || booking.bookingId || booking.BookingId;
        const pId = booking.projectId || booking.project?.projectId || booking.ProjectId;

        if (!isApproved) {
            onRestrictedAction?.('Bạn cần được phê duyệt hồ sơ để thực hiện Đặt lịch lại.');
            return;
        }

        if (!bId) {
            console.error('Missing Booking ID for replacement');
            return;
        }

        setRebookData({
            projectId: pId,
            advisorId: null,
            sourceBookingId: bId
        });
        setShowBookingWizard(true);
    };

    const handleDetailAction = (action, booking) => {
        if (action === 'pay') {
            if (!isApproved) {
                onRestrictedAction?.('Thanh toán buổi tư vấn');
                return;
            }
            setPaymentBooking(booking);
            setDetailBooking(null);
        }
        if (action === 'chat') {
            handleOpenChat(booking);
            setDetailBooking(null);
        }
        if (action === 'rebook') {
            handleRebookReplacement(booking);
            setDetailBooking(null);
        }
        if (action === 'complain') {
            if (!isApproved) {
                onRestrictedAction?.('Khiếu nại buổi tư vấn');
                return;
            }
            setComplainBooking(booking);
            setDetailBooking(null);
        }
        if (action === 'viewComplaint') {
            setViewReport(booking);
            setDetailBooking(null);
        }
        if (action === 'report') {
            if (!isApproved) {
                onRestrictedAction?.('Phản hồi/Báo cáo buổi tư vấn');
                return;
            }
            setReportModal({ bookingId: booking.id || booking.bookingId, advisorName: booking.advisorName, userRole: 'Investor' });
            setDetailBooking(null);
        }
        if (action === 'viewProject' && onViewProject) {
            onViewProject(booking.projectId || booking.project?.projectId || booking.ProjectId);
            setDetailBooking(null);
        }
        if (action === 'viewConsultationReport') {
            setReportModal({ bookingId: booking.id || booking.bookingId, advisorName: booking.advisorName, userRole: 'Investor' });
            setDetailBooking(null);
        }
        if (action === 'rate' || action === 'viewReview') {
            setRateBooking(booking);
            setDetailBooking(null);
        }
    };

    const handleClosePayment = useCallback(() => {
        setPaymentBooking(null);
    }, []);

    const handlePaymentSuccess = useCallback(() => {
        loadBookings(true); // Silent background refresh
    }, [loadBookings]);

    // Calculate Stats for Filter Badges
    const filterCounts = {
        all: bookings.length,
        Pending: bookings.filter(b => b.status === 0 || b.status === 'Pending').length,
        ApprovedAwaitingPayment: bookings.filter(b => b.status === 1 || b.status === 'ApprovedAwaitingPayment').length,
        Confirmed: bookings.filter(b => b.status === 2 || b.status === 'Confirmed').length,
        Completed: bookings.filter(b => b.status === 3 || b.status === 'Completed').length,
        NoResponse: bookings.filter(b => b.status === 7 || b.status === 'NoResponse').length,
        Cancel: bookings.filter(b => b.status === 6 || b.status === 'Cancel').length,
        Complaint: bookings.filter(b => userReports.some(r => String(r.bookingId) === String(b.id || b.bookingId))).length
    };

    const stats = {
        total: bookings.length,
        completed: filterCounts.Completed,
        confirmed: filterCounts.Confirmed,
        canceled: filterCounts.Cancel + filterCounts.NoResponse
    };

    // Derived filtered bookings
    const filteredBookings = bookings.filter(b => {
        // Status filter
        const matchesStatus =
            filterStatus === 'all' ||
            (filterStatus === 'ApprovedAwaitingPayment' && (b.status === 1 || b.status === 'ApprovedAwaitingPayment')) ||
            (filterStatus === 'Pending' && (b.status === 0 || b.status === 'Pending')) ||
            (filterStatus === 'Confirmed' && (b.status === 2 || b.status === 'Confirmed')) ||
            (filterStatus === 'Completed' && (b.status === 3 || b.status === 'Completed')) ||
            (filterStatus === 'NoResponse' && (b.status === 7 || b.status === 'NoResponse')) ||
            (filterStatus === 'Cancel' && (b.status === 6 || b.status === 'Cancel')) ||
            (filterStatus === 'Complaint' && userReports.some(r => String(r.bookingId) === String(b.id || b.bookingId)));

        // Search filter
        const displayProjectName = (b.projectName || b.project?.projectName || '').toLowerCase();
        const displayAdvisorName = (b.advisorName || '').toLowerCase();
        const matchesSearch = searchTerm === '' ||
            displayProjectName.includes(searchTerm.toLowerCase()) ||
            displayAdvisorName.includes(searchTerm.toLowerCase());

        return matchesStatus && matchesSearch;
    }).sort((a, b) => new Date(b.startTime || b.createdAt || 0) - new Date(a.startTime || a.createdAt || 0));

    return (
        <div className={styles.dashboardSection}>
            <div className={styles.xHeaderIsland}>
                <div className={styles.xHeaderInfo}>
                    <h1 className={styles.xHeaderTitle}>Lịch tư vấn</h1>
                    <p className={styles.xHeaderSubtitle}>
                        Bạn có {stats.total} buổi tư vấn được ghi nhận trong hệ thống.
                    </p>
                </div>
                <div className={styles.xHeaderAction}>
                    <button
                        className={styles.xRefreshIconBtn}
                        onClick={loadBookings}
                        disabled={loading}
                        title="Làm mới danh sách"
                    >
                        <ArrowsClockwise size={18} className={loading ? styles.xSpin : ''} />
                    </button>
                </div>
            </div>

            <div className={styles.dashboardContent}>

                {/* Stats Grid */}
                <div className={styles.xStatsGrid}>
                    <div className={styles.xStatCard}>
                        <span className={styles.xStatLabel}>Tổng buổi</span>
                        <span className={styles.xStatValue}>{stats.total}</span>
                    </div>
                    <div className={styles.xStatCard}>
                        <span className={styles.xStatLabel}>Hoàn thành</span>
                        <span className={styles.xStatValue} style={{ color: '#17bf63' }}>{stats.completed}</span>
                    </div>
                    <div className={styles.xStatCard}>
                        <span className={styles.xStatLabel}>Đã xác nhận</span>
                        <span className={styles.xStatValue} style={{ color: '#1d9bf0' }}>{stats.confirmed}</span>
                    </div>
                    <div className={styles.xStatCard}>
                        <span className={styles.xStatLabel}>Đã hủy</span>
                        <span className={styles.xStatValue} style={{ color: '#f4212e' }}>{stats.canceled}</span>
                    </div>
                </div>

                {/* Toolbar */}
                <div className={styles.xToolbar}>
                    <DashboardStatusFilter
                        options={FILTER_OPTIONS}
                        counts={filterCounts}
                        activeFilter={filterStatus}
                        onFilterChange={(id) => {
                            setFilterStatus(id);
                            if (onFilterStatusChange) onFilterStatusChange(id);
                        }}
                    />

                </div>

                {loading ? (
                    <div className={styles.loadingState}>
                        <CircleNotch className={styles.spinner} size={24} weight="bold" />
                        <span>Đang tải lịch tư vấn...</span>
                    </div>
                ) : filteredBookings.length === 0 ? (
                    <div className={styles.emptyState}>
                        <Clock size={40} style={{ opacity: 0.3, marginBottom: '16px' }} />
                        <p>Không tìm thấy lịch tư vấn nào phù hợp.</p>
                    </div>
                ) : (
                    <div className={styles.xBookingGrid}>
                        {filteredBookings.map(booking => {
                            const statusInfo = BOOKING_STATUS_LABELS[booking.status] || { label: String(booking.status), cls: 'badgeInfo', color: '#1d9bf0' };
                            const displayProjectName = booking.projectName || 'Dự án';
                            const displayAdvisorName = booking.advisorName || 'Cố vấn chuyên môn';
                            const startTime = new Date(booking.startTime);
                            const endTime = new Date(booking.endTime);
                            const isHighlighted = String(targetId) === String(booking.id || booking.bookingId);

                            return (
                                <div 
                                    id={`booking-${booking.id || booking.bookingId}`} 
                                    key={booking.id || booking.bookingId} 
                                    className={`${styles.xItem} ${isHighlighted ? styles.targetHighlight : ''}`} 
                                    style={{ borderRadius: '12px', border: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.01)' }}
                                >
                                    <div className={styles.xAvatar}>
                                        {displayProjectName.charAt(0).toUpperCase()}
                                    </div>

                                    <div className={styles.xContent}>
                                        <div className={styles.xHeader}>
                                            <h4 className={styles.xProjectName} style={{ fontSize: '16px' }}>{displayProjectName}</h4>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span className={`${styles.xStatus} ${styles[statusInfo.cls]}`} style={{ background: 'transparent', border: `1px solid ${statusInfo.color}`, color: statusInfo.color }}>{statusInfo.label}</span>
                                                {(booking.isPaymentWaived || booking.IsPaymentWaived || booking.usedPremiumFreeQuota || booking.UsedPremiumFreeQuota) && (
                                                    <span className={styles.xStatus} style={{ background: 'rgba(234, 179, 8, 0.1)', border: '1px solid #eab308', color: '#eab308', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        <Sparkle size={12} weight="fill" /> Miễn phí
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div style={{ color: 'var(--primary-blue)', fontWeight: '600', fontSize: '14px', marginBottom: '8px' }}>
                                            {displayAdvisorName}
                                        </div>

                                        <div className={styles.xMetaRow}>
                                            <div className={styles.xMetaItem}><Calendar size={13} /> {startTime.toLocaleDateString('vi-VN')}</div>
                                            <span className={styles.xDot}>•</span>
                                            <div className={styles.xMetaItem}>{booking.slotCount} giờ</div>
                                            {userReports.find(r => String(r.bookingId) === String(booking.id || booking.bookingId)) && (
                                                <>
                                                    <span className={styles.xDot}>•</span>
                                                    <div 
                                                        className={`${styles.xMetaItem} ${styles.badgeError}`} 
                                                        style={{ 
                                                            padding: '2px 10px',
                                                            borderRadius: '999px',
                                                            fontSize: '11px',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '4px',
                                                            fontWeight: 700
                                                        }}
                                                    >
                                                        <ShieldWarning size={13} weight="bold" /> Khiếu nại
                                                    </div>
                                                </>
                                            )}
                                        </div>

                                        <div className={styles.xActions}>
                                            <button
                                                className={styles.xActionButton}
                                                onClick={() => setDetailBooking(booking)}
                                                style={{ marginLeft: 'auto', padding: '8px 20px', borderRadius: '9999px' }}
                                            >
                                                Chi tiết <CaretRight size={14} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* ConsultingReportModal */}
                {reportModal && (
                    <ConsultingReportModal
                        bookingId={reportModal.bookingId}
                        userRole={reportModal.userRole}
                        advisorName={reportModal.advisorName}
                        onClose={() => setReportModal(null)}
                        isApproved={isApproved}
                        onRestrictedAction={onRestrictedAction}
                        onDone={(ev) => { 
                            setReportModal(null); 
                            loadBookings(true); 

                            // Automatically trigger rating if approved
                            if (ev?.type === 'approve') {
                                const b = bookings.find(x => String(x.id || x.bookingId) === String(ev.bookingId));
                                if (b) setRateBooking(b);
                            }
                        }} 
                    />
                )}

                {/* Floating Chat Widget */}
                {!onOpenChat && (
                    <FloatingChatWidget
                        chatSessionId={chatSession?.chatSessionId}
                        displayName={chatSession?.displayName}
                        currentUserId={chatSession?.currentUserId}
                        sentTime={chatSession?.sentTime}
                        onClose={() => setChatSession(null)}
                    />
                )}

                {/* Payment Modal */}
                {paymentBooking && (
                    <PaymentModal
                        bookingId={paymentBooking.id}
                        advisorName={paymentBooking.advisorName}
                        slotCount={paymentBooking.slotCount}
                        onClose={handleClosePayment}
                        onPaid={handlePaymentSuccess}
                    />
                )}

                {detailBooking && (
                    <BookingDetailModal
                        booking={detailBooking}
                        userRole="Investor"
                        onClose={() => setDetailBooking(null)}
                        onAction={handleDetailAction}
                    />
                )}

                {complainBooking && (
                    <UserReportModal 
                        bookingId={complainBooking.id} 
                        targetUserId={complainBooking.advisorId} 
                        targetUserName={complainBooking.advisorName} 
                        onClose={() => setComplainBooking(null)} 
                        onDone={() => setComplainBooking(null)} 
                    />
                )}

                {/* Booking Wizard for Re-booking */}
                {showBookingWizard && (
                    <BookingWizard
                        initialProjectId={rebookData.projectId}
                        initialAdvisorId={rebookData.advisorId}
                        sourceBookingId={rebookData.sourceBookingId}
                        user={user}
                        isApproved={isApproved}
                        onRestrictedAction={onRestrictedAction}
                        onClose={() => setShowBookingWizard(false)}
                        onSuccess={() => {
                            setShowBookingWizard(false);
                            loadBookings();
                        }}
                        onViewProject={(pid) => {
                            setShowBookingWizard(false);
                            onViewProject?.(pid);
                        }}
                    />
                )}
                {viewReport && (
                    <UserReportStatusModal
                        report={viewReport}
                        onClose={() => setViewReport(null)}
                    />
                )}
                {rateBooking && (
                    <ReviewModal
                        booking={rateBooking}
                        onClose={() => setRateBooking(null)}
                        onDone={() => {
                            setRateBooking(null);
                            loadBookings(true);
                        }}
                    />
                )}
            </div>
        </div>
    );
}

