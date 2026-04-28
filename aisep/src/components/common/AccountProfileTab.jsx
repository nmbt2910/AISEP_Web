import React, { useState, useEffect } from 'react';
import { User, Lock, Eye, EyeOff, Save, CheckCircle, AlertCircle, Loader2, Calendar, AtSign, UserCheck } from 'lucide-react';
import authService from '../../services/authService';
import userService from '../../services/userService';
import styles from './AccountProfileTab.module.css';
import CustomSelect from './CustomSelect';

/**
 * AccountProfileTab — Shared "Hồ sơ người dùng" tab for all roles.
 * Allows editing account info (FullName, UserName, DateOfBirth)
 * and changing the account password.
 *
 * After a successful password change the backend revokes all tokens,
 * so we trigger `onLogout` to force the user back to the login screen.
 */
export default function AccountProfileTab({ user, onLogout, banner }) {
  // ─── Account Info ─────────────────────────────────────────────────────────
  const [accountInfo, setAccountInfo] = useState({
    fullName: '',
    userName: '',
    dateOfBirth: '',
  });
  const [infoLoading, setInfoLoading] = useState(true);
  const [infoSaving, setInfoSaving] = useState(false);
  const [infoSuccess, setInfoSuccess] = useState('');
  const [infoError, setInfoError] = useState('');
  const [avatarPreview, setAvatarPreview] = useState(null);

  // ─── Change Password ───────────────────────────────────────────────────────
  const [pwForm, setPwForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [pwSuccess, setPwSuccess] = useState('');
  const [pwError, setPwError] = useState('');

  // ─── Load user data on mount ───────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      setInfoLoading(true);
      try {
        const res = await userService.getUserById(user.userId);
        const data = res?.data ?? res;
        if (data) {
          setAccountInfo({
            fullName: data.fullName || '',
            userName: data.userName || '',
            dateOfBirth: data.dateOfBirth
              ? data.dateOfBirth.split('T')[0]
              : '',
          });
          if (data.profilePicture) {
            setAvatarPreview(data.profilePicture);
          }
        }
      } catch (e) {
        console.error('[AccountProfileTab] Failed to load user:', e);
      } finally {
        setInfoLoading(false);
      }
    };
    if (user?.userId) load();
  }, [user?.userId]);

  // ─── Save account info ─────────────────────────────────────────────────────
  const handleSaveInfo = async (e) => {
    e.preventDefault();
    setInfoSaving(true);
    setInfoSuccess('');
    setInfoError('');
    try {
      const payload = {
        fullName: accountInfo.fullName || undefined,
        userName: accountInfo.userName || undefined,
        dateOfBirth: accountInfo.dateOfBirth || undefined,
      };
      await userService.updateUser(user.userId, payload);
      setInfoSuccess('Thông tin tài khoản đã được cập nhật thành công.');
    } catch (e) {
      setInfoError(e?.message || 'Cập nhật thất bại. Vui lòng thử lại.');
    } finally {
      setInfoSaving(false);
    }
  };

  // ─── Change password ───────────────────────────────────────────────────────
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwSuccess('');
    setPwError('');

    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setPwError('Mật khẩu mới và xác nhận mật khẩu không khớp.');
      return;
    }
    if (pwForm.newPassword.length < 6) {
      setPwError('Mật khẩu mới phải có ít nhất 6 ký tự.');
      return;
    }

    setPwSaving(true);
    try {
      await authService.changePassword(
        pwForm.currentPassword,
        pwForm.newPassword,
        pwForm.confirmPassword
      );
      setPwSuccess(
        'Đổi mật khẩu thành công! Bạn sẽ được đăng xuất để đăng nhập lại.'
      );
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      // Backend revokes all refresh tokens → force logout after short delay
      setTimeout(() => {
        if (onLogout) onLogout();
      }, 2500);
    } catch (e) {
      setPwError(e?.message || 'Đổi mật khẩu thất bại. Kiểm tra lại mật khẩu hiện tại.');
    } finally {
      setPwSaving(false);
    }
  };

  const roleLabel = () => {
    const r = user?.role?.toString().toLowerCase();
    const n = Number(user?.role);
    if (r === 'startup' || n === 0) return 'Startup';
    if (r === 'investor' || n === 1) return 'Nhà đầu tư';
    if (r === 'advisor' || n === 2) return 'Cố vấn';
    if (r === 'operationstaff' || r === 'staff' || n === 3) return 'Nhân viên vận hành';
    if (r === 'admin' || n === 4) return 'Quản trị viên';
    return r || 'Người dùng';
  };

  // ─── Birthday Pickers Logic ──────────────────────────────────────────────
  const months = [
    { value: 1, label: 'Tháng 1' }, { value: 2, label: 'Tháng 2' }, { value: 3, label: 'Tháng 3' },
    { value: 4, label: 'Tháng 4' }, { value: 5, label: 'Tháng 5' }, { value: 6, label: 'Tháng 6' },
    { value: 7, label: 'Tháng 7' }, { value: 8, label: 'Tháng 8' }, { value: 9, label: 'Tháng 9' },
    { value: 10, label: 'Tháng 10' }, { value: 11, label: 'Tháng 11' }, { value: 12, label: 'Tháng 12' },
  ];

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const currentDay = new Date().getDate();
  const years = Array.from({ length: currentYear - 1900 + 1 }, (_, i) => currentYear - i);

  const getDaysInMonth = (m, y) => {
    if (!m) return 31;
    return new Date(y || 2000, m, 0).getDate();
  };

  const [dobParts, setDobParts] = useState({
    day: '',
    month: '',
    year: ''
  });

  // Calculate available options based on current selection to prevent future dates
  const availableYears = years.map(y => ({ label: String(y), value: y }));
  
  const availableMonths = dobParts.year === currentYear
    ? months.filter(m => m.value <= currentMonth).map(m => ({ label: m.label, value: m.value }))
    : months.map(m => ({ label: m.label, value: m.value }));

  const maxDaysInSelectedMonth = getDaysInMonth(dobParts.month, dobParts.year);
  let daysLimit = maxDaysInSelectedMonth;
  if (dobParts.year === currentYear && dobParts.month === currentMonth) {
    daysLimit = Math.min(maxDaysInSelectedMonth, currentDay);
  }
  
  const availableDays = Array.from({ length: daysLimit }, (_, i) => ({ label: String(i + 1), value: i + 1 }));

  // Sync initial and loaded date to parts
  useEffect(() => {
    if (accountInfo.dateOfBirth) {
      const [y, m, d] = accountInfo.dateOfBirth.split('-');
      setDobParts({
        day: parseInt(d, 10) || '',
        month: parseInt(m, 10) || '',
        year: parseInt(y, 10) || ''
      });
    }
  }, [accountInfo.dateOfBirth]);

  const handleDateChange = (part, valueStr) => {
    const value = parseInt(valueStr, 10);
    const newParts = { ...dobParts, [part]: value };
    
    // Safety check: if user changes month/year such that current day is no longer valid, clamp it
    if (part === 'month' || part === 'year') {
      const newMaxDays = getDaysInMonth(newParts.month, newParts.year);
      let limit = newMaxDays;
      if (newParts.year === currentYear && newParts.month === currentMonth) {
        limit = Math.min(newMaxDays, currentDay);
      }
      if (newParts.day > limit) {
        newParts.day = limit;
      }
    }
    
    setDobParts(newParts);

    // If we have all parts, update the main date string
    if (newParts.day && newParts.month && newParts.year) {
      const d = String(newParts.day).padStart(2, '0');
      const m = String(newParts.month).padStart(2, '0');
      const formatted = `${newParts.year}-${m}-${d}`;
      setAccountInfo(prev => ({ ...prev, dateOfBirth: formatted }));
    }
  };

  if (infoLoading) {
    return (
      <div className={styles.loadingState}>
        <Loader2 size={36} className={styles.spinner} />
        <p>Đang tải thông tin tài khoản...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {banner && (
        <div style={{ marginBottom: '24px' }}>
          {banner}
        </div>
      )}
      {/* ── Header ─────────────────────────────────────────────────── */}


      <div className={styles.grid}>
        {/* ── Account Info Card ────────────────────────────────────── */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.cardIconWrap} style={{ background: 'rgba(29,155,240,0.12)', color: 'var(--primary-blue)' }}>
              <User size={18} />
            </div>
            <div>
              <h3 className={styles.cardTitle}>Thông tin tài khoản</h3>
              <p className={styles.cardSubtitle}>Họ tên, tên đăng nhập, ngày sinh.</p>
            </div>
          </div>

          <form onSubmit={handleSaveInfo} className={styles.form}>
            <div className={styles.formContent}>
              {/* Email - read-only */}
              <div className={`${styles.fieldGroup} ${styles.fullWidth}`}>
                <label className={styles.label}>
                  <AtSign size={14} /> Địa chỉ email 
                  <span className={styles.readOnlyBadge}>
                    <Lock size={10} /> Không thể thay đổi
                  </span>
                </label>
                <input
                  type="email"
                  className={`${styles.input} ${styles.inputReadOnly}`}
                  value={user?.email || ''}
                  readOnly
                  tabIndex={-1}
                />
              </div>

              {/* Full Name */}
              <div className={styles.fieldGroup}>
                <label className={styles.label} htmlFor="ap-fullname">
                  <UserCheck size={14} /> Họ và tên
                </label>
                <input
                  id="ap-fullname"
                  type="text"
                  className={styles.input}
                  value={accountInfo.fullName}
                  onChange={(e) => setAccountInfo(prev => ({ ...prev, fullName: e.target.value }))}
                  placeholder="Nhập họ và tên của bạn"
                />
              </div>

              {/* Username */}
              <div className={styles.fieldGroup}>
                <label className={styles.label} htmlFor="ap-username">
                  <AtSign size={14} /> Tên đăng nhập
                </label>
                <input
                  id="ap-username"
                  type="text"
                  className={styles.input}
                  value={accountInfo.userName}
                  onChange={(e) => setAccountInfo(prev => ({ ...prev, userName: e.target.value }))}
                  placeholder="Tên đăng nhập"
                />
              </div>

            {/* Date of Birth Picker (X / Twitter Style) */}
            <div className={`${styles.fieldGroup} ${styles.fullWidth}`}>
              <label className={styles.label}>
                <Calendar size={14} /> Ngày sinh
              </label>
              <div className={styles.dobPickerGrid}>
                {/* Day Select */}
                <CustomSelect
                  name="day"
                  value={dobParts.day}
                  onChange={(e) => handleDateChange('day', e.target.value)}
                  placeholder="Ngày"
                  options={availableDays}
                />

                {/* Month Select */}
                <CustomSelect
                  name="month"
                  value={dobParts.month}
                  onChange={(e) => handleDateChange('month', e.target.value)}
                  placeholder="Tháng"
                  options={availableMonths}
                />

                {/* Year Select */}
                <CustomSelect
                  name="year"
                  value={dobParts.year}
                  onChange={(e) => handleDateChange('year', e.target.value)}
                  placeholder="Năm"
                  options={availableYears}
                />
              </div>
            </div>

              {/* Feedback */}
              <div className={styles.fullWidth}>
                {infoSuccess && (
                  <div className={styles.successMsg}>
                    <CheckCircle size={15} /> {infoSuccess}
                  </div>
                )}
                {infoError && (
                  <div className={styles.errorMsg}>
                    <AlertCircle size={15} /> {infoError}
                  </div>
                )}
              </div>
            </div>

            <button type="submit" className={`${styles.saveBtn} ${styles.fullWidth}`} disabled={infoSaving}>
              {infoSaving
                ? <><Loader2 size={16} className={styles.spinner} /> Đang lưu...</>
                : <><Save size={16} /> Lưu thông tin</>
              }
            </button>
          </form>
        </div>

        {/* ── Change Password Card ─────────────────────────────────── */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.cardIconWrap} style={{ background: 'rgba(109,40,217,0.12)', color: '#7c3aed' }}>
              <Lock size={18} />
            </div>
            <div>
              <h3 className={styles.cardTitle}>Đổi mật khẩu</h3>
              <p className={styles.cardSubtitle}>Bạn sẽ được đăng xuất sau khi đổi thành công.</p>
            </div>
          </div>

          <form onSubmit={handleChangePassword} className={styles.form}>
            <div className={styles.formContent}>
              {/* Current password */}
              <div className={`${styles.fieldGroup} ${styles.fullWidth}`}>
                <label className={styles.label} htmlFor="ap-cur-pw">Mật khẩu hiện tại</label>
                <div className={styles.pwWrap}>
                  <input
                    id="ap-cur-pw"
                    type={showCurrentPw ? 'text' : 'password'}
                    className={styles.input}
                    value={pwForm.currentPassword}
                    onChange={(e) => setPwForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                    placeholder="Nhập mật khẩu hiện tại"
                    required
                  />
                  <button type="button" className={styles.eyeBtn} onClick={() => setShowCurrentPw(v => !v)}>
                    {showCurrentPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* New password */}
              <div className={`${styles.fieldGroup} ${styles.fullWidth}`}>
                <label className={styles.label} htmlFor="ap-new-pw">Mật khẩu mới</label>
                <div className={styles.pwWrap}>
                  <input
                    id="ap-new-pw"
                    type={showNewPw ? 'text' : 'password'}
                    className={styles.input}
                    value={pwForm.newPassword}
                    onChange={(e) => setPwForm(prev => ({ ...prev, newPassword: e.target.value }))}
                    placeholder="Tối thiểu 6 ký tự"
                    required
                  />
                  <button type="button" className={styles.eyeBtn} onClick={() => setShowNewPw(v => !v)}>
                    {showNewPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {/* Strength indicator */}
                {pwForm.newPassword && (
                  <div className={styles.strengthBar}>
                    <div
                      className={`${styles.strengthFill} ${pwForm.newPassword.length < 6 ? styles.weak :
                          pwForm.newPassword.length < 10 ? styles.medium :
                            styles.strong
                        }`}
                      style={{
                        width: pwForm.newPassword.length < 6 ? '33%' :
                          pwForm.newPassword.length < 10 ? '66%' : '100%'
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Confirm password */}
              <div className={`${styles.fieldGroup} ${styles.fullWidth}`}>
                <label className={styles.label} htmlFor="ap-confirm-pw">Xác nhận mật khẩu mới</label>
                <div className={styles.pwWrap}>
                  <input
                    id="ap-confirm-pw"
                    type={showConfirmPw ? 'text' : 'password'}
                    className={styles.input}
                    value={pwForm.confirmPassword}
                    onChange={(e) => setPwForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    placeholder="Nhập lại mật khẩu mới"
                    required
                  />
                  <button type="button" className={styles.eyeBtn} onClick={() => setShowConfirmPw(v => !v)}>
                    {showConfirmPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {pwForm.confirmPassword && pwForm.newPassword !== pwForm.confirmPassword && (
                  <span className={styles.matchHint}>Mật khẩu không khớp</span>
                )}
                {pwForm.confirmPassword && pwForm.newPassword === pwForm.confirmPassword && pwForm.confirmPassword.length > 0 && (
                  <span className={styles.matchHintOk}><CheckCircle size={12} /> Khớp</span>
                )}
              </div>

              {/* Feedback */}
              <div className={styles.fullWidth}>
                {pwSuccess && (
                  <div className={styles.successMsg}>
                    <CheckCircle size={15} /> {pwSuccess}
                  </div>
                )}
                {pwError && (
                  <div className={styles.errorMsg}>
                    <AlertCircle size={15} /> {pwError}
                  </div>
                )}
              </div>
            </div>

            <button
              type="submit"
              className={`${styles.saveBtn} ${styles.saveBtnPurple} ${styles.fullWidth}`}
              disabled={pwSaving || !pwForm.currentPassword || !pwForm.newPassword || !pwForm.confirmPassword}
            >
              {pwSaving
                ? <><Loader2 size={16} className={styles.spinner} /> Đang đổi...</>
                : <><Lock size={16} /> Đổi mật khẩu</>
              }
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
