// ...existing code...
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import FreelancerTimeTrackingPage from './FreelancerTimeTrackingPage';
import { useAuth } from '../AuthContext';
import * as apiService from '../../apiService';
import { UserRole } from '../../types';
import { LogTimeResponse, TimeLogPHPResponse } from '../../apiService';

// Mock the hooks and services
jest.mock('../AuthContext');
jest.mock('../../apiService');

const mockUseAuth = useAuth as jest.Mock;
const mockFetchFreelancerJobCardsAPI = apiService.fetchFreelancerJobCardsAPI as jest.Mock;
const mockFetchMyTimeLogsAPI = apiService.fetchMyTimeLogsAPI as jest.Mock;
const mockFetchMyTimeLogs = apiService.fetchMyTimeLogsAPI as jest.Mock;
const mockAddTimeLogAPI = apiService.addTimeLogAPI as jest.Mock;

const mockUser = { id: 1, username: 'freelancer1', name: 'Test Freelancer', role: UserRole.FREELANCER, email: 'test@test.com' };

const mockJobCardsPHP: any[] = [
  {
    id: 1,
    project_id: 101,
    status: 'ToDo',
    assigned_freelancer_id: 1,
    assigned_freelancer_username: 'freelancer1',
    estimated_hours: 10,
    title: 'Job Card 1',
    description: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 2,
    project_id: 102,
    status: 'ToDo',
    assigned_freelancer_id: 1,
    assigned_freelancer_username: 'freelancer1',
    estimated_hours: 20,
    title: 'Job Card 2',
    description: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];
const mockTimeLogsPHP: any[] = [
  {
    id: 1,
    job_card_id: 1,
    user_id: 1,
    logger_username: 'freelancer1',
    job_card_title: 'Job Card 1',
    startTime: new Date().toISOString(),
    endTime: new Date().toISOString(),
    durationMinutes: 60,
    notes: 'Log 1',
    createdAt: new Date().toISOString(),
  },
];

describe('FreelancerTimeTrackingPage', () => {
  let mockStartGlobalTimer: jest.Mock;
  let mockStopGlobalTimerAndLog: jest.Mock;

  const baseAuthValue = {
    user: mockUser,
    token: 'test-token',
    isLoading: false,
    login: jest.fn(),
    logout: jest.fn(),
    updateCurrentUserDetails: jest.fn(),
    activeTimerInfo: null,
    startGlobalTimer: jest.fn(),
    stopGlobalTimerAndLog: jest.fn().mockResolvedValue(undefined),
    clearGlobalTimerState: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockStartGlobalTimer = baseAuthValue.startGlobalTimer;
    mockStopGlobalTimerAndLog = baseAuthValue.stopGlobalTimerAndLog;

    mockUseAuth.mockReturnValue(baseAuthValue);

    mockFetchFreelancerJobCardsAPI.mockResolvedValue(mockJobCardsPHP);
    mockFetchMyTimeLogsAPI.mockResolvedValue(mockTimeLogsPHP);
    mockAddTimeLogAPI.mockResolvedValue({ message: 'Log added', time_log_id: 99, duration_minutes: 60 } as LogTimeResponse);

    // Mock window.alert and window.prompt to prevent errors in test environment
    window.alert = jest.fn();
    window.prompt = jest.fn();
  });

  test('renders job cards and time logs on successful data fetch', async () => {
    render(<FreelancerTimeTrackingPage />);
    await waitFor(() => {
      expect(screen.getByText('Job Card 1 (Project ID: 101)')).toBeInTheDocument();
      expect(screen.getByText('Job Card 2 (Project ID: 102)')).toBeInTheDocument();
      expect(screen.getByText('Log 1')).toBeInTheDocument();
    });
  });

  test('shows loading state initially', () => {
    mockUseAuth.mockReturnValueOnce({ ...baseAuthValue, isLoading: true });
    render(<FreelancerTimeTrackingPage />);
    expect(screen.getByText('Loading page data...')).toBeInTheDocument();
  });

  test('shows error message on data fetch failure', async () => {
    mockFetchFreelancerJobCardsAPI.mockRejectedValue(new Error('Failed to fetch job cards'));
    render(<FreelancerTimeTrackingPage />);
    await waitFor(() => {
      expect(screen.getByText(/error: failed to fetch job cards/i)).toBeInTheDocument();
    });
  });

  describe('Timer functionality', () => {
    test('clicking "Start Timer" calls startGlobalTimer', async () => {
      render(<FreelancerTimeTrackingPage />);
      await waitFor(() => screen.getByText('Job Card 1 (Project ID: 101)'));

      const startButtons = screen.getAllByText('Start Timer');
      fireEvent.click(startButtons[0]);

      expect(mockStartGlobalTimer).toHaveBeenCalledWith('1', 'Job Card 1', '101');
    });

    test('"Start Timer" is disabled if another timer is active', async () => {
      mockUseAuth.mockReturnValue({
        ...baseAuthValue,
        activeTimerInfo: { jobCardId: '2', jobCardTitle: 'Job Card 2', projectId: '102', startTime: new Date() },
      });
      render(<FreelancerTimeTrackingPage />);
      await waitFor(() => screen.getByText('Job Card 1 (Project ID: 101)'));

      const startButtonForJC1 = screen.getAllByText('Start Timer')[0];
      expect(startButtonForJC1).toBeDisabled();
    });

    test('clicking "Stop Timer" calls stopGlobalTimerAndLog and refreshes logs', async () => {
      window.prompt = jest.fn().mockReturnValue('Stopping timer');
      mockUseAuth.mockReturnValue({
        ...baseAuthValue,
        activeTimerInfo: { jobCardId: '1', jobCardTitle: 'Job Card 1', projectId: '101', startTime: new Date() },
      });
      const newTimeLog: TimeLogPHPResponse = { id: 2, job_card_id: 1, user_id: 1, startTime: new Date().toISOString(), endTime: new Date().toISOString(), durationMinutes: 30, notes: 'New Log', createdAt: new Date().toISOString() };
      mockFetchMyTimeLogs.mockResolvedValueOnce(mockTimeLogsPHP).mockResolvedValueOnce([...mockTimeLogsPHP, newTimeLog]);

      render(<FreelancerTimeTrackingPage />);
      await waitFor(() => screen.getByText('Job Card 1 (Project ID: 101)'));

      const stopButtonForJC1 = Array.from(screen.getAllByRole('button')).find(b => b.textContent?.includes('Stop Timer'));
      await act(async () => {
        fireEvent.click(stopButtonForJC1!);
      });

      await waitFor(() => {
        expect(mockStopGlobalTimerAndLog).toHaveBeenCalledWith('Stopping timer');
        expect(mockFetchMyTimeLogs).toHaveBeenCalledTimes(2);
      });
      expect(await screen.findByText('New Log')).toBeInTheDocument();
    });
  });

  describe('Manual Time Log', () => {
    test('modal opens on "Log Time Manually" click', async () => {
      render(<FreelancerTimeTrackingPage />);
      await waitFor(() => screen.getByText('Job Card 1 (Project ID: 101)'));

      const manualLogButtons = screen.getAllByText('Log Time Manually');
      fireEvent.click(manualLogButtons[0]);

      expect(screen.getByRole('heading', { name: /log time manually for: job card 1/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/date/i)).toBeInTheDocument();
    });

    test('form submission calls addTimeLogAPI and refreshes logs', async () => {
      render(<FreelancerTimeTrackingPage />);
      await waitFor(() => screen.getByText('Job Card 1 (Project ID: 101)'));

      await act(async () => {
        fireEvent.click(screen.getAllByText('Log Time Manually')[0]);
      });

      await act(async () => {
        fireEvent.change(screen.getByLabelText(/date/i), { target: { value: '2023-10-01' } });
        fireEvent.change(screen.getByLabelText(/start time/i), { target: { value: '09:00' } });
        fireEvent.change(screen.getByLabelText(/end time/i), { target: { value: '10:30' } });
        fireEvent.change(screen.getByLabelText(/notes/i), { target: { value: 'Manual log notes' } });
      });

      const newTimeLog: TimeLogPHPResponse = { id: 3, job_card_id: 1, user_id: 1, startTime: '2023-10-01T09:00:00.000Z', endTime: '2023-10-01T10:30:00.000Z', durationMinutes: 90, notes: 'Manual log notes', createdAt: new Date().toISOString() };
      mockFetchMyTimeLogsAPI.mockResolvedValue([...mockTimeLogsPHP, newTimeLog]);


      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /submit log/i }));
      });

      await waitFor(() => {
        expect(mockAddTimeLogAPI).toHaveBeenCalledWith(
          '101',
          '1',
          expect.objectContaining({
            notes: 'Manual log notes',
            manualEntry: true,
          })
        );
        expect(mockFetchMyTimeLogs).toHaveBeenCalledTimes(2);
      });
      expect(await screen.findByText('Manual log notes')).toBeInTheDocument();
    });

    test('shows error on addTimeLogAPI failure', async () => {
      window.alert = jest.fn();
      mockAddTimeLogAPI.mockRejectedValue(new Error('API submission failed'));

      render(<FreelancerTimeTrackingPage />);
      await waitFor(() => screen.getByText('Job Card 1 (Project ID: 101)'));
      fireEvent.click(screen.getAllByText('Log Time Manually')[0]);
      fireEvent.change(screen.getByLabelText(/date/i), { target: { value: '2023-10-01' } });
      fireEvent.change(screen.getByLabelText(/start time/i), { target: { value: '09:00' } });
      fireEvent.change(screen.getByLabelText(/end time/i), { target: { value: '10:00' } });

      fireEvent.click(screen.getByRole('button', { name: /submit log/i }));

      await waitFor(() => {
        expect(window.alert).toHaveBeenCalledWith('Error: API submission failed');
      });
    });

    test('shows validation error for end time before start time', async () => {
      window.alert = jest.fn();
      render(<FreelancerTimeTrackingPage />);
      await waitFor(() => screen.getByText('Job Card 1 (Project ID: 101)'));
      fireEvent.click(screen.getAllByText('Log Time Manually')[0]);

      fireEvent.change(screen.getByLabelText(/date/i), { target: { value: '2023-10-01' } });
      fireEvent.change(screen.getByLabelText(/start time/i), { target: { value: '11:00' } });
      fireEvent.change(screen.getByLabelText(/end time/i), { target: { value: '10:00' } });

      fireEvent.click(screen.getByRole('button', { name: /submit log/i }));

      await waitFor(() => {
        expect(window.alert).toHaveBeenCalledWith('End time must be after start time.');
      });
    });
  });
});
