import React, { useState, useEffect, useCallback } from 'react';
import { ProjectStatus, UserRole } from '../../types'; // Application type removed as FreelancerApplicationResponseItem is more specific
import {
    fetchFreelancerApplicationsAPI,
    FreelancerApplicationResponseItem, // Use this type
    withdrawApplicationAPI,
    ApiError   // Import withdrawApplicationAPI and ApiError
} from '../../apiService';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../shared/LoadingSpinner';
import { Link } from 'react-router-dom';
import { NAV_LINKS } from '../../constants';
import { EyeIcon, DocumentTextIcon, XCircleIcon } from '../shared/IconComponents'; // Added XCircleIcon
import Button from '../shared/Button';

// Remove ApplicationWithProject interface, use FreelancerApplicationResponseItem directly

const MyApplications: React.FC = () => {
  const { user } = useAuth();
  // Use FreelancerApplicationResponseItem for state
  const [applications, setApplications] = useState<FreelancerApplicationResponseItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadApplications = useCallback(async () => { // useCallback for stable reference
    if (!user || user.role !== UserRole.FREELANCER) { // Ensure user is freelancer
        setApplications([]);
        setIsLoading(false);
        // setError("Only freelancers can view this page."); // Optional: set error for non-freelancers
        return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const myApps = await fetchFreelancerApplicationsAPI(); // Use new API
      // Data already contains project_title and project_status
      setApplications(myApps.sort((a,b) => new Date(b.applied_at).getTime() - new Date(a.applied_at).getTime()));
    } catch (err: any) {
      console.error("Failed to load applications:", err);
      setError(err.message || "Could not load your applications.");
    } finally {
      setIsLoading(false);
    }
  }, [user]); // Add user to dependency array

  useEffect(() => {
    loadApplications();
  }, [loadApplications]); // useEffect depends on loadApplications

  const handleWithdrawApplication = async (applicationId: number | string) => {
    if (!window.confirm("Are you sure you want to withdraw this application?")) return;
    try {
      await withdrawApplicationAPI(String(applicationId));
      alert("Application withdrawn successfully.");
      loadApplications(); // Refresh the list
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message || "Failed to withdraw application.");
        alert(err.message || "Failed to withdraw application.");
      } else {
        setError("An unexpected error occurred while withdrawing.");
        alert("An unexpected error occurred while withdrawing.");
      }
      console.error("Withdraw application error:", err);
    }
  };

  const getStatusColor = (status: string) => { // status is now string from FreelancerApplicationResponseItem
    switch (status) {
      case 'pending': // Assuming 'pending' is the value from backend
      case 'PendingAdminApproval': // Keep old ones for compatibility if needed or update
      case 'PendingClientReview':
        return 'bg-yellow-100 text-yellow-700';
      case 'accepted': // Assuming 'accepted'
      case 'Accepted':
        return 'bg-green-100 text-green-700';
      case 'rejected': // Assuming 'rejected'
      case 'Rejected':
        return 'bg-red-100 text-red-700';
      case 'withdrawn_by_freelancer':
        return 'bg-orange-100 text-orange-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  if (isLoading) {
    return <LoadingSpinner text="Loading your applications..." className="p-6" />;
  }

  if (!user) { // Initial check before loading state is known
    return <p className="p-6 text-center text-red-500">You must be logged in to view your applications.</p>;
  }
  
  if (error) {
    return <p className="p-6 text-center text-red-500 bg-red-50 rounded-md">{error}</p>;
  }

  if (user.role !== UserRole.FREELANCER && !isLoading) { // After loading, if still not freelancer
      return <p className="p-6 text-center text-red-500">This page is for freelancers only.</p>;
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
            <li key={app.application_id} className="p-4 sm:p-6 hover:bg-gray-50 transition-colors">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                <div>
                  <Link to={NAV_LINKS.PROJECT_DETAILS.replace(':id', String(app.project_id))} className="text-xl font-semibold text-primary hover:text-primary-hover hover:underline">
                    {app.project_title}
                  </Link>
                  <p className="text-sm text-gray-500 mt-1">
                    Applied on: {new Date(app.applied_at).toLocaleDateString()}
                  </p>
                </div>
                <span className={`mt-2 sm:mt-0 px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(app.application_status)}`}>
                  {app.application_status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </span>
              </div>
              <div className="mt-3 space-y-2 text-sm text-gray-700">
                <p><strong className="font-medium">Bid Amount:</strong> R {app.bid_amount ? app.bid_amount.toLocaleString() : 'N/A'}</p>
                <p><strong className="font-medium">Proposal:</strong></p>
                <p className="pl-2 border-l-2 border-gray-200 italic line-clamp-3 whitespace-pre-wrap">{app.proposal_text}</p>
                <p className="text-xs text-gray-500">Project Status: {app.project_status}</p>
              </div>
              <div className="mt-3 flex items-center space-x-3">
                {app.application_status === 'accepted' && app.project_status !== ProjectStatus.COMPLETED && (
                   <Link to={NAV_LINKS.PROJECT_DETAILS.replace(':id', String(app.project_id))} >
                       <Button size="xs" variant="successOutline" className="inline-flex items-center">
                           <EyeIcon className="w-4 h-4 mr-1.5"/> View Project Workspace
                       </Button>
                   </Link>
                )}
                {app.application_status === 'pending' && (
                  <Button
                    size="xs"
                    variant="warningOutline"
                    onClick={() => handleWithdrawApplication(app.application_id)}
                  >
                    <XCircleIcon className="w-4 h-4 mr-1"/> Withdraw Application
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default MyApplications;
