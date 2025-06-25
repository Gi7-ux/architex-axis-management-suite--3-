import React, { useContext } from 'react';
import { ToastContext, ToastContextType } from './ToastContext';
import { Toast } from './Toast';

export const ToastContainer: React.FC = () => {
  const context = useContext(ToastContext);

  if (!context) {
    return null;
  }

  const { toasts } = context;

  if (!toasts.length) {
    return null;
  }

  return (
    <div className="fixed top-5 right-5 z-50 space-y-2">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} />
      ))}
    </div>
  );
};
