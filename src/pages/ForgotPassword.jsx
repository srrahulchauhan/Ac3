import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FiMail, FiAlertCircle, FiCheckCircle, FiArrowLeft } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import AuthCard from '../components/auth/AuthCard';
import AuthInput from '../components/auth/AuthInput';

const ForgotPassword = () => {
  const { resetPassword } = useAuth();

  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email.trim())) {
      setError('Please provide a valid email address.');
      return;
    }

    setLoading(true);

    try {
      await resetPassword(email.trim());
      setSuccess(true);
    } catch (err) {
      console.error('Password reset request error:', err);
      setError(err.message || 'Unable to send password reset link. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard
      title="Reset Password"
      subtitle="Enter your email to receive a password recovery link"
    >
      {/* Error alert */}
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

      {/* Success alert */}
      {success ? (
        <div className="text-center py-3">
          <div
            className="d-inline-flex align-items-center justify-content-center rounded-circle bg-success-subtle text-success p-3 mb-3"
            style={{ width: '64px', height: '64px' }}
          >
            <FiCheckCircle size={32} />
          </div>
          <h5 className="fw-bold mb-2">Check your email</h5>
          <p className="text-muted small mb-4">
            We've sent a password reset link to <strong>{email}</strong>. Click the link in that email to create a new password.
          </p>
          <Link
            to="/login"
            className="btn btn-outline-primary w-100 py-2 rounded-3 fw-medium d-inline-flex align-items-center justify-content-center gap-2"
          >
            <FiArrowLeft size={16} />
            <span>Return to Login</span>
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate>
          <AuthInput
            id="email"
            label="Registered Email Address"
            type="email"
            placeholder="e.g. name@gmail.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (error) setError('');
            }}
            leftIcon={FiMail}
            required
            autoComplete="email"
            disabled={loading}
            autoFocus
          />

          <button
            type="submit"
            className="btn btn-primary w-100 py-2 rounded-3 fw-semibold shadow-sm d-flex align-items-center justify-content-center gap-2 mt-3"
            style={{ minHeight: '46px', fontSize: '0.95rem' }}
            disabled={loading || !email.trim()}
          >
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                <span>Sending link...</span>
              </>
            ) : (
              <span>Send Reset Link</span>
            )}
          </button>

          <div className="text-center mt-3 pt-3 border-top border-light-subtle">
            <Link
              to="/login"
              className="text-muted small text-decoration-none d-inline-flex align-items-center gap-1 fw-medium"
            >
              <FiArrowLeft size={14} />
              <span>Back to Login</span>
            </Link>
          </div>
        </form>
      )}
    </AuthCard>
  );
};

export default ForgotPassword;
