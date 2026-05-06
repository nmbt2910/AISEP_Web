import React from 'react';
import { X, Building, User, FileText, ExternalLink, Shield, CheckCircle, XCircle, Loader2, Globe, MapPin } from 'lucide-react';
import styles from '../../styles/SharedDashboard.module.css';
import local from '../../styles/OperationStaffDashboard.module.css';

/**
 * StartupDetailModal - Comprehensive view of a startup profile for staff review.
 */
const StartupDetailModal = ({ 
    isOpen, 
    onClose, 
    startup, 
    onApprove, 
    onReject, 
    isProcessing, 
    processingAction 
}) => {
    if (!isOpen || !startup) return null;

    const companyName = startup?.companyName || startup?.name || 'Công ty khởi nghiệp';
    const founderName = startup?.founder || startup?.representName || 'Chưa cập nhật';
    const industry = startup?.industry || 'Lĩnh vực khác';
    const email = startup?.email || 'N/A';
    const description = startup?.description || startup?.shortDescription || 'Không có mô tả chi tiết.';
    const website = startup?.website || 'N/A';
    const address = startup?.address || startup?.countryCity || 'N/A';
    const phone = startup?.phoneNumber || 'N/A';
    const status = (startup?.status || startup?.approvalStatus) === 'Approved' ? 'appr' : ((startup?.status || startup?.approvalStatus) === 'Rejected' ? 'rej' : 'pend');
    const licenseUrl = startup?.businessLicenseUrl || startup?.businessLicense;
    const logoUrl = startup?.logoUrl || startup?.logo;
    const startupId = startup?.id || startup?.startupId;

    return (
        <div className={styles.modalOverlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className={styles.modalContent} style={{ maxWidth: '800px', width: '95%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
                {/* Modal Header */}
                <div className={local.staffModalHeader}>
                    <div className={local.staffModalTitleGrp}>
                        <Shield size={22} color="var(--primary-blue)" />
                        <h2 className={local.staffModalTitleText}>Chi tiết hồ sơ Startup</h2>
                    </div>
                    <button onClick={onClose} className={local.staffModalCloseBtn}>
                        <X size={24} />
                    </button>
                </div>

                <div className={styles.scrollableSection} style={{ padding: '24px' }}>
                    {/* Top Hero Section */}
                    <div style={{ display: 'flex', gap: '24px', marginBottom: '32px', flexWrap: 'wrap' }}>
                        <div style={{ 
                            width: '120px', 
                            height: '120px', 
                            borderRadius: '16px', 
                            overflow: 'hidden', 
                            backgroundColor: 'white',
                            border: '1px solid var(--border-color)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                        }}>
                            {logoUrl ? (
                                <img src={logoUrl} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                            ) : (
                                <Building size={48} color="var(--text-muted)" />
                            )}
                        </div>

                        <div style={{ flex: 1, minWidth: '300px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <h1 style={{ fontSize: '24px', fontWeight: '800', margin: '0 0 8px 0', color: 'var(--text-primary)' }}>{companyName}</h1>
                                <span className={`${styles.badge} ${status === 'appr' ? local.sleekBadgeSuccess : status === 'rej' ? local.sleekButtonDanger : local.sleekBadgeWarning}`} style={{ padding: '6px 14px', borderRadius: '99px' }}>
                                    {status === 'appr' ? '✓ Đã phê duyệt' : status === 'rej' ? '✕ Từ chối' : '● Chờ phê duyệt'}
                                </span>
                            </div>
                            
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginTop: '12px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                                    <Building size={16} color="var(--primary-blue)" /> 
                                    {(() => {
                                        const industries = startup?.industries || (startup?.industry ? [startup.industry] : []);
                                        return industries.join(', ') || 'Lĩnh vực khác';
                                    })()}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Content Grid: 4 Equal Parts */}
                    {/* Content Grid: 3 Logical Sections */}
                    <div className={local.modalGrid2Col}>
                        {/* 1. Representative Card */}
                        <div className={local.modalSectionCard}>
                            <div className={local.modalSectionHeader}>
                                <User size={18} color="var(--primary-blue)" />
                                <h3 className={local.modalSectionTitle}>Thông tin người đại diện</h3>
                            </div>
                            <div className={local.modalFieldRow}>
                                <span className={local.modalFieldLabel}>Họ và tên</span>
                                <span className={local.modalFieldValue}>{founderName}</span>
                            </div>
                            <div className={local.modalFieldRow}>
                                <span className={local.modalFieldLabel}>Email</span>
                                <span className={local.modalFieldValue}>{email}</span>
                            </div>
                            <div className={local.modalFieldRow}>
                                <span className={local.modalFieldLabel}>Số điện thoại</span>
                                <span className={local.modalFieldValue}>{phone}</span>
                            </div>
                        </div>

                        {/* 2. Contact & Address Card */}
                        <div className={local.modalSectionCard}>
                            <div className={local.modalSectionHeader}>
                                <Globe size={18} color="var(--primary-blue)" />
                                <h3 className={local.modalSectionTitle}>Liên hệ & Địa chỉ</h3>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '13px', color: 'var(--text-primary)' }}>
                                    <MapPin size={16} style={{ flexShrink: 0, marginTop: '2px' }} color="var(--text-secondary)" />
                                    <span>{address}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                                    <Globe size={16} color="var(--text-secondary)" />
                                    <a 
                                        href={website === 'N/A' ? '#' : (website.startsWith('http') ? website : `https://${website}`)} 
                                        target="_blank" 
                                        rel="noopener noreferrer" 
                                        style={{ color: 'var(--primary-blue)', textDecoration: 'none', fontWeight: '700' }}
                                    >
                                        {website}
                                    </a>
                                </div>
                            </div>
                        </div>

                        {/* 3. License Card - Spanning Full Width on Desktop */}
                        <div className={`${local.modalSectionCard} ${local.modalSectionCardFull}`}>
                            <div className={local.modalSectionHeader}>
                                <Shield size={18} color="var(--primary-blue)" />
                                <h3 className={local.modalSectionTitle}>Giấy phép kinh doanh</h3>
                            </div>
                            {licenseUrl ? (
                                <div style={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'space-between', 
                                    padding: '20px', 
                                    backgroundColor: 'rgba(255,255,255,0.03)', 
                                    borderRadius: '12px', 
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    marginTop: '8px'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                        <div style={{ 
                                            width: '48px', 
                                            height: '48px', 
                                            borderRadius: '10px', 
                                            backgroundColor: 'rgba(52, 152, 219, 0.1)', 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            justifyContent: 'center',
                                            border: '1px solid rgba(52, 152, 219, 0.2)'
                                        }}>
                                            <FileText size={24} color="var(--primary-blue)" />
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>Hồ sơ pháp lý / Giấy phép</span>
                                            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {licenseUrl.split('/').pop().split('?')[0] || 'giay_phep_kinh_doanh.pdf'}
                                            </span>
                                        </div>
                                    </div>
                                    <a 
                                        href={licenseUrl} 
                                        target="_blank" 
                                        rel="noopener noreferrer" 
                                        className={local.sleekButton}
                                        style={{ padding: '10px 20px', fontSize: '13px', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', minWidth: 'auto' }}
                                    >
                                        <ExternalLink size={16} />
                                        <span className={local.hideOnMobile} style={{ marginLeft: '8px' }}>Xem tài liệu</span>
                                    </a>
                                </div>
                            ) : (
                                <div style={{ 
                                    padding: '32px', 
                                    textAlign: 'center', 
                                    border: '1px dashed var(--border-color)', 
                                    borderRadius: '12px',
                                    color: 'var(--text-muted)',
                                    backgroundColor: 'rgba(255,255,255,0.01)',
                                    fontSize: '13px'
                                }}>
                                    Không có file hồ sơ đính kèm
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Modal Footer Actions */}
                {status === 'pend' && (
                    <div className={styles.modalFooter} style={{ padding: '24px', borderTop: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.1)', marginTop: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px', width: '100%' }}>
                            <button 
                                className={`${local.sleekButton} ${local.sleekButtonDanger}`}
                                style={{ minWidth: '160px' }}
                                onClick={() => onReject(startupId)}
                                disabled={isProcessing}
                            >
                                {isProcessing && processingAction === 'reject' ? <Loader2 size={18} className="animate-spin" /> : <XCircle size={18} />}
                                Từ chối hồ sơ
                            </button>
                            <button 
                                className={`${local.sleekButton} ${local.sleekButtonPrimary}`}
                                style={{ minWidth: '160px' }}
                                onClick={() => onApprove(startupId)}
                                disabled={isProcessing}
                            >
                                {isProcessing && processingAction === 'approve' ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
                                Phê duyệt Startup
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StartupDetailModal;
