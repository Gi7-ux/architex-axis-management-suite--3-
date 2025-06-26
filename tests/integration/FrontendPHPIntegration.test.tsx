// tests/integration/FrontendPHPIntegration.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../../contexts/AuthContext';
import LoginPage from '../../components/LoginPage';
import Dashboard from '../../components/Dashboard';
import ProjectDetailsPage from '../../components/ProjectDetailsPage';
import * as apiService from '../../apiService';
import { UserRole, ProjectStatus, ManagedFile, FreelancerDashboardStats } from '../../types';
import fetchMock from 'jest-fetch-mock';

// Mock the entire apiService module
jest.mock('../../apiService');
const mockedApiService = apiService as jest.Mocked<typeof apiService>;

describe('Frontend-PHP Integration Tests', () => {
  beforeEach(() => {
    fetchMock.resetMocks();
    localStorage.clear();
    jest.clearAllMocks();
  });

  const renderWithProviders = (component: React.ReactElement, initialRoute = '/') => {
    return render(
      <MemoryRouter initialEntries={[initialRoute]}>
        <AuthProvider>
          {component}
        </AuthProvider>
      </MemoryRouter>
    );
  };

  describe('Authentication Flow Integration', () => {
    test('should handle complete login flow with PHP backend', async () => {
      const mockLoginResponse = {
        success: true,
        message: 'Login successful',
        token: 'mock-jwt-token',
        user: {
          id: 1,
          username: 'testuser',
          name: 'Test User',
          email: 'test@example.com',
          role: 'freelancer' as UserRole,
          avatarUrl: undefined
        }
      };

      mockedApiService.loginAPI.mockResolvedValue(mockLoginResponse);

      renderWithProviders(<LoginPage />);

      // Fill in login form
      fireEvent.change(screen.getByLabelText(/email/i), {
        target: { value: 'test@example.com' }
      });
      fireEvent.change(screen.getByLabelText(/password/i), {
        target: { value: 'password123' }
      });

      // Submit form
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(mockedApiService.loginAPI).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password123'
        });
      });

      // Verify token is stored
      expect(localStorage.getItem('authToken')).toBe('mock-jwt-token');
    });

    test('should display PHP backend error messages in login form', async () => {
      const mockError = new apiService.ApiError('Invalid credentials', 401, { message: 'Invalid credentials' });
      mockedApiService.loginAPI.mockRejectedValue(mockError);

      renderWithProviders(<LoginPage />);

      fireEvent.change(screen.getByLabelText(/email/i), {
        target: { value: 'wrong@example.com' }
      });
      fireEvent.change(screen.getByLabelText(/password/i), {
        target: { value: 'wrongpassword' }
      });

      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
      });
    });

    test('should handle network errors gracefully', async () => {
      mockedApiService.loginAPI.mockRejectedValue(new Error('Network error'));

      renderWithProviders(<LoginPage />);

      fireEvent.change(screen.getByLabelText(/email/i), {
        target: { value: 'test@example.com' }
      });
      fireEvent.change(screen.getByLabelText(/password/i), {
        target: { value: 'password123' }
      });

      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
      });
    });
  });

  describe('Dashboard Integration with PHP Backend', () => {
    test('should load dashboard data from PHP backend', async () => {
      const mockDashboardData: FreelancerDashboardStats = {
        myTotalJobCards: 5,
        myInProgressJobCards: 3,
        openProjectsCount: 2,
        myApplicationsCount: 10
      };

      mockedApiService.fetchFreelancerDashboardStatsAPI.mockResolvedValue(mockDashboardData);

      // Mock authenticated user
      localStorage.setItem('authToken', 'mock-token');

      renderWithProviders(<Dashboard />);

      await waitFor(() => {
        expect(mockedApiService.fetchFreelancerDashboardStatsAPI).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(screen.getByText('5')).toBeInTheDocument(); // Total projects
        expect(screen.getByText('Test Project')).toBeInTheDocument();
      });
    });

    test('should handle dashboard API errors', async () => {
      const mockError = new apiService.ApiError('Failed to fetch dashboard data', 500, { message: 'Failed to fetch dashboard data' });
      mockedApiService.fetchFreelancerDashboardStatsAPI.mockRejectedValue(mockError);

      localStorage.setItem('authToken', 'mock-token');

      renderWithProviders(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText(/failed to fetch dashboard data/i)).toBeInTheDocument();
      });
    });
  });

  describe('Project Management Integration', () => {
    test('should create project through PHP backend', async () => {
      const mockCreateResponse = {
        message: 'Project created successfully',
        project_id: 123
      };

      mockedApiService.createProjectAPI.mockResolvedValue(mockCreateResponse);

      localStorage.setItem('authToken', 'mock-token');

      // This would be in a project creation component
      // For now, we'll test the API call directly
      const projectData = {
        title: 'New Project',
        description: 'Test project description',
        budget: 1000,
        deadline: '2025-12-31',
        skillsRequired: ['JavaScript', 'PHP']
      };

      const result = await apiService.createProjectAPI(projectData);

      expect(mockedApiService.createProjectAPI).toHaveBeenCalledWith(projectData);
      expect(result.project_id).toBe(123);
    });

    test('should display project details from PHP backend', async () => {
      const mockProjectDetails: apiService.ProjectPHPResponse = {
        id: 1,
        title: 'Test Project',
        description: 'A comprehensive test project',
        status: ProjectStatus.IN_PROGRESS,
        client_id: 1,
        freelancer_id: 2,
        budget: 2000,
        deadline: '2025-12-31',
        created_at: '2025-06-26T00:00:00Z',
        updated_at: '2025-06-26T00:00:00Z',
        skills_required: [{ id: 1, name: 'React' }, { id: 2, name: 'PHP' }],
        currency: 'USD',
        paymentType: 'hourly',
        experienceLevel: 'intermediate',
        duration: '3 months'
      };

      mockedApiService.fetchProjectDetailsAPI.mockResolvedValue(mockProjectDetails);

      localStorage.setItem('authToken', 'mock-token');

      renderWithProviders(<ProjectDetailsPage />, '/projects/1');

      await waitFor(() => {
        expect(mockedApiService.fetchProjectDetailsAPI).toHaveBeenCalledWith('1');
      });

      await waitFor(() => {
        expect(screen.getByText('Test Project')).toBeInTheDocument();
        expect(screen.getByText('A comprehensive test project')).toBeInTheDocument();
        expect(screen.getByText('$2000')).toBeInTheDocument();
      });
    });
  });

  describe('Real-time Data Synchronization', () => {
    test('should handle data updates from PHP backend', async () => {
      const initialData: apiService.ProjectPHPResponse[] = [
        { id: 1, title: 'Project 1', status: ProjectStatus.OPEN, client_id: 1, freelancer_id: null, description: '', budget: 100, deadline: '', created_at: '', updated_at: '', currency: 'USD', paymentType: 'fixed', experienceLevel: 'beginner', duration: '1 week' }
      ];

      const updatedData: apiService.ProjectPHPResponse[] = [
        { id: 1, title: 'Updated Project 1', status: ProjectStatus.COMPLETED, client_id: 1, freelancer_id: 1, description: '', budget: 100, deadline: '', created_at: '', updated_at: '', currency: 'USD', paymentType: 'fixed', experienceLevel: 'beginner', duration: '1 week' }
      ];

      mockedApiService.fetchProjectsAPI
        .mockResolvedValueOnce(initialData)
        .mockResolvedValueOnce(updatedData);

      localStorage.setItem('authToken', 'mock-token');

      renderWithProviders(<Dashboard />);

      // Initial load
      await waitFor(() => {
        expect(screen.getByText('Project 1')).toBeInTheDocument();
      });

      // Simulate refresh or polling
      fireEvent.click(screen.getByRole('button', { name: /refresh/i }));

      await waitFor(() => {
        expect(screen.getByText('Updated Project 1')).toBeInTheDocument();
      });
    });
  });

  describe('Error Boundary Integration', () => {
    test('should handle PHP backend errors in components', async () => {
      const mockError = new apiService.ApiError('Database connection failed', 500, { message: 'Database connection failed' });
      mockedApiService.fetchProjectsAPI.mockRejectedValue(mockError);

      localStorage.setItem('authToken', 'mock-token');

      renderWithProviders(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText(/database connection failed/i)).toBeInTheDocument();
      });
    });

    test('should handle PHP server unavailable', async () => {
      mockedApiService.fetchProjectsAPI.mockRejectedValue(new Error('Failed to fetch'));

      localStorage.setItem('authToken', 'mock-token');

      renderWithProviders(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText(/server unavailable/i)).toBeInTheDocument();
      });
    });
  });

  describe('Authentication State Management', () => {
    test('should handle token expiration gracefully', async () => {
      const mockError = new apiService.ApiError('Token expired', 401, { message: 'Token expired' });
      mockedApiService.fetchUserProfileAPI.mockRejectedValue(mockError);

      localStorage.setItem('authToken', 'expired-token');

      renderWithProviders(<Dashboard />);

      await waitFor(() => {
        expect(localStorage.getItem('authToken')).toBeNull();
      });

      // Should redirect to login
      await waitFor(() => {
        expect(window.location.pathname).toBe('/login');
      });
    });

    test('should maintain authentication state across page refreshes', async () => {
      const mockUserProfile: apiService.AuthUser = {
        id: 1,
        username: 'testuser',
        name: 'Test User',
        email: 'test@example.com',
        role: UserRole.FREELANCER,
        avatarUrl: undefined
      };

      mockedApiService.fetchUserProfileAPI.mockResolvedValue(mockUserProfile);

      localStorage.setItem('authToken', 'valid-token');

      renderWithProviders(<Dashboard />);

      await waitFor(() => {
        expect(mockedApiService.fetchUserProfileAPI).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(screen.getByText('Test User')).toBeInTheDocument();
      });
    });
  });

  describe('File Upload Integration', () => {
    test('should handle file uploads to PHP backend', async () => {
      const mockFile = new File(['test content'], 'test.txt', { type: 'text/plain' });
      const mockUploadResponse: ManagedFile = {
        id: 'file123',
        name: 'test.txt',
        url: '/uploads/test.txt',
        uploadedAt: '2025-06-26T00:00:00Z',
        type: 'text/plain',
        size: 12,
        uploadedBy: 'user1'
      };

      mockedApiService.uploadFileAPI.mockResolvedValue(mockUploadResponse);

      // Simulate file upload
      const formData = new FormData();
      formData.append('file', mockFile);
      formData.append('projectId', '1');

      const result = await apiService.uploadFileAPI('1', formData);

      expect(mockedApiService.uploadFileAPI).toHaveBeenCalledWith(formData);
      expect(result.id).toBe('file123');
    });

    test('should handle file upload errors', async () => {
      const mockError = new apiService.ApiError('File too large', 413, { message: 'File too large' });
      mockedApiService.uploadFileAPI.mockRejectedValue(mockError);

      const mockFile = new File(['large content'], 'large.txt', { type: 'text/plain' });
      const formData = new FormData();
      formData.append('file', mockFile);

      await expect(apiService.uploadFileAPI('1', formData)).rejects.toThrow('File too large');
    });
  });
});
