import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './layout/Layout';
import Dashboard from './pages/Dashboard';
import BankAccounts from './pages/BankAccounts';
import DailyExpenses from './pages/DailyExpenses';
import Customers from './pages/Customers';
import Loans from './pages/Loans';
import EmiPayments from './pages/EmiPayments';
import Statements from './pages/Statements';
import Reports from './pages/Reports';
import CalendarView from './pages/CalendarView';
import Settings from './pages/Settings';
import UdhaarAccount from './pages/UdhaarAccount';

// Authentication Pages
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import PhoneLogin from './pages/PhoneLogin';

import { useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  const { currentUser } = useAuth();

  return (
    <Routes>
      {/* Public Authentication Routes */}
      <Route
        path="/login"
        element={!currentUser ? <Login /> : <Navigate to="/dashboard" replace />}
      />
      <Route
        path="/register"
        element={!currentUser ? <Register /> : <Navigate to="/dashboard" replace />}
      />
      <Route
        path="/forgot-password"
        element={!currentUser ? <ForgotPassword /> : <Navigate to="/dashboard" replace />}
      />
      <Route
        path="/reset-password"
        element={<ResetPassword />}
      />
      <Route
        path="/phone-login"
        element={!currentUser ? <PhoneLogin /> : <Navigate to="/dashboard" replace />}
      />

      {/* Protected Application Routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="bank-accounts" element={<BankAccounts />} />
        <Route path="daily-expenses" element={<DailyExpenses />} />
        <Route path="udhaar" element={<UdhaarAccount />} />
        <Route path="customers" element={<Customers />} />
        <Route path="loans" element={<Loans />} />
        <Route path="emi-payments" element={<EmiPayments />} />
        <Route path="calendar" element={<CalendarView />} />
        <Route path="statements" element={<Statements />} />
        <Route path="reports" element={<Reports />} />
        <Route path="settings" element={<Settings />} />

        {/* Fallback route */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
}

export default App;
