import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Toast } from './Toast';
import { ToastContext } from './ToastContext';
import type { ToastMessage, ToastContextType } from './ToastContext';

describe('Toast Component', () => {
  const mockRemoveToast = jest.fn();

  const renderWithToastContext = (toast: ToastMessage, contextValue?: Partial<ToastContextType>) => {
    return render(
      <ToastContext.Provider value={{ toasts: [toast], addToast: jest.fn(), removeToast: mockRemoveToast, ...contextValue }}>
        <Toast toast={toast} />
      </ToastContext.Provider>
    );
  };

  beforeEach(() => {
    mockRemoveToast.mockClear();
  });

  test('renders toast message correctly', () => {
    const toast: ToastMessage = { id: '1', message: 'Test Success Message', type: 'success' };
    renderWithToastContext(toast);
    expect(screen.getByText('Test Success Message')).toBeInTheDocument();
  });

  test('renders correct icon based on type (success)', () => {
    const toast: ToastMessage = { id: '1', message: 'Success', type: 'success' };
    renderWithToastContext(toast);
    expect(screen.getByText('✓')).toBeInTheDocument();
  });

  test('renders correct icon based on type (error)', () => {
    const toast: ToastMessage = { id: '1', message: 'Error', type: 'error' };
    renderWithToastContext(toast);
    expect(screen.getByText('✕')).toBeInTheDocument();
  });

  test('renders correct icon based on type (warning)', () => {
    const toast: ToastMessage = { id: '1', message: 'Warning', type: 'warning' };
    renderWithToastContext(toast);
    expect(screen.getByText('!')).toBeInTheDocument();
  });

  test('renders correct icon based on type (info)', () => {
    const toast: ToastMessage = { id: '1', message: 'Info', type: 'info' };
    renderWithToastContext(toast);
    expect(screen.getByText('ℹ')).toBeInTheDocument();
  });

  test('applies correct background class based on type (success)', () => {
    const toast: ToastMessage = { id: '1', message: 'Success', type: 'success' };
    renderWithToastContext(toast);
    const alertDiv = screen.getByRole('alert');
    expect(alertDiv).toHaveClass('bg-green-500');
  });

  test('applies correct background class based on type (error)', () => {
    const toast: ToastMessage = { id: '1', message: 'Error', type: 'error' };
    renderWithToastContext(toast);
    const alertDiv = screen.getByRole('alert');
    expect(alertDiv).toHaveClass('bg-red-500');
  });

  test('calls removeToast when dismiss button is clicked', () => {
    const toast: ToastMessage = { id: 'test-toast-id', message: 'Dismiss Test', type: 'info' };
    renderWithToastContext(toast);
    const dismissButton = screen.getByRole('button', { name: /dismiss notification/i });
    fireEvent.click(dismissButton);
    expect(mockRemoveToast).toHaveBeenCalledTimes(1);
    expect(mockRemoveToast).toHaveBeenCalledWith('test-toast-id');
  });
});
