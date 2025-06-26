import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { UserRole, AuthUser, User, Project, TimeLog, ProjectStatus } from '../../types';
import ClientProjectTimeLogPage from './ClientProjectTimeLogPage';
import { AuthContext } from '../../contexts/AuthContext';
import * as apiService from '../../apiService';

// Mock API service
jest.mock('../../apiService');
const mockFetchProjectsAPI = apiService.fetchProjectsAPI as jest.Mock;
const mockFetchUsersAPI = apiService.fetchUsersAPI as jest.Mock;
const mockFetchClientProjectTimeLogsAPI = apiService.fetchClientProjectTimeLogsAPI as jest.Mock;


const mockClientProjects: Project[] = [
  { id: 'proj1', title: 'Project Alpha', clientId: 'client1', description: '', budget: 0, currency: 'ZAR', deadline: '', skillsRequired: [], status: ProjectStatus.OPEN, clientName: 'Client Alpha', assignedFreelancerName: null, jobCards: [], createdAt: '', updatedAt: '', paymentType: 'fixed', experienceLevel: 'beginner', duration: 'short' },
  { id: 'proj2', title: 'Project Beta', clientId: 'client1', description: '', budget: 0, currency: 'ZAR', deadline: '', skillsRequired: [], status: ProjectStatus.OPEN, clientName: 'Client Alpha', assignedFreelancerName: null, jobCards: [], createdAt: '', updatedAt: '', paymentType: 'fixed', experienceLevel: 'beginner', duration: 'short' },
];

const mockFreelancerUsers: User[] = [
  { id: 'freelancer1', email: 'freelancer1@example.com', name: 'John Doe', role: UserRole.FREELANCER },
  { id: 'freelancer2', email: 'freelancer2@example.com', name: 'Jane Smith', role: UserRole.FREELANCER },
];

const mockTimeLogsForProj1: TimeLog[] = [
  { id: 'tl1', jobCardId: 'jc1', architectId: 'freelancer1', startTime: new Date().toISOString(), endTime: new Date().toISOString(), durationMinutes: 60, notes: 'Work on Alpha feature 1', createdAt: '', manualEntry: false },
  { id: 'tl2', jobCardId: 'jc2', architectId: 'freelancer2', startTime: new Date().toISOString(), endTime: new Date().toISOString(), durationMinutes: 120, notes: 'Work on Alpha feature 2', createdAt: '', manualEntry: false },
];

describe('ClientProjectTimeLogPage', () => {
  let mockAuthContextValue: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthContextValue = {
      user: { id: 2, username: 'clientuser', name: 'Client User', email: 'client@example.com', role: UserRole.CLIENT } as AuthUser,
      token: 'test-token',
      isLoading: false,
      login: jest.fn(),
      logout: jest.fn(),
      updateCurrentUserDetails: jest.fn(),
      activeTimerInfo: null,
      startGlobalTimer: jest.fn(),
      stopGlobalTimerAndLog: jest.fn(),
      clearGlobalTimerState: jest.fn(),
    };

    mockFetchProjectsAPI.mockResolvedValue(mockClientProjects);
    mockFetchUsersAPI.mockResolvedValue(mockFreelancerUsers);
    mockFetchClientProjectTimeLogsAPI.mockResolvedValue([]);
  });

  test('renders loading state for projects initially', () => {
    mockFetchProjectsAPI.mockImplementationOnce(() => new Promise(() => {}));
    render(
      <AuthContext.Provider value={mockAuthContextValue}>
        <ClientProjectTimeLogPage />
      </AuthContext.Provider>
    );
    expect(screen.getByText(/loading projects.../i)).toBeInTheDocument();
  });

  test('fetches and displays client projects in dropdown', async () => {
    render(
      <AuthContext.Provider value={mockAuthContextValue}>
        <ClientProjectTimeLogPage />
      </AuthContext.Provider>
    );
    await waitFor(() => expect(mockFetchProjectsAPI).toHaveBeenCalledWith({ clientId: String(mockAuthContextValue.user.id) }));
    await waitFor(() => expect(mockFetchUsersAPI).toHaveBeenCalledWith(UserRole.FREELANCER));

    expect(screen.getByRole('combobox', { name: /select project/i })).toBeInTheDocument();
    expect(await screen.findByText('Project Alpha')).toBeInTheDocument();
    expect(await screen.findByText('Project Beta')).toBeInTheDocument();
  });

  test('displays "no projects" message if client has no projects', async () => {
    mockFetchProjectsAPI.mockResolvedValueOnce([]);
    render(
      <AuthContext.Provider value={mockAuthContextValue}>
        <ClientProjectTimeLogPage />
      </AuthContext.Provider>
    );
    await waitFor(() => expect(screen.getByText(/you have no projects/i)).toBeInTheDocument());
  });

  test('fetches and displays time logs when a project is selected', async () => {
    mockFetchClientProjectTimeLogsAPI.mockResolvedValueOnce(mockTimeLogsForProj1);
    render(
      <AuthContext.Provider value={mockAuthContextValue}>
        <ClientProjectTimeLogPage />
      </AuthContext.Provider>
    );
    await waitFor(() => screen.getByText('Project Alpha'));

    fireEvent.change(screen.getByRole('combobox', { name: /select project/i }), { target: { value: 'proj1' } });

    await waitFor(() => expect(mockFetchClientProjectTimeLogsAPI).toHaveBeenCalledWith(String(mockAuthContextValue.user.id), 'proj1'));
    expect(screen.getByText(/work on alpha feature 1/i)).toBeInTheDocument();
    expect(screen.getByText(/work on alpha feature 2/i)).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('Job Card ID: jc1')).toBeInTheDocument();
    expect(screen.getByText('Job Card ID: jc2')).toBeInTheDocument();
  });

  test('displays loading state for time logs', async () => {
    render(
      <AuthContext.Provider value={mockAuthContextValue}>
        <ClientProjectTimeLogPage />
      </AuthContext.Provider>
    );
    await waitFor(() => screen.getByText('Project Alpha'));

    mockFetchClientProjectTimeLogsAPI.mockImplementationOnce(() => new Promise(() => {}));
    fireEvent.change(screen.getByRole('combobox', { name: /select project/i }), { target: { value: 'proj1' } });

    expect(await screen.findByText(/loading time logs.../i)).toBeInTheDocument();
  });

  test('displays "no time logs" message if selected project has no logs', async () => {
    mockFetchClientProjectTimeLogsAPI.mockResolvedValueOnce([]);
    render(
      <AuthContext.Provider value={mockAuthContextValue}>
        <ClientProjectTimeLogPage />
      </AuthContext.Provider>
    );
    await waitFor(() => screen.getByText('Project Alpha'));

    fireEvent.change(screen.getByRole('combobox', { name: /select project/i }), { target: { value: 'proj1' } });

    await waitFor(() => expect(mockFetchClientProjectTimeLogsAPI).toHaveBeenCalledWith(String(mockAuthContextValue.user.id), 'proj1'));
    expect(screen.getByText(/no time logs have been recorded for this project yet/i)).toBeInTheDocument();
  });

  test('displays error message if fetching projects fails', async () => {
    mockFetchProjectsAPI.mockRejectedValueOnce(new Error('Failed to fetch projects'));
    render(
      <AuthContext.Provider value={mockAuthContextValue}>
        <ClientProjectTimeLogPage />
      </AuthContext.Provider>
    );
    await waitFor(() => expect(screen.getByText(/error: failed to fetch projects/i)).toBeInTheDocument());
  });

  test('displays error message if fetching time logs fails', async () => {
    mockFetchClientProjectTimeLogsAPI.mockRejectedValueOnce(new Error('Failed to fetch logs'));
    render(
      <AuthContext.Provider value={mockAuthContextValue}>
        <ClientProjectTimeLogPage />
      </AuthContext.Provider>
    );
    await waitFor(() => screen.getByText('Project Alpha'));

    fireEvent.change(screen.getByRole('combobox', { name: /select project/i }), { target: { value: 'proj1' } });
    await waitFor(() => expect(screen.getByText(/error loading time logs: failed to fetch logs/i)).toBeInTheDocument());
  });
});
