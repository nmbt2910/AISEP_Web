import React, { useState, useEffect, useRef } from 'react';
import { TrendingUp, Users, FileText, CheckCircle, AlertCircle, Calendar, MessageSquare, PlusCircle, Eye, Shield, Send, Zap, Sparkles, RefreshCw, X, ArrowRight, Loader2, Upload, ExternalLink, Trash2, History, Search, Maximize2, User, Crown, DollarSign, Info, Check } from 'lucide-react';
import styles from '../styles/SharedDashboard.module.css';
import CompleteStartupInfoForm from '../components/startup/CompleteStartupInfoForm';
import StartupProfileForm from '../components/startup/StartupProfileForm';
import SuccessModal from '../components/common/SuccessModal';
import ProjectSubmissionForm from '../components/startup/ProjectSubmissionForm';
import DueDiligenceFormModal from '../components/startup/DueDiligenceFormModal';
import BlockchainVerificationModal from '../components/common/BlockchainVerificationModal';
import BlockchainOnchainResultModal from '../components/common/BlockchainOnchainResultModal';
import AIEvaluationModal from '../components/common/AIEvaluationModal';
import ConfirmationModal from '../components/common/ConfirmationModal';
import FeedHeader from '../components/feed/FeedHeader';
import FloatingChatWidget from '../components/common/FloatingChatWidget';
import NewsPRSection from '../components/common/NewsPRSection';
import ProjectValidationService from '../services/ProjectValidation.js';
import BlockchainService from '../services/BlockchainService.js';
import AIEvaluationService from '../services/AIEvaluationService.js';
import projectSubmissionService from '../services/projectSubmissionService.js';
import startupProfileService from '../services/startupProfileService.js';
import connectionService from '../services/connectionService.js';
import dealsService from '../services/dealsService.js';
import investorService from '../services/investorService.js';
import signalRService from '../services/signalRService.js';
import { PROJECT_STATUS, isUserEditable, STATUS_LABELS, STATUS_COLORS, getStageLabel } from '../constants/ProjectStatus.js';
import { translateAIResults } from '../utils/translateAIResults.js';
import kanban from '../styles/OperationStaffDashboard.module.css';
import bookingService from '../services/bookingService';
import projectAssignmentService from '../services/projectAssignmentService';
import BookingWizard from '../components/booking/BookingWizard';
import optionService from '../services/optionService';
import { getScorecardRowsForDisplay } from '../constants/projectScorecard.js';

import StartupProfileBanner from '../components/startup/StartupProfileBanner';
import StartupBookings from '../components/startup/StartupBookings';
import ProjectDetailView from '../components/feed/ProjectDetailView';
import AccountProfileTab from '../components/common/AccountProfileTab';
import DashboardStatusFilter from '../components/common/DashboardStatusFilter';
import DashboardSection from '../components/common/DashboardSection';

import SubscriptionManagement from '../components/subscription/SubscriptionManagement';
import subscriptionService from '../services/subscriptionService';
import paymentService from '../services/paymentService';
import AIAnalyzeConfirmationModal from '../components/common/AIAnalyzeConfirmationModal';
import RestrictedActionModal from '../components/common/RestrictedActionModal';
import CustomSelect from '../components/common/CustomSelect';
import { useProfile } from '../context/ProfileContext';


/**
 * StartupDashboard - Comprehensive dashboard for startup founders
 * Features: Overview stats, Profile completion, Documents, AI Score, Advisor requests
 */
export default function StartupDashboard({ user, initialSection = 'my-projects', targetId, onLogout, onNotificationNavigate }) {
    const [activeSection, setActiveSection] = useState(initialSection);
    const [modalRefreshKey, setModalRefreshKey] = useState(Date.now());
    const [isMobile, setIsMobile] = React.useState(window.innerWidth <= 1024);
    const [showLeftTabIndicator, setShowLeftTabIndicator] = React.useState(false);
    const [showRightTabIndicator, setShowRightTabIndicator] = React.useState(false);

    // Deep Linking State Tracking
    const [hasAttemptedDeepLink, setHasAttemptedDeepLink] = React.useState(false);

    // Sync activeSection with initialSection prop + handle removed/invalid sections
    React.useEffect(() => {
        if (initialSection === 'overview' || initialSection === 'statistics' || !initialSection) {
            setActiveSection('my-projects');
        } else {
            setActiveSection(initialSection);
        }
        setHasAttemptedDeepLink(false); // Reset when section explicitly changes from outside
    }, [initialSection]);

    // Handle window resize for mobile check
    React.useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 1024);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);
    const [lastBookingFilter, setLastBookingFilter] = React.useState('all');
    const [projectSearchTerm, setProjectSearchTerm] = React.useState('');
    const [connectionSearchTerm, setConnectionSearchTerm] = React.useState('');
    const [dealSearchTerm, setDealSearchTerm] = React.useState('');
    const [showCompleteInfoForm, setShowCompleteInfoForm] = React.useState(false);

    // Filter States
    const [projectFilter, setProjectFilter] = React.useState('all');
    const [connectionFilter, setConnectionFilter] = React.useState('all');
    const [dealFilter, setDealFilter] = React.useState('all');

    // Refs for scroll tracking
    const isFirstLoad = useRef(true);
    const isFormDirty = useRef(false);

    // --- Silent Polling Infrastructure ---
    const [refreshTrigger, setRefreshTrigger] = React.useState(0);
    const tabsRef = React.useRef(null);
    const [indicatorStyle, setIndicatorStyle] = React.useState({ transform: 'translateX(0)', width: '0px' });
    const [showRestrictedModal, setShowRestrictedModal] = React.useState(false);
    const [restrictedActionMessage, setRestrictedActionMessage] = React.useState('');



    /**
     * getSectionHeader - Dynamically returns the header title and subtitle based on activeSection
     */
    const getSectionHeader = (section, user) => {
        const name = user?.name || 'Người sáng lập';

        switch (section) {
            case 'overview':
                return {
                    title: 'Bảng điều khiển',
                    subtitle: `Xin chào, ${name}! Đây là tổng quan khởi nghiệp của bạn.`
                };
            case 'complete-info':
                return {
                    title: 'Hồ sơ Startup',
                    subtitle: 'Hoàn thiện thông tin để giúp dự án của bạn trở nên chuyên nghiệp hơn.'
                };
            case 'my-projects':
                return {
                    title: 'Dự án của tôi',
                    subtitle: 'Quản lý và theo dõi tiến độ các dự án khởi nghiệp của bạn.'
                };
            case 'bookings':
                return {
                    title: 'Lịch tư vấn',
                    subtitle: 'Quản lý các buổi hẹn cố vấn và lịch làm việc của bạn.'
                };
            case 'deals':
                return {
                    title: 'Thỏa thuận đầu tư',
                    subtitle: 'Nhận thỏa thuận tài liệu từ investor và xác nhận hoặc từ chối.'
                };
            case 'connection-requests':
                return {
                    title: 'Yêu cầu kết nối',
                    subtitle: 'Danh sách các nhà đầu tư muốn tìm hiểu thêm về dự án của bạn.'
                };
            case 'account_profile':
                return {
                    title: 'Hồ sơ người dùng',
                    subtitle: 'Cập nhật thông tin cá nhân và cài đặt tài khoản của bạn.'
                };
            case 'pr_news':
                return {
                    title: 'Tin tức & PR',
                    subtitle: 'Cập nhật tin tức và thông cáo báo chí mới nhất.'
                };
            default:
                if (section?.startsWith('project_')) {
                    return {
                        title: 'Chi tiết dự án',
                        subtitle: 'Xem thông tin chi tiết và tiến độ dự án.'
                    };
                }
                return {
                    title: 'Bảng điều khiển',
                    subtitle: `Xin chào, ${name}!`
                };
        }
    };
    const [successMessage, setSuccessMessage] = React.useState('');
    const [successTitle, setSuccessTitle] = React.useState('');
    const [successPrimaryBtn, setSuccessPrimaryBtn] = React.useState('');
    const [successSecondaryBtn, setSuccessSecondaryBtn] = React.useState('');
    const [onSuccessSecondaryClick, setOnSuccessSecondaryClick] = React.useState(null);
    const [successModalType, setSuccessModalType] = React.useState('success');
    const [isProtectingDocuments, setIsProtectingDocuments] = React.useState(false);
    const [isEvaluatingAI, setIsEvaluatingAI] = React.useState(false);
    const [aiEvaluationResult, setAIEvaluationResult] = React.useState(null);
    const [aiEvaluationError, setAiEvaluationError] = React.useState(null);
    const [showAIEvaluationModal, setShowAIEvaluationModal] = React.useState(false);
    const [showSubmitConfirmation, setShowSubmitConfirmation] = React.useState(false);
    const [pendingSubmitProjectId, setPendingSubmitProjectId] = React.useState(null);
    const [isSubmittingProject, setIsSubmittingProject] = React.useState(false);
    const [submittingProjectId, setSubmittingProjectId] = React.useState(null);
    const [blockchainVerifications, setBlockchainVerifications] = React.useState({});
    const [showSuccessModal, setShowSuccessModal] = React.useState(false);
    const [isLoadingDocuments, setIsLoadingDocuments] = React.useState(false);
    const [isUploading, setIsUploading] = React.useState(false);
    const [isUploadingDueDiligencePdf, setIsUploadingDueDiligencePdf] = React.useState(false);
    const [showDueDiligenceFormModal, setShowDueDiligenceFormModal] = React.useState(false);
    const [dueDiligenceTemplateData, setDueDiligenceTemplateData] = React.useState(null);
    const [isLoadingDueDiligenceTemplate, setIsLoadingDueDiligenceTemplate] = React.useState(false);
    const [lastDueDiligenceDocUrl, setLastDueDiligenceDocUrl] = React.useState('');
    const [verifyingDocId, setVerifyingDocId] = React.useState(null);
    const [documentType, setDocumentType] = React.useState('PitchDeck');
    const [dragActive, setDragActive] = React.useState(false);
    const [verificationData, setVerificationData] = React.useState(null);
    const [showVerificationModal, setShowVerificationModal] = React.useState(false);
    const [verificationDocumentName, setVerificationDocumentName] = React.useState('');
    const [documentIdInput, setDocumentIdInput] = React.useState('');
    const [isPublishingProject, setIsPublishingProject] = React.useState(false);
    const [blockchainProof, setBlockchainProof] = React.useState(null);
    const [isLoadingInitialData, setIsLoadingInitialData] = React.useState(true);
    const [dashboardError, setDashboardError] = React.useState(null);
    const [showDetailModal, setShowDetailModal] = React.useState(false);
    const [detailProject, setDetailProject] = React.useState(null);
    const [project, setProject] = React.useState(null);
    const [myProjects, setMyProjects] = React.useState([]);
    const [startupProfile, setStartupProfile] = React.useState(null);
    const [showProjectForm, setShowProjectForm] = React.useState(false);
    const [analysisHistory, setAnalysisHistory] = React.useState([]);
    const [isLoadingHistory, setIsLoadingHistory] = React.useState(false);
    const [showHistoryView, setShowHistoryView] = React.useState(false);
    const [selectedHistoryResult, setSelectedHistoryResult] = React.useState(null);
    const [evaluatingProjectId, setEvaluatingProjectId] = React.useState(null);
    const [showFullscreenImage, setShowFullscreenImage] = React.useState(false);
    const [stages, setStages] = React.useState([]);

    // Booking Eligibility States
    const [canBookDetailProject, setCanBookDetailProject] = React.useState(false);
    const [detailProjectAdvisors, setDetailProjectAdvisors] = React.useState([]);
    const [isCheckingBookingEligibility, setIsCheckingBookingEligibility] = React.useState(false);
    const [showBookingWizard, setShowBookingWizard] = React.useState(false);
    const [bookingInitialAdvisorId, setBookingInitialAdvisorId] = React.useState(null);

    // Connection/Info Requests States (for investor inquiries)
    const [connectionRequests, setConnectionRequests] = React.useState([]);
    const [isLoadingRequests, setIsLoadingRequests] = React.useState(false);
    const [isRespondingToRequest, setIsRespondingToRequest] = React.useState(null);
    const [showInvestorProfileModal, setShowInvestorProfileModal] = React.useState(false);
    const [selectedInvestorProfile, setSelectedInvestorProfile] = React.useState(null);
    const [isLoadingInvestorProfile, setIsLoadingInvestorProfile] = React.useState(false);

    // Deals Approval States (for investment deals from investors)
    const [dealsToApprove, setDealsToApprove] = React.useState([]);
    const [isLoadingDeals, setIsLoadingDeals] = React.useState(false);
    const [rejectReason, setRejectReason] = React.useState('');

    // Deal document modal states
    const [showContractModal, setShowContractModal] = React.useState(false);
    const [contractDealData, setContractDealData] = React.useState(null);
    const [isVerifyingDealFromModal, setIsVerifyingDealFromModal] = React.useState(false);
    const [showDealDocumentLightbox, setShowDealDocumentLightbox] = React.useState(false);
    const [showOnchainResultModal, setShowOnchainResultModal] = React.useState(false);
    const [onchainResultData, setOnchainResultData] = React.useState(null);

    // AI Analysis Quote states
    const [subscription, setSubscription] = React.useState(null);
    const [activePackage, setActivePackage] = React.useState(null);
    const [showAIAnalyzeConfirm, setShowAIAnalyzeConfirm] = React.useState(false);
    const [targetProjectIdForAI, setTargetProjectIdForAI] = React.useState(null);
    const [isLoadingSubscription, setIsLoadingSubscription] = React.useState(false);



    // Chat Widget States
    const [activeChatConnectionId, setActiveChatConnectionId] = React.useState(null);
    const [activeChatSession, setActiveChatSession] = React.useState(null);

    // Document Deletion States
    const [isDeletingDocument, setIsDeletingDocument] = React.useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
    const [documentToDelete, setDocumentToDelete] = React.useState(null);
    const [blockedFiles, setBlockedFiles] = React.useState([]); // Session-based blacklist for verified docs
    const hiddenFileInput = React.useRef(null);

    const { startupProfile: ctxProfile, startupProfileStatus, isStartupApproved, refreshProfile, profileLoading } = useProfile();

    // Fallback to context profile if local state not yet synced
    const displayProfile = startupProfile || ctxProfile;
    const isApproved = isStartupApproved;
    const profileReady = !profileLoading;

    const showRestrictedActionModal = (actionName = 'hành động này') => {
        setRestrictedActionMessage(`Bạn cần được phê duyệt hồ sơ Startup để thực hiện hành động: ${actionName}. Vui lòng hoàn tất hồ sơ và đợi đội ngũ AISEP xác nhận.`);
        setShowRestrictedModal(true);
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

        console.log(`[StartupDashboard] Processing targetId: ${targetId} for activeSection: ${activeSection}`);

        // 1. My Projects Deep Link
        if (activeSection === 'my-projects' && myProjects.length > 0) {
            const matchProject = myProjects.find(p => String(p.id || p.projectId) === String(targetId));
            if (matchProject) {
                // If it's a draft or something we stay on the grid, if we want full view we navigate
                // For now let's just scroll and highlight the card
                scrollAndHighlight('project');
            }
        }

        // 2. Deals Deep Link
        else if (activeSection === 'deals' && dealsToApprove.length > 0) {
            const matchDeal = dealsToApprove.find(d => String(d.dealId) === String(targetId));
            if (matchDeal) {
                // If it's ready to sign, pop the contract modal
                if (matchDeal.status === 'Confirmed' || matchDeal.status === 1 || matchDeal.status === 'Waiting_For_Startup_Signature' || matchDeal.status === 2) {
                    setContractDealData(matchDeal);
                    setContractPreviewHtml(null);
                    setShowContractModal(true);
                }
                scrollAndHighlight('deal');
            }
        }

        // 3. Connect Requests Deep Link
        else if (activeSection === 'connection-requests' && connectionRequests.length > 0) {
            const matchReq = connectionRequests.find(r => String(r.connectionRequestId) === String(targetId));
            if (matchReq) {
                scrollAndHighlight('connection');
            }
        }

        // 4. Bookings Deep Link (Handled by component usually, but we can helper it)
        else if (activeSection === 'bookings') {
            scrollAndHighlight('booking');
        }

    }, [targetId, activeSection, myProjects, dealsToApprove, connectionRequests, hasAttemptedDeepLink]);

    // --- Filter Configurations & Counts ---

    const projectFilterOptions = [
        { id: 'all', label: 'Tất cả', statuses: [] },
        { id: 'draft', label: 'Bản nháp', statuses: ['Draft', 'IpProtected'] },
        { id: 'pending', label: 'Chờ duyệt', statuses: ['Pending', 'Submitted'] },
        { id: 'approved', label: 'Đã duyệt', statuses: ['Approved', 'Published'] },
        { id: 'rejected', label: 'Bị từ chối', statuses: ['Rejected'] }
    ];

    const connectionFilterOptions = [
        { id: 'all', label: 'Tất cả', statuses: [] },
        { id: 'pending', label: 'Chờ xử lý', statuses: ['pending'] },
        { id: 'accepted', label: 'Đã chấp nhận', statuses: ['accepted'] },
        { id: 'rejected', label: 'Đã từ chối', statuses: ['rejected'] }
    ];

    const getDealStatusInfo = (status) => {
        const map = {
            PendingCounterpartyConfirmation: { label: 'Chờ đối tác xác nhận', value: 0, color: '#f59e0b' },
            PendingStaffApproval: { label: 'Chờ staff duyệt', value: 1, color: '#0ea5e9' },
            RequireReupload: { label: 'Yêu cầu tải lại tài liệu', value: 2, color: '#f97316' },
            ProcessingBlockchain: { label: 'Đang xử lý blockchain', value: 3, color: '#8b5cf6' },
            Completed: { label: 'Hoàn tất', value: 4, color: '#10b981' },
            Canceled: { label: 'Đã hủy', value: 5, color: '#ef4444' },
            BlockchainFailed: { label: 'Blockchain thất bại', value: 6, color: '#dc2626' },
        };
        const numeric = typeof status === 'number' ? status : Number(status);
        if (!Number.isNaN(numeric) && numeric >= 0 && numeric <= 6) {
            const key = Object.keys(map).find((k) => map[k].value === numeric);
            return map[key] || { label: 'Không xác định', value: null, color: '#64748b' };
        }
        return map[status] || { label: String(status || 'Không xác định'), value: null, color: '#64748b' };
    };

    const dealFilterOptions = [
        { id: 'all', label: 'Tất cả', values: [] },
        { id: 'pending', label: 'Chờ xác nhận', values: [0] },
        { id: 'staff', label: 'Chờ staff duyệt', values: [1] },
        { id: 'reupload', label: 'Yêu cầu tải lại', values: [2] },
        { id: 'processing', label: 'Đang xử lý', values: [3] },
        { id: 'completed', label: 'Hoàn tất', values: [4] },
        { id: 'failed', label: 'Hủy/Lỗi', values: [5, 6] }
    ];

    const getProjectCounts = () => {
        const counts = { all: myProjects.length };
        projectFilterOptions.forEach(opt => {
            if (opt.id !== 'all') {
                counts[opt.id] = myProjects.filter(p => opt.statuses.includes(p.status)).length;
            }
        });
        return counts;
    };

    const getConnectionCounts = () => {
        const counts = { all: connectionRequests.length };
        connectionFilterOptions.forEach(opt => {
            if (opt.id !== 'all') {
                counts[opt.id] = connectionRequests.filter(r => opt.statuses.includes(r.status)).length;
            }
        });
        return counts;
    };

    const getDealCounts = () => {
        const counts = { all: dealsToApprove.length };
        dealFilterOptions.forEach(opt => {
            if (opt.id !== 'all') {
                counts[opt.id] = dealsToApprove.filter(d => opt.values.includes(getDealStatusInfo(d.status).value)).length;
            }
        });
        return counts;
    };

    const filteredProjects = myProjects.filter(p => {
        // Search filter
        const name = (p.name || p.projectName || '').toLowerCase();
        const desc = (p.shortDescription || p.description || '').toLowerCase();
        const search = projectSearchTerm.toLowerCase();
        const matchesSearch = name.includes(search) || desc.includes(search);

        // Status filter
        if (projectFilter === 'all') return matchesSearch;
        const activeOpt = projectFilterOptions.find(o => o.id === projectFilter);
        return matchesSearch && activeOpt.statuses.includes(p.status);
    });

    const filteredConnections = connectionRequests.filter(r => {
        // Search filter
        const name = (r.investorName || '').toLowerCase();
        const msg = (r.message || r.investorMessage || '').toLowerCase();
        const search = connectionSearchTerm.toLowerCase();
        const matchesSearch = name.includes(search) || msg.includes(search);

        // Status filter
        if (connectionFilter === 'all') return matchesSearch;
        const activeOpt = connectionFilterOptions.find(o => o.id === connectionFilter);
        return matchesSearch && activeOpt.statuses.includes(r.status);
    });

    const filteredDeals = dealsToApprove.filter(d => {
        // Search filter
        const proj = (d.projectName || '').toLowerCase();
        const inv = (d.investorName || '').toLowerCase();
        const search = dealSearchTerm.toLowerCase();
        const matchesSearch = proj.includes(search) || inv.includes(search);

        // Status filter
        if (dealFilter === 'all') return matchesSearch;
        const activeOpt = dealFilterOptions.find(o => o.id === dealFilter);
        return matchesSearch && activeOpt.values.includes(getDealStatusInfo(d.status).value);
    });

    // SignalR: initialize and trigger immediate silent refresh on notification
    React.useEffect(() => {
        const initSignalR = async () => {
            try {
                const token = localStorage.getItem('aisep_token') || sessionStorage.getItem('token');
                if (token && user?.userId) {
                    await signalRService.initialize(token);
                    signalRService.onNotificationReceived(() => {
                        console.log('[StartupDashboard] SignalR notification → silent refresh');
                        setRefreshTrigger(prev => prev + 1);
                    });
                    console.log('[StartupDashboard] SignalR initialized');
                }
            } catch (error) {
                console.warn('[StartupDashboard] SignalR init failed (non-critical):', error);
            }
        };

        if (user?.userId) {
            initSignalR();
        }

        return () => {
            signalRService.disconnect();
        };
    }, [user?.userId]);

    // Silent background polling every 5 seconds
    React.useEffect(() => {
        const interval = setInterval(() => {
            console.log('[StartupDashboard] Silent background poll triggered');
            setRefreshTrigger(prev => prev + 1);
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    // Tab-switch: trigger immediate silent refresh when user switches section
    React.useEffect(() => {
        if (!isFirstLoad.current) {
            setRefreshTrigger(prev => prev + 1);
        }
    }, [activeSection]);

    const checkTabScroll = () => {
        if (tabsRef.current) {
            const { scrollLeft, scrollWidth, clientWidth } = tabsRef.current;
            setShowLeftTabIndicator(scrollLeft > 5);
            setShowRightTabIndicator(scrollLeft < scrollWidth - clientWidth - 5);
        }
    };

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
    }, [activeSection, refreshTrigger, stages.length]);

    React.useEffect(() => {
        if (showDetailModal || showFullscreenImage) {
            document.body.style.overflow = 'hidden';
            document.documentElement.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
            document.documentElement.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
            document.documentElement.style.overflow = 'unset';
        };
    }, [showDetailModal, showFullscreenImage]);

    // Initialize section from localStorage if set (e.g., redirect from project creation)
    React.useEffect(() => {
        const savedTab = localStorage.getItem('aisep_dashboard_tab');
        if (savedTab) {
            setActiveSection(savedTab);
            localStorage.removeItem('aisep_dashboard_tab');
        }
    }, []);

    const [projectFormData, setProjectFormData] = React.useState({
        projectName: '',
        description: '',
        tagline: '',
        industry: '',
        stage: '',
        problemStatement: '',
        solution: '',
        targetMarket: '',
        teamSize: '',
        fundingStage: '',
        fundingAmount: '',
        currentRevenue: '',
        monthlyBurn: '',
        website: '',
        videoLink: '',
        keyFeatures: '',
    });

    const fetchAnalysisHistory = async (projectId) => {
        setIsLoadingHistory(true);
        try {
            const response = await AIEvaluationService.getProjectAnalysisHistory(projectId);
            if (response.success) {
                const raw = response.data || [];
                const mapped = raw.map((item) => {
                    try {
                        const { analysisResult } = translateAIResults({ success: true, data: item }, null);
                        return analysisResult?.data ?? item;
                    } catch {
                        return item;
                    }
                });
                setAnalysisHistory(mapped);
            } else {
                setAnalysisHistory([]);
            }
        } catch (error) {
            console.error('Error fetching analysis history:', error);
            setAnalysisHistory([]);
        } finally {
            setIsLoadingHistory(false);
        }
    };

    const fetchDashboardData = async ({ silent = false } = {}) => {
        if (!silent) {
            setIsLoadingInitialData(true);
            setDashboardError(null);
        }
        try {
            // Fetch projects in parallel with other dashboard-specific data
            const [projectsRes, stagesRes] = await Promise.all([
                projectSubmissionService.getMyProjects(),
                optionService.getStages()
            ]);

            if (stagesRes) {
                setStages(stagesRes.filter(s => s.isActive));
            }

            if (projectsRes.success && projectsRes.data) {
                const rawProjects = Array.isArray(projectsRes.data) ? projectsRes.data : (projectsRes.data.items || []);
                // Sort projects by CreatedAt descending (most recent first)
                const sortedProjects = [...rawProjects].sort((a, b) => {
                    const dateB = new Date(b.createdAt || 0);
                    const dateA = new Date(a.createdAt || 0);
                    if (dateB - dateA !== 0) return dateB - dateA;
                    return (b.id || b.projectId || 0) - (a.id || a.projectId || 0);
                });
                setMyProjects(sortedProjects);

                if (sortedProjects.length > 0) {
                    const loadedProject = sortedProjects[0];
                    setProject(loadedProject);

                    setProjectFormData({
                        ...projectFormData,
                        projectName: loadedProject.name || loadedProject.projectName || '',
                        description: loadedProject.description || '',
                        tagline: loadedProject.tagline || '',
                        industry: loadedProject.industry || '',
                        stage: loadedProject.stage || '',
                    });
                }
            }

            // Only sync context profile to local state on first load (not on silent polls)
            // to prevent StartupProfileForm from re-initializing on every background refresh.
            if (!silent && ctxProfile) {
                setStartupProfile(ctxProfile);
            } else if (!startupProfile && ctxProfile) {
                // Fallback: sync once if local state is still empty (e.g. after context loads)
                setStartupProfile(ctxProfile);
            }
        } catch (err) {
            if (!silent) {
                console.error("Failed to load dashboard data:", err);
                setDashboardError("Không thể tải dữ liệu bảng điều khiển. Vui lòng kiểm tra kết nối mạng.");
            }
        } finally {
            if (!silent) {
                setIsLoadingInitialData(false);
            }
        }
    };

    const handleRetryDashboard = () => {
        fetchDashboardData();
        fetchSubscriptionData();
    };

    const fetchSubscriptionData = async () => {
        setIsLoadingSubscription(true);
        try {
            const [subData, pkgData] = await Promise.all([
                subscriptionService.getMySubscription(),
                paymentService.getStartupPackages()
            ]);
            setSubscription(subData);
            const pkgs = pkgData?.items || pkgData || [];
            const activePkg = pkgs.find(p => p.packageId === subData?.packageId);
            setActivePackage(activePkg);
        } catch (error) {
            console.error('Failed to fetch subscription data:', error);
        } finally {
            setIsLoadingSubscription(false);
        }
    };
    const [advisorRequests, setAdvisorRequests] = React.useState([]);

    // Empty documents out, we fetch them via project endpoint or soon later
    const [documents, setDocuments] = React.useState([]);

    // Calculate profile completion based on startup profile data
    const calculateProfileCompletion = () => {
        if (!startupProfile) return 0;
        let points = 20; // 20% for just having created the record
        if (startupProfile.logoUrl) points += 10;
        if (startupProfile.companyName) points += 10;
        if (startupProfile.founder) points += 20;
        if (startupProfile.contactInfo) points += 10;
        if (startupProfile.countryCity) points += 10;
        if (startupProfile.website) points += 10;
        if (startupProfile.industry) points += 10;
        return points;
    };

    // Live data only - set mock data to 0
    const dashboardData = {
        profileCompletion: calculateProfileCompletion(),
        documentsUploaded: documents.length,
        advisorsConnected: 0,
        aiScore: startupProfile?.projects?.[0]?.aiEvaluation?.startupScore || project?.aiEvaluation?.startupScore || 0,
        pendingAdvisorRequests: 0,
        profileViews: startupProfile?.followers?.length || 0, // Using followers as views temporarily
        investorInterests: 0,
        monthlyViewTrend: []
    };

    const handleAcceptRequest = (id) => {
        setAdvisorRequests(advisorRequests.map(req =>
            req.id === id ? { ...req, status: 'accepted', appointmentDate: '2024-02-05' } : req
        ));
    };

    const handleRejectRequest = (id) => {
        setAdvisorRequests(advisorRequests.map(req =>
            req.id === id ? { ...req, status: 'rejected' } : req
        ));
    };

    // Fetch connection requests for startup
    const fetchConnectionRequests = async ({ silent = false } = {}) => {
        if (!silent) setIsLoadingRequests(true);
        try {
            // Fetch received connection requests from investors using original API
            const response = await connectionService.getReceivedConnectionRequests();
            console.log('[StartupDashboard] getReceivedConnectionRequests response:', response);

            let requests = [];
            if (response && response.data) {
                if (response.data.items && Array.isArray(response.data.items)) {
                    requests = response.data.items;
                    console.log('[StartupDashboard] Found items in response.data.items, count:', requests.length);
                } else if (Array.isArray(response.data)) {
                    requests = response.data;
                    console.log('[StartupDashboard] response.data is array, count:', requests.length);
                }
            }

            console.log('[StartupDashboard] Raw requests:', requests);

            // Map API response to component format
            const formattedRequests = requests.map(req => {
                // Format date from responseDate or use today
                let sentDateString = new Date().toLocaleString('vi-VN', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: false
                });
                if (req.responseDate) {
                    sentDateString = new Date(req.responseDate).toLocaleString('vi-VN', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                        hour12: false
                    });
                }

                return {
                    id: req.connectionRequestId,
                    connectionRequestId: req.connectionRequestId,
                    investorId: req.investorId || req.investor?.investorId || req.investor?.id || null,
                    investorName: req.investorName || 'Investor',
                    investorAvatarUrl: req.investorAvatarUrl || req.profileImageUrl || req.investor?.profileImageUrl || '',
                    chatSessionId: req.chatSessionId,
                    status: req.status?.toLowerCase() || 'pending',
                    message: req.message || '',
                    sentDate: sentDateString
                };
            });

            console.log('[StartupDashboard] Formatted requests:', formattedRequests);
            setConnectionRequests(formattedRequests);
        } catch (error) {
            if (!silent) {
                console.error('[StartupDashboard] Failed to fetch connection requests:', error);
                console.error('[StartupDashboard] Error details - Message:', error?.message);
                console.error('[StartupDashboard] Error details - Status:', error?.response?.status);
                console.error('[StartupDashboard] Error details - Data:', error?.response?.data);
                setConnectionRequests([]);
            }
        } finally {
            if (!silent) setIsLoadingRequests(false);
        }
    };

    const handleApproveConnectionRequest = async (requestId) => {
        if (!isApproved) {
            showRestrictedActionModal('chấp nhận yêu cầu kết nối');
            return;
        }
        setIsRespondingToRequest(requestId);
        try {
            const response = await connectionService.respondToConnection(requestId, true);
            console.log('[StartupDashboard] Approved request:', response);

            if (response && (response.success || response.data)) {
                setConnectionRequests(connectionRequests.map(req =>
                    req.connectionRequestId === requestId ? { ...req, status: 'accepted' } : req
                ));
                setSuccessMessage('✓ Đã chấp nhận yêu cầu. Bạn có thể bắt đầu cuộc trò chuyện');
                setShowSuccessModal(true);
            }
        } catch (error) {
            console.error('[StartupDashboard] Failed to approve request:', error);
            alert('Lỗi: Không thể chấp nhận yêu cầu');
        } finally {
            setIsRespondingToRequest(null);
        }
    };

    const handleRejectConnectionRequest = async (requestId) => {
        if (!isApproved) {
            showRestrictedActionModal('từ chối yêu cầu kết nối');
            return;
        }
        setIsRespondingToRequest(requestId);
        try {
            const response = await connectionService.respondToConnection(requestId, false);
            console.log('[StartupDashboard] Rejected request:', response);

            if (response && (response.success || response.data)) {
                setConnectionRequests(connectionRequests.map(req =>
                    req.connectionRequestId === requestId ? { ...req, status: 'rejected' } : req
                ));
                setSuccessMessage('✓ Đã từ chối yêu cầu');
                setShowSuccessModal(true);
            }
        } catch (error) {
            console.error('[StartupDashboard] Failed to reject request:', error);
            alert('Lỗi: Không thể từ chối yêu cầu');
        } finally {
            setIsRespondingToRequest(null);
        }
    };

    const handleStartChat = (connectionRequestId) => {
        console.log('[StartupDashboard] Starting chat for connectionRequestId:', connectionRequestId);

        // Find the connection request and extract chatSessionId
        const request = connectionRequests.find(r => r.connectionRequestId === connectionRequestId);
        if (request && request.chatSessionId) {
            setActiveChatSession({
                chatSessionId: request.chatSessionId,
                displayName: request.investorName,
                sentTime: request.sentDate
            });
        } else {
            console.warn('[StartupDashboard] Could not find chatSessionId for connectionRequestId:', connectionRequestId);
        }
    };

    const handleCloseChatWindow = () => {
        console.log('[StartupDashboard] Closing chat window');
        setActiveChatSession(null);
        setActiveChatConnectionId(null);
        // Refresh connection requests to update status
        fetchConnectionRequests();
    };

    const getInvestorIdFromEntity = (entity) =>
        entity?.investorId || entity?.investor?.investorId || entity?.investor?.id || null;

    const getInvestorAvatarFromEntity = (entity) =>
        entity?.investorAvatarUrl ||
        entity?.investorProfileImageUrl ||
        entity?.profileImageUrl ||
        entity?.avatarUrl ||
        entity?.investor?.profileImageUrl ||
        '';

    const handleOpenInvestorProfile = async (entity) => {
        const investorId = getInvestorIdFromEntity(entity);
        if (!investorId) {
            setSuccessMessage('Không tìm thấy mã nhà đầu tư để mở hồ sơ.');
            setShowSuccessModal(true);
            return;
        }

        setShowInvestorProfileModal(true);
        setIsLoadingInvestorProfile(true);
        try {
            const investor = await investorService.getInvestorById(investorId);
            const fallbackName = entity?.investorName || 'Nhà đầu tư';
            setSelectedInvestorProfile(
                investor || {
                    investorId,
                    organizationName: fallbackName,
                    userName: fallbackName,
                    profileImageUrl: getInvestorAvatarFromEntity(entity),
                    investmentTaste: 'Nhà đầu tư chưa cập nhật mô tả hồ sơ.',
                }
            );
        } catch (error) {
            console.error('[StartupDashboard] Failed to load investor profile:', error);
            setSelectedInvestorProfile({
                investorId,
                organizationName: entity?.investorName || 'Nhà đầu tư',
                userName: entity?.investorName || 'Nhà đầu tư',
                profileImageUrl: getInvestorAvatarFromEntity(entity),
                investmentTaste: 'Không thể tải chi tiết hồ sơ nhà đầu tư.',
            });
        } finally {
            setIsLoadingInvestorProfile(false);
        }
    };

    // --- Deals Approval Functions ---

    const fetchDealsToApprove = async ({ silent = false } = {}) => {
        if (!silent) setIsLoadingDeals(true);
        try {
            const response = await dealsService.getStartupDeals();
            let deals = Array.isArray(response?.data) ? response.data : (response?.data?.items || []);
            setDealsToApprove(deals);
        } catch (error) {
            if (!silent) {
                console.error('[StartupDashboard] Error fetching deals:', error);
                setDealsToApprove([]);
            }
        } finally {
            if (!silent) setIsLoadingDeals(false);
        }
    };

    /**
     * fetchAllData - Consolidated silent-aware fetch for all startup dashboard data.
     * On first load: shows loading spinners. On subsequent polls: silent background refresh.
     */
    const fetchAllData = async ({ silent: forceSilent } = {}) => {
        const silent = forceSilent ?? !isFirstLoad.current;
        try {
            await Promise.all([
                fetchDashboardData({ silent }),
                fetchConnectionRequests({ silent }),
                fetchDealsToApprove({ silent }),
            ]);
        } catch (err) {
            console.error('[StartupDashboard] fetchAllData error:', err);
        } finally {
            if (!silent) {
                isFirstLoad.current = false;
            }
        }
    };

    // Main data fetch engine: fires on mount + every refreshTrigger increment
    React.useEffect(() => {
        const silent = !isFirstLoad.current;
        fetchAllData({ silent });
        if (!silent) fetchSubscriptionData();
    }, [refreshTrigger]);

    const handleApproveDeal = async (dealId) => {
        if (!isApproved) {
            showRestrictedActionModal('chấp nhận đầu tư');
            return;
        }
        setIsRespondingToDeal(true);
        try {
            const response = await dealsService.verifyDeal(dealId, true, '');
            if (response && (response.success || response.data)) {
                setSuccessMessage('✓ Đã chấp nhận yêu cầu đầu tư.');
                setShowSuccessModal(true);
                await fetchDealsToApprove();
            }
        } catch (error) {
            console.error('[StartupDashboard] Failed to approve deal:', error);
            setSuccessMessage('Lỗi: Không thể chấp nhận yêu cầu đầu tư.');
            setShowSuccessModal(true);
        } finally {
            setIsRespondingToDeal(false);
        }
    };

    const handleShowContractPreview = async (deal) => {
        setContractDealData(deal);
        setRejectReason('');
        setShowContractModal(true);
    };

    const handleCloseContractModal = () => {
        if (isVerifyingDealFromModal) return;
        setShowContractModal(false);
        setContractDealData(null);
        setRejectReason('');
        setShowDealDocumentLightbox(false);
    };

    const handleVerifyDealFromModal = async (isConfirmed) => {
        if (!contractDealData?.dealId) return;
        if (!isApproved) {
            showRestrictedActionModal(isConfirmed ? 'chấp nhận đầu tư' : 'từ chối đầu tư');
            return;
        }
        const reason = isConfirmed ? '' : rejectReason.trim();
        if (!isConfirmed && !reason) {
            setSuccessMessage('Vui lòng nhập lý do khi từ chối yêu cầu đầu tư.');
            setShowSuccessModal(true);
            return;
        }
        setIsVerifyingDealFromModal(true);
        try {
            const response = await dealsService.verifyDeal(contractDealData.dealId, isConfirmed, reason);
            if (response && (response.success || response.data)) {
                setSuccessMessage(isConfirmed ? '✓ Đã chấp nhận yêu cầu đầu tư.' : '✓ Đã từ chối yêu cầu đầu tư.');
                setShowSuccessModal(true);
                handleCloseContractModal();
                await fetchDealsToApprove();
            } else {
                setSuccessMessage('Lỗi: Không thể xử lý yêu cầu đầu tư.');
                setShowSuccessModal(true);
            }
        } catch (error) {
            console.error('[StartupDashboard] Failed to verify deal:', error);
            setSuccessMessage('Lỗi: Không thể xử lý yêu cầu đầu tư - ' + (error.message || 'Vui lòng thử lại'));
            setShowSuccessModal(true);
        } finally {
            setIsVerifyingDealFromModal(false);
        }
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
            console.error('[StartupDashboard] Failed to verify on-chain:', error);
            setSuccessMessage('Lỗi: Không thể xác thực blockchain cho deal này.');
            setShowSuccessModal(true);
        }
    };

    const isImageDocumentUrl = (url = '') => /\.(png|jpe?g|gif|webp|bmp|svg)(\?|#|$)/i.test(url);

    /**
     * translateError - Maps English backend error messages to Vietnamese
     */
    const translateError = (error) => {
        if (!error) return 'Đã xảy ra lỗi. Vui lòng thử lại.';

        const message = typeof error === 'string' ? error : (error.message || error.response?.data?.message || '');

        if (message.includes('File must not exceed 10MB')) {
            return 'Kích thước tập tin không được vượt quá 10MB.';
        }
        if (message.includes('File only supports PDF, JPG, PNG')) {
            return 'Định dạng tập tin không hỗ trợ. Vui lòng sử dụng PDF, JPG hoặc PNG.';
        }
        if (message.includes('Unauthorized')) {
            return 'Phiên làm việc hết hạn. Vui lòng đăng nhập lại.';
        }
        if (message.includes('Network Error')) {
            return 'Lỗi kết nối mạng. Vui lòng kiểm tra lại đường truyền.';
        }

        return message || 'Đã xảy ra lỗi. Vui lòng thử lại.';
    };

    const handleVerifyDocumentByID = async (documentId) => {
        const idToVerify = documentId || documentIdInput.trim();

        if (!idToVerify) {
            setSuccessMessage('Vui lòng nhập mã tài liệu');
            setShowSuccessModal(true);
            return;
        }

        setIsVerifying(true);
        try {
            const response = await projectSubmissionService.verifyDocument(idToVerify);
            if (response?.success && response?.data) {
                setVerificationData(response.data);
                const doc = documents.find(d => d.id === idToVerify || d.documentId === idToVerify);
                setVerificationDocumentName(doc?.name || doc?.fileName || `Tài liệu #${idToVerify}`);
                setShowVerificationModal(true);
                setDocumentIdInput(''); // Reset input after successful verification
            } else {
                setSuccessMessage('Xác thực thất bại: ' + translateError(response?.message || 'Không thể xác thực tài liệu'));
                setShowSuccessModal(true);
            }
        } catch (error) {
            console.error('Verify Error:', error);
            setSuccessMessage('Lỗi xác thực: ' + translateError(error));
            setShowSuccessModal(true);
        } finally {
            setIsVerifying(false);
        }
    };

    // --- Document Management Logic ---

    // Fetch documents when project detail opens
    useEffect(() => {
        if (showDetailModal && detailProject) {
            fetchProjectDocuments(detailProject.projectId || detailProject.id);
        }
    }, [showDetailModal, detailProject]);

    const fetchProjectDocuments = async (projectId) => {
        setIsLoadingDocuments(true);
        try {
            const response = await projectSubmissionService.getDocuments(projectId);
            if (response && response.data) {
                // Map API documents to local UI model
                // Handle both array response and paginated response (items)
                const docItems = Array.isArray(response.data) ? response.data : (response.data.items || []);

                const truncateName = (name, maxLength = 16) => {
                    if (!name || name.length <= maxLength) return name;
                    const extension = name.split('.').pop();
                    const nameParts = name.split('.');
                    nameParts.pop();
                    const nameWithoutExtension = nameParts.join('.');

                    if (nameWithoutExtension.length > maxLength - extension.length - 3) {
                        return nameWithoutExtension.substring(0, maxLength - extension.length - 3) + '...' + extension;
                    }
                    return name;
                };

                const mappedDocs = docItems.map((doc, index) => ({
                    id: doc.id || doc.documentId || `doc-${index}`,
                    name: truncateName(doc.fileName || doc.documentType),
                    fullName: doc.fileName || doc.documentType, // Keep full name for title/tooltips
                    type: doc.documentType,
                    uploadedAtRaw: doc.uploadedAt || doc.verifiedAt || null,
                    uploadDate: new Date(doc.uploadedAt || doc.verifiedAt || new Date()).toLocaleString('vi-VN', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                        hour12: false
                    }),
                    status: doc.blockchainTxHash ? 'verified' : 'unverified', // Initial hint if hash exists
                    hash: doc.fileHash,
                    txHash: doc.blockchainTxHash, // Capture transaction hash
                    url: doc.fileUrl
                }));
                setDocuments(mappedDocs);
                const latestBusinessPlan = [...mappedDocs]
                    .filter((d) => String(d.type || '').toLowerCase() === 'businessplan')
                    .sort((a, b) => new Date(b.uploadedAtRaw || 0) - new Date(a.uploadedAtRaw || 0))[0];
                setLastDueDiligenceDocUrl(latestBusinessPlan?.url || '');

                // Auto-verify all documents on blockchain (BR-08)
                docItems.forEach(doc => {
                    const docId = doc.id || doc.documentId;
                    if (docId) verifyDocOnBlockchain(docId);
                });
                return mappedDocs;
            } else {
                setDocuments([]);
                return [];
            }
        } catch (error) {
            console.error('Error fetching documents:', error);
            setDocuments([]);
            return [];
        } finally {
            setIsLoadingDocuments(false);
        }
    };

    const verifyDocOnBlockchain = async (docId) => {
        // Set loading state
        setBlockchainVerifications(prev => ({
            ...prev,
            [docId]: { status: 'loading' }
        }));

        try {
            const response = await projectSubmissionService.verifyDocument(docId);
            if (response && response.data && response.data.isAuthentic) {
                setBlockchainVerifications(prev => ({
                    ...prev,
                    [docId]: { status: 'verified', txHash: response.data.txHash }
                }));
            } else {
                setBlockchainVerifications(prev => ({
                    ...prev,
                    [docId]: { status: 'unverified' }
                }));
            }
        } catch (error) {
            // Treat verification error (like document not found on chain) as unverified
            setBlockchainVerifications(prev => ({
                ...prev,
                [docId]: { status: 'unverified' }
            }));
        }
    };

    // Verify a document by ID
    const handleVerifyDocument = async (id, name, txHash) => {
        setVerifyingDocId(id);
        setVerificationDocumentName(name);
        try {
            const res = await projectSubmissionService.verifyDocument(id);
            if (res && res.data) {
                // Ensure txHash is included in verification data if returned or available
                const extendedData = {
                    ...res.data,
                    txHash: txHash || res.data.txHash || res.data.blockchainTxHash
                };
                setVerificationData(extendedData);
                setShowVerificationModal(true);
            } else {
                setSuccessMessage('Không tìm thấy thông tin xác thực cho tài liệu này.');
                setShowSuccessModal(true);
            }
        } catch (error) {
            console.error('Error verifying document:', error);

            // Handle specific case where document is not on blockchain because project is not yet approved
            // Note: error is already normalized by apiClient interceptor and contains { message, errors, statusCode }
            const errorList = error.errors || [];
            const errorMessage = error.message || '';

            const isNotOnBlockchain = errorList.some(e =>
                typeof e === 'string' && e.toLowerCase().includes("not registered on the blockchain")
            ) || errorMessage.toLowerCase().includes("not registered on the blockchain");

            if (isNotOnBlockchain && detailProject?.status !== PROJECT_STATUS.APPROVED) {
                setSuccessMessage("Tài liệu đã được tải lên thành công, chúng tôi sẽ sử dụng Blockchain để xác thực tài liệu của bạn sau khi dự án này được chấp thuận.");
            } else {
                setSuccessMessage('Lỗi xác thực: ' + translateError(error));
            }
            setShowSuccessModal(true);
        } finally {
            setVerifyingDocId(null);
        }
    };

    // Handle drag and drop
    const handleDrop = (e) => {
        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            uploadFile(files[0]);
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            uploadFile(file);
        }
    };

    const parseDueDiligenceTemplateJson = (contentJson) => {
        if (!contentJson || typeof contentJson !== 'string') return null;
        try {
            return JSON.parse(contentJson);
        } catch {
            return JSON.parse(String(contentJson).trim());
        }
    };

    const ensureDueDiligenceTemplateLoaded = async () => {
        if (dueDiligenceTemplateData?.sections?.length > 0) return dueDiligenceTemplateData;
        setIsLoadingDueDiligenceTemplate(true);
        try {
            const response = await projectSubmissionService.getDueDiligenceTemplate();
            const templateData = response?.data;
            const parsed = parseDueDiligenceTemplateJson(templateData?.contentJson);
            if (!parsed || !Array.isArray(parsed.sections)) {
                throw new Error('Mẫu Due Diligence trả về không hợp lệ.');
            }
            setDueDiligenceTemplateData(parsed);
            return parsed;
        } finally {
            setIsLoadingDueDiligenceTemplate(false);
        }
    };

    const handleOpenDueDiligenceFormModal = async () => {
        try {
            await ensureDueDiligenceTemplateLoaded();
            setShowDueDiligenceFormModal(true);
        } catch (error) {
            console.error('Error loading due diligence template for modal:', error);
            setSuccessModalType('error');
            setSuccessTitle('Không thể mở form Due Diligence');
            setSuccessMessage('Lỗi tải mẫu biểu: ' + translateError(error));
            setShowSuccessModal(true);
        }
    };

    const handleGenerateDueDiligencePdfAndUpload = async (file) => {
        if (!detailProject) return;
        const projectId = detailProject.projectId || detailProject.id;
        setIsUploadingDueDiligencePdf(true);
        try {
            const res = await projectSubmissionService.uploadDocument(projectId, file, 'BusinessPlan');
            if (res && (res.success || res.isSuccess)) {
                const responseUrl =
                    res?.data?.fileUrl ||
                    res?.data?.url ||
                    res?.data?.documentUrl ||
                    '';

                setShowDueDiligenceFormModal(false);
                setSuccessModalType('success');
                setSuccessTitle('Nộp Due Diligence thành công');
                setSuccessMessage('Đã xuất PDF và tải lên tài liệu Due Diligence thành công.');
                setShowSuccessModal(true);
                const mappedDocs = await fetchProjectDocuments(projectId);
                const latestBusinessPlan = [...mappedDocs]
                    .filter((d) => String(d.type || '').toLowerCase() === 'businessplan')
                    .sort((a, b) => new Date(b.uploadedAtRaw || 0) - new Date(a.uploadedAtRaw || 0))[0];
                const bestUrl = responseUrl || latestBusinessPlan?.url || '';
                setLastDueDiligenceDocUrl(bestUrl);
            } else {
                throw new Error(res?.message || 'Không thể tải lên PDF Due Diligence.');
            }
        } catch (error) {
            console.error('Error uploading generated due diligence pdf:', error);
            setSuccessModalType('error');
            setSuccessTitle('Không thể tải lên PDF');
            setSuccessMessage('Lỗi tải lên tài liệu Due Diligence: ' + translateError(error));
            setShowSuccessModal(true);
            throw error;
        } finally {
            setIsUploadingDueDiligencePdf(false);
        }
    };

    const uploadFile = async (file) => {
        if (!detailProject) return;

        if (blockedFiles.includes(file.name)) {
            setSuccessModalType('error');
            setSuccessMessage(`Tài liệu "${file.name}" đã từng được xác thực trên Blockchain. Theo quy định, bạn không thể tải lại tài liệu này.`);
            setShowSuccessModal(true);
            return;
        }

        const projectId = detailProject.projectId || detailProject.id;
        setIsUploading(true);
        try {
            const res = await projectSubmissionService.uploadDocument(projectId, file, documentType);
            if (res && (res.success || res.isSuccess)) {
                setSuccessModalType('success');
                setSuccessTitle('Tải lên thành công');
                setSuccessMessage('Tải tài liệu lên thành công.');
                setShowSuccessModal(true);
                fetchProjectDocuments(projectId);
            } else {
                setSuccessModalType('error');
                setSuccessMessage('Lỗi: ' + translateError(res?.message || 'Không thể tải tài liệu lên.'));
                setShowSuccessModal(true);
            }
        } catch (error) {
            console.error('Error uploading document:', error);
            setSuccessModalType('error');
            setSuccessMessage('Lỗi tải lên: ' + translateError(error));
            setShowSuccessModal(true);
        } finally {
            setIsUploading(false);
        }
    };

    const handleDeleteDocument = (doc) => {
        if (detailProject.status !== 'Draft') {
            setSuccessMessage('Bạn chỉ có thể xóa tài liệu khi dự án ở trạng thái Nháp.');
            setShowSuccessModal(true);
            return;
        }
        setDocumentToDelete(doc);
        setShowDeleteConfirm(true);
    };

    const confirmDeleteDocument = async () => {
        if (!documentToDelete) return;

        setIsDeletingDocument(true);
        try {
            const response = await projectSubmissionService.deleteDocument(documentToDelete.id);
            if (response.success || response.isSuccess) {
                // BR-08 Safety: If the deleted document was blockchain verified, block its name/hash from re-upload
                if (documentToDelete.txHash) {
                    setBlockedFiles(prev => [...prev, documentToDelete.name]);
                }

                // Refresh documents list using the comprehensive fetch helper
                // This handles array mapping and non-array responses correctly
                await fetchProjectDocuments(detailProject.projectId || detailProject.id);

                setSuccessModalType('success');
                setSuccessMessage('Xóa tài liệu thành công.');
                setShowSuccessModal(true);

                setShowDeleteConfirm(false);
                setDocumentToDelete(null);
            } else {
                setSuccessMessage('Lỗi khi xóa tài liệu: ' + (response.message || 'Không rõ lỗi.'));
                setShowSuccessModal(true);
            }
        } catch (error) {
            console.error('Error deleting document:', error);
            setSuccessMessage('Đã xảy ra lỗi khi xóa tài liệu.');
            setShowSuccessModal(true);
        } finally {
            setIsDeletingDocument(false);
        }
    };

    // BR-08: Protect Documents on Blockchain
    const handleProtectDocuments = async () => {
        setIsProtectingDocuments(true);
        try {
            // Get files from documents state
            const filesToProtect = documents
                .filter(doc => doc.type && ['pdf', 'docx', 'xlsx'].includes(doc.type))
                .map(doc => new File([new ArrayBuffer()], doc.name, { type: 'application/octet-stream' }));

            if (filesToProtect.length === 0) {
                setSuccessMessage('Vui lòng tải lên ít nhất một tài liệu trước khi bảo vệ trên blockchain');
                setShowSuccessModal(true);
                setIsProtectingDocuments(false);
                return;
            }

            const result = await BlockchainService.protectDocumentsOnBlockchain(filesToProtect, project.id);

            if (result.success) {
                // Update project with blockchain info
                const updatedProject = {
                    ...project,
                    blockchainHash: result.blockchainHash,
                    transactionHash: result.transactionHash,
                    ipProtectionDate: result.timestamp,
                    status: PROJECT_STATUS.IP_PROTECTED
                };
                setProject(updatedProject);
                setBlockchainProof(BlockchainService.getBlockchainProof(updatedProject));

                setSuccessMessage('Tài liệu đã được bảo vệ trên blockchain thành công!');
                setShowSuccessModal(true);

                // Auto-trigger AI Evaluation (BR-10)
                setTimeout(() => handleAIEvaluation(updatedProject), 1500);
            } else {
                setSuccessMessage('Không thể bảo vệ tài liệu: ' + result.error);
                setShowSuccessModal(true);
            }
        } catch (error) {
            console.error('Protection error:', error);
            setSuccessMessage('Lỗi bảo vệ tài liệu: ' + error.message);
            setShowSuccessModal(true);
        } finally {
            setIsProtectingDocuments(false);
        }
    };

    // BR-10: Trigger AI Evaluation
    const handleAIEvaluation = async (projectData) => {
        if (!isApproved) {
            showRestrictedActionModal('đánh giá AI');
            return;
        }
        setIsEvaluatingAI(true);
        try {
            // The AI Evaluation flow
            setEvaluatingProjectId(projectData.id);
            const response = await projectSubmissionService.triggerAIAnalysis(projectData.id);

            if (response.success) {
                // Fetch the new result
                const aiResponse = await projectSubmissionService.getAIAnalysisResults(projectData.id);
                if (aiResponse.success) {
                    const aiResultData = aiResponse.data;
                    const updatedProject = {
                        ...projectData,
                        aiEvaluation: aiResultData || { startupScore: 85, scoreCategory: 'Excellent' } // Fallback display if not properly formatted yet
                    };
                    setProject(updatedProject);

                    setSuccessMessage('Đánh giá AI hoàn thành.');
                    setShowSuccessModal(true);
                } else {
                    console.error('Could not fetch AI results after generation:', aiResponse);
                    setSuccessMessage('Đánh giá AI đã hoàn thành nhưng không thể lấy kết quả.');
                    setShowSuccessModal(true);
                }
            } else {
                console.error('AI Evaluation error:', response);
                setSuccessMessage('Đánh giá AI thất bại: ' + translateError(response.message));
                setShowSuccessModal(true);
            }
        } catch (error) {
            console.error('AI evaluation error:', error);
            setSuccessMessage('Không thể thực hiện đánh giá AI do lỗi hệ thống.');
            setShowSuccessModal(true);
        } finally {
            setIsEvaluatingAI(false);
            setEvaluatingProjectId(null);
        }
    };

    /**
     * Check if project is eligible for booking (approved and in project-options)
     */
    const fetchBookingEligibility = async (projectId, status) => {
        if (!projectId) return;
        setIsCheckingBookingEligibility(true);
        setCanBookDetailProject(false);
        setDetailProjectAdvisors([]);

        try {
            // 1. Get project options to check if this project can be booked
            const projectOptions = await bookingService.getProjectOptions();
            const projectIds = Array.isArray(projectOptions)
                ? projectOptions.map(p => p.projectId)
                : (projectOptions?.items?.map(p => p.projectId) || []);

            const isEligible = projectIds.includes(Number(projectId));
            setCanBookDetailProject(isEligible);

            // 2. Conditional API selection based on project status
            // If Draft: Use bookingService.getAdvisorOptions
            // Otherwise: Use projectAssignmentService.getAssignedAdvisorsByProject
            let advisors = [];
            if (status === 'Draft') {
                advisors = await bookingService.getAdvisorOptions(projectId);
            } else {
                advisors = await projectAssignmentService.getAssignedAdvisorsByProject(projectId);
            }

            setDetailProjectAdvisors(Array.isArray(advisors) ? advisors : []);

        } catch (error) {
            console.error('Error checking booking eligibility:', error);
        } finally {
            setIsCheckingBookingEligibility(false);
        }
    };

    /**
     * Enhanced opener for project detail modal
     */
    const handleOpenProjectDetail = async (p) => {
        const pId = p.id || p.projectId;
        // Set basic info immediately for quick UI response
        setDetailProject(p);
        setModalRefreshKey(Date.now());
        setShowDetailModal(true);

        // Refresh analysis history and booking eligibility (which includes assigned advisors)
        fetchAnalysisHistory(pId);
        fetchBookingEligibility(pId, p.status);

        // Fetch full fresh project data to ensure all metadata is current
        try {
            const freshProject = await projectSubmissionService.getProjectById(pId);
            if (freshProject && (freshProject.success || freshProject.data)) {
                setDetailProject(freshProject.data || freshProject);
            }
        } catch (err) {
            console.error("Error refreshing project detail:", err);
        }
    };

    // BR-15: Submit Project for Staff Review (WITHOUT AI - Direct submission)
    const handleSubmitProject = async (projectId) => {
        if (!isApproved) {
            showRestrictedActionModal('nộp dự án');
            return;
        }

        if (!projectId) {
            console.error('[SUBMIT] Invalid projectId:', projectId);
            setSuccessMessage('Lỗi: Không tìm thấy ID dự án');
            setSuccessModalType('error');
            setShowSuccessModal(true);
            return;
        }

        const validId = projectId ? parseInt(projectId) || projectId : null;

        // Show loading state while checking requirements
        setIsSubmittingProject(true);
        setSubmittingProjectId(validId);
        try {
            // Check if project has at least one document (PitchDeck, BusinessPlan, etc.)
            const docResponse = await projectSubmissionService.getDocuments(validId);
            const projectDocs = Array.isArray(docResponse.data) ? docResponse.data : (docResponse.data?.items || []);

            if (projectDocs.length === 0) {
                setSuccessModalType('error');
                setSuccessTitle('Yêu cầu tài liệu');
                setSuccessMessage('Vui lòng tải lên ít nhất một tài liệu (Pitch Deck, Kế hoạch kinh doanh,...) trong phần Chi tiết dự án trước khi nộp để đội ngũ có thể xem xét.');
                setShowSuccessModal(true);
                return;
            }

            // If has documents, proceed to confirmation modal
            setPendingSubmitProjectId(validId);
            setShowSubmitConfirmation(true);
        } catch (error) {
            console.error('[SUBMIT] Error checking documents:', error);
            setSuccessModalType('error');
            setSuccessMessage('Đã xảy ra lỗi khi kiểm tra tài liệu dự án. Vui lòng thử lại.');
            setShowSuccessModal(true);
        } finally {
            setIsSubmittingProject(false);
            setSubmittingProjectId(null);
        }
    };

    // Handle confirm from confirmation modal - DIRECT SUBMISSION (No AI)
    const handleConfirmSubmit = async () => {
        if (!pendingSubmitProjectId) {
            console.error('[SUBMIT] No project ID provided');
            setSuccessMessage('Lỗi: Không có ID dự án được lưu');
            setSuccessModalType('error');
            setShowSuccessModal(true);
            return;
        }

        const projectId = parseInt(pendingSubmitProjectId) || pendingSubmitProjectId;
        console.log('[SUBMIT] Submitting project directly:', projectId);

        setShowSubmitConfirmation(false);
        setIsSubmittingProject(true);
        setSubmittingProjectId(projectId);

        try {
            const res = await projectSubmissionService.submitProject(projectId);
            if (res && (res.success || res.isSuccess)) {
                setSuccessMessage('Dự án đã được nộp thành công! Đội ngũ của chúng tôi sẽ xem xét trong vòng 2-3 ngày làm việc.');
                setSuccessModalType('success');
                setShowSuccessModal(true);

                // Refresh data
                const response = await projectSubmissionService.getMyProjects();
                if (response.success && response.data) {
                    let projects = Array.isArray(response.data) ? response.data : (response.data.items || []);
                    // Sort projects by CreatedAt descending (most recent first) with ID fallback
                    projects = [...projects].sort((a, b) => {
                        const dateDifference = new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
                        if (dateDifference !== 0) return dateDifference;
                        return (b.id || b.projectId || 0) - (a.id || a.projectId || 0);
                    });
                    setMyProjects(projects);

                    if (detailProject && (detailProject.id === projectId || detailProject.projectId === projectId)) {
                        const updated = projects.find(p => (p.id || p.projectId) === projectId);
                        if (updated) setDetailProject(updated);
                    }
                }
            } else {
                setSuccessModalType('error');
                setSuccessMessage('Lỗi: ' + translateError(res?.message || 'Không thể nộp dự án.'));
                setShowSuccessModal(true);
            }
        } catch (error) {
            console.error('Error submitting project:', error);
            setSuccessModalType('error');
            setSuccessMessage('Lỗi khi nộp dự án: ' + translateError(error));
            setShowSuccessModal(true);
        } finally {
            setIsSubmittingProject(false);
            setSubmittingProjectId(null);
            setPendingSubmitProjectId(null);
        }
    };

    // PREMIUM FEATURE: Run AI Evaluation separately
    const handleRunAIEvaluation = (projectId) => {
        if (!isApproved) {
            showRestrictedActionModal('phân tích AI');
            return;
        }

        if (!projectId) {
            console.error('[AI] Invalid projectId:', projectId);
            setSuccessMessage('Lỗi: Không tìm thấy ID dự án');
            setSuccessModalType('error');
            setShowSuccessModal(true);
            return;
        }

        // Phase 1: Show confirmation modal first
        setTargetProjectIdForAI(projectId);
        setShowAIAnalyzeConfirm(true);
    };

    const handleConfirmAIAnalyze = async () => {
        if (!isApproved) {
            showRestrictedActionModal('phân tích AI');
            return;
        }
        const validId = parseInt(targetProjectIdForAI) || targetProjectIdForAI;
        console.log('[AI] Running AI Evaluation for projectId:', validId);

        setShowAIAnalyzeConfirm(false);
        setIsEvaluatingAI(true);
        setEvaluatingProjectId(validId);
        setAiEvaluationError(null);
        setShowAIEvaluationModal(true);

        try {
            // Call AI evaluate API (New endpoint)
            const evaluationRes = await AIEvaluationService.evaluateProjectAPI(validId);

            console.log('[AI] API response received:', {
                success: evaluationRes?.success
            });

            // Translate results to Vietnamese
            const { analysisResult: translatedAnalysis, eligibilityResult: translatedEligibility } = translateAIResults(evaluationRes, evaluationRes);

            // Store results
            setAIEvaluationResult({
                projectId: validId,
                analysis: translatedAnalysis?.data || evaluationRes.data,
                eligibility: translatedEligibility?.data || evaluationRes.data
            });

            // Refresh subscription data after using a quota point
            fetchSubscriptionData();

            // Refresh AI history to show the new result in the detail view
            fetchAnalysisHistory(validId);

            // Also refresh projects to show updated status/score if any
            const response = await projectSubmissionService.getMyProjects();
            if (response.success && response.data) {
                const projects = Array.isArray(response.data) ? response.data : (response.data.items || []);
                // Sort projects by CreatedAt descending (most recent first) with ID fallback
                const sorted = [...projects].sort((a, b) => {
                    const dateDifference = new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
                    if (dateDifference !== 0) return dateDifference;
                    return (b.id || b.projectId || 0) - (a.id || a.projectId || 0);
                });
                setMyProjects(sorted);
            }
        } catch (error) {
            console.error('[AI] Error evaluating project:', error);
            setAiEvaluationError(error.message || 'Không thể đánh giá dự án. Vui lòng thử lại.');
        } finally {
            setIsEvaluatingAI(false);
            setEvaluatingProjectId(null);
            setTargetProjectIdForAI(null);
        }
    };

    // Save AI Evaluation results to database
    const handleSaveAIResults = async () => {
        if (!aiEvaluationResult) return;

        try {
            // TODO: API call to save results
            // const response = await AIEvaluationService.saveAIResults(aiEvaluationResult);

            setSuccessModalType('success');
            setSuccessMessage('Kết quả chấm điểm AI đã được lưu thành công!');
            setShowSuccessModal(true);

            setShowAIEvaluationModal(false);
            setAIEvaluationResult(null);
        } catch (error) {
            console.error('Error saving AI results:', error);
            setSuccessModalType('error');
            setSuccessMessage('Lỗi khi lưu kết quả: ' + translateError(error));
            setShowSuccessModal(true);
        }
    };

    // Handle cancel AI Evaluation - just close modal
    const handleCancelAIEvaluation = () => {
        setShowAIEvaluationModal(false);
        setAIEvaluationResult(null);
        setAiEvaluationError(null);
    };

    // BR-19: Publish Project
    const handlePublishProject = async () => {
        // Check all publication prerequisites (BR-19)
        const checklist = ProjectValidationService.getPublicationChecklist(project);

        if (!checklist.canPublish) {
            const remaining = checklist.remainingItems.join(', ');
            setSuccessMessage(`Chưa thể đăng dự án. Còn thiếu: ${remaining}`);
            setShowSuccessModal(true);
            return;
        }

        setIsPublishingProject(true);
        try {
            const updatedProject = {
                ...project,
                status: PROJECT_STATUS.PUBLISHED,
                isPublished: true
            };
            setProject(updatedProject);

            setSuccessMessage('Chúc mừng!\n\nDự án của bạn đã được đăng và hiển thị với nhà đầu tư và cố vấn!');
            setShowSuccessModal(true);
        } catch (error) {
            alert('Lỗi khi đăng dự án: ' + error.message);
        } finally {
            setIsPublishingProject(false);
        }
    };

    // BR-18: Resubmit After Rejection
    const handleResubmitProject = () => {
        setIsSubmittingProject(true);
        try {
            const updatedProject = {
                ...project,
                status: PROJECT_STATUS.SUBMITTED,
                submittedDate: (() => {
                    const d = new Date();
                    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                })(),
                feedback: null
            };
            setProject(updatedProject);

            setSuccessMessage('Dự án đã được nộp lại để xem xét!');
            setShowSuccessModal(true);
        } catch (error) {
            alert('Lỗi khi nộp lại dự án: ' + error.message);
        } finally {
            setIsSubmittingProject(false);
        }
    };

    return (
        <div className={styles.container} style={activeSection === 'pr_news' ? { minHeight: 'auto' } : {}}>

            {!activeSection.startsWith('project_') && activeSection !== 'pr_news' && (
                <>
                    {/* Unified Header */}
                    {(() => {
                        const header = getSectionHeader(activeSection, user);
                        return (
                            <FeedHeader
                                title={header.title}
                                subtitle={header.subtitle}
                                showFilter={false}
                                user={user}
                                onOpenChat={(chatSessionId) => {
                                    setActiveChatSession({
                                        chatSessionId,
                                        displayName: 'Investor',
                                        currentUserId: user?.userId,
                                        sentTime: new Date().toISOString(),
                                    });
                                }}
                                onNotificationNavigate={onNotificationNavigate}
                                onShowProjectForm={() => {
                                    if (!isApproved) {
                                        showRestrictedActionModal('đăng dự án mới');
                                        return;
                                    }
                                    setDetailProject(null);
                                    setShowProjectForm(true);
                                }}
                            />
                        );
                    })()}

                    {/* Global Banner Removed - Now moved into individual sections below filters */}


                    {/* Navigation Tabs List */}
                    {activeSection !== 'account_profile' && activeSection !== 'complete-info' && (
                        <div className={styles.tabSwitcherWrapper}>
                            {isMobile && showLeftTabIndicator && <div className={`${styles.scrollIndicator} ${styles.scrollIndicatorLeft}`} />}

                            <div
                                className={`${styles.tabs} ${styles.animatedTabs}`}
                                ref={tabsRef}
                                onScroll={checkTabScroll}
                            >
                                <button
                                    className={`${styles.tab} ${activeSection === 'my-projects' ? styles.active : ''}`}
                                    onClick={() => setActiveSection('my-projects')}
                                >
                                    Dự án của tôi
                                </button>
                                <button
                                    className={`${styles.tab} ${activeSection === 'bookings' ? styles.active : ''}`}
                                    onClick={() => setActiveSection('bookings')}
                                >
                                    Lịch tư vấn
                                </button>
                                <button
                                    className={`${styles.tab} ${activeSection === 'deals' ? styles.active : ''}`}
                                    onClick={() => setActiveSection('deals')}
                                >
                                    Đầu tư
                                </button>
                                <button
                                    className={`${styles.tab} ${activeSection === 'connection-requests' ? styles.active : ''}`}
                                    onClick={() => setActiveSection('connection-requests')}
                                >
                                    Yêu cầu thông tin
                                </button>
                                {/* Animated Indicator Line */}
                                <div className={styles.tabIndicator} style={indicatorStyle} />
                            </div>
                            {isMobile && showRightTabIndicator && <div className={`${styles.scrollIndicator} ${styles.scrollIndicatorRight}`} />}
                        </div>
                    )}
                </>
            )}

            {profileReady && startupProfileStatus && startupProfileStatus.toUpperCase() !== 'APPROVED' &&
                !activeSection.startsWith('project_') && activeSection !== 'pr_news' && (
                    <div style={{ padding: '0', marginBottom: '0', width: '100%' }}>
                        <StartupProfileBanner
                            status={startupProfileStatus}
                            approvalStatus={displayProfile?.approvalStatus}
                            reason={displayProfile?.rejectionReason}
                            onRedirect={activeSection === 'complete-info' ? null : () => setActiveSection('complete-info')}
                        />
                    </div>
                )}

            {activeSection !== 'pr_news' && (
                <div className={`${activeSection.startsWith('project_') ? styles.contentFull : styles.content} ${styles.scrollableSection}`}>

                    {/* Startup Profile Form (Section View) */}
                    {activeSection === 'complete-info' && (
                        <div className={styles.section}>
                            {(profileLoading || (isLoadingInitialData && !displayProfile)) ? (
                                // Show skeleton while profile data is loading to prevent empty form flash
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '8px 0' }}>
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className={kanban.skeletonCard} style={{ height: i === 1 ? '220px' : '160px', borderRadius: '16px' }}>
                                            <div className={kanban.shimmer}></div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <StartupProfileForm
                                    initialData={displayProfile}
                                    user={user}
                                    onSuccess={(data) => {
                                        setStartupProfile(data);
                                        refreshProfile(); // Sync global state
                                        setSuccessMessage('Cập nhật thông tin startup thành công!');
                                        setShowSuccessModal(true);
                                    }}
                                />
                            )}
                        </div>
                    )}

                    {/* My Projects Section - Standardized Grid */}
                    {activeSection === 'my-projects' && (
                        <DashboardSection
                            title="Dự án của tôi"
                            topBarExtra={null}
                            filterBar={
                                <DashboardStatusFilter
                                    options={projectFilterOptions}
                                    counts={getProjectCounts()}
                                    activeFilter={projectFilter}
                                    onFilterChange={setProjectFilter}
                                />
                            }
                        >
                            {dashboardError ? (
                                <div className={styles.card} style={{ padding: '40px', textAlign: 'center', border: '1px solid #fee2e2', backgroundColor: 'rgba(239, 68, 68, 0.05)' }}>
                                    <AlertCircle size={48} style={{ margin: '0 auto 16px', color: '#ef4444' }} />
                                    <h3 style={{ margin: '0 0 8px 0', color: 'var(--text-primary)' }}>Lỗi tải dữ liệu</h3>
                                    <p style={{ margin: '0 0 24px 0', color: 'var(--text-secondary)' }}>{dashboardError}</p>
                                    <button
                                        onClick={handleRetryDashboard}
                                        style={{ padding: '8px 24px', backgroundColor: 'var(--primary-blue)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}
                                    >
                                        Thử lại
                                    </button>
                                </div>
                            ) : isLoadingInitialData ? (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
                                    {[1, 2, 3, 4].map(i => (
                                        <div key={i} className={kanban.skeletonCard} style={{ height: '180px' }}><div className={kanban.shimmer}></div></div>
                                    ))}
                                </div>
                            ) : (
                                <>
                                    {filteredProjects.length === 0 ? (
                                        <div className={styles.card} style={{ padding: '40px', textAlign: 'center' }}>
                                            <RefreshCw size={48} style={{ margin: '0 auto 16px', color: 'var(--text-secondary)', opacity: 0.5 }} />
                                            <h3 style={{ margin: '0 0 8px 0', color: 'var(--text-primary)' }}>Không tìm thấy dự án</h3>
                                            <p style={{ margin: 0, color: 'var(--text-secondary)' }}>{projectSearchTerm ? 'Thử tìm kiếm với từ khóa khác.' : 'Bắt đầu bằng cách tạo dự án mới.'}</p>
                                        </div>
                                    ) : (
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
                                            {filteredProjects.map(p => {
                                                // Determine color based on status
                                                let statusColor = '#94a3b8'; // default slate for draft
                                                if (['Pending', 'Submitted'].includes(p.status)) statusColor = '#f59e0b'; // amber
                                                else if (['Approved', 'Published'].includes(p.status)) statusColor = '#10b981'; // emerald
                                                else if (p.status === 'Rejected') statusColor = '#ef4444'; // rose
                                                else if (p.status === 'IpProtected') statusColor = '#8b5cf6'; // violet

                                                return (
                                                    <div
                                                        id={`project-${p.id || p.projectId}`}
                                                        key={p.id || p.projectId}
                                                        className={`${kanban.bcard} ${String(targetId) === String(p.id || p.projectId) ? styles.targetHighlight : ''}`}
                                                        style={{
                                                            margin: 0,
                                                            height: '100%',
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            borderLeft: `4px solid ${statusColor}`,
                                                            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                                                            transition: 'all 0.3s ease'
                                                        }}
                                                        onMouseEnter={(e) => {
                                                            e.currentTarget.style.boxShadow = `0 8px 24px ${statusColor}25`;
                                                            e.currentTarget.style.transform = 'translateY(-2px)';
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
                                                            e.currentTarget.style.transform = 'translateY(0)';
                                                        }}
                                                    >
                                                        <div className={kanban.bcardBody} style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                                            <div className={kanban.bcardRow1}>
                                                                <div className={kanban.bcardMainInfo}>
                                                                    <div className={kanban.bcardName} title={p.name || p.projectName}>
                                                                        {p.name || p.projectName}
                                                                    </div>
                                                                    <span className={`${kanban.btag} ${String(p.stageOptionId || p.StageOptionId || p.developmentStage || p.DevelopmentStage).toLowerCase().includes('mvp') || p.developmentStage === 'MVP' || p.DevelopmentStage === 'MVP' ? kanban.btagMvp : String(p.stageOptionId || p.StageOptionId || p.developmentStage || p.DevelopmentStage).toLowerCase().includes('idea') || p.developmentStage === 'Idea' || p.DevelopmentStage === 'Idea' ? kanban.btagIdea : kanban.btagGrowth}`}>
                                                                        {getStageLabel(p.stageOptionId || p.StageOptionId || p.developmentStage || p.DevelopmentStage, stages)}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <p className={kanban.bcardDesc} style={{ flex: 1 }}>{p.shortDescription || p.description}</p>

                                                            {p.status === 'Rejected' && p.rejectionReason && (
                                                                <div style={{ padding: '10px', background: 'rgba(244, 33, 46, 0.05)', borderRadius: '10px', border: '1px solid rgba(244, 33, 46, 0.1)', marginBottom: '12px' }}>
                                                                    <div style={{ fontSize: '11px', color: '#f4212e', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                                                                        <AlertCircle size={14} /> Lý do từ chối
                                                                    </div>
                                                                    <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>{p.rejectionReason}</p>
                                                                </div>
                                                            )}

                                                            <div className={kanban.bcardActions} style={{ marginTop: 'auto' }}>
                                                                {p.status === 'Draft' ? (
                                                                    <>
                                                                        <button
                                                                            className={kanban.baBtn}
                                                                            style={{ color: '#f59e0b', borderColor: 'rgba(245, 158, 11, 0.2)', background: 'rgba(245, 158, 11, 0.05)' }}
                                                                            onClick={() => handleRunAIEvaluation(p.id || p.projectId)}
                                                                            disabled={isEvaluatingAI && evaluatingProjectId === (p.id || p.projectId)}
                                                                            title="Phân tích AI"
                                                                        >
                                                                            <Sparkles size={16} />
                                                                        </button>
                                                                        <button
                                                                            className={`${kanban.baBtn} ${kanban.apr}`}
                                                                            onClick={() => {
                                                                                setPendingSubmitProjectId(p.id || p.projectId);
                                                                                setShowSubmitConfirmation(true);
                                                                            }}
                                                                            disabled={isSubmittingProject && submittingProjectId === (p.id || p.projectId)}
                                                                            title="Nộp dự án"
                                                                        >
                                                                            <Send size={16} />
                                                                        </button>
                                                                        <button
                                                                            className={kanban.baBtn}
                                                                            onClick={() => {
                                                                                handleOpenProjectDetail(p);
                                                                            }}
                                                                            title="Chi tiết dự án"
                                                                        >
                                                                            <ArrowRight size={16} />
                                                                        </button>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        {(p.status === 'IpProtected') && (
                                                                            <button
                                                                                className={`${kanban.baBtn} ${kanban.apr}`}
                                                                                onClick={() => {
                                                                                    setPendingSubmitProjectId(p.id || p.projectId);
                                                                                    setShowSubmitConfirmation(true);
                                                                                }}
                                                                                disabled={isSubmittingProject && submittingProjectId === (p.id || p.projectId)}
                                                                                title="Nộp dự án"
                                                                            >
                                                                                <Send size={16} /> Nộp
                                                                            </button>
                                                                        )}
                                                                        <button
                                                                            className={kanban.baBtn}
                                                                            onClick={() => {
                                                                                handleOpenProjectDetail(p);
                                                                            }}
                                                                            title="Chi tiết dự án"
                                                                        >
                                                                            Chi tiết <ArrowRight size={16} />
                                                                        </button>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </>
                            )}
                        </DashboardSection>
                    )}


                    {/* Connection Requests Section - Investor inquiries */}
                    {activeSection === 'connection-requests' && (
                        <DashboardSection
                            title="Yêu cầu thông tin"
                            topBarExtra={
                                <div className={styles.searchWrapper} style={{ position: 'relative', width: isMobile ? '100%' : '300px' }}>
                                    <Search className={styles.searchIcon} size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                                    <input
                                        type="text"
                                        placeholder="Tìm kiếm yêu cầu..."
                                        className={styles.searchInput}
                                        value={connectionSearchTerm}
                                        onChange={(e) => setConnectionSearchTerm(e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '10px 12px 10px 36px',
                                            borderRadius: '9999px',
                                            border: '1px solid rgba(29, 155, 240, 0.4)',
                                            background: 'var(--bg-primary)',
                                            fontSize: '13px',
                                            color: 'var(--text-primary)',
                                            outline: 'none',
                                            transition: 'all 0.2s ease',
                                        }}
                                    />
                                </div>
                            }
                            filterBar={
                                <DashboardStatusFilter
                                    options={connectionFilterOptions}
                                    counts={getConnectionCounts()}
                                    activeFilter={connectionFilter}
                                    onFilterChange={setConnectionFilter}
                                />
                            }
                        >
                            {/* Loading State */}
                            {isLoadingRequests && (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className={kanban.skeletonCard} style={{ height: '180px' }}><div className={kanban.shimmer}></div></div>
                                    ))}
                                </div>
                            )}

                            {/* Empty State */}
                            {!isLoadingRequests && filteredConnections.length === 0 && (
                                <div className={styles.card} style={{ padding: '40px', textAlign: 'center' }}>
                                    <Users size={48} style={{ margin: '0 auto 16px', color: 'var(--text-secondary)', opacity: 0.5 }} />
                                    <h3 style={{ margin: '0 0 8px 0', color: 'var(--text-primary)' }}>Không tìm thấy yêu cầu</h3>
                                    <p style={{ margin: 0, color: 'var(--text-secondary)' }}>{connectionSearchTerm ? 'Thử tìm kiếm với từ khóa khác.' : 'Khi nhà đầu tư gửi yêu cầu thông tin, chúng sẽ xuất hiện ở đây.'}</p>
                                </div>
                            )}

                            {/* Requests Grid */}
                            {!isLoadingRequests && filteredConnections.length > 0 && (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
                                    {filteredConnections.map(request => {
                                        const statusConfig = {
                                            'pending': { label: 'Chờ xử lý', color: '#f59e0b' },
                                            'accepted': { label: 'Đã chấp nhận', color: '#10b981' },
                                            'rejected': { label: 'Đã từ chối', color: '#ef4444' }
                                        };
                                        const statusInfo = statusConfig[request.status] || { label: 'Không xác định', color: '#64748b' };

                                        return (
                                            <div
                                                id={`connection-${request.connectionRequestId}`}
                                                key={request.connectionRequestId}
                                                className={`${styles.card} ${String(targetId) === String(request.connectionRequestId) ? styles.targetHighlight : ''}`}
                                                style={{
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: '12px',
                                                    borderLeft: '4px solid ' + statusInfo.color,
                                                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                                                    transition: 'all 0.3s ease'
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.boxShadow = `0 8px 24px ${statusInfo.color}25`;
                                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
                                                    e.currentTarget.style.transform = 'translateY(0)';
                                                }}
                                            >
                                                {/* Header */}
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                    <div style={{ flex: 1 }}>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleOpenInvestorProfile(request)}
                                                            style={{ margin: '0 0 4px 0', border: 'none', background: 'transparent', padding: 0, display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
                                                        >
                                                            {request.investorAvatarUrl ? (
                                                                <img
                                                                    src={request.investorAvatarUrl}
                                                                    alt={request.investorName || 'Nhà đầu tư'}
                                                                    style={{ width: '28px', height: '28px', borderRadius: '999px', objectFit: 'cover', border: '1px solid var(--border-color)' }}
                                                                />
                                                            ) : (
                                                                <div style={{ width: '28px', height: '28px', borderRadius: '999px', background: 'rgba(29,155,240,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-blue)', fontWeight: 800, fontSize: '12px' }}>
                                                                    {(request.investorName || 'N').charAt(0).toUpperCase()}
                                                                </div>
                                                            )}
                                                            <span style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-primary)' }}>
                                                                {request.investorName || 'Nhà đầu tư'}
                                                            </span>
                                                        </button>
                                                        <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)' }}>
                                                            ID: #{request.connectionRequestId}
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

                                                {/* Investor Info */}
                                                <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '12px', borderRadius: '6px' }}>
                                                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                                                        <strong>Thông tin</strong>
                                                    </div>
                                                    <div style={{ fontSize: '13px', color: 'var(--text-primary)' }}>
                                                        Yêu cầu thông tin từ nhà đầu tư
                                                    </div>
                                                </div>

                                                {/* Details */}
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                                    {request.sentDate && (
                                                        <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '10px', borderRadius: '6px' }}>
                                                            <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '2px' }}>Ngày gửi</div>
                                                            <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>
                                                                {request.sentDate}
                                                            </div>
                                                        </div>
                                                    )}
                                                    {request.status === 'accepted' && (
                                                        <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: '10px', borderRadius: '6px' }}>
                                                            <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '2px' }}>Trạng thái</div>
                                                            <div style={{ fontSize: '13px', fontWeight: '700', color: '#10b981' }}>
                                                                ✓ Đã chấp nhận
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Message (if available) */}
                                                {request.message && (
                                                    <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '12px', borderRadius: '6px', fontSize: '12px', color: 'var(--text-secondary)', fontStyle: 'italic', borderLeft: '3px solid var(--primary-blue)' }}>
                                                        💬 {request.message}
                                                    </div>
                                                )}

                                                {/* Actions */}
                                                <div style={{ display: 'flex', gap: '8px', marginTop: 'auto', flexWrap: 'wrap' }}>
                                                    {request.status === 'pending' && (
                                                        <>
                                                            <button
                                                                style={{
                                                                    flex: 1,
                                                                    padding: '8px 12px',
                                                                    backgroundColor: '#0ea5e9',
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
                                                                    opacity: isRespondingToRequest === request.connectionRequestId ? 0.7 : 1
                                                                }}
                                                                onClick={() => handleApproveConnectionRequest(request.connectionRequestId)}
                                                                disabled={isRespondingToRequest === request.connectionRequestId}
                                                            >
                                                                {isRespondingToRequest === request.connectionRequestId ? (
                                                                    <>
                                                                        <Loader2 size={12} className={styles.spinner} />
                                                                        Xử lý...
                                                                    </>
                                                                ) : (
                                                                    <>✓ Chấp nhận</>
                                                                )}
                                                            </button>
                                                            <button
                                                                style={{
                                                                    flex: 1,
                                                                    padding: '8px 12px',
                                                                    backgroundColor: '#cbd5e1',
                                                                    color: '#475569',
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
                                                                    opacity: isRespondingToRequest === request.connectionRequestId ? 0.7 : 1
                                                                }}
                                                                onClick={() => handleRejectConnectionRequest(request.connectionRequestId)}
                                                                disabled={isRespondingToRequest === request.connectionRequestId}
                                                            >
                                                                {isRespondingToRequest === request.connectionRequestId ? (
                                                                    <>
                                                                        <Loader2 size={12} className={styles.spinner} />
                                                                        Xử lý...
                                                                    </>
                                                                ) : (
                                                                    <>✗ Từ chối</>
                                                                )}
                                                            </button>
                                                        </>
                                                    )}

                                                    {request.status === 'accepted' && (
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
                                                                transition: 'all 0.2s'
                                                            }}
                                                            onClick={() => handleStartChat(request.connectionRequestId)}
                                                        >
                                                            <MessageSquare size={12} />
                                                            Bắt đầu chat
                                                        </button>
                                                    )}

                                                    {request.status === 'rejected' && (
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
                                                                cursor: 'default'
                                                            }}
                                                        >
                                                            ✗ Đã từ chối
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </DashboardSection>
                    )}


                    {/* Bookings Section */}
                    {activeSection === 'bookings' && (
                        <StartupBookings
                            user={user}
                            onViewProject={(pid) => setActiveSection('project_' + pid)}
                            initialFilterStatus={lastBookingFilter}
                            onFilterStatusChange={setLastBookingFilter}
                            isApproved={isApproved}
                            onRestrictedAction={showRestrictedActionModal}
                        />
                    )}

                    {activeSection === 'account_profile' && (
                        <AccountProfileTab
                            user={user}
                            onLogout={onLogout}
                        />
                    )}

                    {activeSection.startsWith('project_') && (
                        <ProjectDetailView
                            projectId={activeSection.split('_')[1]}
                            onBack={() => setActiveSection('bookings')}
                            user={user}
                            isFullView={true}
                            isStartupApproved={isApproved}
                            onRestrictedAction={showRestrictedActionModal}
                        />
                    )}

                    {/* Deals Approval Section */}
                    {activeSection === 'deals' && (
                        <DashboardSection
                            title="Thỏa thuận đầu tư"
                            topBarExtra={
                                <div className={styles.searchWrapper} style={{ position: 'relative', width: isMobile ? '100%' : '300px' }}>
                                    <Search className={styles.searchIcon} size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                                    <input
                                        type="text"
                                        placeholder="Tìm kiếm thỏa thuận..."
                                        className={styles.searchInput}
                                        value={dealSearchTerm}
                                        onChange={(e) => setDealSearchTerm(e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '10px 12px 10px 36px',
                                            borderRadius: '9999px',
                                            border: '1px solid rgba(29, 155, 240, 0.4)',
                                            background: 'var(--bg-primary)',
                                            fontSize: '13px',
                                            color: 'var(--text-primary)',
                                            outline: 'none',
                                            transition: 'all 0.2s ease',
                                        }}
                                    />
                                </div>
                            }
                            filterBar={
                                < DashboardStatusFilter
                                    options={dealFilterOptions}
                                    counts={getDealCounts()}
                                    activeFilter={dealFilter}
                                    onFilterChange={setDealFilter}
                                />
                            }
                        >
                            {/* Loading State */}
                            {isLoadingDeals && (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className={kanban.skeletonCard} style={{ height: '180px' }}><div className={kanban.shimmer}></div></div>
                                    ))}
                                </div>
                            )}

                            {/* Empty State */}
                            {!isLoadingDeals && filteredDeals.length === 0 && (
                                <div className={styles.card} style={{ padding: '40px', textAlign: 'center' }}>
                                    <DollarSign size={48} style={{ margin: '0 auto 16px', color: 'var(--text-secondary)', opacity: 0.5 }} />
                                    <h3 style={{ margin: '0 0 8px 0', color: 'var(--text-primary)' }}>Không tìm thấy thỏa thuận</h3>
                                    <p style={{ margin: 0, color: 'var(--text-secondary)' }}>{dealSearchTerm ? 'Thử tìm kiếm với từ khóa khác.' : 'Khi có nhà đầu tư gửi đề nghị, danh sách sẽ xuất hiện ở đây.'}</p>
                                </div>
                            )}

                            {/* Deals Grid */}
                            {!isLoadingDeals && filteredDeals.length > 0 && (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
                                    {filteredDeals.map(deal => {
                                        const statusInfo = getDealStatusInfo(deal.status);
                                        const isCompletedDeal = statusInfo.value === 4 || deal.isCompleted === true;

                                        return (
                                            <div
                                                id={`deal-${deal.dealId}`}
                                                key={deal.dealId}
                                                className={`${styles.card} ${String(targetId) === String(deal.dealId) ? styles.targetHighlight : ''}`}
                                                style={{
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: '12px',
                                                    borderLeft: `4px solid ${statusInfo.color}`,
                                                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                                                    transition: 'all 0.3s ease'
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.boxShadow = `0 8px 24px ${statusInfo.color}25`;
                                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
                                                    e.currentTarget.style.transform = 'translateY(0)';
                                                }}
                                            >
                                                {/* Deal Header */}
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                    <div style={{ flex: 1 }}>
                                                        <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', fontWeight: '800', color: 'var(--text-primary)' }}>
                                                            {deal.projectName || 'Dự án không tên'}
                                                        </h4>
                                                        <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)' }}>
                                                            {deal.investorName || 'Nhà đầu tư'}
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

                                                {/* Investor Info */}
                                                <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '12px', borderRadius: '6px' }}>
                                                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                                                        <strong>Nhà đầu tư</strong>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleOpenInvestorProfile(deal)}
                                                        style={{ border: 'none', background: 'transparent', padding: 0, display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
                                                    >
                                                        {(deal.investorAvatarUrl || deal.profileImageUrl) ? (
                                                            <img
                                                                src={deal.investorAvatarUrl || deal.profileImageUrl}
                                                                alt={deal.investorName || 'Nhà đầu tư'}
                                                                style={{ width: '26px', height: '26px', borderRadius: '999px', objectFit: 'cover', border: '1px solid var(--border-color)' }}
                                                            />
                                                        ) : (
                                                            <div style={{ width: '26px', height: '26px', borderRadius: '999px', background: 'rgba(29,155,240,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-blue)', fontWeight: 800, fontSize: '12px' }}>
                                                                {(deal.investorName || 'N').charAt(0).toUpperCase()}
                                                            </div>
                                                        )}
                                                        <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>
                                                            {deal.investorName || 'Nhà đầu tư'}
                                                        </span>
                                                    </button>
                                                </div>

                                                {/* Deal Details */}
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
                                                    <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '10px', borderRadius: '6px' }}>
                                                        <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '2px' }}>Ngày gửi yêu cầu</div>
                                                        <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>
                                                            {new Date(deal.dealDate || deal.createdAt || Date.now()).toLocaleDateString('vi-VN')}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Actions */}
                                                <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleShowContractPreview(deal)}
                                                        style={{
                                                            flex: 1,
                                                            padding: '9px 12px',
                                                            backgroundColor: '#0ea5e9',
                                                            color: '#fff',
                                                            border: 'none',
                                                            borderRadius: '6px',
                                                            fontSize: '12px',
                                                            fontWeight: '600',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            gap: '6px'
                                                        }}
                                                    >
                                                        <FileText size={14} />
                                                        Xem hợp đồng
                                                    </button>
                                                    {isCompletedDeal && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleVerifyDealOnchain(deal.dealId)}
                                                            style={{
                                                                flex: 1,
                                                                padding: '9px 12px',
                                                                backgroundColor: '#10b981',
                                                                color: '#fff',
                                                                border: 'none',
                                                                borderRadius: '6px',
                                                                fontSize: '12px',
                                                                fontWeight: '600',
                                                                cursor: 'pointer',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                gap: '6px'
                                                            }}
                                                        >
                                                            <Shield size={14} />
                                                            Xác thực blockchain
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </DashboardSection>
                    )}


                </div>
            )}

            {/* Modal Overlay for Complete Info Form */}
            {showCompleteInfoForm && (
                <div
                    className={styles.modalOverlay}
                    onClick={(e) => {
                        // Close if clicked directly on overlay (not child)
                        if (e.target === e.currentTarget) {
                            if (window.isStartupFormDirty) {
                                if (window.confirm("Bạn có thay đổi chưa được lưu. Bạn có chắc chắn muốn đóng không?")) {
                                    setShowCompleteInfoForm(false);
                                    window.isStartupFormDirty = false;
                                }
                            } else {
                                setShowCompleteInfoForm(false);
                            }
                        }
                    }}
                >
                    <div className={styles.flexCenter}>
                        <CompleteStartupInfoForm
                            user={user}
                            initialData={startupProfile}
                            onSubmit={async (formData) => {
                                // Block update while profile is pending review
                                const currentStatus = startupProfile?.status ?? startupProfile?.approvalStatus;
                                if (currentStatus === 'Pending') {
                                    showRestrictedActionModal('cập nhật hồ sơ trong khi đang chờ xét duyệt. Vui lòng đợi kết quả từ đội ngũ AISEP.');
                                    return;
                                }

                                try {
                                    // Make API request here
                                    const payload = {
                                        companyName: formData.startupName,
                                        founder: formData.founders,
                                        contactInfo: `${formData.contactEmail} ${formData.phone}`,
                                        countryCity: `${formData.country} ${formData.city}`,
                                        website: formData.website,
                                        industry: formData.industry === 'AI/ML' ? 0 : 1, // Simple mapping, usually handled securely
                                        // logoUrl, businessLicenseUrl will require file upload service later
                                    };

                                    let result;
                                    if (startupProfile && startupProfile.startupId) {
                                        payload.startupId = startupProfile.startupId;
                                        result = await startupProfileService.updateStartupProfile(payload);
                                    } else {
                                        result = await startupProfileService.createStartupProfile(payload);
                                    }

                                    setStartupProfile(result);
                                    refreshProfile(); // Sync global state
                                    setSuccessMessage('Lưu thông tin hồ sơ thành công.');
                                    setShowSuccessModal(true);
                                } catch (error) {
                                    console.error('Error saving profile:', error);
                                    setSuccessMessage('Đã xảy ra lỗi khi lưu hồ sơ. Vui lòng thử lại.');
                                    setShowSuccessModal(true);
                                } finally {
                                    setShowCompleteInfoForm(false);
                                    window.isStartupFormDirty = false;
                                }
                            }}
                            onCancel={() => {
                                if (window.isStartupFormDirty) {
                                    if (window.confirm("Bạn có thay đổi chưa được lưu. Bạn có chắc chắn muốn đóng không?")) {
                                        setShowCompleteInfoForm(false);
                                        window.isStartupFormDirty = false;
                                    }
                                } else {
                                    setShowCompleteInfoForm(false);
                                }
                            }}
                            onDirtyChange={(isDirty) => {
                                window.isStartupFormDirty = isDirty;
                            }}
                        />
                    </div>
                </div>
            )}


            {/* Consolidated Modals at end of file */}

            {/* Project Detail Modal - Redesigned V3 (Split Screen Hero) */}
            {showDetailModal && detailProject && (
                <div
                    className={styles.modalOverlay}
                    onClick={(e) => e.target === e.currentTarget && setShowDetailModal(false)}
                >
                    <div key={modalRefreshKey} className={styles.modalContent}>
                        {/* --- Fixed Headers (Top Pinned) --- */}

                        {/* Mobile Header (When NO image exists) */}
                        {isMobile && !detailProject.projectImageUrl && (
                            <div className={`${styles.mobileFixedHeader} ${styles.mobileOnly}`} style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                flexWrap: 'nowrap',
                                gap: '12px'
                            }}>
                                <h3 className={styles.mobileFixedTitle}>{detailProject.projectName}</h3>
                                <div className={styles.mobileHeaderRight}>
                                    <div style={{
                                        fontSize: '11px',
                                        fontWeight: 800,
                                        color: 'var(--primary-blue)',
                                        backgroundColor: 'rgba(29, 155, 240, 0.1)',
                                        padding: '4px 8px',
                                        borderRadius: '6px',
                                        whiteSpace: 'nowrap'
                                    }}>
                                        {getStageLabel(detailProject.stageOptionId || detailProject.StageOptionId || detailProject.developmentStage || detailProject.DevelopmentStage, stages)}
                                    </div>
                                    <button
                                        className={styles.modalCloseBtn}
                                        onClick={() => setShowDetailModal(false)}
                                        style={{
                                            position: 'relative',
                                            top: 'auto',
                                            right: 'auto',
                                            width: '36px',
                                            height: '36px',
                                            padding: 0,
                                            display: 'flex'
                                        }}
                                    >
                                        <X size={18} />
                                    </button>
                                </div>
                            </div>
                        )}


                        <div className={styles.modalSplitWrapper}>
                            {/* --- LEFT SIDE: HERO POSTER (Desktop) --- */}
                            {detailProject.projectImageUrl && (
                                <div
                                    className={`${styles.modalSplitHero} ${styles.desktopOnly}`}
                                    onClick={() => setShowFullscreenImage(true)}
                                    style={{ cursor: 'zoom-in' }}
                                >
                                    <img
                                        src={detailProject.projectImageUrl}
                                        alt={detailProject.projectName}
                                        className={styles.heroPosterImage}
                                        onLoad={(e) => { e.target.style.opacity = 1; }}
                                        style={{ opacity: 0, transition: 'opacity 0.6s ease' }}
                                    />
                                    <div className={styles.heroPosterOverlay}>
                                        <h2 className={styles.heroPosterTitle}>{detailProject.projectName}</h2>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span
                                                className={styles.badge}
                                                style={{
                                                    backgroundColor: `${STATUS_COLORS[detailProject.status || 'Draft']}25`,
                                                    color: STATUS_COLORS[detailProject.status || 'Draft'],
                                                    border: `1px solid ${STATUS_COLORS[detailProject.status || 'Draft']}40`,
                                                    padding: '4px 12px',
                                                    borderRadius: '6px',
                                                    fontWeight: 700,
                                                    fontSize: '12px',
                                                    backdropFilter: 'blur(8px)'
                                                }}
                                            >
                                                {STATUS_LABELS[detailProject.status || 'Draft'] || 'Bản nháp'}
                                            </span>
                                            {detailProject.status === 'Approved' && (
                                                <div style={{
                                                    backgroundColor: 'rgba(16, 185, 129, 0.2)',
                                                    padding: '4px 8px',
                                                    borderRadius: '6px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '4px',
                                                    fontSize: '11px',
                                                    color: '#10b981',
                                                    fontWeight: 800,
                                                    backdropFilter: 'blur(8px)'
                                                }}>
                                                    <CheckCircle size={12} strokeWidth={3} /> READY
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <button
                                        className={styles.heroMaximizeHint}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setShowFullscreenImage(true);
                                        }}
                                        title="Xem ảnh đầy đủ"
                                    >
                                        <Maximize2 size={18} />
                                    </button>
                                </div>
                            )}

                            {/* --- RIGHT SIDE: CONTENT AREA --- */}


                            <div className={styles.modalSplitContentArea}>
                                {!isMobile && (
                                    <div className={styles.modalSplitDesktopHeader}>
                                        <h2 className={styles.modalSplitDesktopTitle}>{detailProject.projectName}</h2>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div className={styles.modalSplitDesktopBadges}>
                                                <div style={{
                                                    fontSize: '11px',
                                                    fontWeight: 800,
                                                    color: 'var(--primary-blue)',
                                                    backgroundColor: 'rgba(29, 155, 240, 0.1)',
                                                    padding: '4px 8px',
                                                    borderRadius: '6px'
                                                }}>
                                                    {getStageLabel(detailProject.stageOptionId || detailProject.StageOptionId || detailProject.developmentStage || detailProject.DevelopmentStage, stages)}
                                                </div>
                                                <span
                                                    style={{
                                                        backgroundColor: `${STATUS_COLORS[detailProject.status || 'Draft']}25`,
                                                        color: STATUS_COLORS[detailProject.status || 'Draft'],
                                                        border: `1px solid ${STATUS_COLORS[detailProject.status || 'Draft']}40`,
                                                        padding: '4px 12px',
                                                        borderRadius: '6px',
                                                        fontWeight: 700,
                                                        fontSize: '12px',
                                                    }}
                                                >
                                                    {STATUS_LABELS[detailProject.status || 'Draft'] || 'Bản nháp'}
                                                </span>
                                            </div>
                                            <button
                                                className={styles.modalCloseBtnInline}
                                                onClick={() => setShowDetailModal(false)}
                                                title="Đóng"
                                            >
                                                <X size={18} />
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* --- Mobile Hero Section (When image exists) --- */}
                                {isMobile && detailProject.projectImageUrl && (
                                    <div className={`${styles.mobileHeroSection} ${styles.mobileOnly}`}>
                                        <div className={styles.mobileHeroWrapper} onClick={() => setShowFullscreenImage(true)}>
                                            <img src={detailProject.projectImageUrl} className={styles.mobileHeroImage} alt={detailProject.projectName} />

                                            {/* Floating Glassy Close Button */}
                                            <button
                                                className={styles.glassyCloseBtn}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setShowDetailModal(false);
                                                }}
                                            >
                                                <X size={18} />
                                            </button>

                                            <div className={styles.mobileHeroOverlay}>
                                                <h2 className={styles.mobileHeroTitle} style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                                                    {detailProject.projectName}
                                                </h2>
                                                <div className={styles.mobileHeroBadges} style={{ marginTop: '12px' }}>
                                                    <span className={styles.mobileHeroBadge}>
                                                        {STATUS_LABELS[detailProject.status || 'Draft'] || 'Bản nháp'}
                                                    </span>
                                                    <span className={styles.mobileHeroBadge} style={{ backgroundColor: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(4px)', color: 'white' }}>
                                                        {getStageLabel(detailProject.stageOptionId || detailProject.StageOptionId || detailProject.developmentStage || detailProject.DevelopmentStage, stages)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Main Content Scrollable Wrapper */}
                                <div className={`${styles.modalContentBody} ${isMobile && detailProject.projectImageUrl ? styles.withHero : ''}`}>
                                    {/* AI History & Analysis Summary */}
                                    <div style={{ marginBottom: '0' }}>
                                        {detailProject.status === 'Rejected' && detailProject.rejectionReason && (
                                            <div style={{
                                                marginBottom: '16px',
                                                padding: '20px',
                                                backgroundColor: 'rgba(244, 33, 46, 0.05)',
                                                borderRadius: '24px',
                                                border: '1px solid rgba(244, 33, 46, 0.1)',
                                                display: 'flex',
                                                gap: '16px'
                                            }}>
                                                <div style={{ width: '40px', height: '40px', borderRadius: '12px', backgroundColor: 'rgba(244, 33, 46, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                    <AlertCircle size={22} color="#f4212e" />
                                                </div>
                                                <div>
                                                    <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', fontWeight: 900, color: '#f4212e' }}>LÝ DO TỪ CHỐI</h4>
                                                    <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.6, color: 'var(--text-primary)' }}>{detailProject.rejectionReason}</p>
                                                </div>
                                            </div>
                                        )}
                                        <div style={{
                                            padding: '24px',
                                            backgroundColor: 'rgba(29, 155, 240, 0.06)',
                                            borderRadius: '24px',
                                            border: '1px solid rgba(29, 155, 240, 0.2)',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '20px'
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                    <div style={{ width: '40px', height: '40px', borderRadius: '12px', backgroundColor: 'rgba(29, 155, 240, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        <Zap size={22} color="var(--primary-blue)" fill="var(--primary-blue)" />
                                                    </div>
                                                    <div>
                                                        <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 900, color: 'var(--text-primary)' }}>ĐÁNH GIÁ TIỀM NĂNG</h4>
                                                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>Cung cấp bởi AISEP</span>
                                                    </div>
                                                </div>
                                                {detailProject.status === 'Draft' && (
                                                    <button
                                                        className={styles.primaryBtn}
                                                        style={{ padding: '8px 16px', borderRadius: '12px', fontSize: '12px', fontWeight: 700 }}
                                                        onClick={() => handleRunAIEvaluation(detailProject.projectId || detailProject.id)}
                                                        disabled={isEvaluatingAI && evaluatingProjectId === (detailProject.projectId || detailProject.id)}
                                                    >
                                                        {isEvaluatingAI && evaluatingProjectId === (detailProject.projectId || detailProject.id) ? (
                                                            <><Loader2 className={styles.spinner} size={14} /> Đang phân tích...</>
                                                        ) : analysisHistory.length > 0 ? 'Phân tích lại' : 'Phân tích ngay'}
                                                    </button>
                                                )}
                                            </div>

                                            <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', padding: '4px 0' }}>
                                                {(() => {
                                                    const filteredHistory = analysisHistory
                                                        .map((item) => {
                                                            const score =
                                                                item.potentialScore ??
                                                                item.finalPotentialScore ??
                                                                item.finalScore ??
                                                                (item.data && (item.data.potentialScore || item.data.finalPotentialScore || item.data.finalScore));
                                                            return { ...item, _displayScore: score };
                                                        })
                                                        .filter(item => item._displayScore !== undefined && item._displayScore !== null);

                                                    return isLoadingHistory ? (
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '14px' }}>
                                                            <Loader2 className={styles.spinner} size={16} /> Đang cập nhật lịch sử...
                                                        </div>
                                                    ) : filteredHistory.length > 0 ? (
                                                        filteredHistory.map((item, idx) => (
                                                            <div key={idx} onClick={() => { setSelectedHistoryResult({ data: item }); setShowHistoryView(true); }} className={styles.scoreCard}>
                                                                <div className={styles.scoreHeader}>
                                                                    <span className={styles.scoreMainValue}>{item._displayScore}</span>
                                                                    <span className={styles.scoreMaxLabel}>/100</span>
                                                                </div>
                                                                <span className={styles.scoreDate}>
                                                                    {item.createdAt ? new Date(item.createdAt).toLocaleString('vi-VN', {
                                                                        year: 'numeric',
                                                                        month: '2-digit',
                                                                        day: '2-digit',
                                                                        hour: '2-digit',
                                                                        minute: '2-digit',
                                                                        second: '2-digit',
                                                                        hour12: false
                                                                    }) : 'Mới'}
                                                                </span>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '13px', fontStyle: 'italic' }}>Dự án này chưa có bản phân tích tiềm năng nào.</p>
                                                    );
                                                })()}
                                            </div>
                                        </div>


                                        {/* Assigned Advisor Section (Shown for all statuses as requested) */}
                                        {true && (
                                            <div className={styles.advisorSection}>
                                                <div className={styles.advisorSectionHeader}>
                                                    <div className={styles.advisorInfoBlock}>
                                                        <div className={styles.advisorIconWrapper}>
                                                            <Users size={22} color="#10b981" />
                                                        </div>
                                                        <div>
                                                            <h4 className={styles.advisorSectionTitle}>CỐ VẤN ĐƯỢC PHÂN CÔNG</h4>
                                                            <span className={styles.advisorSectionSubtitle}>Hỗ trợ chuyên môn trực tiếp</span>
                                                        </div>
                                                    </div>

                                                    {canBookDetailProject && detailProjectAdvisors.length > 0 && detailProject?.status === 'Draft' && (
                                                        <button
                                                            className={`${styles.primaryBtn} ${styles.advisorBookingBtn} ${styles.desktopOnly} `}
                                                            style={{ margin: 0, padding: '8px 16px', fontSize: '12px', fontWeight: 700 }}
                                                            onClick={() => {
                                                                if (!isApproved) {
                                                                    showRestrictedActionModal('Bạn cần được phê duyệt hồ sơ Startup để đặt lịch tư vấn với Cố vấn.');
                                                                    return;
                                                                }
                                                                setBookingInitialAdvisorId(detailProjectAdvisors[0].advisorId);
                                                                setShowBookingWizard(true);
                                                            }}
                                                        >
                                                            Đặt lịch ngay
                                                        </button>
                                                    )}
                                                </div>

                                                <div className={styles.advisorNames}>
                                                    {isCheckingBookingEligibility ? (
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '14px' }}>
                                                            <Loader2 className={styles.spinner} size={16} /> Đang kiểm tra phân công...
                                                        </div>
                                                    ) : detailProjectAdvisors.length > 0 ? (
                                                        detailProjectAdvisors.map((adv, idx) => (
                                                            <div key={idx} className={styles.advisorChip}>
                                                                <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                    <User size={14} color="#10b981" />
                                                                </div>
                                                                <span>{adv.advisorName}</span>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '13px', fontStyle: 'italic' }}>Dự án đang trong quá trình phân công cố vấn phù hợp.</p>
                                                    )}
                                                </div>

                                                {canBookDetailProject && detailProjectAdvisors.length > 0 && detailProject?.status === 'Draft' && (
                                                    <div className={`${styles.advisorActionRow} ${styles.mobileOnly}`}>
                                                        <button
                                                            className={`${styles.primaryBtn} ${styles.advisorBookingBtn}`}
                                                            onClick={() => {
                                                                if (!isApproved) {
                                                                    showRestrictedActionModal('Bạn cần được phê duyệt hồ sơ Startup để đặt lịch tư vấn với Cố vấn.');
                                                                    return;
                                                                }
                                                                setBookingInitialAdvisorId(detailProjectAdvisors[0].advisorId);
                                                                setShowBookingWizard(true);
                                                            }}
                                                        >
                                                            <Calendar size={14} style={{ marginRight: '6px' }} />
                                                            Đặt lịch ngay
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Detailed Project Information Sections */}
                                    {/* Section 1: Basic Info */}
                                    <section className={styles.projectDetailSection}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                                            <div style={{ width: '4px', height: '24px', backgroundColor: 'var(--primary-blue)', borderRadius: '4px' }} />
                                            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '0.02em' }}>1. THÔNG TIN CỐT LÕI</h3>
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '11px', fontWeight: 900, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '10px', letterSpacing: '0.05em' }}>Mô tả dự án</label>
                                                <p style={{ margin: 0, fontSize: '15px', color: 'var(--text-primary)', lineHeight: 1.8 }}>{detailProject.shortDescription}</p>
                                            </div>

                                            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '32px' }}>
                                                <div>
                                                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 900, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '10px', letterSpacing: '0.05em' }}>Giai đoạn dự án</label>
                                                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 14px', backgroundColor: 'var(--bg-secondary)', borderRadius: '10px', fontSize: '14px', fontWeight: 700, color: 'var(--primary-blue)' }}>
                                                        <TrendingUp size={16} /> {getStageLabel(detailProject.stageOptionId || detailProject.StageOptionId || detailProject.developmentStage || detailProject.DevelopmentStage, stages)}
                                                    </div>
                                                </div>
                                                <div>
                                                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 900, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '10px', letterSpacing: '0.05em' }}>Lĩnh vực chính</label>
                                                    <p style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                                                        {(() => {
                                                            const ind = detailProject.industry || detailProject.Industry;
                                                            if (Array.isArray(ind)) return ind.join(', ');
                                                            if (ind) return ind;
                                                            const inds = detailProject.industries || detailProject.Industries;
                                                            if (Array.isArray(inds) && inds.length > 0) return inds.join(', ');
                                                            return 'Chưa cập nhật';
                                                        })()}
                                                    </p>
                                                </div>
                                            </div>

                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                                                <div>
                                                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 900, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '10px' }}>Vấn đề nhức nhối</label>
                                                    <p style={{ margin: 0, fontSize: '15px', color: 'var(--text-primary)', lineHeight: 1.8 }}>{detailProject.problemStatement}</p>
                                                </div>
                                                <div>
                                                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 900, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '10px' }}>Giải pháp đột phá</label>
                                                    <p style={{ margin: 0, fontSize: '15px', color: 'var(--text-primary)', lineHeight: 1.8 }}>{detailProject.solutionDescription}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </section>

                                    {/* Section 2: Market, model & scorecard */}
                                    <section className={styles.projectDetailSection}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                                            <div style={{ width: '4px', height: '24px', backgroundColor: '#10b981', borderRadius: '4px' }} />
                                            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '0.02em' }}>2. THỊ TRƯỜNG, MÔ HÌNH & BẢNG ĐIỂM (SCORECARD)</h3>
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginBottom: '24px' }}>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '11px', fontWeight: 900, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '10px' }}>Khách hàng mục tiêu</label>
                                                <p style={{ margin: 0, fontSize: '15px', color: 'var(--text-primary)' }}>{detailProject.targetCustomers}</p>
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '11px', fontWeight: 900, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '10px' }}>Giá trị độc đáo (UVP)</label>
                                                <p style={{ margin: 0, fontSize: '16px', color: 'var(--text-primary)', fontStyle: 'italic', fontWeight: 600, letterSpacing: '0.01em', lineHeight: 1.6 }}>
                                                    {detailProject.uniqueValueProposition}
                                                </p>
                                            </div>
                                            {detailProject.businessModel ? (
                                                <div>
                                                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 900, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '10px' }}>Mô hình kinh doanh</label>
                                                    <p style={{ margin: 0, fontSize: '15px', color: 'var(--text-primary)', lineHeight: 1.7 }}>{detailProject.businessModel}</p>
                                                </div>
                                            ) : null}
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
                                            {getScorecardRowsForDisplay(detailProject).map((row, idx) => (
                                                <div key={idx} style={{ padding: '16px', backgroundColor: 'var(--bg-secondary)', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
                                                    <label style={{ display: 'block', fontSize: '10px', fontWeight: 900, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>{row.label}</label>
                                                    <p style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.45 }}>{row.value}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </section>

                                    {/* Section 3: Competition */}
                                    <section className={styles.projectDetailSection}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                                            <div style={{ width: '4px', height: '24px', backgroundColor: '#f43f5e', borderRadius: '4px' }} />
                                            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '0.02em' }}>3. CẠNH TRANH</h3>
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '11px', fontWeight: 900, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '12px' }}>Đối thủ cạnh tranh</label>
                                            <p style={{ margin: 0, fontSize: '15px', color: 'var(--text-primary)', lineHeight: 1.8 }}>{detailProject.competitors || '—'}</p>
                                        </div>
                                    </section>

                                    <section className={styles.projectDetailSection}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                                            <div style={{ width: '4px', height: '24px', backgroundColor: 'var(--primary-blue)', borderRadius: '4px' }} />
                                            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '0.02em' }}>4. TÀI LIỆU DỰ ÁN</h3>
                                        </div>

                                        {/* PROMINENT DUE-DILIGENCE CTA */}
                                        {detailProject.status === 'Draft' && (
                                            <div style={{
                                                background: 'linear-gradient(135deg, rgba(29, 155, 240, 0.08) 0%, rgba(139, 92, 246, 0.08) 100%)',
                                                border: '1px solid rgba(29, 155, 240, 0.25)',
                                                borderRadius: isMobile ? '16px' : '20px',
                                                padding: isMobile ? '14px' : '20px',
                                                marginBottom: isMobile ? '16px' : '24px',
                                                display: 'flex',
                                                alignItems: isMobile ? 'stretch' : 'center',
                                                justifyContent: 'space-between',
                                                gap: isMobile ? '12px' : '20px',
                                                flexWrap: 'wrap'
                                            }}>
                                                <div style={{ display: 'flex', gap: isMobile ? '10px' : '16px', flex: 1, minWidth: isMobile ? '100%' : '280px' }}>
                                                    <div style={{
                                                        width: isMobile ? '40px' : '48px',
                                                        height: isMobile ? '40px' : '48px',
                                                        borderRadius: isMobile ? '12px' : '14px',
                                                        background: 'var(--primary-blue)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        boxShadow: '0 4px 12px rgba(29, 155, 240, 0.3)',
                                                        flexShrink: 0
                                                    }}>
                                                        <Sparkles size={isMobile ? 20 : 24} color="#fff" fill="#fff" />
                                                    </div>
                                                    <div>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: isMobile ? '6px' : '4px', flexWrap: 'wrap' }}>
                                                            <h4 style={{ margin: 0, fontSize: isMobile ? '13px' : '15px', fontWeight: 900, color: 'var(--text-primary)', lineHeight: 1.35 }}>
                                                                Hồ sơ Thẩm định (Due Diligence)
                                                            </h4>
                                                            {lastDueDiligenceDocUrl && (
                                                                <span style={{
                                                                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                                                                    color: '#10b981',
                                                                    fontSize: isMobile ? '9px' : '10px',
                                                                    fontWeight: 800,
                                                                    padding: isMobile ? '2px 7px' : '2px 8px',
                                                                    borderRadius: '99px',
                                                                    textTransform: 'uppercase'
                                                                }}>Đã có bản nộp</span>
                                                            )}
                                                        </div>
                                                        <p style={{ margin: 0, fontSize: isMobile ? '12px' : '13px', color: 'var(--text-secondary)', lineHeight: isMobile ? 1.45 : 1.5 }}>
                                                            Cung cấp dữ liệu đối chứng để <strong>AI Analyst</strong> đánh giá dự án chính xác hơn.
                                                            Giảm thiểu rủi ro bị trừ điểm do thiếu bằng chứng trong Pitch Deck.
                                                        </p>
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', gap: '10px', width: isMobile ? '100%' : 'auto' }}>
                                                    {lastDueDiligenceDocUrl && (
                                                        <button
                                                            className={styles.secondaryBtn}
                                                            style={{ padding: isMobile ? '10px 12px' : '10px 16px', borderRadius: '12px', fontSize: isMobile ? '12px' : '13px', fontWeight: 700, flex: isMobile ? 1 : 'none' }}
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                window.open(lastDueDiligenceDocUrl, '_blank');
                                                            }}
                                                        >
                                                            Xem bản cũ
                                                        </button>
                                                    )}
                                                    <button
                                                        className={styles.primaryBtn}
                                                        style={{
                                                            padding: isMobile ? '10px 14px' : '10px 20px',
                                                            borderRadius: '12px',
                                                            fontSize: isMobile ? '12px' : '13px',
                                                            fontWeight: 800,
                                                            background: 'var(--primary-blue)',
                                                            boxShadow: '0 4px 10px rgba(29, 155, 240, 0.2)',
                                                            flex: isMobile ? 1.35 : 'none'
                                                        }}
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            handleOpenDueDiligenceFormModal();
                                                        }}
                                                        disabled={isLoadingDueDiligenceTemplate || isUploadingDueDiligencePdf}
                                                    >
                                                        {isLoadingDueDiligenceTemplate ? (
                                                            <><Loader2 size={16} className={styles.spinner} /> Đang tải...</>
                                                        ) : (
                                                            <>Bắt đầu điền ngay</>
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {/* Standard Upload Dropzone */}
                                        <div
                                            className={`${styles.dropzone} ${dragActive ? styles.dragActive : ''} ${(detailProject.status !== 'Draft') ? styles.disabledDropzone : ''}`}
                                            onDragEnter={(e) => {
                                                if (detailProject.status !== 'Draft') return;
                                                e.preventDefault();
                                                setDragActive(true);
                                            }}
                                            onDragLeave={(e) => {
                                                if (detailProject.status !== 'Draft') return;
                                                e.preventDefault();
                                                setDragActive(false);
                                            }}
                                            onDragOver={(e) => {
                                                if (detailProject.status !== 'Draft') return;
                                                e.preventDefault();
                                                setDragActive(true);
                                            }}
                                            onDrop={(e) => {
                                                if (detailProject.status !== 'Draft') return;
                                                e.preventDefault();
                                                setDragActive(false);
                                                handleDrop(e);
                                            }}
                                            style={{
                                                opacity: (detailProject.status !== 'Draft') ? 0.6 : 1,
                                                cursor: (detailProject.status !== 'Draft') ? 'not-allowed' : 'pointer',
                                                position: 'relative',
                                                border: '2px dashed rgba(148, 163, 184, 0.2)',
                                                borderRadius: '20px',
                                                padding: '30px'
                                            }}
                                            title={detailProject.status !== 'Draft' ? 'Bạn chỉ có thể tải lên tài liệu khi dự án ở trạng thái Nháp' : ''}
                                        >
                                            {detailProject.status !== 'Draft' && (
                                                <div style={{
                                                    position: 'absolute',
                                                    top: 0,
                                                    left: 0,
                                                    right: 0,
                                                    bottom: 0,
                                                    zIndex: 2,
                                                    backgroundColor: 'rgba(255,255,255,0.05)'
                                                }} />
                                            )}
                                            <div className={styles.uploadControls} style={{ flexDirection: 'column', gap: '16px', alignItems: 'center', textAlign: 'center' }}>
                                                <div className={styles.uploadInfo} style={{ flexDirection: 'column', gap: '8px' }}>
                                                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(148, 163, 184, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
                                                        <Upload size={20} color="var(--text-secondary)" />
                                                    </div>
                                                    <div>
                                                        <p className={styles.uploadTitle} style={{ fontSize: '14px', marginBottom: '2px' }}>Tải lên tài liệu bổ sung</p>
                                                        <p className={styles.uploadSubtitle} style={{ fontSize: '12px' }}>Kéo thả hoặc chọn file Pitch Deck, Business Plan...</p>
                                                    </div>
                                                </div>
                                                <div className={styles.uploadActions} style={{ width: '100%', justifyContent: 'center', gap: '12px' }}>
                                                    <CustomSelect
                                                        value={documentType}
                                                        onChange={(e) => setDocumentType(e.target.value)}
                                                        options={[
                                                            { value: 'PitchDeck', label: 'Pitch Deck' },
                                                            { value: 'BusinessPlan', label: 'Kế hoạch kinh doanh' },
                                                            { value: 'Other', label: 'Khác' }
                                                        ]}
                                                        disabled={detailProject.status !== 'Draft'}
                                                        className={styles.uploadDocSelect}
                                                    />
                                                    <button
                                                        className={styles.uploadBtn}
                                                        onClick={() => hiddenFileInput.current.click()}
                                                        disabled={isUploading || detailProject.status !== 'Draft'}
                                                        style={{ borderRadius: '10px', padding: '6px 16px' }}
                                                    >
                                                        {isUploading ? 'Đang tải...' : 'Chọn file'}
                                                    </button>
                                                </div>
                                            </div>
                                            <input
                                                type="file"
                                                ref={hiddenFileInput}
                                                onChange={handleFileChange}
                                                style={{ display: 'none' }}
                                                disabled={detailProject.status !== 'Draft'}
                                            />
                                        </div>

                                        {/* Documents List */}
                                        <div className={styles.docsList} style={{ marginTop: '20px' }}>
                                            {isLoadingDocuments ? (
                                                <div className={styles.loadingState}>
                                                    <Loader2 className={styles.spinner} size={24} />
                                                    <span>Đang tải tài liệu...</span>
                                                </div>
                                            ) : documents.length === 0 ? (
                                                <div className={styles.emptyDocs}>
                                                    <p>Chưa có tài liệu nào được tải lên cho dự án này.</p>
                                                </div>
                                            ) : (
                                                <>
                                                    {/* Desktop Table View */}
                                                    <div className={`${styles.tableWrapper} ${styles.desktopOnly}`}>
                                                        <table className={styles.docsTable}>
                                                            <thead>
                                                                <tr>
                                                                    <th>Tên tài liệu</th>
                                                                    <th>Loại</th>
                                                                    <th>Ngày tải</th>
                                                                    <th>Xác thực</th>
                                                                    <th>Thao tác</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {documents.map((doc) => (
                                                                    <tr key={doc.id}>
                                                                        <td>
                                                                            <div className={styles.docNameCell}>
                                                                                <FileText size={16} />
                                                                                <span title={doc.fullName}>{doc.name}</span>
                                                                            </div>
                                                                        </td>
                                                                        <td>{doc.type}</td>
                                                                        <td>{doc.uploadDate}</td>
                                                                        <td>
                                                                            {(() => {
                                                                                const verification = blockchainVerifications[doc.id];
                                                                                const status = verification?.status || (doc.txHash ? 'verified' : 'loading');

                                                                                if (status === 'loading') {
                                                                                    return (
                                                                                        <span className={`${styles.statusBadge} ${styles.statusBadgeLoading}`}>
                                                                                            <Loader2 size={12} className={styles.spinner} />
                                                                                            Xác thực...
                                                                                        </span>
                                                                                    );
                                                                                }

                                                                                if (status === 'verified') {
                                                                                    return (
                                                                                        <span className={styles.statusBadge}>
                                                                                            <Shield size={12} />
                                                                                            Blockchain
                                                                                        </span>
                                                                                    );
                                                                                }

                                                                                return (
                                                                                    <span className={`${styles.statusBadge} ${styles.statusBadgeUnverified}`}>
                                                                                        <Shield size={12} />
                                                                                        Chưa nộp
                                                                                    </span>
                                                                                );
                                                                            })()}
                                                                        </td>
                                                                        <td>
                                                                            <div className={styles.tableActions}>
                                                                                <button
                                                                                    className={styles.iconBtn}
                                                                                    title="Xem"
                                                                                    onClick={() => window.open(doc.url, '_blank')}
                                                                                >
                                                                                    <ExternalLink size={16} />
                                                                                </button>
                                                                                <button
                                                                                    className={styles.iconBtn}
                                                                                    title="Xác thực"
                                                                                    onClick={() => handleVerifyDocument(doc.id, doc.fullName, doc.txHash)}
                                                                                    disabled={verifyingDocId !== null}
                                                                                >
                                                                                    {verifyingDocId === doc.id ? (
                                                                                        <Loader2 size={16} className={styles.spinner} />
                                                                                    ) : (
                                                                                        <Shield size={16} />
                                                                                    )}
                                                                                </button>
                                                                                <button
                                                                                    className={styles.iconBtnDanger}
                                                                                    title="Xóa"
                                                                                    onClick={() => handleDeleteDocument(doc)}
                                                                                    disabled={detailProject.status !== 'Draft' || isDeletingDocument}
                                                                                    style={{
                                                                                        opacity: (detailProject.status !== 'Draft' || isDeletingDocument) ? 0.5 : 1,
                                                                                        cursor: (detailProject.status !== 'Draft' || isDeletingDocument) ? 'not-allowed' : 'pointer'
                                                                                    }}
                                                                                >
                                                                                    {isDeletingDocument && documentToDelete?.id === doc.id ? (
                                                                                        <Loader2 size={16} className={styles.spinner} />
                                                                                    ) : (
                                                                                        <Trash2 size={16} />
                                                                                    )}
                                                                                </button>
                                                                            </div>
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>

                                                    {/* Mobile Card View */}
                                                    <div className={`${styles.mobileDocsList} ${styles.mobileOnly}`}>
                                                        {documents.map((doc) => {
                                                            const verification = blockchainVerifications[doc.id];
                                                            const status = verification?.status || (doc.txHash ? 'verified' : 'loading');

                                                            return (
                                                                <div key={doc.id} className={styles.docCard}>
                                                                    <div className={styles.docCardHeader}>
                                                                        <FileText size={18} style={{ color: 'var(--primary-blue)', flexShrink: 0 }} />
                                                                        <span className={styles.docCardTitle} title={doc.fullName}>
                                                                            {doc.name}
                                                                        </span>
                                                                    </div>

                                                                    <div className={styles.docCardMeta}>
                                                                        <span className={styles.docCardBadge} style={{
                                                                            backgroundColor: 'rgba(29, 155, 240, 0.1)',
                                                                            color: 'var(--primary-blue)'
                                                                        }}>
                                                                            {doc.type}
                                                                        </span>

                                                                        {status === 'loading' ? (
                                                                            <span className={`${styles.docCardBadge} ${styles.statusBadgeLoading}`}>
                                                                                <Loader2 size={10} className={styles.spinner} />
                                                                                Xác thực...
                                                                            </span>
                                                                        ) : status === 'verified' ? (
                                                                            <span className={`${styles.docCardBadge}`} style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
                                                                                <Shield size={10} style={{ marginRight: '4px' }} />
                                                                                Blockchain
                                                                            </span>
                                                                        ) : (
                                                                            <span className={`${styles.docCardBadge}`} style={{ backgroundColor: 'rgba(244, 63, 94, 0.1)', color: '#f43f5e' }}>
                                                                                <Shield size={10} style={{ marginRight: '4px' }} />
                                                                                Chưa nộp
                                                                            </span>
                                                                        )}

                                                                        <span className={styles.docCardDate}>{doc.uploadDate}</span>
                                                                    </div>

                                                                    <div className={styles.docCardActions}>
                                                                        <button
                                                                            className={`${styles.docActionBtn} ${styles.viewBtn}`}
                                                                            onClick={() => window.open(doc.url, '_blank')}
                                                                        >
                                                                            <ExternalLink size={14} />
                                                                            Xem
                                                                        </button>

                                                                        <button
                                                                            className={`${styles.docActionBtn} ${styles.viewBtn}`}
                                                                            style={{ color: 'var(--text-primary)', border: '1px solid var(--border-color)', backgroundColor: 'transparent' }}
                                                                            onClick={() => handleVerifyDocument(doc.id, doc.fullName, doc.txHash)}
                                                                            disabled={verifyingDocId !== null}
                                                                        >
                                                                            {verifyingDocId === doc.id ? (
                                                                                <Loader2 size={14} className={styles.spinner} />
                                                                            ) : (
                                                                                <Shield size={14} />
                                                                            )}
                                                                            Xác thực
                                                                        </button>

                                                                        <button
                                                                            className={`${styles.docActionBtn} ${styles.deleteBtn}`}
                                                                            onClick={() => handleDeleteDocument(doc)}
                                                                            disabled={detailProject.status !== 'Draft' || isDeletingDocument}
                                                                            style={{
                                                                                opacity: (detailProject.status !== 'Draft' || isDeletingDocument) ? 0.5 : 1
                                                                            }}
                                                                        >
                                                                            {isDeletingDocument && documentToDelete?.id === doc.id ? (
                                                                                <Loader2 size={14} className={styles.spinner} />
                                                                            ) : (
                                                                                <Trash2 size={14} />
                                                                            )}
                                                                            Xóa
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </section>
                                </div> {/* end of gap: 48px wrapper */}
                            </div> {/* end of modalSplitContentArea */}
                        </div> {/* end of modalSplitWrapper */}

                        {/* Fixed Action Footer (Available on both Desktop & Mobile) */}
                        <div className={styles.stickyActions} style={{ justifyContent: isMobile ? 'space-between' : 'flex-end', gap: '16px' }}>
                            {detailProject.status === 'Draft' && (
                                <button
                                    className={styles.primaryBtn}
                                    style={{ flex: isMobile ? '2' : 'none', minWidth: isMobile ? '0' : '160px', borderRadius: '9999px' }}
                                    onClick={() => {
                                        handleSubmitProject(detailProject.projectId || detailProject.id);
                                    }}
                                    disabled={isSubmittingProject}
                                >
                                    {isSubmittingProject && submittingProjectId === (detailProject.projectId || detailProject.id) ? '...' : 'Nộp dự án'}
                                </button>
                            )}
                            {(detailProject.status === 'Draft' || detailProject.status === 'Rejected') && (
                                <button
                                    className={styles.secondaryBtn}
                                    style={{ flex: isMobile ? '1' : 'none', minWidth: isMobile ? '0' : '140px', borderRadius: '9999px', borderColor: 'var(--primary-blue)', color: 'var(--primary-blue)' }}
                                    onClick={() => {
                                        setShowDetailModal(false);
                                        setShowProjectForm(true);
                                    }}
                                >
                                    Chỉnh sửa
                                </button>
                            )}
                            <button
                                className={styles.secondaryBtn}
                                style={{ flex: isMobile ? '1' : 'none', minWidth: isMobile ? '0' : '120px', borderRadius: '9999px' }}
                                onClick={() => setShowDetailModal(false)}
                            >
                                Đóng
                            </button>
                        </div>
                    </div> {/* end of modalContent */}
                </div>
            )}

            {showSuccessModal && (
                <SuccessModal
                    onClose={() => setShowSuccessModal(false)}
                    title={successTitle || "Thông báo"}
                    message={successMessage}
                    primaryBtnText={successPrimaryBtn}
                    secondaryBtnText={successSecondaryBtn}
                    onSecondaryClick={onSuccessSecondaryClick}
                    type={successModalType}
                />
            )}

            {showContractModal && contractDealData && (
                <div className={styles.modalOverlay} onClick={handleCloseContractModal}>
                    <div className={styles.modalContent} style={{ maxWidth: '680px', padding: '20px' }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                            <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)' }}>Xem hợp đồng yêu cầu đầu tư</h3>
                            <button type="button" className={styles.modalCloseBtn} onClick={handleCloseContractModal} disabled={isVerifyingDealFromModal}>
                                <X size={18} />
                            </button>
                        </div>

                        <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '14px' }}>
                            Nhà đầu tư: <strong style={{ color: 'var(--text-primary)' }}>{contractDealData.investorName || 'N/A'}</strong>
                            {contractDealData.projectName ? (
                                <> — Dự án: <strong style={{ color: 'var(--text-primary)' }}>{contractDealData.projectName}</strong></>
                            ) : null}
                        </div>

                        <div style={{ backgroundColor: 'var(--bg-secondary)', borderRadius: '10px', padding: '14px', marginBottom: '14px' }}>
                            {contractDealData.documentUrl ? (
                                <>
                                    <div
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => setShowDealDocumentLightbox(true)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault();
                                                setShowDealDocumentLightbox(true);
                                            }
                                        }}
                                        style={{
                                            width: '100%',
                                            height: '280px',
                                            borderRadius: '10px',
                                            overflow: 'hidden',
                                            cursor: 'zoom-in',
                                            border: '1px solid rgba(148, 163, 184, 0.35)',
                                            backgroundColor: '#fff',
                                            marginBottom: '10px'
                                        }}
                                        title="Bấm để phóng to tài liệu"
                                    >
                                        {isImageDocumentUrl(contractDealData.documentUrl) ? (
                                            <img
                                                src={contractDealData.documentUrl}
                                                alt={contractDealData.projectName ? `Tài liệu — ${contractDealData.projectName}` : 'Tài liệu yêu cầu đầu tư'}
                                                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                            />
                                        ) : (
                                            <iframe
                                                src={contractDealData.documentUrl}
                                                title="Xem trước tài liệu đầu tư"
                                                style={{ width: '100%', height: '100%', border: 'none' }}
                                            />
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Đây là bản xem nhanh. Bấm vào khung để xem lớn.</span>
                                        <a href={contractDealData.documentUrl} target="_blank" rel="noreferrer" style={{ fontSize: '12px', fontWeight: 700, color: 'var(--primary-blue)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                            <ExternalLink size={12} />
                                            Mở tab mới
                                        </a>
                                    </div>
                                </>
                            ) : (
                                <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Nhà đầu tư chưa tải tài liệu lên.</p>
                            )}
                        </div>

                        <div className={styles.formGroup} style={{ marginBottom: '16px' }}>
                            <label>Lý do từ chối (bắt buộc khi bấm Từ chối)</label>
                            <textarea
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                placeholder="Nhập lý do nếu bạn muốn từ chối yêu cầu đầu tư"
                                rows={3}
                                maxLength={1000}
                                disabled={isVerifyingDealFromModal}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                            {(getDealStatusInfo(contractDealData.status).value === 4 || contractDealData.isCompleted === true) && (
                                <button type="button" className={styles.secondaryBtn} onClick={() => handleVerifyDealOnchain(contractDealData.dealId)} disabled={isVerifyingDealFromModal}>
                                    Xác thực blockchain
                                </button>
                            )}
                            <button type="button" className={styles.secondaryBtn} onClick={handleCloseContractModal} disabled={isVerifyingDealFromModal}>
                                Đóng
                            </button>
                            <button
                                type="button"
                                className={styles.dangerBtn}
                                onClick={() => handleVerifyDealFromModal(false)}
                                disabled={isVerifyingDealFromModal}
                            >
                                {isVerifyingDealFromModal ? <><Loader2 size={14} className={styles.spinner} /> Đang xử lý...</> : 'Từ chối'}
                            </button>
                            <button
                                type="button"
                                className={styles.primaryBtn}
                                onClick={() => handleVerifyDealFromModal(true)}
                                disabled={isVerifyingDealFromModal}
                            >
                                {isVerifyingDealFromModal ? <><Loader2 size={14} className={styles.spinner} /> Đang xử lý...</> : 'Chấp nhận'}
                            </button>
                        </div>
                    </div>
                </div>
            )}


            {showProjectForm && (
                <ProjectSubmissionForm
                    onClose={() => setShowProjectForm(false)}
                    initialData={detailProject}
                    onSuccess={async () => {
                        // Reload projects first
                        const response = await projectSubmissionService.getMyProjects();
                        if (response.success && response.data) {
                            const rawProjects = Array.isArray(response.data) ? response.data : (response.data.items || []);
                            // Sort projects by CreatedAt descending (most recent first) with ID fallback
                            const sortedProjects = [...rawProjects].sort((a, b) => {
                                const dateDifference = new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
                                if (dateDifference !== 0) return dateDifference;
                                return (b.id || b.projectId || 0) - (a.id || a.projectId || 0);
                            });
                            setMyProjects(sortedProjects);
                        }

                        // For create: keep form open to show success modal with dashboard button
                        // For edit: close form immediately
                        if (detailProject) {  // This means it's an edit
                            setShowProjectForm(false);
                            setSuccessMessage('Cập nhật dự án thành công. Dự án đã trở về trạng thái Bản nháp.');
                            setShowSuccessModal(true);
                        }
                        // For create (detailProject is null), don't close form so success modal can show
                    }}
                    user={user}
                    isApproved={isApproved}
                    onRestrictedAction={showRestrictedActionModal}
                />
            )}

            {showAIEvaluationModal && (
                <AIEvaluationModal
                    isOpen={showAIEvaluationModal}
                    analysisResult={aiEvaluationResult?.analysis}
                    eligibilityResult={aiEvaluationResult?.eligibility}
                    isLoading={isEvaluatingAI}
                    error={aiEvaluationError}
                    projectName={myProjects.find(p => (p.id || p.projectId) === aiEvaluationResult?.projectId)?.projectName || 'Dự án'}
                    viewerRole={user?.role}
                    isEvaluationOnly={true}
                    onSubmit={handleSaveAIResults}
                    onCancel={handleCancelAIEvaluation}
                />
            )}

            {showDueDiligenceFormModal && (
                <DueDiligenceFormModal
                    isOpen={showDueDiligenceFormModal}
                    template={dueDiligenceTemplateData}
                    projectName={detailProject?.projectName || detailProject?.name}
                    isGenerating={isUploadingDueDiligencePdf}
                    onClose={() => setShowDueDiligenceFormModal(false)}
                    onGeneratePdfAndUpload={handleGenerateDueDiligencePdfAndUpload}
                />
            )}

            {showVerificationModal && (
                <BlockchainVerificationModal
                    isOpen={showVerificationModal}
                    onClose={() => setShowVerificationModal(false)}
                    verificationData={verificationData}
                    documentName={verificationDocumentName}
                />
            )}

            {showSubmitConfirmation && (
                <ConfirmationModal
                    isOpen={showSubmitConfirmation}
                    type="info"
                    title="Nộp dự án"
                    message="Bạn có chắc chắn muốn nộp dự án này để được xem xét?"
                    primaryBtnText="Nộp"
                    secondaryBtnText="Hủy"
                    isLoading={isSubmittingProject}
                    onPrimaryClick={handleConfirmSubmit}
                    onSecondaryClick={() => {
                        setShowSubmitConfirmation(false);
                        setPendingSubmitProjectId(null);
                    }}
                />
            )}

            {/* AI Analyze Confirmation Modal */}
            <AIAnalyzeConfirmationModal
                isOpen={showAIAnalyzeConfirm}
                onClose={() => setShowAIAnalyzeConfirm(false)}
                onConfirm={handleConfirmAIAnalyze}
                isAnalyzing={isEvaluatingAI}
                isLoadingQuota={isLoadingSubscription}
                projectName={myProjects.find(p => (p.id || p.projectId) === targetProjectIdForAI)?.projectName || detailProject?.projectName}
                remainingAiRequests={(activePackage?.maxAiRequests || 0) - (subscription?.usedAiRequests || 0)}
                packageName={activePackage?.packageName}
            />

            {showDeleteConfirm && (
                <ConfirmationModal
                    isOpen={showDeleteConfirm}
                    title="Xác nhận xóa tài liệu"
                    message={`Bạn có chắc chắn muốn xóa tài liệu "${documentToDelete?.name}"? Hành động này không thể hoàn tác. Bạn sẽ không thể tải lại tệp này lên hệ thống nếu tệp đã được xác thực với Blockchain.`}
                    type="warning"
                    primaryBtnText={isDeletingDocument ? "Đang xóa..." : "Xóa tài liệu"}
                    secondaryBtnText="Hủy"
                    onPrimaryClick={confirmDeleteDocument}
                    onSecondaryClick={() => {
                        setShowDeleteConfirm(false);
                        setDocumentToDelete(null);
                    }}
                    isLoading={isDeletingDocument}
                />
            )}

            {showHistoryView && selectedHistoryResult && (
                <AIEvaluationModal
                    isOpen={showHistoryView}
                    analysisResult={selectedHistoryResult}
                    isLoading={false}
                    isHistoryMode={true}
                    projectName={detailProject?.projectName || 'Dự án'}
                    viewerRole={user?.role}
                    onCancel={() => {
                        setShowHistoryView(false);
                        setSelectedHistoryResult(null);
                    }}
                />
            )}

            {showFullscreenImage && detailProject?.projectImageUrl && (
                <div
                    className={styles.imageLightbox}
                    onClick={() => setShowFullscreenImage(false)}
                >
                    <div className={styles.lightboxOverlay} />
                    <button
                        className={styles.lightboxClose}
                        onClick={() => setShowFullscreenImage(false)}
                        title="Đóng"
                    >
                        <X size={32} />
                    </button>
                    <div className={styles.lightboxContent} onClick={(e) => e.stopPropagation()}>
                        <img
                            src={detailProject.projectImageUrl}
                            alt={detailProject.projectName}
                            className={styles.lightboxImage}
                        />
                        <div className={styles.lightboxCaption}>
                            <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 900 }}>{detailProject.projectName}</h3>
                            <p style={{ margin: '4px 0 0 0', opacity: 0.8, fontSize: '14px', fontWeight: 700 }}>{STATUS_LABELS[detailProject.status || 'Draft']}</p>
                        </div>
                    </div>
                </div>
            )}

            {showDealDocumentLightbox && showContractModal && contractDealData?.documentUrl && (
                <div className={styles.imageLightbox} onClick={() => setShowDealDocumentLightbox(false)}>
                    <div className={styles.lightboxOverlay} />
                    <button
                        className={styles.lightboxClose}
                        onClick={() => setShowDealDocumentLightbox(false)}
                        title="Đóng"
                    >
                        <X size={32} />
                    </button>
                    <div
                        className={styles.lightboxContent}
                        onClick={(e) => e.stopPropagation()}
                        style={{ width: 'min(1200px, 92vw)', height: 'min(86vh, 900px)', maxWidth: 'none' }}
                    >
                        {isImageDocumentUrl(contractDealData.documentUrl) ? (
                            <img
                                src={contractDealData.documentUrl}
                                alt={contractDealData.projectName ? `Tài liệu — ${contractDealData.projectName}` : 'Tài liệu yêu cầu đầu tư'}
                                className={styles.lightboxImage}
                                style={{ objectFit: 'contain' }}
                            />
                        ) : (
                            <iframe
                                src={contractDealData.documentUrl}
                                title="Tài liệu yêu cầu đầu tư"
                                style={{ width: '100%', height: '100%', border: 'none', borderRadius: '12px', backgroundColor: '#fff' }}
                            />
                        )}
                    </div>
                </div>
            )}

            <BlockchainOnchainResultModal
                isOpen={showOnchainResultModal && !!onchainResultData}
                onClose={() => setShowOnchainResultModal(false)}
                result={onchainResultData}
            />

            {showInvestorProfileModal && (
                <div
                    className={styles.modalOverlay}
                    onClick={() => {
                        setShowInvestorProfileModal(false);
                        setSelectedInvestorProfile(null);
                    }}
                >
                    <div
                        className={styles.modalContent}
                        style={{ maxWidth: '560px', padding: '20px' }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>Hồ sơ nhà đầu tư</h3>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowInvestorProfileModal(false);
                                    setSelectedInvestorProfile(null);
                                }}
                                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-secondary)' }}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {isLoadingInvestorProfile ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
                                <Loader2 size={16} className={styles.spinner} /> Đang tải hồ sơ...
                            </div>
                        ) : selectedInvestorProfile ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    {selectedInvestorProfile.profileImageUrl ? (
                                        <img
                                            src={selectedInvestorProfile.profileImageUrl}
                                            alt={selectedInvestorProfile.organizationName || selectedInvestorProfile.userName || 'Nhà đầu tư'}
                                            style={{ width: '56px', height: '56px', borderRadius: '999px', objectFit: 'cover', border: '1px solid var(--border-color)' }}
                                        />
                                    ) : (
                                        <div style={{ width: '56px', height: '56px', borderRadius: '999px', background: 'rgba(29,155,240,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-blue)', fontWeight: 800, fontSize: '20px' }}>
                                            {(selectedInvestorProfile.organizationName || selectedInvestorProfile.userName || 'N').charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                    <div>
                                        <div style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-primary)' }}>
                                            {selectedInvestorProfile.organizationName || selectedInvestorProfile.userName || 'Nhà đầu tư'}
                                        </div>
                                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                            ID: #{selectedInvestorProfile.investorId || selectedInvestorProfile.id || 'N/A'}
                                        </div>
                                    </div>
                                </div>

                                {selectedInvestorProfile.investmentRegion && (
                                    <div style={{ fontSize: '14px', color: 'var(--text-primary)' }}>
                                        <strong>Khu vực đầu tư:</strong> {selectedInvestorProfile.investmentRegion}
                                    </div>
                                )}
                                {selectedInvestorProfile.preferredStage && (
                                    <div style={{ fontSize: '14px', color: 'var(--text-primary)' }}>
                                        <strong>Giai đoạn ưu tiên:</strong> {selectedInvestorProfile.preferredStage}
                                    </div>
                                )}
                                <div style={{ fontSize: '14px', color: 'var(--text-primary)', lineHeight: 1.6, background: 'var(--bg-secondary)', borderRadius: '8px', padding: '10px 12px' }}>
                                    {selectedInvestorProfile.investmentTaste || 'Nhà đầu tư chưa cập nhật mô tả hồ sơ.'}
                                </div>
                            </div>
                        ) : (
                            <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Không tải được hồ sơ nhà đầu tư.</p>
                        )}
                    </div>
                </div>
            )}

            <FloatingChatWidget
                chatSessionId={activeChatSession?.chatSessionId}
                displayName={activeChatSession?.displayName}
                currentUserId={user?.userId}
                sentTime={activeChatSession?.sentTime}
                onClose={handleCloseChatWindow}
            />

            {showBookingWizard && (
                <BookingWizard
                    user={user}
                    isApproved={isApproved}
                    initialProjectId={detailProject?.projectId || detailProject?.id}
                    initialAdvisorId={bookingInitialAdvisorId}
                    onClose={() => setShowBookingWizard(false)}
                    onRestrictedAction={showRestrictedActionModal}
                />
            )}

            {/* PR News Section — direct child of container, no styles.content padding */}
            {activeSection === 'pr_news' && (
                <NewsPRSection
                    user={user}
                    onOpenChat={(chatSessionId, notification) => {
                        setActiveChatSession({
                            chatSessionId,
                            displayName: notification?.title || 'Chat mới',
                            currentUserId: user?.userId,
                            sentTime: new Date().toISOString(),
                        });
                    }}
                    onNotificationNavigate={onNotificationNavigate}
                    startupBanner={(!startupProfile || (String(startupProfile.status || startupProfile.approvalStatus || '').toUpperCase() !== 'APPROVED')) ? (
                        <StartupProfileBanner
                            status={startupProfile?.status}
                            approvalStatus={startupProfile?.approvalStatus}
                            rejectionReason={startupProfile?.rejectionReason}
                            onRedirect={() => setActiveSection('complete-info')}
                        />
                    ) : null}
                />
            )}

            {showRestrictedModal && (
                <RestrictedActionModal
                    isOpen={showRestrictedModal}
                    onClose={() => setShowRestrictedModal(false)}
                    message={restrictedActionMessage}
                />
            )}
        </div>
    );
}
