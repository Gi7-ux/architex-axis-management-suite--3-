import React from 'react';
<<<<<<< Updated upstream
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { UserRole } from '../../types';
import AdminTimeLogReportPage from './AdminTimeLogReportPage';
import { useAuth } from '../AuthContext';
=======
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'; // Added within
import '@testing-library/jest-dom';
import { UserRole } from '../../types';
import AdminTimeLogReportPage from './AdminTimeLogReportPage';
import { useAuth, AuthUser } from '../AuthContext'; // Import AuthUser
>>>>>>> Stashed changes
import * as apiService from '../../apiService';

// Mock API service
jest.mock('../../apiService');
const mockFetchAllTimeLogsAPI = apiService.fetchAllTimeLogsAPI as jest.Mock;
const mockFetchAllProjectsWithTimeLogsAPI = apiService.fetchAllProjectsWithTimeLogsAPI as jest.Mock;
const mockFetchUsersAPI = apiService.fetchUsersAPI as jest.Mock;
const mockAdminDeleteTimeLogAPI = apiService.adminDeleteTimeLogAPI as jest.Mock;
const mockAdminUpdateTimeLogAPI = apiService.adminUpdateTimeLogAPI as jest.Mock;

// Mock AuthContext
jest.mock('../AuthContext');
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

<<<<<<< Updated upstream
const mockAdminUser = { id: 'admin1', name: 'Admin User', role: UserRole.ADMIN };
=======
const mockAdminUser: AuthUser = { id: 1, username: 'admin1', email: 'admin@example.com', role: UserRole.ADMIN }; // Removed name property
>>>>>>> Stashed changes
const mockProjects = [
  {
    id: 'proj1', title: 'Project X', clientId: 'client1',
    jobCards: [{ id: 'jc1', title: 'Task X1', projectId: 'proj1' }]
  },
];
const mockUsers = [
  mockAdminUser,
  { id: 'freelancer1', name: 'Freelancer A', role: UserRole.FREELANCER },
  { id: 'client1', name: 'Client Alpha', role: UserRole.CLIENT },
];
const mockRawTimeLogs = [
  { id: 'tl1', jobCardId: 'jc1', architectId: 'freelancer1', startTime: '2023-01-01T09:00:00.000Z', endTime: '2023-01-01T10:00:00.000Z', durationMinutes: 60, notes: 'Admin Log 1' },
  { id: 'tl2', jobCardId: 'jc1', architectId: 'freelancer1', startTime: '2023-01-02T10:00:00.000Z', endTime: '2023-01-02T11:00:00.000Z', durationMinutes: 60, notes: 'Admin Log 2' },
];

// Enriched logs as would be processed by the component
const mockEnrichedTimeLogs = mockRawTimeLogs.map(log => ({
    ...log,
    projectName: 'Project X',
    jobCardTitle: 'Task X1',
    architectName: 'Freelancer A',
    clientName: 'Client Alpha'
}));


describe('AdminTimeLogReportPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({
<<<<<<< Updated upstream
      user: mockAdminUser,
=======
      user: { id: 1, username: 'admin1', email: 'admin@example.com', role: UserRole.ADMIN }, // Ensured mock user matches AuthUser type
>>>>>>> Stashed changes
      token: 'test-token',
      isLoading: false,
      login: jest.fn(), logout: jest.fn(), updateCurrentUserDetails: jest.fn(),
      activeTimerInfo: null, startGlobalTimer: jest.fn(), stopGlobalTimerAndLog: jest.fn(), clearGlobalTimerState: jest.fn(),
    });

    mockFetchAllTimeLogsAPI.mockResolvedValue([...mockRawTimeLogs]); // Use spread to avoid issues with direct modification
    mockFetchAllProjectsWithTimeLogsAPI.mockResolvedValue(mockProjects);
    mockFetchUsersAPI.mockResolvedValue(mockUsers);
    mockAdminDeleteTimeLogAPI.mockResolvedValue(undefined);
    mockAdminUpdateTimeLogAPI.mockResolvedValue(mockRawTimeLogs[0]); // Return some log on update
    global.confirm = jest.fn(() => true); // Default confirm to true
    window.alert = jest.fn(); // Mock alert
  });

  test('fetches and displays time logs with enriched data', async () => {
    render(<AdminTimeLogReportPage />);
<<<<<<< Updated upstream
=======
    // Wait for loading to complete by checking for an element that appears after loading
    // or by waiting for the loading text to disappear.
    await waitFor(() => expect(screen.queryByText(/Loading time log reports.../i)).not.toBeInTheDocument(), { timeout: 5000 });

>>>>>>> Stashed changes
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
      fireEvent.click(deleteButtons[0]); // Click delete for the first log

      expect(global.confirm).toHaveBeenCalledWith('Are you sure you want to delete this time log?');
      expect(mockAdminDeleteTimeLogAPI).toHaveBeenCalledWith('tl1');

      // Expect data to be re-fetched (dataVersion incremented, useEffect re-runs)
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
      fireEvent.click(editButtons[0]); // Edit first log

      const editModal = await screen.findByRole('dialog', { name: /edit time log/i });
      expect(editModal).toBeInTheDocument();
      
      expect(within(editModal).getByLabelText(/date/i)).toHaveValue('2023-01-01');
      expect(within(editModal).getByLabelText(/start time/i)).toHaveValue('09:00');
      expect(within(editModal).getByLabelText(/end time/i)).toHaveValue('10:00');
      expect(within(editModal).getByLabelText(/notes/i)).toHaveValue('Admin Log 1');
      expect(within(editModal).getByLabelText(/job card id/i)).toHaveValue('jc1');
      expect(within(editModal).getByLabelText(/architect id/i)).toHaveValue('freelancer1');
    });

    test('successfully updates a time log', async () => {
      render(<AdminTimeLogReportPage />);
      await waitFor(() => expect(screen.getByText('Admin Log 1')).toBeInTheDocument());

      fireEvent.click(screen.getAllByRole('button', { name: /edit/i })[0]); // Open modal
      
      const editModal = await screen.findByRole('dialog', { name: /edit time log/i });

      // Modify data
      fireEvent.change(within(editModal).getByLabelText(/notes/i), { target: { value: 'Updated Admin Log 1' } });
      fireEvent.change(within(editModal).getByLabelText(/end time/i), { target: { value: '10:30' } }); // Change end time

      fireEvent.click(within(editModal).getByRole('button', { name: /save changes/i }));

      await waitFor(() => expect(mockAdminUpdateTimeLogAPI).toHaveBeenCalledWith(
        'tl1',
        expect.objectContaining({
          notes: 'Updated Admin Log 1',
          startTime: '2023-01-01T09:00:00.000Z', // Original start time
          endTime: '2023-01-01T10:30:00.000Z',   // New end time
          durationMinutes: 90, // Recalculated duration
          jobCardId: 'jc1',
          architectId: 'freelancer1',
        })
      ));
      expect(window.alert).toHaveBeenCalledWith('Time log updated successfully.');
      expect(screen.queryByRole('heading', { name: /edit time log/i })).not.toBeInTheDocument(); // Modal closes
      expect(mockFetchAllTimeLogsAPI).toHaveBeenCalledTimes(2); // Refreshed
    });

    test('handles error during update', async () => {
        mockAdminUpdateTimeLogAPI.mockRejectedValueOnce(new Error('Update failed'));
        render(<AdminTimeLogReportPage />);
        await waitFor(() => expect(screen.getByText('Admin Log 1')).toBeInTheDocument());

        fireEvent.click(screen.getAllByRole('button', { name: /edit/i })[0]);
        const editModal = await screen.findByRole('dialog', { name: /edit time log/i });
        fireEvent.change(within(editModal).getByLabelText(/notes/i), { target: { value: 'Attempted Update' } });
        fireEvent.click(within(editModal).getByRole('button', { name: /save changes/i }));

        await waitFor(() => expect(mockAdminUpdateTimeLogAPI).toHaveBeenCalled());
        expect(window.alert).toHaveBeenCalledWith('Error updating time log: Update failed');
        // Modal should ideally stay open or show error within, but current implementation uses alert.
    });

    test('validation: end time must be after start time in edit modal', async () => {
        render(<AdminTimeLogReportPage />);
        await waitFor(() => expect(screen.getByText('Admin Log 1')).toBeInTheDocument());
        fireEvent.click(screen.getAllByRole('button', { name: /edit/i })[0]);
        
        const editModal = await screen.findByRole('dialog', { name: /edit time log/i });

        fireEvent.change(within(editModal).getByLabelText(/end time/i), { target: { value: '08:00' } }); // Start time is 09:00
        fireEvent.click(within(editModal).getByRole('button', { name: /save changes/i }));

        expect(window.alert).toHaveBeenCalledWith('End time must be after start time.');
        expect(mockAdminUpdateTimeLogAPI).not.toHaveBeenCalled();
    });
  });
});
