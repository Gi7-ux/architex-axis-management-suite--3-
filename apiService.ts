import { User, Project, Application, JobCard, TimeLog, ManagedFile, UserRole, ProjectStatus, FreelancerDashboardStats, AdminDashboardStatsResponse, ClientDashboardStats, RecentActivity } from './types';

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
  is_active: boolean;
}

// Payload for updating a user's role
export interface AdminUpdateUserRolePayload {
  user_id: number;
  new_role: UserRole;
}

// Generic success message response for admin actions
export interface AdminActionResponse {
  message: string;
}

// --- Notification Service Types --- START
export interface Notification {
  id: number;
  user_id: number | null;
  message_key: string;
  related_entity_type: string | null;
  related_entity_id: number | null;
  is_read: boolean;
  created_at: string;
}

export interface FetchAdminNotificationsResponse {
    notifications: Notification[];
    total_unread: number;
}

export interface MarkNotificationsReadResponse {
    message: string;
    marked_read_count: number;
}
// --- Notification Service Types --- END


const API_BASE_URL = '/backend';

interface ApiErrorData {
  message?: string;
  errors?: { param: string, msg: string }[];
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
async function apiFetch<T>(endpoint: string, options: RequestInit = {}, requiresAuth: boolean = false): Promise<T> {
  const { headers: optionHeaders, body, ...restOptions } = options; // Separate body to handle FormData
  
  let token: string | null = null;
  if (requiresAuth) {
     token = localStorage.getItem('authToken');
     if (!token) {
         console.warn('Auth token not found for authenticated request to', endpoint);
     }
  }

  const defaultHeaders: HeadersInit = {};
  // Do NOT set Content-Type for FormData, browser does it with boundary
  if (!(body instanceof FormData)) {
    defaultHeaders['Content-Type'] = 'application/json';
  }

  if (requiresAuth && token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  const finalHeaders = {...defaultHeaders, ...optionHeaders};

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...restOptions,
    headers: finalHeaders,
    body: body // Pass body directly
  });

  if (!response.ok) {
    let errorData: ApiErrorData = {};
    try {
      errorData = await response.json();
    } catch (e) { /* Ignore if response is not JSON */ }

    if (response.status === 401 || response.status === 403) {
        if (localStorage.getItem('authToken')) {
            localStorage.removeItem('authToken');
            localStorage.removeItem('archConnectUser');
            console.log('Auth token removed due to API error status:', response.status);
        }
    }
    throw new ApiError(errorData.message || `API Error: ${response.status} ${response.statusText}`, response.status, errorData);
  }

  if (response.status === 204) {
    return null as T;
  }

  return response.json() as Promise<T>;
}

// --- Notification Service ---
export interface FetchAdminNotificationsParams {
    limit?: number;
    offset?: number;
}
export const fetchAdminNotificationsAPI = (params?: FetchAdminNotificationsParams): Promise<FetchAdminNotificationsResponse> => {
  const queryParams = new URLSearchParams();
  if (params?.limit) queryParams.append('limit', String(params.limit));
  if (params?.offset) queryParams.append('offset', String(params.offset));
  const queryString = queryParams.toString();
  const endpoint = `/api.php?action=get_admin_notifications${queryString ? '&' + queryString : ''}`;
  return apiFetch<FetchAdminNotificationsResponse>(endpoint, { method: 'GET' }, true);
};

export const markNotificationAsReadAPI = (notificationIdOrIds: number | string | (number|string)[]): Promise<MarkNotificationsReadResponse> => {
  const payload = Array.isArray(notificationIdOrIds)
    ? { notification_ids: notificationIdOrIds }
    : { notification_id: notificationIdOrIds };
  return apiFetch<MarkNotificationsReadResponse>(`/api.php?action=mark_notification_as_read`, {
    method: 'POST',
    body: JSON.stringify(payload),
  }, true);
};

export const markAllAdminNotificationsAsReadAPI = (): Promise<MarkNotificationsReadResponse> => {
  return apiFetch<MarkNotificationsReadResponse>(`/api.php?action=mark_all_admin_notifications_as_read`, {
    method: 'POST',
  }, true);
};

// --- Authentication Service ---
export const registerAPI = (userData: UserRegistrationData): Promise<RegistrationResponse> => {
  return apiFetch<RegistrationResponse>(`/api.php?action=register_user`, {
    method: 'POST',
    body: JSON.stringify(userData),
  });
};

export const loginAPI = async (credentials: UserLoginData): Promise<LoginResponse> => {
  const response = await apiFetch<LoginResponse>(`/api.php?action=login_user`, {
    method: 'POST',
    body: JSON.stringify(credentials),
  });
  if (response.token) {
    localStorage.setItem('authToken', response.token);
  }
  return response;
};

export const fetchUserProfileAPI = (): Promise<UserProfileResponse> => {
  return apiFetch<UserProfileResponse>(`/api.php?action=get_user_profile`, { method: 'GET' }, true);
};

// Payload for updating own user profile
export interface UpdateOwnProfilePayload {
  name?: string | null;
  phone_number?: string | null;
  company?: string | null;
  experience?: string | null;
  avatar_url?: string | null;
  hourly_rate?: number | null;
  skill_ids?: number[];
}

export const updateOwnProfileAPI = (payload: UpdateOwnProfilePayload): Promise<AdminActionResponse> => {
  return apiFetch<AdminActionResponse>(`/api.php?action=update_own_profile`, {
    method: 'POST',
    body: JSON.stringify(payload),
  }, true);
};


// --- Admin Service ---
export interface AdminCreateUserPayload {
  username: string;
  email: string;
  password: string;
  role: UserRole;
  name?: string;
  phoneNumber?: string | null;
  company?: string | null;
  experience?: string | null;
  hourlyRate?: number | null;
  avatarUrl?: string | null;
}
export interface AdminCreateUserResponse extends AdminActionResponse {
  user_id: number;
}

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
  is_active: boolean;
  created_at: string;
  updated_at: string;
  skills?: Skill[];
}

export interface AdminUpdateUserDetailsPayload {
  username?: string;
  email?: string;
  role?: UserRole;
  name?: string | null;
  phone_number?: string | null;
  company?: string | null;
  experience?: string | null;
  hourly_rate?: number | null;
  avatar_url?: string | null;
  is_active?: boolean;
  skill_ids?: number[];
}

export const adminFetchAllUsersAPI = (): Promise<AdminUserView[]> => {
  return apiFetch<AdminUserView[]>(`/api.php?action=get_all_users`, { method: 'GET' }, true);
};

export const adminUpdateUserRoleAPI = (payload: AdminUpdateUserRolePayload): Promise<AdminActionResponse> => {
  return apiFetch<AdminActionResponse>(`/api.php?action=update_user_role`, {
    method: 'POST',
    body: JSON.stringify(payload),
  }, true);
};

export const adminCreateUserAPI = (payload: AdminCreateUserPayload): Promise<AdminCreateUserResponse> => {
  return apiFetch<AdminCreateUserResponse>(`/api.php?action=admin_create_user`, {
    method: 'POST',
    body: JSON.stringify(payload),
  }, true);
};

export const adminFetchUserDetailsAPI = (userId: number | string): Promise<AdminUserDetailsResponse> => {
  return apiFetch<AdminUserDetailsResponse>(`/api.php?action=admin_get_user_details&user_id=${userId}`, { method: 'GET' }, true);
};

export const adminUpdateUserDetailsAPI = (userId: number | string, payload: AdminUpdateUserDetailsPayload): Promise<AdminActionResponse> => {
  return apiFetch<AdminActionResponse>(`/api.php?action=admin_update_user_details&user_id=${userId}`, {
    method: 'POST',
    body: JSON.stringify(payload),
  }, true);
};

export const adminDeleteUserAPI = (userId: number | string): Promise<AdminActionResponse> => {
  return apiFetch<AdminActionResponse>(`/api.php?action=admin_delete_user&user_id=${userId}`, { method: 'DELETE' }, true);
};

// --- User Service (Placeholders for non-PHP backend specific calls, review if still needed) ---
export const fetchUsersAPI = (role?: UserRole): Promise<User[]> => {
  const endpoint = role ? `/users?role=${role}` : '/users';
  console.warn("fetchUsersAPI (generic /users) is likely a placeholder and not implemented in PHP backend.");
  return apiFetch<User[]>(endpoint, {}, true);
};
// ... other placeholder User Service APIs can be removed if not used or updated if specific PHP endpoints exist for them.


// --- Project Service ---
export interface ProjectPHPResponse extends Omit<Project, 'id' | 'clientId' | 'freelancerId' | 'clientName' | 'assignedFreelancerName' | 'jobCards' | 'skillsRequired' > {
  id: number;
  client_id: number;
  freelancer_id: number | null;
  client_username?: string | null;
  freelancer_username?: string | null;
  skills_required?: Skill[];
  // Direct fields from Project type that are compatible:
  title: string;
  description: string;
  status: ProjectStatus; // Ensure this matches backend enum strings
  budget?: number;
  deadline?: string;
  createdAt: string;
  updatedAt: string;
  currency?: string;
  paymentType?: 'fixed' | 'hourly';
  experienceLevel?: 'beginner' | 'intermediate' | 'expert';
  duration?: string;
  isFeatured?: boolean;
  adminCreatorId?: string;
  isArchived?: boolean;
  applicationCount?: number; // If backend provides this
}

export const fetchProjectsAPI = (params?: { status?: ProjectStatus | 'all' }): Promise<ProjectPHPResponse[]> => {
  let endpoint = "/api.php?action=get_projects";
  const queryParams = new URLSearchParams();
  if (params?.status) {
    queryParams.append('status', params.status);
  }
  const queryString = queryParams.toString();
  if (queryString) {
    endpoint += `&${queryString}`;
  }
  return apiFetch<ProjectPHPResponse[]>(endpoint, { method: 'GET' }, false);
};

export const fetchProjectDetailsAPI = (projectId: number | string): Promise<ProjectPHPResponse> => {
  return apiFetch<ProjectPHPResponse>(`/api.php?action=get_projects&id=${projectId}`, { method: 'GET' }, false);
};

export interface CreateProjectPHPData {
  title: string;
  description: string;
  freelancer_id?: number | null;
  status?: string;
  client_id?: number;
}

export interface CreateProjectPHPResponse {
  message: string;
  project_id: number;
}

export const createProjectAPI = (projectData: CreateProjectPHPData): Promise<CreateProjectPHPResponse> => {
  return apiFetch<CreateProjectPHPResponse>(`/api.php?action=create_project`, {
    method: 'POST',
    body: JSON.stringify(projectData),
  }, true);
};

export interface UpdateProjectPHPData {
  title?: string;
  description?: string;
  freelancer_id?: number | null;
  status?: string;
  client_id?: number;
  skill_ids?: number[];
}

export interface UpdateProjectPHPResponse {
    message: string;
}

export const updateProjectAPI = (projectId: string | number, projectData: UpdateProjectPHPData): Promise<UpdateProjectPHPResponse> => {
    return apiFetch<UpdateProjectPHPResponse>(`/api.php?action=update_project&id=${projectId}`, {
        method: 'PUT',
        body: JSON.stringify(projectData)
    }, true);
};

export interface DeleteProjectPHPResponse {
    message: string;
}

export const deleteProjectAPI = (projectId: string | number): Promise<DeleteProjectPHPResponse> => {
  return apiFetch<DeleteProjectPHPResponse>(`/api.php?action=delete_project&id=${projectId}`, { method: 'DELETE' }, true);
};

export const fetchClientProjectsAPI = (filters?: { status?: ProjectStatus }): Promise<ProjectPHPResponse[]> => { // Return ProjectPHPResponse
  let endpoint = "/api.php?action=get_client_projects";
  if (filters?.status) {
    endpoint += `&status=${filters.status}`;
  }
  return apiFetch<ProjectPHPResponse[]>(endpoint, { method: 'GET' }, true);
};

// --- Application Service ---
export interface ProjectApplicationPHPResponse extends Application {
  freelancer_username: string;
  freelancer_email: string;
}

export const fetchApplicationsForProjectAPI = (projectId: string | number): Promise<ProjectApplicationPHPResponse[]> => {
  return apiFetch<ProjectApplicationPHPResponse[]>(`/api.php?action=get_project_applications&project_id=${projectId}`, { method: 'GET' }, true);
};

export interface UpdateApplicationStatusPayload {
  status: 'accepted' | 'rejected' | 'archived_by_client';
}
export interface UpdateApplicationStatusResponse {
  message: string;
}

export const updateApplicationStatusAPI = (applicationId: string | number, payload: UpdateApplicationStatusPayload): Promise<UpdateApplicationStatusResponse> => {
  return apiFetch<UpdateApplicationStatusResponse>(`/api.php?action=update_application_status&application_id=${applicationId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  }, true);
};

export interface SubmitApplicationPayload {
  project_id: number;
  proposal_text: string;
  bid_amount?: number | null;
}
export interface SubmitApplicationResponse {
  message: string;
  application_id: number;
}

export const submitApplicationAPI = (applicationData: SubmitApplicationPayload): Promise<SubmitApplicationResponse> => {
  return apiFetch<SubmitApplicationResponse>(`/api.php?action=submit_application`, {
    method: 'POST',
    body: JSON.stringify(applicationData),
  }, true);
};

export interface FreelancerApplicationResponseItem {
  application_id: number;
  project_id: number;
  proposal_text: string;
  bid_amount?: number | null;
  application_status: string;
  applied_at: string;
  application_updated_at: string;
  project_title: string;
  project_status: ProjectStatus;
  project_client_id: number;
}

export const fetchFreelancerApplicationsAPI = (): Promise<FreelancerApplicationResponseItem[]> => {
  return apiFetch<FreelancerApplicationResponseItem[]>(`/api.php?action=get_freelancer_applications`, { method: 'GET' }, true);
};

export interface WithdrawApplicationPayload {
    application_id: string | number;
}
export interface WithdrawApplicationResponse {
    message: string;
}

export const withdrawApplicationAPI = (applicationId: string | number): Promise<WithdrawApplicationResponse> => {
  const payload: WithdrawApplicationPayload = { application_id: applicationId };
  return apiFetch<WithdrawApplicationResponse>(`/api.php?action=withdraw_application`, {
    method: 'POST',
    body: JSON.stringify(payload),
  }, true);
};

// --- Freelancer Service ---
export interface FreelancerAssignedProjectResponseItem extends ProjectPHPResponse { // Extends ProjectPHPResponse
  // client_username is already in ProjectPHPResponse
}

export const fetchFreelancerAssignedProjectsAPI = (): Promise<FreelancerAssignedProjectResponseItem[]> => {
  return apiFetch<FreelancerAssignedProjectResponseItem[]>(`/api.php?action=get_freelancer_assigned_projects`, { method: 'GET' }, true);
};

// --- JobCard Service ---
export interface CreateJobCardPayload {
  project_id: number;
  title: string;
  description?: string | null;
  status?: string;
  assigned_freelancer_id?: number | null;
  estimated_hours?: number | null;
}
export interface CreateJobCardResponse {
  message: string;
  job_card_id: number;
}

export interface JobCardPHPResponse { // This is the direct backend response
  id: number;
  project_id: number;
  title: string;
  description: string | null;
  status: string;
  assigned_freelancer_id: number | null;
  assigned_freelancer_username?: string | null;
  estimated_hours: number | null;
  created_at: string;
  updated_at: string;
  project_title?: string; // Added if backend provides it for get_freelancer_job_cards
}

export interface UpdateJobCardPayload {
  title?: string;
  description?: string | null;
  status?: string;
  assigned_freelancer_id?: number | null;
  estimated_hours?: number | null;
}
export interface UpdateJobCardResponse {
  message: string;
}

export interface DeleteJobCardResponse {
  message: string;
}

export const createJobCardAPI = (payload: CreateJobCardPayload): Promise<CreateJobCardResponse> => {
  return apiFetch<CreateJobCardResponse>(`/api.php?action=create_job_card`, {
    method: 'POST',
    body: JSON.stringify(payload),
  }, true);
};

export const fetchJobCardsForProjectAPI = (projectId: number | string): Promise<JobCardPHPResponse[]> => {
  return apiFetch<JobCardPHPResponse[]>(`/api.php?action=get_project_job_cards&project_id=${projectId}`, { method: 'GET' }, true);
};

export const updateJobCardAPI = (jobCardId: number | string, payload: UpdateJobCardPayload): Promise<UpdateJobCardResponse> => {
  return apiFetch<UpdateJobCardResponse>(`/api.php?action=update_job_card&job_card_id=${jobCardId}`, {
    method: 'POST',
    body: JSON.stringify(payload),
  }, true);
};

export const deleteJobCardAPI = (jobCardId: number | string): Promise<DeleteJobCardResponse> => {
  return apiFetch<DeleteJobCardResponse>(`/api.php?action=delete_job_card&job_card_id=${jobCardId}`, { method: 'DELETE' }, true);
};

export const fetchFreelancerJobCardsAPI = (): Promise<JobCardPHPResponse[]> => {
  return apiFetch<JobCardPHPResponse[]>(`/api.php?action=get_freelancer_job_cards`, { method: 'GET' }, true);
};

// --- TimeLog Service ---
export interface LogTimePayload {
  job_card_id: number; // Use snake_case if backend expects it, or map in apiFetch
  start_time: string;  // ISO string
  end_time: string;    // ISO string
  notes?: string;
  // manualEntry is often a backend derived field or not explicitly sent
}

export interface LogTimeResponse {
  message: string;
  time_log_id: number;
  duration_minutes: number;
}

export interface TimeLogPHPResponse { // Direct from backend
  id: number;
  job_card_id: number;
  user_id: number;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  notes: string | null;
  time_log_created_at: string; // Aliased from created_at
  time_log_updated_at: string; // Aliased from updated_at
  logger_username?: string;
  job_card_title?: string;
  project_id?: number;
  project_title?: string;
}

export interface UpdateTimeLogPayload {
  start_time?: string;
  end_time?: string;
  notes?: string | null;
}
export interface UpdateTimeLogResponse {
  message: string;
}

export interface DeleteTimeLogResponse {
  message: string;
}

export const logTimeAPI = (payload: LogTimePayload): Promise<LogTimeResponse> => {
  return apiFetch<LogTimeResponse>(`/api.php?action=log_time`, {
    method: 'POST',
    body: JSON.stringify(payload),
  }, true);
};

export const fetchTimeLogsForJobCardAPI = (jobCardId: number | string): Promise<TimeLogPHPResponse[]> => {
  return apiFetch<TimeLogPHPResponse[]>(`/api.php?action=get_job_card_time_logs&job_card_id=${jobCardId}`, { method: 'GET' }, true);
};

export const fetchTimeLogsForProjectAPI = (projectId: number | string): Promise<TimeLogPHPResponse[]> => {
  return apiFetch<TimeLogPHPResponse[]>(`/api.php?action=get_project_time_logs&project_id=${projectId}`, { method: 'GET' }, true);
};

export const updateTimeLogAPI = (timeLogId: number | string, payload: UpdateTimeLogPayload): Promise<UpdateTimeLogResponse> => {
  return apiFetch<UpdateTimeLogResponse>(`/api.php?action=update_time_log&time_log_id=${timeLogId}`, {
    method: 'POST',
    body: JSON.stringify(payload),
  }, true);
};

export const deleteTimeLogAPI = (timeLogId: number | string): Promise<DeleteTimeLogResponse> => {
  return apiFetch<DeleteTimeLogResponse>(`/api.php?action=delete_time_log&time_log_id=${timeLogId}`, { method: 'DELETE' }, true);
};

export interface FetchFreelancerTimeLogsParams {
  project_id?: number | string;
  job_card_id?: number | string;
  date_from?: string; // YYYY-MM-DD
  date_to?: string;   // YYYY-MM-DD
}
export const fetchFreelancerTimeLogsAPI = (filters?: FetchFreelancerTimeLogsParams): Promise<TimeLogPHPResponse[]> => {
  const queryParams = new URLSearchParams();
  if (filters?.project_id) queryParams.append('project_id', String(filters.project_id));
  if (filters?.job_card_id) queryParams.append('job_card_id', String(filters.job_card_id));
  if (filters?.date_from) queryParams.append('date_from', filters.date_from);
  if (filters?.date_to) queryParams.append('date_to', filters.date_to);
  const queryString = queryParams.toString();
  const endpoint = `/api.php?action=get_freelancer_time_logs${queryString ? '&' + queryString : ''}`;
  return apiFetch<TimeLogPHPResponse[]>(endpoint, { method: 'GET' }, true);
};

// --- File Service ---
// ManagedFile from types.ts matches the backend structure for get_project_files
export interface ProjectFilePHPResponse { // Matches backend structure for get_project_files
    id: number;
    project_id: number;
    uploader_id: number;
    file_name: string;
    file_path: string; // Relative path from 'uploads/' directory
    file_type: string;
    file_size: number;
    uploaded_at: string;
    uploader_username: string;
    // url?: string; // Optional: If backend constructs a public URL
}


export const fetchProjectFilesAPI = (projectId: string | number): Promise<ProjectFilePHPResponse[]> => {
  return apiFetch<ProjectFilePHPResponse[]>(`/api.php?action=get_project_files&project_id=${projectId}`, { method: 'GET' }, true);
};

export interface UploadProjectFileResponse {
    message: string;
    file: ProjectFilePHPResponse; // Contains details of the uploaded file
}
// For uploadFileAPI, the body is FormData, so apiFetch handles it.
// The endpoint needs to be correct.
export const uploadProjectFileAPI = (projectId: string | number, formData: FormData): Promise<UploadProjectFileResponse> => {
  // Ensure project_id is part of FormData if backend expects it there,
  // or pass it as query param if backend expects that.
  // The current backend `upload_project_file` expects project_id in $_POST or $_GET.
  // If it's not already in formData, it needs to be added to the endpoint URL.
  // For simplicity, let's assume it's added to formData by the caller.
  // If not, the endpoint would be: `/api.php?action=upload_project_file&project_id=${projectId}`
  // But since it's a POST, usually better to have it in body.
  // The PHP code checks $_POST['project_id'], so it must be in FormData.
  return apiFetch<UploadProjectFileResponse>(`/api.php?action=upload_project_file`, {
    method: 'POST',
    body: formData, // No Content-Type header needed here for FormData
  }, true);
};

export interface DeleteProjectFileResponse {
    message: string;
}
export const deleteProjectFileAPI = (fileId: string | number): Promise<DeleteProjectFileResponse> => {
  return apiFetch<DeleteProjectFileResponse>(`/api.php?action=delete_project_file&file_id=${fileId}`, {
    method: 'DELETE', // Or POST if backend prefers it with payload
  }, true);
};


// --- Messaging Service Types ---
export interface ConversationParticipant {
  id: number;
  username: string;
}

export interface ConversationPreviewPHP {
  conversation_id: number;
  created_at: string;
  updated_at: string;
  last_message_at: string | null;
  participants: ConversationParticipant[];
  last_message_snippet: string | null;
  last_message_sender_id: number | null;
  last_message_sender_username: string | null;
  unread_message_count: number;
}

export interface MessagePHP {
  id: number;
  conversation_id: number;
  sender_id: number;
  sender_username: string;
  content: string;
  created_at: string;
  read_at: string | null;
}

export interface SendMessagePayload {
  conversation_id: number;
  content: string;
}
export type SendMessageResponse = MessagePHP;

export interface FindOrCreateConversationResponse {
  conversation_id: number;
  existed: boolean;
}

export interface MarkConversationAsReadResponse {
    message: string;
    marked_read_count: number;
}

// --- Messaging Service ---
export const findOrCreateConversationAPI = (recipientUserId: number | string): Promise<FindOrCreateConversationResponse> => {
  return apiFetch<FindOrCreateConversationResponse>(`/api.php?action=find_or_create_conversation`, {
    method: 'POST',
    body: JSON.stringify({ recipient_user_id: recipientUserId }),
  }, true);
};

export const fetchUserConversationsAPI = (): Promise<ConversationPreviewPHP[]> => {
  return apiFetch<ConversationPreviewPHP[]>(`/api.php?action=get_user_conversations`, { method: 'GET' }, true);
};

export interface FetchMessagesParams {
    limit?: number;
    before_message_id?: number | string;
}
export const fetchConversationMessagesAPI = (conversationId: number | string, params?: FetchMessagesParams): Promise<MessagePHP[]> => {
  const queryParams = new URLSearchParams();
  if (params?.limit) queryParams.append('limit', String(params.limit));
  if (params?.before_message_id) queryParams.append('before_message_id', String(params.before_message_id));
  const queryString = queryParams.toString();
  const endpoint = `/api.php?action=get_conversation_messages&conversation_id=${conversationId}${queryString ? '&' + queryString : ''}`;
  return apiFetch<MessagePHP[]>(endpoint, { method: 'GET' }, true);
};

export const sendMessageAPI = (payload: SendMessagePayload): Promise<SendMessageResponse> => {
  return apiFetch<SendMessageResponse>(`/api.php?action=send_message`, {
    method: 'POST',
    body: JSON.stringify(payload),
  }, true);
};

export const markConversationAsReadAPI = (conversationId: number | string): Promise<MarkConversationAsReadResponse> => {
  return apiFetch<MarkConversationAsReadResponse>(`/api.php?action=mark_conversation_as_read`, {
    method: 'POST',
    body: JSON.stringify({ conversation_id: conversationId }),
  }, true);
};

// --- Skills Service ---
export interface Skill {
  id: number;
  name: string;
  created_at?: string;
}

export const fetchAllSkillsAPI = (): Promise<Skill[]> => {
  return apiFetch<Skill[]>(`/api.php?action=get_all_skills`, { method: 'GET' }, true);
};

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
  }, true);
};

export interface AdminUpdateSkillPayload {
  skill_id: number;
  name: string;
}
export interface AdminUpdateSkillResponse {
  message: string;
  skill: Skill;
}
export const adminUpdateSkillAPI = (payload: AdminUpdateSkillPayload): Promise<AdminUpdateSkillResponse> => {
  return apiFetch<AdminUpdateSkillResponse>(`/api.php?action=admin_update_skill`, {
    method: 'POST',
    body: JSON.stringify(payload),
  }, true);
};

export interface AdminDeleteSkillPayload {
  skill_id?: number;
}
export interface AdminDeleteSkillResponse {
  message: string;
}
export const adminDeleteSkillAPI = (skillId: number, payload?: AdminDeleteSkillPayload): Promise<AdminDeleteSkillResponse> => {
  return apiFetch<AdminDeleteSkillResponse>(`/api.php?action=admin_delete_skill&skill_id=${skillId}`, {
    method: 'DELETE',
  }, true);
};


// --- Dashboard Stats API ---
// AdminDashboardStatsResponse, ClientDashboardStats, FreelancerDashboardStats are defined in './types'

export const fetchAdminDashboardStatsAPI = (): Promise<AdminDashboardStatsResponse> => {
  return apiFetch<AdminDashboardStatsResponse>(`/api.php?action=get_admin_dashboard_stats`, {
    method: 'GET',
  }, true); // Requires Admin Auth
};

export const fetchFreelancerDashboardStatsAPI = (): Promise<FreelancerDashboardStats> => {
  // userId is not needed as backend uses authenticated user context
  return apiFetch<FreelancerDashboardStats>(`/api.php?action=get_freelancer_dashboard_stats`, {
    method: 'GET',
  }, true); // Requires Freelancer Auth
};

export const fetchClientDashboardStatsAPI = (): Promise<ClientDashboardStats> => {
  return apiFetch<ClientDashboardStats>(`/api.php?action=get_client_dashboard_stats`, {
    method: 'GET',
  }, true); // Requires Client Auth
};

// Placeholders below - need specific PHP backend endpoints if these are to be used
export const fetchUserRecentFilesAPI = (): Promise<ManagedFile[]> => {
  console.warn("fetchUserRecentFilesAPI is a placeholder and needs a PHP backend endpoint.");
  return apiFetch<ManagedFile[]>(`/api.php?action=get_user_recent_files_placeholder`, {}, true); // Example placeholder
};
export const fetchRecentActivityAPI = (userId: string): Promise<RecentActivity[]> => {
  console.warn("fetchRecentActivityAPI is a placeholder and needs a PHP backend endpoint.");
  return apiFetch<RecentActivity[]>(`/users/${userId}/recent-activity_placeholder`, {}, true); // Example placeholder
}
export const fetchAdminRecentFilesAPI = (): Promise<ManagedFile[]> => {
  console.warn("fetchAdminRecentFilesAPI is a placeholder and needs a PHP backend endpoint.");
  return apiFetch<ManagedFile[]>(`/admin/recent-files_placeholder`, {}, true); // Example placeholder
}

// Reports (Placeholder)
export const fetchAllProjectsWithTimeLogsAPI = (): Promise<Project[]> => {
  console.warn("fetchAllProjectsWithTimeLogsAPI is a placeholder and needs a PHP backend endpoint.");
  return apiFetch<Project[]>('/reports/projects-with-timelogs_placeholder', {}, true); // Example placeholder
}


// --- NEW PHP Backend API Service (Example structure, can be removed or integrated) ---
// This section was for generic PHP interaction examples and might be redundant now.
// If specific functions like getUsersFromPhp or createUserInPhp are still needed for
// a *different* PHP backend or specific non-action based calls, they can be kept.
// Otherwise, if all interactions go through the main `api.php?action=` pattern,
// this section can be removed. For now, I'll comment it out.
/*
const PHP_API_BASE_URL = '/backend/api.php';

interface PhpApiResponse<T> {
  status: 'success' | 'error';
  data?: T;
  message?: string;
}

export const getUsersFromPhp = async (): Promise<User[]> => {
  // ... implementation ...
};

interface CreateUserPhpPayload {
  // ...
}
export const createUserInPhp = async (userData: CreateUserPhpPayload): Promise<User> => {
  // ... implementation ...
};
*/
