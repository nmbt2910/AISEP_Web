import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { 
  Landmark, CreditCard, History, AlertCircle, CheckCircle, 
  XCircle, Clock, Loader2, Save, RefreshCw, Send, X, Eye, FileText
} from 'lucide-react';
import styles from './AdvisorPayoutSection.module.css';
import bankAccountService from '../../services/bankAccountService';
import payoutService from '../../services/payoutService';
import bankService from '../../services/bankService';
import BankSelect from '../common/BankSelect';
import SuccessModal from '../common/SuccessModal';
import ErrorModal from '../common/ErrorModal';

export default function AdvisorPayoutSection({ user, isApproved, onRestrictedAction }) {
  const [activeTab, setActiveTab] = useState('account'); // 'account' or 'history'
  const [bankAccount, setBankAccount] = useState(null);
  const [payouts, setPayouts] = useState([]);
  const [banks, setBanks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Modals
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [modalMessage, setModalMessage] = useState('');

  // Retry modal state: holds the full payout object or null
  const [retryTarget, setRetryTarget] = useState(null);
  const [retryNote, setRetryNote] = useState('');
  const [retryNoteError, setRetryNoteError] = useState('');
  const [retryLoading, setRetryLoading] = useState(false);

  const openRetryModal = (payout) => {
    setRetryTarget(payout);
    setRetryNote('');
    setRetryNoteError('');
  };
  const closeRetryModal = () => setRetryTarget(null);

  const [formData, setFormData] = useState({
    bankName: '',
    accountNumber: '',
    accountHolderName: ''
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Load global bank list first (essential for UI)
      try {
        const bankList = await bankService.getVietQRBanks();
        setBanks(bankList);
      } catch (bankErr) {
        console.error('Failed to load global bank list:', bankErr);
      }

      // 2. Load advisor-specific data in parallel
      const [myBank, history] = await Promise.all([
        bankAccountService.getMyBank(),
        payoutService.getMyPayouts({ sorts: '-createdAt', pageSize: 100 })
      ]);

      if (myBank) {
        setBankAccount(myBank);
        setFormData({
          bankName: myBank.bankName || '',
          accountNumber: myBank.accountNumber || '',
          accountHolderName: myBank.accountHolderName || ''
        });
      }
      
      setPayouts(history?.data?.items || history?.items || history || []);
    } catch (error) {
      console.error('Error loading advisor payout state:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSaveBank = async (e) => {
    e.preventDefault();
    if (!isApproved) {
      onRestrictedAction?.('Bạn cần được phê duyệt hồ sơ Cố vấn để cập nhật thông tin tài khoản ngân hàng.');
      return;
    }
    setSaving(true);
    try {
      if (bankAccount) {
        await bankAccountService.updateMyBank(bankAccount.advisorBankAccountId, formData);
      } else {
        await bankAccountService.createMyBank(formData);
      }
      setModalMessage('Cập nhật thông tin ngân hàng thành công!');
      setShowSuccess(true);
      loadData();
    } catch (error) {
      setModalMessage(error?.response?.data?.message || error?.message || 'Không thể lưu thông tin ngân hàng.');
      setShowError(true);
    } finally {
      setSaving(false);
    }
  };

  const openRetryForm = (payoutId) => {
    setRetryFormId(payoutId);
    setRetryNote('');
    setRetryNoteError('');
  };

  const closeRetryForm = () => {
    setRetryFormId(null);
    setRetryNote('');
    setRetryNoteError('');
  };

  const handleRequestRetry = async (payoutId) => {
    setRetryNoteError('');
    if (!isApproved) {
      onRestrictedAction?.('Bạn cần được phê duyệt hồ sơ Cố vấn để yêu cầu chuyển lại khoản thanh toán.');
      return;
    }
    if (!retryNote.trim()) {
      setRetryNoteError('Vui lòng mô tả cách bạn đã xử lý sự cố trước khi yêu cầu chuyển lại.');
      return;
    }
    setRetryLoading(true);
    try {
      await payoutService.requestRetry(payoutId, { resolutionNote: retryNote.trim() });
      setModalMessage('Yêu cầu chuyển lại đã được gửi. Nhân viên sẽ xử lý trong thời gian sớm nhất.');
      setShowSuccess(true);
      closeRetryModal();
      loadData();
    } catch (error) {
      setModalMessage(error?.response?.data?.message || error?.message || 'Không thể gửi yêu cầu. Vui lòng thử lại.');
      setShowError(true);
    } finally {
      setRetryLoading(false);
    }
  };

  // ─── Status config ───────────────────────────────────────────────────────────
  const getStatusConfig = (status) => {
    switch (status) {
      case 'Paid':
        return { label: 'Đã chi trả', cls: styles.statusPaid, icon: <CheckCircle size={12} /> };
      case 'Rejected':
        return { label: 'Bị từ chối', cls: styles.statusRejected, icon: <XCircle size={12} /> };
      case 'PendingRecheck':
        return { label: 'Chờ xử lý lại', cls: styles.statusPendingRecheck, icon: <RefreshCw size={12} /> };
      default:
        return { label: 'Đang xử lý', cls: styles.statusPending, icon: <Clock size={12} /> };
    }
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <Loader2 className="animate-spin" size={40} />
        <p>Đang tải thông tin thanh toán...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.tabs}>
        <button 
          className={`${styles.tab} ${activeTab === 'account' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('account')}
        >
          <Landmark size={18} />
          Cài đặt thanh toán
        </button>
        <button 
          className={`${styles.tab} ${activeTab === 'history' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('history')}
        >
          <History size={18} />
          Lịch sử chi trả
        </button>
      </div>

      <div className={styles.content}>
        {activeTab === 'account' ? (
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h3>Thông tin tài khoản ngân hàng</h3>
              <p>Mọi khoản thanh toán hàng tháng sẽ được chuyển về tài khoản này.</p>
            </div>
            
            <form onSubmit={handleSaveBank} className={styles.form}>
              <div className={styles.formGroup}>
                <label>Ngân hàng</label>
                <BankSelect 
                  options={banks}
                  value={formData.bankName}
                  onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                  placeholder="Tìm và chọn ngân hàng..."
                />
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Số tài khoản</label>
                  <input 
                    type="text" 
                    value={formData.accountNumber}
                    onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                    placeholder="Ví dụ: 0123456789"
                    required
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Tên chủ tài khoản</label>
                  <input 
                    type="text" 
                    value={formData.accountHolderName}
                    onChange={(e) => setFormData({ ...formData, accountHolderName: e.target.value.toUpperCase() })}
                    placeholder="NGUYEN VAN A"
                    required
                  />
                </div>
              </div>

              <div className={styles.infoBox}>
                <AlertCircle size={20} />
                <p>Thông tin này được sử dụng để đối soát các khoản thu nhập từ các phiên tư vấn. Vui lòng đảm bảo thông tin chính xác tuyệt đối.</p>
              </div>

              <div className={styles.formActions}>
                <button type="submit" className={styles.saveBtn} disabled={saving}>
                  {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                  Lưu thông tin
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className={styles.historyCard}>
            <div className={styles.historyHeader}>
              <div className={styles.historyHeaderInfo}>
                <h3>Lịch sử thanh toán hàng tháng</h3>
                <p className={styles.historySub}>Đối soát thu nhập từ các phiên tư vấn.</p>
              </div>
              <div className={styles.statusLegend}>
                <span className={styles.dotPending}>Đang xử lý</span>
                <span className={styles.dotPaid}>Đã thanh toán</span>
                <span className={styles.dotRejected}>Từ chối</span>
                <span className={styles.dotPendingRecheck}>Chờ xử lý lại</span>
              </div>
            </div>

            <div className={styles.historyBody}>
              {payouts.length === 0 ? (
                <div className={styles.emptyState}>
                  <CreditCard size={48} opacity={0.2} />
                  <p>Bạn chưa có lịch sử thanh toán nào trong hệ thống.</p>
                </div>
              ) : (
                <>
                  {/* Desktop Table View */}
                  <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>Kỳ thanh toán</th>
                          <th>Số tiền</th>
                          <th>Ngân hàng nhận</th>
                          <th>Trạng thái</th>
                          <th>Chi tiết &amp; Thao tác</th>
                        </tr>
                      </thead>
                      <tbody>
                        {payouts.map((p) => {
                          const sc = getStatusConfig(p.status);
                          const canRetry = p.status === 'Rejected';

                          return (
                            <tr key={p.payoutId}>
                              <td className={styles.periodCell}>
                                <strong>Tháng {p.month}/{p.year}</strong>
                              </td>
                              <td className={styles.amountCell}>
                                {(p.amount ?? 0).toLocaleString('vi-VN')} <span>₫</span>
                              </td>
                              <td>
                                <div className={styles.bankSnapshot}>
                                  <span className={styles.bankName}>{p.bankName}</span>
                                  <span className={styles.bankAcc}>{p.accountNumber}</span>
                                </div>
                              </td>
                              <td>
                                <span className={`${styles.statusBadge} ${sc.cls}`}>
                                  {sc.icon}
                                  {sc.label}
                                </span>
                              </td>
                              <td className={styles.actionsCell}>
                                <div className={styles.noteTip}>
                                  {p.paidAt && <span className={styles.dateMeta}>Vào: {new Date(p.paidAt).toLocaleDateString('vi-VN')}</span>}
                                  {p.status === 'Rejected' && p.rejectReason && (
                                    <span className={styles.rejectTip} title={p.rejectReason}>{p.rejectReason}</span>
                                  )}
                                  {p.status === 'PendingRecheck' && p.retryRequestNote && (
                                    <span className={styles.retryTip}>
                                      <RefreshCw size={10} style={{ marginRight: 3 }} />
                                      {p.retryRequestNote}
                                    </span>
                                  )}
                                  {p.status === 'PendingRecheck' && p.retryRequestedAt && (
                                    <span className={styles.dateMeta}>Gửi: {new Date(p.retryRequestedAt).toLocaleDateString('vi-VN')}</span>
                                  )}
                                  {canRetry && (
                                    <button onClick={() => openRetryModal(p)} className={styles.retryBtn}>
                                      <RefreshCw size={12} /> Yêu cầu chuyển lại
                                    </button>
                                  )}
                                  {p.status === 'Paid' && p.payoutProofFileUrl && (
                                    <button 
                                      className={styles.viewProofBtn} 
                                      onClick={() => window.open(p.payoutProofFileUrl, '_blank')}
                                      title="Xem minh chứng thanh toán"
                                    >
                                      {p.payoutProofFileUrl.toLowerCase().endsWith('.pdf') ? <FileText size={14} /> : <Eye size={14} />}
                                      Xem minh chứng
                                    </button>
                                  )}
                                  {p.status === 'Pending' && !p.paidAt && !p.rejectReason && (
                                    <span className={styles.mutedMeta}>Đang đối soát</span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Card View */}
                  <div className={styles.mobileHistoryList}>
                    {payouts.map((p) => {
                      const sc = getStatusConfig(p.status);
                      const canRetry = p.status === 'Rejected';

                      return (
                        <div key={p.payoutId} className={styles.payoutCard}>
                          <div className={styles.payoutCardHeader}>
                            <div className={styles.payoutCardPeriod}>
                              <strong>Tháng {p.month}/{p.year}</strong>
                            </div>
                            <span className={`${styles.statusBadge} ${sc.cls}`}>
                              {sc.icon}
                              {sc.label}
                            </span>
                          </div>
                          
                          <div className={styles.payoutCardBody}>
                            <div className={styles.payoutCardRow}>
                              <span className={styles.payoutCardLabel}>Số tiền</span>
                              <span className={styles.amountCell}>{(p.amount ?? 0).toLocaleString('vi-VN')} <span>₫</span></span>
                            </div>
                            <div className={styles.payoutCardRow}>
                              <span className={styles.payoutCardLabel}>Ngân hàng</span>
                              <div className={styles.bankSnapshot} style={{ textAlign: 'right' }}>
                                <span className={styles.bankName}>{p.bankName}</span>
                                <span className={styles.bankAcc}>{p.accountNumber}</span>
                              </div>
                            </div>
                          </div>

                          <div className={styles.payoutCardFooter}>
                            {p.paidAt && (
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: p.payoutProofFileUrl ? 8 : 0 }}>
                                <span className={styles.dateMeta}>Đã chi trả: {new Date(p.paidAt).toLocaleDateString('vi-VN')}</span>
                                {p.payoutProofFileUrl && (
                                  <button 
                                    className={styles.viewProofBtn} 
                                    onClick={() => window.open(p.payoutProofFileUrl, '_blank')}
                                    style={{ padding: '4px 8px', fontSize: '11px' }}
                                  >
                                    <Eye size={12} /> Xem minh chứng
                                  </button>
                                )}
                              </div>
                            )}
                            {p.status === 'Rejected' && p.rejectReason && (
                              <div className={styles.rejectInfo}>
                                <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                                <span>{p.rejectReason}</span>
                              </div>
                            )}
                            {p.status === 'PendingRecheck' && p.retryRequestNote && (
                              <div className={styles.retryInfo}>
                                <RefreshCw size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                                <span>{p.retryRequestNote}</span>
                              </div>
                            )}
                            {canRetry && (
                              <button onClick={() => openRetryModal(p)} className={styles.retryBtnFull}>
                                <RefreshCw size={14} /> Yêu cầu chuyển lại
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {showSuccess && <SuccessModal message={modalMessage} onClose={() => setShowSuccess(false)} />}
      {showError && <ErrorModal message={modalMessage} onClose={() => setShowError(false)} />}
      {retryTarget && (
        <RetryModal
          payout={retryTarget}
          note={retryNote}
          setNote={setRetryNote}
          error={retryNoteError}
          setError={setRetryNoteError}
          onClose={closeRetryModal}
          onSubmit={() => handleRequestRetry(retryTarget.payoutId)}
          loading={retryLoading}
        />
      )}
    </div>
  );
}


// ─── RetryModal (portal-based) ───────────────────────────────────────────────────────

function RetryModal({ payout, note, setNote, error, setError, onClose, onSubmit, loading }) {
  return createPortal(
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 99998, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, animation: 'modalOverlayIn 0.2s ease' }}
      onClick={onClose}
    >
      <div
        style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: 20, padding: 28, width: '100%', maxWidth: 460, boxShadow: '0 24px 64px rgba(0,0,0,0.5)', animation: 'modalCardIn 0.25s cubic-bezier(0.22, 1, 0.36, 1)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'rgba(245,158,11,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <RefreshCw size={20} color="#f59e0b" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>Yêu cầu chuyển khoản lại</h3>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>Tháng {payout?.month}/{payout?.year} · {(payout?.amount ?? 0).toLocaleString('vi-VN')} ₫</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4, borderRadius: 8, display: 'flex' }}>
            <X size={18} />
          </button>
        </div>

        {/* Reject reason shown for context */}
        {payout?.rejectReason && (
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 12, padding: '10px 14px', marginBottom: 20 }}>
            <AlertCircle size={16} color="#ef4444" style={{ flexShrink: 0, marginTop: 1 }} />
            <span style={{ fontSize: 13, color: '#ef4444', lineHeight: 1.5 }}>{payout.rejectReason}</span>
          </div>
        )}

        {/* Note field */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
            Mô tả các bạn đã xử lý *
          </label>
          <textarea
            value={note}
            onChange={e => { setNote(e.target.value); setError(''); }}
            placeholder="Ví dụ: Tôi đã cập nhật lại số tài khoản ngân hàng chính xác. Kính nhờ anh/chị kiểm tra và chuyển lại."
            rows={4}
            style={{ width: '100%', padding: '10px 14px', borderRadius: 12, border: `1.5px solid ${error ? '#ef4444' : 'var(--border-color)'}`, background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: 14, resize: 'vertical', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s', fontFamily: 'inherit', lineHeight: 1.5 }}
            autoFocus
          />
          {error && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginTop: 6, color: '#ef4444', fontSize: 12, fontWeight: 600 }}>
              <AlertCircle size={13} style={{ flexShrink: 0, marginTop: 1 }} /> {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '10px 20px', borderRadius: 12, border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-secondary)', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
            Hủy
          </button>
          <button
            onClick={onSubmit}
            disabled={loading}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 24px', borderRadius: 12, border: 'none', background: '#f59e0b', color: '#000', fontWeight: 800, fontSize: 14, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            {loading ? 'Đang gửi…' : 'Gửi yêu cầu'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
