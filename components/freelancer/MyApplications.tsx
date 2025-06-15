import React, { useState, useEffect } from 'react';
import { Application, Project, ProjectStatus } from '../../types';
import { fetchUserApplicationsAPI, fetchProjectDetailsAPI } from '../../apiService';
import { useAuth } from '../AuthContext';
import LoadingSpinner from '../shared/LoadingSpinner';
import { Link } from 'react-router-dom';
import { NAV_LINKS } from '../../constants';
import { EyeIcon, DocumentTextIcon } from '../shared/IconComponents';
import Button from '../shared/Button';


interface ApplicationWithProject extends Application {
    projectTitle?: string;
    projectStatus?: ProjectStatus;
}

const MyApplications: React.FC = () => {
  const { user } = useAuth();
  const [applications, setApplications] = useState<ApplicationWithProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadApplications = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        const myApps = await fetchUserApplicationsAPI(user.id);
        
        const appsWithProjectData: ApplicationWithProject[] = await Promise.all(
          myApps.map(async (app) => {
            try {
                const project = await fetchProjectDetailsAPI(app.projectId);
                return {
                ...app,
                projectTitle: project?.title || "Project Not Found",
                projectStatus: project?.status,
                };
            } catch (projectError) {
                console.warn(`Could not fetch details for project ${app.projectId}:`, projectError);
                 return {
                ...app,
                projectTitle: "Project Details Unavailable",
                projectStatus: undefined, // Or a specific status like 'Unknown'
                };
            }
          })
        );

        setApplications(appsWithProjectData.sort((a,b) => new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime()));
      } catch (err: any) {
        console.error("Failed to load applications:", err);
        setError(err.message || "Could not load your applications. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };
    loadApplications();
  }, [user]);

  const getStatusColor = (status: Application['status']) => {
    switch (status) {
      case 'PendingAdminApproval':
      case 'PendingClientReview':
        return 'bg-yellow-100 text-yellow-700';
      case 'Accepted': return 'bg-green-100 text-green-700';
      case 'Rejected': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  if (isLoading) {
    return <LoadingSpinner text="Loading your applications..." className="p-6" />;
  }

  if (!user) {
    return <p className="p-6 text-center text-red-500">You must be logged in to view your applications.</p>;
  }
  
  if (error) {
    return <p className="p-6 text-center text-red-500 bg-red-50 rounded-md">{error}</p>;
  }


  if (applications.length === 0 && !isLoading) {
    return (
        <div className="p-6 text-center text-gray-500">
            <DocumentTextIcon className="w-16 h-16 mx-auto mb-4 text-gray-300"/>
            <h3 className="text-xl font-semibold">No Applications Yet</h3>
            <p className="mt-1">You have not submitted any applications.</p>
            <Link to={`${NAV_LINKS.DASHBOARD}/${NAV_LINKS.FREELANCER_BROWSE}`} className="mt-4 inline-block">
                <Button variant="primary">Browse Projects to Apply</Button>
            </Link>
        </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      <h2 className="text-3xl font-bold text-gray-800 mb-6">My Applications</h2>
      <div className="bg-white shadow-xl rounded-lg overflow-hidden">
        <ul className="divide-y divide-gray-200">
          {applications.map((app) => (
            <li key={app.id} className="p-4 sm:p-6 hover:bg-gray-50 transition-colors">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                <div>
                  <Link to={NAV_LINKS.PROJECT_DETAILS.replace(':id', app.projectId)} className="text-xl font-semibold text-blue-600 hover:text-blue-700 hover:underline">
                    {app.projectTitle}
                  </Link>
                  <p className="text-sm text-gray-500 mt-1">
                    Applied on: {new Date(app.appliedAt).toLocaleDateString()}
                  </p>
                </div>
                <span className={`mt-2 sm:mt-0 px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(app.status)}`}>
                  {app.status.replace(/([A-Z])/g, ' $1').trim()} 
                </span>
              </div>
              <div className="mt-3 space-y-2 text-sm text-gray-700">
                <p><strong className="font-medium">Bid Amount:</strong> R {app.bidAmount.toLocaleString()}</p>
                <p><strong className="font-medium">Proposal:</strong></p>
                <p className="pl-2 border-l-2 border-gray-200 italic line-clamp-3">{app.proposal}</p>
              </div>
              {app.status === 'Accepted' && app.projectStatus !== ProjectStatus.COMPLETED && (
                 <div className="mt-3">
                     <Link to={NAV_LINKS.PROJECT_DETAILS.replace(':id', app.projectId)} 
                           className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500">
                         <EyeIcon className="w-4 h-4 mr-1.5"/> View Project Workspace
                     </Link>
                 </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default MyApplications;
