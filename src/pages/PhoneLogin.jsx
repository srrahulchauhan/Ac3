import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiPhone, FiLock, FiAlertCircle, FiCheckCircle, FiArrowLeft, FiRefreshCw } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import AuthCard from '../components/auth/AuthCard';
import OtpInput from '../components/auth/OtpInput';

const PhoneLogin = () => {
  const navigate = useNavigate();
  const { sendPhoneOtp, verifyPhoneOtp } = useAuth();

  // Step 1 = Enter Phone Number, Step 2 = Enter 6-digit OTP
  const [step, setStep] = useState(1);

  // Form states
  const [countryCode, setCountryCode] = useState('+91');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');

  // Timer states for resend
  const [countdown, setCountdown] = useState(60);
  const [isTimerActive, setIsTimerActive] = useState(false);

  // Status & feedback
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Countdown effect
  useEffect(() => {
    let timer = null;
    if (isTimerActive && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    } else if (countdown === 0) {
      setIsTimerActive(false);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isTimerActive, countdown]);

  // Full E.164 phone string
  const fullPhone = `${countryCode}${phoneNumber.replace(/\D/g, '')}`;

  // Step 1: Send OTP to Phone
  const handleSendOtp = async (e) => {
    if (e) e.preventDefault();
    setError('');
    setSuccessMessage('');

    const cleanNum = phoneNumber.replace(/\D/g, '');
    if (!cleanNum || cleanNum.length < 7 || cleanNum.length > 15) {
      setError('Please enter a valid phone number (7-15 digits).');
      return;
    }

    setLoading(true);

    try {
      await sendPhoneOtp(fullPhone);
      setSuccessMessage(`A 6-digit verification code was sent to ${fullPhone}`);
      setStep(2);
      setCountdown(60);
      setIsTimerActive(true);
    } catch (err) {
      console.error('Send OTP error:', err);
      setError(err.message || 'Failed to send OTP. Please check the number and try again.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Resend OTP
  const handleResendOtp = async () => {
    if (isTimerActive) return;
    setError('');
    setSuccessMessage('');
    setLoading(true);

    try {
      await sendPhoneOtp(fullPhone);
      setSuccessMessage(`New code sent to ${fullPhone}!`);
      setCountdown(60);
      setIsTimerActive(true);
      setOtp('');
    } catch (err) {
      console.error('Resend OTP error:', err);
      setError(err.message || 'Failed to resend code.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async (e) => {
    if (e) e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (otp.length !== 6) {
      setError('Please enter the full 6-digit verification code.');
      return;
    }

    setLoading(true);

    try {
      await verifyPhoneOtp(fullPhone, otp);
      setSuccessMessage('Phone verified successfully! Redirecting...');
      setTimeout(() => {
        navigate('/dashboard');
      }, 900);
    } catch (err) {
      console.error('Verify OTP error:', err);
      setError(err.message || 'Invalid or expired OTP code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard
      title={step === 1 ? 'Phone SMS Login' : 'Enter Verification Code'}
      subtitle={
        step === 1
          ? 'Enter your mobile number to receive a 6-digit verification OTP'
          : `We sent a 6-digit code to ${fullPhone}`
      }
    >
      {/* Error Alert */}
      {error && (
        <div
          className="alert alert-danger d-flex align-items-center gap-2 py-2 px-3 rounded-3 small border-0 mb-3"
          style={{ backgroundColor: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca' }}
          role="alert"
        >
          <FiAlertCircle size={18} className="flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Success Alert */}
      {successMessage && (
        <div
          className="alert alert-success d-flex align-items-center gap-2 py-2 px-3 rounded-3 small border-0 mb-3"
          style={{ backgroundColor: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0' }}
          role="alert"
        >
          <FiCheckCircle size={18} className="flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* STEP 1: PHONE NUMBER INPUT */}
      {step === 1 && (
        <form onSubmit={handleSendOtp}>
          <div className="mb-4">
            <label className="form-label fw-semibold text-secondary small mb-1">
              Mobile Phone Number <span className="text-danger">*</span>
            </label>
            <div className="input-group">
              {/* Country Code Selector */}
              <select
                className="form-select border-secondary-subtle rounded-start-3"
                style={{ maxWidth: '105px', backgroundColor: '#f8fafc', fontSize: '0.9rem' }}
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                disabled={loading}
              >
                <option value="+91">🇮🇳 +91</option>
                <option value="+1">🇺🇸 +1</option>
                <option value="+44">🇬🇧 +44</option>
                <option value="+61">🇦🇺 +61</option>
                <option value="+971">🇦🇪 +971</option>
                <option value="+65">🇸🇬 +65</option>
                <option value="+49">🇩🇪 +49</option>
              </select>

              {/* Phone Digits Input */}
              <input
                type="tel"
                className="form-control border-secondary-subtle rounded-end-3 py-2 ps-3"
                style={{ minHeight: '46px', fontSize: '0.95rem' }}
                placeholder="9876543210"
                value={phoneNumber}
                onChange={(e) => {
                  setPhoneNumber(e.target.value);
                  if (error) setError('');
                }}
                required
                autoFocus
                disabled={loading}
              />
            </div>
            <div className="form-text text-muted small mt-1" style={{ fontSize: '0.8rem' }}>
              Standard SMS rates may apply. A 6-digit code will be generated.
            </div>
          </div>

          {/* Send OTP Button */}
          <div id="recaptcha-container"></div>
          <button
            type="submit"
            className="btn btn-primary w-100 py-2 rounded-3 fw-semibold shadow-sm d-flex align-items-center justify-content-center gap-2"
            style={{ minHeight: '46px', fontSize: '0.95rem' }}
            disabled={loading || !phoneNumber.trim()}
          >
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                <span>Sending OTP...</span>
              </>
            ) : (
              <>
                <FiPhone size={18} />
                <span>Send OTP via SMS</span>
              </>
            )}
          </button>
        </form>
      )}

      {/* STEP 2: 6-DIGIT OTP VERIFICATION SCREEN */}
      {step === 2 && (
        <form onSubmit={handleVerifyOtp}>
          {/* OTP Digit Boxes */}
          <OtpInput
            length={6}
            value={otp}
            onChange={(val) => {
              setOtp(val);
              if (error) setError('');
              // Auto-submit if all 6 digits entered
              if (val.length === 6) {
                // slight delay for visual delight
                setTimeout(() => {
                  const submitBtn = document.getElementById('verify-otp-btn');
                  if (submitBtn) submitBtn.click();
                }, 100);
              }
            }}
            disabled={loading}
          />

          <div className="text-center my-3">
            {isTimerActive ? (
              <span className="text-muted small">
                Resend code in <strong className="text-primary">{countdown}s</strong>
              </span>
            ) : (
              <button
                type="button"
                className="btn btn-link text-primary small text-decoration-none p-0 d-inline-flex align-items-center gap-1 fw-semibold"
                onClick={handleResendOtp}
                disabled={loading}
              >
                <FiRefreshCw size={14} />
                <span>Resend OTP</span>
              </button>
            )}
          </div>

          {/* Verify Button */}
          <button
            id="verify-otp-btn"
            type="submit"
            className="btn btn-primary w-100 py-2 rounded-3 fw-semibold shadow-sm d-flex align-items-center justify-content-center gap-2 mb-3"
            style={{ minHeight: '46px', fontSize: '0.95rem' }}
            disabled={loading || otp.length !== 6}
          >
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                <span>Verifying...</span>
              </>
            ) : (
              <>
                <FiLock size={18} />
                <span>Verify & Login</span>
              </>
            )}
          </button>

          {/* Change Phone Number */}
          <div className="text-center">
            <button
              type="button"
              className="btn btn-link text-muted small text-decoration-none p-0"
              onClick={() => {
                setStep(1);
                setOtp('');
                setError('');
                setSuccessMessage('');
              }}
              disabled={loading}
            >
              ← Edit Phone Number
            </button>
          </div>
        </form>
      )}

      {/* Back to Email Login */}
      <div className="text-center mt-3 pt-3 border-top border-light-subtle">
        <Link
          to="/login"
          className="text-muted small text-decoration-none d-inline-flex align-items-center gap-1 fw-medium"
        >
          <FiArrowLeft size={14} />
          <span>Back to Email Login</span>
        </Link>
      </div>
    </AuthCard>
  );
};

export default PhoneLogin;
