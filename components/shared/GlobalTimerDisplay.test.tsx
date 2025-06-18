import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { UserRole } from '../../types';
import GlobalTimerDisplay from './GlobalTimerDisplay';
<<<<<<< Updated upstream
import { useAuth, ActiveTimerInfo } from '../AuthContext'; // Import ActiveTimerInfo type
=======
import { useAuth, ActiveTimerInfo, AuthUser } from '../AuthContext'; // Import ActiveTimerInfo and AuthUser type
>>>>>>> Stashed changes
import * as constants from '../../constants';

// Mock AuthContext
jest.mock('../AuthContext');
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

// Mock constants or specific functions if they are complex
jest.mock('../../constants', () => ({
  ...jest.requireActual('../../constants'), // Import and retain default behavior
  formatDurationToHHMMSS: jest.fn((totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }),
}));
const mockFormatDurationToHHMMSS = constants.formatDurationToHHMMSS as jest.Mock;


describe('GlobalTimerDisplay', () => {
  let mockStopGlobalTimerAndLog: jest.Mock;
<<<<<<< Updated upstream
  const mockUser = { id: 'freelancer1', name: 'Freelancer User', role: UserRole.FREELANCER };
=======
  const mockUser: AuthUser = { id: 1, username: 'freelancer1', email: 'freelancer@example.com', role: UserRole.FREELANCER }; // Removed name property from main mockUser
>>>>>>> Stashed changes

  beforeEach(() => {
    jest.useFakeTimers(); // Use fake timers for interval testing
    jest.clearAllMocks();
    mockStopGlobalTimerAndLog = jest.fn().mockResolvedValue(undefined);
    mockFormatDurationToHHMMSS.mockClear(); // Clear mock usage counts for format function

    // Default AuthContext mock
    mockUseAuth.mockReturnValue({
      user: mockUser,
      activeTimerInfo: null,
      stopGlobalTimerAndLog: mockStopGlobalTimerAndLog,
      // Provide all required AuthContextType fields
      token: 'test-token',
      isLoading: false,
      login: jest.fn(),
      logout: jest.fn(),
      updateCurrentUserDetails: jest.fn(),
      startGlobalTimer: jest.fn(),
      clearGlobalTimerState: jest.fn(),
    });
  });

  afterEach(() => {
    jest.useRealTimers(); // Restore real timers after each test
  });

  test('renders nothing if activeTimerInfo is null', () => {
    render(<GlobalTimerDisplay />);
    // The component itself renders a div, but it has specific classes when visible.
    // A more robust check might be for specific content that only appears when timer is active.
    // For now, checking for a specific text like "ACTIVE TIMER" which is only there when timer is active.
    expect(screen.queryByText(/active timer/i)).not.toBeInTheDocument();
  });

  test('renders nothing if user is not a freelancer', () => {
    mockUseAuth.mockReturnValueOnce({
      ...mockUseAuth(),
<<<<<<< Updated upstream
      user: { id: 'admin1', name: 'Admin User', role: UserRole.ADMIN }, // Not a freelancer
=======
      user: { id: 2, username: 'admin1', email: 'admin@example.com', role: UserRole.ADMIN }, // Not a freelancer, removed 'name'
>>>>>>> Stashed changes
      activeTimerInfo: { jobCardId: 'jc1', jobCardTitle: 'Test Job', projectId: 'p1', startTime: new Date() } as ActiveTimerInfo,
    });
    render(<GlobalTimerDisplay />);
    expect(screen.queryByText(/active timer/i)).not.toBeInTheDocument();
  });

<<<<<<< Updated upstream
  test('displays timer info and stop button when timer is active for a freelancer', () => {
    const startTime = new Date(new Date().getTime() - 5000); // 5 seconds ago
    mockFormatDurationToHHMMSS.mockReturnValue('00:00:05'); // Mock formatted output

    mockUseAuth.mockReturnValueOnce({
      ...mockUseAuth(),
      activeTimerInfo: { jobCardId: 'jc1', jobCardTitle: 'Test Job Card Title', projectId: 'p1', startTime } as ActiveTimerInfo,
    });
    render(<GlobalTimerDisplay />);

    expect(screen.getByText(/active timer/i)).toBeInTheDocument();
    expect(screen.getByText('Test Job Card Title')).toBeInTheDocument();
    expect(screen.getByText('00:00:05')).toBeInTheDocument(); // Check for mocked elapsed time
    expect(screen.getByRole('button', { name: /stop/i })).toBeInTheDocument();
  });

  test('updates elapsed time every second', () => {
    const startTime = new Date();
    mockUseAuth.mockReturnValueOnce({
        ...mockUseAuth(),
        activeTimerInfo: { jobCardId: 'jc1', jobCardTitle: 'Test Job', projectId: 'p1', startTime } as ActiveTimerInfo,
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
<<<<<<< Updated upstream
    expect(screen.getByText('00:00:00')).toBeInTheDocument();
=======
    // Ensure component renders before advancing timers
    await screen.findByText(/active timer/i); // Wait for the timer UI to be visible
    expect(await screen.findByText('00:00:00')).toBeInTheDocument();
>>>>>>> Stashed changes

    act(() => {
      jest.advanceTimersByTime(1000); // Advance timer by 1 second
    });
    mockFormatDurationToHHMMSS.mockReturnValueOnce('00:00:01'); // After 1 sec
    // We need to re-query as the text content changes
<<<<<<< Updated upstream
    expect(screen.getByText('00:00:01')).toBeInTheDocument();
=======
    expect(await screen.findByText('00:00:01')).toBeInTheDocument();
>>>>>>> Stashed changes
    expect(mockFormatDurationToHHMMSS).toHaveBeenCalledWith(1);


    act(() => {
      jest.advanceTimersByTime(1000); // Advance timer by another 1 second
    });
    mockFormatDurationToHHMMSS.mockReturnValueOnce('00:00:02'); // After 2 secs
<<<<<<< Updated upstream
    expect(screen.getByText('00:00:02')).toBeInTheDocument();
=======
    expect(await screen.findByText('00:00:02')).toBeInTheDocument();
>>>>>>> Stashed changes
    expect(mockFormatDurationToHHMMSS).toHaveBeenCalledWith(2);
  });

  test('calls stopGlobalTimerAndLog on stop button click', async () => {
    window.prompt = jest.fn().mockReturnValue('User notes'); // Mock prompt for notes
    const startTime = new Date();
    mockUseAuth.mockReturnValueOnce({
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
    });
    render(<GlobalTimerDisplay />);

    const stopButton = screen.getByRole('button', { name: /stop/i });
    fireEvent.click(stopButton);

    await waitFor(() => expect(mockStopGlobalTimerAndLog).toHaveBeenCalledWith('User notes'));
  });

  test('clears interval on unmount', () => {
    const clearIntervalSpy = jest.spyOn(window, 'clearInterval');
    const startTime = new Date();
     mockUseAuth.mockReturnValueOnce({
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

});
