import React from 'react';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ allowedRole, children }) => {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');

  if (!token) return <Navigate to="/" />;

  if (Array.isArray(allowedRole)) {
    if (!allowedRole.includes(role)) return <Navigate to="/" />;
  } else {
    if (role !== allowedRole) return <Navigate to="/" />;
  }

  return children;
};

export default ProtectedRoute;
