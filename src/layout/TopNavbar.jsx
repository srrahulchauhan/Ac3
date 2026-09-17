import React, { useState, useEffect, useRef } from 'react';
import { MdMenu, MdSearch, MdDownload, MdPerson, MdLogout } from 'react-icons/md';
import { useNavigate, useLocation } from 'react-router-dom';
import NotificationBell from '../components/NotificationBell';
import { useAuth } from '../context/AuthContext';
import { loanStore } from '../utils/loanStore';
import logo from '../assets/logo.png';

const routeTitles = {
  '/': 'Dashboard Overview',
  '/daily-expenses': 'Daily Expense Tracker',
  '/customers': 'Customer Management',
  '/loans': 'Loan Management',
  '/emi-payments': 'EMI Payments & Collections',
  '/calendar': 'Calendar & Due Schedules',
  '/statements': 'Account Statements',
  '/reports': 'Reports & Analytics',
  '/settings': 'System Settings & Configuration',
};


const TopNavbar = ({ toggleSidebar }) => {
  const { currentUser, userData, logout } = useAuth();
  const user = userData || {};
  const navigate = useNavigate();
  const location = useLocation();

  const [settings, setSettings] = useState(loanStore.getSettings());

  const currentTitle = routeTitles[location.pathname] || 'R Accountant Dashboard';

  // Smart Search States
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef(null);

  const [customers, setCustomers] = useState([]);
  const [loans, setLoans] = useState([]);
  const [payments, setPayments] = useState([]);

  const loadSearchData = () => {
    setCustomers(loanStore.getCustomers());
    setLoans(loanStore.getLoans());
    setPayments(loanStore.getPayments());
    setSettings(loanStore.getSettings());
  };

  useEffect(() => {
    loadSearchData();
    window.addEventListener('loanStoreUpdated', loadSearchData);
    return () => window.removeEventListener('loanStoreUpdated', loadSearchData);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    if (query.trim().length > 0) {
      const q = query.toLowerCase();
      const matchedCust = customers.filter(
        (c) => c.name.toLowerCase().includes(q) || (c.phone && c.phone.includes(q)) || (c.id && c.id.toLowerCase().includes(q))
      ).map((c) => ({ type: 'Customer', title: c.name, subtitle: c.id + ' • ' + (c.phone || ''), path: '/customers' }));

      const matchedLoans = loans.filter(
        (l) => l.loanName.toLowerCase().includes(q) || l.customerName.toLowerCase().includes(q) || (l.id && l.id.toLowerCase().includes(q))
      ).map((l) => ({ type: 'Loan', title: l.loanName, subtitle: l.customerName + ' • ₹' + Number(l.totalAmount).toLocaleString('en-IN'), path: '/loans' }));

      const matchedPayments = payments.filter(
        (p) => p.customerName.toLowerCase().includes(q) || p.loanName.toLowerCase().includes(q) || (p.id && p.id.toLowerCase().includes(q))
      ).map((p) => ({ type: 'Payment', title: p.customerName + ' (' + p.status + ')', subtitle: p.loanName + ' • ₹' + Number(p.amount).toLocaleString('en-IN'), path: '/emi-payments' }));

      const results = [...matchedCust, ...matchedLoans, ...matchedPayments].slice(0, 6);
      setSearchResults(results);
      setShowDropdown(true);
    } else {
      setShowDropdown(false);
    }
  };

  const handleResultClick = (item) => {
    setShowDropdown(false);
    setSearchQuery('');
    navigate(item.path);
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const ownerDisplayName = settings.ownerName || (user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'Accountant');
  const brandName = settings.companyName || 'R Accountant';

  return (
    <nav className="navbar navbar-expand bg-white border-bottom sticky-top px-3 py-2 justify-content-between shadow-sm" style={{ zIndex: 1030 }}>
      {/* Left: Hamburger (mobile), Logo & Company Name, Page Title */}
      <div className="d-flex align-items-center gap-3">
        <button className="btn btn-light rounded-3 p-1.5 d-lg-none" onClick={toggleSidebar} title="Toggle Navigation Sidebar">
          <MdMenu size={24} />
        </button>

        <div className="d-flex align-items-center gap-2">
          <div className="bg-primary bg-opacity-10 rounded-3 p-1.5 d-flex align-items-center justify-content-center" style={{ width: '38px', height: '38px' }}>
            <img src={settings.companyLogo || user.appLogo || logo} alt={brandName} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <div>
            <h5 className="mb-0 fw-bold text-dark d-flex align-items-center gap-2" style={{ letterSpacing: '-0.3px', fontSize: '1.05rem' }}>
              <span>{brandName}</span>
              <span className="text-muted fw-normal d-none d-sm-inline" style={{ fontSize: '0.85rem' }}>| {currentTitle}</span>
            </h5>
            <small className="text-muted d-none d-sm-block" style={{ fontSize: '0.7rem' }}>{settings.companyTagline || 'Rahul'}</small>
          </div>
        </div>

      </div>

      {/* Center: Global Search Bar */}
      <div className="d-none d-md-block flex-grow-1 mx-4" style={{ maxWidth: '420px' }} ref={searchRef}>
        <div className="input-group bg-light rounded-pill border px-2 py-1 shadow-2xs">
          <span className="input-group-text bg-transparent border-0 pe-1">
            <MdSearch size={20} className="text-muted" />
          </span>
          <input
            type="text"
            className="form-control bg-transparent border-0 shadow-none ps-1 text-dark"
            placeholder="Global Search (Customers, Loans, EMI Payments)..."
            style={{ fontSize: '0.88rem' }}
            value={searchQuery}
            onChange={handleSearchChange}
          />
        </div>

        {/* Search Results Dropdown */}
        {showDropdown && (
          <div className="position-absolute bg-white rounded-3 shadow-lg border mt-1 w-100 overflow-hidden z-3" style={{ maxWidth: '420px' }}>
            {searchResults.length === 0 ? (
              <div className="p-3 text-muted text-center small">No records found matching "{searchQuery}"</div>
            ) : (
              <div className="list-group list-group-flush">
                {searchResults.map((res, idx) => (
                  <button
                    key={idx}
                    className="list-group-item list-group-item-action d-flex justify-content-between align-items-center py-2 px-3 border-0"
                    onClick={() => handleResultClick(res)}
                  >
                    <div>
                      <div className="fw-semibold text-dark small">{res.title}</div>
                      <small className="text-muted" style={{ fontSize: '0.72rem' }}>{res.subtitle}</small>
                    </div>
                    <span className={`badge ${
                      res.type === 'Customer' ? 'bg-primary' : res.type === 'Loan' ? 'bg-success' : 'bg-warning text-dark'
                    } bg-opacity-10 text-${res.type === 'Customer' ? 'primary' : res.type === 'Loan' ? 'success' : 'dark'} rounded-pill`} style={{ fontSize: '0.65rem' }}>
                      {res.type}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right: Controls, Notification Bell, User Profile */}
      <div className="d-flex align-items-center gap-2">

        {/* JSON Backup Button */}
        <button
          className="btn btn-light btn-sm rounded-circle p-2 text-success shadow-2xs border d-none d-sm-flex"
          title="Backup JSON Data"
          onClick={() => loanStore.exportBackup()}
        >
          <MdDownload size={20} />
        </button>

        {/* Notification Bell */}
        <NotificationBell payments={payments} />

        {/* User Profile Dropdown */}
        <div className="dropdown ms-1">
          <button
            className="btn btn-link p-0 dropdown-toggle text-decoration-none d-flex align-items-center gap-2"
            type="button"
            id="profileDropdown"
            data-bs-toggle="dropdown"
            aria-expanded="false"
          >
            <img
              src={user.profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(ownerDisplayName)}&background=0d6efd&color=fff`}
              alt="Profile"
              className="rounded-circle border border-2 border-primary shadow-2xs"
              width="36"
              height="36"
              style={{ objectFit: 'cover' }}
            />
            <div className="d-none d-md-block text-start" style={{ lineHeight: 1.2 }}>
              <span className="fw-bold text-dark d-block small">{ownerDisplayName}</span>
              <small className="text-muted" style={{ fontSize: '0.68rem' }}>Owner / Admin</small>
            </div>
          </button>

          <ul className="dropdown-menu dropdown-menu-end shadow-lg border-0 rounded-3 mt-2" aria-labelledby="profileDropdown">
            <li className="px-3 py-2 border-bottom">
              <span className="fw-bold text-dark d-block">{ownerDisplayName}</span>
              <small className="text-muted">{settings.email || currentUser?.email || 'admin@raccountant.com'}</small>
            </li>
            <li>
              <button className="dropdown-item py-2 d-flex align-items-center gap-2 text-secondary" onClick={() => navigate('/settings')}>
                <MdPerson size={18} /> Settings &amp; Profile
              </button>
            </li>
            <li>
              <hr className="dropdown-divider opacity-10 my-1" />
            </li>
            <li>
              <button className="dropdown-item py-2 text-danger fw-semibold d-flex align-items-center gap-2" onClick={handleLogout}>
                <MdLogout size={18} /> Logout
              </button>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  );
};

export default TopNavbar;
