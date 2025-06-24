import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import MyProjects from './MyProjects';
import { useAuth } from '../../contexts/AuthContext';
import * as apiService from '../../apiService';
import { UserRole } from '../../types';

// Mock API service
jest.mock('../../apiService');
const mockFetchClientProjectsAPI = apiService.fetchClientProjectsAPI as jest.Mock;
const mockDeleteProjectAPI = apiService.deleteProjectAPI as jest.Mock;
const mockUpdateProjectAPI = apiService.updateProjectAPI as jest.Mock;
const mockFetchApplicationsForProjectAPI = apiService.fetchApplicationsForProjectAPI as jest.Mock;
const mockUpdateApplicationStatusAPI = apiService.updateApplicationStatusAPI as jest.Mock;

// Mock AuthContext
jest.mock('../../contexts/AuthContext');
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

describe('MyProjects', () => {
    const mockUser = { id: 1, username: 'client', name: 'Client User', email: 'client@example.com', role: UserRole.CLIENT };
    const mockProjects = [
        { id: '1', title: 'Test Project', clientId: '1', description: 'desc', status: 'Open', createdAt: new Date().toISOString() }
    ];

    beforeEach(() => {
        jest.clearAllMocks();
        mockUseAuth.mockReturnValue({
            user: mockUser,
            token: 'test-token',
            login: jest.fn(),
            logout: jest.fn(),
            isLoading: false,
            updateCurrentUserDetails: jest.fn(),
            activeTimerInfo: null,
            startGlobalTimer: jest.fn(),
            stopGlobalTimerAndLog: jest.fn(),
            clearGlobalTimerState: jest.fn(),
        });
    });

    it('renders projects for the client', async () => {
        mockFetchClientProjectsAPI.mockResolvedValueOnce(mockProjects);
        render(<MemoryRouter><MyProjects /></MemoryRouter>);
        expect(await screen.findByText('Test Project')).toBeInTheDocument();
    });

    it('shows error if user is not client', async () => {
        mockUseAuth.mockReturnValue({
            user: { ...mockUser, role: UserRole.FREELANCER },
            token: 'test-token',
            login: jest.fn(),
            logout: jest.fn(),
            isLoading: false,
            updateCurrentUserDetails: jest.fn(),
            activeTimerInfo: null,
            startGlobalTimer: jest.fn(),
            stopGlobalTimerAndLog: jest.fn(),
            clearGlobalTimerState: jest.fn(),
        });
        render(<MemoryRouter><MyProjects /></MemoryRouter>);
        expect(await screen.findByText(/User not authenticated as Client/i)).toBeInTheDocument();
    });

    it('deletes a project', async () => {
        mockFetchClientProjectsAPI.mockResolvedValueOnce(mockProjects);
        mockDeleteProjectAPI.mockResolvedValueOnce({});
        window.confirm = jest.fn(() => true);
        render(<MemoryRouter><MyProjects /></MemoryRouter>);
        expect(await screen.findByText('Test Project')).toBeInTheDocument();
        fireEvent.click(screen.getByTitle(/Delete Project/i));
        await waitFor(() => expect(mockDeleteProjectAPI).toHaveBeenCalled());
    });
});
