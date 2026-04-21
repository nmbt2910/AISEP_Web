import React, { useState, useEffect, useRef } from 'react';
import { TrendingUp, Users, FileText, CheckCircle, AlertCircle, Calendar, MessageSquare, PlusCircle, Eye, Shield, Send, Zap, Sparkles, RefreshCw, X, XCircle, ArrowRight, Loader2, Upload, ExternalLink, Trash2, History, Search, Maximize2, User, Crown, DollarSign, Settings, Info, Download, Check } from 'lucide-react';
import SignatureCanvas from 'react-signature-canvas';
import styles from '../styles/SharedDashboard.module.css';
import contractStyles from './ContractSigningModal.module.css';
import CompleteStartupInfoForm from '../components/startup/CompleteStartupInfoForm';
import StartupProfileForm from '../components/startup/StartupProfileForm';
import SuccessModal from '../components/common/SuccessModal';
import ProjectSubmissionForm from '../components/startup/ProjectSubmissionForm';
import BlockchainVerificationModal from '../components/common/BlockchainVerificationModal';
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
import signalRService from '../services/signalRService.js';
import { PROJECT_STATUS, isUserEditable, STATUS_LABELS, STATUS_COLORS, getStageLabel } from '../constants/ProjectStatus.js';
import { translateAIResults } from '../utils/translateAIResults.js';
import kanban from '../styles/OperationStaffDashboard.module.css';
import bookingService from '../services/bookingService';
import projectAssignmentService from '../services/projectAssignmentService';
import BookingWizard from '../components/booking/BookingWizard';

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


/**
 * StartupDashboard - Comprehensive dashboard for startup founders
 * Features: Overview stats, Profile completion, Documents, AI Score, Advisor requests
 */
export default function StartupDashboard({ user, initialSection = 'my-projects', targetId, onLogout, onNotificationNavigate }) {
    const [activeSection, setActiveSection] = React.useState(initialSection);
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
    const tabsRef = React.useRef(null);
    const [indicatorStyle, setIndicatorStyle] = React.useState({ transform: 'translateX(0)', width: '0px' });

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
                    title: 'Đầu tư & Ký kết',
                    subtitle: 'Theo dõi các thỏa thuận đầu tư và quy trình ký kết hợp đồng.'
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

    // Deals Approval States (for investment deals from investors)
    const [dealsToApprove, setDealsToApprove] = React.useState([]);
    const [isLoadingDeals, setIsLoadingDeals] = React.useState(false);
    const [isRespondingToDeal, setIsRespondingToDeal] = React.useState(null);
    const [showRejectDealModal, setShowRejectDealModal] = React.useState(false);
    const [rejectDealId, setRejectDealId] = React.useState(null);
    const [rejectReason, setRejectReason] = React.useState('');

    // Contract Preview States
    const [showContractModal, setShowContractModal] = React.useState(false);
    const [contractPreviewHtml, setContractPreviewHtml] = React.useState(null);
    const [isLoadingContract, setIsLoadingContract] = React.useState(false);
    const [contractDealData, setContractDealData] = React.useState(null);
    const [contractStatus, setContractStatus] = React.useState(null); // Track deal status
    const [isSigningContract, setIsSigningContract] = React.useState(false);
    const [showRejectContractModal, setShowRejectContractModal] = React.useState(false);
    const [rejectContractReason, setRejectContractReason] = React.useState('');
    const [isRejectingContract, setIsRejectingContract] = React.useState(false);

    // Contract signing form states
    const [signFormData, setSignFormData] = React.useState({
        finalAmount: 0,
        finalEquityPercentage: 0,
        additionalTerms: '',
        signatureBase64: ''
    });

    // Signature canvas ref
    const signatureCanvasRef = React.useRef(null);
    const signatureDataRef = React.useRef(''); // Keep latest signature value
    const [isSignatureEmpty, setIsSignatureEmpty] = React.useState(true);

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

    // --- Deep Linking Enforcement ---
    React.useEffect(() => {
        if (!targetId || hasAttemptedDeepLink) return;

        console.log(`[StartupDashboard] Processing targetId: ${targetId} for activeSection: ${activeSection}`);
        let matchFound = false;

        // 1. My Projects Deep Link
        if (activeSection === 'my-projects' && myProjects.length > 0) {
            const matchProject = myProjects.find(p => String(p.id || p.projectId) === String(targetId));
            if (matchProject) {
                setActiveSection(`project_${matchProject.id || matchProject.projectId}`);
                matchFound = true;
                console.log(`[DeepLink] Transitioned to project_${targetId}`);
            }
        }
        
        // 2. Deals Deep Link
        else if (activeSection === 'deals' && dealsToApprove.length > 0) {
            const matchDeal = dealsToApprove.find(d => String(d.dealId) === String(targetId));
            if (matchDeal) {
                // If it's ready to sign, pop the contract modal
                if (matchDeal.status === 'Confirmed' || matchDeal.status === 1 || matchDeal.status === 'Waiting_For_Startup_Signature' || matchDeal.status === 2) {
                    setContractDealData(matchDeal);
                    setContractPreviewHtml(null); // Will trigger fetch down the line
                    setShowContractModal(true);
                    console.log(`[DeepLink] Popped Deal Modal for dealId: ${targetId}`);
                } else {
                    // Just scroll to it
                    const el = document.getElementById(`deal-card-${targetId}`);
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
                matchFound = true;
            }
        }
        
        // 3. Connect Requests Deep Link (No modal, just scrolling to active element)
        else if (activeSection === 'connection-requests' && connectionRequests.length > 0) {
            const matchReq = connectionRequests.find(r => String(r.connectionRequestId) === String(targetId));
            if (matchReq) {
                const el = document.getElementById(`connection-card-${targetId}`);
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                matchFound = true;
            }
        }

        if (matchFound) {
            setHasAttemptedDeepLink(true);
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

    const dealFilterOptions = [
        { id: 'all', label: 'Tất cả', statuses: [] },
        { id: 'pending', label: 'Chờ xác nhận', statuses: ['Pending', 0] },
        { id: 'confirmed', label: 'Đã xác nhận', statuses: ['Confirmed', 1] },
        { id: 'waiting', label: 'Chờ ký', statuses: ['Waiting_For_Startup_Signature', 2] },
        { id: 'signed', label: 'Ký kết', statuses: ['Contract_Signed', 3, 'Minted_NFT', 4] },
        { id: 'failed', label: 'Từ chối/Lỗi', statuses: ['Rejected', 5, 'Failed', 6] }
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
                counts[opt.id] = dealsToApprove.filter(d => opt.statuses.includes(d.status)).length;
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
        return matchesSearch && activeOpt.statuses.includes(d.status);
    });

    React.useEffect(() => {
        const initSignalR = async () => {
            try {
                const token = localStorage.getItem('aisep_token');
                if (token && user?.userId) {
                    await signalRService.initialize(token);
                }
            } catch (error) {
                console.error('[StartupDashboard] Failed to initialize SignalR:', error);
            }
        };

        if (user?.userId) {
            initSignalR();
        }

        return () => {
            signalRService.disconnect();
        };
    }, [user?.userId]);

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
    }, [activeSection]);

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
                setAnalysisHistory(response.data || []);
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

    React.useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                // Fetch profile and projects in PARALLEL (not sequential)
                const promises = [];

                // 1. Fetch startup profile (if user exists)
                if (user && user.userId) {
                    promises.push(
                        startupProfileService.getStartupProfileByUserId(user.userId)
                            .then(data => ({ key: 'profile', data }))
                    );
                }

                // 2. Fetch projects - run in parallel with profile
                promises.push(
                    projectSubmissionService.getMyProjects()
                        .then(data => ({ key: 'projects', data }))
                );

                const results = await Promise.all(promises);

                // Process results
                for (const result of results) {
                    if (result.key === 'profile') {
                        const profileData = result.data;
                        setStartupProfile(profileData);

                        // Check for auto-setup flag in URL
                        const params = new URLSearchParams(window.location.search);
                        if (!profileData && params.get('setup') === 'true') {
                            setActiveSection('complete-info');
                            window.history.replaceState({}, document.title, window.location.pathname);
                        }
                    } else if (result.key === 'projects') {
                        const response = result.data;
                        if (response.success && response.data) {
                            const rawProjects = Array.isArray(response.data) ? response.data : (response.data.items || []);
                            // Sort projects by CreatedAt descending (most recent first)
                            // Fallback to ID/ProjectId if createdAt is missing
                            const sortedProjects = [...rawProjects].sort((a, b) => {
                                const dateB = new Date(b.createdAt || b.createdAt || 0);
                                const dateA = new Date(a.createdAt || a.createdAt || 0);
                                if (dateB - dateA !== 0) return dateB - dateA;
                                return (b.id || b.projectId || 0) - (a.id || a.projectId || 0);
                            });
                            setMyProjects(sortedProjects);
                            setDocuments([]);

                            if (sortedProjects.length > 0) {
                                const loadedProject = sortedProjects[0];
                                setProject(loadedProject);

                                // Pre-fill form data for updates
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
                    }
                }
            } catch (err) {
                console.error("Failed to load dashboard data:", err);
            } finally {
                setIsLoadingInitialData(false);
            }
        };

        fetchDashboardData();
        fetchSubscriptionData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

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
    const fetchConnectionRequests = async () => {
        setIsLoadingRequests(true);
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
                    investorName: req.investorName || 'Investor',
                    chatSessionId: req.chatSessionId,
                    status: req.status?.toLowerCase() || 'pending',
                    message: req.message || '',
                    sentDate: sentDateString
                };
            });

            console.log('[StartupDashboard] Formatted requests:', formattedRequests);
            setConnectionRequests(formattedRequests);
        } catch (error) {
            console.error('[StartupDashboard] Failed to fetch connection requests:', error);
            console.error('[StartupDashboard] Error details - Message:', error?.message);
            console.error('[StartupDashboard] Error details - Status:', error?.response?.status);
            console.error('[StartupDashboard] Error details - Data:', error?.response?.data);
            setConnectionRequests([]);
        } finally {
            setIsLoadingRequests(false);
        }
    };

    // Load connection requests on mount
    React.useEffect(() => {
        if (activeSection === 'connection-requests') {
            fetchConnectionRequests();
        }
    }, [activeSection]);

    const handleApproveConnectionRequest = async (requestId) => {
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

    // --- Deals Approval Functions ---

    const fetchDealsToApprove = async () => {
        setIsLoadingDeals(true);
        try {
            console.log('[StartupDashboard] Fetching deals to approve...');
            const response = await dealsService.getStartupDeals();
            console.log('[StartupDashboard] Deals response:', response);

            let deals = Array.isArray(response?.data) ? response.data : (response?.data?.items || []);
            // Get all deals - no filtering

            setDealsToApprove(deals);
            console.log('[StartupDashboard] Deals loaded:', deals.length);
        } catch (error) {
            console.error('[StartupDashboard] Error fetching deals:', error);
            setDealsToApprove([]);
        } finally {
            setIsLoadingDeals(false);
        }
    };

    // Load deals on mount when deals tab is active
    React.useEffect(() => {
        if (activeSection === 'deals') {
            fetchDealsToApprove();
        }
    }, [activeSection]);

    const handleApproveDeal = async (dealId) => {
        setIsRespondingToDeal(dealId);
        try {
            console.log('[StartupDashboard] Approving deal:', dealId);
            const response = await dealsService.respondToDeal(dealId, true);
            console.log('[StartupDashboard] Approved deal:', response);

            if (response && (response.success || response.data)) {
                // Remove from pending list and show success
                setDealsToApprove(dealsToApprove.filter(d => d.dealId !== dealId));
                setSuccessMessage('✓ Đã chấp nhận đầu tư!');
                setShowSuccessModal(true);
            }
        } catch (error) {
            console.error('[StartupDashboard] Failed to approve deal:', error);
            setSuccessMessage('Lỗi: Không thể chấp nhận đầu tư');
            setShowSuccessModal(true);
        } finally {
            setIsRespondingToDeal(null);
        }
    };

    const handleRejectDeal = async (dealId) => {
        setIsRespondingToDeal(dealId);
        try {
            console.log('[StartupDashboard] Rejecting deal:', dealId);
            const normalizedReason = rejectReason.trim();
            if (!normalizedReason) {
                setSuccessMessage('Vui lòng nhập lý do từ chối trước khi gửi');
                setShowSuccessModal(true);
                return;
            }

            const response = await dealsService.respondToDeal(dealId, false, normalizedReason);
            console.log('[StartupDashboard] Rejected deal:', response);

            if (response && (response.success || response.data)) {
                setDealsToApprove(dealsToApprove.filter(d => d.dealId !== dealId));
                setSuccessMessage('✓ Đã từ chối đầu tư');
                setShowSuccessModal(true);
                setShowRejectDealModal(false);
                setRejectDealId(null);
                setRejectReason('');
            }
        } catch (error) {
            console.error('[StartupDashboard] Failed to reject deal:', error);
            setSuccessMessage('Lỗi: Không thể từ chối đầu tư');
            setShowSuccessModal(true);
        } finally {
            setIsRespondingToDeal(null);
        }
    };

    const handleOpenRejectDealModal = (dealId) => {
        setRejectDealId(dealId);
        setRejectReason('');
        setShowRejectDealModal(true);
    };

    const handleCloseRejectDealModal = () => {
        if (isRespondingToDeal) return;
        setShowRejectDealModal(false);
        setRejectDealId(null);
        setRejectReason('');
    };

    const handleShowContractPreview = async (deal) => {
        console.log('[StartupDashboard] handleShowContractPreview called for deal:', deal.dealId, 'status:', deal.status);
        console.log('[StartupDashboard] Loading contract preview for deal:', deal.dealId);
        setIsLoadingContract(true);

        try {
            setContractDealData(deal);
            // Use status directly from deal object (already have it from GET /api/Deals)
            setContractStatus(deal.status);
            console.log('[StartupDashboard] Set contractStatus to:', deal.status, 'type:', typeof deal.status);

            setSignFormData({
                finalAmount: deal.investmentAmount || 0,
                finalEquityPercentage: deal.equityPercentage || 0,
                additionalTerms: '',
                signatureBase64: ''
            });

            const response = await dealsService.getContractPreview(deal.dealId);
            console.log('[StartupDashboard] Contract preview loaded:', response?.success);

            if (response && response.data) {
                setContractPreviewHtml(response.data);
                setShowContractModal(true);
            } else {
                setSuccessMessage('Lỗi: Không thể tải hợp đồng');
                setShowSuccessModal(true);
            }
        } catch (error) {
            console.error('[StartupDashboard] Failed to load contract:', error);
            setSuccessMessage('Lỗi: Không thể tải hợp đồng - ' + (error.message || 'Vui lòng thử lại'));
            setShowSuccessModal(true);
        } finally {
            setIsLoadingContract(false);
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
        console.log('[StartupDashboard] Clearing signature');
        if (signatureCanvasRef.current) {
            signatureCanvasRef.current.clear();
            signatureDataRef.current = ''; // Clear ref too
            setIsSignatureEmpty(true);
            setSignFormData(prev => ({ ...prev, signatureBase64: '' }));
        }
    };

    const handleSaveSignature = () => {
        console.log('[StartupDashboard] Saving signature...');
        if (signatureCanvasRef.current) {
            const isEmpty = signatureCanvasRef.current.isEmpty();
            console.log('[StartupDashboard] Canvas isEmpty:', isEmpty);

            if (!isEmpty) {
                try {
                    const canvasUrl = signatureCanvasRef.current.toDataURL('image/png');
                    // Extract plain base64 from data URL (remove 'data:image/png;base64,' prefix)
                    const base64String = canvasUrl.replace(/^data:image\/png;base64,/, '');
                    console.log('[StartupDashboard] Signature Base64 length:', base64String.length);

                    // Store in ref for reliable access
                    signatureDataRef.current = base64String;

                    // Also update state for UI
                    setSignFormData(prev => {
                        const updated = { ...prev, signatureBase64: base64String };
                        console.log('[StartupDashboard] Updated signFormData with signature');
                        return updated;
                    });
                } catch (err) {
                    console.error('[StartupDashboard] Error saving signature:', err);
                }
            } else {
                console.log('[StartupDashboard] Canvas is empty, cannot save');
            }
        } else {
            console.log('[StartupDashboard] No canvas ref found');
        }
    };

    const handleSignContract = async () => {
        if (!contractDealData) return;

        console.log('[StartupDashboard] handleSignContract called');
        console.log('[StartupDashboard] Current signFormData:', signFormData);
        console.log('[StartupDashboard] Ref signature length:', signatureDataRef.current.length);

        // Priority: ref > state > canvas
        let finalSignature = signatureDataRef.current || signFormData.signatureBase64;

        // If no signature in ref/state, try to get from canvas directly
        if (!finalSignature && signatureCanvasRef.current) {
            console.log('[StartupDashboard] Getting signature from canvas directly');
            if (!signatureCanvasRef.current.isEmpty()) {
                try {
                    const canvasUrl = signatureCanvasRef.current.toDataURL('image/png');
                    finalSignature = canvasUrl.replace(/^data:image\/png;base64,/, ''); // Extract plain base64
                    signatureDataRef.current = finalSignature; // Store in ref
                    console.log('[StartupDashboard] Got signature from canvas, length:', finalSignature.length);
                } catch (err) {
                    console.error('[StartupDashboard] Error getting signature from canvas:', err);
                }
            }
        }

        // Validate form
        if (!signFormData.finalAmount || signFormData.finalAmount === 0) {
            setSuccessMessage('Vui lòng nhập số tiền');
            setShowSuccessModal(true);
            return;
        }

        if (!signFormData.finalEquityPercentage && signFormData.finalEquityPercentage !== 0) {
            setSuccessMessage('Vui lòng nhập phần trăm cổ phần');
            setShowSuccessModal(true);
            return;
        }

        if (!finalSignature) {
            console.log('[StartupDashboard] No signature found');
            setSuccessMessage('Vui lòng vẽ chữ ký');
            setShowSuccessModal(true);
            return;
        }

        setIsSigningContract(true);
        try {
            console.log('[StartupDashboard] Signing contract for deal:', contractDealData.dealId);

            // Prepare data with final signature
            const contractData = {
                finalAmount: signFormData.finalAmount,
                finalEquityPercentage: signFormData.finalEquityPercentage,
                additionalTerms: signFormData.additionalTerms,
                signatureBase64: finalSignature
            };

            console.log('[StartupDashboard] Sending contract data (Investor signing):', {
                dealId: contractDealData.dealId,
                finalAmount: contractData.finalAmount,
                finalEquityPercentage: contractData.finalEquityPercentage,
                signatureBase64Length: contractData.signatureBase64.length
            });

            const response = await dealsService.signContract(contractDealData.dealId, contractData);
            console.log('[StartupDashboard] Contract signed:', response);

            if (response && (response.success || response.data)) {
                setSuccessMessage('✓ Hợp đồng đã được ký thành công!');
                setShowSuccessModal(true);
                setShowContractModal(false);
                setContractPreviewHtml(null);
                setContractDealData(null);
                setSignFormData({ finalAmount: 0, finalEquityPercentage: 0, additionalTerms: '', signatureBase64: '' });
                setIsSignatureEmpty(true);
                signatureDataRef.current = ''; // Clear ref

                // Refresh deals list
                await fetchDealsToApprove();
            } else {
                setSuccessMessage('Lỗi: Không thể ký hợp đồng');
                setShowSuccessModal(true);
            }
        } catch (error) {
            console.error('[StartupDashboard] Failed to sign contract:', error);
            setSuccessMessage('Lỗi: Không thể ký hợp đồng - ' + (error.message || 'Vui lòng thử lại'));
            setShowSuccessModal(true);
        } finally {
            setIsSigningContract(false);
        }
    };

    const handleSignContractAsStartup = async () => {
        if (!contractDealData) return;

        console.log('[StartupDashboard] handleSignContractAsStartup called');
        console.log('[StartupDashboard] Ref signature length:', signatureDataRef.current.length);

        // Priority: ref > state > canvas
        let finalSignature = signatureDataRef.current || signFormData.signatureBase64;

        // If no signature in ref/state, try to get from canvas directly
        if (!finalSignature && signatureCanvasRef.current) {
            console.log('[StartupDashboard] Getting signature from canvas directly');
            if (!signatureCanvasRef.current.isEmpty()) {
                try {
                    const canvasUrl = signatureCanvasRef.current.toDataURL('image/png');
                    finalSignature = canvasUrl.replace(/^data:image\/png;base64,/, ''); // Extract plain base64
                    signatureDataRef.current = finalSignature; // Store in ref
                    console.log('[StartupDashboard] Got signature from canvas, length:', finalSignature.length);
                } catch (err) {
                    console.error('[StartupDashboard] Error getting signature from canvas:', err);
                }
            }
        }

        // Validate signature only
        if (!finalSignature) {
            console.log('[StartupDashboard] No signature found');
            setSuccessMessage('Vui lòng vẽ chữ ký');
            setShowSuccessModal(true);
            return;
        }

        setIsSigningContract(true);
        try {
            console.log('[StartupDashboard] Signing contract as STARTUP for deal:', contractDealData.dealId);

            // Only send signature - API only requires signatureBase64
            const contractData = {
                signatureBase64: finalSignature
            };

            console.log('[StartupDashboard] Sending contract data (Startup signing):', {
                dealId: contractDealData.dealId,
                signatureBase64Length: contractData.signatureBase64.length
            });

            const response = await dealsService.signContractStartup(contractDealData.dealId, contractData);
            console.log('[StartupDashboard] Contract signed by startup:', response);

            if (response && (response.success || response.data)) {
                setSuccessMessage('✓ Startup đã ký hợp đồng thành công!');
                setShowSuccessModal(true);
                setShowContractModal(false);
                setContractPreviewHtml(null);
                setContractDealData(null);
                setSignFormData({ finalAmount: 0, finalEquityPercentage: 0, additionalTerms: '', signatureBase64: '' });
                setIsSignatureEmpty(true);
                signatureDataRef.current = ''; // Clear ref

                // Refresh deals list
                await fetchDealsToApprove();
            } else {
                setSuccessMessage('Lỗi: Không thể ký hợp đồng');
                setShowSuccessModal(true);
            }
        } catch (error) {
            console.error('[StartupDashboard] Failed to sign contract as startup:', error);
            setSuccessMessage('Lỗi: Không thể ký hợp đồng - ' + (error.message || 'Vui lòng thử lại'));
            setShowSuccessModal(true);
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

    const handleOpenRejectContractModal = () => {
        setRejectContractReason('');
        // Hide contract preview modal first so it does not cover rejection form.
        setShowContractModal(false);
        setShowRejectContractModal(true);
    };

    const handleCloseRejectContractModal = () => {
        if (isRejectingContract) return;
        setShowRejectContractModal(false);
        setRejectContractReason('');
    };

    const handleRejectContractAsStartup = async () => {
        if (!contractDealData?.dealId) return;

        const normalizedReason = rejectContractReason.trim();
        if (!normalizedReason) {
            setSuccessMessage('Vui lòng nhập lý do từ chối hợp đồng');
            setShowSuccessModal(true);
            return;
        }

        setIsRejectingContract(true);
        try {
            const response = await dealsService.rejectContractByStartup(contractDealData.dealId, normalizedReason);
            if (response && (response.success || response.data)) {
                setSuccessMessage('✓ Đã từ chối hợp đồng và gửi lý do cho nhà đầu tư');
                setShowSuccessModal(true);
                setShowRejectContractModal(false);
                setRejectContractReason('');
                handleCloseContractModal();
                await fetchDealsToApprove();
            } else {
                setSuccessMessage('Lỗi: Không thể từ chối hợp đồng');
                setShowSuccessModal(true);
            }
        } catch (error) {
            console.error('[StartupDashboard] Failed to reject contract as startup:', error);
            setSuccessMessage('Lỗi: Không thể từ chối hợp đồng - ' + (error.message || 'Vui lòng thử lại'));
            setShowSuccessModal(true);
        } finally {
            setIsRejectingContract(false);
        }
    };

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

                // Auto-verify all documents on blockchain (BR-08)
                docItems.forEach(doc => {
                    const docId = doc.id || doc.documentId;
                    if (docId) verifyDocOnBlockchain(docId);
                });
            } else {
                setDocuments([]);
            }
        } catch (error) {
            console.error('Error fetching documents:', error);
            setDocuments([]);
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
    const handleOpenProjectDetail = (p) => {
        const pId = p.id || p.projectId;
        setDetailProject(p);
        setShowDetailModal(true);
        fetchAnalysisHistory(pId);

        // Fetch advisor and booking info for all statuses (as requested)
        fetchBookingEligibility(pId, p.status);
    };

    // BR-15: Submit Project for Staff Review (WITHOUT AI - Direct submission)
    const handleSubmitProject = async (projectId) => {
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
    const parseTeamMembers = (text) => {
        if (!text) return [];
        const members = text.split(/[\n,]+/).map(m => m.trim()).filter(Boolean);
        return members.map(m => {
            const match = m.match(/^(.*?)\s*\((.*?)\)$/);
            if (match) {
                return { name: match[1].trim(), role: match[2].trim() };
            }
            return { name: m, role: 'Thành viên' };
        });
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
                            />
                        );
                    })()}

                    {activeSection !== 'account_profile' && !isLoadingInitialData && !startupProfile && (
                        <StartupProfileBanner
                            onRedirect={() => setActiveSection('complete-info')}
                        />
                    )}


                    {/* Navigation Tabs List */}
                    {activeSection !== 'account_profile' && (
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
                                <button
                                    className={`${styles.tab} ${activeSection === 'complete-info' ? styles.active : ''}`}
                                    onClick={() => setActiveSection('complete-info')}
                                >
                                    Thông tin bổ sung
                                </button>
                                {/* Animated Indicator Line */}
                                <div className={styles.tabIndicator} style={indicatorStyle} />
                            </div>
                            {isMobile && showRightTabIndicator && <div className={`${styles.scrollIndicator} ${styles.scrollIndicatorRight}`} />}
                        </div>
                    )}
                </>
            )}

            {activeSection !== 'pr_news' && (
                <div className={`${activeSection.startsWith('project_') ? styles.contentFull : styles.content} ${styles.scrollableSection}`}>

                    {/* Startup Profile Form (Section View) */}
                    {activeSection === 'complete-info' && (
                        <div className={styles.section}>
                            <StartupProfileForm
                                initialData={startupProfile}
                                user={user}
                                onSuccess={(data) => {
                                    setStartupProfile(data);
                                    setSuccessMessage('Cập nhật thông tin startup thành công!');
                                    setShowSuccessModal(true);
                                }}
                            />
                        </div>
                    )}

                    {/* My Projects Section - Standardized Grid */}
                    {activeSection === 'my-projects' && (
                        <DashboardSection
                            title="Dự án của tôi"
                            topBarExtra={
                                <div className={styles.searchWrapper} style={{ position: 'relative', width: isMobile ? '100%' : '300px' }}>
                                    <Search className={styles.searchIcon} size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                                    <input
                                        type="text"
                                        placeholder="Tìm kiếm dự án..."
                                        className={styles.searchInput}
                                        value={projectSearchTerm}
                                        onChange={(e) => setProjectSearchTerm(e.target.value)}
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
                                    options={projectFilterOptions}
                                    counts={getProjectCounts()}
                                    activeFilter={projectFilter}
                                    onFilterChange={setProjectFilter}
                                />
                            }
                        >
                            {isLoadingInitialData ? (
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
                                                        key={p.id || p.projectId}
                                                        className={kanban.bcard}
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
                                                                    <span className={`${kanban.btag} ${p.developmentStage === 'MVP' ? kanban.btagMvp : p.developmentStage === 'Idea' ? kanban.btagIdea : kanban.btagGrowth}`}>
                                                                        {getStageLabel(p.developmentStage)}
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
                                                id={`connection-card-${request.connectionRequestId}`}
                                                key={request.connectionRequestId}
                                                className={styles.card}
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
                                                        <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', fontWeight: '800', color: 'var(--text-primary)' }}>
                                                            {request.investorName || 'Nhà đầu tư'}
                                                        </h4>
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
                        />
                    )}

                    {activeSection === 'account_profile' && (
                        <AccountProfileTab user={user} onLogout={onLogout} />
                    )}

                    {activeSection.startsWith('project_') && (
                        <ProjectDetailView
                            projectId={activeSection.split('_')[1]}
                            onBack={() => setActiveSection('bookings')}
                            user={user}
                            isFullView={true}
                        />
                    )}

                    {/* Deals Approval Section */}
                    {activeSection === 'deals' && (
                        <DashboardSection
                            title="Đầu tư & Ký kết"
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
                                        const statusMap = {
                                            0: { label: 'Chờ xác nhận', color: '#f59e0b' },
                                            'Pending': { label: 'Chờ xác nhận', color: '#f59e0b' },
                                            1: { label: 'Đã xác nhận', color: '#10b981' },
                                            'Confirmed': { label: 'Đã xác nhận', color: '#10b981' },
                                            2: { label: 'Chờ ký từ Startup', color: '#f97316' },
                                            'Waiting_For_Startup_Signature': { label: 'Chờ ký từ Startup', color: '#f97316' },
                                            3: { label: 'Đã ký kết', color: '#667eea' },
                                            'Contract_Signed': { label: 'Đã ký kết', color: '#667eea' },
                                            4: { label: 'Đã mint NFT', color: '#8b5cf6' },
                                            'Minted_NFT': { label: 'Đã mint NFT', color: '#8b5cf6' },
                                            5: { label: 'Bị từ chối', color: '#ef4444' },
                                            'Rejected': { label: 'Bị từ chối', color: '#ef4444' },
                                            6: { label: 'Thất bại', color: '#dc2626' },
                                            'Failed': { label: 'Thất bại', color: '#dc2626' }
                                        };
                                        const statusInfo = statusMap[deal.status] || { label: 'Không xác định', color: '#64748b' };

                                        return (
                                            <div
                                                id={`deal-card-${deal.dealId}`}
                                                key={deal.dealId}
                                                className={styles.card}
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
                                                            Deal #{deal.dealId}
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
                                                    <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>
                                                        {deal.investorName || 'Nhà đầu tư'}
                                                    </div>
                                                </div>

                                                {/* Deal Details */}
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                                    {deal.investmentAmount && (
                                                        <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: '10px', borderRadius: '6px' }}>
                                                            <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '2px' }}>Số tiền</div>
                                                            <div style={{ fontSize: '13px', fontWeight: '700', color: '#10b981' }}>
                                                                {deal.investmentAmount.toLocaleString('vi-VN')} VNĐ
                                                            </div>
                                                        </div>
                                                    )}
                                                    {deal.createdAt && (
                                                        <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '10px', borderRadius: '6px' }}>
                                                            <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '2px' }}>Ngày tạo</div>
                                                            <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>
                                                                {new Date(deal.createdAt).toLocaleDateString('vi-VN')}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Actions */}
                                                <div style={{ display: 'flex', gap: '8px', marginTop: 'auto', flexWrap: 'wrap' }}>
                                                    {(deal.status === 'Pending' || deal.status === 0) && (
                                                        <>
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
                                                                    opacity: isRespondingToDeal === deal.dealId ? 0.7 : 1
                                                                }}
                                                                onClick={() => handleApproveDeal(deal.dealId)}
                                                                disabled={isRespondingToDeal === deal.dealId}
                                                            >
                                                                {isRespondingToDeal === deal.dealId ? (
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
                                                                    opacity: isRespondingToDeal === deal.dealId ? 0.7 : 1
                                                                }}
                                                                onClick={() => handleOpenRejectDealModal(deal.dealId)}
                                                                disabled={isRespondingToDeal === deal.dealId}
                                                            >
                                                                {isRespondingToDeal === deal.dealId ? (
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

                                                    {(deal.status === 'Confirmed' || deal.status === 1) && (
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
                                                                transition: 'all 0.2s'
                                                            }}
                                                            onClick={() => handleShowContractPreview(deal)}
                                                        >
                                                            📄 Ký hợp đồng
                                                        </button>
                                                    )}

                                                    {(deal.status === 'Waiting_For_Startup_Signature' || deal.status === 2) && (
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
                                                                transition: 'all 0.2s'
                                                            }}
                                                            onClick={() => handleShowContractPreview(deal)}
                                                        >
                                                            ✓ Xem & Ký
                                                        </button>
                                                    )}

                                                    {(deal.status === 'Contract_Signed' || deal.status === 3) && (
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
                                                            onClick={() => handleShowContractPreview(deal)}
                                                        >
                                                            📄 Xem hợp đồng
                                                        </button>
                                                    )}

                                                    {(deal.status === 'Minted_NFT' || deal.status === 4 || deal.status === 'Failed' || deal.status === 6) && (
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
                                                                cursor: 'pointer'
                                                            }}
                                                            onClick={() => handleShowContractPreview(deal)}
                                                        >
                                                            📄 Chi tiết
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
                    <div className={styles.modalContent}>
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
                                        {getStageLabel(detailProject.developmentStage)}
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
                                        <Maximize2 size={24} />
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
                                                    {getStageLabel(detailProject.developmentStage)}
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
                                                        {getStageLabel(detailProject.developmentStage)}
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
                                            backgroundColor: 'rgba(29, 155, 240, 0.03)',
                                            borderRadius: '24px',
                                            border: '1px solid rgba(29, 155, 240, 0.1)',
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
                                                    const filteredHistory = analysisHistory.filter(item => (item.potentialScore !== undefined && item.potentialScore !== null) || (item.data && item.data.potentialScore !== undefined));

                                                    return isLoadingHistory ? (
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '14px' }}>
                                                            <Loader2 className={styles.spinner} size={16} /> Đang cập nhật lịch sử...
                                                        </div>
                                                    ) : filteredHistory.length > 0 ? (
                                                        filteredHistory.map((item, idx) => (
                                                            <div key={idx} onClick={() => { setSelectedHistoryResult({ data: item }); setShowHistoryView(true); }} className={styles.scoreCard}>
                                                                <div className={styles.scoreHeader}>
                                                                    <span className={styles.scoreMainValue}>{item.potentialScore}</span>
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
                                                    <div className={styles.advisorActionRow}>
                                                        <button
                                                            className={`${styles.primaryBtn} ${styles.advisorBookingBtn}`}
                                                            onClick={() => {
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
                                                        <TrendingUp size={16} /> {getStageLabel(detailProject.developmentStage)}
                                                    </div>
                                                </div>
                                                <div>
                                                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 900, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '10px', letterSpacing: '0.05em' }}>Lĩnh vực chính</label>
                                                    <p style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>{detailProject.industry || 'Chưa cập nhật'}</p>
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

                                    {/* Section 2: Market & Finance */}
                                    <section className={styles.projectDetailSection}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                                            <div style={{ width: '4px', height: '24px', backgroundColor: '#10b981', borderRadius: '4px' }} />
                                            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '0.02em' }}>2. THỊ TRƯỜNG & TÀI CHÍNH</h3>
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px', marginBottom: '32px' }}>
                                            <div style={{ padding: '20px', backgroundColor: 'rgba(16, 185, 129, 0.05)', borderRadius: '20px', border: '1px solid rgba(16, 185, 129, 0.1)' }}>
                                                <label style={{ display: 'block', fontSize: '10px', fontWeight: 900, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '6px' }}>Quy mô thị trường</label>
                                                <p style={{ margin: 0, fontSize: '18px', fontWeight: 900, color: 'var(--text-primary)' }}>{detailProject.marketSize ? Number(detailProject.marketSize).toLocaleString('vi-VN') + ' VND' : '—'}</p>
                                            </div>
                                            <div style={{ padding: '20px', backgroundColor: 'rgba(29, 155, 240, 0.05)', borderRadius: '20px', border: '1px solid rgba(29, 155, 240, 0.1)' }}>
                                                <label style={{ display: 'block', fontSize: '10px', fontWeight: 900, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '6px' }}>Doanh thu dự kiến</label>
                                                <p style={{ margin: 0, fontSize: '18px', fontWeight: 900, color: 'var(--primary-blue)' }}>{detailProject.revenue ? Number(detailProject.revenue).toLocaleString('vi-VN') + ' VND' : '—'}</p>
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
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
                                        </div>
                                    </section>

                                    {/* Section 3: Team */}
                                    <section className={styles.projectDetailSection}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                                            <div style={{ width: '4px', height: '24px', backgroundColor: '#f59e0b', borderRadius: '4px' }} />
                                            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '0.02em' }}>3. ĐỘI NGŨ SÁNG LẬP</h3>
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '11px', fontWeight: 900, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '16px' }}>Thành viên & Vai trò</label>
                                                <div className={styles.teamGrid}>
                                                    {parseTeamMembers(detailProject.teamMembers).map((member, idx) => (
                                                        <div key={idx} className={styles.teamMemberCard} style={{ backgroundColor: 'var(--bg-hover)' }}>
                                                            <div className={styles.teamMemberAvatar}>
                                                                <Users size={20} />
                                                            </div>
                                                            <div className={styles.teamMemberInfo}>
                                                                <p className={styles.teamMemberName}>{member.name}</p>
                                                                <span className={styles.teamMemberRole}>{member.role}</span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </section>

                                    {/* Section 4: Competition [NEW] */}
                                    <section className={styles.projectDetailSection}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                                            <div style={{ width: '4px', height: '24px', backgroundColor: '#f43f5e', borderRadius: '4px' }} />
                                            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '0.02em' }}>4. CẠNH TRANH</h3>
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '11px', fontWeight: 900, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '12px' }}>Kinh nghiệm đội ngũ</label>
                                                <p style={{ margin: 0, fontSize: '15px', color: 'var(--text-primary)', lineHeight: 1.8 }}>{detailProject.keySkills || '—'}</p>
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '11px', fontWeight: 900, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '12px' }}>Đối thủ cạnh tranh</label>
                                                <p style={{ margin: 0, fontSize: '15px', color: 'var(--text-primary)', lineHeight: 1.8 }}>{detailProject.competitors || '—'}</p>
                                            </div>
                                        </div>
                                    </section>

                                    <section className={styles.projectDetailSection}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                                            <div style={{ width: '4px', height: '24px', backgroundColor: 'var(--primary-blue)', borderRadius: '4px' }} />
                                            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '0.02em' }}>5. TÀI LIỆU DỰ ÁN</h3>
                                        </div>

                                        {/* Upload Section */}
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
                                                position: 'relative'
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
                                            <div className={styles.uploadControls}>
                                                <div className={styles.uploadInfo}>
                                                    <Upload size={24} className={styles.uploadIcon} />
                                                    <div>
                                                        <p className={styles.uploadTitle}>Tải lên tài liệu mới</p>
                                                        <p className={styles.uploadSubtitle}>Kéo thả hoặc click để chọn file (PDF, Docx, Image)</p>
                                                    </div>
                                                </div>
                                                <div className={styles.uploadActions}>
                                                    <select
                                                        className={styles.selectSmall}
                                                        value={documentType}
                                                        onChange={(e) => setDocumentType(e.target.value)}
                                                        disabled={detailProject.status !== 'Draft'}
                                                    >
                                                        <option value="PitchDeck">Pitch Deck</option>
                                                        <option value="BusinessPlan">Kế hoạch kinh doanh</option>
                                                        <option value="Other">Khác</option>
                                                    </select>
                                                    <button
                                                        className={styles.uploadBtn}
                                                        onClick={() => hiddenFileInput.current.click()}
                                                        disabled={isUploading || detailProject.status !== 'Draft'}
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

            {showRejectDealModal && (
                <div className={styles.modalOverlay} onClick={handleCloseRejectDealModal}>
                    <div className={styles.modalContent} style={{ maxWidth: '520px', padding: '20px 22px' }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>Từ chối đề nghị đầu tư</h3>
                            <button
                                type="button"
                                className={styles.modalCloseBtn}
                                onClick={handleCloseRejectDealModal}
                                disabled={!!isRespondingToDeal}
                            >
                                <X size={18} />
                            </button>
                        </div>
                        <p style={{ margin: '0 0 14px 0', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                            Lý do này sẽ được gửi cho nhà đầu tư để họ biết vì sao đề nghị chưa phù hợp.
                        </p>

                        <div className={styles.formGroup} style={{ marginBottom: '18px' }}>
                            <label>Lý do từ chối *</label>
                            <textarea
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                placeholder="Ví dụ: Startup chưa phù hợp mức định giá/điều khoản đầu tư hiện tại."
                                rows={4}
                                maxLength={1000}
                                disabled={!!isRespondingToDeal}
                                style={{
                                    minHeight: '110px',
                                    resize: 'vertical',
                                    borderRadius: '10px',
                                    border: '1px solid var(--border-color, #e2e8f0)',
                                    background: 'var(--bg-secondary)',
                                    padding: '12px 14px',
                                    fontSize: '14px',
                                    lineHeight: 1.45
                                }}
                            />
                            <div style={{ marginTop: '6px', fontSize: '12px', color: 'var(--text-secondary)', textAlign: 'right' }}>
                                {rejectReason.trim().length}/1000 ký tự
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '2px' }}>
                            <button
                                type="button"
                                className={styles.secondaryBtn}
                                onClick={handleCloseRejectDealModal}
                                disabled={!!isRespondingToDeal}
                                style={{
                                    minWidth: '96px',
                                    borderRadius: '10px',
                                    height: '40px'
                                }}
                            >
                                Hủy
                            </button>
                            <button
                                type="button"
                                className={styles.dangerBtn}
                                onClick={() => handleRejectDeal(rejectDealId)}
                                disabled={!rejectDealId || !rejectReason.trim() || !!isRespondingToDeal}
                                style={{
                                    minWidth: '152px',
                                    borderRadius: '10px',
                                    height: '40px',
                                    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                                    border: 'none',
                                    color: '#fff',
                                    fontWeight: 600
                                }}
                            >
                                {isRespondingToDeal ? (
                                    <>
                                        <Loader2 size={14} className={styles.spinner} />
                                        Đang gửi...
                                    </>
                                ) : (
                                    'Gửi từ chối'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

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
                                        Nhà đầu tư: <strong>{contractDealData.investorName || 'Nhà đầu tư'}</strong> • Số tiền: <strong>{contractDealData.investmentAmount?.toLocaleString('vi-VN')} VND</strong>
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
                                {isLoadingContract ? (
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

                                    {/* Final Amount - Only for Investor (or if editable) */}
                                    {(!contractStatus || contractStatus < 2) && (
                                        <>
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
                                        </>
                                    )}

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
                                <>
                                    {['Waiting_For_Startup_Signature', 2, '2'].includes(contractStatus) && (
                                        <button
                                            onClick={handleOpenRejectContractModal}
                                            disabled={isSigningContract || isRejectingContract}
                                            className={styles.dangerBtn}
                                            style={{ padding: '10px 22px' }}
                                        >
                                            <XCircle size={16} /> Hủy ký hợp đồng
                                        </button>
                                    )}
                                    <button
                                        onClick={handleSignContractAsStartup}
                                        disabled={isSigningContract || isRejectingContract}
                                        className={styles.primaryBtn}
                                        style={{ padding: '10px 32px' }}
                                    >
                                        {isSigningContract ? (
                                            <>
                                                <Loader2 size={16} className="animate-spin" />
                                                Đang ký...
                                            </>
                                        ) : (
                                            <><Check size={16} /> Ký (Startup)</>
                                        )}
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {showRejectContractModal && (
                <div className={styles.modalOverlay} onClick={handleCloseRejectContractModal}>
                    <div className={styles.modalContent} style={{ maxWidth: '520px', padding: '20px 22px' }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>Hủy ký hợp đồng</h3>
                            <button
                                type="button"
                                className={styles.modalCloseBtn}
                                onClick={handleCloseRejectContractModal}
                                disabled={isRejectingContract}
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <p style={{ margin: '0 0 14px 0', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                            Lý do từ chối sẽ được gửi cho nhà đầu tư và hiển thị ở deal bị từ chối.
                        </p>

                        <div className={styles.formGroup} style={{ marginBottom: '18px' }}>
                            <label>Lý do từ chối hợp đồng *</label>
                            <textarea
                                value={rejectContractReason}
                                onChange={(e) => setRejectContractReason(e.target.value)}
                                placeholder="Ví dụ: Điều khoản số tiền/cổ phần trong hợp đồng chưa đúng với thỏa thuận."
                                rows={4}
                                maxLength={1000}
                                disabled={isRejectingContract}
                                style={{
                                    minHeight: '110px',
                                    resize: 'vertical',
                                    borderRadius: '10px',
                                    border: '1px solid var(--border-color, #e2e8f0)',
                                    background: 'var(--bg-secondary)',
                                    padding: '12px 14px',
                                    fontSize: '14px',
                                    lineHeight: 1.45
                                }}
                            />
                            <div style={{ marginTop: '6px', fontSize: '12px', color: 'var(--text-secondary)', textAlign: 'right' }}>
                                {rejectContractReason.trim().length}/1000 ký tự
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                            <button
                                type="button"
                                className={styles.secondaryBtn}
                                onClick={handleCloseRejectContractModal}
                                disabled={isRejectingContract}
                                style={{ minWidth: '96px', borderRadius: '10px', height: '40px' }}
                            >
                                Hủy
                            </button>
                            <button
                                type="button"
                                className={styles.dangerBtn}
                                onClick={handleRejectContractAsStartup}
                                disabled={!rejectContractReason.trim() || isRejectingContract}
                                style={{
                                    minWidth: '170px',
                                    borderRadius: '10px',
                                    height: '40px',
                                    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                                    border: 'none',
                                    color: '#fff',
                                    fontWeight: 600
                                }}
                            >
                                {isRejectingContract ? (
                                    <>
                                        <Loader2 size={14} className={styles.spinner} />
                                        Đang gửi...
                                    </>
                                ) : (
                                    <>
                                        <AlertCircle size={14} /> Gửi từ chối hợp đồng
                                    </>
                                )}
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
                    initialProjectId={detailProject?.projectId || detailProject?.id}
                    initialAdvisorId={bookingInitialAdvisorId}
                    onClose={() => setShowBookingWizard(false)}
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
                />
            )}
        </div>
    );
}
