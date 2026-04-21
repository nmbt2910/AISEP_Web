import React, { useState, useRef, useEffect, useCallback, useMemo, startTransition } from 'react';
import { Rocket, AlertCircle, ChevronRight } from 'lucide-react';
import styles from './MainLayout.module.css';
import sharedStyles from '../../styles/SharedDashboard.module.css';
import Sidebar from './Sidebar';
import RightPanel from './RightPanel';
import TopBar from './TopBar';
import FeedHeader from '../feed/FeedHeader';
import StartupCard from '../feed/StartupCard';
import ProjectDetailView from '../feed/ProjectDetailView';
import StartupDetail from '../feed/StartupDetail';
import InvestorDetail from '../investors/InvestorDetail';
import ProjectSubmissionForm from '../startup/ProjectSubmissionForm';
import investorService from '../../services/investorService';
import projectSubmissionService from '../../services/projectSubmissionService';
import { filterProjectsForPublicDiscovery } from '../../utils/projectDiscoveryFilters';
import followerService from '../../services/followerService';
import connectionService from '../../services/connectionService';
import dealsService from '../../services/dealsService';
import apiDebug from '../../utils/apiDebug';
import { apiClient } from '../../services/apiClient';
import InvestorStatusBanner from '../common/InvestorStatusBanner';
import AdvisorsPage from '../../pages/AdvisorsPage';
import advisorService from '../../services/advisorService';
import AdvisorDetailView from '../profile/AdvisorDetailView';
import InvestorDiscovery from '../investors/InvestorDiscovery';
import AIChatAssistant from '../../pages/AIChatAssistant';
import AIEvaluationService from '../../services/AIEvaluationService';
import FloatingChatWidget from '../common/FloatingChatWidget';
import subscriptionService from '../../services/subscriptionService';

import ProfileRequiredModal from '../startup/ProfileRequiredModal';
import startupProfileService from '../../services/startupProfileService';
import SuccessModal from '../common/SuccessModal';

/**
 * MainLayout Component - Main application layout
 * Handles strictly defined 3-column grid layout (desktop) vs single column (mobile)
 * Locks viewport width/height to prevent scrolling
 */
function MainLayout({
  children,
  onShowRegister,
  onShowLogin,
  onShowHome,
  onShowAdvisors,
  onShowInvestors,
  onShowDashboard,
  onShowAI,
  onShowProfile,
  onShowSubscription,
  user,
  onLogout,
  showAdvisors = false,
  showInvestors = false,
  showAI = false,
  activeView = 'main',
  isFullWidthContent = false,
  onNotificationNavigate
}) {
  const token = localStorage.getItem('aisep_token') || sessionStorage.getItem('token');
  const [userSubscription, setUserSubscription] = useState(null);
  const isPaidUser = !!(user && userSubscription &&
    (userSubscription.status === 'Active' || userSubscription.status === 1 || userSubscription.status === 'active') &&
    userSubscription.packageName &&
    !userSubscription.packageName.toLowerCase().includes('miễn phí') &&
    !userSubscription.packageName.toLowerCase().includes('free'));
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [selectedStartupProfileId, setSelectedStartupProfileId] = useState(null);
  const [selectedInvestorProfileId, setSelectedInvestorProfileId] = useState(null);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [selectedAdvisor, setSelectedAdvisor] = useState(null);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [hasStartupProfile, setHasStartupProfile] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [isReturning, setIsReturning] = useState(false);
  const [activeChatSession, setActiveChatSession] = useState(null);
  const [myStartupProfileId, setMyStartupProfileId] = useState(null);

  const mainContentRef = useRef(null);
  const homeScrollPos = useRef(0);
  const prevViewRef = useRef({
    projectId: null,
    profileId: null,
    investorId: null,
    advisor: null,
    activeView: activeView
  });

  // Scroll Management: Persistence & Scroll-to-Top
  useEffect(() => {
    const main = mainContentRef.current;
    const isMobile = window.innerWidth < 1024;

    const isDetailView = !!(selectedProjectId || selectedStartupProfileId || selectedInvestorProfileId || selectedAdvisor);
    const wasDetailView = !!(prevViewRef.current.projectId || prevViewRef.current.profileId || prevViewRef.current.investorId || prevViewRef.current.advisor);
    const viewChanged = activeView !== prevViewRef.current.activeView;

    // Helper to get/set scroll
    const getScroll = () => isMobile ? window.scrollY : (main ? main.scrollTop : 0);
    const setScroll = (val) => {
      // Force immediate jump (no smooth animation), then restore.
      const prevDocBehavior = document?.documentElement?.style?.scrollBehavior;
      const prevMainBehavior = main?.style?.scrollBehavior;
      if (document?.documentElement) document.documentElement.style.scrollBehavior = 'auto';
      if (main) main.style.scrollBehavior = 'auto';

      if (isMobile) {
        // 'instant' is not a valid value; use 'auto' to avoid smooth scrolling.
        window.scrollTo({ top: val, behavior: 'auto' });
      } else if (main) {
        main.scrollTop = val;
      }

      // Restore original behavior on next frame.
      requestAnimationFrame(() => {
        if (document?.documentElement) document.documentElement.style.scrollBehavior = prevDocBehavior || '';
        if (main) main.style.scrollBehavior = prevMainBehavior || '';
      });
    };

    // Transition Logic
    if (isDetailView && !wasDetailView) {
      // ENTERING DETAIL FROM HOME: Save position (double-check if not already saved by handler)
      if (homeScrollPos.current === 0) {
        homeScrollPos.current = getScroll();
      }
      setScroll(0);
    } else if (!isDetailView && wasDetailView) {
      // RETURNING TO HOME FROM DETAIL: Restore position instantly
      setIsReturning(true);
      setScroll(homeScrollPos.current);
      
      // AUTO-REFRESH investor/feed state when returning to home per user request
      refreshAllFeedData();
    } else if (isDetailView && wasDetailView) {
      // SWITCHING BETWEEN DIFFERENT DETAILS
      setIsReturning(false);
      setScroll(0);
    } else if (viewChanged) {
      // SWITCHING MAIN TABS: Reset scroll and allow animations
      setScroll(0);
      setIsReturning(false);
      homeScrollPos.current = 0;

      // REFRESH data when switching back to main discovery feed (e.g. from Dashboard)
      if (activeView === 'main' || activeView === '') {
        refreshAllFeedData();
      }
    }

    if (typeof document !== 'undefined') {
      const shouldLock = showAI;
      document.documentElement.classList.toggle('noScroll', shouldLock);
      document.body.classList.toggle('noScroll', shouldLock);
    }

    // Update refs for next change
    prevViewRef.current = {
      projectId: selectedProjectId,
      profileId: selectedStartupProfileId,
      investorId: selectedInvestorProfileId,
      advisor: selectedAdvisor,
      activeView: activeView
    };
  }, [selectedProjectId, selectedStartupProfileId, selectedAdvisor, activeView, showAI]);

  // Handle Browser Back/Forward and URL sync
  useEffect(() => {
    const handlePopState = () => {
      // If we're going back to root, clear all detail states
      if (window.location.pathname === '/' || window.location.pathname === '') {
        setSelectedProjectId(null);
        setSelectedStartupProfileId(null);
        setSelectedInvestorProfileId(null);
        setSelectedAdvisor(null);
      } else if (window.location.pathname.startsWith('/projects/')) {
        const id = window.location.pathname.split('/')[2];
        setSelectedProjectId(id);
      }
    };

    // Initial check for URL projects
    if (window.location.pathname.startsWith('/projects/')) {
      const id = window.location.pathname.split('/')[2];
      if (id) setSelectedProjectId(id);
    }

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Public feed: non-premium list filtered to approved/published only (see utils/projectDiscoveryFilters.js)
  const [allStartups, setAllStartups] = useState([]);
  const [topRatedStartups, setTopRatedStartups] = useState([]);
  const [trendingSectors, setTrendingSectors] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [feedError, setFeedError] = useState(null);
  const [investorCount, setInvestorCount] = useState(0);
  const [followedProjectIds, setFollowedProjectIds] = useState(new Set()); // Cache for quick lookup
  const [sentConnectionIds, setSentConnectionIds] = useState(new Set()); // Cache for connection status
  const [investedProjectIds, setInvestedProjectIds] = useState(new Set()); // Cache for already invested projects
  const [investorsByProject, setInvestorsByProject] = useState(new Map()); // Map: projectId -> array of investor objects (Contract_Signed only)
  const [investorProfileStatus, setInvestorProfileStatus] = useState(null); // 'Pending', 'Approved', 'Rejected', 'Missing' or null
  const [investorProfile, setInvestorProfile] = useState(null);

  // Refetch invested projects (called after successful investment)
  const refetchInvestedProjects = useCallback(async () => {
    const isInvestor = user && (
      user.role === 'investor' ||
      user.role === 'Investor' ||
      user.role === 1 ||
      String(user.role) === '1'
    );

    if (!isInvestor) return;

    try {
      const response = await dealsService.getInvestorDeals();
      let deals = [];
      if (response && response.data) {
        if (response.data.items && Array.isArray(response.data.items)) {
          deals = response.data.items;
        } else if (Array.isArray(response.data)) {
          deals = response.data;
        }
      }
      const ids = new Set(deals.map(d => d.projectId));
      setInvestedProjectIds(ids);
      console.log('[MainLayout] Refetched invested project IDs:', ids);
    } catch (error) {
      console.error('[MainLayout] Failed to refetch invested projects:', error);
    }
  }, [user]);

  // RELOADABLE DATA FETCHERS
  const fetchFollowedIds = useCallback(async () => {
    const isInvestor = user && (
      user.role === 'investor' ||
      user.role === 'Investor' ||
      user.role === 1 ||
      String(user.role) === '1'
    );
    if (!isInvestor) {
      setFollowedProjectIds(new Set());
      return;
    }
    try {
      const response = await followerService.getMyFollowing();
      let followedProjects = [];
      if (response && response.data) {
        if (response.data.items && Array.isArray(response.data.items)) {
          followedProjects = response.data.items;
        } else if (Array.isArray(response.data)) {
          followedProjects = response.data;
        }
      }
      const ids = new Set(followedProjects.map(p => p.projectId || p.id));
      setFollowedProjectIds(ids);
    } catch (error) {
      console.error('[MainLayout] Failed to fetch followed projects:', error);
    }
  }, [user]);

  const fetchSentConnections = useCallback(async () => {
    const isInvestor = user && (
      user.role === 'investor' ||
      user.role === 'Investor' ||
      user.role === 1 ||
      String(user.role) === '1'
    );
    if (!isInvestor) {
      setSentConnectionIds(new Set());
      return;
    }
    try {
      const response = await connectionService.getMyConnectionRequests();
      let requests = [];
      if (response && response.data) {
        if (response.data.items && Array.isArray(response.data.items)) {
          requests = response.data.items;
        } else if (Array.isArray(response.data)) {
          requests = response.data;
        }
      }
      const ids = new Set(requests.map(r => r.projectId));
      setSentConnectionIds(ids);
    } catch (error) {
      console.error('[MainLayout] Failed to fetch sent connections:', error);
    }
  }, [user]);

  const fetchInvestorDealsForGrid = useCallback(async () => {
    try {
      const [dealsRes, profilesRes] = await Promise.all([
        dealsService.getInvestorDeals(),
        investorService.getAllInvestors({ pageSize: 100 })
      ]);
      const profileLookup = new Map();
      const profiles = profilesRes?.items || profilesRes?.data?.items || (Array.isArray(profilesRes) ? profilesRes : []);
      profiles.forEach(p => {
        const id = p.investorId || p.userId || p.id;
        if (id) {
          profileLookup.set(id.toString(), {
            name: p.organizationName || p.userName || p.name || 'Nhà đầu tư',
            avatar: p.profilePicture || p.avatar || null
          });
        }
      });
      let deals = [];
      if (dealsRes && dealsRes.data) {
        if (dealsRes.data.items && Array.isArray(dealsRes.data.items)) deals = dealsRes.data.items;
        else if (Array.isArray(dealsRes.data)) deals = dealsRes.data;
      } else if (Array.isArray(dealsRes)) deals = dealsRes;

      const contractSignedDeals = deals.filter(d => d.status === 'Contract_Signed' || d.status === 3 || String(d.status) === '3');
      const investorMapByProject = new Map();
      const seenPairs = new Set();
      contractSignedDeals.forEach(deal => {
        const pId = deal.projectId;
        const invId = deal.investorId || deal.investor?.id || deal.investor?.investorId;
        if (!pId || !invId) return;
        const realProfile = profileLookup.get(invId.toString());
        const pairKey = `${invId}-${pId}`;
        if (!seenPairs.has(pairKey)) {
          if (!investorMapByProject.has(pId)) investorMapByProject.set(pId, []);
          investorMapByProject.get(pId).push({
            id: invId,
            name: realProfile?.name || deal.investor?.name || 'Nhà đầu tư',
            avatar: realProfile?.avatar || deal.investor?.profilePicture || null
          });
          seenPairs.add(pairKey);
        }
      });
      setInvestorsByProject(investorMapByProject);
    } catch (error) {
      console.error('[MainLayout] Failed to fetch investor data:', error);
    }
  }, []);

  const refreshAllFeedData = useCallback(async () => {
    // Refresh core states for the discovery feed
    fetchFollowedIds();
    fetchSentConnections();
    refetchInvestedProjects();
    fetchInvestorDealsForGrid();
  }, [fetchFollowedIds, fetchSentConnections, refetchInvestedProjects, fetchInvestorDealsForGrid]);

  // Helper for RightPanel labels
  const SECTOR_LABELS = [
    'Xu hướng tuần này',
    'Tăng trưởng nhanh',
    'Nhiều nhà đầu tư theo dõi',
    'Mới nhất',
    'Đang nổi',
  ];
  const [activeFilters, setActiveFilters] = useState({
    industry: '',
    stage: '',
    minScore: 0,
    fundingStage: '',
    sort: 'newest',
  });

  useEffect(() => {
    const checkProfile = async () => {
      const userRole = (user?.role !== undefined && user?.role !== null) ? user.role.toString().toLowerCase() : '';
      if (user && (userRole === 'startup' || userRole === '0') && user.userId) {
        try {
          const profile = await startupProfileService.getStartupProfileByUserId(user.userId);
          const hasProfile = !!profile;
          setHasStartupProfile(hasProfile);
          if (profile) {
            setMyStartupProfileId(profile.startupId || profile.id);
          }

          // If redirected with setup=true and no profile, show modal
          const params = new URLSearchParams(window.location.search);
          if (!hasProfile && params.get('setup') === 'true') {
            setShowProfileModal(true);
            // Clean URL
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        } catch (err) {
          console.error("Failed to check profile", err);
        }
      } else {
        setHasStartupProfile(true);
      }
    };
    checkProfile();
  }, [user]);

  // Initial data fetches using refactored callbacks
  useEffect(() => {
    fetchFollowedIds();
  }, [fetchFollowedIds]);

  useEffect(() => {
    fetchSentConnections();
  }, [fetchSentConnections]);

  useEffect(() => {
    refetchInvestedProjects();
  }, [refetchInvestedProjects]);

  useEffect(() => {
    fetchInvestorDealsForGrid();
  }, [fetchInvestorDealsForGrid]);

  useEffect(() => {
    // Only fetch if we are showing the main feed
    if (showAdvisors || showInvestors) return;

    const fetchFeed = async () => {
      setIsLoading(true);
      setFeedError(null);
      try {
        const projectsPromise = projectSubmissionService.getAllProjects();

        // Fetch both projects and startup profiles with large pageSize to ensure all are joined
        const [projectsRes, startupsRes] = await Promise.all([
          projectsPromise,
          startupProfileService.getAllStartups({ pageSize: 100 })
        ]);

        const startupMap = {};
        const startups = startupsRes?.data?.items || startupsRes?.items || (Array.isArray(startupsRes?.data) ? startupsRes.data : []);

        if (startups.length > 0) {
          startups.forEach(s => {
            const name = s.organizationName || s.companyName;
            const logo = s.logoUrl || s.logo;
            if (!name) return;
            
            const info = { name, logo };

            // Map by all possible ID fields to be safe
            if (s.startupId) startupMap[s.startupId] = info;
            if (s.StartupId) startupMap[s.StartupId] = info;
            if (s.userId) startupMap[s.userId] = info;
            if (s.UserId) startupMap[s.UserId] = info;
            if (s.id) startupMap[s.id] = info;
          });
        }

        if (projectsRes.statusCode === 200 && projectsRes.data && projectsRes.data.items) {
          const approvedOnly = filterProjectsForPublicDiscovery(projectsRes.data.items);
          // Map to UI model (non-premium API may return mixed statuses; discovery is approved/published only)
          let publishedProjects = approvedOnly
            .map(p => {
              // Try every possible ID field that backend might use to link project to startup/owner
              const sid = p.startupId || p.StartupId || p.userId || p.UserId || p.ownerId || p.authorId;
              const mappedInfo = startupMap[sid];
              const mappedName = mappedInfo?.name || p.startupName || p.organizationName || null;
              const mappedLogo = mappedInfo?.logo || p.logoUrl || p.logo || null;

              return {
                ...p,
                id: p.projectId,
                startupId: sid,
                startupName: mappedName,
                name: p.projectName,
                description: p.shortDescription,
                stage: p.developmentStage,
                industry: p.industry,
                imageUrl: p.projectImageUrl,
                tags: [], // No tags from new API
                aiScore: p.startupPotentialScore,
                score: p.startupPotentialScore,
                timestamp: p.createdAt ? new Date(p.createdAt).toLocaleDateString('vi-VN') : new Date().toLocaleDateString('vi-VN'),
                createdAt: p.createdAt,
                logo: mappedLogo,
                logoUrl: mappedLogo,
                // Full project details
                problemStatement: p.problemStatement,
                solutionDescription: p.solutionDescription,
                targetCustomers: p.targetCustomers,
                uniqueValueProposition: p.uniqueValueProposition,
                marketSize: p.marketSize,
                businessModel: p.businessModel,
                revenue: p.revenue,
                competitors: p.competitors,
                teamMembers: p.teamMembers,
                teamExperience: p.teamExperience,
                status: p.status,
                viewCount: p.viewCount,
                followerCount: p.followerCount || 0
              };
            });

          setAllStartups(publishedProjects);

          // Extract trending sectors based on industry tags frequency
          const industryCounts = publishedProjects.reduce((acc, p) => {
            if (p.tags && p.tags.length > 0) {
              p.tags.forEach(t => {
                acc[t] = (acc[t] || 0) + 1;
              });
            } else if (p.industry) {
              acc[p.industry] = (acc[p.industry] || 0) + 1;
            }
            return acc;
          }, {});

          const trending = Object.entries(industryCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, count]) => ({
              label: name,
              name: name,
              count: count
            }));

          setTrendingSectors(trending);

          // Update Top Rated Startups based on real startupPotentialScore
          const sortedByScore = [...publishedProjects].filter(p => p.aiScore > 0).sort((a, b) => b.aiScore - a.aiScore);
          setTopRatedStartups(sortedByScore.slice(0, 3));

        } else {
          setFeedError(projectsRes.message || "Không thể tải danh sách dự án.");
        }
      } catch (err) {
        console.error("Failed to load feed", err);
        setFeedError(err.message || "Đã xảy ra lỗi khi kết nối với máy chủ.");
      } finally {
        setIsLoading(false);
      }
    };
    const fetchStats = async () => {
      try {
        const invRes = await investorService.getAllInvestors({ pageSize: 1 });
        setInvestorCount(invRes.totalCount || 0);
      } catch (err) {
        console.error("Failed to fetch investor count", err);
      }
    };

    const fetchInvestorProfile = async () => {
      const isInvestor = user?.role === 'Investor' || user?.role === 1 || String(user?.role) === '1';
      if (token && isInvestor) {
        try {
          const res = await investorService.getMyProfile();
          setInvestorProfile(res);
          if (res) {
            setInvestorProfileStatus(res.status || res.approvalStatus || 'Pending');
          } else {
            setInvestorProfileStatus('Missing');
          }
        } catch (error) {
          if (error.response?.status === 404) {
            setInvestorProfileStatus('Missing');
          } else {
            console.error('[MainLayout] Failed to fetch investor profile:', error);
          }
        }
      }
    };

    fetchFeed();
    fetchStats();
    fetchInvestorProfile();
  }, [showAdvisors, showInvestors, user, token]);

  // 2. Define Handlers
  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);
  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  const handleFilterChange = (filters) => {
    setIsReturning(false);
    startTransition(() => {
      setActiveFilters(filters);
    });
  };

  /** Derived list: one render per tab/filter change (no useEffect + setState delay). */
  const filteredStartups = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();

    let filtered = allStartups.filter((startup) => {
      if (activeFilters.industry && startup.industry !== activeFilters.industry) return false;
      if (activeFilters.stage && startup.stage !== activeFilters.stage) return false;
      if (activeFilters.minScore && (startup.aiScore || 0) < activeFilters.minScore) return false;
      if (activeFilters.fundingStage && startup.fundingStage !== activeFilters.fundingStage) return false;

      if (query) {
        const matchesName = (startup.name || '').toLowerCase().includes(query);
        const matchesDesc = (startup.description || '').toLowerCase().includes(query);
        const matchesTags = (startup.tags || []).some((tag) => tag.toLowerCase().includes(query));

        if (!matchesName && !matchesDesc && !matchesTags) return false;
      }

      return true;
    });

    if (activeFilters.sort) {
      switch (activeFilters.sort) {
        case 'newest':
          filtered.sort((a, b) => {
            if (a.createdAt && b.createdAt) return new Date(b.createdAt) - new Date(a.createdAt);
            return (b.id || 0) - (a.id || 0);
          });
          break;
        case 'oldest':
          filtered.sort((a, b) => {
            if (a.createdAt && b.createdAt) return new Date(a.createdAt) - new Date(b.createdAt);
            return (a.id || 0) - (b.id || 0);
          });
          break;
        case 'trending':
          filtered.sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0));
          break;
        case 'rated':
          filtered.sort((a, b) => (b.aiScore || 0) - (a.aiScore || 0));
          break;
        case 'funded':
          filtered = filtered.filter(
            (p) => p.fundingStage && p.fundingStage !== 'Không gọi vốn' && p.fundingStage.trim() !== ''
          );
          break;
        default:
          break;
      }
    }

    return filtered;
  }, [allStartups, activeFilters, searchQuery]);

  const handleProjectUnlock = useCallback((projectId) => {
    console.log('[MainLayout] Syncing unlock state for project:', projectId);
    setAllStartups(prev => prev.map(s =>
      String(s.id) === String(projectId) ? { ...s, isUnlockedByCurrentUser: true } : s
    ));
  }, []);

  const feedHeaderStats = useMemo(
    () => ({
      approvedCount: allStartups.length,
      investorCount,
      industryCount: new Set(allStartups.flatMap((s) => s.tags || [])).size,
    }),
    [allStartups, investorCount]
  );

  const feedIndustryCounts = useMemo(() => {
    return allStartups.reduce((acc, s) => {
      (s.tags || []).forEach((tag) => {
        acc[tag] = (acc[tag] || 0) + 1;
      });
      return acc;
    }, {});
  }, [allStartups]);

  const handleFeedOpenChat = useCallback((chatSessionId, notification) => {
    setActiveChatSession({
      chatSessionId,
      displayName: notification?.title || 'Chat mới',
      currentUserId: user?.userId,
      sentTime: new Date().toISOString()
    });
  }, [user?.userId]);

  const handleFeedShowProjectForm = useCallback(() => {
    const userRole = (user?.role !== undefined && user?.role !== null) ? user.role.toString().toLowerCase() : '';
    if ((userRole === 'startup' || userRole === '0') && !hasStartupProfile) {
      setShowProfileModal(true);
    } else {
      setShowProjectForm(true);
    }
  }, [user?.role, hasStartupProfile]);

  // Memoized global recent projects (Top 3 newest from any startup)
  const recentProjects = useMemo(() => {
    return [...allStartups]
      .sort((a, b) => {
        const at = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bt = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bt - at;
      })
      .slice(0, 3);
  }, [allStartups]);

  return (
    <div className={`${styles.mainContainer} ${showAI ? styles.aiMode : ''}`}>

      {/* 1. Left Sidebar (Fixed) */}
      <div className={styles.leftSidebar}>
        {/* Pass state AND close handler to Sidebar */}
        <Sidebar
          isOpen={isMobileMenuOpen}
          onClose={closeMobileMenu}
          onShowRegister={onShowRegister}
          onShowLogin={onShowLogin}
          onShowHome={onShowHome}
          onShowAdvisors={onShowAdvisors}
          onShowInvestors={onShowInvestors}
          onShowDashboard={onShowDashboard}
          onShowAI={onShowAI}
          onShowProfile={onShowProfile}
          onShowSubscription={onShowSubscription}
          onMenuItemClick={() => {
            // Reset cached scroll if user navigates via sidebar
            homeScrollPos.current = 0;
            closeMobileMenu();
          }}
          user={user}
          onLogout={onLogout}
          activeView={activeView}
        />
      </div>

      {/* 2. Main Feed (Scrollable) */}
      {/* MOBILE HEADER (Fixed Top) */}
      {/* TopBar visibility is controlled by CSS (display: none on desktop) */}
      <TopBar onMenuClick={toggleMobileMenu} />

      <main
        ref={mainContentRef}
        className={`${styles.mainContent} ${showAI ? styles.noScroll : ''} ${isFullWidthContent ? styles.fullWidthContent : ''}`}
      >

        {/* Feed Content or Profile Page */}
        {(activeView === 'profile' || activeView === 'subscription' || activeView.startsWith('dashboard')) && children ? (
          children
        ) : showAdvisors ? (
          selectedAdvisor ? (
            <AdvisorDetailView
              user={user}
              advisor={selectedAdvisor}
              onBack={() => setSelectedAdvisor(null)}
              onShowLogin={onShowLogin}
            />
          ) : (
            <AdvisorsPage
              user={user}
              onShowLogin={onShowLogin}
              onNotificationNavigate={onNotificationNavigate}
              investorProfileStatus={investorProfileStatus}
              investorProfileReason={investorProfile?.rejectionReason}
              onUpdateProfile={() => onShowDashboard('preferences')}
              onSelectAdvisor={(advisor) => {
                // Save scroll position
                const isMobile = window.innerWidth < 1024;
                const scrollPos = isMobile ? window.scrollY : (mainContentRef.current ? mainContentRef.current.scrollTop : 0);
                homeScrollPos.current = scrollPos;
                setSelectedAdvisor(advisor);
              }}
            />
          )
        ) : showInvestors ? (
          <InvestorDiscovery
            user={user}
            onShowLogin={onShowLogin}
            onNotificationNavigate={onNotificationNavigate}
          />
        ) : showAI ? (
          <AIChatAssistant />
        ) : selectedStartupProfileId ? (
          <StartupDetail
            startupId={selectedStartupProfileId}
            onBack={() => setSelectedStartupProfileId(null)}
            user={user}
            onShowLogin={onShowLogin}
          />
        ) : selectedInvestorProfileId ? (
          <InvestorDetail
            investorId={selectedInvestorProfileId}
            onBack={() => setSelectedInvestorProfileId(null)}
            user={user}
            onShowLogin={onShowLogin}
          />
        ) : selectedProjectId ? (
          <ProjectDetailView
            projectId={selectedProjectId}
            user={user}
            isPaidUser={isPaidUser}
            onShowLogin={onShowLogin}
            isInvestorApproved={investorProfileStatus === 'Approved'}
            isFullView={(() => {
              const roleStr = user?.role?.toString().toLowerCase() || '';
              const roleNum = Number(user?.role);
              return roleStr === 'staff' || roleStr === 'operationstaff' || roleStr === 'operation_staff' || roleStr === 'advisor' || roleNum === 3 || roleNum === 2;
            })()}
            onUnlock={handleProjectUnlock}
            onBack={() => {
              setSelectedProjectId(null);
              if (window.location.pathname.startsWith('/projects/')) {
                window.history.pushState({}, '', '/');
              }
            }}
          />
        ) : (
          <>
            {/* WRAPPER FOR CONSTRAINED STREAM */}
            <div className={`${styles.feedStreamWrapper} view-enter`}>
              <FeedHeader
                user={user}
                onFilterChange={handleFilterChange}
                activeFilters={activeFilters}
                showStats={true}
                onOpenChat={handleFeedOpenChat}
                onShowProjectForm={handleFeedShowProjectForm}
                stats={feedHeaderStats}
                industryCounts={feedIndustryCounts}
                onNotificationNavigate={onNotificationNavigate}
              />

              {/* Status Alert Banner (Discovery Tab) */}
              {(user?.role === 'Investor' || user?.role === 1 || String(user?.role) === '1') && (
                <InvestorStatusBanner
                  status={investorProfileStatus}
                  reason={investorProfile?.rejectionReason}
                  onUpdateProfile={() => onShowDashboard('preferences')}
                />
              )}

              {showProfileModal && (
                <ProfileRequiredModal
                  onRedirect={() => onShowDashboard()}
                  onDismiss={() => setShowProfileModal(false)}
                />
              )}
              {isLoading ? (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: '#64748b' }}>
                  <p>Đang tải dự án...</p>
                </div>
              ) : feedError ? (
                <div className={styles.emptyState}>
                  <Rocket size={48} className={styles.emptyIcon} style={{ color: '#ef4444' }} />
                  <h3>Lỗi tải dự án</h3>
                  <p>{feedError}</p>
                </div>
              ) : filteredStartups.length > 0 ? (
                <div className={styles.feedGrid}>
                  {filteredStartups.map((startup, index) => (
                    <StartupCard
                      key={startup.id}
                      index={index}
                      startup={startup}
                      isPaidUser={isPaidUser}
                      user={user}
                      followedProjectIds={followedProjectIds}
                      sentConnectionIds={sentConnectionIds}
                      investedProjectIds={investedProjectIds}
                      investors={investorsByProject.get(startup.id) || []}
                      onInvestmentSuccess={refetchInvestedProjects}
                      isInvestorApproved={investorProfileStatus === 'Approved'}
                      myStartupProfileId={myStartupProfileId}
                      isReturning={isReturning}
                      onViewProfile={(id, type = 'startup') => {
                        // Save scroll position
                        const isMobile = window.innerWidth < 1024;
                        const scrollPos = isMobile ? window.scrollY : (mainContentRef.current ? mainContentRef.current.scrollTop : 0);
                        homeScrollPos.current = scrollPos;

                        if (type === 'investor') {
                          setSelectedStartupProfileId(null);
                          setSelectedInvestorProfileId(id);
                        } else {
                          setSelectedInvestorProfileId(null);
                          setSelectedStartupProfileId(id);
                        }
                      }}
                      onViewProject={(id) => {
                        // Capture scroll BEFORE state change
                        const isMobile = window.innerWidth < 1024;
                        const scrollPos = isMobile ? window.scrollY : (mainContentRef.current ? mainContentRef.current.scrollTop : 0);
                        homeScrollPos.current = scrollPos;

                        setSelectedProjectId(id);
                        window.history.pushState({}, '', `/projects/${id}`);
                      }}
                    />
                  ))}
                </div>
              ) : (
                <div className={styles.emptyState}>
                  <Rocket size={48} className={styles.emptyIcon} />
                  <h3>Không có dự án nào</h3>
                  <p>Hiện chưa có dự án startup nào để hiển thị trong bảng tin.</p>
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* 3. Right Panel (Fixed) */}
      <div className={styles.rightPanel}>
        <RightPanel
          searchQuery={searchQuery}
          onSearchChange={(e) => setSearchQuery(e.target.value)}
          showSearch={activeView === 'main' && !selectedProjectId && !selectedStartupProfileId && !selectedAdvisor}
          onFilterChange={handleFilterChange}
          onShowHome={onShowHome}
          onShowLogin={onShowLogin}
          recentProjects={recentProjects}
          trendingSectors={trendingSectors}
          isLoading={isLoading}
          user={user}
          onViewProject={(pid) => {
            // Save scroll position for returning later
            const isMobile = window.innerWidth < 1024;
            const scrollPos = isMobile ? window.scrollY : (mainContentRef.current ? mainContentRef.current.scrollTop : 0);
            homeScrollPos.current = scrollPos;

            setSelectedProjectId(pid);
            setSelectedStartupProfileId(null);
            setSelectedInvestorProfileId(null);
            setSelectedAdvisor(null);
            window.history.pushState({}, '', `/projects/${pid}`);
          }}
        />
      </div>

      {/* Project Submission Form Modal */}
      {showProjectForm && (
        <ProjectSubmissionForm
          onClose={() => setShowProjectForm(false)}
          onSuccess={async (data) => {
            onShowDashboard?.();
          }}
          user={user}
        />
      )}

    </div>
  );
}

export default MainLayout;
