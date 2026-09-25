import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiLock, FiAlertCircle, FiCheckCircle } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import AuthCard from '../components/auth/AuthCard';
import AuthInput from '../components/auth/AuthInput';

const ResetPassword = () => {
  const navigate = useNavigate();
  const { updatePassword } = useAuth();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      await updatePassword(password);
      setSuccess(true);
      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);
    } catch (err) {
      console.error('Update password error:', err);
      setError(err.message || 'Failed to update password. Link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard
      title="Set New Password"
      subtitle="Create a secure new password for your account"
    >
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

      {success && (
        <div
          className="alert alert-success d-flex align-items-center gap-2 py-2 px-3 rounded-3 small border-0 mb-3"
          style={{ backgroundColor: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0' }}
          role="alert"
        >
          <FiCheckCircle size={18} className="flex-shrink-0" />
          <span>Password updated successfully! Redirecting to Dashboard...</span>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <AuthInput
          id="newPassword"
          label="New Password"
          type="password"
          placeholder="Minimum 6 characters"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            if (error) setError('');
          }}
          leftIcon={FiLock}
          required
          autoComplete="new-password"
          disabled={loading || success}
          autoFocus
        />

        <AuthInput
          id="confirmNewPassword"
          label="Confirm New Password"
          type="password"
          placeholder="Re-enter your new password"
          value={confirmPassword}
          onChange={(e) => {
            setConfirmPassword(e.target.value);
            if (error) setError('');
          }}
          leftIcon={FiLock}
          required
          autoComplete="new-password"
          disabled={loading || success}
        />

        <button
          type="submit"
          className="btn btn-primary w-100 py-2 rounded-3 fw-semibold shadow-sm d-flex align-items-center justify-content-center gap-2 mt-3"
          style={{ minHeight: '46px', fontSize: '0.95rem' }}
          disabled={loading || success}
        >
          {loading ? (
            <>
              <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
              <span>Updating password...</span>
            </>
          ) : (
            <span>Update Password</span>
          )}
        </button>
      </form>

      <div className="text-center mt-3 pt-3 border-top border-light-subtle">
        <Link to="/login" className="text-muted small text-decoration-none fw-medium">
          Back to Login
        </Link>
      </div>
    </AuthCard>
  );
};

export default ResetPassword;
