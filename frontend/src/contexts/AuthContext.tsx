'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';
import { useRouter } from 'next/navigation';
import {
  apiClient,
  LoginData,
  RegisterData,
  LoginResponse,
} from '@/lib/api-client';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  emailVerified: boolean;
  createdAt: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (data: LoginData) => Promise<LoginResponse>;
  register: (data: RegisterData) => Promise<LoginResponse>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
  refreshUser: () => Promise<void>;
  verifyEmail: (email: string, token: string) => Promise<void>;
  resendVerification: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const isAuthenticated = !!user;

  // Check auth status on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        if (apiClient.isAuthenticated()) {
          const userData = await apiClient.getMe();
          setUser(userData);
          apiClient.setUser(userData);
        }
      } catch {
        apiClient.clearTokens();
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = useCallback(async (data: LoginData) => {
    const response: LoginResponse = await apiClient.login(data);
    setUser(response.user);
    return response;
  }, []);

  const register = useCallback(async (data: RegisterData) => {
    const response: LoginResponse = await apiClient.register(data);
    setUser(response.user);
    return response;
  }, []);

  const verifyEmail = useCallback(async (email: string, token: string) => {
    const response = await apiClient.verifyEmail(email, token);
    setUser(response.user);
  }, []);

  const resendVerification = useCallback(async (email: string) => {
    await apiClient.resendVerification(email);
  }, []);

  const logout = useCallback(async () => {
    await apiClient.logout();
    setUser(null);
    router.push('/');
  }, [router]);

  const logoutAll = useCallback(async () => {
    await apiClient.logoutAll();
    setUser(null);
    router.push('/');
  }, [router]);

  const refreshUser = useCallback(async () => {
    try {
      const userData = await apiClient.getMe();
      setUser(userData);
      apiClient.setUser(userData);
    } catch {
      setUser(null);
    }
  }, []);

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    login,
    register,
    logout,
    logoutAll,
    refreshUser,
    verifyEmail,
    resendVerification,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// HOC for protecting routes
export function withAuth<P extends object>(
  WrappedComponent: React.ComponentType<P>
) {
  return function AuthenticatedComponent(props: P) {
    const { isAuthenticated, isLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
      if (!isLoading && !isAuthenticated) {
        router.push('/auth/login');
      }
    }, [isAuthenticated, isLoading, router]);

    if (isLoading) {
      return (
        <div className="min-h-screen bg-black flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-white border-t-transparent animate-spin" />
        </div>
      );
    }

    if (!isAuthenticated) {
      return null;
    }

    return <WrappedComponent {...props} />;
  };
}

// Role-based access control
export function useHasRole(requiredRole: string | string[]): boolean {
  const { user } = useAuth();
  if (!user) return false;

  const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
  return roles.includes(user.role);
}

export function withRole<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  requiredRole: string | string[]
) {
  return function RoleProtectedComponent(props: P) {
    const { user, isLoading } = useAuth();
    const router = useRouter();
    const hasRole = useHasRole(requiredRole);

    useEffect(() => {
      if (!isLoading && !hasRole) {
        router.push('/unauthorized');
      }
    }, [hasRole, isLoading, router]);

    if (isLoading) {
      return (
        <div className="min-h-screen bg-black flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-white border-t-transparent animate-spin" />
        </div>
      );
    }

    if (!hasRole) {
      return null;
    }

    return <WrappedComponent {...props} />;
  };
}
