export enum UserRole {
  ADMIN = 'admin',
  FREELANCER = 'freelancer',
  CLIENT = 'client',
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatarUrl?: string;
  hourlyRate?: number; // For freelancers, in Rands
  skills?: string[];
  company?: string;
  experience?: string; // Text field for bio/summary
  phoneNumber?: string;
}

export enum ProjectStatus {
  PENDING_APPROVAL = 'Pending Approval', // New status for admin approval
  OPEN = 'Open', // Open for applications after admin approval
  IN_PROGRESS = 'In Progress',
  COMPLETED = 'Completed',
  CANCELLED = 'Cancelled',
}

export enum JobCardStatus {
  TODO = 'ToDo',
  IN_PROGRESS = 'InProgress',
  PENDING_REVIEW = 'PendingReview',
  COMPLETED = 'Completed',
}

export interface TimeLog {
  id: string;
  jobCardId: string;
  architectId: string;
  startTime: string; // ISO date string
  endTime: string; // ISO date string
  durationMinutes: number;
  notes?: string;
  manualEntry: boolean;
  createdAt: string; // ISO date string
}

export interface JobCard {
  id: string;
  title: string;
  description: string;
  status: JobCardStatus;
  assignedArchitectId?: string;
  assignedArchitectName?: string; // Denormalized for display
  estimatedTime?: number; // in hours
  actualTimeLogged?: number; // in hours - this might become sum of timeLogs
  timeLogs?: TimeLog[];
  projectId: string;
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}

export interface Project {
  id:string;
  title: string;
  description: string;
  budget: number; // In Rands
  deadline: string; // ISO date string
  clientId: string; // Client assigned by Admin
  clientName?: string; // Denormalized for display
  status: ProjectStatus;
  skillsRequired: string[];
  createdAt: string; // ISO date string
  adminCreatorId?: string; // Admin who created the project
  assignedFreelancerId?: string;
  assignedFreelancerName?: string; // Denormalized
  jobCards?: JobCard[];
  isArchived?: boolean;
}

export interface Application {
  id: string;
  projectId: string;
  freelancerId: string;
  freelancerName: string;
  proposal: string;
  bidAmount: number; // In Rands
  status: 'PendingAdminApproval' | 'PendingClientReview' | 'Accepted' | 'Rejected'; // Status might need more stages
  appliedAt: string; // ISO date string
}

// --- Messaging System Types ---
export enum MessageStatus {
  PENDING_ADMIN_APPROVAL = 'Pending Admin Approval',
  APPROVED = 'Approved',
  SENT = 'Sent', // For messages not needing approval (e.g., Admin to User, system messages)
  READ = 'Read', // Basic flag for future use
  REJECTED_BY_ADMIN = 'Rejected by Admin',
}


export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  // receiverId is implicit via conversation participants
  content: string;
  timestamp: string; // ISO date string
  status: MessageStatus;
  originalSenderId?: string; // If Admin edits/sends on behalf of someone
  attachment?: ManagedFile; // For file attachments
  readBy?: string[]; // Array of userIds who have read the message
}

export interface Conversation {
  id: string;
  participantIds: string[]; // IDs of users in the conversation
  participantDetails?: { [userId: string]: { name: string, avatarUrl?: string, role: UserRole }}; // Denormalized for display
  projectId?: string; // If the conversation is project-specific
  projectTitle?: string; // Denormalized
  lastMessageTimestamp?: string;
  lastMessageSnippet?: string;
  unreadCounts?: { [userId: string]: number }; // Mocked for now
  isGroupChat?: boolean; // True if more than 2 participants or an explicit project chat
  adminOnlyVisible?: boolean; // For conversations an admin created but participants are not yet aware (e.g. pending first message)
  createdAt: string;
  updatedAt: string;
}

// --- Messaging System Types ---
export interface ConversationPreviewPHP {
  conversation_id: string;
  participants: {
    id: string;
    username: string;
    avatarUrl?: string;
  }[];
  last_message?: {
    content: string;
    timestamp: string;
    sender_id: string;
  };
  unread_count: number;
}

export interface MessagePHP {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  timestamp: string;
  status: MessageStatus;
}

export interface SendMessagePayload {
  conversation_id: string;
  content: string;
  attachments?: string[];
}

export interface AdminUserView {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
}

// --- Auth Context Types ---
export interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  activeTimerInfo?: { // Ensure this matches usage
    jobCardId: string;
    startTime: string; // ISO String
    jobCardTitle?: string; // Optional: for display in a global timer UI
    projectId?: string; // Optional: for context
  };
  startGlobalTimer: (jobCardId: string, jobCardTitle: string, projectId: string) => Promise<void>; // Ensure params match usage
  stopGlobalTimerAndLog: (notes?: string) => Promise<void>;
}

export interface AuthUser {
  id: number; // Changed to number to align with apiService.ts and backend
  email: string;
  name: string; // Ensure 'name' is present
  username: string; // Ensure 'username' is present
  role: UserRole;
  avatarUrl?: string;
}

// --- Admin Dashboard Stats ---
// Based on DashboardOverview.tsx usage
export interface AdminDashboardUsersByRole {
  admin?: number;
  client?: number;
  freelancer?: number;
}

export interface AdminDashboardProjectsByStatus {
  [status: string]: number; // e.g., "Pending Approval": 5, "Open": 10
}

export interface AdminDashboardStatsResponse {
  total_active_users: number;
  users_by_role: {
    admin: number;
    client: number;
    freelancer: number;
  };
  total_projects: number;
  projects_by_status: {
    [key: string]: number;
  };
  pending_approval_projects: number;
  messages_pending_approval: number;
  in_progress_projects: number;
  total_open_applications: number;
  revenue_this_month: number;
  active_freelancers: number;
}

// --- Recent Activity Item ---
// Based on DashboardOverview.tsx usage
export interface RecentActivity {
  id: string; // Or number, depending on source
  iconName?: 'CheckCircleIcon' | 'PencilIcon' | 'BriefcaseIcon' | string; // For mapping to icons
  text: string;
  timestamp: string; // ISO date string
  // time?: string; // If pre-formatted time is sometimes available
  linkTo?: string; // Optional link for the activity
}

// --- Managed File (ensure it's comprehensive) ---
export interface ManagedFile {
  id: string;
  name: string;
  type: string; // Or MIME type, e.g., 'application/pdf', 'image/jpeg'
  url: string;
  size?: number; // In bytes
  uploadedAt: string; // ISO date string
  uploadedBy: string; // User ID
  uploadedByName?: string; // Denormalized for display
  projectId?: string; // If associated with a project
}


// Ensure other types like ConversationPreviewPHP, MessagePHP, AdminUserView, SendMessagePayload are correctly defined
// ... (from previous steps, assuming they are mostly correct, will adjust if component errors persist) ...

// Ensure TimeLogPHPResponse has all fields used in ProjectDetailsPage.tsx
export interface TimeLogPHPResponse {
    id: number; // from backend
    job_card_id: number; // from backend
    user_id: number; // from backend (logger)
    logger_username?: string; // from backend
    job_card_title?: string; // from backend
    start_time: string; // ISO string
    end_time: string; // ISO string
    duration_minutes: number;
    notes: string | null;
    created_at: string; // ISO string
    // manual_entry: boolean; // if backend provides this
}

export interface FreelancerDashboardStats {
  myTotalJobCards: number;
  myInProgressJobCards: number;
  openProjectsCount: number;
  myApplicationsCount: number;
}

export interface ClientDashboardStats {
  myProjectsCount: number;
  openProjectsCount: number; // Projects open for application (general stat)
  myInProgressProjectsCount: number; // Client's projects in progress
  myCompletedProjectsCount: number; // Client's completed projects
}
