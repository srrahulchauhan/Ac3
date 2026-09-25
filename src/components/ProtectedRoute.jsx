import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { currentUser, loading } = useAuth();
  const location = useLocation();

  // Show clean loading spinner while verifying authentication session
  if (loading) {
    return (
      <div
        className="min-vh-100 d-flex flex-column align-items-center justify-content-center"
        style={{ backgroundColor: '#f8fafc' }}
      >
        <div
          className="spinner-border text-primary mb-3"
          style={{ width: '2.5rem', height: '2.5rem' }}
          role="status"
        >
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="text-muted fw-medium small mb-0">Verifying secure authentication...</p>
      </div>
    );
  }

  // If not authenticated, redirect to /login and preserve destination
  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

export default ProtectedRoute;
