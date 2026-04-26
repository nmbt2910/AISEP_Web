import React from 'react';
import { Building, User, Mail, Calendar, ArrowRight, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import local from '../../styles/OperationStaffDashboard.module.css';
import styles from '../../styles/SharedDashboard.module.css';

/**
 * StartupApprovalCard - A responsive card for staff to review startup profile applications.
 */
const StartupApprovalCard = ({ 
    startup, 
    status, 
    onDetail, 
    onApprove, 
    onReject, 
    isProcessing, 
    processingAction,
    isAnyProcessing,
    isHighlighted 
}) => {
    // Basic info with fallbacks
    const companyName = startup?.companyName || startup?.name || 'Công ty khởi nghiệp';
    const founderName = startup?.founder || startup?.representName || 'Chưa cập nhật';
    const industry = startup?.industry || 'Lĩnh vực khác';
    const email = startup?.email || 'N/A';
    const date = startup?.createdAt ? new Date(startup.createdAt).toLocaleDateString('vi-VN') : 'N/A';
    const startupId = startup?.id || startup?.startupId;

    return (
        <div id={`startup-${startupId}`} className={`${local.investorProCard} ${local[status]} ${isAnyProcessing ? local.btnDisabled : ''} ${isHighlighted ? styles.targetHighlight : ''}`}>
            {/* Status strip at the left edge */}
            <div className={`${local.investorProCardStrip} ${local[status]}`}></div>

            <div className={local.investorProHeader}>
                <div style={{ flex: 1, overflow: 'hidden' }}>
                    <h4 className={local.investorProName} title={companyName}>
                        {companyName}
                    </h4>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                        <span className={local.investorProBadge} style={{ background: 'rgba(124, 58, 237, 0.1)', color: '#7c3aed' }}>
                            Startup
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            ID: {startupId}
                        </span>
                    </div>
                </div>
            </div>

            <div className={local.investorProBody}>
                <div className={local.investorProRow}>
                    <span className={local.investorProLabel}>
                        <User size={12} style={{ marginRight: '4px' }} /> Đại diện
                    </span>
                    <span className={local.investorProValue} title={founderName}>
                        {founderName}
                    </span>
                </div>
                <div className={local.investorProRow}>
                    <span className={local.investorProLabel}>
                        <Mail size={12} style={{ marginRight: '4px' }} /> Email
                    </span>
                    <span className={local.investorProValue} title={email}>
                        {email}
                    </span>
                </div>
                <div className={local.investorProRow}>
                    <span className={local.investorProLabel}>
                        <Building size={12} style={{ marginRight: '4px' }} /> Lĩnh vực
                    </span>
                    <span className={local.investorProValue}>
                        {industry}
                    </span>
                </div>
                <div className={local.investorProRow}>
                    <span className={local.investorProLabel}>
                        <Calendar size={12} style={{ marginRight: '4px' }} /> Ngày ĐK
                    </span>
                    <span className={local.investorProValue}>
                        {date}
                    </span>
                </div>
            </div>

            <div className={local.investorProFooter}>
                <button 
                    className={local.investorProBtn} 
                    onClick={() => onDetail(startup)} 
                    title="Chi tiết"
                    disabled={isAnyProcessing}
                >
                    <ArrowRight size={16} />
                    Chi tiết
                </button>

                {status === 'pend' && (
                    <>
                        <button
                            className={`${local.investorProBtn} ${local.investorProRejectBtn} ${isAnyProcessing ? local.btnDisabled : ''}`}
                            onClick={() => onReject(startupId)}
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
                            onClick={() => onApprove(startupId)}
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

export default StartupApprovalCard;
