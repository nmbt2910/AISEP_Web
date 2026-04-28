import { useState, useEffect, startTransition } from 'react';
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
import authService from './services/authService';
import startupProfileService from './services/startupProfileService';
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
  const [isSessionExpired, setIsSessionExpired] = useState(false);
  const [lastInvestorBookingFilter, setLastInvestorBookingFilter] = useState('all');
  const [lastDashboardSection, setLastDashboardSection] = useState('investments');
  const [dashboardTargetId, setDashboardTargetId] = useState(null);

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
           const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
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
      
      const roleStr = parsedUser.role?.toString().toLowerCase() || '';
      const roleNum = Number(parsedUser.role);
      const isStaff = roleStr === 'operationstaff' || roleStr === 'operation_staff' || roleStr === 'staff' || roleNum === 3;
      const isAdvisor = roleStr === 'advisor' || roleNum === 2;
      const isInvestor = roleStr === 'investor' || roleNum === 1;
      const isAdmin = roleStr === 'admin' || roleNum === 4;
      
      if (isStaff || isAdvisor || isInvestor || isAdmin) {
        setCurrentView('dashboard');
      } else {
        setCurrentView('main');
      }
    }
  }, []);

  const handleLoginSuccess = async (userData, accessToken, refreshToken) => {
    localStorage.setItem('aisep_user', JSON.stringify(userData));
    localStorage.setItem('aisep_token', accessToken);
    localStorage.setItem('aisep_refresh_token', refreshToken);
    setUser(userData);
    setIsSessionExpired(false); 

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
    
    if (roleStr === 'startup' || roleStr === '0' || roleNum === 0) {
      try {
        const response = await startupProfileService.getStartupProfileByUserId(userData.userId);
        if (!response) {
          setCurrentView('main');
          window.history.replaceState({}, document.title, window.location.pathname + '?setup=true');
        } else {
          setCurrentView('main');
        }
      } catch (err) {
        console.error("Failed to check profile after login:", err);
        setCurrentView('main');
      }
    } else {
      setCurrentView('main');
    }
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch (err) {
      console.error('Logout error:', err);
    }
    localStorage.removeItem('aisep_user');
    localStorage.removeItem('aisep_token');
    localStorage.removeItem('aisep_refresh_token');
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
          isFullWidthContent={currentView.startsWith('dashboard_project_')}
        >
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
                const section = currentView.startsWith('dashboard_') ? currentView.replace('dashboard_', '') : 'overview';
                return <AdminDashboard user={user} initialSection={section} />;
              } else {
                return <div style={{ padding: '20px', textAlign: 'center' }}><p>Dashboard not available for your role</p></div>;
              }
            })()
          )}
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
    </>
  );
}

export default App;
