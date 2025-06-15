import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { User, UserRole, TimeLog } from '../types';
import { loginAPI, addTimeLogAPI, updateUserAPI } from '../apiService'; // Import from apiService
import { ApiError } from '../apiService'; // Import ApiError

export interface ActiveTimerInfo {
  jobCardId: string;
  jobCardTitle: string;
  projectId: string;
  startTime: Date;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, pass: string) => Promise<User | null>;
  logout: () => void;
  isLoading: boolean;
  updateCurrentUserDetails: (updatedUserDetails: Partial<User>) => Promise<boolean>;
  activeTimerInfo: ActiveTimerInfo | null;
  startGlobalTimer: (jobCardId: string, jobCardTitle: string, projectId: string) => void;
  stopGlobalTimerAndLog: (notes?: string, autoStopped?: boolean) => Promise<void>;
  clearGlobalTimerState: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeTimerInfo, setActiveTimerInfo] = useState<ActiveTimerInfo | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('archConnectUser');
    const storedToken = localStorage.getItem('authToken');
    if (storedUser && storedToken) {
      try {
        setUser(JSON.parse(storedUser));
        setToken(storedToken);
      } catch (error) {
        console.error("Failed to parse stored user/token:", error);
        localStorage.removeItem('archConnectUser');
        localStorage.removeItem('authToken');
      }
    }
    // TODO: Load active timer from backend or a more persistent storage if needed across devices
    // For now, load from localStorage if simple persistence is desired for local session
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
    setIsLoading(false);
  }, []);

  const login = async (email: string, pass: string): Promise<User | null> => {
    setIsLoading(true);
    try {
      const { user: userData, token: authToken } = await loginAPI(email, pass);
      setUser(userData);
      setToken(authToken);
      localStorage.setItem('archConnectUser', JSON.stringify(userData));
      localStorage.setItem('authToken', authToken);
      setIsLoading(false);
      return userData;
    } catch (error) {
      console.error('Login API call failed:', error);
      setIsLoading(false);
      if (error instanceof ApiError) {
        throw error; // Re-throw to be caught by UI
      }
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
      architectId: user.id,
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
      // Potentially notify user or queue for retry
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
    // TODO: Call backend logout endpoint if session needs to be invalidated server-side
  };

  const updateCurrentUserDetails = async (updatedUserDetails: Partial<User>): Promise<boolean> => {
    if (user) {
      try {
        const updatedUserFromApi = await updateUserAPI(user.id, updatedUserDetails);
        setUser(updatedUserFromApi);
        localStorage.setItem('archConnectUser', JSON.stringify(updatedUserFromApi));
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
