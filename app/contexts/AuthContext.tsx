// app/contexts/AuthContext.tsx
'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import apiService from '../services/api.service';

export interface User {
  id: string;
  username: string;
  role: string;
  department: string;
  email?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, userData: User) => void;
  logout: () => void;
  setMockUser: (role: string, department: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Initialize user from localStorage (for mock mode)
    const mockRole = apiService.getMockRole();
    const mockDepartment = apiService.getMockDepartment();

    if (mockRole && mockDepartment) {
      setUser({
        id: '1',
        username: 'test_user',
        role: mockRole,
        department: mockDepartment
      });
    }

    setIsLoading(false);
  }, []);

  const login = (token: string, userData: User) => {
    apiService.setToken(token);
    setUser(userData);
  };

  const logout = () => {
    apiService.clearAuth();
    setUser(null);
  };

  const setMockUser = (role: string, department: string) => {
    apiService.setMockRole(role, department);
    setUser({
      id: '1',
      username: 'test_user',
      role,
      department
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        setMockUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
