import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { UserRole, ActiveTimerInfo, AuthUser } from '../../types'; // UserRole and other types from here
import GlobalTimerDisplay from './GlobalTimerDisplay';
import AuthContext from '../../contexts/AuthContext'; // Correct default import for AuthContext
import * as constants from '../../constants';


// Mock constants or specific functions if they are complex
jest.mock('../../constants', () => {
  const originalConstants = jest.requireActual('../../constants');
  return {
    ...originalConstants,
    formatDurationToHHMMSS: jest.fn((totalSeconds: number) => {
      if (totalSeconds === 0) {
        return '00:00:00'; // Default mock behavior for 0
      }
      // Fallback to a simple format for other cases to ensure it returns a string
      const hours = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
      const minutes = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
      const seconds = Math.floor(totalSeconds % 60).toString().padStart(2, '0');
      return `${hours}:${minutes}:${seconds}`;
    }),
  };
});
const mockFormatDurationToHHMMSS = constants.formatDurationToHHMMSS as jest.Mock; // Still needed to reference the mock


describe('GlobalTimerDisplay', () => {
  let mockStopGlobalTimerAndLog: jest.Mock;
  const mockUser: AuthUser = { id: 1, username: 'freelancer1', email: 'freelancer@example.com', role: UserRole.FREELANCER };

  let defaultMockContextValue: any; // To hold the default value for AuthContext.Provider

  beforeEach(() => {
    jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] });
    jest.clearAllMocks();
    mockStopGlobalTimerAndLog = jest.fn().mockResolvedValue(undefined);
    mockFormatDurationToHHMMSS.mockReset(); // Reset mock behavior too

    // Default AuthContext value for the Provider
    defaultMockContextValue = {
      user: mockUser,
      activeTimerInfo: undefined,
      login: () => Promise.resolve(),
      logout: () => Promise.resolve(),
      startGlobalTimer: () => Promise.resolve(),
      stopGlobalTimerAndLog: mockStopGlobalTimerAndLog,
      token: 'test-token',
      isLoading: false,
      login: jest.fn(),
      logout: jest.fn(),
      updateCurrentUserDetails: jest.fn(),
      startGlobalTimer: jest.fn(),
      clearGlobalTimerState: jest.fn(),
    };
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  const renderComponent = (contextOverrides = {}) => {
    mockContextValue = {
      ...mockContextValue,
      ...contextOverrides,
    };
    return render(
      <AuthProvider>
        <GlobalTimerDisplay />
      </AuthProvider>
    );
  };

  test('renders nothing if activeTimerInfo is null', () => {
    render(
      <AuthContext.Provider value={defaultMockContextValue}>
        <GlobalTimerDisplay />
      </AuthContext.Provider>
    );
    // The component itself renders a div, but it has specific classes when visible.
    // A more robust check might be for specific content that only appears when timer is active.
    // For now, checking for a specific text like "ACTIVE TIMER" which is only there when timer is active.
    expect(screen.queryByText(/active timer/i)).not.toBeInTheDocument();
  });

  test('renders nothing if user is not a freelancer', () => {
    const mockContextValue = {
      ...defaultMockContextValue,
      user: { id: 2, username: 'admin1', email: 'admin@example.com', role: UserRole.ADMIN }, // Not a freelancer
      activeTimerInfo: { jobCardId: 'jc1', jobCardTitle: 'Test Job', projectId: 'p1', startTime: new Date() } as ActiveTimerInfo,
    };
    render(
      <AuthContext.Provider value={mockContextValue}>
        <GlobalTimerDisplay />
      </AuthContext.Provider>
    );
    expect(screen.queryByText(/active timer/i)).not.toBeInTheDocument();
  });

  test('displays timer info and stop button when timer is active for a freelancer', async () => { // Made test async
    const startTime = new Date(new Date().getTime() - 5000); // 5 seconds ago
    mockFormatDurationToHHMMSS.mockReturnValue('00:00:05'); // Mock formatted output
    
    const specificMockUser: AuthUser = { id: 1, username: 'freelancer1', email: 'freelancer@example.com', role: UserRole.FREELANCER };
    const specificActiveTimerInfo: ActiveTimerInfo = { jobCardId: 'jc1', jobCardTitle: 'Test Job Card Title', projectId: 'p1', startTime };

    const mockContextValue = {
      ...defaultMockContextValue,
      user: specificMockUser, 
      activeTimerInfo: specificActiveTimerInfo,
      stopGlobalTimerAndLog: mockStopGlobalTimerAndLog, // Ensure this is passed correctly
    };
    render(
      <AuthContext.Provider value={mockContextValue}>
        <GlobalTimerDisplay />
      </AuthContext.Provider>
    );

    expect(await screen.findByText(/active timer/i)).toBeInTheDocument();
    expect(await screen.findByText(/Task: Test Job Card Title/i)).toBeInTheDocument(); // Corrected assertion
    expect(await screen.findByText('00:00:05')).toBeInTheDocument(); // Check for mocked elapsed time
    expect(screen.getByRole('button', { name: /stop/i })).toBeInTheDocument(); // Button role should be available synchronously
  });

  test('updates elapsed time every second', async () => { // Made test async
    const startTime = new Date();
    const mockContextValue = {
      ...defaultMockContextValue,
      user: { id: 1, username: 'freelancer1', email: 'freelancer@example.com', role: UserRole.FREELANCER },
      activeTimerInfo: { jobCardId: 'jc1', jobCardTitle: 'Test Job', projectId: 'p1', startTime } as ActiveTimerInfo,
      stopGlobalTimerAndLog: mockStopGlobalTimerAndLog,
    };

    // The module-level mock for formatDurationToHHMMSS already handles 0.
    // We can use mockReturnValueOnce for subsequent, different values if needed by the test logic.
    // For this test, the default mock behavior for 0 is what we want initially.
    // If specific sequences are vital beyond the default, mockReturnValueOnce can be chained.
    // For this specific test, the module mock should be enough for the first "00:00:00".
    // We'll then specifically mock for 1 and 2.
    mockFormatDurationToHHMMSS
      .mockReturnValueOnce('00:00:00') // For the initial call (seconds=0)
      .mockReturnValueOnce('00:00:01') // For the call when seconds=1
      .mockReturnValueOnce('00:00:02'); // For the call when seconds=2

    render(
      <AuthContext.Provider value={mockContextValue}>
        <GlobalTimerDisplay />
      </AuthContext.Provider>
    );

    // Initial state check:
    await waitFor(() => expect(screen.getByTestId('elapsed-time-display')).toHaveTextContent('00:00:00'));
    expect(mockFormatDurationToHHMMSS).toHaveBeenCalledWith(0); // This should be the first call


    act(() => {
      jest.advanceTimersByTime(1000);
    });
    await waitFor(() => expect(screen.getByTestId('elapsed-time-display')).toHaveTextContent('00:00:01'));
    expect(mockFormatDurationToHHMMSS).toHaveBeenCalledWith(1);


    act(() => {
      jest.advanceTimersByTime(1000);
    });
    await waitFor(() => expect(screen.getByTestId('elapsed-time-display')).toHaveTextContent('00:00:02'));
    expect(mockFormatDurationToHHMMSS).toHaveBeenCalledWith(2);
  });

  test('calls stopGlobalTimerAndLog on stop button click', async () => {
    window.prompt = jest.fn().mockReturnValue('User notes'); // Mock prompt for notes
    const startTime = new Date();
    const mockContextValue = {
      ...defaultMockContextValue,
      user: { id: 1, username: 'freelancer1', email: 'freelancer@example.com', role: UserRole.FREELANCER },
      activeTimerInfo: { jobCardId: 'jc1', jobCardTitle: 'Test Job', projectId: 'p1', startTime } as ActiveTimerInfo,
      stopGlobalTimerAndLog: mockStopGlobalTimerAndLog,
    };
    render(
      <AuthContext.Provider value={mockContextValue}>
        <GlobalTimerDisplay />
      </AuthContext.Provider>
    );

    const stopButton = screen.getByRole('button', { name: /Stop Timer/i });
    fireEvent.click(stopButton);

    await waitFor(() => {
      expect(mockStopGlobalTimerAndLog).toHaveBeenCalledWith('User notes');
    });
  });

  test('clears interval on unmount', () => {
    const clearIntervalSpy = jest.spyOn(window, 'clearInterval');
    const startTime = new Date();
    const mockContextValue = {
      ...defaultMockContextValue,
      user: { id: 1, username: 'freelancer1', email: 'freelancer@example.com', role: UserRole.FREELANCER },
      activeTimerInfo: { jobCardId: 'jc1', jobCardTitle: 'Test Job', projectId: 'p1', startTime } as ActiveTimerInfo,
      stopGlobalTimerAndLog: mockStopGlobalTimerAndLog,
    };
    const { unmount } = render(
      <AuthContext.Provider value={mockContextValue}>
        <GlobalTimerDisplay />
      </AuthContext.Provider>
    );
    unmount();
    expect(clearIntervalSpy).toHaveBeenCalled();
    clearIntervalSpy.mockRestore();
  });

  test('clears interval when activeTimerInfo becomes null', () => {
    const clearIntervalSpy = jest.spyOn(window, 'clearInterval');
    const startTime = new Date();

    let currentContextValue = { // Make it mutable for the test
      ...defaultMockContextValue,
      user: { id: 1, username: 'freelancer1', email: 'freelancer@example.com', role: UserRole.FREELANCER },
      activeTimerInfo: { jobCardId: 'jc1', jobCardTitle: 'Test Job', projectId: 'p1', startTime } as ActiveTimerInfo,
      stopGlobalTimerAndLog: mockStopGlobalTimerAndLog,
    };

    const { rerender } = render(
      <AuthContext.Provider value={currentContextValue}>
        <GlobalTimerDisplay />
      </AuthContext.Provider>
    );

    // Timer is active, interval should be set
    expect(clearIntervalSpy).not.toHaveBeenCalled();

    // Update context value to simulate timer stopping
    currentContextValue = { ...currentContextValue, activeTimerInfo: null };
    rerender(
      <AuthContext.Provider value={currentContextValue}>
        <GlobalTimerDisplay />
      </AuthContext.Provider>
    ); // Rerender with new context value

    expect(clearIntervalSpy).toHaveBeenCalled();
    clearIntervalSpy.mockRestore();
  });

  test('clears interval when activeTimerInfo becomes undefined', () => {
    const clearIntervalSpy = jest.spyOn(window, 'clearInterval');
    const startTime = new Date().toISOString();

    const { rerender } = renderComponent({
      activeTimerInfo: { jobCardId: 'jc1', jobCardTitle: 'Test Job', projectId: 'p1', startTime }
    });

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    mockContextValue = {
      ...mockContextValue,
      activeTimerInfo: undefined
    };

    rerender(
      <AuthProvider>
        <GlobalTimerDisplay />
      </AuthProvider>
    );

    expect(clearIntervalSpy).toHaveBeenCalled();
    clearIntervalSpy.mockRestore();
  });
});
