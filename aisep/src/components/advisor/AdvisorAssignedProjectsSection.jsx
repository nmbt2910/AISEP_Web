import React, { useState, useEffect } from 'react';
import { Rocket, Eye, Loader2, AlertCircle, Search, ChevronRight } from 'lucide-react';
import projectAssignmentService from '../../services/projectAssignmentService';
import styles from '../../styles/SharedDashboard.module.css';

export default function AdvisorAssignedProjectsSection({ onSelectProject }) {
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchProjects = async () => {
            setLoading(true);
            try {
                const response = await projectAssignmentService.getAssignedProjectsForMe();
                const items = response?.data?.items || response?.items || (Array.isArray(response) ? response : []);
                setProjects(items);
            } catch (error) {
                console.error('Failed to fetch assigned projects:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchProjects();
    }, []);

    const filteredProjects = projects.filter(p => 
        p.projectName?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', gap: '16px', color: 'var(--text-secondary)' }}>
                <Loader2 className="animate-spin" size={40} />
                <p>Đang tải danh sách dự án...</p>
            </div>
        );
    }

    return (
        <div className={styles.section}>
            <div style={{ marginBottom: '24px', position: 'relative' }}>
                <div style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                    <Search size={18} />
                </div>
                <input 
                    type="text"
                    placeholder="Tìm kiếm dự án..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ 
                        width: '100%', 
                        padding: '14px 16px 14px 48px', 
                        borderRadius: '14px', 
                        border: '1px solid var(--border-color)', 
                        background: 'var(--bg-secondary)', 
                        color: 'var(--text-primary)',
                        fontSize: '15px',
                        outline: 'none',
                        transition: 'all 0.2s'
                    }}
                />
            </div>

            {filteredProjects.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '64px 32px', background: 'var(--bg-secondary)', borderRadius: '20px', border: '1px dashed var(--border-color)', color: 'var(--text-muted)' }}>
                    <Rocket size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
                    <p>{searchTerm ? 'Không tìm thấy dự án nào khớp với tìm kiếm.' : 'Bạn chưa được phân công phụ trách dự án nào.'}</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
                    {filteredProjects.map((p) => (
                        <div 
                            key={p.projectId} 
                            style={{ 
                                background: 'var(--bg-primary)', 
                                border: '1px solid var(--border-color)', 
                                borderRadius: '20px', 
                                overflow: 'hidden',
                                display: 'flex',
                                flexDirection: 'column',
                                transition: 'box-shadow 0.2s',
                                cursor: 'default'
                            }}
                            onMouseEnter={e => {
                                e.currentTarget.style.boxShadow = '0 12px 24px rgba(0,0,0,0.1)';
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.boxShadow = 'none';
                            }}
                        >
                            <div style={{ padding: '24px' }}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
                                    <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(29, 155, 240, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-blue)' }}>
                                        <Rocket size={24} />
                                    </div>
                                    <span style={{ fontSize: '11px', fontWeight: 800, padding: '4px 10px', borderRadius: '20px', background: 'rgba(16,185,129,0.1)', color: '#10b981', textTransform: 'uppercase' }}>
                                        Phụ trách
                                    </span>
                                </div>

                                <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>
                                    {p.projectName}
                                </h3>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '12px', marginBottom: '24px' }}>
                                    <AlertCircle size={14} />
                                    <span>Được phân công ngày: {new Date(p.assignedAt).toLocaleDateString('vi-VN')}</span>
                                </div>

                                <button 
                                    onClick={() => onSelectProject(p.projectId)}
                                    style={{ 
                                        width: '100%', 
                                        padding: '12px', 
                                        borderRadius: '12px', 
                                        border: 'none', 
                                        background: 'var(--bg-secondary)', 
                                        color: 'var(--text-primary)', 
                                        fontWeight: 700, 
                                        fontSize: '14px', 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        justifyContent: 'center', 
                                        gap: '8px',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                    onMouseEnter={e => {
                                        e.currentTarget.style.background = 'var(--primary-blue)';
                                        e.currentTarget.style.color = 'white';
                                    }}
                                    onMouseLeave={e => {
                                        e.currentTarget.style.background = 'var(--bg-secondary)';
                                        e.currentTarget.style.color = 'var(--text-primary)';
                                    }}
                                >
                                    <Eye size={18} />
                                    Xem chi tiết dự án
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
