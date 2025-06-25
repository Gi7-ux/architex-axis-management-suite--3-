import React from 'react';
import { XCircleIcon } from './IconComponents'; // Assuming you have an XCircleIcon or similar

// Define ApiError structure based on typical usage, refine as needed
interface ApiErrorData {
  message?: string;
  errors?: Array<{ param?: string; msg: string; location?: string }>;
}

interface ApiErrorType {
  message: string;
  status?: number;
  data?: ApiErrorData;
}

interface ErrorMessageProps {
  error: string | ApiErrorType | null | undefined;
  className?: string;
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({ error, className = '' }) => {
  if (!error) {
    return null;
  }

  let displayMessage: string | null = null;
  let fieldErrors: Array<{ param?: string; msg: string }> = [];

  if (typeof error === 'string') {
    displayMessage = error;
  } else if (typeof error === 'object' && error !== null) {
    // Attempt to parse based on common ApiError structures
    if (error.message) {
      displayMessage = error.message;
    }
    // Support both plain object errors and AxiosError-like shapes
    const payload = (error as any).data ?? (error as any).response?.data;
    if (payload) {
      if (payload.message && !displayMessage) { // Prefer top-level message if already set
        displayMessage = payload.message;
      }
      if (payload.errors && Array.isArray(payload.errors)) {
        fieldErrors = payload.errors.map((err: any) => ({ param: err.param, msg: err.msg }));
      }
    }
  }

  // Fallback if no specific message could be parsed from object but it's not null
  if (!displayMessage && typeof error === 'object' && error !== null) {
    try {
      // Attempt to stringify, might be a simple object error from somewhere
      const genericErrorStr = JSON.stringify(error);
      if (genericErrorStr !== '{}') { // Avoid showing empty object
          displayMessage = `An unexpected error occurred: ${genericErrorStr}`;
      } else {
          displayMessage = "An unexpected error occurred.";
      }
    } catch {
        displayMessage = "An unexpected error occurred (and it could not be stringified).";
    }
  }


  if (!displayMessage && fieldErrors.length === 0) {
    return null; // No message to display
  }

  return (
    <div
      className={`p-4 mb-4 text-sm border rounded-md ${
        className || 'bg-red-100 border-red-300 text-red-700'
      }`}
      role="alert"
    >
      <div className="flex items-start">
        <XCircleIcon className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
        <div className="flex-grow">
          {displayMessage && <p className="font-medium">{displayMessage}</p>}
          {fieldErrors.length > 0 && (
            <ul className={`mt-1 list-disc list-inside ${displayMessage ? 'ml-1' : ''}`}>
              {fieldErrors.map((fieldErr, index) => (
                <li key={index}>
                  {fieldErr.param && <span className="font-semibold capitalize">{fieldErr.param.replace(/_/g, ' ')}: </span>}
                  {fieldErr.msg}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default ErrorMessage;

// Re-export ApiErrorType for components to use for their error state type
export type { ApiErrorType as ApiError };
