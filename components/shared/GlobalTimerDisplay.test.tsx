import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { UserRole } from '../../types';
import GlobalTimerDisplay from './GlobalTimerDisplay';
import { useAuth, ActiveTimerInfo, AuthUser } from '../AuthContext'; // Import ActiveTimerInfo and AuthUser type
>>>>>>> Stashed changes
import { useAuth, ActiveTimerInfo, AuthUser } from '../AuthContext'; // Import ActiveTimerInfo and AuthUser type
=======
import { useAuth, ActiveTimerInfo, AuthUser } from '../AuthContext'; // Import ActiveTimerInfo and AuthUser type
>>>>>>> Stashed changes
import * as constants from '../../constants';

// Mock AuthContext
jest.mock('../AuthContext');
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

// Mock API service and other dependencies first
jest.mock('../../constants', () => ({
  ...jest.requireActual('../../constants'),
  formatDurationToHHMMSS: jest.fn((totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }),
}));

// Create base context value
let mockContextValue: AuthContextType = {
  user: mockUser,
  activeTimerInfo: undefined,
  login: () => Promise.resolve(),
  logout: () => Promise.resolve(),
  startGlobalTimer: () => Promise.resolve(),
  stopGlobalTimerAndLog: () => Promise.resolve(),
  isAuthenticated: true,
  token: 'test-token',
  updateCurrentUserDetails: () => Promise.resolve(),
  clearGlobalTimerState: () => { },
  isLoading: false
};

// Mock AuthContext module
jest.mock('../../contexts/AuthContext', () => {
  const mockContext = React.createContext({} as AuthContextType);
  const mockUseAuth = () => React.useContext(mockContext);
  const MockProvider = ({ children }: { children: React.ReactNode }) => (
    <mockContext.Provider value={mockContextValue}>{children}</mockContext.Provider>
  );

  return {
    __esModule: true,
    useAuth: mockUseAuth,
    default: MockProvider,
  };
});

// Import after mocking
import GlobalTimerDisplay from './GlobalTimerDisplay';
import AuthProvider from '../../contexts/AuthContext';
import * as constants from '../../constants';

const mockFormatDurationToHHMMSS = constants.formatDurationToHHMMSS as jest.Mock;

describe('GlobalTimerDisplay', () => {
  let mockStopGlobalTimerAndLog: jest.Mock;
  const mockUser: AuthUser = { id: 1, username: 'freelancer1', email: 'freelancer@example.com', role: UserRole.FREELANCER }; // Removed name property from main mockUser
>>>>>>> Stashed changes
  const mockUser: AuthUser = { id: 1, username: 'freelancer1', email: 'freelancer@example.com', role: UserRole.FREELANCER };
=======
  const mockUser: AuthUser = { id: 1, username: 'freelancer1', email: 'freelancer@example.com', role: UserRole.FREELANCER }; // Removed name property from main mockUser
>>>>>>> Stashed changes

  beforeEach(() => {
    jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] });
    jest.clearAllMocks();
    mockStopGlobalTimerAndLog = jest.fn().mockResolvedValue(undefined);
    mockFormatDurationToHHMMSS.mockClear();

    // Reset mock context value
    mockContextValue = {
      user: mockUser,
      activeTimerInfo: undefined,
      login: () => Promise.resolve(),
      logout: () => Promise.resolve(),
      startGlobalTimer: () => Promise.resolve(),
      stopGlobalTimerAndLog: mockStopGlobalTimerAndLog,
      isAuthenticated: true,
      token: 'test-token',
      updateCurrentUserDetails: () => Promise.resolve(),
      clearGlobalTimerState: () => { },
      isLoading: false
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
    renderComponent();
    expect(screen.queryByText(/active timer/i)).not.toBeInTheDocument();
  });

  test('renders nothing if user is not a freelancer', () => {
    mockUseAuth.mockReturnValueOnce({
      ...mockUseAuth(),
      user: { id: 2, username: 'admin1', email: 'admin@example.com', role: UserRole.ADMIN }, // Not a freelancer, removed 'name'
>>>>>>> Stashed changes
      user: { id: 2, username: 'admin1', email: 'admin@example.com', role: UserRole.ADMIN }, // Not a freelancer
=======
      user: { id: 2, username: 'admin1', email: 'admin@example.com', role: UserRole.ADMIN }, // Not a freelancer, removed 'name'
>>>>>>> Stashed changes
      activeTimerInfo: { jobCardId: 'jc1', jobCardTitle: 'Test Job', projectId: 'p1', startTime: new Date() } as ActiveTimerInfo,
    });
    render(<GlobalTimerDisplay />);
    expect(screen.queryByText(/active timer/i)).not.toBeInTheDocument();
  });

  test('displays timer info and stop button when timer is active for a freelancer', async () => { // Made test async
    const startTime = new Date(new Date().getTime() - 5000); // 5 seconds ago
    mockFormatDurationToHHMMSS.mockReturnValue('00:00:05'); // Mock formatted output

    const specificMockUser: AuthUser = { id: 1, username: 'freelancer1', email: 'freelancer@example.com', role: UserRole.FREELANCER };
    const specificActiveTimerInfo: ActiveTimerInfo = { jobCardId: 'jc1', jobCardTitle: 'Test Job Card Title', projectId: 'p1', startTime };

    mockUseAuth.mockReturnValueOnce({
      user: specificMockUser,
      activeTimerInfo: specificActiveTimerInfo,
      token: 'test-token-specific',
      isLoading: false,
      login: jest.fn(),
      logout: jest.fn(),
      updateCurrentUserDetails: jest.fn().mockResolvedValue(true),
      startGlobalTimer: jest.fn(),
      stopGlobalTimerAndLog: mockStopGlobalTimerAndLog,
      clearGlobalTimerState: jest.fn(),
    });
    render(<GlobalTimerDisplay />);

    expect(await screen.findByText(/active timer/i)).toBeInTheDocument();
    expect(await screen.findByText('Test Job Card Title')).toBeInTheDocument();
    expect(await screen.findByText('00:00:05')).toBeInTheDocument(); // Check for mocked elapsed time
    expect(screen.getByRole('button', { name: /stop/i })).toBeInTheDocument(); // Button role should be available synchronously
  });

  test('updates elapsed time every second', async () => { // Made test async
    const startTime = new Date();
    mockUseAuth.mockReturnValueOnce({
      user: { id: 1, username: 'freelancer1', email: 'freelancer@example.com', role: UserRole.FREELANCER }, // Explicitly a freelancer
      activeTimerInfo: { jobCardId: 'jc1', jobCardTitle: 'Test Job', projectId: 'p1', startTime } as ActiveTimerInfo,
      token: 'test-token',
      isLoading: false,
      login: jest.fn(),
      logout: jest.fn(),
      updateCurrentUserDetails: jest.fn(),
      startGlobalTimer: jest.fn(),
      stopGlobalTimerAndLog: mockStopGlobalTimerAndLog, // Use the one from beforeEach
      clearGlobalTimerState: jest.fn(),
=======
  test('displays timer info and stop button when timer is active for a freelancer', async () => { // Made test async
    const startTime = new Date(new Date().getTime() - 5000); // 5 seconds ago
    mockFormatDurationToHHMMSS.mockReturnValue('00:00:05'); // Mock formatted output
    
    const specificMockUser: AuthUser = { id: 1, username: 'freelancer1', email: 'freelancer@example.com', role: UserRole.FREELANCER };
    const specificActiveTimerInfo: ActiveTimerInfo = { jobCardId: 'jc1', jobCardTitle: 'Test Job Card Title', projectId: 'p1', startTime };

    mockUseAuth.mockReturnValueOnce({
      user: specificMockUser, 
      activeTimerInfo: specificActiveTimerInfo,
      token: 'test-token-specific',
      isLoading: false,
      login: jest.fn(),
      logout: jest.fn(),
      updateCurrentUserDetails: jest.fn().mockResolvedValue(true),
      startGlobalTimer: jest.fn(),
      stopGlobalTimerAndLog: mockStopGlobalTimerAndLog, 
      clearGlobalTimerState: jest.fn(),
    });
    render(<GlobalTimerDisplay />);

    expect(await screen.findByText(/active timer/i)).toBeInTheDocument();
    expect(await screen.findByText('Test Job Card Title')).toBeInTheDocument();
    expect(await screen.findByText('00:00:05')).toBeInTheDocument(); // Check for mocked elapsed time
    expect(screen.getByRole('button', { name: /stop/i })).toBeInTheDocument(); // Button role should be available synchronously
  });

  test('updates elapsed time every second', async () => { // Made test async
    const startTime = new Date();
    mockUseAuth.mockReturnValueOnce({
      user: { id: 1, username: 'freelancer1', email: 'freelancer@example.com', role: UserRole.FREELANCER }, // Explicitly a freelancer
      activeTimerInfo: { jobCardId: 'jc1', jobCardTitle: 'Test Job', projectId: 'p1', startTime } as ActiveTimerInfo,
      token: 'test-token',
      isLoading: false,
      login: jest.fn(),
      logout: jest.fn(),
      updateCurrentUserDetails: jest.fn(),
      startGlobalTimer: jest.fn(),
      stopGlobalTimerAndLog: mockStopGlobalTimerAndLog, // Use the one from beforeEach
      clearGlobalTimerState: jest.fn(),
>>>>>>> Stashed changes
    });
    render(<GlobalTimerDisplay />);

    mockFormatDurationToHHMMSS.mockReturnValueOnce('00:00:00'); // Initial
    // Ensure component renders before advancing timers
    await screen.findByText(/active timer/i); // Wait for the timer UI to be visible
    expect(await screen.findByText('00:00:00')).toBeInTheDocument();
>>>>>>> Stashed changes
    // Ensure component renders before advancing timers
    await screen.findByText(/active timer/i); // Wait for the timer UI to be visible
    expect(await screen.findByText('00:00:00')).toBeInTheDocument();
=======
    // Ensure component renders before advancing timers
    await screen.findByText(/active timer/i); // Wait for the timer UI to be visible
    expect(await screen.findByText('00:00:00')).toBeInTheDocument();
>>>>>>> Stashed changes

    act(() => {
      jest.advanceTimersByTime(1000);
    });
    mockFormatDurationToHHMMSS.mockReturnValueOnce('00:00:01'); // After 1 sec
    // We need to re-query as the text content changes
    expect(await screen.findByText('00:00:01')).toBeInTheDocument();
>>>>>>> Stashed changes
    expect(await screen.findByText('00:00:01')).toBeInTheDocument();
=======
    expect(await screen.findByText('00:00:01')).toBeInTheDocument();
>>>>>>> Stashed changes
    expect(mockFormatDurationToHHMMSS).toHaveBeenCalledWith(1);


    act(() => {
      jest.advanceTimersByTime(1000);
    });
    mockFormatDurationToHHMMSS.mockReturnValueOnce('00:00:02'); // After 2 secs
    expect(await screen.findByText('00:00:02')).toBeInTheDocument();
>>>>>>> Stashed changes
    expect(await screen.findByText('00:00:02')).toBeInTheDocument();
=======
    expect(await screen.findByText('00:00:02')).toBeInTheDocument();
>>>>>>> Stashed changes
    expect(mockFormatDurationToHHMMSS).toHaveBeenCalledWith(2);
  });

  test('calls stopGlobalTimerAndLog on stop button click', async () => {
    window.prompt = jest.fn().mockReturnValue('User notes'); // Mock prompt for notes
    const startTime = new Date();
    mockUseAuth.mockReturnValueOnce({
      user: { id: 1, username: 'freelancer1', email: 'freelancer@example.com', role: UserRole.FREELANCER }, // Explicitly a freelancer
      activeTimerInfo: { jobCardId: 'jc1', jobCardTitle: 'Test Job', projectId: 'p1', startTime } as ActiveTimerInfo,
      token: 'test-token',
      isLoading: false,
      login: jest.fn(),
      logout: jest.fn(),
      updateCurrentUserDetails: jest.fn(),
      startGlobalTimer: jest.fn(),
      stopGlobalTimerAndLog: mockStopGlobalTimerAndLog, // Use the one from beforeEach
      clearGlobalTimerState: jest.fn(),
=======
      user: { id: 1, username: 'freelancer1', email: 'freelancer@example.com', role: UserRole.FREELANCER }, // Explicitly a freelancer
      activeTimerInfo: { jobCardId: 'jc1', jobCardTitle: 'Test Job', projectId: 'p1', startTime } as ActiveTimerInfo,
      token: 'test-token',
      isLoading: false,
      login: jest.fn(),
      logout: jest.fn(),
      updateCurrentUserDetails: jest.fn(),
      startGlobalTimer: jest.fn(),
      stopGlobalTimerAndLog: mockStopGlobalTimerAndLog, // Use the one from beforeEach
      clearGlobalTimerState: jest.fn(),
>>>>>>> Stashed changes
    });
    render(<GlobalTimerDisplay />);

    const stopButton = screen.getByRole('button', { name: /Stop Timer/i });
    fireEvent.click(stopButton);

    await waitFor(() => {
      expect(mockStopGlobalTimerAndLog).toHaveBeenCalledWith('User notes');
    });
  });

  test('clears interval on unmount', () => {
    const clearIntervalSpy = jest.spyOn(window, 'clearInterval');
    const startTime = new Date();
    mockUseAuth.mockReturnValueOnce({
      user: { id: 1, username: 'freelancer1', email: 'freelancer@example.com', role: UserRole.FREELANCER }, // Explicitly a freelancer
      activeTimerInfo: { jobCardId: 'jc1', jobCardTitle: 'Test Job', projectId: 'p1', startTime } as ActiveTimerInfo,
      token: 'test-token',
      isLoading: false,
      login: jest.fn(),
      logout: jest.fn(),
      updateCurrentUserDetails: jest.fn(),
      startGlobalTimer: jest.fn(),
      stopGlobalTimerAndLog: mockStopGlobalTimerAndLog, // Use the one from beforeEach
      clearGlobalTimerState: jest.fn(),
=======
      user: { id: 1, username: 'freelancer1', email: 'freelancer@example.com', role: UserRole.FREELANCER }, // Explicitly a freelancer
      activeTimerInfo: { jobCardId: 'jc1', jobCardTitle: 'Test Job', projectId: 'p1', startTime } as ActiveTimerInfo,
      token: 'test-token',
      isLoading: false,
      login: jest.fn(),
      logout: jest.fn(),
      updateCurrentUserDetails: jest.fn(),
      startGlobalTimer: jest.fn(),
      stopGlobalTimerAndLog: mockStopGlobalTimerAndLog, // Use the one from beforeEach
      clearGlobalTimerState: jest.fn(),
>>>>>>> Stashed changes
    });
    const { unmount } = render(<GlobalTimerDisplay />);
    unmount();
    expect(clearIntervalSpy).toHaveBeenCalled();
    clearIntervalSpy.mockRestore();
  });

  test('clears interval when activeTimerInfo becomes null', () => {
    const clearIntervalSpy = jest.spyOn(window, 'clearInterval');
    const startTime = new Date();
    const initialAuthValue = {
<<<<<<< Updated upstream
      ...mockUseAuth(),
      activeTimerInfo: { jobCardId: 'jc1', jobCardTitle: 'Test Job', projectId: 'p1', startTime } as ActiveTimerInfo,
=======
      user: { id: 1, username: 'freelancer1', email: 'freelancer@example.com', role: UserRole.FREELANCER }, // Explicitly a freelancer
      activeTimerInfo: { jobCardId: 'jc1', jobCardTitle: 'Test Job', projectId: 'p1', startTime } as ActiveTimerInfo,
      token: 'test-token',
      isLoading: false,
      login: jest.fn(),
      logout: jest.fn(),
      updateCurrentUserDetails: jest.fn(),
      startGlobalTimer: jest.fn(),
      stopGlobalTimerAndLog: mockStopGlobalTimerAndLog, // Use the one from beforeEach
      clearGlobalTimerState: jest.fn(),
>>>>>>> Stashed changes
    };
    mockUseAuth.mockReturnValue(initialAuthValue); // Use mockReturnValue to allow updates

    const { rerender } = render(<GlobalTimerDisplay />);

    // Timer is active, interval should be set
    expect(clearIntervalSpy).not.toHaveBeenCalled();

    // Update context value to simulate timer stopping
    mockUseAuth.mockReturnValue({ ...initialAuthValue, activeTimerInfo: null });
    rerender(<GlobalTimerDisplay />); // Rerender with new context value

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
