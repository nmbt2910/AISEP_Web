import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Calendar, Clock, User, Briefcase, CreditCard, CaretRight, ChatCircleText, ArrowsClockwise, WarningCircle, FileText, Sparkle, ShieldCheck, Gavel, Info, MagnifyingGlass } from '@phosphor-icons/react';
import userReportService from '../../services/userReportService';
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
  const [loadingReport, setLoadingReport] = useState(false);

  useEffect(() => {
    const checkExistingReport = async () => {
      // Allow Startup, Investor (Reporters) and Staff, Advisor (Involved/Reviewers) to see the report
      if (!booking || !booking.id) return;
      
      setLoadingReport(true);
      try {
          let reports;
          if (userRole === 'Staff') {
            reports = await userReportService.getAllReports();
          } else if (userRole === 'Advisor') {
            reports = await userReportService.getMyReportsAsReported();
          } else if (['Startup', 'Investor'].includes(userRole)) {
            reports = await userReportService.getMyReportsAsReporter();
          } else {
            return;
          }

          const reportsList = Array.isArray(reports) ? reports : (reports?.items || []);
          const report = reportsList.find(r => 
            String(r.bookingId) === String(booking.id || booking.bookingId)
          );
          
          if (report && (report.userReportId || report.id)) {
              setExistingReport(report);
          } else {
              setExistingReport(null);
          }
      } catch (error) {
          console.error('Error checking existing report:', error);
          setExistingReport(null);
      } finally {
          setLoadingReport(false);
      }
    };

    checkExistingReport();
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
        {/* Modal Header — Replicating Staff Dashboard Style */}
        <div className={styles.header}>
          <div className={styles.headerTitleGrp}>
            <h2 className={styles.headerTitleText}>
              Booking #{booking.id || booking.bookingId}
            </h2>
            <span className={`${styles.bookingBadge} ${statusInfo.badgeClass}`}>
              {statusInfo.label}
            </span>
          </div>
          <button onClick={onClose} className={styles.closeBtn}>
            <X size={24} />
          </button>
        </div>

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

          {booking.rejectReason && [4, 5, 'Cancel', 'NoResponse'].includes(booking.status) && (
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
          <button onClick={onClose} className={styles.secondaryBtn}>
            Đóng
          </button>

          {userRole === 'Startup' && (booking.status === 1 || booking.status === 'ApprovedAwaitingPayment') && (
            <button className={`${styles.primaryBtn} ${styles.successBtn}`} onClick={() => { onAction('pay', booking); onClose(); }}>
              <CreditCard size={16} /> Thanh toán phí
            </button>
          )}
          {(booking.status === 2 || booking.status === 'Confirmed') && userRole !== 'Staff' && (
            <button className={styles.primaryBtn} onClick={() => { onAction('chat', booking); onClose(); }}>
              <ChatCircleText size={16} /> Vào phòng chat
            </button>
          )}
          {userRole === 'Startup' && [4, 5, 'Cancel', 'NoResponse'].includes(booking.status) && (
            <button className={styles.primaryBtn} onClick={() => { onAction('rebook', booking); onClose(); }}>
              <ArrowsClockwise size={16} /> Tìm cố vấn thay thế
            </button>
          )}

          {/* Complaint Action: Shown for all roles if a report exists, or for Startup/Investor to CREATE a report */}
          {existingReport ? (
            <button
              className={`${styles.secondaryBtn}`}
              onClick={() => { onAction('viewComplaint', existingReport); onClose(); }}
              style={{ backgroundColor: 'rgba(29, 155, 240, 0.05)', color: 'var(--primary-blue)', border: '1px solid rgba(29, 155, 240, 0.2)' }}
            >
              <MagnifyingGlass size={16} /> Xem khiếu nại
            </button>
          ) : (
            ['Startup', 'Investor'].includes(userRole) && [2, 'Confirmed'].includes(booking.status) && (
              <button
                className={`${styles.secondaryBtn} ${styles.dangerBtn}`}
                onClick={() => { onAction('complain', booking); onClose(); }}
              >
                <WarningCircle size={16} /> Khiếu nại
              </button>
            )
          )}

          {/* View Project Button - Available for all roles if projectId exists */}
          {booking.projectId && (
            <button
              className={styles.primaryBtn}
              onClick={() => { onAction('viewProject', booking); onClose(); }}
              style={{ background: '#10b981' }}
            >
              <Briefcase size={16} /> Xem dự án
            </button>
          )}

          {userRole === 'Advisor' && (booking.status === 2 || booking.status === 'Confirmed') && (
            <button
              className={styles.primaryBtn}
              onClick={() => { onAction('report', booking); onClose(); }}
              style={{ background: '#1d9bf0' }}
            >
              <FileText size={16} /> Viết báo cáo
            </button>
          )}

          {userRole === 'Advisor' && (booking.status === 0 || booking.status === 'Pending') && (
            <>
              <button
                className={`${styles.secondaryBtn} ${styles.dangerBtn}`}
                onClick={() => { onAction('reject', booking); onClose(); }}
                style={{ color: '#f4212e', borderColor: 'rgba(244, 33, 46, 0.2)' }}
              >
                Từ chối
              </button>
              <button
                className={styles.primaryBtn}
                onClick={() => { onAction('approve', booking); onClose(); }}
                style={{ background: '#1d9bf0' }}
              >
                Phê duyệt
              </button>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
