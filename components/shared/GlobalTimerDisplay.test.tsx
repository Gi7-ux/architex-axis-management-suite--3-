import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { UserRole, ActiveTimerInfo, AuthUser } from '../../types';
import GlobalTimerDisplay from './GlobalTimerDisplay';
import { AuthProvider, AuthContext } from '../../contexts/AuthContext'; // Correct imports
import * as constants from '../../constants';

// Mock constants or specific functions if they are complex
jest.mock('../../constants', () => {
  const originalConstants = jest.requireActual('../../constants');
  return {
    ...originalConstants,
    formatDurationToHHMMSS: jest.fn((totalSeconds: number) => {
      if (totalSeconds === 0) {
        return '00:00:00';
      }
      const hours = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
      const minutes = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
      const seconds = Math.floor(totalSeconds % 60).toString().padStart(2, '0');
      return `${hours}:${minutes}:${seconds}`;
    }),
  };
});
const mockFormatDurationToHHMMSS = constants.formatDurationToHHMMSS as jest.Mock;

describe('GlobalTimerDisplay', () => {
  let mockStopGlobalTimerAndLog: jest.Mock;
  const mockUser: AuthUser = { id: 1, username: 'freelancer1', email: 'freelancer@example.com', name: 'Freelancer User', role: UserRole.FREELANCER };

  let defaultMockContextValue: any;

  beforeEach(() => {
    jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] });
    jest.clearAllMocks();
    mockStopGlobalTimerAndLog = jest.fn().mockResolvedValue(undefined);
    mockFormatDurationToHHMMSS.mockReset();

    defaultMockContextValue = {
      user: mockUser,
      activeTimerInfo: undefined,
      login: jest.fn(),
      logout: jest.fn(),
      startGlobalTimer: jest.fn(),
      stopGlobalTimerAndLog: mockStopGlobalTimerAndLog,
      token: 'test-token',
      isLoading: false,
      updateCurrentUserDetails: jest.fn(),
      clearGlobalTimerState: jest.fn(),
    };
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  const renderComponent = (contextOverrides = {}) => {
    const currentMockContextValue = {
      ...defaultMockContextValue,
      ...contextOverrides,
    };
    return render(
      <AuthContext.Provider value={currentMockContextValue}>
        <GlobalTimerDisplay />
      </AuthContext.Provider>
    );
  };

  test('renders nothing if activeTimerInfo is null', () => {
    renderComponent();
    expect(screen.queryByText(/active timer/i)).not.toBeInTheDocument();
  });

  test('renders nothing if user is not a freelancer', () => {
    const mockContextValue = {
      ...defaultMockContextValue,
      user: { id: 2, username: 'admin1', email: 'admin@example.com', role: UserRole.ADMIN },
      activeTimerInfo: { jobCardId: 'jc1', jobCardTitle: 'Test Job', projectId: 'p1', startTime: new Date() } as ActiveTimerInfo,
    };
    renderComponent(mockContextValue);
    expect(screen.queryByText(/active timer/i)).not.toBeInTheDocument();
  });

  test('displays timer info and stop button when timer is active for a freelancer', async () => {
    const startTime = new Date(new Date().getTime() - 5000);
    mockFormatDurationToHHMMSS.mockReturnValue('00:00:05');
    
    const specificMockUser: AuthUser = { id: 1, username: 'freelancer1', email: 'freelancer@example.com', name: 'Freelancer User', role: UserRole.FREELANCER };
    const specificActiveTimerInfo: ActiveTimerInfo = { jobCardId: 'jc1', jobCardTitle: 'Test Job Card Title', projectId: 'p1', startTime };

    const mockContextValue = {
      ...defaultMockContextValue,
      user: specificMockUser, 
      activeTimerInfo: specificActiveTimerInfo,
      stopGlobalTimerAndLog: mockStopGlobalTimerAndLog,
    };
    renderComponent(mockContextValue);

    expect(await screen.findByText(/active timer/i)).toBeInTheDocument();
    expect(await screen.findByText(/Task: Test Job Card Title/i)).toBeInTheDocument();
    expect(await screen.findByText('00:00:05')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /stop/i })).toBeInTheDocument();
  });

  test('updates elapsed time every second', async () => {
    const startTime = new Date();
    const mockContextValue = {
      ...defaultMockContextValue,
      user: { id: 1, username: 'freelancer1', email: 'freelancer@example.com', name: 'Freelancer User', role: UserRole.FREELANCER },
      activeTimerInfo: { jobCardId: 'jc1', jobCardTitle: 'Test Job', projectId: 'p1', startTime } as ActiveTimerInfo,
      stopGlobalTimerAndLog: mockStopGlobalTimerAndLog,
    };

    mockFormatDurationToHHMMSS
      .mockReturnValueOnce('00:00:00')
      .mockReturnValueOnce('00:00:01')
      .mockReturnValueOnce('00:00:02');

    renderComponent(mockContextValue);

    await waitFor(() => expect(screen.getByTestId('elapsed-time-display')).toHaveTextContent('00:00:00'));
    expect(mockFormatDurationToHHMMSS).toHaveBeenCalledWith(0);

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
    window.prompt = jest.fn().mockReturnValue('User notes');
    const startTime = new Date();
    const mockContextValue = {
      ...defaultMockContextValue,
      user: { id: 1, username: 'freelancer1', email: 'freelancer@example.com', name: 'Freelancer User', role: UserRole.FREELANCER },
      activeTimerInfo: { jobCardId: 'jc1', jobCardTitle: 'Test Job', projectId: 'p1', startTime } as ActiveTimerInfo,
      stopGlobalTimerAndLog: mockStopGlobalTimerAndLog,
    };
    renderComponent(mockContextValue);

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
    const { unmount } = renderComponent(mockContextValue);
    unmount();
    expect(clearIntervalSpy).toHaveBeenCalled();
    clearIntervalSpy.mockRestore();
  });

  test('clears interval when activeTimerInfo becomes null', () => {
    const clearIntervalSpy = jest.spyOn(window, 'clearInterval');
    const startTime = new Date();

    let currentContextValue = {
      ...defaultMockContextValue,
      user: { id: 1, username: 'freelancer1', email: 'freelancer@example.com', name: 'Freelancer User', role: UserRole.FREELANCER },
      activeTimerInfo: { jobCardId: 'jc1', jobCardTitle: 'Test Job', projectId: 'p1', startTime } as ActiveTimerInfo,
      stopGlobalTimerAndLog: mockStopGlobalTimerAndLog,
    };

    const { rerender } = render(
      <AuthContext.Provider value={currentContextValue}>
        <GlobalTimerDisplay />
      </AuthContext.Provider>
    );

    expect(clearIntervalSpy).not.toHaveBeenCalled();

    currentContextValue = { ...currentContextValue, activeTimerInfo: null };
    rerender(
      <AuthContext.Provider value={currentContextValue}>
        <GlobalTimerDisplay />
      </AuthContext.Provider>
    );

    expect(clearIntervalSpy).toHaveBeenCalled();
    clearIntervalSpy.mockRestore();
  });

  test('clears interval when activeTimerInfo becomes undefined', () => {
    const clearIntervalSpy = jest.spyOn(window, 'clearInterval');
    const startTime = new Date();

    const { rerender } = renderComponent({
      activeTimerInfo: { jobCardId: 'jc1', jobCardTitle: 'Test Job', projectId: 'p1', startTime }
    });

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    const updatedContextValue = {
      ...defaultMockContextValue,
      activeTimerInfo: undefined
    };

    rerender(
      <AuthContext.Provider value={updatedContextValue}>
        <GlobalTimerDisplay />
      </AuthContext.Provider>
    );

    expect(clearIntervalSpy).toHaveBeenCalled();
    clearIntervalSpy.mockRestore();
  });
});
