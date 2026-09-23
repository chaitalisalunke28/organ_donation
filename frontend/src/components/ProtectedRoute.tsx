import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: string[];
}

const ROLE_DASHBOARD: Record<string, string> = {
  ADMIN: '/admin/dashboard',
  HOSPITAL: '/hospital/dashboard',
  COORDINATOR: '/coordinator/dashboard',
};

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();

  // Not authenticated → redirect to login
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Authenticated but wrong role → redirect to their own dashboard
  if (!allowedRoles.includes(user.role)) {
    const correctDashboard = ROLE_DASHBOARD[user.role] ?? '/login';
    return <Navigate to={correctDashboard} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
