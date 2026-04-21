import React, { useMemo, useState, useEffect } from 'react';
import { Users, Database, ChevronRight, Loader2 } from 'lucide-react';
import styles from '../styles/SharedDashboard.module.css';
import DashboardSection from '../components/common/DashboardSection';
import adminService from '../services/adminService';
import AccountProfileTab from '../components/common/AccountProfileTab';

const ADMIN_SECTIONS = [
    { id: 'users', label: 'Quản lý người dùng', icon: Users, description: 'Danh sách, quyền và trạng thái tài khoản.' },
    { id: 'staff', label: 'Quản lý Staff', icon: Users, description: 'Tạo và quản lý tài khoản staff vận hành.' },
    { id: 'transactions', label: 'Giao dịch', icon: Database, description: 'Theo dõi giao dịch thanh toán toàn hệ thống.' },
    { id: 'account_profile', label: 'Hồ sơ người dùng', icon: Users, description: 'Quản lý thông tin cá nhân và mật khẩu.' },
];

export default function AdminDashboard({ user, initialSection = 'users' }) {
    const [activeSection, setActiveSection] = useState(initialSection || 'users');
    const [transactions, setTransactions] = useState([]);
    const [transactionsMeta, setTransactionsMeta] = useState({ page: 1, pageSize: 1000, totalCount: 0, totalPages: 1 });
    const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
    const [transactionError, setTransactionError] = useState('');
    
    const [users, setUsers] = useState([]);
    const [usersMeta, setUsersMeta] = useState({ page: 1, pageSize: 1000, totalCount: 0, totalPages: 1 });
    const [isLoadingUsers, setIsLoadingUsers] = useState(false);
    const [usersError, setUsersError] = useState('');
    const [selectedUserRole, setSelectedUserRole] = useState('Advisor');
    
    // Staff form state
    const [staffFormData, setStaffFormData] = useState({
        userName: '',
        fullName: '',
        email: '',
        phoneNumber: '',
        password: '',
        confirmPassword: '',
        status: 'Active',
        isPremium: false,
        dateOfBirth: ''
    });
    const [isSubmittingStaff, setIsSubmittingStaff] = useState(false);
    const [staffError, setStaffError] = useState('');
    const [staffSuccess, setStaffSuccess] = useState('');

    const currentSection = useMemo(
        () => ADMIN_SECTIONS.find((s) => s.id === activeSection) || ADMIN_SECTIONS[0],
        [activeSection]
    );

    const fetchTransactions = async (page = 1, pageSize = 1000) => {
        setIsLoadingTransactions(true);
        setTransactionError('');
        try {
            const response = await adminService.getTransactions({ page, pageSize });
            const payload = response?.data || response || {};
            const items = Array.isArray(payload?.items) ? payload.items : [];
            setTransactions(items);
            setTransactionsMeta({
                page: payload?.page || page,
                pageSize: payload?.pageSize || pageSize,
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

    const fetchUsers = async (page = 1, pageSize = 1000) => {
        setIsLoadingUsers(true);
        setUsersError('');
        try {
            const response = await adminService.getUsers({ page, pageSize });
            const payload = response?.data || response || {};
            const items = Array.isArray(payload?.items) ? payload.items : [];
            setUsers(items);
            setUsersMeta({
                page: payload?.page || page,
                pageSize: payload?.pageSize || pageSize,
                totalCount: payload?.totalCount || items.length,
                totalPages: payload?.totalPages || 1
            });
        } catch (error) {
            console.error('[AdminDashboard] Failed to fetch users:', error);
            setUsersError('Không thể tải danh sách người dùng.');
            setUsers([]);
        } finally {
            setIsLoadingUsers(false);
        }
    };

    const handleCreateStaff = async (e) => {
        e.preventDefault();
        setStaffError('');
        setStaffSuccess('');

        // Validation
        if (!staffFormData.userName || !staffFormData.email || !staffFormData.password) {
            setStaffError('Vui lòng điền tất cả các trường bắt buộc.');
            return;
        }

        if (staffFormData.password !== staffFormData.confirmPassword) {
            setStaffError('Mật khẩu xác nhận không khớp.');
            return;
        }

        if (staffFormData.password.length < 6) {
            setStaffError('Mật khẩu phải có ít nhất 6 ký tự.');
            return;
        }

        setIsSubmittingStaff(true);
        try {
            const response = await adminService.createStaff(staffFormData);
            setStaffSuccess('Tạo staff thành công!');
            setStaffFormData({
                userName: '',
                fullName: '',
                email: '',
                phoneNumber: '',
                password: '',
                confirmPassword: '',
                status: 'Active',
                isPremium: false,
                dateOfBirth: ''
            });
            // Clear success message after 3 seconds
            setTimeout(() => setStaffSuccess(''), 3000);
        } catch (error) {
            console.error('[AdminDashboard] Failed to create staff:', error);
            setStaffError(error?.response?.data?.message || 'Không thể tạo staff. Vui lòng thử lại.');
        } finally {
            setIsSubmittingStaff(false);
        }
    };

    useEffect(() => {
        if (activeSection === 'transactions') {
            fetchTransactions(1);
        }
        if (activeSection === 'users') {
            fetchUsers(1);
        }
    }, [activeSection]);

    // Sync activeSection with initialSection prop when it changes
    useEffect(() => {
        if (initialSection && initialSection !== activeSection) {
            setActiveSection(initialSection);
        }
    }, [initialSection]);

    const renderUsersSection = () => {
        const roles = ['Advisor', 'Investor', 'Startup'];
        const filteredUsers = users.filter(u => u.role === selectedUserRole && u.role !== 'Admin');
        const roleStats = {
            Advisor: users.filter(u => u.role === 'Advisor').length,
            Investor: users.filter(u => u.role === 'Investor').length,
            Startup: users.filter(u => u.role === 'Startup').length,
        };

        return (
            <div className={styles.card}>
                {isLoadingUsers ? (
                    <div className={styles.loadingState}>
                        <Loader2 size={24} className={styles.spinner} />
                        <span>Đang tải người dùng...</span>
                    </div>
                ) : usersError ? (
                    <div className={styles.emptyState}>
                        <p style={{ margin: 0, color: '#ef4444', fontSize: '15px' }}>{usersError}</p>
                    </div>
                ) : (
                    <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid var(--border-color)' }}>
                            <div>
                                <p className={styles.subtitle} style={{ margin: '0 0 4px 0', fontSize: '13px' }}>
                                    Danh sách người dùng
                                </p>
                                <p style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
                                    {usersMeta.totalCount} người dùng
                                </p>
                            </div>
                            <button className={styles.secondaryBtn} onClick={() => fetchUsers(usersMeta.page, usersMeta.pageSize)}>
                                ↻ Làm mới
                            </button>
                        </div>

                        {/* Role Filter Tabs */}
                        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid var(--border-color)', flexWrap: 'wrap' }}>
                            {roles.map(role => (
                                <button
                                    key={role}
                                    onClick={() => setSelectedUserRole(role)}
                                    style={{
                                        padding: '8px 16px',
                                        borderRadius: '6px',
                                        border: '1px solid var(--border-color)',
                                        backgroundColor: selectedUserRole === role ? 'var(--primary-blue)' : 'transparent',
                                        color: selectedUserRole === role ? 'white' : 'var(--text-secondary)',
                                        fontWeight: selectedUserRole === role ? 700 : 600,
                                        fontSize: '13px',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    {role === 'Advisor' ? '👨‍💼' : role === 'Investor' ? '💰' : '🚀'} {role} ({roleStats[role]})
                                </button>
                            ))}
                        </div>

                        {filteredUsers.length === 0 ? (
                            <div className={styles.emptyState}>
                                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '15px' }}>Không có người dùng nào với vai trò {selectedUserRole}</p>
                            </div>
                        ) : (
                            <div className={styles.tableWrapper} style={{ borderRadius: '8px', overflow: 'hidden' }}>
                                <table className={styles.docsTable} style={{ tableLayout: 'fixed' }}>
                                    <thead>
                                        <tr style={{ backgroundColor: 'var(--bg-secondary)' }}>
                                            <th style={{ padding: '14px 12px', fontWeight: 700, fontSize: '13px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', width: '10%' }}>ID</th>
                                            <th style={{ padding: '14px 12px', fontWeight: 700, fontSize: '13px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', width: '20%' }}>Username</th>
                                            <th style={{ padding: '14px 12px', fontWeight: 700, fontSize: '13px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', width: '25%' }}>Email</th>
                                            <th style={{ padding: '14px 12px', fontWeight: 700, fontSize: '13px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', width: '12%' }}>Role</th>
                                            <th style={{ padding: '14px 12px', fontWeight: 700, fontSize: '13px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', width: '14%' }}>Trạng thái</th>
                                            <th style={{ padding: '14px 12px', fontWeight: 700, fontSize: '13px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', width: '12%' }}>Email xác nhận</th>
                                            <th style={{ padding: '14px 12px', fontWeight: 700, fontSize: '13px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', width: '7%' }}>Premium</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredUsers.map((item, idx) => {
                                            const statusLower = String(item.status || '').toLowerCase();
                                            let statusColor = '#f59e0b';
                                            let statusBg = '#fef3c7';
                                            if (statusLower === 'active') {
                                                statusColor = '#10b981';
                                                statusBg = '#d1fae5';
                                            } else if (statusLower === 'pending') {
                                                statusColor = '#f59e0b';
                                                statusBg = '#fef3c7';
                                            }

                                            return (
                                                <tr key={item.userId} style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: idx % 2 === 0 ? 'transparent' : 'var(--bg-secondary)' }}>
                                                    <td style={{ padding: '14px 12px', fontWeight: 700, color: 'var(--primary-blue)', fontSize: '13px' }}>
                                                        #{item.userId}
                                                    </td>
                                                    <td style={{ padding: '14px 12px', fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                        {item.userName || 'N/A'}
                                                    </td>
                                                    <td style={{ padding: '14px 12px', fontSize: '12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                        {item.email || 'N/A'}
                                                    </td>
                                                    <td style={{ padding: '14px 12px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                                                        {item.role || 'N/A'}
                                                    </td>
                                                    <td style={{ padding: '14px 12px' }}>
                                                        <span style={{ display: 'inline-block', padding: '5px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, backgroundColor: statusBg, color: statusColor }}>
                                                            {item.status || 'Unknown'}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '14px 12px', fontSize: '12px' }}>
                                                        <span style={{ padding: '4px 8px', borderRadius: '4px', backgroundColor: item.emailConfirmed ? '#d1fae5' : '#fef3c7', color: item.emailConfirmed ? '#065f46' : '#92400e', fontWeight: 600 }}>
                                                            {item.emailConfirmed ? '✓' : '✗'}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '14px 12px', fontSize: '12px', textAlign: 'center' }}>
                                                        <span style={{ padding: '4px 8px', borderRadius: '4px', backgroundColor: item.isPremium ? '#dbeafe' : '#f3f4f6', color: item.isPremium ? '#1e40af' : '#6b7280', fontWeight: 600 }}>
                                                            {item.isPremium ? '⭐' : '-'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </>
                )}
            </div>
        );
    };

    const renderStaffSection = () => (
        <div className={styles.card}>
            <div style={{ marginBottom: '24px' }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Tạo Staff Vận Hành
                </h3>
                
                {staffSuccess && (
                    <div style={{ padding: '12px 16px', marginBottom: '16px', backgroundColor: '#d1fae5', border: '1px solid #6ee7b7', borderRadius: '6px', color: '#065f46', fontWeight: 600, fontSize: '14px' }}>
                        ✓ {staffSuccess}
                    </div>
                )}

                {staffError && (
                    <div style={{ padding: '12px 16px', marginBottom: '16px', backgroundColor: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '6px', color: '#991b1b', fontWeight: 600, fontSize: '14px' }}>
                        ✕ {staffError}
                    </div>
                )}

                <form onSubmit={handleCreateStaff} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    {/* Username */}
                    <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                            Username *
                        </label>
                        <input
                            type="text"
                            value={staffFormData.userName}
                            onChange={(e) => setStaffFormData({ ...staffFormData, userName: e.target.value })}
                            placeholder="Nhập username"
                            style={{
                                width: '100%',
                                padding: '10px 12px',
                                border: '1px solid var(--border-color)',
                                borderRadius: '6px',
                                fontSize: '14px',
                                backgroundColor: 'var(--bg-primary)',
                                color: 'var(--text-primary)',
                                boxSizing: 'border-box'
                            }}
                        />
                    </div>

                    {/* Full Name */}
                    <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                            Họ và Tên
                        </label>
                        <input
                            type="text"
                            value={staffFormData.fullName}
                            onChange={(e) => setStaffFormData({ ...staffFormData, fullName: e.target.value })}
                            placeholder="Nhập họ và tên"
                            style={{
                                width: '100%',
                                padding: '10px 12px',
                                border: '1px solid var(--border-color)',
                                borderRadius: '6px',
                                fontSize: '14px',
                                backgroundColor: 'var(--bg-primary)',
                                color: 'var(--text-primary)',
                                boxSizing: 'border-box'
                            }}
                        />
                    </div>

                    {/* Email */}
                    <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                            Email *
                        </label>
                        <input
                            type="email"
                            value={staffFormData.email}
                            onChange={(e) => setStaffFormData({ ...staffFormData, email: e.target.value })}
                            placeholder="Nhập email"
                            style={{
                                width: '100%',
                                padding: '10px 12px',
                                border: '1px solid var(--border-color)',
                                borderRadius: '6px',
                                fontSize: '14px',
                                backgroundColor: 'var(--bg-primary)',
                                color: 'var(--text-primary)',
                                boxSizing: 'border-box'
                            }}
                        />
                    </div>

                    {/* Phone Number */}
                    <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                            Số điện thoại
                        </label>
                        <input
                            type="tel"
                            value={staffFormData.phoneNumber}
                            onChange={(e) => setStaffFormData({ ...staffFormData, phoneNumber: e.target.value })}
                            placeholder="Nhập số điện thoại"
                            style={{
                                width: '100%',
                                padding: '10px 12px',
                                border: '1px solid var(--border-color)',
                                borderRadius: '6px',
                                fontSize: '14px',
                                backgroundColor: 'var(--bg-primary)',
                                color: 'var(--text-primary)',
                                boxSizing: 'border-box'
                            }}
                        />
                    </div>

                    {/* Password */}
                    <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                            Mật khẩu *
                        </label>
                        <input
                            type="password"
                            value={staffFormData.password}
                            onChange={(e) => setStaffFormData({ ...staffFormData, password: e.target.value })}
                            placeholder="Nhập mật khẩu"
                            style={{
                                width: '100%',
                                padding: '10px 12px',
                                border: '1px solid var(--border-color)',
                                borderRadius: '6px',
                                fontSize: '14px',
                                backgroundColor: 'var(--bg-primary)',
                                color: 'var(--text-primary)',
                                boxSizing: 'border-box'
                            }}
                        />
                    </div>

                    {/* Confirm Password */}
                    <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                            Xác nhận mật khẩu *
                        </label>
                        <input
                            type="password"
                            value={staffFormData.confirmPassword}
                            onChange={(e) => setStaffFormData({ ...staffFormData, confirmPassword: e.target.value })}
                            placeholder="Nhập lại mật khẩu"
                            style={{
                                width: '100%',
                                padding: '10px 12px',
                                border: '1px solid var(--border-color)',
                                borderRadius: '6px',
                                fontSize: '14px',
                                backgroundColor: 'var(--bg-primary)',
                                color: 'var(--text-primary)',
                                boxSizing: 'border-box'
                            }}
                        />
                    </div>

                    {/* Date of Birth */}
                    <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                            Ngày sinh
                        </label>
                        <input
                            type="date"
                            value={staffFormData.dateOfBirth}
                            onChange={(e) => setStaffFormData({ ...staffFormData, dateOfBirth: e.target.value })}
                            style={{
                                width: '100%',
                                padding: '10px 12px',
                                border: '1px solid var(--border-color)',
                                borderRadius: '6px',
                                fontSize: '14px',
                                backgroundColor: 'var(--bg-primary)',
                                color: 'var(--text-primary)',
                                boxSizing: 'border-box'
                            }}
                        />
                    </div>

                    {/* Premium & Status */}
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                            <input
                                type="checkbox"
                                checked={staffFormData.isPremium}
                                onChange={(e) => setStaffFormData({ ...staffFormData, isPremium: e.target.checked })}
                                style={{ cursor: 'pointer' }}
                            />
                            Premium
                        </label>
                    </div>

                    {/* Submit Button */}
                    <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '12px', marginTop: '12px' }}>
                        <button
                            type="submit"
                            disabled={isSubmittingStaff}
                            style={{
                                flex: 1,
                                padding: '12px 20px',
                                backgroundColor: isSubmittingStaff ? '#9ca3af' : 'var(--primary-blue)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                fontWeight: 700,
                                fontSize: '14px',
                                cursor: isSubmittingStaff ? 'not-allowed' : 'pointer',
                                transition: 'background-color 0.2s'
                            }}
                        >
                            {isSubmittingStaff ? '⏳ Đang tạo...' : '➕ Tạo Staff'}
                        </button>
                        <button
                            type="button"
                            onClick={() => setStaffFormData({
                                userName: '',
                                fullName: '',
                                email: '',
                                phoneNumber: '',
                                password: '',
                                confirmPassword: '',
                                status: 'Active',
                                isPremium: false,
                                dateOfBirth: ''
                            })}
                            style={{
                                padding: '12px 20px',
                                backgroundColor: 'var(--bg-secondary)',
                                color: 'var(--text-secondary)',
                                border: '1px solid var(--border-color)',
                                borderRadius: '6px',
                                fontWeight: 700,
                                fontSize: '14px',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                        >
                            ↻ Làm mới
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );

    const renderTransactionsSection = () => (
        <div className={styles.card}>
            {isLoadingTransactions ? (
                <div className={styles.loadingState}>
                    <Loader2 size={24} className={styles.spinner} />
                    <span>Đang tải giao dịch...</span>
                </div>
            ) : transactionError ? (
                <div className={styles.emptyState}>
                    <p style={{ margin: 0, color: '#ef4444', fontSize: '15px' }}>{transactionError}</p>
                </div>
            ) : (
                <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid var(--border-color)' }}>
                        <div>
                            <p className={styles.subtitle} style={{ margin: '0 0 4px 0', fontSize: '13px' }}>
                                Danh sách giao dịch
                            </p>
                            <p style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
                                {transactionsMeta.totalCount} giao dịch
                            </p>
                        </div>
                        <button className={styles.secondaryBtn} onClick={() => fetchTransactions(transactionsMeta.page, transactionsMeta.pageSize)}>
                            ↻ Làm mới
                        </button>
                    </div>

                    {transactions.length === 0 ? (
                        <div className={styles.emptyState}>
                            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '15px' }}>Không có giao dịch nào</p>
                        </div>
                    ) : (
                        <>
                            <div className={styles.tableWrapper} style={{ borderRadius: '8px', overflow: 'hidden' }}>
                                <table className={styles.docsTable} style={{ tableLayout: 'fixed' }}>
                                    <thead>
                                        <tr style={{ backgroundColor: 'var(--bg-secondary)' }}>
                                            <th style={{ padding: '14px 12px', fontWeight: 700, fontSize: '13px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', width: '8%' }}>Mã GD</th>
                                            <th style={{ padding: '14px 12px', fontWeight: 700, fontSize: '13px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', width: '25%' }}>Người dùng</th>
                                            <th style={{ padding: '14px 12px', fontWeight: 700, fontSize: '13px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', width: '14%' }}>Số tiền</th>
                                            <th style={{ padding: '14px 12px', fontWeight: 700, fontSize: '13px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', width: '12%' }}>Loại</th>
                                            <th style={{ padding: '14px 12px', fontWeight: 700, fontSize: '13px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', width: '15%' }}>Trạng thái</th>
                                            <th style={{ padding: '14px 12px', fontWeight: 700, fontSize: '13px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', width: '14%' }}>Tham chiếu</th>
                                            <th style={{ padding: '14px 12px', fontWeight: 700, fontSize: '13px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', width: '12%' }}>Thời gian</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {transactions.map((item, idx) => {
                                            const statusLower = String(item.status || '').toLowerCase();
                                            let statusColor = '#f59e0b'; // pending - amber
                                            let statusBg = '#fef3c7';
                                            if (statusLower === 'completed') {
                                                statusColor = '#10b981'; // green
                                                statusBg = '#d1fae5';
                                            } else if (statusLower === 'failed') {
                                                statusColor = '#ef4444'; // red
                                                statusBg = '#fee2e2';
                                            }

                                            return (
                                                <tr key={item.transactionId} style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: idx % 2 === 0 ? 'transparent' : 'var(--bg-secondary)', transition: 'background-color 0.2s' }}>
                                                    <td style={{ padding: '14px 12px', fontWeight: 700, color: 'var(--primary-blue)', fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                        #{item.transactionId}
                                                    </td>
                                                    <td style={{ padding: '14px 12px' }}>
                                                        <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)', marginBottom: '3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                            {item.userName || 'N/A'}
                                                        </div>
                                                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                            {item.userEmail || 'N/A'}
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '14px 12px', fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                                                        {Number(item.amount || 0).toLocaleString('vi-VN')}₫
                                                    </td>
                                                    <td style={{ padding: '14px 12px', fontSize: '13px', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                        {item.type || 'N/A'}
                                                    </td>
                                                    <td style={{ padding: '14px 12px' }}>
                                                        <span style={{ display: 'inline-block', padding: '5px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, backgroundColor: statusBg, color: statusColor, whiteSpace: 'nowrap' }}>
                                                            {item.status || 'Unknown'}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '14px 12px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                                                        <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.referenceType || '-'}</div>
                                                        {item.referenceId && <div style={{ fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>#{item.referenceId}</div>}
                                                    </td>
                                                    <td style={{ padding: '14px 12px', fontSize: '12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                                                        {item.createdAt ? new Date(item.createdAt).toLocaleString('vi-VN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-'}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {transactionsMeta.totalPages > 1 && (
                                <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
                                    <button
                                        className={styles.secondaryBtn}
                                        disabled={transactionsMeta.page <= 1 || isLoadingTransactions}
                                        style={{ opacity: transactionsMeta.page <= 1 ? 0.5 : 1 }}
                                        onClick={() => fetchTransactions(transactionsMeta.page - 1, transactionsMeta.pageSize)}
                                    >
                                        ← Trước
                                    </button>
                                    <span style={{ alignSelf: 'center', fontSize: '14px', color: 'var(--text-secondary)', fontWeight: 600, minWidth: '100px', textAlign: 'center' }}>
                                        Trang {transactionsMeta.page}/{transactionsMeta.totalPages}
                                    </span>
                                    <button
                                        className={styles.secondaryBtn}
                                        disabled={transactionsMeta.page >= transactionsMeta.totalPages || isLoadingTransactions}
                                        style={{ opacity: transactionsMeta.page >= transactionsMeta.totalPages ? 0.5 : 1 }}
                                        onClick={() => fetchTransactions(transactionsMeta.page + 1, transactionsMeta.pageSize)}
                                    >
                                        Sau →
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </>
            )}
        </div>
    );

    const renderAccountProfileSection = () => (
        <AccountProfileTab user={user} />
    );

    return (
        <div className={styles.container}>
            <div className={styles.content}>
                <DashboardSection
                    title={currentSection.label}
                    topBarExtra={(
                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                            Module: {currentSection.id}
                        </span>
                    )}
                >
                    {activeSection === 'transactions' ? renderTransactionsSection() : activeSection === 'users' ? renderUsersSection() : activeSection === 'staff' ? renderStaffSection() : activeSection === 'account_profile' ? renderAccountProfileSection() : (
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
