import React from 'react';
import { render, screen } from '@testing-library/react';
import { ToastContainer } from './ToastContainer';
import { ToastContext } from './ToastContext';
import type { ToastMessage, ToastContextType } from './ToastContext';

jest.mock('./Toast', () => ({
  Toast: jest.fn(({ toast }) => <div data-testid={`mock-toast-${toast.id}`}>{toast.message}</div>),
}));

describe('ToastContainer Component', () => {
  const mockAddToast = jest.fn();
  const mockRemoveToast = jest.fn();

  const renderWithToasts = (toasts: ToastMessage[]) => {
    return render(
      <ToastContext.Provider value={{ toasts, addToast: mockAddToast, removeToast: mockRemoveToast }}>
        <ToastContainer />
      </ToastContext.Provider>
    );
  };

  test('renders nothing when there are no toasts', () => {
    const { container } = renderWithToasts([]);
    // eslint-disable-next-line testing-library/no-node-access
    expect(container.firstChild).toBeNull();
  });

  test('renders multiple toasts when provided in context', () => {
    const toasts: ToastMessage[] = [
      { id: '1', message: 'First Toast', type: 'success' },
      { id: '2', message: 'Second Toast', type: 'error' },
    ];
    renderWithToasts(toasts);
    expect(screen.getByTestId('mock-toast-1')).toBeInTheDocument();
    expect(screen.getByText('First Toast')).toBeInTheDocument();
    expect(screen.getByTestId('mock-toast-2')).toBeInTheDocument();
    expect(screen.getByText('Second Toast')).toBeInTheDocument();
  });

  test('renders null if context is not available', () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const { container } = render(<ToastContainer />);
    // eslint-disable-next-line testing-library/no-node-access
    expect(container.firstChild).toBeNull();
    consoleErrorSpy.mockRestore();
  });
});
