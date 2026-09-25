import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiUser, FiMail, FiLock, FiAlertCircle, FiCheckCircle } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import AuthCard from '../components/auth/AuthCard';
import AuthInput from '../components/auth/AuthInput';
import GoogleButton from '../components/auth/GoogleButton';

const Register = () => {
  const navigate = useNavigate();
  const { register, loginWithGoogle } = useAuth();

  // Form states
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // UI status states
  const [errors, setErrors] = useState({});
  const [generalError, setGeneralError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Validate form fields
  const validateForm = () => {
    const newErrors = {};

    // 1. Full name validation
    if (!fullName.trim()) {
      newErrors.fullName = 'Full Name is required';
    } else if (fullName.trim().length < 2) {
      newErrors.fullName = 'Full Name must be at least 2 characters';
    }

    // 2. Email validation (RFC standard regex)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      newErrors.email = 'Email address is required';
    } else if (!emailRegex.test(email.trim())) {
      newErrors.email = 'Please enter a valid email address (e.g. name@gmail.com)';
    }

    // 3. Password validation (min 6 characters)
    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters long';
    }

    // 4. Confirm password validation
    if (!confirmPassword) {
      newErrors.confirmPassword = 'Confirm Password is required';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Submit Registration
  const handleSubmit = async (e) => {
    e.preventDefault();
    setGeneralError('');
    setSuccessMessage('');

    if (!validateForm()) return;

    setLoading(true);

    try {
      const result = await register(email.trim(), password, fullName.trim());

      // If user requires email confirmation (Supabase default without auto-confirm)
      if (result?.user && !result?.session) {
        setSuccessMessage(
          'Account created successfully! Please check your email inbox to verify your account.'
        );
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } else {
        // Immediate login
        setSuccessMessage('Account created successfully! Redirecting to Dashboard...');
        setTimeout(() => {
          navigate('/dashboard');
        }, 1200);
      }
    } catch (err) {
      console.error('Registration error:', err);
      setGeneralError(err.message || 'Failed to create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Google OAuth Login
  const handleGoogleSignup = async () => {
    setGeneralError('');
    setGoogleLoading(true);

    try {
      await loginWithGoogle();
      // On live OAuth, browser redirects to Google. On demo mode, redirects to dashboard.
      setTimeout(() => {
        navigate('/dashboard');
      }, 1000);
    } catch (err) {
      console.error('Google signup error:', err);
      setGeneralError(err.message || 'Google authentication failed. Please try again.');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <AuthCard
      title="Create Account"
      subtitle="Join to access your secure dashboard & management tools"
    >
      {/* General Error Message */}
      {generalError && (
        <div
          className="alert alert-danger d-flex align-items-center gap-2 py-2 px-3 rounded-3 small border-0 mb-3"
          style={{ backgroundColor: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca' }}
          role="alert"
        >
          <FiAlertCircle size={18} className="flex-shrink-0" />
          <span>{generalError}</span>
        </div>
      )}

      {/* Success Notification */}
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

      {/* Google Sign-in Option */}
      <div className="mb-3">
        <GoogleButton
          onClick={handleGoogleSignup}
          loading={googleLoading}
          text="Continue with Google"
        />
      </div>

      {/* Modern Divider */}
      <div className="position-relative text-center my-3">
        <hr className="border-secondary-subtle my-0" />
        <span
          className="position-absolute top-50 start-50 translate-middle bg-white px-3 text-muted small fw-medium"
          style={{ fontSize: '0.8rem' }}
        >
          or register with email
        </span>
      </div>

      {/* Registration Form */}
      <form onSubmit={handleSubmit} noValidate>
        {/* Full Name */}
        <AuthInput
          id="fullName"
          label="Full Name"
          type="text"
          placeholder="e.g. John Doe"
          value={fullName}
          onChange={(e) => {
            setFullName(e.target.value);
            if (errors.fullName) setErrors({ ...errors, fullName: null });
          }}
          error={errors.fullName}
          leftIcon={FiUser}
          required
          autoComplete="name"
          disabled={loading || googleLoading}
        />

        {/* Gmail / Email */}
        <AuthInput
          id="email"
          label="Gmail / Email Address"
          type="email"
          placeholder="e.g. name@gmail.com"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (errors.email) setErrors({ ...errors, email: null });
          }}
          error={errors.email}
          leftIcon={FiMail}
          required
          autoComplete="email"
          disabled={loading || googleLoading}
        />

        {/* Password */}
        <AuthInput
          id="password"
          label="Password"
          type="password"
          placeholder="Minimum 6 characters"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            if (errors.password) setErrors({ ...errors, password: null });
          }}
          error={errors.password}
          leftIcon={FiLock}
          required
          autoComplete="new-password"
          disabled={loading || googleLoading}
        />

        {/* Confirm Password */}
        <AuthInput
          id="confirmPassword"
          label="Confirm Password"
          type="password"
          placeholder="Re-enter your password"
          value={confirmPassword}
          onChange={(e) => {
            setConfirmPassword(e.target.value);
            if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: null });
          }}
          error={errors.confirmPassword}
          leftIcon={FiLock}
          required
          autoComplete="new-password"
          disabled={loading || googleLoading}
        />

        {/* Create Account Submit Button */}
        <button
          type="submit"
          className="btn btn-primary w-100 py-2 rounded-3 fw-semibold shadow-sm mt-2 d-flex align-items-center justify-content-center gap-2"
          style={{ minHeight: '46px', fontSize: '0.95rem' }}
          disabled={loading || googleLoading}
        >
          {loading ? (
            <>
              <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
              <span>Creating Account...</span>
            </>
          ) : (
            <span>Create Account</span>
          )}
        </button>
      </form>

      {/* Alternative Phone / SMS Option Link */}
      <div className="text-center mt-3 pt-2">
        <Link
          to="/phone-login"
          className="text-decoration-none small text-muted hover-underline"
          style={{ fontSize: '0.86rem' }}
        >
          Prefer to sign in with <span className="text-primary fw-medium">Phone SMS OTP</span>?
        </Link>
      </div>

      {/* Login Navigation Link */}
      <div className="text-center mt-3 pt-3 border-top border-light-subtle">
        <p className="text-muted small mb-0">
          Already have an account?{' '}
          <Link to="/login" className="text-primary fw-semibold text-decoration-none">
            Login
          </Link>
        </p>
      </div>
    </AuthCard>
  );
};

export default Register;
