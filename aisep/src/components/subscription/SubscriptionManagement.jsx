import React, { useState, useEffect, useCallback } from 'react';
import { 
  Sparkles, Crown, Check, ShieldCheck, 
  ArrowRight, Loader2, CreditCard, 
  Calendar, Zap, Eye, Ticket,
  X, AlertCircle, CheckCircle2, ChevronRight, ChevronDown
} from 'lucide-react';
import styles from './SubscriptionManagement.module.css';
import subscriptionService from '../../services/subscriptionService';
import userService from '../../services/userService';
import paymentService from '../../services/paymentService';
import SubscriptionPaymentModal from './SubscriptionPaymentModal';

/**
 * SubscriptionManagement - Desktop Optimized Standalone Page
 */
const SubscriptionManagement = ({ user }) => {
  const [subscription, setSubscription] = useState(null);
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checkoutData, setCheckoutData] = useState(null); 
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedPackageName, setSelectedPackageName] = useState('');
  const upgradeSectionRef = React.useRef(null);

  // Role check
  const roleStr = user?.role?.toString().toLowerCase() || '';
  const roleNum = Number(user?.role);
  const isInvestor = roleStr === 'investor' || roleNum === 1;

  const fetchData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const [subData, pkgData] = await Promise.all([
        subscriptionService.getMySubscription(),
        isInvestor ? paymentService.getInvestorPackages() : paymentService.getStartupPackages()
      ]);
      
      let finalSub = subData;
      if (!finalSub) {
        try {
          const bonusCount = await userService.getMyBonusBookings();
          if (bonusCount > 0) {
            finalSub = {
              remainingFreeBookings: 0,
              bonusFreeBookings: bonusCount,
              packageName: 'Miễn phí'
            };
          }
        } catch (err) {
          console.error("Failed to fetch bonus bookings for free user", err);
        }
      }
      
      setSubscription(finalSub);
      setPackages(pkgData?.items || pkgData || []);
    } catch (error) {
      console.error('Failed to fetch subscription data:', error);
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, [isInvestor]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);


  const handleCheckout = async (pkg) => {
    setIsProcessing(true);
    setSelectedPackageName(pkg.packageName);
    try {
      const result = await paymentService.checkoutSubscription(pkg.packageId);
      setCheckoutData(result);
    } catch (error) {
      console.error('Checkout failed:', error);
      alert('Không thể khởi tạo thanh toán. Vui lòng thử lại sau.');
    } finally {
      setIsProcessing(false);
    }
  };
  const handleModalClose = useCallback(() => {
    setCheckoutData(null);
  }, []);

  const handlePaymentSuccess = useCallback(() => {
    fetchData(true); // Silent background refresh
    
    // Dispatch a global event to notify other components (like SubscriptionPillCard)
    window.dispatchEvent(new CustomEvent('SUBSCRIPTION_UPDATED'));
  }, [fetchData]);

  const scrollToUpgrade = () => {
    upgradeSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className={styles.container} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <Loader2 className={styles.spin} size={48} color="var(--primary-blue)" />
      </div>
    );
  }

  const isPremium = (subscription?.status === 1 || subscription?.status === 'Active') && 
                    subscription?.packageName && 
                    !subscription.packageName.toLowerCase().includes('cơ bản') && 
                    !subscription.packageName.toLowerCase().includes('basic');

  const isLocked = !subscription || subscription.data === null || !subscription.packageName;

  // Find the details of the currently active package to get max quota limits
  const activePackage = packages.find(p => p.packageId === subscription?.packageId);


  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <h1 className={styles.title}>Quản lý gói dịch vụ</h1>
        <p className={styles.subtitle}>Kiểm tra hiện trạng và nâng cấp các quyền lợi Gói dịch vụ chuyên sâu</p>
      </header>

      {/* Hero Overview: Status & Usage */}
      <section className={styles.overviewGrid}>
        {/* Current Plan Card */}
        <div className={`${styles.card} ${styles.planCard}`}>
          <div className={`${styles.planBadge} ${isPremium ? styles.premiumBadge : styles.basicBadge}`}>
            {subscription?.packageName || 'Gói Miễn phí'}
          </div>
          <h2 style={{ margin: '20px 0 12px', fontSize: '1.4rem', fontWeight: 800 }}>
             Bạn đang dùng gói {subscription?.packageName || 'Miễn phí'}
          </h2>
          
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.6 }}>
            {subscription && (subscription.status === 1 || subscription.status === 'Active') ? (
              <>
                <div style={{ marginBottom: '4px' }}>
                  Hết hạn vào: <strong>{new Date(subscription.endDate).toLocaleDateString('vi-VN')}</strong>
                </div>
                <div>
                  Còn lại: <strong style={{ color: '#60a5fa' }}>{Math.max(0, Math.ceil((new Date(subscription.endDate) - new Date()) / (1000 * 60 * 60 * 24)))} ngày</strong>
                </div>
              </>
            ) : (
              'Nâng cấp ngay để mở khóa các phân tích AI chuyên sâu và tương tác không giới hạn.'
            )}
          </div>

          <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', gap: '8px', color: (subscription && (subscription.status === 1 || subscription.status === 'Active')) ? '#10b981' : 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 600, marginBottom: '24px' }}>
             {(subscription && (subscription.status === 1 || subscription.status === 'Active')) ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
             {(subscription && (subscription.status === 1 || subscription.status === 'Active')) ? 'Gói đang hoạt động' : 'Hãy nâng cấp để có thêm quyền lợi'}
          </div>

          <button className={styles.explorerBtn} onClick={scrollToUpgrade}>
            Khám phá các gói dịch vụ <ChevronRight size={18} />
          </button>
        </div>

        {/* Real-time Usage Limits */}
        <div className={styles.card}>
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Hạn mức sử dụng tháng này</h3>
          </div>
          <div className={styles.usageGrid}>
            <UsageItem 
              icon={<Zap size={18} />} 
              label="Yêu cầu AI (Phân tích)" 
              used={subscription?.usedAiRequests ?? 0} 
              total={activePackage?.maxAiRequests ?? 0} 
              isPremium={isPremium}
              isLocked={isLocked}
            />
            <UsageItem 
              icon={<Eye size={18} />} 
              label="Lượt xem dự án" 
              used={subscription?.usedProjectViews ?? 0} 
              total={activePackage?.maxProjectViews ?? 0} 
              isPremium={isPremium}
              isLocked={isLocked}
            />
            <UsageItem 
              icon={<Ticket size={18} />} 
              label="Booking miễn phí" 
              used={activePackage ? (activePackage.freeBookingCount - (subscription?.remainingFreeBookings ?? 0)) : 0} 
              total={activePackage?.freeBookingCount ?? 0} 
              isPremium={isPremium}
              isLocked={isLocked}
            />
            {subscription?.bonusFreeBookings > 0 && (
              <UsageItem 
                icon={<Sparkles size={18} style={{ color: '#FFD700' }} />} 
                label="Lượt cộng thêm (Bonus/Refund)" 
                used={0} 
                total={subscription.bonusFreeBookings} 
                isPremium={true}
                isLocked={false}
                hideProgress={true}
              />
            )}
          </div>
          {isLocked && (
            <div style={{ marginTop: '20px', fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'center', backgroundColor: 'rgba(29, 155, 240, 0.05)', border: '1px dashed rgba(29, 155, 240, 0.2)', padding: '12px', borderRadius: '12px' }}>
              Hãy nâng cấp gói để nhận hạn mức sử dụng hàng tháng.
            </div>
          )}
        </div>
      </section>

      {/* Upgrade Options: Pricing Table */}
      <section className={styles.upgradeSection} ref={upgradeSectionRef}>
        <div className={styles.pricingHeader}>
          <h2 className={styles.title}>Mở khóa thêm quyền lợi</h2>
          <p className={styles.subtitle}>Chọn gói phù hợp nhất với nhu cầu tăng trưởng của bạn</p>
        </div>

        <div className={styles.pricingGrid}>
          {packages.map((pkg, index) => {
             const isCurrent = subscription?.packageId === pkg.packageId || 
                              (subscription?.packageName === pkg.packageName);
             const isSpecial = pkg.price > 0;
             const isFeatured = isSpecial && (pkg.packageName.toLowerCase().includes('pro') || pkg.packageName.toLowerCase().includes('nâng cao'));
             
             return (
              <div 
                key={pkg.packageId} 
                className={`${styles.pricingCard} ${isSpecial ? styles.premiumFeatured : ''}`}
              >
                {isFeatured && <div className={styles.featuredTag}>Phổ biến nhất</div>}
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>{pkg.packageName}</h3>
                <div className={styles.priceContainer}>
                  <span className={styles.priceValue}>{pkg.price.toLocaleString('vi-VN')}</span>
                  <span className={styles.pricePeriod}> đ / {pkg.durationMonths} tháng</span>
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '24px', minHeight: '40px' }}>
                  {pkg.description}
                </p>
                
                <ul className={styles.featureList}>
                  <FeatureItem text={`${pkg.maxAiRequests} yêu cầu phân tích AI`} />
                  <FeatureItem text={`${pkg.maxProjectViews} lượt xem chi tiết dự án`} />
                  <FeatureItem text={`${pkg.freeBookingCount} lượt tư vấn miễn phí`} />
                  <FeatureItem text="Hỗ trợ ưu tiên 24/7" />
                </ul>

                <button 
                  className={`${styles.actionBtn} ${isCurrent ? styles.secondaryBtn : (isSpecial ? styles.premiumBtn : styles.primaryBtn)}`}
                  onClick={() => !isCurrent && pkg.price > 0 && handleCheckout(pkg)}
                  disabled={isProcessing || isCurrent}
                >
                  {isCurrent 
                    ? `Bạn đang sử dụng gói ${pkg.packageName}` 
                    : isProcessing ? <Loader2 className={styles.spin} /> : 'Nâng cấp ngay'}
                </button>
              </div>
             );
          })}
        </div>
      </section>

      {/* Payment Modal */}
      {checkoutData && (
        <SubscriptionPaymentModal 
          checkoutData={checkoutData}
          packageName={selectedPackageName}
          activePackageName={subscription?.packageName || 'Miễn phí'}
          isPremium={!selectedPackageName.toLowerCase().includes('cơ bản') && !selectedPackageName.toLowerCase().includes('basic')}
          onClose={handleModalClose}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
};

const UsageItem = ({ icon, label, used, total, isPremium, reverse, remaining, isLocked }) => {
  const percentage = total > 0 ? (used / total) * 100 : 0;
  const displayUsed = reverse ? (remaining ?? 0) : used;
  const displayLabel = reverse ? 'Còn trống' : 'Đã sử dụng';

  return (
    <div className={`${styles.usageItem} ${isLocked ? styles.lockedItem : ''}`}>
      <div className={styles.usageHeader}>
        <div className={styles.usageLabel}>
          <div className={styles.usageIconBox}>
            {isLocked ? <Crown size={18} opacity={0.5} /> : icon}
          </div>
          <div className={styles.usageLabelText}>
            <span className={styles.usageLabelTitle}>{label}</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              {isLocked ? 'Tính năng Gói dịch vụ' : (reverse ? 'Gói ưu đãi' : 'Hạn mức tháng')}
            </span>
          </div>
        </div>
        <div className={styles.usageValue}>
          {isLocked ? (
             <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
               <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--primary-blue)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Chưa mở khóa</span>
             </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
               <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)' }}>{displayUsed}/{total}</span>
               <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>{displayLabel.toLowerCase()}</span>
            </div>
          )}
        </div>
      </div>

      <div className={styles.progressBar}>
        <div 
          className={`${styles.progressFill} ${isPremium ? styles.premiumFill : ''} ${isLocked ? styles.lockedFill : ''}`} 
          style={{ width: isLocked ? '0%' : `${Math.min(percentage, 100)}%` }}
        />
      </div>

      <div className={styles.usageFooter}>
        <span className={styles.footerLabel}>
          {isLocked ? 'Yêu cầu Gói dịch vụ' : displayLabel}
        </span>
        <span className={styles.footerPercent}>
          {isLocked ? '---' : `${Math.round(percentage)}%`}
        </span>
      </div>
    </div>
  );
};

const FeatureItem = ({ text }) => (
  <li className={styles.featureItem}>
    <Check size={16} className={styles.checkIcon} />
    <span>{text}</span>
  </li>
);

export default SubscriptionManagement;
