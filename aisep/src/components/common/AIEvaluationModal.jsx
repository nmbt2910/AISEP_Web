import React from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle, AlertCircle, TrendingUp, X, AlertTriangle, Brain, Sparkles, ChevronRight, HelpCircle } from 'lucide-react';
import styles from './AIEvaluationModal.module.css';
import { normalizeAIAnalysisPayload } from '../../utils/normalizeAIAnalysisPayload.js';
import AIAnalysisRadarChart from './AIAnalysisRadarChart.jsx';

const ADJUSTMENT_TOOLTIP =
  'Sự sai lệch giữa Form khai báo và File PDF đính kèm — AI điều chỉnh theo bằng chứng trích xuất được.';

/**
 * AIEvaluationModal - Display AI analysis and eligibility evaluation results
 * Props:
 *  - isEvaluationOnly: true = show Save button (Premium feature), false = show Submit button
 *  - isHistoryMode: true = read-only history view
 */
export default function AIEvaluationModal({
    isOpen,
    analysisResult,
    eligibilityResult,
    isLoading,
    error,
    projectName,
    viewerRole,
    isHistoryMode = false,
    isEvaluationOnly = false,
    onSubmit,
    onCancel,
    /** 'auto' = theo role; 'investor' = Due diligence; 'startup' = coaching */
    uiVariant = 'auto',
    onReanalyze,
    onEditProfileClick,
    onUploadPdfClick,
}) {
    const [expandedSections, setExpandedSections] = React.useState({});

    const toggleSection = (key) => {
        setExpandedSections(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    if (!isOpen) return null;

    const {
        analysisData,
        finalPotentialScore,
        baseScore,
        aiAdjustmentScore,
        strengths,
        weaknesses,
        recommendations,
        auditedItems,
        legacyScoreBreakdown,
        legacyDetailEntries,
        chaosScore,
        summary,
    } = normalizeAIAnalysisPayload(analysisResult);

    const scoreBreakdown = legacyScoreBreakdown;

    const canSubmit =
        analysisData.evaluationId != null ||
        analysisData.analysisId != null ||
        analysisData.projectId != null ||
        typeof analysisData.isEligibleStartup === 'boolean' ||
        typeof analysisData.is_eligible_startup === 'boolean' ||
        auditedItems.length > 0 ||
        strengths.length > 0 ||
        weaknesses.length > 0 ||
        recommendations.length > 0 ||
        legacyDetailEntries.length > 0 ||
        legacyScoreBreakdown.length > 0 ||
        Number.isFinite(finalPotentialScore);

    const showLowScoreWarning = finalPotentialScore > 0 && finalPotentialScore < 50;
    const showZeroFinalNotice =
        finalPotentialScore === 0 && (baseScore > 0 || auditedItems.length > 0);

    const roleStr = viewerRole?.toString().toLowerCase?.() || '';
    const roleNum = Number(viewerRole);
    const isStartupViewer = roleStr === 'startup' || roleNum === 0;
    const isInvestorViewer = roleStr === 'investor' || roleNum === 1;
    const isStaffOrAdvisorViewer =
        ['staff', 'operationstaff', 'operation_staff', 'advisor', 'admin'].includes(roleStr) ||
        [2, 3, 4, 5].includes(roleNum);
    const isNonStartupViewer = (isInvestorViewer || isStaffOrAdvisorViewer) && !isStartupViewer;

    const resolvedUiVariant =
        uiVariant === 'auto' ? (isInvestorViewer ? 'investor' : 'startup') : uiVariant;

    // Determine if this is a staff-initiated eligibility report
    // Priority: explicit _type tag from caller > field-sniffing
    const explicitType = analysisResult?._type; // 'startup' | 'eligibility' | undefined
    const isEligibilityReport = explicitType === 'eligibility' || (
        explicitType !== 'startup' &&
        analysisData &&
        (
            (typeof analysisData.is_eligible_startup === 'boolean') ||
            (typeof analysisData.isEligibleStartup === 'boolean')
        )
    );
    const isEligible = analysisData?.is_eligible_startup || analysisData?.isEligibleStartup;
    const eligibilityReason = analysisData?.eligibility_reason || analysisData?.eligibilityReason;

    const translateKey = (k) => {
        const map = {
            team: 'Đội ngũ',
            opportunity: 'Cơ hội thị trường',
            product: 'Sản phẩm',
            market: 'Thị trường',
            competition: 'Cạnh tranh',
            traction: 'Traction',
            investmentneed: 'Nhu cầu đầu tư',
            financials: 'Tài chính',
            strategy: 'Chiến lược',
            execution: 'Thực thi',
            marketing: 'Tiếp thị',
            growth: 'Tăng trưởng',
            risk: 'Rủi ro',
            investment: 'Huy động vốn',
        };
        const lower = String(k).toLowerCase();
        return map[lower] || k.charAt(0).toUpperCase() + k.slice(1);
    };

    const translateAIString = (str) => {
        if (!str || typeof str !== 'string') return str;
        let result = str;
        const map = {
            'Market Size': 'Quy mô thị trường',
            'Revenue': 'Doanh thu',
            'unrealistically low': 'thấp bất thường',
            'unrealistically high': 'cao bất thường',
            'Business Model': 'Mô hình kinh doanh',
            'BusinessModel': 'Mô hình kinh doanh',
            'Target Audience': 'Khách hàng mục tiêu',
            'Potential': 'Tiềm năng',
            'Strategy': 'Chiến lược',
            'Growth': 'Tăng trưởng',
            'Missing': 'Thiếu',
            'Evidence': 'Bằng chứng',
            'Go-to-market plan': 'Tiến độ thâm nhập thị trường',
            'Sales Chiến lược': 'Chiến lược bán hàng',
            'Customer acquisition': 'Thu hút khách hàng',
            'Traction metrics': 'Chỉ số tăng trưởng',
            'TeamMembers': 'Thành viên đội ngũ',
            'KeySkills': 'Kỹ năng then chốt',
            'TeamExperience': 'Kinh nghiệm đội ngũ',
            'Founder background': 'Tiểu sử người sáng lập',
            'Role split': 'Phân chia vai trò',
            'Domain experience': 'Kinh nghiệm lĩnh vực',
            'Investment': 'Huy động vốn'
        };
        Object.entries(map).forEach(([eng, vi]) => {
            const regex = new RegExp(eng, 'gi');
            result = result.replace(regex, vi);
        });
        return result;
    };

    const renderContent = () => {
        if (isEligibilityReport) {
            return (
                <div className={styles.content}>
                    <div className={styles.section}>
                        <div className={styles.summaryBox} style={{ 
                            borderLeft: `6px solid ${isEligible ? '#10b981' : '#ef4444'}`,
                            backgroundColor: isEligible ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.05)',
                            padding: '24px'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                                {isEligible ? (
                                    <CheckCircle size={48} style={{ color: '#10b981' }} />
                                ) : (
                                    <AlertCircle size={48} style={{ color: '#ef4444' }} />
                                )}
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '900', color: isEligible ? '#10b981' : '#ef4444' }}>
                                        {isEligible ? 'ĐỦ ĐIỀU KIỆN' : 'KHÔNG ĐỦ ĐIỀU KIỆN'}
                                    </h3>
                                    <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: '16px', fontWeight: '600' }}>
                                        Kết luận từ Hệ thống AI Phân tích eligibility
                                    </p>
                                </div>
                            </div>
                            
                            <div style={{ borderTop: '1px solid rgba(0,0,0,0.05)', paddingTop: '16px' }}>
                                <h4 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Sparkles size={16} color="var(--primary-blue)" /> Lý do chi tiết:
                                </h4>
                                <p style={{ 
                                    margin: 0, 
                                    fontSize: '17px', 
                                    lineHeight: '1.7', 
                                    color: 'var(--text-primary)',
                                    whiteSpace: 'pre-wrap'
                                }}>
                                    {eligibilityReason || 'Không có mô tả chi tiết từ hệ thống.'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        const fmtScore = (v) =>
            typeof v === 'number'
                ? Number.isInteger(v)
                    ? v
                    : Math.round(v * 100) / 100
                : v;

        const hasAuditedTable = auditedItems.length > 0;

        const radarBlock = hasAuditedTable ? (
            <div className={styles.section}>
                <div className={styles.radarSection}>
                    <h3 className={styles.radarTitle}>So sánh Khai báo vs Thực tế AI</h3>
                    <AIAnalysisRadarChart auditedItems={auditedItems} labelMapper={translateKey} />
                </div>
            </div>
        ) : null;

        const chaosNote =
            !hasAuditedTable &&
            chaosScore != null &&
            Number(chaosScore) !== Number(aiAdjustmentScore) ? (
                <p style={{ margin: '10px 0 0', fontSize: '14px', color: 'var(--text-secondary)' }}>
                    Điểm rối loạn (định dạng cũ): {chaosScore}
                </p>
            ) : null;

        const investorAuditTable = hasAuditedTable ? (
            <div className={styles.section}>
                <h3 className={styles.sectionTitleMinimal}>Chi tiết kiểm toán (Due diligence)</h3>
                <div className={styles.auditTableWrap}>
                    <table className={styles.auditTable}>
                        <thead>
                            <tr>
                                <th>Tiêu chí</th>
                                <th className={styles.auditNums}>Max</th>
                                <th className={styles.auditNums}>Gốc</th>
                                <th className={`${styles.auditNums} ${styles.thTooltip}`} title={ADJUSTMENT_TOOLTIP}>
                                    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                                        Điều chỉnh <HelpCircle size={13} aria-hidden />
                                    </span>
                                </th>
                                <th className={styles.auditNums}>Cuối</th>
                                <th>Nhận xét</th>
                            </tr>
                        </thead>
                        <tbody>
                            {auditedItems.map((row, idx) => {
                                const crit = row.criteria ?? row.Criteria ?? '';
                                const maxS = row.maxScore ?? row.MaxScore;
                                const baseS = row.baseScore ?? row.BaseScore;
                                const adj = row.adjustment ?? row.Adjustment;
                                const fin = row.finalScore ?? row.FinalScore;
                                const finding = row.finding ?? row.Finding ?? '';
                                return (
                                    <tr key={`inv-audit-${idx}`}>
                                        <td className={styles.auditCriteria}>{translateKey(crit)}</td>
                                        <td className={styles.auditNums}>{maxS ?? '—'}</td>
                                        <td className={styles.auditNums}>{baseS ?? '—'}</td>
                                        <td
                                            className={`${styles.auditNums} ${styles.thTooltip}`}
                                            title={ADJUSTMENT_TOOLTIP}
                                        >
                                            <span className={Number(adj) < 0 ? styles.scoreboardValueRisk : ''}>
                                                {adj != null ? (Number(adj) > 0 ? '+' : '') + adj : '—'}
                                            </span>
                                        </td>
                                        <td className={styles.auditNums}>{fin ?? '—'}</td>
                                        <td className={styles.auditFinding}>{translateAIString(finding)}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        ) : null;

        const startupAuditAccordion = hasAuditedTable ? (
            <div className={styles.section}>
                <h3 className={styles.sectionTitleMinimal}>Chi tiết kiểm toán theo tiêu chí</h3>
                <div className={styles.analysisList}>
                    {auditedItems.map((row, idx) => {
                        const crit = row.criteria ?? row.Criteria ?? '';
                        const maxS = row.maxScore ?? row.MaxScore;
                        const baseS = row.baseScore ?? row.BaseScore;
                        const adj = row.adjustment ?? row.Adjustment;
                        const fin = row.finalScore ?? row.FinalScore;
                        const finding = row.finding ?? row.Finding ?? '';
                        const key = `st-audit-${idx}-${crit}`;
                        const isExpanded = expandedSections[key];
                        return (
                            <div key={key} className={`${styles.analysisItem} ${isExpanded ? styles.expanded : ''}`}>
                                <div
                                    className={styles.analysisItemHeader}
                                    onClick={() => toggleSection(key)}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <div className={styles.analysisItemTitleGroup}>
                                        <ChevronRight
                                            size={16}
                                            className={`${styles.chevron} ${isExpanded ? styles.chevronExpanded : ''}`}
                                        />
                                        <h5 style={{ margin: 0, fontSize: '17px', fontWeight: '800' }}>
                                            {translateKey(crit)}
                                        </h5>
                                    </div>
                                    <span className={styles.analysisScore}>
                                        {fin != null ? `Cuối: ${fin}` : ''}
                                        {maxS != null ? ` / Max ${maxS}` : ''}
                                    </span>
                                </div>
                                <div className={`${styles.analysisDetailsContent} ${isExpanded ? styles.show : ''}`}>
                                    <div className={styles.detailSection} style={{ fontSize: '15px' }}>
                                        <div className={styles.detailLabel}>Điểm & điều chỉnh</div>
                                        <p style={{ margin: '4px 0 0 0' }}>
                                            Gốc: <strong>{baseS ?? '—'}</strong>
                                            {' · '}
                                            Điều chỉnh:{' '}
                                            <strong className={styles.scoreboardValueWarm}>
                                                {adj != null ? (Number(adj) > 0 ? '+' : '') + adj : '—'}
                                            </strong>
                                        </p>
                                        {finding ? (
                                            <div className={styles.feedbackBox}>{translateAIString(finding)}</div>
                                        ) : null}
                                        {Number(adj) < 0 ? (
                                            <div className={styles.ctaRow}>
                                                <button
                                                    type="button"
                                                    className={styles.ctaGhost}
                                                    onClick={() => onEditProfileClick?.()}
                                                >
                                                    Cập nhật lại Form
                                                </button>
                                                <button
                                                    type="button"
                                                    className={styles.ctaGhost}
                                                    onClick={() => onUploadPdfClick?.()}
                                                >
                                                    Tải lên PDF mới
                                                </button>
                                            </div>
                                        ) : null}
                                    </div>
                                </div>
                                {!isExpanded && finding ? (
                                    <div className={styles.previewText}>
                                        {translateAIString(finding).substring(0, 80)}
                                        {translateAIString(finding).length > 80 ? '…' : ''}
                                    </div>
                                ) : null}
                            </div>
                        );
                    })}
                </div>
            </div>
        ) : null;

        const legacyBlocks = (
            <>
                {!hasAuditedTable && scoreBreakdown.length > 0 && (
                    <div className={styles.section}>
                        <h3 className={styles.sectionTitleMinimal}>Cấu trúc điểm thành phần</h3>
                        <div className={styles.scoreBreakdown}>
                            <div className={styles.breakdownGrid}>
                                {scoreBreakdown.filter((item) => item !== null).map((item, idx) => (
                                    <div key={idx} className={styles.breakdownItem}>
                                        <span className={styles.componentName}>{item.component}</span>
                                        <div className={styles.scoreBar}>
                                            <div
                                                className={styles.scoreBarFill}
                                                style={{ width: `${((item?.score || 0) / 1.5) * 100}%` }}
                                            ></div>
                                        </div>
                                        <span className={styles.componentScore}>{item.score?.toFixed(1) || 0}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {!hasAuditedTable && legacyDetailEntries.length > 0 && (
                    <div className={styles.section}>
                        <h3 className={styles.sectionTitleMinimal}>Chi tiết phân tích (định dạng cũ)</h3>
                        <div className={styles.analysisList}>
                            {legacyDetailEntries.map(([key, section]) => {
                                if (section == null || typeof section !== 'object' || !section.score) return null;

                                const isExpanded = expandedSections[key];

                                return (
                                    <div key={key} className={`${styles.analysisItem} ${isExpanded ? styles.expanded : ''}`}>
                                        <div
                                            className={styles.analysisItemHeader}
                                            onClick={() => toggleSection(key)}
                                            style={{ cursor: 'pointer' }}
                                        >
                                            <div className={styles.analysisItemTitleGroup}>
                                                <ChevronRight
                                                    size={16}
                                                    className={`${styles.chevron} ${isExpanded ? styles.chevronExpanded : ''}`}
                                                />
                                                <h5 style={{ margin: 0, textTransform: 'capitalize', fontSize: '17px', fontWeight: '800' }}>
                                                    {translateKey(key)}
                                                </h5>
                                            </div>
                                            <span className={styles.analysisScore}>
                                                Điểm: {typeof section.score === 'number' ? section.score.toFixed(1) : section.score}
                                            </span>
                                        </div>

                                        <div className={`${styles.analysisDetailsContent} ${isExpanded ? styles.show : ''}`}>
                                            {section.reason && (
                                                <div className={styles.detailSection}>
                                                    <div className={styles.detailLabel}>Lý do:</div>
                                                    <p className={styles.analysisReason}>
                                                        {translateAIString(section.reason)}
                                                    </p>
                                                </div>
                                            )}

                                            {section.evidence?.length > 0 && (
                                                <div className={styles.detailSection}>
                                                    <div className={styles.detailLabel}>Bằng chứng:</div>
                                                    <ul className={styles.detailList}>
                                                        {section.evidence.map((e, idx) => (
                                                            <li key={idx}>
                                                                {!isEligibilityReport && <span style={{ marginRight: '6px' }}>✓</span>}
                                                                {translateAIString(e)}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}

                                            {section.missingData?.length > 0 && (
                                                <div className={styles.detailSection}>
                                                    <div className={styles.detailLabel}>Dữ liệu thiếu:</div>
                                                    <ul className={styles.detailList} style={{ color: 'var(--text-secondary)' }}>
                                                        {section.missingData.map((m, idx) => (
                                                            <li key={idx}>⚠ {translateAIString(m)}</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>

                                        {!isExpanded && (
                                            <div className={styles.previewText}>
                                                {section.reason ? translateAIString(section.reason).substring(0, 60) + '...' : 'Nhấn để xem chi tiết'}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {summary && (
                    <div className={styles.section}>
                        <h3 className={styles.sectionTitleMinimal}>Tóm tắt</h3>
                        <div className={styles.summaryBox}>
                            <p className={styles.summaryText}>{summary}</p>
                        </div>
                    </div>
                )}

                {showLowScoreWarning && (
                    <div className={styles.section}>
                        <div className={styles.warningBox}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                                <AlertTriangle size={24} className={styles.weaknessIcon} style={{ marginTop: '2px', flexShrink: 0 }} />
                                <div>
                                    <div className={styles.warningTitle}>⚠️ Cảnh báo: Điểm Đánh Giá Thấp</div>
                                    <div className={styles.warningText}>
                                        {isStartupViewer ? (
                                            <>Dự án của bạn có điểm {finalPotentialScore}/100. Bạn vẫn có thể nộp dự án, nhưng hãy cân nhắc cải thiện các điểm yếu được nhấn mạnh ở trên để tăng khả năng được cấp vốn.</>
                                        ) : (
                                            <>Dự án có điểm {finalPotentialScore}/100. Hãy cân nhắc các điểm cần cải thiện được nhấn mạnh ở trên để giảm rủi ro và tăng khả năng thu hút đầu tư.</>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </>
        );

        if (resolvedUiVariant === 'investor') {
            return (
                <div className={styles.content}>
                    <div className={styles.section}>
                        <div className={styles.scoreboardRow}>
                            <div className={`${styles.scoreboardTile} ${styles.scoreboardTileNeutral}`}>
                                <span className={styles.scoreboardLabel}>Điểm Startup Khai Báo</span>
                                <span className={styles.scoreboardValue}>{fmtScore(baseScore)}</span>
                            </div>
                            <div className={`${styles.scoreboardTile} ${styles.scoreboardTileRisk}`}>
                                <span className={styles.scoreboardLabel}>AI Điều Chỉnh Rủi Ro</span>
                                <span className={`${styles.scoreboardValue} ${styles.scoreboardValueRisk}`}>
                                    {aiAdjustmentScore > 0 ? '+' : ''}
                                    {fmtScore(aiAdjustmentScore)}
                                </span>
                            </div>
                            <div className={`${styles.scoreboardTile} ${styles.scoreboardTileBrand}`}>
                                <span className={styles.scoreboardLabel}>Điểm Thực Tế Thẩm Định</span>
                                <span className={`${styles.scoreboardValue} ${styles.scoreboardValueHero}`}>
                                    {fmtScore(finalPotentialScore)}
                                </span>
                            </div>
                        </div>
                        {showZeroFinalNotice && (
                            <p className={styles.scoreInlineNote}>
                                Chênh lệch lớn giữa khai báo và bằng chứng PDF — điểm thực tế sau kiểm toán AI có thể về 0. Xem bảng
                                chi tiết và mục rủi ro.
                            </p>
                        )}
                        {chaosNote}
                    </div>

                    {radarBlock}

                    {weaknesses.length > 0 && (
                        <div className={styles.section}>
                            <div className={styles.investorRiskPanel}>
                                <h3 className={styles.panelTitleInvestorRisk}>Cảnh báo rủi ro &amp; Mâu thuẫn</h3>
                                <ul className={styles.highlightList}>
                                    {weaknesses.map((w, idx) => (
                                        <li key={idx} className={styles.highlightItem} style={{ color: 'var(--text-primary)' }}>
                                            <AlertTriangle size={14} style={{ color: '#dc2626', flexShrink: 0, marginTop: 3 }} /> {w}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    )}

                    {strengths.length > 0 && (
                        <div className={styles.section}>
                            <div className={styles.investorStrengthPanel}>
                                <h3 className={styles.panelTitleInvestorStrength}>Lợi thế cạnh tranh được xác thực</h3>
                                <ul className={styles.highlightList}>
                                    {strengths.map((s, idx) => (
                                        <li key={idx} className={styles.highlightItem} style={{ color: 'var(--text-primary)' }}>
                                            <CheckCircle size={14} style={{ color: '#059669', flexShrink: 0, marginTop: 3 }} /> {s}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    )}

                    {recommendations.length > 0 && (
                        <div className={styles.section}>
                            <div className={styles.investorAdvicePanel}>
                                <h3 className={styles.panelTitleInvestorAdvice}>Bộ câu hỏi chất vấn đề xuất</h3>
                                <p style={{ margin: '0 0 12px', fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                                    AI gợi ý các hướng hỏi sâu để làm rõ lỗ hổng khi đối thoại / pitching với startup.
                                </p>
                                <div className={styles.adviceList}>
                                    {recommendations.map((rec, idx) => (
                                        <div key={idx} className={styles.adviceItem} style={{ background: 'var(--bg-primary)' }}>
                                            <TrendingUp size={16} className={styles.adviceIcon} />
                                            <span>{rec}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {investorAuditTable}
                    {legacyBlocks}
                </div>
            );
        }

        return (
            <div className={styles.content}>
                <div className={styles.section}>
                    <div className={styles.scoreboardRow}>
                        <div className={`${styles.scoreboardTile} ${styles.scoreboardTileNeutral}`}>
                            <span className={styles.scoreboardLabel}>Điểm Form Tự Đánh Giá</span>
                            <span className={styles.scoreboardValue}>{fmtScore(baseScore)}</span>
                        </div>
                        <div className={`${styles.scoreboardTile} ${styles.scoreboardTileWarm}`}>
                            <span className={styles.scoreboardLabel}>AI Hiệu Chỉnh</span>
                            <span className={`${styles.scoreboardValue} ${styles.scoreboardValueWarm}`}>
                                {aiAdjustmentScore > 0 ? '+' : ''}
                                {fmtScore(aiAdjustmentScore)}
                            </span>
                        </div>
                        <div className={`${styles.scoreboardTile} ${styles.scoreboardTileSuccess}`}>
                            <span className={styles.scoreboardLabel}>Điểm AI Phê Duyệt</span>
                            <span className={`${styles.scoreboardValue} ${styles.scoreboardValueGreen}`}>
                                {fmtScore(finalPotentialScore)}
                            </span>
                        </div>
                    </div>

                    {showZeroFinalNotice && (
                        <p className={styles.scoreInlineNote}>
                            Điểm cuối về 0 sau điều chỉnh AI (đối chiếu checklist với tài liệu). Chi tiết từng tiêu chí nằm bên dưới;
                            ưu tiên làm theo Action Plan.
                        </p>
                    )}

                    {chaosNote}
                </div>

                {radarBlock}

                {recommendations.length > 0 && (
                    <div className={styles.section}>
                        <div className={styles.startupActionPanel}>
                            <h3 className={styles.panelTitleStartupAction}>Hướng dẫn nâng cấp Hồ sơ (Action Plan)</h3>
                            <div className={styles.adviceList}>
                                {recommendations.map((rec, idx) => (
                                    <div key={idx} className={styles.adviceItem}>
                                        <TrendingUp size={16} className={styles.adviceIcon} />
                                        <span>{rec}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {weaknesses.length > 0 && (
                    <div className={styles.section}>
                        <h3 className={styles.sectionTitleMinimal}>Các điểm bất hợp lý AI phát hiện</h3>
                        <div className={styles.highlightSection}>
                            <ul className={styles.highlightList}>
                                {weaknesses.map((w, idx) => (
                                    <li key={idx} className={styles.highlightItem}>
                                        <AlertTriangle size={14} className={styles.highlightIcon} style={{ color: '#f59e0b' }} /> {w}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                )}

                {strengths.length > 0 && (
                    <div className={styles.section}>
                        <h3 className={styles.sectionTitleMinimal}>Các điểm sáng cần giữ vững</h3>
                        <div className={styles.highlightSection}>
                            <ul className={styles.highlightList}>
                                {strengths.map((s, idx) => (
                                    <li key={idx} className={styles.highlightItem}>
                                        <Sparkles size={14} className={styles.highlightIcon} style={{ color: '#10b981' }} /> {s}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                )}

                {startupAuditAccordion}

                {legacyBlocks}
            </div>
        );
    };

    const headerTitle =
        resolvedUiVariant === 'investor'
            ? isHistoryMode
                ? 'Due Diligence AI — Lịch sử'
                : 'Báo cáo Due Diligence AI'
            : isHistoryMode
              ? 'Lịch Sử Kết Quả Đánh Giá AI'
              : 'Kết Quả Đánh Giá AI';

    return createPortal(
        <div className={styles.backdrop} onClick={onCancel}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className={styles.header}>
                    <h2 className={styles.title}>
                        <TrendingUp size={24} className={styles.recommendationIcon} />
                        {headerTitle}
                    </h2>
                    <button className={styles.closeBtn} onClick={onCancel}>
                        <X size={24} />
                    </button>
                </div>

                {/* Error State */}
                {error && (
                    <div className={styles.loadingContainer}>
                        <div className={styles.aiIconContainer} style={{ color: '#ef4444' }}>
                            <AlertTriangle size={64} />
                        </div>
                        <h3 className={styles.loadingText}>Không thể hoàn thành đánh giá</h3>
                        <p className={styles.loadingSubtext}>{error}</p>
                        <button className={styles.primaryBtn} onClick={onCancel} style={{ marginTop: '20px' }}>
                            Đóng và thử lại sau
                        </button>
                    </div>
                )}

                {/* Loading State */}
                {isLoading && !error && (
                    <div className={styles.loadingContainer}>
                        <div className={styles.aiIconContainer}>
                            <div className={styles.pulseRing}></div>
                            <div className={styles.pulseRing} style={{ animationDelay: '1s' }}></div>
                            <Brain size={64} className={styles.brainIcon} />
                            <Sparkles
                                size={24}
                                style={{
                                    position: 'absolute',
                                    top: '10px',
                                    right: '10px',
                                    color: 'var(--primary-blue)',
                                    animation: 'pulse 1s infinite alternate'
                                }}
                            />
                        </div>
                        <h3 className={styles.loadingText}>Đang khởi chạy AI Analyst</h3>
                        <p className={styles.loadingSubtext}>
                            Hệ thống đang phân tích chi tiết các đầu mục trong {isStartupViewer ? 'dự án của bạn' : 'dự án này'} để đưa ra đánh giá chính xác nhất...
                        </p>
                        <div className={styles.progressBeamContainer}>
                            <div className={styles.progressBeam}></div>
                        </div>
                    </div>
                )}

                {/* Content */}
                {!isLoading && analysisData && renderContent()}

                {/* Footer Actions */}
                {!isLoading && (
                    <div className={styles.footer}>
                        {isHistoryMode ? (
                            <>
                                <button
                                    className={styles.secondaryBtn}
                                    onClick={onCancel}
                                    style={{ maxWidth: '200px' }}
                                >
                                    Đóng
                                </button>
                                {onReanalyze && (
                                    <button className={styles.primaryBtn} type="button" onClick={onReanalyze}>
                                        Phân tích lại
                                    </button>
                                )}
                            </>
                        ) : (!isEvaluationOnly && isNonStartupViewer) ? (
                            <button
                                className={styles.secondaryBtn}
                                onClick={onCancel}
                                style={{ width: '100%', maxWidth: '200px' }}
                            >
                                Đóng
                            </button>
                        ) : isEvaluationOnly ? (
                            <>
                                <button className={styles.secondaryBtn} onClick={onCancel}>
                                    Đóng
                                </button>
                                <button
                                    className={styles.primaryBtn}
                                    onClick={onSubmit}
                                    disabled={!canSubmit}
                                    title={!canSubmit ? 'Chưa có kết quả đánh giá hợp lệ để lưu' : ''}
                                >
                                    {canSubmit ? (isEligibilityReport ? 'Lưu Kết Quả' : '🚀 Lưu Kết Quả') : 'Không thể lưu (thiếu kết quả)'}
                                </button>
                            </>
                        ) : (
                            <>
                                <button className={styles.secondaryBtn} onClick={onCancel}>
                                    Quay lại chỉnh sửa
                                </button>
                                <button
                                    className={styles.primaryBtn}
                                    onClick={onSubmit}
                                    disabled={!canSubmit}
                                    title={
                                        !canSubmit
                                            ? 'Chưa có kết quả đánh giá hợp lệ để nộp'
                                            : showLowScoreWarning
                                              ? 'Chú ý: Điểm thấp hơn 50%'
                                              : ''
                                    }
                                >
                                    {canSubmit ? (isEligibilityReport ? 'Nộp dự án' : '🚀 Nộp dự án') : 'Không thể nộp (thiếu kết quả)'}
                                </button>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
}
