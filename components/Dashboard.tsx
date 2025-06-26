import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom'; // Removed Outlet as it's not used directly here
import { useAuth } from '../contexts/AuthContext'; // Corrected path
import { UserRole } from '../types';
import LoadingSpinner from './shared/LoadingSpinner'; // Ensured relative path
import Sidebar, { SidebarNavItem } from './shared/Sidebar';

// Page Components
import DashboardOverview from './DashboardOverview';
import UserManagement from './admin/UserManagement';
import ProjectManagement from './admin/ProjectManagement';
import AdminBillingPlaceholder from './admin/AdminBillingPlaceholder';
import AdminTimeLogReportPage from './admin/AdminTimeLogReportPage';
import ProjectBrowser from './freelancer/ProjectBrowser';
import MyApplications from './freelancer/MyApplications';
import MyJobCards from './freelancer/MyJobCards';
import FreelancerTimeTrackingPage from './freelancer/FreelancerTimeTrackingPage';
import MyProjects from './client/MyProjects';
import ClientProjectTimeLogPage from './client/ClientProjectTimeLogPage'; // Import the new page
import MessagingPage from './MessagingPage';
import UserProfilePage from './UserProfilePage';
import { NAV_LINKS } from '../constants';
import { HomeIcon, UsersIcon, BriefcaseIcon, PlusCircleIcon, CurrencyDollarIcon, ClockIcon, DocumentTextIcon, ListBulletIcon, UserCircleIcon, ChatBubbleLeftRightIcon } from './shared/IconComponents';


const getSidebarNavItems = (role: UserRole): SidebarNavItem[] => {
  const baseDashboardPath = NAV_LINKS.DASHBOARD; // This is /dashboard
  switch (role) {
    case UserRole.ADMIN:
      return [
        { label: 'Overview', to: NAV_LINKS.DASHBOARD_OVERVIEW, icon: <HomeIcon /> },
        { label: 'User Management', to: `${baseDashboardPath}/${NAV_LINKS.ADMIN_USERS}`, icon: <UsersIcon /> },
        { label: 'Projects', to: `${baseDashboardPath}/${NAV_LINKS.ADMIN_PROJECTS}`, icon: <BriefcaseIcon /> },
        // Create Project link removed as it's handled via modal in ProjectManagement
        // { label: 'New Project', to: `${baseDashboardPath}/${NAV_LINKS.ADMIN_CREATE_PROJECT}`, icon: <PlusCircleIcon /> },
        { label: 'Billing', to: `${baseDashboardPath}/${NAV_LINKS.ADMIN_BILLING}`, icon: <CurrencyDollarIcon /> },
        { label: 'Time Reports', to: `${baseDashboardPath}/${NAV_LINKS.ADMIN_TIME_REPORTS}`, icon: <ClockIcon /> },
      ];
    case UserRole.FREELANCER:
      return [
        { label: 'Overview', to: NAV_LINKS.DASHBOARD_OVERVIEW, icon: <HomeIcon /> },
        { label: 'Browse Projects', to: `${baseDashboardPath}/${NAV_LINKS.FREELANCER_BROWSE}`, icon: <BriefcaseIcon /> },
        { label: 'My Applications', to: `${baseDashboardPath}/${NAV_LINKS.FREELANCER_APPLICATIONS}`, icon: <DocumentTextIcon /> },
        { label: 'My Job Cards', to: `${baseDashboardPath}/${NAV_LINKS.FREELANCER_JOB_CARDS}`, icon: <ListBulletIcon /> },
        { label: 'Time Tracking', to: `${baseDashboardPath}/${NAV_LINKS.FREELANCER_TIME_TRACKING}`, icon: <ClockIcon /> },
      ];
    case UserRole.CLIENT:
      return [
        { label: 'Overview', to: NAV_LINKS.DASHBOARD_OVERVIEW, icon: <HomeIcon /> },
        { label: 'My Projects', to: `${baseDashboardPath}/${NAV_LINKS.CLIENT_MY_PROJECTS}`, icon: <BriefcaseIcon /> },
        { label: 'Project Time Logs', to: `${baseDashboardPath}/${NAV_LINKS.CLIENT_PROJECT_TIME_LOGS}`, icon: <ClockIcon /> },
      ];
    default:
      return [{ label: 'Overview', to: NAV_LINKS.DASHBOARD_OVERVIEW, icon: <HomeIcon /> }];
  }
};


const Dashboard: React.FC = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <LoadingSpinner text="Loading dashboard..." size="lg" />
      </div>
    );
  }

  if (!user) {
    // This should ideally be caught by ProtectedView, but as a safeguard:
    return <Navigate to={NAV_LINKS.LOGIN} replace />;
  }

  const sidebarNavItems = getSidebarNavItems(user.role);
  // Add common links to all roles' sidebars. These NAV_LINKS are already full paths.
  sidebarNavItems.push(
    { label: 'My Profile', to: NAV_LINKS.PROFILE, icon: <UserCircleIcon /> },
    { label: 'Messages', to: NAV_LINKS.MESSAGES, icon: <ChatBubbleLeftRightIcon /> }
  );

  return (
    <div className="flex h-[calc(100vh-4rem)]"> {/* Full height minus navbar */}
      <Sidebar navItems={sidebarNavItems} />
      <div className="flex-1 p-6 md:p-10 overflow-y-auto bg-white"> {/* Content area with white background */}
        <Routes>
          {/* Explicitly render DashboardOverview for the '/dashboard/overview' path */}
          <Route path="overview" element={<DashboardOverview />} />

          {/* Index route for '/dashboard' itself - also show overview */}
          <Route index element={<DashboardOverview />} />


          {/* Admin Routes - NAV_LINKS.ADMIN_USERS etc. are relative paths here */}
          {user.role === UserRole.ADMIN && (
            <>
              <Route path={NAV_LINKS.ADMIN_USERS} element={<UserManagement />} />
              <Route path={NAV_LINKS.ADMIN_PROJECTS} element={<ProjectManagement />} />
              {/* ADMIN_CREATE_PROJECT route logic is now handled within ProjectManagement via modal */}
              {/* <Route path={NAV_LINKS.ADMIN_CREATE_PROJECT} element={<ProjectManagement />} />  */}
              <Route path={NAV_LINKS.ADMIN_BILLING} element={<AdminBillingPlaceholder />} />
              <Route path={NAV_LINKS.ADMIN_TIME_REPORTS} element={<AdminTimeLogReportPage />} />
            </>
          )}

          {/* Freelancer Routes */}
          {user.role === UserRole.FREELANCER && (
            <>
              <Route path={NAV_LINKS.FREELANCER_BROWSE} element={<ProjectBrowser />} />
              <Route path={NAV_LINKS.FREELANCER_APPLICATIONS} element={<MyApplications />} />
              <Route path={NAV_LINKS.FREELANCER_JOB_CARDS} element={<MyJobCards />} />
              <Route path={NAV_LINKS.FREELANCER_TIME_TRACKING} element={<FreelancerTimeTrackingPage />} />
            </>
          )}

          {/* Client Routes */}
          {user.role === UserRole.CLIENT && (
            <>
              <Route path={NAV_LINKS.CLIENT_MY_PROJECTS} element={<MyProjects />} />
              <Route path={NAV_LINKS.CLIENT_PROJECT_TIME_LOGS} element={<ClientProjectTimeLogPage />} />
            </>
          )}

          {/* Common Routes - need to use the relative part of the path */}
          <Route path={NAV_LINKS.PROFILE.substring(NAV_LINKS.DASHBOARD.length + 1)} element={<UserProfilePage />} />
          <Route path={NAV_LINKS.MESSAGES.substring(NAV_LINKS.DASHBOARD.length + 1)} element={<MessagingPage />} />

          {/* Default catch-all for any other unmatched sub-route under /dashboard */}
          <Route path="*" element={<Navigate to="overview" replace />} />
        </Routes>
      </div>
    </div>
  );
};

export default Dashboard;
