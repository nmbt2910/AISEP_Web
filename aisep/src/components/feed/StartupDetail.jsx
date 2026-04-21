import React, { useState, useEffect } from 'react';
import {
  ArrowLeft, MapPin, Globe, Phone, Building2, CheckCircle,
  Users, Calendar, AlertCircle, Loader, Mail, User, Briefcase
} from 'lucide-react';
import styles from './StartupDetail.module.css';
import startupProfileService from '../../services/startupProfileService';
import ProfileLoading from '../common/ProfileLoading';
import ProfileErrorScreen from '../common/ProfileErrorScreen';
import AuthRequirementScreen from '../common/AuthRequirementScreen';

const DISPLAY = (val, fallback = 'Đang cập nhật') =>
  val && String(val).trim() ? val : fallback;

export default function StartupDetail({ startupId, onBack, user, onShowLogin }) {
  const [startup, setStartup] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    const fetchStartup = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await startupProfileService.getStartupById(startupId);
        if (data) {
          setStartup(data);
        } else {
          setError('Không tìm thấy thông tin startup.');
        }
      } catch (err) {
        setError(err?.message || 'Lỗi khi tải thông tin startup. Vui lòng thử lại sau.');
      } finally {
        setIsLoading(false);
      }
    };

    if (startupId) fetchStartup();
  }, [startupId]);

  if (!user) {
    return (
      <AuthRequirementScreen 
        type="startup" 
        onBack={onBack} 
        onLogin={onShowLogin} 
      />
    );
  }

  if (isLoading) {
    return <ProfileLoading message="Đang tải thông tin startup..." />;
  }

  if (error || !startup) {
    return (
      <ProfileErrorScreen
        title="startup"
        message={error}
        onBack={onBack}
        onRetry={() => {
          setError(null);
          setIsLoading(true);
          startupProfileService.getStartupById(startupId)
            .then(data => data ? setStartup(data) : setError('Không tìm thấy thông tin startup.'))
            .catch(err => setError(err?.message || 'Lỗi khi tải thông tin startup.'))
            .finally(() => setIsLoading(false));
        }}
      />
    );
  }

  // Helpers
  const initial = (startup.companyName || 'S').charAt(0).toUpperCase();

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Đang cập nhật';
    const d = new Date(dateStr);
    return `Tháng ${d.getMonth() + 1} ${d.getFullYear()}`;
  };

  const isApproved = startup.approvalStatus === 'Approved';

  return (
    <div className={styles.container}>
      {/* ─── 1. Glassmorphism Top Nav (Overlap) ─── */}
      <div className={styles.topNav}>
        <button className={styles.backBtn} onClick={onBack} aria-label="Back">
          <ArrowLeft size={20} />
        </button>
        <div className={styles.navTitle}>
          <h2>{DISPLAY(startup.companyName)}</h2>
          <span>Startup</span>
        </div>
      </div>

      {/* ─── 2. Cover Banner (Mesh Gradient) ─── */}
      <div className={styles.coverWrapper}>
        <div className={styles.coverOverlay} />
      </div>

      {/* ─── 3. Floating Profile Card (Compact) ─── */}
      <div className={styles.profileCard}>
        <div className={styles.cardHeaderRow}>
          <div className={styles.avatar}>
            {startup.logoUrl ? (
              <img src={startup.logoUrl} alt={startup.companyName} className={styles.avatarImg} />
            ) : (
              <div className={styles.initialText}>{initial}</div>
            )}
          </div>
          <div className={styles.headerActions}>
            {/* Connection button removed per user request */}
          </div>
        </div>

        <div className={styles.profileInfo}>
          <div className={styles.nameRow}>
            <h1 className={styles.name}>{DISPLAY(startup.companyName)}</h1>
            {isApproved && (
              <span className={styles.verifiedChip}>
                <CheckCircle size={14} />
                Đã xác minh
              </span>
            )}
          </div>
          
          <div className={styles.handle}>
            {startup.industry ? `#${startup.industry.toLowerCase().replace(/\s+/g, '')}` : 'Startup'}
          </div>

          <p className={styles.bio}>
            {startup.founder 
              ? `Được sáng lập bởi ${startup.founder}. Một startup tiềm năng đang hoạt động trong lĩnh vực ${startup.industry?.toLowerCase() || 'công nghệ'}.`
              : "Thông tin giới thiệu về startup đang được cập nhật."
            }
          </p>

          <div className={styles.metaRow}>
            <div className={styles.metaItem}>
              <MapPin size={15} />
              <span>{DISPLAY(startup.countryCity)}</span>
            </div>
            {startup.website && (
              <div className={styles.metaItem}>
                <Globe size={15} />
                <a href={startup.website} target="_blank" rel="noopener noreferrer">
                  {startup.website.replace(/^https?:\/\//, '')}
                </a>
              </div>
            )}
            <div className={styles.metaItem}>
              <Calendar size={15} />
              <span>Tham gia {formatDate(startup.createdAt)}</span>
            </div>
          </div>
        </div>

        {/* Info Stats Strip */}
        <div className={styles.statsStrip}>
          <div className={styles.statItem}>
            <div className={styles.statEmoji}>🚀</div>
            <div className={styles.statValue}>Startup</div>
            <div className={styles.statLabel}>Loại hình</div>
          </div>
          <div className={styles.statItem}>
            <div className={styles.statEmoji}>👥</div>
            <div className={styles.statValue}>{startup.followerCount ?? 0}</div>
            <div className={styles.statLabel}>Theo dõi</div>
          </div>
          <div className={styles.statItem}>
            <div className={styles.statEmoji}>🏢</div>
            <div className={styles.statValue}>Active</div>
            <div className={styles.statLabel}>Trạng thái</div>
          </div>
          <div className={styles.statItem}>
            <div className={styles.statEmoji}>📍</div>
            <div className={styles.statValue}>{startup.countryCity ? startup.countryCity.split(',')[0] : 'VN'}</div>
            <div className={styles.statLabel}>Khu vực</div>
          </div>
        </div>
      </div>

      {/* ─── 4. Tabs & Content Row ─── */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'overview' ? styles.active : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Tổng quan
          {activeTab === 'overview' && <div className={styles.indicator} />}
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'contact' ? styles.active : ''}`}
          onClick={() => setActiveTab('contact')}
        >
          Liên hệ
          {activeTab === 'contact' && <div className={styles.indicator} />}
        </button>
      </div>

      <div className={styles.feedContent}>
        {activeTab === 'overview' && (
          <>
            {/* Feed Row: Industry */}
            <div className={styles.feedRow}>
              <div className={`${styles.iconBox} ${styles.purpleBox}`}>🏢</div>
              <div className={styles.rowContent}>
                <div className={styles.rowTitle}>Lĩnh vực hoạt động</div>
                <div className={styles.rowText}>{DISPLAY(startup.industry)}</div>
              </div>
            </div>

            {/* Feed Row: Strategy */}
            <div className={styles.feedRow}>
              <div className={`${styles.iconBox} ${styles.blueBox}`}>🎯</div>
              <div className={styles.rowContent}>
                <div className={styles.rowTitle}>Chiến lược phát triển</div>
                <div className={styles.rowText}>
                  Startup tập trung vào việc mở rộng thị trường và tối ưu hóa giải pháp {startup.industry?.toLowerCase() || 'công nghệ'} cho khách hàng.
                </div>
              </div>
            </div>

            {/* Feed Row: Verification */}
            <div className={styles.feedRow}>
              <div className={`${styles.iconBox} ${styles.greenBox}`}>🛡️</div>
              <div className={styles.rowContent}>
                <div className={styles.rowTitle}>Trạng thái hồ sơ</div>
                <div className={styles.rowText}>
                    {startup.approvalStatus === 'Approved' ? 'Hồ sơ đã được đội ngũ AISEP xác minh độ tin cậy.' 
                    : 'Hồ sơ đang trong quá trình xét duyệt bởi đội ngũ AISEP.'}
                </div>
                <div className={styles.chipRow}>
                   <span className={styles.statusChip}>{isApproved ? 'Đã xác minh' : 'Đang xử lý'}</span>
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'contact' && (
          <>
            {/* Feed Row: Website */}
            {startup.website && (
              <a href={startup.website} target="_blank" rel="noopener noreferrer" className={styles.feedRow}>
                <div className={`${styles.iconBox} ${styles.blueBox}`}>🌐</div>
                <div className={styles.rowContent}>
                  <div className={styles.rowTitle}>Website chính thức</div>
                  <div className={styles.rowText}>{startup.website}</div>
                </div>
              </a>
            )}

            {/* Feed Row: Contact Details */}
            <div className={styles.feedRow}>
              <div className={`${styles.iconBox} ${styles.purpleBox}`}>✉️</div>
              <div className={styles.rowContent}>
                <div className={styles.rowTitle}>Thông tin liên hệ</div>
                {startup.contactInfo ? (
                  <div className={styles.chipRow}>
                    {startup.contactInfo.split('|').map((info, i) => (
                      <span key={i} className={styles.chip}>{info.trim()}</span>
                    ))}
                  </div>
                ) : (
                  <div className={styles.rowText}>Đang cập nhật</div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
