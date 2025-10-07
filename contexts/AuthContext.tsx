
import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { Role } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  role: Role | null;
  loading: boolean;
  login: (pin: string) => Promise<Role>;
  logout: () => void;
  refreshRole: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadRoleFromStorage = async () => {
      try {
        const savedRole = localStorage.getItem('oui-oui-tacos-role');
        const savedSession = localStorage.getItem('oui-oui-tacos-session');

        if (!savedRole || !savedSession) {
          localStorage.removeItem('oui-oui-tacos-role');
          localStorage.removeItem('oui-oui-tacos-session');
          return;
        }

        const parsedRole: Role = JSON.parse(savedRole);
        const parsedSession: { roleId?: string } = JSON.parse(savedSession);

        if (!parsedRole?.id || parsedSession.roleId !== parsedRole.id) {
          localStorage.removeItem('oui-oui-tacos-role');
          localStorage.removeItem('oui-oui-tacos-session');
          setRole(null);
          return;
        }

        const freshRole = await api.getRoleById(parsedRole.id);
        if (freshRole) {
          setRole(freshRole);
          localStorage.setItem('oui-oui-tacos-role', JSON.stringify(freshRole));
          localStorage.setItem(
            'oui-oui-tacos-session',
            JSON.stringify({ roleId: freshRole.id, authenticatedAt: Date.now() })
          );
        } else {
          localStorage.removeItem('oui-oui-tacos-role');
          localStorage.removeItem('oui-oui-tacos-session');
          setRole(null);
        }
      } catch (error) {
        console.error("Failed to restore role:", error);
        localStorage.removeItem('oui-oui-tacos-role');
        localStorage.removeItem('oui-oui-tacos-session');
        setRole(null);
      } finally {
        setLoading(false);
      }
    };

    loadRoleFromStorage();
  }, []);

  const login = useCallback(async (pin: string): Promise<Role> => {
    setLoading(true);
    try {
      const userRole = await api.loginWithPin(pin);
      if (!userRole) {
        throw new Error('PIN invalide');
      }

      setRole(userRole);
      localStorage.setItem('oui-oui-tacos-role', JSON.stringify(userRole));
      localStorage.setItem('oui-oui-tacos-session', JSON.stringify({ roleId: userRole.id, authenticatedAt: Date.now() }));

      return userRole;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setRole(null);
    localStorage.removeItem('oui-oui-tacos-role');
    localStorage.removeItem('oui-oui-tacos-session');
  }, []);

  const refreshRole = useCallback(async () => {
    if (!role?.id) {
      return;
    }

    try {
      const updatedRole = await api.getRoleById(role.id);
      if (updatedRole) {
        setRole(updatedRole);
        localStorage.setItem('oui-oui-tacos-role', JSON.stringify(updatedRole));
        localStorage.setItem('oui-oui-tacos-session', JSON.stringify({ roleId: updatedRole.id, authenticatedAt: Date.now() }));
      } else {
        logout();
      }
    } catch (error) {
      console.error('Failed to refresh role:', error);
    }
  }, [logout, role?.id]);

  return (
    <AuthContext.Provider value={{ role, loading, login, logout, refreshRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
