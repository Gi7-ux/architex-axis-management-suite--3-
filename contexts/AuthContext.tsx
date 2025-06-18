import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserRole, AuthUser, AuthContextType } from '../types';
import { logTimeAPI } from '../apiService';

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTimerInfo, setActiveTimerInfo] = useState<{ jobCardId: string; startTime: string } | null>(null);

  const login = async (email: string, password: string) => {
    try {
      const response = await fetch('/backend/api.php/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        throw new Error('Login failed');
      }

      const data = await response.json();
      setUser(data.user);
      setIsAuthenticated(true);
      localStorage.setItem('authToken', data.token);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      if (activeTimerInfo) {
        await stopGlobalTimerAndLog();
      }
      localStorage.removeItem('authToken');
      setUser(null);
      setIsAuthenticated(false);
      setActiveTimerInfo(null);
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  const startGlobalTimer = async (jobCardId: string) => {
    if (activeTimerInfo) {
      throw new Error('Timer is already running');
    }
    const startTime = new Date().toISOString();
    setActiveTimerInfo({ jobCardId, startTime });
    localStorage.setItem('activeTimer', JSON.stringify({ jobCardId, startTime }));
  };

  const stopGlobalTimerAndLog = async (notes?: string) => {
    if (!activeTimerInfo) {
      throw new Error('No active timer');
    }

    const endTime = new Date().toISOString();
    await logTimeAPI({
      jobCardId: activeTimerInfo.jobCardId,
      startTime: activeTimerInfo.startTime,
      endTime,
      notes,
      manualEntry: false
    });

    setActiveTimerInfo(null);
    localStorage.removeItem('activeTimer');
  };

  useEffect(() => {
    // Check for existing auth token and validate it
    const token = localStorage.getItem('authToken');
    const savedTimer = localStorage.getItem('activeTimer');

    if (savedTimer) {
      setActiveTimerInfo(JSON.parse(savedTimer));
    }

    if (token) {
      fetch('/backend/api.php/auth/validate', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })
        .then(response => response.json())
        .then(data => {
          if (data.valid) {
            setUser(data.user);
            setIsAuthenticated(true);
          } else {
            localStorage.removeItem('authToken');
            localStorage.removeItem('activeTimer');
            setActiveTimerInfo(null);
          }
        })
        .catch(() => {
          localStorage.removeItem('authToken');
          localStorage.removeItem('activeTimer');
          setActiveTimerInfo(null);
        });
    }
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      login,
      logout,
      activeTimerInfo: activeTimerInfo || undefined,
      startGlobalTimer,
      stopGlobalTimerAndLog
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
