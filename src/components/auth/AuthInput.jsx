import React, { useState } from 'react';
import { FiEye, FiEyeOff } from 'react-icons/fi';

const AuthInput = ({
  label,
  id,
  type = 'text',
  placeholder,
  value,
  onChange,
  error,
  leftIcon: LeftIcon,
  required = false,
  autoComplete,
  disabled = false,
  autoFocus = false,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const isPasswordField = type === 'password';
  const inputType = isPasswordField ? (showPassword ? 'text' : 'password') : type;

  return (
    <div className="mb-3 text-start">
      {label && (
        <label htmlFor={id} className="form-label fw-semibold text-secondary small mb-1">
          {label} {required && <span className="text-danger">*</span>}
        </label>
      )}

      <div className="position-relative">
        {LeftIcon && (
          <div
            className="position-absolute top-50 start-0 translate-middle-y ps-3 d-flex align-items-center pointer-events-none text-muted"
            style={{ zIndex: 4, pointerEvents: 'none' }}
          >
            <LeftIcon size={18} />
          </div>
        )}

        <input
          id={id}
          type={inputType}
          className={`form-control rounded-3 py-2 ${LeftIcon ? 'ps-5' : 'ps-3'} ${
            isPasswordField ? 'pe-5' : 'pe-3'
          } ${error ? 'is-invalid border-danger' : 'border-secondary-subtle'}`}
          style={{
            minHeight: '46px',
            fontSize: '0.95rem',
            backgroundColor: '#ffffff',
            transition: 'border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out',
          }}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          required={required}
          autoComplete={autoComplete}
          disabled={disabled}
          autoFocus={autoFocus}
        />

        {isPasswordField && (
          <button
            type="button"
            className="btn btn-link position-absolute top-50 end-0 translate-middle-y pe-3 text-muted text-decoration-none d-flex align-items-center"
            style={{ zIndex: 5, padding: 0 }}
            onClick={() => setShowPassword(!showPassword)}
            tabIndex={-1}
            title={showPassword ? 'Hide password' : 'Show password'}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <FiEyeOff size={19} /> : <FiEye size={19} />}
          </button>
        )}
      </div>

      {error && (
        <div className="text-danger small mt-1 d-flex align-items-center gap-1">
          <span style={{ fontSize: '0.82rem' }}>{error}</span>
        </div>
      )}
    </div>
  );
};

export default AuthInput;
