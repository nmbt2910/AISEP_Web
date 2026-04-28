import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { MagnifyingGlass, CheckCircle, TrendUp, MapPin, Buildings, Faders, Fire, Wallet, Medal, Briefcase, ChartBar } from '@phosphor-icons/react';
import FilterModal from './FilterModal';
import InvestorDetail from './InvestorDetail';
import investorService from '../../services/investorService';
import NotificationCenter from '../common/NotificationCenter';
import FloatingChatWidget from '../common/FloatingChatWidget';
import styles from './InvestorDiscovery.module.css';

export default function InvestorDiscovery({ user, onShowLogin, onNotificationNavigate, startupBanner }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [selectedInvestorId, setSelectedInvestorId] = useState(null);
    const [filters, setFilters] = useState({
        industry: 'Tất cả ngành nghề',
        stage: 'Tất cả giai đoạn',
        fundingStatus: 'Tất cả trạng thái',
        minAiScore: 0
    });
    const [activeChatSession, setActiveChatSession] = useState(null);

    const [investors, setInvestors] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchInvestors = async () => {
            setIsLoading(true);
            try {
                const response = await investorService.getAllInvestors();
                if (response && response.items) {
                    const formatted = response.items.map(inv => ({
                        id: inv.investorId,
                        name: inv.organizationName || inv.userName,
                        userName: inv.userName,
                        thesis: inv.investmentTaste || 'Chưa cập nhật khẩu vị đầu tư.',
                        type: 'Quỹ đầu tư',
                        industries: inv.focusIndustry ? inv.focusIndustry.split(',').map(s => s.trim()) : [],
                        stages: [`Giai đoạn ${inv.preferredStage || 'sớm'}`],
                        fundingStatus: 'Đang hoạt động',
                        aiScore: 0,
                        matchScore: Math.floor(Math.random() * 20) + 75,
                        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(inv.organizationName || inv.userName)}&background=random`,
                        location: inv.investmentRegion || 'Hồ Chí Minh, VN',
                        portfolioSize: '25 portfolio',
                        ticketSize: inv.investmentAmount ? `${(inv.investmentAmount/1000000).toFixed(0)}tr - ${(inv.investmentAmount/500000).toFixed(0)}tr USD` : '50K - 500K USD',
                        verified: inv.status === 'Approved'
                    }));
                    setInvestors(formatted);
                }
            } catch (error) {
                console.error("Failed to load investors:", error);
            } finally {
                setIsLoading(false);
            }
        };

        if (!selectedInvestorId) {
            fetchInvestors();
        }
    }, [selectedInvestorId]);

    const handleApplyFilters = (newFilters) => {
        setFilters(newFilters);
    };

    const filteredInvestors = investors.filter(investor => {
        const matchesSearch =
            investor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            investor.thesis.toLowerCase().includes(searchQuery.toLowerCase()) ||
            investor.type.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesIndustry =
            filters.industry === 'Tất cả ngành nghề' ||
            investor.industries.includes(filters.industry);

        const matchesStage =
            filters.stage === 'Tất cả giai đoạn' ||
            investor.stages.includes(filters.stage);

        return matchesSearch && matchesIndustry && matchesStage;
    });

    const activeFilterCount = Object.values(filters).filter(v => v !== 'Tất cả ngành nghề' && v !== 'Tất cả giai đoạn' && v !== 'Tất cả trạng thái' && v !== 0).length;

    if (selectedInvestorId) {
        return <InvestorDetail investorId={selectedInvestorId} onBack={() => setSelectedInvestorId(null)} user={user} />;
    }

    return (
        <div className={styles.container}>
            {/* Unified Sticky Header */}
            <div className={styles.header}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <h1 className={styles.headerTitle}>Tìm nhà đầu tư</h1>
                        <p className={styles.headerSubtitle}>Khám phá quỹ đầu tư và nhà đầu tư phù hợp với tiêu chí của bạn</p>
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
                    <div className={styles.searchContainer}>
                        <MagnifyingGlass className={styles.searchIcon} size={19} weight="bold" />
                        <input
                            type="text"
                            placeholder="Tìm kiếm quỹ, cá nhân..."
                            className={styles.searchInput}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    
                    <div className={styles.filterWrapper}>
                        <button className={styles.filterButton} onClick={() => setIsFilterOpen(!isFilterOpen)}>
                            <Faders size={18} weight="bold" />
                            <span>Lọc</span>
                            {activeFilterCount > 0 && <span className={styles.badge}>{activeFilterCount}</span>}
                        </button>

                        {/* DESKTOP FILTER DROPDOWN */}
                        {isFilterOpen && (
                            <div className={styles.desktopOnly}>
                                <FilterModal
                                    isOpen={isFilterOpen}
                                    filters={filters}
                                    onApply={handleApplyFilters}
                                    onClose={() => setIsFilterOpen(false)}
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {startupBanner && (
                <div style={{ marginBottom: '12px' }}>
                    {startupBanner}
                </div>
            )}

            {/* MOBILE FILTER MODAL (PORTAL) */}
            {isFilterOpen && createPortal(
                <div className={styles.mobileOnly}>
                    <div className={styles.filterBackdrop} onClick={() => setIsFilterOpen(false)} />
                    <FilterModal
                        isOpen={isFilterOpen}
                        filters={filters}
                        onApply={handleApplyFilters}
                        onClose={() => setIsFilterOpen(false)}
                    />
                </div>,
                document.body
            )}

            {/* Role-based restriction for connection requests */}
            {(() => {
                const roleValue = user?.role;
                const roleStr = typeof roleValue === 'string' ? roleValue.toLowerCase() : '';
                const canConnect = roleStr === 'startup' || roleStr === 'advisor' || roleValue === 0 || roleValue === 2;
                
                return (
                    /* This is purely for logical state, no UI here */
                    null
                );
            })()}

            {/* Investor Feed */}
            <div className={styles.feed}>
                {isLoading ? (
                    <div className={styles.emptyState}>
                        <p>Đang tải nhà đầu tư...</p>
                    </div>
                ) : filteredInvestors.length === 0 ? (
                    <div className={styles.emptyState}>
                        <TrendUp size={48} weight="duotone" className={styles.emptyIcon} />
                        <h3>Không tìm thấy nhà đầu tư</h3>
                    </div>
                ) : (
                    filteredInvestors.map(investor => (
                        <div key={investor.id} className={styles.investorCard} onClick={() => setSelectedInvestorId(investor.id)}>
                            {/* Avatar Section */}
                            <div className={styles.avatarContainer}>
                                <div className={styles.avatar}>
                                    {investor.name.charAt(0)}
                                </div>
                            </div>

                            {/* Content Section */}
                            <div className={styles.investorInfo}>
                                <div className={styles.nameRow}>
                                    <div className={styles.nameWrapper}>
                                        <h3 className={styles.investorName}>{investor.name}</h3>
                                        {investor.verified && (
                                            <CheckCircle size={15} className={styles.verifiedBadge} />
                                        )}
                                        <span className={styles.investorType}>· {investor.type}</span>
                                    </div>
                                </div>

                                <p className={styles.thesis}>{investor.thesis}</p>

                                {/* Metadata Icons Row (📍, 💼, 📊) */}
                                <div className={styles.metadata}>
                                    <div className={styles.metaItem}>
                                        <MapPin size={14} weight="duotone" /> <span>{investor.location}</span>
                                    </div>
                                    <div className={styles.metaItem}>
                                        <Briefcase size={14} weight="duotone" /> <span>{investor.ticketSize}</span>
                                    </div>
                                    <div className={styles.metaItem}>
                                        <ChartBar size={14} weight="duotone" /> <span>{investor.portfolioSize}</span>
                                    </div>
                                </div>

                                {/* Actions Group (Bottom Left) */}
                                <div className={styles.actions}>
                                    {/* Connection request button removed as per user requirement */}
                                    <button className={styles.viewProfileBtn} onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedInvestorId(investor.id);
                                    }}>
                                        Xem hồ sơ
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
            {activeChatSession && (
                <FloatingChatWidget
                    {...activeChatSession}
                    onClose={() => setActiveChatSession(null)}
                />
            )}
        </div>
    );
}
