import { User, Project, Application, JobCard, TimeLog, ManagedFile, Conversation, Message, UserRole, ProjectStatus, JobCardStatus, MessageStatus } from './types';

// Payload for user registration
export interface UserRegistrationData {
  username: string;
  email: string;
  password: string;
  role: UserRole; // 'freelancer', 'client', or 'admin'
}

// Response from successful registration (message only)
export interface RegistrationResponse {
  message: string;
}

// Payload for user login
export interface UserLoginData {
  email: string;
  password: string;
}

// User object returned by PHP login/profile (subset of main User type)
export interface AuthUser {
  id: number; // PHP returns id as number
  username: string;
  email: string;
  role: UserRole;
}

// Response from successful login
export interface LoginResponse {
  message: string;
  user: AuthUser;
  token: string;
}

// User profile data (matches AuthUser for now, can be extended)
export type UserProfileResponse = AuthUser;

// User data returned by get_all_users (can reuse AuthUser or a more detailed AdminUserView)
export interface AdminUserView { // Or extend AuthUser if more fields are needed from get_all_users
  id: number;
  username: string;
  email: string;
  role: UserRole;
  created_at: string; // PHP returns this
  is_active: boolean; // Added for Phase 6a
}

// Payload for updating a user's role
export interface AdminUpdateUserRolePayload {
  user_id: number; // Or string, if frontend uses string IDs consistently
  new_role: UserRole;
}

// Generic success message response for admin actions
export interface AdminActionResponse {
  message: string;
}

// --- Notification Service Types --- START
export interface Notification {
  id: number;
  user_id: number | null; // Recipient admin (or null if for all admins - backend currently targets specific admins)
  message_key: string;
  related_entity_type: string | null;
  related_entity_id: number | null;
  is_read: boolean; // Backend sends 0/1
  created_at: string; // ISO8601
}

// Response type for fetching notifications (includes pagination info from backend)
export interface FetchAdminNotificationsResponse {
    notifications: Notification[];
    total_unread: number;
}

// Response type for marking notifications as read
export interface MarkNotificationsReadResponse {
    message: string;
    marked_read_count: number;
}
// --- Notification Service Types --- END

// --- User Profile Service Types --- START
export interface Skill { // Ensure this is exported and defined if not already
  id: number;
  name: string;
}

export interface MyFullProfileResponse {
  id: number;
  username: string;
  email: string;
  role: UserRole; // Assuming UserRole enum/type exists from './types'
  name: string | null;
  phone_number: string | null;
  company: string | null;
  experience: string | null;
  hourly_rate: number | null;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  skills: Skill[];
}

export interface UpdateMyProfilePayload {
  name?: string | null;
  phone_number?: string | null;
  company?: string | null;
  experience?: string | null;
  avatar_url?: string | null;
  hourly_rate?: number | null;
  skill_ids?: number[];
}

export interface UpdateProfileResponse { // Generic response for profile updates
  message: string;
}
// --- User Profile Service Types --- END

// --- Freelancer Specific Types --- START
export interface FreelancerDashboardStatsResponse {
  myTotalJobCards: number;
  myInProgressJobCards: number;
  openProjectsCount: number;
  myApplicationsCount: number;
}

export interface MyJobCardItem {
  id: number;
  project_id: number;
  project_title: string;
  title: string;
  description: string | null;
  status: string; // Consider JobCardStatus from './types' if applicable
  assigned_freelancer_id: number | null; // Should match current authenticated user's ID
  estimated_hours: number | null;
  created_at: string;
  updated_at: string;
  // Add any other relevant fields returned by the backend if necessary
}
// --- Freelancer Specific Types --- END


// const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || '/api'; // Example if using build-time env vars
const API_BASE_URL = '/backend'; // Using relative path for API calls

interface ApiErrorData {
  message?: string;
  errors?: { param: string, msg: string }[]; // Example for validation errors
}

export class ApiError extends Error {
  status: number;
  data: ApiErrorData;

  constructor(message: string, status: number, data: ApiErrorData = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

// Generic fetch wrapper
async function apiFetch<T>(endpoint: string, options: RequestInit = {}, requiresAuth: boolean = false): Promise<T> { // Add requiresAuth flag
  const { headers, ...restOptions } = options;
  
  let token: string | null = null;
  if (requiresAuth) { // Only get token if endpoint requires authentication
     token = localStorage.getItem('authToken');
     if (!token) {
         // Optionally, you could throw an error here or redirect to login
         console.warn('Auth token not found for authenticated request to', endpoint);
         // For now, let it proceed; backend will reject if token is required and missing/invalid
     }
  }

  const defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json',
    // Only add Authorization header if token exists AND endpoint requires auth
    ...(requiresAuth && token && { 'Authorization': `Bearer ${token}` }),
    ...headers,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...restOptions,
    headers: defaultHeaders,
  });

  if (!response.ok) {
    let errorData: ApiErrorData = {};
    try {
      errorData = await response.json();
    } catch (e) {
      // Ignore if response is not JSON
    }
    // Attempt to clear token on 401 or 403 errors, as it might be invalid/expired
    if (response.status === 401 || response.status === 403) {
        if (localStorage.getItem('authToken')) {
            localStorage.removeItem('authToken');
            // Optionally dispatch an event or call a callback to update auth state (e.g., logout user)
            console.log('Auth token removed due to API error status:', response.status);
            // Consider redirecting to login page here: window.location.href = '/login';
        }
    }
    throw new ApiError(errorData.message || `API Error: ${response.status} ${response.statusText}`, response.status, errorData);
  }

  if (response.status === 204) { // No Content
    return null as T;
  }

  return response.json() as Promise<T>;
}

// --- Notification Service --- START
export interface FetchAdminNotificationsParams {
    limit?: number;
    offset?: number;
    // older_than_id?: number | string; // If using cursor pagination later
}
export const fetchAdminNotificationsAPI = (params?: FetchAdminNotificationsParams): Promise<FetchAdminNotificationsResponse> => {
  const queryParams = new URLSearchParams();
  if (params?.limit) queryParams.append('limit', String(params.limit));
  if (params?.offset) queryParams.append('offset', String(params.offset));

  const queryString = queryParams.toString();
  const endpoint = `/api.php?action=get_admin_notifications${queryString ? '&' + queryString : ''}`;

  return apiFetch<FetchAdminNotificationsResponse>(endpoint, {
    method: 'GET',
  }, true); // Requires Admin Auth
};

export const markNotificationAsReadAPI = (notificationIdOrIds: number | string | (number|string)[]): Promise<MarkNotificationsReadResponse> => {
  const payload = Array.isArray(notificationIdOrIds)
    ? { notification_ids: notificationIdOrIds }
    : { notification_id: notificationIdOrIds };
  return apiFetch<MarkNotificationsReadResponse>(`/api.php?action=mark_notification_as_read`, {
    method: 'POST', // Or 'PUT' as per backend
    body: JSON.stringify(payload),
  }, true); // Requires Admin Auth
};

export const markAllAdminNotificationsAsReadAPI = (): Promise<MarkNotificationsReadResponse> => {
  return apiFetch<MarkNotificationsReadResponse>(`/api.php?action=mark_all_admin_notifications_as_read`, {
    method: 'POST', // Or 'PUT' as per backend
  }, true); // Requires Admin Auth
};
// --- Notification Service --- END

// --- Authentication Service ---
export const registerAPI = (userData: UserRegistrationData): Promise<RegistrationResponse> => {
  return apiFetch<RegistrationResponse>(`/api.php?action=register_user`, {
    method: 'POST',
    body: JSON.stringify(userData),
  }); // Authentication not required for registration
};

export const loginAPI = (credentials: UserLoginData): Promise<LoginResponse> => {
  return apiFetch<LoginResponse>(`/api.php?action=login_user`, {
    method: 'POST',
    body: JSON.stringify(credentials),
  }); // Authentication not required for login
};

export const fetchUserProfileAPI = (): Promise<UserProfileResponse> => {
  // This endpoint requires authentication
  return apiFetch<UserProfileResponse>(`/api.php?action=get_user_profile`, {
    method: 'GET',
  }, true); // Pass true for requiresAuth
};

// --- Admin Service ---
// (Could also be placed in User Service, but Admin Service makes it distinct)

// Payload for Admin to create a new user
export interface AdminCreateUserPayload {
  username: string;
  email: string;
  password: string;
  role: UserRole;
  name?: string;
  phoneNumber?: string | null;
  company?: string | null;
  experience?: string | null;
  hourlyRate?: number | null; // Relevant if role is freelancer
  avatarUrl?: string | null;
  // is_active is typically defaulted to true by backend on creation
}
export interface AdminCreateUserResponse extends AdminActionResponse {
  user_id: number; // ID of the newly created user
}

// For fetching full details of a user for admin editing
// Matches the expanded `users` table schema (excluding sensitive fields)
export interface AdminUserDetailsResponse {
  id: number;
  username: string;
  email: string;
  role: UserRole;
  name: string | null;
  phone_number: string | null;
  company: string | null;
  experience: string | null;
  hourly_rate: number | null;
  avatar_url: string | null;
  is_active: boolean; // Backend sends 0/1, converted to boolean
  created_at: string;
  updated_at: string;
  skills?: Skill[]; // ADDED for skills associated with the user
}

// Payload for Admin to update user details
// All fields are optional. Backend handles which ones are actually updated.
export interface AdminUpdateUserDetailsPayload {
  username?: string;
  email?: string;
  role?: UserRole;
  name?: string | null;
  phone_number?: string | null;
  company?: string | null;
  experience?: string | null;
  hourly_rate?: number | null; // Send null to clear, or number to set/update
  avatar_url?: string | null;
  is_active?: boolean;
  skill_ids?: number[]; // ADDED for updating user's skills
  // Password changes should be separate, more secure endpoint
}
// AdminUpdateUserRolePayload already exists for just role changes.
// AdminActionResponse can be used for update and delete responses.


// Fetches all users - for Admin
export const adminFetchAllUsersAPI = (): Promise<AdminUserView[]> => {
  return apiFetch<AdminUserView[]>(`/api.php?action=get_all_users`, {
    method: 'GET',
  }, true); // Requires Admin Auth
};

// Updates a user's role - for Admin
export const adminUpdateUserRoleAPI = (payload: AdminUpdateUserRolePayload): Promise<AdminActionResponse> => {
  return apiFetch<AdminActionResponse>(`/api.php?action=update_user_role`, {
    method: 'POST', // Or 'PUT' as per backend
    body: JSON.stringify(payload),
  }, true); // Requires Admin Auth
};

// Create a new user - for Admin
export const adminCreateUserAPI = (payload: AdminCreateUserPayload): Promise<AdminCreateUserResponse> => {
  return apiFetch<AdminCreateUserResponse>(`/api.php?action=admin_create_user`, {
    method: 'POST',
    body: JSON.stringify(payload),
  }, true); // Requires Admin Auth
};

// Fetch full details of a specific user - for Admin
export const adminFetchUserDetailsAPI = (userId: number | string): Promise<AdminUserDetailsResponse> => {
  return apiFetch<AdminUserDetailsResponse>(`/api.php?action=admin_get_user_details&user_id=${userId}`, {
    method: 'GET',
  }, true); // Requires Admin Auth
};

// Update details of a specific user - for Admin
export const adminUpdateUserDetailsAPI = (userId: number | string, payload: AdminUpdateUserDetailsPayload): Promise<AdminActionResponse> => {
  return apiFetch<AdminActionResponse>(`/api.php?action=admin_update_user_details&user_id=${userId}`, {
    method: 'POST', // Or 'PUT' as per backend
    body: JSON.stringify(payload),
  }, true); // Requires Admin Auth
};

// Soft delete (deactivate) a user - for Admin
export const adminDeleteUserAPI = (userId: number | string): Promise<AdminActionResponse> => {
  return apiFetch<AdminActionResponse>(`/api.php?action=admin_delete_user&user_id=${userId}`, {
    // Backend allows user_id in GET for DELETE, or payload for POST
    method: 'DELETE',
  }, true); // Requires Admin Auth
};

// --- User Service ---
// (Existing fetchUsersAPI, fetchUserAPI etc. would remain here)
// ...

// NEW User Profile Management functions
export const fetchMyFullProfileAPI = (): Promise<MyFullProfileResponse> => {
  return apiFetch<MyFullProfileResponse>(`/api.php?action=get_my_profile_details`, {
    method: 'GET',
  }, true); // Requires Auth
};

export const updateMyProfileAPI = (payload: UpdateMyProfilePayload): Promise<UpdateProfileResponse> => {
  return apiFetch<UpdateProfileResponse>(`/api.php?action=update_my_profile`, {
    method: 'POST', // Or 'PUT' as per backend implementation
    body: JSON.stringify(payload),
  }, true); // Requires Auth
};


// --- Project Service ---

// This represents a project object as returned by PHP backend, including usernames
export interface ProjectPHPResponse extends Omit<Project, 'id' | 'clientId' | 'freelancerId' | 'clientName' | 'assignedFreelancerName' | 'jobCards' | 'skillsRequired' > {
  id: number;
  client_id: number;
  freelancer_id: number | null;
  client_username?: string | null;      // Added by backend
  freelancer_username?: string | null;  // Added by backend
  // Other fields like title, description, status, budget, deadline, createdAt, updatedAt are assumed compatible
  skills_required?: Skill[]; // ADDED for project's required skills
  // jobCards and skillsRequired would be populated by separate calls or if backend includes them
}

export const fetchProjectsAPI = (params?: { status?: ProjectStatus | 'all' }): Promise<ProjectPHPResponse[]> => {
  let endpoint = "/api.php?action=get_projects";
  const queryParams = new URLSearchParams();
  if (params?.status) {
    queryParams.append('status', params.status);
  }
  // Removed clientId and freelancerId filters from here as they are not on general get_projects
  const queryString = queryParams.toString();
  if (queryString) {
    endpoint += `&${queryString}`;
  }
  return apiFetch<ProjectPHPResponse[]>(endpoint, { method: 'GET' }, false);
};

// Update fetchProjectDetailsAPI to use the get_projects?id=X backend logic
// This will now return ProjectPHPResponse, which components will map to the full Project type
export const fetchProjectDetailsAPI = (projectId: number | string): Promise<ProjectPHPResponse> => {
  console.log("fetchProjectDetailsAPI now uses get_projects with ID for PHP backend.");
  return apiFetch<ProjectPHPResponse>(`/api.php?action=get_projects&id=${projectId}`, {
      method: 'GET'
  }, false); // Assuming public access for now, or true if details need auth
};

// Definition for data expected by PHP backend for project creation
export interface CreateProjectPHPData {
  title: string;
  description: string;
  freelancer_id?: number | null; // Allow null for unassigning
  status?: string;
  client_id?: number; // Optional: For admin creating project for a specific client
}

// Definition for the response from PHP backend after project creation
export interface CreateProjectPHPResponse {
  message: string;
  project_id: number;
}

export const createProjectAPI = (projectData: CreateProjectPHPData): Promise<CreateProjectPHPResponse> => {
  // Note: The Project type from './types' might differ from what the PHP backend expects.
  // The backend expects: title, description. Optional: freelancer_id, status.
  // client_id is set by the backend from the authenticated user.
  // The backend returns: { message: string; project_id: number }
  return apiFetch<CreateProjectPHPResponse>(`/api.php?action=create_project`, {
    method: 'POST',
    body: JSON.stringify(projectData),
  }, true); // Requires Auth
};

// Definition for data expected by PHP backend for project update
// PHP expects specific fields: title, description, freelancer_id, status
export interface UpdateProjectPHPData {
  title?: string;
  description?: string;
  freelancer_id?: number | null; // Allow null for unassigning
  status?: string;
  client_id?: number; // Optional: For admin re-assigning project to a new client
  skill_ids?: number[]; // ADDED for updating project's required skills
}

export interface UpdateProjectPHPResponse {
    message: string;
}

export const updateProjectAPI = (projectId: string, projectData: UpdateProjectPHPData): Promise<UpdateProjectPHPResponse> => {
    // The PHP backend for update_project expects specific fields: title, description, freelancer_id, status.
    // It also expects freelancer_id as an integer.
    // The endpoint is api.php?action=update_project&id=${projectId}
    // Ensure projectData conforms to UpdateProjectPHPData, especially if using data from existing Project type.
    // e.g. if projectData contains 'clientId', it needs to be mapped to 'client_id' if that were a field for update (it's not for this backend).
    return apiFetch<UpdateProjectPHPResponse>(`/api.php?action=update_project&id=${projectId}`, {
        method: 'PUT', // PHP script uses PUT for update
        body: JSON.stringify(projectData)
    }, true); // Requires Auth
};

export interface DeleteProjectPHPResponse {
    message: string;
}

export const deleteProjectAPI = (projectId: string): Promise<DeleteProjectPHPResponse> => {
  // PHP backend returns { message: string }
  return apiFetch<DeleteProjectPHPResponse>(`/api.php?action=delete_project&id=${projectId}`, {
    method: 'DELETE'
  }, true); // Requires Auth
};

// New function to fetch projects for the authenticated client
export const fetchClientProjectsAPI = (filters?: { status?: ProjectStatus }): Promise<Project[]> => {
  let endpoint = "/api.php?action=get_client_projects";
  if (filters?.status) {
    endpoint += `&status=${filters.status}`;
  }
  // Assumes the backend returns projects that can be mapped to the frontend Project type.
  // Data mapping might be needed in the component if backend structure differs significantly.
  return apiFetch<Project[]>(endpoint, {
    method: 'GET',
  }, true); // Requires Auth
};


// export const updateProjectStatusAPI = (projectId: string, status: ProjectStatus): Promise<Project> => {
//   // TODO: This functionality needs to be mapped to the new PHP backend if required.
//   // The current PHP backend's updateProjectAPI can handle status changes.
//   // This might involve calling updateProjectAPI with { status: status }.
//   console.warn("updateProjectStatusAPI is commented out and needs review for PHP backend integration.");
//   return apiFetch<Project>(`/projects/${projectId}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
// };

// export const toggleProjectArchiveStatusAPI = (projectId: string): Promise<Project> => {
//     // TODO: This functionality needs to be mapped to the new PHP backend if required.
//     // The concept of 'isArchived' is not in the current PHP project schema.
//     console.warn("toggleProjectArchiveStatusAPI is commented out and needs review for PHP backend integration.");
//     return apiFetch<Project>(`/projects/${projectId}/archive-toggle`, { method: 'PATCH' });
// };

// --- Application Service ---

// Matches the structure from `get_project_applications` PHP endpoint
export interface ProjectApplicationPHPResponse extends Application { // Extends base Application from types.ts
  freelancer_username: string;
  freelancer_email: string;
  // bid_amount is already part of Application type, ensure its type matches (number | string)
  // The PHP backend converts bid_amount to float, so number is appropriate here.
}

// Modified fetchApplicationsForProjectAPI:
export const fetchApplicationsForProjectAPI = (projectId: string): Promise<ProjectApplicationPHPResponse[]> => {
  return apiFetch<ProjectApplicationPHPResponse[]>(`/api.php?action=get_project_applications&project_id=${projectId}`, {
    method: 'GET',
  }, true); // Requires Auth
};

// New function to update application status
export interface UpdateApplicationStatusPayload {
  status: 'accepted' | 'rejected' | 'archived_by_client'; // Valid statuses client can set
}
export interface UpdateApplicationStatusResponse {
  message: string;
}

export const updateApplicationStatusAPI = (applicationId: string, payload: UpdateApplicationStatusPayload): Promise<UpdateApplicationStatusResponse> => {
  return apiFetch<UpdateApplicationStatusResponse>(`/api.php?action=update_application_status&application_id=${applicationId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  }, true); // Requires Auth
};


// Payload for submitting an application
export interface SubmitApplicationPayload {
  project_id: number; // Or string if your frontend IDs are strings and converted in API layer
  proposal_text: string;
  bid_amount?: number | null; // Align with what backend expects (float/decimal, nullable)
}
export interface SubmitApplicationResponse {
  message: string;
  application_id: number; // Or string
}

// submitApplicationAPI was previously a placeholder. Now implement fully.
export const submitApplicationAPI = (applicationData: SubmitApplicationPayload): Promise<SubmitApplicationResponse> => {
  return apiFetch<SubmitApplicationResponse>(`/api.php?action=submit_application`, {
    method: 'POST',
    body: JSON.stringify(applicationData),
  }, true); // Requires Auth (Freelancer)
};

// Response item for freelancer's own applications
// (includes project details)
export interface FreelancerApplicationResponseItem {
  application_id: number; // Or string
  project_id: number;     // Or string
  proposal_text: string;
  bid_amount?: number | null;
  application_status: string; // e.g., 'pending', 'accepted', 'rejected', 'withdrawn_by_freelancer'
  applied_at: string; // ISO date string
  application_updated_at: string; // ISO date string
  project_title: string;
  project_status: ProjectStatus;
  project_client_id: number; // Or string
}

export const fetchFreelancerApplicationsAPI = (): Promise<FreelancerApplicationResponseItem[]> => {
  return apiFetch<FreelancerApplicationResponseItem[]>(`/api.php?action=get_freelancer_applications`, {
    method: 'GET',
  }, true); // Requires Auth (Freelancer)
};

export interface WithdrawApplicationPayload { // If application_id is sent in payload
    application_id: string; // or number
}
export interface WithdrawApplicationResponse {
    message: string;
}

export const withdrawApplicationAPI = (applicationId: string): Promise<WithdrawApplicationResponse> => {
  // Backend expects application_id via GET param or payload.
  // For consistency with other PUT/POST, let's assume payload, but GET param is also fine.
  // If using GET param: `/api.php?action=withdraw_application&application_id=${applicationId}`
  // If using POST/PUT with payload:
  const payload: WithdrawApplicationPayload = { application_id: applicationId };
  return apiFetch<WithdrawApplicationResponse>(`/api.php?action=withdraw_application`, { // Or use &application_id=${applicationId} in URL for PUT/POST too
    method: 'POST', // Or 'PUT' as per backend implementation
    body: JSON.stringify(payload), // Send if backend expects payload
  }, true); // Requires Auth (Freelancer)
};


// Comment out or remove old acceptApplicationAPI if it's fully replaced by updateApplicationStatusAPI for client role.
// export const acceptApplicationAPI = (applicationId: string): Promise<Application> => {
//   return apiFetch<Application>(`/applications/${applicationId}/accept`, { method: 'PATCH' });
// };


// --- Freelancer Service (can also be part of Project Service or Application Service) ---
// Response item for projects assigned to a freelancer
// (includes client details)
export interface FreelancerAssignedProjectResponseItem extends Project { // Can extend base Project type
  client_username: string;
  // Any other specific fields from the backend query
}

export const fetchFreelancerAssignedProjectsAPI = (): Promise<FreelancerAssignedProjectResponseItem[]> => {
  return apiFetch<FreelancerAssignedProjectResponseItem[]>(`/api.php?action=get_freelancer_assigned_projects`, {
    method: 'GET',
  }, true); // Requires Auth (Freelancer)
};


// --- JobCard Service ---

// Payload for creating a new Job Card
export interface CreateJobCardPayload {
  project_id: number; // PHP backend expects integer project_id
  title: string;
  description?: string | null;
  status?: string; // e.g., 'todo', 'in_progress' (matches backend VARCHAR)
  assigned_freelancer_id?: number | null;
  estimated_hours?: number | null;
}
export interface CreateJobCardResponse {
  message: string;
  job_card_id: number; // PHP returns integer ID
}

// Type for JobCards fetched from PHP, includes freelancer username
export interface JobCardPHPResponse extends Omit<JobCard, 'id' | 'projectId' | 'assignedArchitectId' | 'estimatedTime' | 'status'> {
  id: number; // from PHP
  project_id: number; // from PHP
  status: string; // from PHP (e.g. 'todo')
  assigned_freelancer_id: number | null; // from PHP
  assigned_freelancer_username?: string | null; // from PHP JOIN
  estimated_hours: number | null; // from PHP (DECIMAL)
  // created_at and updated_at are strings, compatible with JobCard type
}


// Payload for updating an existing Job Card
// All fields are optional.
export interface UpdateJobCardPayload {
  title?: string;
  description?: string | null;
  status?: string; // e.g., 'todo', 'in_progress'
  assigned_freelancer_id?: number | null;
  estimated_hours?: number | null;
}
export interface UpdateJobCardResponse {
  message: string;
}

export interface DeleteJobCardResponse {
  message: string;
}

// Create a new Job Card
export const createJobCardAPI = (payload: CreateJobCardPayload): Promise<CreateJobCardResponse> => {
  return apiFetch<CreateJobCardResponse>(`/api.php?action=create_job_card`, {
    method: 'POST',
    body: JSON.stringify(payload),
  }, true); // Requires Auth
};

// Fetch all Job Cards for a given project
// Returns an array of JobCardPHPResponse which then needs to be mapped to frontend JobCard type in component
export const fetchJobCardsForProjectAPI = (projectId: number | string): Promise<JobCardPHPResponse[]> => {
  return apiFetch<JobCardPHPResponse[]>(`/api.php?action=get_project_job_cards&project_id=${projectId}`, {
    method: 'GET',
  }, true); // Requires Auth
};

// Update an existing Job Card
export const updateJobCardAPI = (jobCardId: number | string, payload: UpdateJobCardPayload): Promise<UpdateJobCardResponse> => {
  return apiFetch<UpdateJobCardResponse>(`/api.php?action=update_job_card&job_card_id=${jobCardId}`, {
    method: 'POST', // Or 'PUT' as per backend
    body: JSON.stringify(payload),
  }, true); // Requires Auth
};

// Delete a Job Card
export const deleteJobCardAPI = (jobCardId: number | string): Promise<DeleteJobCardResponse> => {
  // Backend allows job_card_id in payload for POST or GET param for DELETE
  // For a DELETE http method, typically use query param or path param.
  // Using query param for consistency with how update_job_card takes job_card_id in GET
  return apiFetch<DeleteJobCardResponse>(`/api.php?action=delete_job_card&job_card_id=${jobCardId}`, {
    method: 'DELETE', // Or 'POST' if preferred and backend supports it with payload
  }, true); // Requires Auth
};

// Commenting out old/placeholder JobCard APIs:
/*
export const fetchFreelancerJobCardsAPI = (freelancerId: string): Promise<JobCard[]> => apiFetch<JobCard[]>(`/users/${freelancerId}/jobcards`);
export const addJobCardAPI = (projectId: string, jobCardData: Omit<JobCard, 'id' | 'createdAt' | 'updatedAt' | 'projectId' | 'status' | 'timeLogs' | 'actualTimeLogged'>): Promise<JobCard> => {
  return apiFetch<JobCard>(`/projects/${projectId}/jobcards`, { method: 'POST', body: JSON.stringify(jobCardData) });
};
export const updateJobCardAPI = (projectId: string, jobCardId: string, updates: Partial<JobCard>): Promise<JobCard> => {
  return apiFetch<JobCard>(`/projects/${projectId}/jobcards/${jobCardId}`, { method: 'PATCH', body: JSON.stringify(updates) });
};
export const deleteJobCardAPI = (projectId: string, jobCardId: string): Promise<void> => {
  return apiFetch<void>(`/projects/${projectId}/jobcards/${jobCardId}`, { method: 'DELETE' });
};
export const updateJobCardStatusAPI = (projectId: string, jobCardId: string, status: JobCardStatus): Promise<JobCard> => {
  return apiFetch<JobCard>(`/projects/${projectId}/jobcards/${jobCardId}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
};
*/

// --- TimeLog Service --- (Replace or augment existing)

// Payload for creating a new Time Log
export interface LogTimePayload {
  job_card_id: number; // PHP backend expects integer job_card_id
  start_time: string;  // ISO8601 format
  end_time: string;    // ISO8601 format
  notes?: string | null;
  // duration_minutes is calculated by backend
  // user_id is taken from authenticated user by backend
}
export interface LogTimeResponse {
  message: string;
  time_log_id: number; // PHP returns integer ID
  duration_minutes: number;
}

// Type for TimeLogs fetched from PHP, includes logger username
// This extends the base TimeLog from types.ts but ensures backend field names and types
export interface TimeLogPHPResponse extends Omit<TimeLog, 'id' | 'jobCardId' | 'architectId' | 'manualEntry'> {
  id: number; // from PHP
  job_card_id: number; // from PHP
  user_id: number; // from PHP (logger's ID)
  logger_username?: string; // from PHP JOIN (in get_job_card_time_logs)
  job_card_title?: string; // from PHP JOIN (in get_project_time_logs)
  // start_time, end_time, duration_minutes, notes, created_at, updated_at are compatible
}

// Payload for updating an existing Time Log
export interface UpdateTimeLogPayload {
  start_time?: string;  // ISO8601 format
  end_time?: string;    // ISO8601 format
  notes?: string | null;
  // duration_minutes is recalculated by backend if times change
}
export interface UpdateTimeLogResponse {
  message: string;
}

export interface DeleteTimeLogResponse {
  message: string;
}

// Log new time
export const logTimeAPI = (payload: LogTimePayload): Promise<LogTimeResponse> => {
  return apiFetch<LogTimeResponse>(`/api.php?action=log_time`, {
    method: 'POST',
    body: JSON.stringify(payload),
  }, true); // Requires Auth
};

// Fetch all Time Logs for a given Job Card
export const fetchTimeLogsForJobCardAPI = (jobCardId: number | string): Promise<TimeLogPHPResponse[]> => {
  return apiFetch<TimeLogPHPResponse[]>(`/api.php?action=get_job_card_time_logs&job_card_id=${jobCardId}`, {
    method: 'GET',
  }, true); // Requires Auth
};

// Fetch all Time Logs for a given Project
export const fetchTimeLogsForProjectAPI = (projectId: number | string): Promise<TimeLogPHPResponse[]> => {
  return apiFetch<TimeLogPHPResponse[]>(`/api.php?action=get_project_time_logs&project_id=${projectId}`, {
    method: 'GET',
  }, true); // Requires Auth
};

// Update an existing Time Log
export const updateTimeLogAPI = (timeLogId: number | string, payload: UpdateTimeLogPayload): Promise<UpdateTimeLogResponse> => {
  return apiFetch<UpdateTimeLogResponse>(`/api.php?action=update_time_log&time_log_id=${timeLogId}`, {
    method: 'POST', // Or 'PUT' as per backend
    body: JSON.stringify(payload),
  }, true); // Requires Auth
};

// Delete a Time Log
export const deleteTimeLogAPI = (timeLogId: number | string): Promise<DeleteTimeLogResponse> => {
  // Backend allows time_log_id in payload for POST or GET param for DELETE
  return apiFetch<DeleteTimeLogResponse>(`/api.php?action=delete_time_log&time_log_id=${timeLogId}`, {
    method: 'DELETE', // Or 'POST' if preferred and backend supports it with payload
  }, true); // Requires Auth
};

// Commenting out a potentially conflicting older addTimeLogAPI
/*
export const addTimeLogAPI = (projectId: string, jobCardId: string, timeLogData: Omit<TimeLog, 'id' | 'createdAt'>): Promise<TimeLog> => {
  return apiFetch<TimeLog>(`/projects/${projectId}/jobcards/${jobCardId}/timelogs`, { method: 'POST', body: JSON.stringify(timeLogData) });
};
*/
export const fetchProjectTimeLogsForAdminAPI = (projectId: string): Promise<TimeLog[]> => {
    return apiFetch<TimeLog[]>(`/admin/projects/${projectId}/timelogs`); // Example specific admin endpoint
};
export const fetchAllTimeLogsAPI = (filters?: any): Promise<TimeLog[]> => { // Filters for date range, client, etc.
    const query = new URLSearchParams(filters as any).toString();
    return apiFetch<TimeLog[]>(`/admin/timelogs${query ? `?${query}` : ''}`);
};


// --- File Service ---
export const fetchProjectFilesAPI = (projectId: string): Promise<ManagedFile[]> => apiFetch<ManagedFile[]>(`/projects/${projectId}/files`);
export const uploadFileAPI = (projectId: string, formData: FormData): Promise<ManagedFile> => {
  // For FormData, Content-Type is set automatically by browser
  return apiFetch<ManagedFile>(`/projects/${projectId}/files`, {
    method: 'POST',
    body: formData,
    headers: { 'Content-Type': undefined } // Remove default Content-Type for FormData
  });
};
export const deleteFileAPI = (fileId: string): Promise<void> => {
  return apiFetch<void>(`/files/${fileId}`, { method: 'DELETE' });
};


// --- Messaging Service Types ---

export interface ConversationParticipant {
  id: number; // User ID
  username: string;
}

// For the list of conversations a user has
export interface ConversationPreviewPHP {
  conversation_id: number;
  created_at: string;    // ISO8601
  updated_at: string;    // ISO8601
  last_message_at: string | null; // ISO8601
  participants: ConversationParticipant[]; // Parsed from backend's GROUP_CONCAT
  last_message_snippet: string | null;
  last_message_sender_id: number | null;
  last_message_sender_username: string | null;
  unread_message_count: number;
}

// For individual messages within a conversation
export interface MessagePHP {
  id: number; // message_id from backend
  conversation_id: number;
  sender_id: number;
  sender_username: string;
  content: string;
  created_at: string; // ISO8601
  read_at: string | null; // ISO8601 or null
}

// Payload for sending a message
export interface SendMessagePayload {
  conversation_id: number; // Or string if frontend uses string IDs and converts
  content: string;
}
// Response for sending a message (is the new message itself)
export type SendMessageResponse = MessagePHP;


// Response for finding/creating a conversation
export interface FindOrCreateConversationResponse {
  conversation_id: number;
  existed: boolean;
}

// Response for marking conversation as read
export interface MarkConversationAsReadResponse {
    message: string;
    marked_read_count: number;
}

// --- Messaging Service ---
// (This will replace/update the existing placeholder messaging functions)

export const findOrCreateConversationAPI = (recipientUserId: number | string): Promise<FindOrCreateConversationResponse> => {
  return apiFetch<FindOrCreateConversationResponse>(`/api.php?action=find_or_create_conversation`, {
    method: 'POST',
    body: JSON.stringify({ recipient_user_id: recipientUserId }),
  }, true); // Requires Auth
};

export const fetchUserConversationsAPI = (): Promise<ConversationPreviewPHP[]> => {
  return apiFetch<ConversationPreviewPHP[]>(`/api.php?action=get_user_conversations`, {
    method: 'GET',
  }, true); // Requires Auth
};

export interface FetchMessagesParams {
    limit?: number;
    before_message_id?: number | string; // string if frontend uses string IDs
    // offset?: number; // If using offset pagination
}
export const fetchConversationMessagesAPI = (conversationId: number | string, params?: FetchMessagesParams): Promise<MessagePHP[]> => {
  const queryParams = new URLSearchParams();
  if (params?.limit) queryParams.append('limit', String(params.limit));
  if (params?.before_message_id) queryParams.append('before_message_id', String(params.before_message_id));
  // if (params?.offset) queryParams.append('offset', String(params.offset));

  const queryString = queryParams.toString();
  const endpoint = `/api.php?action=get_conversation_messages&conversation_id=${conversationId}${queryString ? '&' + queryString : ''}`;

  return apiFetch<MessagePHP[]>(endpoint, {
    method: 'GET',
  }, true); // Requires Auth
};

export const sendMessageAPI = (payload: SendMessagePayload): Promise<SendMessageResponse> => {
  return apiFetch<SendMessageResponse>(`/api.php?action=send_message`, {
    method: 'POST',
    body: JSON.stringify(payload),
  }, true); // Requires Auth
};

export const markConversationAsReadAPI = (conversationId: number | string): Promise<MarkConversationAsReadResponse> => {
  return apiFetch<MarkConversationAsReadResponse>(`/api.php?action=mark_conversation_as_read`, {
    method: 'POST', // Or 'PUT' as per backend
    body: JSON.stringify({ conversation_id: conversationId }),
  }, true); // Requires Auth
};

// Comment out or remove old messaging APIs from types.ts if they are fully superseded
/*
 export const fetchConversationsAPI = (userId: string): Promise<Conversation[]> => apiFetch<Conversation[]>(`/users/${userId}/conversations`);
 export const fetchMessagesAPI = (conversationId: string): Promise<Message[]> => apiFetch<Message[]>(`/conversations/${conversationId}/messages`);
 export const findOrCreateConversationAPI = (participantIds: string[], projectId?: string): Promise<Conversation> => { // Old signature
   return apiFetch<Conversation>('/conversations/find-or-create', { method: 'POST', body: JSON.stringify({ participantIds, projectId }) });
 };
 export const sendMessageAPI = (conversationId: string, messageData: Omit<Message, 'id' | 'timestamp' | 'conversationId' | 'status'> & {status?: MessageStatus}): Promise<Message> => { // Old signature
   return apiFetch<Message>(`/conversations/${conversationId}/messages`, { method: 'POST', body: JSON.stringify(messageData) });
 };
 export const updateMessageStatusAPI = (messageId: string, status: MessageStatus): Promise<Message> => {
   return apiFetch<Message>(`/messages/${messageId}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
 };
 export const deleteMessageAPI = (messageId: string): Promise<void> => {
   return apiFetch<void>(`/messages/${messageId}`, { method: 'DELETE' });
 };
*/

// --- Misc/Utility Service --- or a new // --- Skills Service ---

export interface Skill {
  id: number;
  name: string;
  created_at?: string; // Optional if not always needed by frontend after fetch
}

// Updated fetchAllSkillsAPI
export const fetchAllSkillsAPI = (): Promise<Skill[]> => {
  // Backend 'get_all_skills' requires basic auth (any logged-in user)
  return apiFetch<Skill[]>(`/api.php?action=get_all_skills`, {
    method: 'GET',
  }, true); // Requires Auth
};

// New adminAddSkillAPI
export interface AdminAddSkillPayload {
  name: string;
}
export interface AdminAddSkillResponse {
  message: string;
  skill: Skill;
}
export const adminAddSkillAPI = (payload: AdminAddSkillPayload): Promise<AdminAddSkillResponse> => {
  return apiFetch<AdminAddSkillResponse>(`/api.php?action=admin_add_skill`, {
    method: 'POST',
    body: JSON.stringify(payload),
  }, true); // Requires Admin Auth
};

// --- Dashboard Stats API ---

export interface AdminDashboardStatsResponse {
  total_active_users: number;
  users_by_role: {
    admin: number;
    client: number;
    freelancer: number;
  };
  total_projects: number;
  projects_by_status: {
    // Keys will be the project status strings as returned by backend
    // e.g., 'Pending Approval', 'Open', 'In Progress', 'Completed', 'Cancelled'
    // The exact keys should match what the PHP backend's $project_statuses_to_count produces as keys.
    [status_key: string]: number;
  };
  total_open_applications: number;
}

export const fetchAdminDashboardStatsAPI = (): Promise<AdminDashboardStatsResponse> => {
  return apiFetch<AdminDashboardStatsResponse>(`/api.php?action=get_admin_dashboard_stats`, {
    method: 'GET',
  }, true); // Requires Admin Auth
};

// Updated fetchFreelancerDashboardStatsAPI
export const fetchFreelancerDashboardStatsAPI = (): Promise<FreelancerDashboardStatsResponse> => {
  return apiFetch<FreelancerDashboardStatsResponse>(`/api.php?action=get_freelancer_dashboard_stats`, {
    method: 'GET',
  }, true); // Requires Auth
};

// New fetchMyJobCardsAPI
export const fetchMyJobCardsAPI = (): Promise<MyJobCardItem[]> => {
  return apiFetch<MyJobCardItem[]>(`/api.php?action=get_my_job_cards`, {
    method: 'GET',
  }, true); // Requires Auth
};

export const fetchClientDashboardStatsAPI = (userId: string): Promise<any> => apiFetch<any>(`/users/${userId}/dashboard/stats`); // This seems like a placeholder or old
export const fetchRecentActivityAPI = (userId: string): Promise<any[]> => apiFetch<any[]>(`/users/${userId}/recent-activity`); // This seems like a placeholder or old
export const fetchAdminRecentFilesAPI = (): Promise<ManagedFile[]> => apiFetch<ManagedFile[]>(`/admin/recent-files`);

// Reports
export const fetchAllProjectsWithTimeLogsAPI = (): Promise<Project[]> => apiFetch<Project[]>('/reports/projects-with-timelogs');
