import React from 'react';
<<<<<<< Updated upstream
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { UserRole } from '../../types';
=======
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { UserRole, AuthUser } from '../../types'; // Import AuthUser
>>>>>>> Stashed changes
import FreelancerTimeTrackingPage from './FreelancerTimeTrackingPage';
import { useAuth } from '../AuthContext';
import * as apiService from '../../apiService';

// Mock API service
<<<<<<< Updated upstream
jest.mock('../../apiService');
const mockFetchFreelancerJobCardsAPI = apiService.fetchFreelancerJobCardsAPI as jest.Mock;
const mockFetchMyTimeLogsAPI = apiService.fetchMyTimeLogsAPI as jest.Mock;
const mockAddTimeLogAPI = apiService.addTimeLogAPI as jest.Mock; // Used by manual log
=======
jest.mock('../../apiService', () => ({
 __esModule: true,
 ...jest.requireActual('../../apiService'), // Keep other exports
 fetchFreelancerJobCardsAPI: jest.fn(),
 fetchMyTimeLogsAPI: jest.fn(),
 addTimeLogAPI: jest.fn(),
}));
>>>>>>> Stashed changes

// Mock AuthContext
jest.mock('../AuthContext');
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

const mockJobCards = [
  { id: 'jc1', title: 'Job Card 1', projectId: 'proj1', description: 'Description 1', status: 'ToDo' },
  { id: 'jc2', title: 'Job Card 2', projectId: 'proj2', description: 'Description 2', status: 'InProgress' },
];

const mockTimeLogs = [
<<<<<<< Updated upstream
  { id: 'tl1', jobCardId: 'jc1', architectId: 'freelancer1', startTime: new Date().toISOString(), endTime: new Date().toISOString(), durationMinutes: 60, notes: 'Log 1', manualEntry: false },
=======
  { id: 'tl1', jobCardId: 'jc1', architectId: 'freelancer1', startTime: new Date().toISOString(), endTime: new Date().toISOString(), durationMinutes: 60, notes: 'Log 1', manualEntry: false, createdAt: new Date().toISOString() },
>>>>>>> Stashed changes
];

describe('FreelancerTimeTrackingPage', () => {
  let mockStartGlobalTimer: jest.Mock;
  let mockStopGlobalTimerAndLog: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
<<<<<<< Updated upstream
=======
    window.alert = jest.fn(); // Mock window.alert
>>>>>>> Stashed changes
    mockStartGlobalTimer = jest.fn();
    mockStopGlobalTimerAndLog = jest.fn().mockResolvedValue(undefined); // Mock it as an async function

    mockUseAuth.mockReturnValue({
<<<<<<< Updated upstream
      user: { id: 'freelancer1', name: 'Freelancer User', role: UserRole.FREELANCER },
=======
      user: { id: 1, username: 'Freelancer User', name: 'Freelancer User', email: 'freelancer@example.com', role: UserRole.FREELANCER } as AuthUser,
>>>>>>> Stashed changes
      token: 'test-token',
      isLoading: false,
      login: jest.fn(),
      logout: jest.fn(),
      updateCurrentUserDetails: jest.fn(),
      activeTimerInfo: null,
      startGlobalTimer: mockStartGlobalTimer,
      stopGlobalTimerAndLog: mockStopGlobalTimerAndLog,
      clearGlobalTimerState: jest.fn(),
    });

<<<<<<< Updated upstream
    mockFetchFreelancerJobCardsAPI.mockResolvedValue(mockJobCards);
    mockFetchMyTimeLogsAPI.mockResolvedValue(mockTimeLogs);
    mockAddTimeLogAPI.mockResolvedValue({ id: 'newLog', ...mockTimeLogs[0] }); // Mock successful manual log
=======
    (apiService.fetchFreelancerJobCardsAPI as jest.Mock).mockResolvedValue(mockJobCards);
    (apiService.fetchMyTimeLogsAPI as jest.Mock).mockResolvedValue(mockTimeLogs);
    // Fix duplicate 'id' property warning and add createdAt
    const { id: _removedId, createdAt: _removedCreatedAt, ...restOfMockTimeLog } = mockTimeLogs[0];
    (apiService.addTimeLogAPI as jest.Mock).mockResolvedValue({ id: 'newLog', ...restOfMockTimeLog, createdAt: new Date().toISOString() }); // Mock successful manual log
>>>>>>> Stashed changes
  });

  test('renders loading state initially', () => {
    mockUseAuth.mockReturnValueOnce({ // Override for this specific test
        ...mockUseAuth(),
        isLoading: true, // Auth loading
    });
    render(<FreelancerTimeTrackingPage />);
    expect(screen.getByText(/loading page data.../i)).toBeInTheDocument();
  });

  test('displays fetched job cards and time logs correctly', async () => {
    render(<FreelancerTimeTrackingPage />);
<<<<<<< Updated upstream
    await waitFor(() => expect(mockFetchFreelancerJobCardsAPI).toHaveBeenCalledWith('freelancer1'));
    await waitFor(() => expect(mockFetchMyTimeLogsAPI).toHaveBeenCalledWith('freelancer1'));
=======
    await waitFor(() => expect(apiService.fetchFreelancerJobCardsAPI as jest.Mock).toHaveBeenCalledWith("1")); // ID is string
    await waitFor(() => expect(apiService.fetchMyTimeLogsAPI as jest.Mock).toHaveBeenCalledWith("1")); // ID is string
>>>>>>> Stashed changes

    expect(screen.getByText('Job Card 1 (Project ID: proj1)')).toBeInTheDocument();
    expect(screen.getByText('Job Card 2 (Project ID: proj2)')).toBeInTheDocument();
    expect(screen.getByText('Log 1')).toBeInTheDocument(); // Check if notes are rendered
  });

  test('displays "no job cards" message if none are returned', async () => {
<<<<<<< Updated upstream
    mockFetchFreelancerJobCardsAPI.mockResolvedValueOnce([]);
=======
    (apiService.fetchFreelancerJobCardsAPI as jest.Mock).mockResolvedValueOnce([]);
>>>>>>> Stashed changes
    render(<FreelancerTimeTrackingPage />);
    await waitFor(() => expect(screen.getByText(/no job cards assigned to you yet/i)).toBeInTheDocument());
  });

  describe('Timer Functionality (Global Context)', () => {
    test('clicking "Start Timer" calls startGlobalTimer from context', async () => {
      render(<FreelancerTimeTrackingPage />);
      await waitFor(() => screen.getByText('Job Card 1 (Project ID: proj1)'));

      const startButtons = screen.getAllByText('Start Timer');
      fireEvent.click(startButtons[0]); // Click start for Job Card 1

      expect(mockStartGlobalTimer).toHaveBeenCalledWith('jc1', 'Job Card 1', 'proj1');
    });

    test('displays "Stop Timer" for the active job card from context', async () => {
      mockUseAuth.mockReturnValueOnce({
        ...mockUseAuth(),
        activeTimerInfo: { jobCardId: 'jc1', jobCardTitle: 'Job Card 1', projectId: 'proj1', startTime: new Date() },
      });
      render(<FreelancerTimeTrackingPage />);
<<<<<<< Updated upstream
      await waitFor(() => screen.getByText('Job Card 1 (Project ID: proj1)'));

      const buttons = screen.getAllByRole('button');
      // Find the button related to Job Card 1
      const jobCard1Li = screen.getByText('Job Card 1 (Project ID: proj1)').closest('li');
      const stopButtonForJC1 = Array.from(jobCard1Li!.querySelectorAll('button')).find(b => b.textContent?.includes('Stop Timer'));
=======
      // Wait for the specific job card to render fully, including its "Stop Timer" button
      const jobCard1Li = await screen.findByText('Job Card 1 (Project ID: proj1)');
      const listItemElement = jobCard1Li.closest('li');
      expect(listItemElement).toBeInTheDocument();

      // Wait for the "Stop Timer" button to appear within this specific list item
      const stopButtonForJC1 = await within(listItemElement!).findByRole('button', { name: /stop timer/i });
>>>>>>> Stashed changes
      expect(stopButtonForJC1).toBeInTheDocument();

      // Check that other job cards still show "Start Timer" or are disabled
      const jobCard2Li = screen.getByText('Job Card 2 (Project ID: proj2)').closest('li');
      const startButtonForJC2 = Array.from(jobCard2Li!.querySelectorAll('button')).find(b => b.textContent?.includes('Start Timer'));
      expect(startButtonForJC2).toHaveStyle('cursor: not-allowed'); // Or check if disabled
    });

    test('clicking "Stop Timer" calls stopGlobalTimerAndLog from context', async () => {
      window.prompt = jest.fn().mockReturnValue(''); // Mock prompt for notes

      mockUseAuth.mockReturnValueOnce({
        ...mockUseAuth(),
        activeTimerInfo: { jobCardId: 'jc1', jobCardTitle: 'Job Card 1', projectId: 'proj1', startTime: new Date() },
      });
      render(<FreelancerTimeTrackingPage />);
<<<<<<< Updated upstream
      await waitFor(() => screen.getByText('Job Card 1 (Project ID: proj1)'));

      const jobCard1Li = screen.getByText('Job Card 1 (Project ID: proj1)').closest('li');
      const stopButtonForJC1 = Array.from(jobCard1Li!.querySelectorAll('button')).find(b => b.textContent?.includes('Stop Timer'));
      fireEvent.click(stopButtonForJC1!);

      expect(mockStopGlobalTimerAndLog).toHaveBeenCalledWith(undefined); // Called with undefined notes as prompt returns ''
      await waitFor(() => expect(mockFetchMyTimeLogsAPI).toHaveBeenCalledTimes(2)); // Initial + refresh after stop
=======
      const jobCard1TextElement = await screen.findByText('Job Card 1 (Project ID: proj1)');
      const jobCard1Li = jobCard1TextElement.closest('li');
      expect(jobCard1Li).toBeInTheDocument(); // Ensure the li is found

      // Wait for the "Stop Timer" button to appear within this specific list item
      const stopButtonForJC1 = await within(jobCard1Li!).findByRole('button', { name: /stop timer/i });
      expect(stopButtonForJC1).toBeInTheDocument(); // Ensure button is found before click
      fireEvent.click(stopButtonForJC1);

      expect(mockStopGlobalTimerAndLog).toHaveBeenCalledWith(undefined); // Called with undefined notes as prompt returns ''
      await waitFor(() => expect(apiService.fetchMyTimeLogsAPI as jest.Mock).toHaveBeenCalledTimes(2)); // Initial + refresh after stop
>>>>>>> Stashed changes
    });
  });

  describe('Manual Time Log', () => {
    test('modal opens on "Log Time Manually" click', async () => {
      render(<FreelancerTimeTrackingPage />);
      await waitFor(() => screen.getByText('Job Card 1 (Project ID: proj1)'));

      const manualLogButtons = screen.getAllByText('Log Time Manually');
      fireEvent.click(manualLogButtons[0]);

      expect(screen.getByRole('heading', { name: /log time manually for: job card 1/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/date/i)).toBeInTheDocument();
    });

    test('form submission calls addTimeLogAPI and refreshes logs', async () => {
        render(<FreelancerTimeTrackingPage />);
        await waitFor(() => screen.getByText('Job Card 1 (Project ID: proj1)'));

        fireEvent.click(screen.getAllByText('Log Time Manually')[0]); // Open for jc1

        // Fill form
        fireEvent.change(screen.getByLabelText(/date/i), { target: { value: '2023-10-01' } });
        fireEvent.change(screen.getByLabelText(/start time/i), { target: { value: '09:00' } });
        fireEvent.change(screen.getByLabelText(/end time/i), { target: { value: '10:00' } });
        fireEvent.change(screen.getByLabelText(/notes/i), { target: { value: 'Manual log test' } });

        fireEvent.click(screen.getByRole('button', {name: /submit log/i}));

<<<<<<< Updated upstream
        await waitFor(() => expect(mockAddTimeLogAPI).toHaveBeenCalledWith(
=======
        await waitFor(() => expect(apiService.addTimeLogAPI as jest.Mock).toHaveBeenCalledWith(
>>>>>>> Stashed changes
          'proj1', // projectId for jc1
          'jc1',   // jobCardId
          expect.objectContaining({
            startTime: new Date('2023-10-01T09:00:00').toISOString(),
            endTime: new Date('2023-10-01T10:00:00').toISOString(),
            durationMinutes: 60,
            notes: 'Manual log test',
            manualEntry: true,
<<<<<<< Updated upstream
            architectId: 'freelancer1',
          })
        ));
        expect(screen.queryByRole('heading', { name: /log time manually for: job card 1/i })).not.toBeInTheDocument(); // Modal closes
        expect(mockFetchMyTimeLogsAPI).toHaveBeenCalledTimes(2); // Initial + refresh
    });

    test('shows error on addTimeLogAPI failure', async () => {
        mockAddTimeLogAPI.mockRejectedValueOnce(new Error('API Error Manual Log'));
=======
            architectId: "1", // ID is string, as passed from component
          })
        ));
        expect(screen.queryByRole('heading', { name: /log time manually for: job card 1/i })).not.toBeInTheDocument(); // Modal closes
        expect(apiService.fetchMyTimeLogsAPI as jest.Mock).toHaveBeenCalledTimes(2); // Initial + refresh
    });

    test('shows error on addTimeLogAPI failure', async () => {
        (apiService.addTimeLogAPI as jest.Mock).mockRejectedValueOnce(new Error('API Error Manual Log'));
>>>>>>> Stashed changes
        window.alert = jest.fn(); // Mock alert for error messages

        render(<FreelancerTimeTrackingPage />);
        await waitFor(() => screen.getByText('Job Card 1 (Project ID: proj1)'));
        fireEvent.click(screen.getAllByText('Log Time Manually')[0]);
        fireEvent.change(screen.getByLabelText(/date/i), { target: { value: '2023-10-01' } });
        fireEvent.change(screen.getByLabelText(/start time/i), { target: { value: '09:00' } });
        fireEvent.change(screen.getByLabelText(/end time/i), { target: { value: '10:00' } });
        fireEvent.click(screen.getByRole('button', {name: /submit log/i}));

        await waitFor(() => expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('API Error Manual Log')));
        window.alert = jest.fn(); // Clear mock for other tests
    });

    test('shows validation error for end time before start time', async () => {
        window.alert = jest.fn();
        render(<FreelancerTimeTrackingPage />);
        await waitFor(() => screen.getByText('Job Card 1 (Project ID: proj1)'));
        fireEvent.click(screen.getAllByText('Log Time Manually')[0]);

        fireEvent.change(screen.getByLabelText(/date/i), { target: { value: '2023-10-01' } });
        fireEvent.change(screen.getByLabelText(/start time/i), { target: { value: '10:00' } });
        fireEvent.change(screen.getByLabelText(/end time/i), { target: { value: '09:00' } });
        fireEvent.click(screen.getByRole('button', {name: /submit log/i}));

        expect(window.alert).toHaveBeenCalledWith('End time must be after start time.');
<<<<<<< Updated upstream
        expect(mockAddTimeLogAPI).not.toHaveBeenCalled();
=======
        expect(apiService.addTimeLogAPI as jest.Mock).not.toHaveBeenCalled();
>>>>>>> Stashed changes
        window.alert = jest.fn();
    });
  });
});
