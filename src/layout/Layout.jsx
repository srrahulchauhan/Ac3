import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import TopNavbar from './TopNavbar';
import Sidebar from './Sidebar';
import ScrollArrows from '../components/ScrollArrows';
import FloatingActionButton from '../components/FloatingActionButton';
import { loanStore } from '../utils/loanStore';

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [settings, setSettings] = useState(loanStore.getSettings());

  useEffect(() => {
    const handleUpdate = () => setSettings(loanStore.getSettings());
    window.addEventListener('loanStoreUpdated', handleUpdate);
    return () => window.removeEventListener('loanStoreUpdated', handleUpdate);
  }, []);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 992);
      if (window.innerWidth < 992) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="d-flex" style={{ minHeight: '100vh', backgroundColor: 'var(--bg-light)' }}>
      {/* Sidebar Overlay for Mobile */}
      {isMobile && sidebarOpen && (
        <div
          className="position-fixed w-100 h-100"
          style={{ background: 'rgba(0,0,0,0.5)', zIndex: 1040 }}
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* Sidebar */}
      <div
        className={`position-fixed h-100 glass-panel overflow-auto transition-all`}
        style={{
          width: 'var(--sidebar-width)',
          zIndex: 1045,
          left: sidebarOpen ? 0 : 'calc(-1 * var(--sidebar-width))',
          borderRight: '1px solid var(--border-color)',
          transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
        }}
      >
        <Sidebar closeMobileSidebar={() => isMobile && setSidebarOpen(false)} />
      </div>

      {/* Main Content Area */}
      <div
        className="flex-grow-1 d-flex flex-column"
        style={{
          marginLeft: !isMobile && sidebarOpen ? 'var(--sidebar-width)' : 0,
          transition: 'margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          height: '100vh',
          overflow: 'hidden',
        }}
      >
        <TopNavbar toggleSidebar={toggleSidebar} />

        <div
          className="flex-grow-1 position-relative d-flex flex-column justify-content-between"
          style={{ overflowY: 'auto', overflowX: 'hidden' }}
        >
          <div className="flex-grow-1">
            <Outlet />
          </div>

          <footer className="py-2.5 px-4 bg-white border-top text-center text-muted small" style={{ fontSize: '0.78rem' }}>
            <span>© 2026 {settings.companyName || 'R Accountant'}. Managed by {settings.ownerName || 'Accountant'}.</span>
          </footer>

          <ScrollArrows />
          <FloatingActionButton />
        </div>
      </div>
    </div>
  );
};

export default Layout;
