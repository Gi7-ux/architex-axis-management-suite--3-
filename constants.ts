import { UserRole, User, Project, ProjectStatus, Application, JobCard, JobCardStatus, TimeLog, Message, Conversation, MessageStatus, ManagedFile } from './types';

export const APP_NAME = "Architex Axis Management Suite";
export const SHORT_APP_NAME = "Architex Axis"; 

// getUserById is removed as user data should be fetched via API when needed or denormalized in primary data.

export const getMockFileIconPath = (fileType: string): string => {
    if (fileType.startsWith('image/')) return '/icons/file-image.svg';
    if (fileType === 'application/pdf') return '/icons/file-pdf.svg';
    if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || fileType === 'application/msword') return '/icons/file-doc.svg';
    if (fileType.includes('spreadsheet') || fileType.includes('excel')) return '/icons/file-excel.svg';
    if (fileType.includes('zip') || fileType.includes('compressed')) return '/icons/file-zip.svg';
    if (fileType === 'image/vnd.dwg' || fileType === 'application/acad') return '/icons/file-cad.svg';
    return '/icons/file-generic.svg';
};


export const NAV_LINKS = {
  HOME: '/',
  LOGIN: '/login',
  ADMIN_LOGIN: '/admin-login',
  DASHBOARD: '/dashboard', 
  DASHBOARD_OVERVIEW: '/dashboard/overview', 

  PROFILE: '/dashboard/profile',
  MESSAGES: '/dashboard/messages',
  
  ADMIN_USERS: 'users',
  ADMIN_PROJECTS: 'projects',
  ADMIN_CREATE_PROJECT: 'create-project', // This path might be deprecated if creation is modal-only
  ADMIN_BILLING: 'billing', 
  ADMIN_TIME_REPORTS: 'time-reports',
  
  FREELANCER_BROWSE: 'browse-projects',
  PUBLIC_PROJECT_BROWSE: '/browse-projects',
  FREELANCER_APPLICATIONS: 'my-applications',
  FREELANCER_JOB_CARDS: 'my-job-cards',
  
  CLIENT_MY_PROJECTS: 'my-projects', 
  
  PROJECT_DETAILS: '/project/:id', 
};

export const formatDurationToHHMMSS = (totalSeconds: number): string => {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  const hh = String(hours).padStart(2, '0');
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');

  return `${hh}:${mm}:${ss}`;
};
