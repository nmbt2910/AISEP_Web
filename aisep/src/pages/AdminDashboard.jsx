import React, { useMemo, useState, useEffect } from 'react';
import { Users, Database, ChevronRight, Loader2, ShieldCheck, Save, Plus, Factory, Milestone, Shield, History } from 'lucide-react';
import styles from '../styles/SharedDashboard.module.css';
import DashboardSection from '../components/common/DashboardSection';
import adminService from '../services/adminService';
import TermsManagement from '../components/admin/TermsManagement';
import AccountProfileTab from '../components/common/AccountProfileTab';
import PackageManagement from '../components/staff/PackageManagement';
import GlobalSubscriptionHistory from '../components/staff/GlobalSubscriptionHistory';

const ADMIN_SECTIONS = [
    { id: 'users', label: 'Quản lý người dùng', icon: Users, description: 'Danh sách, quyền và trạng thái tài khoản.' },
    { id: 'staff', label: 'Quản lý Staff', icon: Users, description: 'Tạo và quản lý tài khoản staff vận hành.' },
    { id: 'transactions', label: 'Giao dịch', icon: Database, description: 'Theo dõi giao dịch thanh toán toàn hệ thống.' },
    { id: 'package_management', label: 'Quản lý gói', icon: Shield, description: 'Cấu hình gói đăng ký Investor và Startup.' },
    { id: 'subscription_history', label: 'Lịch sử đăng ký gói', icon: History, description: 'Theo dõi lịch sử đăng ký gói người dùng.' },
    { id: 'industry_options', label: 'Ngành nghề', icon: Factory, description: 'Danh mục ngành (industry options) dùng trong form startup và hệ thống.' },
    { id: 'stage_options', label: 'Giai đoạn dự án', icon: Milestone, description: 'Các giai đoạn dự án (stage options): Idea, MVP, Growth, v.v.' },
    { id: 'validation_rules', label: 'Rule validate động', icon: ShieldCheck, description: 'Cấu hình validate theo từng formKey.' },
    { id: 'terms', label: 'Quản lý Điều khoản', icon: ShieldCheck, description: 'Cập nhật và quản lý lịch sử điều khoản hệ thống.' },
    { id: 'account_profile', label: 'Hồ sơ người dùng', icon: Users, description: 'Quản lý thông tin cá nhân và mật khẩu.' },
];

export default function AdminDashboard({ user, initialSection = 'users' }) {
    const normalizedInitialSection = ADMIN_SECTIONS.some((s) => s.id === initialSection) ? initialSection : 'users';
    const [activeSection, setActiveSection] = useState(normalizedInitialSection);
    const [transactions, setTransactions] = useState([]);
    const [transactionsMeta, setTransactionsMeta] = useState({ page: 1, pageSize: 1000, totalCount: 0, totalPages: 1 });
    const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
    const [transactionError, setTransactionError] = useState('');
    const termsRef = React.useRef(null);
    
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
    const [selectedFormKey, setSelectedFormKey] = useState('startup.create');
    const [validationItems, setValidationItems] = useState([]);
    const [validationMeta, setValidationMeta] = useState({ page: 1, pageSize: 50, totalCount: 0, totalPages: 1 });
    const [isLoadingValidationRules, setIsLoadingValidationRules] = useState(false);
    const [validationError, setValidationError] = useState('');
    const [validationSuccess, setValidationSuccess] = useState('');
    const [ruleDrafts, setRuleDrafts] = useState({});
    const [savingRuleIds, setSavingRuleIds] = useState({});

    const [industryItems, setIndustryItems] = useState([]);
    const [industryMeta, setIndustryMeta] = useState({ page: 1, pageSize: 10, totalCount: 0, totalPages: 1 });
    const [isLoadingIndustry, setIsLoadingIndustry] = useState(false);
    const [industryError, setIndustryError] = useState('');
    const [industrySuccess, setIndustrySuccess] = useState('');
    const [newIndustryValue, setNewIndustryValue] = useState('');
    const [newIndustryActive, setNewIndustryActive] = useState(true);
    const [isSubmittingIndustry, setIsSubmittingIndustry] = useState(false);
    const [industryTogglingId, setIndustryTogglingId] = useState(null);

    const [stageItems, setStageItems] = useState([]);
    const [stageMeta, setStageMeta] = useState({ page: 1, pageSize: 10, totalCount: 0, totalPages: 1 });
    const [isLoadingStage, setIsLoadingStage] = useState(false);
    const [stageError, setStageError] = useState('');
    const [stageSuccess, setStageSuccess] = useState('');
    const [newStageValue, setNewStageValue] = useState('');
    const [newStageActive, setNewStageActive] = useState(true);
    const [isSubmittingStage, setIsSubmittingStage] = useState(false);
    const [stageTogglingId, setStageTogglingId] = useState(null);

    const FORM_KEYS = [
        'startup.create',
        'startup.update',
        'investor.create',
        'investor.update',
        'advisor.create',
        'advisor.update',
        'project.create',
        'project.update'
    ];

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

    const fetchIndustryOptions = async (page = 1, pageSize = 10, options = {}) => {
        const { silent = false, preserveMessages = false } = options;
        if (!silent) {
            setIsLoadingIndustry(true);
        }
        if (!preserveMessages) {
            setIndustryError('');
            setIndustrySuccess('');
        }
        try {
            const response = await adminService.getIndustryOptions({ page, pageSize });
            const payload = response?.data || response || {};
            const items = Array.isArray(payload?.items) ? payload.items : [];
            setIndustryItems(items);
            setIndustryMeta({
                page: payload?.page || page,
                pageSize: payload?.pageSize || pageSize,
                totalCount: payload?.totalCount ?? items.length,
                totalPages: payload?.totalPages || 1
            });
        } catch (error) {
            console.error('[AdminDashboard] Failed to fetch industry options:', error);
            setIndustryError('Không thể tải danh sách ngành nghề.');
            setIndustryItems([]);
        } finally {
            if (!silent) {
                setIsLoadingIndustry(false);
            }
        }
    };

    const handleIndustrySetActive = async (row, nextActive) => {
        if (!row?.id || row.isActive === nextActive) return;
        setIndustryTogglingId(row.id);
        setIndustryError('');
        try {
            if (nextActive) {
                await adminService.activateIndustryOption(row.id);
            } else {
                await adminService.deactivateIndustryOption(row.id);
            }
            setIndustrySuccess(nextActive ? 'Đã bật ngành nghề.' : 'Đã tắt ngành nghề.');
            setTimeout(() => setIndustrySuccess(''), 3500);
            await fetchIndustryOptions(industryMeta.page, industryMeta.pageSize, { silent: true, preserveMessages: true });
        } catch (error) {
            console.error('[AdminDashboard] Failed to toggle industry option:', error);
            const msg = error?.response?.data?.message || error?.message;
            setIndustryError(msg || 'Không thể cập nhật trạng thái ngành nghề.');
        } finally {
            setIndustryTogglingId(null);
        }
    };

    const handleCreateIndustry = async (e) => {
        e.preventDefault();
        setIndustryError('');
        setIndustrySuccess('');
        const trimmed = newIndustryValue.trim();
        if (!trimmed) {
            setIndustryError('Vui lòng nhập giá trị ngành (value).');
            return;
        }
        setIsSubmittingIndustry(true);
        try {
            await adminService.createIndustryOption({ value: trimmed, isActive: newIndustryActive });
            setIndustrySuccess('Đã tạo ngành nghề thành công.');
            setNewIndustryValue('');
            setNewIndustryActive(true);
            setTimeout(() => setIndustrySuccess(''), 4000);
            await fetchIndustryOptions(industryMeta.page, industryMeta.pageSize, { preserveMessages: true });
        } catch (error) {
            console.error('[AdminDashboard] Failed to create industry option:', error);
            const msg = error?.response?.data?.message || error?.message;
            setIndustryError(msg || 'Không thể tạo ngành nghề.');
        } finally {
            setIsSubmittingIndustry(false);
        }
    };

    const fetchStageOptions = async (page = 1, pageSize = 10, options = {}) => {
        const { silent = false, preserveMessages = false } = options;
        if (!silent) {
            setIsLoadingStage(true);
        }
        if (!preserveMessages) {
            setStageError('');
            setStageSuccess('');
        }
        try {
            const response = await adminService.getStageOptions({ page, pageSize });
            const payload = response?.data || response || {};
            const items = Array.isArray(payload?.items) ? payload.items : [];
            setStageItems(items);
            setStageMeta({
                page: payload?.page || page,
                pageSize: payload?.pageSize || pageSize,
                totalCount: payload?.totalCount ?? items.length,
                totalPages: payload?.totalPages || 1
            });
        } catch (error) {
            console.error('[AdminDashboard] Failed to fetch stage options:', error);
            setStageError('Không thể tải danh sách giai đoạn dự án.');
            setStageItems([]);
        } finally {
            if (!silent) {
                setIsLoadingStage(false);
            }
        }
    };

    const handleStageSetActive = async (row, nextActive) => {
        if (!row?.id || row.isActive === nextActive) return;
        setStageTogglingId(row.id);
        setStageError('');
        try {
            if (nextActive) {
                await adminService.activateStageOption(row.id);
            } else {
                await adminService.deactivateStageOption(row.id);
            }
            setStageSuccess(nextActive ? 'Đã bật giai đoạn.' : 'Đã tắt giai đoạn.');
            setTimeout(() => setStageSuccess(''), 3500);
            await fetchStageOptions(stageMeta.page, stageMeta.pageSize, { silent: true, preserveMessages: true });
        } catch (error) {
            console.error('[AdminDashboard] Failed to toggle stage option:', error);
            const msg = error?.response?.data?.message || error?.message;
            setStageError(msg || 'Không thể cập nhật trạng thái giai đoạn.');
        } finally {
            setStageTogglingId(null);
        }
    };

    const handleCreateStage = async (e) => {
        e.preventDefault();
        setStageError('');
        setStageSuccess('');
        const trimmed = newStageValue.trim();
        if (!trimmed) {
            setStageError('Vui lòng nhập giá trị giai đoạn (value).');
            return;
        }
        setIsSubmittingStage(true);
        try {
            await adminService.createStageOption({ value: trimmed, isActive: newStageActive });
            setStageSuccess('Đã tạo giai đoạn thành công.');
            setNewStageValue('');
            setNewStageActive(true);
            setTimeout(() => setStageSuccess(''), 4000);
            await fetchStageOptions(stageMeta.page, stageMeta.pageSize, { preserveMessages: true });
        } catch (error) {
            console.error('[AdminDashboard] Failed to create stage option:', error);
            const msg = error?.response?.data?.message || error?.message;
            setStageError(msg || 'Không thể tạo giai đoạn.');
        } finally {
            setIsSubmittingStage(false);
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

    const toNullableNumber = (value) => {
        if (value === '' || value === null || value === undefined) return null;
        const num = Number(value);
        return Number.isNaN(num) ? null : num;
    };

    const sanitizeRegexAscii = (value) => {
        if (value === null || value === undefined) return '';
        const raw = String(value);
        // Regex rules in this module are expected to be ASCII-only.
        // Strip hidden/unicode noise characters that cause mojibake in UI.
        return raw
            .replace(/\uFFFD/g, "'")
            .replace(/[^\x20-\x7E]/g, '');
    };

    const buildRulePayload = (draft) => ({
        isRequired: !!draft.isRequired,
        minLength: toNullableNumber(draft.minLength),
        maxLength: toNullableNumber(draft.maxLength),
        customRegexPattern: draft.customRegexPattern?.trim()
            ? sanitizeRegexAscii(draft.customRegexPattern.trim())
            : null,
        minValue: toNullableNumber(draft.minValue),
        maxValue: toNullableNumber(draft.maxValue),
        allowedFileTypes: draft.allowedFileTypesInput?.trim()
            ? draft.allowedFileTypesInput.split(',').map(t => t.trim()).filter(Boolean)
            : [],
        maxFileSizeBytes: toNullableNumber(draft.maxFileSizeBytes)
    });

    const fetchValidationRules = async (formKey = selectedFormKey, page = 1, pageSize = 50) => {
        setIsLoadingValidationRules(true);
        setValidationError('');
        setValidationSuccess('');
        try {
            const response = await adminService.getFormValidationRules(formKey, { page, pageSize });
            const payload = response?.data || response || {};
            const data = payload?.data || payload;
            const items = Array.isArray(data?.items) ? data.items : [];

            setValidationItems(items);
            setValidationMeta({
                page: data?.page || page,
                pageSize: data?.pageSize || pageSize,
                totalCount: data?.totalCount || items.length,
                totalPages: data?.totalPages || 1
            });

            const draftMap = {};
            items.forEach((item) => {
                draftMap[item.id] = {
                    ...item,
                    customRegexPattern: sanitizeRegexAscii(item.customRegexPattern || ''),
                    allowedFileTypesInput: Array.isArray(item.allowedFileTypes) ? item.allowedFileTypes.join(', ') : '',
                };
            });
            setRuleDrafts(draftMap);
        } catch (error) {
            console.error('[AdminDashboard] Failed to fetch validation rules:', error);
            setValidationError('Không thể tải danh sách rule validation.');
            setValidationItems([]);
        } finally {
            setIsLoadingValidationRules(false);
        }
    };

    const handleRuleDraftChange = (ruleId, key, value) => {
        setRuleDrafts(prev => ({
            ...prev,
            [ruleId]: {
                ...prev[ruleId],
                [key]: value
            }
        }));
    };

    const handleSaveRule = async (ruleId) => {
        const draft = ruleDrafts[ruleId];
        if (!draft) return;

        if (
            draft.minLength !== '' &&
            draft.maxLength !== '' &&
            draft.minLength !== null &&
            draft.maxLength !== null &&
            Number(draft.minLength) > Number(draft.maxLength)
        ) {
            setValidationError(`Rule #${ruleId}: minLength không thể lớn hơn maxLength.`);
            return;
        }

        if (
            draft.minValue !== '' &&
            draft.maxValue !== '' &&
            draft.minValue !== null &&
            draft.maxValue !== null &&
            Number(draft.minValue) > Number(draft.maxValue)
        ) {
            setValidationError(`Rule #${ruleId}: minValue không thể lớn hơn maxValue.`);
            return;
        }

        setValidationError('');
        setValidationSuccess('');
        setSavingRuleIds(prev => ({ ...prev, [ruleId]: true }));
        try {
            const payload = buildRulePayload(draft);
            await adminService.updateFormValidationRule(ruleId, payload);
            setValidationSuccess(`Đã cập nhật rule #${ruleId} thành công.`);
            await fetchValidationRules(selectedFormKey, validationMeta.page, validationMeta.pageSize);
        } catch (error) {
            console.error('[AdminDashboard] Failed to update validation rule:', error);
            setValidationError(error?.message || `Không thể cập nhật rule #${ruleId}.`);
        } finally {
            setSavingRuleIds(prev => ({ ...prev, [ruleId]: false }));
        }
    };

    useEffect(() => {
        if (activeSection === 'transactions') {
            fetchTransactions(1);
        }
        if (activeSection === 'users') {
            fetchUsers(1);
        }
        if (activeSection === 'staff') {
            fetchUsers(1);
        }
        if (activeSection === 'validation_rules') {
            fetchValidationRules(selectedFormKey, 1, validationMeta.pageSize);
        }
        if (activeSection === 'industry_options') {
            fetchIndustryOptions(industryMeta.page, industryMeta.pageSize);
        }
        if (activeSection === 'stage_options') {
            fetchStageOptions(stageMeta.page, stageMeta.pageSize);
        }
    }, [activeSection]);

    useEffect(() => {
        if (activeSection === 'validation_rules') {
            fetchValidationRules(selectedFormKey, 1, validationMeta.pageSize);
        }
    }, [selectedFormKey]);

    // Sync activeSection with initialSection prop when it changes
    useEffect(() => {
        const nextSection = ADMIN_SECTIONS.some((s) => s.id === initialSection) ? initialSection : 'users';
        if (nextSection !== activeSection) {
            setActiveSection(nextSection);
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
                                    {role} ({roleStats[role]})
                                </button>
                            ))}
                        </div>

                        {filteredUsers.length === 0 ? (
                            <div className={styles.emptyState}>
                                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '15px' }}>Không có người dùng nào với vai trò {selectedUserRole}</p>
                            </div>
                        ) : (
                            <div className={styles.tableWrapper} style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                                <table className={styles.docsTable} style={{ tableLayout: 'fixed' }}>
                                    <thead>
                                        <tr style={{ backgroundColor: 'var(--bg-secondary)' }}>
                                            <th style={{ padding: '14px 12px', fontWeight: 700, fontSize: '13px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', width: '24%' }}>Username</th>
                                            <th style={{ padding: '14px 12px', fontWeight: 700, fontSize: '13px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', width: '29%' }}>Email</th>
                                            <th style={{ padding: '14px 12px', fontWeight: 700, fontSize: '13px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', width: '13%' }}>Role</th>
                                            <th style={{ padding: '14px 12px', fontWeight: 700, fontSize: '13px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', width: '16%' }}>Trạng thái</th>
                                            <th style={{ padding: '14px 12px', fontWeight: 700, fontSize: '13px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', width: '10%' }}>Email OK</th>
                                            <th style={{ padding: '14px 12px', fontWeight: 700, fontSize: '13px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', width: '8%' }}>Premium</th>
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

    const renderStaffSection = () => {
        const staffList = users.filter(u => u.role === 'Staff');
        const resetStaffForm = () => setStaffFormData({
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

        const inputStyle = {
            width: '100%',
            padding: '9px 11px',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            fontSize: '13px',
            backgroundColor: 'var(--bg-primary)',
            color: 'var(--text-primary)',
            boxSizing: 'border-box'
        };

        return (
        <div>
            <div className={styles.card} style={{ borderRadius: '14px' }}>
                <div style={{ marginBottom: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <div>
                        <h3 style={{ margin: '0 0 4px 0', fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)' }}>
                            Tạo Staff Vận Hành
                        </h3>
                        <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)' }}>
                            Form gọn cho thao tác tạo staff nhanh.
                        </p>
                    </div>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                        <input
                            type="checkbox"
                            checked={staffFormData.isPremium}
                            onChange={(e) => setStaffFormData({ ...staffFormData, isPremium: e.target.checked })}
                            style={{ cursor: 'pointer' }}
                        />
                        Premium
                    </label>
                </div>

                {staffSuccess && (
                    <div style={{ padding: '10px 12px', marginBottom: '12px', backgroundColor: '#d1fae5', border: '1px solid #6ee7b7', borderRadius: '8px', color: '#065f46', fontWeight: 600, fontSize: '13px' }}>
                        {staffSuccess}
                    </div>
                )}

                {staffError && (
                    <div style={{ padding: '10px 12px', marginBottom: '12px', backgroundColor: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '8px', color: '#991b1b', fontWeight: 600, fontSize: '13px' }}>
                        {staffError}
                    </div>
                )}

                <form onSubmit={handleCreateStaff} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '5px' }}>Username *</label>
                        <input type="text" value={staffFormData.userName} onChange={(e) => setStaffFormData({ ...staffFormData, userName: e.target.value })} placeholder="staff.username" style={inputStyle} />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '5px' }}>Họ và Tên</label>
                        <input type="text" value={staffFormData.fullName} onChange={(e) => setStaffFormData({ ...staffFormData, fullName: e.target.value })} placeholder="Nguyễn Văn A" style={inputStyle} />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '5px' }}>Email *</label>
                        <input type="email" value={staffFormData.email} onChange={(e) => setStaffFormData({ ...staffFormData, email: e.target.value })} placeholder="staff@aisep.com" style={inputStyle} />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '5px' }}>Số điện thoại</label>
                        <input type="tel" value={staffFormData.phoneNumber} onChange={(e) => setStaffFormData({ ...staffFormData, phoneNumber: e.target.value })} placeholder="09xxxxxxxx" style={inputStyle} />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '5px' }}>Mật khẩu *</label>
                        <input type="password" value={staffFormData.password} onChange={(e) => setStaffFormData({ ...staffFormData, password: e.target.value })} placeholder="••••••••" style={inputStyle} />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '5px' }}>Xác nhận mật khẩu *</label>
                        <input type="password" value={staffFormData.confirmPassword} onChange={(e) => setStaffFormData({ ...staffFormData, confirmPassword: e.target.value })} placeholder="••••••••" style={inputStyle} />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '5px' }}>Ngày sinh</label>
                        <input type="date" value={staffFormData.dateOfBirth} onChange={(e) => setStaffFormData({ ...staffFormData, dateOfBirth: e.target.value })} style={inputStyle} />
                    </div>

                    <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
                        <button
                            type="button"
                            onClick={resetStaffForm}
                            style={{
                                padding: '8px 12px',
                                backgroundColor: 'var(--bg-secondary)',
                                color: 'var(--text-secondary)',
                                border: '1px solid var(--border-color)',
                                borderRadius: '8px',
                                fontWeight: 600,
                                fontSize: '12px',
                                cursor: 'pointer'
                            }}
                        >
                            Làm mới
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmittingStaff}
                            style={{
                                padding: '8px 14px',
                                backgroundColor: isSubmittingStaff ? '#9ca3af' : 'var(--primary-blue)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                fontWeight: 700,
                                fontSize: '12px',
                                cursor: isSubmittingStaff ? 'not-allowed' : 'pointer'
                            }}
                        >
                            {isSubmittingStaff ? 'Đang tạo...' : 'Tạo Staff'}
                        </button>
                    </div>
                </form>
            </div>

            <div className={styles.card} style={{ marginTop: '16px', borderRadius: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid var(--border-color)' }}>
                    <div>
                        <p className={styles.subtitle} style={{ margin: '0 0 4px 0', fontSize: '13px' }}>
                            Danh sách staff
                        </p>
                        <p style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
                            {staffList.length} staff
                        </p>
                    </div>
                    <button className={styles.secondaryBtn} onClick={() => fetchUsers(1)} disabled={isLoadingUsers}>
                        ↻ Làm mới
                    </button>
                </div>

                {isLoadingUsers ? (
                    <div className={styles.loadingState}>
                        <Loader2 size={24} className={styles.spinner} />
                        <span>Đang tải staff...</span>
                    </div>
                ) : staffList.length === 0 ? (
                    <div className={styles.emptyState}>
                        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '15px' }}>Không có staff nào</p>
                    </div>
                ) : (
                    <div className={styles.tableWrapper} style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                        <table className={styles.docsTable} style={{ tableLayout: 'fixed' }}>
                            <thead>
                                <tr style={{ backgroundColor: 'var(--bg-secondary)' }}>
                                    <th style={{ padding: '14px 12px', fontWeight: 700, fontSize: '13px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', width: '24%' }}>Username</th>
                                    <th style={{ padding: '14px 12px', fontWeight: 700, fontSize: '13px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', width: '28%' }}>Họ và Tên</th>
                                    <th style={{ padding: '14px 12px', fontWeight: 700, fontSize: '13px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', width: '28%' }}>Email</th>
                                    <th style={{ padding: '14px 12px', fontWeight: 700, fontSize: '13px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', width: '20%' }}>Trạng thái</th>
                                </tr>
                            </thead>
                            <tbody>
                                {staffList.map((staff, idx) => {
                                    const statusLower = String(staff.status || '').toLowerCase();
                                    let statusColor = '#f59e0b';
                                    let statusBg = '#fef3c7';
                                    if (statusLower === 'active') {
                                        statusColor = '#10b981';
                                        statusBg = '#d1fae5';
                                    }

                                    return (
                                        <tr key={staff.userId} style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: idx % 2 === 0 ? 'transparent' : 'var(--bg-secondary)' }}>
                                            <td style={{ padding: '14px 12px', fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {staff.userName || 'N/A'}
                                            </td>
                                            <td style={{ padding: '14px 12px', fontSize: '13px', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {staff.fullName || 'N/A'}
                                            </td>
                                            <td style={{ padding: '14px 12px', fontSize: '12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {staff.email || 'N/A'}
                                            </td>
                                            <td style={{ padding: '14px 12px' }}>
                                                <span style={{ display: 'inline-block', padding: '5px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, backgroundColor: statusBg, color: statusColor }}>
                                                    {staff.status || 'Unknown'}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
        );
    };

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
                            <div className={styles.tableWrapper} style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                                <table className={styles.docsTable} style={{ tableLayout: 'fixed' }}>
                                    <thead>
                                        <tr style={{ backgroundColor: 'var(--bg-secondary)' }}>
                                            <th style={{ padding: '14px 12px', fontWeight: 700, fontSize: '13px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', width: '34%' }}>Người dùng</th>
                                            <th style={{ padding: '14px 12px', fontWeight: 700, fontSize: '13px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', width: '20%' }}>Số tiền</th>
                                            <th style={{ padding: '14px 12px', fontWeight: 700, fontSize: '13px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', width: '16%' }}>Loại</th>
                                            <th style={{ padding: '14px 12px', fontWeight: 700, fontSize: '13px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', width: '16%' }}>Trạng thái</th>
                                            <th style={{ padding: '14px 12px', fontWeight: 700, fontSize: '13px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', width: '14%' }}>Thời gian</th>
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

    const renderIndustryOptionsSection = () => {
        const inputStyle = {
            width: '100%',
            padding: '9px 11px',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            fontSize: '13px',
            backgroundColor: 'var(--bg-primary)',
            color: 'var(--text-primary)',
            boxSizing: 'border-box'
        };

        return (
            <div>
                <div className={styles.card} style={{ borderRadius: '14px', marginBottom: '16px' }}>
                    <div style={{ marginBottom: '14px' }}>
                        <h3 style={{ margin: '0 0 4px 0', fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)' }}>
                            Tạo ngành nghề mới
                        </h3>
                        <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)' }}>
                            Nhập mã hiển thị ngành và chọn có đang dùng hay không.
                        </p>
                    </div>

                    {industrySuccess && (
                        <div style={{ padding: '10px 12px', marginBottom: '12px', backgroundColor: '#d1fae5', border: '1px solid #6ee7b7', borderRadius: '8px', color: '#065f46', fontWeight: 600, fontSize: '13px' }}>
                            {industrySuccess}
                        </div>
                    )}
                    {industryError && (
                        <div style={{ padding: '10px 12px', marginBottom: '12px', backgroundColor: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '8px', color: '#991b1b', fontWeight: 600, fontSize: '13px' }}>
                            {industryError}
                        </div>
                    )}

                    <form onSubmit={handleCreateIndustry} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '12px', alignItems: 'end' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '5px' }}>Giá trị (value) *</label>
                            <input
                                type="text"
                                value={newIndustryValue}
                                onChange={(e) => setNewIndustryValue(e.target.value)}
                                placeholder="Ví dụ: Fintech, Agritech"
                                style={inputStyle}
                            />
                        </div>
                        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', paddingBottom: '10px' }}>
                            <input
                                type="checkbox"
                                checked={newIndustryActive}
                                onChange={(e) => setNewIndustryActive(e.target.checked)}
                                style={{ cursor: 'pointer' }}
                            />
                            Đang hoạt động
                        </label>
                        <button
                            type="submit"
                            disabled={isSubmittingIndustry}
                            style={{
                                padding: '9px 16px',
                                backgroundColor: isSubmittingIndustry ? '#9ca3af' : 'var(--primary-blue)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                fontWeight: 700,
                                fontSize: '12px',
                                cursor: isSubmittingIndustry ? 'not-allowed' : 'pointer',
                                whiteSpace: 'nowrap'
                            }}
                        >
                            {isSubmittingIndustry ? 'Đang tạo...' : 'Tạo mới'}
                        </button>
                    </form>
                </div>

                <div className={styles.card} style={{ borderRadius: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid var(--border-color)', flexWrap: 'wrap', gap: '10px' }}>
                        <div>
                            <p className={styles.subtitle} style={{ margin: '0 0 4px 0', fontSize: '13px' }}>
                                Danh sách ngành
                            </p>
                            <p style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
                                {industryMeta.totalCount} mục
                            </p>
                        </div>
                        <button className={styles.secondaryBtn} onClick={() => fetchIndustryOptions(industryMeta.page, industryMeta.pageSize)} disabled={isLoadingIndustry || industryTogglingId !== null}>
                            {isLoadingIndustry ? 'Đang tải...' : '↻ Làm mới'}
                        </button>
                    </div>

                    <p style={{ margin: '0 0 16px 0', fontSize: '12px', lineHeight: 1.5, color: 'var(--text-secondary)' }}>
                        <strong>Bật / Tắt</strong> gọi API kích hoạt hoặc vô hiệu hóa từng ngành: bản ghi vẫn lưu trong hệ thống nhưng{' '}
                        <code style={{ fontSize: '11px' }}>isActive</code> đổi theo — thường dùng để ẩn ngành khỏi danh sách chọn (dropdown, form đăng ký startup, v.v.) mà không xóa dữ liệu.
                    </p>

                    {isLoadingIndustry ? (
                        <div className={styles.loadingState}>
                            <Loader2 size={24} className={styles.spinner} />
                            <span>Đang tải danh sách ngành nghề...</span>
                        </div>
                    ) : industryItems.length === 0 ? (
                        <div className={styles.emptyState}>
                            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '15px' }}>Chưa có dữ liệu hoặc trang trống.</p>
                        </div>
                    ) : (
                        <>
                            <div className={styles.tableWrapper} style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                                <table className={styles.docsTable} style={{ tableLayout: 'fixed' }}>
                                    <thead>
                                        <tr style={{ backgroundColor: 'var(--bg-secondary)' }}>
                                            <th style={{ padding: '14px 12px', fontWeight: 700, fontSize: '13px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', width: '32%' }}>Giá trị</th>
                                            <th style={{ padding: '14px 12px', fontWeight: 700, fontSize: '13px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', width: '14%' }}>Trạng thái</th>
                                            <th style={{ padding: '14px 12px', fontWeight: 700, fontSize: '13px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', width: '22%' }}>Cập nhật</th>
                                            <th style={{ padding: '14px 12px', fontWeight: 700, fontSize: '13px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', width: '32%' }}>Thao tác</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {industryItems.map((row, idx) => (
                                            <tr key={row.id} style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: idx % 2 === 0 ? 'transparent' : 'var(--bg-secondary)' }}>
                                                <td style={{ padding: '14px 12px', fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)', wordBreak: 'break-word' }}>
                                                    {row.value ?? '—'}
                                                </td>
                                                <td style={{ padding: '14px 12px' }}>
                                                    <span style={{
                                                        display: 'inline-block',
                                                        padding: '5px 10px',
                                                        borderRadius: '6px',
                                                        fontSize: '12px',
                                                        fontWeight: 600,
                                                        backgroundColor: row.isActive ? '#d1fae5' : '#f3f4f6',
                                                        color: row.isActive ? '#065f46' : '#6b7280'
                                                    }}>
                                                        {row.isActive ? 'Hoạt động' : 'Tắt'}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '14px 12px', fontSize: '12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                                                    {row.updatedAt ? new Date(row.updatedAt).toLocaleString('vi-VN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'}
                                                </td>
                                                <td style={{ padding: '14px 12px' }}>
                                                    {industryTogglingId === row.id ? (
                                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                                                            <Loader2 size={14} className={styles.spinner} />
                                                            Đang xử lý…
                                                        </span>
                                                    ) : (
                                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleIndustrySetActive(row, true)}
                                                                disabled={row.isActive || industryTogglingId !== null}
                                                                style={{
                                                                    padding: '6px 10px',
                                                                    fontSize: '11px',
                                                                    fontWeight: 700,
                                                                    borderRadius: '6px',
                                                                    border: '1px solid #6ee7b7',
                                                                    backgroundColor: row.isActive ? 'var(--bg-secondary)' : '#ecfdf5',
                                                                    color: row.isActive ? 'var(--text-secondary)' : '#065f46',
                                                                    cursor: row.isActive || industryTogglingId !== null ? 'not-allowed' : 'pointer'
                                                                }}
                                                            >
                                                                Bật
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleIndustrySetActive(row, false)}
                                                                disabled={!row.isActive || industryTogglingId !== null}
                                                                style={{
                                                                    padding: '6px 10px',
                                                                    fontSize: '11px',
                                                                    fontWeight: 700,
                                                                    borderRadius: '6px',
                                                                    border: '1px solid #fca5a5',
                                                                    backgroundColor: !row.isActive ? 'var(--bg-secondary)' : '#fef2f2',
                                                                    color: !row.isActive ? 'var(--text-secondary)' : '#991b1b',
                                                                    cursor: !row.isActive || industryTogglingId !== null ? 'not-allowed' : 'pointer'
                                                                }}
                                                            >
                                                                Tắt
                                                            </button>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {industryMeta.totalPages > 1 && (
                                <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
                                    <button
                                        className={styles.secondaryBtn}
                                        disabled={industryMeta.page <= 1 || isLoadingIndustry || industryTogglingId !== null}
                                        style={{ opacity: industryMeta.page <= 1 ? 0.5 : 1 }}
                                        onClick={() => fetchIndustryOptions(industryMeta.page - 1, industryMeta.pageSize)}
                                    >
                                        ← Trước
                                    </button>
                                    <span style={{ alignSelf: 'center', fontSize: '14px', color: 'var(--text-secondary)', fontWeight: 600, minWidth: '100px', textAlign: 'center' }}>
                                        Trang {industryMeta.page}/{industryMeta.totalPages}
                                    </span>
                                    <button
                                        className={styles.secondaryBtn}
                                        disabled={industryMeta.page >= industryMeta.totalPages || isLoadingIndustry || industryTogglingId !== null}
                                        style={{ opacity: industryMeta.page >= industryMeta.totalPages ? 0.5 : 1 }}
                                        onClick={() => fetchIndustryOptions(industryMeta.page + 1, industryMeta.pageSize)}
                                    >
                                        Sau →
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        );
    };

    const renderStageOptionsSection = () => {
        const inputStyle = {
            width: '100%',
            padding: '9px 11px',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            fontSize: '13px',
            backgroundColor: 'var(--bg-primary)',
            color: 'var(--text-primary)',
            boxSizing: 'border-box'
        };

        return (
            <div>
                <div className={styles.card} style={{ borderRadius: '14px', marginBottom: '16px' }}>
                    <div style={{ marginBottom: '14px' }}>
                        <h3 style={{ margin: '0 0 4px 0', fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)' }}>
                            Tạo giai đoạn dự án mới
                        </h3>
                        <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)' }}>
                            Giá trị hiển thị (ví dụ Idea, MVP, Growth) và trạng thái sử dụng.
                        </p>
                    </div>

                    {stageSuccess && (
                        <div style={{ padding: '10px 12px', marginBottom: '12px', backgroundColor: '#d1fae5', border: '1px solid #6ee7b7', borderRadius: '8px', color: '#065f46', fontWeight: 600, fontSize: '13px' }}>
                            {stageSuccess}
                        </div>
                    )}
                    {stageError && (
                        <div style={{ padding: '10px 12px', marginBottom: '12px', backgroundColor: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '8px', color: '#991b1b', fontWeight: 600, fontSize: '13px' }}>
                            {stageError}
                        </div>
                    )}

                    <form onSubmit={handleCreateStage} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '12px', alignItems: 'end' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '5px' }}>Giá trị (value) *</label>
                            <input
                                type="text"
                                value={newStageValue}
                                onChange={(e) => setNewStageValue(e.target.value)}
                                placeholder="Ví dụ: Seed, Series A"
                                style={inputStyle}
                            />
                        </div>
                        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', paddingBottom: '10px' }}>
                            <input
                                type="checkbox"
                                checked={newStageActive}
                                onChange={(e) => setNewStageActive(e.target.checked)}
                                style={{ cursor: 'pointer' }}
                            />
                            Đang hoạt động
                        </label>
                        <button
                            type="submit"
                            disabled={isSubmittingStage}
                            style={{
                                padding: '9px 16px',
                                backgroundColor: isSubmittingStage ? '#9ca3af' : 'var(--primary-blue)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                fontWeight: 700,
                                fontSize: '12px',
                                cursor: isSubmittingStage ? 'not-allowed' : 'pointer',
                                whiteSpace: 'nowrap'
                            }}
                        >
                            {isSubmittingStage ? 'Đang tạo...' : 'Tạo mới'}
                        </button>
                    </form>
                </div>

                <div className={styles.card} style={{ borderRadius: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid var(--border-color)', flexWrap: 'wrap', gap: '10px' }}>
                        <div>
                            <p className={styles.subtitle} style={{ margin: '0 0 4px 0', fontSize: '13px' }}>
                                Danh sách giai đoạn
                            </p>
                            <p style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
                                {stageMeta.totalCount} mục
                            </p>
                        </div>
                        <button className={styles.secondaryBtn} onClick={() => fetchStageOptions(stageMeta.page, stageMeta.pageSize)} disabled={isLoadingStage || stageTogglingId !== null}>
                            {isLoadingStage ? 'Đang tải...' : '↻ Làm mới'}
                        </button>
                    </div>

                    <p style={{ margin: '0 0 16px 0', fontSize: '12px', lineHeight: 1.5, color: 'var(--text-secondary)' }}>
                        <strong>Bật / Tắt</strong> cập nhật <code style={{ fontSize: '11px' }}>isActive</code> cho từng giai đoạn — thường dùng để ẩn giai đoạn khỏi form tạo/cập nhật dự án mà không xóa bản ghi.
                    </p>

                    {isLoadingStage ? (
                        <div className={styles.loadingState}>
                            <Loader2 size={24} className={styles.spinner} />
                            <span>Đang tải danh sách giai đoạn...</span>
                        </div>
                    ) : stageItems.length === 0 ? (
                        <div className={styles.emptyState}>
                            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '15px' }}>Chưa có dữ liệu hoặc trang trống.</p>
                        </div>
                    ) : (
                        <>
                            <div className={styles.tableWrapper} style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                                <table className={styles.docsTable} style={{ tableLayout: 'fixed' }}>
                                    <thead>
                                        <tr style={{ backgroundColor: 'var(--bg-secondary)' }}>
                                            <th style={{ padding: '14px 12px', fontWeight: 700, fontSize: '13px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', width: '32%' }}>Giá trị</th>
                                            <th style={{ padding: '14px 12px', fontWeight: 700, fontSize: '13px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', width: '14%' }}>Trạng thái</th>
                                            <th style={{ padding: '14px 12px', fontWeight: 700, fontSize: '13px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', width: '22%' }}>Cập nhật</th>
                                            <th style={{ padding: '14px 12px', fontWeight: 700, fontSize: '13px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', width: '32%' }}>Thao tác</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {stageItems.map((row, idx) => (
                                            <tr key={row.id} style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: idx % 2 === 0 ? 'transparent' : 'var(--bg-secondary)' }}>
                                                <td style={{ padding: '14px 12px', fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)', wordBreak: 'break-word' }}>
                                                    {row.value ?? '—'}
                                                </td>
                                                <td style={{ padding: '14px 12px' }}>
                                                    <span style={{
                                                        display: 'inline-block',
                                                        padding: '5px 10px',
                                                        borderRadius: '6px',
                                                        fontSize: '12px',
                                                        fontWeight: 600,
                                                        backgroundColor: row.isActive ? '#d1fae5' : '#f3f4f6',
                                                        color: row.isActive ? '#065f46' : '#6b7280'
                                                    }}>
                                                        {row.isActive ? 'Hoạt động' : 'Tắt'}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '14px 12px', fontSize: '12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                                                    {row.updatedAt ? new Date(row.updatedAt).toLocaleString('vi-VN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'}
                                                </td>
                                                <td style={{ padding: '14px 12px' }}>
                                                    {stageTogglingId === row.id ? (
                                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                                                            <Loader2 size={14} className={styles.spinner} />
                                                            Đang xử lý…
                                                        </span>
                                                    ) : (
                                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleStageSetActive(row, true)}
                                                                disabled={row.isActive || stageTogglingId !== null}
                                                                style={{
                                                                    padding: '6px 10px',
                                                                    fontSize: '11px',
                                                                    fontWeight: 700,
                                                                    borderRadius: '6px',
                                                                    border: '1px solid #6ee7b7',
                                                                    backgroundColor: row.isActive ? 'var(--bg-secondary)' : '#ecfdf5',
                                                                    color: row.isActive ? 'var(--text-secondary)' : '#065f46',
                                                                    cursor: row.isActive || stageTogglingId !== null ? 'not-allowed' : 'pointer'
                                                                }}
                                                            >
                                                                Bật
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleStageSetActive(row, false)}
                                                                disabled={!row.isActive || stageTogglingId !== null}
                                                                style={{
                                                                    padding: '6px 10px',
                                                                    fontSize: '11px',
                                                                    fontWeight: 700,
                                                                    borderRadius: '6px',
                                                                    border: '1px solid #fca5a5',
                                                                    backgroundColor: !row.isActive ? 'var(--bg-secondary)' : '#fef2f2',
                                                                    color: !row.isActive ? 'var(--text-secondary)' : '#991b1b',
                                                                    cursor: !row.isActive || stageTogglingId !== null ? 'not-allowed' : 'pointer'
                                                                }}
                                                            >
                                                                Tắt
                                                            </button>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {stageMeta.totalPages > 1 && (
                                <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
                                    <button
                                        className={styles.secondaryBtn}
                                        disabled={stageMeta.page <= 1 || isLoadingStage || stageTogglingId !== null}
                                        style={{ opacity: stageMeta.page <= 1 ? 0.5 : 1 }}
                                        onClick={() => fetchStageOptions(stageMeta.page - 1, stageMeta.pageSize)}
                                    >
                                        ← Trước
                                    </button>
                                    <span style={{ alignSelf: 'center', fontSize: '14px', color: 'var(--text-secondary)', fontWeight: 600, minWidth: '100px', textAlign: 'center' }}>
                                        Trang {stageMeta.page}/{stageMeta.totalPages}
                                    </span>
                                    <button
                                        className={styles.secondaryBtn}
                                        disabled={stageMeta.page >= stageMeta.totalPages || isLoadingStage || stageTogglingId !== null}
                                        style={{ opacity: stageMeta.page >= stageMeta.totalPages ? 0.5 : 1 }}
                                        onClick={() => fetchStageOptions(stageMeta.page + 1, stageMeta.pageSize)}
                                    >
                                        Sau →
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        );
    };

    const renderAccountProfileSection = () => (
        <AccountProfileTab user={user} />
    );

    const renderValidationRulesSection = () => (
        <div className={styles.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                    <p className={styles.subtitle} style={{ margin: '0 0 4px 0' }}>Form key</p>
                    <select
                        value={selectedFormKey}
                        onChange={(e) => setSelectedFormKey(e.target.value)}
                        style={{ minWidth: '240px', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                    >
                        {FORM_KEYS.map((key) => (
                            <option key={key} value={key}>{key}</option>
                        ))}
                    </select>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                        {validationMeta.totalCount} rules
                    </span>
                    <button
                        className={styles.secondaryBtn}
                        onClick={() => fetchValidationRules(selectedFormKey, 1, validationMeta.pageSize)}
                        disabled={isLoadingValidationRules}
                    >
                        {isLoadingValidationRules ? 'Đang tải...' : 'Làm mới'}
                    </button>
                </div>
            </div>

            {validationSuccess && (
                <div style={{ padding: '10px 12px', marginBottom: '12px', borderRadius: '8px', backgroundColor: '#d1fae5', color: '#065f46', fontWeight: 600, fontSize: '13px' }}>
                    {validationSuccess}
                </div>
            )}
            {validationError && (
                <div style={{ padding: '10px 12px', marginBottom: '12px', borderRadius: '8px', backgroundColor: '#fee2e2', color: '#991b1b', fontWeight: 600, fontSize: '13px' }}>
                    {validationError}
                </div>
            )}

            {isLoadingValidationRules ? (
                <div className={styles.loadingState}>
                    <Loader2 size={24} className={styles.spinner} />
                    <span>Đang tải rule validation...</span>
                </div>
            ) : validationItems.length === 0 ? (
                <div className={styles.emptyState}>
                    <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Không có rule cho form key này.</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gap: '12px' }}>
                    {validationItems.map((item) => {
                        const draft = ruleDrafts[item.id] || item;
                        const isSaving = !!savingRuleIds[item.id];
                        return (
                            <div key={item.id} style={{ border: '1px solid var(--border-color)', borderRadius: '12px', padding: '14px', backgroundColor: 'var(--bg-secondary)' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr 1fr 1fr auto', gap: '10px', alignItems: 'center' }}>
                                    <div>
                                        <div style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '14px' }}>{item.fieldKey}</div>
                                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                            Updated: {item.updatedAt ? new Date(item.updatedAt).toLocaleString('vi-VN') : '-'}
                                        </div>
                                    </div>

                                    <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <input
                                            type="checkbox"
                                            checked={!!draft.isRequired}
                                            onChange={(e) => handleRuleDraftChange(item.id, 'isRequired', e.target.checked)}
                                        />
                                        Bắt buộc
                                    </label>

                                    <input
                                        type="text"
                                        placeholder="min-max length (vd 1-255)"
                                        value={`${draft.minLength ?? ''}${(draft.minLength !== null && draft.minLength !== '' && (draft.maxLength !== null && draft.maxLength !== '')) ? '-' : ''}${draft.maxLength ?? ''}`}
                                        onChange={(e) => {
                                            const [min, max] = e.target.value.split('-');
                                            handleRuleDraftChange(item.id, 'minLength', min ?? '');
                                            handleRuleDraftChange(item.id, 'maxLength', max ?? '');
                                        }}
                                        style={{ padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border-color)' }}
                                    />

                                    <input
                                        type="text"
                                        placeholder="min-max value (vd 0-100)"
                                        value={`${draft.minValue ?? ''}${(draft.minValue !== null && draft.minValue !== '' && (draft.maxValue !== null && draft.maxValue !== '')) ? '-' : ''}${draft.maxValue ?? ''}`}
                                        onChange={(e) => {
                                            const [min, max] = e.target.value.split('-');
                                            handleRuleDraftChange(item.id, 'minValue', min ?? '');
                                            handleRuleDraftChange(item.id, 'maxValue', max ?? '');
                                        }}
                                        style={{ padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border-color)' }}
                                    />

                                    <button
                                        className={styles.primaryBtn}
                                        onClick={() => handleSaveRule(item.id)}
                                        disabled={isSaving}
                                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                                    >
                                        {isSaving ? <Loader2 size={14} className={styles.spinner} /> : <Save size={14} />}
                                        {isSaving ? 'Đang lưu' : 'Lưu'}
                                    </button>
                                </div>

                                <div style={{ marginTop: '10px', display: 'grid', gridTemplateColumns: '1fr 1fr 180px', gap: '10px' }}>
                                    <input
                                        type="text"
                                        placeholder="Regex pattern"
                                        value={draft.customRegexPattern ?? ''}
                                        onChange={(e) => handleRuleDraftChange(item.id, 'customRegexPattern', e.target.value)}
                                        style={{ padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border-color)' }}
                                    />
                                    <input
                                        type="text"
                                        placeholder="File types (image/png, image/jpeg)"
                                        value={draft.allowedFileTypesInput ?? ''}
                                        onChange={(e) => handleRuleDraftChange(item.id, 'allowedFileTypesInput', e.target.value)}
                                        style={{ padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border-color)' }}
                                    />
                                    <input
                                        type="number"
                                        placeholder="Max file bytes"
                                        value={draft.maxFileSizeBytes ?? ''}
                                        onChange={(e) => handleRuleDraftChange(item.id, 'maxFileSizeBytes', e.target.value)}
                                        style={{ padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border-color)' }}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );

    const renderTermsSection = () => (
        <TermsManagement ref={termsRef} canEdit={true} hideHeader={true} />
    );

    const renderPackageManagementSection = () => (
        <div style={{ minHeight: 0 }}>
            <PackageManagement searchTerm="" />
        </div>
    );

    const renderSubscriptionHistorySection = () => (
        <div style={{ minHeight: 0 }}>
            <GlobalSubscriptionHistory searchTerm="" />
        </div>
    );

    return (
        <div className={styles.container}>
            <div className={styles.content}>
                <DashboardSection
                    title={currentSection.label}
                    topBarExtra={activeSection === 'terms' ? (
                        <button 
                            className={styles.primaryBtn} 
                            onClick={() => termsRef.current?.openModal()}
                            style={{ minWidth: '120px' }}
                        >
                            <Plus size={18} /> Thêm mới
                        </button>
                    ) : null}
                >
                    {activeSection === 'transactions' ? renderTransactionsSection() : 
                     activeSection === 'users' ? renderUsersSection() : 
                     activeSection === 'staff' ? renderStaffSection() : 
                     activeSection === 'package_management' ? renderPackageManagementSection() : 
                     activeSection === 'subscription_history' ? renderSubscriptionHistorySection() : 
                     activeSection === 'industry_options' ? renderIndustryOptionsSection() : 
                     activeSection === 'stage_options' ? renderStageOptionsSection() : 
                     activeSection === 'validation_rules' ? renderValidationRulesSection() : 
                     activeSection === 'terms' ? renderTermsSection() :
                     activeSection === 'account_profile' ? renderAccountProfileSection() : 
                     renderUsersSection()}
                </DashboardSection>
            </div>
        </div>
    );
}
