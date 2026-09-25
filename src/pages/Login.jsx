import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiMail, FiLock, FiAlertCircle, FiCheckCircle, FiPhone } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import AuthCard from '../components/auth/AuthCard';
import AuthInput from '../components/auth/AuthInput';
import GoogleButton from '../components/auth/GoogleButton';

const Login = () => {
  const navigate = useNavigate();
  const { login, loginWithGoogle } = useAuth();

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // UI status states
  const [errors, setErrors] = useState({});
  const [generalError, setGeneralError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Validate form fields
  const validateForm = () => {
    const newErrors = {};

    // 1. Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      newErrors.email = 'Email address is required';
    } else if (!emailRegex.test(email.trim())) {
      newErrors.email = 'Please enter a valid email address';
    }

    // 2. Password validation
    if (!password) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Submit Login
  const handleSubmit = async (e) => {
    e.preventDefault();
    setGeneralError('');
    setSuccessMessage('');

    if (!validateForm()) return;

    setLoading(true);

    try {
      await login(email.trim(), password);
      setSuccessMessage('Login successful! Redirecting to Dashboard...');
      setTimeout(() => {
        navigate('/dashboard');
      }, 800);
    } catch (err) {
      console.error('Login error:', err);
      // Supabase standard error message formatting
      if (err.message?.includes('Invalid login credentials')) {
        setGeneralError('Invalid email or password. Please verify your credentials or register.');
      } else if (err.message?.includes('Email not confirmed')) {
        setGeneralError('Your email has not been confirmed yet. Please check your inbox for the confirmation link.');
      } else {
        setGeneralError(err.message || 'Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Google OAuth Login
  const handleGoogleLogin = async () => {
    setGeneralError('');
    setGoogleLoading(true);

    try {
      await loginWithGoogle();
      // On live OAuth, browser redirects to Google. On demo mode, redirects to dashboard.
      setTimeout(() => {
        navigate('/dashboard');
      }, 1000);
    } catch (err) {
      console.error('Google login error:', err);
      setGeneralError(err.message || 'Google authentication failed. Please try again.');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <AuthCard
      title="Welcome Back"
      subtitle="Sign in to your account with email, Google, or Phone OTP"
    >
      {/* General Error Alert */}
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

      {/* Google OAuth Button */}
      <div className="mb-3">
        <GoogleButton
          onClick={handleGoogleLogin}
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
          or sign in with email
        </span>
      </div>

      {/* Email / Password Form */}
      <form onSubmit={handleSubmit} noValidate>
        {/* Email Field */}
        <AuthInput
          id="email"
          label="Gmail / Email Address"
          type="email"
          placeholder="name@gmail.com"
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
          autoFocus
        />

        {/* Password Field */}
        <div className="position-relative">
          <AuthInput
            id="password"
            label="Password"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (errors.password) setErrors({ ...errors, password: null });
            }}
            error={errors.password}
            leftIcon={FiLock}
            required
            autoComplete="current-password"
            disabled={loading || googleLoading}
          />
        </div>

        {/* Forgot Password Link */}
        <div className="d-flex justify-content-end mb-3 mt-n1">
          <Link
            to="/forgot-password"
            className="text-primary small text-decoration-none fw-medium"
            style={{ fontSize: '0.85rem' }}
          >
            Forgot Password?
          </Link>
        </div>

        {/* Login Button */}
        <button
          type="submit"
          className="btn btn-primary w-100 py-2 rounded-3 fw-semibold shadow-sm d-flex align-items-center justify-content-center gap-2"
          style={{ minHeight: '46px', fontSize: '0.95rem' }}
          disabled={loading || googleLoading}
        >
          {loading ? (
            <>
              <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
              <span>Signing in...</span>
            </>
          ) : (
            <span>Login</span>
          )}
        </button>
      </form>

      {/* Phone / SMS OTP Option Button */}
      <div className="text-center mt-3 pt-2">
        <Link
          to="/phone-login"
          className="btn btn-outline-secondary w-100 py-2 rounded-3 d-flex align-items-center justify-content-center gap-2 small fw-medium border-secondary-subtle"
          style={{ minHeight: '42px', fontSize: '0.88rem', color: '#475569' }}
        >
          <FiPhone size={16} />
          <span>Sign in with Phone (SMS OTP)</span>
        </Link>
      </div>

      {/* Registration Navigation Link */}
      <div className="text-center mt-3 pt-3 border-top border-light-subtle">
        <p className="text-muted small mb-0">
          Don't have an account?{' '}
          <Link to="/register" className="text-primary fw-semibold text-decoration-none">
            Register
          </Link>
        </p>
      </div>
    </AuthCard>
  );
};

export default Login;
