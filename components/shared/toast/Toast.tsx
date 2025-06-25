import React, { useContext } from 'react';
import { ToastMessage, ToastType, ToastContext, ToastContextType } from './ToastContext';

const getIcon = (type: ToastType) => {
  switch (type) {
    case 'success': return '✓';
    case 'error': return '✕';
    case 'warning': return '!';
    case 'info': return 'ℹ';
    default: return '';
  }
};

const getBackgroundColor = (type: ToastType) => {
  switch (type) {
    case 'success': return 'bg-green-500';
    case 'error': return 'bg-red-500';
    case 'warning': return 'bg-yellow-500';
    case 'info': return 'bg-blue-500';
    default: return 'bg-gray-700';
  }
};

const getTextColor = (type: ToastType) => {
  return 'text-white';
}

interface ToastProps {
  toast: ToastMessage;
}

export const Toast: React.FC<ToastProps> = ({ toast }) => {
  const context = useContext(ToastContext);

  const handleDismiss = () => {
    if (context) {
      context.removeToast(toast.id);
    }
  };

  return (
    <div
      className={`max-w-sm w-full ${getBackgroundColor(toast.type)} ${getTextColor(toast.type)} shadow-lg rounded-md p-4 my-2 flex justify-between items-center transition-all duration-300 ease-in-out`}
      role="alert"
      aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
    >
      <div className="flex items-center">
        <span className="text-xl mr-3">{getIcon(toast.type)}</span>
        <p className="text-sm">{toast.message}</p>
      </div>
      <button
        onClick={handleDismiss}
        className="ml-4 text-xl font-semibold hover:opacity-75 focus:outline-none"
        aria-label="Dismiss notification"
      >
        &times;
      </button>
    </div>
  );
};
