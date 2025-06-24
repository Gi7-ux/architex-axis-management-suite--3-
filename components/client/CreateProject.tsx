import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext'; // Corrected path
import { createProjectAPI, CreateProjectPHPData, ApiError } from '../../apiService';
import Button from '../shared/Button';
import { NAV_LINKS } from '../../constants';
import { ProjectStatus, UserRole } from '../../types'; // Import ProjectStatus

const CreateClientProject: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  // freelancer_id and status are optional for creation from client perspective
  // const [freelancerId, setFreelancerId] = useState<string>(''); // Example if you want to allow suggesting one
  const [status, setStatus] = useState<ProjectStatus>(ProjectStatus.OPEN); // Default to OPEN
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!user || (user.role !== UserRole.CLIENT && user.role !== UserRole.ADMIN)) {
    return <p className="p-4 text-red-500">You are not authorized to create projects.</p>;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    if (!title || !description) {
      setError("Title and description are required.");
      return;
    }
    setIsLoading(true);
    const projectData: CreateProjectPHPData = {
      title,
      description,
      status,
      // If allowing suggestion of freelancer_id:
      // freelancer_id: freelancerId ? parseInt(freelancerId, 10) : undefined,
    };

    try {
      const response = await createProjectAPI(projectData); // createProjectAPI is authenticated
      setSuccessMessage(`Project "${title}" created successfully (ID: ${response.project_id}).`);
      setTitle('');
      setDescription('');
      setStatus(ProjectStatus.OPEN);
      // Optional: redirect after a delay
      setTimeout(() => navigate(NAV_LINKS.MY_PROJECTS), 2000);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || 'Failed to create project.');
      } else {
        setError('An unexpected error occurred.');
      }
      console.error("Create project error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-8">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Create New Project</h2>
      {successMessage && <p className="mb-4 text-sm text-green-600 bg-green-100 p-3 rounded-lg">{successMessage}</p>}
      {error && <p className="mb-4 text-sm text-red-600 bg-red-100 p-3 rounded-lg">{error}</p>}
      <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700">Project Title</label>
          <input type="text" id="title" value={title} onChange={(e) => setTitle(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary" />
        </div>
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">Project Description</label>
          <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={4} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary" />
        </div>
        <div>
          <label htmlFor="status" className="block text-sm font-medium text-gray-700">Initial Status</label>
          <select id="status" value={status} onChange={(e) => setStatus(e.target.value as ProjectStatus)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary bg-white">
            <option value={ProjectStatus.OPEN}>Open (Accepting Applications)</option>
            <option value={ProjectStatus.PENDING_APPROVAL}>Pending Approval</option>
            {/* Clients might not set other statuses directly on creation */}
          </select>
        </div>
        {/* Example for optional freelancer_id input if needed in future
        <div>
          <label htmlFor="freelancerId" className="block text-sm font-medium text-gray-700">Assign Freelancer ID (Optional)</label>
          <input type="number" id="freelancerId" value={freelancerId} onChange={(e) => setFreelancerId(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"/>
        </div>
        */}
        <div>
          <Button type="submit" isLoading={isLoading} variant="primary" className="w-full">Create Project</Button>
        </div>
      </form>
    </div>
  );
};
export default CreateClientProject;
