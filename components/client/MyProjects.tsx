import React, { useState, useEffect } from 'react';
import { Project, UserRole, ProjectStatus } from '../../types';
import { fetchProjectsAPI } from '../../apiService';
import { NAV_LINKS } from '../../constants';
import ProjectCard from '../shared/ProjectCard';
import { useAuth } from '../AuthContext';
import LoadingSpinner from '../shared/LoadingSpinner';
import { Link } from 'react-router-dom';
import { BriefcaseIcon } from '../shared/IconComponents';

const MyProjects: React.FC = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const loadProjects = async () => {
      if (!user || user.role !== UserRole.CLIENT) {
        setIsLoading(false);
        setError("User not authenticated as Client.");
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        const clientProjects = await fetchProjectsAPI({ clientId: user.id });
        setProjects(clientProjects.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      } catch (err: any) {
        console.error("Failed to load client projects:", err);
        setError(err.message || "Could not load your projects. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };
    loadProjects();
  }, [user]);


  if (isLoading && projects.length === 0) {
    return <LoadingSpinner text="Loading your projects..." className="p-6" />;
  }

  if (!user) {
    return <p className="p-6 text-center text-red-500">You must be logged in to view your projects.</p>;
  }

  if (error) {
    return <p className="p-6 text-center text-red-500 bg-red-50 rounded-md">{error}</p>;
  }

  if (projects.length === 0 && !isLoading) {
    return (
        <div className="p-6 text-center text-gray-500">
            <BriefcaseIcon className="w-16 h-16 mx-auto mb-4 text-gray-300"/>
            <h3 className="text-xl font-semibold">No Projects Assigned</h3>
            <p className="mt-1">You have not been assigned to any projects yet.</p>
            <p className="text-sm mt-1">Projects will appear here once an administrator creates and assigns them to you.</p>
        </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-gray-800">My Assigned Projects</h2>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((project) => (
          <div key={project.id} className="relative">
            <ProjectCard project={project} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default MyProjects;
