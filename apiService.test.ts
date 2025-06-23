// apiService.test.ts
import {
  loginAPI,
  registerAPI,
  fetchUserProfileAPI,
  ApiError,
  LoginResponse,
  UserLoginData,
  RegistrationResponse,
  UserRegistrationData,
  UserProfileResponse,
  AuthUser,
  // Project CRUD related imports
  fetchProjectsAPI,
  fetchProjectDetailsAPI,
  createProjectAPI,
  updateProjectAPI,
  deleteProjectAPI,
  ProjectPHPResponse,
  CreateProjectPHPData,
  CreateProjectPHPResponse,
  UpdateProjectPHPData,
  UpdateProjectPHPResponse,
  DeleteProjectPHPResponse,
} from './apiService'; // Adjust path as necessary
import { UserRole, ProjectStatus } from './types';
import fetchMock from 'jest-fetch-mock';

const API_BASE_URL = 'http://localhost/backend'; // As defined in apiService.ts

describe('apiService - Authentication', () => {
  beforeEach(() => {
    fetchMock.resetMocks();
    localStorage.clear(); // Clear localStorage before each test
  });

  // --- loginAPI Tests ---
  describe('loginAPI', () => {
    const loginCredentials: UserLoginData = {
      email: 'test@example.com',
      password: 'password123',
    };

    const mockLoginSuccessResponse: LoginResponse = {
      message: 'Login successful.',
      user: { id: 1, username: 'testuser', email: 'test@example.com', role: UserRole.CLIENT, name: 'Test User' },
      token: 'fake-auth-token',
    };

    it('should successfully log in and store the token', async () => {
      fetchMock.mockResponseOnce(JSON.stringify(mockLoginSuccessResponse));

      const response = await loginAPI(loginCredentials);

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledWith(
        `${API_BASE_URL}/api.php?action=login_user`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(loginCredentials),
        }
      );
      expect(response).toEqual(mockLoginSuccessResponse);
      expect(localStorage.getItem('authToken')).toBe(mockLoginSuccessResponse.token);
    });

    it('should throw ApiError on failed login (401)', async () => {
      const errorResponse = { message: 'Invalid credentials' };
      fetchMock.mockResponseOnce(JSON.stringify(errorResponse), { status: 401 });

      try {
        await loginAPI(loginCredentials);
      } catch (e) {
        const error = e as ApiError;
        expect(error).toBeInstanceOf(ApiError);
        expect(error.status).toBe(401);
        expect(error.data.message).toBe('Invalid credentials');
      }
      expect(localStorage.getItem('authToken')).toBeNull();
    });
  });

  // --- registerAPI Tests ---
  describe('registerAPI', () => {
    const registrationData: UserRegistrationData = {
      username: 'newuser',
      email: 'new@example.com',
      password: 'password123',
      role: UserRole.FREELANCER,
    };
    const mockRegisterSuccessResponse: RegistrationResponse = {
      message: 'User registered successfully.',
    };

    it('should successfully register a user', async () => {
      fetchMock.mockResponseOnce(JSON.stringify(mockRegisterSuccessResponse), { status: 201 });

      const response = await registerAPI(registrationData);

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledWith(
        `${API_BASE_URL}/api.php?action=register_user`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(registrationData),
        }
      );
      expect(response).toEqual(mockRegisterSuccessResponse);
    });

    it('should throw ApiError on failed registration (e.g., 409 Conflict)', async () => {
      const errorResponse = { message: 'Email already exists' };
      fetchMock.mockResponseOnce(JSON.stringify(errorResponse), { status: 409 });

      try {
        await registerAPI(registrationData);
      } catch (e) {
        const error = e as ApiError;
        expect(error).toBeInstanceOf(ApiError);
        expect(error.status).toBe(409);
        expect(error.data.message).toBe('Email already exists');
      }
    });
  });

  // --- fetchUserProfileAPI Tests ---
  describe('fetchUserProfileAPI', () => {
    const mockUserProfile: UserProfileResponse = {
      id: 1,
      username: 'testuser',
      name: 'Test User',
      email: 'test@example.com',
      role: UserRole.CLIENT,
    };

    it('should fetch user profile successfully with a token', async () => {
      localStorage.setItem('authToken', 'fake-auth-token');
      fetchMock.mockResponseOnce(JSON.stringify(mockUserProfile));

      const response = await fetchUserProfileAPI();

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledWith(
        `${API_BASE_URL}/api.php?action=get_user_profile`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer fake-auth-token',
          },
        }
      );
      expect(response).toEqual(mockUserProfile);
    });

    it('should throw ApiError and clear token on 401 unauthorized response', async () => {
      localStorage.setItem('authToken', 'invalid-token');
      const errorResponse = { message: 'Token expired or invalid' };
      fetchMock.mockResponseOnce(JSON.stringify(errorResponse), { status: 401 });

      // Spy on localStorage.removeItem
      const removeItemSpy = jest.spyOn(Storage.prototype, 'removeItem');

      try {
        await fetchUserProfileAPI();
      } catch (e) {
        const error = e as ApiError;
        expect(error).toBeInstanceOf(ApiError);
        expect(error.status).toBe(401);
        expect(error.data.message).toBe('Token expired or invalid');
      }

      expect(removeItemSpy).toHaveBeenCalledWith('authToken');
      expect(localStorage.getItem('authToken')).toBeNull(); // Verify it was actually removed

      removeItemSpy.mockRestore(); // Clean up spy
    });

    it('should attempt fetch without Authorization header if no token in localStorage', async () => {
      // Backend should reject this, but we're testing apiService's behavior.
      // apiFetch will not add the Authorization header if no token is found.
      fetchMock.mockResponseOnce(JSON.stringify({ message: 'Authorization required' }), { status: 401 });

      await expect(fetchUserProfileAPI()).rejects.toThrow(ApiError);

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const calledUrl = fetchMock.mock.calls[0][0];
      const calledOptions = fetchMock.mock.calls[0][1] as RequestInit | undefined; // Make calledOptions optional

      expect(calledUrl).toBe(`${API_BASE_URL}/api.php?action=get_user_profile`);
      // Check that Authorization header is NOT present
      // Ensure calledOptions and its headers property are defined before accessing
      const headers = calledOptions?.headers as Record<string, string> | undefined;
      expect(headers?.['Authorization']).toBeUndefined();
    });
  });
});


describe('apiService - Project CRUD', () => {
  beforeEach(() => {
    fetchMock.resetMocks();
    localStorage.clear();
  });

  const mockProjectList: ProjectPHPResponse[] = [
    { id: 1, client_id: 10, title: 'Project Alpha', description: 'Desc Alpha', status: ProjectStatus.OPEN, freelancer_id: null, client_username: 'clientUser', freelancer_username: null, created_at: '2023-01-01T00:00:00Z', updated_at: '2023-01-01T00:00:00Z', deadline: '2023-03-01T00:00:00Z', budget: 1000, currency: 'USD', paymentType: 'fixed', experienceLevel: 'beginner', duration: '1 month', skills_required: [], isFeatured: false },
    { id: 2, client_id: 11, title: 'Project Beta', description: 'Desc Beta', status: ProjectStatus.IN_PROGRESS, freelancer_id: 20, client_username: 'anotherClient', freelancer_username: 'freelancerX', created_at: '2023-01-02T00:00:00Z', updated_at: '2023-01-02T00:00:00Z', deadline: '2023-04-01T00:00:00Z', budget: 2000, currency: 'USD', paymentType: 'hourly', experienceLevel: 'expert', duration: '3 months', skills_required: [], isFeatured: false },
  ];

  const mockSingleProject: ProjectPHPResponse = mockProjectList[0];

  // --- fetchProjectsAPI Tests ---
  describe('fetchProjectsAPI', () => {
    it('should fetch all projects successfully', async () => {
      fetchMock.mockResponseOnce(JSON.stringify(mockProjectList));
      const projects = await fetchProjectsAPI();
      expect(fetchMock).toHaveBeenCalledWith(`${API_BASE_URL}/api.php?action=get_projects`, expect.objectContaining({ method: 'GET' }));
      expect(projects).toEqual(mockProjectList);
    });

    it('should fetch projects with a status filter', async () => {
      fetchMock.mockResponseOnce(JSON.stringify([mockProjectList[1]]));
      const statusToFilter = 'in_progress' as ProjectStatus;
      const projects = await fetchProjectsAPI({ status: statusToFilter });
      expect(fetchMock).toHaveBeenCalledWith(`${API_BASE_URL}/api.php?action=get_projects&status=${statusToFilter}`, expect.objectContaining({ method: 'GET' }));
      expect(projects).toEqual([mockProjectList[1]]);
    });

    it('should throw ApiError on server error', async () => {
      fetchMock.mockResponseOnce(JSON.stringify({ message: 'Server Error' }), { status: 500 });
      await expect(fetchProjectsAPI()).rejects.toThrow(ApiError);
    });
  });

  // --- fetchProjectDetailsAPI Tests ---
  describe('fetchProjectDetailsAPI', () => {
    it('should fetch project details successfully', async () => {
      fetchMock.mockResponseOnce(JSON.stringify(mockSingleProject));
      const project = await fetchProjectDetailsAPI(mockSingleProject.id);
      expect(fetchMock).toHaveBeenCalledWith(`${API_BASE_URL}/api.php?action=get_projects&id=${mockSingleProject.id}`, expect.objectContaining({ method: 'GET' }));
      expect(project).toEqual(mockSingleProject);
    });

    it('should throw ApiError if project not found (404)', async () => {
      fetchMock.mockResponseOnce(JSON.stringify({ message: 'Not Found' }), { status: 404 });
      await expect(fetchProjectDetailsAPI(999)).rejects.toThrow(ApiError);
    });
  });

  // --- createProjectAPI Tests ---
  describe('createProjectAPI', () => {
    const projectData: CreateProjectPHPData = { title: 'New Project', description: 'A fresh start' };
    const mockCreateResponse: CreateProjectPHPResponse = { message: 'Project created', project_id: 3 };

    it('should create a project successfully with auth token', async () => {
      localStorage.setItem('authToken', 'fake-auth-token');
      fetchMock.mockResponseOnce(JSON.stringify(mockCreateResponse), { status: 201 });

      const response = await createProjectAPI(projectData);

      expect(fetchMock).toHaveBeenCalledWith(
        `${API_BASE_URL}/api.php?action=create_project`,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ Authorization: 'Bearer fake-auth-token', 'Content-Type': 'application/json' }),
          body: JSON.stringify(projectData),
        })
      );
      expect(response).toEqual(mockCreateResponse);
    });

    it('should throw ApiError on failed creation (e.g., 400)', async () => {
      localStorage.setItem('authToken', 'fake-auth-token');
      fetchMock.mockResponseOnce(JSON.stringify({ message: 'Bad Request' }), { status: 400 });
      await expect(createProjectAPI(projectData)).rejects.toThrow(ApiError);
    });
  });

  // --- updateProjectAPI Tests ---
  describe('updateProjectAPI', () => {
    const projectIdToUpdate = '1'; // String, as per function signature
    const projectUpdateData: UpdateProjectPHPData = { title: 'Updated Project Title' };
    const mockUpdateResponse: UpdateProjectPHPResponse = { message: 'Project updated' };

    it('should update a project successfully with auth token', async () => {
      localStorage.setItem('authToken', 'fake-auth-token');
      fetchMock.mockResponseOnce(JSON.stringify(mockUpdateResponse));

      const response = await updateProjectAPI(projectIdToUpdate, projectUpdateData);

      expect(fetchMock).toHaveBeenCalledWith(
        `${API_BASE_URL}/api.php?action=update_project&id=${projectIdToUpdate}`,
        expect.objectContaining({
          method: 'PUT',
          headers: expect.objectContaining({ Authorization: 'Bearer fake-auth-token', 'Content-Type': 'application/json' }),
          body: JSON.stringify(projectUpdateData),
        })
      );
      expect(response).toEqual(mockUpdateResponse);
    });

    it('should throw ApiError on failed update (e.g., 404)', async () => {
      localStorage.setItem('authToken', 'fake-auth-token');
      fetchMock.mockResponseOnce(JSON.stringify({ message: 'Not Found' }), { status: 404 });
      await expect(updateProjectAPI(projectIdToUpdate, projectUpdateData)).rejects.toThrow(ApiError);
    });
  });

  // --- deleteProjectAPI Tests ---
  describe('deleteProjectAPI', () => {
    const projectIdToDelete = '1'; // String, as per function signature
    const mockDeleteResponse: DeleteProjectPHPResponse = { message: 'Project deleted' };

    it('should delete a project successfully with auth token', async () => {
      localStorage.setItem('authToken', 'fake-auth-token');
      fetchMock.mockResponseOnce(JSON.stringify(mockDeleteResponse));

      const response = await deleteProjectAPI(projectIdToDelete);

      expect(fetchMock).toHaveBeenCalledWith(
        `${API_BASE_URL}/api.php?action=delete_project&id=${projectIdToDelete}`,
        expect.objectContaining({
          method: 'DELETE',
          headers: expect.objectContaining({ Authorization: 'Bearer fake-auth-token', 'Content-Type': 'application/json' }), // Content-Type might not be sent by default on DELETE with no body by apiFetch
        })
      );
      expect(response).toEqual(mockDeleteResponse);
    });

    it('should throw ApiError on failed deletion (e.g., 403)', async () => {
      localStorage.setItem('authToken', 'fake-auth-token');
      fetchMock.mockResponseOnce(JSON.stringify({ message: 'Forbidden' }), { status: 403 });
      await expect(deleteProjectAPI(projectIdToDelete)).rejects.toThrow(ApiError);
    });
  });
});

describe('apiService - apiFetch and ApiError', () => {
  beforeEach(() => {
    fetchMock.resetMocks();
    localStorage.clear();
  });

  // --- ApiError Class Tests ---
  describe('ApiError Class', () => {
    it('should correctly construct an ApiError object', () => {
      const errorMessage = 'Test error';
      const errorStatus = 400;
      const errorData = { message: 'Something went wrong' };
      const apiError = new ApiError(errorMessage, errorStatus, errorData);

      expect(apiError).toBeInstanceOf(ApiError);
      expect(apiError.name).toBe('ApiError');
      expect(apiError.message).toBe(errorMessage);
      expect(apiError.status).toBe(errorStatus);
      expect(apiError.data).toEqual(errorData);
    });

    it('should construct with default empty data if not provided', () => {
      const apiError = new ApiError('Another error', 500);
      expect(apiError.status).toBe(500);
      expect(apiError.data).toEqual({});
    });
  });

  // --- apiFetch Error Handling (tested via other API functions as proxies) ---
  describe('apiFetch error and response handling', () => {
    it('should throw ApiError with parsed JSON data for non-ok JSON response', async () => {
      const errorResponseJson = { code: 'E123', message: 'Detailed error from API' };
      fetchMock.mockResponseOnce(JSON.stringify(errorResponseJson), { status: 400 });

      try {
        await fetchProjectsAPI(); // Using fetchProjectsAPI to trigger apiFetch
      } catch (e) {
        const error = e as ApiError;
        expect(error).toBeInstanceOf(ApiError);
        expect(error.status).toBe(400);
        expect(error.data).toEqual(errorResponseJson);
        // apiService.ts's ApiError constructor prefers errorData.message if available
        expect(error.message).toBe(errorResponseJson.message);
      }
    });

    it('should throw ApiError with status text for non-ok non-JSON response', async () => {
      const errorResponseText = 'Internal Server Error - HTML page';
      fetchMock.mockResponseOnce(errorResponseText, {
        status: 500,
        headers: { 'Content-Type': 'text/html' },
      });

      try {
        await fetchProjectsAPI();
      } catch (e) {
        const error = e as ApiError;
        expect(error).toBeInstanceOf(ApiError);
        expect(error.status).toBe(500);
        expect(error.message).toContain('API Error: 500');
        expect(error.data).toEqual({}); // data is empty as JSON parsing failed
      }
    });

    it('should clear authToken from localStorage on 401 error if token exists', async () => {
      localStorage.setItem('authToken', 'existing-invalid-token');
      const removeItemSpy = jest.spyOn(Storage.prototype, 'removeItem');
      fetchMock.mockResponseOnce(JSON.stringify({ message: 'Unauthorized' }), { status: 401 });

      // Using fetchUserProfileAPI as it's an authenticated endpoint
      await expect(fetchUserProfileAPI()).rejects.toThrow(ApiError);

      expect(removeItemSpy).toHaveBeenCalledWith('authToken');
      expect(localStorage.getItem('authToken')).toBeNull();
      removeItemSpy.mockRestore();
    });

    it('should clear authToken from localStorage on 403 error if token exists', async () => {
      localStorage.setItem('authToken', 'existing-forbidden-token');
      const removeItemSpy = jest.spyOn(Storage.prototype, 'removeItem');
      fetchMock.mockResponseOnce(JSON.stringify({ message: 'Forbidden' }), { status: 403 });

      await expect(fetchUserProfileAPI()).rejects.toThrow(ApiError);

      expect(removeItemSpy).toHaveBeenCalledWith('authToken');
      expect(localStorage.getItem('authToken')).toBeNull();
      removeItemSpy.mockRestore();
    });

    it('should NOT call removeItem if no authToken exists on 401/403 error', async () => {
      expect(localStorage.getItem('authToken')).toBeNull(); // Ensure no token
      const removeItemSpy = jest.spyOn(Storage.prototype, 'removeItem');
      fetchMock.mockResponseOnce(JSON.stringify({ message: 'Unauthorized' }), { status: 401 });

      await expect(fetchUserProfileAPI()).rejects.toThrow(ApiError);

      expect(removeItemSpy).not.toHaveBeenCalled(); // Corrected: not.toHaveBeenCalledWith('authToken')
      removeItemSpy.mockRestore();
    });

    it('should return null for 204 No Content response', async () => {
      fetchMock.mockResponseOnce(null, { status: 204 });
      localStorage.setItem('authToken', 'fake-auth-token'); // deleteProjectAPI requires auth

      // deleteProjectAPI is used as an example. Its declared return type is Promise<DeleteProjectPHPResponse>,
      // but apiFetch underneath will return null for a 204.
      const response = await deleteProjectAPI("any-project-id-for-204-test");

      expect(response).toBeNull();
      expect(fetchMock).toHaveBeenCalledTimes(1);
      // We can also check that the correct request was made for deleteProjectAPI
      expect(fetchMock).toHaveBeenCalledWith(
        `${API_BASE_URL}/api.php?action=delete_project&id=any-project-id-for-204-test`,
        expect.objectContaining({
          method: 'DELETE',
          headers: expect.objectContaining({ Authorization: 'Bearer fake-auth-token' }),
        })
      );
    });
  });
});
