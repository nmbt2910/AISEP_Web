import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Search, X } from 'lucide-react';
import styles from './FeedHeader.module.css';
import feedFilterStyles from './FeedFilter.module.css';
import FeedFilter from './FeedFilter';
import NotificationCenter from '../common/NotificationCenter';

/**
 * FeedHeader Component - Header for the main feed
 * Shows title, subtitle, filter, and project submission button for startups
 * @param {object} user - Current user object
 * @param {function} onFilterChange - Callback when filters change
 * @param {function} onShowProjectForm - Callback to show project submission form
 * @param {function} onOpenChat - Callback to open chat from notification
 */
function FeedHeader({
  user,
  onFilterChange,
  activeFilters,
  onShowProjectForm,
  title = "Khám phá dự án",
  subtitle = "Khám phá các dự án sáng tạo được hỗ trợ bởi AI",
  showFilter = true,
  showStats = false,
  stats = { approvedCount: 0, investorCount: 0, industryCount: 0 },
  industryCounts = {},
  searchTerm = "",
  onSearchChange,
  searchPlaceholder = "Tìm kiếm dự án...",
  onOpenChat,
  customAction = null,
  showNotification = false,
  onNotificationNavigate,
  isSearching = false,
  showInlineSearch = false,
  showSearchButton = false
}) {
  const [showSearchPopup, setShowSearchPopup] = useState(false);
  const [isClosingSearch, setIsClosingSearch] = useState(false);

  const toggleSearchPopup = () => {
    if (showSearchPopup) {
      setIsClosingSearch(true);
      setTimeout(() => {
        setShowSearchPopup(false);
        setIsClosingSearch(false);
      }, 200); // Wait for exit animation
    } else {
      setShowSearchPopup(true);
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.feedHeader}>
        <div className={styles.headerInner}>
          <div className={styles.headerContent}>
            <div className={styles.mainHeaderInfo}>
              <div className={styles.titleSection}>
                <h1 className={styles.title}>{title}</h1>
                <p className={styles.subtitle}>{subtitle}</p>
              </div>
            </div>

            <div className={styles.actionsSection}>
              {onSearchChange && showInlineSearch && (
                <div className={styles.searchWrapper}>
                  <Search className={styles.searchIcon} size={18} />
                  <input
                    type="text"
                    className={styles.searchInput}
                    placeholder={searchPlaceholder}
                    value={searchTerm}
                    onChange={(e) => onSearchChange(e.target.value)}
                  />
                </div>
              )}
            </div>

            <div className={styles.headerRightActions}>
              <style>{`
                @media (min-width: 1024px) {
                  .mobile-search-btn-custom { display: none !important; }
                }
              `}</style>
              {showSearchButton && (
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <button 
                    className={`mobile-search-btn-custom ${styles.iconButton}`}
                    onClick={toggleSearchPopup}
                    title="Tìm kiếm"
                  >
                    <Search size={22} />
                  </button>

                  {(showSearchPopup || isClosingSearch) && (
                    <div className={`mobile-search-btn-custom ${styles.searchPopupPanel} ${isClosingSearch ? styles.closing : ''}`}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
                        <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Tìm kiếm</h3>
                        <button onClick={toggleSearchPopup} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: 'var(--text-secondary)', borderRadius: '50%' }}>
                          <X size={20} />
                        </button>
                      </div>
                      <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '12px 16px' }}>
                          <Search size={20} color="var(--text-secondary)" />
                          <input
                            type="text"
                            placeholder={searchPlaceholder}
                            value={searchTerm}
                            onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
                            style={{ border: 'none', background: 'none', outline: 'none', marginLeft: '12px', width: '100%', fontSize: '14px', color: 'var(--text-primary)' }}
                            autoFocus
                          />
                          {isSearching && (
                            <div style={{ marginLeft: '8px', display: 'flex', alignItems: 'center' }}>
                                <style>{`
                                    @keyframes spinSearchPopupInline { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                                `}</style>
                                <div style={{ width: '16px', height: '16px', border: '2px solid transparent', borderTop: '2px solid var(--primary-blue, #007bff)', borderRadius: '50%', animation: 'spinSearchPopupInline 1s linear infinite' }} />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* "Đăng Dự Án" button for startups - moved here to sit next to the notification bell */}
              {((user?.role?.toString().toLowerCase() === 'startup') || user?.role === 0 || user?.role === '0') && onShowProjectForm && (
                <button
                  onClick={onShowProjectForm}
                  className={styles.primaryBtn}
                >
                  <Plus size={18} />
                  Đăng Dự Án
                </button>
              )}
              {customAction}
              {user && (onOpenChat || showNotification) && (
                <NotificationCenter
                  onOpenChat={onOpenChat}
                  onNavigate={onNotificationNavigate}
                />
              )}
            </div>
          </div>
        </div>

        {/* Feed Filter (Tabs) — now Row 2 */}
        {showFilter && (
          <FeedFilter
            user={user}
            activeFilters={activeFilters}
            onFilterChange={onFilterChange}
            industryCounts={industryCounts}
            totalCount={stats?.approvedCount ?? 0}
          />
        )}

        {/* Stats Strip is hidden */}
        {/* Removed: showStats mode hidden per user request */}
      </header>

    </div>
  );
}

export default React.memo(FeedHeader);
