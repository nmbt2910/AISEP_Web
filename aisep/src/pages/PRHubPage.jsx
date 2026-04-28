import React, { useState, useEffect } from 'react';
import { Search, Newspaper, Calendar, User, Building2, TrendingUp, Filter, X, ChevronDown, Loader2, AlertCircle } from 'lucide-react';
import FeedHeader from '../components/feed/FeedHeader';
import prService from '../services/prService';
import FloatingChatWidget from '../components/common/FloatingChatWidget';
import styles from './DiscoveryHub.module.css'; // Reuse DiscoveryHub styles
import NewsCard from '../components/common/NewsCard';

/**
 * PR Hub - Browse all press releases from the platform
 * Features: Search, filter by project/investor, sort options, detail view
 */
const PRHubPage = ({ user, onNotificationNavigate, banner }) => {
    const [allPRs, setAllPRs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedPR, setSelectedPR] = useState(null); // For detail modal
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [activeChatSession, setActiveChatSession] = useState(null);

    // Filter & Sort states
    const [filterProject, setFilterProject] = useState('all'); // 'all' or projectId
    const [filterInvestor, setFilterInvestor] = useState('all'); // 'all' or investorId
    const [sortBy, setSortBy] = useState('newest'); // 'newest', 'oldest', 'trending'
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 12;

    // Fetch all PRs on mount
    useEffect(() => {
        const fetchPRs = async () => {
            setIsLoading(true);
            setLoadError(null);
            try {
                console.log('[PRHubPage] Fetching all PRs...');
                const response = await prService.getPRs();
                console.log('[PRHubPage] API Response:', response);
                console.log('[PRHubPage] Response structure:', {
                    hasData: !!response?.data,
                    dataType: typeof response?.data,
                    isArray: Array.isArray(response?.data),
                    length: Array.isArray(response?.data) ? response.data.length : 'N/A',
                    fullResponse: response
                });
                
                // Handle different response structures
                // API returns paginated: { data: { items: [...], page, pageSize, totalCount, totalPages } }
                let prList = [];
                
                if (response?.data?.items && Array.isArray(response.data.items)) {
                    // Paginated response with items array
                    prList = response.data.items;
                } else if (response?.data && Array.isArray(response.data)) {
                    // Direct array from API
                    prList = response.data;
                } else if (response?.items && Array.isArray(response.items)) {
                    // Items in root level
                    prList = response.items;
                } else if (Array.isArray(response)) {
                    // Response itself is array
                    prList = response;
                } else {
                    console.warn('[PRHubPage] Could not find PR list in response:', response);
                    setLoadError('Định dạng dữ liệu không hợp lệ');
                    prList = [];
                }
                
                console.log('[PRHubPage] Final PR list:', prList.length, prList);
                setAllPRs(prList);
            } catch (error) {
                console.error('[PRHubPage] Failed to fetch PRs:', error);
                const errorMsg = error?.response?.data?.message || error?.message || 'Không thể tải bài viết PR';
                setLoadError(errorMsg);
                setAllPRs([]);
            } finally {
                setIsLoading(false);
            }
        };

        fetchPRs();
    }, []);

    // Get unique projects and investors for filter dropdowns
    const uniqueProjects = [...new Map(allPRs.map(pr => [pr.projectId, {
        id: pr.projectId,
        name: pr.projectName
    }])).values()];

    const uniqueInvestors = [...new Map(allPRs.map(pr => [pr.investorId, {
        id: pr.investorId,
        name: pr.investorName
    }])).values()];

    // Filter PRs
    const filteredPRs = allPRs.filter(pr => {
        // Search filter
        const matchesSearch = (pr.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            pr.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            pr.projectName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            pr.investorName?.toLowerCase().includes(searchQuery.toLowerCase()));

        // Project filter
        const matchesProject = filterProject === 'all' || pr.projectId === parseInt(filterProject);

        // Investor filter
        const matchesInvestor = filterInvestor === 'all' || pr.investorId === parseInt(filterInvestor);

        return matchesSearch && matchesProject && matchesInvestor;
    });

    // Sort PRs
    const sortedPRs = [...filteredPRs].sort((a, b) => {
        if (sortBy === 'newest') {
            return new Date(b.publishedAt) - new Date(a.publishedAt);
        } else if (sortBy === 'oldest') {
            return new Date(a.publishedAt) - new Date(b.publishedAt);
        } else if (sortBy === 'trending') {
            // Could be based on views/engagement - for now just newest
            return new Date(b.publishedAt) - new Date(a.publishedAt);
        }
        return 0;
    });

    // Pagination
    const totalPages = Math.ceil(sortedPRs.length / itemsPerPage);
    const paginatedPRs = sortedPRs.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const handlePRClick = (pr) => {
        setSelectedPR(pr);
        setShowDetailModal(true);
    };

    const handleCloseModal = () => {
        setShowDetailModal(false);
        setSelectedPR(null);
    };

    return (
        <div className={styles.container}>
            <FeedHeader
                title="PR & News Hub"
                subtitle="Khám phá những tin tức và bài viết mới nhất từ các dự án được đầu tư thành công"
                showFilter={false}
                user={user}
                onOpenChat={(chatSessionId, notification) => {
                    setActiveChatSession({
                        chatSessionId,
                        displayName: notification?.title || 'Chat mới',
                        currentUserId: user?.userId,
                        sentTime: new Date().toISOString()
                    });
                }}
                onNotificationNavigate={onNotificationNavigate}
            />

            {banner && (
                <div style={{ marginBottom: '24px' }}>
                    {banner}
                </div>
            )}

            {/* Stats Section */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '16px',
                marginBottom: '32px'
            }}>
                <div style={{
                    backgroundColor: 'white',
                    padding: '20px',
                    borderRadius: '12px',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                }}>
                    <Newspaper size={28} color="var(--primary-blue)" />
                    <div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase' }}>Tổng bài viết</div>
                        <div style={{ fontSize: '28px', fontWeight: '800', color: 'var(--text-primary)' }}>{allPRs.length}</div>
                    </div>
                </div>

                <div style={{
                    backgroundColor: 'white',
                    padding: '20px',
                    borderRadius: '12px',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                }}>
                    <Building2 size={28} color="#10b981" />
                    <div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase' }}>Dự án</div>
                        <div style={{ fontSize: '28px', fontWeight: '800', color: '#10b981' }}>{uniqueProjects.length}</div>
                    </div>
                </div>

                <div style={{
                    backgroundColor: 'white',
                    padding: '20px',
                    borderRadius: '12px',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                }}>
                    <User size={28} color="#f59e0b" />
                    <div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase' }}>Nhà đầu tư</div>
                        <div style={{ fontSize: '28px', fontWeight: '800', color: '#f59e0b' }}>{uniqueInvestors.length}</div>
                    </div>
                </div>
            </div>

            {/* Search & Filter Section */}
            <div style={{
                backgroundColor: 'white',
                padding: '20px',
                borderRadius: '12px',
                marginBottom: '24px',
                border: '1px solid var(--border-color)',
                display: 'flex',
                gap: '12px',
                flexWrap: 'wrap',
                alignItems: 'center'
            }}>
                {/* Search */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    flex: 1,
                    minWidth: '200px',
                    backgroundColor: 'var(--bg-secondary)',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    border: '1px solid var(--border-color)'
                }}>
                    <Search size={16} color="var(--text-secondary)" />
                    <input
                        type="text"
                        placeholder="Tìm bài viết, dự án, nhà đầu tư..."
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setCurrentPage(1);
                        }}
                        style={{
                            flex: 1,
                            border: 'none',
                            backgroundColor: 'transparent',
                            marginLeft: '8px',
                            fontSize: '14px',
                            outline: 'none'
                        }}
                    />
                </div>

                {/* Sort Dropdown */}
                <select
                    value={sortBy}
                    onChange={(e) => {
                        setSortBy(e.target.value);
                        setCurrentPage(1);
                    }}
                    style={{
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'white',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        color: 'var(--text-primary)'
                    }}
                >
                    <option value="newest">🆕 Mới nhất</option>
                    <option value="oldest">📅 Cũ nhất</option>
                    <option value="trending">🔥 Xu hướng</option>
                </select>

                {/* Project Filter */}
                <select
                    value={filterProject}
                    onChange={(e) => {
                        setFilterProject(e.target.value);
                        setCurrentPage(1);
                    }}
                    style={{
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'white',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        color: 'var(--text-primary)'
                    }}
                >
                    <option value="all">📊 Tất cả dự án</option>
                    {uniqueProjects.map(project => (
                        <option key={project.id} value={project.id}>{project.name}</option>
                    ))}
                </select>

                {/* Investor Filter */}
                <select
                    value={filterInvestor}
                    onChange={(e) => {
                        setFilterInvestor(e.target.value);
                        setCurrentPage(1);
                    }}
                    style={{
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'white',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        color: 'var(--text-primary)'
                    }}
                >
                    <option value="all">💼 Tất cả nhà đầu tư</option>
                    {uniqueInvestors.map(investor => (
                        <option key={investor.id} value={investor.id}>{investor.name}</option>
                    ))}
                </select>

                {/* Reset button */}
                {(searchQuery || filterProject !== 'all' || filterInvestor !== 'all') && (
                    <button
                        onClick={() => {
                            setSearchQuery('');
                            setFilterProject('all');
                            setFilterInvestor('all');
                            setSortBy('newest');
                            setCurrentPage(1);
                        }}
                        style={{
                            padding: '8px 12px',
                            backgroundColor: 'transparent',
                            color: 'var(--text-secondary)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '8px',
                            fontSize: '14px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                        }}
                    >
                        <X size={14} />
                        Reset
                    </button>
                )}
            </div>

            {/* Results Count */}
            <div style={{
                marginBottom: '16px',
                fontSize: '14px',
                color: 'var(--text-secondary)',
                fontWeight: '600'
            }}>
                Hiển thị {paginatedPRs.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} - {Math.min(currentPage * itemsPerPage, sortedPRs.length)} / {sortedPRs.length} bài viết
            </div>

            {/* Loading State */}
            {isLoading && (
                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    padding: '60px 20px',
                    gap: '12px'
                }}>
                    <Loader2 size={20} className="animate-spin" color="var(--primary-blue)" />
                    <span style={{ color: 'var(--text-secondary)' }}>Đang tải tin tức...</span>
                </div>
            )}

            {/* Error State */}
            {!isLoading && loadError && (
                <div style={{
                    textAlign: 'center',
                    padding: '40px 20px',
                    backgroundColor: '#fee2e2',
                    borderRadius: '12px',
                    border: '1px solid #fecaca'
                }}>
                    <AlertCircle size={48} color="#dc2626" style={{ margin: '0 auto 16px' }} />
                    <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '700', color: '#991b1b' }}>Lỗi tải dữ liệu</h3>
                    <p style={{ margin: '0 0 16px 0', color: '#b91c1c' }}>{loadError}</p>
                    <button
                        onClick={() => window.location.reload()}
                        style={{
                            padding: '10px 20px',
                            backgroundColor: '#dc2626',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '14px',
                            fontWeight: '600',
                            cursor: 'pointer'
                        }}
                    >
                        Tải lại trang
                    </button>
                </div>
            )}

            {/* Empty State */}
            {!isLoading && !loadError && sortedPRs.length === 0 && (
                <div style={{
                    textAlign: 'center',
                    padding: '60px 20px',
                    backgroundColor: 'white',
                    borderRadius: '12px',
                    border: '1px solid var(--border-color)'
                }}>
                    <AlertCircle size={48} color="var(--text-secondary)" style={{ margin: '0 auto 16px' }} />
                    <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)' }}>Không tìm thấy bài viết</h3>
                    <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Hãy thử thay đổi các tiêu chí lọc hoặc tìm kiếm.</p>
                </div>
            )}

            {/* PR Grid */}
            {!isLoading && !loadError && sortedPRs.length > 0 && (
                <>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
                        gap: '20px',
                        marginBottom: '32px'
                    }}>
                        {paginatedPRs.map((pr, idx) => (
                            <NewsCard
                                key={pr.postPrId}
                                index={idx}
                                thumbnail={pr.projectImage}
                                title={pr.title}
                                description={pr.content}
                                category="Đầu tư"
                                projectName={pr.projectName}
                                investorName={pr.investorName}
                                timestamp={pr.publishedAt}
                                onClick={() => handlePRClick(pr)}
                            />
                        ))}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div style={{
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            gap: '8px',
                            marginBottom: '32px'
                        }}>
                            <button
                                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                disabled={currentPage === 1}
                                style={{
                                    padding: '8px 12px',
                                    backgroundColor: currentPage === 1 ? 'var(--border-color)' : 'white',
                                    color: currentPage === 1 ? 'var(--text-secondary)' : 'var(--text-primary)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '6px',
                                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                                    fontWeight: '600'
                                }}
                            >
                                ← Trước
                            </button>

                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                <button
                                    key={page}
                                    onClick={() => setCurrentPage(page)}
                                    style={{
                                        padding: '8px 12px',
                                        backgroundColor: currentPage === page ? 'var(--primary-blue)' : 'white',
                                        color: currentPage === page ? 'white' : 'var(--text-primary)',
                                        border: '1px solid' + (currentPage === page ? ' var(--primary-blue)' : ' var(--border-color)'),
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        fontWeight: '600',
                                        fontSize: '14px'
                                    }}
                                >
                                    {page}
                                </button>
                            ))}

                            <button
                                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                                disabled={currentPage === totalPages}
                                style={{
                                    padding: '8px 12px',
                                    backgroundColor: currentPage === totalPages ? 'var(--border-color)' : 'white',
                                    color: currentPage === totalPages ? 'var(--text-secondary)' : 'var(--text-primary)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '6px',
                                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                                    fontWeight: '600'
                                }}
                            >
                                Sau →
                            </button>
                        </div>
                    )}
                </>
            )}

            {/* PR Detail Modal */}
            {showDetailModal && selectedPR && (
                <div
                    onClick={(e) => e.target === e.currentTarget && handleCloseModal()}
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.6)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000,
                        padding: '20px'
                    }}
                >
                    <div
                        style={{
                            backgroundColor: 'white',
                            borderRadius: '16px',
                            maxWidth: '800px',
                            width: '100%',
                            maxHeight: '90vh',
                            overflowY: 'auto',
                            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
                            position: 'relative'
                        }}
                    >
                        {/* Close button */}
                        <button
                            onClick={handleCloseModal}
                            style={{
                                position: 'absolute',
                                top: '20px',
                                right: '20px',
                                backgroundColor: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                zIndex: 10,
                                color: 'var(--text-primary)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            <X size={24} />
                        </button>

                        {/* Image */}
                        {selectedPR.projectImage && (
                            <img
                                src={selectedPR.projectImage}
                                alt={selectedPR.projectName}
                                style={{
                                    width: '100%',
                                    height: '300px',
                                    objectFit: 'cover'
                                }}
                            />
                        )}

                        {/* Content */}
                        <div style={{ padding: '32px' }}>
                            {/* Title */}
                            <h1 style={{
                                margin: '0 0 20px 0',
                                fontSize: '32px',
                                fontWeight: '800',
                                color: 'var(--text-primary)',
                                lineHeight: '1.4'
                            }}>
                                {selectedPR.title}
                            </h1>

                            {/* Meta Info */}
                            <div style={{
                                display: 'flex',
                                gap: '20px',
                                marginBottom: '24px',
                                paddingBottom: '24px',
                                borderBottom: '2px solid var(--border-color)',
                                flexWrap: 'wrap',
                                fontSize: '14px'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
                                    <Calendar size={16} />
                                    {new Date(selectedPR.publishedAt).toLocaleDateString('vi-VN', { 
                                        year: 'numeric', 
                                        month: 'long', 
                                        day: 'numeric' 
                                    })}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
                                    <Building2 size={16} />
                                    {selectedPR.projectName}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
                                    <User size={16} />
                                    {selectedPR.investorName}
                                </div>
                            </div>

                            {/* Full Content */}
                            <div style={{
                                fontSize: '16px',
                                lineHeight: '1.8',
                                color: 'var(--text-primary)',
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word'
                            }}>
                                {selectedPR.content}
                            </div>

                            {/* Meta Tags */}
                            <div style={{
                                display: 'flex',
                                gap: '12px',
                                marginTop: '32px',
                                paddingTop: '24px',
                                borderTop: '2px solid var(--border-color)',
                                flexWrap: 'wrap'
                            }}>
                                <span style={{
                                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                                    color: '#10b981',
                                    padding: '6px 14px',
                                    borderRadius: '8px',
                                    fontWeight: '600',
                                    fontSize: '13px'
                                }}>
                                    📊 Dự án: {selectedPR.projectName}
                                </span>
                                <span style={{
                                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                                    color: 'var(--primary-blue)',
                                    padding: '6px 14px',
                                    borderRadius: '8px',
                                    fontWeight: '600',
                                    fontSize: '13px'
                                }}>
                                    💼 Nhà đầu tư: {selectedPR.investorName}
                                </span>
                                <span style={{
                                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
                                    color: '#f59e0b',
                                    padding: '6px 14px',
                                    borderRadius: '8px',
                                    fontWeight: '600',
                                    fontSize: '13px'
                                }}>
                                    🏢 Startup: {selectedPR.startupName}
                                </span>
                            </div>
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

export default PRHubPage;
