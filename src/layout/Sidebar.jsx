import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { 
    MdDashboard, MdPeople, MdPayment, 
    MdEvent, MdReceiptLong, MdBarChart, MdSettings, MdLogout,
    MdCompareArrows, MdAccountBalance
} from 'react-icons/md';
import { useAuth } from '../context/AuthContext';
import { loanStore } from '../utils/loanStore';
import logo from '../assets/logo.png';

const Sidebar = ({ closeMobileSidebar }) => {
  const { currentUser, userData, logout } = useAuth();
  const [settings, setSettings] = useState(loanStore.getSettings());

  useEffect(() => {
    const handleUpdate = () => setSettings(loanStore.getSettings());
    window.addEventListener('loanStoreUpdated', handleUpdate);
    return () => window.removeEventListener('loanStoreUpdated', handleUpdate);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (e) {
      console.error(e);
    }
  };

  const menuItems = [
    { name: 'Dashboard', path: '/', icon: <MdDashboard size={22} /> },
    { name: 'Bank Accounts', path: '/bank-accounts', icon: <MdAccountBalance size={22} /> },
    { name: 'Udhaar', path: '/udhaar', icon: <MdCompareArrows size={22} /> },
    { name: 'Daily Expenses', path: '/daily-expenses', icon: <MdReceiptLong size={22} /> },
    { name: 'Customers', path: '/customers', icon: <MdPeople size={22} /> },
    { name: 'Loans', path: '/loans', icon: <MdPayment size={22} /> },
    { name: 'EMI Payments', path: '/emi-payments', icon: <MdPayment size={22} /> },
    { name: 'Calendar', path: '/calendar', icon: <MdEvent size={22} /> },
    { name: 'Statements', path: '/statements', icon: <MdReceiptLong size={22} /> },
    { name: 'Reports', path: '/reports', icon: <MdBarChart size={22} /> },
    { name: 'Settings', path: '/settings', icon: <MdSettings size={22} /> },
  ];

  const brandName = settings.companyName || 'R Accountant';
  const ownerDisplayName = settings.ownerName || (userData?.firstName ? `${userData.firstName} ${userData.lastName || ''}`.trim() : 'Accountant');

  return (
    <div className="d-flex flex-column h-100 p-3 bg-white border-end shadow-sm" style={{ minHeight: '100vh' }}>
      <div className="d-flex align-items-center mb-4 mt-2 px-2">
        <div className="bg-primary bg-opacity-10 rounded-3 p-2 shadow-sm d-flex align-items-center justify-content-center" style={{ width: '42px', height: '42px' }}>
          <img src={settings.companyLogo || userData?.appLogo || logo} alt={brandName} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </div>
        <div className="ms-2 flex-grow-1 overflow-hidden">
          <h5 className="mb-0 fw-bold text-dark text-truncate" style={{ letterSpacing: '-0.5px', fontSize: '1.05rem' }}>{brandName}</h5>
          <small className="text-muted text-uppercase fw-semibold" style={{ fontSize: '0.62rem', letterSpacing: '0.5px' }}>{settings.companyTagline || 'Loans & Accounting'}</small>
        </div>

        <button className="btn btn-sm text-muted ms-auto d-lg-none" onClick={closeMobileSidebar}>✕</button>
      </div>

      <div className="flex-grow-1 overflow-auto">
        <ul className="nav nav-pills flex-column gap-1 mb-auto">
          {menuItems.map((item) => (
            <li className="nav-item" key={item.name}>
              <NavLink 
                to={item.path} 
                className={({ isActive }) => `nav-link d-flex align-items-center gap-3 px-3 py-2.5 rounded-3 fw-semibold transition-all ${
                  isActive ? 'bg-primary text-white shadow-sm' : 'text-secondary hover-bg-light'
                }`}
                onClick={closeMobileSidebar}
              >
                {item.icon}
                <span style={{ fontSize: '0.95rem' }}>{item.name}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-auto px-2 pb-2 pt-3 border-top">
        <div className="d-flex align-items-center mb-3">
          {userData?.profilePic || currentUser?.photoURL ? (
             <img src={userData?.profilePic || currentUser?.photoURL} alt="Profile" className="rounded-circle border border-2 border-primary" style={{width: 38, height: 38, objectFit: 'cover', flexShrink: 0}} />
          ) : (
            <div className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center fw-bold shadow-sm" style={{width: 38, height: 38, flexShrink: 0}}>
              {ownerDisplayName.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="ms-2.5 flex-grow-1 overflow-hidden">
            <h6 className="mb-0 text-truncate fw-bold text-dark" style={{ fontSize: '0.88rem' }}>{ownerDisplayName}</h6>
            <small className="text-muted text-truncate d-block" style={{ fontSize: '0.72rem' }}>Owner / Admin</small>
          </div>
        </div>
        <button className="btn btn-outline-danger btn-sm w-100 d-flex align-items-center justify-content-center gap-2 rounded-3 py-2 fw-semibold" onClick={handleLogout}>
          <MdLogout size={18} /> Logout
        </button>
      </div>
    </div>
  );
};

export default Sidebar;

