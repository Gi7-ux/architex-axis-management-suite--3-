import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import Dashboard from '../components/Dashboard';
import { AuthContext } from '../contexts/AuthContext';
import { UserRole } from '../types';
import { NAV_LINKS } from '../constants';

// Mock child components to simplify testing Dashboard's routing logic
jest.mock('../components/DashboardOverview', () => () => <div>DashboardOverview Mock</div>);
jest.mock('../components/admin/UserManagement', () => () => <div>UserManagement Mock</div>);
jest.mock('../components/admin/ProjectManagement', () => () => <div>ProjectManagement Mock</div>);
jest.mock('../components/admin/AdminBillingPlaceholder', () => () => <div>AdminBillingPlaceholder Mock</div>);
jest.mock('../components/admin/AdminTimeLogReportPage', () => () => <div>AdminTimeLogReportPage Mock</div>);
jest.mock('../components/freelancer/ProjectBrowser', () => () => <div>ProjectBrowser Mock</div>);
jest.mock('../components/freelancer/MyApplications', () => () => <div>MyApplications Mock</div>);
jest.mock('../components/freelancer/MyJobCards', () => () => <div>MyJobCards Mock</div>);
jest.mock('../components/freelancer/FreelancerTimeTrackingPage', () => () => <div>FreelancerTimeTrackingPage Mock</div>);
jest.mock('../components/client/MyProjects', () => () => <div>MyProjects Mock</div>);
jest.mock('../components/client/ClientProjectTimeLogPage', () => () => <div>ClientProjectTimeLogPage Mock</div>);
jest.mock('../components/MessagingPage', () => () => <div>MessagingPage Mock</div>);
jest.mock('../components/UserProfilePage', () => () => <div>UserProfilePage Mock</div>);
jest.mock('../components/shared/LoadingSpinner', () => ({ text, size }: { text: string; size: string }) => (
  <div data-testid="loading-spinner">{text}</div>
));
jest.mock('../components/shared/Sidebar', () => ({ navItems }: { navItems: any[] }) => (
  <div data-testid="sidebar">
    {navItems.map((item, index) => (
      <a key={index} href={item.to} data-testid={`sidebar-link-${item.label.toLowerCase().replace(/\s/g, '-')}`}>
        {item.label}
      </a>
    ))}
  </div>
));


const mockAuthContextValue = (user: any, isLoading: boolean = false) => ({
  user,
  token: 'mock-token',
  login: jest.fn(),
  logout: jest.fn(),
  isLoading,
  updateCurrentUserDetails: jest.fn(),
  activeTimerInfo: null,
  startGlobalTimer: jest.fn(),
  stopGlobalTimerAndLog: jest.fn(),
  clearGlobalTimerState: jest.fn(),
});

const renderDashboard = (user: any, initialEntries: string[] = [NAV_LINKS.DASHBOARD]) => {
  return render(
    <AuthContext.Provider value={mockAuthContextValue(user)}>
      <MemoryRouter initialEntries={initialEntries}>
        <Routes>
          <Route path={`${NAV_LINKS.DASHBOARD}/*`} element={<Dashboard />} />
          <Route path={NAV_LINKS.LOGIN} element={<div>Login Page</div>} /> {/* For Navigate fallback */}
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>
  );
};

describe('Dashboard', () => {
  it('renders LoadingSpinner when isLoading is true', () => {
    render(
      <AuthContext.Provider value={mockAuthContextValue(null, true)}>
        <MemoryRouter initialEntries={[NAV_LINKS.DASHBOARD]}>
          <Routes>
            <Route path={`${NAV_LINKS.DASHBOARD}/*`} element={<Dashboard />} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    );
    expect(screen.getByTestId('loading-spinner')).toHaveTextContent('Loading dashboard...');
  });

  it('redirects to login if no user is authenticated and not loading', () => {
    render(
      <AuthContext.Provider value={mockAuthContextValue(null, false)}>
        <MemoryRouter initialEntries={[NAV_LINKS.DASHBOARD]}>
          <Routes>
            <Route path={`${NAV_LINKS.DASHBOARD}/*`} element={<Dashboard />} />
            <Route path={NAV_LINKS.LOGIN} element={<div>Login Page</div>} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    );
    expect(screen.getByText('Login Page')).toBeInTheDocument();
  });

  describe('Admin User Role', () => {
    const adminUser = { id: '1', email: 'admin@example.com', role: UserRole.ADMIN };

    it('renders admin sidebar navigation items', () => {
      renderDashboard(adminUser);
      const sidebar = screen.getByTestId('sidebar');
      expect(sidebar).toHaveTextContent('Overview');
      expect(sidebar).toHaveTextContent('User Management');
      expect(sidebar).toHaveTextContent('Projects');
      expect(sidebar).toHaveTextContent('Billing');
      expect(sidebar).toHaveTextContent('Time Reports');
      expect(sidebar).toHaveTextContent('My Profile');
      expect(sidebar).toHaveTextContent('Messages');
    });

    it('renders DashboardOverview for /dashboard/overview', async () => {
      renderDashboard(adminUser, [`${NAV_LINKS.DASHBOARD}/overview`]);
      await waitFor(() => {
        expect(screen.getByText('DashboardOverview Mock')).toBeInTheDocument();
      });
    });

    it('renders UserManagement for /dashboard/admin/users', async () => {
      renderDashboard(adminUser, [`${NAV_LINKS.DASHBOARD}/${NAV_LINKS.ADMIN_USERS}`]);
      await waitFor(() => {
        expect(screen.getByText('UserManagement Mock')).toBeInTheDocument();
      });
    });

    it('renders ProjectManagement for /dashboard/admin/projects', async () => {
      renderDashboard(adminUser, [`${NAV_LINKS.DASHBOARD}/${NAV_LINKS.ADMIN_PROJECTS}`]);
      await waitFor(() => {
        expect(screen.getByText('ProjectManagement Mock')).toBeInTheDocument();
      });
    });

    it('renders AdminBillingPlaceholder for /dashboard/admin/billing', async () => {
      renderDashboard(adminUser, [`${NAV_LINKS.DASHBOARD}/${NAV_LINKS.ADMIN_BILLING}`]);
      await waitFor(() => {
        expect(screen.getByText('AdminBillingPlaceholder Mock')).toBeInTheDocument();
      });
    });

    it('renders AdminTimeLogReportPage for /dashboard/admin/time-reports', async () => {
      renderDashboard(adminUser, [`${NAV_LINKS.DASHBOARD}/${NAV_LINKS.ADMIN_TIME_REPORTS}`]);
      await waitFor(() => {
        expect(screen.getByText('AdminTimeLogReportPage Mock')).toBeInTheDocument();
      });
    });
  });

  describe('Freelancer User Role', () => {
    const freelancerUser = { id: '2', email: 'freelancer@example.com', role: UserRole.FREELANCER };

    it('renders freelancer sidebar navigation items', () => {
      renderDashboard(freelancerUser);
      const sidebar = screen.getByTestId('sidebar');
      expect(sidebar).toHaveTextContent('Overview');
      expect(sidebar).toHaveTextContent('Browse Projects');
      expect(sidebar).toHaveTextContent('My Applications');
      expect(sidebar).toHaveTextContent('My Job Cards');
      expect(sidebar).toHaveTextContent('Time Tracking');
      expect(sidebar).toHaveTextContent('My Profile');
      expect(sidebar).toHaveTextContent('Messages');
    });

    it('renders ProjectBrowser for /dashboard/freelancer/browse', async () => {
      renderDashboard(freelancerUser, [`${NAV_LINKS.DASHBOARD}/${NAV_LINKS.FREELANCER_BROWSE}`]);
      await waitFor(() => {
        expect(screen.getByText('ProjectBrowser Mock')).toBeInTheDocument();
      });
    });

    it('renders MyApplications for /dashboard/freelancer/applications', async () => {
      renderDashboard(freelancerUser, [`${NAV_LINKS.DASHBOARD}/${NAV_LINKS.FREELANCER_APPLICATIONS}`]);
      await waitFor(() => {
        expect(screen.getByText('MyApplications Mock')).toBeInTheDocument();
      });
    });

    it('renders MyJobCards for /dashboard/freelancer/job-cards', async () => {
      renderDashboard(freelancerUser, [`${NAV_LINKS.DASHBOARD}/${NAV_LINKS.FREELANCER_JOB_CARDS}`]);
      await waitFor(() => {
        expect(screen.getByText('MyJobCards Mock')).toBeInTheDocument();
      });
    });

    it('renders FreelancerTimeTrackingPage for /dashboard/freelancer/time-tracking', async () => {
      renderDashboard(freelancerUser, [`${NAV_LINKS.DASHBOARD}/${NAV_LINKS.FREELANCER_TIME_TRACKING}`]);
      await waitFor(() => {
        expect(screen.getByText('FreelancerTimeTrackingPage Mock')).toBeInTheDocument();
      });
    });
  });

  describe('Client User Role', () => {
    const clientUser = { id: '3', email: 'client@example.com', role: UserRole.CLIENT };

    it('renders client sidebar navigation items', () => {
      renderDashboard(clientUser);
      const sidebar = screen.getByTestId('sidebar');
      expect(sidebar).toHaveTextContent('Overview');
      expect(sidebar).toHaveTextContent('My Projects');
      expect(sidebar).toHaveTextContent('Project Time Logs');
      expect(sidebar).toHaveTextContent('My Profile');
      expect(sidebar).toHaveTextContent('Messages');
    });

    it('renders MyProjects for /dashboard/client/my-projects', async () => {
      renderDashboard(clientUser, [`${NAV_LINKS.DASHBOARD}/${NAV_LINKS.CLIENT_MY_PROJECTS}`]);
      await waitFor(() => {
        expect(screen.getByText('MyProjects Mock')).toBeInTheDocument();
      });
    });

    it('renders ClientProjectTimeLogPage for /dashboard/client/project-time-logs', async () => {
      renderDashboard(clientUser, [`${NAV_LINKS.DASHBOARD}/${NAV_LINKS.CLIENT_PROJECT_TIME_LOGS}`]);
      await waitFor(() => {
        expect(screen.getByText('ClientProjectTimeLogPage Mock')).toBeInTheDocument();
      });
    });
  });

  describe('Common Routes', () => {
    const commonUser = { id: '4', email: 'common@example.com', role: UserRole.FREELANCER }; // Can be any role for common routes

    it('renders UserProfilePage for /dashboard/profile', async () => {
      renderDashboard(commonUser, [`${NAV_LINKS.DASHBOARD}/${NAV_LINKS.PROFILE.substring(NAV_LINKS.DASHBOARD.length + 1)}`]);
      await waitFor(() => {
        expect(screen.getByText('UserProfilePage Mock')).toBeInTheDocument();
      });
    });

    it('renders MessagingPage for /dashboard/messages', async () => {
      renderDashboard(commonUser, [`${NAV_LINKS.DASHBOARD}/${NAV_LINKS.MESSAGES.substring(NAV_LINKS.DASHBOARD.length + 1)}`]);
      await waitFor(() => {
        expect(screen.getByText('MessagingPage Mock')).toBeInTheDocument();
      });
    });
  });

  it('redirects to overview for unmatched sub-routes', async () => {
    const adminUser = { id: '1', email: 'admin@example.com', role: UserRole.ADMIN };
    renderDashboard(adminUser, [`${NAV_LINKS.DASHBOARD}/non-existent-route`]);
    await waitFor(() => {
      expect(screen.getByText('DashboardOverview Mock')).toBeInTheDocument();
    });
  });
});
