import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { UserRole, ProjectStatus, MessageStatus, JobCardStatus, Project, User, Application, ManagedFile } from '../../types';
import { 
    fetchAdminDashboardStatsAPI, fetchFreelancerDashboardStatsAPI, fetchClientDashboardStatsAPI,
    fetchRecentActivityAPI, fetchAdminRecentFilesAPI
} from '../../apiService';
import { NAV_LINKS, getMockFileIconPath } from '../../constants';
import { Link } from 'react-router-dom';
import { UsersIcon, BriefcaseIcon, ClockIcon, CheckCircleIcon, DocumentTextIcon, ListBulletIcon, CurrencyDollarIcon, IconProps, PencilIcon, ChatBubbleLeftRightIcon, FolderIcon } from './shared/IconComponents';
import LoadingSpinner from '../shared/LoadingSpinner';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  linkTo?: string;
  color?: 'blue' | 'green' | 'yellow' | 'orange' | 'purple' | 'teal' | 'red';
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, linkTo, color = 'blue' }) => {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600 border-blue-500',
    green: 'bg-green-100 text-green-600 border-green-500',
    yellow: 'bg-yellow-100 text-yellow-600 border-yellow-500',
    orange: 'bg-orange-100 text-orange-600 border-orange-500',
    purple: 'bg-purple-100 text-purple-600 border-purple-500',
    teal: 'bg-teal-100 text-teal-600 border-teal-500',
    red: 'bg-red-100 text-red-600 border-red-500',
  };

  const content = (
    <div className={`bg-white p-5 md:p-6 rounded-xl shadow-lg flex items-center space-x-4 hover:shadow-xl transition-shadow duration-200 border-l-4 ${colorClasses[color]}`}>
      <div className={`p-3 rounded-full ${colorClasses[color].split(' ')[0]} ${colorClasses[color].split(' ')[1]}`}>
        {React.cloneElement(icon as React.ReactElement<IconProps>, { className: "w-7 h-7 md:w-8 md:w-8" })}
      </div>
      <div>
        <p className="text-sm text-gray-500">{title}</p>
        <p className="text-xl md:text-2xl font-semibold text-gray-800">{value}</p>
      </div>
    </div>
  );

  if (linkTo) {
    return <Link to={linkTo} className="block">{content}</Link>;
  }
  return content;
};

// Define more specific types for stats if possible
interface AdminDashboardStats {
    totalUsers: number;
    totalProjects: number;
    pendingApprovalProjects: number;
    messagesPendingApproval: number;
    inProgressProjects: number;
}
interface FreelancerDashboardStats {
    myTotalJobCards: number;
    myInProgressJobCards: number;
    openProjectsCount: number;
    myApplicationsCount: number;
}
interface ClientDashboardStats {
    myProjectsCount: number;
    openProjectsCount: number; // Projects open for application (general stat)
    myInProgressProjectsCount: number; // Client's projects in progress
    myCompletedProjectsCount: number; // Client's completed projects
}

const DashboardOverview: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<AdminDashboardStats | FreelancerDashboardStats | ClientDashboardStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [recentFiles, setRecentFiles] = useState<ManagedFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const loadDashboardData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        let fetchedStats;
        if (user.role === UserRole.ADMIN) {
          fetchedStats = await fetchAdminDashboardStatsAPI();
          const files = await fetchAdminRecentFilesAPI();
          setRecentFiles(files);
        } else if (user.role === UserRole.FREELANCER) {
          fetchedStats = await fetchFreelancerDashboardStatsAPI(user.id);
        } else if (user.role === UserRole.CLIENT) {
          fetchedStats = await fetchClientDashboardStatsAPI(user.id);
        }
        setStats(fetchedStats);

        const activity = await fetchRecentActivityAPI(user.id);
        setRecentActivity(activity);

      } catch (err: any) {
        console.error("Failed to load dashboard data:", err);
        setError(err.message || "Could not load dashboard information.");
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();
  }, [user]);

  if (isLoading) {
    return <LoadingSpinner text="Loading dashboard overview..." className="p-6 h-64 flex items-center justify-center"/>;
  }
  if (error) {
      return <div className="p-6 text-center text-red-500 bg-red-100 rounded-md">{error}</div>;
  }
  if (!user) { // Should be caught by ProtectedView, but good to have
    return <div className="p-6 text-center">User not found.</div>;
  }


  const renderAdminStats = () => {
    if (!stats || user.role !== UserRole.ADMIN) return null;
    const adminStats = stats as AdminDashboardStats;
    return (
      <>
        <StatCard title="Total Users" value={adminStats.totalUsers || 0} icon={<UsersIcon />} linkTo={`${NAV_LINKS.DASHBOARD}/${NAV_LINKS.ADMIN_USERS}`} color="blue" />
        <StatCard title="Total Projects" value={adminStats.totalProjects || 0} icon={<BriefcaseIcon />} linkTo={`${NAV_LINKS.DASHBOARD}/${NAV_LINKS.ADMIN_PROJECTS}`} color="teal" />
        <StatCard title="Projects In Progress" value={adminStats.inProgressProjects || 0} icon={<ClockIcon />} linkTo={`${NAV_LINKS.DASHBOARD}/${NAV_LINKS.ADMIN_PROJECTS}`} color="yellow" />
        <StatCard title="Messages Pending Approval" value={adminStats.messagesPendingApproval || 0} icon={<ChatBubbleLeftRightIcon />} linkTo={NAV_LINKS.MESSAGES} color="red" />
        <StatCard title="Projects Pending Approval" value={adminStats.pendingApprovalProjects || 0} icon={<CheckCircleIcon />} linkTo={`${NAV_LINKS.DASHBOARD}/${NAV_LINKS.ADMIN_PROJECTS}`} color="orange" />
      </>
    );
  };

  const renderFreelancerStats = () => {
    if (!stats || user.role !== UserRole.FREELANCER) return null;
    const freelancerStats = stats as FreelancerDashboardStats;
    return (
        <>
            <StatCard title="Open Projects" value={freelancerStats.openProjectsCount || 0} icon={<BriefcaseIcon />} linkTo={`${NAV_LINKS.DASHBOARD}/${NAV_LINKS.FREELANCER_BROWSE}`} color="teal"/>
            <StatCard title="My Applications" value={freelancerStats.myApplicationsCount || 0} icon={<DocumentTextIcon />} linkTo={`${NAV_LINKS.DASHBOARD}/${NAV_LINKS.FREELANCER_APPLICATIONS}`} color="blue"/>
            <StatCard title="My Assigned Tasks" value={freelancerStats.myTotalJobCards || 0} icon={<ListBulletIcon />} linkTo={`${NAV_LINKS.DASHBOARD}/${NAV_LINKS.FREELANCER_JOB_CARDS}`} color="purple"/>
            <StatCard title="Tasks In Progress" value={freelancerStats.myInProgressJobCards || 0} icon={<ClockIcon />} linkTo={`${NAV_LINKS.DASHBOARD}/${NAV_LINKS.FREELANCER_JOB_CARDS}`} color="yellow"/>
        </>
    );
  };

  const renderClientStats = () => {
    if (!stats || user.role !== UserRole.CLIENT) return null;
    const clientStats = stats as ClientDashboardStats;
    return (
        <>
            <StatCard title="My Total Projects" value={clientStats.myProjectsCount || 0} icon={<BriefcaseIcon />} linkTo={`${NAV_LINKS.DASHBOARD}/${NAV_LINKS.CLIENT_MY_PROJECTS}`} color="teal"/>
            <StatCard title="My Projects In Progress" value={clientStats.myInProgressProjectsCount || 0} icon={<ClockIcon />} linkTo={`${NAV_LINKS.DASHBOARD}/${NAV_LINKS.CLIENT_MY_PROJECTS}`} color="yellow"/>
            <StatCard title="My Completed Projects" value={clientStats.myCompletedProjectsCount || 0} icon={<CheckCircleIcon />} linkTo={`${NAV_LINKS.DASHBOARD}/${NAV_LINKS.CLIENT_MY_PROJECTS}`} color="green"/>
            <StatCard title="Open Projects (Platform)" value={clientStats.openProjectsCount || 0} icon={<BriefcaseIcon />} linkTo={NAV_LINKS.PUBLIC_PROJECT_BROWSE} color="orange"/>
        </>
    );
  };

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-gray-800">Dashboard Overview</h1>
      <p className="text-gray-600">Welcome back, {user.name}! Here's a quick look at your platform activity.</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 md:gap-6">
        {user.role === UserRole.ADMIN && renderAdminStats()}
        {user.role === UserRole.FREELANCER && renderFreelancerStats()}
        {user.role === UserRole.CLIENT && renderClientStats()}
      </div>

      <div className="mt-10 p-6 bg-primary-extralight rounded-xl shadow">
          <h2 className="text-xl font-semibold text-primary mb-3">Quick Actions</h2>
          <div className="flex flex-wrap gap-3">
              {user.role === UserRole.ADMIN && (
                  <>
                    <Link to={`${NAV_LINKS.DASHBOARD}/${NAV_LINKS.ADMIN_PROJECTS}`}><button className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg text-sm">Manage Projects</button></Link>
                    <Link to={`${NAV_LINKS.DASHBOARD}/${NAV_LINKS.ADMIN_USERS}`}><button className="bg-secondary hover:bg-primary text-white px-4 py-2 rounded-lg text-sm">Manage Users</button></Link>
                    <Link to={`${NAV_LINKS.DASHBOARD}/${NAV_LINKS.ADMIN_TIME_REPORTS}`}><button className="bg-secondary hover:bg-primary text-white px-4 py-2 rounded-lg text-sm">View Time Reports</button></Link>
                  </>
              )}
               {user.role === UserRole.FREELANCER && (
                  <>
                    <Link to={`${NAV_LINKS.DASHBOARD}/${NAV_LINKS.FREELANCER_BROWSE}`}><button className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg text-sm">Browse Projects</button></Link>
                    <Link to={`${NAV_LINKS.DASHBOARD}/${NAV_LINKS.FREELANCER_JOB_CARDS}`}><button className="bg-secondary hover:bg-primary text-white px-4 py-2 rounded-lg text-sm">My Job Cards</button></Link>
                  </>
              )}
              {user.role === UserRole.CLIENT && (
                  <Link to={`${NAV_LINKS.DASHBOARD}/${NAV_LINKS.CLIENT_MY_PROJECTS}`}><button className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg text-sm">View My Projects</button></Link>
              )}
              <Link to={`${NAV_LINKS.PROFILE}`}><button className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm">Edit My Profile</button></Link>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-10">
        <div>
            <h2 className="text-xl font-semibold text-gray-700 mb-3">Recent Activity</h2>
            <div className="bg-white p-4 md:p-6 rounded-xl shadow">
                {recentActivity.length > 0 ? (
                    <ul className="space-y-4 max-h-72 overflow-y-auto">
                        {recentActivity.map(activity => ( // Assuming activity has an 'iconName' or similar to map to an IconComponent
                            <li key={activity.id} className="flex items-start space-x-3 pb-3 border-b border-gray-100 last:border-b-0">
                                <div className="flex-shrink-0 mt-1 text-primary">
                                    {activity.iconName === 'CheckCircleIcon' ? <CheckCircleIcon className="w-5 h-5"/> : 
                                     activity.iconName === 'PencilIcon' ? <PencilIcon className="w-5 h-5"/> :
                                     <BriefcaseIcon className="w-5 h-5"/> /* Default icon */
                                    }
                                </div>
                                <div>
                                    <p className="text-sm text-gray-700">{activity.text}</p>
                                    <p className="text-xs text-gray-400">{activity.time || new Date(activity.timestamp).toLocaleString()}</p>
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-gray-500">No recent activity to display.</p>
                )}
            </div>
        </div>

        {user.role === UserRole.ADMIN && (
            <div>
                <h2 className="text-xl font-semibold text-gray-700 mb-3">Recent File Uploads</h2>
                <div className="bg-white p-4 md:p-6 rounded-xl shadow">
                    {recentFiles.length > 0 ? (
                        <ul className="space-y-3 max-h-72 overflow-y-auto">
                            {recentFiles.map(file => (
                                <li key={file.id} className="flex items-center space-x-3 pb-2 border-b border-gray-100 last:border-b-0">
                                    <img src={getMockFileIconPath(file.type)} alt={file.type} className="w-6 h-6 flex-shrink-0"/>
                                    <div className="flex-grow">
                                        <p className="text-sm text-gray-700 truncate" title={file.name}>{file.name}</p>
                                        <p className="text-xs text-gray-400">
                                            Uploaded by {file.uploadedByName || 'Unknown User'} 
                                            {file.projectId ? ` to project ID: ${file.projectId}`: ''}
                                        </p>
                                    </div>
                                    <span className="text-xs text-gray-400 flex-shrink-0">{new Date(file.uploadedAt).toLocaleDateString()}</span>
                                </li>
                            ))}
                        </ul>
                    ) : (
                         <p className="text-gray-500">No files uploaded recently.</p>
                    )}
                </div>
            </div>
        )}
      </div>

    </div>
  );
};

export default DashboardOverview;