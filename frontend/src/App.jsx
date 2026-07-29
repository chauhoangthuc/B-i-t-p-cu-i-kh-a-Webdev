import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { TripProvider } from './context/TripContext.jsx';
import LoginPage from './features/auth/LoginPage.jsx';
import RegisterPage from './features/auth/RegisterPage.jsx';
import ForgotPasswordPage from './features/auth/ForgotPasswordPage.jsx';
import DashboardPage from './features/dashboard/DashboardPage.jsx';
import TripsPage from './features/trips/TripsPage.jsx';
import CalendarPage from './features/calendar/CalendarPage.jsx';
import ExpensesPage from './features/expenses/ExpensesPage.jsx';
import ProfilePage from './features/auth/ProfilePage.jsx';
import EditProfilePage from './features/auth/EditProfilePage.jsx';
import EditTripPage from './features/trips/EditTripPage.jsx';
import TripDetailPage from './features/trips/TripDetailPage.jsx';
import StatisticsPage from './features/dashboard/StatisticsPage.jsx';

import { LanguageProvider } from './context/LanguageContext.jsx';
import MainLayout from './components/layout/MainLayout.jsx';

function ProtectedRoute({ children }) {
  const { session, loading } = useAuth();
  if (loading) return <div className="p-8 text-center">Đang kiểm tra phiên đăng nhập...</div>;
  if (!session) return <Navigate to="/login" replace />;
  return <MainLayout>{children}</MainLayout>;
}

export default function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <TripProvider>
          <Router>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />

            {/* Protected Routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/trips"
              element={
                <ProtectedRoute>
                  <TripsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/calendar"
              element={
                <ProtectedRoute>
                  <CalendarPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/expenses"
              element={
                <ProtectedRoute>
                  <ExpensesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/edit-profile"
              element={
                <ProtectedRoute>
                  <EditProfilePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/edit-trip/:tripId"
              element={
                <ProtectedRoute>
                  <EditTripPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/trips/:tripId"
              element={
                <ProtectedRoute>
                  <TripDetailPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/statistics"
              element={
                <ProtectedRoute>
                  <StatisticsPage />
                </ProtectedRoute>
              }
            />

            {/* Redirects */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Router>
      </TripProvider>
      </LanguageProvider>
    </AuthProvider>
  );
}
