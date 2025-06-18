import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
<<<<<<< Updated upstream
import { UserRole } from '../../types';
=======
import { UserRole, AuthUser } from '../../types'; // Import AuthUser
>>>>>>> Stashed changes
import ClientProjectTimeLogPage from './ClientProjectTimeLogPage';
import { useAuth } from '../AuthContext';
import * as apiService from '../../apiService';

// Mock API service
jest.mock('../../apiService');
const mockFetchProjectsAPI = apiService.fetchProjectsAPI as jest.Mock;
const mockFetchUsersAPI = apiService.fetchUsersAPI as jest.Mock;
const mockFetchClientProjectTimeLogsAPI = apiService.fetchClientProjectTimeLogsAPI as jest.Mock;

// Mock AuthContext
jest.mock('../AuthContext');
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

const mockClientProjects = [
  { id: 'proj1', title: 'Project Alpha', clientId: 'client1', description: '', budget: 0, deadline: '', skillsRequired: [], status: 'Open' },
  { id: 'proj2', title: 'Project Beta', clientId: 'client1', description: '', budget: 0, deadline: '', skillsRequired: [], status: 'Open' },
];

const mockFreelancerUsers = [
  { id: 'freelancer1', name: 'John Doe', role: UserRole.FREELANCER },
  { id: 'freelancer2', name: 'Jane Smith', role: UserRole.FREELANCER },
];

const mockTimeLogsForProj1 = [
  { id: 'tl1', jobCardId: 'jc1', architectId: 'freelancer1', startTime: new Date().toISOString(), endTime: new Date().toISOString(), durationMinutes: 60, notes: 'Work on Alpha feature 1' },
  { id: 'tl2', jobCardId: 'jc2', architectId: 'freelancer2', startTime: new Date().toISOString(), endTime: new Date().toISOString(), durationMinutes: 120, notes: 'Work on Alpha feature 2' },
];

describe('ClientProjectTimeLogPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({
<<<<<<< Updated upstream
      user: { id: 'client1', name: 'Client User', role: UserRole.CLIENT },
=======
      user: { id: 2, username: 'clientuser', name: 'Client User', email: 'client@example.com', role: UserRole.CLIENT } as AuthUser,
>>>>>>> Stashed changes
      token: 'test-token',
      isLoading: false,
      // Provide all required fields for AuthContextType, even if not directly used in this component
      login: jest.fn(),
      logout: jest.fn(),
      updateCurrentUserDetails: jest.fn(),
      activeTimerInfo: null,
      startGlobalTimer: jest.fn(),
      stopGlobalTimerAndLog: jest.fn(),
      clearGlobalTimerState: jest.fn(),
    });

    mockFetchProjectsAPI.mockResolvedValue(mockClientProjects);
    mockFetchUsersAPI.mockResolvedValue(mockFreelancerUsers);
    mockFetchClientProjectTimeLogsAPI.mockResolvedValue([]); // Default to no logs
  });

  test('renders loading state for projects initially', () => {
    mockFetchProjectsAPI.mockImplementationOnce(() => new Promise(() => {})); // Keep it pending
    render(<ClientProjectTimeLogPage />);
    expect(screen.getByText(/loading projects.../i)).toBeInTheDocument();
  });

  test('fetches and displays client projects in dropdown', async () => {
    render(<ClientProjectTimeLogPage />);
<<<<<<< Updated upstream
    await waitFor(() => expect(mockFetchProjectsAPI).toHaveBeenCalledWith({ clientId: 'client1' }));
=======
    await waitFor(() => expect(mockFetchProjectsAPI).toHaveBeenCalledWith({ clientId: '2' })); // clientId should be string '2' if user.id is 2 (number)
>>>>>>> Stashed changes
    await waitFor(() => expect(mockFetchUsersAPI).toHaveBeenCalledWith(UserRole.FREELANCER));

    expect(screen.getByRole('combobox', { name: /select project/i })).toBeInTheDocument();
    expect(screen.getByText('Project Alpha')).toBeInTheDocument();
    expect(screen.getByText('Project Beta')).toBeInTheDocument();
  });

  test('displays "no projects" message if client has no projects', async () => {
    mockFetchProjectsAPI.mockResolvedValueOnce([]);
    render(<ClientProjectTimeLogPage />);
    await waitFor(() => expect(screen.getByText(/you have no projects/i)).toBeInTheDocument());
  });

  test('fetches and displays time logs when a project is selected', async () => {
    mockFetchClientProjectTimeLogsAPI.mockResolvedValueOnce(mockTimeLogsForProj1);
    render(<ClientProjectTimeLogPage />);
    await waitFor(() => screen.getByText('Project Alpha')); // Wait for projects to load

    fireEvent.change(screen.getByRole('combobox', { name: /select project/i }), { target: { value: 'proj1' } });

<<<<<<< Updated upstream
    await waitFor(() => expect(mockFetchClientProjectTimeLogsAPI).toHaveBeenCalledWith('client1', 'proj1'));
=======
    await waitFor(() => expect(mockFetchClientProjectTimeLogsAPI).toHaveBeenCalledWith('2', 'proj1')); // clientId should be string '2'
>>>>>>> Stashed changes
    expect(screen.getByText(/work on alpha feature 1/i)).toBeInTheDocument();
    expect(screen.getByText(/work on alpha feature 2/i)).toBeInTheDocument();
    // Check for freelancer name mapping
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    // Check for job card ID display
    expect(screen.getByText('Job Card ID: jc1')).toBeInTheDocument();
    expect(screen.getByText('Job Card ID: jc2')).toBeInTheDocument();
  });

  test('displays loading state for time logs', async () => {
    render(<ClientProjectTimeLogPage />);
    await waitFor(() => screen.getByText('Project Alpha'));

    mockFetchClientProjectTimeLogsAPI.mockImplementationOnce(() => new Promise(() => {})); // Keep pending
    fireEvent.change(screen.getByRole('combobox', { name: /select project/i }), { target: { value: 'proj1' } });

    expect(screen.getByText(/loading time logs.../i)).toBeInTheDocument();
  });

  test('displays "no time logs" message if selected project has no logs', async () => {
    mockFetchClientProjectTimeLogsAPI.mockResolvedValueOnce([]); // Ensure it resolves to empty
    render(<ClientProjectTimeLogPage />);
    await waitFor(() => screen.getByText('Project Alpha'));

    fireEvent.change(screen.getByRole('combobox', { name: /select project/i }), { target: { value: 'proj1' } });

<<<<<<< Updated upstream
    await waitFor(() => expect(mockFetchClientProjectTimeLogsAPI).toHaveBeenCalledWith('client1', 'proj1'));
=======
    await waitFor(() => expect(mockFetchClientProjectTimeLogsAPI).toHaveBeenCalledWith('2', 'proj1')); // clientId should be string '2'
>>>>>>> Stashed changes
    expect(screen.getByText(/no time logs have been recorded for this project yet/i)).toBeInTheDocument();
  });

  test('displays error message if fetching projects fails', async () => {
    mockFetchProjectsAPI.mockRejectedValueOnce(new Error('Failed to fetch projects'));
    render(<ClientProjectTimeLogPage />);
    await waitFor(() => expect(screen.getByText(/error: failed to fetch projects/i)).toBeInTheDocument());
  });

  test('displays error message if fetching time logs fails', async () => {
    mockFetchClientProjectTimeLogsAPI.mockRejectedValueOnce(new Error('Failed to fetch logs'));
    render(<ClientProjectTimeLogPage />);
    await waitFor(() => screen.getByText('Project Alpha'));

    fireEvent.change(screen.getByRole('combobox', { name: /select project/i }), { target: { value: 'proj1' } });
    await waitFor(() => expect(screen.getByText(/error loading time logs: failed to fetch logs/i)).toBeInTheDocument());
  });
});
