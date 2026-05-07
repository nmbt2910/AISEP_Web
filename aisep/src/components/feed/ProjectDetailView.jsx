import React, { useState, useEffect } from 'react';
import {
  CircleNotch,
  ArrowLeft,
  ClipboardText,
  TrendUp,
  Sword,
  FolderOpen,
  Users,
  ChartBar,
  Lightning,
  User,
  LockSimple,
  Star,
  SealCheck,
  Calendar,
  ShieldCheck,
  Image as ImageIcon,
  X,
  ArrowsOut,
  Sparkle,
  Brain,
  ArrowSquareOut,
  Target
} from '@phosphor-icons/react';
import BookingWizard from '../booking/BookingWizard';
import projectSubmissionService from '../../services/projectSubmissionService';
import startupProfileService from '../../services/startupProfileService';
import AIEvaluationService from '../../services/AIEvaluationService';
import bookingService from '../../services/bookingService';
import blockchainVerificationService from '../../services/blockchainVerificationService';
import ProfileErrorScreen from '../common/ProfileErrorScreen';
import AuthRequirementScreen from '../common/AuthRequirementScreen';
import ProfileLoading from '../common/ProfileLoading';
import BlockchainVerificationModal from '../common/BlockchainVerificationModal';
import subscriptionService from '../../services/subscriptionService';
import paymentService from '../../services/paymentService';
import UnlockConfirmationModal from '../common/UnlockConfirmationModal';
import AIAnalyzeConfirmationModal from '../common/AIAnalyzeConfirmationModal';
import AIEvaluationModal from '../common/AIEvaluationModal';
import { translateAIResults } from '../../utils/translateAIResults.js';
import { normalizeAIAnalysisPayload } from '../../utils/normalizeAIAnalysisPayload.js';
import { getStageLabel } from '../../constants/ProjectStatus';
import optionService from '../../services/optionService';
import { getScorecardRowsForDisplay, getScorecardQuickStats } from '../../constants/projectScorecard';

/* ─── Design tokens (hardcoded to guarantee correct rendering) ─── */
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

/* ─── Helpers ─────────────────────────────────────────────── */
const DISP = (v, fb = 'Đang cập nhật') => (v && String(v).trim() ? v : fb);

const avatarGrad = tag => {
  const t = (tag || '').toLowerCase();
  if (t.includes('fintech') || t.includes('blockchain')) return `linear-gradient(135deg,${T.blue},${T.green})`;
  if (t.includes('agri') || t.includes('iot')) return `linear-gradient(135deg,${T.green},#009960)`;
  if (t.includes('ai') || t.includes('saas')) return 'linear-gradient(135deg,#7c3aed,#2D7EFF)';
  return `linear-gradient(135deg,${T.blue},${T.green})`;
};

const stageChip = stage => {
  const s = (stage || '').toLowerCase();
  if (s.includes('mvp') || s.includes('prototype'))
    return { bg: T.blueDim, color: T.blue, border: `1px solid rgba(45,126,255,.2)` };
  if (s.includes('growth'))
    return { bg: T.greenDim, color: T.green, border: `1px solid rgba(0,186,124,.2)` };
  return { bg: T.amberDim, color: T.amber, border: 'none' };
};

/* ─── Primitive components ──────────────────────────────── */
const SectionCard = ({ children, style }) => (
  <div className="section-appear" style={{
    background: T.card,
    border: `1px solid ${T.border}`,
    borderRadius: 20,
    overflow: 'hidden',
    boxShadow: T.shadow,
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    ...style,
  }}>
    {children}
  </div>
);

const SectionHeader = ({ children }) => (
  <div style={{
    padding: '12px 16px',
    borderBottom: `1px solid ${T.border}`,
    display: 'flex',
    alignItems: 'center',
    background: 'rgba(255, 255, 255, 0.01)',
  }}>
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      fontSize: 12.5,
      fontWeight: 800,
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
      color: T.blue,
      lineHeight: 1
    }}>
      {children}
    </div>
  </div>
);

const SectionBody = ({ children, style }) => (
  <div style={{ padding: '16px', ...style }}>
    {children}
  </div>
);

const Field = ({ label, children, accent, green, full, style }) => (
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    gridColumn: full ? '1 / -1' : 'auto',
    ...style
  }}>
    <div style={{
      fontSize: 10.5,
      fontWeight: 700,
      letterSpacing: '0.05em',
      textTransform: 'uppercase',
      color: T.textDim,
      opacity: 0.75,
    }}>
      {label}
    </div>
    <div style={{
      fontSize: 14.5,
      lineHeight: 1.5,
      color: accent ? T.blue : green ? T.green : T.text,
      fontFamily: (accent || green) ? "'IBM Plex Mono', monospace" : "inherit",
      fontWeight: (accent || green) ? 700 : 500,
    }}>
      {children}
    </div>
  </div>
);

const FieldGrid = ({ children, cols = 2 }) => (
  <div style={{
    display: 'grid',
    gridTemplateColumns: `repeat(${cols}, 1fr)`,
    gap: '14px 18px',
    width: '100%',
    minWidth: 0
  }}>
    {children}
  </div>
);

const Divider = () => (
  <div style={{ height: 1, background: T.border, margin: '4px 0' }} />
);

/* ─── Mobile Document Card ──────────────────────────────── */
const MobileDocCard = ({ doc }) => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '12px 0',
    borderBottom: `1px solid ${T.border}`,
  }}>
    {/* Icon */}
    <span style={{ fontSize: 22, flexShrink: 0 }}>📄</span>

    {/* Info */}
    <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
      <div style={{
        fontSize: 13,
        fontWeight: 600,
        color: T.text,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        width: '100%',
      }} title={doc.fullName || doc.name}>
        {doc.name}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11.5, color: T.textMuted }}>{doc.type}</span>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 3,
          fontSize: 11, fontWeight: 700, color: T.green,
        }}>
          ⬡ Blockchain
        </span>
      </div>
    </div>

    {/* Open button */}
    <button
      onClick={() => doc.url && window.open(doc.url, '_blank')}
      title="Mở tài liệu"
      style={{
        width: 34, height: 34, borderRadius: 8, flexShrink: 0,
        border: `1px solid ${T.border}`,
        background: T.surface2,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', fontSize: 15, color: T.textMuted,
      }}
    >
      <ArrowSquareOut size={18} />
    </button>
  </div>
);

const DocumentCard = ({ doc }) => (
  <div className="section-appear" style={{
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    padding: '16px',
    borderRadius: 16,
    background: 'rgba(255, 255, 255, 0.02)',
    border: `1px solid ${T.border}`,
    transition: 'transform 0.2s, background-color 0.2s',
    cursor: 'pointer'
  }} onClick={() => doc.url && window.open(doc.url, '_blank')}
    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)'; e.currentTarget.style.transform = 'translateY(0)'; }}>
    <div style={{
      width: 44, height: 44, borderRadius: 12, background: T.blueDim,
      display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.blue, flexShrink: 0
    }}>
      <FolderOpen size={22} weight="duotone" />
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 14.5, fontWeight: 700, color: T.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={doc.fullName}>
        {doc.name}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
        <span style={{ fontSize: 12, color: T.textMuted }}>{doc.type}</span>
      </div>
    </div>
    <button style={{
      width: 38, height: 38, borderRadius: 10, background: 'rgba(255,255,255,0.05)',
      border: 'none', color: T.textMuted, display: 'flex', alignItems: 'center', justifyContent: 'center',
      cursor: 'pointer', transition: 'all 0.2s'
    }} onMouseEnter={e => { e.currentTarget.style.color = T.blue; e.currentTarget.style.background = T.blueDim; }}>
      <ArrowsOut size={18} />
    </button>
  </div>
);

/* ─── Main Component ─────────────────────────────────────── */
export default function ProjectDetailView({ 
  projectId, 
  onBack, 
  user, 
  isPaidUser = false, 
  onShowLogin, 
  isFullView = false, 
  isInvestorApproved = false, 
  isStartupApproved = false, 
  isAdvisorApproved = false, 
  onUnlock, 
  onRestrictedAction,
  onViewProject
}) {
  const [project, setProject] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [docError, setDocError] = useState(null);
  const [aiHistory, setAiHistory] = useState([]);
  const [advisorBookings, setAdvisorBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 1024);
  const [showBookingWizard, setShowBookingWizard] = useState(false);
  const [showFullscreenImage, setShowFullscreenImage] = useState(false);

  // Effective permissions state (derived internally if props are missing)
  const [effectiveIsPaidUser, setEffectiveIsPaidUser] = useState(isPaidUser);
  const [effectiveIsInvestorApproved, setEffectiveIsInvestorApproved] = useState(isInvestorApproved);

  // Quota & Unlock State
  const [subscription, setSubscription] = useState(null);
  const [investorPackages, setInvestorPackages] = useState([]);
  const [showUnlockConfirm, setShowUnlockConfirm] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [isLoadingQuota, setIsLoadingQuota] = useState(true);

  // Blockchain Verification State
  const [showBlockchainModal, setShowBlockchainModal] = useState(false);
  const [blockchainData, setBlockchainData] = useState(null);
  const [isLoadingBlockchain, setIsLoadingBlockchain] = useState(false);
  const [blockchainError, setBlockchainError] = useState(null);
  const [myStartupProfile, setMyStartupProfile] = useState(null);

  // Investor AI Analysis State
  const [showAIConfirmModal, setShowAIConfirmModal] = useState(false);
  const [isAnalyzingAI, setIsAnalyzingAI] = useState(false);
  const [stages, setStages] = useState([]);
  const [investorAIResults, setInvestorAIResults] = useState([]);
  const [activeAIResult, setActiveAIResult] = useState(null);
  const [showAIResultModal, setShowAIResultModal] = useState(false);
  const [isLoadingAIHistory, setIsLoadingAIHistory] = useState(false);

  const fetchQuotaData = async () => {
    const role = user?.role?.toString().toLowerCase();
    const isEligible = role === 'investor' || role === 'startup' || role === '0' || role === '1';

    if (!user || !isEligible) {
      setIsLoadingQuota(false);
      return;
    }
    try {
      setIsLoadingQuota(true);
      const isStartup = role === 'startup' || role === '0';

      const [subRes, pkgRes] = await Promise.all([
        subscriptionService.getMySubscription(),
        isStartup ? paymentService.getStartupPackages() : paymentService.getInvestorPackages()
      ]);

      const finalSub = subRes?.data && typeof subRes.data === 'object' && !Array.isArray(subRes.data)
        ? subRes.data
        : subRes;

      const finalPkgs = pkgRes?.data && Array.isArray(pkgRes.data)
        ? pkgRes.data
        : (Array.isArray(pkgRes) ? pkgRes : []);

      if (finalSub && typeof finalSub === 'object') {
        setSubscription(finalSub);

        // Derive isPaidUser status internally
        const subStatus = finalSub.status;
        const subPackage = finalSub.packageName || '';
        const isActuallyPaid = !!(
          (subStatus === 'Active' || subStatus === 1 || subStatus === 'active') &&
          subPackage &&
          !subPackage.toLowerCase().includes('miễn phí') &&
          !subPackage.toLowerCase().includes('free')
        );
        setEffectiveIsPaidUser(isActuallyPaid);
      }
      if (finalPkgs.length > 0) setInvestorPackages(finalPkgs);
    } catch (err) {
      console.error("Error fetching quota data:", err);
    } finally {
      setIsLoadingQuota(false);
    }
  };

  const fetchInvestorAIHistory = async () => {
    if (!projectId) return;
    setIsLoadingAIHistory(true);
    try {
      const res = await AIEvaluationService.getInvestorAnalysisHistory(projectId);
      if (res.success && res.data) {
        const mapped = res.data.map((item) => {
          try {
            const { analysisResult } = translateAIResults({ success: true, data: item }, null);
            return analysisResult?.data ?? item;
          } catch {
            return item;
          }
        });
        setInvestorAIResults(mapped);
      }
    } catch (err) {
      console.error('[ProjectDetailView] Error fetching AI history:', err);
    } finally {
      setIsLoadingAIHistory(false);
    }
  };

  const fetchInvestorProfile = async () => {
    const isInvestor = user?.role?.toString().toLowerCase() === 'investor' || Number(user?.role) === 1;
    if (!isInvestor) return;
    try {
      const res = await subscriptionService.getMySubscription(); // Assuming check via subscription status
      if (res) {
        // Simplified profile check for this context
      }
    } catch (err) {
      console.error('[ProjectDetailView] Error fetching investor profile:', err);
    }
  };

  const handleAIAnalyze = async () => {
    if (!projectId) return;

    const roleStr = user?.role?.toString().toLowerCase() || '';
    const roleNum = Number(user?.role);
    const isInvestor = roleStr === 'investor' || roleNum === 1;

    if (isInvestor && !isInvestorApproved) {
      onRestrictedAction?.('Bạn cần được phê duyệt hồ sơ Nhà đầu tư để sử dụng tính năng Phân tích AI.');
      return;
    }
    setIsAnalyzingAI(true);
    try {
      const res = await AIEvaluationService.analyzeProjectByInvestorAPI(projectId);
      if (res.success && res.data) {
        let row = res.data;
        try {
          const { analysisResult } = translateAIResults({ success: true, data: res.data }, null);
          row = analysisResult?.data ?? res.data;
        } catch { /* giữ raw */ }
        setInvestorAIResults([row]);
        setActiveAIResult(row);
        setShowAIResultModal(true);
        setShowAIConfirmModal(false);
        fetchQuotaData();
      } else {
        alert(res.message || 'Có lỗi xảy ra khi thực hiện phân tích AI.');
      }
    } catch (err) {
      console.error('[ProjectDetailView] AI analysis failed:', err);
      alert('Không thể kết nối với hệ thống AI. Vui lòng thử lại sau.');
    } finally {
      setIsAnalyzingAI(false);
    }
  };

  useEffect(() => {
    fetchQuotaData();
    fetchInvestorProfile();
    const isStartup = user?.role?.toString().toLowerCase() === 'startup' || Number(user?.role) === 0;
    if (isStartup) {
      startupProfileService.getStartupMe().then(setMyStartupProfile).catch(() => { });
    }
    if (user?.role?.toString().toLowerCase() === 'investor' || Number(user?.role) === 1) {
      fetchInvestorAIHistory();
    }
  }, [user, isPaidUser, projectId]);

  useEffect(() => {
    optionService.getStages().then(res => setStages(res.filter(s => s.isActive)));
  }, []);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (!projectId || !user) return;
    setLoading(true); setError(null); setDocError(null);

    // Scroll parent container to top on project change
    const container = document.querySelector('.scrollableSection') || document.querySelector('.mainContent');
    if (container) {
      container.scrollTo({ top: 0, behavior: 'instant' });
    }
    window.scrollTo({ top: 0, behavior: 'instant' });

    const roleStr = user?.role?.toString().toLowerCase() || '';
    const roleNum = Number(user?.role);
    const isBypassRole = roleStr === 'staff' || roleStr === 'operationstaff' || roleStr === 'operation_staff' || roleStr === 'advisor' || roleNum === 4 || roleNum === 5;

    const fetchData = async () => {
      try {
        const pRes = await projectSubmissionService.getProjectNonPremiumById(projectId);

        if (!pRes?.success || !pRes?.data) {
          throw new Error(pRes?.message || 'Không tìm thấy thông tin dự án.');
        }

        let projectData = pRes.data;
        const pStartupId = projectData.startupId || projectData.StartupId;
        const myProfileId = myStartupProfile?.id || myStartupProfile?.Id;
        const isStartupOwner = pStartupId && myProfileId && String(pStartupId) === String(myProfileId);
        const shouldFetchFull = isFullView || isBypassRole || projectData.isUnlockedByCurrentUser || isStartupOwner;

        if (shouldFetchFull) {
          const fullRes = await projectSubmissionService.getProjectById(projectId);
          if (fullRes?.success && fullRes?.data) {
            projectData = fullRes.data;
          }
        }

        setProject({
          ...projectData,
          name: projectData.projectName || 'Dự án',
          status: projectData.status || 'Pending',
          tags: [],
        });

        const [dRes, aRes, bRes] = await Promise.all([
          projectSubmissionService.getDocuments(projectId).catch(err => {
            if (err?.statusCode === 403) {
              const roleStr = user?.role?.toString().toLowerCase();
              const isAdvisor = roleStr === 'advisor' || Number(user?.role) === 2;
              const msg = isAdvisor 
                ? 'Bạn chỉ xem được tài liệu của dự án mà bạn được phân công cố vấn.' 
                : (err.errors?.[0] || err.message || 'Bạn không có quyền xem tài liệu này.');
              setDocError(msg);
            }
            return null;
          }),
          AIEvaluationService.getProjectAnalysisHistory(projectId).catch(() => null),
          bookingService.getAllBookings('', '-Id', 1, 1000).catch(() => null),
        ]);

        const dResData = dRes?.data;
        const isDResForbidden = dRes?.success === false && (dRes?.statusCode === 403 || dRes?.status === 403);
        
        if (isDResForbidden) {
          const roleStr = user?.role?.toString().toLowerCase();
          const isAdvisor = roleStr === 'advisor' || Number(user?.role) === 2;
          const msg = isAdvisor 
            ? 'Bạn chỉ xem được tài liệu của dự án mà bạn được phân công cố vấn.' 
            : (dRes?.errors?.[0] || dRes?.message || 'Bạn không có quyền xem tài liệu này.');
          setDocError(msg);
        }

        const rawDocs = dResData?.items ?? (Array.isArray(dResData) ? dResData : []);
        const truncateName = (name, max = 28) => {
          if (!name || name.length <= max) return name;
          const ext = name.includes('.') ? '.' + name.split('.').pop() : '';
          const base = name.slice(0, name.length - ext.length);
          return base.slice(0, max - ext.length - 1) + '\u2026' + ext;
        };
        setDocuments(rawDocs.map(doc => ({
          id: doc.documentId,
          name: truncateName(doc.fileName || doc.documentType),
          fullName: doc.fileName || doc.documentType,
          type: doc.documentType,
          url: doc.fileUrl,
        })));

        setAiHistory(aRes?.data || []);

        const bItems = bRes?.data?.items || bRes?.items || (Array.isArray(bRes) ? bRes : []);
        setAdvisorBookings(bItems.filter(b => String(b.projectId) === String(projectId)));

      } catch (err) {
        console.error("ProjectDetailView Fetch Error:", err);
        const is401 = err?.message?.includes('401') || err?.response?.status === 401;
        setError(is401 ? 'Unauthorized' : (err?.message || 'Lỗi khi tải dự án.'));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [projectId, user, isFullView, myStartupProfile, stages]);

  const handleUnlockClick = (e) => {
    if (e) e.stopPropagation();

    const roleStr = user?.role?.toString().toLowerCase() || '';
    const roleNum = Number(user?.role);
    const isInvestor = roleStr === 'investor' || roleNum === 1;
    const isStartup = roleStr === 'startup' || roleNum === 0;

    if (isInvestor && !isInvestorApproved) {
      onRestrictedAction?.('Bạn cần được phê duyệt hồ sơ Nhà đầu tư để mở khóa thông tin chi tiết của dự án.');
      return;
    }
    if (isStartup && !isStartupApproved) {
      onRestrictedAction?.('Bạn cần được phê duyệt hồ sơ Startup để mở khóa thông tin chi tiết của dự án.');
      return;
    }

    if (!effectiveIsPaidUser) return;
    fetchQuotaData();
    setShowUnlockConfirm(true);
  };

  const confirmUnlock = async () => {
    if (isUnlocking) return;
    setIsUnlocking(true);
    try {
      const res = await projectSubmissionService.getProjectById(projectId);
      if (res?.success && res?.data) {
        const d = res.data;
        setProject({
          ...d,
          name: d.projectName || 'Dự án',
          status: d.status || 'Pending',
          tags: [],
        });
        setShowUnlockConfirm(false);
        if (onUnlock) onUnlock(projectId);
        subscriptionService.getMySubscription().then(setSubscription).catch(() => { });
      } else {
        alert(res?.message || "Không thể mở khóa dự án này.");
      }
    } catch (err) {
      console.error("Unlock Error:", err);
      alert(err?.response?.data?.message || err?.message || "Lỗi khi mở khóa dự án.");
    } finally {
      setIsUnlocking(false);
    }
  };

  const handleBlockchainVerification = async () => {
    if (isLoadingBlockchain || !projectId) return;

    // Check if the user is a Startup or Investor - they need approval
    const roleStr = user?.role?.toString().toLowerCase() || '';
    const roleNum = Number(user?.role);
    const isInvestor = roleStr === 'investor' || roleNum === 1;
    const isStartup = roleStr === 'startup' || roleNum === 0;
    const isAdvisor = roleStr === 'advisor' || roleNum === 2;

    if (isInvestor && !isInvestorApproved) {
      onRestrictedAction?.('Bạn cần được phê duyệt hồ sơ Nhà đầu tư để thực hiện xác thực Blockchain.');
      return;
    }
    if (isStartup && !isStartupApproved) {
      onRestrictedAction?.('Bạn cần được phê duyệt hồ sơ Startup để thực hiện xác thực Blockchain.');
      return;
    }
    if (isAdvisor && !isAdvisorApproved) {
      onRestrictedAction?.('Bạn cần được phê duyệt hồ sơ Cố vấn để thực hiện xác thực Blockchain.');
      return;
    }

    // For startup, it's slightly different, but usually they are viewing their OWN project or they are approved
    // If they aren't approved, they might be blocked from even viewing this, but let's be safe

    setIsLoadingBlockchain(true);
    setBlockchainError(null);
    try {
      const response = await blockchainVerificationService.verifyProjectBlockchain(projectId);
      setBlockchainData(response);
      setShowBlockchainModal(true);
    } catch (err) {
      setBlockchainError(err?.response?.data?.message || err?.message || 'Không thể xác minh dự án trên blockchain');
      setShowBlockchainModal(true);
    } finally {
      setIsLoadingBlockchain(false);
    }
  };

  const currentPackage = investorPackages.find(p => p.packageId === subscription?.packageId);
  const maxViews = Number(currentPackage?.maxProjectViews ?? subscription?.maxProjectViews ?? 0);
  const usedViews = Number(subscription?.usedProjectViews ?? 0);
  const remainingViews = Math.max(0, maxViews - usedViews);

  if (!user || error === 'Unauthorized') {
    return <AuthRequirementScreen type="dự án" onBack={onBack} onLogin={onShowLogin} />;
  }
  if (loading) return <ProfileLoading message="Đang tải thông tin dự án..." />;
  if (error || !project) return (
    <ProfileErrorScreen
      title="dự án" message={error} onBack={onBack}
      onRetry={() => { setLoading(true); setError(null); window.location.reload(); }}
    />
  );

  const stageLabel = getStageLabel(project.stageOptionId || project.StageOptionId || project.developmentStage || project.DevelopmentStage, stages);
  const chip = stageChip(stageLabel);
  const letter = project.name.charAt(0).toUpperCase();
  const industryTags = (() => {
    const rawInds = project.industries || project.Industries;
    if (Array.isArray(rawInds) && rawInds.length > 0) return rawInds;
    
    const singleInd = project.industry || project.Industry || project.industryName || project.projectIndustry || project.category || project.field;
    if (Array.isArray(singleInd)) return singleInd;
    if (singleInd) return [singleInd];
    
    if (project.tags && project.tags.length > 0) return project.tags;
    return [];
  })();

  const mainTag = industryTags[0] || '';
  const approved = ['approved', 'Approved'].includes(project.status);

  // Robust AI Potential Score extraction
  const latestAI = (() => {
    if (aiHistory && aiHistory.length > 0) {
      const { finalPotentialScore } = normalizeAIAnalysisPayload(aiHistory[0]);
      if (finalPotentialScore > 0) return finalPotentialScore;
    }
    // Fallback to project fields (supporting various casings)
    return project.startupPotentialScore ?? 
           project.potentialScore ?? 
           project.StartupPotentialScore ?? 
           project.PotentialScore ?? 
           project.finalPotentialScore ?? 
           null;
  })();

  const scQuick = getScorecardQuickStats(project);
  const scRowsAll = getScorecardRowsForDisplay(project);
  const scRowsTeam = scRowsAll.filter((r) => r.section === 'Đội ngũ sáng lập');
  const scRowsRest = scRowsAll.filter((r) => r.section !== 'Đội ngũ sáng lập');
  const showMetricLock = !scQuick && project.revenue === undefined && project.marketSize === undefined;

  const maxAiRequests = Number(currentPackage?.maxAiRequests ?? subscription?.maxAiRequests ?? 0);
  const usedAiRequests = Number(subscription?.usedAiRequests ?? 0);
  const remainingAiRequests = Math.max(0, maxAiRequests - usedAiRequests);

  const PremiumBadge = ({ inline }) => {
    const roleStr = user?.role?.toString().toLowerCase() || '';
    const roleNum = Number(user?.role);
    const isBypassRole = ['staff', 'operationstaff', 'operation_staff', 'advisor'].includes(roleStr) || [2, 3, 4, 5].includes(roleNum);

    // Also bypass if current user is the owner of this project
    const pId = project?.startupId || project?.StartupId;
    const mId = myStartupProfile?.id || myStartupProfile?.Id;
    const isOwner = pId && mId && String(pId) === String(mId);

    if (isBypassRole || isOwner) return null;

    const isBuyerRole = ['investor', 'startup'].includes(roleStr) || [0, 1].includes(roleNum);
    const canUnlock = effectiveIsPaidUser && isBuyerRole;
    return (
      <div
        onClick={canUnlock ? handleUnlockClick : undefined}
        style={{
          display: inline ? 'inline-flex' : 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 6, fontSize: isMobile ? 11 : 12, fontWeight: 700, color: '#ffad1f', background: 'rgba(255, 173, 31, 0.12)',
          padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(255, 173, 31, 0.2)',
          marginTop: 0, width: inline ? 'auto' : (isMobile ? 'auto' : '100%'),
          cursor: canUnlock ? 'pointer' : 'default', userSelect: 'none'
        }}
      >
        <LockSimple size={13} weight="bold" /> {effectiveIsPaidUser ? 'Mở khóa ngay' : 'Premium'}
      </div>
    );
  };

  return (
    <div className="project-detail-view" style={{ display: 'flex', flexDirection: 'column', width: '100%', maxWidth: '100%', boxSizing: 'border-box', overflowX: 'clip', flex: 1, minHeight: '100%', background: T.bg }}>
      <style>{`
        .project-detail-view {
          --pd-bg: var(--bg-primary);
          --pd-surface: var(--bg-secondary);
          --pd-card: var(--bg-primary);
          --pd-surface-accent: var(--bg-hover);
          --pd-border: var(--border-color);
          --pd-shadow: 0 8px 30px rgba(0, 0, 0, 0.04), 0 0 1px rgba(0, 0, 0, 0.1);
          --pd-text: var(--text-primary);
          --pd-text-muted: var(--text-secondary);
          --pd-text-dim: #64748b;
          --pd-blue: var(--primary-blue);
          --pd-blue-dim: rgba(29, 155, 240, 0.1);
          --pd-green: #10b981;
          --pd-green-dim: rgba(16, 185, 129, 0.1);
          --pd-topbar: rgba(255, 255, 255, 0.85);
          --pd-cover-bg: linear-gradient(135deg, #e0f2fe 0%, #ecfdf5 50%, #f5f3ff 100%);
          --pd-cover-overlay: 
            radial-gradient(circle at 20% 30%, rgba(45, 126, 255, 0.15) 0%, transparent 50%),
            radial-gradient(circle at 80% 70%, rgba(16, 185, 129, 0.1) 0%, transparent 50%),
            url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
        }
        [data-theme='dark'] .project-detail-view {
          --pd-surface: #0f172a;
          --pd-card: #090a0f;
          --pd-surface-accent: #1e293b;
          --pd-border: rgba(255, 255, 255, 0.08);
          --pd-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
          --pd-text-dim: rgba(148, 163, 184, 0.7);
          --pd-topbar: rgba(15, 20, 25, 0.8);
          --pd-cover-bg: linear-gradient(135deg, #1e293b 0%, #312e81 35%, #1e1b4b 70%, #0f172a 100%);
          --pd-cover-overlay: 
            radial-gradient(circle at 10% 20%, rgba(56, 189, 248, 0.15) 0%, transparent 40%),
            radial-gradient(circle at 90% 80%, rgba(139, 92, 246, 0.15) 0%, transparent 40%),
            url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.04'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
        }
        @keyframes ai-pulse {
          0% { box-shadow: 0 0 0 0 rgba(139, 92, 246, 0.5); }
          70% { box-shadow: 0 0 0 15px rgba(139, 92, 246, 0); }
          100% { box-shadow: 0 0 0 0 rgba(139, 92, 246, 0); }
        }
        .ai-pulse-button {
          animation: ai-pulse 2s infinite;
        }
        @keyframes fadeInUpContent {
          from { opacity: 0; transform: translateY(15px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .section-appear {
          animation: fadeInUpContent 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

      {/* COVER BANNER */}
      {!isMobile && (
        <div style={{ height: 180, background: 'var(--pd-cover-bg)', borderBottom: `1px solid ${T.border}`, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'var(--pd-cover-overlay)', opacity: 0.95 }} />
        </div>
      )}

      {/* TOPBAR */}
      <div style={{ position: 'sticky', zIndex: 1000, minHeight: isMobile ? 48 : 53, height: isMobile ? 48 : 53, background: 'var(--pd-topbar)', backdropFilter: 'blur(20px)', borderBottom: `1px solid ${T.border}`, padding: isMobile ? '0 12px' : '0 16px', display: 'flex', alignItems: 'center', gap: 16, top: isMobile ? 'var(--sticky-top, 60px)' : 0 }}>
        <button onClick={onBack} style={{ width: 34, height: 34, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: T.text, background: 'transparent', border: 'none' }}>
          <ArrowLeft size={isMobile ? 18 : 20} weight="bold" />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ fontSize: isMobile ? 15 : 17, fontWeight: 800, color: T.text, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{project.name}</h2>
          <div style={{ fontSize: isMobile ? 11 : 12.5, color: T.textMuted, lineHeight: 1 }}>Chi tiết dự án</div>
        </div>
        {approved && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: isMobile ? '2px 8px' : '3px 10px', borderRadius: 999, fontSize: isMobile ? 10 : 11.5, fontWeight: 700, background: T.greenDim, color: T.green, border: '1px solid rgba(0,186,124,0.2)' }}>✓ Đã duyệt</span>}
      </div>

      {/* PROFILE CARD */}
      <div style={{ margin: isMobile ? '0 12px' : '0 20px', marginTop: isMobile ? 8 : 16, position: 'relative', zIndex: 10, background: T.card, border: `1px solid ${T.border}`, borderRadius: isMobile ? 20 : 24, padding: isMobile ? '12px 14px' : '16px 20px', display: 'flex', gap: isMobile ? 14 : 18, alignItems: 'center', flexWrap: 'wrap', boxShadow: T.shadow, backdropFilter: 'blur(20px)' }}>
        <div style={{ width: 64, height: 64, borderRadius: 18, background: avatarGrad(mainTag), display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 26, color: '#fff', border: `3px solid ${T.card}`, flexShrink: 0 }}>{letter}</div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
            <div>
              <h1 style={{ fontSize: isMobile ? 18 : 21, fontWeight: 800, color: T.text, margin: 0, letterSpacing: '-0.02em' }}>{project.name}</h1>
              <p style={{ fontSize: isMobile ? 12.5 : 13.5, color: T.textMuted, lineHeight: 1.5, margin: isMobile ? '1px 0 6px' : '2px 0 8px', maxWidth: 550, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{project.description}</p>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {industryTags.map((tag, idx) => (
                  <span key={idx} style={{ fontSize: isMobile ? 10.5 : 12, color: T.blue, background: T.blueDim, padding: isMobile ? '1px 8px' : '2px 10px', borderRadius: 99, fontWeight: 700 }}>
                    #{tag}
                  </span>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 10, flexShrink: 0 }}>
              {/* Blockchain Verification Button */}
              {user && (
                <button
                  onClick={handleBlockchainVerification}
                  disabled={isLoadingBlockchain}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: isMobile ? 0 : 8,
                    padding: isMobile ? '8px' : '8px 16px',
                    borderRadius: 12,
                    background: 'rgba(29, 155, 240, 0.08)',
                    color: '#1d9bf0',
                    border: '1.5px solid rgba(29, 155, 240, 0.2)',
                    fontWeight: 800,
                    fontSize: 13,
                    cursor: isLoadingBlockchain ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={e => {
                    if (!isLoadingBlockchain) {
                      e.currentTarget.style.background = 'rgba(29, 155, 240, 0.12)';
                      e.currentTarget.style.borderColor = 'rgba(29, 155, 240, 0.4)';
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isLoadingBlockchain) {
                      e.currentTarget.style.background = 'rgba(29, 155, 240, 0.08)';
                      e.currentTarget.style.borderColor = 'rgba(29, 155, 240, 0.2)';
                    }
                  }}
                >
                  {isLoadingBlockchain ? (
                    <CircleNotch size={18} style={{ animation: 'spin 0.8s linear infinite' }} />
                  ) : (
                    <><ShieldCheck size={isMobile ? 18 : 15} weight="bold" /> {!isMobile && 'Xác thực Blockchain'}</>
                  )}
                </button>
              )}

              {/* AI Action Button */}
              {(user?.role?.toString().toLowerCase() === 'investor' || Number(user?.role) === 1) && (
                <>
                  {investorAIResults.length > 0 ? (
                    <button onClick={() => { setActiveAIResult(investorAIResults[0]); setShowAIResultModal(true); }} className="ai-pulse-button" style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 0 : 8, padding: isMobile ? '8px' : '8px 16px', borderRadius: 12, background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)', color: '#fff', border: 'none', fontWeight: 800, fontSize: 13, cursor: 'pointer', boxShadow: '0 6px 16px rgba(139, 92, 246, 0.3)', transition: 'transform 0.2s' }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1.5px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
                      <Sparkle size={isMobile ? 18 : 15} weight="bold" /> {!isMobile && 'Xem Phân tích AI'}
                    </button>
                  ) : (
                    <button onClick={() => setShowAIConfirmModal(true)} style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 0 : 8, padding: isMobile ? '8px' : '8px 16px', borderRadius: 12, background: 'rgba(139, 92, 246, 0.08)', color: '#8b5cf6', border: '1.5px solid rgba(139, 92, 246, 0.2)', fontWeight: 800, fontSize: 13, cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={e => { e.currentTarget.style.background = 'rgba(139, 92, 246, 0.12)'; e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.4)'; }} onMouseLeave={e => { e.currentTarget.style.background = 'rgba(139, 92, 246, 0.08)'; e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.2)'; }}>
                      <Brain size={isMobile ? 18 : 15} weight="bold" /> {!isMobile && 'AI Phân tích'}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        <div style={{ width: '100%', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', borderTop: `1px solid ${T.border}`, marginTop: isMobile ? 12 : 14, paddingTop: isMobile ? 6 : 14, gap: isMobile ? 0 : 12 }}>
          {[
            { icon: <TrendUp size={isMobile ? 20 : 22} weight="duotone" color={T.blue} />, val: scQuick ? scQuick.traction : (showMetricLock ? <PremiumBadge /> : '—'), lbl: 'Tình hình KD (traction)', color: T.blue },
            { icon: <ChartBar size={isMobile ? 20 : 22} weight="duotone" color={T.green} />, val: scQuick ? scQuick.market : (showMetricLock ? <PremiumBadge /> : '—'), lbl: 'Quy mô TT (scorecard)', color: T.green },
            { icon: <Lightning size={isMobile ? 20 : 22} weight="duotone" color={latestAI != null ? T.amber : T.textDim} />, val: latestAI != null ? String(latestAI) : '—', lbl: 'Điểm AI Potential', color: latestAI != null ? T.amber : T.textDim }
          ].map((k, i, arr) => (
            <div key={i} style={{
              textAlign: isMobile ? 'left' : 'center',
              borderRight: (!isMobile && i < arr.length - 1) ? `1px solid ${T.border}` : 'none',
              borderBottom: (isMobile && i < arr.length - 1) ? `1px solid ${T.border}` : 'none',
              padding: isMobile ? '14px 4px' : '8px',
              display: 'flex',
              flexDirection: isMobile ? 'row' : 'column',
              alignItems: 'center',
              gap: isMobile ? 16 : 1,
              width: '100%'
            }}>
              <div style={{ marginBottom: isMobile ? 0 : 2, width: isMobile ? 32 : 'auto', display: 'flex', justifyContent: 'center' }}>{k.icon}</div>
              <div style={{ flex: 1, display: 'flex', flexDirection: isMobile ? 'row' : 'column', alignItems: 'center', justifyContent: isMobile ? 'space-between' : 'center', gap: isMobile ? 12 : 1 }}>
                <div style={{ fontSize: isMobile ? 11.5 : 10.5, fontWeight: isMobile ? 700 : 700, textTransform: 'uppercase', color: T.textDim, opacity: 0.8, letterSpacing: '0.02em', order: isMobile ? 1 : 2 }}>{k.lbl}</div>
                <div style={{ fontSize: isMobile ? 14.5 : 15, fontWeight: 900, color: k.color, letterSpacing: '-0.02em', order: isMobile ? 2 : 1, display: 'flex', alignItems: 'center' }}>{k.val}</div>
              </div>
            </div>
          ))}
        </div>

      </div>

      {/* GRID CONTENT */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '38% 62%', padding: isMobile ? '20px 12px' : '28px 20px', gap: isMobile ? 14 : 0, width: '100%', minWidth: 0, boxSizing: 'border-box' }}>
        {/* LEFT COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingRight: isMobile ? 0 : 20, borderRight: isMobile ? 'none' : `1px solid ${T.border}`, minWidth: 0 }}>
          <SectionCard>
            <SectionHeader><ClipboardText size={18} weight="duotone" /> Thông tin cơ bản</SectionHeader>
            <SectionBody>
              <FieldGrid cols={1}>
                <Field label="Mô tả ngắn" full>{DISP(project.shortDescription)}</Field>
                <Field label="Giai đoạn phát triển" full><span style={{ background: chip.bg, color: chip.color, border: chip.border, padding: '3px 10px', borderRadius: 5, fontSize: 12, fontWeight: 700 }}>📈 {stageLabel}</span></Field>
                <Field label="Vấn đề cần giải quyết">{DISP(project.problemStatement)}</Field>
                <Field label="Giải pháp đề xuất">{DISP(project.solutionDescription)}</Field>
              </FieldGrid>
            </SectionBody>
          </SectionCard>

          <SectionCard>
            <SectionHeader><ImageIcon size={18} weight="duotone" /> Hình ảnh dự án</SectionHeader>
            <SectionBody>
              {project.projectImageUrl ? (
                <div onClick={() => setShowFullscreenImage(true)} style={{ borderRadius: 12, overflow: 'hidden', cursor: 'zoom-in', aspectRatio: '16/9', background: '#000' }}>
                  <img src={project.projectImageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              ) : <div style={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.textMuted }}>Không có hình ảnh</div>}
            </SectionBody>
          </SectionCard>

          <SectionCard>
            <SectionHeader><Users size={18} weight="duotone" /> Đội ngũ (scorecard)</SectionHeader>
            <SectionBody>
              {scRowsTeam.length > 0
                ? scRowsTeam.map((row, i) => (
                    <div key={i} style={{ padding: '8px 0', borderBottom: `1px solid ${T.border}` }}>
                      <div style={{ fontSize: 11, color: T.textDim, marginBottom: 4 }}>{row.label}</div>
                      <div style={{ fontWeight: 700 }}>{row.value}</div>
                    </div>
                  ))
                : 'Đang cập nhật'}
            </SectionBody>
          </SectionCard>

          <SectionCard>
            <SectionHeader><SealCheck size={18} weight="duotone" /> Cố Vấn Chính Thức</SectionHeader>
            <SectionBody>
              {project.assignedAdvisorName ? (
                <div>
                  <div style={{ fontWeight: 700 }}>{project.assignedAdvisorName}</div>
                  {(user?.role?.toString().toLowerCase() === 'investor' || Number(user?.role) === 1) && (
                    <button onClick={() => {
                      if (!isInvestorApproved) {
                        onRestrictedAction?.('Bạn cần được phê duyệt hồ sơ Nhà đầu tư để đặt lịch tư vấn với Cố vấn.');
                        return;
                      }
                      setShowBookingWizard(true);
                    }} style={{ marginTop: 10, padding: '8px 16px', borderRadius: 8, background: T.blue, color: '#fff', border: 'none', cursor: 'pointer' }}>Đặt lịch tư vấn</button>
                  )}
                </div>
              ) : 'Đang phân công cố vấn'}
            </SectionBody>
          </SectionCard>
        </div>

        {/* RIGHT COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingLeft: isMobile ? 0 : 20, minWidth: 0 }}>
          <SectionCard>
            <SectionHeader><TrendUp size={18} weight="duotone" /> Thị trường & Mô hình</SectionHeader>
            <SectionBody>
              <FieldGrid>
                <Field label="Khách hàng mục tiêu">{DISP(project.targetCustomers)}</Field>
                <Field label="UVP">{DISP(project.uniqueValueProposition)}</Field>
                <Field label="Mô hình kinh doanh" full>{project.businessModel === undefined ? <PremiumBadge /> : DISP(project.businessModel)}</Field>
                {scRowsRest.map((row, i) => (
                  <Field key={i} label={row.label}>{row.value}</Field>
                ))}
              </FieldGrid>
            </SectionBody>
          </SectionCard>

          <SectionCard>
            <SectionHeader><Sword size={18} weight="duotone" /> Cạnh tranh</SectionHeader>
            <SectionBody>
              <FieldGrid>
                <Field label="Đối thủ">{project.competitors === undefined ? <PremiumBadge /> : DISP(project.competitors)}</Field>
              </FieldGrid>
            </SectionBody>
          </SectionCard>

          <SectionCard>
            <SectionHeader><FolderOpen size={18} weight="duotone" /> Tài liệu dự án</SectionHeader>
            <SectionBody style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {docError ? (
                <div style={{
                  padding: '24px 16px',
                  textAlign: 'center',
                  background: 'rgba(244, 33, 46, 0.03)',
                  borderRadius: 16,
                  border: `1px dashed ${T.red}40`,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 10
                }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: '50%',
                    background: `${T.red}15`, display: 'flex',
                    alignItems: 'center', justifyContent: 'center', color: T.red
                  }}>
                    <LockSimple size={22} weight="bold" />
                  </div>
                  <div style={{ color: T.red, fontWeight: 700, fontSize: 13, lineHeight: 1.5, maxWidth: 280 }}>
                    {docError}
                  </div>
                </div>
              ) : documents.length > 0 ? (
                documents.map((doc, i) => <DocumentCard key={i} doc={doc} />)
              ) : (
                <div style={{ padding: 20, textAlign: 'center', color: T.textMuted }}>Không có tài liệu</div>
              )}
            </SectionBody>
          </SectionCard>
        </div>
      </div>

      {/* MODALS */}
      {showBookingWizard && (
        <BookingWizard
          onClose={() => setShowBookingWizard(false)}
          user={user}
          isApproved={(() => {
            const roleStr = user?.role?.toString().toLowerCase() || '';
            const roleNum = Number(user?.role);
            if (roleStr === 'startup' || roleNum === 0) return isStartupApproved;
            if (roleStr === 'investor' || roleNum === 1) return isInvestorApproved;
            return true;
          })()}
          initialProjectId={projectId}
          initialAdvisorId={project?.assignedAdvisorId}
          onViewProject={(pid) => {
            setShowBookingWizard(false);
            onViewProject?.(pid);
          }}
        />
      )}
      {showUnlockConfirm && <UnlockConfirmationModal isOpen={showUnlockConfirm} onClose={() => setShowUnlockConfirm(false)} onConfirm={confirmUnlock} isUnlocking={isUnlocking} isLoadingQuota={isLoadingQuota} projectName={project?.name} remainingViews={remainingViews} packageName={subscription?.packageName} />}
      {showBlockchainModal && <BlockchainVerificationModal isOpen={showBlockchainModal} verificationData={blockchainData} isLoading={isLoadingBlockchain} error={blockchainError} onClose={() => { setShowBlockchainModal(false); setBlockchainData(null); setBlockchainError(null); }} />}
      {showFullscreenImage && project?.projectImageUrl && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.9)' }} onClick={() => setShowFullscreenImage(false)}>
          <img src={project.projectImageUrl} style={{ maxWidth: '90%', maxHeight: '90%', objectFit: 'contain' }} />
          <button style={{ position: 'absolute', top: 20, right: 20, background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}><X size={30} /></button>
        </div>
      )}
      <AIAnalyzeConfirmationModal isOpen={showAIConfirmModal} onClose={() => setShowAIConfirmModal(false)} onConfirm={handleAIAnalyze} isAnalyzing={isAnalyzingAI} isLoadingQuota={isLoadingQuota} projectName={project?.name} remainingAiRequests={remainingAiRequests} packageName={currentPackage?.packageName || subscription?.packageName} />
      <AIEvaluationModal
        isOpen={showAIResultModal}
        onCancel={() => setShowAIResultModal(false)}
        analysisResult={activeAIResult}
        projectName={project?.name}
        viewerRole={user?.role}
        uiVariant={user?.role?.toString().toLowerCase() === 'investor' || Number(user?.role) === 1 ? 'investor' : 'startup'}
        isHistoryMode={investorAIResults.some(
          (r) => (r.analysisId ?? r.id) === (activeAIResult?.analysisId ?? activeAIResult?.id)
        )}
        isEvaluationOnly={true}
        onReanalyze={
          user?.role?.toString().toLowerCase() === 'investor' || Number(user?.role) === 1
            ? () => {
                setShowAIResultModal(false);
                fetchQuotaData().then(() => setShowAIConfirmModal(true));
              }
            : undefined
        }
      />
    </div>
  );
}