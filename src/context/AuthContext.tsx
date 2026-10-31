import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, DevOtpItem } from '../types/index.js';
import { apiRequest, tokenStorage } from '../lib/api.js';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  activeDevOtps: DevOtpItem[];
  login: (email: string, password: string) => Promise<{ requiresOtp?: boolean; email?: string }>;
  register: (name: string, email: string, password: string) => Promise<{ requiresOtp?: boolean; email?: string }>;
  passwordlessRequest: (email: string) => Promise<{ requiresOtp?: boolean; email?: string }>;
  verifyOtp: (email: string, code: string) => Promise<void>;
  resendOtp: (email: string, type?: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (email: string, code: string, newPass: string) => Promise<void>;
  updateProfile: (name: string, avatarUrl?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshDevOtps: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeDevOtps, setActiveDevOtps] = useState<DevOtpItem[]>([]);

  const refreshDevOtps = useCallback(async () => {
    try {
      const res = await apiRequest<{ otps: DevOtpItem[] }>('/api/auth/dev-otp');
      setActiveDevOtps(res.otps || []);
    } catch {
      // ignore
    }
  }, []);

  const loadCurrentUser = useCallback(async () => {
    const token = tokenStorage.getAccess();
    if (!token) {
      const hasExplicitlyLoggedOut = localStorage.getItem('nextask_has_logged_out');
      if (!hasExplicitlyLoggedOut) {
        try {
          const res = await apiRequest<{
            accessToken: string;
            refreshToken: string;
            user: User;
          }>('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email: 'demo@nextask.io', password: 'password123' }),
          });
          if (res.accessToken && res.user) {
            tokenStorage.setAccess(res.accessToken);
            if (res.refreshToken) tokenStorage.setRefresh(res.refreshToken);
            setUser(res.user);
            setIsLoading(false);
            return;
          }
        } catch {
          // ignore fallback
        }
      }
      setIsLoading(false);
      return;
    }
    try {
      const res = await apiRequest<{ user: User }>('/api/auth/me');
      setUser(res.user);
    } catch {
      tokenStorage.clear();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCurrentUser();
    refreshDevOtps();
    const interval = setInterval(refreshDevOtps, 5000);
    return () => clearInterval(interval);
  }, [loadCurrentUser, refreshDevOtps]);

  const login = async (email: string, password: string) => {
    const res = await apiRequest<{
      accessToken?: string;
      refreshToken?: string;
      user?: User;
      requiresOtp?: boolean;
      email?: string;
    }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (res.requiresOtp) {
      refreshDevOtps();
      return { requiresOtp: true, email: res.email };
    }

    if (res.accessToken && res.user) {
      localStorage.removeItem('nextask_has_logged_out');
      tokenStorage.setAccess(res.accessToken);
      if (res.refreshToken) tokenStorage.setRefresh(res.refreshToken);
      setUser(res.user);
    }

    refreshDevOtps();
    return {};
  };

  const register = async (name: string, email: string, password: string) => {
    const res = await apiRequest<{
      requiresOtp?: boolean;
      email?: string;
    }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });

    refreshDevOtps();
    return { requiresOtp: res.requiresOtp, email: res.email };
  };

  const passwordlessRequest = async (email: string) => {
    const res = await apiRequest<{
      requiresOtp?: boolean;
      email?: string;
    }>('/api/auth/passwordless-request', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });

    refreshDevOtps();
    return { requiresOtp: res.requiresOtp, email: res.email };
  };

  const verifyOtp = async (email: string, code: string) => {
    const res = await apiRequest<{
      accessToken: string;
      refreshToken: string;
      user: User;
    }>('/api/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ email, code }),
    });

    localStorage.removeItem('nextask_has_logged_out');
    tokenStorage.setAccess(res.accessToken);
    tokenStorage.setRefresh(res.refreshToken);
    setUser(res.user);
    refreshDevOtps();
  };

  const resendOtp = async (email: string, type: string = 'verification') => {
    await apiRequest('/api/auth/resend-otp', {
      method: 'POST',
      body: JSON.stringify({ email, type }),
    });
    refreshDevOtps();
  };

  const forgotPassword = async (email: string) => {
    await apiRequest('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
    refreshDevOtps();
  };

  const resetPassword = async (email: string, code: string, newPass: string) => {
    await apiRequest('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email, code, newPassword: newPass }),
    });
    refreshDevOtps();
  };

  const updateProfile = async (name: string, avatarUrl?: string) => {
    const res = await apiRequest<{ user: User }>('/api/auth/profile', {
      method: 'PUT',
      body: JSON.stringify({ name, avatarUrl }),
    });
    setUser(res.user);
  };

  const logout = async () => {
    localStorage.setItem('nextask_has_logged_out', 'true');
    try {
      await apiRequest('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    }
    tokenStorage.clear();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        activeDevOtps,
        login,
        register,
        passwordlessRequest,
        verifyOtp,
        resendOtp,
        forgotPassword,
        resetPassword,
        updateProfile,
        logout,
        refreshDevOtps,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
