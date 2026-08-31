import React from 'react';
import { useAuth } from '../auth/AuthContext';

interface PermissionGateProps {
  permission?: string;
  role?: string;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * PermissionGate is a UX helper to hide or disable components
 * based on the user's authoritative permissions loaded from the backend.
 * The server API remains the ultimate security gatekeeper.
 */
export const PermissionGate: React.FC<PermissionGateProps> = ({
  permission,
  role,
  fallback = null,
  children,
}) => {
  const { hasPermission, hasRole } = useAuth();

  if (permission && !hasPermission(permission)) {
    return <>{fallback}</>;
  }

  if (role && !hasRole(role)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};
