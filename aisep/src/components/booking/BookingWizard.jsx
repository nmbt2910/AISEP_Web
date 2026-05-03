import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, CaretLeft, CaretRight, Check, WarningCircle, CircleNotch, Calendar, Clock, User, Briefcase, CreditCard, Sparkle, Info, ShieldCheck, Gavel, Crown, CurrencyCircleDollar } from '@phosphor-icons/react';
import subscriptionService from '../../services/subscriptionService';
import bookingService from '../../services/bookingService';
import advisorAvailabilityService from '../../services/advisorAvailabilityService';
import advisorService from '../../services/advisorService';
import SlotPicker from './SlotPicker';
import PaymentModal from './PaymentModal';
import styles from './BookingWizard.module.css';

const STEPS = ['Chọn Dự Án', 'Chọn Cố Vấn', 'Chọn Khung Giờ', 'Xác Nhận'];

/**
 * BookingWizard – Full-screen modal, 4-step booking flow
 * Props:
 *   onClose()          – đóng modal
 *   user               – user object từ App
 *   initialAdvisorId   – (optional) pre-select advisor, skip step 2
 *   sourceBookingId    – (optional) dùng khi rebooking từ NoResponse/Cancel
 */
export default function BookingWizard({ onClose, user, isApproved = true, initialAdvisorId = null, initialProjectId = null, sourceBookingId = null }) {
  const [step, setStep] = useState((initialProjectId || sourceBookingId) ? 1 : 0);
  const [isInitializing, setIsInitializing] = useState(!!(initialProjectId || sourceBookingId));

  // Step 1 – Project
  const [projects, setProjects] = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [projectsError, setProjectsError] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);

  // Step 2 – Advisor
  const [advisorOptions, setAdvisorOptions] = useState([]);
  const [advisorDetails, setAdvisorDetails] = useState({}); // advisorId → full AdvisorResponse
  const [advisorsLoading, setAdvisorsLoading] = useState(false);
  const [advisorsError, setAdvisorsError] = useState(null);
  const [projectAdvisorsCount, setProjectAdvisorsCount] = useState(-1); // -1: chưa load, 0: không có, >0: có
  const [selectedAdvisor, setSelectedAdvisor] = useState(null);

  // Step 3 – Slots
  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState(null);
  const [selectedSlotIds, setSelectedSlotIds] = useState([]);
  const [slotValidationError, setSlotValidationError] = useState(null);
  const [note, setNote] = useState('');

  // Step 4 – Submit
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [createdBooking, setCreatedBooking] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Free Booking State
  const [subscription, setSubscription] = useState(null);
  const [useFreeBooking, setUseFreeBooking] = useState(false);
  const [isComplaintRebook, setIsComplaintRebook] = useState(false);
  const [sourceBookingStatus, setSourceBookingStatus] = useState(null);
  
  // Toast State
  const [toast, setToast] = useState({ visible: false, message: '' });

  const showToast = useCallback((message) => {
    setToast({ visible: true, message });
    setTimeout(() => {
      setToast(prev => ({ ...prev, visible: false }));
    }, 4000);
  }, []);

  // Auto-advance if initial data is provided
  useEffect(() => {
    // If we have an initial project OR a source booking, we want to skip step 0
    if ((initialProjectId || sourceBookingId) && step === 0 && selectedProject) {
      setStep(1); // Jump to Advisor selection (Step 2)
    }
  }, [initialProjectId, sourceBookingId, selectedProject, step]);

  // Fetch project context AND subscription context
  useEffect(() => {
    const fetchData = async () => {
      setIsInitializing(true);
      try {
        // Fetch subscription
        const sub = await subscriptionService.getMySubscription();
        setSubscription(sub);

        if (initialProjectId || sourceBookingId) {
          if (sourceBookingId) {
            const booking = await bookingService.getBookingById(sourceBookingId);
            if (booking) {
              setSelectedProject({
                projectId: booking.projectId || booking.project?.projectId,
                projectName: booking.projectName || booking.project?.projectName
              });
              setSourceBookingStatus(booking.status);
              // Automaticaly detect if this is a free re-booking due to complaint
              // Status 4 is ComplaintAccepted
              if (booking.status === 4 || booking.status === "ComplaintAccepted") {
                setIsComplaintRebook(true);
              }
            }
          } else if (initialProjectId) {
            const allProjects = await bookingService.getProjectOptions();
            const found = allProjects.find(p => p.projectId === initialProjectId);
            if (found) {
              setSelectedProject(found);
            }
          }
        }
      } catch (e) {
        console.error("Failed to fetch wizard initialization context", e);
      } finally {
        setIsInitializing(false);
      }
    };
    fetchData();
  }, [sourceBookingId, initialProjectId]);

  // ── Load Projects ──────────────────────────────────────────────────────
  useEffect(() => {
    if (step !== 0) return;
    const load = async () => {
      setProjectsLoading(true);
      setProjectsError(null);
      try {
        const rawData = await bookingService.getProjectOptions();
        const projectList = Array.isArray(rawData) ? rawData : [];

        // Nếu rỗng thì set ngay
        if (projectList.length === 0) {
          setProjects([]);
          return;
        }

        // Kiểm tra assignment của tất cả project
        const assignedProjectIds = [];
        await Promise.allSettled(
          projectList.map(async (p) => {
            try {
              const options = await bookingService.getAdvisorOptions(p.projectId);
              if (Array.isArray(options) && options.length > 0) {
                 if (initialAdvisorId) {
                    if (options.some(o => o.advisorId === initialAdvisorId)) {
                       assignedProjectIds.push(p.projectId);
                    }
                 } else {
                    assignedProjectIds.push(p.projectId);
                 }
              }
            } catch {
              // ignore errors, just don't add
            }
          })
        );

        const filteredProjects = projectList.filter(p => assignedProjectIds.includes(p.projectId));
        setProjects(filteredProjects);

        // Pre-select project if initialProjectId is provided
        if (initialProjectId) {
          const found = filteredProjects.find(p => p.projectId === initialProjectId);
          if (found) {
            setSelectedProject(found);
          }
        }
      } catch (e) {
        setProjectsError(e.message || 'Không thể tải danh sách dự án.');
      } finally {
        setProjectsLoading(false);
      }
    };
    load();
  }, [step, initialAdvisorId, initialProjectId]);

  // ── Load Advisors khi project được chọn ────────────────────────────────
  useEffect(() => {
    if ((step !== 1 && !((initialProjectId || sourceBookingId) && step === 0)) || !selectedProject) return;
    const load = async () => {
      setAdvisorsLoading(true);
      setAdvisorsError(null);
      try {
        let options;
        if (sourceBookingId) {
          // Use replacement advisor API if this is a re-booking flow
          options = await bookingService.getReplacementAdvisorOptions(sourceBookingId);
        } else {
          // Normal flow: advisors assigned to project
          options = await bookingService.getAdvisorOptions(selectedProject.projectId);
        }
        
        const list = Array.isArray(options) ? options : [];
        setProjectAdvisorsCount(list.length);

        // Load raw options without artificially merging initialAdvisorId
        // because backend REQUIRES strict assignment mapping.
        let finalOptions = [...list];
        setAdvisorOptions(finalOptions);

        // Pre-select advisor if initialAdvisorId is provided
        if (initialAdvisorId) {
          const found = finalOptions.find(opt => opt.advisorId === initialAdvisorId);
          if (found) {
            setSelectedAdvisor(found);
          }
        }

        // Fetch full advisor profile cho các advisor còn lại (trừ cái đã có detail)
        const detailMap = { ...advisorDetails };
        await Promise.allSettled(
          finalOptions.map(async (opt) => {
            if (detailMap[opt.advisorId]) return;
            try {
              const full = await advisorService.getAdvisorById(opt.advisorId);
              detailMap[opt.advisorId] = full;
            } catch {
              detailMap[opt.advisorId] = { userName: opt.advisorName, status: 'Unknown' };
            }
          })
        );
        setAdvisorDetails(detailMap);

        // Filter options to only include Approved advisors (BR-21 safety)
        const approvedOptions = finalOptions.filter(opt => {
          const detail = detailMap[opt.advisorId];
          if (!detail) return false;
          const status = detail.status || detail.approvalStatus;
          return status === 'Approved' || status === 1;
        });
        setAdvisorOptions(approvedOptions);
        setProjectAdvisorsCount(approvedOptions.length);
      } catch (e) {
        setAdvisorsError(e.message || 'Không thể tải danh sách cố vấn.');
      } finally {
        setAdvisorsLoading(false);
      }
    };
    load();
  }, [step, selectedProject, initialProjectId, initialAdvisorId, sourceBookingId]);

  // ── Pre-select advisor nếu có initialAdvisorId ─────────────────────────
  useEffect(() => {
    if (!initialAdvisorId) return;
    const load = async () => {
      setAdvisorsLoading(true);
      try {
        const full = await advisorService.getAdvisorById(initialAdvisorId);
        const status = full?.status || full?.approvalStatus;
        const isApproved = status === 'Approved' || status === 1;

        if (isApproved) {
          const opt = { advisorId: initialAdvisorId, advisorName: full?.userName || full?.name || '' };
          setAdvisorOptions([opt]);
          setAdvisorDetails({ [initialAdvisorId]: full });
          setSelectedAdvisor(opt);
        } else {
          console.warn('[BookingWizard] Pre-selected advisor is not approved');
          setAdvisorOptions([]);
        }
      } catch {
        /* ignore */
      } finally {
        setAdvisorsLoading(false);
      }
    };
    load();
  }, [initialAdvisorId]);

  // ── Load Slots khi advisor được chọn ──────────────────────────────────
  useEffect(() => {
    if (step !== 2 || !selectedAdvisor) return;
    const load = async () => {
      setSlotsLoading(true);
      setSlotsError(null);
      try {
        const data = await advisorAvailabilityService.getByAdvisorId(selectedAdvisor.advisorId);
        // Chỉ hiển thị slot Available (status === 0 hoặc "Available")
        const available = data.filter(s => s.status === 0 || s.status === 'Available');
        setSlots(available);
      } catch (e) {
        setSlotsError(e.message || 'Không thể tải khung giờ.');
      } finally {
        setSlotsLoading(false);
      }
    };
    load();
  }, [step, selectedAdvisor]);

  // ── Validation slots ────────────────────────────────────────────────────
  const validateSlots = useCallback((selectedIds) => {
    if (selectedIds.length === 0) {
      setSlotValidationError(null);
      return false;
    }

    const selectedSlots = slots.filter(s => selectedIds.includes(s.advisorAvailabilityId)).sort((a, b) => {
      const da = new Date(`${a.slotDate?.split('T')[0]}T${a.startTime}`);
      const db = new Date(`${b.slotDate?.split('T')[0]}T${b.startTime}`);
      return da - db;
    });

    // Kiểm tra đặt trước tối thiểu 12 giờ
    const now = new Date();
    const first = selectedSlots[0];
    const firstStart = new Date(`${first.slotDate?.split('T')[0]}T${first.startTime}`);
    const hoursAhead = (firstStart - now) / (1000 * 60 * 60);
    if (hoursAhead < 12) {
      setSlotValidationError('Bạn phải đặt lịch trước ít nhất 12 giờ so với thời điểm hiện tại.');
      return false;
    }

    // Kiểm tra các slot phải liên tiếp nhau
    for (let i = 1; i < selectedSlots.length; i++) {
      const prevEnd = new Date(`${selectedSlots[i - 1].slotDate?.split('T')[0]}T${selectedSlots[i - 1].endTime}`);
      const currStart = new Date(`${selectedSlots[i].slotDate?.split('T')[0]}T${selectedSlots[i].startTime}`);
      if (currStart.getTime() !== prevEnd.getTime()) {
        setSlotValidationError('Các khung giờ được chọn phải liên tiếp nhau.');
        return false;
      }
    }

    setSlotValidationError(null);
    return true;
  }, [slots]);

  const handleSlotToggle = (slotId) => {
    const isRemoving = selectedSlotIds.includes(slotId);
    const nextIds = isRemoving 
      ? selectedSlotIds.filter(id => id !== slotId) 
      : [...selectedSlotIds, slotId];

    // Reset free booking toggle if hours exceed limit (Max 3 hours for Premium)
    if (nextIds.length > 3) {
      setUseFreeBooking(false);
    }

    setSelectedSlotIds(nextIds);
    validateSlots(nextIds);
  };

  // ── Submit ─────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!validateSlots(selectedSlotIds)) return;

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const payload = {
        AdvisorId: selectedAdvisor.advisorId,
        ProjectId: selectedProject?.projectId,
        AdvisorAvailabilitySlotIds: selectedSlotIds,
        Note: note.trim() || null,
        ...(sourceBookingId ? { SourceBookingId: sourceBookingId } : {}),
        IsFreeBooking: (useFreeBooking && selectedSlotIds.length <= 3) || isComplaintRebook
      };
      const result = await bookingService.createBooking(payload);
      setCreatedBooking(result?.data || result);
      setIsSuccess(true);
    } catch (e) {
      setSubmitError(e.message || 'Gửi booking thất bại. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Navigation ─────────────────────────────────────────────────────────
  const canGoNext = () => {
    if (step === 0) return !!selectedProject;
    if (step === 1) return !!selectedAdvisor;
    if (step === 2) return selectedSlotIds.length > 0 && !slotValidationError;
    return false;
  };

  const goNext = () => {
    if (step < 3) setStep(s => s + 1);
  };

  const goBack = () => {
    if (step > 0) {
      setStep(s => s - 1);
    }
  };

  // ── Selected slot summary ───────────────────────────────────────────────
  const selectedSlots = slots
    .filter(s => selectedSlotIds.includes(s.advisorAvailabilityId))
    .sort((a, b) => {
      const da = new Date(`${a.slotDate?.split('T')[0]}T${a.startTime}`);
      const db = new Date(`${b.slotDate?.split('T')[0]}T${b.startTime}`);
      return da - db;
    });

  const adv = selectedAdvisor ? (advisorDetails[selectedAdvisor.advisorId] || {}) : {};

  // ── Computed price estimate for step 3 ────────────────────────────────
  const estimatedPrice = adv.hourlyRate ? Number(adv.hourlyRate) * selectedSlotIds.length : 0;
  const isFreeBooking = estimatedPrice === 0;
  const formatPrice = (p) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(p);

  const needsPayment =
    createdBooking?.status === 'ApprovedAwaitingPayment' ||
    createdBooking?.status === 1;

  const handleClosePaymentModal = useCallback(() => {
    setShowPaymentModal(false);
    onClose();
  }, [onClose]);

  // ── Restricted Access Screen ──────────────────────────────────────────
  if (!isApproved) {
    return createPortal(
      <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
        <div className={styles.modal} style={{ maxWidth: '440px' }}>
          <div className={styles.header}>
            <div className={styles.headerLeft}>
              <h2 className={styles.headerTitle}>Hành động bị hạn chế</h2>
            </div>
            <button className={styles.closeBtn} onClick={onClose}>
              <X size={22} />
            </button>
          </div>
          <div className={styles.body} style={{ padding: '32px 24px', textAlign: 'center' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '20px', background: 'rgba(245, 158, 11, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <ShieldCheck size={32} weight="fill" color="#f59e0b" />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '12px', color: 'var(--text-primary)' }}>Yêu cầu phê duyệt hồ sơ</h3>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: '15px' }}>
              Bạn cần được phê duyệt hồ sơ để thực hiện đặt lịch tư vấn. 
              Vui lòng hoàn thiện hồ sơ và đợi đội ngũ AISEP xác nhận.
            </p>
          </div>
          <div className={styles.footer}>
            <button className={styles.primaryBtn} onClick={onClose} style={{ width: '100%' }}>
              Tôi đã hiểu
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  }

  // ── Success Screen ─────────────────────────────────────────────────────
  if (isSuccess) {
    return createPortal(
      <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
        <div className={styles.modal}>
          <div className={styles.successScreen}>
            <div className={styles.successIcon}>
              <Check size={40} />
            </div>
            <h2 className={styles.successTitle}>Đặt Lịch Thành Công!</h2>
            <p className={styles.successBody}>
              Yêu cầu của bạn đã được gửi đến <strong>{selectedAdvisor?.advisorName || adv.userName}</strong>.
              {needsPayment
                ? ' Cố vấn đã chấp nhận. Vui lòng hoàn thành thanh toán để xác nhận lịch.'
                : ' Cố vấn sẽ xem xét và phản hồi trong vòng 10 phút.'}
            </p>
            {createdBooking && (() => {
              const b = createdBooking;
              const bId = b.id ?? b.Id;
              const pName = b.projectName ?? b.ProjectName ?? selectedProject?.projectName;
              const aName = b.advisorName ?? b.AdvisorName ?? selectedAdvisor?.advisorName ?? adv.userName;
              const sTime = b.startTime ?? b.StartTime;
              const eTime = b.endTime ?? b.EndTime;
              const bPrice = b.price ?? b.Price ?? estimatedPrice;

              const isValidDate = (d) => d && !isNaN(new Date(d).getTime());

              return (
                <div className={styles.successDetail}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '8px 20px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Mã booking:</span>
                    <strong style={{ color: 'var(--text-primary)' }}>#{bId || '---'}</strong>

                    <span style={{ color: 'var(--text-secondary)' }}>Dự án:</span>
                    <strong style={{ color: 'var(--text-primary)' }}>{pName}</strong>

                    <span style={{ color: 'var(--text-secondary)' }}>Cố vấn:</span>
                    <strong style={{ color: 'var(--text-primary)' }}>{aName}</strong>

                    <span style={{ color: 'var(--text-secondary)' }}>Thời gian:</span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <strong style={{ color: 'var(--text-primary)' }}>
                        {isValidDate(sTime)
                          ? new Date(sTime).toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' })
                          : 'Chưa xác định'}
                      </strong>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        <Clock size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                        {isValidDate(sTime) && isValidDate(eTime)
                          ? `${new Date(sTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} – ${new Date(eTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`
                          : 'Giờ chưa rõ'}
                      </span>
                    </div>

                    <span style={{ color: 'var(--text-secondary)' }}>Tổng thanh toán:</span>
                    <strong style={{ color: '#60a5fa', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {bPrice === 0 ? <><Sparkle size={14} weight="fill" color="#eab308" /> Miễn phí</> : formatPrice(bPrice)}
                    </strong>
                  </div>
                </div>
              );
            })()}
            {needsPayment ? (
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
                <button className={styles.primaryBtn} onClick={() => setShowPaymentModal(true)}>
                  <CreditCard size={16} />
                  Thanh Toán Ngay
                </button>
                <button className={styles.secondaryBtn} onClick={onClose}>
                  Để sau
                </button>
              </div>
            ) : (
              <button className={styles.primaryBtn} onClick={onClose}>
                Đóng
              </button>
            )}
          </div>
        </div>
        {showPaymentModal && createdBooking && (
          <PaymentModal
            bookingId={createdBooking.id}
            price={createdBooking.price}
            advisorName={selectedAdvisor?.advisorName || adv.userName || ''}
            slotCount={selectedSlotIds.length}
            onClose={handleClosePaymentModal}
            onPaid={() => {
              // Background update if needed
            }}
          />
        )}
      </div>,
      document.body
    );
  }

  return createPortal(
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <div>
              <h2 className={styles.headerTitle}>Đặt Lịch Tư Vấn</h2>
              <p className={styles.headerSubtitle}>{STEPS[step]}</p>
            </div>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>
            <X size={22} />
          </button>
        </div>

        {/* Progress bar */}
        <div className={styles.progressBar}>
          {STEPS.map((label, i) => (
            <div
              key={i}
              className={`${styles.progressStep} ${i <= step ? styles.progressActive : ''} ${i < step ? styles.progressDone : ''}`}
            >
              <div className={styles.progressDot}>
                {i < step ? <Check size={12} /> : <span>{i + 1}</span>}
              </div>
              <span className={styles.progressLabel}>{label}</span>
            </div>
          ))}
        </div>

        {/* Content */}
        <div className={styles.body}>
          {isInitializing ? (
            <div className={styles.loadingState} style={{ flex: 1, justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
              <CircleNotch size={32} className={styles.spin} weight="bold" />
              <p style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Đang khởi tạo lịch tư vấn...</p>
            </div>
          ) : (
            <>
              <div className={styles.scrollArea}>

          {/* ── STEP 0: Chọn Project ────────────────────────────── */}
          {step === 0 && (
            <div className={styles.stepContent}>
              <p className={styles.stepHint}>Chọn dự án bạn muốn tư vấn</p>
              {projectsLoading && (
                <div className={styles.loadingState}>
                  <CircleNotch size={24} className={styles.spin} weight="bold" />
                  <span>Đang tải dự án...</span>
                </div>
              )}
              {projectsError && (
                <div className={styles.errorBanner}>
                  <WarningCircle size={16} />
                  <span>{projectsError}</span>
                </div>
              )}
              {!projectsLoading && !projectsError && projects.length === 0 && (
                <div className={styles.emptyState}>
                  <Briefcase size={40} />
                  <p>Không có dự án nào đang được phân công {initialAdvisorId ? 'cho Cố vấn này' : 'hiện tại'}. 
                  <br/> Vắng dự án, không thể tiến hành đặt lịch.</p>
                </div>
              )}
              <div className={styles.cardGrid}>
                {projects.map(p => (
                  <button
                    key={p.projectId}
                    className={`${styles.optionCard} ${selectedProject?.projectId === p.projectId ? styles.optionCardSelected : ''}`}
                    onClick={() => setSelectedProject(p)}
                  >
                    <div className={styles.optionCardIcon}><Briefcase size={22} /></div>
                    <span className={styles.optionCardName}>{p.projectName}</span>
                    {selectedProject?.projectId === p.projectId && (
                      <div className={styles.checkMark}><Check size={14} /></div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── STEP 1: Chọn Advisor ────────────────────────────── */}
          {step === 1 && (
            <div className={styles.stepContent}>
              <p className={styles.stepHint}>
                {sourceBookingId 
                  ? "Danh sách cố vấn thay thế được hệ thống đề xuất cho dự án " 
                  : "Cố vấn được phân công cho dự án "}
                <strong>{selectedProject?.projectName}</strong>
              </p>
              {advisorsLoading && (
                <div className={styles.loadingState}>
                  <CircleNotch size={24} className={styles.spin} weight="bold" />
                  <span>Đang tải cố vấn...</span>
                </div>
              )}
              {advisorsError && (
                <div className={styles.errorBanner}>
                  <WarningCircle size={16} />
                  <span>{advisorsError}</span>
                </div>
              )}
              
              {/* Thông báo chưa được phân công nhưng vẫn cho phép đặt lịch với advisor đã chọn */}
              {!advisorsLoading && !advisorsError && projectAdvisorsCount === 0 && !sourceBookingId && (
                <div className={styles.infoBanner} style={{ marginBottom: 16 }}>
                  <WarningCircle size={16} />
                  <span>Dự án này chưa được quản trị viên phân công cố vấn chính thức.</span>
                </div>
              )}

              {!advisorsLoading && !advisorsError && advisorOptions.length === 0 && (
                <div className={styles.emptyState}>
                  <User size={40} />
                  <p>{sourceBookingId ? "Hiện không tìm thấy cố vấn thay thế nào phù hợp." : "Dự án này chưa có cố vấn được phân công."}</p>
                </div>
              )}
              <div className={styles.advisorGrid}>
                {advisorOptions.map(opt => {
                  const detail = advisorDetails[opt.advisorId] || {};
                  const expertises = detail.expertise
                    ? detail.expertise.split(',').map(s => s.trim()).filter(Boolean)
                    : [];
                  return (
                    <button
                      key={opt.advisorId}
                      className={`${styles.advisorCard} ${selectedAdvisor?.advisorId === opt.advisorId ? styles.advisorCardSelected : ''}`}
                      onClick={() => setSelectedAdvisor(opt)}
                    >
                      <div className={styles.advisorAvatar}>
                        {advisorsLoading ? <CircleNotch size={18} className={styles.spin} weight="bold" /> : (opt.advisorName || 'A').charAt(0).toUpperCase()}
                      </div>
                      <div className={styles.advisorCardInfo}>
                        <span className={styles.advisorName}>{opt.advisorName}</span>
                        {expertises.length > 0 && (
                          <div className={styles.expertiseTags}>
                            {expertises.slice(0, 2).map((e, i) => (
                              <span key={i} className={styles.expertiseTag}>{e}</span>
                            ))}
                          </div>
                        )}
                        {detail.bio && (
                          <p className={styles.advisorBio}>{detail.bio.slice(0, 80)}{detail.bio.length > 80 ? '...' : ''}</p>
                        )}
                        {detail.hourlyRate && (
                          <span className={styles.advisorRate}>
                            <CurrencyCircleDollar size={16} weight="bold" style={{ verticalAlign: 'middle', marginRight: 4 }} /> 
                            {Number(detail.hourlyRate).toLocaleString('vi-VN')} VNĐ/giờ
                          </span>
                        )}
                      </div>
                      {selectedAdvisor?.advisorId === opt.advisorId && (
                        <div className={styles.checkMark}><Check size={14} /></div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── STEP 2: Chọn Slots ──────────────────────────────── */}
          {step === 2 && (
            <div className={styles.stepContent}>
              <p className={styles.stepHint}>
                Chọn các khung giờ <strong>liên tiếp nhau</strong> (đặt trước ít nhất 12 giờ)
              </p>
              {subscription?.remainingFreeBookings > 0 && selectedSlotIds.length > 3 && (
                <div style={{ display: 'none' }}>
                  {/* Hidden logical block, now handled by Toast */}
                </div>
              )}
              {slotValidationError && (
                <div className={styles.errorBanner}>
                  <WarningCircle size={16} />
                  <span>{slotValidationError}</span>
                </div>
              )}
              {slotsLoading ? (
                <div className={styles.loadingState}>
                  <CircleNotch size={24} className={styles.spin} weight="bold" />
                  <span>Đang tải khung giờ...</span>
                </div>
              ) : slotsError ? (
                <div className={styles.errorBanner}>
                  <WarningCircle size={16} />
                  <span>{slotsError}</span>
                </div>
              ) : slots.length === 0 ? (
                <div className={styles.emptyState}>
                  <Calendar size={40} />
                  <p>Cố vấn hiện chưa có khung giờ rảnh nào.</p>
                </div>
              ) : (
                <>
                  <SlotPicker
                    slots={slots}
                    selectedSlotIds={selectedSlotIds}
                    onToggle={handleSlotToggle}
                  />
                </>
              )}
            </div>
          )}

          {/* ── STEP 3: Xác Nhận ────────────────────────────────── */}
          {step === 3 && (
            <div className={styles.stepContent}>
              <p className={styles.stepHint}>Kiểm tra lại thông tin trước khi gửi</p>

              <div className={styles.summaryCard}>
                <div className={styles.summaryRow}>
                  <Briefcase size={16} className={styles.summaryIcon} />
                  <div>
                    <div className={styles.summaryLabel}>Dự án</div>
                    <div className={styles.summaryValue}>{selectedProject?.projectName}</div>
                  </div>
                </div>

                <div className={styles.summaryDivider} />

                <div className={styles.summaryRow}>
                  <User size={16} className={styles.summaryIcon} />
                  <div>
                    <div className={styles.summaryLabel}>Cố vấn</div>
                    <div className={styles.summaryValue}>{selectedAdvisor?.advisorName}</div>
                    {adv.expertise && (
                      <div className={styles.summaryMeta}>{adv.expertise.split(',')[0]?.trim()}</div>
                    )}
                  </div>
                </div>

                <div className={styles.summaryDivider} />

                <div className={styles.summaryRow}>
                  <Clock size={16} className={styles.summaryIcon} />
                  <div style={{ flex: 1 }}>
                    <div className={styles.summaryLabel}>
                      Khung giờ đã chọn ({selectedSlots.length} slot – {selectedSlots.length} giờ)
                    </div>
                    <div className={styles.slotList}>
                      {selectedSlots.map(s => {
                        const dateStr = new Date(s.slotDate).toLocaleDateString('vi-VN', {
                          weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
                        });
                        const start = s.startTime?.slice(0, 5);
                        const end = s.endTime?.slice(0, 5);
                        return (
                          <span key={s.advisorAvailabilityId} className={styles.slotChip}>
                            {dateStr} • {start} – {end}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className={styles.summaryDivider} />

                {/* Pricing Row */}
                <div className={styles.summaryRow}>
                  <CreditCard size={16} className={styles.summaryIcon} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <div className={styles.summaryLabel}>Phí tư vấn</div>
                        {!isFreeBooking && !isComplaintRebook && adv.hourlyRate && (
                          <div className={styles.summaryMeta}>
                            {Number(adv.hourlyRate).toLocaleString('vi-VN')} VNĐ/giờ × {selectedSlots.length} giờ
                          </div>
                        )}
                      </div>
                      <span style={{ color: (isFreeBooking || useFreeBooking || isComplaintRebook) ? '#22c55e' : '#60a5fa', fontWeight: 800, fontSize: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
                        {(isFreeBooking || useFreeBooking || isComplaintRebook) ? (
                          <><Sparkle size={16} weight="fill" color="#eab308" /> Miễn phí</>
                        ) : (
                          formatPrice(estimatedPrice)
                        )}
                      </span>
                    </div>

                    {/* Description for Complaint Re-booking */}
                    {isComplaintRebook && (
                      <div className={styles.freeBenefitCard} style={{ marginTop: 12, border: '1px solid #17bf6333', background: '#17bf6308' }}>
                         <ShieldCheck size={18} weight="fill" color="#17bf63" />
                         <div className={styles.freeBenefitText}>
                            <strong>Hệ thống hỗ trợ:</strong> Đây là lượt đặt lịch lại miễn phí do khiếu nại trước đó của bạn đã được chấp nhận.
                         </div>
                      </div>
                    )}

                    {/* Toggle and Description for Free Booking Quota (Subscription & Bonus) */}
                    {!isComplaintRebook && !isFreeBooking && subscription && (
                      <div className={styles.freeBenefitWrapper} style={{ marginTop: 12 }}>
                        {((subscription.remainingFreeBookings ?? 0) + (subscription.bonusFreeBookings ?? 0)) > 0 && selectedSlotIds.length <= 3 ? (
                          <div className={styles.freeBenefitCard}>
                            {subscription.bonusFreeBookings > 0 && subscription.remainingFreeBookings <= 0 ? (
                                <Sparkle size={18} weight="fill" color="#eab308" />
                            ) : (
                                <Crown size={18} weight="fill" color="#eab308" />
                            )}
                            <div className={styles.freeBenefitText} style={{ flex: 1 }}>
                              <strong>{subscription.bonusFreeBookings > 0 ? "Lượt miễn phí:" : "Gói Premium:"}</strong> Bạn đang có {(subscription.remainingFreeBookings ?? 0) + (subscription.bonusFreeBookings ?? 0)} lượt đặt lịch miễn phí.
                              {subscription.bonusFreeBookings > 0 && subscription.remainingFreeBookings > 0 && (
                                <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>
                                  ({subscription.remainingFreeBookings} từ gói đăng ký + {subscription.bonusFreeBookings} lượt hoàn trả)
                                </div>
                              )}
                            </div>
                            <label className={styles.toggleSwitch}>
                                <input 
                                  type="checkbox" 
                                  checked={useFreeBooking} 
                                  onChange={(e) => setUseFreeBooking(e.target.checked)} 
                                />
                                <span className={styles.toggleSlider}></span>
                            </label>
                          </div>
                        ) : (
                          <div className={styles.freeBenefitInfo}>
                            <Info size={16} />
                            <span>
                              {((subscription.remainingFreeBookings ?? 0) + (subscription.bonusFreeBookings ?? 0)) <= 0 
                                ? "Bạn đã hết lượt đặt lịch miễn phí." 
                                : "Lượt đặt lịch miễn phí chỉ áp dụng cho các buổi tư vấn từ 3 giờ trở xuống."}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {note && (
                  <>
                    <div className={styles.summaryDivider} />
                    <div className={styles.summaryRow}>
                      <span className={styles.summaryLabel} style={{ marginBottom: 4 }}>Ghi chú</span>
                    </div>
                    <p className={styles.summaryNote}>{note}</p>
                  </>
                )}
              </div>

              {submitError && (
                <div className={styles.errorBanner}>
                  <WarningCircle size={16} />
                  <span>{submitError}</span>
                </div>
              )}
            </div>
          )}
          </div>
          
          {/* Fixed Note Section for Step 2 - inside body but after scrollArea */}
            {step === 2 && (
              <div className={styles.noteSectionFixed}>
                <label className={styles.noteLabel}>Ghi chú (tùy chọn)</label>
                <textarea
                  className={styles.noteInput}
                  rows={3}
                  placeholder="Mô tả ngắn về vấn đề bạn muốn tư vấn..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>
            )}
          </>
        )}
      </div>

        {/* Micro-Toast Feedback */}
        <div className={`${styles.toastContainer} ${toast.visible ? styles.toastVisible : ''}`}>
          <div className={`${styles.toastContent} ${styles.toastWarning}`}>
            <WarningCircle size={18} weight="bold" color="#eab308" />
            {toast.message}
          </div>
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          {step > 0 && (
            <button className={styles.secondaryBtn} onClick={goBack} disabled={isSubmitting}>
              <CaretLeft size={16} />
              Quay lại
            </button>
          )}
          <div style={{ flex: 1 }} />
          {step < 3 ? (
            <button
              className={styles.primaryBtn}
              onClick={goNext}
              disabled={!canGoNext()}
            >
              Tiếp theo
              <CaretRight size={16} />
            </button>
          ) : (
            <button
              className={styles.primaryBtn}
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <CircleNotch size={16} className={styles.spin} weight="bold" />
                  Đang gửi...
                </>
              ) : (
                <>
                  <Check size={16} />
                  Gửi Yêu Cầu
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
