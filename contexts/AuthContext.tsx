import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { TimeLog } from '../types';
import { loginAPI, fetchUserProfileAPI, ApiError, AuthUser, UserLoginData, LoginResponse } from '../apiService';
export type { AuthUser };
import { addTimeLogAPI, updateUserAPI } from '../apiService';

export interface ActiveTimerInfo {
  jobCardId: string;
  jobCardTitle: string;
  projectId: string;
  startTime: Date;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  login: (credentials: UserLoginData) => Promise<AuthUser | null>;
  logout: () => void;
  isLoading: boolean;
  updateCurrentUserDetails: (updatedUserDetails: Partial<AuthUser>) => Promise<boolean>;
  activeTimerInfo: ActiveTimerInfo | null;
  startGlobalTimer: (jobCardId: string, jobCardTitle: string, projectId: string) => void;
  stopGlobalTimerAndLog: (notes?: string, autoStopped?: boolean) => Promise<void>;
  clearGlobalTimerState: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeTimerInfo, setActiveTimerInfo] = useState<ActiveTimerInfo | null>(null);

  useEffect(() => {
    const loadInitialAuth = async () => {
      setIsLoading(true);
      const storedToken = localStorage.getItem('authToken');
      if (storedToken) {
        try {
          const profile = await fetchUserProfileAPI();
          setUser(profile);
          setToken(storedToken);
          localStorage.setItem('archConnectUser', JSON.stringify(profile));
        } catch (error) {
          console.warn("Failed to fetch user profile with stored token:", error);
          localStorage.removeItem('authToken');
          localStorage.removeItem('archConnectUser');
          setUser(null);
          setToken(null);
        }
      }
      setIsLoading(false);
    };

    loadInitialAuth();

    const storedTimerInfo = localStorage.getItem('activeTimerInfo');
    if (storedTimerInfo) {
        try {
            const parsedTimerInfo = JSON.parse(storedTimerInfo);
            setActiveTimerInfo({ ...parsedTimerInfo, startTime: new Date(parsedTimerInfo.startTime) });
        } catch (error) {
            console.error("Failed to parse stored timer info:", error);
            localStorage.removeItem('activeTimerInfo');
        }
    }
  }, []);

  const login = async (credentials: UserLoginData): Promise<AuthUser | null> => {
    setIsLoading(true);
    try {
      const response: LoginResponse = await loginAPI(credentials);
      setUser(response.user);
      setToken(response.token);
      localStorage.setItem('archConnectUser', JSON.stringify(response.user));
      localStorage.setItem('authToken', response.token);
      setIsLoading(false);
      return response.user;
    } catch (error) {
      console.error('Login API call failed:', error);
      setIsLoading(false);
      if (error instanceof ApiError) {
        throw error;
      }
      setUser(null);
      setToken(null);
      localStorage.removeItem('archConnectUser');
      localStorage.removeItem('authToken');
      return null;
    }
  };

  const stopGlobalTimerAndLog = async (notes?: string, autoStopped: boolean = false): Promise<void> => {
    if (!activeTimerInfo || !user) {
      console.warn("No active timer or user to log time for.");
      setActiveTimerInfo(null);
      localStorage.removeItem('activeTimerInfo');
      return;
    }
    const endTime = new Date();
    const durationMinutes = Math.round((endTime.getTime() - activeTimerInfo.startTime.getTime()) / (1000 * 60));
    
    const timeLogData: Omit<TimeLog, 'id' | 'createdAt'> = {
      jobCardId: activeTimerInfo.jobCardId,
      architectId: String(user.id),
      startTime: activeTimerInfo.startTime.toISOString(),
      endTime: endTime.toISOString(),
      durationMinutes,
      notes: autoStopped ? notes || "Timer auto-stopped." : notes,
      manualEntry: false,
    };

    try {
      await addTimeLogAPI(activeTimerInfo.projectId, activeTimerInfo.jobCardId, timeLogData);
      console.log("Time log saved successfully via API.");
    } catch (error) {
      console.error("API call to log time failed:", error);
    }
    setActiveTimerInfo(null);
    localStorage.removeItem('activeTimerInfo');
  };

  const logout = async () => {
    if (activeTimerInfo) {
      await stopGlobalTimerAndLog("Timer auto-stopped on logout.", true);
    }
    setUser(null);
    setToken(null);
    setActiveTimerInfo(null);
    localStorage.removeItem('archConnectUser');
    localStorage.removeItem('authToken');
    localStorage.removeItem('activeTimerInfo');
  };

  const updateCurrentUserDetails = async (updatedUserDetails: Partial<AuthUser>): Promise<boolean> => {
    if (user) {
      try {
        console.warn("updateCurrentUserDetails: updateUserAPI needs to be fully integrated with PHP backend and AuthUser type.");
        const locallyUpdatedUser = { ...user, ...updatedUserDetails };
        setUser(locallyUpdatedUser);
        localStorage.setItem('archConnectUser', JSON.stringify(locallyUpdatedUser));
        return true;
      } catch (error) {
        console.error("API call to update user failed:", error);
        return false;
      }
    }
    return false;
  };

  const startGlobalTimer = (jobCardId: string, jobCardTitle: string, projectId: string) => {
    if (activeTimerInfo) {
      alert("Another timer is already active. Please stop it first.");
      return;
    }
    const newTimerInfo = { jobCardId, jobCardTitle, projectId, startTime: new Date() };
    setActiveTimerInfo(newTimerInfo);
    localStorage.setItem('activeTimerInfo', JSON.stringify(newTimerInfo));
  };

  const clearGlobalTimerState = () => {
    setActiveTimerInfo(null);
    localStorage.removeItem('activeTimerInfo');
  };

  return (
    <AuthContext.Provider value={{ 
      user, token, login, logout, isLoading, updateCurrentUserDetails,
      activeTimerInfo, startGlobalTimer, stopGlobalTimerAndLog, clearGlobalTimerState
    }}>
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
