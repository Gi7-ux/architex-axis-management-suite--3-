import React, { createContext, useState, useCallback, ReactNode } from 'react';

// 1. Define Toast Types
export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
  duration?: number; // Optional: duration in ms, if not provided, uses default
}

export interface ToastContextType {
  toasts: ToastMessage[];
  addToast: (message: string, type: ToastType, duration?: number) => void;
  removeToast: (id: string) => void;
}

// Default duration for toasts
const DEFAULT_TOAST_DURATION = 5000; // 5 seconds

// 2. Create ToastContext
// The context will be undefined by default until the ToastProvider is used.
export const ToastContext = createContext<ToastContextType | undefined>(undefined);

interface ToastProviderProps {
  children: ReactNode;
}

// 3. Implement ToastProvider
export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((message: string, type: ToastType, duration: number = DEFAULT_TOAST_DURATION) => {
    const id = Math.random().toString(36).substr(2, 9); // Simple unique ID
    setToasts(prevToasts => [...prevToasts, { id, message, type, duration }]);

    // Auto-remove toast after duration
    // Ensure that removeToast is called with the correct id by not referencing 'id' from the outer scope directly in the timeout
    setTimeout(() => {
      removeToast(id); // This 'id' correctly refers to the one created in this addToast call
    }, duration);
  }, []); // removeToast is not a dependency if its definition is stable (which it is via useCallback with empty deps)

  const removeToast = useCallback((id: string) => {
    setToasts(prevToasts => prevToasts.filter(toast => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
    </ToastContext.Provider>
  );
};
