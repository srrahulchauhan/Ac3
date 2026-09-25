import React, { useRef, useEffect } from 'react';

const OtpInput = ({ length = 6, value = '', onChange, disabled = false }) => {
  const inputRefs = useRef([]);

  // Ensure refs array has right size
  useEffect(() => {
    inputRefs.current = inputRefs.current.slice(0, length);
    // Autofocus first input on mount
    if (inputRefs.current[0] && !disabled) {
      inputRefs.current[0].focus();
    }
  }, [length, disabled]);

  const otpArray = value.padEnd(length, ' ').slice(0, length).split('');

  const handleChange = (index, e) => {
    const char = e.target.value.replace(/\D/g, '').slice(-1);
    const newOtp = otpArray.map((c, i) => (i === index ? (char || ' ') : c));
    const combined = newOtp.join('').trimEnd();
    onChange(combined);

    if (char && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (!otpArray[index] || otpArray[index] === ' ') {
        if (index > 0) {
          inputRefs.current[index - 1]?.focus();
        }
      } else {
        const newOtp = otpArray.map((c, i) => (i === index ? ' ' : c));
        onChange(newOtp.join('').trimEnd());
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    if (pastedData) {
      onChange(pastedData);
      const nextIndex = Math.min(pastedData.length, length - 1);
      inputRefs.current[nextIndex]?.focus();
    }
  };

  return (
    <div className="d-flex justify-content-center gap-2 my-3" onPaste={handlePaste}>
      {Array.from({ length }, (_, index) => {
        const val = otpArray[index] && otpArray[index] !== ' ' ? otpArray[index] : '';
        return (
          <input
            key={index}
            ref={(el) => (inputRefs.current[index] = el)}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={1}
            value={val}
            disabled={disabled}
            onChange={(e) => handleChange(index, e)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            className="form-control text-center fw-bold shadow-sm"
            style={{
              width: '48px',
              height: '56px',
              fontSize: '1.4rem',
              borderRadius: '12px',
              borderColor: val ? '#0d6efd' : '#dee2e6',
              backgroundColor: val ? '#f0f7ff' : '#ffffff',
              transition: 'all 0.15s ease',
            }}
          />
        );
      })}
    </div>
  );
};

export default OtpInput;
