import { renderHook, act } from '@testing-library/react'; // Adjusted import for RTL v13.1.0+
import { ToastProvider } from './ToastContext';
import { useToast } from './useToast';
import React, { ReactNode } from 'react';

describe('useToast Hook', () => {
  const AllTheProviders: React.FC<{children: ReactNode}> = ({ children }) => {
    return <ToastProvider>{children}</ToastProvider>;
  };

  test('should return toast context when used within ToastProvider', () => {
    const { result } = renderHook(() => useToast(), {
      wrapper: AllTheProviders,
    });

    expect(result.current).toBeDefined();
    expect(typeof result.current.addToast).toBe('function');
    expect(typeof result.current.removeToast).toBe('function');
    expect(Array.isArray(result.current.toasts)).toBe(true);
  });

  test('should throw an error when used outside of ToastProvider', () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    // For RTL v13.1.0+, renderHook is directly from @testing-library/react
    // and error is caught differently or test should be structured to catch throw
    try {
      renderHook(() => useToast());
    } catch (e: any) {
      expect(e.message).toBe('useToast must be used within a ToastProvider');
    }
    // A more common way to test for thrown errors with Jest:
    expect(() => renderHook(() => useToast())).toThrow('useToast must be used within a ToastProvider');

    consoleErrorSpy.mockRestore();
  });

  // Test that addToast obtained from the hook actually works
  test('addToast via hook updates toasts array', () => {
    const { result } = renderHook(() => useToast(), {
      wrapper: AllTheProviders,
    });

    expect(result.current.toasts.length).toBe(0);

    act(() => {
      result.current.addToast('A new toast', 'info');
    });

    expect(result.current.toasts.length).toBe(1);
    expect(result.current.toasts[0].message).toBe('A new toast');
    expect(result.current.toasts[0].type).toBe('info');
  });
});
