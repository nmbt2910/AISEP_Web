import { useState, useEffect, startTransition } from 'react';
import { useProfile } from './context/ProfileContext';
import RestrictedActionModal from './components/common/RestrictedActionModal';
import './styles/global.css';
import MainLayout from './components/layout/MainLayout';
import DashboardLayout from './components/layout/DashboardLayout';
import RegisterSelection from './components/auth/RegisterSelection';
import RegisterPage from './pages/RegisterPage';
import LoginPage from './pages/LoginPage';
import StartupDashboard from './pages/StartupDashboard';
import InvestorDashboard from './pages/InvestorDashboard';
import AdvisorDashboard from './pages/AdvisorDashboard';
import OperationStaffDashboard from './pages/OperationStaffDashboard';
import AdminDashboard from './pages/AdminDashboard';
import InvestorBookings from './components/investor/InvestorBookings';
import VerifyEmailPage from './pages/VerifyEmailPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import LandingPage from './pages/LandingPage';
import termsService from './services/termsService';
import TermsEnforcementModal from './components/auth/TermsEnforcementModal';
import TermsModal from './components/common/TermsModal';
import startupProfileService from './services/startupProfileService'; // kept for other usages if any
import SubscriptionManagement from './components/subscription/SubscriptionManagement';
import AdvisorProfilePage from './pages/AdvisorProfilePage';
import AdvisorApprovalPage from './components/advisor/AdvisorApprovalPage';
import ProjectDetailView from './components/feed/ProjectDetailView';
import SessionExpiredModal from './components/auth/SessionExpiredModal';
import NotificationRouter from './services/NotificationRouter';

function App() {
  const [currentView, setCurrentView] = useState('main'); // 'login', 'main', 'roleSelection', 'register', 'resetPassword'
  const [selectedRole, setSelectedRole] = useState(null);
  const [user, setUser] = useState(null);
  const [needsTermsAcceptance, setNeedsTermsAcceptance] = useState(false);
  const [activeTerms, setActiveTerms] = useState({ version: '', content: '' });
  const [isSessionExpired, setIsSessionExpired] = useState(false);
  const [lastInvestorBookingFilter, setLastInvestorBookingFilter] = useState('all');
  const [lastDashboardSection, setLastDashboardSection] = useState('investments');
  const [dashboardTargetId, setDashboardTargetId] = useState(null);
  const [restrictedActionMsg, setRestrictedActionMsg] = useState('');

  const { initProfile, isInvestorApproved } = useProfile();

  // Listen for global session_expired events from apiClient
  useEffect(() => {
    const handleSessionExpired = () => {
      setIsSessionExpired(true);
      setUser(null);
    };

    window.addEventListener('session_expired', handleSessionExpired);
    return () => window.removeEventListener('session_expired', handleSessionExpired);
  }, []);

  useEffect(() => {
    // Check if URL has reset-password or verify-email markers
    const params = new URLSearchParams(window.location.search);
    const isResetPswd = window.location.pathname.includes('/reset-password');
    const isVerifyEmail = window.location.pathname.includes('/confirm-email');

    if (params.get('userId') && params.get('token')) {
      if (isResetPswd) {
        setCurrentView('resetPassword');
        return;
      } else if (isVerifyEmail) {
        setCurrentView('verifyEmail');
        return;
      }
    }

    const storedUser = localStorage.getItem('aisep_user');
    const storedToken = localStorage.getItem('aisep_token');

    if (storedUser) {
      let parsedUser = JSON.parse(storedUser);

      // Repair logic for users who logged in before JWT decoding was added
      if (!parsedUser.userId && storedToken) {
        try {
          const payloadBase64 = storedToken.split('.')[1];
          const base64 = payloadBase64.replace(/-/g, '+').replace(/_/g, '/');
          const jsonPayload = decodeURIComponent(atob(base64).split('').map(function (c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
          }).join(''));
          const decodedToken = JSON.parse(jsonPayload);

          parsedUser.userId = decodedToken['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'];
          localStorage.setItem('aisep_user', JSON.stringify(parsedUser));
        } catch (e) {
          console.error("Token repair failed", e);
        }
      }

      setUser(parsedUser);

      // Kick off global profile fetch immediately on restore
      initProfile(parsedUser);

      const roleStr = parsedUser.role?.toString().toLowerCase() || '';
      const roleNum = Number(parsedUser.role);
      const isStaff = roleStr === 'operationstaff' || roleStr === 'operation_staff' || roleStr === 'staff' || roleNum === 3;
      const isAdvisor = roleStr === 'advisor' || roleNum === 2;
      const isInvestor = roleStr === 'investor' || roleNum === 1;
      const isAdmin = roleStr === 'admin' || roleNum === 4;

      if (isStaff || isAdvisor || isInvestor || isAdmin) {
        setCurrentView('dashboard');
      } else if (roleStr === 'startup' || roleNum === 0) {
        setCurrentView('dashboard'); // Always go to dashboard if logged in
      } else {
        setCurrentView('main');
      }
    } else {
      // If no stored user, clear loading state so banners/guards work correctly
      initProfile(null);
      setCurrentView('main');
    }
  }, []);

  // Check for active terms version change
  useEffect(() => {
    if (user) {
      const checkTerms = async () => {
        try {
          const res = await termsService.getActiveTerms();
          const data = res?.data || res;
          if (data) {
            setActiveTerms({ version: data.version || data.termsVersion, content: data.content });
            // Compare with user's accepted version if backend doesn't explicitly flag it
            // Assuming backend response might have needsTermsAcceptance: true
            if (user.needsTermsAcceptance) {
              setNeedsTermsAcceptance(true);
            }
          }
        } catch (err) {
          console.error("Failed to check active terms:", err);
        }
      };
      checkTerms();
    }
  }, [user]);

  const handleLoginSuccess = async (userData, accessToken, refreshToken) => {
    localStorage.setItem('aisep_user', JSON.stringify(userData));
    localStorage.setItem('aisep_token', accessToken);
    localStorage.setItem('aisep_refresh_token', refreshToken);

    // Check if user needs to accept terms from login response
    if (userData.needsTermsAcceptance) {
      setNeedsTermsAcceptance(true);
    }

    setUser(userData);
    setIsSessionExpired(false);

    // Immediately start global profile fetch + polling
    initProfile(userData);

    const roleStr = userData.role?.toString().toLowerCase() || '';
    const roleNum = Number(userData.role);
    const isStaff = roleStr === 'operationstaff' || roleStr === 'operation_staff' || roleStr === 'staff' || roleNum === 3;
    const isAdvisor = roleStr === 'advisor' || roleNum === 2;
    const isInvestor = roleStr === 'investor' || roleNum === 1;
    const isAdmin = roleStr === 'admin' || roleNum === 4;

    if (isStaff || isAdvisor || isInvestor || isAdmin) {
      setCurrentView('dashboard');
      return;
    }

    // Always navigate to dashboard/main — no need to pre-check profile
    // (ProfileContext will resolve the status in the background)
    setCurrentView(roleStr === 'startup' || roleStr === '0' || roleNum === 0 ? 'main' : 'main');
  };

  const handleLogout = async () => {
    try {
      // Use dynamic import or check if global to avoid reference error if not imported
      if (typeof authService !== 'undefined') {
        await authService.logout();
      }
    } catch (err) {
      console.error('Logout error:', err);
    }
    
    // Clear project URL if present to prevent reopening on next login
    if (window.location.pathname.includes('/projects/')) {
      window.history.pushState({}, '', '/');
    }

    localStorage.removeItem('aisep_user');
    localStorage.removeItem('aisep_token');
    localStorage.removeItem('aisep_refresh_token');
    initProfile(null); // Clear global profile state & stop polling
    setUser(null);
    setCurrentView('main');
  };

  const handleShowRegister = () => {
    setCurrentView('roleSelection');
  };

  const handleRoleSelect = (role) => {
    setSelectedRole(role);
    setCurrentView('register');
  };

  const handleBackToMain = () => {
    setSelectedRole(null);
    startTransition(() => setCurrentView('main'));
  };

  const handleBackToRoleSelection = () => {
    setCurrentView('roleSelection');
  };

  const handleRegistrationComplete = (role, formData) => {
    setCurrentView('login');
    setSelectedRole(null);
  };

  const handleShowLogin = () => {
    setCurrentView('login');
  };

  const handleShowHome = () => {
    startTransition(() => setCurrentView('main'));
  };

  const handleShowAdvisors = () => {
    setCurrentView('advisors');
  };

  const handleShowInvestors = () => {
    setCurrentView('investors');
  };

  const handleShowDashboard = (section = 'statistics', targetId = null) => {
    setDashboardTargetId(targetId);
    if (section === 'statistics' || section === '') {
      setCurrentView('dashboard');
    } else {
      setCurrentView(`dashboard_${section}`);
    }
  };

  const handleShowAI = () => {
    setCurrentView('ai');
  };

  const handleShowSubscription = () => {
    setCurrentView('subscription');
  };

  const handleShowProfile = () => {
    setCurrentView('profile');
  };

  const handleNotificationNavigate = (referenceType, referenceId) => {
    if (!user) return;

    const resolution = NotificationRouter.resolve(referenceType, referenceId, user);

    if (resolution) {
      const { section, targetId, view } = resolution;

      if (view) {
        setCurrentView(view);
      } else {
        handleShowDashboard(section || '', targetId);
      }
    } else {
      // Fallback
      handleShowDashboard('');
    }
  };

  return (
    <>
      {isSessionExpired && (
        <SessionExpiredModal
          onLogin={() => {
            setIsSessionExpired(false);
            setCurrentView('login');
          }}
          onHome={() => {
            setIsSessionExpired(false);
            startTransition(() => setCurrentView('main'));
          }}
        />
      )}

      {currentView === 'login' ? (
        <LoginPage
          onLoginSuccess={handleLoginSuccess}
          onShowRegister={handleShowRegister}
          onBack={handleBackToMain}
        />
      ) : currentView === 'resetPassword' ? (
        <ResetPasswordPage onGoToLogin={() => setCurrentView('login')} />
      ) : currentView === 'verifyEmail' ? (
        <VerifyEmailPage onVerified={() => {
          window.history.replaceState({}, document.title, window.location.pathname);
          setCurrentView('login');
        }} />
      ) : currentView === 'main' && !user ? (
        <LandingPage onShowLogin={handleShowLogin} onShowRegister={handleShowRegister} />
      ) : (['main', 'advisors', 'investors', 'ai', 'dashboard', 'profile', 'subscription'].includes(currentView) || currentView.startsWith('dashboard_')) ? (
        <MainLayout
          onShowRegister={handleShowRegister}
          onShowLogin={handleShowLogin}
          onShowHome={handleShowHome}
          onShowAdvisors={handleShowAdvisors}
          onShowInvestors={handleShowInvestors}
          onShowDashboard={handleShowDashboard}
          onShowSubscription={handleShowSubscription}
          onShowAI={handleShowAI}
          onShowProfile={handleShowProfile}
          onNotificationNavigate={handleNotificationNavigate}
          user={user}
          onLogout={handleLogout}
          showAdvisors={currentView === 'advisors'}
          showInvestors={currentView === 'investors'}
          showAI={currentView === 'ai'}
          activeView={currentView}
          isFullWidthContent={currentView.startsWith('dashboard_project_') && currentView !== 'dashboard_project_management'}
        >
          <>
            {currentView === 'subscription' && <SubscriptionManagement user={user} />}
            {currentView === 'profile' && (
              <AdvisorProfilePage
                user={user}
                onBack={handleShowHome}
                onNotificationNavigate={handleNotificationNavigate}
              />
            )}
            {currentView.startsWith('dashboard') && (
              (() => {
                const roleStr = user?.role?.toString().toLowerCase() || '';
                const roleNum = Number(user?.role);
                const isStaff = roleStr === 'operationstaff' || roleStr === 'operation_staff' || roleStr === 'staff' || roleNum === 3;
                const isAdmin = roleStr === 'admin' || roleNum === 4;

                if (roleStr === 'startup' || roleNum === 0) {
                  const section = currentView.startsWith('dashboard_') ? currentView.replace('dashboard_', '') : 'my-projects';
                  return <StartupDashboard user={user} initialSection={section} targetId={dashboardTargetId} onLogout={handleLogout} />;
                } else if (roleStr === 'investor' || roleNum === 1) {
                  if (currentView === 'dashboard_bookings') {
                    return (
                      <InvestorBookings
                        user={user}
                        targetId={dashboardTargetId}
                        onViewProject={(pid) => {
                          setLastDashboardSection('bookings');
                          setCurrentView('dashboard_project_' + pid);
                        }}
                        initialFilterStatus={lastInvestorBookingFilter}
                        onFilterStatusChange={setLastInvestorBookingFilter}
                        onUpdateProfile={() => setCurrentView('dashboard_preferences')}
                        isApproved={isInvestorApproved}
                        onRestrictedAction={(msg) => setRestrictedActionMsg(msg)}
                      />
                    );
                  }
                  if (currentView.startsWith('dashboard_project_')) {
                    const pid = currentView.replace('dashboard_project_', '');
                    return (
                      <ProjectDetailView
                        projectId={pid}
                        onBack={() => setCurrentView(`dashboard_${lastDashboardSection}`)}
                        user={user}
                        isFullView={false}
                      />
                    );
                  }
                  const section = currentView.startsWith('dashboard_') ? currentView.replace('dashboard_', '') : 'investments';
                  return (
                    <InvestorDashboard
                      user={user}
                      initialSection={section}
                      targetId={dashboardTargetId}
                      onLogout={handleLogout}
                      onViewProject={(pid, currentSection) => {
                        if (currentSection) setLastDashboardSection(currentSection);
                        setCurrentView('dashboard_project_' + pid);
                      }}
                    />
                  );
                } else if (roleStr === 'advisor' || roleNum === 2) {
                  const section = currentView.startsWith('dashboard_') ? currentView.replace('dashboard_', '') : 'overview';
                  return <AdvisorDashboard user={user} initialSection={section} targetId={dashboardTargetId} onSectionChange={handleShowDashboard} onShowProfile={handleShowProfile} onLogout={handleLogout} />;
                } else if (isStaff) {
                  const section = currentView.startsWith('dashboard_') ? currentView.replace('dashboard_', '') : 'statistics';
                  return <OperationStaffDashboard user={user} initialSection={section} targetId={dashboardTargetId} onLogout={handleLogout} />;
                } else if (isAdmin) {
                  const section = currentView.startsWith('dashboard_') ? currentView.replace('dashboard_', '') : 'statistics';
                  return <AdminDashboard key={currentView} user={user} initialSection={section} />;
                } else {
                  return <div style={{ padding: '20px', textAlign: 'center' }}><p>Dashboard not available for your role</p></div>;
                }
              })()
            )}
          </>
        </MainLayout>
      ) : currentView === 'roleSelection' ? (
        <RegisterSelection
          onRoleSelect={handleRoleSelect}
          onBack={handleBackToMain}
        />
      ) : currentView === 'register' ? (
        <RegisterPage
          selectedRole={selectedRole}
          onBack={handleBackToRoleSelection}
          onComplete={handleRegistrationComplete}
        />
      ) : null}

      {restrictedActionMsg && (
        <RestrictedActionModal
          message={restrictedActionMsg}
          onClose={() => setRestrictedActionMsg('')}
        />
      )}


      {needsTermsAcceptance && (
        <TermsEnforcementModal
          isOpen={true}
          user={user}
          termsData={activeTerms}
          onAccepted={() => {
            setNeedsTermsAcceptance(false);
            // Update local user state
            const updatedUser = { ...user, needsTermsAcceptance: false };
            setUser(updatedUser);
            localStorage.setItem('aisep_user', JSON.stringify(updatedUser));
          }}
          onLogout={handleLogout}
        />
      )}
    </>
  );
}

export default App;
