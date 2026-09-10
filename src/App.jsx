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
import Login from './pages/Login';

import { useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  const { currentUser } = useAuth();

  return (
    <Routes>
      {/* Auth Passcode Route */}
      <Route path="/login" element={!currentUser ? <Login /> : <Navigate to="/" replace />} />

      {/* Protected Main Application Routes */}
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
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

        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default App;



