import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { User, UserRole, TimeLog } from '../types'; // User might still be used for other contexts or can be replaced by AuthUser if sufficient
import { loginAPI, fetchUserProfileAPI, ApiError, AuthUser, UserLoginData } from '../apiService';
export type { AuthUser }; // Export AuthUser
import { addTimeLogAPI, updateUserAPI } from '../apiService'; // Keep other necessary imports


export interface ActiveTimerInfo {
  jobCardId: string;
  jobCardTitle: string;
  projectId: string;
  startTime: Date;
}

interface AuthContextType {
  user: AuthUser | null; // Changed from User to AuthUser
  token: string | null;
  login: (credentials: UserLoginData) => Promise<AuthUser | null>; // Updated signature
  logout: () => void;
  isLoading: boolean;
  updateCurrentUserDetails: (updatedUserDetails: Partial<AuthUser>) // Changed User to AuthUser
    => Promise<boolean>;
  activeTimerInfo: ActiveTimerInfo | null;
  startGlobalTimer: (jobCardId: string, jobCardTitle: string, projectId: string) => void;
  stopGlobalTimerAndLog: (notes?: string, autoStopped?: boolean) => Promise<void>;
  clearGlobalTimerState: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null); // Changed from User to AuthUser
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeTimerInfo, setActiveTimerInfo] = useState<ActiveTimerInfo | null>(null);

  useEffect(() => {
    const loadInitialAuth = async () => {
      setIsLoading(true);
      const storedToken = localStorage.getItem('authToken');
      if (storedToken) {
        try {
          // Validate token by fetching user profile
          const profile = await fetchUserProfileAPI(); // fetchUserProfileAPI uses the token from localStorage via apiFetch
          setUser(profile); // profile is of type AuthUser
          setToken(storedToken);
          localStorage.setItem('archConnectUser', JSON.stringify(profile)); // Store AuthUser
        } catch (error) {
          console.warn("Failed to fetch user profile with stored token:", error);
          localStorage.removeItem('authToken');
          localStorage.removeItem('archConnectUser'); // Clear stale user data
          setUser(null);
          setToken(null);
        }
      }
      setIsLoading(false);
    };

    loadInitialAuth();

    // Timer loading logic (can remain as is for now)
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
      // Use the new loginAPI from apiService.ts
      const response = await loginAPI(credentials); // loginAPI is the updated one
      setUser(response.user); // response.user is AuthUser
      setToken(response.token);
      localStorage.setItem('archConnectUser', JSON.stringify(response.user)); // Store AuthUser
      localStorage.setItem('authToken', response.token);
      setIsLoading(false);
      return response.user;
    } catch (error) {
      console.error('Login API call failed:', error);
      setIsLoading(false);
      if (error instanceof ApiError) {
        throw error; // Re-throw to be caught by UI
      }
      // Ensure user and token are nullified on failed login
      setUser(null);
      setToken(null);
      localStorage.removeItem('archConnectUser');
      localStorage.removeItem('authToken');
      return null;
    }
  };

  const stopGlobalTimerAndLog = async (notes?: string, autoStopped: boolean = false): Promise<void> => {
    if (!activeTimerInfo || !user) { // user is AuthUser here
      console.warn("No active timer or user to log time for.");
      setActiveTimerInfo(null);
      localStorage.removeItem('activeTimerInfo');
      return;
    }
    const endTime = new Date();
    const durationMinutes = Math.round((endTime.getTime() - activeTimerInfo.startTime.getTime()) / (1000 * 60));
    
    // Note: user.id is now a number (from AuthUser)
    const timeLogData: Omit<TimeLog, 'id' | 'createdAt'> = {
      jobCardId: activeTimerInfo.jobCardId,
      architectId: String(user.id), // TimeLog might expect string ID, adjust if needed based on TimeLog type
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
    localStorage.removeItem('archConnectUser'); // This stores AuthUser now
    localStorage.removeItem('authToken');
    localStorage.removeItem('activeTimerInfo');
    // TODO: Call backend logout endpoint if session needs to be invalidated server-side
    // (e.g., call an api.php?action=logout_user that nullifies the token in DB)
  };

  const updateCurrentUserDetails = async (updatedUserDetails: Partial<AuthUser>): Promise<boolean> => {
    if (user) { // user is AuthUser here
      try {
        // TODO: updateUserAPI currently points to old endpoint styles (/users/:id)
        // and expects/returns the broader 'User' type.
        // This will need to be updated when a PHP endpoint for profile updates is created.
        // For now, this might lead to type mismatches or errors if called.
        // Assuming updateUserAPI can take AuthUser and user.id (number for PHP)
        // const tempUserForAPI = { ...user, ...updatedUserDetails };
        // The updateUserAPI in apiService needs to be updated to work with PHP and AuthUser.
        // For now, this is a placeholder for the call.
        // const updatedUserFromApi = await updateUserAPI(String(user.id), tempUserForAPI);
        // setUser(updatedUserFromApi); // This would require updateUserAPI to return AuthUser
        // localStorage.setItem('archConnectUser', JSON.stringify(updatedUserFromApi));
        console.warn("updateCurrentUserDetails: updateUserAPI needs to be fully integrated with PHP backend and AuthUser type.");
        // Simulate a local update for now if needed for UI, but this won't persist to backend correctly yet.
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
