import React, { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, TrendingUp, AlertCircle, Loader2, CheckCircle, FileText, Upload, Trash2 } from 'lucide-react';
import dealsService from '../../services/dealsService';
import styles from './InvestmentModal.module.css';

/**
 * InvestmentModal - Allow investors to create investment deals for startup projects
 * Props:
 *  - isOpen: Boolean to show/hide modal
 *  - projectId: ID of the project to invest in
 *  - projectName: Name of the project
 *  - startupName: Name of the startup
 *  - onClose: Callback when modal closes
 *  - onSuccess: Callback after successful investment
 */
const InvestmentModal = ({
  isOpen,
  projectId,
  projectName,
  startupName,
  onClose,
  onSuccess
}) => {
  const DEAL_TYPE_OPTIONS = [
    { value: 'Equity', label: 'Cổ phần (Equity)' },
    { value: 'CustomTerms', label: 'Điều khoản khác (Custom Terms)' },
  ];

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [dealStatus, setDealStatus] = useState(null);
  const [evidenceFile, setEvidenceFile] = useState(null);
  const [investedAmount, setInvestedAmount] = useState('');
  const [dealType, setDealType] = useState('Equity');
  const [equityPercentage, setEquityPercentage] = useState('');
  const [exchangeTerms, setExchangeTerms] = useState('');
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setDealStatus(null);

    let dealId = null;
    let dealStatusString = 'Pending';

    try {
      if (!evidenceFile) {
        throw new Error('Vui lòng tải lên tài liệu minh chứng thỏa thuận.');
      }
      const amountNumber = Number(investedAmount);
      if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
        throw new Error('Số tiền đầu tư phải lớn hơn 0.');
      }
      if (!dealType) {
        throw new Error('Vui lòng chọn loại hình đầu tư.');
      }
      if (dealType === 'Equity') {
        const pct = Number(equityPercentage);
        if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
          throw new Error('Phần trăm cổ phần phải trong khoảng 0 - 100.');
        }
      }
      if (dealType === 'CustomTerms') {
        const terms = String(exchangeTerms || '').trim();
        if (!terms) {
          throw new Error('Vui lòng nhập điều khoản trao đổi.');
        }
        if (terms.length > 500) {
          throw new Error('Điều khoản trao đổi tối đa 500 ký tự.');
        }
      }

      const response = await dealsService.createDeal({
        projectId,
        investedAmount: amountNumber,
        type: dealType,
        equityPercentage: dealType === 'Equity' ? Number(equityPercentage) : null,
        exchangeTerms: dealType === 'CustomTerms' ? String(exchangeTerms || '').trim() : null,
        evidenceFile
      });
      
      console.log('[InvestmentModal] Full response from POST /api/Deals:', response);
      console.log('[InvestmentModal] Response data:', response?.data);
      
      // Extract dealId from response - confirmed structure from API: response.data.dealId
      dealId = response?.data?.dealId;
      
      if (!dealId) {
        throw new Error('No dealId returned from API');
      }
      
      console.log('[InvestmentModal] ✓ Extracted dealId:', dealId);
      
      dealStatusString = response?.data?.status || 'Pending';
      const statusInfo = dealsService.getStatusInfo(dealStatusString);
      setDealStatus({
        dealId: dealId,
        projectName: response?.data?.projectName,
        startupName: response?.data?.startupName,
        statusCode: statusInfo.value,
        statusInfo: statusInfo,
        status: dealStatusString,
        amount: response?.data?.investedAmount || response?.data?.amount || 0,
        type: response?.data?.type || dealType,
        equityPercentage: response?.data?.equityPercentage,
        exchangeTerms: response?.data?.exchangeTerms
      });
      
      setSuccessMessage('Gửi yêu cầu đầu tư thành công! Startup sẽ xem tài liệu và phản hồi trong thời gian sớm nhất.');
      
      // Dispatch event to notify dashboard of new deal
      if (dealId) {
        try {
          const eventDetail = {
            dealId: dealId,
            projectId: projectId,
            projectName: projectName,
            status: dealStatusString
          };
          
          console.log('[InvestmentModal] 📤 Dispatching deal_created event:', eventDetail);
          
          const event = new CustomEvent('deal_created', { detail: eventDetail });
          window.dispatchEvent(event);
          
          console.log('[InvestmentModal] ✓ Successfully dispatched deal_created event');
        } catch (dispatchErr) {
          console.error('[InvestmentModal] Failed to dispatch event:', dispatchErr);
        }
      } else {
        console.warn('[InvestmentModal] Cannot dispatch event - no dealId');
      }
      
      // Wait 2 seconds then close
      setTimeout(() => {
        handleClose();
        onSuccess?.();
      }, 2000);
    } catch (err) {
      console.error('[InvestmentModal] Error creating deal:', err);

      // Improve diagnostics for the common "re-invest after canceled" scenario.
      if (err?.statusCode === 500) {
        try {
          const dealsRes = await dealsService.getInvestorDeals({ pageSize: 100 });
          const deals = dealsRes?.data?.items || dealsRes?.data || [];
          const existingDeal = Array.isArray(deals)
            ? deals.find((d) => String(d.projectId) === String(projectId))
            : null;
          const statusNormalized = (existingDeal?.status || '').toString().toLowerCase();

          if (existingDeal && (statusNormalized === 'canceled' || statusNormalized === 'cancelled' || statusNormalized === '5')) {
            setError('Không thể tạo yêu cầu đầu tư mới vì backend đang giữ deal đã hủy của cùng dự án. Cần backend cho phép tạo lại deal khi trạng thái là "Canceled", hoặc cung cấp endpoint mở lại deal.');
            return;
          }
        } catch (_) {
          // Ignore diagnostic error and fallback to generic message below.
        }
      }

      setError(err?.message || 'Không thể tạo đơn đầu tư. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setError(null);
    setSuccessMessage(null);
    setEvidenceFile(null);
    setInvestedAmount('');
    setDealType('Equity');
    setEquityPercentage('');
    setExchangeTerms('');
    onClose?.();
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return createPortal(
    <div className={styles.backdrop} onClick={(e) => { e.stopPropagation(); handleClose(); }}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.titleSection}>
            <TrendingUp size={24} className={styles.titleIcon} />
            <div>
              <h2 className={styles.title}>Đầu tư vào Dự án</h2>
              <p className={styles.subtitle}>{startupName}</p>
            </div>
          </div>
          <button
            className={styles.closeBtn}
            onClick={handleClose}
            disabled={isLoading}
            aria-label="Close modal"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className={styles.content}>
          {/* Success State */}
          {successMessage && (
            <div className={styles.successBox}>
              <div className={styles.successContent}>
                <div className={styles.successIcon}>✓</div>
                <p className={styles.successText}>{successMessage}</p>
                {dealStatus && (
                  <div style={{ marginTop: '16px', padding: '12px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}>
                    {(dealStatus.projectName || projectName) && (
                      <>
                        <div style={{ fontSize: '12px', color: '#a0aec0', marginBottom: '4px' }}>Dự án</div>
                        <div style={{ fontSize: '14px', fontWeight: '600', color: 'white', marginBottom: '8px' }}>{dealStatus.projectName || projectName}</div>
                      </>
                    )}
                    {dealStatus.startupName && (
                      <>
                        <div style={{ fontSize: '12px', color: '#a0aec0', marginBottom: '4px' }}>Startup</div>
                        <div style={{ fontSize: '14px', fontWeight: '600', color: 'white', marginBottom: '8px' }}>{dealStatus.startupName}</div>
                      </>
                    )}
                    <div style={{ fontSize: '12px', color: '#a0aec0', marginBottom: '4px' }}>Trạng thái</div>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '13px',
                      fontWeight: '600',
                      color: dealStatus.statusInfo?.color
                    }}>
                      <CheckCircle size={16} />
                      {dealStatus.statusInfo?.labelVi}
                    </div>
                    <div style={{ marginTop: '8px', fontSize: '12px', color: '#e2e8f0' }}>
                      <strong>Số tiền:</strong> {Number(dealStatus.amount || 0).toLocaleString('vi-VN')} VND
                    </div>
                    <div style={{ marginTop: '4px', fontSize: '12px', color: '#e2e8f0' }}>
                      <strong>Loại:</strong> {dealStatus.type === 'CustomTerms' ? 'Điều khoản khác' : 'Cổ phần'}
                    </div>
                    {dealStatus.type === 'Equity' && dealStatus.equityPercentage !== undefined && dealStatus.equityPercentage !== null && (
                      <div style={{ marginTop: '4px', fontSize: '12px', color: '#e2e8f0' }}>
                        <strong>Tỷ lệ cổ phần:</strong> {dealStatus.equityPercentage}%
                      </div>
                    )}
                    {dealStatus.type === 'CustomTerms' && dealStatus.exchangeTerms && (
                      <div style={{ marginTop: '4px', fontSize: '12px', color: '#e2e8f0' }}>
                        <strong>Điều khoản:</strong> {dealStatus.exchangeTerms}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Error State */}
          {error && !successMessage && (
            <div className={styles.errorBox}>
              <AlertCircle size={20} />
              <p className={styles.errorText}>{error}</p>
            </div>
          )}

          {/* Form */}
          {!successMessage && (
            <form onSubmit={handleSubmit}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Dự án</label>
                <div className={styles.staticField}>{projectName}</div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Công ty khởi nghiệp</label>
                <div className={styles.staticField}>{startupName}</div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Số tiền đầu tư (VND) *</label>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  className={styles.textInput}
                  placeholder="Ví dụ: 500000000"
                  value={investedAmount}
                  onChange={(e) => setInvestedAmount(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Loại hình đầu tư *</label>
                <div className={styles.typeToggle}>
                  {DEAL_TYPE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      className={`${styles.typeToggleBtn} ${dealType === opt.value ? styles.typeToggleBtnActive : ''}`}
                      onClick={() => setDealType(opt.value)}
                      disabled={isLoading}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {dealType === 'Equity' && (
                <div className={styles.formGroup}>
                  <label className={styles.label}>Tỷ lệ cổ phần (%) *</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    className={styles.textInput}
                    placeholder="Ví dụ: 15.5"
                    value={equityPercentage}
                    onChange={(e) => setEquityPercentage(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
              )}

              {dealType === 'CustomTerms' && (
                <div className={styles.formGroup}>
                  <label className={styles.label}>Điều khoản trao đổi *</label>
                  <textarea
                    className={styles.textareaInput}
                    placeholder="Nhập điều khoản thỏa thuận giữa 2 bên (tối đa 500 ký tự)..."
                    maxLength={500}
                    value={exchangeTerms}
                    onChange={(e) => setExchangeTerms(e.target.value)}
                    disabled={isLoading}
                    rows={4}
                  />
                  <div className={styles.charCount}>{exchangeTerms.length}/500</div>
                </div>
              )}

              <div className={styles.infoBox}>
                <AlertCircle size={18} />
                <p>
                  Vui lòng tải lên <strong>tài liệu hợp tác đầu tư đã thỏa thuận giữa Investor và Startup</strong>,
                  ví dụ: biên bản ghi nhớ (MOU), bản scan hợp đồng, phụ lục điều khoản, xác nhận chuyển khoản hoặc
                  giấy tờ pháp lý liên quan. Sau khi gửi, Startup sẽ xem tài liệu và thực hiện chấp nhận hoặc từ chối yêu cầu.
                </p>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Tài liệu thỏa thuận *</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.webp"
                  onChange={(e) => setEvidenceFile(e.target.files?.[0] || null)}
                  disabled={isLoading}
                  className={styles.hiddenInput}
                />
                {!evidenceFile ? (
                  <button
                    type="button"
                    className={styles.uploadArea}
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isLoading}
                  >
                    <Upload size={18} />
                    <div>
                      <div className={styles.uploadTitle}>Chọn tài liệu để tải lên</div>
                      <div className={styles.uploadHint}>Hỗ trợ: PDF, JPG, PNG, WEBP</div>
                    </div>
                  </button>
                ) : (
                  <div className={styles.fileCard}>
                    <div className={styles.fileMain}>
                      <FileText size={18} />
                      <div className={styles.fileMeta}>
                        <div className={styles.fileName} title={evidenceFile.name}>{evidenceFile.name}</div>
                        <div className={styles.fileSub}>{formatFileSize(evidenceFile.size)}</div>
                      </div>
                    </div>
                    <div className={styles.fileActions}>
                      <button
                        type="button"
                        className={styles.fileActionBtn}
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isLoading}
                      >
                        Đổi file
                      </button>
                      <button
                        type="button"
                        className={styles.fileActionBtnDanger}
                        onClick={() => {
                          setEvidenceFile(null);
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                        disabled={isLoading}
                      >
                        <Trash2 size={14} /> Xóa
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Buttons */}
              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.cancelBtn}
                  onClick={handleClose}
                  disabled={isLoading}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className={styles.submitBtn}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={18} className={styles.spinner} />
                      Đang xử lý...
                    </>
                  ) : (
                    'Gửi yêu cầu đầu tư'
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default InvestmentModal;
