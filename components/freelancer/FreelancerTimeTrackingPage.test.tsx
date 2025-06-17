import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { UserRole } from '../../types';
import FreelancerTimeTrackingPage from './FreelancerTimeTrackingPage';
import { useAuth } from '../AuthContext';
import * as apiService from '../../apiService';

// Mock API service
jest.mock('../../apiService');
const mockFetchFreelancerJobCardsAPI = apiService.fetchFreelancerJobCardsAPI as jest.Mock;
const mockFetchMyTimeLogsAPI = apiService.fetchMyTimeLogsAPI as jest.Mock;
const mockAddTimeLogAPI = apiService.addTimeLogAPI as jest.Mock; // Used by manual log

// Mock AuthContext
jest.mock('../AuthContext');
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

const mockJobCards = [
  { id: 'jc1', title: 'Job Card 1', projectId: 'proj1', description: 'Description 1', status: 'ToDo' },
  { id: 'jc2', title: 'Job Card 2', projectId: 'proj2', description: 'Description 2', status: 'InProgress' },
];

const mockTimeLogs = [
  { id: 'tl1', jobCardId: 'jc1', architectId: 'freelancer1', startTime: new Date().toISOString(), endTime: new Date().toISOString(), durationMinutes: 60, notes: 'Log 1', manualEntry: false },
];

describe('FreelancerTimeTrackingPage', () => {
  let mockStartGlobalTimer: jest.Mock;
  let mockStopGlobalTimerAndLog: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockStartGlobalTimer = jest.fn();
    mockStopGlobalTimerAndLog = jest.fn().mockResolvedValue(undefined); // Mock it as an async function

    mockUseAuth.mockReturnValue({
      user: { id: 'freelancer1', name: 'Freelancer User', role: UserRole.FREELANCER },
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

    mockFetchFreelancerJobCardsAPI.mockResolvedValue(mockJobCards);
    mockFetchMyTimeLogsAPI.mockResolvedValue(mockTimeLogs);
    mockAddTimeLogAPI.mockResolvedValue({ id: 'newLog', ...mockTimeLogs[0] }); // Mock successful manual log
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
    await waitFor(() => expect(mockFetchFreelancerJobCardsAPI).toHaveBeenCalledWith('freelancer1'));
    await waitFor(() => expect(mockFetchMyTimeLogsAPI).toHaveBeenCalledWith('freelancer1'));

    expect(screen.getByText('Job Card 1 (Project ID: proj1)')).toBeInTheDocument();
    expect(screen.getByText('Job Card 2 (Project ID: proj2)')).toBeInTheDocument();
    expect(screen.getByText('Log 1')).toBeInTheDocument(); // Check if notes are rendered
  });

  test('displays "no job cards" message if none are returned', async () => {
    mockFetchFreelancerJobCardsAPI.mockResolvedValueOnce([]);
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
      await waitFor(() => screen.getByText('Job Card 1 (Project ID: proj1)'));

      const buttons = screen.getAllByRole('button');
      // Find the button related to Job Card 1
      const jobCard1Li = screen.getByText('Job Card 1 (Project ID: proj1)').closest('li');
      const stopButtonForJC1 = Array.from(jobCard1Li!.querySelectorAll('button')).find(b => b.textContent?.includes('Stop Timer'));
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
      await waitFor(() => screen.getByText('Job Card 1 (Project ID: proj1)'));

      const jobCard1Li = screen.getByText('Job Card 1 (Project ID: proj1)').closest('li');
      const stopButtonForJC1 = Array.from(jobCard1Li!.querySelectorAll('button')).find(b => b.textContent?.includes('Stop Timer'));
      fireEvent.click(stopButtonForJC1!);

      expect(mockStopGlobalTimerAndLog).toHaveBeenCalledWith(undefined); // Called with undefined notes as prompt returns ''
      await waitFor(() => expect(mockFetchMyTimeLogsAPI).toHaveBeenCalledTimes(2)); // Initial + refresh after stop
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

        await waitFor(() => expect(mockAddTimeLogAPI).toHaveBeenCalledWith(
          'proj1', // projectId for jc1
          'jc1',   // jobCardId
          expect.objectContaining({
            startTime: new Date('2023-10-01T09:00:00').toISOString(),
            endTime: new Date('2023-10-01T10:00:00').toISOString(),
            durationMinutes: 60,
            notes: 'Manual log test',
            manualEntry: true,
            architectId: 'freelancer1',
          })
        ));
        expect(screen.queryByRole('heading', { name: /log time manually for: job card 1/i })).not.toBeInTheDocument(); // Modal closes
        expect(mockFetchMyTimeLogsAPI).toHaveBeenCalledTimes(2); // Initial + refresh
    });

    test('shows error on addTimeLogAPI failure', async () => {
        mockAddTimeLogAPI.mockRejectedValueOnce(new Error('API Error Manual Log'));
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
        expect(mockAddTimeLogAPI).not.toHaveBeenCalled();
        window.alert = jest.fn();
    });
  });
});
