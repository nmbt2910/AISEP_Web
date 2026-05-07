import React, { useState, useEffect } from 'react';
import {
  ArrowLeft, MapPin, Star, CurrencyCircleDollar, Globe, Briefcase,
  Medal, EnvelopeSimple, CalendarBlank, CheckCircle, TrendUp, ClipboardText, Trophy
} from '@phosphor-icons/react';
import BookingWizard from '../booking/BookingWizard';
import styles from './AdvisorDetailView.module.css';
import advisorService from '../../services/advisorService';
import ProfileLoading from '../common/ProfileLoading';
import ProfileErrorScreen from '../common/ProfileErrorScreen';
import AuthRequirementScreen from '../common/AuthRequirementScreen';

/**
 * AdvisorDetailView - Enhanced profile view for an Advisor
 * Mirrors the structure of StartupDetail and InvestorDetail
 */
const AdvisorDetailView = ({ user, advisor, onBack, onShowLogin, isApproved, onRestrictedAction, onViewProject }) => {
  const [activeTab, setActiveTab] = useState('overview');

  // Modal state
  const [showBookingWizard, setShowBookingWizard] = useState(false);

  // Define role check
  const roleValue = user?.role;
  const roleStr = typeof roleValue === 'string' ? roleValue.toLowerCase() : '';
  const roleNum = Number(roleValue);
  // Booking dành cho Investor (role 1) và Startup (role 0)
  const canBook = roleStr === 'startup' || roleStr === 'investor' || roleNum === 0 || roleNum === 1;



  const handleOpenBooking = () => {
    if (!canBook) return;
    
    if (!isApproved) {
      onRestrictedAction?.('Bạn cần được phê duyệt hồ sơ để thực hiện Đặt lịch tư vấn.');
      return;
    }
    
    setShowBookingWizard(true);
  };

  const handleBookingSuccess = () => {
    // Booking successful - Wizard handles its own success UI
    setShowBookingWizard(false);
  };

  if (!user) {
    return (
      <AuthRequirementScreen
        type="cố vấn"
        onBack={onBack}
        onLogin={onShowLogin}
      />
    );
  }

  if (!advisor) {
    return (
      <ProfileErrorScreen
        title="cố vấn"
        message="Không thể tải thông tin cố vấn. Vui lòng quay lại và thử lại."
        onBack={onBack}
      />
    );
  }

  const handle = `@${advisor.userName?.toLowerCase().replace(/\s/g, '') || 'advisor'}`;
  const displayName = advisor.userName || advisor.name || 'A';
  const initial = String(displayName).charAt(0).toUpperCase() || 'A';
  const isAdvisorVerified = advisor.approvalStatus === 'Approved' || advisor.approvalStatus === 1;

  // Formatting currency/numbers
  const formatSalary = (val) => {
    if (!val) return 'Thỏa thuận';
    return val.toLocaleString('vi-VN');
  };

  // Derivative styles
  const getAvatarGradient = () => {
    const spec = (advisor.expertise || '').toLowerCase();
    if (spec.includes('fintech') || spec.includes('saas')) return 'linear-gradient(135deg,#2D7EFF,#00ba7c)';
    if (spec.includes('agritech')) return 'linear-gradient(135deg,#00ba7c,#009960)';
    if (spec.includes('ai') || spec.includes('ml')) return 'linear-gradient(135deg,#794bc4,#2D7EFF)';
    return 'linear-gradient(135deg,#2D7EFF,#00ba7c)';
  };

  // Extract industries from the new industries array (if present) or fallback to expertise string
  const expertiseTags = Array.isArray(advisor.industries) && advisor.industries.length > 0
    ? advisor.industries
    : (advisor.expertise ? advisor.expertise.split(',').map(s => s.trim()).filter(Boolean) : []);

  return (
    <div className={styles.container}>
      {/* 1. Sticky Top Nav (Preserved) */}
      <div className={styles.topNav}>
        <button className={styles.backBtn} onClick={onBack} aria-label="Quay lại">
          <ArrowLeft size={20} />
        </button>
        <div className={styles.navTitle}>
          <h2>{advisor.userName}</h2>
          <span>Cố vấn chuyên gia</span>
        </div>
      </div>

      {/* 2. Cover Banner (Refactored) */}
      <div className={styles.coverWrapper}>
        <div className={styles.coverOverlay}></div>
      </div>

      {/* 3. Floating Profile Card (Refactored) */}
      <div className={styles.profileCard}>
        {/* Top row: avatar left, action buttons right */}
        <div className={styles.cardHeaderRow}>
          <div className={styles.avatar} style={{ background: getAvatarGradient() }}>
            {(advisor.profileImage &&
              typeof advisor.profileImage === 'string' &&
              advisor.profileImage.startsWith('http') &&
              !advisor.profileImage.includes('ui-avatars.com'))
              ? <img src={advisor.profileImage} alt={advisor.userName} className={styles.avatarImg} />
              : <span className={styles.initialText}>{initial}</span>
            }
          </div>
          <div className={styles.actionButtons}>
            {canBook && (
              <button className={styles.connectBtn} onClick={handleOpenBooking}>
                <TrendUp size={16} weight="bold" /> Đặt lịch
              </button>
            )}
          </div>
        </div>

        {/* Name, handle, verified badge */}
        <div className={styles.nameRow}>
          <h1 className={styles.name}>{advisor.userName}</h1>
          {isAdvisorVerified && (
            <span className={styles.verifiedChip}>
              <CheckCircle size={14} weight="fill" /> Đã xác minh
            </span>
          )}
        </div>
        <div className={styles.handle}>{handle}</div>

        {/* Bio */}
        <div className={styles.bio}>
          {advisor.bio || 'Chưa có thông tin giới thiệu.'}
        </div>

        {/* Specialty tags */}
        <div className={styles.specialtyTags}>
          {expertiseTags.map((tag, i) => (
            <span key={i} className={styles.tag}>#{tag}</span>
          ))}
        </div>

        {/* Meta row: location only (join date not provided by API) */}
        <div className={styles.metaRow}>
          <span className={styles.metaItem}>
            <MapPin size={16} weight="duotone" style={{ color: 'var(--primary-blue)' }} />
            {advisor.location || 'Nghề nghiệp tự do'}
          </span>
        </div>

        <div className={styles.statsStrip}>
          <div className={styles.statItem}>
            <div className={styles.statIcon}><CurrencyCircleDollar size={24} weight="duotone" color="#10b981" /></div>
            <div className={styles.statInfo}>
              <div className={styles.statValue}>{formatSalary(advisor.hourlyRate)}</div>
              <div className={styles.statLabel}>VNĐ/giờ</div>
            </div>
          </div>
          <div className={styles.statItem}>
            <div className={styles.statIcon}><Star size={24} weight="fill" color="#ffad1f" /></div>
            <div className={styles.statInfo}>
              <div className={styles.statValue}>{advisor.rating || '4.8'}</div>
              <div className={styles.statLabel}>Đánh giá</div>
            </div>
          </div>
          <div className={styles.statItem}>
            <div className={styles.statIcon}><Globe size={24} weight="duotone" color="var(--primary-blue)" /></div>
            <div className={styles.statInfo}>
              <div className={styles.statValue}>{advisor.languagesSpoken || 'VI · EN'}</div>
              <div className={styles.statLabel}>Ngôn ngữ</div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Tabs Navigation (Restyled) */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'overview' ? styles.active : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Tổng quan
          {activeTab === 'overview' && <div className={styles.indicator} />}
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'experience' ? styles.active : ''}`}
          onClick={() => setActiveTab('experience')}
        >
          Kinh nghiệm
          {activeTab === 'experience' && <div className={styles.indicator} />}
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'contact' ? styles.active : ''}`}
          onClick={() => setActiveTab('contact')}
        >
          Liên hệ
          {activeTab === 'contact' && <div className={styles.indicator} />}
        </button>
      </div>

      {/* 5. Tab Content (Feed-Style Rows) */}
      <div className={styles.feedContent}>
        {activeTab === 'overview' && (
          <>
            <div className={styles.feedRow}>
              <div className={`${styles.iconBox} ${styles.blueBox}`}>
                <ClipboardText size={22} weight="duotone" />
              </div>
              <div className={styles.rowContent}>
                <div className={styles.rowTitle}>Giới thiệu chuyên môn</div>
                <div className={styles.rowText}>
                  {advisor.bio || 'Đang cập nhật'}
                </div>
                <div className={styles.chipRow}>
                  {expertiseTags.map((tag, i) => (
                    <span key={i} className={styles.chip}>{tag}</span>
                  ))}
                </div>
              </div>
            </div>

          </>
        )}

        {activeTab === 'experience' && (
          <>
            <div className={styles.feedRow}>
              <div className={`${styles.iconBox} ${styles.purpleBox}`}>
                <Trophy size={22} weight="duotone" />
              </div>
              <div className={styles.rowContent}>
                <div className={styles.rowTitle}>Lịch sử làm việc & Kinh nghiệm</div>
                <div className={styles.rowText}>
                  {advisor.previousExperience || 'Đang cập nhật'}
                </div>
                <div className={styles.metaText}>Hiện tại · {advisor.location || 'Đang cập nhật'}</div>
              </div>
            </div>

            <div className={styles.feedRow}>
              <div className={`${styles.iconBox} ${styles.purpleBox}`}>
                <Briefcase size={22} weight="duotone" />
              </div>
              <div className={styles.rowContent}>
                <div className={styles.rowTitle}>Chứng chỉ & Bằng cấp</div>
                <div className={styles.certGrid}>
                  {advisor.certifications && String(advisor.certifications).trim() ? (
                    String(advisor.certifications)
                      .split('|')
                      .map((cert) => cert.trim())
                      .filter(Boolean)
                      .map((certLink, i) => (
                        <a
                          key={i}
                          className={styles.certCard}
                          href={certLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Mở chứng chỉ trong tab mới"
                        >
                          <Medal size={16} weight="duotone" className={styles.certIcon} />
                          <span className={styles.certName}>Mở chứng chỉ</span>
                        </a>
                      ))
                  ) : (
                    <div className={styles.rowText}>Đang cập nhật</div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'contact' && (
          <div className={styles.feedRow}>
            <div className={`${styles.iconBox} ${styles.blueBox}`}>
              <EnvelopeSimple size={22} weight="duotone" />
            </div>
            <div className={styles.rowContent}>
              <div className={styles.rowTitle}>Thông tin liên hệ</div>
              <div className={styles.rowText}>
                Email: {advisor.email || 'Đang cập nhật'}
              </div>
              <div className={styles.rowText}>
                Vị trí: {advisor.location || 'Đang cập nhật'}
              </div>
            </div>
          </div>
        )}
      </div>

      {showBookingWizard && (
        <BookingWizard
          user={user}
          initialAdvisorId={advisor.advisorId}
          isApproved={isApproved}
          onRestrictedAction={onRestrictedAction}
          onClose={() => setShowBookingWizard(false)}
          onViewProject={(pid) => {
            setShowBookingWizard(false);
            onViewProject?.(pid);
          }}
        />
      )}
    </div>
  );
};

export default AdvisorDetailView;
