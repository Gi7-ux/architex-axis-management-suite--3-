// tests/integration/PHPBackendIntegration.test.ts
import { 
  loginAPI, 
  registerAPI, 
  fetchUserProfileAPI,
  fetchProjectsAPI,
  createProjectAPI,
  ApiError,
  UserLoginData,
  UserRegistrationData,
  CreateProjectPHPData
} from '../../apiService';
import { UserRole, ProjectStatus } from '../../types';
import fetchMock from 'jest-fetch-mock';

describe('PHP Backend Integration Tests', () => {
  const API_BASE_URL = 'http://localhost/backend';
  
  beforeEach(() => {
    fetchMock.resetMocks();
    // Clear any stored tokens
    localStorage.clear();
  });

  describe('Authentication Integration', () => {
    test('should successfully login with valid credentials', async () => {
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
          avatarUrl: null
        }
      };

      fetchMock.mockResponseOnce(JSON.stringify(mockLoginResponse));

      const credentials: UserLoginData = {
        email: 'test@example.com',
        password: 'password123'
      };

      const result = await loginAPI(credentials);

      expect(fetchMock).toHaveBeenCalledWith(
        `${API_BASE_URL}/api.php`,
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'login',
            ...credentials
          })
        })
      );

      expect(result).toEqual(mockLoginResponse);
    });

    test('should handle PHP authentication errors correctly', async () => {
      const mockErrorResponse = {
        success: false,
        message: 'Invalid credentials',
        error: 'INVALID_CREDENTIALS'
      };

      fetchMock.mockResponseOnce(
        JSON.stringify(mockErrorResponse),
        { status: 401 }
      );

      const credentials: UserLoginData = {
        email: 'invalid@example.com',
        password: 'wrongpassword'
      };

      await expect(loginAPI(credentials)).rejects.toThrow(ApiError);
      
      try {
        await loginAPI(credentials);
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).message).toBe('Invalid credentials');
        expect((error as ApiError).status).toBe(401);
      }
    });

    test('should handle PHP server errors gracefully', async () => {
      fetchMock.mockResponseOnce(
        JSON.stringify({ success: false, message: 'Database connection failed' }),
        { status: 500 }
      );

      const credentials: UserLoginData = {
        email: 'test@example.com',
        password: 'password123'
      };

      await expect(loginAPI(credentials)).rejects.toThrow(ApiError);
    });
  });

  describe('User Registration Integration', () => {
    test('should register new user successfully', async () => {
      const mockRegisterResponse = {
        success: true,
        message: 'User registered successfully'
      };

      fetchMock.mockResponseOnce(JSON.stringify(mockRegisterResponse));

      const registrationData: UserRegistrationData = {
        username: 'newuser',
        email: 'newuser@example.com',
        password: 'securepassword123',
        role: 'freelancer' as UserRole
      };

      const result = await registerAPI(registrationData);

      expect(fetchMock).toHaveBeenCalledWith(
        `${API_BASE_URL}/api.php`,
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'register',
            ...registrationData
          })
        })
      );

      expect(result.message).toBe('User registered successfully');
    });

    test('should handle duplicate email registration error', async () => {
      const mockErrorResponse = {
        success: false,
        message: 'Email already exists',
        error: 'DUPLICATE_EMAIL'
      };

      fetchMock.mockResponseOnce(
        JSON.stringify(mockErrorResponse),
        { status: 409 }
      );

      const registrationData: UserRegistrationData = {
        username: 'existinguser',
        email: 'existing@example.com',
        password: 'password123',
        role: 'client' as UserRole
      };

      await expect(registerAPI(registrationData)).rejects.toThrow(ApiError);
    });
  });

  describe('Project Management Integration', () => {
    test('should fetch projects with authentication', async () => {
      const mockProjectsResponse = {
        success: true,
        projects: [
          {
            id: '1',
            title: 'Test Project',
            description: 'A test project',
            status: 'active' as ProjectStatus,
            clientId: '1',
            freelancerId: null,
            budget: 1000,
            deadline: '2025-12-31',
            createdAt: '2025-06-26T00:00:00Z',
            updatedAt: '2025-06-26T00:00:00Z'
          }
        ]
      };

      fetchMock.mockResponseOnce(JSON.stringify(mockProjectsResponse));

      // Mock localStorage token
      localStorage.setItem('authToken', 'mock-jwt-token');

      const result = await fetchProjectsAPI();

      expect(fetchMock).toHaveBeenCalledWith(
        `${API_BASE_URL}/api.php`,
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer mock-jwt-token'
          },
          body: JSON.stringify({
            action: 'get_projects'
          })
        })
      );

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Test Project');
    });

    test('should create project with proper PHP integration', async () => {
      const mockCreateResponse = {
        success: true,
        message: 'Project created successfully',
        project_id: 123
      };

      fetchMock.mockResponseOnce(JSON.stringify(mockCreateResponse));

      localStorage.setItem('authToken', 'mock-jwt-token');

      const projectData: CreateProjectPHPData = {
        title: 'New Project',
        description: 'A new project for testing'
      };

      const result = await createProjectAPI(projectData);

      expect(fetchMock).toHaveBeenCalledWith(
        `${API_BASE_URL}/api.php`,
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer mock-jwt-token'
          },
          body: JSON.stringify({
            action: 'create_project',
            ...projectData
          })
        })
      );

      expect(result.project_id).toBe(123);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle network failures gracefully', async () => {
      fetchMock.mockRejectOnce(new Error('Network error'));

      const credentials: UserLoginData = {
        email: 'test@example.com',
        password: 'password123'
      };

      await expect(loginAPI(credentials)).rejects.toThrow('Network error');
    });

    test('should handle malformed JSON responses from PHP', async () => {
      fetchMock.mockResponseOnce('Invalid JSON response');

      const credentials: UserLoginData = {
        email: 'test@example.com',
        password: 'password123'
      };

      await expect(loginAPI(credentials)).rejects.toThrow();
    });

    test('should handle missing authentication token', async () => {
      localStorage.removeItem('authToken');

      const mockErrorResponse = {
        success: false,
        message: 'Authentication required',
        error: 'NO_TOKEN'
      };

      fetchMock.mockResponseOnce(
        JSON.stringify(mockErrorResponse),
        { status: 401 }
      );

      await expect(fetchProjectsAPI()).rejects.toThrow(ApiError);
    });

    test('should handle PHP timeout errors', async () => {
      fetchMock.mockResponseOnce(
        JSON.stringify({ success: false, message: 'Request timeout' }),
        { status: 408 }
      );

      const credentials: UserLoginData = {
        email: 'test@example.com',
        password: 'password123'
      };

      await expect(loginAPI(credentials)).rejects.toThrow(ApiError);
    });
  });

  describe('JWT Token Handling', () => {
    test('should include JWT token in authenticated requests', async () => {
      const mockResponse = {
        success: true,
        user: {
          id: 1,
          username: 'testuser',
          name: 'Test User',
          email: 'test@example.com',
          role: 'freelancer' as UserRole,
          avatarUrl: null
        }
      };

      fetchMock.mockResponseOnce(JSON.stringify(mockResponse));

      localStorage.setItem('authToken', 'test-jwt-token');

      await fetchUserProfileAPI();

      expect(fetchMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-jwt-token'
          })
        })
      );
    });

    test('should handle expired JWT tokens', async () => {
      const mockErrorResponse = {
        success: false,
        message: 'Token expired',
        error: 'TOKEN_EXPIRED'
      };

      fetchMock.mockResponseOnce(
        JSON.stringify(mockErrorResponse),
        { status: 401 }
      );

      localStorage.setItem('authToken', 'expired-jwt-token');

      await expect(fetchUserProfileAPI()).rejects.toThrow(ApiError);
    });
  });

  describe('CORS and Cross-Origin Handling', () => {
    test('should handle CORS preflight requests', async () => {
      // Mock CORS preflight
      fetchMock.mockResponseOnce('', {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }
      });

      const mockResponse = {
        success: true,
        projects: []
      };

      fetchMock.mockResponseOnce(JSON.stringify(mockResponse));

      localStorage.setItem('authToken', 'test-token');

      const result = await fetchProjectsAPI();

      expect(result).toBeDefined();
    });
  });
});
