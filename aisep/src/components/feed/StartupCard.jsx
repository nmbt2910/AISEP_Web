import React, { useState, useEffect } from 'react';
import {
  DotsThree,
  CurrencyDollar,
  ChartBar,
  Sword,
  Star,
  Briefcase,
  LockSimple,
  Heart,
  ChatCircleText,
  Checks,
  WarningCircle,
  HeartBreak,
  TrendUp,
  CaretRight
} from '@phosphor-icons/react';
import Badge from '../common/Badge';
import InvestmentModal from '../common/InvestmentModal';
import styles from './StartupCard.module.css';
import followerService from '../../services/followerService';
import RequestInfoModal from '../common/RequestInfoModal';
import dealsService from '../../services/dealsService';

/**
 * StartupCard Component - "Visual Priority (Concept C)"
 * Clean, full-width data density
 */
function StartupCard({ startup, isPaidUser = false, user, followedProjectIds, sentConnectionIds, investedProjectIds = new Set(), investors = [], onInvestmentSuccess, onViewProfile, onViewProject, index = 0, isReturning = false, isInvestorApproved = false, onRestrictedAction, myStartupProfileId = null }) {
  const [isLoading, setIsLoading] = useState(false);
  const [isInterested, setIsInterested] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [hasRequested, setHasRequested] = useState(false);
  const [showInvestmentModal, setShowInvestmentModal] = useState(false);
  const [investmentStatus, setInvestmentStatus] = useState(null); // New: track investment status

  // Check if user is investor
  // Backend returns role as string: "Investor", "Startup", "Advisor", "Staff", "Admin"
  // OR as number: 1=Investor, 0=Startup, 2=Advisor, 3=Staff, 4=Admin
  const isInvestor = user && (
    user.role === 'investor' ||
    user.role === 'Investor' ||
    user.role === 1 ||
    String(user.role) === '1'
  );

  // Initialize follow state from passed followedProjectIds (instant, no API call)
  React.useEffect(() => {
    if (isInvestor && startup.id && followedProjectIds) {
      const isFollowing = followedProjectIds.has(startup.id);
      setIsInterested(isFollowing);
    }
  }, [isInvestor, startup.id, followedProjectIds]);

  // Initialize request state from passed sentConnectionIds (instant, no API call)
  React.useEffect(() => {
    if (isInvestor && startup.id && sentConnectionIds) {
      const hasRequest = sentConnectionIds.has(startup.id);
      setHasRequested(hasRequest);
    }
  }, [isInvestor, startup.id, sentConnectionIds]);

  // NEW: Fetch investment status for this project
  // DISABLED: This causes too much API spam when rendering many cards
  // Each card was calling getInvestorDeals() separately, creating dozens of API calls
  // TODO: Instead, fetch deals once at dashboard level and pass down as prop
  /*
  React.useEffect(() => {
    if (!isInvestor || !startup.id) {
      setInvestmentStatus(null);
      return;
    }

    const fetchInvestmentStatus = async () => {
      try {
        console.log(`[StartupCard ${startup.id}] Fetching investment status for: ${startup.organizationName || 'Unknown'}`);
        const dealsRes = await dealsService.getInvestorDeals();
        console.log(`[StartupCard ${startup.id}] Full dealsRes:`, dealsRes);
        
        // Handle multiple response formats
        let deals = [];
        if (dealsRes?.data?.items && Array.isArray(dealsRes.data.items)) {
          deals = dealsRes.data.items;
          console.log(`[StartupCard ${startup.id}] Using data.items format - found ${deals.length} deals`);
        } else if (Array.isArray(dealsRes?.data)) {
          deals = dealsRes.data;
          console.log(`[StartupCard ${startup.id}] Using data as array format - found ${deals.length} deals`);
        } else if (Array.isArray(dealsRes)) {
          deals = dealsRes;
          console.log(`[StartupCard ${startup.id}] Using direct array format - found ${deals.length} deals`);
        } else {
          console.warn(`[StartupCard ${startup.id}] Unexpected response format:`, dealsRes);
          deals = [];
        }
        
        console.log(`[StartupCard ${startup.id}] All deals:`, deals.map(d => ({
          dealId: d.dealId,
          projectName: d.projectName,
          projectId: d.projectId,
          status: d.status
        })));
        
        // Find if user has invested in this project by matching organizationName
        const projectNameLower = startup.organizationName?.toLowerCase() || '';
        console.log(`[StartupCard ${startup.id}] Looking for projectName: "${projectNameLower}"`);
        
        const deal = deals.find(d => {
          const dealProjectName = d.projectName?.toLowerCase() || '';
          const match = dealProjectName === projectNameLower;
          console.log(`[StartupCard ${startup.id}] Compare: "${dealProjectName}" === "${projectNameLower}" → ${match}`);
          return match;
        });
        
        if (deal) {
          console.log(`[StartupCard ${startup.id}] ✓ FOUND investment deal:`, deal);
          setInvestmentStatus({
            dealId: deal.dealId,
            status: deal.status,
            investorConfirmed: deal.investorConfirmed,
            startupConfirmed: deal.startupConfirmed,
            amount: deal.amount,
            equityPercentage: deal.equityPercentage
          });
        } else {
          console.log(`[StartupCard ${startup.id}] ✗ No investment found`);
          setInvestmentStatus(null);
        }
      } catch (error) {
        console.error(`[StartupCard ${startup.id}] Failed to fetch investment status:`, error);
        setInvestmentStatus(null);
      }
    };

    fetchInvestmentStatus();
  }, [isInvestor, startup.id, startup.organizationName]);
  */

  // Listen for deal_created event to refresh investment status
  // DISABLED: Part of the investment status fetch that was causing spam
  /*
  React.useEffect(() => {
    const handleDealCreated = (event) => {
      console.log(`[StartupCard ${startup.id}] Deal created event received:`, event.detail);
      // Re-fetch investment status when a new deal is created
      if (isInvestor && startup.organizationName) {
        dealsService.getInvestorDeals().then(res => {
          const deals = res?.data?.items || [];
          const projectName = startup.organizationName?.toLowerCase() || '';
          const deal = deals.find(d => d.projectName?.toLowerCase() === projectName);
          
          if (deal) {
            console.log(`[StartupCard ${startup.id}] Investment status updated after deal creation`);
            setInvestmentStatus({
              dealId: deal.dealId,
              status: deal.status,
              investorConfirmed: deal.investorConfirmed,
              startupConfirmed: deal.startupConfirmed,
              amount: deal.amount,
              equityPercentage: deal.equityPercentage
            });
          }
        }).catch(err => console.error(`[StartupCard ${startup.id}] Error updating status:`, err));
      }
    };

    if (isInvestor) {
      window.addEventListener('deal_created', handleDealCreated);
      return () => window.removeEventListener('deal_created', handleDealCreated);
    }
  }, [isInvestor, startup.id, startup.organizationName]);
  */

  // Handle interest button click - toggle follow/unfollow
  const showToast = (message, type = 'success') => {
    setToast({ visible: true, message, type });
    setTimeout(() => {
      setToast(prev => ({ ...prev, visible: false }));
    }, 3000);
  };

  const handleInterestClick = async (e) => {
    e.stopPropagation();
    if (!user) return;

    setIsLoading(true);
    try {
      if (isInterested) {
        const response = await followerService.unfollowProject(startup.id);
        if (response && (response.success || response.data)) {
          setIsInterested(false);
          showToast('Đã bỏ theo dõi', 'success');
        } else {
          showToast(response?.message || 'Không thể hủy quan tâm', 'error');
        }
      } else {
        const response = await followerService.followProject(startup.id);
        if (response && (response.success || response.data)) {
          setIsInterested(true);
          showToast('Đã thêm vào quan tâm', 'success');
        } else {
          showToast(response?.message || 'Không thể thêm quan tâm', 'error');
        }
      }
    } catch (error) {
      console.error(`[StartupCard ${startup.id}] Failed to toggle follow:`, error);
      showToast('Kết nối thất bại', 'error');
    } finally {
      setIsLoading(false);
    }
  };
  // Utility for avatar gradient based on tag/industry
  const getAvatarGradient = (mainTag) => {
    const t = (mainTag || '').toLowerCase();
    if (t.includes('fintech')) return 'linear-gradient(135deg, #2D7EFF, #5BA8FF)'; // blue
    if (t.includes('agritech') || t.includes('nông nghiệp')) return 'linear-gradient(135deg, #00BA7C, #43E5A0)'; // green
    if (t.includes('ai') || t.includes('saas')) return 'linear-gradient(135deg, #8B5CF6, #B794F4)'; // purple
    if (t.includes('hardware') || t.includes('phần cứng')) return 'linear-gradient(135deg, #FFAD1F, #FFC85C)'; // amber
    return 'linear-gradient(135deg, #F4212E, #FF7A85)'; // red fallback
  };

  const getStageColor = (stage) => {
    const s = (stage || '').toLowerCase();
    if (s.includes('mvp')) return { bg: 'rgba(45, 126, 255, 0.15)', color: '#2D7EFF' }; // Blue dim
    if (s.includes('growth') || s.includes('vận hành') || s.includes('tăng trưởng')) return { bg: 'rgba(0, 186, 124, 0.15)', color: '#00ba7c' }; // Green dim
    if (s.includes('idea') || s.includes('ý tưởng')) return { bg: 'rgba(255, 173, 31, 0.15)', color: '#ffad1f' }; // Amber dim
    return { bg: 'var(--surface2, rgba(255,255,255,0.05))', color: 'var(--text-muted)' };
  };

  const industryValue = (startup.tags && startup.tags.length > 0) ? startup.tags : (startup.industry || '');
  const mainTag = Array.isArray(industryValue) ? industryValue[0] : industryValue;
  const stageStyles = getStageColor(startup.stage);

  // Priority: mapped startupName > organization > company > project-owner-name fallback
  // The 'startup' object passed from MainLayout should have either startupName or the original fields
  const startupNameDisp = startup.startupName || startup.organizationName || startup.companyName || 'Startup';

  // Robust ID extraction for navigation
  const sid = startup.startupId || startup.userId || startup.id;

  const roleStr = user?.role?.toString().toLowerCase() || '';
  const roleNum = Number(user?.role);
  const isBypassRole = roleStr === 'staff' || roleStr === 'operationstaff' || roleStr === 'operation_staff' || roleStr === 'advisor' || roleNum === 3 || roleNum === 2;

  const isUnlocked = isBypassRole || startup.isUnlockedByCurrentUser || (myStartupProfileId && startup.startupId === myStartupProfileId);

  const PremiumLock = () => {
    if (isBypassRole) return <div style={{ fontSize: '15px' }}>—</div>;
    if (isUnlocked) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', fontSize: '11px', fontWeight: 'bold', color: 'var(--primary-blue)', background: 'rgba(45, 126, 255, 0.1)', padding: '2px 8px', borderRadius: '4px' }}>
          Xem chi tiết <CaretRight size={12} weight="bold" />
        </div>
      );
    }
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', fontSize: '11px', fontWeight: 'bold', color: '#ffad1f', background: 'rgba(255, 173, 31, 0.1)', padding: '2px 8px', borderRadius: '4px' }}>
        <LockSimple size={12} weight="bold" /> {isPaidUser ? 'Mở khóa ngay' : 'Premium'}
      </div>
    );
  };

  const PremiumLockText = () => {
    if (isBypassRole) return <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>—</span>;
    if (isUnlocked) {
      return (
        <span style={{ color: 'var(--primary-blue)', fontSize: '13px', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          Xem chi tiết <CaretRight size={12} weight="bold" />
        </span>
      );
    }
    return (
      <span style={{ color: '#ffad1f', fontSize: '13px', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
        <LockSimple size={12} weight="bold" /> {isPaidUser ? 'Mở khóa ngay' : 'Yêu cầu Premium'}
      </span>
    );
  };

  return (
    <article
      key={startup.id}
      className={styles.card}
      onClick={() => onViewProject && onViewProject(startup.id)}
      style={{
        cursor: onViewProject ? 'pointer' : 'default',
        '--index': index,
        ...(isReturning ? { animation: 'none', opacity: 1, transform: 'none' } : {})
      }}
    >
      {/* 1. Header Row */}
      <div className={styles.cardHeader}>
        <div
          className={`${styles.avatarCircle} ${onViewProfile ? styles.clickable : ''}`}
          style={{ background: !(startup.logoUrl || startup.logo) ? getAvatarGradient(mainTag) : '#fff' }}
          onClick={(e) => { e.stopPropagation(); onViewProfile && onViewProfile(sid); }}
        >
          {startup.logoUrl || startup.logo ? (
            <img
              src={startup.logoUrl || startup.logo}
              alt={startupNameDisp}
              className={styles.avatarImg}
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.parentElement.style.background = getAvatarGradient(mainTag);
                e.target.parentElement.innerText = startupNameDisp.charAt(0).toUpperCase();
              }}
            />
          ) : (
            startupNameDisp.charAt(0).toUpperCase()
          )}
        </div>

        <div className={styles.headerInfo}>
          <div className={styles.nameRow}>
            <span
              className={`${styles.name} ${onViewProfile ? styles.clickableName : ''}`}
              onClick={(e) => { e.stopPropagation(); onViewProfile && onViewProfile(sid); }}
            >
              {startupNameDisp}
            </span>
            <span className={styles.date}>{startup.timestamp}</span>
          </div>
          <div className={styles.badgeRow}>
            {/* AI Badge */}
            <Badge
              label={startup.score === undefined ? '' : (startup.score === null ? '__' : String(startup.score))}
              isLoading={startup.score === undefined}
              variant={
                startup.score === undefined || startup.score === null
                  ? 'updating'
                  : startup.score >= 80
                    ? 'score-good'
                    : startup.score >= 50
                      ? 'score-medium'
                      : 'score-poor'
              }
              size="sm"
            />

            {/* Stage Pill */}
            {startup.stage && (
              <span
                className={styles.stagePill}
                style={{ background: stageStyles.bg, color: stageStyles.color }}
              >
                {startup.stage}
              </span>
            )}

            {/* Tags */}
            {(() => {
              const tags = (startup.tags && startup.tags.length > 0) 
                ? startup.tags 
                : (Array.isArray(startup.industry) ? startup.industry : (startup.industry ? [startup.industry] : []));
              return tags.slice(0, 3).map(tag => (
                <span key={tag} className={styles.tag}>#{tag}</span>
              ));
            })()}
          </div>
        </div>

        <div className={styles.menuIconWrapper}>
          <DotsThree size={18} weight="bold" />
        </div>
      </div>

      {/* 2. Main Content (Side-by-side on desktop) */}
      <div className={styles.bodyWrapper}>
        <div className={styles.mainInfo}>
          <h3 className={styles.projectName}>{startup.name}</h3>

          {/* Description (2-line clamp) */}
          <div className={styles.description}>
            {startup.description}
          </div>

          {/* Social Proof Row (Followers & Investors) */}
          {(startup.followerCount > 0 || (investors && investors.length > 0)) && (
            <div className={styles.socialProofRow} onClick={(e) => e.stopPropagation()}>
              {/* Follower Pill */}
              {startup.followerCount > 0 && (
                <div className={`${styles.proofPill} ${styles.followerPill}`}>
                  <Star size={14} weight="fill" />
                  <span>
                    <span className={styles.pillLabel}>{startup.followerCount}</span>
                    <span className={styles.statText}>người quan tâm</span>
                  </span>
                </div>
              )}

              {/* Investor Pill */}
              {investors && investors.length > 0 && (
                <div
                  className={`${styles.proofPill} ${styles.investorPill} ${styles.clickablePill}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (investors.length === 1) {
                      onViewProfile && onViewProfile(investors[0].id, 'investor');
                    }
                  }}
                  title={investors.length === 1 ? `Xem hồ sơ ${investors[0].name}` : `${investors.length} nhà đầu tư chuyên nghiệp`}
                >
                  <Briefcase size={14} weight="fill" />
                  <span className={styles.statText} style={{ marginRight: '4px' }}>Được đầu tư bởi</span>

                  <div className={styles.avatarStack}>
                    {investors.slice(0, 3).map((investor, idx) => (
                      <div
                        key={investor.id || idx}
                        className={styles.stackedAvatar}
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewProfile && onViewProfile(investor.id, 'investor');
                        }}
                        style={{
                          backgroundImage: investor.avatar ? `url(${investor.avatar})` : 'none',
                        }}
                        title={investor.name || 'Investor'}
                      >
                        {!investor.avatar && investor.name?.charAt(0).toUpperCase()}
                      </div>
                    ))}
                    {investors.length > 3 && (
                      <div className={styles.moreCount}>+{investors.length - 3}</div>
                    )}
                  </div>

                  {investors.length === 1 && (
                    <span className={styles.investorName}>{investors[0].name}</span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Project Image Thumbnail */}
        {startup.imageUrl && (
          <div className={styles.imageWrapper}>
            <img
              src={startup.imageUrl}
              alt={startup.name}
              loading="lazy"
            />
          </div>
        )}
      </div>

      {/* 3. Three-column Highlight Grid */}
      <div className={styles.gridRow} onClick={(e) => e.stopPropagation()}>
        {/* Revenue */}
        <div className={styles.highlightBox} style={{ backgroundColor: 'rgba(45, 126, 255, 0.08)', borderColor: 'rgba(45, 126, 255, 0.2)' }}>
          <div className={styles.boxIcon}><CurrencyDollar size={24} weight="duotone" style={{ color: '#2D7EFF' }} /></div>
          {startup.revenue !== undefined ? (
            <div className={`${styles.boxValue} ${styles.blueText}`} style={{ fontSize: '15px' }}>
              {startup.revenue ? `${startup.revenue.toLocaleString('vi-VN')} VND` : '0 VND'}
            </div>
          ) : <PremiumLock />}
          <div className={styles.boxLabel}>Doanh thu</div>
        </div>

        {/* Market Size */}
        <div className={styles.highlightBox} style={{ backgroundColor: 'rgba(0, 186, 124, 0.08)', borderColor: 'rgba(0, 186, 124, 0.2)' }}>
          <div className={styles.boxIcon}><ChartBar size={24} weight="duotone" style={{ color: '#00ba7c' }} /></div>
          {startup.marketSize !== undefined ? (
            <div className={`${styles.boxValue} ${styles.greenText}`} style={{ fontSize: '15px' }}>
              {startup.marketSize ? `${startup.marketSize.toLocaleString('vi-VN')} VND` : '0 VND'}
            </div>
          ) : <PremiumLock />}
          <div className={styles.boxLabel}>Thị trường</div>
        </div>

        {/* Competitors (Always Show) */}
        <div className={styles.highlightBox} style={{ backgroundColor: 'rgba(113, 118, 123, 0.08)', borderColor: 'rgba(113, 118, 123, 0.2)' }}>
          <div className={styles.boxIcon}><Sword size={24} weight="duotone" style={{ color: '#71767b' }} /></div>
          {startup.competitors !== undefined ? (
            <div className={`${styles.boxValue} ${styles.grayText}`} style={{ fontSize: '15px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {startup.competitors || '—'}
            </div>
          ) : <PremiumLock />}
          <div className={styles.boxLabel}>Đối thủ chính</div>
        </div>
      </div>

      {/* 4. Detail Rows */}
      <div className={styles.detailRows}>
        {(startup.businessModel === undefined || startup.businessModel) && (
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Mô hình KD</span>
            <span className={styles.detailValue}>
              {startup.businessModel !== undefined ? startup.businessModel : <PremiumLockText />}
            </span>
          </div>
        )}
        {startup.targetCustomers && (
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Khách hàng</span>
            <span className={styles.detailValue}>{startup.targetCustomers}</span>
          </div>
        )}
        {startup.uniqueValueProposition && (
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Giá trị</span>
            <span className={`${styles.detailValue} ${styles.blueText}`}>{startup.uniqueValueProposition}</span>
          </div>
        )}
      </div>

      {/* 5. Team Line */}
      {(startup.teamMembers === undefined || startup.teamMembers) && (
        <div className={styles.teamLine}>
          <strong style={{ color: 'var(--text-primary)' }}>Team:</strong>{' '}
          {startup.teamMembers !== undefined ? startup.teamMembers : <PremiumLockText />}
        </div>
      )}

      {/* 6. Action Buttons for Investors */}
      {isInvestor && (
        <>
          <div className={styles.actionButtonsRow} onClick={(e) => e.stopPropagation()}>
            {/* Follow/Unfollow Button */}
            <button
              onClick={handleInterestClick}
              disabled={isLoading}
              className={`${styles.pillButton} ${isInterested ? styles.btnFollowing : styles.btnFollow}`}
            >
              {isInterested ? (
                <>
                  <div className={`${styles.stateLayer} ${styles.followingNormal}`}>
                    <Heart size={18} weight="fill" />
                    <span>{isLoading ? 'Đang xử lý...' : 'Đang quan tâm'}</span>
                  </div>
                  <div className={`${styles.stateLayer} ${styles.followingHover}`}>
                    <HeartBreak size={18} weight="bold" />
                    <span>{isLoading ? 'Đang xử lý...' : 'Hủy theo dõi'}</span>
                  </div>
                </>
              ) : (
                <>
                  <Heart size={18} weight="bold" />
                  <span>{isLoading ? 'Đang xử lý...' : 'Quan tâm'}</span>
                </>
              )}
            </button>

            {/* Request Info Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (!isInvestorApproved) {
                  onRestrictedAction?.('Bạn cần được phê duyệt hồ sơ Nhà đầu tư để yêu cầu kết nối và xem thông tin chi tiết của dự án.');
                  return;
                }
                if (!hasRequested) setShowRequestModal(true);
              }}
              disabled={hasRequested}
              className={`${styles.pillButton} ${hasRequested ? styles.btnRequested : styles.btnRequest} ${!isInvestorApproved ? styles.btnDisabled : ''}`}
            >
              <div className={styles.btnInner}>
                {hasRequested ? <Checks size={18} weight="bold" /> : <ChatCircleText size={18} weight="bold" />}
                <span className={styles.btnLabel}>
                  <span className={styles.desktopText}>
                    {hasRequested ? 'Đã yêu cầu thông tin' : 'Yêu cầu thông tin'}
                  </span>
                  <span className={styles.mobileText}>
                    {hasRequested ? 'Đã yêu cầu' : 'Yêu cầu'}
                  </span>
                </span>
              </div>
            </button>

            {/* Invest Button OR Investment Status Badge */}
            {investmentStatus ? (
              <div
                title={`Trạng thái: ${investmentStatus.status}\nDeal #${investmentStatus.dealId}`}
                className={styles.statusBadge}
              >
                <span>
                  {investmentStatus.status === 'Pending' && '🟡'}
                  {investmentStatus.status === 'Confirmed' && '🟢'}
                  {investmentStatus.status === 'Contract_Signed' && '🟣'}
                  {investmentStatus.status === 'Minted_NFT' && '✨'}
                  {investmentStatus.status === 'Failed' && '🔴'}
                </span>
                <span>
                  {investmentStatus.status === 'Pending' && 'Đang chờ'}
                  {investmentStatus.status === 'Confirmed' && 'Đã duyệt'}
                  {investmentStatus.status === 'Contract_Signed' && 'Đã ký kết'}
                  {investmentStatus.status === 'Minted_NFT' && 'Đã mint'}
                  {investmentStatus.status === 'Failed' && 'Thất bại'}
                </span>
              </div>
            ) : investedProjectIds && investedProjectIds.has(startup.id) ? (
              <div className={`${styles.pillButton} ${styles.btnInvested}`}>
                <TrendUp size={18} weight="bold" /> Đã đầu tư
              </div>
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (!isInvestorApproved) {
                    onRestrictedAction?.('Bạn cần được phê duyệt hồ sơ Nhà đầu tư để gửi yêu cầu đầu tư vào dự án.');
                    return;
                  }
                  setShowInvestmentModal(true);
                }}
                className={`${styles.pillButton} ${styles.btnInvest} ${!isInvestorApproved ? styles.btnDisabled : ''}`}
              >
                <CurrencyDollar size={18} weight="bold" />
                Đầu tư
              </button>
            )}
          </div>

          {/* Micro-Toast Feedback */}
          <div className={`${styles.toastContainer} ${toast.visible ? styles.toastVisible : ''}`}>
            <div className={`${styles.toastContent} ${toast.type === 'error' ? styles.toastError : styles.toastSuccess}`}>
              {toast.type === 'success' ? <Checks size={16} weight="bold" /> : <WarningCircle size={16} weight="bold" />}
              {toast.message}
            </div>
          </div>

          {/* RequestInfoModal */}
          <RequestInfoModal
            isOpen={showRequestModal}
            onClose={() => setShowRequestModal(false)}
            projectId={startup.id}
            projectName={startup.name}
            onSuccess={() => {
              setHasRequested(true);
              showToast('Đã gửi yêu cầu kết nối', 'success');
            }}
          />

          {/* InvestmentModal */}
          <InvestmentModal
            isOpen={showInvestmentModal}
            projectId={startup.id}
            projectName={startup.name}
            startupName={startup.startupName || 'Startup'}
            onClose={() => setShowInvestmentModal(false)}
            onSuccess={() => {
              onInvestmentSuccess?.();
              showToast('Yêu cầu đầu tư thành công', 'success');
            }}
          />
        </>
      )}
    </article>
  );
}

export default React.memo(StartupCard);
