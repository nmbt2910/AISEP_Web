import React, { useState, useEffect } from 'react';
import { Zap, Pin, Loader, Search, Flame, Star, Lock } from 'lucide-react';
import styles from './RightPanel.module.css';
import Badge from '../common/Badge';
import projectSubmissionService from '../../services/projectSubmissionService';
import AIEvaluationService from '../../services/AIEvaluationService';
import SidebarFooter from './SidebarFooter';

const AVATAR_COLORS = [
  { bg: '#1d4ed8', text: '#ffffff' },
  { bg: '#059669', text: '#ffffff' },
  { bg: '#d97706', text: '#ffffff' },
  { bg: '#7c3aed', text: '#ffffff' },
  { bg: '#db2777', text: '#ffffff' },
];

const SECTOR_LABELS = [
  'Xu hướng tuần này',
  'Tăng trưởng nhanh',
  'Nhiều nhà đầu tư theo dõi',
  'Mới nhất',
  'Đang nổi',
];

function AvatarInitial({ name, index }) {
  const color = AVATAR_COLORS[index % AVATAR_COLORS.length];
  const initials = (name || '?')
    .split(' ')
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase();

  return (
    <span
      className={styles.avatarCircle}
      style={{ backgroundColor: color.bg, color: color.text }}
    >
      {initials}
    </span>
  );
}

function RightPanel({
  className,
  searchQuery = '',
  onSearchChange,
  isSearching = false,
  showSearch = true,
  onFilterChange,
  onShowHome,
  onShowLogin,
  recentProjects = [],
  trendingSectors = [],
  isLoading = false,
  user,
  onViewProject
}) {
  const handleSectorClick = (sectorName) => {
    if (onFilterChange) {
      onFilterChange({ industry: sectorName });
      if (onShowHome) onShowHome();
    }
  };

  const handleProjectClick = (projectId) => {
    if (onViewProject) {
      onViewProject(projectId);
    }
  };

  return (
    <aside className={`${styles.rightPanel} ${className || ''}`}>

      {/* ── SEARCH BAR ── */}
      {showSearch && (
        <div className={styles.searchContainer}>
          <div className={styles.searchWrapper}>
            <Search size={18} className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Tìm kiếm dự án, startup, lĩnh vực..."
              className={styles.searchInput}
              value={searchQuery}
              onChange={onSearchChange}
            />
            {isSearching && (
              <div style={{ marginLeft: '8px', display: 'flex', alignItems: 'center' }}>
                  <style>{`
                      @keyframes spinSearch { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                  `}</style>
                  <div style={{ width: '16px', height: '16px', border: '2px solid transparent', borderTop: '2px solid var(--primary-color, #007bff)', borderRadius: '50%', animation: 'spinSearch 1s linear infinite' }} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Dự án gần đây */}
      <div className={styles.widget}>
        <div className={styles.widgetHeader}>
          <Flame size={17} className={styles.headerIcon} />
          <h3 className={styles.widgetTitle}>Dự án gần đây</h3>
        </div>
        <div className={styles.widgetContent}>
          {isLoading ? (
            <div className={styles.loadingContainer}>
              <Loader size={20} className={styles.spinIcon} />
            </div>
          ) : !user ? (
            <div className={styles.guestLock}>
              <Lock size={20} className={styles.lockIcon} />
              <p className={styles.lockText}>
                Vui lòng <span className={styles.loginLink} onClick={onShowLogin}>đăng nhập</span> để theo dõi các dự án mới
              </p>
            </div>
          ) : recentProjects.length > 0 ? (
            recentProjects.slice(0, 3).map((project, idx) => (
              <div 
                key={project.id} 
                className={styles.startupRow}
                onClick={() => handleProjectClick(project.id)}
                style={{ cursor: 'pointer' }}
              >
                <AvatarInitial name={project.startupName || 'Startup'} index={idx} />
                <div className={styles.startupInfo}>
                  <span className={styles.startupName}>{project.startupName || 'Startup'}</span>
                  <span className={styles.projectName}>{project.name}</span>
                </div>
              </div>
            ))
          ) : (
            <p className={styles.emptyText}>Chưa có dự án nào</p>
          )}
        </div>
      </div>

      {/* Lĩnh vực nổi bật */}
      <div className={styles.widget}>
        <div className={styles.widgetHeader}>
          <Star size={17} className={styles.headerIcon} />
          <h3 className={styles.widgetTitle}>Lĩnh vực nổi bật</h3>
        </div>
        <div className={styles.widgetContent}>
          {isLoading ? (
            <div className={styles.loadingContainer}>
              <Loader size={20} className={styles.spinIcon} />
            </div>
          ) : trendingSectors.length > 0 ? (
            trendingSectors.map(sector => (
              <button
                key={sector.name}
                className={styles.sectorRow}
                onClick={() => handleSectorClick(sector.name)}
              >
                <span className={styles.sectorLabel}>{sector.label}</span>
                <span className={styles.sectorHash}>#{sector.name}</span>
                <span className={styles.sectorCount}>{sector.count} dự án</span>
              </button>
            ))
          ) : (
            <p className={styles.emptyText}>#ĐangCậpNhật</p>
          )}
        </div>
      </div>

      {/* ── SIDEBAR FOOTER ── */}
      <SidebarFooter user={user} />
    </aside>
  );
}

export default RightPanel;
