import React from 'react';
import styles from '../../styles/SharedDashboard.module.css';

/**
 * DashboardSection - Standardized layout container for dashboard tabs
 * 
 * @param {string} title - Section title
 * @param {React.Node} topBarExtra - Optional extra content for the top bar (e.g., Search)
 * @param {React.Node} filterBar - Optional filter bar (e.g., DashboardStatusFilter)
 * @param {React.Node} children - Main content (grid, list, etc.)
 */
const DashboardSection = ({ title, topBarExtra, filterBar, banner, children }) => {
    return (
        <div className={styles.section} style={{ background: 'transparent', boxShadow: 'none', padding: 0 }}>
            {/* Header / Top Bar */}
            <div className={styles.cardHeader} style={{
                background: 'var(--bg-secondary)',
                borderRadius: '12px',
                padding: '16px 20px',
                border: '1px solid var(--border-color)',
                marginBottom: '20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '16px'
            }}>
                <h3 className={styles.cardTitle} style={{ marginBottom: 0 }}>{title}</h3>
                {topBarExtra}
            </div>

            {/* Filter Bar */}
            {filterBar && (
                <div style={{ marginBottom: '24px' }}>
                    {filterBar}
                </div>
            )}

            {/* Banner Section (Placed below filters) */}
            {banner && (
                <div style={{ marginBottom: '24px' }}>
                    {banner}
                </div>
            )}

            {/* Main Content */}
            <div className={styles.sectionContent}>
                {children}
            </div>
        </div>
    );
};

export default DashboardSection;
