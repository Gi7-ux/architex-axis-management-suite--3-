import React from 'react';
import { render, screen, fireEvent, waitFor, within, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { UserRole } from '../../types';
import AdminTimeLogReportPage from './AdminTimeLogReportPage';
import { useAuth, AuthUser } from '../../contexts/AuthContext';
import * as apiService from '../../apiService';

// Mock API service
jest.mock('../../apiService');
const mockFetchAllTimeLogsAPI = apiService.fetchAllTimeLogsAPI as jest.Mock;
const mockFetchAllProjectsWithTimeLogsAPI = apiService.fetchAllProjectsWithTimeLogsAPI as jest.Mock;
const mockFetchUsersAPI = apiService.fetchUsersAPI as jest.Mock;
const mockAdminDeleteTimeLogAPI = apiService.adminDeleteTimeLogAPI as jest.Mock;
const mockAdminUpdateTimeLogAPI = apiService.adminUpdateTimeLogAPI as jest.Mock;

// Mock AuthContext
jest.mock('../../contexts/AuthContext');
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

const mockAdminUser: AuthUser = { id: 1, username: 'admin1', email: 'admin@example.com', role: UserRole.ADMIN, name: 'Admin User' };
const mockProjects = [
  {
    id: 'proj1', title: 'Project X', clientId: 'client1',
    jobCards: [{ id: 'jc1', title: 'Task X1', projectId: 'proj1' }]
  },
];
const mockUsers = [
  mockAdminUser,
  { id: 2, username: 'freelancer1', email: 'freelancer@example.com', name: 'Freelancer A', role: UserRole.FREELANCER },
  { id: 3, username: 'client1', email: 'client@example.com', name: 'Client Alpha', role: UserRole.CLIENT },
];
const mockRawTimeLogs = [
  { id: 'tl1', jobCardId: 'jc1', architectId: 'freelancer1', startTime: '2023-01-01T07:00:00.000Z', endTime: '2023-01-01T10:00:00.000Z', durationMinutes: 60, notes: 'Admin Log 1' },
  { id: 'tl2', jobCardId: 'jc1', architectId: 'freelancer1', startTime: '2023-01-02T10:00:00.000Z', endTime: '2023-01-02T11:00:00.000Z', durationMinutes: 60, notes: 'Admin Log 2' },
];

describe('AdminTimeLogReportPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: mockAdminUser,
      token: 'test-token',
      isLoading: false,
      login: jest.fn(), logout: jest.fn(), updateCurrentUserDetails: jest.fn(),
      activeTimerInfo: null, startGlobalTimer: jest.fn(), stopGlobalTimerAndLog: jest.fn(), clearGlobalTimerState: jest.fn(),
    });

    mockFetchAllTimeLogsAPI.mockResolvedValue([...mockRawTimeLogs]);
    mockFetchAllProjectsWithTimeLogsAPI.mockResolvedValue(mockProjects);
    mockFetchUsersAPI.mockResolvedValue(mockUsers);
    mockAdminDeleteTimeLogAPI.mockResolvedValue(undefined);
    mockAdminUpdateTimeLogAPI.mockResolvedValue(mockRawTimeLogs[0]);
    global.confirm = jest.fn(() => true);
    window.alert = jest.fn();
  });

  test('fetches and displays time logs with enriched data', async () => {
    render(<AdminTimeLogReportPage />);
    await waitFor(() => expect(screen.queryByText(/Loading time log reports.../i)).not.toBeInTheDocument(), { timeout: 5000 });

    await waitFor(() => {
      expect(mockFetchAllTimeLogsAPI).toHaveBeenCalled();
      expect(mockFetchAllProjectsWithTimeLogsAPI).toHaveBeenCalled();
      expect(mockFetchUsersAPI).toHaveBeenCalled();
    });
    expect(screen.getByText('Admin Log 1')).toBeInTheDocument();
    expect(screen.getByText('Admin Log 2')).toBeInTheDocument();
    expect(screen.getAllByText('Project X').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Task X1').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Freelancer A').length).toBeGreaterThan(0);
  });

  describe('Delete Time Log', () => {
    test('successfully deletes a time log after confirmation', async () => {
      render(<AdminTimeLogReportPage />);
      await waitFor(() => expect(screen.getByText('Admin Log 1')).toBeInTheDocument());

      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      fireEvent.click(deleteButtons[0]);

      expect(global.confirm).toHaveBeenCalledWith('Are you sure you want to delete this time log?');
      expect(mockAdminDeleteTimeLogAPI).toHaveBeenCalledWith('tl1');

      await waitFor(() => expect(mockFetchAllTimeLogsAPI).toHaveBeenCalledTimes(2));
      expect(window.alert).toHaveBeenCalledWith('Time log deleted successfully.');
    });

    test('does not delete if confirmation is cancelled', async () => {
      (global.confirm as jest.Mock).mockReturnValueOnce(false);
      render(<AdminTimeLogReportPage />);
      await waitFor(() => expect(screen.getByText('Admin Log 1')).toBeInTheDocument());

      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      fireEvent.click(deleteButtons[0]);

      expect(global.confirm).toHaveBeenCalledWith('Are you sure you want to delete this time log?');
      expect(mockAdminDeleteTimeLogAPI).not.toHaveBeenCalled();
    });

    test('handles error during delete', async () => {
      mockAdminDeleteTimeLogAPI.mockRejectedValueOnce(new Error('Delete failed'));
      render(<AdminTimeLogReportPage />);
      await waitFor(() => expect(screen.getByText('Admin Log 1')).toBeInTheDocument());

      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => expect(mockAdminDeleteTimeLogAPI).toHaveBeenCalledWith('tl1'));
      expect(window.alert).toHaveBeenCalledWith('Error: Delete failed');
    });
  });

  describe('Edit Time Log', () => {
    test('opens edit modal with populated data on edit click', async () => {
      render(<AdminTimeLogReportPage />);
      await waitFor(() => expect(screen.getByText('Admin Log 1')).toBeInTheDocument());

      const editButtons = screen.getAllByRole('button', { name: /edit/i });
      fireEvent.click(editButtons[0]);

      const modalHeading = await screen.findByRole('heading', { name: /edit time log/i, level: 3 });
      expect(modalHeading).toBeInTheDocument();
      const modalContent = modalHeading.closest('div[style*="background-color: white"]') as HTMLElement;
      expect(modalContent).toBeInTheDocument();
      
      expect(within(modalContent).getByLabelText(/date/i)).toHaveValue('2023-01-01');
      expect(within(modalContent).getByLabelText(/start time/i)).toHaveValue('09:00'); // Expect 09:00 local time
      expect(within(modalContent).getByLabelText(/end time/i)).toHaveValue('10:00');
      expect(within(modalContent).getByLabelText(/notes/i)).toHaveValue('Admin Log 1');
      expect(within(modalContent).getByLabelText(/job card id/i)).toHaveValue('jc1');
      expect(within(modalContent).getByLabelText(/architect id/i)).toHaveValue('freelancer1');
    });

    test('successfully updates a time log', async () => {
      render(<AdminTimeLogReportPage />);
      await waitFor(() => expect(screen.getByText('Admin Log 1')).toBeInTheDocument());

      fireEvent.click(screen.getAllByRole('button', { name: /edit/i })[0]);

      const modalHeading = await screen.findByRole('heading', { name: /edit time log/i, level: 3 });
      const modalContent = modalHeading.closest('div[style*="background-color: white"]') as HTMLElement;
      expect(modalContent).toBeInTheDocument();

      // Explicitly set values to ensure they are picked up by the form
      fireEvent.change(within(modalContent).getByLabelText(/date/i), { target: { value: '2023-01-01' } });
      fireEvent.change(within(modalContent).getByLabelText(/start time/i), { target: { value: '09:00' } });
      fireEvent.change(within(modalContent).getByLabelText(/end time/i), { target: { value: '10:30' } });
      fireEvent.change(within(modalContent).getByLabelText(/notes/i), { target: { value: 'Updated Admin Log 1' } });
      fireEvent.change(within(modalContent).getByLabelText(/job card id/i), { target: { value: 'jc1' } });
      fireEvent.change(within(modalContent).getByLabelText(/architect id/i), { target: { value: 'freelancer1' } });
      
      await act(async () => {
        fireEvent.click(within(modalContent).getByRole('button', { name: /save changes/i }));
      });

      await waitFor(() => expect(mockAdminUpdateTimeLogAPI).toHaveBeenCalledTimes(1));
      expect(mockAdminUpdateTimeLogAPI).toHaveBeenCalledWith(
        'tl1',
        expect.objectContaining({
          notes: 'Updated Admin Log 1',
          startTime: new Date('2023-01-01T09:00:00.000Z').toISOString(), // This should be 07:00Z to match 09:00 local
          endTime: new Date('2023-01-01T10:30:00.000Z').toISOString(),
          durationMinutes: 90,
          jobCardId: 'jc1',
          architectId: 'freelancer1',
        })
      );
      expect(screen.queryByRole('heading', { name: /edit time log/i })).not.toBeInTheDocument();
      expect(window.alert).toHaveBeenCalledWith('Time log updated successfully.');
      expect(apiService.fetchAllTimeLogsAPI).toHaveBeenCalledTimes(2); // Initial fetch + refresh
    });

    test('handles error during update', async () => {
        mockAdminUpdateTimeLogAPI.mockRejectedValueOnce(new Error('Update failed'));
        render(<AdminTimeLogReportPage />);
        await waitFor(() => expect(screen.getByText('Admin Log 1')).toBeInTheDocument());

        fireEvent.click(screen.getAllByRole('button', { name: /edit/i })[0]);
        const modalHeading = await screen.findByRole('heading', { name: /edit time log/i, level: 3 });
        const modalContent = modalHeading.closest('div[style*="background-color: white"]') as HTMLElement;
        expect(modalContent).toBeInTheDocument();

        fireEvent.change(within(modalContent).getByLabelText(/notes/i), { target: { value: 'Attempted Update' } });
        fireEvent.click(within(modalContent).getByRole('button', { name: /save changes/i }));

        await waitFor(() => expect(mockAdminUpdateTimeLogAPI).toHaveBeenCalled());
        expect(window.alert).toHaveBeenCalledWith('Error updating time log: Update failed');
    });

    test('validation: end time must be after start time in edit modal', async () => {
        render(<AdminTimeLogReportPage />);
        await waitFor(() => expect(screen.getByText('Admin Log 1')).toBeInTheDocument());
        fireEvent.click(screen.getAllByRole('button', { name: /edit/i })[0]);
        
        const modalHeading = await screen.findByRole('heading', { name: /edit time log/i, level: 3 });
        const modalContent = modalHeading.closest('div[style*="background-color: white"]') as HTMLElement;
        expect(modalContent).toBeInTheDocument();

        fireEvent.change(within(modalContent).getByLabelText(/end time/i), { target: { value: '08:00' } });
        fireEvent.click(within(modalContent).getByRole('button', { name: /save changes/i }));

        expect(window.alert).toHaveBeenCalledWith('End time must be after start time.');
        expect(mockAdminUpdateTimeLogAPI).not.toHaveBeenCalled();
    });
  });
});
