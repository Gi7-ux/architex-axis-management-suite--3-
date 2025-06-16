import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ProjectStatus, UserRole, Project } from '../../types'; // Keep Project if FreelancerAssignedProjectResponseItem extends it
import {
    fetchFreelancerAssignedProjectsAPI,
    FreelancerAssignedProjectResponseItem
} from '../../apiService';
import { useAuth } from '../AuthContext';
import LoadingSpinner from '../shared/LoadingSpinner';
import Button from '../shared/Button';
import { NAV_LINKS } from '../../constants';
// import { BriefcaseIcon } from '../shared/IconComponents'; // Example if you want an icon for empty state

const MyAssignedProjects: React.FC = () => {
  const { user } = useAuth();
  const [assignedProjects, setAssignedProjects] = useState<FreelancerAssignedProjectResponseItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAssignedProjects = useCallback(async () => {
    if (!user || user.role !== UserRole.FREELANCER) {
      setAssignedProjects([]);
      setIsLoading(false);
      // setError("Only freelancers can view this page."); // Optional: set error
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const projects = await fetchFreelancerAssignedProjectsAPI();
      // Backend returns FreelancerAssignedProjectResponseItem which includes client_username
      // It extends Project, so most fields should align.
      // Ensure IDs are strings if other parts of your app expect that for Project type.
      const mappedProjects = projects.map(p => ({
        ...p,
        id: String(p.id),
        clientId: String(p.client_id), // Assuming client_id is from base Project type
        freelancerId: p.freelancer_id ? String(p.freelancer_id) : undefined,
      }));
      setAssignedProjects(mappedProjects.sort((a,b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()));
    } catch (err: any) {
      console.error("Failed to load assigned projects:", err);
      setError(err.message || "Could not load your assigned projects.");
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => { loadAssignedProjects(); }, [loadAssignedProjects]);

  if (isLoading && assignedProjects.length === 0) return <LoadingSpinner text="Loading your assigned projects..." className="p-6" />;

  if (!user) {
    return <p className="p-6 text-center text-red-500">You must be logged in to view this page.</p>;
  }
  if (user.role !== UserRole.FREELANCER && !isLoading) {
      return <p className="p-6 text-center text-red-500">This page is for freelancers only.</p>;
  }
  if (error) {
    return <p className="p-6 text-center text-red-500 bg-red-50 rounded-md">{error}</p>;
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <h2 className="text-3xl font-bold text-gray-800 mb-4 sm:mb-0">My Assigned Projects</h2>

      {!isLoading && assignedProjects.length === 0 && (
         <div className="p-6 text-center text-gray-500">
            {/* <BriefcaseIcon className="w-16 h-16 mx-auto mb-4 text-gray-300"/> Optional Icon */}
            <h3 className="text-xl font-semibold">No Projects Assigned</h3>
            <p className="mt-1">You are not currently assigned to any active projects.</p>
            <p className="text-sm mt-1">Once a client accepts your application, the project will appear here.</p>
        </div>
      )}

      <div className="space-y-4">
        {assignedProjects.map(project => (
          <div key={project.id} className="bg-white shadow-lg rounded-xl p-5 hover:shadow-xl transition-shadow">
            <h3 className="text-lg font-semibold text-gray-800">{project.title}</h3>
            <p className="text-sm text-gray-500 mb-1">Client: {project.client_username}</p>
            <p className="text-sm text-gray-600 mb-2 line-clamp-3">{project.description}</p>
            <div className="flex items-center space-x-2 text-xs text-gray-500 mb-3">
              <span className={`px-2 py-0.5 rounded-full text-xs ${
                project.status === ProjectStatus.IN_PROGRESS ? 'bg-green-100 text-green-700 animate-pulse'
                : project.status === ProjectStatus.COMPLETED ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-700'
              }`}>
                Status: {project.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </span>
              <span>Last Updated: {new Date(project.updatedAt).toLocaleDateString()}</span>
            </div>
            <Link to={NAV_LINKS.PROJECT_DETAILS.replace(':id', String(project.id))}>
              <Button variant="outline" size="sm">View Project Details</Button>
            </Link>
            {/* Further actions like 'View Tasks/Job Cards' or 'Log Time' would go here later */}
          </div>
        ))}
      </div>
    </div>
  );
};
export default MyAssignedProjects;
