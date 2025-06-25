import {
    User, Project, Application, JobCard, TimeLog, ManagedFile, Conversation, Message,
    UserRole, ProjectStatus, JobCardStatus, MessageStatus,
    UserRegistrationData, RegistrationResponse, UserProfileResponse, AuthUser, LoginResponse, UserLoginData
} from './types';

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

/**
 * Performs an HTTP request to the backend API with automatic JSON handling and authorization.
 *
 * Adds the stored authentication token to the request if present, sets appropriate headers, and parses the JSON response. On HTTP errors, attempts to parse error details, removes the auth token from storage on 401/403 responses, and throws an `ApiError`.
 *
 * @param endpoint - The API endpoint path (relative to the base URL)
 * @param options - Optional fetch configuration
 * @returns The parsed JSON response, or `null` for 204 No Content responses
 * @throws ApiError if the response status is not OK
 */
async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const { headers, ...restOptions } = options;
  const token = localStorage.getItem('authToken'); // Token used for the request

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
    } catch (e) { /* Ignore */ }

    if (response.status === 401 || response.status === 403) {
        if (token) { // If a token was used for this request that resulted in 401/403, remove it.
            localStorage.removeItem('authToken');
        }
    }

    const errorMessage = errorData.message || `API Error: ${response.status} ${response.statusText}`;
    throw new ApiError(errorMessage, response.status, errorData);
  }

  if (response.status === 204) {
    return null as T;
  }
  return response.json() as Promise<T>;
}

// --- Auth Service ---
export const loginAPI = (credentials: UserLoginData): Promise<LoginResponse> => {
  return apiFetch<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  });
};

export const registerAPI = (userData: UserRegistrationData): Promise<RegistrationResponse> => {
  return apiFetch<RegistrationResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(userData),
  });
};

export const fetchUserProfileAPI = (): Promise<UserProfileResponse> => {
  return apiFetch<UserProfileResponse>('/users/profile');
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
export const fetchProjectDetailsAPI = (projectId: string | number): Promise<Project> => apiFetch<Project>(`/projects/${projectId}`);
export const createProjectAPI = (projectData: Omit<Project, 'id' | 'createdAt' | 'clientName' | 'status' | 'adminCreatorId' | 'isArchived' | 'assignedFreelancerName' | 'jobCards'>): Promise<Project> => {
  return apiFetch<Project>('/projects', { method: 'POST', body: JSON.stringify(projectData) });
};
export const updateProjectAPI = (projectId: string | number, projectData: Partial<Project>): Promise<Project> => {
    return apiFetch<Project>(`/projects/${projectId}`, { method: 'PATCH', body: JSON.stringify(projectData) });
};
export const deleteProjectAPI = (projectId: string | number): Promise<void> => {
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
    return apiFetch<TimeLog[]>(`/admin/projects/${projectId}/timelogs`);
};
export const fetchAllTimeLogsAPI = (filters?: any): Promise<TimeLog[]> => {
    const query = new URLSearchParams(filters as any).toString();
    return apiFetch<TimeLog[]>(`/admin/timelogs${query ? `?${query}` : ''}`);
};

// --- File Service ---
export const fetchProjectFilesAPI = (projectId: string): Promise<ManagedFile[]> => apiFetch<ManagedFile[]>(`/projects/${projectId}/files`);
export const uploadFileAPI = (projectId: string, formData: FormData): Promise<ManagedFile> => {
  return apiFetch<ManagedFile>(`/projects/${projectId}/files`, { 
    method: 'POST', 
    body: formData,
    headers: { 'Content-Type': undefined }
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


// --- Invoice & Payment Service (Mock Implementation) ---
import { Invoice, InvoiceItem, Payment, InvoiceStatus as LocalInvoiceStatus } from './types';

let mockInvoices: Invoice[] = [];
let mockPayments: Payment[] = [];
let nextInvoiceId = 1;
let nextPaymentId = 1;

const simulateDelay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const createInvoice = async (invoiceData: Omit<Invoice, 'id' | 'invoiceNumber' | 'createdAt' | 'updatedAt' | 'status' | 'totalAmount' | 'subTotal'> & { items: Omit<InvoiceItem, 'id' | 'totalPrice'>[] }): Promise<Invoice> => {
  await simulateDelay(500);
  const now = new Date().toISOString();
  let subTotal = 0;
  const itemsWithTotals: InvoiceItem[] = invoiceData.items.map((item, index) => {
    const totalPrice = item.quantity * item.unitPrice;
    subTotal += totalPrice;
    return { ...item, id: `item-${Date.now()}-${index}`, totalPrice };
  });

  const taxAmount = invoiceData.taxRate ? subTotal * invoiceData.taxRate : 0;
  const totalAmount = subTotal + taxAmount;

  const newInvoice: Invoice = {
    ...invoiceData,
    id: `inv-${nextInvoiceId++}`,
    invoiceNumber: `INV-${String(nextInvoiceId).padStart(5, '0')}`,
    items: itemsWithTotals,
    subTotal,
    taxAmount,
    totalAmount,
    status: LocalInvoiceStatus.DRAFT,
    createdAt: now,
    updatedAt: now,
  };
  mockInvoices.push(newInvoice);
  return newInvoice;
};

export const getInvoice = async (invoiceId: string): Promise<Invoice | null> => {
  await simulateDelay(300);
  const invoice = mockInvoices.find(inv => inv.id === invoiceId);
  if (!invoice) { console.warn(`Invoice with ID ${invoiceId} not found.`); return null; }
  return invoice;
};

export const updateInvoice = async (invoiceId: string, updates: Partial<Invoice>): Promise<Invoice | null> => {
  await simulateDelay(400);
  const invoiceIndex = mockInvoices.findIndex(inv => inv.id === invoiceId);
  if (invoiceIndex === -1) { console.warn(`Invoice with ID ${invoiceId} not found for update.`); return null; }
  let updatedInvoice = { ...mockInvoices[invoiceIndex], ...updates, updatedAt: new Date().toISOString() };
  if (updates.items || updates.taxRate !== undefined) {
    let subTotal = 0;
    const itemsWithTotals: InvoiceItem[] = (updates.items || updatedInvoice.items).map((item, index) => {
      const totalPrice = item.quantity * item.unitPrice;
      subTotal += totalPrice;
      return { ...item, id: item.id || `item-${Date.now()}-${index}`, totalPrice };
    });
    updatedInvoice.items = itemsWithTotals;
    updatedInvoice.subTotal = subTotal;
    updatedInvoice.taxAmount = updatedInvoice.taxRate ? subTotal * updatedInvoice.taxRate : 0;
    updatedInvoice.totalAmount = updatedInvoice.subTotal + (updatedInvoice.taxAmount || 0);
  }
  mockInvoices[invoiceIndex] = updatedInvoice;
  return updatedInvoice;
};

export const deleteInvoice = async (invoiceId: string): Promise<boolean> => {
  await simulateDelay(200);
  const initialLength = mockInvoices.length;
  mockInvoices = mockInvoices.filter(inv => inv.id !== invoiceId);
  if (mockInvoices.length === initialLength) { console.warn(`Invoice with ID ${invoiceId} not found for deletion.`); return false; }
  mockPayments = mockPayments.filter(p => p.invoiceId !== invoiceId);
  return true;
};

export const listInvoices = async (filters?: { clientId?: string, projectId?: string, status?: LocalInvoiceStatus }): Promise<Invoice[]> => {
  await simulateDelay(600);
  return mockInvoices.filter(inv => {
    if (filters?.clientId && inv.clientId !== filters.clientId) return false;
    if (filters?.projectId && inv.projectId !== filters.projectId) return false;
    if (filters?.status && inv.status !== filters.status) return false;
    return true;
  });
};

export const recordPayment = async (paymentData: Omit<Payment, 'id' | 'createdAt'>): Promise<Payment> => {
  await simulateDelay(500);
  const now = new Date().toISOString();
  const newPayment: Payment = { ...paymentData, id: `pay-${nextPaymentId++}`, createdAt: now };
  mockPayments.push(newPayment);
  const relatedInvoice = mockInvoices.find(inv => inv.id === newPayment.invoiceId);
  if (relatedInvoice) {
    const paymentsForInvoice = mockPayments.filter(p => p.invoiceId === newPayment.invoiceId);
    const totalPaid = paymentsForInvoice.reduce((sum, p) => sum + p.amountPaid, 0);
    if (totalPaid >= relatedInvoice.totalAmount) {
      await updateInvoice(relatedInvoice.id, { status: LocalInvoiceStatus.PAID });
    }
  }
  return newPayment;
};

export const getPayment = async (paymentId: string): Promise<Payment | null> => {
  await simulateDelay(300);
  const payment = mockPayments.find(p => p.id === paymentId);
  if (!payment) { console.warn(`Payment with ID ${paymentId} not found.`); return null; }
  return payment;
};

export const listPaymentsForInvoice = async (invoiceId: string): Promise<Payment[]> => {
  await simulateDelay(400);
  const invoiceExists = mockInvoices.find(inv => inv.id === invoiceId);
  if (!invoiceExists) { console.warn(`Cannot list payments: Invoice with ID ${invoiceId} not found.`); return []; }
  return mockPayments.filter(p => p.invoiceId === invoiceId);
};

export const __resetApiServiceMocks = () => {
  mockInvoices = [];
  mockPayments = [];
  nextInvoiceId = 1;
  nextPaymentId = 1;
};
