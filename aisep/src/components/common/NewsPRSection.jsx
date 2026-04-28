import React, { useState, useEffect } from 'react';
import { Archive, AlertCircle, Search, Loader2 } from 'lucide-react';
import feedHeaderStyles from '../feed/FeedHeader.module.css';
import styles from '../../styles/SharedDashboard.module.css';
import prService from '../../services/prService';
import NewsCard from './NewsCard';
import NewsDetailModal from './NewsDetailModal';
import NotificationCenter from './NotificationCenter';
import InvestorStatusBanner from './InvestorStatusBanner';

/**
 * NewsPRSection – Redesigned Tin tức page shared across Startup, Advisor, Investor.
 *
 * Uses the same header structure/styles as FeedHeader.
 * Data from GET /api/PostPRs (prService.getPRs).
 * Clicking a card opens NewsDetailModal.
 */
export default function NewsPRSection({ user, onOpenChat, investorProfileStatus, investorProfileReason, onUpdateProfile, onNotificationNavigate, startupBanner }) {
    const [prNewsList, setPrNewsList] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedPR, setSelectedPR] = useState(null);

    useEffect(() => {
        fetchPRNews();
    }, []);

    const fetchPRNews = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await prService.getPRs();

            let prsList = [];
            if (response?.data?.items && Array.isArray(response.data.items)) {
                prsList = response.data.items;
            } else if (Array.isArray(response?.data)) {
                prsList = response.data;
            } else if (Array.isArray(response?.items)) {
                prsList = response.items;
            }

            setPrNewsList(prsList);
        } catch (err) {
            console.error('Error fetching PR news:', err);
            setError('Không thể tải tin tức.');
        } finally {
            setIsLoading(false);
        }
    };

    const filteredNews = prNewsList.filter(pr => {
        if (!searchTerm.trim()) return true;
        const q = searchTerm.toLowerCase();
        return (
            pr.title?.toLowerCase().includes(q) ||
            pr.content?.toLowerCase().includes(q) ||
            pr.projectName?.toLowerCase().includes(q) ||
            pr.startupName?.toLowerCase().includes(q) ||
            pr.investorName?.toLowerCase().includes(q)
        );
    });

    return (
        <div className={feedHeaderStyles.container}>
            {/* Header — exact same structure as FeedHeader */}
            <header className={feedHeaderStyles.feedHeader}>
                <div className={feedHeaderStyles.headerInner}>
                    <div className={feedHeaderStyles.headerContent}>
                        {/* Left: Title + Subtitle */}
                        <div className={feedHeaderStyles.mainHeaderInfo}>
                            <div className={feedHeaderStyles.titleSection}>
                                <h1 className={feedHeaderStyles.title}>Tin tức</h1>
                                <p className={feedHeaderStyles.subtitle}>
                                    Khám phá tin tức về các thương vụ đầu tư thành công trên nền tảng AISEP
                                </p>
                            </div>
                        </div>

                        {/* Center: Search bar */}
                        <div className={feedHeaderStyles.actionsSection}>
                            <div className={feedHeaderStyles.searchWrapper}>
                                <Search className={feedHeaderStyles.searchIcon} size={18} />
                                <input
                                    type="text"
                                    className={feedHeaderStyles.searchInput}
                                    placeholder="Tìm kiếm tin tức..."
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Right: Notification bell */}
                        <div className={feedHeaderStyles.headerRightActions}>
                            {user && <NotificationCenter onOpenChat={onOpenChat} onNavigate={onNotificationNavigate} />}
                        </div>
                    </div>
                </div>
            </header>
            
            {startupBanner && (
                <div style={{ marginBottom: '16px' }}>
                    {startupBanner}
                </div>
            )}
            {investorProfileStatus && (
                <InvestorStatusBanner 
                    status={investorProfileStatus}
                    reason={investorProfileReason}
                    onUpdateProfile={onUpdateProfile}
                />
            )}

            {/* News Grid */}
            <div className={styles.newsGrid}>
                {isLoading && (
                    <div className={styles.newsLoadingRow}>
                        <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
                        <span>Đang tải tin tức...</span>
                    </div>
                )}

                {!isLoading && error && (
                    <div className={styles.newsEmptyState}>
                        <AlertCircle size={40} style={{ color: '#f4212e', marginBottom: 4 }} />
                        <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>Lỗi tải dữ liệu</span>
                        <span style={{ fontSize: 13 }}>{error}</span>
                    </div>
                )}

                {!isLoading && !error && prNewsList.length === 0 && (
                    <div className={styles.newsEmptyState}>
                        <Archive size={40} style={{ marginBottom: 4 }} />
                        <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>Chưa có tin tức nào</span>
                        <span style={{ fontSize: 13 }}>Hiện chưa có bài PR nào được đăng.</span>
                    </div>
                )}

                {!isLoading && !error && filteredNews.length === 0 && prNewsList.length > 0 && (
                    <div className={styles.newsEmptyState}>
                        <Search size={40} style={{ marginBottom: 4 }} />
                        <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>Không tìm thấy</span>
                        <span style={{ fontSize: 13 }}>
                            Không có kết quả phù hợp với &ldquo;{searchTerm}&rdquo;.
                        </span>
                    </div>
                )}

                {!isLoading && filteredNews.map((pr, index) => (
                    <NewsCard
                        key={pr.postPrId || pr.id}
                        index={index}
                        thumbnail={pr.projectImage || pr.imageUrl || null}
                        category={pr.category || 'Đầu tư'}
                        title={pr.title}
                        description={pr.content || pr.description}
                        source={pr.startupName || pr.projectName}
                        timestamp={pr.publishedAt}
                        onClick={() => setSelectedPR(pr)}
                    />
                ))}
            </div>

            {/* Detail Modal */}
            {selectedPR && (
                <NewsDetailModal
                    pr={selectedPR}
                    onClose={() => setSelectedPR(null)}
                />
            )}
        </div>
    );
}
