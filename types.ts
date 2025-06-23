
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
  ARCHIVED = 'archived',
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
  currency: string;
  deadline: string; // ISO date string
  clientId: string; // Client assigned by Admin
  clientName?: string; // Denormalized for display
  status: ProjectStatus;
  skillsRequired: string[];
  createdAt: string; // ISO date string
  adminCreatorId?: string; // Admin who created the project
  freelancerId?: string;
  assignedFreelancerId?: string;
  assignedFreelancerName?: string; // Denormalized
  jobCards?: JobCard[];
  isArchived?: boolean;
  updatedAt: string;
  paymentType: 'fixed' | 'hourly';
  experienceLevel: 'beginner' | 'intermediate' | 'expert';
  duration: string;
  isFeatured?: boolean;
}

export interface Application {
  id: string;
  projectId: string;
  freelancerId: string;
  freelancerName: string;
  proposalText: string;
  bidAmount: number; // In Rands
  status: 'pending' | 'accepted' | 'rejected'; // Status might need more stages
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

export interface ManagedFile {
  id: string;
  name: string;
  url: string; // For mock, can be a placeholder string or data URL for small files
  type: string; // e.g., 'image/png', 'application/pdf'
  size?: number; // in bytes
  uploadedBy: string; // userId
  uploadedByName?: string; // Denormalized
  uploadedAt: string; // ISO date string
  projectId?: string; // Link file to a project
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
