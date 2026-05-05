import React, { useState, useRef } from 'react';
import { TrendingUp, Heart, DollarSign, CheckCircle, Eye, MessageSquare, TrendingUpIcon, Loader2, Crown, X, Info, Calendar, PieChart, ArrowRight, FileText, Check, Users, AlertCircle, RefreshCw, Trash2, Settings, Download, XCircle, Clock, Shield, ChevronRight, GripVertical, Camera, Mail, Upload, ExternalLink, Plus, Lock } from 'lucide-react';
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
import RestrictedActionModal from '../components/common/RestrictedActionModal';
import InvestorStatusBanner from '../components/common/InvestorStatusBanner';
import apiDebug from '../utils/apiDebug';
import { apiClient } from '../services/apiClient';
import enumService from '../services/enumService';
import investorService from '../services/investorService';
import validationService from '../services/validationService';
import optionService from '../services/optionService';
import blockchainOwnershipService from '../services/blockchainOwnershipService';
import BlockchainOwnershipModal from '../components/common/BlockchainOwnershipModal';
import AccountProfileTab from '../components/common/AccountProfileTab';
import { isEthereumAddress, isValidProfileString } from '../utils/validation';
import CustomSelect from '../components/common/CustomSelect';
import AIEvaluationModal from '../components/common/AIEvaluationModal';
import { translateAIResults } from '../utils/translateAIResults.js';
import AIAnalyzeConfirmationModal from '../components/common/AIAnalyzeConfirmationModal';
import subscriptionService from '../services/subscriptionService';
import paymentService from '../services/paymentService';
import InvestorBookings from '../components/investor/InvestorBookings';
import BlockchainOnchainResultModal from '../components/common/BlockchainOnchainResultModal';

/** Hiển thị tên lĩnh vực: API dùng key kiểu AI_BigData → "AI BigData" */
function formatIndustryDisplayLabel(label) {
    if (label == null || typeof label !== 'string') return label;
    return label.replace(/_/g, ' ');
}

/** Phân loại URL tài liệu deal để nhúng trong trang (không mở tab mới). */
function getDealDocumentEmbedKind(url) {
    if (!url || typeof url !== 'string') return 'iframe';
    const path = url.split('?')[0].split('#')[0].toLowerCase();
    if (/\.(png|jpe?g|webp|gif|bmp|svg)$/i.test(path)) return 'image';
    if (/\.pdf$/i.test(path)) return 'pdf';
    return 'iframe';
}

/** Xem PDF/ảnh tài liệu deal ngay trong modal (ưu tiên không dùng target=_blank). */
function DealDocumentInlinePreview({ url }) {
    const [imgError, setImgError] = React.useState(false);
    React.useEffect(() => {
        setImgError(false);
    }, [url]);
    const kind = getDealDocumentEmbedKind(url);
    const frameStyle = { width: '100%', height: 'min(70vh, 620px)', border: 'none', display: 'block' };
    const barStyle = {
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: '12px',
        padding: '10px 14px',
        fontSize: '12px',
        color: 'var(--text-secondary)',
        borderTop: '1px solid var(--border-color)',
        backgroundColor: 'var(--bg-primary)',
    };

    if (kind === 'image' && !imgError) {
        return (
            <div style={{ backgroundColor: 'var(--bg-secondary)' }}>
                <img
                    src={url}
                    alt="Tài liệu đính kèm"
                    onError={() => setImgError(true)}
                    style={{
                        display: 'block',
                        width: '100%',
                        maxHeight: 'min(70vh, 620px)',
                        objectFit: 'contain',
                    }}
                />
                <div style={barStyle}>
                    <a href={url} download rel="noreferrer" style={{ fontWeight: '700', color: 'var(--primary-blue)' }}>
                        <Download size={14} style={{ verticalAlign: 'text-bottom', marginRight: '4px' }} />
                        Tải xuống
                    </a>
                </div>
            </div>
        );
    }

    if (kind === 'image' && imgError) {
        return (
            <div style={{ padding: '16px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                <p style={{ margin: '0 0 12px' }}>Không thể hiển thị ảnh trực tiếp trên trang.</p>
                <a href={url} download rel="noreferrer" style={{ fontWeight: '700', color: 'var(--primary-blue)' }}>
                    Tải tệp về máy
                </a>
            </div>
        );
    }

    return (
        <div style={{ backgroundColor: 'var(--bg-secondary)' }}>
            <iframe title="Tài liệu đính kèm" src={url} style={frameStyle} />
            <div style={barStyle}>
                <a href={url} download rel="noreferrer" style={{ fontWeight: '700', color: 'var(--primary-blue)' }}>
                    <Download size={14} style={{ verticalAlign: 'text-bottom', marginRight: '4px' }} />
                    Tải xuống
                </a>
                <span style={{ opacity: 0.85 }}>Nếu khung trên trống (PDF chặn nhúng), hãy dùng Tải xuống.</span>
            </div>
        </div>
    );
}

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
    const [validationRules, setValidationRules] = useState(null);
    const [configError, setConfigError] = useState('');

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
    const [reuploadingDealId, setReuploadingDealId] = useState(null);
    const [showOnchainResultModal, setShowOnchainResultModal] = useState(false);
    const [onchainResultData, setOnchainResultData] = useState(null);

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

    const [showRestrictedModal, setShowRestrictedModal] = useState(false);
    const [restrictedActionMessage, setRestrictedActionMessage] = useState('');

    const isApproved = investorProfile?.status === 'Approved' || investorProfile?.approvalStatus === 'Approved' || investorProfile?.status === 1 || investorProfile?.approvalStatus === 1;

    const showRestrictedActionModal = (message) => {
        setRestrictedActionMessage(message);
        setShowRestrictedModal(true);
    };

    const checkAccess = (actionName) => {
        if (!isApproved) {
            showRestrictedActionModal(`Bạn cần được phê duyệt hồ sơ Nhà đầu tư để thực hiện hành động: ${actionName}.`);
            return false;
        }
        return true;
    };

    // --- Deep Linking Enforcement ---
    React.useEffect(() => {
        if (!targetId || hasAttemptedDeepLink) return;

        const scrollAndHighlight = (idPrefix) => {
            const element = document.getElementById(`${idPrefix}-${targetId}`);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                setHasAttemptedDeepLink(true);
                console.log(`[DeepLink] Scrolled to and highlighted ${idPrefix}: ${targetId}`);
            }
        };

        console.log(`[InvestorDashboard] Processing targetId: ${targetId} for activeSection: ${activeSection}`);

        // 1. Deals Deep Link
        if (activeSection === 'deals' && deals.length > 0) {
            const matchDeal = deals.find(d => String(d.dealId) === String(targetId));
            if (matchDeal) {
                setDetailType('deal');
                setSelectedItem(matchDeal);
                setShowDetailModal(true);
                scrollAndHighlight('deal');
            }
        }

        // 2. Connection Requests Deep Link
        else if (activeSection === 'connection-requests' && sentConnectionRequests.length > 0) {
            const matchReq = sentConnectionRequests.find(r => String(r.connectionRequestId || r.id) === String(targetId));
            if (matchReq) {
                setDetailType('connection');
                setSelectedItem(matchReq);
                setShowDetailModal(true);
                scrollAndHighlight('connection');
            }
        }

        // 3. Bookings Deep Link
        else if (activeSection === 'bookings') {
            scrollAndHighlight('booking');
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
    const [profileImageFile, setProfileImageFile] = useState(null);
    const [profileImagePreview, setProfileImagePreview] = useState('');
    const profileImageInputRef = useRef(null);

    // AI Re-analyze States
    const [showAIConfirmModal, setShowAIConfirmModal] = useState(false);
    const [pendingReanalyzeProjectId, setPendingReanalyzeProjectId] = useState(null);
    const [isLoadingQuota, setIsLoadingQuota] = useState(false);
    const [isAnalyzingAI, setIsAnalyzingAI] = useState(false);
    const [subscription, setSubscription] = useState(null);
    const [currentPackage, setCurrentPackage] = useState(null);

    const [availableStages, setAvailableStages] = useState([]);

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

                const [followingRes, connectRes, dealsRes, profileRes, aiReportsRes, allProjectsRes, industriesRes, stagesRes, notificationsRes] = await Promise.all([
                    followerService.getMyFollowing().catch(err => null),
                    connectionService.getMyConnectionRequests().catch(err => null),
                    dealsService.getInvestorDeals({ pageSize: 100 }).catch(err => null),
                    investorService.getMyProfile().catch(err => null),
                    AIEvaluationService.getAllInvestorAnalyses({ pageSize: 100 }).catch(err => null),
                    projectSubmissionService.getAllProjects().catch(err => null),
                    optionService.getIndustries().catch(err => []),
                    optionService.getStages().catch(err => []),
                    notificationService.getNotifications({ pageSize: 100 }).catch(err => null)
                ]);

                if (industriesRes && industriesRes.length > 0) {
                    setAvailableIndustries(industriesRes);
                }

                if (stagesRes && stagesRes.length > 0) {
                    setAvailableStages(stagesRes);
                }

                // Fetch Validation Rules
                const formKey = profileRes ? 'investor.update' : 'investor.create';
                try {
                    const rulesRes = await validationService.getFormRules(formKey);

                    // Inject industry count constraints (1-4 for Investors)
                    if (rulesRes && rulesRes.industryoptionids) {
                        rulesRes.industryoptionids.minCount = 1;
                        rulesRes.industryoptionids.maxCount = 4;
                        rulesRes.industryoptionids.minCountMessage = 'Vui lòng chọn ít nhất 1 lĩnh vực.';
                        rulesRes.industryoptionids.maxCountMessage = 'Bạn chỉ được chọn tối đa 4 lĩnh vực.';
                    }

                    setValidationRules(rulesRes);
                } catch (err) {
                    console.error('[InvestorDashboard] Config error:', err);
                    setConfigError(err.message || 'Lỗi tải cấu hình biểu mẫu');
                }

                // Update States... (Omitted logic remains same)
                if (profileRes) {
                    setInvestorProfile(profileRes);
                    if (!isFormDirty.current) {
                        setProfileImagePreview(profileRes.profileImageUrl || profileRes.profileImage || '');
                        setProfileImageFile(null);
                    }

                    // Only sync form state if user hasn't modified it locally
                    if (!isFormDirty.current) {
                        setPrefFormData({
                            organizationName: profileRes.organizationName || '',
                            investmentTaste: profileRes.investmentTaste || '',
                            walletAddress: profileRes.walletAddress || '',
                            investmentAmount: profileRes.investmentAmount || 0,
                            riskTolerance: RISK_TOLERANCE_MAP[profileRes.riskTolerance] ?? 1,
                            investmentRegion: profileRes.investmentRegion || '',
                            focusIndustry: industriesRes.find(i =>
                                i.label === (
                                    profileRes.focusIndustry ||
                                    (Array.isArray(profileRes.industries) ? profileRes.industries[0] : '')
                                )
                            )?.value || 0,
                            preferredStage: STAGE_MAP[profileRes.preferredStage] ?? 0,
                            previousInvestments: profileRes.previousInvestments || '',
                            minAIScore: profileRes.minAIScore || 70,
                            typicalInvestmentSize: profileRes.typicalInvestmentSize || ''
                        });

                        const normalizeItems = (items, options = []) => {
                            const rawItems = Array.isArray(items) ? items : [];
                            return rawItems.map(item => {
                                if (!item) return null;
                                if (typeof item === 'string') {
                                    const match = options.find(o => o.label.toLowerCase() === item.toLowerCase());
                                    return match ? match.label : item;
                                }
                                if (typeof item === 'number' || (!isNaN(Number(item)) && typeof item !== 'object')) {
                                    const match = options.find(o => String(o.value) === String(item));
                                    return match ? match.label : null;
                                }
                                if (typeof item === 'object') {
                                    const id = item.id ?? item.value ?? item.industryId;
                                    const name = item.name ?? item.label ?? item.industryName;
                                    if (id) {
                                        const match = options.find(o => String(o.value) === String(id));
                                        if (match) return match.label;
                                    }
                                    if (name) {
                                        const match = options.find(o => o.label.toLowerCase() === name.toLowerCase());
                                        return match ? match.label : name;
                                    }
                                }
                                return null;
                            }).filter(Boolean);
                        };

                        let industries = [];
                        if (profileRes.focusIndustry) industries.push(profileRes.focusIndustry);
                        if (Array.isArray(profileRes.industries)) {
                            industries = [...new Set([...industries, ...profileRes.industries.filter(Boolean)])];
                        }
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

                        // Normalize all collected industries and stages
                        industries = normalizeItems(industries, industriesRes);
                        stages = normalizeItems(stages, stagesRes);

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
                    const normalizedDealId = String(deal.dealId || '');
                    const notificationReason = reasonByDealId.get(normalizedDealId);
                    return {
                        ...deal,
                        rejectionReason: deal.rejectionReason || notificationReason || ''
                    };
                });

                setDeals(enhancedDeals);

                // Handle AI Reports (dịch payload giống Startup)
                if (aiReportsRes?.data?.items) {
                    const items = aiReportsRes.data.items.map((item) => {
                        try {
                            const { analysisResult } = translateAIResults({ success: true, data: item }, null);
                            return analysisResult?.data ?? item;
                        } catch {
                            return item;
                        }
                    });
                    setAiReports(items);
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
        if (!checkAccess('Ký kết hợp đồng')) return;

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

    const getDealStatusInfo = (status) => {
        const map = {
            PendingCounterpartyConfirmation: { label: 'Chờ đối tác xác nhận', color: '#f59e0b', value: 0 },
            PendingStaffApproval: { label: 'Chờ staff duyệt', color: '#0ea5e9', value: 1 },
            RequireReupload: { label: 'Yêu cầu tải lại tài liệu', color: '#f97316', value: 2 },
            ProcessingBlockchain: { label: 'Đang xử lý blockchain', color: '#8b5cf6', value: 3 },
            Completed: { label: 'Hoàn tất', color: '#10b981', value: 4 },
            Canceled: { label: 'Đã hủy', color: '#ef4444', value: 5 },
            BlockchainFailed: { label: 'Blockchain thất bại', color: '#dc2626', value: 6 },
        };
        const normalize = typeof status === 'number' ? status : Number(status);
        if (!Number.isNaN(normalize) && normalize >= 0 && normalize <= 6) {
            const keyByValue = Object.keys(map).find((k) => map[k].value === normalize);
            return map[keyByValue] || { label: String(status ?? 'Không xác định'), color: '#64748b', value: null };
        }
        return map[status] || { label: String(status ?? 'Không xác định'), color: '#64748b', value: null };
    };

    const handleVerifyDealOnchain = async (dealId) => {
        if (!dealId) return;
        try {
            const response = await dealsService.verifyDealOnchain(dealId);
            const normalized = dealsService.normalizeDealOnchainResult(response);
            const explorerLink = dealsService.getDealOnchainExplorerLink(normalized);
            setOnchainResultData({ ...normalized, explorerLink });
            setShowOnchainResultModal(true);
        } catch (error) {
            console.error('[InvestorDashboard] verify on-chain failed:', error);
            alert('Lỗi: Không thể xác thực blockchain cho deal này.');
        }
    };

    const handleReuploadFileChange = async (dealId, file) => {
        if (!file || !dealId) return;

        setReuploadingDealId(dealId);
        try {
            const response = await dealsService.reuploadDealDocument(dealId, file);
            if (response && (response.success || response.data || response.statusCode === 200)) {
                // Backend may reset deal status asynchronously, so we retry fetching latest status.
                let latestStatus = null;
                for (let i = 0; i < 4; i += 1) {
                    try {
                        const latest = await dealsService.getDealById(dealId);
                        const latestDeal = latest?.data || latest;
                        latestStatus = latestDeal?.status;
                        const statusInfo = getDealStatusInfo(latestStatus);
                        if (statusInfo.value !== 5) break; // no longer Canceled
                    } catch (_) {
                        // ignore and continue retry
                    }
                    await new Promise((resolve) => setTimeout(resolve, 1200));
                }

                const latestStatusInfo = getDealStatusInfo(latestStatus);
                if (latestStatusInfo.value === 5) {
                    alert('Tải lại tài liệu thành công nhưng trạng thái deal vẫn là "Đã hủy". Backend cần reset trạng thái sau reupload.');
                } else {
                    alert('✓ Tải lại tài liệu thành công. Deal đã được cập nhật để xem xét lại.');
                }
                refreshDeals();
            } else {
                throw new Error(response?.message || 'Không thể tải lại tài liệu');
            }
        } catch (error) {
            console.error('[InvestorDashboard] Reupload deal document failed:', error);
            alert('Lỗi: Không thể tải lại tài liệu. Vui lòng thử lại.');
        } finally {
            setReuploadingDealId(null);
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
    const INVESTOR_MAX_INDUSTRIES = 4;
    const INVESTOR_MIN_INDUSTRIES = 1;

    const toggleIndustry = (industryLabel) => {
        isFormDirty.current = true;
        setPreferredIndustries(prev => {
            const isSelected = prev.includes(industryLabel);

            // Block adding beyond max
            if (!isSelected && prev.length >= INVESTOR_MAX_INDUSTRIES) {
                setErrors(prevErrors => ({ ...prevErrors, preferredIndustries: `Bạn chỉ được chọn tối đa ${INVESTOR_MAX_INDUSTRIES} lĩnh vực.` }));
                return prev; // no change
            }

            const industries = isSelected
                ? prev.filter(i => i !== industryLabel)
                : [...prev, industryLabel];

            // Validate count
            let errorMsg = null;
            if (industries.length < INVESTOR_MIN_INDUSTRIES) {
                errorMsg = `Vui lòng chọn ít nhất ${INVESTOR_MIN_INDUSTRIES} lĩnh vực.`;
            }
            setErrors(prevErrors => ({ ...prevErrors, preferredIndustries: errorMsg }));

            return industries;
        });
    };

    const fieldMapping = {
        organizationName: 'organizationName',
        investmentTaste: 'investmentTaste',
        walletAddress: 'walletAddress',
        investmentAmount: 'investmentAmount',
        investmentRegion: 'investmentRegion',
        previousInvestments: 'previousInvestments',
        riskTolerance: 'riskTolerance',
        industryOptionIds: 'industryOptionIds',
        preferredStage: 'preferredStageOptionId'
    };

    const validateField = (name, value) => {
        if (!validationRules) return null;

        const ruleKey = fieldMapping[name]?.toLowerCase();
        if (!ruleKey || !validationRules[ruleKey]) return null;

        return validationService.validateField(value, validationRules[ruleKey]);
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

    const handleProfileImageChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        isFormDirty.current = true;

        // Validate file immediately
        const rule = validationRules?.profileimagefile;
        if (rule) {
            const fileError = validationService.validateFile(file, rule);
            setErrors(prev => ({ ...prev, profileImageFile: fileError }));
            if (fileError) return; // Don't preview if invalid
        } else {
            setErrors(prev => ({ ...prev, profileImageFile: null }));
        }

        setProfileImageFile(file);

        const reader = new FileReader();
        reader.onloadend = () => {
            setProfileImagePreview(reader.result);
        };
        reader.readAsDataURL(file);
    };

    const validateProfileForm = () => {
        if (!validationRules) {
            // Even without backend rules, enforce industry count
            const errs = {};
            if (preferredIndustries.length < INVESTOR_MIN_INDUSTRIES) {
                errs.preferredIndustries = `Vui lòng chọn ít nhất ${INVESTOR_MIN_INDUSTRIES} lĩnh vực.`;
            }
            if (Object.keys(errs).length > 0) {
                setErrors(errs);
                return { isValid: false, errors: errs };
            }
            return { isValid: true, errors: {} };
        }

        const validationData = {
            ...prefFormData,
            // Key must match fieldMapping key exactly
            industryOptionIds: preferredIndustries
        };

        const { isValid, errors: validationErrors } = validationService.validateForm(
            validationData,
            validationRules,
            fieldMapping
        );

        // Explicitly validate industries in case the rule key differs
        if (validationRules.industryoptionids) {
            const error = validationService.validateField(preferredIndustries, validationRules.industryoptionids);
            if (error) validationErrors.preferredIndustries = error;
        } else {
            // Hardcoded fallback when backend doesn't include industryoptionids rule
            if (preferredIndustries.length < INVESTOR_MIN_INDUSTRIES) {
                validationErrors.preferredIndustries = `Vui lòng chọn ít nhất ${INVESTOR_MIN_INDUSTRIES} lĩnh vực.`;
            } else if (preferredIndustries.length > INVESTOR_MAX_INDUSTRIES) {
                validationErrors.preferredIndustries = `Bạn chỉ được chọn tối đa ${INVESTOR_MAX_INDUSTRIES} lĩnh vực.`;
            }
        }

        // Also validate profile image if a new one is selected
        if (profileImageFile) {
            const fileRule = validationRules?.profileimagefile;
            const fileError = validationService.validateFile(profileImageFile, fileRule);
            if (fileError) {
                validationErrors.profileImageFile = fileError;
            }
        }

        const result = { isValid: Object.keys(validationErrors).length === 0, errors: validationErrors };
        console.log('[InvestorDashboard] validateProfileForm result:', result, 'industries:', preferredIndustries, 'rules:', Object.keys(validationRules));
        setErrors(validationErrors);
        return result;
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

        console.log('[InvestorDashboard] handleUpdatePreferences called. validationRules:', !!validationRules, 'isUpdatingPrefs:', isUpdatingPrefs, 'preferredIndustries:', preferredIndustries);

        // Block update while profile is pending review
        const profileStatus = investorProfile?.status ?? investorProfile?.approvalStatus;
        if (profileStatus === 'Pending') {
            showRestrictedActionModal('Hồ sơ của bạn hiện đang trong quá trình xét duyệt. Bạn không thể cập nhật hồ sơ cho đến khi quá trình xét duyệt hoàn tất.');
            return;
        }

        const { isValid, errors: valErrors } = validateProfileForm();
        console.log('[InvestorDashboard] Validation result — isValid:', isValid, 'errors:', valErrors);
        if (!isValid) {
            console.log('[InvestorDashboard] Blocked by validation. Errors:', valErrors);
            return;
        }

        console.log('[InvestorDashboard] Validation passed, proceeding to submit...');

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


            // Map preferred industries for the backend: IDs for active, labels for inactive
            preferredIndustries.forEach(label => {
                const activeOption = availableIndustries.find(i => i.label === label);
                if (activeOption) {
                    formData.append('IndustryOptionIds', activeOption.value);
                } else {
                    formData.append('Industries', label);
                }
            });

            // Keep focusIndustry and industries for backward compatibility if needed by some legacy logic
            if (preferredIndustries.length > 0) {
                formData.append('focusIndustry', preferredIndustries[0]);
                formData.append('industries', preferredIndustries.join(', '));
            }
            if (profileImageFile) {
                formData.append('profileImageFile', profileImageFile);
            }

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
                setProfileImageFile(null);
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
        if (!checkAccess('Tái phân tích AI')) return;

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
                let row = res.data;
                try {
                    const { analysisResult } = translateAIResults({ success: true, data: res.data }, null);
                    row = analysisResult?.data ?? res.data;
                } catch { /* giữ raw */ }
                setSelectedAIReport(row);
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
                    title={
                        activeSection === 'account_profile'
                            ? "Hồ sơ người dùng"
                            : activeSection === 'preferences'
                                ? "Hồ sơ nhà đầu tư"
                                : "Bảng điều khiển Nhà đầu tư"
                    }
                    subtitle={
                        activeSection === 'account_profile'
                            ? "Quản lý thông tin tài khoản và mật khẩu của bạn."
                            : activeSection === 'preferences'
                                ? "Cập nhật thông tin hồ sơ đầu tư của bạn."
                                : `Xin chào, ${user?.name || 'Nhà đầu tư'}! Quản lý đầu tư và khám phá startup.`
                    }
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
                    {activeSection !== 'account_profile' && activeSection !== 'preferences' && (
                        <div
                            className={`${styles.tabs} ${styles.animatedTabs}`}
                            ref={tabsRef}
                            onScroll={checkTabScroll}
                        >
                            <button
                                className={`${styles.tab} ${activeSection === 'deals' || activeSection === 'investments' ? styles.active : ''}`}
                                onClick={() => setActiveSection('deals')}
                            >
                                Khoản đầu tư
                            </button>
                            <button
                                className={`${styles.tab} ${activeSection === 'connection-requests' || activeSection === 'connectionrequests' ? styles.active : ''}`}
                                onClick={() => setActiveSection('connection-requests')}
                            >
                                Yêu cầu kết nối
                            </button>
                            <button
                                className={`${styles.tab} ${activeSection === 'bookings' ? styles.active : ''}`}
                                onClick={() => setActiveSection('bookings')}
                            >
                                Lịch tư vấn
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
                {(activeSection === 'connection-requests' || activeSection === 'connectionrequests') && (
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

                                    const isHighlighted = String(targetId) === String(request.id || request.connectionRequestId);
                                    return (
                                        <div
                                            id={`connection-${request.id || request.connectionRequestId}`}
                                            key={request.id || request.connectionRequestId}
                                            className={`${styles.card} ${styles.itemAppear} ${isHighlighted ? styles.targetHighlight : ''}`}
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
                {(activeSection === 'deals' || activeSection === 'investments') && (
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
                                            {deals.filter(d => getDealStatusInfo(d.status).value === 0).length}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className={styles.card} style={{ padding: '16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <CheckCircle size={24} color="#10b981" />
                                    <div>
                                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase' }}>Hoàn tất</div>
                                        <div style={{ fontSize: '24px', fontWeight: '800', color: '#10b981' }}>
                                            {deals.filter(d => getDealStatusInfo(d.status).value === 4 || d.isCompleted === true).length}
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
                                    const statusInfo = getDealStatusInfo(deal.status);
                                    const isContractSigned = !!deal.isCompleted || statusInfo.value === 4;
                                    const isRejectedDeal = statusInfo.value === 5;
                                    const canReupload = statusInfo.value === 2;

                                    const isHighlighted = String(targetId) === String(deal.dealId);
                                    return (
                                        <div
                                            id={`deal-${deal.dealId}`}
                                            key={deal.dealId}
                                            className={`${styles.card} ${styles.itemAppear} ${isHighlighted ? styles.targetHighlight : ''}`}
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
                                                        {deal.startupName || 'Startup'}
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

                                            {(isRejectedDeal || statusInfo.value === 2) && !!deal.rejectionReason && (
                                                <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '8px', padding: '10px', marginTop: '4px' }}>
                                                    <div style={{ fontSize: '11px', fontWeight: '700', color: '#dc2626', marginBottom: '4px' }}>
                                                        Lý do từ chối
                                                    </div>
                                                    <div style={{ fontSize: '12px', lineHeight: 1.5, color: 'var(--text-secondary)' }}>
                                                        {deal.rejectionReason}
                                                    </div>
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

                                                            {deal.documentUrl && (
                                                                <button
                                                                    type="button"
                                                                    style={{
                                                                        ...btnStyle,
                                                                        backgroundColor: '#2D7EFF',
                                                                        color: '#fff',
                                                                        textDecoration: 'none'
                                                                    }}
                                                                    onClick={() => handleShowDealDetail(deal)}
                                                                >
                                                                    <FileText size={14} />
                                                                    Xem tài liệu
                                                                </button>
                                                            )}

                                                            {canReupload && (
                                                                <>
                                                                    <input
                                                                        id={`reupload-deal-${deal.dealId}`}
                                                                        type="file"
                                                                        accept=".pdf,.png,.jpg,.jpeg,.webp"
                                                                        hidden
                                                                        onChange={(e) => {
                                                                            const file = e.target.files?.[0];
                                                                            e.target.value = '';
                                                                            handleReuploadFileChange(deal.dealId, file);
                                                                        }}
                                                                    />
                                                                    <button
                                                                        type="button"
                                                                        style={{
                                                                            ...btnStyle,
                                                                            backgroundColor: '#f97316',
                                                                            color: '#fff',
                                                                            opacity: reuploadingDealId === deal.dealId ? 0.7 : 1
                                                                        }}
                                                                        onClick={() => document.getElementById(`reupload-deal-${deal.dealId}`)?.click()}
                                                                        disabled={reuploadingDealId === deal.dealId}
                                                                    >
                                                                        {reuploadingDealId === deal.dealId ? (
                                                                            <>
                                                                                <Loader2 size={14} className={styles.spinner} />
                                                                                Đang tải...
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                <Upload size={14} />
                                                                                Tải lại tài liệu
                                                                            </>
                                                                        )}
                                                                    </button>
                                                                </>
                                                            )}

                                                            {(statusInfo.value === 4 || deal.isCompleted === true) && (
                                                                <button
                                                                    type="button"
                                                                    style={{
                                                                        ...btnStyle,
                                                                        backgroundColor: '#10b981',
                                                                        color: '#fff'
                                                                    }}
                                                                    onClick={() => handleVerifyDealOnchain(deal.dealId)}
                                                                >
                                                                    <Shield size={14} />
                                                                    Xác thực blockchain
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

                {activeSection === 'bookings' && (
                    <div className={styles.section} style={{ padding: 0 }}>
                        <InvestorBookings
                            user={user}
                            targetId={targetId}
                            onViewProject={onViewProject}
                            onUpdateProfile={() => setActiveSection('preferences')}
                            isApproved={isApproved}
                            onRestrictedAction={showRestrictedActionModal}
                        />
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
                                                    <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', fontWeight: '800', color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
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
                                                        backgroundColor: 'rgba(29, 155, 240, 0.1)',
                                                        color: 'var(--primary-blue)',
                                                        padding: '4px 10px',
                                                        borderRadius: '6px',
                                                        fontSize: '11px',
                                                        fontWeight: '800',
                                                        border: '1px solid rgba(29, 155, 240, 0.2)'
                                                    }}>
                                                        DIỂM: {report.finalPotentialScore ?? report.potentialScore ?? 0}
                                                    </div>
                                                    {(() => {
                                                        const score = report.finalPotentialScore ?? report.potentialScore ?? 0;
                                                        let label = report.investmentVerdict;
                                                        
                                                        // Derive verdict if missing
                                                        if (!label) {
                                                            if (score >= 80) label = 'STRONG';
                                                            else if (score >= 65) label = 'PASS';
                                                            else if (score >= 50) label = 'WATCHLIST';
                                                            else label = 'REJECT';
                                                        }

                                                        const verdict = label.toLowerCase();
                                                        let colors = { bg: 'var(--bg-secondary)', text: 'var(--text-primary)', border: 'var(--border-color)' };

                                                        if (verdict.includes('strong')) {
                                                            colors = { bg: 'rgba(16, 185, 129, 0.1)', text: '#10b981', border: 'rgba(16, 185, 129, 0.2)' };
                                                        } else if (verdict.includes('watchlist')) {
                                                            colors = { bg: 'rgba(245, 158, 11, 0.1)', text: '#f59e0b', border: 'rgba(245, 158, 11, 0.2)' };
                                                        } else if (verdict.includes('pass')) {
                                                            colors = { bg: 'rgba(29, 155, 240, 0.1)', text: 'var(--primary-blue)', border: 'rgba(29, 155, 240, 0.2)' };
                                                        } else if (verdict.includes('reject') || verdict.includes('fail')) {
                                                            colors = { bg: 'rgba(239, 68, 68, 0.1)', text: '#ef4444', border: 'rgba(239, 68, 68, 0.2)' };
                                                        }

                                                        return (
                                                            <div style={{
                                                                backgroundColor: colors.bg,
                                                                color: colors.text,
                                                                padding: '4px 10px',
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
                                <div
                                    className={styles.formGroup}
                                    style={{
                                        marginBottom: '20px',
                                        padding: '18px',
                                        borderRadius: '14px',
                                        border: '1px solid var(--border-color)',
                                        background: 'linear-gradient(120deg, rgba(29,155,240,0.08), rgba(16,185,129,0.06))'
                                    }}
                                >
                                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
                                        <div style={{ position: 'relative' }}>
                                            <div
                                                style={{
                                                    width: '92px',
                                                    height: '92px',
                                                    borderRadius: '50%',
                                                    border: '2px solid rgba(29,155,240,0.35)',
                                                    overflow: 'hidden',
                                                    backgroundColor: 'var(--bg-secondary)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    color: 'var(--text-secondary)',
                                                    fontWeight: '700',
                                                    fontSize: '28px'
                                                }}
                                            >
                                                {profileImagePreview ? (
                                                    <img
                                                        src={profileImagePreview}
                                                        alt="Investor Profile"
                                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                    />
                                                ) : (
                                                    (user?.name || user?.email || 'I').charAt(0).toUpperCase()
                                                )}
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => profileImageInputRef.current?.click()}
                                                style={{
                                                    position: 'absolute',
                                                    right: '-2px',
                                                    bottom: '-2px',
                                                    width: '30px',
                                                    height: '30px',
                                                    borderRadius: '50%',
                                                    border: '1px solid rgba(29,155,240,0.4)',
                                                    backgroundColor: 'var(--bg-primary)',
                                                    color: 'var(--primary-blue)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    cursor: 'pointer'
                                                }}
                                                aria-label="Upload ảnh hồ sơ"
                                            >
                                                <Camera size={14} />
                                            </button>
                                        </div>

                                        <div style={{ flex: 1, minWidth: '240px' }}>
                                            <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '4px' }}>
                                                {user?.name || user?.email || 'Nhà đầu tư'}
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '10px' }}>
                                                <Mail size={14} />
                                                <span>{user?.email || 'Không có email'}</span>
                                            </div>
                                            {investorProfile ? (
                                                <div
                                                    style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '6px',
                                                        padding: '6px 10px',
                                                        borderRadius: '999px',
                                                        fontSize: '12px',
                                                        fontWeight: '700',
                                                        backgroundColor: investorProfile.status === 'Approved' ? 'rgba(16,185,129,0.14)' :
                                                            investorProfile.status === 'Rejected' ? 'rgba(239, 68, 68, 0.14)' :
                                                                'rgba(245,158,11,0.14)',
                                                        color: investorProfile.status === 'Approved' ? '#10b981' :
                                                            investorProfile.status === 'Rejected' ? '#ef4444' :
                                                                '#f59e0b'
                                                    }}
                                                >
                                                    <CheckCircle size={12} />
                                                    {investorProfile.status === 'Approved' ? 'Đã phê duyệt' :
                                                        investorProfile.status === 'Rejected' ? 'Bị từ chối' :
                                                            'Đang chờ duyệt'}
                                                </div>
                                            ) : (
                                                <div
                                                    style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '6px',
                                                        padding: '6px 10px',
                                                        borderRadius: '999px',
                                                        fontSize: '12px',
                                                        fontWeight: '700',
                                                        backgroundColor: 'rgba(100, 116, 139, 0.14)',
                                                        color: '#64748b'
                                                    }}
                                                >
                                                    <AlertCircle size={12} />
                                                    Chưa tạo hồ sơ
                                                </div>
                                            )}
                                        </div>

                                        <div>
                                            <input
                                                ref={profileImageInputRef}
                                                type="file"
                                                hidden
                                                accept="image/*"
                                                onChange={handleProfileImageChange}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => profileImageInputRef.current?.click()}
                                                style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '8px',
                                                    border: '1px solid var(--border-color)',
                                                    borderRadius: '10px',
                                                    padding: '10px 14px',
                                                    backgroundColor: 'var(--bg-secondary)',
                                                    color: 'var(--text-primary)',
                                                    fontWeight: '600',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                <Upload size={14} />
                                                Tải ảnh hồ sơ
                                            </button>
                                            <div style={{ fontSize: '11px', color: errors.profileImageFile ? '#f4212e' : 'var(--text-secondary)', marginTop: '6px', fontWeight: errors.profileImageFile ? '600' : '400' }}>
                                                {errors.profileImageFile || `Tối đa ${validationRules?.profileimagefile?.maxFileSize ? (validationRules.profileimagefile.maxFileSize / (1024 * 1024)).toFixed(0) : '5'}MB. JPG, PNG, WEBP.`}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div style={{ marginBottom: '14px', fontSize: '12px', fontWeight: '700', letterSpacing: '0.06em', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                                    Thông tin cơ bản
                                </div>

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
                                        {errors.organizationName && (
                                            <span style={{ display: 'block', marginTop: '6px', color: '#f4212e', fontSize: '11px', fontWeight: '600' }}>
                                                {errors.organizationName}
                                            </span>
                                        )}
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
                                            {errors.investmentAmount || (validationRules?.investmentamount?.minValue ? `Số tiền đầu tư tối thiểu: ${Number(validationRules.investmentamount.minValue).toLocaleString()} VNĐ.` : 'Nhập ngân sách đầu tư dự kiến của bạn.')}
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
                                        {errors.investmentRegion && (
                                            <span style={{ display: 'block', marginTop: '6px', color: '#f4212e', fontSize: '11px', fontWeight: '600' }}>
                                                {errors.investmentRegion}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div style={{ marginBottom: '14px', fontSize: '12px', fontWeight: '700', letterSpacing: '0.06em', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                                    Tùy chọn đầu tư
                                </div>

                                <div className={styles.formGrid} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginBottom: '24px' }}>
                                    <div className={styles.formGroup}>
                                        <label>Mức độ chấp nhận rủi ro *</label>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            {[0, 1, 2].map(r => (
                                                <button
                                                    key={r} type="button"
                                                    onClick={() => setPrefFormData({ ...prefFormData, riskTolerance: r })}
                                                    style={{
                                                        flex: 1, padding: '10px 4px', borderRadius: '8px', border: '1px solid var(--border-color)',
                                                        backgroundColor: prefFormData.riskTolerance === r ? 'var(--primary-blue)' : 'var(--bg-secondary)',
                                                        color: prefFormData.riskTolerance === r ? '#fff' : 'var(--text-secondary)',
                                                        fontSize: '13px', fontWeight: '700', transition: 'all 0.2s',
                                                        whiteSpace: 'nowrap',
                                                        minWidth: '0'
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
                                            options={availableStages.map(opt => ({
                                                label: opt.label,
                                                value: opt.value
                                            }))}
                                        />
                                    </div>

                                    <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                                        <label>Lĩnh vực quan tâm (Chọn 1-4) *</label>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
                                            {availableIndustries.map(ind => (
                                                <button
                                                    key={ind.value}
                                                    type="button"
                                                    className={`${styles.pill} ${preferredIndustries.includes(ind.label) ? styles.pillActive : ''}`}
                                                    onClick={() => toggleIndustry(ind.label)}
                                                    style={{
                                                        display: 'flex', alignItems: 'center', gap: '6px',
                                                        padding: '8px 16px', borderRadius: '20px', border: '1px solid var(--border-color)',
                                                        backgroundColor: preferredIndustries.includes(ind.label) ? 'var(--primary-blue)' : 'var(--bg-secondary)',
                                                        color: preferredIndustries.includes(ind.label) ? '#fff' : 'var(--text-secondary)',
                                                        fontSize: '13px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s'
                                                    }}
                                                >
                                                    {formatIndustryDisplayLabel(ind.label)}
                                                    {preferredIndustries.includes(ind.label) ? <X size={12} /> : <Plus size={12} />}
                                                </button>
                                            ))}

                                            {/* Inactive (Legacy) Industries - Shown as selected but not editable */}
                                            {preferredIndustries
                                                .filter(label => !availableIndustries.some(opt => opt.label === label))
                                                .map(label => (
                                                    <div
                                                        key={`inactive-${label}`}
                                                        className={styles.pill}
                                                        style={{
                                                            display: 'flex', alignItems: 'center', gap: '6px',
                                                            padding: '8px 16px', borderRadius: '20px',
                                                            border: '1px dashed var(--primary-blue)',
                                                            backgroundColor: 'rgba(29, 155, 240, 0.1)',
                                                            color: 'var(--primary-blue)',
                                                            fontSize: '13px', fontWeight: '600',
                                                            cursor: 'not-allowed', opacity: 0.8
                                                        }}
                                                        title="Lĩnh vực này hiện đã ngừng hỗ trợ và không thể thay đổi"
                                                    >
                                                        {formatIndustryDisplayLabel(label)}
                                                        <Lock size={12} />
                                                    </div>
                                                ))
                                            }
                                        </div>
                                        {errors.preferredIndustries && (
                                            <span style={{ color: '#f4212e', fontSize: '12px', marginTop: '6px', display: 'block', fontWeight: '600' }}>
                                                {errors.preferredIndustries}
                                            </span>
                                        )}
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
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
                                        <p style={{ color: errors.investmentTaste ? '#f4212e' : 'var(--text-secondary)', fontSize: '11px', margin: 0, fontWeight: '500' }}>
                                            {errors.investmentTaste || 'Mô tả chi tiết chiến lược đầu tư của bạn.'}
                                        </p>
                                        <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                                            {prefFormData.investmentTaste?.length || 0}/{validationRules?.investmenttaste?.maxLength || 1000}
                                        </span>
                                    </div>
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

                <BlockchainOnchainResultModal
                    isOpen={showOnchainResultModal && !!onchainResultData}
                    onClose={() => setShowOnchainResultModal(false)}
                    result={onchainResultData}
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
                                        download={`${(contractDealData.projectName || contractDealData.startupName || 'hop-dong')
                                            .replace(/[/\\?%*:|"<>]/g, '')
                                            .trim()
                                            .slice(0, 80)
                                            .replace(/\s+/g, '-') || 'hop-dong'}.pdf`}
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

                <AIEvaluationModal
                    isOpen={showAIReportModal && !!selectedAIReport}
                    onCancel={() => {
                        setShowAIReportModal(false);
                        setSelectedAIReport(null);
                    }}
                    analysisResult={selectedAIReport}
                    projectName={projectMap[selectedAIReport?.projectId]?.projectName}
                    viewerRole={user?.role}
                    uiVariant="investor"
                    isHistoryMode
                    isEvaluationOnly
                    onReanalyze={handleReanalyzeClick}
                />



                {/* Standardized Detail Modal */}
                {showDetailModal && selectedItem && (
                    <div className={styles.modalOverlay} onClick={handleCloseDetailModal}>
                        <div
                            className={styles.modalContent}
                            style={{
                                maxWidth: detailType === 'deal' && selectedItem?.documentUrl ? 'min(92vw, 900px)' : '600px',
                                width: '100%',
                                height: 'auto',
                                maxHeight: '85vh',
                            }}
                            onClick={e => e.stopPropagation()}
                        >
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
                                        {/* Status Section */}
                                        <div className={styles.projectDetailSection}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                <Info size={14} /> Trạng thái hiện tại
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: getDealStatusInfo(selectedItem.status).color, boxShadow: `0 0 8px ${getDealStatusInfo(selectedItem.status).color}` }}></div>
                                                <span style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>{getDealStatusInfo(selectedItem.status).label}</span>
                                            </div>
                                        </div>

                                        {selectedItem.documentUrl && (
                                            <div className={styles.projectDetailSection}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                    <FileText size={14} /> Tài liệu thỏa thuận
                                                </div>
                                                <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                                                    <DealDocumentInlinePreview url={selectedItem.documentUrl} />
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

                {/* Restricted Action Modal (e.g. Pending Status) */}
                <RestrictedActionModal
                    isOpen={showRestrictedModal}
                    onClose={() => setShowRestrictedModal(false)}
                    message={restrictedActionMessage}
                />
            </div>
        </div>
    );
}
