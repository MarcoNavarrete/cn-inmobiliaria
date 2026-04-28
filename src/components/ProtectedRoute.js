import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { obtenerToken } from '../services/authService';

export default function ProtectedRoute({ children }) {
  const location = useLocation();

  if (!obtenerToken()) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}
