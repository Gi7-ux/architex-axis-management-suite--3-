import React, { useState, useEffect, useCallback } from 'react';
import { Project, UserRole, ProjectStatus, Application } from '../../types'; // Keep Application
import {
  fetchClientProjectsAPI,
  deleteProjectAPI,
  updateProjectAPI,
  UpdateProjectPHPData,
  fetchApplicationsForProjectAPI, // New import
  updateApplicationStatusAPI,     // New import
  ProjectApplicationPHPResponse   // New import
} from '../../apiService';
import { NAV_LINKS } from '../../constants';
import ProjectCard from '../shared/ProjectCard';
import { useAuth } from '../../contexts/AuthContext'; // Corrected path
import LoadingSpinner from '../shared/LoadingSpinner';
import Button from '../shared/Button'; // Import Button
import Modal from '../shared/Modal';   // Import Modal for editing and applications
import { BriefcaseIcon, PencilIcon, TrashIcon, EyeIcon, CheckCircleIcon, XCircleIcon } from '../shared/IconComponents'; // More icons

const MyProjects: React.FC = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State for project editing modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editFormData, setEditFormData] = useState<UpdateProjectPHPData>({});

  // State for applications modal
  const [isAppsModalOpen, setIsAppsModalOpen] = useState(false);
  const [applications, setApplications] = useState<ProjectApplicationPHPResponse[]>([]);
  const [selectedProjectForApps, setSelectedProjectForApps] = useState<Project | null>(null);
  const [isLoadingApps, setIsLoadingApps] = useState(false);

  const loadProjects = useCallback(async () => {
    if (!user || user.role !== UserRole.CLIENT) {
      setIsLoading(false);
      setError("User not authenticated as Client.");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const clientProjects = await fetchClientProjectsAPI(); // Use new API
      // Assuming clientProjects are correctly typed as Project[] or need mapping
      // The PHP backend returns raw project data; mapping might be needed if not handled in apiService
      const mappedProjects: Project[] = clientProjects.map(p => ({
        ...p,
        id: String(p.id), // Ensure ID is string if ProjectCard expects it
        clientId: String(p.clientId),
        freelancerId: p.freelancerId ? String(p.freelancerId) : undefined,
        // Add other default/mapped fields if your Project type is more complex than backend response
        clientName: p.clientName || user.username, // Example default
        budget: p.budget || 0,
        skillsRequired: p.skillsRequired || [],
        currency: p.currency || 'USD',
        paymentType: p.paymentType || 'fixed',
        experienceLevel: p.experienceLevel || 'intermediate',
        duration: p.duration || 'unknown',
        isFeatured: p.isFeatured || false,
        jobCards: p.jobCards || [],
        adminCreatorId: p.adminCreatorId,
        isArchived: p.isArchived || false,
        assignedFreelancerName: p.assignedFreelancerName
      }));
      setProjects(mappedProjects.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } catch (err: any) {
      console.error("Failed to load client projects:", err);
      setError(err.message || "Could not load your projects. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const handleDelete = async (projectId: string) => {
    if (!window.confirm("Are you sure you want to delete this project? This action cannot be undone.")) return;
    try {
      await deleteProjectAPI(projectId);
      setProjects(prev => prev.filter(p => p.id !== projectId));
    } catch (err: any) {
      setError(err.message || "Failed to delete project.");
    }
  };

  const openEditModal = (project: Project) => {
    setEditingProject(project);
    setEditFormData({
      title: project.title,
      description: project.description,
      status: project.status,
      // freelancer_id can be set if needed, but ensure it's handled as number or null
      freelancer_id: project.freelancerId ? parseInt(project.freelancerId, 10) : undefined
    });
    setIsEditModalOpen(true);
  };

  const handleEditFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleEditFreelancerIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEditFormData(prev => ({ ...prev, freelancer_id: value ? parseInt(value, 10) : undefined }));
  };


  const handleUpdateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject) return;
    try {
      await updateProjectAPI(editingProject.id, editFormData);
      setIsEditModalOpen(false);
      setEditingProject(null);
      loadProjects(); // Refresh projects list
    } catch (err: any) {
      setError(err.message || "Failed to update project.");
    }
  };

  const openApplicationsModal = async (project: Project) => {
    setSelectedProjectForApps(project);
    setIsAppsModalOpen(true);
    setIsLoadingApps(true);
    try {
      const apps = await fetchApplicationsForProjectAPI(project.id);
      setApplications(apps);
    } catch (err: any) {
      setError("Failed to load applications for project: " + project.title + ". " + (err.message || ''));
    } finally {
      setIsLoadingApps(false);
    }
  };

  const handleUpdateApplicationStatus = async (applicationId: string, status: 'accepted' | 'rejected' | 'archived_by_client') => {
    if (!selectedProjectForApps) return;
    // Optional: Confirmation dialog
    if (!window.confirm(`Are you sure you want to set application status to '${status}'?`)) return;

    try {
      await updateApplicationStatusAPI(applicationId, { status });
      // Refresh applications for the current project
      const apps = await fetchApplicationsForProjectAPI(selectedProjectForApps.id);
      setApplications(apps);
      // If a project was accepted, the project list itself might need refresh due to project status/freelancer change
      if (status === 'accepted') {
        loadProjects();
      }
    } catch (err: any) {
      setError(err.message || `Failed to update application status to ${status}.`);
    }
  };

  // Render logic (isLoading, error, no projects) remains similar initially
  if (isLoading && projects.length === 0) return <LoadingSpinner text="Loading your projects..." className="p-6" />;
  if (!user) return <p className="p-6 text-center text-red-500">You must be logged in to view your projects.</p>;
  if (error && !isEditModalOpen && !isAppsModalOpen) return <p className="p-6 text-center text-red-500 bg-red-50 rounded-md">{error}</p>;


  return (
    <div className="p-4 md:p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-gray-800">My Projects</h2>
        {/* Optional: Link to create project page if that's desired from here */}
      </div>
      {error && (isEditModalOpen || isAppsModalOpen) && <p className="mb-4 text-sm text-red-600 bg-red-100 p-3 rounded-lg">{error}</p>}

      {projects.length === 0 && !isLoading && (
        <div className="p-6 text-center text-gray-500">
          <BriefcaseIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-xl font-semibold">No Projects Yet</h3>
          <p className="mt-1">You haven't created any projects.</p>
          <p className="text-sm mt-1">Get started by <a href={NAV_LINKS.CREATE_PROJECT} className="text-primary hover:underline">creating your first project</a>.</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((project) => (
          <div key={project.id} className="bg-white rounded-lg shadow-lg overflow-hidden flex flex-col">
            <ProjectCard project={project} />
            <div className="p-4 border-t border-gray-200 mt-auto bg-gray-50">
              <div className="flex justify-around items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => openEditModal(project)} title="Edit Project">
                  <PencilIcon className="w-4 h-4 mr-1" /> Edit
                </Button>
                <Button size="sm" variant="outline" className="border-red-600 text-red-600 hover:bg-red-50" onClick={() => handleDelete(project.id)} title="Delete Project">
                  <TrashIcon className="w-4 h-4 mr-1" /> Delete
                </Button>
                <Button size="sm" variant="outline" className="border-blue-600 text-blue-600 hover:bg-blue-50" onClick={() => openApplicationsModal(project)} title="View Applications">
                  <EyeIcon className="w-4 h-4 mr-1" /> Apps ({project.applicationCount || 0}) {/* Assuming applicationCount might be added to Project type */}
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Project Modal */}
      {isEditModalOpen && editingProject && (
        <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title={`Edit Project: ${editingProject.title}`}>
          <form onSubmit={handleUpdateProject} className="space-y-4">
            <div>
              <label htmlFor="editTitle" className="block text-sm font-medium">Title</label>
              <input type="text" id="editTitle" name="title" value={editFormData.title || ''} onChange={handleEditFormChange} className="mt-1 w-full border p-2 rounded" />
            </div>
            <div>
              <label htmlFor="editDescription" className="block text-sm font-medium">Description</label>
              <textarea id="editDescription" name="description" value={editFormData.description || ''} onChange={handleEditFormChange} rows={3} className="mt-1 w-full border p-2 rounded" />
            </div>
            <div>
              <label htmlFor="editStatus" className="block text-sm font-medium">Status</label>
              <select name="status" id="editStatus" value={editFormData.status || ''} onChange={handleEditFormChange} className="mt-1 w-full border p-2 rounded bg-white">
                {Object.values(ProjectStatus).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="editFreelancerId" className="block text-sm font-medium text-gray-700">Assigned Freelancer ID (Optional)</label>
              <input type="number" id="editFreelancerId" name="freelancer_id" value={editFormData.freelancer_id === undefined ? '' : editFormData.freelancer_id} onChange={handleEditFreelancerIdChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
            </div>
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="secondary" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
              <Button type="submit" variant="primary">Save Changes</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* View Applications Modal */}
      {isAppsModalOpen && selectedProjectForApps && (
        <Modal isOpen={isAppsModalOpen} onClose={() => setIsAppsModalOpen(false)} title={`Applications for: ${selectedProjectForApps.title}`} size="lg">
          {isLoadingApps && <LoadingSpinner text="Loading applications..." />}
          {!isLoadingApps && applications.length === 0 && <p className="text-gray-500 text-center py-4">No applications found for this project.</p>}
          {!isLoadingApps && applications.length > 0 && (
            <ul className="space-y-3 max-h-96 overflow-y-auto">
              {applications.map(app => (
                <li key={app.id} className="p-3 border rounded-md bg-gray-50 hover:shadow-md">
                  <p className="font-semibold text-primary">{app.freelancer_username} ({app.freelancer_email})</p>
                  <p className="text-sm text-gray-600 my-1">Bid: R {app.bidAmount?.toLocaleString() || 'N/A'}</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap bg-white p-2 rounded border border-gray-200">Proposal: {app.proposal_text}</p>
                  <p className="text-xs text-gray-500 mt-1">Applied: {new Date(app.applied_at).toLocaleDateString()}</p>
                  <p className="text-sm font-medium">Status: <span className={`px-2 py-0.5 rounded-full text-xs ${app.status === 'accepted' ? 'bg-green-100 text-green-700' : app.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{app.status}</span></p>
                  {app.status === 'pending' && (
                    <div className="mt-2 space-x-2">
                      <Button size="sm" variant="primary" className="bg-green-600 hover:bg-green-700 focus:ring-green-500" onClick={() => handleUpdateApplicationStatus(String(app.id), 'accepted')} title="Accept Application">
                        <CheckCircleIcon className="w-4 h-4 mr-1" /> Accept
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => handleUpdateApplicationStatus(String(app.id), 'rejected')} title="Reject Application">
                        <XCircleIcon className="w-4 h-4 mr-1" /> Reject
                      </Button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Modal>
      )}
    </div>
  );
};
export default MyProjects;
