import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MdLock, MdLockOpen, MdSecurity, MdKey, MdCheckCircle, MdErrorOutline, MdBackspace } from 'react-icons/md';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/logo.png';

const Login = () => {
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();
  const { verifyPasscode } = useAuth();

  const handlePasscodeSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!passcode) {
      setError('Please enter your passcode!');
      return;
    }

    setLoading(true);
    setError('');

    // Verify passcode
    const isCorrect = await verifyPasscode(passcode.trim());
    if (isCorrect) {
      setSuccess(true);
      setTimeout(() => {
        navigate('/');
      }, 500);
    } else {
      setError('❌ Incorrect Passcode! Access Denied.');
      setPasscode('');
      setLoading(false);
    }
  };

  const handleKeyClick = (val) => {
    if (passcode.length < 10) {
      setPasscode(prev => prev + val);
      setError('');
    }
  };

  const handleBackspace = () => {
    setPasscode(prev => prev.slice(0, -1));
    setError('');
  };

  const handleClear = () => {
    setPasscode('');
    setError('');
  };

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center py-5 px-3 position-relative overflow-hidden" style={{ backgroundColor: '#0f172a', fontFamily: "'Inter', sans-serif" }}>
      
      {/* Subtle Background Glow */}
      <div className="position-absolute top-50 start-50 translate-middle w-100 h-100 pointer-events-none" style={{ zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '20%', left: '50%', transform: 'translate(-50%, -50%)', width: '600px', height: '600px', background: 'radial-gradient(circle, rgba(13, 110, 253, 0.15) 0%, rgba(15, 23, 42, 0) 70%)', borderRadius: '50%' }}></div>
      </div>

      <div className="container position-relative" style={{ zIndex: 1, maxWidth: '420px' }}>
        
        {/* Brand Header */}
        <div className="text-center mb-4">
          <div className="d-inline-flex align-items-center justify-content-center bg-white bg-opacity-10 backdrop-blur rounded-4 p-3 mb-3 border border-light border-opacity-10 shadow-lg" style={{ width: '84px', height: '84px' }}>
            <img src={logo} alt="R Accountant" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <h3 className="fw-bold mb-1 text-white" style={{ letterSpacing: '-0.5px' }}>R Accountant</h3>
          <p className="text-slate-400 small mb-0" style={{ color: '#94a3b8' }}>Rahul</p>
        </div>

        {/* Lock Card */}
        <div className="card border-0 shadow-2xl rounded-4 p-4" style={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)' }}>
          <div className="card-body p-0 text-center">
            
            <div className="d-flex justify-content-center align-items-center gap-2 mb-3">
              {success ? (
                <MdLockOpen size={36} className="text-success animate-bounce" />
              ) : (
                <MdSecurity size={36} className="text-primary" />
              )}
            </div>

            <h5 className="fw-bold text-white mb-1">Enter Passcode</h5>
            <small className="text-slate-400 d-block mb-3" style={{ color: '#94a3b8', fontSize: '0.82rem' }}>
              Enter your secret security passcode to unlock system
            </small>

            {/* Error Message Alert */}
            {error && (
              <div className="alert border-0 py-2 px-3 mb-3 d-flex align-items-center justify-content-center gap-2" style={{ backgroundColor: '#450a0a', color: '#fca5a5', borderRadius: '10px', fontSize: '0.85rem' }}>
                <MdErrorOutline size={18} />
                <span>{error}</span>
              </div>
            )}

            {/* Success Alert */}
            {success && (
              <div className="alert border-0 py-2 px-3 mb-3 d-flex align-items-center justify-content-center gap-2" style={{ backgroundColor: '#064e3b', color: '#6ee7b7', borderRadius: '10px', fontSize: '0.85rem' }}>
                <MdCheckCircle size={18} />
                <span>✓ Passcode Verified! Unlocking...</span>
              </div>
            )}

            {/* Passcode Input Field Form */}
            <form onSubmit={handlePasscodeSubmit}>
              <div className="position-relative mb-4">
                <input
                  type="password"
                  className="form-control text-center fw-bold text-white letter-spacing-lg border-2 shadow-inner"
                  style={{
                    backgroundColor: '#0f172a',
                    borderColor: error ? '#ef4444' : success ? '#10b981' : '#334155',
                    fontSize: '1.75rem',
                    letterSpacing: '8px',
                    borderRadius: '14px',
                    height: '56px'
                  }}
                  placeholder="•••••"
                  value={passcode}
                  onChange={(e) => { setPasscode(e.target.value); setError(''); }}
                  maxLength={10}
                  autoFocus
                />
              </div>

              {/* Number Keypad (0-9) */}
              <div className="row g-2 mb-3">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
                  <div className="col-4" key={num}>
                    <button
                      type="button"
                      className="btn w-100 py-3 fw-bold text-white rounded-3 hover-lift border-0"
                      style={{ backgroundColor: '#334155', fontSize: '1.25rem', transition: 'all 0.15s ease' }}
                      onClick={() => handleKeyClick(num)}
                    >
                      {num}
                    </button>
                  </div>
                ))}
                <div className="col-4">
                  <button
                    type="button"
                    className="btn w-100 py-3 fw-semibold text-slate-400 rounded-3 border-0"
                    style={{ backgroundColor: '#0f172a', color: '#94a3b8', fontSize: '0.85rem' }}
                    onClick={handleClear}
                  >
                    Clear
                  </button>
                </div>
                <div className="col-4">
                  <button
                    type="button"
                    className="btn w-100 py-3 fw-bold text-white rounded-3 hover-lift border-0"
                    style={{ backgroundColor: '#334155', fontSize: '1.25rem', transition: 'all 0.15s ease' }}
                    onClick={() => handleKeyClick('0')}
                  >
                    0
                  </button>
                </div>
                <div className="col-4">
                  <button
                    type="button"
                    className="btn w-100 py-3 text-warning rounded-3 border-0"
                    style={{ backgroundColor: '#0f172a' }}
                    onClick={handleBackspace}
                    title="Backspace"
                  >
                    <MdBackspace size={22} />
                  </button>
                </div>
              </div>

              {/* Submit Unlock Button */}
              <button
                type="submit"
                className="btn btn-primary w-100 py-3 fw-bold rounded-3 shadow-lg d-flex align-items-center justify-content-center gap-2 hover-lift"
                style={{ background: 'linear-gradient(135deg, #0d6efd 0%, #0b5ed7 100%)', fontSize: '1.05rem' }}
                disabled={loading || success}
              >
                {loading ? (
                  <span className="spinner-border spinner-border-sm" role="status"></span>
                ) : (
                  <>
                    <MdKey size={20} />
                    <span>Unlock System</span>
                  </>
                )}
              </button>
            </form>

          </div>
        </div>

        <div className="text-center mt-4">
          <small style={{ color: '#64748b', fontSize: '0.78rem' }}>
            © 2026 R Accountant. Smart Financial &amp; Loan Management.
          </small>
        </div>

      </div>
    </div>
  );
};

export default Login;

