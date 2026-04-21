import React, { useMemo, useState, useEffect } from 'react';
import { Shield, Users, Briefcase, FileText, Settings, Database, ChevronRight, Loader2 } from 'lucide-react';
import styles from '../styles/SharedDashboard.module.css';
import DashboardSection from '../components/common/DashboardSection';
import adminService from '../services/adminService';

const ADMIN_SECTIONS = [
    { id: 'overview', label: 'Tổng quan', icon: Shield, description: 'Trang điều phối tổng thể cho Admin.' },
    { id: 'users', label: 'Quản lý người dùng', icon: Users, description: 'Danh sách, quyền và trạng thái tài khoản.' },
    { id: 'deals', label: 'Quản lý Deals', icon: Briefcase, description: 'Theo dõi các deal và luồng xử lý.' },
    { id: 'contracts', label: 'Quản lý hợp đồng', icon: FileText, description: 'Theo dõi hợp đồng và trạng thái ký.' },
    { id: 'transactions', label: 'Giao dịch', icon: Database, description: 'Theo dõi giao dịch thanh toán toàn hệ thống.' },
    { id: 'system', label: 'Cấu hình hệ thống', icon: Settings, description: 'Thiết lập tham số và quy tắc vận hành.' },
    { id: 'integrations', label: 'Tích hợp API', icon: Database, description: 'Nơi map API mới vào từng phân mục.' }
];

export default function AdminDashboard({ user, initialSection = 'overview' }) {
    const [activeSection, setActiveSection] = useState(initialSection || 'overview');
    const [transactions, setTransactions] = useState([]);
    const [transactionsMeta, setTransactionsMeta] = useState({ page: 1, pageSize: 10, totalCount: 0, totalPages: 1 });
    const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
    const [transactionError, setTransactionError] = useState('');

    const currentSection = useMemo(
        () => ADMIN_SECTIONS.find((s) => s.id === activeSection) || ADMIN_SECTIONS[0],
        [activeSection]
    );

    const fetchTransactions = async (page = 1) => {
        setIsLoadingTransactions(true);
        setTransactionError('');
        try {
            const response = await adminService.getTransactions({ page, pageSize: transactionsMeta.pageSize });
            const payload = response?.data || response || {};
            const items = Array.isArray(payload?.items) ? payload.items : [];
            setTransactions(items);
            setTransactionsMeta({
                page: payload?.page || page,
                pageSize: payload?.pageSize || transactionsMeta.pageSize,
                totalCount: payload?.totalCount || items.length,
                totalPages: payload?.totalPages || 1
            });
        } catch (error) {
            console.error('[AdminDashboard] Failed to fetch transactions:', error);
            setTransactionError('Không thể tải danh sách giao dịch.');
            setTransactions([]);
        } finally {
            setIsLoadingTransactions(false);
        }
    };

    useEffect(() => {
        if (activeSection === 'transactions') {
            fetchTransactions(1);
        }
    }, [activeSection]);

    const renderTransactionsSection = () => (
        <div className={styles.card}>
            {isLoadingTransactions ? (
                <div className={styles.loadingState}>
                    <Loader2 size={20} className={styles.spinner} />
                    <span>Đang tải giao dịch...</span>
                </div>
            ) : transactionError ? (
                <div className={styles.emptyState}>
                    <p style={{ margin: 0, color: '#ef4444' }}>{transactionError}</p>
                </div>
            ) : (
                <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <p className={styles.subtitle} style={{ margin: 0 }}>
                            Tổng giao dịch: <b>{transactionsMeta.totalCount}</b>
                        </p>
                        <button className={styles.secondaryBtn} onClick={() => fetchTransactions(transactionsMeta.page)}>
                            Làm mới
                        </button>
                    </div>

                    <div className={styles.tableWrapper}>
                        <table className={styles.docsTable}>
                            <thead>
                                <tr>
                                    <th>Mã GD</th>
                                    <th>Người dùng</th>
                                    <th>Số tiền</th>
                                    <th>Loại</th>
                                    <th>Trạng thái</th>
                                    <th>Tham chiếu</th>
                                    <th>Thời gian tạo</th>
                                </tr>
                            </thead>
                            <tbody>
                                {transactions.map((item) => {
                                    const statusLower = String(item.status || '').toLowerCase();
                                    const statusClass = statusLower === 'completed'
                                        ? styles.badgeSuccess
                                        : statusLower === 'failed'
                                            ? styles.badgeError
                                            : styles.badgePending;

                                    return (
                                        <tr key={item.transactionId}>
                                            <td>#{item.transactionId}</td>
                                            <td>
                                                <div style={{ fontWeight: 700 }}>{item.userName || 'N/A'}</div>
                                                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{item.userEmail || 'N/A'}</div>
                                            </td>
                                            <td>{Number(item.amount || 0).toLocaleString('vi-VN')} VND</td>
                                            <td>{item.type || 'N/A'}</td>
                                            <td>
                                                <span className={`${styles.badge} ${statusClass}`}>{item.status || 'Unknown'}</span>
                                            </td>
                                            <td>{item.referenceType || '-'} {item.referenceId ? `#${item.referenceId}` : ''}</td>
                                            <td>{item.createdAt ? new Date(item.createdAt).toLocaleString('vi-VN') : '-'}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {transactionsMeta.totalPages > 1 && (
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '14px' }}>
                            <button
                                className={styles.secondaryBtn}
                                disabled={transactionsMeta.page <= 1 || isLoadingTransactions}
                                onClick={() => fetchTransactions(transactionsMeta.page - 1)}
                            >
                                Trang trước
                            </button>
                            <span style={{ alignSelf: 'center', fontSize: '13px', color: 'var(--text-secondary)' }}>
                                Trang {transactionsMeta.page}/{transactionsMeta.totalPages}
                            </span>
                            <button
                                className={styles.secondaryBtn}
                                disabled={transactionsMeta.page >= transactionsMeta.totalPages || isLoadingTransactions}
                                onClick={() => fetchTransactions(transactionsMeta.page + 1)}
                            >
                                Trang sau
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );

    return (
        <div className={styles.container}>
            <header className={styles.pageHeader}>
                <h1 className={styles.headerTitle}>Bảng điều khiển Admin</h1>
                <p className={styles.headerSubtitle}>
                    Xin chào, {user?.name || 'Admin'}! Khung quản trị đã sẵn sàng để nối API theo từng phân mục.
                </p>
            </header>

            <div className={styles.tabSwitcherWrapper}>
                <div className={styles.tabs}>
                    {ADMIN_SECTIONS.map((section) => (
                        <button
                            key={section.id}
                            className={`${styles.tab} ${activeSection === section.id ? styles.active : ''}`}
                            onClick={() => setActiveSection(section.id)}
                        >
                            {section.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className={styles.content}>
                <DashboardSection
                    title={currentSection.label}
                    topBarExtra={(
                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                            Module: {currentSection.id}
                        </span>
                    )}
                >
                    {activeSection === 'transactions' ? renderTransactionsSection() : (
                        <>
                            <div className={styles.sectionGrid}>
                                <div className={styles.card}>
                                    <h4 className={styles.cardTitle} style={{ marginBottom: '8px' }}>
                                        <currentSection.icon size={18} />
                                        {currentSection.label}
                                    </h4>
                                    <p className={styles.subtitle} style={{ marginBottom: '10px' }}>
                                        {currentSection.description}
                                    </p>
                                    <div className={styles.badge + ' ' + styles.badgeInfo}>Sẵn sàng kết nối API</div>
                                </div>

                                <div className={styles.card}>
                                    <h4 className={styles.cardTitle} style={{ marginBottom: '8px' }}>Kế hoạch mapping API</h4>
                                    <p className={styles.subtitle}>Bạn gửi endpoint + field response, mình sẽ map vào bảng/list/filter/action tương ứng.</p>
                                    <ul style={{ margin: '12px 0 0 18px', color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.6 }}>
                                        <li>Fetch danh sách theo phân mục</li>
                                        <li>Hiển thị trạng thái và badge màu</li>
                                        <li>Thêm hành động CRUD/duyệt/từ chối khi có API</li>
                                    </ul>
                                </div>
                            </div>

                            <div className={styles.card} style={{ marginTop: '20px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                    <ChevronRight size={16} color="var(--primary-blue)" />
                                    <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Bước tiếp theo</span>
                                </div>
                                <p className={styles.subtitle} style={{ margin: 0 }}>
                                    Gửi cho mình danh sách API + request/response mẫu, mình sẽ triển khai từng phân mục theo đúng dữ liệu thực tế.
                                </p>
                            </div>
                        </>
                    )}
                </DashboardSection>
            </div>
        </div>
    );
}
