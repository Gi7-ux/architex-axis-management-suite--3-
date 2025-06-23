import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import CreateClientProject from './CreateProject';
import { useAuth } from '../AuthContext';
import * as apiService from '../../apiService';
import { UserRole, ProjectStatus } from '../../types';
import { MemoryRouter } from 'react-router-dom';

jest.mock('../../apiService');
const mockCreateProjectAPI = apiService.createProjectAPI as jest.Mock;

jest.mock('../AuthContext');
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

describe('CreateClientProject', () => {
    const mockUser = { id: 1, username: 'client', name: 'Client User', email: 'client@example.com', role: UserRole.CLIENT };
    const fullAuthContext = {
        user: mockUser,
        login: jest.fn(),
        logout: jest.fn(),
        token: 'test-token',
        isLoading: false,
        updateCurrentUserDetails: jest.fn(),
        activeTimerInfo: null,
        startGlobalTimer: jest.fn(),
        stopGlobalTimerAndLog: jest.fn(),
        clearGlobalTimerState: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
        mockUseAuth.mockReturnValue(fullAuthContext);
    });

    it('renders the form', () => {
        render(<MemoryRouter><CreateClientProject /></MemoryRouter>);
        expect(screen.getByLabelText(/Project Title/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Project Description/i)).toBeInTheDocument();
    });

    it('shows error if not authorized', () => {
        mockUseAuth.mockReturnValue({ ...fullAuthContext, user: { ...mockUser, role: UserRole.FREELANCER } });
        render(<MemoryRouter><CreateClientProject /></MemoryRouter>);
        expect(screen.getByText(/not authorized/i)).toBeInTheDocument();
    });

    it('submits the form and shows success', async () => {
        mockCreateProjectAPI.mockResolvedValueOnce({ project_id: 123 });
        render(<MemoryRouter><CreateClientProject /></MemoryRouter>);
        fireEvent.change(screen.getByLabelText(/Project Title/i), { target: { value: 'New Project' } });
        fireEvent.change(screen.getByLabelText(/Project Description/i), { target: { value: 'A test project' } });
        fireEvent.change(screen.getByLabelText(/Initial Status/i), { target: { value: ProjectStatus.OPEN } });
        fireEvent.click(screen.getByRole('button', { name: /Create Project/i }));
        expect(await screen.findByText(/created successfully/i)).toBeInTheDocument();
    });
});
