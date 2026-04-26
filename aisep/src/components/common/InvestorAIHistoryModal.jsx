import React from 'react';
import { X, MessageSquare, Shield, AlertCircle, ArrowRight, RotateCw } from 'lucide-react';
import styles from '../../styles/SharedDashboard.module.css';

const InvestorAIHistoryModal = ({ 
    isOpen, 
    onClose, 
    selectedAIReport, 
    projectName, 
    onViewProject, 
    onReanalyze,
    showViewProjectButton = true
}) => {
    if (!isOpen || !selectedAIReport) return null;

    return (
        <div className={styles.modalOverlay} onClick={onClose} style={{ backgroundColor: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(4px)' }}>
            <div className={styles.modalContent} style={{ maxWidth: '800px', width: '95%', maxHeight: '92vh', backgroundColor: '#000000', border: '1px solid #2f3336', borderRadius: '16px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div style={{ padding: '16px 24px', borderBottom: '1px solid #2f3336', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#e7e9ea', letterSpacing: '-0.02em' }}>Báo cáo phân tích AI</h3>
                        <div style={{ fontSize: '13px', color: '#71767b', marginTop: '2px' }}>
                            {projectName || `#${selectedAIReport.projectId}`} • {new Date(selectedAIReport.createdAt).toLocaleDateString('vi-VN')}
                        </div>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#e7e9ea', cursor: 'pointer', padding: '8px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }} onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(231, 233, 234, 0.1)'} onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}>
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
                    {/* Key Metric: Potential Score */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '40px', alignItems: 'start', marginBottom: '32px' }}>
                        <div style={{ textAlign: 'center', padding: '16px', border: '1px solid #2f3336', borderRadius: '12px', minWidth: '140px' }}>
                            <div style={{ fontSize: '11px', color: '#71767b', fontWeight: '700', textTransform: 'uppercase', marginBottom: '4px' }}>Điểm tiềm năng</div>
                            <div style={{ fontSize: '48px', fontWeight: '900', color: '#0ea5e9' }}>{selectedAIReport.potentialScore || selectedAIReport.startupScore || 0}</div>
                            <div style={{ fontSize: '12px', color: '#71767b' }}>trên 100 điểm</div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {(() => {
                                const breakdownData = selectedAIReport.scoreBreakdown;
                                let items = Array.isArray(breakdownData) ? breakdownData : (typeof breakdownData === 'string' ? JSON.parse(breakdownData || '[]') : []);

                                const labelsMap = { 'Team': 'Đội ngũ', 'Opportunity': 'Thị trường', 'Product': 'Sản phẩm', 'Competition': 'Cạnh tranh', 'Marketing': 'Tiếp thị', 'Investment': 'Tài chính', 'Other': 'Khác' };

                                return items.filter(item => item !== null).map((item, idx) => (
                                    <div key={idx} style={{ width: '100%' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px', color: '#e7e9ea' }}>
                                            <span style={{ fontWeight: '600' }}>{labelsMap[item.component] || item.component}</span>
                                            <span style={{ color: '#71767b' }}>{item.score}/{item.maxPoints}</span>
                                        </div>
                                        <div style={{ height: '4px', width: '100%', backgroundColor: '#2f3336', borderRadius: '2px', overflow: 'hidden' }}>
                                            <div style={{ height: '100%', width: `${(item.score / item.maxPoints) * 100}%`, backgroundColor: '#0ea5e9', transition: 'width 1s ease-out' }}></div>
                                        </div>
                                    </div>
                                ));
                            })()}
                        </div>
                    </div>

                    {/* Investment Verdict Card */}
                    <div style={{ marginBottom: '32px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: '#71767b', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase' }}>
                            <MessageSquare size={14} /> Nhận định đầu tư
                        </div>
                        <div style={{
                            padding: '24px',
                            borderRadius: '16px',
                            border: `1px solid ${(() => {
                                const v = (selectedAIReport.investmentVerdict || '').toLowerCase();
                                if (v.includes('strong')) return '#00ba7c';
                                if (v.includes('watchlist')) return '#ffd400';
                                if (v.includes('pass')) return '#1d9bf0';
                                if (v.includes('reject') || v.includes('fail')) return '#f4212e';
                                return '#2f3336';
                            })()}40`,
                            backgroundColor: `${(() => {
                                const v = (selectedAIReport.investmentVerdict || '').toLowerCase();
                                if (v.includes('strong')) return '#00ba7c20';
                                if (v.includes('watchlist')) return '#ffd40020';
                                if (v.includes('pass')) return '#1d9bf020';
                                if (v.includes('reject') || v.includes('fail')) return '#f4212e20';
                                return '#1d9bf020';
                            })()}`,
                            borderLeft: `6px solid ${(() => {
                                const v = (selectedAIReport.investmentVerdict || '').toLowerCase();
                                if (v.includes('strong')) return '#00ba7c';
                                if (v.includes('watchlist')) return '#ffd400';
                                if (v.includes('pass')) return '#1d9bf0';
                                if (v.includes('reject') || v.includes('fail')) return '#f4212e';
                                return '#1d9bf0';
                            })()}`,
                            position: 'relative'
                        }}>
                            <div style={{
                                fontSize: '18px',
                                fontWeight: '900',
                                color: (() => {
                                    const v = (selectedAIReport.investmentVerdict || '').toLowerCase();
                                    if (v.includes('strong')) return '#00ba7c';
                                    if (v.includes('watchlist')) return '#ffd400';
                                    if (v.includes('pass')) return '#1d9bf0';
                                    if (v.includes('reject') || v.includes('fail')) return '#f4212e';
                                    return '#e7e9ea';
                                })(),
                                marginBottom: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                letterSpacing: '-0.02em',
                                textTransform: 'uppercase'
                            }}>
                                <Shield size={20} />
                                {selectedAIReport.investmentVerdict || 'Evaluation Complete'}
                            </div>
                            <div style={{ fontSize: '15px', color: '#e7e9ea', lineHeight: '1.6', fontWeight: '400', fontStyle: 'italic' }}>
                                "{(() => {
                                    const fullData = typeof selectedAIReport.analysisJson === 'string' ? JSON.parse(selectedAIReport.analysisJson || '{}') : (selectedAIReport.analysis || {});
                                    return fullData.Summary || 'AI has evaluated this project. Please review the detailed breakdown below for next steps.';
                                })()}"
                            </div>
                        </div>
                    </div>

                    {/* Risks and Strategy */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: '#f4212e', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase' }}>
                                <AlertCircle size={14} /> Cảnh báo rủi ro
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {(() => {
                                    const risks = Array.isArray(selectedAIReport.riskFlags) ? selectedAIReport.riskFlags : (typeof selectedAIReport.riskFlags === 'string' ? JSON.parse(selectedAIReport.riskFlags || '[]') : []);
                                    return risks.length > 0 ? risks.map((risk, i) => (
                                        <div key={i} style={{ display: 'flex', gap: '10px', fontSize: '14px', lineHeight: '1.4', color: '#e7e9ea' }}>
                                            <span style={{ color: '#f4212e', flexShrink: 0 }}>•</span>
                                            <span>{risk}</span>
                                        </div>
                                    )) : <span style={{ color: '#71767b', fontSize: '13px' }}>Không có rủi ro đáng kể.</span>;
                                })()}
                            </div>
                        </div>

                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: '#00ba7c', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase' }}>
                                <ArrowRight size={14} /> Bước tiếp theo
                            </div>
                            <div style={{ padding: '16px', borderRadius: '12px', border: '1px dashed #2f3336', backgroundColor: 'rgba(0, 186, 124, 0.03)', color: '#e7e9ea', fontSize: '14px', lineHeight: '1.5' }}>
                                {(() => {
                                    const nextStep = selectedAIReport.investorNextStep;
                                    if (nextStep) return nextStep;
                                    const fullData = typeof selectedAIReport.analysisJson === 'string' ? JSON.parse(selectedAIReport.analysisJson || '{}') : (selectedAIReport.analysis || {});
                                    return fullData.InvestorNextStep || 'Tiếp tục theo dõi và thẩm định dự án.';
                                })()}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div style={{ padding: '16px 24px', borderTop: '1px solid #2f3336', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', backgroundColor: '#000000', gap: '12px' }}>
                    <button
                        onClick={onClose}
                        style={{ backgroundColor: 'transparent', border: '1px solid #536471', color: '#e7e9ea', padding: '10px 24px', borderRadius: '9999px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', transition: 'background 0.2s' }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(231, 233, 234, 0.1)'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                    >
                        Đóng
                    </button>
                    {onReanalyze && (
                        <button
                            onClick={onReanalyze}
                            style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'rgba(14, 165, 233, 0.1)', border: '1px solid rgba(14, 165, 233, 0.3)', color: '#0ea5e9', padding: '10px 24px', borderRadius: '9999px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s' }}
                            onMouseEnter={(e) => { e.target.style.backgroundColor = 'rgba(14, 165, 233, 0.2)'; e.target.style.border = '1px solid #0ea5e9'; }}
                            onMouseLeave={(e) => { e.target.style.backgroundColor = 'rgba(14, 165, 233, 0.1)'; e.target.style.border = '1px solid rgba(14, 165, 233, 0.3)'; }}
                        >
                            <RotateCw size={16} /> Phân tích lại
                        </button>
                    )}
                    {showViewProjectButton && (
                        <button
                            onClick={() => onViewProject ? onViewProject(selectedAIReport.projectId) : window.location.href = `/project/${selectedAIReport.projectId}`}
                            style={{ backgroundColor: '#eff3f4', border: 'none', color: '#0f1419', padding: '10px 24px', borderRadius: '9999px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', transition: 'opacity 0.2s' }}
                            onMouseEnter={(e) => e.target.style.opacity = '0.9'}
                            onMouseLeave={(e) => e.target.style.opacity = '1'}
                        >
                            Xem chi tiết dự án
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default InvestorAIHistoryModal;
