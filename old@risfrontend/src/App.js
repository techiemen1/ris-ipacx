import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import AdminPanel from './pages/AdminPanel';
import RadiologistPanel from './pages/RadiologistPanel';
import TechnicianPanel from './pages/TechnicianPanel';
import DoctorPanel from './pages/DoctorPanel';
import StaffPanel from './pages/StaffPanel';
import NotFound from './pages/NotFound';
import ProtectedRoute from './utils/ProtectedRoute';
import ManageUsers from './pages/ManageUsers';
import AuditLogs from './pages/AuditLogs';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import UserProfileViewer from './pages/UserProfileViewer';
import AuditViewer from './pages/AuditViewer';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import 'bootstrap/dist/css/bootstrap.min.css';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function AppRoutes() {
  const token = localStorage.getItem('token');

  return (
    <>
      <ToastContainer />
      <Routes>
        <Route path="/" element={<Navigate to={token ? "/dashboard" : "/login"} replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />

        <Route path="/dashboard" element={
          <ProtectedRoute allowedRole={['admin', 'radiologist', 'technologist', 'doctor', 'staff']}>
            <Dashboard />
          </ProtectedRoute>
        } />
        <Route path="/admin" element={
          <ProtectedRoute allowedRole="admin">
            <AdminPanel />
          </ProtectedRoute>
        } />
        <Route path="/radiologist" element={
          <ProtectedRoute allowedRole="radiologist">
            <RadiologistPanel />
          </ProtectedRoute>
        } />
        <Route path="/technologist" element={
          <ProtectedRoute allowedRole="technologist">
            <TechnicianPanel />
          </ProtectedRoute>
        } />
        <Route path="/doctor" element={
          <ProtectedRoute allowedRole="doctor">
            <DoctorPanel />
          </ProtectedRoute>
        } />
        <Route path="/staff" element={
          <ProtectedRoute allowedRole="staff">
            <StaffPanel />
          </ProtectedRoute>
        } />
        <Route path="/manage-users" element={
          <ProtectedRoute allowedRole="admin">
            <ManageUsers />
          </ProtectedRoute>
        } />
        <Route path="/audit" element={
          <ProtectedRoute allowedRole="admin">
            <AuditLogs />
          </ProtectedRoute>
        } />
        <Route path="/signup" element={
          <ProtectedRoute allowedRole="admin">
            <Signup />
          </ProtectedRoute>
        } />
        <Route path="/profile/:id" element={<UserProfileViewer />} />
        <Route path="/audit-logs" element={<AuditViewer />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <Router>
      <AppRoutes />
    </Router>
  );
}

export default App;
