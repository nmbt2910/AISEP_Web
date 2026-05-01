import React, { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  ExternalLink,
  Link2,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
} from 'lucide-react';
import styles from './BlockchainOnchainResultModal.module.css';

function CopyRow({ label, value }) {
  const [copied, setCopied] = useState(false);
  const display = value && String(value).trim() ? String(value) : null;

  const copy = useCallback(() => {
    if (!display) return;
    navigator.clipboard.writeText(display).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [display]);

  return (
    <div className={styles.field}>
      <div className={styles.fieldHeader}>
        <span className={styles.fieldLabel}>{label}</span>
        {display && (
          <button type="button" className={styles.copyBtn} onClick={copy}>
            {copied ? (
              <>
                <Check size={14} aria-hidden />
                Đã sao chép
              </>
            ) : (
              <>
                <Copy size={14} aria-hidden />
                Sao chép
              </>
            )}
          </button>
        )}
      </div>
      <code className={styles.mono}>{display || '—'}</code>
    </div>
  );
}

/**
 * Modal hiển thị kết quả xác thực on-chain cho deal (investor / startup / staff).
 */
export default function BlockchainOnchainResultModal({
  isOpen,
  onClose,
  result,
  errorMessage = null,
}) {
  if (!isOpen) return null;

  const explorerLink = result?.explorerLink || '';

  return createPortal(
    <div
      className={styles.overlay}
      role="presentation"
      onClick={onClose}
    >
      <div
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="onchain-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.header}>
          <div className={styles.titleBlock}>
            <div className={styles.iconWrap} aria-hidden>
              <Link2 size={22} strokeWidth={2.25} />
            </div>
            <div>
              <h2 id="onchain-modal-title" className={styles.title}>
                Kết quả xác thực blockchain
              </h2>
              <p className={styles.subtitle}>
                Đối soát hash, ví và thời gian ghi nhận trên chuỗi khối.
              </p>
            </div>
          </div>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Đóng"
          >
            <X size={20} />
          </button>
        </div>

        <div className={styles.body}>
          {errorMessage ? (
            <div className={styles.errorBox}>
              <strong style={{ display: 'block', marginBottom: '6px' }}>
                Không thể lấy kết quả
              </strong>
              {errorMessage}
            </div>
          ) : result ? (
            <>
              <div
                className={`${styles.statusCard} ${
                  result.isVerified ? styles.statusCardOk : styles.statusCardWarn
                }`}
              >
                {result.isVerified ? (
                  <CheckCircle2
                    className={styles.statusIcon}
                    size={28}
                    color="#059669"
                    aria-hidden
                  />
                ) : (
                  <AlertCircle
                    className={styles.statusIcon}
                    size={28}
                    color="#d97706"
                    aria-hidden
                  />
                )}
                <div className={styles.statusTextWrap}>
                  <div className={styles.statusLabel}>Trạng thái xác minh</div>
                  <div
                    className={`${styles.statusValue} ${
                      result.isVerified ? styles.statusValueOk : styles.statusValueWarn
                    }`}
                  >
                    {result.isVerified ? 'Đã xác minh trên blockchain' : 'Chưa xác minh hoặc đang xử lý'}
                  </div>
                </div>
              </div>

              <div className={styles.metaRow}>
                <div className={styles.metaChip}>
                  <div className={styles.metaChipLabel}>Deal ID</div>
                  <div className={styles.metaChipValue}>
                    {result.dealId != null ? `#${result.dealId}` : '—'}
                  </div>
                </div>
                {result.startupId != null && (
                  <div className={styles.metaChip}>
                    <div className={styles.metaChipLabel}>Startup ID</div>
                    <div className={styles.metaChipValue}>{result.startupId}</div>
                  </div>
                )}
              </div>

              {result.message ? (
                <div className={styles.messageBox}>
                  <div className={styles.messageLabel}>Thông điệp từ hệ thống</div>
                  <p className={styles.messageText}>{result.message}</p>
                </div>
              ) : null}

              <CopyRow label="Document hash" value={result.documentHash} />
              {result.txHash ? (
                <CopyRow label="Transaction hash (nếu có)" value={result.txHash} />
              ) : null}
              <CopyRow label="Ví nhà đầu tư" value={result.investorWallet} />

              {result.timestampOnBlockchain ? (
                <div className={styles.field}>
                  <div className={styles.fieldHeader}>
                    <span className={styles.fieldLabel}>Thời gian on-chain</span>
                  </div>
                  <code className={styles.mono}>{result.timestampOnBlockchain}</code>
                </div>
              ) : null}

              {Array.isArray(result.owners) && result.owners.length > 0 ? (
                <div className={styles.field}>
                  <div className={styles.fieldHeader}>
                    <span className={styles.fieldLabel}>Owners (on-chain)</span>
                  </div>
                  <ul className={styles.ownersList}>
                    {result.owners.map((addr, idx) => (
                      <li key={`${addr}-${idx}`} className={styles.ownerItem}>
                        <code className={styles.mono} style={{ flex: 1 }}>
                          {addr}
                        </code>
                        <button
                          type="button"
                          className={styles.copyBtn}
                          onClick={() => {
                            if (addr) navigator.clipboard.writeText(String(addr));
                          }}
                        >
                          <Copy size={14} aria-hidden />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </>
          ) : (
            <div className={styles.errorBox}>Không có dữ liệu hiển thị.</div>
          )}
        </div>

        <div className={styles.footer}>
          <p className={styles.footerNote}>
            Ghi chú: Khi trạng thái đã xác minh, dữ liệu liên quan đã được ghi nhận trên blockchain
            và có thể đối chiếu công khai qua liên kết Explorer bên dưới.
          </p>
          <div className={styles.actions}>
            {!errorMessage && explorerLink ? (
              <a
                href={explorerLink}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.btnPrimary}
              >
                <ExternalLink size={16} aria-hidden />
                Mở Blockchain Explorer
              </a>
            ) : null}
            <button type="button" className={styles.btnSecondary} onClick={onClose}>
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
