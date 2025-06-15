
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { UserRole } from '../../types';
import LoadingSpinner from './LoadingSpinner';
import { NAV_LINKS } from '../../constants';

interface ProtectedViewProps {
  children: React.ReactElement;
  allowedRoles?: UserRole[]; // If undefined, only auth is checked
}

const ProtectedView: React.FC<ProtectedViewProps> = ({ children, allowedRoles }) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <LoadingSpinner text="Authenticating..." size="lg" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to={NAV_LINKS.LOGIN} state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // User is authenticated but does not have the required role
    // Redirect to their default dashboard or a "not authorized" page
    // For simplicity, redirecting to their dashboard.
    return <Navigate to={NAV_LINKS.DASHBOARD} replace />;
  }

  return children;
};

export default ProtectedView;