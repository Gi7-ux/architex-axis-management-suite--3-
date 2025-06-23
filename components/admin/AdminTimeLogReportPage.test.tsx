import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { UserRole } from '../../types';
import { useAuth } from '../AuthContext';
import * as apiService from '../../apiService';
import AdminTimeLogReportPage from './AdminTimeLogReportPage';

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

const mockAdminUser = { id: 'admin1', name: 'Admin User', role: UserRole.ADMIN };
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
  { id: 'tl2', jobCardId: 'jc1', architectId: 'freelancer1', startTime: '2023-01-02T09:00:00.000Z', endTime: '2023-01-02T10:00:00.000Z', durationMinutes: 60, notes: 'Admin Log 2' },
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
    } as any); // Use 'as any' to bypass strict context type checking for tests

    mockFetchAllTimeLogsAPI.mockResolvedValue([...mockRawTimeLogs]);
    mockFetchAllProjectsWithTimeLogsAPI.mockResolvedValue(mockProjects as any);
    mockFetchUsersAPI.mockResolvedValue(mockUsers as any);
    mockAdminDeleteTimeLogAPI.mockResolvedValue(undefined);
    mockAdminUpdateTimeLogAPI.mockResolvedValue(mockRawTimeLogs[0] as any);
    global.confirm = jest.fn(() => true);
    window.alert = jest.fn();
  });

  test('fetches and displays time logs with enriched data', async () => {
    render(<AdminTimeLogReportPage />);
    await waitFor(() => expect(screen.queryByText(/loading time log reports/i)).not.toBeInTheDocument());

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

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /edit time log/i })).toBeInTheDocument();
      });
      const modal = screen.getByRole('dialog');
      expect(within(modal).getByLabelText(/date/i)).toHaveValue('2023-01-01');
      expect(screen.getByLabelText(/start time/i)).toHaveValue('11:00');
      expect(screen.getByLabelText(/end time/i)).toHaveValue('10:00');
      expect(screen.getByLabelText(/notes/i)).toHaveValue('Admin Log 1');
      expect(screen.getByLabelText(/job card id/i)).toHaveValue('jc1');
      expect(screen.getByLabelText(/architect id/i)).toHaveValue('freelancer1');
    });

    test('successfully updates a time log', async () => {
      render(<AdminTimeLogReportPage />);
      await waitFor(() => expect(screen.getByText('Admin Log 1')).toBeInTheDocument());

      fireEvent.click(screen.getAllByRole('button', { name: /edit/i })[0]); // Open modal

      // Modify data
      fireEvent.change(screen.getByLabelText(/notes/i), { target: { value: 'Updated Admin Log 1' } });
      fireEvent.change(screen.getByLabelText(/end time/i), { target: { value: '10:30' } }); // Change end time

      fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

      await waitFor(() => {
        expect(mockAdminUpdateTimeLogAPI).toHaveBeenCalledWith(
          'tl1',
          {
            notes: 'Updated Admin Log 1',
            startTime: '2023-01-01T09:00:00.000Z',
            endTime: '2023-01-01T10:30:00.000Z',
            durationMinutes: 90,
            jobCardId: 'jc1',
            architectId: 'freelancer1',
          }
        );
        expect(window.alert).toHaveBeenCalledWith('Time log updated successfully.');
        expect(screen.queryByRole('heading', { name: /edit time log/i })).not.toBeInTheDocument(); // Modal closes
        expect(mockFetchAllTimeLogsAPI).toHaveBeenCalledTimes(2); // Refreshed
      });
    });

    test('handles error during update', async () => {
      mockAdminUpdateTimeLogAPI.mockRejectedValueOnce(new Error('Update failed'));
      render(<AdminTimeLogReportPage />);
      await waitFor(() => expect(screen.getByText('Admin Log 1')).toBeInTheDocument());

      fireEvent.click(screen.getAllByRole('button', { name: /edit/i })[0]);
      fireEvent.change(screen.getByLabelText(/notes/i), { target: { value: 'Attempted Update' } });
      fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

      await waitFor(() => expect(mockAdminUpdateTimeLogAPI).toHaveBeenCalled());
      expect(window.alert).toHaveBeenCalledWith('Error updating time log: Update failed');
      // Modal should ideally stay open or show error within, but current implementation uses alert.
    });

    test('validation: end time must be after start time in edit modal', async () => {
      render(<AdminTimeLogReportPage />);
      await waitFor(() => expect(screen.getByText('Admin Log 1')).toBeInTheDocument());
      fireEvent.click(screen.getAllByRole('button', { name: /edit/i })[0]);

      fireEvent.change(screen.getByLabelText(/end time/i), { target: { value: '08:00' } }); // Start time is 09:00
      fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

      expect(window.alert).toHaveBeenCalledWith('End time must be after start time.');
      expect(mockAdminUpdateTimeLogAPI).not.toHaveBeenCalled();
    });
  });
});

// Minimal Modal implementation for test and UI rendering
const Modal: React.FC<{ onClose: () => void; children: React.ReactNode }> = ({ onClose, children }) => (
  <div role="dialog" aria-modal="true" style={{
    position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
    background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
  }}>
    <div style={{ background: 'white', padding: 24, borderRadius: 8, minWidth: 300, position: 'relative' }}>
      <button aria-label="Close" onClick={onClose} style={{ position: 'absolute', top: 8, right: 8 }}>×</button>
      {children}
    </div>
  </div>
);

const AdminTimeLogReportPageDuplicate = () => {
  const [loading, setLoading] = React.useState(true);
  const [timeLogs, setTimeLogs] = React.useState<any[]>([]);
  const [dataVersion, setDataVersion] = React.useState(0);

  const [editModalOpen, setEditModalOpen] = React.useState(false);
  const [editLog, setEditLog] = React.useState<any>(null);
  const [editForm, setEditForm] = React.useState({
    date: '',
    startTime: '',
    endTime: '',
    notes: '',
    jobCardId: '',
    architectId: '',
  });

  // Auth context
  useAuth();

  // Fetch all data
  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      apiService.fetchAllTimeLogsAPI(),
      apiService.fetchAllProjectsWithTimeLogsAPI(),
      apiService.fetchUsersAPI(),
    ]).then(([logs, projects, users]) => {
      if (cancelled) return;
      const setProjects = (p: any) => {};
      const setUsers = (u: any) => {};
      setProjects(projects);
      setUsers(users);

      // Enrich logs
      const enriched = logs.map((log: any) => {
        const jobCard = projects.flatMap((p: any) => p.jobCards).find((jc: any) => jc.id === log.jobCardId);
        const project = projects.find((p: any) => jobCard && p.id === jobCard.projectId);
        const architect = users.find((u: any) => u.id === log.architectId);
        const client = project && users.find((u: any) => u.id === project.clientId);
        return {
          ...log,
          projectName: project ? project.title : '',
          jobCardTitle: jobCard ? jobCard.title : '',
          architectName: architect ? architect.name : '',
          clientName: client ? client.name : '',
        };
      });
      setTimeLogs(enriched);
      setLoading(false);
    }).catch(() => setLoading(false));
    return () => { cancelled = true; };
  }, [dataVersion]);

  // Populate edit form when editLog changes
  React.useEffect(() => {
    if (editLog) {
      const start = new Date(editLog.startTime);
      const end = new Date(editLog.endTime);
      // Use UTC values to avoid timezone offset issues
      const pad = (n: number) => n.toString().padStart(2, '0');
      setEditForm({
        date: start.toISOString().slice(0, 10),
        startTime: `${pad(start.getUTCHours())}:${pad(start.getUTCMinutes())}`,
        endTime: `${pad(end.getUTCHours())}:${pad(end.getUTCMinutes())}`,
        notes: editLog.notes || '',
        jobCardId: editLog.jobCardId || '',
        architectId: editLog.architectId || '',
      });
    }
  }, [editLog]);

  const handleDelete = async (log: any) => {
    if (!window.confirm('Are you sure you want to delete this time log?')) return;
    try {
      await apiService.adminDeleteTimeLogAPI(log.id);
      window.alert('Time log deleted successfully.');
      setDataVersion(v => v + 1);
    } catch (e: any) {
      window.alert('Error: ' + (e?.message || 'Failed to delete'));
    }
  };

  const handleEditClick = (log: any) => {
    setEditLog(log);
    setEditModalOpen(true);
  };

  const handleEditFormChange = (field: string, value: string) => {
    setEditForm(f => ({ ...f, [field]: value }));
  };

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    // Validate
    const start = new Date(`${editForm.date}T${editForm.startTime}:00.000Z`);
    const end = new Date(`${editForm.date}T${editForm.endTime}:00.000Z`);
    if (end <= start) {
      window.alert('End time must be after start time.');
      return;
    }
    const durationMinutes = Math.round((end.getTime() - start.getTime()) / 60000);
    try {
      await apiService.adminUpdateTimeLogAPI(editLog.id, {
        notes: editForm.notes,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        durationMinutes,
        jobCardId: editForm.jobCardId,
        architectId: editForm.architectId,
      });
      window.alert('Time log updated successfully.');
      setEditModalOpen(false);
      setEditLog(null);
      setDataVersion(v => v + 1);
    } catch (e: any) {
      window.alert('Error updating time log: ' + (e?.message || 'Failed to update'));
    }
  };

  return (
    <div>
      <h1>Admin Time Log Report</h1>
      {loading && <div>Loading time log reports...</div>}
      {!loading && (
        <table>
          <thead>
            <tr>
              <th>Project</th>
              <th>Job Card</th>
              <th>Architect</th>
              <th>Client</th>
              <th>Date</th>
              <th>Start</th>
              <th>End</th>
              <th>Duration (min)</th>
              <th>Notes</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {timeLogs.map(log => (
              <tr key={log.id}>
                <td>{log.projectName}</td>
                <td>{log.jobCardTitle}</td>
                <td>{log.architectName}</td>
                <td>{log.clientName}</td>
                <td>{log.startTime ? log.startTime.slice(0, 10) : ''}</td>
                <td>{log.startTime ? log.startTime.slice(11, 16) : ''}</td>
                <td>{log.endTime ? log.endTime.slice(11, 16) : ''}</td>
                <td>{log.durationMinutes}</td>
                <td>{log.notes}</td>
                <td>
                  <button onClick={() => handleEditClick(log)}>Edit</button>
                  <button onClick={() => handleDelete(log)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {editModalOpen && (
        <Modal onClose={() => { setEditModalOpen(false); setEditLog(null); }}>
          <h2>Edit Time Log</h2>
          <form onSubmit={handleEditSave}>
            <label>
              Date
              <input
                aria-label="date"
                type="date"
                value={editForm.date}
                onChange={e => handleEditFormChange('date', e.target.value)}
              />
            </label>
            <label>
              Start Time
              <input
                aria-label="start time"
                type="time"
                value={editForm.startTime}
                onChange={e => handleEditFormChange('startTime', e.target.value)}
              />
            </label>
            <label>
              End Time
              <input
                aria-label="end time"
                type="time"
                value={editForm.endTime}
                onChange={e => handleEditFormChange('endTime', e.target.value)}
              />
            </label>
            <label>
              Notes
              <input
                aria-label="notes"
                value={editForm.notes}
                onChange={e => handleEditFormChange('notes', e.target.value)}
              />
            </label>
            <label>
              Job Card ID
              <input
                aria-label="job card id"
                value={editForm.jobCardId}
                onChange={e => handleEditFormChange('jobCardId', e.target.value)}
              />
            </label>
            <label>
              Architect ID
              <input
                aria-label="architect id"
                value={editForm.architectId}
                onChange={e => handleEditFormChange('architectId', e.target.value)}
              />
            </label>
            <button type="submit">Save Changes</button>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default AdminTimeLogReportPage;
