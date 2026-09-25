import React from 'react';
import logo from '../../assets/logo.png';
const AuthCard = ({ title, subtitle, children, showNotice = true, maxWidth = '440px' }) => {
  return (
    <div
      className="min-vh-100 d-flex flex-column align-items-center justify-content-center py-5 px-3 position-relative"
      style={{
        backgroundColor: '#f8fafc',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      {/* Subtle modern background gradient orbs */}
      <div
        className="position-fixed pointer-events-none"
        style={{
          top: '-100px',
          right: '-100px',
          width: '450px',
          height: '450px',
          background: 'radial-gradient(circle, rgba(13, 110, 253, 0.08) 0%, rgba(248, 250, 252, 0) 70%)',
          borderRadius: '50%',
          zIndex: 0,
        }}
      />
      <div
        className="position-fixed pointer-events-none"
        style={{
          bottom: '-100px',
          left: '-100px',
          width: '450px',
          height: '450px',
          background: 'radial-gradient(circle, rgba(16, 185, 129, 0.06) 0%, rgba(248, 250, 252, 0) 70%)',
          borderRadius: '50%',
          zIndex: 0,
        }}
      />

      <div className="container position-relative" style={{ zIndex: 1, maxWidth }}>
        {/* Brand Header */}
        <div className="text-center mb-4">
          <div
            className="d-inline-flex align-items-center justify-content-center bg-white rounded-4 p-2 mb-3 shadow-sm border"
            style={{ width: '68px', height: '68px' }}
          >
            <img src={logo} alt="Auth App Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <h3 className="fw-bold text-dark mb-1" style={{ letterSpacing: '-0.5px' }}>
            {title}
          </h3>
          {subtitle && (
            <p className="text-muted small mb-0" style={{ fontSize: '0.9rem' }}>
              {subtitle}
            </p>
          )}
        </div>

        {/* Configuration notice removed */}
        {/* Auth Card */}
        <div
          className="card border-0 rounded-4 shadow-sm p-4 p-md-4"
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid rgba(226, 232, 240, 0.8)',
            boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.06), 0 8px 10px -6px rgba(15, 23, 42, 0.04)',
          }}
        >
          <div className="card-body p-0">{children}</div>
        </div>

        {/* Footer info */}
        <div className="text-center mt-4">
          <p className="text-muted mb-0" style={{ fontSize: '0.8rem' }}>
            🔒 Protected by Firebase Auth
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthCard;
