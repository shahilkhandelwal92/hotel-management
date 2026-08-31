import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  apiClient,
  getAuthToken,
  setAuthToken,
  clearAuthToken,
  registerUnauthorizedCallback,
} from '../api/client';
import { UserProfile, LoginResponse } from '../api/types';

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  hasRole: (roleName: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchUserProfile = useCallback(async (): Promise<UserProfile | null> => {
    try {
      const response = await apiClient<{ user: UserProfile }>('/api/auth/me');
      return response.user;
    } catch {
      return null;
    }
  }, []);

  const refreshSession = useCallback(async () => {
    const token = await getAuthToken();
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    const profile = await fetchUserProfile();
    if (profile) {
      setUser(profile);
    } else {
      await clearAuthToken();
      setUser(null);
    }
    setIsLoading(false);
  }, [fetchUserProfile]);

  useEffect(() => {
    refreshSession();

    registerUnauthorizedCallback(() => {
      setUser(null);
    });
  }, [refreshSession]);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await apiClient<LoginResponse>('/api/auth/login', {
        method: 'POST',
        body: { email, password },
      });

      if (response.token) {
        await setAuthToken(response.token);
      }

      const profile = await fetchUserProfile();
      if (profile) {
        setUser(profile);
      } else {
        throw new Error('Failed to load user profile after authentication.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await apiClient('/api/auth/logout', { method: 'POST' }).catch(() => {});
    } finally {
      await clearAuthToken();
      setUser(null);
      setIsLoading(false);
    }
  };

  const hasPermission = useCallback(
    (permission: string): boolean => {
      if (!user) return false;
      const isSuper = user.roles?.some(
        (r) => r.role.name === 'SUPER_ADMIN' || r.role.name === 'OWNER'
      );
      if (isSuper) return true;
      return user.permissions?.includes(permission) ?? false;
    },
    [user]
  );

  const hasRole = useCallback(
    (roleName: string): boolean => {
      if (!user) return false;
      return user.roles?.some((r) => r.role.name === roleName) ?? false;
    },
    [user]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        refreshSession,
        hasPermission,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
