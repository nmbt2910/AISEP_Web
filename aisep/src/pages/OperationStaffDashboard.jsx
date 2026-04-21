import React, { useState, useEffect } from 'react';
import { FileCheck, CheckCircle, AlertCircle, Search, Archive, Users, Activity, Settings, Trash2, Download, Eye, ArrowRight, X, XCircle, FileText, Loader2, TrendingUp, ExternalLink, Shield, History, Calendar, PieChart, Briefcase, Clock, DollarSign, Send, Newspaper, User, Edit2, PenTool, Image as ImageIcon, ImageOff, Maximize2 } from 'lucide-react';
import styles from '../styles/SharedDashboard.module.css';
import local from '../styles/OperationStaffDashboard.module.css';
import FeedHeader from '../components/feed/FeedHeader';
import SuccessModal from '../components/common/SuccessModal';
import ErrorModal from '../components/common/ErrorModal';
import RejectionReasonModal from '../components/common/RejectionReasonModal';
import projectSubmissionService from '../services/projectSubmissionService';
import AIEvaluationService from '../services/AIEvaluationService';
import bookingService from '../services/bookingService';
import startupProfileService from '../services/startupProfileService';
import userReportService from '../services/userReportService';
import dealsService from '../services/dealsService';
import prService from '../services/prService';
import investorService from '../services/investorService';
import AIEvaluationModal from '../components/common/AIEvaluationModal';
import { STATUS_COLORS, STATUS_LABELS, getStageLabel } from '../constants/ProjectStatus';
import AdvisorApprovalPage from '../components/advisor/AdvisorApprovalPage';
import PackageManagement from '../components/staff/PackageManagement';
import GlobalSubscriptionHistory from '../components/staff/GlobalSubscriptionHistory';
import PayoutManagement from '../components/staff/PayoutManagement';
import CommissionManagement from '../components/staff/CommissionManagement';
import EmptyState from '../components/common/EmptyState';
import BlockchainVerificationModal from '../components/common/BlockchainVerificationModal';
import blockchainVerificationService from '../services/blockchainVerificationService';
import AccountProfileTab from '../components/common/AccountProfileTab';
import StartupApprovalCard from '../components/staff/StartupApprovalCard';
import StartupDetailModal from '../components/staff/StartupDetailModal';
import NewsPRSection from '../components/common/NewsPRSection';
import BookingDetailModal from '../components/booking/BookingDetailModal';


const T = {
    bg: 'var(--pd-bg)',
    surface: 'var(--pd-surface)',
    card: 'var(--pd-card)',
    surface2: 'var(--pd-card)',
    surface3: 'var(--pd-surface-accent)',
    border: 'var(--pd-border)',
    blue: 'var(--pd-blue)',
    blueDim: 'var(--pd-blue-dim)',
    text: 'var(--pd-text)',
    textMuted: 'var(--pd-text-muted)',
    textDim: 'var(--pd-text-dim)',
    green: 'var(--pd-green)',
    greenDim: 'var(--pd-green-dim)',
    shadow: 'var(--pd-shadow)',
    amber: '#ffad1f',
    amberDim: 'rgba(255, 173, 31, 0.12)',
    red: '#f4212e',
};



/**
 * ProjectKanbanCard - Single card for the Kanban board
 */
const ProjectKanbanCard = ({ project, status, onDetail, onApprove, onReject, processingProjectId, processingAction }) => {
    // Determine development stage label and class
    const getDevStageTag = (stage) => {
        if (stage === 0 || stage === 'Idea') return { label: 'Ý tưởng', class: local.btagIdea };
        if (stage === 1 || stage === 'MVP') return { label: 'MVP', class: local.btagMvp };
        return { label: 'Tăng trưởng', class: local.btagGrowth };
    };

    const stageInfo = getDevStageTag(project?.developmentStage);
    const teamSize = project?.teamMembers?.toString().split(',').length || 0;
    const teamMembers = project?.teamMembers?.toString().split(',') || [];

    // Helper for mini avatars
    const avaClasses = [local.maB, local.maP, local.maG, local.maPk, local.maO];

    return (
        <div className={local.inv_card}>
            <div className={`${local.inv_cardStrip} ${local[status]}`}></div>
            <div className={local.bcardBody}>
                <div className={local.bcardTopRow}>
                    <div className={local.bcardName} title={project?.projectName}>
                        {project?.projectName || 'Dự án không tên'}
                    </div>
                    <div className={local.bcardTime}>
                        {project?.createdAt ? new Date(project.createdAt).toLocaleDateString('vi-VN') : 'N/A'}
                    </div>
                </div>

                <div className={local.bcardTagRow}>
                    <span className={`${local.btag} ${stageInfo.class}`}>{stageInfo.label}</span>
                </div>

                <p className={local.bcardDesc}>{project?.shortDescription || '-'}</p>

                <div className={local.bcardFields}>
                    <div className={local.bf}>
                        <div className={local.bfKey}>Vấn đề</div>
                        <div className={local.bfVal} title={project?.problemStatement}>{project?.problemStatement || '-'}</div>
                    </div>
                    <div className={local.bf}>
                        <div className={local.bfKey}>Giải pháp</div>
                        <div className={local.bfVal} title={project?.solutionDescription}>{project?.solutionDescription || '-'}</div>
                    </div>
                </div>

                <div className={local.bcardTeam}>
                    {teamMembers.slice(0, 3).map((name, i) => (
                        <div
                            key={i}
                            className={`${local.miniAva} ${avaClasses[i % avaClasses.length]}`}
                            style={i > 0 ? { marginLeft: '-8px', border: '2px solid var(--bg-primary)' } : {}}
                            title={name.trim()}
                        >
                            {name.trim().charAt(0).toUpperCase()}
                        </div>
                    ))}
                    {teamSize > 3 && <span style={{ fontSize: '11px', opacity: 0.8 }}>+{teamSize - 3} thành viên</span>}
                    {teamSize <= 3 && teamSize > 0 && <span style={{ fontSize: '11px', opacity: 0.8 }}>{teamSize} thành viên</span>}
                </div>

                <div className={local.bcardActions}>
                    <button className={local.baBtn} onClick={onDetail} title="Chi tiết">
                        <ArrowRight size={16} />
                        Chi tiết
                    </button>

                    {status === 'pend' && (
                        <>
                            <button
                                className={`${local.baBtn} ${local.rej} ${processingProjectId !== null ? local.btnDisabled : ''}`}
                                onClick={onReject}
                                disabled={processingProjectId !== null}
                                title="Từ chối"
                            >
                                {processingProjectId === project.projectId && processingAction === 'reject' ? (
                                    <Loader2 size={16} className="animate-spin" />
                                ) : (
                                    <XCircle size={16} />
                                )}
                                <span style={{ marginLeft: '4px' }}>Từ chối</span>
                            </button>
                            <button
                                className={`${local.baBtn} ${local.apr} ${processingProjectId !== null ? local.btnDisabled : ''}`}
                                onClick={onApprove}
                                disabled={processingProjectId !== null}
                                title="Phê duyệt"
                            >
                                {processingProjectId === project.projectId && processingAction === 'approve' ? (
                                    <Loader2 size={16} className="animate-spin" />
                                ) : (
                                    <CheckCircle size={16} />
                                )}
                                <span style={{ marginLeft: '4px' }}>Duyệt</span>
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

/**
 * BookingKanbanCard - Single card for the Booking Kanban board
 */
const BookingKanbanCard = ({ booking, status, onDetail }) => {
    // Generate an alias dynamically based on status mapping
    // map status from 'pend', 'conf', 'comp'
    let statusLabel = 'Chờ xác nhận';
    let localStatus = status; // To map API status names to CSS classes

    if (status === 'conf' || status === 'Confirmed' || status === 2) {
        statusLabel = 'Đã xác nhận';
        localStatus = 'conf';
    } else if (status === 'comp' || status === 'Completed' || status === 3) {
        statusLabel = 'Hoàn thành';
        localStatus = 'comp';
    } else if (status === 'ComplaintAccepted' || status === 4) {
        statusLabel = 'Khiếu nại chấp nhận';
        localStatus = 'complaint';
    } else if (status === 'ComplaintRejected' || status === 5) {
        statusLabel = 'Khiếu nại từ chối';
        localStatus = 'complaint';
    } else if (status === 'canc' || status === 'Cancel' || status === 'Cancelled' || status === 6) {
        statusLabel = 'Đã hủy';
        localStatus = 'rej';
    } else if (status === 'NoResponse' || status === 7) {
        statusLabel = 'Không phản hồi';
        localStatus = 'rej';
    } else if (status === 'pay' || status === 'ApprovedAwaitingPayment' || status === 'AwaitingPayment' || status === 1) {
        statusLabel = 'Chờ thanh toán';
        localStatus = 'pay';
    } else if (status === 'pend' || status === 'Pending' || status === 0) {
        statusLabel = 'Chờ xác nhận';
        localStatus = 'pend';
    } else {
        localStatus = 'pend';
    }

    const formatTimeUTC = (dateStr) => {
        if (!dateStr) return '—';
        const d = new Date(dateStr);
        return d.getUTCHours().toString().padStart(2, '0') + ':' +
            d.getUTCMinutes().toString().padStart(2, '0');
    };

    return (
        <div className={local.bcard}>
            <div className={`${local.bcardStrip} ${local[localStatus]}`}></div>
            <div className={local.bcardBody}>
                <div className={local.bcardRow1}>
                    <div className={local.bcardMainInfo}>
                        <div className={local.bcardName} style={{ fontFamily: 'monospace', fontSize: '13px', color: 'var(--text-secondary)' }} title={`#${booking?.id || '-'}`}>
                            #{booking?.id || '-'}
                        </div>
                        <span className={`${local.btag}`} style={{
                            background: localStatus === 'pend' ? 'rgba(255, 122, 0, 0.1)' : localStatus === 'conf' ? 'rgba(29, 155, 240, 0.1)' : localStatus === 'comp' ? 'rgba(16, 185, 129, 0.1)' : localStatus === 'pay' ? 'rgba(245, 158, 11, 0.1)' : localStatus === 'complaint' ? 'rgba(124, 58, 237, 0.1)' : 'rgba(244, 33, 46, 0.1)',
                            color: localStatus === 'pend' ? '#ff7a00' : localStatus === 'conf' ? '#1d9bf0' : localStatus === 'comp' ? '#10b981' : localStatus === 'pay' ? '#f59e0b' : localStatus === 'complaint' ? '#7c3aed' : '#f4212e'
                        }}>
                            {statusLabel}
                        </span>
                    </div>
                </div>

                <div style={{ marginTop: '12px', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '14px', fontWeight: '800' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: '600', width: '50px', flexShrink: 0, textTransform: 'uppercase' }}>Cố vấn</span>
                            <span style={{
                                color: localStatus === 'pend' ? '#ff7a00' : localStatus === 'conf' ? '#1d9bf0' : localStatus === 'comp' ? '#10b981' : localStatus === 'pay' ? '#f59e0b' : localStatus === 'complaint' ? '#7c3aed' : '#f4212e',
                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                            }}>
                                {booking?.advisorName || 'N/A'}
                            </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: '600', width: '50px', flexShrink: 0, textTransform: 'uppercase' }}>Khách</span>
                            <span style={{
                                color: localStatus === 'pend' ? '#ff7a00' : localStatus === 'conf' ? '#1d9bf0' : localStatus === 'comp' ? '#10b981' : localStatus === 'pay' ? '#f59e0b' : localStatus === 'complaint' ? '#7c3aed' : '#f4212e',
                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                            }}>
                                {booking?.customerName || 'N/A'}
                            </span>
                        </div>
                    </div>

                    <div style={{ marginTop: '12px', fontSize: '14px', fontWeight: '700', color: '#f59e0b' }}>
                        {Number(booking?.price || 0).toLocaleString('vi-VN')} <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>VND</span>
                    </div>
                </div>

                <div className={local.bcardFields} style={{ gridTemplateColumns: '1fr', gap: '6px', marginBottom: '8px' }}>
                    <div className={local.bf} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                        <Calendar size={13} style={{ flexShrink: 0 }} />
                        <span style={{ whiteSpace: 'nowrap' }}>{booking?.startTime ? new Date(booking.startTime).toLocaleDateString('vi-VN') : '-'}</span>
                        <Clock size={13} style={{ marginLeft: '4px', flexShrink: 0 }} />
                        <span style={{ whiteSpace: 'nowrap' }}>
                            {booking?.startTime ? `${formatTimeUTC(booking.startTime)} - ${formatTimeUTC(booking.endTime)}` : '-'}
                        </span>
                    </div>
                </div>

                <div className={local.bcardActions} style={{ gridTemplateColumns: '1fr', marginTop: 'auto' }}>
                    <button className={local.baBtn} style={{ marginLeft: 'auto', padding: '6px 16px' }} onClick={onDetail} title="Chi tiết">
                        Chi tiết
                    </button>
                </div>
            </div>
        </div>
    );
};

/**
 * InvestorKanbanCard - Single card for the Investor Approval Kanban board
 */
const InvestorKanbanCard = ({ investor, status, onDetail, onApprove, onReject, processingId, processingAction }) => {
    const isProcessing = processingId === investor.investorId;
    const isAnyProcessing = !!processingId;

    return (
        <div className={local.investorProCard}>
            <div className={`${local.investorProCardStrip} ${local[status]}`}></div>

            <div className={local.investorProHeader}>
                <div style={{ flex: 1, overflow: 'hidden' }}>
                    <h4 className={local.investorProName} title={investor.organizationName || investor.fullName}>
                        {investor.organizationName || investor.fullName || 'Nhà đầu tư'}
                    </h4>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                        <span className={local.investorProBadge}>
                            Nhà đầu tư
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            ID: {investor.investorId}
                        </span>
                    </div>
                </div>
            </div>

            <div className={local.investorProBody}>
                <div className={local.investorProRow}>
                    <span className={local.investorProLabel}>Ví</span>
                    <span className={local.investorProValue} style={{ fontFamily: 'monospace' }}>
                        {investor.walletAddress ? `${investor.walletAddress.substring(0, 6)}...${investor.walletAddress.substring(investor.walletAddress.length - 4)}` : '-'}
                    </span>
                </div>
                <div className={local.investorProRow}>
                    <span className={local.investorProLabel}>Email</span>
                    <span className={local.investorProValue} title={investor.email}>
                        {investor.email || '-'}
                    </span>
                </div>
                <div className={local.investorProRow}>
                    <span className={local.investorProLabel}>Ngân sách</span>
                    <span className={local.investorProValue} style={{ color: '#10b981', fontWeight: '700' }}>
                        {investor.investmentAmount ? Number(investor.investmentAmount).toLocaleString() : 'Chưa cập nhật'} ₫
                    </span>
                </div>

                {investor.focusIndustry && (
                    <div className={local.investorProRow} style={{ alignItems: 'flex-start' }}>
                        <span className={local.investorProLabel} style={{ marginTop: '2px' }}>Lĩnh vực</span>
                        <div className={local.investorProTags} style={{ margin: '0', flex: 1 }}>
                            {investor.focusIndustry.split(',').slice(0, 3).map((ind, idx) => (
                                <span key={idx} className={local.investorProTag}>{ind.trim()}</span>
                            ))}
                            {investor.focusIndustry.split(',').length > 3 && (
                                <span className={local.investorProTag}>+{investor.focusIndustry.split(',').length - 3}</span>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <div className={local.investorProFooter}>
                <button className={local.investorProBtn} onClick={() => onDetail(investor)} title="Chi tiết">
                    <ArrowRight size={16} />
                    Chi tiết
                </button>

                {status === 'pend' && (
                    <>
                        <button
                            className={`${local.investorProBtn} ${local.investorProRejectBtn} ${isAnyProcessing ? local.btnDisabled : ''}`}
                            onClick={() => onReject(investor)}
                            disabled={isAnyProcessing}
                            title="Từ chối"
                        >
                            {isProcessing && processingAction === 'reject' ? (
                                <Loader2 size={16} className="animate-spin" />
                            ) : (
                                <XCircle size={16} />
                            )}
                            Từ chối
                        </button>
                        <button
                            className={`${local.investorProBtn} ${local.investorProApproveBtn} ${isAnyProcessing ? local.btnDisabled : ''}`}
                            onClick={() => onApprove(investor.investorId)}
                            disabled={isAnyProcessing}
                            title="Phê duyệt"
                        >
                            {isProcessing && processingAction === 'approve' ? (
                                <Loader2 size={16} className="animate-spin" />
                            ) : (
                                <CheckCircle size={16} />
                            )}
                            Duyệt
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};

/**
 * UserReportCard - Redesigned report item with Twitter/X aesthetic
 */
const UserReportCard = ({ report, onResolve, onViewBooking, isProcessing, isLoadingBooking }) => {
    const getStatusConfig = (status) => {
        switch (status) {
            case 'Pending': return { label: 'Đang chờ', class: local.glassPending, tint: local.rpPending, icon: Clock };
            case 'Resolved':
            case 'Valid':
                return { label: 'Hợp lệ', class: local.glassValid, tint: local.rpValid, icon: CheckCircle };
            case 'Dismissed':
            case 'False':
                return { label: 'Sai lệch', class: local.glassFalse, tint: local.rpFalse, icon: XCircle };
            default: return { label: status, class: '', tint: '', icon: AlertCircle };
        }
    };

    const config = getStatusConfig(report.status);
    const StatusIcon = config.icon;
    const images = Array.isArray(report.evidenceImageUrls) ? report.evidenceImageUrls : [];

    return (
        <div className={`${local.reportCard} ${config.tint}`}>
            {/* Header: Category & Status/Date */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <h3 className={local.reportCategory} style={{ margin: 0, fontSize: '16px' }}>{report.category}</h3>
                    <div className={`${local.glassBadge} ${config.class}`}>
                        <StatusIcon size={12} />
                        {config.label}
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
                    <Clock size={12} />
                    <span>{report.createdAt ? new Date(report.createdAt).toLocaleDateString('vi-VN') : 'N/A'}</span>
                </div>
            </div>

            {/* Content: Description & Evidence */}
            <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-primary)', lineHeight: '1.5' }}>
                        {report.description}
                    </p>
                    
                    {/* Resolution Note if resolved */}
                    {report.status !== 'Pending' && report.resolutionNote && (
                        <div style={{
                            marginTop: '12px',
                            padding: '10px 14px',
                            backgroundColor: 'rgba(var(--bg-primary-rgb), 0.3)',
                            borderRadius: '8px',
                            borderLeft: `3px solid ${report.status === 'Resolved' || report.status === 'Valid' ? '#10b981' : '#ef4444'}`,
                            fontSize: '13px'
                        }}>
                            <span style={{ fontWeight: 800, color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>Kết quả: </span>
                            <span style={{ color: 'var(--text-primary)' }}>{report.resolutionNote}</span>
                        </div>
                    )}
                </div>

                {/* Evidence Thumbnails on the right side if exists */}
                {images.length > 0 && (
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', maxWidth: '140px', justifyContent: 'flex-end' }}>
                        {images.slice(0, 4).map((img, i) => (
                            <a key={i} href={img} target="_blank" rel="noopener noreferrer">
                                <img src={img} alt="Evidence" className={local.evidenceThumb} style={{ width: '40px', height: '40px' }} />
                            </a>
                        ))}
                    </div>
                )}
            </div>

            {/* Footer: Meta & Actions */}
            <div style={{ 
                marginTop: '12px', 
                paddingTop: '12px', 
                borderTop: '1px solid var(--border-color)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                        <User size={14} color="var(--primary-blue)" />
                        <span style={{ fontWeight: 600 }}>#{report.reporterId}</span>
                        {report.reporterName && <span style={{ opacity: 0.7 }}>({report.reporterName})</span>}
                    </div>
                    {report.reportedUserId && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                            <Shield size={14} color="#ef4444" />
                            <span style={{ fontWeight: 600 }}>#{report.reportedUserId}</span>
                            {(report.targetUserName || report.reportedUserName) && <span style={{ opacity: 0.7 }}>({report.targetUserName || report.reportedUserName})</span>}
                        </div>
                    )}
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                    {report.bookingId && (
                        <button
                            onClick={() => onViewBooking(report.bookingId)}
                            className={local.resolveChip}
                            disabled={isLoadingBooking}
                            style={{ 
                                padding: '6px 12px', 
                                border: '1px solid var(--primary-blue)',
                                color: 'var(--primary-blue)',
                                gap: '4px'
                            }}
                        >
                            {isLoadingBooking ? <Loader2 size={12} className="animate-spin" /> : <ExternalLink size={12} />}
                            Booking
                        </button>
                    )}

                    {report.status === 'Pending' && (
                        <>
                            <button
                                className={`${local.resolveChip} ${local.v}`}
                                onClick={() => onResolve(report.userReportId, true)}
                                disabled={isProcessing}
                                style={{ padding: '6px 12px' }}
                            >
                                Duyệt
                            </button>
                            <button
                                className={`${local.resolveChip} ${local.f}`}
                                onClick={() => onResolve(report.userReportId, false)}
                                disabled={isProcessing}
                                style={{ padding: '6px 12px' }}
                            >
                                Từ chối
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};



/**
 * KanbanSkeleton - Shimmering loading placeholder
 */
const KanbanSkeleton = ({ count = 3 }) => {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px 0' }}>
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className={local.skeletonCard}>
                    <div className={local.shimmer}></div>
                    <div className={local.skTitle}></div>
                    <div className={local.skDesc}></div>
                    <div className={local.skDesc} style={{ width: '70%' }}></div>
                    <div className={local.skTags}>
                        <div className={local.skTag}></div>
                        <div className={local.skTag}></div>
                    </div>
                    <div className={local.skBottom}></div>
                </div>
            ))}
        </div>
    );
};

/**
 * EmptyState - Reusable empty or error view
 */




const OperationStaffDashboard = ({ user, onLogout, initialSection = 'statistics', targetId, onNotificationNavigate }) => {

    // Safety check for styles
    const s = local || {};
    if (!local) {
        console.warn('OperationStaffDashboard: local styles (OperationStaffDashboard.module.css) could not be loaded.');
    }

    const [activeSection, setActiveSection] = useState(initialSection);
    const [activePRTab, setActivePRTab] = useState('posting'); // 'posting' or 'news'
    
    // Deep LINK State
    const [hasAttemptedDeepLink, setHasAttemptedDeepLink] = useState(false);

    // Sync internal state with prop changes from sidebar
    useEffect(() => {
        if (initialSection) {
            setActiveSection(initialSection);
            // Reset deep link attempt when section changes manually
            setHasAttemptedDeepLink(false);
        }
    }, [initialSection]);


    const [pendingProjects, setPendingProjects] = useState([]);
    const [approvedProjects, setApprovedProjects] = useState([]);
    const [rejectedProjects, setRejectedProjects] = useState([]);
    const [isLoadingProjects, setIsLoadingProjects] = useState(false);
    const [projectSubmissions, setProjectSubmissions] = useState([]);
    const [pendingStartups, setPendingStartups] = useState([]);
    const [approvedStartups, setApprovedStartups] = useState([]);
    const [rejectedStartups, setRejectedStartups] = useState([]);
    const [isLoadingStartups, setIsLoadingStartups] = useState(false);
    const [selectedStartupForDetail, setSelectedStartupForDetail] = useState(null);
    const [showStartupDetailModal, setShowStartupDetailModal] = useState(false);
    const [activeMobileStartupTab, setActiveMobileStartupTab] = useState('pend'); // 'all', 'pend', 'appr', 'rej'
    
    // Core Modal & UI States
    const [showModal, setShowModal] = useState(false);
    const [modalType, setModalType] = useState('success');
    const [modalMessage, setModalMessage] = useState('');
    const [showRejectionModal, setShowRejectionModal] = useState(false);
    const [selectedProject, setSelectedProject] = useState(null);
    
    // Project Detail Modal state
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [detailProject, setDetailProject] = useState(null);
    const [documents, setDocuments] = useState([]);
    const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);

    const [processingProjectId, setProcessingProjectId] = useState(null);
    const [processingAction, setProcessingAction] = useState(null); // 'approve' or 'reject'
    const [rejectionTarget, setRejectionTarget] = useState(null); // 'project' | 'startup'

    // AI History state
    const [analysisHistory, setAnalysisHistory] = useState([]);
    const [staffAnalysisHistory, setStaffAnalysisHistory] = useState([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const [isLoadingStaffHistory, setIsLoadingStaffHistory] = useState(false);
    const [isEvaluatingStaffAI, setIsEvaluatingStaffAI] = useState(false);
    const [showHistoryView, setShowHistoryView] = useState(false);
    const [selectedHistoryResult, setSelectedHistoryResult] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [payoutSearchTerm, setPayoutSearchTerm] = useState('');
    const [commissionSearchTerm, setCommissionSearchTerm] = useState('');
    const [subscriptionSearchTerm, setSubscriptionSearchTerm] = useState('');
    const [advisorSearchTerm, setAdvisorSearchTerm] = useState('');

    // Blockchain verification state
    const [isLoadingBlockchain, setIsLoadingBlockchain] = useState(false);
    const [blockchainData, setBlockchainData] = useState(null);
    const [showBlockchainModal, setShowBlockchainModal] = useState(false);
    const [blockchainError, setBlockchainError] = useState(null);

    const handleSearchChange = (val) => {
        if (activeSection === 'project_management') setSearchTerm(val);
        else if (activeSection === 'bookings') setBookingSearchTerm(val);
        else if (activeSection === 'commission') setCommissionSearchTerm(val);
        else if (activeSection === 'advisor_approval') setAdvisorSearchTerm(val);
        else if (activeSection === 'package_management' || activeSection === 'subscription_history') setSubscriptionSearchTerm(val);
    };

    // Additional Statistics state for enhanced dashboard
    const [totalProjects, setTotalProjects] = useState(0);
    const [approvalRate, setApprovalRate] = useState(0);
    const [avgApprovalTime, setAvgApprovalTime] = useState(0);
    const [totalUsers, setTotalUsers] = useState(0);
    const [systemHealth, setSystemHealth] = useState(100);
    const [recentActivity, setRecentActivity] = useState([]);

    // Booking Management state
    const [bookings, setBookings] = useState([]);
    const [isLoadingBookings, setIsLoadingBookings] = useState(false);
    const [bookingFilters, setBookingFilters] = useState('');
    const [bookingPage, setBookingPage] = useState(1);
    const [bookingSearchTerm, setBookingSearchTerm] = useState('');
    const [activeMobileBookingTab, setActiveMobileBookingTab] = useState('all'); // 'all', 'pend', 'conf', 'comp', 'complaint', 'canc'
    const [bookingsError, setBookingsError] = useState(null);
    const [projectsError, setProjectsError] = useState(null);

    // User Reports state
    const [userReports, setUserReports] = useState([]);
    const [isLoadingUserReports, setIsLoadingUserReports] = useState(false);
    const [userReportsError, setUserReportsError] = useState(null);
    const [reportFilter, setReportFilter] = useState('All'); // 'All', 'Pending', 'Resolved', 'Dismissed'
    const [showReportResolveModal, setShowReportResolveModal] = useState(false);
    const [selectedReportForResolve, setSelectedReportForResolve] = useState(null);
    const [isResolveValid, setIsResolveValid] = useState(true);
    const [reportResolveNote, setReportResolveNote] = useState('');
    const [fetchingBookingId, setFetchingBookingId] = useState(null);

    // Filtered User Reports
    const filteredUserReports = React.useMemo(() => {
        if (!userReports || !Array.isArray(userReports)) return [];

        let list = [...userReports];

        // Filter by status tab
        if (reportFilter !== 'All') {
            list = list.filter(r => r.status === reportFilter);
        }

        // Filter by search term
        if (searchTerm && searchTerm.trim()) {
            const lowerSearch = searchTerm.toLowerCase();
            list = list.filter(r =>
                (r.category || '').toLowerCase().includes(lowerSearch) ||
                (r.description || '').toLowerCase().includes(lowerSearch) ||
                (r.userReportId || '').toString().toLowerCase().includes(lowerSearch) ||
                (r.bookingId || '').toString().toLowerCase().includes(lowerSearch) ||
                (r.reporterId || '').toString().toLowerCase().includes(lowerSearch) ||
                (r.reportedUserId || '').toString().toLowerCase().includes(lowerSearch)
            );
        }

        return list;
    }, [userReports, searchTerm, reportFilter]);

    // Investor Approval States
    const [pendingInvestors, setPendingInvestors] = useState([]);
    const [approvedInvestors, setApprovedInvestors] = useState([]);
    const [rejectedInvestors, setRejectedInvestors] = useState([]);
    const [isLoadingInvestors, setIsLoadingInvestors] = useState(false);
    const [processingInvestorId, setProcessingInvestorId] = useState(null);
    const [investorAction, setInvestorAction] = useState(null);
    const [selectedInvestor, setSelectedInvestor] = useState(null);
    const [showInvestorRejectModal, setShowInvestorRejectModal] = useState(false);
    const [showInvestorDetailModal, setShowInvestorDetailModal] = useState(false);

    // PR Management state
    const [signedDeals, setSignedDeals] = useState([]);
    const [isLoadingSignedDeals, setIsLoadingSignedDeals] = useState(false);
    const [signedDealsError, setSignedDealsError] = useState(null);
    const [prSearchTerm, setPrSearchTerm] = useState('');
    const [processingDealId, setProcessingDealId] = useState(null);
    const [showPRModal, setShowPRModal] = useState(false);
    const [selectedDealForPR, setSelectedDealForPR] = useState(null);
    const [prFormData, setPrFormData] = useState({ title: '', content: '' });
    const [isSubmittingPR, setIsSubmittingPR] = useState(false);

    // PR News state
    const [prNewsList, setPrNewsList] = useState([]);
    const [isLoadingPRNews, setIsLoadingPRNews] = useState(false);
    const [prNewsError, setPrNewsError] = useState(null);
    const [prNewsSearchTerm, setPrNewsSearchTerm] = useState('');
    const [processingPRId, setProcessingPRId] = useState(null);
    const [showDeletePRModal, setShowDeletePRModal] = useState(false);
    const [selectedPRForDelete, setSelectedPRForDelete] = useState(null);
    const [showEditPRModal, setShowEditPRModal] = useState(false);
    const [selectedPRForEdit, setSelectedPRForEdit] = useState(null);
    const [editTitle, setEditTitle] = useState('');
    const [editContent, setEditContent] = useState('');

    // Mobile States
    const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
    const [activeMobileTab, setActiveMobileTab] = useState('all'); // 'all', 'pend', 'appr', 'rej'
    const [activeMobileInvTab, setActiveMobileInvTab] = useState('all'); // 'all', 'pend', 'apr', 'rej'

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 1024);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);
    const [bookingPageSize, setBookingPageSize] = useState(10);
    const [allBookings, setAllBookings] = useState([]);


    const [showFullImage, setShowFullImage] = useState(false);

    // Booking Detail Modal state
    const [showBookingModal, setShowBookingModal] = useState(false);
    const [selectedBooking, setSelectedBooking] = useState(null);
    const [isLoadingBookingDetail, setIsLoadingBookingDetail] = useState(false);





    const getSectionTitle = (section) => {
        switch (section) {
            case 'statistics': return "Thống kê hoạt động";
            case 'project_management': return "Quản lý Dự án";
            case 'bookings': return "Quản lý Booking";
            case 'user_reports': return "Quản lý báo cáo";
            case 'advisor_approval': return "Phê duyệt cố vấn";
            case 'package_management': return "Quản lý Gói dịch vụ";
            case 'subscription_history': return "Lịch sử đăng ký gói";
            case 'commission': return "Cấu hình Hoa hồng";
            case 'pr_management': return "Đăng bài PR - Dự án Đầu tư";
            case 'investor_approval': return "Phê duyệt Nhà đầu tư";
            case 'analytics': return "Phân tích dữ liệu";
            case 'activity': return "Giám sát hoạt động";
            case 'account_profile': return "Hồ sơ người dùng";
            default: return "Bảng điều khiển Nhân viên";

        }
    };

    const getSectionSubtitle = (section) => {
        switch (section) {
            case 'statistics': return "Tổng quan về các số liệu tăng trưởng và hiệu suất nền tảng.";
            case 'project_management': return "Phê duyệt và quản lý các startup tham gia nền tảng.";
            case 'bookings': return "Theo dõi và giám sát các lịch hẹn đào tạo trong hệ thống.";
            case 'user_reports': return "Giải quyết các báo cáo vi phạm và khiếu nại từ người dùng.";
            case 'advisor_approval': return "Đánh giá hồ sơ và phê duyệt năng lực chuyên môn của các cố vấn.";
            case 'package_management': return "Cấu hình hạn mức, thời hạn và giá cả cho các gói đăng ký.";
            case 'subscription_history': return "Theo dõi lịch sử thanh toán, gia hạn các gói dịch vụ của người dùng.";
            case 'commission': return "Điều chỉnh tỷ lệ phần trăm hoa hồng hệ thống áp dụng cho các phiên tư vấn.";
            case 'pr_management': return "Quản lý và đăng bài PR cho các dự án đã được đầu tư thành công (hợp đồng đã ký).";
            case 'investor_approval': return "Xem xét hồ sơ và phê duyệt tư cách nhà đầu tư trên hệ thống.";
            case 'analytics': return "Biểu đồ phân tích chuyên sâu về dữ liệu hệ thống.";
            case 'activity': return "Nhật ký hoạt động và giám sát thời gian thực.";
            case 'account_profile': return "Quản lý thông tin cá nhân và mật khẩu.";
            default: return "Quản lý nền tảng và các yêu cầu phê duyệt.";

        }
    };

    const filterBookings = (list) => {
        if (!bookingSearchTerm || !bookingSearchTerm.trim()) return list || [];
        const lowerSearch = bookingSearchTerm.toLowerCase();
        return (list || []).filter(b =>
            b.advisorName?.toLowerCase().includes(lowerSearch) ||
            b.customerName?.toLowerCase().includes(lowerSearch) ||
            b.id?.toString().toLowerCase().includes(lowerSearch)
        );
    };

    // Derived booking lists
    const pendingBookingsList = filterBookings(allBookings.filter(b => b.status === 'Pending' || b.status === 0));
    const awaitingPaymentBookingsList = filterBookings(allBookings.filter(b => b.status === 'ApprovedAwaitingPayment' || b.status === 'AwaitingPayment' || b.status === 1));
    const confirmedBookingsList = filterBookings(allBookings.filter(b => b.status === 'Confirmed' || b.status === 2));
    const completedBookingsList = filterBookings(allBookings.filter(b => b.status === 'Completed' || b.status === 3));
    const complaintBookingsList = filterBookings(allBookings.filter(b => {
        const hasReport = userReports.some(r => String(r.bookingId) === String(b.id));
        return hasReport || b.status === 'ComplaintAccepted' || b.status === 'ComplaintRejected' || b.status === 4 || b.status === 5;
    }));
    const cancelledBookingsList = filterBookings(allBookings.filter(b => {
        const isComp = complaintBookingsList.some(x => x.id === b.id);
        if (isComp) return false;
        return b.status === 'Cancel' || b.status === 'Cancelled' || b.status === 'NoResponse' || b.status === 6 || b.status === 7 || b.status === 4 || b.status === 5;
    }));

    const dashboardData = {
        pendingApprovals: pendingStartups.length,
        pendingProjects: pendingProjects.length,
        approvedUsers: 0,
        totalProjects: totalProjects,
        approvalRate: approvalRate,
        avgApprovalTime: avgApprovalTime,
        totalUsers: totalUsers,
        systemHealth: systemHealth,
        pendingDocuments: 0,
        approvedProjects: approvedProjects.length,
        rejectedProjects: rejectedProjects.length
    };

    // Mobile Tab Scroll Tracking
    const tabSwitcherRef = React.useRef(null);
    const [showLeftTabIndicator, setShowLeftTabIndicator] = useState(false);
    const [showRightTabIndicator, setShowRightTabIndicator] = useState(false);

    const checkTabScroll = () => {
        if (tabSwitcherRef.current) {
            const { scrollLeft, scrollWidth, clientWidth } = tabSwitcherRef.current;
            setShowLeftTabIndicator(scrollLeft > 10);
            setShowRightTabIndicator(scrollLeft < scrollWidth - clientWidth - 10);
        }
    };

    // Check scroll on mount, section change, or data change
    useEffect(() => {
        if (activeSection === 'bookings' && isMobile) {
            // Need a slight delay to ensure DOM is updated and widths are calculated
            const timer = setTimeout(checkTabScroll, 100);
            window.addEventListener('resize', checkTabScroll);
            return () => {
                clearTimeout(timer);
                window.removeEventListener('resize', checkTabScroll);
            };
        }
    }, [activeSection, isMobile, activeMobileBookingTab, pendingBookingsList.length, confirmedBookingsList.length, completedBookingsList.length, cancelledBookingsList.length]);

    const displayedBookings = bookingFilters === ''
        ? allBookings
        : bookingFilters === 'status:Pending' ? pendingBookingsList
            : bookingFilters === 'status:ApprovedAwaitingPayment' ? awaitingPaymentBookingsList
                : bookingFilters === 'status:Confirmed' ? confirmedBookingsList
                    : bookingFilters === 'status:Completed' ? completedBookingsList
                        : allBookings;

    // We can slice displayedBookings if we want client-side pagination
    const paginatedBookings = displayedBookings.slice((bookingPage - 1) * bookingPageSize, bookingPage * bookingPageSize);

    // Fetch bookings
    const fetchBookings = async () => {
        setIsLoadingBookings(true);
        setBookingsError(null);
        try {
            const response = await bookingService.getAllBookings('', '', 1, 100);
            if (response && response.items) {
                let bookings = response.items || [];
                bookings.sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));
                setAllBookings(bookings);
            } else {
                setBookingsError('Không thể tải dữ liệu booking. Vui lòng thử lại sau.');
            }
        } catch (error) {
            console.error('Error fetching bookings:', error);
            setBookingsError('Lỗi kết nối máy chủ hoặc API không phản hồi.');
            setAllBookings([]);
        } finally {
            setIsLoadingBookings(false);
        }
    };

    const handleViewBookingDetails = async (bookingId) => {
        setFetchingBookingId(bookingId);
        setShowBookingModal(true);
        setIsLoadingBookingDetail(true);
        try {
            const response = await bookingService.getBookingById(bookingId);
            console.log('Booking detail response:', response);
            // Handle response structure: { success, data: {...}, statusCode }
            if (response && response.data) {
                setSelectedBooking(response.data);
                // Optionally fetch related project info using customerId
                if (response.data.customerId) {
                    console.log('Customer ID:', response.data.customerId);
                }
            } else if (response) {
                setSelectedBooking(response);
            }
        } catch (error) {
            console.error('Error fetching booking details:', error);
            setModalType('error');
            setModalMessage('Không thể tải chi tiết booking');
            setShowModal(true);
        } finally {
            setIsLoadingBookingDetail(false);
            setFetchingBookingId(null);
        }
    };


    const fetchPendingProjects = async () => {
        setIsLoadingProjects(true);
        setProjectsError(null);
        try {
            const response = await projectSubmissionService.getPendingProjects();
            if (response.success && response.data) {
                let projects = response.data.items || [];
                projects.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
                setPendingProjects(projects);
            } else {
                setProjectsError('Không thể tải danh sách dự án chờ xử lý.');
            }
        } catch (error) {
            console.error('Error fetching pending projects:', error);
            setProjectsError('Lỗi kết nối máy chủ khi tải dự án.');
            setPendingProjects([]);
        } finally {
            setIsLoadingProjects(false);
        }
    };

    const fetchApprovedProjects = async () => {
        setIsLoadingProjects(true);
        try {
            const response = await projectSubmissionService.getApprovedProjects();
            if (response.success && response.data) {
                let projects = response.data.items || [];
                projects.sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));
                setApprovedProjects(projects);
            }
        } catch (error) {
            console.error('Error fetching approved projects:', error);
            setApprovedProjects([]);
        } finally {
            setIsLoadingProjects(false);
        }
    };

    const fetchRejectedProjects = async () => {
        setIsLoadingProjects(true);
        try {
            const response = await projectSubmissionService.getRejectedProjects();
            if (response.success && response.data) {
                let projects = response.data.items || [];
                projects.sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));
                setRejectedProjects(projects);
            }
        } catch (error) {
            console.error('Error fetching rejected projects:', error);
            setRejectedProjects([]);
        } finally {
            setIsLoadingProjects(false);
        }
    };

    const fetchStartupsData = async () => {
        setIsLoadingStartups(true);
        try {
            const response = await startupProfileService.getAllStartups();
            const items = Array.isArray(response) ? response : (response?.data?.items || response?.items || []);
            
            // Map statuses correctly
            const pend = items.filter(s => (s.status || s.approvalStatus) === 'Pending' || (s.status || s.approvalStatus) === 'Unverified');
            const appr = items.filter(s => (s.status || s.approvalStatus) === 'Approved');
            const rej = items.filter(s => (s.status || s.approvalStatus) === 'Rejected');
            
            // Sort by latest created/updated
            const sortByDate = (list) => [...list].sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));

            setPendingStartups(sortByDate(pend));
            setApprovedStartups(sortByDate(appr));
            setRejectedStartups(sortByDate(rej));
        } catch (error) {
            console.error('Error fetching startups data:', error);
        } finally {
            setIsLoadingStartups(false);
        }
    };

    // Tự động tải dữ liệu cần thiết cho Statistics và các tab chính ngay khi component khởi tập (Mounting).
    // Giúp hiển thị số liệu thực ngay ở tab Tổng quan thay vì số 0.
    React.useEffect(() => {
        fetchAllData();
        fetchInvestors();
    }, []);

    // Refresh dữ liệu khi người dùng chủ động chuyển tab (nếu cần cập nhật mới nhất)
    React.useEffect(() => {
        if (activeSection === 'project_management') {
            fetchPendingProjects();
            fetchApprovedProjects();
            fetchRejectedProjects();
        } else if (activeSection === 'bookings') {
            fetchBookings();
            fetchUserReports();
        } else if (activeSection === 'approvals') {
            fetchStartupsData();
        } else if (activeSection === 'user_reports') {
            fetchUserReports();
        } else if (activeSection === 'pr_management') {
            fetchSignedDeals();
            fetchPRNews();
        } else if (activeSection === 'pr_news') {
            fetchPRNews();
        }
    }, [activeSection]);

    // Fetch project documents when detail modal opens
    useEffect(() => {
        if (showDetailModal && detailProject) {
            fetchProjectDocuments(detailProject.projectId);
        }
    }, [showDetailModal, detailProject]);

    const fetchProjectDocuments = async (projectId) => {
        setIsLoadingDocuments(true);
        setDocuments([]);
        try {
            const response = await projectSubmissionService.getDocuments(projectId);
            if (response && response.data) {
                const docItems = Array.isArray(response.data) ? response.data : (response.data.items || []);
                setDocuments(docItems.map(doc => ({
                    id: doc.documentId,
                    name: doc.fileName || doc.documentType,
                    type: doc.documentType,
                    uploadDate: new Date(doc.uploadedAt || doc.verifiedAt || new Date()).toLocaleDateString('vi-VN'),
                    url: doc.fileUrl
                })));
            }
        } catch (error) {
            console.error('Error fetching documents:', error);
        } finally {
            setIsLoadingDocuments(false);
        }
    };

    const fetchAnalysisHistory = async (projectId) => {
        if (!projectId) return;

        // 1. Fetch Startup-initiated history
        setIsLoadingHistory(true);
        try {
            const response = await AIEvaluationService.getProjectAnalysisHistory(projectId);
            if (response.success) {
                // Filter: Only include Startup-initiated analyses (those with potentialScore)
                const startupReports = (response.data || []).filter(h =>
                    h.potentialScore !== undefined && h.potentialScore !== null
                );
                setAnalysisHistory(startupReports);
            } else {
                setAnalysisHistory([]);
            }
        } catch (error) {
            if (error?.response?.status !== 403) {
                console.error('Error fetching startup analysis history:', error);
            }
            setAnalysisHistory([]);
        } finally {
            setIsLoadingHistory(false);
        }

        // 2. Fetch Staff-initiated history
        setIsLoadingStaffHistory(true);
        try {
            const response = await AIEvaluationService.getStaffAnalysisHistory(projectId);
            if (response.success) {
                // Filter: Only include Staff-initiated eligibility analyses
                const staffReports = (response.data || []).filter(h =>
                    h.isEligibleStartup !== undefined || h.is_eligible_startup !== undefined || h.data?.is_eligible_startup !== undefined
                );
                setStaffAnalysisHistory(staffReports);
            } else {
                setStaffAnalysisHistory([]);
            }
        } catch (error) {
            console.error('Error fetching staff analysis history:', error);
            setStaffAnalysisHistory([]);
        } finally {
            setIsLoadingStaffHistory(false);
        }
    };

    /**
     * Handle Staff-initiated AI Evaluation
     */
    const handleRunStaffAIEvaluation = async (projectId) => {
        if (!projectId || isEvaluatingStaffAI) return;

        setIsEvaluatingStaffAI(true);
        try {
            const result = await AIEvaluationService.evaluateProjectByStaffAPI(projectId);
            if (result.success) {
                setModalType('success');
                setModalMessage('✓ Đã khởi tạo phân tích AI mới thành công!');
                setShowModal(true);
                // Refresh both histories
                fetchAnalysisHistory(projectId);
            } else {
                throw new Error(result.message || 'Lỗi khi gọi API phân tích');
            }
        } catch (error) {
            console.error('Staff AI evaluation error:', error);
            setModalType('error');
            setModalMessage('❌ Phân tích thất bại: ' + (error.message || 'Lỗi không xác định'));
            setShowModal(true);
        } finally {
            setIsEvaluatingStaffAI(false);
        }
    };

    const openDetailModal = (project) => {
        setDetailProject(project);
        setShowDetailModal(true);
        fetchAnalysisHistory(project.projectId);
    };



    const handleApproveStartup = async (id) => {
        if (processingProjectId) return;
        setProcessingProjectId(id);
        setProcessingAction('approve');
        try {
            const response = await startupProfileService.approveStartup(id);
            
            // Update local state for immediate UI response
            const startupToMove = pendingStartups.find(s => s.id === id);
            if (startupToMove) {
                setApprovedStartups([{ ...startupToMove, status: 'Approved' }, ...approvedStartups]);
                setPendingStartups(pendingStartups.filter(s => s.id !== id));
            }
            
            setShowStartupDetailModal(false);
            setModalType('success');
            setModalMessage('✓ Startup đã được phê duyệt thành công!');
            setShowModal(true);
        } catch (error) {
            console.error('Error approving startup:', error);
            setModalType('error');
            setModalMessage('❌ Phê duyệt thất bại: ' + (error?.message || 'Lỗi không xác định'));
            setShowModal(true);
        } finally {
            setProcessingProjectId(null);
            setProcessingAction(null);
        }
    };

    const handleRejectStartup = async (id, reason = null) => {
        if (!reason) {
            const startup = pendingStartups.find(s => s.id === id);
            // Use selectedProject for the rejection modal since it requires a ProjectName
            setSelectedProject({ projectId: id, projectName: startup?.companyName || 'Startup' });
            setRejectionTarget('startup');
            setShowRejectionModal(true);
            return;
        }

        if (processingProjectId) return;
        setProcessingProjectId(id);
        setProcessingAction('reject');
        try {
            await startupProfileService.rejectStartup(id, reason);
            
            const startupToMove = pendingStartups.find(s => s.id === id);
            if (startupToMove) {
                setRejectedStartups([{ ...startupToMove, status: 'Rejected' }, ...rejectedStartups]);
                setPendingStartups(pendingStartups.filter(s => s.id !== id));
            }
            
            setShowStartupDetailModal(false);
            setModalType('success');
            setModalMessage('✓ Startup đã bị từ chối!');
            setShowModal(true);
        } catch (error) {
            console.error('Error rejecting startup:', error);
            setModalType('error');
            setModalMessage('❌ Từ chối thất bại: ' + (error?.message || 'Lỗi không xác định'));
            setShowModal(true);
        } finally {
            setProcessingProjectId(null);
            setProcessingAction(null);
        }
    };
    
    const openStartupDetail = (startup) => {
        setSelectedStartupForDetail(startup);
        setShowStartupDetailModal(true);
    };

    // INTELLIGENT DEEP LINKING EFFECT
    useEffect(() => {
        if (!targetId || hasAttemptedDeepLink) return;

        // 1. Handling Bookings
        if (activeSection === 'bookings' && bookings.length > 0) {
            const match = bookings.find(b => String(b.id) === String(targetId));
            if (match) {
                console.log(`[DeepLink] Auto-opening Booking Details: ${targetId}`);
                handleViewBookingDetails(match.id);
                setHasAttemptedDeepLink(true);
            }
            return;
        }

        // 2. Handling Startup Management / Approvals
        if (activeSection === 'startup_management') {
            const allStartups = [...pendingStartups, ...approvedStartups, ...rejectedStartups];
            if (allStartups.length > 0) {
                const match = allStartups.find(st => String(st.id) === String(targetId));
                if (match) {
                    console.log(`[DeepLink] Auto-opening Startup Details: ${targetId}`);
                    openStartupDetail(match);
                    setHasAttemptedDeepLink(true);
                }
            }
            return;
        }

        // 3. Handling Project Management / Approvals
        if (activeSection === 'project_management') {
            const allProjects = [...pendingProjects, ...approvedProjects, ...rejectedProjects];
            if (allProjects.length > 0) {
                const match = allProjects.find(p => String(p.projectId) === String(targetId));
                if (match) {
                    console.log(`[DeepLink] Auto-opening Project Details: ${targetId}`);
                    openDetailModal(match);
                    setHasAttemptedDeepLink(true);
                }
            }
            return;
        }

        // 4. Handling Investor Approvals
        if (activeSection === 'investor_approval') {
            const allInvestors = [...pendingInvestors, ...approvedInvestors, ...rejectedInvestors];
            if (allInvestors.length > 0) {
                const match = allInvestors.find(inv => String(inv.investorId) === String(targetId));
                if (match) {
                    console.log(`[DeepLink] Auto-opening Investor Details: ${targetId}`);
                    setSelectedInvestor(match);
                    setShowInvestorDetailModal(true);
                    setHasAttemptedDeepLink(true);
                }
            }
            return;
        }

        // 5. Handling User Reports
        if (activeSection === 'user_reports' && userReports.length > 0) {
            const match = userReports.find(r => String(r.userReportId) === String(targetId));
            if (match) {
                console.log(`[DeepLink] Found User Report: ${targetId}. Scrolling into view.`);
                const element = document.getElementById(`report-card-${targetId}`);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    element.style.ring = '2px solid var(--primary-blue)';
                    setHasAttemptedDeepLink(true);
                }
            }
            return;
        }

    }, [targetId, activeSection, bookings, pendingProjects, approvedProjects, rejectedProjects, pendingStartups, approvedStartups, rejectedStartups, pendingInvestors, approvedInvestors, rejectedInvestors, userReports, hasAttemptedDeepLink]);

    const handleApproveProject = async (projectId) => {
        if (processingProjectId) return;
        setProcessingProjectId(projectId);
        setProcessingAction('approve');
        try {
            const response = await projectSubmissionService.approveProject(projectId);
            if (response?.success) {
                const projectToMove = pendingProjects.find(p => p.projectId === projectId);
                if (projectToMove) {
                    setApprovedProjects([{ ...projectToMove, status: 'Approved' }, ...approvedProjects]);
                    setPendingProjects(pendingProjects.filter(p => p.projectId !== projectId));
                }
                setModalType('success');
                setModalMessage('✓ ' + (response?.message || 'Dự án đã được phê duyệt thành công!'));
                setShowModal(true);
            } else {
                setModalType('error');
                setModalMessage('❌ Phê duyệt thất bại: ' + (response?.message || 'Lỗi không xác định'));
                setShowModal(true);
            }
        } catch (error) {
            console.error('Error approving project:', error);
            setModalType('error');
            // If the backend provided a list of specific errors, show the first one.
            // Otherwise, fall back to the general error message.
            const errorMessage = (error?.errors && error.errors.length > 0)
                ? error.errors[0]
                : (error?.message || 'Vui lòng thử lại');

            setModalMessage('❌ Phê duyệt thất bại: ' + errorMessage);
            setShowModal(true);
        } finally {
            setProcessingProjectId(null);
            setProcessingAction(null);
        }
    };

    const handleRejectProject = async (projectId, reason = null) => {
        // If reason not provided, show modal to collect it
        if (!reason) {
            const project = pendingProjects.find(p => p.projectId === projectId);
            setSelectedProject(project);
            setRejectionTarget('project');
            setShowRejectionModal(true);
            return;
        }

        // If reason provided, submit rejection
        if (processingProjectId) return;
        setProcessingProjectId(projectId);
        setProcessingAction('reject');
        try {
            const response = await projectSubmissionService.rejectProject(projectId, reason);
            if (response?.success) {
                const projectToMove = pendingProjects.find(p => p.projectId === projectId);
                if (projectToMove) {
                    setRejectedProjects([{ ...projectToMove, status: 'Rejected' }, ...rejectedProjects]);
                    setPendingProjects(pendingProjects.filter(p => p.projectId !== projectId));
                }
                setModalType('success');
                setModalMessage('✓ ' + (response?.message || 'Dự án đã bị từ chối!'));
                setShowModal(true);
            } else {
                setModalType('error');
                setModalMessage('❌ Từ chối thất bại: ' + (response?.message || 'Lỗi không xác định'));
                setShowModal(true);
            }
        } catch (error) {
            console.error('Error rejecting project:', error);
            setModalType('error');
            const errorMessage = (error?.errors && error.errors.length > 0)
                ? error.errors[0]
                : (error?.message || 'Vui lòng thử lại');

            setModalMessage('❌ Từ chối thất bại: ' + errorMessage);
            setShowModal(true);
        } finally {
            setProcessingProjectId(null);
            setProcessingAction(null);
        }
    };

    const handleBlockchainVerification = async (docId, docName) => {
        setIsLoadingBlockchain(true);
        setBlockchainError(null);
        try {
            const response = await projectSubmissionService.verifyDocument(docId);
            if (response && response.data) {
                // Ensure the verification modal gets the correct data structure
                const extendedData = {
                    ...response.data,
                    // Map any specific txHash fields if necessary to match the Startup version
                    txHash: response.data.txHash || response.data.blockchainTxHash
                };
                setBlockchainData(extendedData);
                setShowBlockchainModal(true);
            } else {
                setModalType('error');
                setModalMessage('Không tìm thấy thông tin xác thực cho tài liệu này.');
                setShowModal(true);
            }
        } catch (error) {
            console.error('Error verifying document:', error);
            setModalType('error');
            setModalMessage('Lỗi xác thực: ' + (error?.message || 'Không thể kết nối với Blockchain.'));
            setShowModal(true);
        } finally {
            setIsLoadingBlockchain(false);
        }
    };

    const fetchUserReports = async () => {
        setIsLoadingUserReports(true);
        setUserReportsError(null);
        try {
            const response = await userReportService.getAllReports();
            // Some API endpoints return { data: [...] } or { items: [...] }
            const reports = response?.data || response?.items || (Array.isArray(response) ? response : []);
            
            // Sort by createdAt descending (newest first)
            const sortedReports = [...reports].sort((a, b) => {
                return new Date(b.createdAt) - new Date(a.createdAt);
            });
            
            setUserReports(sortedReports);
        } catch (error) {
            console.error('Error fetching user reports:', error);
            setUserReportsError('Không thể tải danh sách báo cáo vi phạm.');
        } finally {
            setIsLoadingUserReports(false);
        }
    };

    const fetchSignedDeals = async () => {
        setIsLoadingSignedDeals(true);
        setSignedDealsError(null);
        try {
            // Use getAllSignedDeals for staff to fetch all signed contracts
            const response = await dealsService.getAllSignedDeals();

            // Response data structure: { page, pageSize, totalCount, items: [...] }
            let deals = [];
            if (response?.data?.items && Array.isArray(response.data.items)) {
                deals = response.data.items;
            } else if (Array.isArray(response?.data)) {
                deals = response.data;
            }

            // Filter to get only deals with status "Contract_Signed"
            const signedDealsFiltered = deals.filter(deal =>
                deal.status === 'Contract_Signed' && deal.projectId && deal.projectName
            );

            console.log('[OperationStaffDashboard] Signed deals fetched:', signedDealsFiltered.length, 'from total:', deals.length);
            setSignedDeals(signedDealsFiltered);
        } catch (error) {
            console.error('Error fetching signed deals:', error);
            setSignedDealsError('Không thể tải danh sách dự án đã ký hợp đồng.');
        } finally {
            setIsLoadingSignedDeals(false);
        }
    };

    const handleSubmitPR = async () => {
        if (!selectedDealForPR || !prFormData.title.trim() || !prFormData.content.trim()) {
            setModalType('error');
            setModalMessage('Vui lòng điền đầy đủ tiêu đề và nội dung bài viết PR');
            setShowModal(true);
            return;
        }

        setIsSubmittingPR(true);
        try {
            const payload = {
                dealId: selectedDealForPR.dealId,
                title: prFormData.title.trim(),
                content: prFormData.content.trim()
            };

            console.log('[OperationStaffDashboard] Submitting PR:', payload);
            const response = await prService.createPR(payload);

            if (response?.success || response?.statusCode === 200) {
                setShowPRModal(false);
                setPrFormData({ title: '', content: '' });
                setSelectedDealForPR(null);
                setModalType('success');
                setModalMessage(`✨ Đăng bài PR thành công cho dự án "${selectedDealForPR.projectName}"!`);
                setShowModal(true);
                // Refresh signed deals list and PR news
                setTimeout(() => {
                    fetchSignedDeals();
                    fetchPRNews();
                }, 500);
            } else {
                throw new Error(response?.message || 'Lỗi khi đăng bài PR');
            }
        } catch (error) {
            console.error('Error submitting PR:', error);
            setModalType('error');
            setModalMessage(error.message || 'Không thể đăng bài PR. Vui lòng thử lại.');
            setShowModal(true);
        } finally {
            setIsSubmittingPR(false);
        }
    };

    const fetchPRNews = async () => {
        setIsLoadingPRNews(true);
        setPrNewsError(null);
        try {
            const response = await prService.getPRs();

            // Response data structure: { data: { page, pageSize, totalCount, totalPages, items: [...] } }
            let prsList = [];
            if (response?.data?.items && Array.isArray(response.data.items)) {
                prsList = response.data.items;
            } else if (Array.isArray(response?.data)) {
                prsList = response.data;
            } else if (Array.isArray(response?.items)) {
                prsList = response.items;
            }

            console.log('[OperationStaffDashboard] PR News fetched:', prsList.length);
            setPrNewsList(prsList);
        } catch (error) {
            console.error('Error fetching PR news:', error);
            setPrNewsError('Không thể tải tin tức PR.');
        } finally {
            setIsLoadingPRNews(false);
        }
    };

    const handleOpenEditPR = (pr) => {
        setSelectedPRForEdit(pr);
        setEditTitle(pr.title);
        setEditContent(pr.content);
        setShowEditPRModal(true);
    };

    const handleSaveEditPR = async () => {
        if (!selectedPRForEdit) return;
        if (!editTitle.trim() || !editContent.trim()) {
            setModalType('error');
            setModalMessage('Vui lòng điền đầy đủ tiêu đề và nội dung.');
            setShowModal(true);
            return;
        }

        setProcessingPRId(selectedPRForEdit.postPrId);
        try {
            const response = await prService.updatePR(selectedPRForEdit.postPrId, editTitle, editContent);
            // API returns data directly, no error thrown means success
            setShowEditPRModal(false);
            setSelectedPRForEdit(null);
            setEditTitle('');
            setEditContent('');
            setModalType('success');
            setModalMessage('✏️ Chỉnh sửa bài PR thành công!');
            setShowModal(true);
            // Refresh PR news
            setTimeout(() => fetchPRNews(), 500);
        } catch (error) {
            console.error('Error editing PR:', error);
            setModalType('error');
            setModalMessage(error.message || 'Không thể chỉnh sửa bài PR. Vui lòng thử lại.');
            setShowModal(true);
        } finally {
            setProcessingPRId(null);
        }
    };

    const handleDeletePR = async () => {
        if (!selectedPRForDelete) return;
        setProcessingPRId(selectedPRForDelete.postPrId);
        try {
            const response = await prService.deletePR(selectedPRForDelete.postPrId);
            if (response?.success || response?.statusCode === 200) {
                setShowDeletePRModal(false);
                setSelectedPRForDelete(null);
                setModalType('success');
                setModalMessage('🗑️ Xóa bài PR thành công!');
                setShowModal(true);
                // Refresh PR news
                setTimeout(() => fetchPRNews(), 500);
            } else {
                throw new Error(response?.message || 'Lỗi khi xóa bài PR');
            }
        } catch (error) {
            console.error('Error deleting PR:', error);
            setModalType('error');
            setModalMessage(error.message || 'Không thể xóa bài PR. Vui lòng thử lại.');
            setShowModal(true);
        } finally {
            setProcessingPRId(null);
        }
    };

    const handleResolveReport = async (reportId, isValid, note = "") => {
        if (processingProjectId === reportId) return;
        setProcessingProjectId(reportId);
        try {
            if (isValid) {
                await userReportService.resolveValid(reportId, note);
            } else {
                await userReportService.resolveFalse(reportId, note);
            }
            setModalType('success');
            setModalMessage(isValid ? '✓ Đã xác nhận báo cáo hợp lệ!' : '✓ Đã xác nhận báo cáo sai lệch!');
            setShowModal(true);
            fetchUserReports();
        } catch (error) {
            console.error('Error resolving report:', error);
            setModalType('error');
            setModalMessage('❌ Lỗi: ' + (error?.message || 'Không thể xử lý báo cáo'));
            setShowModal(true);
        } finally {
            setProcessingProjectId(null);
        }
    };


    /**
     * fetchAllData - Aggregates data from all specific fetch functions
     * to ensure the dashboard stats are up to date.
     */
    const fetchAllData = async () => {
        try {
            await Promise.all([
                fetchPendingProjects(),
                fetchApprovedProjects(),
                fetchRejectedProjects(),
                fetchPendingStartups(),
                fetchUserReports(),
                fetchBookings(),
                fetchInvestors()
            ]);
        } catch (error) {
            console.error('Error fetching all dashboard data:', error);
        }
    };

    /**
     * fetchInvestors - Fetches all investors and splits them by approval status
     */
    const fetchInvestors = async () => {
        setIsLoadingInvestors(true);
        try {
            const response = await investorService.getAllInvestors({ pageSize: 100 });
            const investors = response.items || [];

            setPendingInvestors(investors.filter(i => (i.status || i.approvalStatus) === 'Pending'));
            setApprovedInvestors(investors.filter(i => (i.status || i.approvalStatus) === 'Approved'));
            setRejectedInvestors(investors.filter(i => (i.status || i.approvalStatus) === 'Rejected'));
        } catch (error) {
            console.error('Error fetching investors:', error);
        } finally {
            setIsLoadingInvestors(false);
        }
    };

    /**
     * handleApproveInvestor - Approves an investor application
     */
    const handleApproveInvestor = async (investorId) => {
        if (processingInvestorId) return;
        setProcessingInvestorId(investorId);
        setInvestorAction('approve');
        try {
            const response = await investorService.approveInvestor(investorId);
            if (response.success || response.statusCode === 200) {
                setModalType('success');
                setModalMessage('✓ Nhà đầu tư đã được phê duyệt thành công!');
                setShowModal(true);
                fetchInvestors();
            }
        } catch (error) {
            console.error('Error approving investor:', error);
            setModalType('error');
            setModalMessage('❌ Phê duyệt thất bại: ' + (error.message || 'Lỗi không xác định'));
            setShowModal(true);
        } finally {
            setProcessingInvestorId(null);
            setInvestorAction(null);
        }
    };

    /**
     * handleRejectInvestor - Rejects an investor application with a reason
     */
    const handleRejectInvestor = async (reason) => {
        if (!selectedInvestor || processingInvestorId) return;
        const investorId = selectedInvestor.investorId;
        setProcessingInvestorId(investorId);
        setInvestorAction('reject');
        try {
            const response = await investorService.rejectInvestor(investorId, reason);
            if (response.success || response.statusCode === 200) {
                setShowInvestorRejectModal(false);
                setModalType('success');
                setModalMessage('✓ Hồ sơ nhà đầu tư đã bị từ chối.');
                setShowModal(true);
                fetchInvestors();
            }
        } catch (error) {
            console.error('Error rejecting investor:', error);
            setModalType('error');
            setModalMessage('❌ Từ chối thất bại: ' + (error.message || 'Lỗi không xác định'));
            setShowModal(true);
        } finally {
            setProcessingInvestorId(null);
            setInvestorAction(null);
            setSelectedInvestor(null);
        }
    };

    const filterProjects = (projects) => {
        if (!searchTerm || !searchTerm.trim()) return projects || [];
        const lowerSearch = searchTerm.toLowerCase();
        return (projects || []).filter(p =>
            p.projectName?.toLowerCase().includes(lowerSearch) ||
            p.companyName?.toLowerCase().includes(lowerSearch) ||
            p.startupName?.toLowerCase().includes(lowerSearch) ||
            p.shortDescription?.toLowerCase().includes(lowerSearch)
        );
    };

    const filteredPending = filterProjects(pendingProjects);
    const filteredApproved = filterProjects(approvedProjects);
    const filteredRejected = filterProjects(rejectedProjects);

    return (
        <div className={styles.container} style={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column'
        }}>
            {!['pr_news'].includes(activeSection) && (
                <FeedHeader
                    title={getSectionTitle(activeSection)}
                    subtitle={getSectionSubtitle(activeSection)}
                    showFilter={false}
                    user={user}
                    searchTerm={
                        activeSection === 'project_management' ? searchTerm :
                            (activeSection === 'bookings' ? bookingSearchTerm :
                                (activeSection === 'pr_management' ? prSearchTerm :
                                    (activeSection === 'pr_news' ? prNewsSearchTerm :
                                        (activeSection === 'advisor_approval' ? advisorSearchTerm :
                                            (activeSection === 'package_management' || activeSection === 'subscription_history' ? subscriptionSearchTerm : '')))))
                    }
                    onSearchChange={(val) => {
                        if (activeSection === 'project_management') setSearchTerm(val);
                        else if (activeSection === 'bookings') setBookingSearchTerm(val);
                        else if (activeSection === 'pr_management') setPrSearchTerm(val);
                        else if (activeSection === 'pr_news') setPrNewsSearchTerm(val);
                        else if (activeSection === 'advisor_approval') setAdvisorSearchTerm(val);
                        else if (activeSection === 'package_management' || activeSection === 'subscription_history') setSubscriptionSearchTerm(val);
                    }}
                    searchPlaceholder={
                        activeSection === 'project_management' ? "Tìm kiếm dự án..." :
                            (activeSection === 'bookings' ? "Tìm kiếm booking..." :
                                (activeSection === 'pr_management' ? "Tìm kiếm dự án đã ký..." :
                                    (activeSection === 'pr_news' ? "Tìm kiếm bài PR..." :
                                        (activeSection === 'advisor_approval' ? "Tìm kiếm cố vấn..." : "Tìm kiếm..."))))
                    }
                    showNotification={true}
                    onNotificationNavigate={onNotificationNavigate}
                />
            )}

            {/* Navigation Tabs (Only for main statistics/analytics/activity) */}
            {['statistics', 'analytics'].includes(activeSection) && (
                <div className={styles.tabs}>
                    <button
                        className={`${styles.tab} ${activeSection === 'statistics' ? styles.active : ''}`}
                        onClick={() => setActiveSection('statistics')}
                    >
                        Thống kê
                    </button>
                    <button
                        className={`${styles.tab} ${activeSection === 'analytics' ? styles.active : ''}`}
                        onClick={() => setActiveSection('analytics')}
                    >
                        Phân tích
                    </button>
                </div>
            )}

            {/* Content Sections */}
            {activeSection !== 'pr_news' && (
                <div className={styles.content}>
                    {/* FINANCIAL SECTIONS */}
                    {activeSection === 'payouts' && (
                        <div className={`${styles.section} ${styles.scrollableSection}`}>
                            <PayoutManagement searchTerm={payoutSearchTerm} />
                        </div>
                    )}
                    {activeSection === 'commission' && (
                        <div className={`${styles.section} ${styles.scrollableSection}`}>
                            <CommissionManagement searchTerm={commissionSearchTerm} />
                        </div>
                    )}

                    {/* STATISTICS SECTION */}
                    {activeSection === 'statistics' && (
                        <div className={`${styles.section} ${styles.scrollableSection}`}>
                            <div className={s.statisticsSection}>
                                {/* Main KPI Cards Grid */}
                                <div className={s.statsGrid}>
                                    {/* Total Projects Card */}
                                    <div className={s.kpiCard}>
                                        <div className={s.kpiHeader}>
                                            <span className={s.statLabel}>Tổng dự án</span>
                                            <span className={s.statValue}>
                                                {dashboardData.pendingProjects + dashboardData.approvedProjects + dashboardData.rejectedProjects}
                                            </span>
                                        </div>
                                        <div className={s.kpiBreakdown}>
                                            <div><span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><CheckCircle size={14} color="#10b981" /> Phê duyệt</span><strong>{dashboardData.approvedProjects}</strong></div>
                                            <div><span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><History size={14} color="#f59e0b" /> Chờ xử lý</span><strong>{dashboardData.pendingProjects}</strong></div>
                                            <div><span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><X size={14} color="#ef4444" /> Từ chối</span><strong>{dashboardData.rejectedProjects}</strong></div>
                                        </div>
                                    </div>

                                    {/* Approval Rate Card */}
                                    <div className={s.kpiCard}>
                                        <div className={s.kpiHeader}>
                                            <span className={s.statLabel}>Tỉ lệ chấp thuận</span>
                                            <span className={s.statValue}>
                                                {dashboardData.pendingProjects + dashboardData.approvedProjects + dashboardData.rejectedProjects > 0
                                                    ? Math.round((dashboardData.approvedProjects / (dashboardData.pendingProjects + dashboardData.approvedProjects + dashboardData.rejectedProjects)) * 100)
                                                    : 0}%
                                            </span>
                                        </div>
                                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <TrendingUp size={14} /> Hiệu quả phê duyệt hệ thống
                                        </div>
                                    </div>

                                    {/* Pending Items Card */}
                                    <div className={s.kpiCard}>
                                        <div className={s.kpiHeader}>
                                            <span className={s.statLabel}>Chờ xử lý</span>
                                            <span className={s.statValue}>
                                                {dashboardData.pendingProjects + dashboardData.pendingApprovals}
                                            </span>
                                        </div>
                                        <div className={s.kpiBreakdown}>
                                            <div><span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><FileCheck size={14} /> Dự án</span><strong>{dashboardData.pendingProjects}</strong></div>
                                            <div><span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Users size={14} /> Người dùng</span><strong>{dashboardData.pendingApprovals}</strong></div>
                                        </div>
                                    </div>

                                    {/* System Health Card */}
                                    <div className={s.kpiCard}>
                                        <div className={s.kpiHeader}>
                                            <span className={s.statLabel}>Tính khỏe hệ thống</span>
                                            <span className={s.statValue}>{systemHealth}%</span>
                                        </div>
                                        <div style={{
                                            fontSize: '11px',
                                            fontWeight: '700',
                                            marginTop: '12px',
                                            padding: '4px 10px',
                                            backgroundColor: systemHealth > 80 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                                            color: systemHealth > 80 ? '#10b981' : '#f59e0b',
                                            borderRadius: '20px',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '4px'
                                        }}>
                                            {systemHealth > 80 ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
                                            {systemHealth > 80 ? 'Bình thường' : 'Cần chú ý'}
                                        </div>
                                    </div>
                                </div>

                                {/* Detailed Stats Row */}
                                <div className={styles.card} style={{ gridColumn: '1 / -1', border: '1px solid var(--border-color)', background: 'transparent' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                                        <Activity size={18} color="var(--primary-blue)" />
                                        <h3 style={{ fontSize: '15px', fontWeight: '700', margin: 0, color: 'var(--text-primary)' }}>
                                            Chỉ số hiệu suất chi tiết
                                        </h3>
                                    </div>
                                    <div className={s.detailedStatsRow}>
                                        <div className={s.statItem}>
                                            <div className={s.statLabel}>Dự án chờ xử lý</div>
                                            <div className={s.statValue}>{dashboardData.pendingProjects}</div>
                                            <div style={{ width: '100%', height: '4px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '2px', marginTop: '12px' }}>
                                                <div style={{ height: '100%', width: dashboardData.pendingProjects > 10 ? '100%' : (dashboardData.pendingProjects * 10) + '%', backgroundColor: '#f59e0b', borderRadius: '2px' }}></div>
                                            </div>
                                        </div>
                                        <div className={s.statItem}>
                                            <div className={s.statLabel}>Người dùng chờ phê duyệt</div>
                                            <div className={s.statValue}>{dashboardData.pendingApprovals}</div>
                                            <div style={{ width: '100%', height: '4px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '2px', marginTop: '12px' }}>
                                                <div style={{ height: '100%', width: dashboardData.pendingApprovals > 10 ? '100%' : (dashboardData.pendingApprovals * 10) + '%', backgroundColor: 'var(--primary-blue)', borderRadius: '2px' }}></div>
                                            </div>
                                        </div>
                                        <div className={s.statItem}>
                                            <div className={s.statLabel}>Dự án phê duyệt</div>
                                            <div className={s.statValue}>{dashboardData.approvedProjects}</div>
                                        </div>
                                        <div className={s.statItem}>
                                            <div className={s.statLabel}>Dự án từ chối</div>
                                            <div className={s.statValue} style={{ color: '#ef4444' }}>{dashboardData.rejectedProjects}</div>
                                        </div>
                                        <div className={s.statItem}>
                                            <div className={s.statLabel}>Thời gian TB (giờ)</div>
                                            <div className={s.statValue}>{dashboardData.avgApprovalTime || '-'}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ANALYTICS SECTION */}
                    {activeSection === 'analytics' && (
                        <div className={`${styles.section} ${styles.scrollableSection}`}>
                            <div className={s.analyticsSection}>
                                {/* Main Analytics Grid */}
                                <div className={s.analyticsGrid}>
                                    {/* Project Distribution (Donut Chart) */}
                                    <div className={styles.card}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                                            <PieChart size={18} color="var(--primary-blue)" />
                                            <h3 style={{ fontSize: '15px', fontWeight: '700', margin: 0, color: 'var(--text-primary)' }}>
                                                Phân bổ trạng thái dự án
                                            </h3>
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
                                            {/* Minimalist CSS Donut */}
                                            <div style={{
                                                width: '120px',
                                                height: '120px',
                                                borderRadius: '50%',
                                                border: '12px solid #10b981',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                flexShrink: 0,
                                                position: 'relative'
                                            }}>
                                                <div style={{ textAlign: 'center' }}>
                                                    <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)' }}>
                                                        {dashboardData.approvedProjects + dashboardData.pendingProjects + dashboardData.rejectedProjects}
                                                    </div>
                                                    <div style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Tổng</div>
                                                </div>
                                            </div>

                                            {/* Legend */}
                                            <div style={{ flex: 1 }} className={s.legendList}>
                                                <div className={s.legendItem}>
                                                    <div className={s.legendLabel}>
                                                        <div className={s.indicatorCircle} style={{ backgroundColor: '#10b981' }}></div>
                                                        Phê duyệt
                                                    </div>
                                                    <div className={s.legendValue}>{dashboardData.approvedProjects}</div>
                                                </div>
                                                <div className={s.legendItem}>
                                                    <div className={s.legendLabel}>
                                                        <div className={s.indicatorCircle} style={{ backgroundColor: '#f59e0b' }}></div>
                                                        Chờ xử lý
                                                    </div>
                                                    <div className={s.legendValue}>{dashboardData.pendingProjects}</div>
                                                </div>
                                                <div className={s.legendItem}>
                                                    <div className={s.legendLabel}>
                                                        <div className={s.indicatorCircle} style={{ backgroundColor: '#ef4444' }}></div>
                                                        Từ chối
                                                    </div>
                                                    <div className={s.legendValue}>{dashboardData.rejectedProjects}</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Performance Metrics */}
                                    <div className={styles.card}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                                            <Activity size={18} color="var(--primary-blue)" />
                                            <h3 style={{ fontSize: '15px', fontWeight: '700', margin: 0, color: 'var(--text-primary)' }}>
                                                Chỉ số hiệu suất
                                            </h3>
                                        </div>

                                        <div className={s.performanceGrid}>
                                            <div className={s.progressWrapper}>
                                                <div className={s.progressLabelRow}>
                                                    <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)' }}>Tỉ lệ phê duyệt</span>
                                                    <span style={{ fontSize: '14px', fontWeight: '700', color: '#10b981' }}>
                                                        {dashboardData.approvedProjects + dashboardData.rejectedProjects > 0
                                                            ? Math.round((dashboardData.approvedProjects / (dashboardData.approvedProjects + dashboardData.rejectedProjects)) * 100)
                                                            : 0}%
                                                    </span>
                                                </div>
                                                <div className={s.progressTrack}>
                                                    <div className={s.progressFill} style={{
                                                        width: (dashboardData.approvedProjects + dashboardData.rejectedProjects > 0
                                                            ? Math.round((dashboardData.approvedProjects / (dashboardData.approvedProjects + dashboardData.rejectedProjects)) * 100)
                                                            : 0) + '%',
                                                        backgroundColor: '#10b981'
                                                    }}></div>
                                                </div>
                                            </div>

                                            <div className={s.progressWrapper}>
                                                <div className={s.progressLabelRow}>
                                                    <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)' }}>Tỉ lệ hoàn thành</span>
                                                    <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--primary-blue)' }}>
                                                        {dashboardData.approvedProjects + dashboardData.rejectedProjects + dashboardData.pendingProjects > 0
                                                            ? Math.round(((dashboardData.approvedProjects + dashboardData.rejectedProjects) / (dashboardData.approvedProjects + dashboardData.rejectedProjects + dashboardData.pendingProjects)) * 100)
                                                            : 0}%
                                                    </span>
                                                </div>
                                                <div className={s.progressTrack}>
                                                    <div className={s.progressFill} style={{
                                                        width: (dashboardData.approvedProjects + dashboardData.rejectedProjects + dashboardData.pendingProjects > 0
                                                            ? Math.round(((dashboardData.approvedProjects + dashboardData.rejectedProjects) / (dashboardData.approvedProjects + dashboardData.rejectedProjects + dashboardData.pendingProjects)) * 100)
                                                            : 0) + '%'
                                                    }}></div>
                                                </div>
                                            </div>

                                            <div className={s.progressWrapper}>
                                                <div className={s.progressLabelRow}>
                                                    <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)' }}>Tỉ lệ từ chối</span>
                                                    <span style={{ fontSize: '14px', fontWeight: '700', color: '#ef4444' }}>
                                                        {dashboardData.approvedProjects + dashboardData.rejectedProjects > 0
                                                            ? Math.round((dashboardData.rejectedProjects / (dashboardData.approvedProjects + dashboardData.rejectedProjects)) * 100)
                                                            : 0}%
                                                    </span>
                                                </div>
                                                <div className={s.progressTrack}>
                                                    <div className={s.progressFill} style={{
                                                        width: (dashboardData.approvedProjects + dashboardData.rejectedProjects > 0
                                                            ? Math.round((dashboardData.rejectedProjects / (dashboardData.approvedProjects + dashboardData.rejectedProjects)) * 100)
                                                            : 0) + '%',
                                                        backgroundColor: '#ef4444'
                                                    }}></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Action Summary Row */}
                                <div className={s.summaryGrid}>
                                    <div className={s.summaryCard}>
                                        <div className={s.summaryIndicator} style={{ backgroundColor: '#f59e0b' }}></div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <Briefcase size={16} color="#f59e0b" />
                                            <div className={s.summaryTitle}>Duyệt dự án</div>
                                        </div>
                                        <div className={s.summaryValue}>{dashboardData.pendingProjects}</div>
                                        <div className={s.summaryText}>
                                            {dashboardData.pendingProjects > 0
                                                ? `${dashboardData.pendingProjects} dự án đang chờ phê duyệt của bạn`
                                                : 'Không có dự án nào chờ xử lý'}
                                        </div>
                                    </div>

                                    <div className={s.summaryCard}>
                                        <div className={s.summaryIndicator} style={{ backgroundColor: 'var(--primary-blue)' }}></div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <Users size={16} color="var(--primary-blue)" />
                                            <div className={s.summaryTitle}>Phân bổ người dùng</div>
                                        </div>
                                        <div className={s.summaryValue}>{dashboardData.pendingApprovals}</div>
                                        <div className={s.summaryText}>
                                            {dashboardData.pendingApprovals > 0
                                                ? `${dashboardData.pendingApprovals} yêu cầu chờ xác nhận`
                                                : 'Tất cả người dùng đã được phê duyệt'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Project Management Section (All statuses) */}
                    {activeSection === 'project_management' && (
                        <div className={styles.section} style={{ flex: 1, minHeight: 0, paddingBottom: 0 }}>
                            {/* Tab Switcher - Same as Booking */}
                            <div className={styles.tabs} style={{ margin: '0 -24px 0 -24px', padding: '0 24px', overflowX: 'auto', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '8px' }}>
                                <button className={`${styles.tab} ${activeMobileTab === 'all' ? styles.active : ''}`} onClick={() => setActiveMobileTab('all')}>
                                    Tất cả
                                    <span className={local.mobileTabCount} style={{ marginLeft: '8px' }}>{filteredPending.length + filteredApproved.length + filteredRejected.length}</span>
                                </button>
                                <button className={`${styles.tab} ${activeMobileTab === 'pend' ? styles.active : ''}`} onClick={() => setActiveMobileTab('pend')}>
                                    <div className={`${local.bctDot} ${local.pend}`} style={{ display: 'inline-block', marginRight: '6px' }}></div>
                                    Chờ Xử Lý
                                    <span className={local.mobileTabCount} style={{ marginLeft: '8px' }}>{filteredPending.length}</span>
                                </button>
                                <button className={`${styles.tab} ${activeMobileTab === 'appr' ? styles.active : ''}`} onClick={() => setActiveMobileTab('appr')}>
                                    <div className={`${local.bctDot} ${local.appr}`} style={{ display: 'inline-block', marginRight: '6px' }}></div>
                                    Đã Duyệt
                                    <span className={local.mobileTabCount} style={{ marginLeft: '8px' }}>{filteredApproved.length}</span>
                                </button>
                                <button className={`${styles.tab} ${activeMobileTab === 'rej' ? styles.active : ''}`} onClick={() => setActiveMobileTab('rej')}>
                                    <div className={`${local.bctDot} ${local.rej}`} style={{ display: 'inline-block', marginRight: '6px' }}></div>
                                    Từ Chối
                                    <span className={local.mobileTabCount} style={{ marginLeft: '8px' }}>{filteredRejected.length}</span>
                                </button>
                            </div>

                            <div className={`${local.inv_scrollCardsContainer} ${styles.scrollableSection}`}>
                                {isLoadingProjects ? (
                                    <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
                                        <Loader2 size={24} className="animate-spin" style={{ color: 'var(--text-secondary)' }} />
                                    </div>
                                ) : (
                                    (() => {
                                        let listToShow = [];
                                        if (activeMobileTab === 'pend') listToShow = filteredPending;
                                        else if (activeMobileTab === 'appr') listToShow = filteredApproved;
                                        else if (activeMobileTab === 'rej') listToShow = filteredRejected;
                                        else listToShow = [...filteredPending, ...filteredApproved, ...filteredRejected].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

                                        if (listToShow.length === 0) {
                                            return (
                                                <EmptyState
                                                    icon={Archive}
                                                    title="Trống"
                                                    message={searchTerm ? 'Không tìm thấy kết quả phù hợp với tìm kiếm của bạn' : 'Hiện chưa có dự án nào trong danh mục này'}
                                                />
                                            );
                                        }

                                        return (
                                            <div className={styles.sectionGrid} style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
                                                {listToShow.map(project => (
                                                    <ProjectKanbanCard
                                                        key={project.projectId}
                                                        project={project}
                                                        status={project.status === 'Approved' ? 'appr' : (project.status === 'Rejected' ? 'rej' : 'pend')}
                                                        onDetail={() => openDetailModal(project)}
                                                        onApprove={() => handleApproveProject(project.projectId)}
                                                        onReject={() => handleRejectProject(project.projectId)}
                                                        processingProjectId={processingProjectId}
                                                        processingAction={processingAction}
                                                    />
                                                ))}
                                            </div>
                                        );
                                    })()
                                )}
                            </div>
                        </div>
                    )}

                    {/* Investor Approval Section */}
                    {activeSection === 'investor_approval' && (
                        <div className={styles.section} style={{ flex: 1, minHeight: 0, paddingBottom: 0 }}>
                            {/* Tab Switcher - Same as Booking */}
                            <div className={styles.tabs} style={{ margin: '0 -24px 0 -24px', padding: '0 24px', overflowX: 'auto', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '8px' }}>
                                <button className={`${styles.tab} ${activeMobileInvTab === 'all' ? styles.active : ''}`} onClick={() => setActiveMobileInvTab('all')}>
                                    Tất cả
                                    <span className={local.mobileTabCount} style={{ marginLeft: '8px' }}>{pendingInvestors.length + approvedInvestors.length + rejectedInvestors.length}</span>
                                </button>
                                <button className={`${styles.tab} ${activeMobileInvTab === 'pend' ? styles.active : ''}`} onClick={() => setActiveMobileInvTab('pend')}>
                                    <div className={`${local.bctDot} ${local.pend}`} style={{ display: 'inline-block', marginRight: '6px' }}></div>
                                    Chờ Duyệt
                                    <span className={local.mobileTabCount} style={{ marginLeft: '8px' }}>{pendingInvestors.length}</span>
                                </button>
                                <button className={`${styles.tab} ${activeMobileInvTab === 'apr' ? styles.active : ''}`} onClick={() => setActiveMobileInvTab('apr')}>
                                    <div className={`${local.bctDot} ${local.inv_dot_apr}`} style={{ display: 'inline-block', marginRight: '6px' }}></div>
                                    Đã Duyệt
                                    <span className={local.mobileTabCount} style={{ marginLeft: '8px' }}>{approvedInvestors.length}</span>
                                </button>
                                <button className={`${styles.tab} ${activeMobileInvTab === 'rej' ? styles.active : ''}`} onClick={() => setActiveMobileInvTab('rej')}>
                                    <div className={`${local.bctDot} ${local.rej}`} style={{ display: 'inline-block', marginRight: '6px' }}></div>
                                    Từ Chối
                                    <span className={local.mobileTabCount} style={{ marginLeft: '8px' }}>{rejectedInvestors.length}</span>
                                </button>
                            </div>

                            <div className={`${local.inv_scrollCardsContainer} ${styles.scrollableSection}`}>
                                {isLoadingInvestors ? (
                                    <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
                                        <Loader2 size={24} className="animate-spin" style={{ color: 'var(--text-secondary)' }} />
                                    </div>
                                ) : (
                                    (() => {
                                        let listToShow = [];
                                        if (activeMobileInvTab === 'pend') listToShow = pendingInvestors;
                                        else if (activeMobileInvTab === 'apr') listToShow = approvedInvestors;
                                        else if (activeMobileInvTab === 'rej') listToShow = rejectedInvestors;
                                        else listToShow = [...pendingInvestors, ...approvedInvestors, ...rejectedInvestors].sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));

                                        if (listToShow.length === 0) {
                                            return (
                                                <EmptyState
                                                    icon={Archive}
                                                    title="Trống"
                                                    message="Hiện chưa có nhà đầu tư nào trong danh mục này"
                                                />
                                            );
                                        }

                                        return (
                                            <div className={styles.sectionGrid} style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
                                                {listToShow.map(i => (
                                                    <InvestorKanbanCard
                                                        key={i.investorId}
                                                        investor={i}
                                                        status={(i.status || i.approvalStatus) === 'Approved' ? 'apr' : ((i.status || i.approvalStatus) === 'Rejected' ? 'rej' : 'pend')}
                                                        onDetail={(inv) => {
                                                            setSelectedInvestor(inv);
                                                            setShowInvestorDetailModal(true);
                                                        }}
                                                        onApprove={handleApproveInvestor}
                                                        onReject={(inv) => {
                                                            setSelectedInvestor(inv);
                                                            setShowInvestorRejectModal(true);
                                                        }}
                                                        processingId={processingInvestorId}
                                                        processingAction={investorAction}
                                                    />
                                                ))}
                                            </div>
                                        );
                                    })()
                                )}
                            </div>
                        </div>
                    )}

                    {/* PR Management Section */}
                    {activeSection === 'pr_management' && (
                        <div className={styles.section} style={{ background: 'transparent', boxShadow: 'none', padding: 0, margin: '-24px', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                            {/* Sleek Subtab Switcher */}
                            <div className={styles.tabs} style={{ marginBottom: '0px' }}>
                                <button
                                    className={`${styles.tab} ${activePRTab === 'posting' ? styles.active : ''}`}
                                    onClick={() => setActivePRTab('posting')}
                                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                >
                                    Đăng bài PR
                                </button>
                                <button
                                    className={`${styles.tab} ${activePRTab === 'news' ? styles.active : ''}`}
                                    onClick={() => setActivePRTab('news')}
                                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                                >
                                    Tin tức
                                    {prNewsList.length > 0 && <span className={local.newsCountBadge}>{prNewsList.length}</span>}
                                </button>
                            </div>

                            {activePRTab === 'posting' && (
                                <div style={{ flex: 1, overflowY: 'auto', padding: '0 24px 100px 24px', minHeight: 0 }}>
                                    {/* Header Stats */}
                                    <div className={styles.card} style={{ marginBottom: '24px', display: 'flex', gap: '24px', flexWrap: 'wrap', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <Newspaper size={24} color="var(--primary-blue)" />
                                            <div>
                                                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase' }}>Dự án đã ký</div>
                                                <div style={{ fontSize: '28px', fontWeight: '800', color: 'var(--text-primary)' }}>{signedDeals.length}</div>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <CheckCircle size={24} color="#10b981" />
                                            <div>
                                                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase' }}>Sẵn sàng PR</div>
                                                <div style={{ fontSize: '28px', fontWeight: '800', color: '#10b981' }}>
                                                    {signedDeals.filter(d => d.project).length}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Error State */}
                                    {signedDealsError && (
                                        <div className={local.errorWrapper} style={{ marginBottom: '20px' }}>
                                            <EmptyState
                                                icon={AlertCircle}
                                                title="Lỗi tải dữ liệu"
                                                message={signedDealsError}
                                                isError={true}
                                                onRetry={fetchSignedDeals}
                                            />
                                        </div>
                                    )}

                                    {/* Empty State */}
                                    {!isLoadingSignedDeals && signedDeals.length === 0 && (
                                        <EmptyState
                                            icon={Archive}
                                            title="Trống"
                                            message="Hiện chưa có dự án nào ký hợp đồng đầu tư thành công để đăng PR."
                                        />
                                    )}

                                    {/* Loading State */}
                                    {isLoadingSignedDeals && (
                                        <div className={styles.card}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px', gap: '12px' }}>
                                                <Loader2 size={20} className="animate-spin" />
                                                <span style={{ color: 'var(--text-secondary)' }}>Đang tải dữ liệu...</span>
                                            </div>
                                        </div>
                                    )}

                                    {/* Empty State */}
                                    {!isLoadingSignedDeals && signedDeals.length === 0 && (
                                        <div className={styles.card}>
                                            <EmptyState
                                                icon={Archive}
                                                title="Không có dự án"
                                                message="Hiện không có dự án nào đã ký hợp đồng thành công. Khi có dự án được ký bởi cả 2 bên, chúng sẽ xuất hiện ở đây."
                                            />
                                        </div>
                                    )}

                                    {/* Deals List */}
                                    {!isLoadingSignedDeals && signedDeals.length > 0 && (
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
                                            {signedDeals
                                                .filter(deal => {
                                                    if (!prSearchTerm.trim()) return true;
                                                    const search = prSearchTerm.toLowerCase();
                                                    return (
                                                        deal.projectName?.toLowerCase().includes(search) ||
                                                        deal.investorName?.toLowerCase().includes(search) ||
                                                        deal.dealId?.toString().includes(search)
                                                    );
                                                })
                                                .map(deal => (
                                                    <div key={deal.dealId} className={local.sleekCard}>
                                                        {/* Deal Header */}
                                                        <div className={local.sleekCardHeader}>
                                                            <div>
                                                                <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', fontWeight: '800', color: 'var(--text-primary)' }}>
                                                                    {deal.projectName || 'Dự án không tên'}
                                                                </h4>
                                                                <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)' }}>
                                                                    Deal #{deal.dealId}
                                                                </p>
                                                            </div>
                                                            <div style={{
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: '4px',
                                                                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                                                                color: '#10b981',
                                                                padding: '4px 12px',
                                                                borderRadius: '12px',
                                                                fontSize: '11px',
                                                                fontWeight: '700',
                                                                whiteSpace: 'nowrap'
                                                            }}>
                                                                <CheckCircle size={12} />
                                                                Đã ký
                                                            </div>
                                                        </div>

                                                        {/* Project Info */}
                                                        <div className={local.sleekMetaBox}>
                                                            <div className={local.sleekMetaLabel}>Tên startup</div>
                                                            <p style={{
                                                                margin: 0,
                                                                fontSize: '13px',
                                                                color: 'var(--text-primary)',
                                                                lineHeight: '1.4',
                                                                display: '-webkit-box',
                                                                WebkitLineClamp: 2,
                                                                WebkitBoxOrient: 'vertical',
                                                                overflow: 'hidden'
                                                            }}>
                                                                {deal.startupName || 'Không có tên'}
                                                            </p>
                                                        </div>

                                                        {/* Investor & Investment Info */}
                                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                                            <div>
                                                                <div className={local.sleekMetaLabel}>Nhà đầu tư</div>
                                                                <div className={local.sleekMetaValue} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                    {deal.investorName || 'N/A'}
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <div className={local.sleekMetaLabel}>Số tiền</div>
                                                                <div className={local.sleekMetaValue}>
                                                                    {deal.amount ? `${Number(deal.amount).toLocaleString('vi-VN')}` : 'N/A'} <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>VND</span>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Dates */}
                                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', paddingTop: '12px', borderTop: '1px solid var(--border-color)' }}>
                                                            <div>
                                                                <div className={local.sleekMetaLabel}>Ngày tạo</div>
                                                                <div className={local.sleekMetaValue}>
                                                                    {deal.dealDate ? new Date(deal.dealDate).toLocaleDateString('vi-VN') : 'N/A'}
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <div className={local.sleekMetaLabel}>Ngày ký</div>
                                                                <div className={local.sleekMetaValue}>
                                                                    {deal.startupSignedAt ? new Date(deal.startupSignedAt).toLocaleDateString('vi-VN') : 'Vừa xong'}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Action Button - PR Posting */}
                                                        <div style={{ marginTop: '4px' }}>
                                                            <button
                                                                className={`${local.sleekButton} ${local.sleekButtonPrimary}`}
                                                                style={{ width: '100%' }}
                                                                onClick={() => {
                                                                    setSelectedDealForPR(deal);
                                                                    setPrFormData({ title: '', content: '' });
                                                                    setShowPRModal(true);
                                                                }}
                                                                disabled={isSubmittingPR || processingDealId === deal.dealId}
                                                            >
                                                                {processingDealId === deal.dealId ? (
                                                                    <>
                                                                        <Loader2 size={16} className="animate-spin" />
                                                                        Đang xử lý...
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <Send size={16} />
                                                                        Đăng PR
                                                                    </>
                                                                )}
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* News Section */}
                            {activePRTab === 'news' && (
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                                    <div style={{ flex: 1, overflowY: 'auto', padding: '0 24px 100px 24px', minHeight: 0 }}>
                                        {/* News Header Stats */}
                                        <div className={styles.card} style={{ marginBottom: '24px', display: 'flex', gap: '24px', flexWrap: 'wrap', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <Newspaper size={24} color="var(--primary-blue)" />
                                                <div>
                                                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase' }}>Tổng PR được đăng</div>
                                                    <div style={{ fontSize: '28px', fontWeight: '800', color: 'var(--text-primary)' }}>{prNewsList.length}</div>
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <CheckCircle size={24} color="#10b981" />
                                                <div>
                                                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase' }}>Đã xuất bản</div>
                                                    <div style={{ fontSize: '28px', fontWeight: '800', color: '#10b981' }}>
                                                        {prNewsList.filter(pr => pr.publishedAt).length}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Error State */}
                                        {prNewsError && (
                                            <div className={local.errorWrapper} style={{ marginBottom: '20px' }}>
                                                <EmptyState
                                                    icon={AlertCircle}
                                                    title="Lỗi tải dữ liệu"
                                                    message={prNewsError}
                                                    isError={true}
                                                    onRetry={fetchPRNews}
                                                />
                                            </div>
                                        )}

                                        {/* Loading State */}
                                        {isLoadingPRNews && (
                                            <div className={styles.card}>
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px', gap: '12px' }}>
                                                    <Loader2 size={20} className="animate-spin" />
                                                    <span style={{ color: 'var(--text-secondary)' }}>Đang tải dữ liệu...</span>
                                                </div>
                                            </div>
                                        )}

                                        {/* Empty State */}
                                        {!isLoadingPRNews && prNewsList.length === 0 && (
                                            <EmptyState
                                                icon={Archive}
                                                title="Chưa có PR được đăng"
                                                message="Hiện chưa có bài PR nào được đăng. Hãy đăng bài PR từ tab 'Đăng bài PR'."
                                            />
                                        )}

                                        {/* PR News List */}
                                        {!isLoadingPRNews && prNewsList.length > 0 && (
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
                                                {prNewsList
                                                    .filter(pr => {
                                                        if (!prNewsSearchTerm.trim()) return true;
                                                        const search = prNewsSearchTerm.toLowerCase();
                                                        return (
                                                            pr.title?.toLowerCase().includes(search) ||
                                                            pr.content?.toLowerCase().includes(search) ||
                                                            pr.projectName?.toLowerCase().includes(search) ||
                                                            pr.investorName?.toLowerCase().includes(search)
                                                        );
                                                    })
                                                    .map(pr => (
                                                        <div key={pr.postPrId} className={local.sleekCard}>
                                                            {/* PR Image */}
                                                            {pr.projectImage ? (
                                                                <img
                                                                    src={pr.projectImage}
                                                                    alt={pr.projectName}
                                                                    style={{ width: '100%', height: '180px', objectFit: 'cover', borderRadius: '8px', marginBottom: '12px' }}
                                                                />
                                                            ) : (
                                                                <div style={{ width: '100%', height: '180px', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: '13px', border: '1px dashed var(--border-color)', marginBottom: '12px' }}>
                                                                    Chưa có hình ảnh
                                                                </div>
                                                            )}

                                                            <div className={local.sleekCardHeader}>
                                                                <div style={{ flex: 1 }}>
                                                                    <h4 className={local.sleekCardTitle} style={{ minHeight: '40px' }}>{pr.title}</h4>
                                                                    <p className={local.sleekCardSubtitle}>{pr.projectName}</p>
                                                                </div>
                                                                <div className={`${local.sleekBadge} ${pr.status === 'Pending' ? local.sleekBadgeWarning : local.sleekBadgeSuccess}`}>
                                                                    {pr.status === 'Pending' ? 'Chờ duyệt' : 'Đã đăng'}
                                                                </div>
                                                            </div>

                                                            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '12px 0', lineHeight: '1.5', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', height: '60px' }}>
                                                                {pr.content}
                                                            </p>

                                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', paddingTop: '12px', borderTop: '1px solid var(--border-color)' }}>
                                                                <div>
                                                                    <div className={local.sleekMetaLabel}>Startup</div>
                                                                    <div className={local.sleekMetaValue}>{pr.startupName}</div>
                                                                </div>
                                                                <div>
                                                                    <div className={local.sleekMetaLabel}>Nhà đầu tư</div>
                                                                    <div className={local.sleekMetaValue}>{pr.investorName}</div>
                                                                </div>
                                                                <div style={{ gridColumn: '1 / -1', marginTop: '12px', display: 'flex', gap: '8px' }}>
                                                                    <button onClick={() => handleOpenEditPR(pr)} className={`${local.sleekButton} ${local.sleekButtonOutline}`} style={{ flex: 1 }}>
                                                                        <Edit2 size={14} /> Sửa
                                                                    </button>
                                                                    <button
                                                                        onClick={() => {
                                                                            setSelectedPRForDelete(pr);
                                                                            setShowDeletePRModal(true);
                                                                        }}
                                                                        disabled={processingPRId === pr.postPrId}
                                                                        className={`${local.sleekButton} ${local.sleekButtonDanger}`}
                                                                        style={{ flex: 1 }}
                                                                    >
                                                                        {processingPRId === pr.postPrId ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />} Xóa
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}


                    {/* Booking Management Section */}
                    {activeSection === 'bookings' && (
                        <div className={styles.section} style={{ flex: 1, minHeight: 0, paddingBottom: 0 }}>
                            <div className={styles.tabs} style={{ margin: '0 -24px 0 -24px', padding: '0 24px', overflowX: 'auto', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '8px' }}>
                                <button className={`${styles.tab} ${activeMobileBookingTab === 'all' ? styles.active : ''}`} onClick={() => setActiveMobileBookingTab('all')}>
                                    Tất cả
                                    <span className={local.mobileTabCount} style={{ marginLeft: '8px' }}>{filterBookings(allBookings).length}</span>
                                </button>
                                <button className={`${styles.tab} ${activeMobileBookingTab === 'pend' ? styles.active : ''}`} onClick={() => setActiveMobileBookingTab('pend')}>
                                    <div className={`${local.bctDot} ${local.pend}`} style={{ display: 'inline-block', marginRight: '6px' }}></div>
                                    Chờ xác nhận
                                    <span className={local.mobileTabCount} style={{ marginLeft: '8px' }}>{pendingBookingsList.length}</span>
                                </button>
                                <button className={`${styles.tab} ${activeMobileBookingTab === 'pay' ? styles.active : ''}`} onClick={() => setActiveMobileBookingTab('pay')}>
                                    <div className={`${local.bctDot}`} style={{ display: 'inline-block', marginRight: '6px', backgroundColor: '#f59e0b', width: '8px', height: '8px', borderRadius: '50%' }}></div>
                                    Chờ thanh toán
                                    <span className={local.mobileTabCount} style={{ marginLeft: '8px' }}>{awaitingPaymentBookingsList.length}</span>
                                </button>
                                <button className={`${styles.tab} ${activeMobileBookingTab === 'conf' ? styles.active : ''}`} onClick={() => setActiveMobileBookingTab('conf')}>
                                    <div className={`${local.bctDot} ${local.conf}`} style={{ display: 'inline-block', marginRight: '6px' }}></div>
                                    Đã xác nhận
                                    <span className={local.mobileTabCount} style={{ marginLeft: '8px' }}>{confirmedBookingsList.length}</span>
                                </button>
                                <button className={`${styles.tab} ${activeMobileBookingTab === 'comp' ? styles.active : ''}`} onClick={() => setActiveMobileBookingTab('comp')}>
                                    <div className={`${local.bctDot} ${local.comp}`} style={{ display: 'inline-block', marginRight: '6px' }}></div>
                                    Hoàn thành
                                    <span className={local.mobileTabCount} style={{ marginLeft: '8px' }}>{completedBookingsList.length}</span>
                                </button>
                                <button className={`${styles.tab} ${activeMobileBookingTab === 'complaint' ? styles.active : ''}`} onClick={() => setActiveMobileBookingTab('complaint')}>
                                    <div className={`${local.bctDot} ${local.complaint}`} style={{ display: 'inline-block', marginRight: '6px' }}></div>
                                    Khiếu nại
                                    <span className={local.mobileTabCount} style={{ marginLeft: '8px' }}>{complaintBookingsList.length}</span>
                                </button>
                                <button className={`${styles.tab} ${activeMobileBookingTab === 'canc' ? styles.active : ''}`} onClick={() => setActiveMobileBookingTab('canc')}>
                                    <div className={`${local.bctDot} ${local.rej}`} style={{ display: 'inline-block', marginRight: '6px' }}></div>
                                    Đã hủy
                                    <span className={local.mobileTabCount} style={{ marginLeft: '8px' }}>{cancelledBookingsList.length}</span>
                                </button>
                            </div>

                            {bookingsError ? (
                                <div className={local.errorWrapper}>
                                    <EmptyState
                                        icon={AlertCircle}
                                        title="Lỗi tải dữ liệu"
                                        message={bookingsError}
                                        isError={true}
                                        onRetry={() => {
                                            setBookingsError(null);
                                            fetchBookings();
                                        }}
                                    />
                                </div>
                            ) : (
                                <div
                                    id="bookingScrollContainer"
                                    className={styles.scrollableSection}
                                    style={{
                                        paddingRight: '4px',
                                        WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black calc(100% - 32px), transparent 100%)',
                                        maskImage: 'linear-gradient(to bottom, black 0%, black calc(100% - 32px), transparent 100%)',
                                    }}
                                >
                                    {isLoadingBookings ? (
                                        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
                                            <Loader2 size={24} className="animate-spin" style={{ color: 'var(--text-secondary)' }} />
                                        </div>
                                    ) : (
                                        (() => {
                                            const baseList = activeMobileBookingTab === 'pend' ? pendingBookingsList :
                                                activeMobileBookingTab === 'pay' ? awaitingPaymentBookingsList :
                                                    activeMobileBookingTab === 'conf' ? confirmedBookingsList :
                                                        activeMobileBookingTab === 'comp' ? completedBookingsList :
                                                            activeMobileBookingTab === 'complaint' ? complaintBookingsList :
                                                                activeMobileBookingTab === 'canc' ? cancelledBookingsList :
                                                                    filterBookings(allBookings);

                                            const activeList = [...baseList].sort((a, b) => {
                                                const dateB = new Date(b.updatedAt || b.createdAt || b.startTime || 0);
                                                const dateA = new Date(a.updatedAt || a.createdAt || a.startTime || 0);
                                                return dateB - dateA;
                                            });

                                            if (activeList.length === 0) {
                                                return (
                                                    <div style={{ gridColumn: '1 / -1' }}>
                                                        <EmptyState
                                                            icon={Calendar}
                                                            title="Trống"
                                                            message={bookingSearchTerm ? 'Không tìm thấy kết quả phù hợp với tìm kiếm của bạn' : 'Hiện chưa có yêu cầu booking nào được ghi nhận'}
                                                        />
                                                    </div>
                                                );
                                            }

                                            return (
                                                <div className={styles.sectionGrid} style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
                                                    {activeList.map(booking => (
                                                        <BookingKanbanCard
                                                            key={booking.id}
                                                            booking={booking}
                                                            status={booking.status}
                                                            onDetail={() => handleViewBookingDetails(booking.id)}
                                                        />
                                                    ))}
                                                </div>
                                            );
                                        })()
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Startup Approvals Section */}
                    {activeSection === 'approvals' && (
                        <div className={styles.section} style={{ flex: 1, minHeight: 0, paddingBottom: 0 }}>
                            {/* Tab Switcher */}
                            <div className={styles.tabs} style={{ margin: '0 -24px 0 -24px', padding: '0 24px', overflowX: 'auto', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '8px' }}>
                                <button className={`${styles.tab} ${activeMobileStartupTab === 'all' ? styles.active : ''}`} onClick={() => setActiveMobileStartupTab('all')}>
                                    Tất cả
                                    <span className={local.mobileTabCount} style={{ marginLeft: '8px' }}>{pendingStartups.length + approvedStartups.length + rejectedStartups.length}</span>
                                </button>
                                <button className={`${styles.tab} ${activeMobileStartupTab === 'pend' ? styles.active : ''}`} onClick={() => setActiveMobileStartupTab('pend')}>
                                    <div className={`${local.bctDot} ${local.pend}`} style={{ display: 'inline-block', marginRight: '6px' }}></div>
                                    Chờ Duyệt
                                    <span className={local.mobileTabCount} style={{ marginLeft: '8px' }}>{pendingStartups.length}</span>
                                </button>
                                <button className={`${styles.tab} ${activeMobileStartupTab === 'appr' ? styles.active : ''}`} onClick={() => setActiveMobileStartupTab('appr')}>
                                    <div className={`${local.bctDot} ${local.appr}`} style={{ display: 'inline-block', marginRight: '6px' }}></div>
                                    Đã Duyệt
                                    <span className={local.mobileTabCount} style={{ marginLeft: '8px' }}>{approvedStartups.length}</span>
                                </button>
                                <button className={`${styles.tab} ${activeMobileStartupTab === 'rej' ? styles.active : ''}`} onClick={() => setActiveMobileStartupTab('rej')}>
                                    <div className={`${local.bctDot} ${local.rej}`} style={{ display: 'inline-block', marginRight: '6px' }}></div>
                                    Từ Chối
                                    <span className={local.mobileTabCount} style={{ marginLeft: '8px' }}>{rejectedStartups.length}</span>
                                </button>
                            </div>

                            <div className={`${local.inv_scrollCardsContainer} ${styles.scrollableSection}`}>
                                {isLoadingStartups ? (
                                    <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
                                        <Loader2 size={24} className="animate-spin" style={{ color: 'var(--text-secondary)' }} />
                                    </div>
                                ) : (
                                    (() => {
                                        let listToShow = [];
                                        if (activeMobileStartupTab === 'pend') listToShow = pendingStartups;
                                        else if (activeMobileStartupTab === 'appr') listToShow = approvedStartups;
                                        else if (activeMobileStartupTab === 'rej') listToShow = rejectedStartups;
                                        else listToShow = [...pendingStartups, ...approvedStartups, ...rejectedStartups].sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));

                                        if (listToShow.length === 0) {
                                            return (
                                                <EmptyState
                                                    icon={Shield}
                                                    title="Trống"
                                                    message="Hiện chưa có startup nào trong danh mục này"
                                                />
                                            );
                                        }

                                        return (
                                            <div className={styles.sectionGrid} style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
                                                {listToShow.map(s => (
                                                    <StartupApprovalCard
                                                        key={s.id}
                                                        startup={s}
                                                        status={(s.status || s.approvalStatus) === 'Approved' ? 'appr' : ((s.status || s.approvalStatus) === 'Rejected' ? 'rej' : 'pend')}
                                                        onDetail={openStartupDetail}
                                                        onApprove={handleApproveStartup}
                                                        onReject={handleRejectStartup}
                                                        isProcessing={processingProjectId === s.id}
                                                        processingAction={processingAction}
                                                        isAnyProcessing={!!processingProjectId}
                                                    />
                                                ))}
                                            </div>
                                        );
                                    })()
                                )}
                            </div>
                        </div>
                    )}

                    {/* User Reports Section */}
                    {activeSection === 'user_reports' && (
                        <div className={styles.section} style={{ background: 'transparent', boxShadow: 'none', padding: 0, flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                            <div style={{ display: 'flex', background: 'var(--bg-secondary)', padding: '4px', borderRadius: '12px', border: '1px solid var(--border-color)', width: 'fit-content', marginBottom: '12px' }}>
                                {[
                                    { id: 'All', label: 'Tất cả' },
                                    { id: 'Pending', label: 'Chờ xử lý' },
                                    { id: 'Resolved', label: 'Đã duyệt' },
                                    { id: 'Dismissed', label: 'Từ chối' }
                                ].map(tab => {
                                    const count = tab.id === 'All'
                                        ? (userReports?.length || 0)
                                        : (userReports?.filter(r => r.status === tab.id).length || 0);

                                    const isActive = reportFilter === tab.id;

                                    return (
                                        <button
                                            key={tab.id}
                                            onClick={() => setReportFilter(tab.id)}
                                            style={{
                                                padding: '8px 16px',
                                                borderRadius: '8px',
                                                border: 'none',
                                                background: isActive ? 'var(--bg-primary)' : 'transparent',
                                                color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                                                fontWeight: isActive ? '800' : '500',
                                                cursor: 'pointer',
                                                boxShadow: isActive ? '0 2px 8px rgba(0,0,0,0.1)' : 'none',
                                                transition: 'all 0.2s',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px'
                                            }}
                                        >
                                            {tab.label}
                                            {count > 0 && (
                                                <span style={{
                                                    fontSize: '10px',
                                                    fontWeight: '800',
                                                    padding: '1px 6px',
                                                    borderRadius: '6px',
                                                    background: isActive ? 'var(--primary-blue)' : 'rgba(255,255,255,0.08)',
                                                    color: isActive ? 'white' : 'var(--text-secondary)',
                                                    transition: 'all 0.2s'
                                                }}>
                                                    {count}
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>

                            <div className={styles.scrollableSection} style={{ paddingRight: '4px' }}>
                                {isLoadingUserReports ? (
                                    <div style={{ padding: '60px', textAlign: 'center' }}>
                                        <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto 16px', color: 'var(--primary-blue)' }} />
                                        <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Đang tải danh sách báo cáo...</p>
                                    </div>
                                ) : (userReportsError || !Array.isArray(userReports)) ? (
                                    <div style={{ padding: '60px' }}>
                                        <EmptyState icon={AlertCircle} title="Lỗi" message={userReportsError || "Không thể tải danh sách báo cáo"} onRetry={fetchUserReports} isError />
                                    </div>
                                ) : filteredUserReports.length === 0 ? (
                                    <div style={{ padding: '60px' }}>
                                        <EmptyState
                                            icon={searchTerm ? Search : Shield}
                                            title={searchTerm ? "Không tìm thấy" : "Trống"}
                                            message={searchTerm ? `Không tìm thấy báo cáo nào khớp với "${searchTerm}"` : "Hiện không có báo cáo vi phạm nào trong danh mục này."}
                                        />
                                    </div>
                                ) : (
                                    <div className={local.reportGrid}>
                                        {filteredUserReports.map(report => (
                                            <div key={report.userReportId} id={`report-card-${report.userReportId}`}>
                                                <UserReportCard
                                                    report={report}
                                                    onResolve={(id, isValid) => {
                                                        setSelectedReportForResolve(report);
                                                        setIsResolveValid(isValid);
                                                        setReportResolveNote('');
                                                        setShowReportResolveModal(true);
                                                    }}
                                                    onViewBooking={handleViewBookingDetails}
                                                    isProcessing={processingProjectId === report.userReportId}
                                                    isLoadingBooking={fetchingBookingId === report.bookingId}
                                                />

                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Advisor Approvals Section */}
                    {activeSection === 'advisor_approval' && (
                        <div className={`${styles.section} ${styles.scrollableSection}`}>
                            <AdvisorApprovalPage user={user} searchTerm={advisorSearchTerm} />
                        </div>
                    )}


                    {activeSection === 'package_management' && (
                        <div className={styles.section} style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
                            <PackageManagement searchTerm={subscriptionSearchTerm} />
                        </div>
                    )}

                    {activeSection === 'subscription_history' && (
                        <div className={styles.section} style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
                            <GlobalSubscriptionHistory searchTerm={subscriptionSearchTerm} />
                        </div>
                    )}

                    {activeSection === 'account_profile' && (
                        <div className={styles.section} style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
                            <AccountProfileTab user={user} onLogout={onLogout} />
                        </div>
                    )}

                </div>
            )}

            {/* Startup Detail Modal */}
            <StartupDetailModal 
                isOpen={showStartupDetailModal}
                onClose={() => setShowStartupDetailModal(false)}
                startup={selectedStartupForDetail}
                onApprove={handleApproveStartup}
                onReject={handleRejectStartup}
                isProcessing={!!processingProjectId}
                processingAction={processingAction}
            />

            {/* PR Posting Modal */}
            {showPRModal && selectedDealForPR && (
                <div className={styles.modalOverlay} onClick={(e) => e.target === e.currentTarget && setShowPRModal(false)}>
                    <div className={styles.modalContent} style={{ maxWidth: '600px', width: '92%', height: 'auto', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
                        <div className={local.staffModalHeader}>
                            <div className={local.staffModalTitleGrp}>
                                <PenTool size={20} color="var(--text-primary)" />
                                <h2 className={local.staffModalTitleText}>Đăng bài PR - {selectedDealForPR.projectName}</h2>
                            </div>
                            <button
                                onClick={() => setShowPRModal(false)}
                                className={local.staffModalCloseBtn}
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <div style={{ padding: '24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            {/* Deal Information Summary */}
                            <div style={{
                                backgroundColor: 'var(--bg-secondary)',
                                padding: '16px',
                                borderRadius: '8px',
                                border: '1px solid var(--border-color)'
                            }}>
                                <h3 style={{ margin: '0 0 16px 0', fontSize: '14px', fontWeight: '800', color: 'var(--text-primary)', textTransform: 'uppercase' }}>
                                    Thông tin deal
                                </h3>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '13px' }}>
                                    <div>
                                        <div className={local.sleekMetaLabel}>Dự án</div>
                                        <div style={{ color: 'var(--text-primary)', fontWeight: '600' }}>{selectedDealForPR.projectName}</div>
                                    </div>

                                    <div>
                                        <div className={local.sleekMetaLabel}>Startup</div>
                                        <div style={{ color: 'var(--text-primary)', fontWeight: '600' }}>{selectedDealForPR.startupName}</div>
                                    </div>

                                    <div>
                                        <div className={local.sleekMetaLabel}>Nhà đầu tư</div>
                                        <div style={{ color: 'var(--text-primary)', fontWeight: '600' }}>{selectedDealForPR.investorName}</div>
                                    </div>

                                    <div>
                                        <div className={local.sleekMetaLabel}>Số tiền đầu tư</div>
                                        <div style={{ color: 'var(--text-primary)', fontWeight: '700' }}>
                                            {selectedDealForPR.amount ? `${Number(selectedDealForPR.amount).toLocaleString('vi-VN')} VND` : 'N/A'}
                                        </div>
                                    </div>

                                    <div>
                                        <div className={local.sleekMetaLabel}>Cổ phần</div>
                                        <div style={{ color: 'var(--text-primary)', fontWeight: '600' }}>
                                            {selectedDealForPR.equityPercentage ? `${selectedDealForPR.equityPercentage}%` : 'N/A'}
                                        </div>
                                    </div>

                                    <div>
                                        <div className={local.sleekMetaLabel}>Ngày ký</div>
                                        <div style={{ color: 'var(--text-primary)', fontWeight: '600' }}>
                                            {selectedDealForPR.startupSignedAt ? new Date(selectedDealForPR.startupSignedAt).toLocaleDateString('vi-VN') : 'N/A'}
                                        </div>
                                    </div>

                                    <div style={{ gridColumn: '1 / -1' }}>
                                        <div className={local.sleekMetaLabel}>Điều khoản bổ sung</div>
                                        <div style={{ color: 'var(--text-primary)', fontSize: '12px' }}>
                                            {selectedDealForPR.additionalTerms || 'Không có'}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Form Section */}
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>
                                    Tiêu đề bài viết <span style={{ color: '#ef4444' }}>*</span>
                                </label>
                                <input
                                    type="text"
                                    placeholder="Nhập tiêu đề bài PR..."
                                    value={prFormData.title}
                                    onChange={(e) => setPrFormData({ ...prFormData, title: e.target.value })}
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        backgroundColor: 'var(--bg-secondary)',
                                        border: '1px solid var(--border-color)',
                                        borderRadius: '8px',
                                        fontSize: '14px',
                                        color: 'var(--text-primary)',
                                        fontFamily: 'inherit',
                                        boxSizing: 'border-box'
                                    }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>
                                    Nội dung bài viết <span style={{ color: '#ef4444' }}>*</span>
                                </label>
                                <textarea
                                    placeholder="Nhập nội dung bài PR..."
                                    value={prFormData.content}
                                    onChange={(e) => setPrFormData({ ...prFormData, content: e.target.value })}
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        backgroundColor: 'var(--bg-secondary)',
                                        border: '1px solid var(--border-color)',
                                        borderRadius: '8px',
                                        fontSize: '14px',
                                        color: 'var(--text-primary)',
                                        fontFamily: 'inherit',
                                        minHeight: '200px',
                                        resize: 'vertical',
                                        boxSizing: 'border-box'
                                    }}
                                />
                            </div>
                        </div>

                        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', gap: '12px', backgroundColor: 'var(--bg-secondary)', borderRadius: '0 0 16px 16px' }}>
                            <button
                                onClick={() => {
                                    setShowPRModal(false);
                                    setPrFormData({ title: '', content: '' });
                                }}
                                disabled={isSubmittingPR}
                                className={`${local.sleekButton} ${local.sleekButtonOutline}`}
                            >
                                Hủy
                            </button>
                            <button
                                onClick={handleSubmitPR}
                                disabled={isSubmittingPR || !prFormData.title.trim() || !prFormData.content.trim()}
                                className={`${local.sleekButton} ${local.sleekButtonPrimary}`}
                            >
                                {isSubmittingPR ? (
                                    <>
                                        <Loader2 size={16} className="animate-spin" />
                                        Đang gửi...
                                    </>
                                ) : (
                                    <>
                                        <Send size={16} />
                                        Đăng bài PR
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete PR Confirmation Modal */}
            {showDeletePRModal && selectedPRForDelete && (
                <div className={styles.modalOverlay} onClick={(e) => e.target === e.currentTarget && setShowDeletePRModal(false)}>
                    <div className={styles.modalContent} style={{ maxWidth: '500px', width: '90%', height: 'auto', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
                        <div className={local.staffModalHeader}>
                            <div className={local.staffModalTitleGrp}>
                                <Trash2 size={20} color="#ef4444" />
                                <h2 className={local.staffModalTitleText} style={{ color: '#ef4444' }}>Xóa bài PR</h2>
                            </div>
                            <button
                                onClick={() => {
                                    setShowDeletePRModal(false);
                                    setSelectedPRForDelete(null);
                                }}
                                className={local.staffModalCloseBtn}
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <div style={{ padding: '24px', overflowY: 'auto', textAlign: 'center', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                            <div style={{ alignSelf: 'center', display: 'inline-flex', padding: '16px', backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: '50%', marginBottom: '16px' }}>
                                <Trash2 size={48} color="#ef4444" />
                            </div>
                            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '15px', lineHeight: '1.5' }}>
                                Bạn có chắc muốn xóa bài PR <strong style={{ color: 'var(--text-primary)' }}>"{selectedPRForDelete.title}"</strong>? Hành động này không thể hoàn tác.
                            </p>
                        </div>

                        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', gap: '12px', backgroundColor: 'var(--bg-secondary)', borderRadius: '0 0 16px 16px' }}>
                            <button
                                onClick={() => {
                                    setShowDeletePRModal(false);
                                    setSelectedPRForDelete(null);
                                }}
                                disabled={processingPRId === selectedPRForDelete.postPrId}
                                style={{
                                    padding: '10px 24px',
                                    backgroundColor: 'transparent',
                                    color: 'var(--text-primary)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '6px',
                                    fontSize: '14px',
                                    fontWeight: '600',
                                    cursor: 'pointer'
                                }}
                            >
                                Hủy
                            </button>
                            <button
                                onClick={handleDeletePR}
                                disabled={processingPRId === selectedPRForDelete.postPrId}
                                style={{
                                    padding: '10px 24px',
                                    backgroundColor: '#ef4444',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    fontSize: '14px',
                                    fontWeight: '600',
                                    cursor: processingPRId === selectedPRForDelete.postPrId ? 'wait' : 'pointer',
                                    opacity: processingPRId === selectedPRForDelete.postPrId ? 0.7 : 1,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}
                            >
                                {processingPRId === selectedPRForDelete.postPrId ? (
                                    <>
                                        <Loader2 size={16} className="animate-spin" />
                                        Đang xóa...
                                    </>
                                ) : (
                                    <>
                                        <Trash2 size={16} />
                                        Xóa bài
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit PR Modal */}
            {showEditPRModal && selectedPRForEdit && (
                <div className={styles.modalOverlay} onClick={(e) => e.target === e.currentTarget && setShowEditPRModal(false)}>
                    <div className={styles.modalContent} style={{ maxWidth: '500px', width: '92%', height: 'auto', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
                        <div className={local.staffModalHeader}>
                            <div className={local.staffModalTitleGrp}>
                                <Edit2 size={20} color="var(--text-primary)" />
                                <h2 className={local.staffModalTitleText}>Chỉnh sửa bài PR</h2>
                            </div>
                            <button
                                onClick={() => {
                                    setShowEditPRModal(false);
                                    setSelectedPRForEdit(null);
                                    setEditTitle('');
                                    setEditContent('');
                                }}
                                className={local.staffModalCloseBtn}
                            >
                                <X size={24} />
                            </button>
                        </div>
                        <div style={{ padding: '24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>

                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>Tiêu đề</label>
                                <input
                                    type="text"
                                    value={editTitle}
                                    onChange={(e) => setEditTitle(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '10px 12px',
                                        border: '1px solid var(--border-color)',
                                        backgroundColor: 'var(--bg-secondary)',
                                        borderRadius: '6px',
                                        fontSize: '14px',
                                        color: 'var(--text-primary)',
                                        fontFamily: 'inherit',
                                        boxSizing: 'border-box'
                                    }}
                                    placeholder="Nhập tiêu đề bài PR"
                                />
                            </div>

                            <div style={{ marginBottom: '0px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>Nội dung</label>
                                <textarea
                                    value={editContent}
                                    onChange={(e) => setEditContent(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '10px 12px',
                                        border: '1px solid var(--border-color)',
                                        backgroundColor: 'var(--bg-secondary)',
                                        borderRadius: '6px',
                                        fontSize: '14px',
                                        color: 'var(--text-primary)',
                                        fontFamily: 'inherit',
                                        minHeight: '150px',
                                        boxSizing: 'border-box',
                                        resize: 'vertical'
                                    }}
                                    placeholder="Nhập nội dung bài PR"
                                />
                            </div>

                        </div>
                        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', gap: '12px', backgroundColor: 'var(--bg-secondary)', borderRadius: '0 0 16px 16px' }}>
                            <button
                                onClick={() => {
                                    setShowEditPRModal(false);
                                    setSelectedPRForEdit(null);
                                    setEditTitle('');
                                    setEditContent('');
                                }}
                                style={{
                                    padding: '10px 24px',
                                    backgroundColor: 'transparent',
                                    color: 'var(--text-primary)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '6px',
                                    fontSize: '14px',
                                    fontWeight: '600',
                                    cursor: 'pointer'
                                }}
                            >
                                Hủy
                            </button>
                            <button
                                onClick={handleSaveEditPR}
                                disabled={processingPRId === selectedPRForEdit.postPrId}
                                style={{
                                    padding: '10px 24px',
                                    backgroundColor: 'var(--primary-blue)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    fontSize: '14px',
                                    fontWeight: '600',
                                    cursor: processingPRId === selectedPRForEdit.postPrId ? 'wait' : 'pointer',
                                    opacity: processingPRId === selectedPRForEdit.postPrId ? 0.7 : 1,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}
                            >
                                {processingPRId === selectedPRForEdit.postPrId ? (
                                    <>
                                        <Loader2 size={16} className="animate-spin" />
                                        Đang lưu...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle size={16} />
                                        Lưu thay đổi
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Success/Error Modal */}
            {showModal && (
                modalType === 'success' ? (
                    <SuccessModal
                        message={modalMessage}
                        onClose={() => setShowModal(false)}
                    />
                ) : (
                    <ErrorModal
                        message={modalMessage}
                        onClose={() => setShowModal(false)}
                    />
                )
            )}

            {/* Rejection Reason Modal */}
            {showRejectionModal && selectedProject && (
                <RejectionReasonModal
                    projectName={selectedProject.projectName}
                    onSubmit={(reason) => {
                        setShowRejectionModal(false);
                        if (rejectionTarget === 'startup') {
                            handleRejectStartup(selectedProject.projectId, reason);
                        } else {
                            handleRejectProject(selectedProject.projectId, reason);
                        }
                        setRejectionTarget(null);
                    }}
                    onCancel={() => {
                        setShowRejectionModal(false);
                        setSelectedProject(null);
                    }}
                />
            )}

            {/* Project Detail Modal */}
            {showDetailModal && detailProject && (
                <div
                    className={styles.modalOverlay}
                    onClick={(e) => e.target === e.currentTarget && setShowDetailModal(false)}
                >
                    <div className={styles.modalContent} style={{ maxWidth: '1100px', width: '95%', height: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative' }}>
                        {/* Global Close button */}
                        <button
                            onClick={() => setShowDetailModal(false)}
                            style={{
                                zIndex: 1000,
                                position: 'absolute',
                                top: '16px',
                                right: '16px',
                                width: '36px',
                                height: '36px',
                                borderRadius: '50%',
                                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                                color: '#fff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                border: '1px solid rgba(255, 255, 255, 0.2)',
                                cursor: 'pointer',
                                backdropFilter: 'blur(10px)'
                            }}
                        >
                            <X size={20} />
                        </button>
                        <div className={styles.modalSplitWrapper} style={{ flex: 1, display: 'flex', overflow: 'hidden', flexDirection: isMobile ? 'column' : 'row' }}>
                            {/* --- LEFT SIDE: HERO POSTER (Desktop) --- */}
                            {detailProject.projectImageUrl && !isMobile && (
                                <div
                                    className={styles.modalSplitHero}
                                    onClick={() => setShowFullImage(true)}
                                    style={{ cursor: 'zoom-in', width: '38%', position: 'relative', overflow: 'hidden' }}
                                >
                                    <img
                                        src={detailProject.projectImageUrl}
                                        alt={detailProject.projectName}
                                        className={styles.heroPosterImage}
                                        style={{ height: '100%', width: '100%', objectFit: 'cover' }}
                                    />
                                    <div className={styles.heroPosterOverlay}>
                                        <h2 className={styles.heroPosterTitle}>{detailProject.projectName}</h2>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span
                                                className={styles.badge}
                                                style={{
                                                    backgroundColor: `${STATUS_COLORS[detailProject.status || 'Draft']}25`,
                                                    color: STATUS_COLORS[detailProject.status || 'Draft'],
                                                    border: `1px solid ${STATUS_COLORS[detailProject.status || 'Draft']}40`,
                                                }}
                                            >
                                                {STATUS_LABELS[detailProject.status || 'Draft'] || 'Bản nháp'}
                                            </span>
                                        </div>
                                    </div>
                                    <button
                                        className={styles.heroMaximizeHint}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setShowFullImage(true);
                                        }}
                                        title="Xem ảnh đầy đủ"
                                    >
                                        <Maximize2 size={24} />
                                    </button>
                                </div>
                            )}

                            {/* --- RIGHT SIDE: CONTENT (Scrollable) --- */}
                            <div className={styles.modalSplitContent} style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
                                {/* Mobile Hero Poster */}
                                {isMobile && detailProject.projectImageUrl && (
                                    <div className={styles.mobileHeroPoster} style={{ position: 'relative', flexShrink: 0 }}>
                                        <img src={detailProject.projectImageUrl} alt={detailProject.projectName} style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover' }} />
                                    </div>
                                )}


                                <div style={{ padding: '24px 32px', overflowY: 'auto', flex: 1 }}>
                                    {/* Content Header (Always Visible Title/Status) */}
                                    <div style={{ marginBottom: '28px', borderBottom: '1px solid var(--border-color)', paddingBottom: '24px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                            Dự án quản lý
                                        </div>
                                        <h2 style={{ margin: '0 0 16px 0', fontSize: '28px', fontWeight: 900, color: 'var(--text-primary)', lineHeight: '1.2' }}>
                                            {detailProject.projectName}
                                        </h2>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                                            <span
                                                className={styles.badge}
                                                style={{
                                                    backgroundColor: `${STATUS_COLORS[detailProject.status || 'Draft']}25`,
                                                    color: STATUS_COLORS[detailProject.status || 'Draft'],
                                                    padding: '4px 12px',
                                                    fontSize: '12px'
                                                }}
                                            >
                                                {STATUS_LABELS[detailProject.status || 'Draft']}
                                            </span>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 800, color: 'var(--primary-blue)', background: 'rgba(29, 155, 240, 0.08)', padding: '4px 12px', borderRadius: '8px' }}>
                                                <TrendingUp size={14} /> {getStageLabel(detailProject.developmentStage)}
                                            </div>
                                        </div>
                                    </div>

                                    {/* AI Assessment Sections (Dual Compartments) */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
                                        {/* Startup Role Side */}
                                        <div style={{ padding: '20px', backgroundColor: 'rgba(29, 155, 240, 0.03)', borderRadius: '20px', border: '1px solid rgba(29, 155, 240, 0.1)' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                                                <History size={20} color="var(--primary-blue)" />
                                                <h4 style={{ fontSize: '15px', fontWeight: '800', margin: 0 }}>Startup đánh giá qua AI</h4>
                                            </div>
                                            {isLoadingHistory ? <Loader2 className={styles.spinner} size={20} /> : (
                                                <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '4px' }}>
                                                    {analysisHistory.length > 0 ? analysisHistory.map((h, i) => (
                                                        <button key={i} onClick={() => { setSelectedHistoryResult({ data: h }); setShowHistoryView(true); }} className={styles.scoreCard} style={{ minWidth: '100px' }}>
                                                            <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>{new Date(h.createdAt || h.evaluatedAt).toLocaleDateString('vi-VN')}</div>
                                                            <div style={{ fontSize: '18px', fontWeight: '900', color: 'var(--primary-blue)' }}>{h.potentialScore || 0}<small style={{ fontSize: '10px' }}>/100</small></div>
                                                        </button>
                                                    )) : <p style={{ fontSize: '13px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>Chưa có bản phân tích nào</p>}
                                                </div>
                                            )}
                                        </div>

                                        {/* Staff Side Eligibility */}
                                        <div style={{ padding: '20px', backgroundColor: 'rgba(13, 148, 136, 0.03)', borderRadius: '20px', border: '1px solid rgba(13, 148, 136, 0.1)' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <PenTool size={20} color="#0d9488" />
                                                    <h4 style={{ fontSize: '15px', fontWeight: '800', margin: 0 }}>AI Phân tích Eligibility</h4>
                                                </div>
                                                {detailProject.status === 'Pending' && (
                                                    <button onClick={() => handleRunStaffAIEvaluation(detailProject.projectId)} disabled={isEvaluatingStaffAI} className={styles.primaryBtn} style={{ padding: '6px 16px', fontSize: '12px', background: '#0d9488', borderColor: '#0d9488' }}>
                                                        {isEvaluatingStaffAI ? <Loader2 className={styles.spinner} size={14} /> : 'Phân tích ngay'}
                                                    </button>
                                                )}
                                            </div>
                                            {isLoadingHistory ? <Loader2 className={styles.spinner} size={20} /> : (
                                                <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '4px' }}>
                                                    {staffAnalysisHistory.length > 0 ? staffAnalysisHistory.map((h, i) => {
                                                        const isEligible = h.is_eligible_startup || h.isEligibleStartup || h.data?.is_eligible_startup;
                                                        return (
                                                            <button key={i} onClick={() => { setSelectedHistoryResult({ data: h }); setShowHistoryView(true); }} className={styles.scoreCard} style={{ minWidth: '110px', borderLeft: `4px solid ${isEligible ? '#10b981' : '#ef4444'}` }}>
                                                                <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>{new Date(h.createdAt).toLocaleDateString('vi-VN')}</div>
                                                                <div style={{ color: isEligible ? '#10b981' : '#ef4444', fontWeight: '900', fontSize: '12px' }}>{isEligible ? 'ĐỦ ĐIỀU KIỆN' : 'KHÔNG ĐỦ Đ/K'}</div>
                                                            </button>
                                                        );
                                                    }) : <p style={{ fontSize: '13px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>Chưa có lịch sử đánh giá</p>}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Data Sections */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                                        {/* Section: Basic info */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                            <h4 style={{ color: 'var(--primary-blue)', fontSize: '14px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <div style={{ width: '4px', height: '16px', background: 'var(--primary-blue)', borderRadius: '2px' }} /> 1. Thông tin cốt lõi
                                            </h4>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
                                                <div className={styles.formGroup}><label style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Mô tả dự án</label><p style={{ fontSize: '15px', color: 'var(--text-primary)', lineHeight: '1.7' }}>{detailProject.shortDescription || 'Chưa cung cấp'}</p></div>
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                                    <div className={styles.formGroup}><label style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Giai đoạn dự án</label><p style={{ fontSize: '15px', fontWeight: 700, color: 'var(--primary-blue)' }}>📈 {getStageLabel(detailProject.developmentStage)}</p></div>
                                                    <div className={styles.formGroup}><label style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Lĩnh vực chính</label><p style={{ fontSize: '15px', fontWeight: 700 }}>{detailProject.industry || 'Công nghệ'}</p></div>
                                                </div>
                                                <div className={styles.formGroup}><label style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Vấn đề & Giải pháp</label><p style={{ fontSize: '15px', color: 'var(--text-primary)', lineHeight: '1.7' }}>{detailProject.problemStatement || '—'}</p><p style={{ fontSize: '15px', color: 'var(--text-primary)', lineHeight: '1.7' }}>{detailProject.solutionDescription || '—'}</p></div>
                                            </div>
                                        </div>

                                        {/* Section: Market & Model */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '32px' }}>
                                            <h4 style={{ color: 'var(--primary-blue)', fontSize: '14px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <div style={{ width: '4px', height: '16px', background: 'var(--primary-blue)', borderRadius: '2px' }} /> 2. Thị trường & Mô hình
                                            </h4>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
                                                <div className={styles.formGroup}><label style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Khách hàng mục tiêu</label><p style={{ fontSize: '14px', color: 'var(--text-primary)', lineHeight: '1.6' }}>{detailProject.targetCustomers || '—'}</p></div>
                                                <div className={styles.formGroup}><label style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Giá trị độc đáo (UVP)</label><p style={{ fontSize: '14px', color: 'var(--text-primary)', lineHeight: '1.6' }}>{detailProject.uniqueValueProposition || '—'}</p></div>
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                                    <div className={styles.formGroup}><label style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Quy mô thị trường</label><p style={{ fontSize: '15px', fontWeight: 700 }}>{detailProject.marketSize ? `${detailProject.marketSize.toLocaleString()} VND` : '—'}</p></div>
                                                    <div className={styles.formGroup}><label style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Doanh thu</label><p style={{ fontSize: '15px', fontWeight: 700 }}>{detailProject.revenue ? `${detailProject.revenue.toLocaleString()} VND` : '—'}</p></div>
                                                </div>
                                                <div className={styles.formGroup}><label style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Mô hình kinh doanh</label><p style={{ fontSize: '14px', color: 'var(--text-primary)', lineHeight: '1.6' }}>{detailProject.businessModel || '—'}</p></div>
                                            </div>
                                        </div>

                                        {/* Section: Team */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '32px' }}>
                                            <h4 style={{ color: 'var(--primary-blue)', fontSize: '14px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <div style={{ width: '4px', height: '16px', background: 'var(--primary-blue)', borderRadius: '2px' }} /> 3. Đội ngũ
                                            </h4>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
                                                <div className={styles.formGroup}><label style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Thành viên & Vai trò</label><p style={{ fontSize: '14px', color: 'var(--text-primary)', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{detailProject.teamMembers || '—'}</p></div>
                                                <div className={styles.formGroup}><label style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Kỹ năng cốt lõi</label><p style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{detailProject.keySkills || '—'}</p></div>
                                            </div>
                                        </div>

                                        {/* Section: Competition */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '32px' }}>
                                            <h4 style={{ color: 'var(--primary-blue)', fontSize: '14px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <div style={{ width: '4px', height: '16px', background: 'var(--primary-blue)', borderRadius: '2px' }} /> 4. Cạnh tranh
                                            </h4>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
                                                <div className={styles.formGroup}><label style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Kinh nghiệm đội ngũ</label><p style={{ fontSize: '14px', color: 'var(--text-primary)', lineHeight: '1.6' }}>{detailProject.teamExperience || '—'}</p></div>
                                                <div className={styles.formGroup}><label style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Cạnh tranh viên</label><p style={{ fontSize: '14px', color: 'var(--text-primary)', lineHeight: '1.6' }}>{detailProject.competitors || '—'}</p></div>
                                            </div>
                                        </div>

                                        {/* Section: Documents */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '32px' }}>
                                            <h4 style={{ color: 'var(--primary-blue)', fontSize: '14px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <FileText size={18} /> 5. Tài liệu đính kèm
                                            </h4>
                                            {isLoadingDocuments ? <Loader2 className={styles.spinner} size={24} /> : (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                    {documents.length > 0 ? documents.map((doc) => (
                                                        <div key={doc.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', background: 'var(--bg-secondary)', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', minWidth: 0 }}>
                                                                <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(29, 155, 240, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-blue)', flexShrink: 0 }}><FileText size={20} /></div>
                                                                <div style={{ overflow: 'hidden' }}>
                                                                    <div style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{doc.name}</div>
                                                                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>{doc.type.toUpperCase()} • {doc.uploadDate}</div>
                                                                </div>
                                                            </div>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                <button
                                                                    onClick={() => handleBlockchainVerification(doc.id, doc.name)}
                                                                    disabled={isLoadingBlockchain}
                                                                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '10px', background: T.blueDim, color: T.blue, fontSize: '12px', fontWeight: '800', border: '1.5px solid var(--pd-blue-dim)', cursor: isLoadingBlockchain ? 'not-allowed' : 'pointer' }}
                                                                >
                                                                    {isLoadingBlockchain ? <Loader2 size={13} className={styles.spinner} /> : <Shield size={13} />}
                                                                    Xác thực
                                                                </button>
                                                                {doc.url && <button onClick={() => window.open(doc.url, '_blank')} style={{ width: '36px', height: '36px', borderRadius: '10px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ExternalLink size={16} /></button>}
                                                            </div>
                                                        </div>
                                                    )) : <p style={{ fontSize: '13px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>Không có tài liệu đính kèm</p>}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Actions Footer */}
                                <div style={{ padding: '20px 32px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', gap: '12px', backgroundColor: 'var(--bg-secondary)', borderRadius: '0 0 16px 16px' }}>
                                    <button onClick={() => setShowDetailModal(false)} className={styles.secondaryBtn} style={{ padding: '10px 24px' }}>Đóng</button>
                                    {detailProject.status === 'Pending' && (
                                        <div style={{ display: 'flex', gap: '12px' }}>
                                            <button onClick={() => { setShowDetailModal(false); handleRejectProject(detailProject.projectId); }} className={styles.dangerBtn} style={{ padding: '10px 24px' }}>Từ chối</button>
                                            <button onClick={() => { setShowDetailModal(false); handleApproveProject(detailProject.projectId); }} className={styles.primaryBtn} style={{ padding: '10px 24px' }}>Phê duyệt</button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Booking Detail Modal */}
            {showBookingModal && selectedBooking && (
                <BookingDetailModal
                    booking={selectedBooking}
                    onClose={() => setShowBookingModal(false)}
                    userRole="Staff"
                    onAction={async (type, b) => {
                        if (type === 'viewProject') {
                            const pId = b.projectId || b.ProjectId;
                            if (pId) {
                                try {
                                    const res = await projectSubmissionService.getProjectById(pId);
                                    if (res && (res.success || res.data)) {
                                        openDetailModal(res.data || res);
                                    } else {
                                        // Fallback to local search if direct fetch fails or returns weird
                                        const localMatch = [...pendingProjects, ...approvedProjects, ...rejectedProjects]
                                            .find(p => p.projectId === pId);
                                        openDetailModal(localMatch || { projectId: pId });
                                    }
                                } catch (err) {
                                    console.error("Error fetching project for modal:", err);
                                    const localMatch = [...pendingProjects, ...approvedProjects, ...rejectedProjects]
                                        .find(p => p.projectId === pId);
                                    openDetailModal(localMatch || { projectId: pId });
                                }
                            }
                        } else if (type === 'viewComplaint') {
                            setActiveSection('user_reports');
                            setSearchTerm((b.userReportId || b.id).toString());
                            setShowBookingModal(false);
                        }
                    }}
                />
            )}

            {showHistoryView && selectedHistoryResult && (
                <AIEvaluationModal
                    isOpen={showHistoryView}
                    onCancel={() => {
                        setShowHistoryView(false);
                        setSelectedHistoryResult(null);
                    }}
                    analysisResult={selectedHistoryResult}
                    isHistoryMode={true}
                    projectName={detailProject?.projectName || 'Dự án'}
                />
            )}

            {/* Investor Reject Modal */}
            {showInvestorRejectModal && selectedInvestor && (
                <RejectionReasonModal
                    projectName={selectedInvestor.organizationName || selectedInvestor.userFullName}
                    onSubmit={(reason) => {
                        handleRejectInvestor(selectedInvestor.investorId, reason);
                    }}
                    onCancel={() => {
                        setShowInvestorRejectModal(false);
                        setSelectedInvestor(null);
                    }}
                />
            )}

            {/* Investor Detail Modal */}
            {showInvestorDetailModal && selectedInvestor && (
                <div className={styles.modalOverlay} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={(e) => e.target === e.currentTarget && setShowInvestorDetailModal(false)}>
                    <div className={`${styles.modalContent} ${local.inv_autoModalContent}`} style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        <div className={local.staffModalHeader} style={{ background: 'var(--bg-secondary)' }}>
                            <div className={local.staffModalTitleGrp}>
                                <h2 className={local.staffModalTitleText}>Chi tiết Nhà đầu tư</h2>
                                <span className={local.bookingBadgeConfirmed} style={{ background: 'rgba(29, 155, 240, 0.1)', color: 'var(--primary-blue)', width: 'fit-content', border: 'none', borderRadius: '6px' }}>
                                    ID: {selectedInvestor.investorId}
                                </span>
                            </div>
                            <button onClick={() => setShowInvestorDetailModal(false)} className={local.staffModalCloseBtn}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className={local.inv_modalCompactBody} style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                            <div className={local.inv_detailGrid}>
                                <div>
                                    <label style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '800', letterSpacing: '0.5px' }}>Tên tổ chức / Cá nhân</label>
                                    <p style={{ fontSize: '17px', fontWeight: '800', color: 'var(--text-primary)', margin: '4px 0 0 0' }}>{selectedInvestor.organizationName || selectedInvestor.fullName}</p>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '20px' }}>
                                    <div>
                                        <label style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '800', letterSpacing: '0.5px' }}>Email</label>
                                        <p style={{ fontSize: '14px', color: 'var(--text-primary)', margin: '4px 0 0 0', fontWeight: '500' }}>{selectedInvestor.email || '-'}</p>
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '800', letterSpacing: '0.5px' }}>Khu vực đầu tư</label>
                                        <p style={{ fontSize: '14px', color: 'var(--text-primary)', margin: '4px 0 0 0', fontWeight: '500' }}>{selectedInvestor.investmentRegion || '-'}</p>
                                    </div>
                                </div>
                                <div>
                                    <label style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '800', letterSpacing: '0.5px' }}>Khẩu vị đầu tư</label>
                                    <p style={{ fontSize: '14px', color: 'var(--text-primary)', margin: '4px 0 0 0', lineHeight: 1.6 }}>{selectedInvestor.investmentTaste || '-'}</p>
                                </div>
                                <div>
                                    <label style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '800', letterSpacing: '0.5px' }}>Lĩnh vực quan tâm</label>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                                        {selectedInvestor.focusIndustry?.split(',').map((industry, id) => (
                                            <span key={id} className={local.btag} style={{ background: 'rgba(29, 155, 240, 0.08)', color: 'var(--primary-blue)', padding: '2px 10px', borderRadius: '4px', fontSize: '11px' }}>
                                                {industry.trim()}
                                            </span>
                                        )) || <span style={{ color: 'var(--text-muted)' }}>-</span>}
                                    </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '20px' }}>
                                    <div>
                                        <label style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '800', letterSpacing: '0.5px' }}>Ngân sách đầu tư</label>
                                        <p style={{ fontSize: '15px', fontWeight: '800', color: '#10b981', margin: '4px 0 0 0' }}>{selectedInvestor.investmentAmount ? Number(selectedInvestor.investmentAmount).toLocaleString() : 'Chưa cập nhật'} ₫</p>
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '800', letterSpacing: '0.5px' }}>Giai đoạn ưu tiên</label>
                                        <p style={{ fontSize: '15px', fontWeight: '800', color: 'var(--primary-blue)', margin: '4px 0 0 0' }}>
                                            {selectedInvestor.preferredStage === 'Idea' || selectedInvestor.preferredStage === 0 ? 'Ý tưởng (Idea)' : (selectedInvestor.preferredStage === 'MVP' || selectedInvestor.preferredStage === 1 ? 'MVP' : (selectedInvestor.preferredStage === 'Growth' || selectedInvestor.preferredStage === 2 ? 'Phát triển (Growth)' : '-'))}
                                        </p>
                                    </div>
                                </div>
                                {(selectedInvestor.status || selectedInvestor.approvalStatus) === 'Rejected' && selectedInvestor.rejectionReason && (
                                    <div style={{ padding: '16px', backgroundColor: 'rgba(244, 33, 46, 0.05)', borderRadius: '12px', border: '1px solid rgba(244, 33, 46, 0.1)', marginTop: '8px' }}>
                                        <label style={{ fontSize: '11px', color: '#f4212e', textTransform: 'uppercase', fontWeight: '800', letterSpacing: '0.5px' }}>Lý do từ chối</label>
                                        <p style={{ fontSize: '13px', color: '#f4212e', margin: '4px 0 0 0', lineHeight: 1.5 }}>{selectedInvestor.rejectionReason}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', backgroundColor: 'var(--bg-secondary)' }}>
                            <button onClick={() => setShowInvestorDetailModal(false)} className={local.modalSecondaryBtn} style={{ padding: '8px 24px', borderRadius: '99px', height: '40px' }}>Đóng</button>
                        </div>
                    </div>
                </div>
            )}


            {/* Global PR News Section */}
            {activeSection === 'pr_news' && (
                <NewsPRSection user={user} />
            )}

            {/* Project Image Modal - Standardized with Startup Dashboard */}
            {showFullImage && detailProject?.projectImageUrl && (
                <div
                    className={styles.imageLightbox}
                    onClick={() => setShowFullImage(false)}
                >
                    <div className={styles.lightboxOverlay} />
                    <button
                        className={styles.lightboxClose}
                        onClick={() => setShowFullImage(false)}
                        title="Đóng"
                    >
                        <X size={32} />
                    </button>
                    <div className={styles.lightboxContent} onClick={(e) => e.stopPropagation()}>
                        <img
                            src={detailProject.projectImageUrl}
                            alt={detailProject.projectName}
                            className={styles.lightboxImage}
                        />
                        <div className={styles.lightboxCaption}>
                            <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 900 }}>{detailProject.projectName}</h3>
                            <p style={{ margin: '4px 0 0 0', opacity: 0.8, fontSize: '14px', fontWeight: 700 }}>
                                {STATUS_LABELS[detailProject.status] || 'Bản nháp'}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {showBlockchainModal && blockchainData && (
                <BlockchainVerificationModal
                    isOpen={showBlockchainModal}
                    onClose={() => {
                        setShowBlockchainModal(false);
                        setBlockchainData(null);
                    }}
                    verificationData={blockchainData}
                    projectName={detailProject.projectName}
                />
            )}

            {/* User Report Resolution Modal */}
            {showReportResolveModal && selectedReportForResolve && (
                <div className={styles.modalOverlay} onClick={(e) => e.target === e.currentTarget && setShowReportResolveModal(false)}>
                    <div className={styles.modalContent} style={{ maxWidth: '480px', width: '92%', height: 'auto', maxHeight: '90vh', borderRadius: '24px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                        <div className={local.staffModalHeader} style={{ padding: '20px 24px' }}>
                            <div className={local.staffModalTitleGrp}>
                                {isResolveValid ? <CheckCircle size={20} color="#10b981" /> : <XCircle size={20} color="#ef4444" />}
                                <h2 className={local.staffModalTitleText}>
                                    {isResolveValid ? 'Xác nhận báo cáo Hợp lệ' : 'Xác nhận báo cáo Sai lệch'}
                                </h2>
                            </div>
                            <button onClick={() => setShowReportResolveModal(false)} className={local.staffModalCloseBtn}>
                                <X size={20} />
                            </button>
                        </div>

                        <div style={{ padding: '24px' }}>
                            <div style={{
                                padding: '16px',
                                backgroundColor: 'var(--bg-secondary)',
                                borderRadius: '16px',
                                border: '1px solid var(--border-color)',
                                marginBottom: '20px'
                            }}>
                                <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>
                                    Nội dung báo cáo
                                </div>
                                <div style={{ fontSize: '14px', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                                    {selectedReportForResolve.description}
                                </div>
                            </div>

                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
                                Ghi chú xử lý (Tùy chọn)
                            </label>
                            <textarea
                                value={reportResolveNote}
                                onChange={(e) => setReportResolveNote(e.target.value)}
                                placeholder={isResolveValid ? "Lý do báo cáo này hợp lệ..." : "Giải thích tại sao báo cáo này không chính xác..."}
                                style={{
                                    width: '100%',
                                    minHeight: '120px',
                                    padding: '16px',
                                    backgroundColor: 'var(--bg-primary)',
                                    border: '1.5px solid var(--border-color)',
                                    borderRadius: '16px',
                                    color: 'var(--text-primary)',
                                    fontSize: '14px',
                                    fontFamily: 'inherit',
                                    resize: 'none',
                                    boxSizing: 'border-box'
                                }}
                            />
                            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '12px', lineHeight: 1.4 }}>
                                * Hành động này sẽ {isResolveValid ? 'chốt báo cáo là hơp lệ' : 'hủy bỏ báo cáo'} và lưu lại lịch sử giải quyết của hệ thống.
                            </p>
                        </div>

                        <div style={{ padding: '20px 24px', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <button
                                onClick={() => setShowReportResolveModal(false)}
                                className={styles.secondaryBtn}
                                style={{ padding: '10px 20px', borderRadius: '12px' }}
                            >
                                Hủy
                            </button>
                            <button
                                onClick={() => {
                                    handleResolveReport(selectedReportForResolve.userReportId, isResolveValid, reportResolveNote);
                                    setShowReportResolveModal(false);
                                }}
                                className={isResolveValid ? styles.primaryBtn : styles.dangerBtn}
                                style={{
                                    padding: '10px 24px',
                                    borderRadius: '12px',
                                    backgroundColor: isResolveValid ? '#10b981' : '#ef4444',
                                    borderColor: isResolveValid ? '#10b981' : '#ef4444',
                                    color: '#ffffff',
                                    fontWeight: '800',
                                    fontSize: '14px'
                                }}
                                disabled={processingProjectId === selectedReportForResolve.userReportId}
                            >
                                {processingProjectId === selectedReportForResolve.userReportId ? <Loader2 size={16} className="animate-spin" /> : 'Xác nhận'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};


export default OperationStaffDashboard;
