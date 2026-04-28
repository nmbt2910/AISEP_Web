import React from 'react';
import { AlertCircle, ArrowRight } from 'lucide-react';
import styles from './StartupProfileBanner.module.css';

/**
 * StartupProfileBanner - A persistent, non-intrusive header notification
 * for the Startup Dashboard when the profile is missing.
 */
const StartupProfileBanner = ({ onRedirect, status, approvalStatus }) => {
  // Normalize status to string and uppercase for robust comparison
  // Check both status and approvalStatus fields as returned by different backend endpoints
  const currentStatus = (status !== undefined && status !== null) ? status : approvalStatus;
  const statusStr = String(currentStatus || '').toUpperCase();
  
  const isPending = statusStr === 'PENDING' || currentStatus === 0 || currentStatus === '0';
  const isRejected = statusStr === 'REJECTED' || currentStatus === 2 || currentStatus === '2';
  
  return (
    <div className={`${styles.bannerContainer} ${isPending ? styles.pending : ''} ${isRejected ? styles.rejected : ''}`}>
      <div className={styles.bannerContent}>
        <div className={styles.leftSection}>
          <div className={styles.iconCircle}>
            <AlertCircle size={20} />
          </div>
          <div className={styles.textWrapper}>
            <h4 className={styles.title}>
              {isPending 
                ? 'Hồ sơ Startup đang chờ phê duyệt' 
                : isRejected 
                  ? 'Hồ sơ Startup bị từ chối' 
                  : 'Hồ sơ Startup của bạn chưa hoàn thiện'}
            </h4>
            <p className={styles.description}>
              {isPending 
                ? 'Thông tin của bạn đang được đội ngũ AISEP kiểm tra. Bạn vẫn có thể cập nhật thông tin nếu cần thiết.' 
                : isRejected
                  ? 'Vui lòng kiểm tra lý do và cập nhật lại thông tin để được phê duyệt lại.'
                  : 'Hoàn thiện hồ sơ để có thể đăng dự án, thu hút nhà đầu tư và sử dụng đầy đủ tính năng của AISEP.'}
            </p>
          </div>
        </div>
        {onRedirect && (
          <button className={styles.actionBtn} onClick={onRedirect}>
            <span>{isPending || isRejected ? 'Cập nhật hồ sơ' : 'Hoàn thiện ngay'}</span>
            <ArrowRight size={16} />
          </button>
        )}
      </div>
    </div>
  );
};

export default StartupProfileBanner;
