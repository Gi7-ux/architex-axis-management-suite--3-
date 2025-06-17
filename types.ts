
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

// --- Invoice System Types ---
export enum InvoiceStatus {
  DRAFT = 'Draft',
  SENT = 'Sent',
  PAID = 'Paid',
  VOID = 'Void',
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number; // In Rands
  totalPrice: number; // quantity * unitPrice, In Rands
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  clientId: string;
  clientName?: string; // Denormalized for display
  projectId: string;
  projectTitle?: string; // Denormalized for display
  issueDate: string; // ISO date string
  dueDate: string; // ISO date string
  items: InvoiceItem[];
  subTotal: number; // Sum of all item totalPrice, In Rands
  taxRate?: number; // Percentage e.g., 0.15 for 15%
  taxAmount?: number; // subTotal * taxRate, In Rands
  totalAmount: number; // subTotal + taxAmount, In Rands
  status: InvoiceStatus;
  paymentDetails?: Payment[]; // Could be one or multiple payments
  notes?: string;
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}

export interface Payment {
  id: string;
  invoiceId: string;
  paymentDate: string; // ISO date string
  amountPaid: number; // In Rands
  paymentMethod: string; // e.g., 'EFT', 'Credit Card', 'PayPal'
  transactionId?: string; // Reference from payment gateway
  notes?: string;
  processedBy?: string; // Admin userId who confirmed/processed payment
  createdAt: string; // ISO date string
}
