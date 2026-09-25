import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { MdInfoOutline, MdChevronRight, MdCheckCircleOutline } from 'react-icons/md';

const ConfigNotice = () => {
  const { isConfigured } = useAuth();
  const [expanded, setExpanded] = useState(false);

  if (isConfigured) {
    return (
      <div
        className="d-flex align-items-center justify-content-between px-3 py-2 mb-3 rounded-3"
        style={{ backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', fontSize: '0.82rem', color: '#065f46' }}
      >
        <span className="d-flex align-items-center gap-2">
          <MdCheckCircleOutline size={16} className="text-success" />
          <span>Connected to Supabase Backend</span>
        </span>
        <span className="badge bg-success-subtle text-success border border-success-subtle">Live</span>
      </div>
    );
  }

  return (
    <div
      className="mb-3 rounded-3 overflow-hidden"
      style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', fontSize: '0.84rem' }}
    >
      <div
        className="p-3 d-flex align-items-start gap-2 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
        style={{ cursor: 'pointer' }}
      >
        <MdInfoOutline size={18} className="text-primary flex-shrink-0 mt-0.5" />
        <div className="flex-grow-1">
          <div className="fw-semibold text-primary d-flex align-items-center justify-content-between">
            <span>⚡ Supabase Setup Quick Notice</span>
            <span className="badge bg-primary-subtle text-primary border border-primary-subtle">
              Demo Active
            </span>
          </div>
          <p className="text-secondary mb-1 mt-1" style={{ fontSize: '0.8rem', lineHeight: '1.4' }}>
            The app is fully functional with live demo simulation! Add your Supabase credentials to{' '}
            <code className="bg-white px-1 rounded border">.env</code> to connect your real Supabase cloud.
          </p>
          <div className="text-primary fw-medium small d-flex align-items-center gap-1">
            <span>{expanded ? 'Hide setup steps' : 'View 3-step setup guide'}</span>
            <MdChevronRight
              size={16}
              style={{ transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}
            />
          </div>
        </div>
      </div>

      {expanded && (
        <div className="px-3 pb-3 pt-1 border-top border-primary-subtle bg-white text-secondary" style={{ fontSize: '0.78rem' }}>
          <ol className="ps-3 mb-2 text-start">
            <li className="mb-1">
              Create a free project at <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-primary fw-semibold">supabase.com</a>.
            </li>
            <li className="mb-1">
              Run <code className="bg-light px-1 py-0.5 rounded text-dark">supabase/schema.sql</code> in the Supabase SQL Editor.
            </li>
            <li className="mb-1">
              Copy <strong>Project URL</strong> and <strong>Anon Key</strong> into your local <code className="bg-light px-1 py-0.5 rounded text-dark">.env</code> file.
            </li>
          </ol>
          <p className="mb-0 text-muted fst-italic">
            Tip: You can test Login, Registration, and OTP immediately right now in this preview!
          </p>
        </div>
      )}
    </div>
  );
};

export default ConfigNotice;
