import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { FiLogOut, FiUser, FiMail, FiPhone, FiCheck, FiEdit2, FiShield } from 'react-icons/fi';
import { FcGoogle } from 'react-icons/fc';

const UserProfileCard = () => {
  const navigate = useNavigate();
  const { currentUser, profile, logout, updateProfile, isConfigured } = useAuth();

  const [isEditing, setIsEditing] = useState(false);
  const [nameInput, setNameInput] = useState(profile?.full_name || currentUser?.user_metadata?.full_name || '');
  const [phoneInput, setPhoneInput] = useState(profile?.phone || currentUser?.phone || '');
  const [saveLoading, setSaveLoading] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  // Extract user details
  const email = profile?.email || currentUser?.email || 'user@example.com';
  const fullName = profile?.full_name || currentUser?.user_metadata?.full_name || currentUser?.user_metadata?.name || email.split('@')[0] || 'User';
  const phone = profile?.phone || currentUser?.phone || '';
  const avatarUrl = profile?.avatar_url || currentUser?.user_metadata?.avatar_url || currentUser?.user_metadata?.picture || '';
  const userId = currentUser?.id || 'demo-user-id';

  // Determine auth provider
  const provider = currentUser?.app_metadata?.provider ||
    (currentUser?.user_metadata?.avatar_url?.includes('google') ? 'google' : 'email');

  const handleLogout = async () => {
    if (window.confirm('Are you sure you want to log out of your session?')) {
      await logout();
      navigate('/login');
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaveLoading(true);
    try {
      await updateProfile({
        full_name: nameInput.trim(),
        phone: phoneInput.trim(),
      });
      setIsEditing(false);
    } catch (err) {
      alert('Failed to update profile: ' + (err.message || 'Error'));
    } finally {
      setSaveLoading(false);
    }
  };

  const copyUserId = () => {
    navigator.clipboard.writeText(userId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  // Generate fallback avatar initials
  const initials = fullName
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'U';

  return (
    <div
      className="card border-0 shadow-sm rounded-4 p-3 mb-4 bg-white"
      style={{
        border: '1px solid #e2e8f0',
        background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
      }}
    >
      <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3">
        {/* User Identity Column */}
        <div className="d-flex align-items-center gap-3">
          {/* Avatar with Status Dot */}
          <div className="position-relative flex-shrink-0">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={fullName}
                className="rounded-circle shadow-sm border border-2 border-white"
                style={{ width: '56px', height: '56px', objectFit: 'cover' }}
                referrerPolicy="no-referrer"
              />
            ) : (
              <div
                className="rounded-circle shadow-sm d-flex align-items-center justify-content-center fw-bold text-white"
                style={{
                  width: '56px',
                  height: '56px',
                  background: 'linear-gradient(135deg, #0d6efd 0%, #0640a3 100%)',
                  fontSize: '1.25rem',
                  letterSpacing: '1px',
                }}
              >
                {initials}
              </div>
            )}
            {/* Active Status Pulse Indicator */}
            <span
              className="position-absolute bottom-0 end-0 p-1 bg-success border border-white rounded-circle"
              style={{ width: '14px', height: '14px' }}
              title="Active Authenticated Session"
            >
              <span className="visually-hidden">Active</span>
            </span>
          </div>

          {/* User Details */}
          <div>
            <div className="d-flex flex-wrap align-items-center gap-2">
              <h5 className="fw-bold text-dark mb-0">{fullName}</h5>

              {/* Provider Badge */}
              {provider === 'google' ? (
                <span className="badge bg-white text-secondary border shadow-xs d-inline-flex align-items-center gap-1 py-1 px-2 rounded-pill small">
                  <FcGoogle size={14} />
                  <span>Google Account</span>
                </span>
              ) : provider === 'phone' ? (
                <span className="badge bg-info-subtle text-info-emphasis border border-info-subtle d-inline-flex align-items-center gap-1 py-1 px-2 rounded-pill small">
                  <FiPhone size={13} />
                  <span>Phone Verified</span>
                </span>
              ) : (
                <span className="badge bg-primary-subtle text-primary border border-primary-subtle d-inline-flex align-items-center gap-1 py-1 px-2 rounded-pill small">
                  <FiShield size={13} />
                  <span>Supabase Auth</span>
                </span>
              )}

              {/* Connection Status Badge */}
              <span
                className="badge rounded-pill small"
                style={{
                  backgroundColor: '#ecfdf5',
                  color: '#047857',
                  border: '1px solid #a7f3d0',
                }}
              >
                ● Active Session
              </span>
            </div>

            {/* Email & Phone info */}
            <div className="d-flex flex-wrap align-items-center gap-3 mt-1 text-muted small">
              <span className="d-inline-flex align-items-center gap-1">
                <FiMail size={13} className="text-secondary" />
                <span>{email}</span>
              </span>

              {phone && (
                <span className="d-inline-flex align-items-center gap-1">
                  <FiPhone size={13} className="text-secondary" />
                  <span>{phone}</span>
                </span>
              )}

              <span
                className="d-inline-flex align-items-center gap-1 cursor-pointer text-decoration-none text-muted"
                style={{ cursor: 'pointer' }}
                onClick={copyUserId}
                title="Click to copy User ID"
              >
                <span>ID: {userId.substring(0, 8)}...</span>
                {copiedId ? <FiCheck size={12} className="text-success" /> : null}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons: Edit Profile & Logout */}
        <div className="d-flex align-items-center gap-2 align-self-end align-self-md-center">
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm rounded-3 d-inline-flex align-items-center gap-1.5 px-3 py-2 fw-medium border-secondary-subtle"
            style={{ fontSize: '0.85rem' }}
            onClick={() => {
              setNameInput(fullName);
              setPhoneInput(phone);
              setIsEditing(!isEditing);
            }}
          >
            <FiEdit2 size={14} />
            <span>{isEditing ? 'Cancel' : 'Edit Profile'}</span>
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className="btn btn-outline-danger btn-sm rounded-3 d-inline-flex align-items-center gap-1.5 px-3 py-2 fw-medium shadow-2xs hover-lift"
            style={{ fontSize: '0.85rem' }}
            title="Sign out of your account"
          >
            <FiLogOut size={14} />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Edit Profile Quick Form */}
      {isEditing && (
        <form onSubmit={handleSaveProfile} className="mt-3 pt-3 border-top border-light-subtle">
          <div className="row g-2 align-items-end">
            <div className="col-12 col-md-5">
              <label className="form-label small text-muted mb-1">Full Name</label>
              <div className="input-group input-group-sm">
                <span className="input-group-text bg-light border-secondary-subtle">
                  <FiUser size={14} />
                </span>
                <input
                  type="text"
                  className="form-control border-secondary-subtle"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="Your Full Name"
                  required
                />
              </div>
            </div>

            <div className="col-12 col-md-5">
              <label className="form-label small text-muted mb-1">Phone Number</label>
              <div className="input-group input-group-sm">
                <span className="input-group-text bg-light border-secondary-subtle">
                  <FiPhone size={14} />
                </span>
                <input
                  type="tel"
                  className="form-control border-secondary-subtle"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  placeholder="+91 9876543210"
                />
              </div>
            </div>

            <div className="col-12 col-md-2">
              <button
                type="submit"
                className="btn btn-primary btn-sm w-100 rounded-3 d-flex align-items-center justify-content-center gap-1"
                disabled={saveLoading}
              >
                {saveLoading ? (
                  <span className="spinner-border spinner-border-sm" role="status" />
                ) : (
                  <>
                    <FiCheck size={14} />
                    <span>Save</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
};

export default UserProfileCard;
