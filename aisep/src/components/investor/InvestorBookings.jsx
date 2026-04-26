import React, { useState, useEffect, useCallback } from 'react';
import { ChatCircleText, FileText, CheckCircle, Clock, WarningCircle, X, CreditCard, CaretRight, CircleNotch, Calendar, MagnifyingGlass, ArrowsClockwise, ShieldCheck, ShieldWarning, Gavel, Star } from '@phosphor-icons/react';
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
import FeedHeader from '../feed/FeedHeader';
import investorService from '../../services/investorService';
import InvestorStatusBanner from '../common/InvestorStatusBanner';

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
};

// Helper for literal UTC time display
const formatTimeUTC = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.getUTCHours().toString().padStart(2, '0') + ':' + 
           d.getUTCMinutes().toString().padStart(2, '0');
};

export default function InvestorBookings({ user, targetId, onViewProject, initialFilterStatus, onFilterStatusChange, onUpdateProfile }) {
    const [bookings, setBookings] = useState([]);
    const [userReports, setUserReports] = useState([]);
    const [userReviews, setUserReviews] = useState([]);
    const [loading, setLoading] = useState(true);

    // Filter & Search State
    const [filterStatus, setFilterStatus] = useState(initialFilterStatus || 'all');
    const [searchTerm, setSearchTerm] = useState('');

    // Profile Status State
    const [investorProfileStatus, setInvestorProfileStatus] = useState(null);
    const [investorProfileReason, setInvestorProfileReason] = useState(null);

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
            const [bookingRes, reportRes, reviewRes, profileRes] = await Promise.all([
                bookingService.getMyCustomerBookings('', '-Id', 1, 100).catch(() => []),
                userReportService.getMyReportsAsReporter().catch(() => []),
                reviewService.getMyReviews().catch(() => []),
                investorService.getMyProfile().catch(() => null)
            ]);
            
            const items = bookingRes?.items ?? (Array.isArray(bookingRes) ? bookingRes : []);
            setBookings(items);

            const reports = reportRes?.items ?? (Array.isArray(reportRes) ? reportRes : []);
            setUserReports(reports);

            const reviews = reviewRes?.items ?? (Array.isArray(reviewRes) ? reviewRes : []);
            setUserReviews(reviews);

            if (profileRes) {
                setInvestorProfileStatus(profileRes.status || profileRes.approvalStatus || 'Pending');
                setInvestorProfileReason(profileRes.rejectionReason);
            } else {
                setInvestorProfileStatus('Missing');
                setInvestorProfileReason(null);
            }
        } catch (error) {
            console.error('Failed to load investor bookings or profile', error);
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
        setChatLoading(prev => ({ ...prev, [booking.id]: true }));
        try {
            const result = await chatService.createOrGetBookingChat(booking.id);
            const chatData = result?.data || result || {};
            setChatSession({
                chatSessionId: chatData.chatSessionId || result.chatSessionId,
                displayName: chatData.advisorFullName || chatData.advisorName || result.advisorName || 'Cố vấn',
                handle: chatData.advisorName || result.advisorName,
                currentUserId: user?.userId,
                sentTime: chatData.startTime || result.startTime || new Date().toISOString()
            });
        } catch (error) {
            console.error('Failed to access chat', error);
        } finally {
            setChatLoading(prev => ({ ...prev, [booking.id]: false }));
        }
    };

    const handleRebook = (booking) => {
        setRebookData({
            projectId: booking.projectId,
            advisorId: booking.advisorId,
            sourceBookingId: null
        });
        setShowBookingWizard(true);
    };

    const handleRebookReplacement = (booking) => {
        setRebookData({
            projectId: booking.projectId || booking.project?.projectId,
            advisorId: null,
            sourceBookingId: booking.id || booking.bookingId
        });
        setShowBookingWizard(true);
    };

    const handleDetailAction = (action, booking) => {
        if (action === 'pay') setPaymentBooking(booking);
        if (action === 'chat') handleOpenChat(booking);
        if (action === 'rebook') handleRebookReplacement(booking);
        if (action === 'complain') setComplainBooking(booking);
        if (action === 'viewComplaint') setViewReport(booking); // Booking here is the report object
        if (action === 'report') setReportModal({ bookingId: booking.id, advisorName: booking.advisorName, userRole: 'Investor' });
        if (action === 'viewProject' && onViewProject) onViewProject(booking.projectId);
    };

    const handleClosePayment = useCallback(() => {
        setPaymentBooking(null);
    }, []);

    const handlePaymentSuccess = useCallback(() => {
        loadBookings(true); // Silent background refresh
    }, [loadBookings]);

    // Calculate Stats
    const stats = {
        total: bookings.length,
        completed: bookings.filter(b => b.status === 3 || b.status === 'Completed').length,
        confirmed: bookings.filter(b => b.status === 2 || b.status === 'Confirmed').length,
        canceled: bookings.filter(b => [4, 5, 'Cancel', 'NoResponse'].includes(b.status)).length
    };

    // Derived filtered bookings
    const filteredBookings = bookings.filter(b => {
        // Status filter
        const matchesStatus =
            filterStatus === 'all' ||
            (filterStatus === 'ApprovedAwaitingPayment' && (b.status === 1 || b.status === 'ApprovedAwaitingPayment')) ||
            (filterStatus === 'Pending' && (b.status === 0 || b.status === 'Pending')) ||
            (filterStatus === 'Completed' && (b.status === 3 || b.status === 'Completed')) ||
            (filterStatus === 'NoResponse' && (b.status === 5 || b.status === 'NoResponse')) ||
            (filterStatus === 'Cancel' && (b.status === 4 || b.status === 'Cancel')) ||
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
            {/* Unified Header matching Investor Dashboard */}
            <FeedHeader
                title="Lịch tư vấn"
                subtitle="Quản lý các buổi tư vấn với cố vấn và chuyên gia."
                showFilter={false}
                user={user}
                onOpenChat={(chatSessionId, notification) => {
                    setChatSession({
                        chatSessionId,
                        displayName: notification?.title || 'Chat mới',
                        currentUserId: user?.userId,
                        sentTime: new Date().toISOString()
                    });
                }}
                customAction={
                    <button className={styles.xRefreshIconBtn} onClick={loadBookings} disabled={loading} title="Làm mới danh sách">
                        <ArrowsClockwise size={18} className={loading ? styles.xSpin : ''} />
                    </button>
                }
            />

            <InvestorStatusBanner
                status={investorProfileStatus}
                reason={investorProfileReason}
                onUpdateProfile={onUpdateProfile}
            />

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

                {/* Toolbar: Filters Only (Search moved to Header) */}
                <div className={styles.xToolbar}>
                    <div className={styles.xFilters}>
                        {[
                            { id: 'all', label: 'Tất cả' },
                            { id: 'Pending', label: 'Chờ duyệt' },
                            { id: 'ApprovedAwaitingPayment', label: 'Chờ thanh toán' },
                            { id: 'Confirmed', label: 'Đã xác nhận' },
                            { id: 'Completed', label: 'Hoàn thành' },
                            { id: 'NoResponse', label: 'Không phản hồi' },
                            { id: 'Cancel', label: 'Đã hủy' },
                            { id: 'Complaint', label: 'Khiếu nại' }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                className={`${styles.xFilterTab} ${filterStatus === tab.id ? styles.xFilterTabActive : ''}`}
                                onClick={() => {
                                    setFilterStatus(tab.id);
                                    if (onFilterStatusChange) onFilterStatusChange(tab.id);
                                }}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
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
                                            <span className={`${styles.xStatus} ${styles[statusInfo.cls]}`} style={{ background: 'transparent', border: `1px solid ${statusInfo.color}`, color: statusInfo.color }}>
                                                {statusInfo.label}
                                            </span>
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
                                            >
                                                Chi tiết <CaretRight size={14} />
                                            </button>

                                            {(booking.status === 1 || booking.status === 'ApprovedAwaitingPayment') && (
                                                <button className={`${styles.xActionButton} ${styles.xActionSuccess}`} onClick={() => setPaymentBooking(booking)}>
                                                    <CreditCard size={14} /> Thanh toán
                                                </button>
                                            )}

                                            {(booking.status === 2 || booking.status === 'Confirmed' || booking.status === 3 || booking.status === 'Completed') && (
                                                <button
                                                    className={`${styles.xActionButton} ${styles.xActionPrimary} ${chatLoading[booking.id || booking.bookingId] ? styles.xBtnDisabled : ''}`}
                                                    onClick={() => handleOpenChat(booking)}
                                                    disabled={!!chatLoading[booking.id || booking.bookingId]}
                                                >
                                                    {chatLoading[booking.id || booking.bookingId] ? (
                                                        <CircleNotch size={14} className={styles.spinner} weight="bold" />
                                                    ) : (
                                                        <><ChatCircleText size={14} /> Chat</>
                                                    )}
                                                </button>
                                            )}

                                            {(booking.status === 2 || booking.status === 'Confirmed' || booking.status === 3 || booking.status === 'Completed') && (
                                                <button className={styles.xActionButton} onClick={() => setReportModal({ bookingId: (booking.id || booking.bookingId), advisorName: booking.advisorName, userRole: 'Investor' })}>
                                                    <FileText size={14} /> Báo cáo
                                                </button>
                                            )}

                                            {(() => {
                                                const existingReport = userReports.find(r => String(r.bookingId) === String(booking.id || booking.bookingId));
                                                if (existingReport) {
                                                    return (
                                                        <button 
                                                            className={`${styles.xActionButton}`} 
                                                            onClick={() => setViewReport(existingReport)} 
                                                            style={{ color: 'var(--primary-blue)', background: 'rgba(29, 155, 240, 0.05)', borderColor: 'rgba(29, 155, 240, 0.2)' }}
                                                        >
                                                            <MagnifyingGlass size={14} /> Xem khiếu nại
                                                        </button>
                                                    );
                                                }
                                                if (['Confirmed', 'Completed', 2, 3].includes(booking.status)) {
                                                    return (
                                                        <button 
                                                            className={`${styles.xActionButton} ${styles.xActionDanger}`} 
                                                            onClick={() => setComplainBooking(booking)} 
                                                            style={{ color: '#f4212e' }}
                                                        >
                                                            <WarningCircle size={14} /> Khiếu nại
                                                        </button>
                                                    );
                                                }
                                                return null;
                                            })()}

                                            {(booking.status === 3 || booking.status === 'Completed') && (
                                                (() => {
                                                    const myReview = userReviews.find(r => String(r.bookingId) === String(booking.id || booking.bookingId));
                                                    if (!myReview) {
                                                        return (
                                                            <button 
                                                                className={`${styles.xActionButton} ${styles.xActionSuccess}`} 
                                                                onClick={() => setRateBooking(booking)}
                                                                style={{ background: 'rgba(23, 191, 99, 0.05)', color: '#17bf63', borderColor: 'rgba(23, 191, 99, 0.2)' }}
                                                            >
                                                                <Star size={14} weight="fill" /> Đánh giá
                                                            </button>
                                                        );
                                                    }
                                                    return (
                                                        <button 
                                                            className={styles.xPillBadge}
                                                            onClick={() => setRateBooking({ ...booking, existingReview: myReview })}
                                                            title="Xem đánh giá của bạn"
                                                        >
                                                            <CheckCircle size={14} weight="fill" /> Đã đánh giá
                                                        </button>
                                                    );
                                                })()
                                            )}

                                            {[4, 6, 7, 'ComplaintAccepted', 'Cancel', 'NoResponse'].includes(booking.status) && (
                                                <button className={`${styles.xActionButton} ${styles.xActionPrimary}`} onClick={() => handleRebookReplacement(booking)}>
                                                    <ArrowsClockwise size={14} /> Đặt lại
                                                </button>
                                            )}
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
                <FloatingChatWidget
                    chatSessionId={chatSession?.chatSessionId}
                    displayName={chatSession?.displayName}
                    currentUserId={chatSession?.currentUserId}
                    sentTime={chatSession?.sentTime}
                    onClose={() => setChatSession(null)}
                />

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
                        onClose={() => setShowBookingWizard(false)}
                        onSuccess={() => {
                            setShowBookingWizard(false);
                            loadBookings();
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

