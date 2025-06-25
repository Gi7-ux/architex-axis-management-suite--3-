import React from 'react';
import { render, screen, fireEvent, waitFor, within, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { UserRole, AuthUser, JobCard, TimeLog, JobCardStatus } from '../../types';
import FreelancerTimeTrackingPage from './FreelancerTimeTrackingPage';
import { useAuth } from '../../contexts/AuthContext';
import * as apiService from '../../apiService';

// Mock API service
jest.mock('../../apiService', () => ({
  __esModule: true,
  ...jest.requireActual('../../apiService'),
  fetchFreelancerJobCardsAPI: jest.fn(),
  fetchMyTimeLogsAPI: jest.fn(),
  addTimeLogAPI: jest.fn(),
}));

// Mock AuthContext
jest.mock('../../contexts/AuthContext');
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

const mockJobCards: JobCard[] = [
  { id: 'jc1', title: 'Job Card 1', projectId: 'proj1', description: 'Description 1', status: JobCardStatus.TODO, createdAt: '', updatedAt: '' },
  { id: 'jc2', title: 'Job Card 2', projectId: 'proj2', description: 'Description 2', status: JobCardStatus.IN_PROGRESS, createdAt: '', updatedAt: '' },
];

const mockTimeLogs: TimeLog[] = [
  { id: 'tl1', jobCardId: 'jc1', architectId: 'freelancer1', startTime: new Date().toISOString(), endTime: new Date().toISOString(), durationMinutes: 60, notes: 'Log 1', manualEntry: false, createdAt: new Date().toISOString() },
  { id: 'tl2', jobCardId: 'jc2', architectId: 'freelancer1', startTime: new Date().toISOString(), endTime: new Date().toISOString(), durationMinutes: 30, notes: 'Log 2', manualEntry: false, createdAt: new Date().toISOString() },
];

describe('FreelancerTimeTrackingPage', () => {
  let mockStartGlobalTimer: jest.Mock;
  let mockStopGlobalTimerAndLog: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    window.alert = jest.fn();
    mockStartGlobalTimer = jest.fn();
    mockStopGlobalTimerAndLog = jest.fn().mockResolvedValue(undefined);

    mockUseAuth.mockReturnValue({
      user: { id: 1, username: 'freelanceruser', name: 'Freelancer User', email: 'freelancer@example.com', role: UserRole.FREELANCER } as AuthUser,
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
    (apiService.addTimeLogAPI as jest.Mock).mockResolvedValue({ id: 'newLogId', jobCardId: 'jc1', architectId: 'freelancer1', startTime: new Date().toISOString(), endTime: new Date().toISOString(), durationMinutes: 60, notes: 'New Log', manualEntry: true, createdAt: new Date().toISOString() });
  });

  test('renders loading state initially', () => {
    (apiService.fetchFreelancerJobCardsAPI as jest.Mock).mockImplementationOnce(() => new Promise(() => {}));
    (apiService.fetchMyTimeLogsAPI as jest.Mock).mockImplementationOnce(() => new Promise(() => {}));

    render(<FreelancerTimeTrackingPage />);
    expect(screen.getByText(/loading page data.../i)).toBeInTheDocument();
  });

  test('displays fetched job cards and time logs correctly', async () => {
    render(<FreelancerTimeTrackingPage />);
    await waitFor(() => expect(screen.queryByText(/loading page data.../i)).not.toBeInTheDocument());

    expect(apiService.fetchFreelancerJobCardsAPI as jest.Mock).toHaveBeenCalledWith("1");
    expect(apiService.fetchMyTimeLogsAPI as jest.Mock).toHaveBeenCalledWith("1");

    expect(screen.getByText('Job Card 1 (Project ID: proj1)')).toBeInTheDocument();
    expect(screen.getByText('Job Card 2 (Project ID: proj2)')).toBeInTheDocument();
    expect(screen.getByText('Log 1')).toBeInTheDocument();
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
      expect(screen.getByText('Job Card 1 (Project ID: proj1)')).toBeInTheDocument();

      const startButtons = screen.getAllByText('Start Timer');
      fireEvent.click(startButtons[0]);

      expect(mockStartGlobalTimer).toHaveBeenCalledWith('jc1', 'Job Card 1', 'proj1');
    });

    test('displays "Stop Timer" for the active job card from context', async () => {
      await act(async () => {
        mockUseAuth.mockReturnValueOnce({
          user: { id: 1, username: 'freelanceruser', name: 'Freelancer User', email: 'freelancer@example.com', role: UserRole.FREELANCER } as AuthUser,
          activeTimerInfo: { jobCardId: 'jc1', jobCardTitle: 'Job Card 1', projectId: 'proj1', startTime: new Date() },
          token: 'test-token',
          isLoading: false,
          login: jest.fn(),
          logout: jest.fn(),
          updateCurrentUserDetails: jest.fn(),
          startGlobalTimer: mockStartGlobalTimer,
          stopGlobalTimerAndLog: mockStopGlobalTimerAndLog,
          clearGlobalTimerState: jest.fn(),
        });
        render(<FreelancerTimeTrackingPage />);
      });

      await waitFor(() => expect(screen.queryByText(/loading page data.../i)).not.toBeInTheDocument());
      const jobCard1Elements = await screen.findAllByText('Job Card 1 (Project ID: proj1)');
      const jobCard1Li = jobCard1Elements[0].closest('li');
      expect(jobCard1Li).toBeInTheDocument();

      await waitFor(() => {
        const stopButton = within(jobCard1Li!).getByRole('button', { name: /Stop Timer/i });
        expect(stopButton).toBeInTheDocument();
      });

      const stopButtonForJC1 = within(jobCard1Li!).getByRole('button', { name: /Stop Timer/i });
      expect(stopButtonForJC1).toBeInTheDocument();

      const jobCard2Elements = await screen.findAllByText('Job Card 2 (Project ID: proj2)');
      const jobCard2Li = jobCard2Elements[0].closest('li');
      const startButtonForJC2 = Array.from(jobCard2Li!.querySelectorAll('button')).find(b => b.textContent?.includes('Start Timer'));
      expect(startButtonForJC2).toHaveStyle('cursor: not-allowed');
    });

    test('clicking "Stop Timer" calls stopGlobalTimerAndLog from context', async () => {
      window.prompt = jest.fn().mockReturnValue('');

      await act(async () => {
        mockUseAuth.mockReturnValue({
          user: { id: 1, username: 'freelanceruser', name: 'Freelancer User', email: 'freelancer@example.com', role: UserRole.FREELANCER } as AuthUser,
          activeTimerInfo: { jobCardId: 'jc1', jobCardTitle: 'Job Card 1', projectId: 'proj1', startTime: new Date() },
          token: 'test-token',
          isLoading: false,
          login: jest.fn(),
          logout: jest.fn(),
          updateCurrentUserDetails: jest.fn(),
          startGlobalTimer: mockStartGlobalTimer,
          stopGlobalTimerAndLog: mockStopGlobalTimerAndLog,
          clearGlobalTimerState: jest.fn(),
        });
        render(<FreelancerTimeTrackingPage />);
      });

      await waitFor(() => expect(screen.queryByText(/loading page data.../i)).not.toBeInTheDocument());
      const jobCard1Elements = await screen.findAllByText('Job Card 1 (Project ID: proj1)');
      const jobCard1TextElement = jobCard1Elements[0];
      const jobCard1Li = jobCard1TextElement.closest('li');
      expect(jobCard1Li).toBeInTheDocument();

      await waitFor(() => {
        const buttonsInCard = within(jobCard1Li!).getAllByRole('button');
        const actionButton = buttonsInCard[0];
        expect(actionButton).toHaveTextContent(/Stop Timer/i);
      });

      const stopButtonForJC1 = within(jobCard1Li!).getByRole('button', { name: /Stop Timer/i });
      expect(stopButtonForJC1).toBeInTheDocument();

      await act(async () => {
        fireEvent.click(stopButtonForJC1);
      });
      await waitFor(() => expect(mockStopGlobalTimerAndLog).toHaveBeenCalledWith(undefined));
      await waitFor(() => expect(apiService.fetchMyTimeLogsAPI as jest.Mock).toHaveBeenCalledTimes(1)); // Should be 1 initial fetch
    });
  });

  describe('Manual Time Log', () => {
    test('modal opens on "Log Time Manually" click', async () => {
      await act(async () => {
        render(<FreelancerTimeTrackingPage />);
      });
      await waitFor(() => expect(screen.queryByText(/loading page data.../i)).not.toBeInTheDocument());
      expect(screen.getByText('Job Card 1 (Project ID: proj1)')).toBeInTheDocument();

      await act(async () => {
        const manualLogButtons = screen.getAllByText('Log Time Manually');
        fireEvent.click(manualLogButtons[0]);
      });

      expect(screen.getByRole('heading', { name: /log time manually for: job card 1/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/date/i)).toBeInTheDocument();
    });

    test('form submission calls addTimeLogAPI and refreshes logs', async () => {
      await act(async () => {
        render(<FreelancerTimeTrackingPage />);
      });
      await waitFor(() => expect(screen.queryByText(/loading page data.../i)).not.toBeInTheDocument());
      expect(screen.getByText('Job Card 1 (Project ID: proj1)')).toBeInTheDocument();

      await act(async () => {
        fireEvent.click(screen.getAllByText('Log Time Manually')[0]);
      });

      await act(async () => {
        fireEvent.change(screen.getByLabelText(/Date:/i), { target: { value: '2023-10-01' } });
        fireEvent.change(screen.getByLabelText(/start time/i), { target: { value: '09:00' } });
        fireEvent.change(screen.getByLabelText(/end time/i), { target: { value: '10:00' } });
        fireEvent.change(screen.getByLabelText(/notes/i), { target: { value: 'Manual log test' } });

        fireEvent.click(screen.getByRole('button', { name: /submit log/i }));
      });

      await waitFor(() => expect(apiService.addTimeLogAPI as jest.Mock).toHaveBeenCalledWith(
        'proj1',
        'jc1',
        expect.objectContaining({
          startTime: new Date('2023-10-01T09:00:00').toISOString(),
          endTime: new Date('2023-10-01T10:00:00').toISOString(),
          durationMinutes: 60,
          notes: 'Manual log test',
          manualEntry: true,
          architectId: "1",
        })
      ));
      await waitFor(() => expect(apiService.fetchMyTimeLogsAPI as jest.Mock).toHaveBeenCalledTimes(2)); // Corrected to match expected initial fetch + refresh after manual log
      expect(screen.queryByRole('heading', { name: /log time manually for: job card 1/i })).not.toBeInTheDocument();
    });

    test('shows error on addTimeLogAPI failure', async () => {
      (apiService.addTimeLogAPI as jest.Mock).mockRejectedValueOnce(new Error('API Error Manual Log'));
      window.alert = jest.fn();

      await act(async () => {
        render(<FreelancerTimeTrackingPage />);
      });
      await waitFor(() => expect(screen.queryByText(/loading page data.../i)).not.toBeInTheDocument());
      expect(screen.getByText('Job Card 1 (Project ID: proj1)')).toBeInTheDocument();

      await act(async () => {
        fireEvent.click(screen.getAllByText('Log Time Manually')[0]);
        fireEvent.change(screen.getByLabelText(/Date:/i), { target: { value: '2023-10-01' } });
        fireEvent.change(screen.getByLabelText(/start time/i), { target: { value: '09:00' } });
        fireEvent.change(screen.getByLabelText(/end time/i), { target: { value: '10:00' } });
        fireEvent.click(screen.getByRole('button', { name: /submit log/i }));
      });

      await waitFor(() => expect(apiService.addTimeLogAPI as jest.Mock).toHaveBeenCalled());
      await waitFor(() => expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('API Error Manual Log')));
    });

    test('shows validation error for end time before start time', async () => {
      window.alert = jest.fn();
      await act(async () => {
        render(<FreelancerTimeTrackingPage />);
      });
      await waitFor(() => expect(screen.queryByText(/loading page data.../i)).not.toBeInTheDocument());
      expect(screen.getByText('Job Card 1 (Project ID: proj1)')).toBeInTheDocument();

      await act(async () => {
        fireEvent.click(screen.getAllByText('Log Time Manually')[0]);
        fireEvent.change(screen.getByLabelText(/Date:/i), { target: { value: '2023-10-01' } });
        fireEvent.change(screen.getByLabelText(/start time/i), { target: { value: '10:00' } });
        fireEvent.change(screen.getByLabelText(/end time/i), { target: { value: '09:00' } });
        fireEvent.click(screen.getByRole('button', { name: /submit log/i }));
      });

      expect(window.alert).toHaveBeenCalledWith('End time must be after start time.');
      expect(apiService.addTimeLogAPI as jest.Mock).not.toHaveBeenCalled();
    });
  });
});
