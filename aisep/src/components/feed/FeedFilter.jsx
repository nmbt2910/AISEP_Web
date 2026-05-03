import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Filter, X, Clock, Flame, Star, Coins, List } from 'lucide-react';
import styles from './FeedFilter.module.css';
import optionService from '../../services/optionService';
import { getStageLabel } from '../../constants/ProjectStatus';

/**
 * FeedFilter Component - Filter startups for investors
 * @param {function} onFilterChange - Callback when filters change
 * @param {object} totalCount - Total number of projects
 */
function FeedFilter({ onFilterChange, totalCount = 0, activeFilters }) {
  const [activeSort, setActiveSort] = useState(activeFilters?.sort || 'newest');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    industry: activeFilters?.industry || '',
    stage: activeFilters?.stage || '',
    minScore: activeFilters?.minScore || 0,
    fundingStage: activeFilters?.fundingStage || '',
    sort: activeFilters?.sort || 'newest',
  });
  
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0, opacity: 0 });
  const tabsRef = useRef(null);
  const tabElementsRef = useRef({});

  // Scroll visibility for mobile indicators
  const [showLeftIndicator, setShowLeftIndicator] = useState(false);
  const [showRightIndicator, setShowRightIndicator] = useState(false);

  const checkScroll = () => {
    if (tabsRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = tabsRef.current;
      setShowLeftIndicator(scrollLeft > 10);
      setShowRightIndicator(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    const timer = setTimeout(checkScroll, 100);
    window.addEventListener('resize', checkScroll);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', checkScroll);
    };
  }, [totalCount]);

  // Update underline indicator whenever activeSort or sortOptions change
  useEffect(() => {
    const updateIndicator = () => {
      const activeTabElement = tabElementsRef.current[activeSort];
      if (activeTabElement && tabsRef.current) {
        setIndicatorStyle({
          left: activeTabElement.offsetLeft,
          width: activeTabElement.offsetWidth,
          opacity: 1
        });
      }
    };

    // Start indicator immediately
    const timeoutId = setTimeout(updateIndicator, 0);
    
    window.addEventListener('resize', updateIndicator);
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', updateIndicator);
    };
  }, [activeSort]);

  const sortOptions = [
    { id: 'newest', label: 'Mới nhất', icon: Clock },
    { id: 'oldest', label: 'Cũ nhất', icon: List },
    { id: 'rated', label: 'Được đánh giá cao', icon: Star },
  ];

  const handleSortClick = (sortId) => {
    setActiveSort(sortId);
    const newFilters = { ...filters, sort: sortId };
    setFilters(newFilters);
    if (onFilterChange) onFilterChange(newFilters);
  };

  // Keep state in sync if activeFilters changes from outside (e.g. from props)
  useEffect(() => {
    if (activeFilters) {
      if (activeFilters.sort !== activeSort) {
        setActiveSort(activeFilters.sort || 'newest');
      }
      setFilters(prev => {
        // Only update if actually different to avoid cycles
        if (
          prev.industry !== activeFilters.industry ||
          prev.stage !== activeFilters.stage ||
          prev.minScore !== activeFilters.minScore ||
          prev.fundingStage !== activeFilters.fundingStage ||
          prev.sort !== activeFilters.sort
        ) {
          return {
            industry: activeFilters.industry || '',
            stage: activeFilters.stage || '',
            minScore: activeFilters.minScore || 0,
            fundingStage: activeFilters.fundingStage || '',
            sort: activeFilters.sort || 'newest',
          };
        }
        return prev;
      });
    }
  }, [activeFilters]);

  const [stageOptions, setStageOptions] = useState([]);

  useEffect(() => {
    const fetchStages = async () => {
      const res = await optionService.getStages();
      setStageOptions(res.filter(s => s.isActive));
    };
    fetchStages();
  }, []);

  const handleFilterChange = (filterName, value) => {
    const newFilters = { ...filters, [filterName]: value };
    setFilters(newFilters);
    if (onFilterChange) onFilterChange(newFilters);
  };

  const filterPanelContent = (
    <div className={styles.filterPanel}>
      <div className={styles.filterHeader}>
        <h3>Lọc nâng cao</h3>
        <button className={styles.closeFilterBtn} onClick={() => setShowFilters(false)}>
          <X size={20} />
        </button>
      </div>
      <div className={styles.filterContent}>
        {/* Stage Filter */}
        <div className={styles.filterGroup}>
          <label>Giai đoạn</label>
          <select value={filters.stage} onChange={(e) => handleFilterChange('stage', e.target.value)}>
            <option value="">Tất cả giai đoạn</option>
            {stageOptions.map(s => {
              const label = getStageLabel(s.label);
              return (
                <option key={s.value} value={label}>{label}</option>
              );
            })}
          </select>
        </div>
        {/* AI Score Filter */}
        <div className={styles.filterGroup}>
          <label>Điểm AI tối thiểu: {filters.minScore}%</label>
          <input 
            type="range" 
            min="0" 
            max="100" 
            value={filters.minScore} 
            onChange={(e) => handleFilterChange('minScore', parseInt(e.target.value))} 
            className={styles.rangeSlider} 
          />
          <div className={styles.scoreLabels}>
            <span>0</span>
            <span>50</span>
            <span>100</span>
          </div>
        </div>
      </div>
      <div className={styles.filterActions}>
        <button className={styles.applyBtn} onClick={() => setShowFilters(false)}>Xong</button>
      </div>
    </div>
  );

  return (
    <div className={styles.filterContainer}>
      <div className={styles.tabsWrapper}>
        <div className={styles.tabsInner}>
          <div className={styles.tabsListWrapper}>
            {showLeftIndicator && <div className={`${styles.scrollIndicator} ${styles.scrollIndicatorLeft}`} />}
            <div className={styles.tabsList} ref={tabsRef} onScroll={checkScroll}>
              {sortOptions.map(option => {
                const IconComponent = option.icon;
                return (
                  <button 
                    key={option.id}
                    ref={el => tabElementsRef.current[option.id] = el}
                    className={`${styles.tabItem} ${activeSort === option.id ? styles.activeTab : ''}`}
                    onClick={() => handleSortClick(option.id)}
                  >
                    <span className={styles.tabIcon}><IconComponent size={14} /></span>
                    <span>{option.label}</span>
                    {option.id === 'newest' && <span className={styles.tabCount}>{totalCount}</span>}
                  </button>
                );
              })}
              
              {/* Sliding Underline Indicator */}
              <div 
                className={styles.activeIndicator} 
                style={{
                  left: `${indicatorStyle.left}px`,
                  width: `${indicatorStyle.width}px`,
                  opacity: indicatorStyle.opacity
                }} 
              />
            </div>
            {showRightIndicator && <div className={`${styles.scrollIndicator} ${styles.scrollIndicatorRight}`} />}
          </div>
          
          <div className={styles.filterToggleWrapper}>
            <button
              className={styles.filterToggle}
              onClick={() => setShowFilters(!showFilters)}
              title="Lọc nâng cao"
            >
              <Filter size={18} />
            </button>
            
            {/* Desktop Inline Panel */}
            {showFilters && (
              <div className={styles.desktopOnly}>
                {filterPanelContent}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Portal Modal */}
      {showFilters && createPortal(
        <div className={styles.mobileOnly}>
          <div className={styles.filterBackdrop} onClick={() => setShowFilters(false)} />
          {filterPanelContent}
        </div>,
        document.body
      )}
    </div>
  );
}

export default FeedFilter;
