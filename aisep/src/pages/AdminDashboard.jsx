import React, { useMemo, useState, useEffect } from 'react';
import { Users, Database, ChevronRight, Loader2, ShieldCheck, Save, Plus, Factory, Milestone, Shield, History, Settings, BarChart as BarChartIcon, TrendingUp, Rocket } from 'lucide-react';
import { PieChart, Pie, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts';
import styles from '../styles/SharedDashboard.module.css';
import DashboardSection from '../components/common/DashboardSection';
import adminService from '../services/adminService';
import TermsManagement from '../components/admin/TermsManagement';
import AccountProfileTab from '../components/common/AccountProfileTab';
import PackageManagement from '../components/staff/PackageManagement';
import GlobalSubscriptionHistory from '../components/staff/GlobalSubscriptionHistory';

const ADMIN_SECTIONS = [
    { id: 'statistics', label: 'Thống kê hệ thống', icon: BarChartIcon, description: 'Báo cáo doanh thu, xu hướng đầu tư và trạng thái hệ thống.' },
    { id: 'users', label: 'Quản lý người dùng', icon: Users, description: 'Danh sách, quyền và trạng thái tài khoản.' },
    { id: 'staff', label: 'Quản lý Staff', icon: Users, description: 'Tạo và quản lý tài khoản staff vận hành.' },
    { id: 'transactions', label: 'Giao dịch', icon: Database, description: 'Theo dõi giao dịch thanh toán toàn hệ thống.' },
    { id: 'package_management', label: 'Quản lý gói', icon: Shield, description: 'Cấu hình gói đăng ký Investor và Startup.' },
    { id: 'subscription_history', label: 'Lịch sử đăng ký gói', icon: History, description: 'Theo dõi lịch sử đăng ký gói người dùng.' },
    { id: 'industry_options', label: 'Ngành nghề', icon: Factory, description: 'Danh mục ngành (industry options) dùng trong form startup và hệ thống.' },
    { id: 'stage_options', label: 'Giai đoạn dự án', icon: Milestone, description: 'Các giai đoạn dự án (stage options): Idea, MVP, Growth, v.v.' },
    { id: 'scorecard_config', label: 'Cấu hình chấm điểm AI', icon: Settings, description: 'Điều chỉnh trọng số scorecard dùng cho tính điểm AI.' },
    { id: 'validation_rules', label: 'Rule validate động', icon: ShieldCheck, description: 'Cấu hình validate theo từng formKey.' },
    { id: 'terms', label: 'Quản lý Điều khoản', icon: ShieldCheck, description: 'Cập nhật và quản lý lịch sử điều khoản hệ thống.' },
    { id: 'account_profile', label: 'Hồ sơ người dùng', icon: Users, description: 'Quản lý thông tin cá nhân và mật khẩu.' },
];

export default function AdminDashboard({ user, initialSection = 'statistics' }) {
    const getTodayInput = () => new Date().toISOString().split('T')[0];
    const getDateInputBeforeDays = (days) => {
        const d = new Date();
        d.setDate(d.getDate() - days);
        return d.toISOString().split('T')[0];
    };

    const normalizedInitialSection = ADMIN_SECTIONS.some((s) => s.id === initialSection) ? initialSection : 'statistics';
    const [activeSection, setActiveSection] = useState(normalizedInitialSection);

    // Statistics State
    const [statsOverview, setStatsOverview] = useState(null);
    const [statsProjectStatus, setStatsProjectStatus] = useState(null);
    const [statsInvestmentTrends, setStatsInvestmentTrends] = useState(null);
    const [statsRevenue, setStatsRevenue] = useState(null);
    const [isLoadingStats, setIsLoadingStats] = useState(false);
    const [statsError, setStatsError] = useState('');
    const [statsDateRange, setStatsDateRange] = useState({
        from: new Date(new Date().getFullYear(), new Date().getMonth() - 6, 1).toISOString().split('T')[0],
        to: new Date().toISOString().split('T')[0]
    });
    const [statsDateError, setStatsDateError] = useState('');
    const [activeDatePreset, setActiveDatePreset] = useState('6m');
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
    const [scorecardConfig, setScorecardConfig] = useState(null);
    const [scorecardDraft, setScorecardDraft] = useState({
        teamWeight: 25,
        marketWeight: 25,
        productWeight: 15,
        competitionWeight: 10,
        tractionWeight: 10,
        investmentNeedWeight: 10
    });
    const [isLoadingScorecardConfig, setIsLoadingScorecardConfig] = useState(false);
    const [isSavingScorecardConfig, setIsSavingScorecardConfig] = useState(false);
    const [scorecardConfigError, setScorecardConfigError] = useState('');
    const [scorecardConfigSuccess, setScorecardConfigSuccess] = useState('');

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

    const validateStatsDateRange = (range) => {
        const today = getTodayInput();
        const { from, to } = range || {};
        if (!from || !to) return 'Vui lòng chọn đầy đủ ngày bắt đầu và kết thúc.';
        if (from > to) return 'Ngày bắt đầu không được lớn hơn ngày kết thúc.';
        if (to > today) return 'Ngày kết thúc không được vượt quá ngày hiện tại.';
        const diffMs = new Date(to).getTime() - new Date(from).getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        if (diffDays > 366) return 'Khoảng thời gian lọc tối đa là 12 tháng.';
        return '';
    };

    const fetchStatistics = async (rangeOverride) => {
        const effectiveRange = rangeOverride || statsDateRange;
        const validationMessage = validateStatsDateRange(effectiveRange);
        if (validationMessage) {
            setStatsDateError(validationMessage);
            return;
        }

        setStatsDateError('');
        setIsLoadingStats(true);
        setStatsError('');
        try {
            // Convert to ISO string (UTC) to satisfy PostgreSQL Kind=Utc requirement in BE
            const fromDate = effectiveRange.from ? new Date(effectiveRange.from).toISOString() : undefined;
            const toDate = effectiveRange.to ? new Date(effectiveRange.to).toISOString() : undefined;

            const [overview, projectStatus, investmentTrends, revenue] = await Promise.all([
                adminService.getPlatformOverview(fromDate, toDate),
                adminService.getProjectStatusBreakdown(),
                adminService.getInvestmentTrends(fromDate, toDate),
                adminService.getPlatformRevenue({
                    from: fromDate,
                    to: toDate,
                    month: new Date().getMonth() + 1,
                    year: new Date().getFullYear()
                })
            ]);

            setStatsOverview(overview?.data?.data || overview?.data || overview);
            setStatsProjectStatus(projectStatus?.data?.data || projectStatus?.data || projectStatus);
            setStatsInvestmentTrends(investmentTrends?.data?.data || investmentTrends?.data || investmentTrends);
            setStatsRevenue(revenue?.data?.data || revenue?.data || revenue);
        } catch (error) {
            console.error('[AdminDashboard] Failed to fetch statistics:', error);
            setStatsError('Không thể tải dữ liệu thống kê hệ thống.');
        } finally {
            setIsLoadingStats(false);
        }
    };

    const handleStatsRangeChange = (field, value) => {
        const today = getTodayInput();
        setStatsDateRange((prev) => {
            const next = { ...prev, [field]: value };

            if (field === 'to' && value > today) {
                next.to = today;
            }
            if (field === 'from' && value > next.to) {
                next.to = value;
            }
            if (field === 'to' && value < next.from) {
                next.from = value;
            }

            return next;
        });
        setActiveDatePreset('custom');
        setStatsDateError('');
    };

    const applyDatePreset = (preset) => {
        const today = getTodayInput();
        const nextRange = (() => {
            if (preset === '7d') return { from: getDateInputBeforeDays(7), to: today };
            if (preset === '30d') return { from: getDateInputBeforeDays(30), to: today };
            if (preset === '90d') return { from: getDateInputBeforeDays(90), to: today };
            return { from: new Date(new Date().getFullYear(), new Date().getMonth() - 6, 1).toISOString().split('T')[0], to: today };
        })();

        setStatsDateRange(nextRange);
        setActiveDatePreset(preset);
        setStatsDateError('');
        fetchStatistics(nextRange);
    };

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

    const fetchScorecardConfig = async () => {
        setIsLoadingScorecardConfig(true);
        setScorecardConfigError('');
        try {
            const response = await adminService.getDefaultScorecardConfig();
            const payload = response?.data || response || {};
            const data = payload?.data || payload;
            if (!data || !data.id) {
                throw new Error('Không tìm thấy cấu hình scorecard mặc định.');
            }
            setScorecardConfig(data);
            setScorecardDraft({
                teamWeight: Number(data.teamWeight ?? 25),
                marketWeight: Number(data.marketWeight ?? 25),
                productWeight: Number(data.productWeight ?? 15),
                competitionWeight: Number(data.competitionWeight ?? 10),
                tractionWeight: Number(data.tractionWeight ?? 10),
                investmentNeedWeight: Number(data.investmentNeedWeight ?? 10)
            });
        } catch (error) {
            console.error('[AdminDashboard] Failed to fetch scorecard config:', error);
            setScorecardConfig(null);
            setScorecardConfigError(error?.message || 'Không thể tải cấu hình chấm điểm AI.');
        } finally {
            setIsLoadingScorecardConfig(false);
        }
    };

    const handleScorecardDraftChange = (key, value) => {
        setScorecardDraft((prev) => ({
            ...prev,
            [key]: value
        }));
    };

    const handleSaveScorecardConfig = async () => {
        if (!scorecardConfig?.id) return;
        const keys = ['teamWeight', 'marketWeight', 'productWeight', 'competitionWeight', 'tractionWeight', 'investmentNeedWeight'];
        const payload = {};
        for (const key of keys) {
            const n = Number(scorecardDraft[key]);
            if (!Number.isFinite(n) || n < 0 || n > 100) {
                setScorecardConfigError(`Giá trị ${key} phải trong khoảng 0-100.`);
                setScorecardConfigSuccess('');
                return;
            }
            payload[key] = n;
        }
        const sum = keys.reduce((acc, k) => acc + Number(payload[k] || 0), 0);
        if (sum !== 100) {
            setScorecardConfigError(`Tổng trọng số phải bằng 100 (hiện tại: ${sum}).`);
            setScorecardConfigSuccess('');
            return;
        }

        setIsSavingScorecardConfig(true);
        setScorecardConfigError('');
        setScorecardConfigSuccess('');
        try {
            await adminService.updateScorecardConfig(scorecardConfig.id, payload);
            setScorecardConfigSuccess('Đã cập nhật cấu hình chấm điểm AI thành công.');
            setTimeout(() => setScorecardConfigSuccess(''), 3500);
            await fetchScorecardConfig();
        } catch (error) {
            console.error('[AdminDashboard] Failed to update scorecard config:', error);
            setScorecardConfigError(error?.message || 'Không thể cập nhật cấu hình chấm điểm AI.');
        } finally {
            setIsSavingScorecardConfig(false);
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
        if (activeSection === 'statistics') {
            fetchStatistics();
        }
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
        if (activeSection === 'scorecard_config') {
            fetchScorecardConfig();
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

    const renderStatisticsSection = () => {
        if (isLoadingStats && !statsOverview) {
            return (
                <div className={styles.loadingState}>
                    <Loader2 size={24} className={styles.spinner} />
                    <span>Đang tải dữ liệu thống kê...</span>
                </div>
            );
        }

        if (statsError) {
            return (
                <div className={styles.emptyState}>
                    <p style={{ color: '#ef4444' }}>{statsError}</p>
                    <button className={styles.secondaryBtn} onClick={fetchStatistics}>Thử lại</button>
                </div>
            );
        }

        const COLORS = ['#1d9bf0', '#7c3aed', '#f59e0b', '#ef4444', '#10b981'];
        const GRADIENTS = [
            { id: 'cyanGlow', start: '#1d9bf0', end: '#1a8cd8' },
            { id: 'purpleGlow', start: '#7c3aed', end: '#6d28d9' },
            { id: 'pinkGlow', start: '#ef4444', end: '#dc2626' },
        ];

        const CustomTooltip = ({ active, payload, label }) => {
            if (active && payload && payload.length) {
                return (
                    <div style={{
                        background: 'var(--bg-primary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '12px',
                        padding: '10px 14px',
                        boxShadow: '0 8px 20px rgba(0, 0, 0, 0.16)',
                        color: 'var(--text-primary)'
                    }}>
                        <p style={{ margin: '0 0 4px', fontSize: '12px', color: 'var(--text-secondary)' }}>{label}</p>
                        {payload.map((item, idx) => (
                            <p key={idx} style={{ margin: 0, fontWeight: 700, color: item.color || '#fff', fontSize: '14px' }}>
                                {item.name}: {item.value.toLocaleString('vi-VN')} {item.unit || ''}
                            </p>
                        ))}
                    </div>
                );
            }
            return null;
        };

        return (
            <div className={styles.section} style={{ gap: '30px', padding: '10px 0' }}>
                <style>{`
                    .glass-card {
                        background: var(--bg-primary);
                        border: 1px solid var(--border-color);
                        border-radius: 16px;
                        transition: border-color 0.2s ease, background-color 0.2s ease, transform 0.2s ease;
                        box-shadow: 0 6px 18px rgba(0, 0, 0, 0.12);
                    }
                    .glass-card:hover {
                        background: var(--bg-hover);
                        border-color: rgba(29, 155, 240, 0.28);
                        transform: translateY(-1px);
                    }
                    .metric-grid {
                        display: grid;
                        grid-template-columns: repeat(4, 1fr);
                        gap: 16px;
                    }
                    .stats-charts-grid {
                        display: grid;
                        grid-template-columns: repeat(2, minmax(0, 1fr));
                        gap: 24px;
                    }
                    @media (max-width: 1100px) {
                        .metric-grid {
                            grid-template-columns: repeat(2, 1fr);
                        }
                    }
                    @media (max-width: 1280px) {
                        .stats-charts-grid {
                            grid-template-columns: 1fr;
                        }
                    }
                    @media (max-width: 640px) {
                        .metric-grid {
                            grid-template-columns: 1fr;
                        }
                    }
                    .metric-icon-box {
                        width: 50px;
                        height: 50px;
                        border-radius: 14px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        background: var(--bg-secondary);
                        border: 1px solid var(--border-color);
                        transition: all 0.2s ease;
                    }
                    .glass-card:hover .metric-icon-box {
                        transform: none;
                        background: var(--bg-hover);
                    }
                    .date-input-container {
                        display: flex;
                        background: var(--bg-secondary);
                        border: 1px solid var(--border-color);
                        border-radius: 12px;
                        padding: 4px 12px;
                        transition: all 0.2s ease;
                    }
                    .date-input-container:focus-within {
                        border-color: var(--primary-blue);
                        box-shadow: 0 0 0 1px rgba(29, 155, 240, 0.15);
                        background: var(--bg-primary);
                    }
                    .custom-date-input {
                        background: transparent;
                        border: none;
                        color: var(--text-primary);
                        font-size: 13px;
                        outline: none;
                        padding: 8px 4px;
                        font-family: inherit;
                        cursor: pointer;
                    }
                    .custom-date-input::-webkit-calendar-picker-indicator {
                        cursor: pointer;
                        opacity: 0.75;
                        transition: opacity 0.2s;
                    }
                    .custom-date-input::-webkit-calendar-picker-indicator:hover {
                        opacity: 1;
                    }
                    @media (max-width: 768px) {
                        .date-input-container {
                            width: 100%;
                            min-width: 0;
                            padding: 6px 10px;
                        }
                        .custom-date-input {
                            width: 100%;
                            min-width: 0;
                            font-size: 12px;
                        }
                    }
                    .bestseller-card {
                        background: var(--bg-primary);
                        position: relative;
                        overflow: hidden;
                    }
                    .bestseller-card::before {
                        content: '';
                        position: absolute;
                        inset: 0;
                        background: linear-gradient(90deg, rgba(29, 155, 240, 0.18), rgba(124, 77, 255, 0.12));
                    }
                    .bestseller-inner {
                        position: relative;
                        z-index: 1;
                        background: var(--bg-primary);
                        margin: 1px;
                        border-radius: 15px;
                        height: calc(100% - 2px);
                    }
                `}</style>

                {/* Filter Header */}
                <div className="glass-card" style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)' }}>
                            Báo cáo Hệ thống
                        </h2>
                        <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)', fontSize: '14px' }}>Dữ liệu tổng quan và phân tích chuyên sâu AISEP.</p>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end', flex: 1, minWidth: 280 }}>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {[
                                { id: '7d', label: '7 ngày' },
                                { id: '30d', label: '30 ngày' },
                                { id: '90d', label: '90 ngày' },
                                { id: '6m', label: '6 tháng' }
                            ].map((preset) => (
                                <button
                                    key={preset.id}
                                    type="button"
                                    onClick={() => applyDatePreset(preset.id)}
                                    className={styles.secondaryBtn}
                                    style={{
                                        height: 34,
                                        minWidth: 'unset',
                                        padding: '0 12px',
                                        borderRadius: 10,
                                        fontSize: 12,
                                        borderColor: activeDatePreset === preset.id ? 'var(--primary-blue)' : 'var(--border-color)',
                                        color: activeDatePreset === preset.id ? 'var(--primary-blue)' : 'var(--text-secondary)',
                                        background: activeDatePreset === preset.id ? 'rgba(29, 155, 240, 0.08)' : 'transparent'
                                    }}
                                >
                                    {preset.label}
                                </button>
                            ))}
                        </div>
                        <div className="date-input-container" style={{ minWidth: 280, flex: 1 }}>
                            <div style={{ padding: '4px 8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>Từ</span>
                                <input
                                    type="date"
                                    className="custom-date-input"
                                    value={statsDateRange.from}
                                    max={statsDateRange.to || getTodayInput()}
                                    onChange={(e) => handleStatsRangeChange('from', e.target.value)}
                                />
                            </div>
                            <div style={{ width: '1px', background: 'var(--border-color)', margin: '8px 0' }} />
                            <div style={{ padding: '4px 8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>Đến</span>
                                <input
                                    type="date"
                                    className="custom-date-input"
                                    value={statsDateRange.to}
                                    min={statsDateRange.from}
                                    max={getTodayInput()}
                                    onChange={(e) => handleStatsRangeChange('to', e.target.value)}
                                />
                            </div>
                        </div>
                        <button
                            onClick={() => fetchStatistics()}
                            className={styles.primaryBtn}
                            style={{ height: '44px', minWidth: '44px', padding: 0, borderRadius: '12px' }}
                            title="Áp dụng bộ lọc"
                        >
                            <TrendingUp size={22} />
                        </button>
                        {statsDateError && (
                            <div style={{ width: '100%', color: '#ef4444', fontSize: 12, fontWeight: 600, textAlign: 'right' }}>
                                {statsDateError}
                            </div>
                        )}
                    </div>
                </div>

                {/* Main Metrics */}
                <div className="metric-grid">
                    {[
                        { label: 'Startup hoạt động', value: statsOverview?.activeStartupCount || 0, icon: Rocket, color: '#1d9bf0' },
                        { label: 'Nhà đầu tư approved', value: statsOverview?.activeInvestorCount || 0, icon: ShieldCheck, color: '#7c3aed' },
                        { label: 'Tổng số dự án', value: statsOverview?.projectCount || 0, icon: Factory, color: '#f59e0b' },
                        { label: 'Booking hoàn tất', value: statsOverview?.completedBookingCount || 0, icon: ChevronRight, color: '#10b981' },
                    ].map((item, idx) => (
                        <div key={idx} className="glass-card" style={{ padding: '24px', position: 'relative', overflow: 'hidden' }}>
                            <div style={{ position: 'absolute', top: '-20px', right: '-20px', opacity: 0.05 }}>
                                <item.icon size={120} color={item.color} />
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
                                <div className="metric-icon-box" style={{ background: `linear-gradient(135deg, ${item.color}22, ${item.color}11)`, color: item.color, borderColor: `${item.color}33` }}>
                                    <item.icon size={28} />
                                </div>
                                <span style={{ color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 600 }}>{item.label}</span>
                            </div>
                            <div style={{ fontSize: '30px', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                                {isLoadingStats ? '...' : item.value.toLocaleString()}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Charts Grid */}
                <div className="stats-charts-grid">
                    {/* Revenue Pie Chart */}
                    <div className="glass-card" style={{ padding: '24px' }}>
                        <div className={styles.cardTitle} style={{ marginBottom: '30px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ width: '4px', height: '24px', background: 'var(--primary-blue)', borderRadius: '4px' }} />
                                <span>Cơ cấu Doanh thu</span>
                            </div>
                            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 400 }}>Tỷ lệ Startup vs Investor</span>
                        </div>
                        <div style={{ height: '300px', width: '100%', position: 'relative' }}>
                            <ResponsiveContainer>
                                <PieChart>
                                    <defs>
                                        {GRADIENTS.map(g => (
                                            <linearGradient key={g.id} id={g.id} x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor={g.start} stopOpacity={0.8} />
                                                <stop offset="95%" stopColor={g.end} stopOpacity={0.5} />
                                            </linearGradient>
                                        ))}
                                    </defs>
                                    <Pie
                                        data={[
                                            { name: 'Investor', value: statsRevenue?.roleBreakdown?.investorRevenue || 0, color: '#7c3aed' },
                                            { name: 'Startup', value: statsRevenue?.roleBreakdown?.startupRevenue || 0, color: '#1d9bf0' }
                                        ]}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={80}
                                        outerRadius={110}
                                        paddingAngle={8}
                                        dataKey="value"
                                        stroke="none"
                                        animationBegin={0}
                                        animationDuration={1500}
                                    >
                                        <Cell fill="url(#purpleGlow)" />
                                        <Cell fill="url(#cyanGlow)" />
                                    </Pie>
                                    <Tooltip content={<CustomTooltip />} />
                                    <Legend
                                        verticalAlign="bottom"
                                        height={36}
                                        formatter={(val) => <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{val}</span>}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', pointerEvents: 'none', width: '70%' }}>
                                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Tổng doanh thu</div>
                                <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {statsRevenue?.periodRevenue?.toLocaleString('vi-VN')}₫
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Investment Area Chart */}
                    <div className="glass-card" style={{ padding: '24px' }}>
                        <div className={styles.cardTitle} style={{ marginBottom: '30px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ width: '4px', height: '24px', background: '#7c3aed', borderRadius: '4px' }} />
                                <span>Xu hướng Đầu tư (VND)</span>
                            </div>
                        </div>
                        <div style={{ height: '300px', width: '100%' }}>
                            <ResponsiveContainer>
                                <AreaChart data={statsInvestmentTrends?.monthlyAmounts || []}>
                                    <defs>
                                        <linearGradient id="colorAmt" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.28} />
                                            <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                                    <XAxis
                                        dataKey={(d) => `${d.month}/${d.year}`}
                                        stroke="var(--text-secondary)"
                                        fontSize={10}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <YAxis
                                        stroke="var(--text-secondary)"
                                        fontSize={10}
                                        tickFormatter={(val) => val >= 1000000 ? `${(val / 1000000).toFixed(1)}M` : val}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Area
                                        type="monotone"
                                        dataKey="amount"
                                        name="Số tiền"
                                        stroke="#7c3aed"
                                        strokeWidth={3}
                                        fillOpacity={1}
                                        fill="url(#colorAmt)"
                                        unit="₫"
                                        animationDuration={2000}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Project Status Summary */}
                    <div className="glass-card" style={{ padding: '24px' }}>
                        <div className={styles.cardTitle} style={{ marginBottom: '30px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ width: '4px', height: '24px', background: '#10b981', borderRadius: '4px' }} />
                                <span>Trạng thái Dự án</span>
                            </div>
                        </div>
                        <div style={{ display: 'grid', gap: '12px' }}>
                            {(() => {
                                const rows = [
                                    { key: 'Draft', value: statsProjectStatus?.draftCount || 0, dot: '#64748b' },
                                    { key: 'Pending', value: statsProjectStatus?.pendingCount || 0, dot: '#f59e0b' },
                                    { key: 'Published', value: statsProjectStatus?.publishedCount || 0, dot: '#10b981' },
                                    { key: 'Rejected', value: statsProjectStatus?.rejectedCount || 0, dot: '#ef4444' }
                                ];

                                return rows.map((row) => {
                                    return (
                                        <div
                                            key={row.key}
                                            style={{
                                                border: '1px solid var(--border-color)',
                                                borderRadius: '12px',
                                                background: 'var(--bg-secondary)',
                                                padding: '12px 14px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                gap: 12
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                <span
                                                    style={{
                                                        width: 10,
                                                        height: 10,
                                                        borderRadius: '50%',
                                                        background: row.dot,
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        boxShadow: `0 0 0 3px ${row.dot}22`
                                                    }}
                                                />
                                                <span style={{ color: 'var(--text-primary)', fontSize: 15, fontWeight: 700 }}>{row.key}</span>
                                            </div>
                                            <div
                                                style={{
                                                    minWidth: 42,
                                                    height: 28,
                                                    borderRadius: 999,
                                                    border: '1px solid var(--border-color)',
                                                    background: 'var(--bg-primary)',
                                                    color: 'var(--text-primary)',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    padding: '0 10px',
                                                    fontSize: 14,
                                                    fontWeight: 800,
                                                    fontVariantNumeric: 'tabular-nums'
                                                }}
                                            >
                                                {row.value}
                                            </div>
                                        </div>
                                    );
                                });
                            })()}
                        </div>
                    </div>

                    {/* Top Projects & Bestseller */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div className="glass-card" style={{ padding: '24px', flex: 1, minHeight: '280px' }}>
                            <div className={styles.cardTitle}>
                                <span>Top Dự án kêu gọi vốn</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {(statsInvestmentTrends?.topProjects || []).map((proj, i) => (
                                    <div key={i} className={styles.listItem} style={{
                                        background: 'var(--bg-secondary)',
                                        borderRadius: '16px',
                                        border: '1px solid var(--border-color)',
                                        padding: '14px 18px',
                                        display: 'grid',
                                        gridTemplateColumns: '34px 1fr auto',
                                        alignItems: 'center',
                                        columnGap: '14px'
                                    }}>
                                        <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: COLORS[i % COLORS.length] + '22', color: COLORS[i % COLORS.length], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 800 }}>
                                            {i + 1}
                                        </div>
                                        <div style={{ flex: 1, color: 'var(--text-primary)', fontSize: 'clamp(15px, 2.3vw, 18px)', fontWeight: 700, lineHeight: 1.35 }}>{proj.projectName}</div>
                                        <div style={{ color: '#10b981', fontWeight: 800, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums', fontSize: 'clamp(16px, 2.6vw, 20px)' }}>{proj.totalInvestedAmount?.toLocaleString('vi-VN')}₫</div>
                                    </div>
                                ))}
                                {(!statsInvestmentTrends?.topProjects || statsInvestmentTrends.topProjects.length === 0) && (
                                    <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)' }}>Chưa có dữ liệu đầu tư.</div>
                                )}
                            </div>
                        </div>

                        {/* Bestseller Card */}
                        {statsRevenue?.bestsellerPackage && (
                            <div className="glass-card bestseller-card" style={{ padding: '1px', minHeight: '190px' }}>
                                <div className="bestseller-inner" style={{ padding: '22px 20px' }}>
                                    <div style={{ position: 'absolute', top: '12px', right: '12px' }}>
                                        <span style={{
                                            background: 'linear-gradient(90deg, #7c3aed, #1d9bf0)',
                                            padding: '4px 10px',
                                            borderRadius: '20px',
                                            fontSize: '10px',
                                            fontWeight: 800,
                                            color: '#fff',
                                            textTransform: 'uppercase',
                                            letterSpacing: '1px'
                                        }}>Bestseller</span>
                                    </div>
                                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Gói phổ biến nhất</div>
                                    <div style={{ fontSize: 'clamp(22px, 3.5vw, 28px)', fontWeight: 900, color: 'var(--text-primary)', marginBottom: '14px', lineHeight: 1.2 }}>{statsRevenue.bestsellerPackage.packageName}</div>
                                    <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap' }}>
                                        <div>
                                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Lượt mua</div>
                                            <div style={{ fontSize: 'clamp(22px, 3.5vw, 28px)', fontWeight: 900, color: '#7c3aed', lineHeight: 1.1 }}>{statsRevenue.bestsellerPackage.purchaseCount}</div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Doanh thu</div>
                                            <div style={{ fontSize: 'clamp(20px, 3.3vw, 26px)', fontWeight: 900, color: '#10b981', lineHeight: 1.1 }}>{statsRevenue.bestsellerPackage.totalRevenue?.toLocaleString('vi-VN')}₫</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

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

    const renderScorecardConfigSection = () => {
        const fields = [
            { key: 'teamWeight', label: 'Team Weight', hint: 'Trọng số đội ngũ sáng lập' },
            { key: 'marketWeight', label: 'Market Weight', hint: 'Trọng số thị trường' },
            { key: 'productWeight', label: 'Product Weight', hint: 'Trọng số sản phẩm & công nghệ' },
            { key: 'competitionWeight', label: 'Competition Weight', hint: 'Trọng số cạnh tranh' },
            { key: 'tractionWeight', label: 'Traction Weight', hint: 'Trọng số lực kéo thị trường' },
            { key: 'investmentNeedWeight', label: 'Investment Need Weight', hint: 'Trọng số nhu cầu gọi vốn' }
        ];
        const totalWeight = fields.reduce((sum, f) => sum + Number(scorecardDraft[f.key] || 0), 0);

        return (
            <div className={styles.card} style={{ borderRadius: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap', marginBottom: '14px' }}>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)' }}>Cấu hình chấm điểm AI</h3>
                        <p style={{ margin: '6px 0 0 0', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                            API: <code>/api/admin/scorecard-configs/default</code> và <code>/api/admin/scorecard-configs/{'{id}'}</code>.
                            Tổng trọng số phải bằng 100.
                        </p>
                    </div>
                    <button className={styles.secondaryBtn} onClick={fetchScorecardConfig} disabled={isLoadingScorecardConfig || isSavingScorecardConfig}>
                        {isLoadingScorecardConfig ? 'Đang tải...' : '↻ Làm mới'}
                    </button>
                </div>

                {scorecardConfigSuccess && (
                    <div style={{ padding: '10px 12px', marginBottom: '12px', borderRadius: '8px', backgroundColor: '#d1fae5', color: '#065f46', fontWeight: 600, fontSize: '13px' }}>
                        {scorecardConfigSuccess}
                    </div>
                )}
                {scorecardConfigError && (
                    <div style={{ padding: '10px 12px', marginBottom: '12px', borderRadius: '8px', backgroundColor: '#fee2e2', color: '#991b1b', fontWeight: 600, fontSize: '13px' }}>
                        {scorecardConfigError}
                    </div>
                )}

                {isLoadingScorecardConfig ? (
                    <div className={styles.loadingState}>
                        <Loader2 size={24} className={styles.spinner} />
                        <span>Đang tải cấu hình scorecard...</span>
                    </div>
                ) : !scorecardConfig ? (
                    <div className={styles.emptyState}>
                        <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Không có dữ liệu cấu hình scorecard.</p>
                    </div>
                ) : (
                    <>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginBottom: '16px' }}>
                            {fields.map((field) => (
                                <div key={field.key} style={{ border: '1px solid var(--border-color)', borderRadius: '10px', padding: '12px', background: 'var(--bg-secondary)' }}>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>{field.label}</label>
                                    <p style={{ margin: '0 0 8px 0', fontSize: '11px', color: 'var(--text-secondary)' }}>{field.hint}</p>
                                    <input
                                        type="number"
                                        min={0}
                                        max={100}
                                        step={1}
                                        value={scorecardDraft[field.key]}
                                        onChange={(e) => handleScorecardDraftChange(field.key, e.target.value)}
                                        style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                                    />
                                </div>
                            ))}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: totalWeight === 100 ? '#065f46' : '#991b1b' }}>
                                Tổng trọng số: {totalWeight}/100
                            </div>
                            <button
                                className={styles.primaryBtn}
                                onClick={handleSaveScorecardConfig}
                                disabled={isSavingScorecardConfig || isLoadingScorecardConfig}
                                style={{ minWidth: '160px' }}
                            >
                                {isSavingScorecardConfig ? <><Loader2 size={14} className={styles.spinner} /> Đang lưu...</> : <><Save size={14} /> Lưu cấu hình</>}
                            </button>
                        </div>
                    </>
                )}
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
                    {activeSection === 'statistics' ? renderStatisticsSection() :
                        activeSection === 'transactions' ? renderTransactionsSection() :
                            activeSection === 'users' ? renderUsersSection() :
                                activeSection === 'staff' ? renderStaffSection() :
                                    activeSection === 'package_management' ? renderPackageManagementSection() :
                                        activeSection === 'subscription_history' ? renderSubscriptionHistorySection() :
                                            activeSection === 'industry_options' ? renderIndustryOptionsSection() :
                                                activeSection === 'stage_options' ? renderStageOptionsSection() :
                                                    activeSection === 'scorecard_config' ? renderScorecardConfigSection() :
                                                        activeSection === 'validation_rules' ? renderValidationRulesSection() :
                                                            activeSection === 'terms' ? renderTermsSection() :
                                                                activeSection === 'account_profile' ? renderAccountProfileSection() :
                                                                    renderStatisticsSection()}
                </DashboardSection>
            </div>
        </div>
    );
}
