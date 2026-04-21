import React, { useState, useRef } from 'react';
import { TrendingUp, Heart, DollarSign, CheckCircle, Eye, MessageSquare, TrendingUpIcon, Loader2, Crown, X, Info, Calendar, PieChart, ArrowRight, FileText, Check, Users, AlertCircle, RefreshCw, Trash2, Settings, Download, XCircle, Clock, Shield, ChevronRight, GripVertical } from 'lucide-react';
import SignatureCanvas from 'react-signature-canvas';
import styles from '../styles/SharedDashboard.module.css';
import contractStyles from './ContractSigningModal.module.css';
import FeedHeader from '../components/feed/FeedHeader';
import FloatingChatWidget from '../components/common/FloatingChatWidget';
import NewsPRSection from '../components/common/NewsPRSection';
import followerService from '../services/followerService';
import connectionService from '../services/connectionService';
import chatService from '../services/chatService';
import signalRService from '../services/signalRService';
import dealsService from '../services/dealsService';
import notificationService from '../services/notificationService';
import AIEvaluationService from '../services/AIEvaluationService';
import projectSubmissionService from '../services/projectSubmissionService';
import SuccessModal from '../components/common/SuccessModal';
import InvestorStatusBanner from '../components/common/InvestorStatusBanner';
import apiDebug from '../utils/apiDebug';
import { apiClient } from '../services/apiClient';
import enumService from '../services/enumService';
import investorService from '../services/investorService';
import blockchainOwnershipService from '../services/blockchainOwnershipService';
import BlockchainOwnershipModal from '../components/common/BlockchainOwnershipModal';
import AccountProfileTab from '../components/common/AccountProfileTab';
import { isEthereumAddress, isValidProfileString } from '../utils/validation';
import CustomSelect from '../components/common/CustomSelect';
import InvestorAIHistoryModal from '../components/common/InvestorAIHistoryModal';
import AIAnalyzeConfirmationModal from '../components/common/AIAnalyzeConfirmationModal';
import subscriptionService from '../services/subscriptionService';
import paymentService from '../services/paymentService';
/**
 * InvestorDashboard - Comprehensive dashboard for investors
 * Features: Portfolio overview, Watchlist, Sent interests, Active investments, Preferences
 */
export default function InvestorDashboard({ user, initialSection = 'investments', targetId, onLogout, onViewProject, onNotificationNavigate }) {
    const [activeSection, setActiveSection] = useState(initialSection);
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 1024);
    const [showLeftTabIndicator, setShowLeftTabIndicator] = useState(false);
    const [showRightTabIndicator, setShowRightTabIndicator] = useState(false);
    const [indicatorStyle, setIndicatorStyle] = useState({});
    const tabsRef = useRef(null);
    const isFirstLoad = useRef(true);
    const isFormDirty = useRef(false);
    const [investorProfile, setInvestorProfile] = useState(null);
    
    // Deep Linking State Tracking
    const [hasAttemptedDeepLink, setHasAttemptedDeepLink] = useState(false);

    // Sync activeSection with initialSection prop + handle removed/invalid sections
    React.useEffect(() => {
        if (initialSection === 'overview' || initialSection === 'statistics' || !initialSection) {
            setActiveSection('investments');
        } else {
            setActiveSection(initialSection);
        }
        setHasAttemptedDeepLink(false); // Reset when section explicitly changes from outside
    }, [initialSection]);

    React.useLayoutEffect(() => {
        const updateIndicator = () => {
            if (tabsRef.current) {
                // Animated Line Style
                const activeTab = tabsRef.current.querySelector(`.${styles.tab}.${styles.active}`);
                if (activeTab) {
                    setIndicatorStyle({
                        transform: `translateX(${activeTab.offsetLeft}px)`,
                        width: `${activeTab.offsetWidth}px`
                    });
                }

                // Scroll Indicators Logic
                const { scrollLeft, scrollWidth, clientWidth } = tabsRef.current;
                setShowLeftTabIndicator(scrollLeft > 5);
                setShowRightTabIndicator(scrollLeft < scrollWidth - clientWidth - 5);
            }
        };

        const handleResize = () => {
            setIsMobile(window.innerWidth <= 1024);
            updateIndicator();
        };

        // Use a small timeout to ensure DOM is ready and styles are applied
        const timer = setTimeout(updateIndicator, 10);
        window.addEventListener('resize', handleResize);

        return () => {
            clearTimeout(timer);
            window.removeEventListener('resize', handleResize);
        };
    }, [activeSection]);

    const checkTabScroll = () => {
        if (tabsRef.current) {
            const { scrollLeft, scrollWidth, clientWidth } = tabsRef.current;
            setShowLeftTabIndicator(scrollLeft > 5);
            setShowRightTabIndicator(scrollLeft < scrollWidth - clientWidth - 5);
        }
    };
    const [sentInterests, setSentInterests] = useState([]);
    const [sentConnectionRequests, setSentConnectionRequests] = useState([]);
    const [deals, setDeals] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeChatConnectionId, setActiveChatConnectionId] = useState(null);
    const [activeChatSession, setActiveChatSession] = useState(null);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    // Contract signing states
    const [showContractModal, setShowContractModal] = useState(false);
    const [contractPreviewHtml, setContractPreviewHtml] = useState(null);
    // isLoadingContract removed - using actionLoading instead
    const [contractDealData, setContractDealData] = useState(null);
    const [contractStatus, setContractStatus] = useState(null);
    const [isSigningContract, setIsSigningContract] = useState(false);

    // Blockchain Ownership Transfer States
    const [showBlockchainOwnershipModal, setShowBlockchainOwnershipModal] = useState(false);
    const [blockchainOwnershipData, setBlockchainOwnershipData] = useState(null);
    // isLoadingBlockchainOwnership removed - using actionLoading instead
    const [blockchainOwnershipError, setBlockchainOwnershipError] = useState(null);
    const [selectedDealForOwnership, setSelectedDealForOwnership] = useState(null);
    const blockchainPollingIntervalRef = useRef(null);

    // AI Analysis States
    const [aiReports, setAiReports] = useState([]);
    const [projectMap, setProjectMap] = useState({}); // Mapping ProjectId -> ProjectData

    // Detail Modal States
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [detailType, setDetailType] = useState('connection'); // 'connection' or 'deal'
    const [selectedItem, setSelectedItem] = useState(null);

    // Action Loading States (for buttons)
    const [actionLoading, setActionLoading] = useState({}); // e.g. { 'chat-7': true, 'withdraw-5': true }

    // Success Modal States
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    // AI Analysis View States
    const [showAIReportModal, setShowAIReportModal] = useState(false);
    const [selectedAIReport, setSelectedAIReport] = useState(null);

    // --- Deep Linking Enforcement ---
    React.useEffect(() => {
        if (!targetId || hasAttemptedDeepLink) return;

        console.log(`[InvestorDashboard] Processing targetId: ${targetId} for activeSection: ${activeSection}`);
        let matchFound = false;

        // 1. Deals Deep Link
        if (activeSection === 'deals' && deals.length > 0) {
            const matchDeal = deals.find(d => String(d.dealId) === String(targetId));
            if (matchDeal) {
                setDetailType('deal');
                setSelectedItem(matchDeal);
                setShowDetailModal(true);
                matchFound = true;
                console.log(`[DeepLink] Popped Deal Detail for dealId: ${targetId}`);
            }
        }
        
        // 2. Connection Requests Deep Link
        else if (activeSection === 'connections' && sentConnectionRequests.length > 0) {
            const matchReq = sentConnectionRequests.find(r => String(r.connectionRequestId) === String(targetId));
            if (matchReq) {
                setDetailType('connection');
                setSelectedItem(matchReq);
                setShowDetailModal(true);
                matchFound = true;
                console.log(`[DeepLink] Popped Connection Detail for requestId: ${targetId}`);
            }
        }

        if (matchFound) {
            setHasAttemptedDeepLink(true);
        }
    }, [targetId, activeSection, deals, sentConnectionRequests, hasAttemptedDeepLink]);

    // Dashboard Data States
    const [prefFormData, setPrefFormData] = useState({
        organizationName: '',
        investmentTaste: '',
        walletAddress: '',
        investmentAmount: 0,
        investmentDate: null,
        riskTolerance: 1, // Medium
        investmentRegion: '',
        focusIndustry: 0,
        preferredStage: 0,
        previousInvestments: ''
    });

    // Preference States (Custom UI)
    const [preferredIndustries, setPreferredIndustries] = useState([]);
    const [errors, setErrors] = useState({});
    const [isUpdatingPrefs, setIsUpdatingPrefs] = useState(false);
    const [preferredStages, setPreferredStages] = useState([]);
    const [availableIndustries, setAvailableIndustries] = useState([]);

    // AI Re-analyze States
    const [showAIConfirmModal, setShowAIConfirmModal] = useState(false);
    const [pendingReanalyzeProjectId, setPendingReanalyzeProjectId] = useState(null);
    const [isLoadingQuota, setIsLoadingQuota] = useState(false);
    const [isAnalyzingAI, setIsAnalyzingAI] = useState(false);
    const [subscription, setSubscription] = useState(null);
    const [currentPackage, setCurrentPackage] = useState(null);

    // Industry mapping for Vietnamese labels
    const INDUSTRY_MAP = {
        'Fintech': 'Fintech',
        'Edtech': 'Edtech',
        'Healthtech': 'Công nghệ Y tế',
        'Agritech': 'Nông nghiệp công nghệ cao',
        'E_Commerce': 'Thương mại điện tử',
        'Logistics': 'Logistics & Vận tải',
        'Proptech': 'Bất động sản công nghệ',
        'Cleantech': 'Công nghệ Sạch',
        'SaaS': 'Phần mềm (SaaS)',
        'AI_BigData': 'AI & Big Data',
        'Web3_Crypto': 'Web3 & Crypto',
        'Food_Beverage': 'Thực phẩm & Đồ uống',
        'Manufacturing': 'Sản xuất',
        'Media_Entertainment': 'Truyền thông & Giải trí',
        'Other': 'Khác'
    };

    const stageOptions = [
        { value: 'Idea', label: 'Ý tưởng' },
        { value: 'MVP', label: 'MVP' },
        { value: 'Growth', label: 'Phát triển' }
    ];

    // Mapping helpers for API strings <-> UI integers
    const RISK_TOLERANCE_MAP = {
        'Low': 0, 'Medium': 1, 'High': 2,
        0: 'Low', 1: 'Medium', 2: 'High'
    };
    const STAGE_MAP = {
        'Idea': 0, 'MVP': 1, 'Growth': 2,
        0: 'Idea', 1: 'MVP', 2: 'Growth'
    };

    // Fetching industries removed from here - moved to consolidated fetchAllData below

    // Contract signing form states
    const [signFormData, setSignFormData] = useState({
        finalAmount: 0,
        finalEquityPercentage: 0,
        additionalTerms: '',
        signatureBase64: ''
    });

    // Signature canvas ref
    const signatureCanvasRef = useRef(null);
    const signatureDataRef = useRef(''); // Keep latest signature value
    const [isSignatureEmpty, setIsSignatureEmpty] = useState(true);

    const extractRejectionReasonFromNotification = React.useCallback((notification) => {
        if (!notification) return '';

        const explicitReason =
            notification.reason ||
            notification.rejectionReason ||
            notification?.data?.reason ||
            notification?.data?.rejectionReason ||
            notification?.metadata?.reason ||
            notification?.metadata?.rejectionReason;

        if (explicitReason && String(explicitReason).trim()) {
            return String(explicitReason).trim();
        }

        const message = String(notification.message || '').trim();
        if (!message) return '';

        // Try to parse common formats: "Lý do: ...", "Reason: ..."
        const reasonMatch = message.match(/(?:lý do|reason)\s*[:\-]\s*(.+)$/i);
        if (reasonMatch?.[1]) {
            return reasonMatch[1].trim();
        }

        return '';
    }, []);

    // Initialize SignalR on mount
    React.useEffect(() => {
        const initSignalR = async () => {
            try {
                const token = localStorage.getItem('aisep_token') || sessionStorage.getItem('token');
                if (token && user?.userId) {
                    await signalRService.initialize(token);
                    console.log('[InvestorDashboard] SignalR initialized successfully');

                    // Register listener for real-time background refreshes
                    signalRService.onNotificationReceived((notif) => {
                        console.log('[InvestorDashboard] SignalR notification received, triggering silent refresh');
                        refreshDeals();
                    });
                }
            } catch (error) {
                console.error('[InvestorDashboard] Failed to initialize SignalR:', error);
            }
        };

        initSignalR();

        // Cleanup on unmount
        return () => {
            signalRService.disconnect();
        };
    }, [user?.userId]);

    // Function to refresh deals after investment
    const refreshDeals = () => {
        console.log('[InvestorDashboard] refreshDeals() called - triggering refetch');
        setRefreshTrigger(prev => prev + 1);
    };

    // Listen for new deal creation events
    React.useEffect(() => {
        const handleDealCreated = (event) => {
            console.log('[InvestorDashboard] New deal created event received:', event.detail);
            refreshDeals();
        };

        window.addEventListener('deal_created', handleDealCreated);

        return () => {
            window.removeEventListener('deal_created', handleDealCreated);
        };
    }, []);

    // Reset form dirty state when leaving preferences tab and trigger fresh sync when entering
    React.useEffect(() => {
        if (activeSection !== 'preferences') {
            isFormDirty.current = false;
            setErrors({});
        } else {
            // Immediate sync when entering preferences to ensure data is fresh
            setRefreshTrigger(prev => prev + 1);
        }
    }, [activeSection]);

    // Silent background polling to keep all tabs fresh without disrupting the UI.
    // fetchAllData is optimized to only show loading skeletons on the absolute first mount.
    React.useEffect(() => {
        const pollingInterval = setInterval(() => {
            console.log('[InvestorDashboard] Silent background poll triggered');
            setRefreshTrigger(prev => prev + 1);
        }, 5000); // 5 seconds - kept very fresh according to user request

        return () => {
            clearInterval(pollingInterval);
        };
    }, []);

    // Cleanup blockchain polling interval on unmount
    React.useEffect(() => {
        return () => {
            if (blockchainPollingIntervalRef.current) {
                clearInterval(blockchainPollingIntervalRef.current);
                blockchainPollingIntervalRef.current = null;
                console.log('[InvestorDashboard] Cleaned up blockchain polling interval on unmount');
            }
        };
    }, []);

    React.useEffect(() => {
        const fetchAllData = async () => {
            // Only set total loading state on absolute first mount to avoid flashing/resetting the UI
            if (isFirstLoad.current) {
                setIsLoading(true);
            }

            try {
                console.log('[InvestorDashboard] Starting fetch of all data (First load:', isFirstLoad.current, ')');

                const [followingRes, connectRes, dealsRes, profileRes, aiReportsRes, allProjectsRes, industriesRes, notificationsRes] = await Promise.all([
                    followerService.getMyFollowing().catch(err => null),
                    connectionService.getMyConnectionRequests().catch(err => null),
                    dealsService.getInvestorDeals({ pageSize: 100 }).catch(err => null),
                    investorService.getMyProfile().catch(err => null),
                    AIEvaluationService.getAllInvestorAnalyses({ pageSize: 100 }).catch(err => null),
                    projectSubmissionService.getAllProjects().catch(err => null),
                    enumService.getEnumOptions('Industry').catch(err => []),
                    notificationService.getNotifications({ pageSize: 100 }).catch(err => null)
                ]);

                if (industriesRes && industriesRes.length > 0) {
                    setAvailableIndustries(industriesRes);
                }

                // Update States... (Omitted logic remains same)
                if (profileRes) {
                    setInvestorProfile(profileRes);

                    // Only sync form state if user hasn't modified it locally
                    if (!isFormDirty.current) {
                        setPrefFormData({
                            organizationName: profileRes.organizationName || '',
                            investmentTaste: profileRes.investmentTaste || '',
                            walletAddress: profileRes.walletAddress || '',
                            investmentAmount: profileRes.investmentAmount || 0,
                            riskTolerance: RISK_TOLERANCE_MAP[profileRes.riskTolerance] ?? 1,
                            investmentRegion: profileRes.investmentRegion || '',
                            focusIndustry: industriesRes.find(i => i.label === profileRes.focusIndustry)?.value || 0,
                            preferredStage: STAGE_MAP[profileRes.preferredStage] ?? 0,
                            previousInvestments: profileRes.previousInvestments || '',
                            minAIScore: profileRes.minAIScore || 70,
                            typicalInvestmentSize: profileRes.typicalInvestmentSize || ''
                        });

                        let industries = [];
                        if (profileRes.focusIndustry) industries.push(profileRes.focusIndustry);
                        let stages = [];
                        if (profileRes.preferredStage) stages.push(profileRes.preferredStage);

                        if (profileRes.preferredIndustries) {
                            try {
                                const parsed = JSON.parse(profileRes.preferredIndustries);
                                if (Array.isArray(parsed)) industries = [...new Set([...industries, ...parsed])];
                            } catch (e) {
                                if (typeof profileRes.preferredIndustries === 'string') {
                                    const csv = profileRes.preferredIndustries.split(',').map(s => s.trim()).filter(Boolean);
                                    industries = [...new Set([...industries, ...csv])];
                                }
                            }
                        }

                        if (profileRes.preferredStages) {
                            try {
                                const parsed = JSON.parse(profileRes.preferredStages);
                                if (Array.isArray(parsed)) stages = [...new Set([...stages, ...parsed])];
                            } catch (e) {
                                if (typeof profileRes.preferredStages === 'string') {
                                    const csv = profileRes.preferredStages.split(',').map(s => s.trim()).filter(Boolean);
                                    stages = [...new Set([...stages, ...csv])];
                                }
                            }
                        }

                        setPreferredIndustries(industries);
                        setPreferredStages(stages);
                    }
                }

                if (followingRes?.data) {
                    let followedProjects = Array.isArray(followingRes.data.items) ? followingRes.data.items : Array.isArray(followingRes.data) ? followingRes.data : [];

                    // Sort by newest to oldest based on followedAt
                    followedProjects.sort((a, b) => new Date(b.followedAt) - new Date(a.followedAt));

                    setSentInterests(followedProjects.map(project => ({
                        id: project.projectId,
                        projectId: project.projectId,
                        projectName: project.projectName,
                        projectImageUrl: project.projectImageUrl,
                        industry: project.industry,
                        sentDate: new Date(project.followedAt).toLocaleString('vi-VN'),
                        followedAt: project.followedAt
                    })));
                }

                if (connectRes?.data?.items) {
                    setSentConnectionRequests(connectRes.data.items.map(request => ({
                        id: request.connectionRequestId || request.id,
                        connectionRequestId: request.connectionRequestId,
                        projectId: request.projectId,
                        projectName: request.projectName || 'Unknown Project',
                        startupName: request.startupName || 'Unknown Startup',
                        status: request.status || 'Pending',
                        message: request.message || '',
                        responseDate: request.responseDate ? new Date(request.responseDate).toLocaleString('vi-VN') : '',
                        responseDateRaw: request.responseDate,
                        chatSessionId: request.chatSessionId || null
                    })));
                }

                let dealsData = dealsRes?.data?.items || dealsRes?.data || dealsRes || [];
                if (!Array.isArray(dealsData)) dealsData = [];

                // Build lookup of rejection reason from notifications for deal cards.
                const notificationItems = notificationsRes?.data?.items || notificationsRes?.items || [];
                const reasonByDealId = new Map();

                if (Array.isArray(notificationItems)) {
                    const sortedNotifications = [...notificationItems].sort((a, b) => {
                        const aTime = new Date(a?.createdAt || 0).getTime();
                        const bTime = new Date(b?.createdAt || 0).getTime();
                        return bTime - aTime;
                    });

                    sortedNotifications.forEach((notification) => {
                        const refType = notification.referenceType || notification.ReferenceType || notification.type || notification.Type;
                        const refId = notification.referenceId || notification.ReferenceId || notification.dealId;
                        const isDealNotification = String(refType || '').toLowerCase().includes('deal');
                        const reason = extractRejectionReasonFromNotification(notification);

                        if (isDealNotification && refId && reason && !reasonByDealId.has(String(refId))) {
                            reasonByDealId.set(String(refId), reason);
                        }
                    });
                }

                const enhancedDeals = dealsData.map((deal) => {
                    const isRejectedDeal = deal.status === 'Rejected' || deal.status === 5;
                    if (!isRejectedDeal) return deal;

                    const normalizedDealId = String(deal.dealId || '');
                    const notificationReason = reasonByDealId.get(normalizedDealId);

                    return {
                        ...deal,
                        rejectionReason: deal.rejectionReason || notificationReason || ''
                    };
                });

                setDeals(enhancedDeals);

                // Handle AI Reports
                if (aiReportsRes?.data?.items) {
                    setAiReports(aiReportsRes.data.items);
                }

                // Handle Project Map for matching
                if (allProjectsRes?.data?.items) {
                    const mapping = {};
                    allProjectsRes.data.items.forEach(p => {
                        mapping[p.projectId || p.id] = p;
                    });
                    setProjectMap(mapping);
                }

                // Mark first load as complete
                isFirstLoad.current = false;
            } catch (error) {
                console.error('[InvestorDashboard] Data fetch error:', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchAllData();
    }, [refreshTrigger]);

    const dashboardData = {
        activeInvestments: deals.length,
        acceptedInterests: sentConnectionRequests.filter(r => r.status === 'Accepted').length
    };

    const handleWithdrawInterest = async (id) => {
        const actionKey = `unfollow-${id}`;
        setActionLoading(prev => ({ ...prev, [actionKey]: true }));
        try {
            const interest = sentInterests.find(i => i.id === id);
            if (interest) {
                console.log('[InvestorDashboard] Unfollowing project:', interest.projectId);
                await followerService.unfollowProject(interest.projectId);
                setSentInterests(sentInterests.filter(item => item.id !== id));
            }
        } catch (error) {
            console.error('[InvestorDashboard] Failed to unfollow project:', error);
            alert('Lỗi: Không thể bỏ theo dõi dự án');
        } finally {
            setActionLoading(prev => ({ ...prev, [actionKey]: false }));
        }
    };

    const handleStartChat = async (connectionRequestId) => {
        const actionKey = `chat-${connectionRequestId}`;
        setActionLoading(prev => ({ ...prev, [actionKey]: true }));

        console.log('[InvestorDashboard] Starting chat for connectionRequestId:', connectionRequestId);

        // Artificial delay for UX feedback
        await new Promise(resolve => setTimeout(resolve, 800));

        // Find the connection request and extract chatSessionId
        const request = sentConnectionRequests.find(r => (r.id || r.connectionRequestId) === connectionRequestId);
        if (request && request.chatSessionId) {
            setActiveChatSession({
                chatSessionId: request.chatSessionId,
                displayName: request.startupName,
                currentUserId: user?.userId,
                sentTime: request.responseDateRaw || new Date().toISOString()
            });
        } else {
            console.warn('[InvestorDashboard] Cannot start chat - no chatSessionId for connectionRequestId:', connectionRequestId);
        }

        setActionLoading(prev => ({ ...prev, [actionKey]: false }));
    };

    // Detail Modal Handlers
    const handleShowConnectionDetail = (request) => {
        console.log('[InvestorDashboard] handleShowConnectionDetail called:', request.id);
        setDetailType('connection');
        setSelectedItem(request);
        setShowDetailModal(true);
    };

    const handleShowDealDetail = (deal) => {
        console.log('[InvestorDashboard] handleShowDealDetail called:', deal.dealId);
        setDetailType('deal');
        setSelectedItem(deal);
        setShowDetailModal(true);
    };

    const handleCloseDetailModal = () => {
        setShowDetailModal(false);
        setSelectedItem(null);
    };

    const handleShowContractPreview = async (deal) => {
        const actionKey = `contract-${deal.dealId}`;
        console.log('[InvestorDashboard] handleShowContractPreview called for deal:', deal.dealId, 'status:', deal.status);
        setActionLoading(prev => ({ ...prev, [actionKey]: true }));

        try {
            setContractDealData(deal);
            // Use status directly from deal object (already have it from GET /api/Deals)
            setContractStatus(deal.status);
            console.log('[InvestorDashboard] Set contractStatus to:', deal.status, 'type:', typeof deal.status);

            setSignFormData({
                finalAmount: deal.amount || 0,
                finalEquityPercentage: deal.equityPercentage || 0,
                additionalTerms: '',
                signatureBase64: ''
            });

            const response = await dealsService.getContractPreview(deal.dealId);
            if (response && response.data) {
                setContractPreviewHtml(response.data);
                setShowContractModal(true);
            }
        } catch (error) {
            console.error('[InvestorDashboard] Error loading contract:', error);
            alert('Lỗi: Không thể tải hợp đồng');
        } finally {
            setActionLoading(prev => ({ ...prev, [actionKey]: false }));
        }
    };

    const handleSignatureChange = () => {
        // Called when user draws on canvas
        if (signatureCanvasRef.current) {
            const isEmpty = signatureCanvasRef.current.isEmpty();
            setIsSignatureEmpty(isEmpty);
        }
    };

    const handleClearSignature = () => {
        console.log('[InvestorDashboard] Clearing signature');
        if (signatureCanvasRef.current) {
            signatureCanvasRef.current.clear();
            signatureDataRef.current = ''; // Clear ref too
            setIsSignatureEmpty(true);
            setSignFormData(prev => ({ ...prev, signatureBase64: '' }));
        }
    };

    const handleSaveSignature = () => {
        console.log('[InvestorDashboard] Saving signature...');
        if (signatureCanvasRef.current) {
            const isEmpty = signatureCanvasRef.current.isEmpty();
            console.log('[InvestorDashboard] Canvas isEmpty:', isEmpty);

            if (!isEmpty) {
                try {
                    const canvasUrl = signatureCanvasRef.current.toDataURL('image/png');
                    // Extract plain base64 from data URL (remove 'data:image/png;base64,' prefix)
                    const base64String = canvasUrl.replace(/^data:image\/png;base64,/, '');
                    console.log('[InvestorDashboard] Signature Base64 length:', base64String.length);

                    // Store in ref for reliable access
                    signatureDataRef.current = base64String;

                    // Also update state for UI
                    setSignFormData(prev => {
                        const updated = { ...prev, signatureBase64: base64String };
                        console.log('[InvestorDashboard] Updated signFormData with signature');
                        return updated;
                    });
                } catch (err) {
                    console.error('[InvestorDashboard] Error saving signature:', err);
                }
            } else {
                console.log('[InvestorDashboard] Canvas is empty, cannot save');
            }
        } else {
            console.log('[InvestorDashboard] No canvas ref found');
        }
    };

    const handleSignContract = async () => {
        if (!contractDealData) return;

        console.log('[InvestorDashboard] handleSignContract called');
        console.log('[InvestorDashboard] Current signFormData:', signFormData);
        console.log('[InvestorDashboard] Ref signature length:', signatureDataRef.current.length);

        // Priority: ref > state > canvas
        let finalSignature = signatureDataRef.current || signFormData.signatureBase64;

        // If no signature in ref/state, try to get from canvas directly
        if (!finalSignature && signatureCanvasRef.current) {
            console.log('[InvestorDashboard] Getting signature from canvas directly');
            if (!signatureCanvasRef.current.isEmpty()) {
                try {
                    const canvasUrl = signatureCanvasRef.current.toDataURL('image/png');
                    finalSignature = canvasUrl.replace(/^data:image\/png;base64,/, ''); // Extract plain base64
                    signatureDataRef.current = finalSignature; // Store in ref
                    console.log('[InvestorDashboard] Got signature from canvas, length:', finalSignature.length);
                } catch (err) {
                    console.error('[InvestorDashboard] Error getting signature from canvas:', err);
                }
            }
        }

        // Validate form
        if (!signFormData.finalAmount || signFormData.finalAmount === 0) {
            alert('Vui lòng nhập số tiền');
            return;
        }

        if (!signFormData.finalEquityPercentage && signFormData.finalEquityPercentage !== 0) {
            alert('Vui lòng nhập phần trăm cổ phần');
            return;
        }

        if (!finalSignature) {
            console.log('[InvestorDashboard] No signature found');
            alert('Vui lòng vẽ chữ ký');
            return;
        }

        setIsSigningContract(true);
        try {
            console.log('[InvestorDashboard] Signing contract for deal:', contractDealData.dealId);

            // Prepare data with final signature
            const contractData = {
                finalAmount: signFormData.finalAmount,
                finalEquityPercentage: signFormData.finalEquityPercentage,
                additionalTerms: signFormData.additionalTerms,
                signatureBase64: finalSignature
            };

            console.log('[InvestorDashboard] Sending contract data:', {
                dealId: contractDealData.dealId,
                finalAmount: contractData.finalAmount,
                finalEquityPercentage: contractData.finalEquityPercentage,
                signatureBase64Length: contractData.signatureBase64.length
            });

            const response = await dealsService.signContract(contractDealData.dealId, contractData);
            if (response?.success) {
                alert('✓ Hợp đồng đã được ký thành công!');
                setShowContractModal(false);
                setContractPreviewHtml(null);
                setContractDealData(null);
                setSignFormData({ finalAmount: 0, finalEquityPercentage: 0, additionalTerms: '', signatureBase64: '' });
                setIsSignatureEmpty(true);
                signatureDataRef.current = ''; // Clear ref
                setRefreshTrigger(prev => prev + 1);
            }
        } catch (error) {
            console.error('[InvestorDashboard] Error signing contract:', error);
            alert('Lỗi: Không thể ký hợp đồng');
        } finally {
            setIsSigningContract(false);
        }
    };

    const handleCloseContractModal = () => {
        setShowContractModal(false);
        setContractPreviewHtml(null);
        setContractDealData(null);
        setContractStatus(null);
        setSignFormData({ finalAmount: 0, finalEquityPercentage: 0, additionalTerms: '', signatureBase64: '' });
        setIsSignatureEmpty(true);
        signatureDataRef.current = ''; // Clear ref
        if (signatureCanvasRef.current) {
            signatureCanvasRef.current.clear();
        }
    };

    const handleCheckBlockchainOwnership = async (deal) => {
        const actionKey = `ownership-${deal.dealId}`;
        console.log('[InvestorDashboard] handleCheckBlockchainOwnership called for deal:', deal.dealId);

        if (!deal.dealId) {
            console.error('[InvestorDashboard] Deal ID not found');
            return;
        }

        setSelectedDealForOwnership(deal);
        setShowBlockchainOwnershipModal(true);
        setActionLoading(prev => ({ ...prev, [actionKey]: true }));
        setBlockchainOwnershipError(null);
        setBlockchainOwnershipData(null);

        // Clear any existing polling interval
        if (blockchainPollingIntervalRef.current) {
            clearInterval(blockchainPollingIntervalRef.current);
        }

        try {
            // Start polling for blockchain status
            console.log('[InvestorDashboard] Starting to poll blockchain status for deal:', deal.dealId);

            const pollResult = await blockchainOwnershipService.pollBlockchainStatus(
                deal.dealId,
                (updateInfo) => {
                    console.log('[InvestorDashboard] Polling update:', updateInfo);

                    if (updateInfo.status === 'polling' || updateInfo.status === 'completed') {
                        setBlockchainOwnershipData(updateInfo.data);
                        setActionLoading(prev => ({ ...prev, [actionKey]: updateInfo.status === 'polling' }));
                    } else if (updateInfo.status === 'error') {
                        setBlockchainOwnershipError(updateInfo.error);
                        setActionLoading(prev => ({ ...prev, [actionKey]: false }));
                    }
                }
            );

            console.log('[InvestorDashboard] Polling result:', pollResult);

            if (pollResult.status === 'completed' || pollResult.status === 'timeout') {
                setBlockchainOwnershipData(pollResult.data);
                setActionLoading(prev => ({ ...prev, [actionKey]: false }));
            } else if (pollResult.status === 'error') {
                setBlockchainOwnershipError(pollResult.error);
                setActionLoading(prev => ({ ...prev, [actionKey]: false }));
            }
        } catch (error) {
            console.error('[InvestorDashboard] Error checking blockchain ownership:', error);
            setBlockchainOwnershipError(error.message || 'Không thể kiểm tra trạng thái blockchain.');
            setActionLoading(prev => ({ ...prev, [actionKey]: false }));
        }
    };

    const handleCloseBlockchainOwnershipModal = () => {
        setShowBlockchainOwnershipModal(false);
        setBlockchainOwnershipData(null);
        setBlockchainOwnershipError(null);
        setSelectedDealForOwnership(null);
        // setIsLoadingBlockchainOwnership removed - using actionLoading pattern

        // Clear polling interval
        if (blockchainPollingIntervalRef.current) {
            clearInterval(blockchainPollingIntervalRef.current);
            blockchainPollingIntervalRef.current = null;
        }
    };

    const handleCloseChatWindow = () => {
        console.log('[InvestorDashboard] Closing chat window');
        setActiveChatSession(null);
        setActiveChatConnectionId(null);
        // Refresh ALL data after chat closes (deals, requests, interests)
        refreshDeals();
    };

    // Preference Handlers
    const toggleIndustry = (industryLabel) => {
        isFormDirty.current = true;
        setPreferredIndustries(prev =>
            prev.includes(industryLabel)
                ? prev.filter(i => i !== industryLabel)
                : [...prev, industryLabel]
        );
    };

    const validateField = (name, value) => {
        switch (name) {
            case 'organizationName':
                if (!value) return 'Vui lòng nhập tên tổ chức/cá nhân.';
                if (!isValidProfileString(value, 255)) return 'Tên chứa ký tự không hợp lệ hoặc quá dài (tối đa 255 ký tự).';
                return null;
            case 'walletAddress':
                if (!value) return 'Vui lòng nhập địa chỉ ví blockchain.';
                const trimmed = value.trim();
                if (trimmed.length !== 42 && trimmed.length !== 40) {
                    return `Địa chỉ ví phải có 42 ký tự (Hiện có: ${trimmed.length}).`;
                }
                if (!isEthereumAddress(trimmed)) return 'Địa chỉ ví không đúng định dạng Hex (0x...).';
                return null;
            case 'investmentAmount':
                if (value === '' || value === null || value === undefined) return 'Vui lòng nhập số tiền.';
                if (Number(value) <= 0) return 'Ngân sách đầu tư phải lớn hơn 0.';
                return null;
            case 'investmentTaste':
                if (!value) return 'Vui lòng mô tả gu đầu tư/chiến lược.';
                return null;
            case 'investmentRegion':
                if (value && !isValidProfileString(value, 255)) return 'Khu vực đầu tư chứa ký tự không hợp lệ.';
                return null;
            case 'previousInvestments':
                if (value && !isValidProfileString(value, 1000)) return 'Kinh nghiệm đầu tư chứa ký tự không hợp lệ.';
                return null;
            default:
                return null;
        }
    };

    const handleProfileInputChange = (e) => {
        let { name, value } = e.target;
        // Mark form as dirty to prevent background polling from overwriting edits
        isFormDirty.current = true;

        // Auto-trim wallet address to prevent accidental spaces when copy-pasting
        if (name === 'walletAddress' && typeof value === 'string') {
            value = value.trim();
            console.log(`[Wallet Debug] Length: ${value.length}, Value: ${value}`);
        }

        // Handle numeric inputs
        const finalValue = e.target.type === 'number' ? (value === '' ? '' : Number(value)) : value;
        setPrefFormData(prev => ({ ...prev, [name]: finalValue }));

        // Real-time validation as requested
        const error = validateField(name, finalValue);
        setErrors(prev => ({ ...prev, [name]: error }));
    };

    const validateProfileForm = () => {
        const newErrors = {};

        if (!prefFormData.organizationName?.trim()) {
            newErrors.organizationName = 'Vui lòng nhập tên tổ chức/cá nhân.';
        } else if (!isValidProfileString(prefFormData.organizationName, 255)) {
            newErrors.organizationName = 'Tên chứa ký tự không hợp lệ hoặc quá dài (tối đa 255 ký tự).';
        }

        if (!prefFormData.walletAddress?.trim()) {
            newErrors.walletAddress = 'Vui lòng nhập địa chỉ ví blockchain.';
        } else if (!isEthereumAddress(prefFormData.walletAddress)) {
            newErrors.walletAddress = 'Địa chỉ ví không hợp lệ hoặc sai định dạng EIP-55 checksum.';
        }

        if (!prefFormData.investmentAmount || prefFormData.investmentAmount <= 0) {
            newErrors.investmentAmount = 'Ngân sách đầu tư phải lớn hơn 0.';
        }

        if (!prefFormData.investmentTaste?.trim()) {
            newErrors.investmentTaste = 'Vui lòng mô tả gu đầu tư/chiến lược.';
        }

        if (prefFormData.investmentRegion && !isValidProfileString(prefFormData.investmentRegion, 255)) {
            newErrors.investmentRegion = 'Khu vực đầu tư chứa ký tự không hợp lệ (VD: <, >, {, }).';
        }

        if (prefFormData.previousInvestments && !isValidProfileString(prefFormData.previousInvestments, 1000)) {
            newErrors.previousInvestments = 'Kinh nghiệm đầu tư chứa ký tự không hợp lệ (VD: <, >, {, }).';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const toggleStage = (stageValue) => {
        isFormDirty.current = true;
        setPreferredStages(prev =>
            prev.includes(stageValue)
                ? prev.filter(s => s !== stageValue)
                : [...prev, stageValue]
        );
    };

    const handleUpdatePreferences = async (e) => {
        if (e) e.preventDefault();

        if (!validateProfileForm()) {
            const firstError = Object.values(errors)[0];
            if (firstError) {
                // We'll show errors in UI, but alert just in case they are not visible
                // alert(`Vui lòng kiểm tra lại thông tin:\n${firstError}`);
            }
            return;
        }

        setIsUpdatingPrefs(true);
        try {
            console.log('[InvestorDashboard] Saving profile...');

            // Prepare the payload as FormData because backend uses [FromForm]
            const formData = new FormData();
            formData.append('organizationName', prefFormData.organizationName || '');
            formData.append('investmentTaste', prefFormData.investmentTaste || '');
            formData.append('walletAddress', prefFormData.walletAddress || '');
            formData.append('investmentAmount', prefFormData.investmentAmount || 0);
            if (prefFormData.investmentDate) formData.append('investmentDate', prefFormData.investmentDate);
            formData.append('riskTolerance', RISK_TOLERANCE_MAP[prefFormData.riskTolerance] || 'Medium');
            formData.append('investmentRegion', prefFormData.investmentRegion || '');

            // Map focusIndustry back to Label if it's an ID
            const industryLabel = availableIndustries.find(i => i.value === prefFormData.focusIndustry)?.label || prefFormData.focusIndustry;
            formData.append('focusIndustry', industryLabel);

            formData.append('preferredStage', STAGE_MAP[prefFormData.preferredStage] || 'Idea');
            formData.append('previousInvestments', prefFormData.previousInvestments || '');

            let response;
            if (investorProfile?.investorId) {
                // Update mode
                response = await investorService.updateInvestor(investorProfile.investorId, formData);
                setSuccessMessage('Hồ sơ nhà đầu tư của bạn đã được cập nhật thành công và đang chờ xét duyệt!');
            } else {
                // Create mode
                response = await investorService.createInvestor(formData);
                setSuccessMessage('Hồ sơ nhà đầu tư của bạn đã được tạo thành công và đang chờ xét duyệt!');
            }

            if (response) {
                isFormDirty.current = false;
                setShowSuccessModal(true);
                setRefreshTrigger(prev => prev + 1);
            }
        } catch (error) {
            console.error('[InvestorDashboard] Failed to save profile:', error);

            // Map backend errors back to fields if possible
            if (error.errors) {
                const backendErrors = {};
                // handle both object format { FieldName: [msgs] } and array format [Field: msg]
                if (!Array.isArray(error.errors)) {
                    Object.keys(error.errors).forEach(key => {
                        const camelKey = key.charAt(0).toLowerCase() + key.slice(1);
                        backendErrors[camelKey] = Array.isArray(error.errors[key]) ? error.errors[key][0] : error.errors[key];
                    });
                } else {
                    // Try to extract from strings like "WalletAddress: message"
                    error.errors.forEach(err => {
                        if (typeof err === 'string' && err.includes(':')) {
                            const [field, msg] = err.split(':').map(s => s.trim());
                            const camelField = field.charAt(0).toLowerCase() + field.slice(1);
                            backendErrors[camelField] = msg;
                        }
                    });
                }

                if (Object.keys(backendErrors).length > 0) {
                    setErrors(prev => ({ ...prev, ...backendErrors }));
                    return; // Don't show the fallback error message if we mapped fields
                }
            }

            // Fallback: show the general error at the top of the form or in a specific error state
            setErrors(prev => ({ ...prev, general: error.message || 'Không thể lưu hồ sơ. Vui lòng thử lại sau.' }));
        } finally {
            setIsUpdatingPrefs(false);
        }
    };

    const PreferenceChip = ({ label, selected, onClick }) => (
        <div
            onClick={onClick}
            style={{
                padding: '10px 20px',
                borderRadius: '12px',
                border: selected ? '2px solid var(--primary-blue)' : '1px solid var(--border-color)',
                backgroundColor: selected ? 'rgba(29, 155, 240, 0.15)' : 'var(--bg-secondary)',
                color: selected ? 'var(--primary-blue)' : 'var(--text-secondary)',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                userSelect: 'none',
            }}
        >
            <div style={{
                width: '18px',
                height: '18px',
                borderRadius: '4px',
                border: `2px solid ${selected ? 'var(--primary-blue)' : 'rgba(255,255,255,0.15)'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: selected ? 'var(--primary-blue)' : 'transparent',
                transition: 'all 0.2s'
            }}>
                {selected && <Check size={12} color="#fff" strokeWidth={4} />}
            </div>
            {label}
        </div>
    );


    // Quota fetching for AI re-analyze
    const fetchQuotaData = async () => {
        try {
            setIsLoadingQuota(true);
            const [subRes, pkgRes] = await Promise.all([
                subscriptionService.getMySubscription(),
                paymentService.getInvestorPackages()
            ]);

            const finalSub = subRes?.data && typeof subRes.data === 'object' && !Array.isArray(subRes.data)
                ? subRes.data
                : subRes;

            const finalPkgs = pkgRes?.data && Array.isArray(pkgRes.data)
                ? pkgRes.data
                : (Array.isArray(pkgRes) ? pkgRes : []);

            if (finalSub && typeof finalSub === 'object') {
                setSubscription(finalSub);
            }
            if (finalPkgs.length > 0) {
                setCurrentPackage(finalPkgs.find(p => p.packageId === finalSub?.packageId) || finalPkgs[0]);
            }
        } catch (err) {
            console.error("Error fetching quota:", err);
        } finally {
            setIsLoadingQuota(false);
        }
    };

    // Handle re-analyze click from AI modal
    const handleReanalyzeClick = () => {
        if (!selectedAIReport) return;
        setPendingReanalyzeProjectId(selectedAIReport.projectId);
        fetchQuotaData().then(() => {
            setShowAIReportModal(false);
            setShowAIConfirmModal(true);
        });
    };

    // Handle confirmed re-analyze (after quota check passes)
    const handleConfirmReanalyze = async () => {
        if (!pendingReanalyzeProjectId) return;
        
        setIsAnalyzingAI(true);
        try {
            const res = await AIEvaluationService.analyzeProjectByInvestorAPI(pendingReanalyzeProjectId);
            if (res.success && res.data) {
                // Success: Show the report modal right here
                setSelectedAIReport(res.data);
                setShowAIReportModal(true);
                setShowAIConfirmModal(false);
                setPendingReanalyzeProjectId(null);
                
                // Refresh history list so the new report appears
                setRefreshTrigger(prev => prev + 1);
            } else {
                alert(res.message || 'Có lỗi xảy ra khi thực hiện phân tích AI.');
            }
        } catch (err) {
            console.error('[InvestorDashboard] AI analysis failed:', err);
            alert('Không thể kết nối với hệ thống AI. Vui lòng thử lại sau.');
        } finally {
            setIsAnalyzingAI(false);
        }
    };

    // Compute quota for modal
    const maxAiRequests = Number(currentPackage?.maxAiRequests ?? subscription?.maxAiRequests ?? 0);
    const usedAiRequests = Number(subscription?.usedAiRequests ?? 0);
    const remainingAiRequests = Math.max(0, maxAiRequests - usedAiRequests);

    return (
        <div className={styles.container}>
            {/* Page Header - Regular scroll behavior */}
            {activeSection !== 'pr_news' && (
                <FeedHeader
                    title={activeSection === 'account_profile' ? "Hồ sơ người dùng" : "Bảng điều khiển Nhà đầu tư"}
                    subtitle={activeSection === 'account_profile' ? "Quản lý thông tin tài khoản và mật khẩu của bạn." : `Xin chào, ${user?.name || 'Nhà đầu tư'}! Quản lý đầu tư và khám phá startup.`}
                    showFilter={false}
                    user={user}
                    onOpenChat={(chatSessionId) => {
                        setActiveChatSession({
                            chatSessionId,
                            displayName: 'Startup Founder',
                            currentUserId: user?.userId,
                            sentTime: new Date().toISOString(),
                        });
                    }}
                    onNotificationNavigate={onNotificationNavigate}
                />
            )}

            {/* Sticky Navigation Area: Banner + Tabs */}
            {activeSection !== 'pr_news' && (
                <div className={styles.tabSwitcherWrapper}>
                    {/* Tabs Section */}
                    {activeSection !== 'account_profile' && (
                        <div
                            className={`${styles.tabs} ${styles.animatedTabs}`}
                            ref={tabsRef}
                            onScroll={checkTabScroll}
                        >
                            <button
                                className={`${styles.tab} ${activeSection === 'investments' ? styles.active : ''}`}
                                onClick={() => setActiveSection('investments')}
                            >
                                Khoản đầu tư
                            </button>
                            <button
                                className={`${styles.tab} ${activeSection === 'connectionrequests' ? styles.active : ''}`}
                                onClick={() => setActiveSection('connectionrequests')}
                            >
                                Yêu cầu kết nối
                            </button>
                            <button
                                className={`${styles.tab} ${activeSection === 'interests' ? styles.active : ''}`}
                                onClick={() => setActiveSection('interests')}
                            >
                                Dự án quan tâm
                            </button>
                            <button
                                className={`${styles.tab} ${activeSection === 'ai_reports' ? styles.active : ''}`}
                                onClick={() => setActiveSection('ai_reports')}
                            >
                                Lịch sử phân tích AI
                            </button>
                            <button
                                className={`${styles.tab} ${activeSection === 'preferences' ? styles.active : ''}`}
                                onClick={() => setActiveSection('preferences')}
                            >
                                Hồ sơ Nhà đầu tư
                            </button>

                            {/* Animated Indicator Line */}
                            <div className={styles.tabIndicator} style={indicatorStyle} />
                        </div>
                    )}

                    <InvestorStatusBanner
                        status={investorProfile ? (investorProfile.status || 'Pending') : (isLoading ? null : 'Missing')}
                        reason={investorProfile?.rejectionReason}
                        onUpdateProfile={() => setActiveSection('preferences')}
                    />
                </div>
            )}

            {/* Content Sections */}
            <div className={`${styles.content} ${styles.scrollableSection}`} style={activeSection === 'pr_news' ? { padding: 0 } : {}}>
                {activeSection === 'account_profile' && (
                    <AccountProfileTab user={user} onLogout={onLogout} />
                )}

                {/* Sent Connection Requests Section */}
                {activeSection === 'connectionrequests' && (
                    <div className={styles.section}>
                        {/* Header Stats */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                            <div className={styles.card} style={{ padding: '16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <Users size={24} color="var(--primary-blue)" />
                                    <div>
                                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase' }}>Tổng yêu cầu</div>
                                        <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)' }}>
                                            {sentConnectionRequests.length}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className={styles.card} style={{ padding: '16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <AlertCircle size={24} color="#f59e0b" />
                                    <div>
                                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase' }}>Chờ xử lý</div>
                                        <div style={{ fontSize: '24px', fontWeight: '800', color: '#f59e0b' }}>
                                            {sentConnectionRequests.filter(r => r.status === 'Pending').length}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className={styles.card} style={{ padding: '16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <CheckCircle size={24} color="#10b981" />
                                    <div>
                                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase' }}>Đã chấp nhận</div>
                                        <div style={{ fontSize: '24px', fontWeight: '800', color: '#10b981' }}>
                                            {sentConnectionRequests.filter(r => r.status === 'Accepted').length}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Loading State */}
                        {isLoading && (
                            <div className={styles.card} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
                                <Loader2 size={24} className={styles.spinner} style={{ marginRight: '12px' }} />
                                <span style={{ color: 'var(--text-secondary)' }}>Đang tải danh sách yêu cầu...</span>
                            </div>
                        )}

                        {/* Empty State */}
                        {!isLoading && sentConnectionRequests.length === 0 && (
                            <div className={styles.card} style={{ padding: '40px', textAlign: 'center' }}>
                                <Users size={48} style={{ margin: '0 auto 16px', color: 'var(--text-secondary)', opacity: 0.5 }} />
                                <h3 style={{ margin: '0 0 8px 0', color: 'var(--text-primary)' }}>Chưa gửi yêu cầu nào</h3>
                                <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Các yêu cầu thông tin bạn đã gửi sẽ xuất hiện ở đây.</p>
                            </div>
                        )}

                        {/* Requests Grid */}
                        {!isLoading && sentConnectionRequests.length > 0 && (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
                                {sentConnectionRequests.map((request, index) => {
                                    const statusConfig = {
                                        'Pending': { label: 'Chờ xử lý', color: '#f59e0b' },
                                        'Accepted': { label: 'Đã chấp nhận', color: '#10b981' },
                                        'Rejected': { label: 'Đã từ chối', color: '#ef4444' }
                                    };
                                    const statusInfo = statusConfig[request.status] || { label: 'Không xác định', color: '#64748b' };
                                    const canChat = request.status === 'Accepted' && request.chatSessionId;

                                    return (
                                        <div
                                            key={request.id || request.connectionRequestId}
                                            className={`${styles.card} ${styles.itemAppear}`}
                                            style={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '12px',
                                                borderLeft: '4px solid ' + statusInfo.color,
                                                transition: 'all 0.2s ease',
                                                animationDelay: `${index * 0.05}s`
                                            }}
                                        >
                                            {/* Header */}
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                <div style={{ flex: 1 }}>
                                                    <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', fontWeight: '800', color: 'var(--text-primary)' }}>
                                                        {request.projectName || 'Dự án không tên'}
                                                    </h4>
                                                    <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)' }}>
                                                        {request.startupName || 'Startup'}
                                                    </p>
                                                </div>
                                                <div style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '4px',
                                                    backgroundColor: statusInfo.color + '15',
                                                    color: statusInfo.color,
                                                    padding: '4px 12px',
                                                    borderRadius: '12px',
                                                    fontSize: '11px',
                                                    fontWeight: '700'
                                                }}>
                                                    {statusInfo.label}
                                                </div>
                                            </div>

                                            {/* Startup Info */}
                                            <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '12px', borderRadius: '6px' }}>
                                                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                                                    <strong>Mục đích</strong>
                                                </div>
                                                <div style={{ fontSize: '13px', color: 'var(--text-primary)' }}>
                                                    Yêu cầu thông tin chi tiết dự án
                                                </div>
                                            </div>

                                            {/* Details */}
                                            {/* Details */}
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
                                                <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: '10px', borderRadius: '6px' }}>
                                                    <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '2px' }}>Ngày trả lời</div>
                                                    <div style={{ fontSize: '13px', fontWeight: '700', color: '#10b981' }}>
                                                        {request.responseDate || 'Chưa có'}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Message (if available) */}
                                            {request.message && (
                                                <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '12px', borderRadius: '6px', fontSize: '12px', color: 'var(--text-secondary)', fontStyle: 'italic', borderLeft: '3px solid var(--primary-blue)' }}>
                                                    💬 {request.message}
                                                </div>
                                            )}

                                            {/* Actions */}
                                            <div style={{ display: 'flex', gap: '8px', marginTop: 'auto', flexWrap: 'wrap' }}>
                                                {canChat ? (
                                                    <button
                                                        style={{
                                                            flex: 1,
                                                            padding: '8px 12px',
                                                            backgroundColor: '#10b981',
                                                            color: '#fff',
                                                            border: 'none',
                                                            borderRadius: '4px',
                                                            fontSize: '12px',
                                                            fontWeight: '600',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            gap: '4px',
                                                            transition: 'all 0.2s',
                                                            opacity: actionLoading[`chat-${request.id || request.connectionRequestId}`] ? 0.7 : 1
                                                        }}
                                                        onClick={() => handleStartChat(request.id || request.connectionRequestId)}
                                                        disabled={actionLoading[`chat-${request.id || request.connectionRequestId}`]}
                                                    >
                                                        {actionLoading[`chat-${request.id || request.connectionRequestId}`] ? <Loader2 size={12} className="animate-spin" /> : <MessageSquare size={12} />}
                                                        Bắt đầu chat
                                                    </button>
                                                ) : request.status === 'Accepted' ? (
                                                    <button
                                                        style={{
                                                            flex: 1,
                                                            padding: '8px 12px',
                                                            backgroundColor: 'var(--bg-secondary)',
                                                            color: 'var(--text-secondary)',
                                                            border: '1px solid var(--border-color)',
                                                            borderRadius: '4px',
                                                            fontSize: '12px',
                                                            fontWeight: '600',
                                                            cursor: 'default',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            gap: '4px'
                                                        }}
                                                    >
                                                        Chat chưa sẵn sàng
                                                    </button>
                                                ) : (
                                                    <button
                                                        style={{
                                                            flex: 1,
                                                            padding: '8px 12px',
                                                            backgroundColor: 'var(--bg-secondary)',
                                                            color: 'var(--text-primary)',
                                                            border: '1px solid var(--border-color)',
                                                            borderRadius: '4px',
                                                            fontSize: '12px',
                                                            fontWeight: '600',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            gap: '4px',
                                                            transition: 'all 0.2s',
                                                            opacity: 1
                                                        }}
                                                        onClick={() => handleShowConnectionDetail(request)}
                                                    >
                                                        <Eye size={12} />
                                                        Xem chi tiết
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* Sent Interests Section */}
                {activeSection === 'interests' && (
                    <div className={styles.section}>
                        {/* Header Stats */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                            <div className={styles.card} style={{ padding: '16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <Heart size={24} color="#ec4899" />
                                    <div>
                                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase' }}>Tổng dự án</div>
                                        <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)' }}>
                                            {sentInterests.length}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className={styles.card} style={{ padding: '16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <TrendingUp size={24} color="var(--primary-blue)" />
                                    <div>
                                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase' }}>Ngành ưu tiên</div>
                                        <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--primary-blue)' }}>
                                            {new Set(sentInterests.map(i => i.industry)).size}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Loading State */}
                        {isLoading && (
                            <div className={styles.card} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
                                <Loader2 size={24} className={styles.spinner} style={{ marginRight: '12px' }} />
                                <span style={{ color: 'var(--text-secondary)' }}>Đang tải danh sách quan tâm...</span>
                            </div>
                        )}

                        {/* Empty State */}
                        {!isLoading && sentInterests.length === 0 && (
                            <div className={styles.card} style={{ padding: '40px', textAlign: 'center' }}>
                                <Heart size={48} style={{ margin: '0 auto 16px', color: 'var(--text-secondary)', opacity: 0.5 }} />
                                <h3 style={{ margin: '0 0 8px 0', color: 'var(--text-primary)' }}>Chưa quan tâm đến dự án nào</h3>
                                <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Hãy khám phá và theo dõi các dự án tiềm năng.</p>
                            </div>
                        )}

                        {/* Interests Grid */}
                        {!isLoading && sentInterests.length > 0 && (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
                                {sentInterests.map((interest, index) => (
                                    <div
                                        key={interest.id}
                                        className={`${styles.card} ${styles.itemAppear}`}
                                        style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '12px',
                                            borderLeft: '4px solid #ec4899',
                                            transition: 'all 0.2s ease',
                                            padding: '16px',
                                            animationDelay: `${index * 0.05}s`
                                        }}
                                    >
                                        {/* Header */}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <div style={{ flex: 1 }}>
                                                <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', fontWeight: '800', color: 'var(--text-primary)' }}>
                                                    {interest.projectName || 'Dự án không tên'}
                                                </h4>
                                                {interest.industry && (
                                                    <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '4px', backgroundColor: 'var(--bg-secondary)', fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                                        {interest.industry}
                                                    </span>
                                                )}
                                            </div>
                                            <div style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '4px',
                                                backgroundColor: 'rgba(236, 72, 153, 0.1)',
                                                color: '#ec4899',
                                                padding: '4px 12px',
                                                borderRadius: '12px',
                                                fontSize: '11px',
                                                fontWeight: '700'
                                            }}>
                                                ♥ Đang theo dõi
                                            </div>
                                        </div>

                                        {/* Project Image */}
                                        <div style={{ width: '100%', height: '140px', borderRadius: '8px', overflow: 'hidden', marginTop: '4px' }}>
                                            {interest.projectImageUrl ? (
                                                <img
                                                    src={interest.projectImageUrl}
                                                    alt={interest.projectName}
                                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                />
                                            ) : (
                                                <div style={{
                                                    width: '100%',
                                                    height: '100%',
                                                    backgroundColor: 'var(--bg-secondary)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    padding: '20px',
                                                    textAlign: 'center',
                                                    color: 'var(--text-secondary)',
                                                    fontSize: '12px',
                                                    border: '1px dashed var(--border-color)',
                                                    borderRadius: '8px'
                                                }}>
                                                    Dự án này không có hình ảnh đại diện.
                                                </div>
                                            )}
                                        </div>

                                        {/* Details */}
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px', marginTop: '4px' }}>
                                            <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '10px', borderRadius: '6px' }}>
                                                <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '2px' }}>Ngày quan tâm</div>
                                                <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>
                                                    {interest.sentDate}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div style={{ display: 'flex', gap: '8px', marginTop: 'auto', flexWrap: 'wrap', paddingTop: '8px' }}>
                                            <button
                                                style={{
                                                    flex: 1,
                                                    padding: '8px 12px',
                                                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                                    color: '#ef4444',
                                                    border: '1px solid rgba(239, 68, 68, 0.2)',
                                                    borderRadius: '4px',
                                                    fontSize: '12px',
                                                    fontWeight: '600',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '4px',
                                                    transition: 'all 0.2s',
                                                    opacity: actionLoading[`unfollow-${interest.id}`] ? 0.7 : 1
                                                }}
                                                onClick={() => handleWithdrawInterest(interest.id)}
                                                disabled={actionLoading[`unfollow-${interest.id}`]}
                                            >
                                                {actionLoading[`unfollow-${interest.id}`] ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />}
                                                Bỏ theo dõi
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Investments (Deals) Section */}
                {activeSection === 'investments' && (
                    <div className={styles.section}>
                        {/* Header Stats */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                            <div className={styles.card} style={{ padding: '16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <DollarSign size={24} color="var(--primary-blue)" />
                                    <div>
                                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase' }}>Tổng đầu tư</div>
                                        <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)' }}>
                                            {deals.length}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className={styles.card} style={{ padding: '16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <AlertCircle size={24} color="#f59e0b" />
                                    <div>
                                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase' }}>Chờ xác nhận</div>
                                        <div style={{ fontSize: '24px', fontWeight: '800', color: '#f59e0b' }}>
                                            {deals.filter(d => d.status === 'Pending').length}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className={styles.card} style={{ padding: '16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <CheckCircle size={24} color="#10b981" />
                                    <div>
                                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase' }}>Đã ký kết</div>
                                        <div style={{ fontSize: '24px', fontWeight: '800', color: '#10b981' }}>
                                            {deals.filter(d => d.status === 'Contract_Signed' || d.status === 'Minted_NFT').length}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Loading State */}
                        {isLoading && (
                            <div className={styles.card} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
                                <Loader2 size={24} className={styles.spinner} style={{ marginRight: '12px' }} />
                                <span style={{ color: 'var(--text-secondary)' }}>Đang tải danh sách đầu tư...</span>
                            </div>
                        )}

                        {/* Empty State */}
                        {!isLoading && deals.length === 0 && (
                            <div className={styles.card} style={{ padding: '40px', textAlign: 'center' }}>
                                <DollarSign size={48} style={{ margin: '0 auto 16px', color: 'var(--text-secondary)', opacity: 0.5 }} />
                                <h3 style={{ margin: '0 0 8px 0', color: 'var(--text-primary)' }}>Chưa có khoản đầu tư nào</h3>
                                <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Hãy khám phá và đầu tư vào các startup hứa hẹn.</p>
                            </div>
                        )}

                        {/* Deals Grid */}
                        {!isLoading && deals.length > 0 && (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
                                {deals.map((deal, index) => {
                                    const statusMap = {
                                        'Pending': { label: 'Chờ xác nhận', color: '#f59e0b' },
                                        'Confirmed': { label: 'Đã xác nhận', color: '#10b981' },
                                        'Contract_Signed': { label: 'Đã ký kết', color: '#667eea' },
                                        'Minted_NFT': { label: 'Đã mint NFT', color: '#8b5cf6' },
                                        'Rejected': { label: 'Đã từ chối', color: '#ef4444' },
                                        'Failed': { label: 'Thất bại', color: '#ef4444' }
                                    };
                                    const statusInfo = statusMap[deal.status] || { label: deal.status || 'Unknown', color: '#64748b' };
                                    const isContractSigned = !!deal.contractSignedAt;
                                    const isRejectedDeal = deal.status === 'Rejected' || deal.status === 5;

                                    return (
                                        <div
                                            key={deal.dealId}
                                            className={`${styles.card} ${styles.itemAppear}`}
                                            style={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '12px',
                                                borderLeft: '4px solid ' + statusInfo.color,
                                                transition: 'all 0.2s ease',
                                                animationDelay: `${index * 0.05}s`
                                            }}
                                        >
                                            {/* Deal Header */}
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                <div style={{ flex: 1 }}>
                                                    <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', fontWeight: '800', color: 'var(--text-primary)', display: 'flex', alignItems: 'center' }}>
                                                        {deal.projectName || 'Dự án không tên'}
                                                        {isContractSigned && (
                                                            <CheckCircle size={14} style={{ marginLeft: '6px', color: '#10b981' }} />
                                                        )}
                                                    </h4>
                                                    <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)' }}>
                                                        Deal #{deal.dealId} {deal.startupName ? `• ${deal.startupName}` : ''}
                                                    </p>
                                                </div>
                                                <div style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '4px',
                                                    backgroundColor: statusInfo.color + '15',
                                                    color: statusInfo.color,
                                                    padding: '4px 12px',
                                                    borderRadius: '12px',
                                                    fontSize: '11px',
                                                    fontWeight: '700'
                                                }}>
                                                    {statusInfo.label}
                                                </div>
                                            </div>

                                            {/* Deal Details */}
                                            {!isRejectedDeal && (
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '4px' }}>
                                                    <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: '10px', borderRadius: '6px' }}>
                                                        <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '2px' }}>Số tiền</div>
                                                        <div style={{ fontSize: '13px', fontWeight: '700', color: '#10b981' }}>
                                                            {deal.amount > 0 ? `${deal.amount.toLocaleString('vi-VN')} VNĐ` : 'Chưa có'}
                                                        </div>
                                                    </div>
                                                    <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '10px', borderRadius: '6px' }}>
                                                        <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '2px' }}>Cổ phần</div>
                                                        <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>
                                                            {deal.equityPercentage !== null && deal.equityPercentage > 0 ? `${deal.equityPercentage}%` : 'Chưa có'}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {isRejectedDeal && !!deal.rejectionReason && (
                                                <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '8px', padding: '10px', marginTop: '4px' }}>
                                                    <div style={{ fontSize: '11px', fontWeight: '700', color: '#dc2626', marginBottom: '4px' }}>
                                                        Lý do từ chối
                                                    </div>
                                                    <div style={{ fontSize: '12px', lineHeight: 1.5, color: 'var(--text-secondary)' }}>
                                                        {deal.rejectionReason}
                                                    </div>
                                                </div>
                                            )}

                                            {deal.contractSignedAt && (
                                                <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '8px 12px', borderRadius: '6px', fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <Check size={14} color="#10b981" />
                                                    Đã ký lúc: {new Date(deal.contractSignedAt).toLocaleString('vi-VN')}
                                                </div>
                                            )}

                                            {/* Actions */}
                                            <div style={{ display: 'flex', gap: '8px', marginTop: 'auto', flexWrap: 'wrap', paddingTop: '8px' }}>
                                                {/* Common Button Style */}
                                                {(() => {
                                                    const btnStyle = {
                                                        flex: 1,
                                                        minHeight: '38px',
                                                        padding: '8px 12px',
                                                        borderRadius: '10px',
                                                        fontSize: '12px',
                                                        fontWeight: '700',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        gap: '6px',
                                                        transition: 'all 0.2s',
                                                        border: 'none',
                                                        minWidth: '100px'
                                                    };

                                                    return (
                                                        <>
                                                            {!isRejectedDeal && (
                                                                <button
                                                                    style={{
                                                                        ...btnStyle,
                                                                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                                                        color: 'var(--text-primary)',
                                                                        border: '1px solid rgba(255, 255, 255, 0.1)'
                                                                    }}
                                                                    onClick={() => handleShowDealDetail(deal)}
                                                                >
                                                                    <Eye size={14} /> Chi tiết
                                                                </button>
                                                            )}

                                                            {(deal.status === 'Confirmed' || deal.status === 1) && (
                                                                <button
                                                                    style={{
                                                                        ...btnStyle,
                                                                        backgroundColor: '#2D7EFF',
                                                                        color: '#fff',
                                                                        opacity: actionLoading[`contract-${deal.dealId}`] ? 0.7 : 1
                                                                    }}
                                                                    onClick={() => handleShowContractPreview(deal)}
                                                                    disabled={actionLoading[`contract-${deal.dealId}`]}
                                                                >
                                                                    {actionLoading[`contract-${deal.dealId}`] ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
                                                                    Ký hợp đồng
                                                                </button>
                                                            )}

                                                            {(isContractSigned || deal.status === 'Contract_Signed' || deal.status === 3) && deal.contractPdfUrl && (
                                                                <button
                                                                    style={{
                                                                        ...btnStyle,
                                                                        backgroundColor: '#10b981',
                                                                        color: '#fff',
                                                                        opacity: actionLoading[`contract-${deal.dealId}`] ? 0.7 : 1
                                                                    }}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleShowContractPreview(deal);
                                                                    }}
                                                                    disabled={actionLoading[`contract-${deal.dealId}`]}
                                                                >
                                                                    {actionLoading[`contract-${deal.dealId}`] ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
                                                                    Xem hợp đồng
                                                                </button>
                                                            )}

                                                            {(isContractSigned || deal.status === 'Contract_Signed' || deal.status === 3) && (
                                                                <button
                                                                    style={{
                                                                        ...btnStyle,
                                                                        backgroundColor: '#3b82f6',
                                                                        color: '#fff',
                                                                        opacity: actionLoading[`ownership-${deal.dealId}`] ? 0.7 : 1
                                                                    }}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleCheckBlockchainOwnership(deal);
                                                                    }}
                                                                    disabled={actionLoading[`ownership-${deal.dealId}`]}
                                                                    title="Xác thực chuyển giao quyền sở hữu trên blockchain"
                                                                >
                                                                    {actionLoading[`ownership-${deal.dealId}`] ? (
                                                                        <Loader2 size={14} className="animate-spin" />
                                                                    ) : (
                                                                        <Shield size={14} />
                                                                    )}
                                                                    Xác thực Quyền sở hữu
                                                                </button>
                                                            )}
                                                        </>
                                                    );
                                                })()}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* AI Analysis History Section */}
                {activeSection === 'ai_reports' && (
                    <div className={styles.section}>
                        {/* Header Stats */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                            <div className={styles.card} style={{ padding: '16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <PieChart size={24} color="#0ea5e9" />
                                    <div>
                                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase' }}>Tổng báo cáo</div>
                                        <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)' }}>
                                            {aiReports.length}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Loading State */}
                        {isLoading && (
                            <div className={styles.card} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
                                <Loader2 size={24} className={styles.spinner} style={{ marginRight: '12px' }} />
                                <span style={{ color: 'var(--text-secondary)' }}>Đang tải lịch sử phân tích...</span>
                            </div>
                        )}

                        {/* Empty State */}
                        {!isLoading && aiReports.length === 0 && (
                            <div className={styles.card} style={{ padding: '40px', textAlign: 'center' }}>
                                <PieChart size={48} style={{ margin: '0 auto 16px', color: 'var(--text-secondary)', opacity: 0.5 }} />
                                <h3 style={{ margin: '0 0 8px 0', color: 'var(--text-primary)' }}>Chưa có bản phân tích nào</h3>
                                <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Các dự án bạn đã yêu cầu AI đánh giá sẽ xuất hiện ở đây.</p>
                            </div>
                        )}

                        {/* Reports Grid */}
                        {!isLoading && aiReports.length > 0 && (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
                                {aiReports.map((report, index) => {
                                    const project = projectMap[report.projectId] || {};
                                    return (
                                        <div
                                            key={report.analysisId}
                                            className={`${styles.card} ${styles.itemAppear}`}
                                            style={{
                                                borderLeft: `4px solid ${(() => {
                                                    const verdict = (report.investmentVerdict || '').toLowerCase();
                                                    if (verdict.includes('strong')) return '#00ba7c';
                                                    if (verdict.includes('watchlist')) return '#ffd400';
                                                    if (verdict.includes('pass')) return '#1d9bf0';
                                                    if (verdict.includes('reject') || verdict.includes('fail')) return '#f4212e';
                                                    return '#0ea5e9';
                                                })()}`,
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '12px',
                                                animationDelay: `${index * 0.05}s`
                                            }}
                                        >
                                            {/* Report Header */}
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                <div style={{ flex: 1 }}>
                                                    <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', fontWeight: '800', color: '#e7e9ea', letterSpacing: '-0.01em' }}>
                                                        {project.projectName || `Dự án #${report.projectId}`}
                                                    </h4>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        <Clock size={12} color="#71767b" />
                                                        <p style={{ margin: 0, fontSize: '12px', color: '#71767b' }}>
                                                            {new Date(report.createdAt).toLocaleDateString('vi-VN')}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                                                    <div style={{
                                                        backgroundColor: '#1d9bf020',
                                                        color: '#1d9bf0',
                                                        padding: '2px 10px',
                                                        borderRadius: '6px',
                                                        fontSize: '11px',
                                                        fontWeight: '800',
                                                        border: '1px solid #1d9bf030'
                                                    }}>
                                                        DIỂM: {report.potentialScore || 0}
                                                    </div>
                                                    {(() => {
                                                        const verdict = (report.investmentVerdict || '').toLowerCase();
                                                        let colors = { bg: '#2f3336', text: '#e7e9ea', border: '#3e4144' };
                                                        let label = report.investmentVerdict || 'Unknown';

                                                        if (verdict.includes('strong')) {
                                                            colors = { bg: '#00ba7c20', text: '#00ba7c', border: '#00ba7c40' };
                                                            label = 'STRONG';
                                                        } else if (verdict.includes('watchlist')) {
                                                            colors = { bg: '#ffd40020', text: '#ffd400', border: '#ffd40040' };
                                                            label = 'WATCHLIST';
                                                        } else if (verdict.includes('pass')) {
                                                            colors = { bg: '#1d9bf020', text: '#1d9bf0', border: '#1d9bf030' };
                                                            label = 'PASS';
                                                        } else if (verdict.includes('reject') || verdict.includes('fail')) {
                                                            colors = { bg: '#f4212e20', text: '#f4212e', border: '#f4212e40' };
                                                            label = 'REJECT';
                                                        }

                                                        return (
                                                            <div style={{
                                                                backgroundColor: colors.bg,
                                                                color: colors.text,
                                                                padding: '2px 10px',
                                                                borderRadius: '6px',
                                                                fontSize: '10px',
                                                                fontWeight: '900',
                                                                textTransform: 'uppercase',
                                                                border: `1px solid ${colors.border}`,
                                                                letterSpacing: '0.05em'
                                                            }}>
                                                                {label}
                                                            </div>
                                                        );
                                                    })()}
                                                </div>
                                            </div>

                                            {/* Project Image */}
                                            <div style={{ width: '100%', height: '140px', borderRadius: '8px', overflow: 'hidden' }}>
                                                {project.projectImageUrl ? (
                                                    <img
                                                        src={project.projectImageUrl}
                                                        alt={project.projectName}
                                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                    />
                                                ) : (
                                                    <div style={{
                                                        width: '100%',
                                                        height: '100%',
                                                        backgroundColor: 'var(--bg-secondary)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        border: '1px dashed var(--border-color)',
                                                        borderRadius: '8px',
                                                        color: 'var(--text-secondary)',
                                                        fontSize: '12px'
                                                    }}>
                                                        Không có ảnh
                                                    </div>
                                                )}
                                            </div>


                                            {/* Actions */}
                                            <div style={{ display: 'flex', gap: '8px', marginTop: 'auto', paddingTop: '8px' }}>
                                                <button
                                                    onClick={() => { setSelectedAIReport(report); setShowAIReportModal(true); }}
                                                    style={{
                                                        flex: 1,
                                                        padding: '8px 12px',
                                                        backgroundColor: 'rgba(14, 165, 233, 0.1)',
                                                        color: '#0ea5e9',
                                                        border: '1px solid rgba(14, 165, 233, 0.2)',
                                                        borderRadius: '4px',
                                                        fontSize: '12px',
                                                        fontWeight: '600',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        gap: '4px'
                                                    }}
                                                >
                                                    <FileText size={12} /> Xem báo cáo
                                                </button>
                                                <button
                                                    onClick={() => onViewProject ? onViewProject(report.projectId, activeSection) : window.location.href = `/project/${report.projectId}`}
                                                    style={{
                                                        flex: 1,
                                                        padding: '8px 12px',
                                                        backgroundColor: 'var(--bg-secondary)',
                                                        color: 'var(--text-primary)',
                                                        border: '1px solid var(--border-color)',
                                                        borderRadius: '4px',
                                                        fontSize: '12px',
                                                        fontWeight: '600',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        gap: '4px'
                                                    }}
                                                >
                                                    <ChevronRight size={12} /> Dự án
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* Preferences / Profile Section */}
                {activeSection === 'preferences' && (
                    <div className={styles.section}>

                        {!investorProfile && !isLoading && (
                            <div className={styles.card} style={{ marginBottom: '20px', backgroundColor: 'rgba(245, 158, 11, 0.05)', border: '1px dashed #f59e0b' }}>
                                <div style={{ padding: '20px', display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                                    <AlertCircle size={24} color="#f59e0b" style={{ marginTop: '2px' }} />
                                    <div>
                                        <h4 style={{ margin: '0 0 4px 0', color: '#f59e0b', fontWeight: '800' }}>Chưa có hồ sơ nhà đầu tư</h4>
                                        <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                                            Vui lòng hoàn thiện hồ sơ bên dưới để nhân viên kiểm duyệt. Bạn chỉ có thể thực hiện kết nối và đầu tư sau khi hồ sơ được phê duyệt.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className={styles.card}>
                            <h3 className={styles.cardTitle}>{investorProfile ? 'Cập nhật hồ sơ nhà đầu tư' : 'Hoàn thiện hồ sơ nhà đầu tư'}</h3>
                            <form className={styles.form} onSubmit={handleUpdatePreferences}>
                                {errors.general && (
                                    <div style={{ marginBottom: '20px', padding: '12px 16px', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', borderRadius: '8px', color: '#ef4444', fontSize: '14px', fontWeight: '600' }}>
                                        <AlertCircle size={16} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'text-bottom' }} />
                                        {errors.general}
                                    </div>
                                )}
                                <div className={styles.formGrid} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '24px' }}>
                                    <div className={styles.formGroup}>
                                        <label>Tên tổ chức / Cá nhân *</label>
                                        <input
                                            name="organizationName"
                                            type="text" required
                                            value={prefFormData.organizationName}
                                            onChange={handleProfileInputChange}
                                            placeholder="Tên công ty hoặc tên cá nhân đầu tư"
                                            style={{
                                                backgroundColor: 'var(--bg-secondary)',
                                                border: errors.organizationName ? '1.5px solid #f4212e' : '1px solid var(--border-color)',
                                                color: 'var(--text-primary)',
                                                borderRadius: '12px',
                                                padding: '12px 16px',
                                                transition: 'all 0.2s',
                                                width: '100%'
                                            }}
                                        />
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
                                            <span style={{ color: errors.organizationName ? '#f4212e' : 'var(--text-secondary)', fontSize: '11px', fontWeight: '500' }}>
                                                {errors.organizationName || 'Tối đa 255 ký tự, không chứa ký tự đặc biệt.'}
                                            </span>
                                            <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>{prefFormData.organizationName?.length || 0}/255</span>
                                        </div>
                                    </div>

                                    <div className={styles.formGroup}>
                                        <label>Địa chỉ Ví Blockchain *</label>
                                        <input
                                            name="walletAddress"
                                            type="text" required
                                            value={prefFormData.walletAddress}
                                            onChange={handleProfileInputChange}
                                            placeholder="0x..."
                                            style={{
                                                backgroundColor: 'var(--bg-secondary)',
                                                border: errors.walletAddress ? '1.5px solid #f4212e' : '1px solid var(--border-color)',
                                                color: 'var(--text-primary)',
                                                borderRadius: '12px',
                                                padding: '12px 16px',
                                                transition: 'all 0.2s',
                                                width: '100%'
                                            }}
                                        />
                                        <p style={{ color: errors.walletAddress ? '#f4212e' : 'var(--text-secondary)', fontSize: '11px', marginTop: '6px', fontWeight: '500' }}>
                                            {errors.walletAddress || 'Địa chỉ ví chuẩn EIP-55 checksum (Mix-case).'}
                                        </p>
                                    </div>

                                    <div className={styles.formGroup}>
                                        <label>Ngân sách đầu tư (VNĐ) *</label>
                                        <input
                                            name="investmentAmount"
                                            type="number" required min="0"
                                            value={prefFormData.investmentAmount}
                                            onChange={handleProfileInputChange}
                                            placeholder="Số tiền bạn dự kiến đầu tư"
                                            style={{
                                                backgroundColor: 'var(--bg-secondary)',
                                                border: errors.investmentAmount ? '1.5px solid #f4212e' : '1px solid var(--border-color)',
                                                color: 'var(--text-primary)',
                                                borderRadius: '12px',
                                                padding: '12px 16px',
                                                transition: 'all 0.2s',
                                                width: '100%'
                                            }}
                                        />
                                        <p style={{ color: errors.investmentAmount ? '#f4212e' : 'var(--text-secondary)', fontSize: '11px', marginTop: '6px', fontWeight: '500' }}>
                                            {errors.investmentAmount || 'Nhập ngân sách đầu tư dự kiến của bạn.'}
                                        </p>
                                    </div>

                                    <div className={styles.formGroup}>
                                        <label>Khu vực đầu tư</label>
                                        <input
                                            name="investmentRegion"
                                            type="text"
                                            value={prefFormData.investmentRegion}
                                            onChange={handleProfileInputChange}
                                            placeholder="VD: Việt Nam, Đông Nam Á..."
                                            style={{
                                                backgroundColor: 'var(--bg-secondary)',
                                                border: errors.investmentRegion ? '1.5px solid #f4212e' : '1px solid var(--border-color)',
                                                color: 'var(--text-primary)',
                                                borderRadius: '12px',
                                                padding: '12px 16px',
                                                transition: 'all 0.2s',
                                                width: '100%'
                                            }}
                                        />
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
                                            <span style={{ color: errors.investmentRegion ? '#f4212e' : 'var(--text-secondary)', fontSize: '11px', fontWeight: '500' }}>
                                                {errors.investmentRegion || 'Tối đa 255 ký tự.'}
                                            </span>
                                            <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>{prefFormData.investmentRegion?.length || 0}/255</span>
                                        </div>
                                    </div>
                                </div>

                                <div className={styles.formGrid} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '24px' }}>
                                    <div className={styles.formGroup}>
                                        <label>Mức độ chấp nhận rủi ro *</label>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            {[0, 1, 2].map(r => (
                                                <button
                                                    key={r} type="button"
                                                    onClick={() => setPrefFormData({ ...prefFormData, riskTolerance: r })}
                                                    style={{
                                                        flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)',
                                                        backgroundColor: prefFormData.riskTolerance === r ? 'var(--primary-blue)' : 'var(--bg-secondary)',
                                                        color: prefFormData.riskTolerance === r ? '#fff' : 'var(--text-secondary)',
                                                        fontSize: '13px', fontWeight: '600', transition: 'all 0.2s'
                                                    }}
                                                >
                                                    {r === 0 ? 'Thấp' : r === 1 ? 'Trung bình' : 'Cao'}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className={styles.formGroup}>
                                        <label>Giai đoạn ưu tiên *</label>
                                        <CustomSelect
                                            name="preferredStage"
                                            value={prefFormData.preferredStage}
                                            onChange={(e) => {
                                                isFormDirty.current = true;
                                                setPrefFormData({
                                                    ...prefFormData,
                                                    preferredStage: parseInt(e.target.value)
                                                });
                                            }}
                                            options={[
                                                { label: 'Ý tưởng (Idea)', value: 0 },
                                                { label: 'Sản phẩm khả thi (MVP)', value: 1 },
                                                { label: 'Tăng trưởng (Growth)', value: 2 }
                                            ]}
                                        />
                                    </div>

                                    <div className={styles.formGroup}>
                                        <label>Lĩnh vực quan tâm chính *</label>
                                        <CustomSelect
                                            name="focusIndustry"
                                            value={prefFormData.focusIndustry}
                                            onChange={(e) => {
                                                isFormDirty.current = true;
                                                setPrefFormData({
                                                    ...prefFormData,
                                                    focusIndustry: parseInt(e.target.value)
                                                });
                                            }}
                                            placeholder="Chọn lĩnh vực..."
                                            options={availableIndustries.map(opt => ({
                                                label: opt.label,
                                                value: opt.value
                                            }))}
                                        />
                                    </div>
                                </div>

                                <div className={styles.formGroup} style={{ marginBottom: '24px' }}>
                                    <label>Gu đầu tư / Chiến lược *</label>
                                    <textarea
                                        name="investmentTaste"
                                        required rows={4}
                                        value={prefFormData.investmentTaste}
                                        onChange={handleProfileInputChange}
                                        placeholder="Mô tả gu đầu tư, các tiêu chí lựa chọn startup của bạn..."
                                        style={{
                                            backgroundColor: 'var(--bg-secondary)',
                                            border: errors.investmentTaste ? '1.5px solid #f4212e' : '1px solid var(--border-color)',
                                            color: 'var(--text-primary)',
                                            borderRadius: '12px',
                                            padding: '12px 16px',
                                            transition: 'all 0.2s',
                                            width: '100%'
                                        }}
                                    />
                                    <p style={{ color: errors.investmentTaste ? '#f4212e' : 'var(--text-secondary)', fontSize: '11px', marginTop: '6px', fontWeight: '500' }}>
                                        {errors.investmentTaste || 'Mô tả chi tiết chiến lược đầu tư của bạn.'}
                                    </p>
                                </div>

                                <div className={styles.formGroup} style={{ marginBottom: '24px' }}>
                                    <label>Kinh nghiệm đầu tư trước đây</label>
                                    <textarea
                                        name="previousInvestments"
                                        rows={3}
                                        value={prefFormData.previousInvestments}
                                        onChange={handleProfileInputChange}
                                        placeholder="Liệt kê các danh mục đầu tư hoặc kinh nghiệm nổi bật..."
                                        style={{
                                            backgroundColor: 'var(--bg-secondary)',
                                            border: errors.previousInvestments ? '1.5px solid #f4212e' : '1px solid var(--border-color)',
                                            color: 'var(--text-primary)',
                                            borderRadius: '12px',
                                            padding: '12px 16px',
                                            transition: 'all 0.2s',
                                            width: '100%'
                                        }}
                                    />
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
                                        <span style={{ color: errors.previousInvestments ? '#f4212e' : 'var(--text-secondary)', fontSize: '11px', fontWeight: '500' }}>
                                            {errors.previousInvestments || 'Danh sách các startup bạn đã từng đầu tư (Tối đa 1000 ký tự).'}
                                        </span>
                                        <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>{prefFormData.previousInvestments?.length || 0}/1000</span>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '32px' }}>
                                    <button
                                        type="submit"
                                        className={styles.primaryBtn}
                                        disabled={isUpdatingPrefs}
                                        style={{ padding: '14px 40px', height: 'auto', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 4px 12px rgba(29, 155, 240, 0.3)' }}
                                    >
                                        {isUpdatingPrefs ? <Loader2 size={18} className="animate-spin" /> : <Shield size={18} />}
                                        {investorProfile ? 'Cập nhật hồ sơ' : 'Gửi hồ sơ duyệt'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {activeSection === 'pr_news' && (
                    <NewsPRSection user={user} onOpenChat={(sessionId) => {
                        setActiveChatSession({ chatSessionId: sessionId, displayName: 'Thông báo', currentUserId: user?.userId, sentTime: new Date().toISOString() });
                    }}
                        investorProfileStatus={investorProfile ? (investorProfile.status || 'Pending') : (isLoading ? null : 'Missing')}
                        investorProfileReason={investorProfile?.rejectionReason}
                        onUpdateProfile={() => setActiveSection('preferences')}
                        onNotificationNavigate={onNotificationNavigate}
                    />
                )}

                <FloatingChatWidget
                    chatSessionId={activeChatSession?.chatSessionId}
                    displayName={activeChatSession?.displayName}
                    currentUserId={user?.userId}
                    sentTime={activeChatSession?.sentTime}
                    onClose={handleCloseChatWindow}
                />

                {/* Contract Preview Modal - Modernized */}
                {showContractModal && contractPreviewHtml && (
                    <div className={contractStyles.modalOverlay} onClick={handleCloseContractModal}>
                        <div className={contractStyles.modalContent} onClick={(e) => e.stopPropagation()}>
                            {/* Header */}
                            <div className={contractStyles.header}>
                                <div className={contractStyles.headerInfo}>
                                    <h2>Ký hợp đồng đầu tư</h2>
                                    {contractDealData && (
                                        <p>
                                            Dự án: <strong>{contractDealData.projectName || contractDealData.startupName}</strong> • Số tiền: <strong>{contractDealData.amount?.toLocaleString('vi-VN')} VND</strong>
                                        </p>
                                    )}
                                </div>
                                <button className={contractStyles.closeBtn} onClick={handleCloseContractModal}>
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Body: Two Column / Stacked */}
                            <div className={contractStyles.body}>
                                {/* Left: Contract Preview */}
                                <div className={contractStyles.previewColumn}>
                                    <div className={contractStyles.sectionTitle}>
                                        <FileText size={16} /> Hợp đồng đầu tư
                                    </div>
                                    {actionLoading[`contract-${contractDealData?.dealId}`] ? (
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px', color: 'var(--text-secondary)' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                                <Loader2 size={24} className="animate-spin" />
                                                <span>Đang tải hợp đồng...</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <div
                                            className={contractStyles.contractPaper}
                                            dangerouslySetInnerHTML={{ __html: contractPreviewHtml }}
                                        />
                                    )}
                                </div>

                                {/* Right: Signing Form - Only show when NOT Signed */}
                                {![3, 4, '3', '4', 'Contract_Signed', 'Minted_NFT'].includes(contractStatus) && (
                                    <div className={contractStyles.formColumn}>
                                        <div className={contractStyles.sectionTitle}>
                                            <Settings size={16} /> Điều khoản ký kết
                                        </div>

                                        <div className={styles.formGroup}>
                                            <label>Số tiền cuối cùng (VND) *</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={signFormData.finalAmount || ''}
                                                onChange={(e) => setSignFormData({ ...signFormData, finalAmount: e.target.value ? parseFloat(e.target.value) : 0 })}
                                                placeholder="Nhập số tiền"
                                            />
                                        </div>

                                        <div className={styles.formGroup}>
                                            <label>Phần trăm cổ phần (%) *</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={signFormData.finalEquityPercentage || ''}
                                                onChange={(e) => setSignFormData({ ...signFormData, finalEquityPercentage: e.target.value ? parseFloat(e.target.value) : 0 })}
                                                placeholder="Nhập phần trăm"
                                            />
                                        </div>

                                        <div className={styles.formGroup}>
                                            <label>Điều khoản bổ sung</label>
                                            <textarea
                                                value={signFormData.additionalTerms}
                                                onChange={(e) => setSignFormData({ ...signFormData, additionalTerms: e.target.value })}
                                                placeholder="Nhập các điều khoản bổ sung (nếu có)"
                                                rows={4}
                                            />
                                        </div>

                                        {/* Signature Section */}
                                        <div className={styles.formGroup}>
                                            <label>Chữ ký (vẽ bên dưới) *</label>
                                            <div className={contractStyles.signaturePaper}>
                                                <SignatureCanvas
                                                    ref={signatureCanvasRef}
                                                    onEnd={handleSignatureChange}
                                                    penColor="#000"
                                                    canvasProps={{
                                                        width: 400,
                                                        height: 150,
                                                        className: 'signature-canvas',
                                                        style: {
                                                            display: 'block',
                                                            backgroundColor: '#fff',
                                                            cursor: 'crosshair',
                                                            touchAction: 'none'
                                                        }
                                                    }}
                                                />
                                            </div>

                                            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                                                <button
                                                    type="button"
                                                    onClick={handleClearSignature}
                                                    className={styles.dangerBtn}
                                                    style={{ flex: 1, padding: '10px' }}
                                                >
                                                    <Trash2 size={16} /> Xóa chữ ký
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={handleSaveSignature}
                                                    disabled={signFormData.signatureBase64 || isSignatureEmpty}
                                                    className={styles.primaryBtn}
                                                    style={{
                                                        flex: 1,
                                                        padding: '10px',
                                                        backgroundColor: signFormData.signatureBase64 ? '#10b981' : undefined,
                                                        opacity: signFormData.signatureBase64 ? 0.8 : (isSignatureEmpty ? 0.5 : 1),
                                                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                                                    }}
                                                >
                                                    {signFormData.signatureBase64 ? (
                                                        <><CheckCircle size={16} /> Đã lưu chữ ký</>
                                                    ) : (
                                                        <><Check size={16} /> Lưu chữ ký</>
                                                    )}
                                                </button>
                                            </div>

                                            <div className={contractStyles.signatureHint}>
                                                <Info size={16} />
                                                <div>
                                                    Vẽ chữ ký ở trên rồi click <b>"Lưu chữ ký"</b> để xác nhận.
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Footer */}
                            <div className={contractStyles.footer}>
                                <button
                                    onClick={handleCloseContractModal}
                                    className={styles.secondaryBtn}
                                    style={{ padding: '10px 24px' }}
                                >
                                    Hủy
                                </button>

                                {contractStatus === 'Contract_Signed' && contractDealData?.contractPdfUrl && (
                                    <a
                                        href={contractDealData.contractPdfUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        download={`DEAL-${contractDealData.dealId}.pdf`}
                                        className={styles.primaryBtn}
                                        style={{ padding: '10px 24px', backgroundColor: '#3b82f6' }}
                                    >
                                        <Download size={16} /> Tải hợp đồng
                                    </a>
                                )}

                                {contractStatus !== 'Contract_Signed' && (
                                    <button
                                        onClick={handleSignContract}
                                        disabled={isSigningContract}
                                        className={styles.primaryBtn}
                                        style={{ padding: '10px 32px' }}
                                    >
                                        {isSigningContract ? (
                                            <>
                                                <Loader2 size={16} className="animate-spin" />
                                                Đang ký...
                                            </>
                                        ) : (
                                            <><Check size={16} /> Ký hợp đồng</>
                                        )}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )}


                {/* Success Modal */}
                {showSuccessModal && (
                    <SuccessModal
                        message={successMessage}
                        onClose={() => setShowSuccessModal(false)}
                    />
                )}

                {/* Blockchain Ownership Transfer Modal */}
                <BlockchainOwnershipModal
                    isOpen={showBlockchainOwnershipModal}
                    ownershipData={blockchainOwnershipData}
                    onClose={handleCloseBlockchainOwnershipModal}
                    isLoading={actionLoading[`ownership-${selectedDealForOwnership?.dealId}`]}
                    error={blockchainOwnershipError}
                    dealId={selectedDealForOwnership?.dealId}
                />

                {/* Detail Modal */}
                {/* AI Analyze Confirmation Modal (for re-analyze) */}
                {showAIConfirmModal && pendingReanalyzeProjectId && (
                    <AIAnalyzeConfirmationModal
                        isOpen={showAIConfirmModal}
                        onClose={() => setShowAIConfirmModal(false)}
                        onConfirm={handleConfirmReanalyze}
                        isAnalyzing={isAnalyzingAI}
                        isLoadingQuota={isLoadingQuota}
                        projectName={aiReports.find(r => r.projectId === pendingReanalyzeProjectId)?.projectName || projectMap[pendingReanalyzeProjectId]?.name || `Dự án #${pendingReanalyzeProjectId}`}
                        remainingAiRequests={remainingAiRequests}
                        packageName={currentPackage?.packageName || subscription?.packageName || 'Gói của bạn'}
                    />
                )}

                {/* AI Report Detail Modal - Redesigned Sleek/Twitter Aesthetic */}
                <InvestorAIHistoryModal
                    isOpen={showAIReportModal}
                    onClose={() => setShowAIReportModal(false)}
                    selectedAIReport={selectedAIReport}
                    projectName={projectMap[selectedAIReport?.projectId]?.projectName}
                    onViewProject={(projId) => onViewProject ? onViewProject(projId, activeSection) : window.location.href = `/project/${projId}`}
                    onReanalyze={handleReanalyzeClick}
                />



                {/* Standardized Detail Modal */}
                {showDetailModal && selectedItem && (
                    <div className={styles.modalOverlay} onClick={handleCloseDetailModal}>
                        <div className={styles.modalContent} style={{ maxWidth: '600px', height: 'auto', maxHeight: '85vh' }} onClick={e => e.stopPropagation()}>
                            {/* Unified Modal Header */}
                            <div className={styles.modalSplitDesktopHeader} style={{ padding: '20px 24px' }}>
                                <div>
                                    <h3 className={styles.modalSplitDesktopTitle} style={{ fontSize: '20px' }}>
                                        {detailType === 'connection' ? 'Chi tiết yêu cầu kết nối' : 'Chi tiết khoản đầu tư'}
                                    </h3>
                                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px', fontWeight: '500' }}>
                                        {detailType === 'connection'
                                            ? `Gửi tới ${selectedItem.startupName || 'Startup'}`
                                            : `Dự án: ${selectedItem.projectName || selectedItem.startupName || '—'}`}
                                    </div>
                                </div>
                                <button onClick={handleCloseDetailModal} className={styles.modalCloseBtnInline}>
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Modal Body */}
                            <div className={styles.modalContentBody} style={{ padding: '24px', gap: '24px', overflowY: 'auto' }}>
                                {detailType === 'connection' ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                        {/* Status Section */}
                                        <div className={styles.projectDetailSection}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                <Info size={14} /> Trạng thái yêu cầu
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                                <span style={{
                                                    backgroundColor: selectedItem.status === 'Accepted' ? 'rgba(23, 191, 99, 0.1)' : selectedItem.status === 'Pending' ? 'rgba(255, 173, 31, 0.15)' : 'rgba(244, 33, 46, 0.1)',
                                                    color: selectedItem.status === 'Accepted' ? '#17bf63' : selectedItem.status === 'Pending' ? '#d97706' : '#f4212e',
                                                    padding: '6px 14px', borderRadius: '9999px', fontSize: '13px', fontWeight: '700', border: '1px solid transparent'
                                                }}>
                                                    {selectedItem.status === 'Accepted' ? 'Đã chấp nhận' : selectedItem.status === 'Pending' ? 'Đang chờ phản hồi' : 'Đã từ chối'}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Message Section */}
                                        <div className={styles.projectDetailSection}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                <MessageSquare size={14} /> Tin nhắn giới thiệu
                                            </div>
                                            <div style={{ backgroundColor: 'var(--bg-hover)', padding: '16px', borderRadius: '16px', border: '1px solid var(--border-color)', fontSize: '15px', color: 'var(--text-primary)', lineHeight: '1.6', fontWeight: '450' }}>
                                                {selectedItem.message || 'Không có nội dung tin nhắn đính kèm.'}
                                            </div>
                                        </div>

                                        {/* Date Section */}
                                        {selectedItem.responseDate && (
                                            <div className={styles.projectDetailSection}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                    <Calendar size={14} /> Thời gian phản hồi
                                                </div>
                                                <div style={{ fontSize: '15px', color: 'var(--text-primary)', fontWeight: '600', paddingLeft: '4px' }}>
                                                    {selectedItem.responseDate}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                        {/* Investment Stats */}
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                            <div style={{ backgroundColor: 'var(--bg-hover)', padding: '20px', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
                                                <div style={{ color: 'var(--text-secondary)', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.05em' }}>Số tiền đầu tư</div>
                                                <div style={{ fontSize: '20px', fontWeight: '900', color: 'var(--primary-blue)' }}>
                                                    {selectedItem.amount?.toLocaleString('vi-VN')} <span style={{ fontSize: '14px', opacity: 0.8 }}>VND</span>
                                                </div>
                                            </div>
                                            <div style={{ backgroundColor: 'var(--bg-hover)', padding: '20px', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
                                                <div style={{ color: 'var(--text-secondary)', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.05em' }}>Cổ phần nắm giữ</div>
                                                <div style={{ fontSize: '20px', fontWeight: '900', color: 'var(--text-primary)' }}>
                                                    {selectedItem.equityPercentage}<span style={{ fontSize: '14px', marginLeft: '2px' }}>%</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Status Section */}
                                        <div className={styles.projectDetailSection}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                <Info size={14} /> Trạng thái hiện tại
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'var(--primary-blue)', boxShadow: '0 0 8px var(--primary-blue)' }}></div>
                                                <span style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>{selectedItem.status}</span>
                                            </div>
                                        </div>

                                        {/* Contract Info */}
                                        {selectedItem.contractSignedAt && (
                                            <div className={styles.projectDetailSection}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                    <FileText size={14} /> Thông tin hợp đồng
                                                </div>
                                                <div style={{ backgroundColor: 'rgba(29, 155, 240, 0.05)', padding: '16px', borderRadius: '16px', border: '1px solid rgba(29, 155, 240, 0.1)', fontSize: '14px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <CheckCircle size={16} color="var(--primary-blue)" />
                                                    <span style={{ fontWeight: '500' }}>Đã ký vào lúc {new Date(selectedItem.contractSignedAt).toLocaleString('vi-VN')}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Standardized Sticky Footer */}
                            <div className={styles.stickyActions} style={{ padding: '16px 24px', justifyContent: 'flex-end', borderTop: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)' }}>
                                <button
                                    onClick={handleCloseDetailModal}
                                    className={styles.secondaryBtn}
                                    style={{ padding: '10px 32px' }}
                                >
                                    Đóng
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
