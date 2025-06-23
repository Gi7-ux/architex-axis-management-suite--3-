import React from 'react';
import { render, screen, fireEvent, waitFor, within, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { UserRole, AuthUser } from '../../types'; // Import AuthUser
import FreelancerTimeTrackingPage from './FreelancerTimeTrackingPage';
import { useAuth } from '../AuthContext';
import * as apiService from '../../apiService';

// Mock API service
jest.mock('../../apiService', () => ({
 __esModule: true,
 ...jest.requireActual('../../apiService'), // Keep other exports
 fetchFreelancerJobCardsAPI: jest.fn(),
 fetchMyTimeLogsAPI: jest.fn(),
 addTimeLogAPI: jest.fn(),
}));

// Mock AuthContext
jest.mock('../AuthContext');
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

const mockJobCards = [
  { id: 'jc1', title: 'Job Card 1', projectId: 'proj1', description: 'Description 1', status: 'ToDo' },
  { id: 'jc2', title: 'Job Card 2', projectId: 'proj2', description: 'Description 2', status: 'InProgress' },
];

const mockTimeLogs = [
  { id: 'tl1', jobCardId: 'jc1', architectId: 'freelancer1', startTime: new Date().toISOString(), endTime: new Date().toISOString(), durationMinutes: 60, notes: 'Log 1', manualEntry: false, createdAt: new Date().toISOString() },
];

describe('FreelancerTimeTrackingPage', () => {
  let mockStartGlobalTimer: jest.Mock;
  let mockStopGlobalTimerAndLog: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    window.alert = jest.fn(); // Mock window.alert
    mockStartGlobalTimer = jest.fn();
    mockStopGlobalTimerAndLog = jest.fn().mockResolvedValue(undefined); // Mock it as an async function

    mockUseAuth.mockReturnValue({
      user: { id: 1, username: 'Freelancer User', name: 'Freelancer User', email: 'freelancer@example.com', role: UserRole.FREELANCER } as AuthUser,
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

    (apiService.fetchFreelancerJobCardsAPI as jest.Mock).mockResolvedValue(mockJobCards);
    (apiService.fetchMyTimeLogsAPI as jest.Mock).mockResolvedValue(mockTimeLogs);
    // Fix duplicate 'id' property warning and add createdAt
    const { id: _removedId, createdAt: _removedCreatedAt, ...restOfMockTimeLog } = mockTimeLogs[0];
    (apiService.addTimeLogAPI as jest.Mock).mockResolvedValue({ id: 'newLog', ...restOfMockTimeLog, createdAt: new Date().toISOString() }); // Mock successful manual log
  });

  test('renders loading state initially', () => {
    // For this specific test, we want to see the loading state, so we don't wait for it to disappear.
    // We also need to ensure the mock API calls don't resolve immediately.
    (apiService.fetchFreelancerJobCardsAPI as jest.Mock).mockImplementationOnce(() => new Promise(() => {}));
    (apiService.fetchMyTimeLogsAPI as jest.Mock).mockImplementationOnce(() => new Promise(() => {}));

    render(<FreelancerTimeTrackingPage />);
    expect(screen.getByText(/loading page data.../i)).toBeInTheDocument();
  });

  test('displays fetched job cards and time logs correctly', async () => {
    render(<FreelancerTimeTrackingPage />);
    // Wait for loading to complete by checking for an element that appears after loading
    await waitFor(() => expect(screen.queryByText(/loading page data.../i)).not.toBeInTheDocument());

    // API calls should have been made during the loading phase
    expect(apiService.fetchFreelancerJobCardsAPI as jest.Mock).toHaveBeenCalledWith("1");
    expect(apiService.fetchMyTimeLogsAPI as jest.Mock).toHaveBeenCalledWith("1");

    expect(screen.getByText('Job Card 1 (Project ID: proj1)')).toBeInTheDocument();
    expect(screen.getByText('Job Card 2 (Project ID: proj2)')).toBeInTheDocument();
    expect(screen.getByText('Log 1')).toBeInTheDocument(); // Check if notes are rendered
  });

  test('displays "no job cards" message if none are returned', async () => {
    (apiService.fetchFreelancerJobCardsAPI as jest.Mock).mockResolvedValueOnce([]);
    render(<FreelancerTimeTrackingPage />);
    await waitFor(() => expect(screen.queryByText(/loading page data.../i)).not.toBeInTheDocument());
    expect(screen.getByText(/no job cards assigned to you yet/i)).toBeInTheDocument();
  });

  describe('Timer Functionality (Global Context)', () => {
    test('clicking "Start Timer" calls startGlobalTimer from context', async () => {
      render(<FreelancerTimeTrackingPage />);
      await waitFor(() => expect(screen.queryByText(/loading page data.../i)).not.toBeInTheDocument());
      expect(screen.getByText('Job Card 1 (Project ID: proj1)')).toBeInTheDocument(); // Ensure content is loaded

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
      // Override the default mock from beforeEach for this specific test case
      mockUseAuth.mockReturnValue({
        user: { id: 1, username: 'Freelancer User', name: 'Freelancer User', email: 'freelancer@example.com', role: UserRole.FREELANCER } as AuthUser,
        activeTimerInfo: { jobCardId: 'jc1', jobCardTitle: 'Job Card 1', projectId: 'proj1', startTime: new Date() },
        token: 'test-token',
        isLoading: false, // Mock auth loading as false for this state
        login: jest.fn(),
        logout: jest.fn(),
        updateCurrentUserDetails: jest.fn(),
        startGlobalTimer: mockStartGlobalTimer, // Ensure these are defined, e.g., from beforeEach
        stopGlobalTimerAndLog: mockStopGlobalTimerAndLog,
        clearGlobalTimerState: jest.fn(),
      });

      render(<FreelancerTimeTrackingPage />);
      // Wait for loading to complete and content to be available
      await waitFor(() => expect(screen.queryByText(/loading page data.../i)).not.toBeInTheDocument());
      const jobCard1Elements = await screen.findAllByText('Job Card 1 (Project ID: proj1)');
      const jobCard1Li = jobCard1Elements[0]; // Assume first one is the target
      const listItemElement = jobCard1Li.closest('li');
      expect(listItemElement).toBeInTheDocument();

      // Wait for the button associated with Job Card 1 to actually display "Stop Timer"
      await waitFor(() => {
        const buttonsInCard = within(listItemElement!).getAllByRole('button');
        // Assuming the Start/Stop/Logging button is consistently the first one in the card's button group.
        // If the order can change or more buttons are added, a data-testid would be more robust.
        const actionButton = buttonsInCard[0];
        expect(actionButton).toHaveTextContent(/stop timer/i);
      });

      // After waitFor confirms the text, get the button again for further interaction or specific checks if needed.
      const stopButtonForJC1 = within(listItemElement!).getByRole('button', {name: /stop timer/i});
      expect(stopButtonForJC1).toBeInTheDocument();


      // Check that other job cards still show "Start Timer" or are disabled
      const jobCard2Elements = await screen.findAllByText('Job Card 2 (Project ID: proj2)');
      const jobCard2Li = jobCard2Elements[0].closest('li');
      const startButtonForJC2 = Array.from(jobCard2Li!.querySelectorAll('button')).find(b => b.textContent?.includes('Start Timer'));
      expect(startButtonForJC2).toHaveStyle('cursor: not-allowed'); // Or check if disabled
    });

    test('clicking "Stop Timer" calls stopGlobalTimerAndLog from context', async () => {
      window.prompt = jest.fn().mockReturnValue(''); // Mock prompt for notes

      // Override the default mock from beforeEach for this specific test case
      mockUseAuth.mockReturnValue({
        user: { id: 1, username: 'Freelancer User', name: 'Freelancer User', email: 'freelancer@example.com', role: UserRole.FREELANCER } as AuthUser,
        activeTimerInfo: { jobCardId: 'jc1', jobCardTitle: 'Job Card 1', projectId: 'proj1', startTime: new Date() },
        token: 'test-token',
        isLoading: false, // Mock auth loading as false for this state
        login: jest.fn(),
        logout: jest.fn(),
        updateCurrentUserDetails: jest.fn(),
        startGlobalTimer: mockStartGlobalTimer,
        stopGlobalTimerAndLog: mockStopGlobalTimerAndLog,
        clearGlobalTimerState: jest.fn(),
      });

      render(<FreelancerTimeTrackingPage />);
      // Wait for loading to complete and content to be available
      await waitFor(() => expect(screen.queryByText(/loading page data.../i)).not.toBeInTheDocument());
      const jobCard1Elements = await screen.findAllByText('Job Card 1 (Project ID: proj1)');
      const jobCard1TextElement = jobCard1Elements[0]; // Assume first one is the target
      const jobCard1Li = jobCard1TextElement.closest('li');
      expect(jobCard1Li).toBeInTheDocument(); // Ensure the li is found

      // Explicitly wait for the button with the "Stop Timer" text to appear
       await waitFor(() => {
        const buttonsInCard = within(jobCard1Li!).getAllByRole('button');
        const actionButton = buttonsInCard[0];
        expect(actionButton).toHaveTextContent(/stop timer/i);
      });

      const stopButtonForJC1 = within(jobCard1Li!).getByRole('button', { name: /stop timer/i });
      expect(stopButtonForJC1).toBeInTheDocument();

      await act(async () => {
        fireEvent.click(stopButtonForJC1);
        await waitFor(() => expect(mockStopGlobalTimerAndLog).toHaveBeenCalledWith(undefined));
      });
      await waitFor(() => expect(apiService.fetchMyTimeLogsAPI as jest.Mock).toHaveBeenCalledTimes(2));
    });
  });

  describe('Manual Time Log', () => {
    test('modal opens on "Log Time Manually" click', async () => {
      render(<FreelancerTimeTrackingPage />);
      await waitFor(() => expect(screen.queryByText(/loading page data.../i)).not.toBeInTheDocument());
      expect(screen.getByText('Job Card 1 (Project ID: proj1)')).toBeInTheDocument();

      const manualLogButtons = screen.getAllByText('Log Time Manually');
      fireEvent.click(manualLogButtons[0]);

      expect(screen.getByRole('heading', { name: /log time manually for: job card 1/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/date/i)).toBeInTheDocument();
    });

    test('form submission calls addTimeLogAPI and refreshes logs', async () => {
        render(<FreelancerTimeTrackingPage />);
        await waitFor(() => expect(screen.queryByText(/loading page data.../i)).not.toBeInTheDocument());
        expect(screen.getByText('Job Card 1 (Project ID: proj1)')).toBeInTheDocument();

        fireEvent.click(screen.getAllByText('Log Time Manually')[0]); // Open for jc1

        // Fill form
        fireEvent.change(screen.getByLabelText(/date/i), { target: { value: '2023-10-01' } });
        fireEvent.change(screen.getByLabelText(/start time/i), { target: { value: '09:00' } });
        fireEvent.change(screen.getByLabelText(/end time/i), { target: { value: '10:00' } });
        fireEvent.change(screen.getByLabelText(/notes/i), { target: { value: 'Manual log test' } });

        await act(async () => {
          fireEvent.click(screen.getByRole('button', {name: /submit log/i}));
          // Wait for primary API calls within the handler
          await waitFor(() => expect(apiService.addTimeLogAPI as jest.Mock).toHaveBeenCalledWith(
            'proj1', // projectId for jc1
            'jc1',   // jobCardId
            expect.objectContaining({
              startTime: new Date('2023-10-01T09:00:00').toISOString(),
              endTime: new Date('2023-10-01T10:00:00').toISOString(),
              durationMinutes: 60,
              notes: 'Manual log test',
              manualEntry: true,
              architectId: "1",
            })
          ));
          // And also for the subsequent refresh API call if successful
          await waitFor(() => expect(apiService.fetchMyTimeLogsAPI as jest.Mock).toHaveBeenCalledTimes(2));
        });

        // Further assertions after act completes
        expect(screen.queryByRole('heading', { name: /log time manually for: job card 1/i })).not.toBeInTheDocument(); // Modal closes
    });

    test('shows error on addTimeLogAPI failure', async () => {
        (apiService.addTimeLogAPI as jest.Mock).mockRejectedValueOnce(new Error('API Error Manual Log'));
        window.alert = jest.fn(); // Mock alert for error messages

        render(<FreelancerTimeTrackingPage />);
        await waitFor(() => expect(screen.queryByText(/loading page data.../i)).not.toBeInTheDocument());
        expect(screen.getByText('Job Card 1 (Project ID: proj1)')).toBeInTheDocument();
        fireEvent.click(screen.getAllByText('Log Time Manually')[0]);
        fireEvent.change(screen.getByLabelText(/date/i), { target: { value: '2023-10-01' } });
        fireEvent.change(screen.getByLabelText(/start time/i), { target: { value: '09:00' } });
        fireEvent.change(screen.getByLabelText(/end time/i), { target: { value: '10:00' } });

        await act(async () => {
          fireEvent.click(screen.getByRole('button', {name: /submit log/i}));
           // Wait for the mocked addTimeLogAPI to be called (and reject)
          await waitFor(() => expect(apiService.addTimeLogAPI as jest.Mock).toHaveBeenCalled());
        });
        // The alert should be called after the promise rejection and error handling logic.
        await waitFor(() => expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('API Error Manual Log')));
        window.alert = jest.fn(); // Clear mock for other tests
    });

    test('shows validation error for end time before start time', async () => {
        window.alert = jest.fn();
        render(<FreelancerTimeTrackingPage />);
        await waitFor(() => expect(screen.queryByText(/loading page data.../i)).not.toBeInTheDocument());
        expect(screen.getByText('Job Card 1 (Project ID: proj1)')).toBeInTheDocument();
        fireEvent.click(screen.getAllByText('Log Time Manually')[0]);

        fireEvent.change(screen.getByLabelText(/date/i), { target: { value: '2023-10-01' } });
        fireEvent.change(screen.getByLabelText(/start time/i), { target: { value: '10:00' } });
        fireEvent.change(screen.getByLabelText(/end time/i), { target: { value: '09:00' } });
        fireEvent.click(screen.getByRole('button', {name: /submit log/i}));

        expect(window.alert).toHaveBeenCalledWith('End time must be after start time.');
        expect(apiService.addTimeLogAPI as jest.Mock).not.toHaveBeenCalled();
        window.alert = jest.fn();
    });
  });
});
