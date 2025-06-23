import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { ToastProvider, ToastContext, ToastContextType, ToastMessage } from './ToastContext';

// Helper component to consume context and interact
const TestConsumerComponent = ({ defaultAddToastDuration }: { defaultAddToastDuration?: number }) => {
  const context = React.useContext(ToastContext);
  if (!context) return null;

  return (
    <div>
      <button onClick={() => context.addToast('Test Message For Default Duration', 'info', defaultAddToastDuration)}>Add Toast For Default/Specific Duration</button>
      <button onClick={() => context.addToast('Test Message Custom Duration', 'success', 100)}>Add Toast With Custom Duration</button>
      <button onClick={() => context.toasts.length > 0 && context.removeToast(context.toasts[0].id)}>Remove First Toast</button>
      <div data-testid="toast-count">{context.toasts.length}</div>
      {context.toasts.map(toast => (
        <div key={toast.id} data-testid={`toast-${toast.id}`}>{toast.message} - {toast.type}</div>
      ))}
    </div>
  );
};


describe('ToastProvider and ToastContext', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  test('should initialize with no toasts', () => {
    render(
      <ToastProvider>
        <TestConsumerComponent />
      </ToastProvider>
    );
    expect(screen.getByTestId('toast-count').textContent).toBe('0');
  });

  test('addToast should add a toast to the state', () => {
    render(
      <ToastProvider>
        <TestConsumerComponent />
      </ToastProvider>
    );

    act(() => {
      screen.getByText('Add Toast With Custom Duration').click();
    });

    expect(screen.getByTestId('toast-count').textContent).toBe('1');
    expect(screen.getByText('Test Message Custom Duration - success')).toBeInTheDocument();
  });

  test('removeToast should remove a toast from the state', () => {
    render(
      <ToastProvider>
        <TestConsumerComponent />
      </ToastProvider>
    );

    act(() => {
      screen.getByText('Add Toast With Custom Duration').click();
    });
    expect(screen.getByTestId('toast-count').textContent).toBe('1');

    act(() => {
      screen.getByText('Remove First Toast').click();
    });
    expect(screen.getByTestId('toast-count').textContent).toBe('0');
  });

  test('toast should auto-dismiss after specified custom duration', () => {
    render(
      <ToastProvider>
        <TestConsumerComponent />
      </ToastProvider>
    );

    act(() => {
        screen.getByText('Add Toast With Custom Duration').click(); // Adds with 100ms duration
    });
    expect(screen.getByTestId('toast-count').textContent).toBe('1');

    act(() => { jest.advanceTimersByTime(99); });
    expect(screen.getByTestId('toast-count').textContent).toBe('1');

    // Wrap the timer advancement that causes state update in act
    act(() => { jest.advanceTimersByTime(1); }); // Total 100ms
    expect(screen.getByTestId('toast-count').textContent).toBe('0');
  });

  test('addToast should use default duration (5000ms) if duration parameter is undefined', () => {
    const DEFAULT_TOAST_DURATION = 5000; // As defined in ToastContext.tsx
    render(
      <ToastProvider>
        <TestConsumerComponent defaultAddToastDuration={undefined} />
      </ToastProvider>
    );

    const mockSetTimeout = jest.spyOn(global, 'setTimeout');

    act(() => {
      // This button passes `undefined` as duration to addToast via the prop
      screen.getByText('Add Toast For Default/Specific Duration').click();
    });

    expect(mockSetTimeout).toHaveBeenCalledTimes(1);
    expect(mockSetTimeout).toHaveBeenCalledWith(expect.any(Function), DEFAULT_TOAST_DURATION);

    // Wrap the timer advancement that causes state update in act
    act(() => { jest.advanceTimersByTime(DEFAULT_TOAST_DURATION); }); // Clean up timer
    mockSetTimeout.mockRestore();
  });
});
