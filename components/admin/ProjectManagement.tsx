import React, { useState, useEffect, useCallback } from 'react';
import { ProjectStatus, UserRole, Application } from '../../types'; // Removed Project, JobCardStatus
import { 
    fetchProjectsAPI,
    fetchProjectDetailsAPI,
    fetchApplicationsForProjectAPI,
    createProjectAPI,
    updateApplicationStatusAPI,
    deleteProjectAPI,
    adminFetchAllUsersAPI,
    updateProjectAPI,
    AdminUserView,
    CreateProjectPHPData,
    ProjectPHPResponse, // Import new type
    Skill, // Import Skill
    fetchAllSkillsAPI // Import fetchAllSkillsAPI
    // ProjectApplicationPHPResponse is also available if needed for projectApplications state
} from '../../apiService';
import { NAV_LINKS } from '../../constants';
import Button from '../shared/Button';
import { PencilIcon, TrashIcon, EyeIcon, PlusCircleIcon, CheckCircleIcon, UserCheckIcon } from '../shared/IconComponents'; 
import Modal from '../shared/Modal';
import { useAuth } from '../AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import LoadingSpinner from '../shared/LoadingSpinner';

// Helper to calculate project spend (basic version, assumes rates are available on user objects)
// This calculation remains inaccurate as AdminUserView does not have hourlyRate.
const calculateProjectSpend = (project: ProjectPHPResponse, users: AdminUserView[]): number => {
    if (!project.freelancer_id) return 0;
    const freelancer = users.find(u => u.id === project.freelancer_id && u.role === UserRole.FREELANCER);
    if (!freelancer) {
        console.warn(`Freelancer ${project.freelancer_id} not found in AdminUserView list. Spend calculation might be inaccurate.`);
        return 0;
    }
    // TimeLogs are not part of ProjectPHPResponse, so this part of calculation would fail or need adjustment
    // For now, returning 0 as detailed time logs aren't directly on the project object for spend calculation here.
    // const totalMinutes = project.jobCards?.reduce((sum, jc) =>
    //     sum + (jc.timeLogs?.reduce((logSum, log) => logSum + log.durationMinutes, 0) || 0), 0) || 0;
    // return (totalMinutes / 60) * (freelancer.hourlyRate || 0); // hourlyRate not on AdminUserView
    return 0;
};

const ProjectManagement: React.FC = () => {
  const { user: adminUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [projects, setProjects] = useState<ProjectPHPResponse[]>([]); // Use ProjectPHPResponse
  const [allUsers, setAllUsers] = useState<AdminUserView[]>([]);
  const [clients, setClients] = useState<AdminUserView[]>([]);
  const [freelancers, setFreelancers] = useState<AdminUserView[]>([]);

  const [allGlobalSkills, setAllGlobalSkills] = useState<Skill[]>([]); // For skill selection
  const [selectedProjectSkillIds, setSelectedProjectSkillIds] = useState<Set<number>>(new Set()); // For modal skill selection

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedProject, setSelectedProject] = useState<ProjectPHPResponse | null>(null); // Use ProjectPHPResponse
  const [projectApplications, setProjectApplications] = useState<Application[]>([]); // Or ProjectApplicationPHPResponse
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  
  // Form state for Create Project Modal
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [projectStatus, setProjectStatus] = useState<ProjectStatus>(ProjectStatus.PENDING_APPROVAL);
  const [assignedClientId, setAssignedClientId] = useState<string>(''); // For admin to select client
  const [assignedFreelancerIdModal, setAssignedFreelancerIdModal] = useState<string>(''); // For admin to select freelancer

  // State for the Edit Project Modal form
  const [editFormData, setEditFormData] = useState<Partial<ProjectPHPResponse>>({});

  const [formError, setFormError] = useState<string | null>(null);

  const [filterStatus, setFilterStatus] = useState<ProjectStatus | 'ALL'>('ALL');
  const [filterClient, setFilterClient] = useState<string>('ALL');
  const [filterFreelancer, setFilterFreelancer] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showArchived, setShowArchived] = useState<boolean>(false);
  const [sortConfig, setSortConfig] = useState<{ key: keyof ProjectPHPResponse | 'spend' | null, direction: 'ascending' | 'descending' }>({ key: 'created_at', direction: 'descending' });

  const loadInitialData = useCallback(async () => {
      setIsLoading(true);
      setFormError(null);
      try {
          const [fetchedProjects, fetchedAdminUsersView, fetchedSkills] = await Promise.all([
            fetchProjectsAPI({ status: 'all' }),
            adminFetchAllUsersAPI(),
            fetchAllSkillsAPI() // Fetch skills
          ]);

          setProjects(fetchedProjects); // Directly use ProjectPHPResponse
          setAllUsers(fetchedAdminUsersView);
          setClients(fetchedAdminUsersView.filter(u => u.role === UserRole.CLIENT));
          setFreelancers(fetchedAdminUsersView.filter(u => u.role === UserRole.FREELANCER));
          setAllGlobalSkills(fetchedSkills.sort((a,b) => a.name.localeCompare(b.name)));


          if (location.pathname.endsWith(NAV_LINKS.ADMIN_CREATE_PROJECT)) {
              handleOpenCreateModal();
          }
      } catch (error: any) {
          console.error("Failed to load initial project management data:", error);
          setFormError(error.message || "Failed to load necessary data. Please try refreshing.");
      } finally { setIsLoading(false); }
  }, [location.pathname]);

  useEffect(() => { loadInitialData(); }, [loadInitialData]);

  const handleViewDetails = async (project: ProjectPHPResponse) => { // Param is ProjectPHPResponse
    setIsSubmitting(true); // Use for loading indicator in modal trigger button or initial modal load
    setFormError(null);
    try {
        const details = await fetchProjectDetailsAPI(project.id); // This should include skills_required
        setSelectedProject(details); 
        setEditFormData(details); // Initialize edit form data with project details
        setSelectedProjectSkillIds(new Set(details.skills_required?.map(s => s.id) || []));

        if (details && (details.status === ProjectStatus.OPEN || details.status === ProjectStatus.PENDING_APPROVAL) && !details.freelancer_id) {
            const apps = await fetchApplicationsForProjectAPI(String(details.id));
            setProjectApplications(apps as Application[]);
        } else {
            setProjectApplications([]);
        }
        setIsDetailModalOpen(true);
    } catch (error: any) {
        console.error("Error fetching project details:", error);
        setFormError(error.message || "Could not load project details.");
    } finally {
        setIsSubmitting(false); // Stop loading indicator
    }
  };

  const handleCloseDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedProject(null);
    setProjectApplications([]);
    setSelectedProjectSkillIds(new Set());
    setEditFormData({}); // Clear edit form data
    setFormError(null); // Clear modal-specific errors
  };

  const handleEditFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({ ...prev, [name]: value }));
  };

  const resetCreateForm = () => {
    setTitle(''); setDescription(''); setProjectStatus(ProjectStatus.PENDING_APPROVAL);
    setAssignedClientId(''); setAssignedFreelancerIdModal(''); setFormError(null);
  };
  
  const handleOpenCreateModal = () => {
    resetCreateForm();
    setIsCreateModalOpen(true);
    if (location.pathname !== `${NAV_LINKS.DASHBOARD}/${NAV_LINKS.ADMIN_PROJECTS}/${NAV_LINKS.ADMIN_CREATE_PROJECT}`) {
        navigate(`${NAV_LINKS.DASHBOARD}/${NAV_LINKS.ADMIN_PROJECTS}/${NAV_LINKS.ADMIN_CREATE_PROJECT}`, { replace: true });
    }
  };

  const handleCloseCreateModal = () => {
    setIsCreateModalOpen(false);
    resetCreateForm();
    if (location.pathname.endsWith(NAV_LINKS.ADMIN_CREATE_PROJECT)) {
        navigate(`${NAV_LINKS.DASHBOARD}/${NAV_LINKS.ADMIN_PROJECTS}`);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminUser ) { // Admin role check is implicit as only admin sees this form section usually
        setFormError("Authentication error."); return;
    }
    if (!title || !description) {
      setFormError("Project title and description are required.");
      return;
    }

    setIsSubmitting(true); setFormError(null);
    try {
      const projectPayload: CreateProjectPHPData = {
        title,
        description,
        status: projectStatus,
      };

      if (adminUser.role === UserRole.ADMIN && assignedClientId) {
        projectPayload.client_id = parseInt(assignedClientId, 10);
      }
      if (assignedFreelancerIdModal) {
        projectPayload.freelancer_id = parseInt(assignedFreelancerIdModal, 10);
      }

      await createProjectAPI(projectPayload);
      alert("Project created successfully.");
      await loadInitialData(); 
      handleCloseCreateModal();
    } catch (err: any) {
      console.error("Failed to create project", err);
      setFormError(err.message || "Failed to create project. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleApproveProjectStatus = async (projectId: number) => {
    setIsSubmitting(true); setFormError(null);
    try {
        await updateProjectAPI(String(projectId), { status: ProjectStatus.OPEN });
        alert("Project approved and is now open for applications.");
        await loadInitialData();
        if (selectedProject?.id === projectId) { 
            const details = await fetchProjectDetailsAPI(projectId);
            setSelectedProject(details || null);
        }
    } catch (err: any) {
        alert(err.message || "Failed to approve project.");
        setFormError(err.message || "Failed to approve project.");
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleAcceptApplication = async (applicationId: string, projectIdToRefresh: number) => {
    if (!adminUser) return;
    setIsSubmitting(true); setFormError(null);
    try {
        await updateApplicationStatusAPI(applicationId, { status: 'accepted' });
        alert("Application accepted. Freelancer assigned and project is In Progress.");
        await loadInitialData();
        if (selectedProject?.id === projectIdToRefresh) {
            const details = await fetchProjectDetailsAPI(projectIdToRefresh);
            setSelectedProject(details || null);
             if (details) {
                // If the modal is being enhanced for editing, re-populate skills
                setSelectedProjectSkillIds(new Set(details.skills_required?.map(s => s.id) || []));
                const apps = await fetchApplicationsForProjectAPI(String(details.id));
                setProjectApplications(apps as Application[]);
            }
        } else {
            handleCloseDetailModal();
        }
    } catch (err: any) {
        alert(err.message || "Failed to accept application.");
        setFormError(err.message || "Failed to accept application.");
    } finally {
        setIsSubmitting(false);
    }
  };

  // This function will be for saving changes from the enhanced "Edit Details" modal
  const handleUpdateProjectDetails = async () => { // No direct formData param, reads from editFormData and selectedProjectSkillIds
    if (!selectedProject || !editFormData) return;

    setIsSubmitting(true); setFormError(null);
    try {
      const payload: UpdateProjectPHPData = {
        title: editFormData.title,
        description: editFormData.description,
        status: editFormData.status as ProjectStatus, // Ensure status is of ProjectStatus type
        client_id: editFormData.client_id ? Number(editFormData.client_id) : undefined,
        freelancer_id: editFormData.freelancer_id ? Number(editFormData.freelancer_id) : undefined,
        skill_ids: Array.from(selectedProjectSkillIds) // Use the state for selected skills
      };
      await updateProjectAPI(String(selectedProject.id), payload);
      // alert("Project details updated successfully."); // Consider a more subtle notification
      await loadInitialData(); // Refresh list
      handleCloseDetailModal();
    } catch (err: any) {
      console.error("Failed to update project details", err);
      // Set error to be displayed within the modal
      setFormError(err.message || "Failed to update project details. Please check inputs or try again.");
    } finally {
      setIsSubmitting(false);
    }
  };


  const handleNavigateToEditProjectTasks = (project: ProjectPHPResponse) => { // Param is ProjectPHPResponse
    navigate(NAV_LINKS.PROJECT_DETAILS.replace(':id', String(project.id)));
    handleCloseDetailModal();
  };

  const handleDeleteProject = async (projectId: number) => { // Param is number
    if(window.confirm("Are you sure you want to delete this project? This cannot be undone.")) {
        setIsSubmitting(true);
        setFormError(null);
        try {
            await deleteProjectAPI(String(projectId));
            await loadInitialData();
        } catch (err: any) {
            alert(err.message || "Failed to delete project.");
            setFormError(err.message || "Failed to delete project.");
        } finally {
            setIsSubmitting(false);
        }
    }
  };

  const handleToggleArchive = async (project: ProjectPHPResponse) => { // Param is ProjectPHPResponse
    setIsSubmitting(true); setFormError(null);
    try {
        const currentIsArchived = project.status === 'archived'; // Determine if currently archived
        const newStatus = currentIsArchived ? ProjectStatus.OPEN : 'archived' as ProjectStatus;
        await updateProjectAPI(String(project.id), { status: newStatus });
        await loadInitialData(); 
    } catch (err: any) {
        alert(err.message || "Failed to update archive status.");
        setFormError(err.message || "Failed to update archive status.");
    } finally {
        setIsSubmitting(false);
    }
  };
  
  const getStatusClass = (status?: ProjectStatus | string) => {
    switch (status) {
      case ProjectStatus.PENDING_APPROVAL: return 'bg-orange-100 text-orange-700';
      case ProjectStatus.OPEN: return 'bg-green-100 text-green-700';
      case ProjectStatus.IN_PROGRESS: return 'bg-yellow-100 text-yellow-700';
      case ProjectStatus.COMPLETED: return 'bg-blue-100 text-blue-700';
      case ProjectStatus.CANCELLED: return 'bg-red-100 text-red-700';
      case 'archived': return 'bg-gray-200 text-gray-800'; // Specific style for archived
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const requestSort = (key: keyof ProjectPHPResponse | 'spend') => { // Adjusted key type
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };
  
  const sortedAndFilteredProjects = React.useMemo(() => {
    let sortableProjects = [...projects];

    sortableProjects = sortableProjects.filter(project => {
      const matchesStatus = filterStatus === 'ALL' || project.status === filterStatus;
      // Ensure client_id and freelancer_id are numbers for comparison if filters are numbers
      const matchesClient = filterClient === 'ALL' || project.client_id === parseInt(filterClient);
      const matchesFreelancer = filterFreelancer === 'ALL' || project.freelancer_id === parseInt(filterFreelancer);
      const matchesSearch = searchTerm === '' || 
                            project.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            (project.description && project.description.toLowerCase().includes(searchTerm.toLowerCase()));
      const isArchived = project.status === 'archived';
      const matchesArchived = showArchived ? true : !isArchived;
      return matchesStatus && matchesClient && matchesFreelancer && matchesSearch && matchesArchived;
    });

    if (sortConfig.key) {
      sortableProjects.sort((a, b) => {
        let aValue, bValue;
        if (sortConfig.key === 'spend') {
            aValue = calculateProjectSpend(a, allUsers); // Pass ProjectPHPResponse
            bValue = calculateProjectSpend(b, allUsers); // Pass ProjectPHPResponse
        } else {
            aValue = a[sortConfig.key as keyof ProjectPHPResponse];
            bValue = b[sortConfig.key as keyof ProjectPHPResponse];
        }

        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return sortConfig.direction === 'ascending' ? aValue - bValue : bValue - aValue;
        }
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return sortConfig.direction === 'ascending' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
        }
        // Assuming created_at and deadline are strings
        if (sortConfig.key === 'deadline' || sortConfig.key === 'created_at') {
            const dateA = new Date(aValue as string).getTime();
            const dateB = new Date(bValue as string).getTime();
            return sortConfig.direction === 'ascending' ? dateA - dateB : dateB - dateA;
        }
        return 0;
      });
    }
    return sortableProjects;
  }, [projects, filterStatus, filterClient, filterFreelancer, searchTerm, showArchived, sortConfig, allUsers]);

  const getSortIndicator = (key: keyof ProjectPHPResponse | 'spend') => { // Adjusted key type
    if (sortConfig.key === key) {
      return sortConfig.direction === 'ascending' ? '▲' : '▼';
    }
    return '';
  };


  if (isLoading && projects.length === 0) {
    return <LoadingSpinner text="Loading projects..." className="p-6" />;
  }

  return (
    <div className="p-4 md:p-6 bg-white shadow-xl rounded-lg">
      <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200">
        <h2 className="text-2xl font-semibold text-primary">Project Management</h2>
         <Button onClick={handleOpenCreateModal} leftIcon={<PlusCircleIcon className="w-5 h-5"/>} variant="primary">
          Create Project
        </Button>
      </div>
      {formError && !isModalOpen && <p className="mb-4 text-sm text-red-600 bg-red-100 p-3 rounded-lg">{formError}</p>}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
        <div>
          <label className="block text-xs font-medium text-gray-700">Search</label>
          <input type="text" placeholder="Title, description..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="mt-1 p-2 w-full border-gray-300 rounded-md shadow-sm text-sm"/>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700">Status</label>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as ProjectStatus | 'ALL')} className="mt-1 p-2 w-full border-gray-300 rounded-md shadow-sm text-sm">
            <option value="ALL">All Statuses</option>
            {Object.values(ProjectStatus).map(s => <option key={s} value={s}>{s}</option>)}
             <option value="archived">Archived</option> {/* Add archived to filter */}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700">Client</label>
          <select value={filterClient} onChange={e => setFilterClient(e.target.value)} className="mt-1 p-2 w-full border-gray-300 rounded-md shadow-sm text-sm">
            <option value="ALL">All Clients</option>
            {clients.map(c => <option key={c.id} value={String(c.id)}>{c.username}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700">Freelancer</label>
          <select value={filterFreelancer} onChange={e => setFilterFreelancer(e.target.value)} className="mt-1 p-2 w-full border-gray-300 rounded-md shadow-sm text-sm">
            <option value="ALL">All Freelancers</option>
            {freelancers.map(f => <option key={f.id} value={String(f.id)}>{f.username}</option>)}
          </select>
        </div>
        <div className="md:col-span-2 lg:col-span-4 flex items-center">
            <input type="checkbox" id="showArchived" checked={showArchived} onChange={e => setShowArchived(e.target.checked)} className="h-4 w-4 text-primary border-gray-300 rounded focus:ring-primary"/>
            <label htmlFor="showArchived" className="ml-2 text-sm text-gray-700">Show Archived Projects</label>
        </div>
      </div>

      {!isLoading && projects.length === 0 && !formError && (
         <div className="text-center py-10">
            <p className="text-gray-500 text-lg">No projects found in the system.</p>
            <p className="text-gray-400 text-sm mt-2">You can start by creating a new project.</p>
        </div>
      )}

      {projects.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th onClick={() => requestSort('title')} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer">Title {getSortIndicator('title')}</th>
                <th onClick={() => requestSort('client_username')} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer">Client {getSortIndicator('client_username')}</th>
                <th onClick={() => requestSort('freelancer_username')} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer">Freelancer {getSortIndicator('freelancer_username')}</th>
                <th onClick={() => requestSort('status')} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer">Status {getSortIndicator('status')}</th>
                {/* Budget and Spend columns are removed for simplicity as budget is not in ProjectPHPResponse and spend calc is inaccurate */}
                <th onClick={() => requestSort('created_at')} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer">Created {getSortIndicator('created_at')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedAndFilteredProjects.map((project) => {
                const isArchived = project.status === 'archived';
                // const projectSpend = calculateProjectSpend(project, allUsers); // Spend calculation is inaccurate
                // const isOverdue = project.deadline && new Date(project.deadline) < new Date() && project.status !== ProjectStatus.COMPLETED && project.status !== ProjectStatus.CANCELLED;
                return (
                <tr key={project.id} className={`hover:bg-primary-extralight transition-colors duration-150 ${isArchived ? 'opacity-60 bg-gray-100' : ''}`}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{project.title}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{project.client_username || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{project.freelancer_username || 'Not Assigned'}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusClass(project.status)}`}>
                      {project.status}
                    </span>
                  </td>
                  {/* Budget and Spend Columns Removed */}
                  <td className={`px-6 py-4 whitespace-nowrap text-sm text-gray-500`}>{project.created_at ? new Date(project.created_at).toLocaleDateString() : 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-1">
                    <Button variant="ghost" size="sm" onClick={() => handleViewDetails(project)} aria-label="View Details" className="text-primary hover:text-primary-hover p-1" disabled={isSubmitting}><EyeIcon className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => handleNavigateToEditProjectTasks(project)} aria-label="Manage Project Tasks" className="text-primary hover:text-primary-hover p-1" disabled={isSubmitting}><PencilIcon className="w-4 h-4" /></Button>
                    {project.status === ProjectStatus.PENDING_APPROVAL && (
                       <Button variant="ghost" size="sm" onClick={() => handleApproveProjectStatus(project.id)} aria-label="Approve Project" className="text-green-600 hover:text-green-700 p-1" disabled={isSubmitting}><CheckCircleIcon className="w-4 h-4" /></Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => handleToggleArchive(project)} aria-label={isArchived ? "Unarchive" : "Archive"} className="text-gray-500 hover:text-gray-700 p-1" disabled={isSubmitting}>
                       {isArchived ? '📤' : '📥'}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDeleteProject(project.id)} aria-label="Delete" className="text-red-500 hover:text-red-700 p-1" disabled={isSubmitting}><TrashIcon className="w-4 h-4" /></Button>
                  </td>
                </tr>
              )})}
              {sortedAndFilteredProjects.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-4 text-gray-500">No projects match the current filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {selectedProject && isDetailModalOpen && ( // Ensure modal only renders if selectedProject and isDetailModalOpen are true
        <Modal isOpen={isDetailModalOpen} onClose={handleCloseDetailModal} title={`Edit Project: ${editFormData?.title || selectedProject.title}`} size="2xl">
          <form onSubmit={(e) => { e.preventDefault(); handleUpdateProjectDetails(); }} className="space-y-4 max-h-[75vh] overflow-y-auto p-1">
            {formError && <div className="mb-3 p-2 bg-red-100 text-red-600 rounded-md text-sm">{formError}</div>}

            <div>
              <label htmlFor="edit_proj_title" className="block text-sm font-medium text-gray-700">Title*</label>
              <input type="text" name="title" id="edit_proj_title" value={editFormData?.title || ''} onChange={handleEditFormChange} required
                     className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-primary focus:border-primary"/>
            </div>
            <div>
              <label htmlFor="edit_proj_desc" className="block text-sm font-medium text-gray-700">Description*</label>
              <textarea name="description" id="edit_proj_desc" rows={3} value={editFormData?.description || ''} onChange={handleEditFormChange} required
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-primary focus:border-primary"/>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="edit_proj_status" className="block text-sm font-medium text-gray-700">Status</label>
                <select name="status" id="edit_proj_status" value={editFormData?.status || ''} onChange={handleEditFormChange}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm bg-white focus:outline-none focus:ring-primary focus:border-primary">
                  {Object.values(ProjectStatus).map(s => <option key={s} value={s}>{s}</option>)}
                  <option value="archived">Archived</option>
                </select>
              </div>
              <div>
                <label htmlFor="edit_proj_client" className="block text-sm font-medium text-gray-700">Client</label>
                <select name="client_id" id="edit_proj_client" value={editFormData?.client_id || ''} onChange={handleEditFormChange}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm bg-white focus:outline-none focus:ring-primary focus:border-primary">
                  <option value="">None (Admin is Client)</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.username} (ID: {c.id})</option>)}
                </select>
              </div>
            </div>
            <div>
              <label htmlFor="edit_proj_freelancer" className="block text-sm font-medium text-gray-700">Assigned Freelancer</label>
              <select name="freelancer_id" id="edit_proj_freelancer" value={editFormData?.freelancer_id || ''} onChange={handleEditFormChange}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm bg-white focus:outline-none focus:ring-primary focus:border-primary">
                <option value="">Not Assigned</option>
                {freelancers.map(f => <option key={f.id} value={f.id}>{f.username} (ID: {f.id})</option>)}
              </select>
            </div>

            {/* Skills Selection UI */}
            <div className="pt-3">
              <label className="block text-sm font-medium text-gray-700">Required Skills</label>
              <div className="mt-1 max-h-40 overflow-y-auto border rounded p-2 space-y-1 bg-gray-50">
                {allGlobalSkills.map(skill => (
                  <div key={skill.id} className="flex items-center">
                    <input
                      type="checkbox"
                      id={`edit-proj-skill-${skill.id}`}
                      checked={selectedProjectSkillIds.has(skill.id)}
                      onChange={(e) => {
                        const newSet = new Set(selectedProjectSkillIds);
                        if (e.target.checked) newSet.add(skill.id);
                        else newSet.delete(skill.id);
                        setSelectedProjectSkillIds(newSet);
                      }}
                      className="h-4 w-4 text-primary border-gray-300 rounded mr-2 focus:ring-primary-focus"
                    />
                    <label htmlFor={`edit-proj-skill-${skill.id}`} className="text-sm text-gray-700">{skill.name}</label>
                  </div>
                ))}
                {allGlobalSkills.length === 0 && <p className="text-xs text-gray-400">No global skills available.</p>}
              </div>
            </div>

            {/* Display Applications if relevant (read-only part of the form) */}
            { (editFormData?.status === ProjectStatus.OPEN || editFormData?.status === ProjectStatus.PENDING_APPROVAL) &&
              projectApplications.length > 0 && !editFormData?.freelancer_id && (
                <div className="pt-4 border-t mt-4">
                    <h4 className="text-md font-semibold text-gray-700 mb-2">
                        Pending Applications ({projectApplications.filter(app => app.status === 'pending').length})
                    </h4>
                    {projectApplications.filter(app => app.status === 'pending').length > 0 ? (
                        <div className="space-y-3 max-h-60 overflow-y-auto">
                            {projectApplications.filter(app => app.status === 'pending').map(app => (
                                <div key={app.id}
                                     className="p-3 bg-gray-50 rounded-md border hover:shadow-sm">
                                    <p className="font-semibold text-gray-800">{ (app as any).freelancer_username /* Assuming type cast for now */} <span className="text-xs text-gray-500">({app.freelancer_id})</span></p>
                                    <p className="text-sm text-gray-600">Bid: R {app.bid_amount ? app.bid_amount.toLocaleString() : 'N/A'}</p>
                                    <p className="text-sm text-gray-600 mt-1 italic whitespace-pre-wrap">"{app.proposal_text}"</p>
                                    <Button 
                                        onClick={() => handleAcceptApplication(String(app.id), selectedProject.id)}
                                        variant="primary" size="sm" className="mt-2" 
                                        leftIcon={<UserCheckIcon className="w-4 h-4"/>}
                                        isLoading={isSubmitting}>
                                        Accept Application
                                    </Button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-gray-500">No applications currently pending for this project.</p>
                    )}
                </div>
            )}
            {selectedProject.status === ProjectStatus.OPEN && projectApplications.filter(app => app.status === 'pending').length === 0 && !selectedProject.freelancer_id && (
                 <p className="text-sm text-gray-500 pt-4 border-t mt-4">This project is open but has no pending applications yet.</p>
            )}
            {editFormData?.status === ProjectStatus.OPEN && projectApplications.filter(app => app.status === 'pending').length === 0 && !editFormData?.freelancer_id && (
                 <p className="text-sm text-gray-500 pt-4 border-t mt-4">This project is open but has no pending applications yet.</p>
            )}


            <div className="mt-6 flex justify-end space-x-3 pt-4 border-t">
                <Button type="button" variant="secondary" onClick={handleCloseDetailModal} disabled={isSubmitting}>Cancel</Button>
                <Button type="submit" variant="primary" isLoading={isSubmitting} disabled={isSubmitting}>Save Changes</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Create Project Modal - Skills are deferred for creation */}
      {isCreateModalOpen && (
        <Modal isOpen={isCreateModalOpen} onClose={handleCloseCreateModal} title="Create New Project (Admin)" size="xl">
           <form onSubmit={handleCreateProject} className="space-y-4 p-1">
            <div>
              <label htmlFor="proj_title_create" className="block text-sm font-medium text-gray-700">Project Title*</label>
              <input type="text" id="proj_title_create" value={title} onChange={(e) => setTitle(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-primary focus:border-primary" required />
            </div>
            <div>
              <label htmlFor="proj_desc_create" className="block text-sm font-medium text-gray-700">Project Description*</label>
              <textarea id="proj_desc_create" rows={3} value={description} onChange={(e) => setDescription(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-primary focus:border-primary" required />
            </div>
            <div>
                <label htmlFor="proj_status_create" className="block text-sm font-medium text-gray-700">Initial Status</label>
                <select id="proj_status_create" value={projectStatus} onChange={e => setProjectStatus(e.target.value as ProjectStatus)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-primary focus:border-primary bg-white">
                    <option value={ProjectStatus.PENDING_APPROVAL}>Pending Approval</option>
                    <option value={ProjectStatus.OPEN}>Open</option>
                </select>
            </div>
            {adminUser?.role === UserRole.ADMIN && (
              <div>
                <label htmlFor="assignClient" className="block text-sm font-medium text-gray-700">Assign to Client (Optional)</label>
                <select id="assignClient" value={assignedClientId} onChange={(e) => setAssignedClientId(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-lg shadow-sm focus:outline-none focus:ring-primary focus:border-primary">
                  <option value="">Admin becomes client (Self-assigned)</option>
                  {clients.map(client => <option key={client.id} value={client.id}>{client.username} (ID: {client.id})</option>)}
                </select>
              </div>
            )}
             <div>
                <label htmlFor="assignFreelancerModal" className="block text-sm font-medium text-gray-700">Assign Freelancer (Optional)</label>
                <select id="assignFreelancerModal" value={assignedFreelancerIdModal} onChange={(e) => setAssignedFreelancerIdModal(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-lg shadow-sm focus:outline-none focus:ring-primary focus:border-primary">
                  <option value="">No Freelancer Assigned</option>
                  {freelancers.map(freelancer => <option key={freelancer.id} value={freelancer.id}>{freelancer.username} (ID: {freelancer.id})</option>)}
                </select>
              </div>

            {formError && <p className="text-sm text-red-600 bg-red-100 p-3 rounded-lg">{formError}</p>}
            <div className="pt-4 flex justify-end space-x-3 border-t mt-4">
                <Button type="button" variant="secondary" onClick={handleCloseCreateModal} disabled={isSubmitting}>Cancel</Button>
                <Button type="submit" variant="primary" isLoading={isSubmitting} disabled={isSubmitting}>Create Project</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default ProjectManagement;
