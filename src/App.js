import './App.css';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useContext, useEffect } from 'react';
import { AuthContext, AuthProvider } from './context/AuthContext';
import { NotifyProvider } from './context/NotifyContext';
import { refreshPushSubscriptionIfGranted } from './utils/push';

import ProtectedRoute from './components/ProtectedRoute';

import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import Login from './pages/Login';
import Payments from './pages/Payments';
import Withdrawals from './pages/Withdrawals';
import Gifts from './pages/Gifts';
import Transfers from './pages/Transfers';
import Announcements from './pages/Announcements';
import MinesGame from './pages/MinesGame';
import BlackJack from './pages/BlackJack';
import Security from './pages/Security';
import UsdtDeposits from './pages/UsdtDeposits';
import TrxDeposits from './pages/TrxDeposits';
import CryptoPayments from './pages/CryptoPayments';
import AdminManagement from './pages/AdminManagement';
import DatabaseBackup from './pages/DatabaseBackup';
import DepositConfig from './pages/DepositConfig';

function AppRoutes() {
  const { user } = useContext(AuthContext);

  useEffect(() => {
    if (user) refreshPushSubscriptionIfGranted().catch(err => console.error('[push] refresh failed:', err.message));
  }, [user]);

  return (
    <Routes>
      {/* Public: redirect to dashboard if already logged in */}
      <Route
        path="/login"
        element={user ? <Navigate to="/" replace /> : <Login />}
      />

      {/* Protected routes */}
      <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/users" element={<ProtectedRoute><Users /></ProtectedRoute>} />
      <Route path="/payments" element={<ProtectedRoute><Payments /></ProtectedRoute>} />
      <Route path="/withdrawals" element={<ProtectedRoute><Withdrawals /></ProtectedRoute>} />
      <Route path="/gifts" element={<ProtectedRoute><Gifts /></ProtectedRoute>} />
      <Route path="/transactions" element={<ProtectedRoute><Transfers /></ProtectedRoute>} />
      <Route path="/announcements" element={<ProtectedRoute><Announcements /></ProtectedRoute>} />
      <Route path="/game/mines" element={<ProtectedRoute><MinesGame /></ProtectedRoute>} />
      <Route path="/game/blackjack" element={<ProtectedRoute><BlackJack /></ProtectedRoute>} />
      <Route path="/security" element={<ProtectedRoute><Security /></ProtectedRoute>} />
      <Route path="/usdt-deposits"    element={<ProtectedRoute requireRole="super_admin"><UsdtDeposits /></ProtectedRoute>} />
      <Route path="/trx-deposits"     element={<ProtectedRoute requireRole="super_admin"><TrxDeposits /></ProtectedRoute>} />
      <Route path="/crypto-payments"  element={<ProtectedRoute><CryptoPayments /></ProtectedRoute>} />
      <Route path="/admin-management" element={<ProtectedRoute requireRole="super_admin"><AdminManagement /></ProtectedRoute>} />
      <Route path="/db-backup"        element={<ProtectedRoute requireRole="super_admin"><DatabaseBackup /></ProtectedRoute>} />
      <Route path="/deposit-config"   element={<ProtectedRoute requireRole="super_admin"><DepositConfig /></ProtectedRoute>} />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <NotifyProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </NotifyProvider>
    </AuthProvider>
  );
}

export default App;
