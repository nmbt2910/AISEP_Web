import React, { useState } from 'react';
import { Eye, EyeOff, Loader, ChevronLeft } from 'lucide-react';
import styles from './RegistrationUnique.module.css';
import authService from '../../services/authService';
import TermsModal from '../common/TermsModal';
import { ShieldCheck } from 'lucide-react';

/**
 * StartupRegisterForm - Simplified credential collection
 * Only collects: Full Name, Email, Password
 */
function StartupRegisterForm({ onBack, onComplete, termsData, onFetchTerms }) {
  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    isTermsAccepted: false,
  });

  const [showTermsModal, setShowTermsModal] = useState(false);

  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Validation
  const validateForm = () => {
    const newErrors = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Vui lòng nhập họ và tên.';
    }
    if (!formData.username.trim()) {
      newErrors.username = 'Vui lòng nhập tên người dùng.';
    } else if (formData.username.length < 3) {
      newErrors.username = 'Tên người dùng phải có ít nhất 3 ký tự.';
    } else if (!/^[a-zA-Z0-9]+$/.test(formData.username)) {
      newErrors.username = 'Tên người dùng chỉ được chứa chữ cái và số.';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Vui lòng nhập địa chỉ email.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Định dạng email không hợp lệ.';
    }

    if (!formData.password) {
      newErrors.password = 'Vui lòng nhập mật khẩu.';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Mật khẩu phải có ít nhất 8 ký tự.';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Vui lòng xác nhận mật khẩu.';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Mật khẩu xác nhận không khớp.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);

    try {
      const response = await authService.register({
        email: formData.email,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
        fullName: formData.fullName,
        username: formData.username,
        role: 0, // UserRole.Startup = 0
        isTermsAccepted: formData.isTermsAccepted,
        termsVersion: termsData?.version
      });

      // apiClient interceptor returns the ApiResponse wrapper: { success, message, data }
      if (response.success) {
        onComplete && onComplete({ ...formData, role: 'Startup' });
      } else {
        setErrors((prev) => ({ ...prev, submit: response.message || 'Đăng ký thất bại. Vui lòng thử lại.' }));
      }
    } catch (error) {
       const backendMsg = error.message || 'Không thể kết nối đến máy chủ. Vui lòng thử lại sau.';
       setErrors((prev) => ({ ...prev, submit: backendMsg }));
    } finally {
      setIsLoading(false);
    }
  };

  const isFormValid =
    formData.fullName.trim() &&
    formData.username.trim() &&
    formData.email.trim() &&
    formData.password.length >= 8 &&
    formData.password === formData.confirmPassword &&
    formData.isTermsAccepted;

  return (
    <div className={styles.reg_formCard}>
      {/* Header */}
      <div className={styles.reg_cardHeader}>
        <div className={styles.reg_progressBar}>
          <div className={styles.reg_progressFill} style={{ width: '100%' }} />
        </div>
        <p className={styles.reg_stepIndicator}>Tạo tài khoản</p>
      </div>

      {/* Body */}
      <div className={styles.reg_cardBody}>
        <div className={styles.reg_stepContainer}>
          <div>
            <h2 className={styles.reg_stepTitle}>Chào mừng đến với AISEP</h2>
            <p className={styles.reg_stepSubtitle}>Đăng ký với tư cách Nhà sáng lập / Startup</p>
          </div>

          <form onSubmit={handleSubmit} className={styles.reg_Form}>
            {/* Full Name */}
            <div className={styles.reg_formGroup} style={{ marginBottom: '16px' }}>
              <label htmlFor="fullName" className={styles.reg_label}>
                Họ và tên <span className={styles.reg_required}>*</span>
              </label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                value={formData.fullName}
                onChange={handleInputChange}
                className={`${styles.reg_input} ${errors.fullName ? styles.reg_inputError : ''}`}
                placeholder="Nhập họ và tên của bạn"
                disabled={isLoading}
              />
              {errors.fullName && <p className={styles.reg_errorText}>{errors.fullName}</p>}
            </div>

            {/* Username */}
            <div className={styles.reg_formGroup} style={{ marginBottom: '16px' }}>
              <label htmlFor="username" className={styles.reg_label}>
                Tên người dùng <span className={styles.reg_required}>*</span>
              </label>
              <input
                id="username"
                name="username"
                type="text"
                value={formData.username}
                onChange={handleInputChange}
                className={`${styles.reg_input} ${errors.username ? styles.reg_inputError : ''}`}
                placeholder="Nhập tên người dùng của bạn"
                disabled={isLoading}
              />
              {errors.username && <p className={styles.reg_errorText}>{errors.username}</p>}
            </div>

            {/* Email */}
            <div className={styles.reg_formGroup} style={{ marginBottom: '16px' }}>
              <label htmlFor="email" className={styles.reg_label}>
                Địa chỉ Email <span className={styles.reg_required}>*</span>
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                className={`${styles.reg_input} ${errors.email ? styles.reg_inputError : ''}`}
                placeholder="you@example.com"
                disabled={isLoading}
              />
              {errors.email && <p className={styles.reg_errorText}>{errors.email}</p>}
            </div>

            {/* Password */}
            <div className={styles.reg_formGroup} style={{ marginBottom: '16px' }}>
              <label htmlFor="password" className={styles.reg_label}>
                Mật khẩu <span className={styles.reg_required}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={handleInputChange}
                  className={`${styles.reg_input} ${errors.password ? styles.reg_inputError : ''}`}
                  placeholder="Tối thiểu 8 ký tự"
                  disabled={isLoading}
                  style={{ paddingRight: '48px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    padding: '8px',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {errors.password && <p className={styles.reg_errorText}>{errors.password}</p>}
            </div>

            {/* Confirm Password */}
            <div className={styles.reg_formGroup} style={{ marginBottom: '16px' }}>
              <label htmlFor="confirmPassword" className={styles.reg_label}>
                Xác nhận mật khẩu <span className={styles.reg_required}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className={`${styles.reg_input} ${errors.confirmPassword ? styles.reg_inputError : ''}`}
                  placeholder="Nhập lại mật khẩu"
                  disabled={isLoading}
                  style={{ paddingRight: '48px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    padding: '8px',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {errors.confirmPassword && <p className={styles.reg_errorText}>{errors.confirmPassword}</p>}
            </div>

            {/* Terms and Conditions */}
            <div className={styles.reg_formGroup} style={{ marginBottom: '24px' }}>
              <div className={styles.reg_checkboxWrapper}>
                <input
                  id="isTermsAccepted"
                  name="isTermsAccepted"
                  type="checkbox"
                  checked={formData.isTermsAccepted}
                  onChange={(e) => setFormData(prev => ({ ...prev, isTermsAccepted: e.target.checked }))}
                  className={styles.reg_checkbox}
                  disabled={isLoading}
                />
                <label htmlFor="isTermsAccepted" className={styles.reg_checkboxLabel}>
                  Tôi đồng ý với <button 
                    type="button" 
                    onClick={(e) => {
                      e.preventDefault();
                      onFetchTerms && onFetchTerms();
                      setShowTermsModal(true);
                    }}
                    style={{ background: 'none', border: 'none', color: 'var(--primary-blue)', padding: 0, font: 'inherit', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    Điều khoản sử dụng
                  </button>
                  <span className={styles.reg_required}> *</span>
                </label>
              </div>
            </div>

            {/* Submit Error */}
            {errors.submit && (
              <div className={styles.reg_submitError}>
                {errors.submit}
              </div>
            )}
          </form>
        </div>
      </div>

      {/* Footer */}
      <div className={styles.reg_cardFooter}>
        <button onClick={onBack} className={styles.reg_secondaryButton} disabled={isLoading}>
          <ChevronLeft size={20} /> Quay lại
        </button>
        <button
          onClick={handleSubmit}
          className={styles.reg_primaryButton}
          disabled={!isFormValid || isLoading}
        >
          {isLoading ? (
            <>
              <Loader size={20} style={{ animation: 'spin 1s linear infinite' }} />
              Đang tạo tài khoản...
            </>
          ) : (
            'Tạo tài khoản'
          )}
        </button>
      </div>

      <TermsModal 
        isOpen={showTermsModal} 
        onClose={() => setShowTermsModal(false)}
        termsContent={termsData?.content}
        termsVersion={termsData?.version}
        error={termsData?.error}
        isLoading={termsData?.isLoading}
      />
    </div>
  );
}

export default StartupRegisterForm;