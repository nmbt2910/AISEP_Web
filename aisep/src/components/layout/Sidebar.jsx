import React, { useState } from 'react';
import { Home, Compass, Search, TrendingUp, Users, User, Rocket, X, LogOut, Sun, Moon, LayoutDashboard, Sparkles, LogIn, UserPlus, FileText, Calendar, ShieldCheck, Activity, MessageSquare, Award, AlertCircle, Loader, Shield, Settings, History, ChevronUp, ChevronDown, DollarSign, CreditCard, Newspaper, Landmark, Factory, Milestone, Briefcase } from 'lucide-react';
import styles from './Sidebar.module.css';
import Button from '../common/Button';
import { useTheme } from '../../context/ThemeContext';
import SubscriptionPillCard from '../subscription/SubscriptionPillCard';
import termsService from '../../services/termsService';
import TermsModal from '../common/TermsModal';

/**
 * Sidebar Component
 * Desktop: Always visible sticky sidebar.
 * Mobile: Slide-out drawer controlled by 'isOpen' prop.
 */
function Sidebar({
  isOpen = false,
  onClose,
  onShowRegister,
  onShowLogin,
  onShowProfile,
  onShowHome,
  onShowInvestors,
  onShowAdvisors,
  onShowDashboard,
  onShowAI,
  onShowSubscription,
  onMenuItemClick,
  user,
  onLogout,
  activeView = 'main' // New prop to determine active state
}) {
  const { theme, toggleTheme } = useTheme();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Terms Modal State for Mobile/Tablet Sidebar
  const [isTermsOpen, setIsTermsOpen] = useState(false);
  const [termsData, setTermsData] = useState(null);
  const [isTermsLoading, setIsTermsLoading] = useState(false);
  const [termsError, setTermsError] = useState(null);

  const handleOpenTerms = async (e) => {
    e.preventDefault();
    setIsTermsOpen(true);
    setIsTermsLoading(true);
    setTermsError(null);
    try {
      const response = await termsService.getActiveTerms();
      const actualData = response?.data || response;
      setTermsData(actualData);
    } catch (err) {
      console.error('Failed to fetch terms for sidebar:', err);
      setTermsError(err.message || 'Không thể tải điều khoản sử dụng.');
    } finally {
      setIsTermsLoading(false);
    }
  };

  const navItems = React.useMemo(() => {
    const baseItems = [
      { icon: Compass, label: 'Home', displayLabel: 'Khám phá dự án', href: '#' },
      { icon: LayoutDashboard, label: 'Dashboard', displayLabel: 'Bảng điều khiển', href: '#', showWhenLoggedIn: true },
      { icon: Newspaper, label: 'PRNews', displayLabel: 'Tin tức', href: '#', showWhenLoggedIn: true },
      { icon: TrendingUp, label: 'Investors', displayLabel: 'Nhà đầu tư', href: '#' },
      { icon: Users, label: 'Advisors', displayLabel: 'Cố vấn', href: '#', hideFor: ['advisor'] },
    ];

    const roleStr = user?.role?.toString().toLowerCase() || '';
    const roleNum = user?.role !== undefined ? Number(user.role) : -1;
    const isStaff = roleStr === 'operationstaff' || roleStr === 'operation_staff' || roleStr === 'staff' || roleNum === 3;
    const isAdmin = roleStr === 'admin' || roleNum === 4;

    if (isAdmin) {
      const adminItems = [
        { icon: Users, label: 'AdminUsers', displayLabel: 'Quản lý người dùng', href: '#', showWhenLoggedIn: true },
        { icon: Users, label: 'AdminStaff', displayLabel: 'Quản lý Staff', href: '#', showWhenLoggedIn: true },
        { icon: DollarSign, label: 'AdminTransactions', displayLabel: 'Giao dịch', href: '#', showWhenLoggedIn: true },
        { icon: Shield, label: 'AdminPackageManagement', displayLabel: 'Quản lý gói', href: '#', showWhenLoggedIn: true },
        { icon: History, label: 'AdminSubscriptionHistory', displayLabel: 'Lịch sử đăng ký gói', href: '#', showWhenLoggedIn: true },
        { icon: Factory, label: 'AdminIndustryOptions', displayLabel: 'Ngành nghề', href: '#', showWhenLoggedIn: true },
        { icon: Milestone, label: 'AdminStageOptions', displayLabel: 'Giai đoạn dự án', href: '#', showWhenLoggedIn: true },
        { icon: Settings, label: 'AdminScorecardConfig', displayLabel: 'Cấu hình chấm điểm AI', href: '#', showWhenLoggedIn: true },
        { icon: Settings, label: 'AdminValidationRules', displayLabel: 'Rule validate động', href: '#', showWhenLoggedIn: true },
        { icon: ShieldCheck, label: 'AdminTerms', displayLabel: 'Quản lý Điều khoản', href: '#', showWhenLoggedIn: true },
        { icon: User, label: 'AccountProfile', displayLabel: 'Hồ sơ người dùng', href: '#', showWhenLoggedIn: true },
      ];
      return adminItems;
    }

    if (isStaff) {
      const staffItems = [
        { icon: LayoutDashboard, label: 'Dashboard', displayLabel: 'Bảng điều khiển', href: '#', showWhenLoggedIn: true },
        { icon: CreditCard, label: 'Payouts', displayLabel: 'Chi trả cố vấn', href: '#', showWhenLoggedIn: true },
        { icon: Activity, label: 'CommissionConfig', displayLabel: 'Cấu hình hoa hồng', href: '#', showWhenLoggedIn: true },
        { icon: FileText, label: 'Projects', displayLabel: 'Quản lý dự án', href: '#', showWhenLoggedIn: true },
        { icon: Calendar, label: 'Bookings', displayLabel: 'Quản lý Booking', href: '#', showWhenLoggedIn: true },
        { icon: Newspaper, label: 'PRManagement', displayLabel: 'Đăng bài PR', href: '#', showWhenLoggedIn: true },
        { icon: AlertCircle, label: 'UserReports', displayLabel: 'Báo cáo vi phạm', href: '#', showWhenLoggedIn: true },
        { icon: ShieldCheck, label: 'Approvals', displayLabel: 'Phê duyệt Startup', href: '#', showWhenLoggedIn: true },
        { icon: ShieldCheck, label: 'AdvisorApproval', displayLabel: 'Phê duyệt cố vấn', href: '#', showWhenLoggedIn: true },
        { icon: ShieldCheck, label: 'InvestorApproval', displayLabel: 'Phê duyệt nhà đầu tư', href: '#', showWhenLoggedIn: true },
        { icon: Briefcase, label: 'StaffInvestmentManagement', displayLabel: 'Quản lý đầu tư', href: '#', showWhenLoggedIn: true },
        { icon: ShieldCheck, label: 'Terms', displayLabel: 'Quản lý Điều khoản', href: '#', showWhenLoggedIn: true },
        { icon: User, label: 'AccountProfile', displayLabel: 'Hồ sơ người dùng', href: '#', showWhenLoggedIn: true },
      ];
      const otherItems = baseItems.filter(item => item.label !== 'Dashboard' && item.label !== 'Home');
      const homeItem = baseItems.find(item => item.label === 'Home');
      return [...staffItems, homeItem, ...otherItems];
    }

    if (roleStr === 'advisor' || roleNum === 2) {
      const advisorItems = [
        { icon: LayoutDashboard, label: 'Dashboard', displayLabel: 'Bảng điều khiển', href: '#', showWhenLoggedIn: true },
        { icon: CreditCard, label: 'Wallet', displayLabel: 'Thu nhập', href: '#', showWhenLoggedIn: true },
        { icon: Landmark, label: 'Payouts', displayLabel: 'Thanh toán & Đối soát', href: '#', showWhenLoggedIn: true },
        { icon: ShieldCheck, label: 'ApproveBookings', displayLabel: 'Duyệt Booking', href: '#', showWhenLoggedIn: true },
        { icon: MessageSquare, label: 'Bookings', displayLabel: 'Danh sách Booking', href: '#', showWhenLoggedIn: true },
        { icon: Calendar, label: 'Availability', displayLabel: 'Lịch Rảnh', href: '#', showWhenLoggedIn: true },
        { icon: User, label: 'Profile', displayLabel: 'Hồ sơ cố vấn', href: '#', showWhenLoggedIn: true },
        { icon: User, label: 'AccountProfile', displayLabel: 'Hồ sơ người dùng', href: '#', showWhenLoggedIn: true },
      ];
      const otherItems = baseItems.filter(item => item.label !== 'Dashboard' && item.label !== 'Home');
      const homeItem = baseItems.find(item => item.label === 'Home');
      return [...advisorItems, homeItem, ...otherItems];
    }

    if (roleStr === 'investor' || roleNum === 1) {
      return [
        baseItems.find(i => i.label === 'Home'),
        baseItems.find(i => i.label === 'Dashboard'),
        { icon: User, label: 'InvestorProfile', displayLabel: 'Hồ sơ nhà đầu tư', href: '#', showWhenLoggedIn: true },
        baseItems.find(i => i.label === 'PRNews'),
        baseItems.find(i => i.label === 'Advisors'),
        baseItems.find(i => i.label === 'Investors'),
        { icon: User, label: 'AccountProfile', displayLabel: 'Hồ sơ người dùng', href: '#', showWhenLoggedIn: true },
      ];
    }

    if (roleStr === 'startup' || roleNum === 0) {
      return [
        baseItems.find(i => i.label === 'Home'),
        baseItems.find(i => i.label === 'Dashboard'),
        { icon: Rocket, label: 'StartupProfile', displayLabel: 'Hồ sơ Startup', href: '#', showWhenLoggedIn: true },
        baseItems.find(i => i.label === 'PRNews'),
        baseItems.find(i => i.label === 'Advisors'),
        baseItems.find(i => i.label === 'Investors'),
        { icon: User, label: 'AccountProfile', displayLabel: 'Hồ sơ người dùng', href: '#', showWhenLoggedIn: true },
      ];
    }

    // Default and other roles
    return [
      ...baseItems,
      { icon: User, label: 'AccountProfile', displayLabel: 'Hồ sơ người dùng', href: '#', showWhenLoggedIn: true },
    ];
  }, [user]);


  const menuRef = React.useRef(null);
  const [showTopFade, setShowTopFade] = useState(false);
  const [showBottomFade, setShowBottomFade] = useState(false);

  const checkScroll = React.useCallback(() => {
    if (menuRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = menuRef.current;
      // Greater threshold (10px) to prevent flickering on slightly-off renderings
      setShowTopFade(scrollTop > 10);
      setShowBottomFade(scrollTop + clientHeight < scrollHeight - 10);
    }
  }, []);

  // Auto-scroll to active item and check initial scroll state
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (menuRef.current) {
        const activeItem = menuRef.current.querySelector(`.${styles.active}`);
        if (activeItem) {
          activeItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
        checkScroll();
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [activeView, checkScroll, navItems]);

  React.useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [checkScroll, navItems]);

  const handleNavClick = (label) => {
    // Navigate to dashboard when clicking Dashboard
    if (label === 'Dashboard' && onShowDashboard) {
      const roleStr = user?.role?.toString().toLowerCase() || '';
      const roleNum = Number(user?.role);
      
      if (roleStr === 'startup' || roleNum === 0) {
        onShowDashboard('my-projects');
      } else if (roleStr === 'investor' || roleNum === 1) {
        onShowDashboard('investments');
      } else if (roleStr === 'operationstaff' || roleStr === 'staff' || roleNum === 3) {
        onShowDashboard('statistics');
      } else if (roleStr === 'advisor' || roleNum === 2) {
        onShowDashboard('overview');
      } else if (roleStr === 'admin' || roleNum === 4) {
        onShowDashboard('users');
      } else {
        onShowDashboard('overview');
      }
    }
    if (label === 'Projects' && onShowDashboard) {
      onShowDashboard('project_management');
    }
    if (label === 'Bookings' && onShowDashboard) {
      onShowDashboard('bookings');
    }
    if (label === 'Approvals' && onShowDashboard) {
      onShowDashboard('approvals');
    }
    if (label === 'AdvisorApproval' && onShowDashboard) {
      onShowDashboard('advisor_approval');
    }
    if (label === 'Availability' && onShowDashboard) {
      onShowDashboard('availability');
    }
    if (label === 'ApproveBookings' && onShowDashboard) {
      onShowDashboard('approve_bookings');
    }
    if (label === 'InvestorApproval' && onShowDashboard) {
      onShowDashboard('investor_approval');
    }
    if (label === 'StaffInvestmentManagement' && onShowDashboard) {
      onShowDashboard('investment_management');
    }

    if (label === 'UserReports' && onShowDashboard) {
      onShowDashboard('user_reports');
    }
    if (label === 'CommissionConfig' && onShowDashboard) {
      onShowDashboard('commission');
    }
    if (label === 'Wallet' && onShowDashboard) {
      onShowDashboard('wallet');
    }
    if (label === 'Payouts' && onShowDashboard) {
      onShowDashboard('payouts');
    }
    if (label === 'PRManagement' && onShowDashboard) {
      onShowDashboard('pr_management');
    }
    if (label === 'PRNews' && onShowDashboard) {
      onShowDashboard('pr_news');
    }
    if (label === 'Terms' && onShowDashboard) {
      onShowDashboard('terms');
    }

    if (label === 'AccountProfile' && onShowDashboard) {
      onShowDashboard('account_profile');
    }
    if (label === 'InvestorProfile' && onShowDashboard) {
      onShowDashboard('preferences');
    }
    if (label === 'StartupProfile' && onShowDashboard) {
      onShowDashboard('complete-info');
    }

    if (label === 'AdminUsers' && onShowDashboard) {
      onShowDashboard('users');
    }
    if (label === 'AdminStaff' && onShowDashboard) {
      onShowDashboard('staff');
    }
    if (label === 'AdminTransactions' && onShowDashboard) {
      onShowDashboard('transactions');
    }
    if (label === 'AdminPackageManagement' && onShowDashboard) {
      onShowDashboard('package_management');
    }
    if (label === 'AdminSubscriptionHistory' && onShowDashboard) {
      onShowDashboard('subscription_history');
    }
    if (label === 'AdminIndustryOptions' && onShowDashboard) {
      onShowDashboard('industry_options');
    }
    if (label === 'AdminStageOptions' && onShowDashboard) {
      onShowDashboard('stage_options');
    }
    if (label === 'AdminScorecardConfig' && onShowDashboard) {
      onShowDashboard('scorecard_config');
    }
    if (label === 'AdminValidationRules' && onShowDashboard) {
      onShowDashboard('validation_rules');
    }
    if (label === 'AdminTerms' && onShowDashboard) {
      onShowDashboard('terms');
    }

    // Navigate to home when clicking Home
    if (label === 'Home' && onShowHome) {
      onShowHome();
    }

    // Navigate to profile when clicking Profile
    if (label === 'Profile' && onShowProfile) {
      onShowProfile();
    }

    // Navigate to advisors when clicking Advisors
    if (label === 'Advisors' && onShowAdvisors) {
      onShowAdvisors();
    }

    // Navigate to investors when clicking Investors
    if (label === 'Investors' && onShowInvestors) {
      onShowInvestors();
    }

    onMenuItemClick?.();
    onClose?.();
  };

  const handleRegisterClick = () => {
    onShowRegister();
    onMenuItemClick?.();
    onClose?.();
  };

  const handleLoginClick = () => {
    onShowLogin?.();
    onMenuItemClick?.();
    onClose?.();
  };

  const handleLogoutClick = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await onLogout?.();
      onMenuItemClick?.();
      onClose?.();
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <>
      {/* Mobile Backdrop */}
      <div
        className={`${styles.backdrop} ${isOpen ? styles.backdropOpen : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sidebar Container */}
      <aside className={`${styles.sidebar} ${isOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.content}>
          {/* Header: Logo + Mobile Close Button */}
          <div className={styles.sidebarHeader}>
            <div className={styles.logo}>
              <Rocket size={28} color="var(--primary-blue)" />
              <span>AISEP</span>
            </div>

            <button
              className={styles.closeBtn}
              onClick={onClose}
              aria-label="Close menu"
            >
              <X size={24} />
            </button>
          </div>

          {/* Scrollable Navigation Body */}
          <div className={styles.menuContainer}>
            {/* Subtle Gradient Indicators with Icons */}
            <div className={`${styles.scrollFade} ${styles.scrollFadeTop} ${showTopFade ? styles.visible : ''}`}>
              <ChevronUp size={22} className={styles.fadeIcon} />
            </div>

            <div
              className={styles.menuScrollArea}
              ref={menuRef}
              onScroll={checkScroll}
            >
              <nav className={styles.nav}>
                {navItems
                  .filter(item => {
                    // Hide Dashboard when user is not logged in
                    if (item.showWhenLoggedIn && !user) {
                      return false;
                    }
                    // Hide Profile when user is not logged in
                    if (item.label === 'Profile' && !user) {
                      return false;
                    }
                    // Hide items for specific roles (case-insensitive and ID check)
                    const roleStr = user?.role?.toString().toLowerCase() || '';
                    const roleNum = user?.role !== undefined ? Number(user.role) : -1;
                    if (item.hideFor && (item.hideFor.includes(roleStr) || item.hideFor.includes(roleNum))) {
                      return false;
                    }
                    return true;
                  })
                  .map((item) => {
                    const Icon = item.icon;
                    // Map activeView to nav item labels
                    const getActiveLabel = () => {
                      if (activeView === 'main') return 'Home';
                      if (activeView === 'dashboard' || 
                          activeView === 'dashboard_statistics' || 
                          activeView === 'dashboard_my-projects' || 
                          activeView === 'dashboard_investments' || 
                          activeView === 'dashboard_overview') return 'Dashboard';
                      if (activeView === 'dashboard_project_management') return 'Projects';
                      if (activeView === 'dashboard_bookings') return 'Bookings';
                      if (activeView === 'dashboard_approvals') return 'Approvals';
                      if (activeView === 'dashboard_advisor_approval') return 'AdvisorApproval';
                      if (activeView === 'dashboard_availability') return 'Availability';
                      if (activeView === 'dashboard_approve_bookings') return 'ApproveBookings';
                      if (activeView === 'dashboard_user_reports') return 'UserReports';
                      if (activeView === 'dashboard_pr_management') return 'PRManagement';
                      if (activeView === 'dashboard_pr_news') return 'PRNews';
                      if (activeView === 'dashboard_withdrawals') return 'WithdrawRequest';
                      if (activeView === 'dashboard_commission') return 'CommissionConfig';
                      if (activeView === 'dashboard_wallet') return 'Wallet';
                      if (activeView === 'dashboard_payouts') return 'Payouts';
                      if (activeView === 'dashboard_package_management') return 'AdminPackageManagement';
                      if (activeView === 'dashboard_subscription_history') return 'AdminSubscriptionHistory';
                      if (activeView === 'dashboard_investor_approval') return 'InvestorApproval';
                      if (activeView === 'dashboard_investment_management') return 'StaffInvestmentManagement';
                      if (activeView === 'dashboard_preferences') return 'InvestorProfile';
                      if (activeView === 'complete-info' || activeView === 'dashboard_complete-info') return 'StartupProfile';
                      if (activeView === 'dashboard_users') return 'AdminUsers';
                      if (activeView === 'dashboard_staff') return 'AdminStaff';
                      if (activeView === 'dashboard_transactions') return 'AdminTransactions';
                      if (activeView === 'dashboard_industry_options') return 'AdminIndustryOptions';
                      if (activeView === 'dashboard_stage_options') return 'AdminStageOptions';
                      if (activeView === 'dashboard_scorecard_config') return 'AdminScorecardConfig';
                      if (activeView === 'dashboard_validation_rules') return 'AdminValidationRules';
                      if (activeView === 'dashboard_account_profile') return 'AccountProfile';
                      if (activeView === 'dashboard_terms') {
                        const roleStr = user?.role?.toString().toLowerCase() || '';
                        const roleNum = Number(user?.role);
                        if (roleStr === 'admin' || roleNum === 4) return 'AdminTerms';
                        return 'Terms';
                      }
                      if (activeView === 'profile') return 'Profile';
                      if (activeView === 'advisors') return 'Advisors';
                      if (activeView === 'investors') return 'Investors';
                      if (activeView === 'subscription') return 'Subscription';
                      if (activeView === 'news') return 'News';
                      return null;
                    };
                    const isActive = item.label === getActiveLabel();

                    return (
                      <a
                        key={item.label}
                        href={item.href}
                        className={`${styles.navItem} ${isActive ? styles.active : ''}`}
                        onClick={(e) => {
                          e.preventDefault();
                          handleNavClick(item.label);
                        }}
                      >
                        <Icon size={24} />
                        <span>{item.displayLabel}</span>
                      </a>
                    );
                  })}
              </nav>
            </div>

            <div className={`${styles.scrollFade} ${styles.scrollFadeBottom} ${showBottomFade ? styles.visible : ''}`}>
              <ChevronDown size={22} className={styles.fadeIcon} />
            </div>
          </div>

          {/* Fixed Footer Section */}
          <div className={styles.footerSection}>
            {/* Theme Toggle */}
            <button
              className={styles.themeToggle}
              onClick={toggleTheme}
              aria-label="Toggle theme"
              title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            >
              {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
              <span>Giao diện</span>
            </button>

            {/* Auth Section / Profile Display */}
            {user && (
              <SubscriptionPillCard
                user={user}
                onManage={() => {
                  if (onShowSubscription) onShowSubscription();
                }}
                isActive={activeView === 'subscription'}
              />
            )}

            {user ? (
              /* Logged In: Show Profile Display with Logout Button */
              <div className={styles.profileSection}>
                <div className={styles.profileDisplay}>
                  <div className={styles.profileAvatar}>
                    <span>{(user.name || user.email || 'U').charAt(0).toUpperCase()}</span>
                  </div>
                  <div className={styles.profileInfo}>
                    <div className={styles.profileName}>{user.name || user.email}</div>
                    <div className={styles.profileRole}>{user.role}</div>
                  </div>
                </div>
                <button
                  className={styles.logoutButton}
                  onClick={handleLogoutClick}
                  aria-label="Logout"
                  disabled={isLoggingOut}
                  style={{ opacity: isLoggingOut ? 0.7 : 1, cursor: isLoggingOut ? 'not-allowed' : 'pointer' }}
                >
                  {isLoggingOut ? <Loader size={20} className={styles.spin} /> : <LogOut size={20} />}
                </button>
              </div>
            ) : (
              /* Not Logged In: Show Auth Buttons */
              <div className={styles.authSection}>
                <button className={styles.signInBtn} onClick={handleLoginClick}>
                  <LogIn className={styles.authIcon} size={20} />
                  <span className={styles.btnText}>Đăng nhập</span>
                </button>

                <button
                  className={styles.registerBtn}
                  onClick={handleRegisterClick}
                >
                  <UserPlus className={styles.authIcon} size={20} />
                  <span className={styles.btnText}>Tạo tài khoản</span>
                </button>
              </div>
            )}
          </div>

          {/* Legal Footer - Only visible when RightPanel is hidden (Mobile/Tablet) */}
          <div className={styles.legalSection}>
            <button className={styles.legalLink} onClick={handleOpenTerms} disabled={isTermsLoading}>
              {isTermsLoading ? <Loader size={12} className={styles.spin} /> : 'Điều khoản & Điều kiện'}
            </button>
            <span className={styles.copyright}>
              © {new Date().getFullYear()} AISEP. Bảo lưu mọi quyền.
            </span>
          </div>
        </div>
      </aside>

      <TermsModal 
        isOpen={isTermsOpen}
        onClose={() => setIsTermsOpen(false)}
        termsContent={termsData?.contentHtml || termsData?.content}
        termsVersion={termsData?.version}
        error={termsError}
        isLoading={isTermsLoading}
      />
    </>
  );
}

export default Sidebar;