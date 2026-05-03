import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Calendar, Clock, User, Briefcase, CreditCard, CaretRight, ChatCircleText, ArrowsClockwise, WarningCircle, FileText, Sparkle, ShieldCheck, Gavel, Info, MagnifyingGlass, Star } from '@phosphor-icons/react';
import userReportService from '../../services/userReportService';
import consultingReportService from '../../services/consultingReportService';
import reviewService from '../../services/reviewService';
import styles from './BookingDetailModal.module.css';

const STATUS_CONFIG = {
  0: { label: 'Chờ xác nhận', badgeClass: styles.badgePending },
  'Pending': { label: 'Chờ xác nhận', badgeClass: styles.badgePending },
  1: { label: 'Chờ thanh toán', badgeClass: styles.badgeConfirmed },
  'ApprovedAwaitingPayment': { label: 'Chờ thanh toán', badgeClass: styles.badgeConfirmed },
  2: { label: 'Đã xác nhận', badgeClass: styles.badgeConfirmed },
  'Confirmed': { label: 'Đã xác nhận', badgeClass: styles.badgeConfirmed },
  3: { label: 'Hoàn thành', badgeClass: styles.badgeCompleted },
  'Completed': { label: 'Hoàn thành', badgeClass: styles.badgeCompleted },
  4: { label: 'Khiếu nại chấp nhận', badgeClass: styles.badgeCompleted },
  'ComplaintAccepted': { label: 'Khiếu nại chấp nhận', badgeClass: styles.badgeCompleted },
  5: { label: 'Khiếu nại từ chối', badgeClass: styles.badgeCancelled },
  'ComplaintRejected': { label: 'Khiếu nại từ chối', badgeClass: styles.badgeCancelled },
  6: { label: 'Đã hủy', badgeClass: styles.badgeCancelled },
  'Cancel': { label: 'Đã hủy', badgeClass: styles.badgeCancelled },
  7: { label: 'Không phản hồi', badgeClass: styles.badgeCancelled },
  'NoResponse': { label: 'Không phản hồi', badgeClass: styles.badgeCancelled },
  8: { label: 'Quá hạn báo cáo', badgeClass: styles.badgeCancelled },
  'ConsultingReportOverdue': { label: 'Quá hạn báo cáo', badgeClass: styles.badgeCancelled },
  9: { label: 'Đang khiếu nại', badgeClass: styles.badgeConfirmed },
  'ComplaintPending': { label: 'Đang khiếu nại', badgeClass: styles.badgeConfirmed },
};

// Helper for literal UTC time display
const formatTimeUTC = (dateStr) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.getUTCHours().toString().padStart(2, '0') + ':' +
    d.getUTCMinutes().toString().padStart(2, '0');
};

export default function BookingDetailModal({ booking, onClose, onAction, userRole = 'Startup' }) {
  const [existingReport, setExistingReport] = useState(null);
  const [existingReview, setExistingReview] = useState(null);
  const [consultationReport, setConsultationReport] = useState(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!booking || !booking.id) return;
      
      setIsInitialLoading(true);
      setHasError(false);
      setLoadingReport(true);
      
      // Clear previous states
      setExistingReport(null);
      setConsultationReport(null);

      try {
        // Parallel fetch for reports, consultation report, and reviews
        const [reportsData, cReport, reviewsData] = await Promise.all([
          (async () => {
            try {
              if (userRole === 'Staff') return await userReportService.getAllReports();
              if (userRole === 'Advisor') return await userReportService.getMyReportsAsReported();
              if (['Startup', 'Investor'].includes(userRole)) return await userReportService.getMyReportsAsReporter();
              return null;
            } catch (err) { return null; }
          })(),
          (async () => {
            try {
              return await consultingReportService.getReportByBookingId(booking.id || booking.bookingId);
            } catch (err) { return null; }
          })(),
          (async () => {
            try {
              // Only fetch review if booking is completed
              if (![3, 'Completed'].includes(booking.status)) return null;
              
              if (['Startup', 'Investor'].includes(userRole)) {
                return await reviewService.getMyReviews();
              } else if (userRole === 'Advisor' || userRole === 'Staff') {
                const advisorId = booking.advisorId || booking.advisor?.id;
                if (advisorId) return await reviewService.getReviewsByAdvisor(advisorId);
              }
              return null;
            } catch (err) { return null; }
          })()
        ]);

        // Process User Reports (Complaints)
        if (reportsData) {
          const reportsList = Array.isArray(reportsData) ? reportsData : (reportsData?.items || []);
          const report = reportsList.find(r => 
            String(r.bookingId) === String(booking.id || booking.bookingId)
          );
          setExistingReport(report || null);
        }

        // Process Consultation Report
        if (cReport && cReport.consultingReportId) {
          setConsultationReport(cReport);
        }

        // Process Review
        if (reviewsData) {
          const reviewsList = Array.isArray(reviewsData) ? reviewsData : (reviewsData?.items || []);
          const review = reviewsList.find(r => 
            String(r.bookingId) === String(booking.id || booking.bookingId)
          );
          setExistingReview(review || null);
        }
      } catch (error) {
        console.error('Error fetching modal data:', error);
        setHasError(true);
      } finally {
        setLoadingReport(false);
        // Small artificial delay for smoothness
        setTimeout(() => setIsInitialLoading(false), 400);
      }
    };

    fetchData();
  }, [booking, userRole]);

  if (!booking) return null;

  const statusInfo = STATUS_CONFIG[booking.status] || { label: String(booking.status), badgeClass: styles.badgeConfirmed };
  const startTime = new Date(booking.startTime);
  const formattedDate = startTime.toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const timeRange = `${formatTimeUTC(booking.startTime)} – ${formatTimeUTC(booking.endTime)}`;

  const isFreeRebook = booking.isFreeRebookFromComplaint || booking.IsFreeRebookFromComplaint;
  const isPremiumFree = booking.usedPremiumFreeQuota || booking.UsedPremiumFreeQuota;
  const isFree = isFreeRebook || isPremiumFree;

  // Detailed logic: Startups see 0 if free. Staff/Advisors always see the nominal amounts + free status badge
  const showAsFreeToUser = isFree && ['Startup', 'Investor'].includes(userRole);

  const price = showAsFreeToUser ? 0 : (booking.price || booking.estimatedPrice || 0);
  const commissionPercent = booking.systemCommissionPercent || booking.commissionSnapshot || 0;
  const commissionAmount = showAsFreeToUser ? 0 : (price * commissionPercent / 100);
  const netIncome = showAsFreeToUser ? 0 : (price - commissionAmount);

  const formatPrice = (p) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(p);

  return createPortal(
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <div className={styles.header}>
          {!isInitialLoading && !hasError ? (
            <div className={styles.headerContent}>
              <h2 className={styles.headerTitleText}>
                Booking #{booking.id || booking.bookingId}
              </h2>
              <span className={`${styles.bookingBadge} ${statusInfo.badgeClass}`}>
                {statusInfo.label}
              </span>
            </div>
          ) : (
            <div style={{ flex: 1 }}></div>
          )}
          <button onClick={onClose} className={styles.closeBtn}>
            <X size={24} />
          </button>
        </div>

        {isInitialLoading ? (
          <div className={styles.fullLoadingView}>
             <div className={styles.loadingPulse}>
                <ArrowsClockwise size={48} weight="bold" className={styles.spinnerLarge} />
                <h3>Đang chuẩn bị dữ liệu...</h3>
                <p>Vui lòng đợi trong giây lát</p>
             </div>
          </div>
        ) : hasError ? (
          <div className={styles.fullLoadingView}>
             <WarningCircle size={48} weight="fill" color="#f4212e" />
             <h3 style={{ color: 'var(--text-primary)', marginTop: '16px' }}>Đã có lỗi xảy ra</h3>
             <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>Không thể tải thông tin chi tiết cho booking này.</p>
             <button 
                className={styles.primaryBtn} 
                onClick={() => {
                   setHasError(false);
                   setIsInitialLoading(true);
                   fetchData();
                }}
             >
                <ArrowsClockwise size={18} /> Thử lại ngay
             </button>
          </div>
        ) : (
          <>
        
        {/* Role-Specific Guidance Banner */}
        {(() => {
          const status = booking.status;
          const isAdvisor = userRole === 'Advisor';
          const isCustomer = ['Startup', 'Investor'].includes(userRole);
          const isStaff = userRole === 'Staff';
          const isComplaintPending = status === 9 || status === 'ComplaintPending';
          const isOverdue = status === 8 || status === 'ConsultingReportOverdue';
          const isComplaintAccepted = status === 4 || status === 'ComplaintAccepted';

          // 8: ConsultingReportOverdue
          if (isOverdue) {
            return (
              <div className={`${styles.guidanceBanner} ${styles.guidanceWarning}`}>
                <WarningCircle size={20} weight="fill" className={styles.guidanceIcon} />
                <div className={styles.guidanceContent}>
                  <strong className={styles.guidanceTitle}>Advisor đã quá hạn nộp báo cáo (24h)</strong>
                  <p className={styles.guidanceDesc}>
                    {isCustomer && "Hệ thống ghi nhận Advisor chưa nộp báo cáo kết quả đúng hạn."}
                    {isAdvisor && "Bạn đã bỏ lỡ thời hạn nộp báo cáo (24h sau khi kết thúc). Thanh toán cho booking này tạm thời bị giữ lại, vui lòng nộp báo cáo ngay."}
                    {isStaff && "Advisor này đã quá hạn nộp báo cáo. Hệ thống đã đánh dấu overdue. Staff cần kiểm tra nếu có khiếu nại từ khách hàng."}
                  </p>
                </div>
              </div>
            );
          }

          // 9: ComplaintPending
          if (isComplaintPending) {
            return (
              <div className={`${styles.guidanceBanner} ${styles.guidanceInfo}`}>
                <Info size={20} weight="fill" className={styles.guidanceIcon} />
                <div className={styles.guidanceContent}>
                  <strong className={styles.guidanceTitle}>Đang trong quá trình khiếu nại</strong>
                  <p className={styles.guidanceDesc}>
                    {isCustomer && "Yêu cầu khiếu nại của bạn đang được Staff xem xét. Phán quyết cuối cùng sẽ được cập nhật tại đây."}
                    {isAdvisor && "Khách hàng đã gửi khiếu nại cho booking này. Staff đang thực hiện đối soát nội dung tư vấn để đưa ra quyết định."}
                    {isStaff && "Booking này đang có khiếu nại chưa được giải quyết. Vui lòng truy cập mục 'Quản lý báo cáo' để xử lý."}
                  </p>
                </div>
              </div>
            );
          }

          // 4: ComplaintAccepted
          if (isComplaintAccepted) {
            return (
              <div className={`${styles.guidanceBanner} ${styles.guidanceSuccess}`}>
                <ShieldCheck size={20} weight="fill" className={styles.guidanceIcon} />
                <div className={styles.guidanceContent}>
                  <strong className={styles.guidanceTitle}>Khiếu nại đã được chấp thuận</strong>
                  <p className={styles.guidanceDesc}>
                    {isCustomer && "Staff đã xác nhận khiếu nại của bạn là hợp lệ. Bạn đã được hoàn trả 1 lượt booking miễn phí vào tài khoản."}
                    {isAdvisor && "Khiếu nại từ khách hàng đã được Staff xác nhận. Lượt booking đã được hoàn trả cho khách hàng theo chính sách hệ thống."}
                    {isStaff && "Khiếu nại đã được giải quyết thành công (Valid). Hệ thống đã tự động cộng quota refund cho khách hàng."}
                  </p>
                </div>
              </div>
            );
          }

          // 7: NoResponse + Free Booking (Any type)
          if ((status === 7 || status === 'NoResponse') && isFree) {
            return (
              <div className={`${styles.guidanceBanner} ${styles.guidanceInfo}`}>
                <Info size={20} weight="fill" className={styles.guidanceIcon} />
                <div className={styles.guidanceContent}>
                  <strong className={styles.guidanceTitle}>Lượt đặt tư vấn miễn phí sẽ được hoàn trả</strong>
                  <p className={styles.guidanceDesc}>
                    Hệ thống ghi nhận Advisor không phản hồi yêu cầu tư vấn. Lượt đặt tư vấn miễn phí của bạn sẽ được hoàn trả về tài khoản của khách hàng trong 24 tiếng.
                  </p>
                </div>
              </div>
            );
          }

          return null;
        })()}

        {/* Modal Body — Structured & Numbered */}
        <div className={styles.body}>
          {/* 1. Thông tin nhân sự */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h4 className={styles.sectionTitle}>1. Thông tin nhân sự</h4>
            <div className={styles.infoGrid}>
              <div className={styles.profileCard}>
                <span className={styles.profileLabel}>Cố vấn chuyên môn</span>
                <span className={styles.profileName} style={{ color: '#1d9bf0' }}>{booking.advisorName || 'N/A'}</span>
              </div>
              <div className={styles.profileCard}>
                <span className={styles.profileLabel}>{userRole === 'Startup' ? 'Startup / Khách hàng' : 'Nhà đầu tư / Khách hàng'}</span>
                <span className={styles.profileName} style={{ color: '#10b981' }}>
                  {booking.customerName || booking.investorName || booking.startupName || booking.projectName || (userRole === 'Startup' ? 'Dự án của bạn' : 'Khách hàng')}
                </span>
              </div>
            </div>
          </div>

          {/* 2. Thời gian tư vấn */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h4 className={styles.sectionTitle}>2. Thời gian tư vấn</h4>
            <div className={styles.profileCard} style={{ background: 'transparent' }}>
              <div className={styles.metaGrid}>
                <div className={styles.metaItem}>
                  <span className={styles.label}>Ngày tư vấn</span>
                  <span className={styles.value}><Calendar size={16} color="#1d9bf0" /> {formattedDate}</span>
                </div>
                <div className={styles.metaItem}>
                  <span className={styles.label}>Khung giờ chi tiết</span>
                  <span className={styles.value}><Clock size={16} color="#1d9bf0" /> {timeRange}</span>
                </div>
                <div className={styles.metaItem}>
                  <span className={styles.label}>Thời lượng</span>
                  <span className={styles.value}>{booking.slotCount || 1} giờ tư vấn trực tuyến</span>
                </div>
              </div>
            </div>
            <div style={{ marginTop: '8px' }}>
              <span className={styles.label} style={{ display: 'block', marginBottom: '8px' }}>Ghi chú</span>
              <div className={styles.noteBox}>
                {booking.note && booking.note.trim() ? `"${booking.note}"` : "Không có ghi chú"}
              </div>
            </div>
          </div>

          {/* 3. Chi phí & Ghi chú */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h4 className={styles.sectionTitle}>3. Chi phí</h4>

            {/* Professional Cost Breakdown Table */}
            <div style={{
              background: 'var(--bg-secondary)',
              borderRadius: '16px',
              border: '1px solid var(--border-color)',
              overflow: 'hidden'
            }}>
              <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: '600' }}>Chi phí tư vấn</span>
                  <span style={{ fontSize: '16px', color: 'var(--text-primary)', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {price === 0 ? <><Sparkle size={16} weight="fill" color="#eab308" /> Miễn phí</> : formatPrice(price)}
                  </span>
                </div>

                {(isFreeRebook) && (
                  <div style={{ padding: '8px 12px', background: 'rgba(23, 191, 99, 0.05)', borderRadius: '8px', border: '1px solid rgba(23, 191, 99, 0.1)', display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
                    <ShieldCheck size={16} weight="fill" color="#17bf63" />
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Đặt lịch lại miễn phí (Từ khiếu nại trước đó)</span>
                  </div>
                )}
                {(isPremiumFree) && (
                  <div style={{ padding: '8px 12px', background: 'rgba(234, 179, 8, 0.05)', borderRadius: '8px', border: '1px solid rgba(234, 179, 8, 0.1)', display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
                    <Gavel size={16} weight="fill" color="#eab308" />
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Booking miễn phí (Từ gói đăng ký Premium)</span>
                  </div>
                )}

                {['Advisor', 'Staff'].includes(userRole) && price > 0 && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: '600' }}>Hoa hồng hệ thống ({commissionPercent}%)</span>
                      <span style={{ fontSize: '16px', color: '#ef4444', fontWeight: '700' }}>- {formatPrice(commissionAmount)}</span>
                    </div>

                    <div style={{ height: '1px', background: 'var(--border-color)', margin: '4px 0' }} />

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '15px', color: '#10b981', fontWeight: '900' }}>Thực nhận dự kiến</span>
                      <span style={{ fontSize: '22px', color: '#10b981', fontWeight: '950' }}>{formatPrice(netIncome)}</span>
                    </div>
                  </>
                )}
              </div>

              {['Advisor', 'Staff'].includes(userRole) && (
                <div style={{
                  backgroundColor: 'rgba(29, 155, 240, 0.05)',
                  borderTop: '1px solid var(--border-color)',
                  padding: '12px 20px',
                  display: 'flex',
                  gap: '12px',
                  alignItems: 'center'
                }}>
                  <Info size={16} color="#1d9bf0" style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontStyle: 'italic', lineHeight: '1.4' }}>
                    Mức hoa hồng này là cuối cùng và sẽ được áp dụng xuyên suốt quá trình đơn hàng này được thực hiện.
                  </span>
                </div>
              )}
            </div>
          </div>

          {booking.rejectReason && [6, 7, 'Cancel', 'NoResponse'].includes(booking.status) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h4 className={styles.sectionTitle} style={{ color: '#f4212e' }}>Lý do từ chối</h4>
              <div className={styles.noteBox} style={{ borderLeft: '4px solid #f4212e', background: 'rgba(244, 33, 46, 0.05)' }}>
                {booking.rejectReason}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer — Standardized Actions */}
        <div className={styles.footer}>
          {['Startup', 'Investor'].includes(userRole) && (booking.status === 1 || booking.status === 'ApprovedAwaitingPayment') && (
            <button className={`${styles.primaryBtn} ${styles.successBtn}`} onClick={() => { onAction('pay', booking); }}>
              <CreditCard size={16} /> <span>Thanh toán phí</span>
            </button>
          )}
          {(booking.status === 2 || booking.status === 'Confirmed') && userRole !== 'Staff' && (
            <button className={styles.primaryBtn} onClick={() => { onAction('chat', booking); }}>
              <ChatCircleText size={16} /> <span>Vào phòng chat</span>
            </button>
          )}
          {['Startup', 'Investor'].includes(userRole) && [6, 7, 8, 'Cancel', 'NoResponse', 'ConsultingReportOverdue'].includes(booking.status) && (
            <button className={styles.primaryBtn} onClick={() => { onAction('rebook', booking); }}>
              <ArrowsClockwise size={16} /> <span>Tìm cố vấn thay thế</span>
            </button>
          )}

          {/* Unified Dynamic Actions Area — Rendered only when needed to prevent spacing issues */}
          {loadingReport ? (
            <div className={styles.actionSlot}>
              <div className={`${styles.loadingSmall} ${styles.fadeIn}`}>
                <ArrowsClockwise size={16} className={styles.spinner} />
                <span className={styles.loadingText}>Đang kiểm tra dữ liệu...</span>
              </div>
            </div>
          ) : (
            (existingReport || (userRole === 'Staff' && consultationReport)) && (
              <div className={styles.dynamicActions}>
                {existingReport ? (
                  <button
                    className={`${styles.secondaryBtn} ${styles.animateIn}`}
                    onClick={() => { onAction('viewComplaint', existingReport); }}
                    style={{ backgroundColor: 'rgba(29, 155, 240, 0.05)', color: 'var(--primary-blue)', border: '1px solid rgba(29, 155, 240, 0.2)' }}
                  >
                    <MagnifyingGlass size={16} /> <span>Xem khiếu nại</span>
                  </button>
                ) : (
                  ['Startup', 'Investor'].includes(userRole) && [2, 'Confirmed'].includes(booking.status) && (
                    <button
                      className={`${styles.secondaryBtn} ${styles.dangerBtn} ${styles.animateIn}`}
                      onClick={() => { onAction('complain', booking); }}
                    >
                      <WarningCircle size={16} /> <span>Khiếu nại</span>
                    </button>
                  )
                )}

                {userRole === 'Staff' && consultationReport && (
                  <button
                    className={`${styles.primaryBtn} ${styles.animateIn}`}
                    onClick={() => { onAction('viewConsultationReport', booking); }}
                    style={{ background: 'var(--primary-blue)' }}
                  >
                    <FileText size={16} /> <span>Xem báo cáo tư vấn</span>
                  </button>
                )}
              </div>
            )
          )}

          {/* View Project Button - Available for all roles if projectId exists */}
          {booking.projectId && (
            <button
              className={styles.primaryBtn}
              onClick={() => { onAction('viewProject', booking); }}
              style={{ background: '#10b981' }}
            >
              <Briefcase size={16} /> <span>Xem dự án</span>
            </button>
          )}

          {userRole === 'Advisor' && (booking.status === 2 || booking.status === 'Confirmed') && (
            <button
              className={styles.primaryBtn}
              onClick={() => { onAction('report', booking); }}
              style={{ background: '#1d9bf0' }}
            >
              <FileText size={16} /> <span>Viết báo cáo</span>
            </button>
          )}

          {/* New Actions for Completed Bookings */}
          {['Startup', 'Investor'].includes(userRole) && (booking.status === 3 || booking.status === 'Completed') && (
            <>
              <button
                className={styles.primaryBtn}
                onClick={() => { onAction('viewConsultationReport', booking); }}
                style={{ background: 'var(--primary-blue)' }}
              >
                <FileText size={16} /> <span>Xem báo cáo</span>
              </button>
              
              {!existingReview ? (
                <button
                  className={styles.primaryBtn}
                  onClick={() => { onAction('rate', booking); }}
                  style={{ background: '#f59e0b' }}
                >
                  <Star size={16} weight="fill" /> <span>Viết đánh giá</span>
                </button>
              ) : (
                <button
                  className={styles.secondaryBtn}
                  onClick={() => { onAction('viewReview', { ...booking, existingReview }); }}
                  style={{ borderColor: '#f59e0b', color: '#f59e0b' }}
                >
                  <Star size={16} weight="fill" /> <span>Xem đánh giá</span>
                </button>
              )}
            </>
          )}

          {/* View Review for Advisor/Staff if already reviewed */}
          {['Advisor', 'Staff'].includes(userRole) && existingReview && (
            <button
              className={styles.secondaryBtn}
              onClick={() => { onAction('viewReview', { ...booking, existingReview }); }}
              style={{ borderColor: '#f59e0b', color: '#f59e0b' }}
            >
              <Star size={16} weight="fill" /> <span>Xem đánh giá</span>
            </button>
          )}


          {userRole === 'Advisor' && (booking.status === 0 || booking.status === 'Pending') && (
            <>
              <button
                className={`${styles.secondaryBtn} ${styles.dangerBtn}`}
                onClick={() => { onAction('reject', booking); }}
                style={{ color: '#f4212e', borderColor: 'rgba(244, 33, 46, 0.2)' }}
              >
                <span>Từ chối</span>
              </button>
              <button
                className={styles.primaryBtn}
                onClick={() => { onAction('approve', booking); }}
                style={{ background: '#1d9bf0' }}
              >
                <span>Phê duyệt</span>
              </button>
            </>
          )}
          <button onClick={onClose} className={styles.secondaryBtn}>
            <X size={20} /> <span>Đóng</span>
          </button>
        </div>
        </>
        )}
      </div>
    </div>,
    document.body
  );
}
