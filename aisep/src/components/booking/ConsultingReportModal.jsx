import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X, FileText, CheckCircle, WarningCircle, Clock, ArrowsClockwise, PaperPlaneTilt, CircleNotch, Info
} from '@phosphor-icons/react';
import consultingReportService from '../../services/consultingReportService';
import UserReportModal from './UserReportModal';
import styles from './ConsultingReportModal.module.css';

const MAX_REVISIONS = 3;

/**
 * ConsultingReportModal
 *
 * Props:
 *   bookingId   {number}   - Booking ID
 *   userRole    {string}   - 'Advisor' | 'Startup' | 'Investor'
 *   advisorName {string}   - Tên advisor (hiển thị)
 *   onClose     {fn}
 *   onDone      {fn}       - Callback sau khi approve/submit thành công
 */
export default function ConsultingReportModal({ bookingId, userRole, advisorName, onClose, onDone }) {
  const isAdvisor = userRole === 'Advisor';
  const isStaff = userRole === 'Staff';

  const [phase, setPhase] = useState('loading'); // loading | submit-form | view-report | success | error
  const [report, setReport] = useState(null);
  const [loadError, setLoadError] = useState('');

  // Advisor form
  const [form, setForm] = useState({
    meetingTitle: '',
    location: '',
    meetingTime: new Date().toISOString().slice(0, 16),
    meetingPurpose: '',
    content: '',
    decisionsMade: '',
  });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Startup/Investor review
  const [revisionReason, setRevisionReason] = useState('');
  const [showRevisionInput, setShowRevisionInput] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');
  const [showComplaintModal, setShowComplaintModal] = useState(false);

  // Load existing report
  useEffect(() => {
    const load = async () => {
      setPhase('loading');
      try {
        const r = await consultingReportService.getReportByBookingId(bookingId);
        setReport(r);
        if (r) {
          if (isAdvisor && r.status === 'RevisionRequested') {
            // Pre-fill form for advisor to edit
            setForm({
              meetingTitle: r.meetingTitle || '',
              location: r.location || '',
              meetingTime: r.meetingTime ? r.meetingTime.slice(0, 16) : new Date().toISOString().slice(0, 16),
              meetingPurpose: r.meetingPurpose || '',
              content: r.content || '',
              decisionsMade: r.decisionsMade || '',
            });
            setPhase('submit-form');
          } else {
            setPhase('view-report');
          }
        } else {
          setPhase(isAdvisor ? 'submit-form' : 'view-report');
        }
      } catch (e) {
        // 404 means no report yet
        if (e?.statusCode === 404 || e?.message?.toLowerCase().includes('not found')) {
          setReport(null);
          setPhase(isAdvisor ? 'submit-form' : 'view-report');
        } else {
          setLoadError(e?.message || 'Không thể tải báo cáo.');
          setPhase('error');
        }
      }
    };
    load();
  }, [bookingId, isAdvisor]);

  // ------ Advisor Submit ------
  const handleSubmit = async () => {
    setFormError('');
    if (!form.meetingTitle.trim()) { setFormError('Vui lòng nhập tiêu đề buổi tư vấn.'); return; }
    setSubmitting(true);
    try {
      const data = {
        bookingId,
        meetingTitle: form.meetingTitle.trim(),
        location: form.location.trim() || undefined,
        meetingTime: new Date(form.meetingTime).toISOString(),
        meetingPurpose: form.meetingPurpose.trim() || undefined,
        content: form.content.trim() || undefined,
        decisionsMade: form.decisionsMade.trim() || undefined,
      };
      const r = await consultingReportService.createReport(data);
      setReport(r);
      setPhase('success');
      onDone?.();
    } catch (e) {
      setFormError(e?.message || 'Không thể nộp báo cáo. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  // ------ Startup Approve ------
  const handleApprove = async () => {
    setActionLoading(true);
    setActionError('');
    try {
      await consultingReportService.approveReport(report.consultingReportId);
      setPhase('success');
      onDone?.({ type: 'approve', bookingId });
    } catch (e) {
      setActionError(e?.message || 'Không thể chấp nhận báo cáo.');
    } finally {
      setActionLoading(false);
    }
  };

  // ------ Startup Request Revision ------
  const handleRevision = async () => {
    if (!revisionReason.trim()) { setActionError('Vui lòng nhập lý do yêu cầu sửa đổi.'); return; }
    setActionLoading(true);
    setActionError('');
    try {
      await consultingReportService.requestRevision(report.consultingReportId, revisionReason.trim());
      onClose();
      onDone?.({ type: 'revision', bookingId });
    } catch (e) {
      setActionError(e?.message || 'Không thể gửi yêu cầu sửa đổi.');
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (d) => d ? new Date(d).toLocaleString('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }) : '—';
  const getCountdown = (dueAt) => {
    if (!dueAt) return null;
    const diff = new Date(dueAt) - new Date();
    if (diff <= 0) return 'Đã quá hạn';
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    return `${h}h ${m}m`;
  };

  const reportStatusLabel = {
    'Submitted': 'Đã nộp – Chờ xem xét',
    'Approved': 'Đã chấp nhận',
    'ApprovedByStartup': 'Đã được Startup chấp thuận',
    'RevisionRequested': 'Yêu cầu sửa đổi',
    'Completed': 'Hoàn thành',
    'EscalatedToStaff': 'Đã khiếu nại lên Staff',
  };

  const content = (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.headerIcon}>
              <FileText size={20} />
            </div>
            <div>
              <h2 className={styles.title}>Báo Cáo Tư Vấn</h2>
              {advisorName && <p className={styles.subtitle}>{advisorName}</p>}
            </div>
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Đóng">
            <X size={20} />
          </button>
        </div>

        <div className={styles.body}>

          {/* Loading */}
          {phase === 'loading' && (
            <div className={styles.centered}>
              <CircleNotch size={32} className={styles.spinning} weight="bold" />
              <p className={styles.mutedText}>Đang tải nội dung báo cáo...</p>
            </div>
          )}

          {/* Error */}
          {phase === 'error' && (
            <div className={styles.centered}>
              <WarningCircle size={40} color="#f4212e" />
              <p className={styles.mutedText} style={{ color: '#f4212e', fontWeight: 600 }}>{loadError}</p>
              <button className={styles.secondaryBtn} onClick={onClose} style={{ marginTop: '12px' }}>Đóng cửa sổ</button>
            </div>
          )}

          {/* Success */}
          {phase === 'success' && (
            <div className={styles.centered}>
              <CheckCircle size={56} color="#17bf63" />
              <h3 className={styles.successTitle}>
                {isAdvisor ? 'Nộp báo cáo thành công!' : 'Xử lý hoàn tất!'}
              </h3>
              <p className={styles.mutedText}>Thông tin đã được lưu lại trên hệ thống AISEP.</p>
              <button className={styles.primaryBtn} onClick={onClose} style={{ marginTop: '16px', maxWidth: '200px' }}>
                Xác nhận
              </button>
            </div>
          )}

          {/* Advisor Submit Form */}
          {phase === 'submit-form' && (
            <div className={styles.form}>
              {/* Revision Alert for Advisor */}
              {report?.status === 'RevisionRequested' && (
                <div className={styles.revisionAlert}>
                  <div className={styles.raHeader}>
                    <div className={styles.raTitle}>
                      <ArrowsClockwise size={18} />
                      <span>Yêu cầu sửa đổi báo cáo</span>
                    </div>
                    <span className={styles.raCount}>Lần {report.revisionCount}</span>
                  </div>
                  <div className={styles.raBody}>
                    <p className={styles.raLabel}>Lý do từ Startup:</p>
                    <p className={styles.raReason}>"{report.revisionRequestReason}"</p>
                    {report.advisorRevisionDueAt && (
                      <div className={styles.raDeadline}>
                        <Clock size={14} />
                        <span>Hạn nộp lại: {formatDate(report.advisorRevisionDueAt)}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className={styles.field}>
                <label className={styles.label}>Tiêu đề buổi tư vấn</label>
                <input
                  className={styles.input}
                  placeholder="VD: Định hướng chiến lược kinh doanh quý 3"
                  value={form.meetingTitle}
                  onChange={e => setForm(p => ({ ...p, meetingTitle: e.target.value }))}
                />
              </div>
              <div className={styles.row2}>
                <div className={styles.field}>
                  <label className={styles.label}>Thời gian tư vấn</label>
                  <input
                    className={styles.input}
                    type="datetime-local"
                    value={form.meetingTime}
                    onChange={e => setForm(p => ({ ...p, meetingTime: e.target.value }))}
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Địa điểm</label>
                  <input
                    className={styles.input}
                    placeholder="VD: Zoom / Văn phòng đại diện"
                    value={form.location}
                    onChange={e => setForm(p => ({ ...p, location: e.target.value }))}
                  />
                </div>
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Nội dung thảo luận chính</label>
                <textarea
                  className={styles.textarea}
                  rows={5}
                  placeholder="Mô tả chi tiết những nội dung quan trọng đã trao đổi với Startup..."
                  value={form.content}
                  onChange={e => setForm(p => ({ ...p, content: e.target.value }))}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Quyết định & Kết luận</label>
                <textarea
                  className={styles.textarea}
                  rows={3}
                  placeholder="Các quyết định đã thống nhất và hướng đi tiếp theo..."
                  value={form.decisionsMade}
                  onChange={e => setForm(p => ({ ...p, decisionsMade: e.target.value }))}
                />
              </div>
              {formError && (
                <div className={styles.errorRow}>
                  <WarningCircle size={16} /><span>{formError}</span>
                </div>
              )}
            </div>
          )}

          {/* View Report */}
          {phase === 'view-report' && (
            <>
              {!report ? (
                <div className={styles.centered}>
                  <FileText size={48} color="var(--text-secondary)" style={{ opacity: 0.3 }} />
                  <p className={styles.mutedText}>Chưa có thông tin báo cáo tư vấn.</p>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Advisor sẽ chuẩn bị và nộp báo cáo chính thức sau khi buổi tư vấn kết thúc.</p>
                </div>
              ) : (
                <div className={styles.reportView}>
                  {/* Status Info Row */}
                  <div className={styles.statusBar}>
                    <span className={`${styles.statusBadge} ${styles[`badge_${report.status}`] || styles.badge_default}`}>
                      {reportStatusLabel[report.status] || report.status}
                    </span>
                    {report.revisionCount > 0 && (
                      <span className={styles.revisionBadge}>
                        <ArrowsClockwise size={14} /> Có {report.revisionCount} lần yêu cầu sửa đổi
                      </span>
                    )}
                  </div>

                  {/* Details Grid */}
                  <div className={styles.detailGrid}>
                    <div className={`${styles.detailItem} ${styles.fullWidth}`}>
                      <span className={styles.detailLabel}>Tên buổi tư vấn</span>
                      <span className={styles.detailValue} style={{ fontSize: '18px', fontWeight: '800' }}>{report.meetingTitle}</span>
                    </div>
                    
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>Thời gian diễn ra</span>
                      <span className={styles.detailValue}>{formatDate(report.meetingTime)}</span>
                    </div>

                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>Địa điểm</span>
                      <span className={styles.detailValue}>{report.location || 'Chưa xác định'}</span>
                    </div>

                    {report.content && (
                      <div className={`${styles.detailItem} ${styles.fullWidth}`}>
                        <span className={styles.detailLabel}>Nội dung tư vấn chi tiết</span>
                        <div className={styles.detailValue} style={{ whiteSpace: 'pre-wrap', padding: '16px', background: 'var(--bg-secondary)', borderRadius: '12px' }}>
                          {report.content}
                        </div>
                      </div>
                    )}

                    {report.decisionsMade && (
                      <div className={`${styles.detailItem} ${styles.fullWidth}`}>
                        <span className={styles.detailLabel}>Quyết định quan trọng & Kết luận</span>
                        <div className={styles.detailValue} style={{ whiteSpace: 'pre-wrap', color: 'var(--primary-blue)', fontWeight: '600' }}>
                          {report.decisionsMade}
                        </div>
                      </div>
                    )}

                    {report.revisionRequestReason && (
                      <div className={`${styles.detailItem} ${styles.fullWidth}`}>
                        <div className={styles.escalationNotice}>
                          <WarningCircle size={20} />
                          <div>
                            <p style={{ margin: 0, fontWeight: '700' }}>Yêu cầu sửa đổi (Startup)</p>
                            <p style={{ margin: '4px 0 0', opacity: 0.85 }}>{report.revisionRequestReason}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>



                  {/* Status Indicator for Approved/Completed/ApprovedByStartup */}
                  {(report.status === 'Approved' || report.status === 'Completed' || report.status === 'ApprovedByStartup') && (
                    <div className={styles.approvedNote}>
                      <CheckCircle size={20} />
                      <span>Báo cáo này đã được các bên chấp thuận và lưu giữ chính thức làm hồ sơ tư vấn.</span>
                    </div>
                  )}

                  {/* Status Indicator for EscalatedToStaff */}
                  {report.status === 'EscalatedToStaff' && (
                    <div className={styles.escalationNote}>
                      <WarningCircle size={20} />
                      {isAdvisor ? (
                        <span>
                          Do khách hàng đã yêu cầu sửa đổi quá 3 lần, báo cáo đã được chuyển sang trạng thái xử lý khiếu nại. 
                          Vui lòng đợi quản trị viên AISEP trực tiếp hỗ trợ giải quyết.
                        </span>
                      ) : (
                        <span>
                          Báo cáo này đã đạt giới hạn yêu cầu sửa đổi (3). 
                          Vui lòng nhấn nút <strong>Khiếu nại</strong> ở cửa sổ chi tiết Booking để gửi yêu cầu hỗ trợ trực tiếp đến quản trị viên AISEP.
                        </span>
                      )}
                    </div>
                  )}

                  {/* Limit reached notice for Startup/Investor */}
                  {!isAdvisor && !isStaff && report.status === 'Submitted' && report.revisionCount >= MAX_REVISIONS && (
                    <div className={styles.limitNotice}>
                      <Info size={18} weight="bold" />
                      <span>
                        Bạn đã đạt đến giới hạn số lần yêu cầu sửa đổi cho báo cáo tư vấn này. 
                        Nếu tiếp tục có vấn đề yêu cầu xem xét, hãy sử dụng tính năng <strong>Khiếu nại</strong> để được nhân viên của chúng tôi xem xét.
                      </span>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Sticky Footers */}
        {phase === 'submit-form' && (
          <div className={styles.footerRow}>
            <button className={styles.secondaryBtn} onClick={onClose} disabled={submitting}>Hủy bỏ</button>
            <button className={styles.primaryBtn} onClick={handleSubmit} disabled={submitting}>
              {submitting ? <CircleNotch size={16} className={styles.spinning} weight="bold" /> : <PaperPlaneTilt size={16} />}
              {submitting ? 'Đang gửi...' : 'Gửi báo cáo'}
            </button>
          </div>
        )}

        {phase === 'view-report' && report && !isAdvisor && !isStaff && report.status === 'Submitted' && (
          <div className={styles.footerRow} style={{ flexDirection: 'column', gap: '16px' }}>
            {showRevisionInput && (
              <div className={styles.field}>
                <label className={styles.label}>Lý do yêu cầu sửa đổi cụ thể</label>
                <textarea
                  className={styles.textarea}
                  rows={3}
                  placeholder="Vui lòng nêu rõ các điểm cần Advisor cập nhật thêm..."
                  value={revisionReason}
                  onChange={e => setRevisionReason(e.target.value)}
                />
              </div>
            )}
            
            {actionError && (
              <div className={styles.errorRow}>
                <WarningCircle size={16} /><span>{actionError}</span>
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
              {!showRevisionInput ? (
                <>
                  {report.revisionCount < MAX_REVISIONS ? (
                    <button className={styles.secondaryBtn} onClick={() => setShowRevisionInput(true)} disabled={actionLoading}>
                      <ArrowsClockwise size={16} /> Yêu cầu sửa lại
                    </button>
                  ) : (
                    <button className={styles.complaintBtn} onClick={() => setShowComplaintModal(true)} disabled={actionLoading}>
                      <WarningCircle size={16} /> Khiếu nại báo cáo
                    </button>
                  )}
                  <button className={styles.approveBtn} onClick={handleApprove} disabled={actionLoading}>
                    {actionLoading ? <CircleNotch size={16} className={styles.spinning} weight="bold" /> : <CheckCircle size={16} />}
                    Chấp nhận báo cáo
                  </button>
                </>
              ) : (
                <>
                  <button className={styles.secondaryBtn} onClick={() => { setShowRevisionInput(false); setRevisionReason(''); setActionError(''); }} disabled={actionLoading}>
                    Hủy bỏ
                  </button>
                  <button className={styles.revisionSubmitBtn} onClick={handleRevision} disabled={actionLoading}>
                    {actionLoading ? <CircleNotch size={16} className={styles.spinning} weight="bold" /> : <PaperPlaneTilt size={16} />}
                    Gửi yêu cầu
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Staff / Simple View Footer */}
        {phase === 'view-report' && isStaff && (
           <div className={styles.footerRow}>
              <button className={styles.primaryBtn} onClick={onClose}>Đóng</button>
           </div>
        )}
      </div>

      {showComplaintModal && (
        <UserReportModal 
          bookingId={bookingId}
          targetUserId={report?.advisorId}
          targetUserName={report?.advisorName}
          onClose={() => setShowComplaintModal(false)}
          onDone={() => {
            setShowComplaintModal(false);
            onClose();
          }}
        />
      )}
    </div>
  );

  return createPortal(content, document.body);
}
