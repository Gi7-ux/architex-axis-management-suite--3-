import { User, Project, Application, JobCard, TimeLog, ManagedFile, Conversation, Message, UserRole, ProjectStatus, JobCardStatus, MessageStatus } from './types';

// const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || '/api'; // Example if using build-time env vars
const API_BASE_URL = '/api'; // Using relative path for API calls

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
async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const { headers, ...restOptions } = options;
  
  // TODO: Retrieve auth token (e.g., from localStorage or AuthContext)
  const token = localStorage.getItem('authToken'); 

  const defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
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
    throw new ApiError(errorData.message || `API Error: ${response.status} ${response.statusText}`, response.status, errorData);
  }

  if (response.status === 204) { // No Content
    return null as T;
  }

  return response.json() as Promise<T>;
}

// --- Auth Service ---
export const loginAPI = (email: string, pass: string): Promise<{ user: User, token: string }> => {
  return apiFetch<{ user: User, token: string }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password: pass }),
  });
};

// --- User Service ---
export const fetchUsersAPI = (role?: UserRole): Promise<User[]> => {
  const endpoint = role ? `/users?role=${role}` : '/users';
  return apiFetch<User[]>(endpoint);
};
export const fetchUserAPI = (userId: string): Promise<User> => apiFetch<User>(`/users/${userId}`);
export const addUserAPI = (userData: Omit<User, 'id' | 'avatarUrl'>): Promise<User> => {
  return apiFetch<User>('/users', { method: 'POST', body: JSON.stringify(userData) });
};
export const updateUserAPI = (userId: string, userData: Partial<User>): Promise<User> => {
  return apiFetch<User>(`/users/${userId}`, { method: 'PATCH', body: JSON.stringify(userData) });
};
export const deleteUserAPI = (userId: string): Promise<void> => {
  return apiFetch<void>(`/users/${userId}`, { method: 'DELETE' });
};
export const fetchUserApplicationsAPI = (userId: string): Promise<Application[]> => apiFetch<Application[]>(`/users/${userId}/applications`);


// --- Project Service ---
export const fetchProjectsAPI = (params?: { status?: ProjectStatus, clientId?: string, freelancerId?: string }): Promise<Project[]> => {
  const query = new URLSearchParams(params as any).toString();
  return apiFetch<Project[]>(`/projects${query ? `?${query}` : ''}`);
};
export const fetchProjectDetailsAPI = (projectId: string): Promise<Project> => apiFetch<Project>(`/projects/${projectId}`);
export const createProjectAPI = (projectData: Omit<Project, 'id' | 'createdAt' | 'clientName' | 'status' | 'adminCreatorId' | 'isArchived' | 'assignedFreelancerName' | 'jobCards'>): Promise<Project> => {
  return apiFetch<Project>('/projects', { method: 'POST', body: JSON.stringify(projectData) });
};
export const updateProjectAPI = (projectId: string, projectData: Partial<Project>): Promise<Project> => {
    return apiFetch<Project>(`/projects/${projectId}`, { method: 'PATCH', body: JSON.stringify(projectData) });
};
export const deleteProjectAPI = (projectId: string): Promise<void> => {
  return apiFetch<void>(`/projects/${projectId}`, { method: 'DELETE' });
};
export const updateProjectStatusAPI = (projectId: string, status: ProjectStatus): Promise<Project> => {
  return apiFetch<Project>(`/projects/${projectId}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
};
export const toggleProjectArchiveStatusAPI = (projectId: string): Promise<Project> => {
    return apiFetch<Project>(`/projects/${projectId}/archive-toggle`, { method: 'PATCH' });
};

// --- Application Service ---
export const fetchApplicationsForProjectAPI = (projectId: string): Promise<Application[]> => apiFetch<Application[]>(`/projects/${projectId}/applications`);
export const submitApplicationAPI = (applicationData: Omit<Application, 'id' | 'appliedAt' | 'freelancerName'>): Promise<Application> => {
  return apiFetch<Application>('/applications', { method: 'POST', body: JSON.stringify(applicationData) });
};
export const acceptApplicationAPI = (applicationId: string): Promise<Application> => {
  return apiFetch<Application>(`/applications/${applicationId}/accept`, { method: 'PATCH' });
};

// --- JobCard Service ---
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

// --- TimeLog Service ---
export const addTimeLogAPI = (projectId: string, jobCardId: string, timeLogData: Omit<TimeLog, 'id' | 'createdAt'>): Promise<TimeLog> => {
  return apiFetch<TimeLog>(`/projects/${projectId}/jobcards/${jobCardId}/timelogs`, { method: 'POST', body: JSON.stringify(timeLogData) });
};
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

// --- Messaging Service ---
export const fetchConversationsAPI = (userId: string): Promise<Conversation[]> => apiFetch<Conversation[]>(`/users/${userId}/conversations`);
export const fetchMessagesAPI = (conversationId: string): Promise<Message[]> => apiFetch<Message[]>(`/conversations/${conversationId}/messages`);
export const findOrCreateConversationAPI = (participantIds: string[], projectId?: string): Promise<Conversation> => {
  return apiFetch<Conversation>('/conversations/find-or-create', { method: 'POST', body: JSON.stringify({ participantIds, projectId }) });
};
export const sendMessageAPI = (conversationId: string, messageData: Omit<Message, 'id' | 'timestamp' | 'conversationId' | 'status'> & {status?: MessageStatus}): Promise<Message> => {
  return apiFetch<Message>(`/conversations/${conversationId}/messages`, { method: 'POST', body: JSON.stringify(messageData) });
};
export const updateMessageStatusAPI = (messageId: string, status: MessageStatus): Promise<Message> => {
  return apiFetch<Message>(`/messages/${messageId}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
};
export const deleteMessageAPI = (messageId: string): Promise<void> => {
  return apiFetch<void>(`/messages/${messageId}`, { method: 'DELETE' });
};

// --- Misc/Utility Service ---
export const fetchAllSkillsAPI = (): Promise<string[]> => apiFetch<string[]>('/skills');

// --- Dashboard Stats API ---
export const fetchAdminDashboardStatsAPI = (): Promise<any> => apiFetch<any>('/admin/dashboard/stats');
export const fetchFreelancerDashboardStatsAPI = (userId: string): Promise<any> => apiFetch<any>(`/users/${userId}/dashboard/stats`);
export const fetchClientDashboardStatsAPI = (userId: string): Promise<any> => apiFetch<any>(`/users/${userId}/dashboard/stats`);
export const fetchRecentActivityAPI = (userId: string): Promise<any[]> => apiFetch<any[]>(`/users/${userId}/recent-activity`);
export const fetchAdminRecentFilesAPI = (): Promise<ManagedFile[]> => apiFetch<ManagedFile[]>(`/admin/recent-files`);

// Reports
export const fetchAllProjectsWithTimeLogsAPI = (): Promise<Project[]> => apiFetch<Project[]>('/reports/projects-with-timelogs');
