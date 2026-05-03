import React, { useState, useEffect } from 'react';
import {
    MagnifyingGlass,
    MapPin,
    RocketLaunch,
    Funnel,
    TrendUp,
    CheckCircle,
    Target,
    Buildings,
    Newspaper,
    Calendar,
    User,
    ArrowSquareOut
} from '@phosphor-icons/react';
import FeedHeader from '../components/feed/FeedHeader';
import InvestmentModal from '../components/common/InvestmentModal';
import startupProfileService from '../services/startupProfileService';
import projectSubmissionService from '../services/projectSubmissionService';
import { filterProjectsForPublicDiscovery } from '../utils/projectDiscoveryFilters';
import dealsService from '../services/dealsService';
import prService from '../services/prService';
import NotificationCenter from '../components/common/NotificationCenter';
import FloatingChatWidget from '../components/common/FloatingChatWidget';
import StartupCard from '../components/feed/StartupCard';
import optionService from '../services/optionService';
import { getStageLabel } from '../constants/ProjectStatus';
import styles from './DiscoveryHub.module.css';

/**
 * StartupDiscovery - Explore and discover startup companies
 * Featuring search, industry filtering, and premium startup cards.
 */
const DiscoveryHub = ({ user, onSelectStartup, onNotificationNavigate, banner, isInvestorApproved = false, onRestrictedAction }) => {
    const [startups, setStartups] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeIndustry, setActiveIndustry] = useState('Tất cả');
    const [investmentModal, setInvestmentModal] = useState(null); // { projectId, projectName, startupName }
    const [investmentStatusMap, setInvestmentStatusMap] = useState({}); // Map projectId -> {dealId, status}
    const [prs, setPRs] = useState([]); // All PRs for news feed
    const [isLoadingPRs, setIsLoadingPRs] = useState(false);
    const [showAllPRs, setShowAllPRs] = useState(false); // Toggle for PR modal
    const [activeChatSession, setActiveChatSession] = useState(null);
    const [myStartupProfile, setMyStartupProfile] = useState(null);
    const [stages, setStages] = useState([]);
    const [activeStage, setActiveStage] = useState('Tất cả');

    const industries = ['Tất cả', 'FinTech', 'AgriTech', 'EdTech', 'HealthTech', 'SaaS', 'AI/ML', 'GreenTech'];

    const isInvestor = user && (user.role === 'Investor' || user.role === 1);
    const isStartup = user && (user.role === 'Startup' || user.role === 2);

    const isActiveInvestmentStatus = (status) => {
        const normalized = typeof status === 'string' ? status.toLowerCase() : status;
        // Startup rejected -> Canceled must allow investor to invest again.
        if (normalized === 'canceled' || normalized === 'cancelled' || normalized === 5 || normalized === '5') return false;
        return true;
    };

    useEffect(() => {
        const fetchInitialData = async () => {
            const fetchStages = async () => {
                try {
                    const res = await optionService.getStages();
                    setStages(res.filter(s => s.isActive));
                } catch (err) {
                    console.error("Failed to fetch stages", err);
                }
            };
            fetchStages();

            if (isStartup) {
                try {
                    const profile = await startupProfileService.getStartupMe();
                    setMyStartupProfile(profile);
                } catch (error) {
                    console.error("Failed to fetch my startup profile:", error);
                }
            }
        };
        fetchInitialData();
    }, [isStartup]);

    const fetchProjects = async () => {
        setIsLoading(true);
        try {
            // Fetch both projects and startup profiles to join logo data
            const [projectsRes, startupsRes] = await Promise.all([
                projectSubmissionService.getAllProjects(),
                startupProfileService.getAllStartups({ pageSize: 100 })
            ]);

            const startupMap = {};
            const profiles = startupsRes?.data?.items || startupsRes?.items || [];
            profiles.forEach(p => {
                const info = {
                    name: p.organizationName || p.companyName,
                    logo: p.logoUrl || p.logo
                };
                if (p.startupId) startupMap[p.startupId] = info;
                if (p.id) startupMap[p.id] = info;
                if (p.userId) startupMap[p.userId] = info;
            });

            const raw = projectsRes?.data?.items || projectsRes?.items || [];
            const approved = filterProjectsForPublicDiscovery(raw);

            const items = approved.map(p => {
                const sid = p.startupId || p.StartupId || p.userId || p.UserId;
                const info = startupMap[sid];
                
                // Robust industry mapping
                let industryDisp = 'Chưa cập nhật';
                const ind = p.industry || p.Industry;
                if (ind) industryDisp = ind;
                else {
                    const inds = p.industries || p.Industries;
                    if (Array.isArray(inds) && inds.length > 0) industryDisp = inds[0];
                }

                return {
                    ...p,
                    id: p.projectId,
                    startupName: info?.name || p.startupName || p.organizationName,
                    logoUrl: info?.logo || p.logoUrl || p.logo,
                    // Map current API fields to StartupCard expected fields if missing
                    name: p.projectName,
                    description: p.shortDescription,
                    industry: industryDisp,
                    stage: getStageLabel(p.stageOptionId || p.StageOptionId || p.developmentStage || p.DevelopmentStage, stages),
                    score: p.startupPotentialScore,
                    timestamp: p.createdAt ? new Date(p.createdAt).toLocaleDateString('vi-VN') : ''
                };
            });

            setStartups(items);

            if (isInvestor) {
                fetchInvestmentStatusNow(items);
            }
        } catch (error) {
            console.error("Failed to fetch projects:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchProjects();
    }, [isInvestor]);

    const fetchInvestmentStatusNow = async (startupsList = null) => {
        if (!isInvestor) {
            setInvestmentStatusMap({});
            return;
        }

        try {
            const dealsRes = await dealsService.getInvestorDeals();
            const deals = dealsRes?.data?.items || [];

            const combinedMap = {};
            deals.forEach(deal => {
                if (!isActiveInvestmentStatus(deal.status)) return;
                const dealInfo = {
                    dealId: deal.dealId,
                    status: deal.status,
                    projectId: deal.projectId,
                    projectName: deal.projectName,
                    startupName: deal.startupName
                };

                if (deal.projectId) combinedMap[deal.projectId] = dealInfo;
                if (deal.projectId) combinedMap[deal.projectId.toString()] = dealInfo;
            });

            setInvestmentStatusMap(combinedMap);
        } catch (error) {
            console.error('[DiscoveryHub] Failed to fetch investment status:', error);
            setInvestmentStatusMap({});
        }
    };

    useEffect(() => {
        if (!isInvestor || startups.length === 0) return;
        fetchInvestmentStatusNow(startups);
    }, [isInvestor, startups.length]);

    useEffect(() => {
        const fetchPRs = async () => {
            setIsLoadingPRs(true);
            try {
                const response = await prService.getPRs();
                let prList = response?.data?.items || response?.data || response?.items || response || [];
                if (!Array.isArray(prList)) prList = [];

                const sortedPRs = prList.sort((a, b) =>
                    new Date(b.publishedAt) - new Date(a.publishedAt)
                );
                setPRs(sortedPRs);
            } catch (error) {
                console.error('[DiscoveryHub] Failed to fetch PRs:', error);
            } finally {
                setIsLoadingPRs(false);
            }
        };

        fetchPRs();
    }, []);

    const filteredStartups = startups.filter(startup => {
        const matchesSearch = (startup.projectName?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
            (startup.shortDescription?.toLowerCase() || '').includes(searchQuery.toLowerCase());
        const matchesIndustry = activeIndustry === 'Tất cả' || startup.industry === activeIndustry;
        const matchesStage = activeStage === 'Tất cả' || startup.stage === activeStage;
        return matchesSearch && matchesIndustry && matchesStage;
    });

    return (
        <div className={styles.container}>
            {/* Unified Sticky Header */}
            <header className={styles.header}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <h1 className={styles.headerTitle}>Khám phá Dự án</h1>
                        <p className={styles.headerSubtitle}>Tìm kiếm và kết nối với các startup tiềm năng nhất</p>
                    </div>
                    <div style={{ padding: '4px' }}>
                        {user && (
                            <NotificationCenter onOpenChat={(chatSessionId, notification) => {
                                setActiveChatSession({
                                    chatSessionId,
                                    displayName: notification?.title || 'Chat mới',
                                    currentUserId: user?.userId,
                                    sentTime: new Date().toISOString()
                                });
                            }}
                                onNavigate={onNotificationNavigate}
                            />
                        )}
                    </div>
                </div>

                <div className={styles.searchRow}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
                        <div className={styles.searchContainer}>
                            <MagnifyingGlass size={18} weight="bold" className={styles.searchIcon} />
                            <input
                                type="text"
                                placeholder="Tìm tên dự án, lĩnh vực hoặc từ khóa..."
                                className={styles.searchInput}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                            <div className={styles.filterGroup}>
                                <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-secondary)', marginRight: '8px', alignSelf: 'center' }}>Ngành:</span>
                                {industries.map(industry => (
                                    <button
                                        key={industry}
                                        className={`${styles.industryBtn} ${activeIndustry === industry ? styles.active : ''}`}
                                        onClick={() => setActiveIndustry(industry)}
                                    >
                                        {industry}
                                    </button>
                                ))}
                            </div>

                            <div className={styles.filterGroup}>
                                <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-secondary)', marginRight: '8px', alignSelf: 'center' }}>Giai đoạn:</span>
                                <button
                                    className={`${styles.industryBtn} ${activeStage === 'Tất cả' ? styles.active : ''}`}
                                    onClick={() => setActiveStage('Tất cả')}
                                >
                                    Tất cả
                                </button>
                                {stages.map(stage => (
                                    <button
                                        key={stage.value}
                                        className={`${styles.industryBtn} ${activeStage === stage.label ? styles.active : ''}`}
                                        onClick={() => setActiveStage(stage.label)}
                                    >
                                        {stage.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {banner && (
                <div style={{ marginBottom: '8px' }}>
                    {banner}
                </div>
            )}

            {/* Main Content Grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 350px',
                gap: '24px',
                alignItems: 'flex-start'
            }}>
                {/* Left Column - Startup Stream */}
                <div>
                    {isLoading ? (
                        <div className={styles.loadingState}>
                            <RocketLaunch size={32} weight="duotone" className={styles.loadingIcon} />
                            <p>Đang tìm kiếm dự án tiềm năng...</p>
                        </div>
                    ) : filteredStartups.length === 0 ? (
                        <div className={styles.emptyState}>
                            <MagnifyingGlass size={48} weight="duotone" color="var(--text-secondary)" />
                            <h3>Không tìm thấy dự án phù hợp</h3>
                            <p>Hãy thử thay đổi tiêu chí lọc hoặc từ khóa tìm kiếm</p>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '20px' }}>
                            {filteredStartups.map((startup, index) => (
                                <StartupCard
                                    key={startup.id}
                                    index={index}
                                    startup={startup}
                                    user={user}
                                    onViewProject={(id) => onSelectStartup?.(id)}
                                    // Passing empty arrays for simple discovery view if these stats aren't fetched here
                                    followedProjectIds={new Set()}
                                    sentConnectionIds={new Set()}
                                    investedProjectIds={new Set(Object.keys(investmentStatusMap).map((k) => Number(k)).filter((v) => Number.isFinite(v)))}
                                    investors={[]}
                                    isInvestorApproved={isInvestorApproved}
                                    onRestrictedAction={onRestrictedAction}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* Right Column - PR News Sidebar */}
                <aside style={{ position: 'sticky', top: '24px' }}>
                    <div style={{
                        backgroundColor: 'white',
                        borderRadius: '12px',
                        padding: '20px',
                        border: '1px solid var(--border-color)',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h2 style={{ fontSize: '16px', fontWeight: '700', margin: 0 }}>Tin tức mới nhất</h2>
                            <Newspaper size={18} weight="duotone" color="var(--primary-blue)" />
                        </div>

                        {isLoadingPRs ? (
                            <div style={{ padding: '20px', textAlign: 'center' }}>Đang tải...</div>
                        ) : prs.length === 0 ? (
                            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>Chưa có tin tức nào</div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                {prs.slice(0, 5).map(pr => (
                                    <div key={pr.postPrId} style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                                        <h3 style={{ fontSize: '14px', fontWeight: '600', margin: '0 0 4px 0', lineHeight: '1.4' }}>{pr.title}</h3>
                                        <div style={{ display: 'flex', gap: '8px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                                            <span>{pr.projectName}</span>
                                            <span>•</span>
                                            <span>{new Date(pr.publishedAt).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                ))}
                                {prs.length > 5 && (
                                    <button
                                        onClick={() => setShowAllPRs(true)}
                                        style={{ border: 'none', background: 'none', color: 'var(--primary-blue)', fontWeight: '600', cursor: 'pointer', padding: 0 }}
                                    >
                                        Xem tất cả ({prs.length})
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </aside>
            </div>

            {/* Modals & Chat */}
            <InvestmentModal
                isOpen={!!investmentModal}
                projectId={investmentModal?.projectId}
                projectName={investmentModal?.projectName}
                startupName={investmentModal?.startupName}
                onClose={() => setInvestmentModal(null)}
                onSuccess={() => {
                    setInvestmentModal(null);
                    fetchInvestmentStatusNow(startups);
                }}
            />

            {showAllPRs && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ backgroundColor: 'white', borderRadius: '16px', width: '90%', maxWidth: '800px', maxHeight: '80vh', overflowY: 'auto', padding: '24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                            <h2 style={{ fontSize: '20px', fontWeight: '800' }}>Tất cả tin tức</h2>
                            <button onClick={() => setShowAllPRs(false)} style={{ border: 'none', background: 'none', cursor: 'pointer' }}>Đóng</button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            {prs.map(pr => (
                                <div key={pr.postPrId} style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
                                    <h3 style={{ fontSize: '16px', fontWeight: '700', margin: '0 0 8px 0' }}>{pr.title}</h3>
                                    <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{pr.content}</p>
                                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '8px' }}>
                                        {pr.projectName} • {new Date(pr.publishedAt).toLocaleDateString()}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {activeChatSession && (
                <FloatingChatWidget
                    {...activeChatSession}
                    onClose={() => setActiveChatSession(null)}
                />
            )}
        </div>
    );
};

export default DiscoveryHub;
