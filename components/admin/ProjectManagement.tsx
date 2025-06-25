import React, { useState, useEffect, useMemo } from 'react'; // Added useMemo
import { Project, ProjectStatus, User, UserRole, Application, JobCardStatus, Invoice, InvoiceStatus } from '../../types'; // Added Invoice, InvoiceStatus
import { 
    fetchProjectsAPI, fetchProjectDetailsAPI, fetchApplicationsForProjectAPI, 
    updateProjectStatusAPI, toggleProjectArchiveStatusAPI, createProjectAPI, 
    acceptApplicationAPI, deleteProjectAPI, fetchUsersAPI, listInvoices as listInvoicesAPI // Added listInvoicesAPI
} from '../../apiService';
import { NAV_LINKS } from '../../constants';
import Button from '../shared/Button';
import { PencilIcon, TrashIcon, EyeIcon, PlusCircleIcon, CheckCircleIcon, UserCheckIcon } from '../shared/IconComponents'; 
import Modal from '../shared/Modal';
import { useAuth } from '../AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import LoadingSpinner from '../shared/LoadingSpinner';

// Helper to calculate project spend (basic version, assumes rates are available on user objects)
const calculateProjectSpend = (project: Project, users: User[]): number => {
    if (!project.assignedFreelancerId) return 0;
    const freelancer = users.find(u => u.id === project.assignedFreelancerId && u.role === UserRole.FREELANCER);
    if (!freelancer || !freelancer.hourlyRate) {
        // console.warn(`Hourly rate for freelancer ${project.assignedFreelancerId} not found. Spend calculation might be inaccurate.`);
        return 0; // Or fetch rate if not available, or handle as error
    }

    const totalMinutes = project.jobCards?.reduce((sum, jc) => 
        sum + (jc.timeLogs?.reduce((logSum, log) => logSum + log.durationMinutes, 0) || 0), 0) || 0;
    
    return (totalMinutes / 60) * freelancer.hourlyRate;
};

const ProjectManagement: React.FC = () => {
  const { user: adminUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [projects, setProjects] = useState<Project[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]); 
  const [clients, setClients] = useState<User[]>([]);
  const [freelancers, setFreelancers] = useState<User[]>([]);
  const [allInvoices, setAllInvoices] = useState<Invoice[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projectApplications, setProjectApplications] = useState<Application[]>([]);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [budget, setBudget] = useState<number | string>('');
  const [deadline, setDeadline] = useState('');
  const [skillsRequired, setSkillsRequired] = useState<string[]>([]);
  const [currentSkill, setCurrentSkill] = useState('');
  const [assignedClientId, setAssignedClientId] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);

  const [filterStatus, setFilterStatus] = useState<ProjectStatus | 'ALL'>('ALL');
  const [filterClient, setFilterClient] = useState<string>('ALL');
  const [filterFreelancer, setFilterFreelancer] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showArchived, setShowArchived] = useState<boolean>(false);
  const [sortConfig, setSortConfig] = useState<{ key: keyof Project | 'spend' | null, direction: 'ascending' | 'descending' }>({ key: 'createdAt', direction: 'descending' });

  const loadInitialData = async () => {
      setIsLoading(true);
      setFormError(null);
      try {
          const [fetchedProjects, fetchedUsers, fetchedClients, fetchedFreelancers, fetchedInvoices] = await Promise.all([
              fetchProjectsAPI(),
              fetchUsersAPI(),
              fetchUsersAPI(UserRole.CLIENT),
              fetchUsersAPI(UserRole.FREELANCER),
              listInvoicesAPI() // Fetch all invoices
          ]);
          setProjects(fetchedProjects);
          setAllUsers(fetchedUsers);
          setClients(fetchedClients);
          setFreelancers(fetchedFreelancers);
          setAllInvoices(fetchedInvoices);

          if (location.pathname.endsWith(NAV_LINKS.ADMIN_CREATE_PROJECT)) {
              handleOpenCreateModal();
          }
      } catch (error: any) {
          console.error("Failed to load initial project management data:", error);
          setFormError(error.message || "Failed to load necessary data. Please try refreshing.");
      } finally {
          setIsLoading(false);
      }
  };
  
  useEffect(() => {
    loadInitialData();
  }, []); 

  useEffect(() => { // Handle direct navigation to create project
    if (location.pathname.endsWith(NAV_LINKS.ADMIN_CREATE_PROJECT) && !isCreateModalOpen && clients.length > 0) {
        handleOpenCreateModal();
    }
  }, [location.pathname, isCreateModalOpen, clients]);

  const handleViewDetails = async (project: Project) => {
    setIsSubmitting(true);
    setFormError(null);
    try {
        const details = await fetchProjectDetailsAPI(project.id);
        setSelectedProject(details); 
        if (details && (details.status === ProjectStatus.OPEN || details.status === ProjectStatus.PENDING_APPROVAL) && !details.assignedFreelancerId) {
            const apps = await fetchApplicationsForProjectAPI(details.id);
            setProjectApplications(apps);
        } else {
            setProjectApplications([]);
        }
        setIsDetailModalOpen(true);
    } catch (error: any) {
        console.error("Error fetching project details:", error);
        setFormError(error.message || "Could not load project details.");
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleCloseDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedProject(null);
    setProjectApplications([]);
  };

  const resetCreateForm = () => {
    setTitle(''); setDescription(''); setBudget(''); setDeadline(''); 
    setSkillsRequired([]); setCurrentSkill(''); setAssignedClientId(''); setFormError(null);
  };
  
  const handleOpenCreateModal = () => {
    resetCreateForm();
    if (clients.length === 0 && !isLoading) { //isLoading check to prevent premature warning
        setFormError("No clients available to assign for new project. Please add clients first.");
    }
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

  const handleAddSkill = () => {
    if (currentSkill.trim() && !skillsRequired.includes(currentSkill.trim())) {
      setSkillsRequired([...skillsRequired, currentSkill.trim()]);
      setCurrentSkill('');
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setSkillsRequired(skillsRequired.filter(skill => skill !== skillToRemove));
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminUser || adminUser.role !== UserRole.ADMIN) {
        setFormError("Authentication error."); return;
    }
    if (!title || !description || !budget || !deadline || !assignedClientId) {
      setFormError("Please fill in all required fields including assigning a client.");
      return;
    }
    setIsSubmitting(true); setFormError(null);
    try {
      const projectData = { title, description, budget: Number(budget), deadline: new Date(deadline).toISOString(), skillsRequired, clientId: assignedClientId, adminCreatorId: adminUser.id };
      await createProjectAPI(projectData);
      alert("Project created and is pending approval."); 
      await loadInitialData(); 
      handleCloseCreateModal();
    } catch (err: any) {
      console.error("Failed to create project", err);
      setFormError(err.message || "Failed to create project. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleApproveProjectStatus = async (projectId: string) => { 
    setIsSubmitting(true);
    setFormError(null);
    try {
        await updateProjectStatusAPI(projectId, ProjectStatus.OPEN);
        alert("Project approved and is now open for applications.");
        await loadInitialData();
        if (selectedProject?.id === projectId) { 
            const details = await fetchProjectDetailsAPI(projectId);
            setSelectedProject(details || null);
        }
    } catch (err: any) {
        alert(err.message || "Failed to approve project.");
        setFormError(err.message || "Failed to approve project.");
    }
    setIsSubmitting(false);
  };

  const handleAcceptApplication = async (applicationId: string) => {
    if (!adminUser) return;
    setIsSubmitting(true);
    setFormError(null);
    try {
        await acceptApplicationAPI(applicationId);
        alert("Application accepted. Freelancer assigned and project is In Progress.");
        await loadInitialData();
        handleCloseDetailModal(); 
    } catch (err: any) {
        alert(err.message || "Failed to accept application.");
        setFormError(err.message || "Failed to accept application.");
    }
    setIsSubmitting(false);
  };

  const handleNavigateToEditProjectTasks = (project: Project) => {
    navigate(NAV_LINKS.PROJECT_DETAILS.replace(':id', project.id)); 
    handleCloseDetailModal();
  };

  const handleDeleteProject = async (projectId: string) => {
    if(window.confirm("Are you sure you want to delete this project? This cannot be undone.")) {
        setIsSubmitting(true);
        setFormError(null);
        try {
            await deleteProjectAPI(projectId);
            await loadInitialData();
        } catch (err: any) {
            alert(err.message || "Failed to delete project.");
            setFormError(err.message || "Failed to delete project.");
        }
        setIsSubmitting(false);
    }
  };

  const handleToggleArchive = async (project: Project) => {
    setIsSubmitting(true);
    setFormError(null);
    try {
        await toggleProjectArchiveStatusAPI(project.id);
        await loadInitialData(); 
    } catch (err: any) {
        alert(err.message || "Failed to update archive status.");
        setFormError(err.message || "Failed to update archive status.");
    }
    setIsSubmitting(false);
  };
  
  const getStatusClass = (status: ProjectStatus) => {
    switch (status) {
      case ProjectStatus.PENDING_APPROVAL: return 'bg-orange-100 text-orange-700';
      case ProjectStatus.OPEN: return 'bg-green-100 text-green-700';
      case ProjectStatus.IN_PROGRESS: return 'bg-yellow-100 text-yellow-700';
      case ProjectStatus.COMPLETED: return 'bg-blue-100 text-blue-700';
      case ProjectStatus.CANCELLED: return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const requestSort = (key: keyof Project | 'spend') => {
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
      const matchesClient = filterClient === 'ALL' || project.clientId === filterClient;
      const matchesFreelancer = filterFreelancer === 'ALL' || project.assignedFreelancerId === filterFreelancer;
      const matchesSearch = searchTerm === '' || 
                            project.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            project.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesArchived = showArchived ? true : !project.isArchived;
      return matchesStatus && matchesClient && matchesFreelancer && matchesSearch && matchesArchived;
    });

    if (sortConfig.key) {
      sortableProjects.sort((a, b) => {
        let aValue, bValue;
        if (sortConfig.key === 'spend') {
            aValue = calculateProjectSpend(a, allUsers);
            bValue = calculateProjectSpend(b, allUsers);
        } else {
            aValue = a[sortConfig.key as keyof Project];
            bValue = b[sortConfig.key as keyof Project];
        }

        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return sortConfig.direction === 'ascending' ? aValue - bValue : bValue - aValue;
        }
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return sortConfig.direction === 'ascending' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
        }
        if (sortConfig.key === 'deadline' || sortConfig.key === 'createdAt') {
            const dateA = new Date(aValue as string).getTime();
            const dateB = new Date(bValue as string).getTime();
            return sortConfig.direction === 'ascending' ? dateA - dateB : dateB - dateA;
        }
        return 0;
      });
    }
    return sortableProjects;
  }, [projects, filterStatus, filterClient, filterFreelancer, searchTerm, showArchived, sortConfig, allUsers]);

  const getSortIndicator = (key: keyof Project | 'spend') => {
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
      {formError && <p className="mb-4 text-sm text-red-600 bg-red-100 p-3 rounded-lg">{formError}</p>}
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
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700">Client</label>
          <select value={filterClient} onChange={e => setFilterClient(e.target.value)} className="mt-1 p-2 w-full border-gray-300 rounded-md shadow-sm text-sm">
            <option value="ALL">All Clients</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700">Freelancer</label>
          <select value={filterFreelancer} onChange={e => setFilterFreelancer(e.target.value)} className="mt-1 p-2 w-full border-gray-300 rounded-md shadow-sm text-sm">
            <option value="ALL">All Freelancers</option>
            {freelancers.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
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
                <th onClick={() => requestSort('clientName')} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer">Client {getSortIndicator('clientName')}</th>
                <th onClick={() => requestSort('assignedFreelancerName')} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer">Freelancer {getSortIndicator('assignedFreelancerName')}</th>
                <th onClick={() => requestSort('status')} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer">Status {getSortIndicator('status')}</th>
                <th onClick={() => requestSort('budget')} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer">Budget (R) {getSortIndicator('budget')}</th>
                <th onClick={() => requestSort('spend')} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer">Spend (R) {getSortIndicator('spend')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoiced (R)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Paid (R)</th>
                <th onClick={() => requestSort('deadline')} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer">Deadline {getSortIndicator('deadline')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedAndFilteredProjects.map((project) => {
                const projectSpend = calculateProjectSpend(project, allUsers);
                const isOverdue = new Date(project.deadline) < new Date() && project.status !== ProjectStatus.COMPLETED && project.status !== ProjectStatus.CANCELLED;

                // Replace the per‐row filter+reduce with a memoized map of totals
-               const relatedInvoices = allInvoices.filter(inv => inv.projectId === project.id);
-               const totalInvoiced = relatedInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
-               const totalPaid = relatedInvoices
-                 .filter(inv => inv.status === InvoiceStatus.PAID)
-                 .reduce((sum, inv) => sum + inv.totalAmount, 0);
+               const invoiceTotals = React.useMemo(() => {
+                 const map = new Map<string, { invoiced: number; paid: number }>();
+                 allInvoices.forEach(inv => {
+                   const entry = map.get(inv.projectId) ?? { invoiced: 0, paid: 0 };
+                   entry.invoiced += inv.totalAmount;
+                   if (inv.status === InvoiceStatus.PAID) {
+                     entry.paid += inv.totalAmount;
+                   }
+                   map.set(inv.projectId, entry);
+                 });
+                 return map;
+               }, [allInvoices]);
+
+               const { invoiced: totalInvoiced = 0, paid: totalPaid = 0 } =
+                 invoiceTotals.get(project.id) || {};
                return (
                <tr key={project.id} className={`hover:bg-primary-extralight transition-colors duration-150 ${project.isArchived ? 'opacity-60 bg-gray-100' : ''}`}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{project.title}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{project.clientName || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{project.assignedFreelancerName || 'Not Assigned'}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusClass(project.status)}`}>
                      {project.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">R {project.budget.toLocaleString()}</td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${projectSpend > project.budget ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
                      R {projectSpend.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">R {totalInvoiced.toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">R {totalPaid.toLocaleString()}</td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${isOverdue ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>{new Date(project.deadline).toLocaleDateString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-1">
                    <Button variant="ghost" size="sm" onClick={() => handleViewDetails(project)} aria-label="View Details" className="text-primary hover:text-primary-hover p-1" disabled={isSubmitting}><EyeIcon className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => handleNavigateToEditProjectTasks(project)} aria-label="Edit Project/Tasks" className="text-primary hover:text-primary-hover p-1" disabled={isSubmitting}><PencilIcon className="w-4 h-4" /></Button>
                    {project.status === ProjectStatus.PENDING_APPROVAL && (
                       <Button variant="ghost" size="sm" onClick={() => handleApproveProjectStatus(project.id)} aria-label="Approve Project" className="text-green-600 hover:text-green-700 p-1" disabled={isSubmitting}><CheckCircleIcon className="w-4 h-4" /></Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => handleToggleArchive(project)} aria-label={project.isArchived ? "Unarchive" : "Archive"} className="text-gray-500 hover:text-gray-700 p-1" disabled={isSubmitting}>
                       {project.isArchived ? '📤' : '📥'}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDeleteProject(project.id)} aria-label="Delete" className="text-red-500 hover:text-red-700 p-1" disabled={isSubmitting}><TrashIcon className="w-4 h-4" /></Button>
                  </td>
                </tr>
              )})}
              {sortedAndFilteredProjects.length === 0 && (
                  <tr><td colSpan={10} className="text-center py-4 text-gray-500">No projects match the current filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {selectedProject && (
        <Modal isOpen={isDetailModalOpen} onClose={handleCloseDetailModal} title={`Details: ${selectedProject.title}`} size="2xl">
          <div className="space-y-4">
            <p><strong className="font-medium text-gray-700">Description:</strong> {selectedProject.description}</p>
            <p><strong className="font-medium text-gray-700">Budget:</strong> R {selectedProject.budget.toLocaleString()}</p>
            <p><strong className="font-medium text-gray-700">Spend:</strong> R {calculateProjectSpend(selectedProject, allUsers).toLocaleString()}</p>
            <p><strong className="font-medium text-gray-700">Deadline:</strong> {new Date(selectedProject.deadline).toLocaleDateString()}</p>
            <p><strong className="font-medium text-gray-700">Client:</strong> {selectedProject.clientName || 'N/A'}</p>
            <p><strong className="font-medium text-gray-700">Status:</strong> <span className={`px-2 py-0.5 text-xs rounded-full ${getStatusClass(selectedProject.status)}`}>{selectedProject.status}</span></p>
            {selectedProject.assignedFreelancerName && <p><strong className="font-medium text-gray-700">Assigned Freelancer:</strong> {selectedProject.assignedFreelancerName}</p>}
            <div>
              <strong className="font-medium text-gray-700">Skills Required:</strong>
              <div className="flex flex-wrap gap-2 mt-1">
                {selectedProject.skillsRequired.map(skill => (
                  <span key={skill} className="px-2.5 py-1 bg-accent text-secondary text-xs rounded-full font-medium">{skill}</span>
                ))}
              </div>
            </div>
             {selectedProject.jobCards && selectedProject.jobCards.length > 0 && (
                <div className="pt-3">
                    <h4 className="font-medium text-gray-700">Job Cards / Tasks:</h4>
                    <ul className="list-disc list-inside mt-1 space-y-1 text-sm max-h-40 overflow-y-auto bg-gray-50 p-3 rounded-md border">
                        {selectedProject.jobCards.map(jc => (
                            <li key={jc.id} className="text-gray-600">
                                {jc.title} - <span className={`font-semibold ${
                                    jc.status === JobCardStatus.COMPLETED ? 'text-green-600' : 
                                    jc.status === JobCardStatus.IN_PROGRESS ? 'text-yellow-600' :
                                    jc.status === JobCardStatus.PENDING_REVIEW ? 'text-purple-600' :
                                    'text-gray-500'
                                }`}>{jc.status}</span>
                                {jc.assignedArchitectName && <span className="text-xs text-gray-400"> (Assigned: {jc.assignedArchitectName})</span>}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            { (selectedProject.status === ProjectStatus.OPEN || selectedProject.status === ProjectStatus.PENDING_APPROVAL) && projectApplications.length > 0 && !selectedProject.assignedFreelancerId && (
                <div className="pt-4 border-t mt-4">
                    <h4 className="text-md font-semibold text-gray-700 mb-2">Pending Applications ({projectApplications.filter(app => app.status === 'PendingAdminApproval').length})</h4>
                    {projectApplications.filter(app => app.status === 'PendingAdminApproval').length > 0 ? (
                        <div className="space-y-3 max-h-60 overflow-y-auto">
                            {projectApplications.filter(app => app.status === 'PendingAdminApproval').map(app => (
                                <div key={app.id} className="p-3 bg-gray-50 rounded-md border hover:shadow-sm">
                                    <p className="font-semibold text-gray-800">{app.freelancerName} <span className="text-xs text-gray-500">({app.freelancerId})</span></p>
                                    <p className="text-sm text-gray-600">Bid: R {app.bidAmount.toLocaleString()}</p>
                                    <p className="text-sm text-gray-600 mt-1 italic">"{app.proposal}"</p>
                                    <Button 
                                        onClick={() => handleAcceptApplication(app.id)} 
                                        variant="primary" size="sm" className="mt-2" 
                                        leftIcon={<UserCheckIcon className="w-4 h-4"/>}
                                        isLoading={isSubmitting}>
                                        Accept Application
                                    </Button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-gray-500">No applications currently pending admin approval for this project.</p>
                    )}
                </div>
            )}
            {selectedProject.status === ProjectStatus.OPEN && projectApplications.filter(app => app.status === 'PendingAdminApproval').length === 0 && !selectedProject.assignedFreelancerId && (
                 <p className="text-sm text-gray-500 pt-4 border-t mt-4">This project is open for bidding but has no pending applications yet.</p>
            )}


             <div className="mt-6 flex justify-end space-x-2">
                <Button onClick={() => handleNavigateToEditProjectTasks(selectedProject)} variant="secondary">Manage Tasks</Button>
                <Button onClick={handleCloseDetailModal} variant="outline">Close</Button>
            </div>
          </div>
        </Modal>
      )}

      {isCreateModalOpen && (
        <Modal isOpen={isCreateModalOpen} onClose={handleCloseCreateModal} title="Create New Project (Admin)" size="2xl">
           <form onSubmit={handleCreateProject} className="space-y-6">
            <div>
              <label htmlFor="proj_title" className="block text-sm font-medium text-gray-700">Project Title</label>
              <input type="text" id="proj_title" value={title} onChange={(e) => setTitle(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-primary focus:border-primary" required />
            </div>
            <div>
              <label htmlFor="proj_desc" className="block text-sm font-medium text-gray-700">Project Description</label>
              <textarea id="proj_desc" rows={4} value={description} onChange={(e) => setDescription(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-primary focus:border-primary" required />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="proj_budget" className="block text-sm font-medium text-gray-700">Budget (R)</label>
                <input type="number" id="proj_budget" value={budget} onChange={(e) => setBudget(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-primary focus:border-primary" required min="1" />
              </div>
              <div>
                <label htmlFor="proj_deadline" className="block text-sm font-medium text-gray-700">Deadline</label>
                <input type="date" id="proj_deadline" value={deadline} onChange={(e) => setDeadline(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-primary focus:border-primary" required min={new Date().toISOString().split('T')[0]} />
              </div>
            </div>
             <div>
                <label htmlFor="assignClient" className="block text-sm font-medium text-gray-700">Assign Client</label>
                <select id="assignClient" value={assignedClientId} onChange={(e) => setAssignedClientId(e.target.value)} required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-lg shadow-sm focus:outline-none focus:ring-primary focus:border-primary">
                    <option value="" disabled>Select a client</option>
                    {clients.length > 0 ? clients.map(client => <option key={client.id} value={client.id}>{client.name} ({client.email})</option>) : <option disabled>No clients available</option>}
                </select>
            </div>
            <div>
              <label htmlFor="proj_skills" className="block text-sm font-medium text-gray-700">Skills Required (optional)</label>
              <div className="flex items-center mt-1">
                <input type="text" id="proj_skills" value={currentSkill} onChange={(e) => setCurrentSkill(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddSkill();}}}
                  className="flex-grow px-3 py-2 border border-gray-300 rounded-l-lg shadow-sm focus:outline-none focus:ring-primary focus:border-primary" placeholder="e.g., Revit, AutoCAD" />
                <Button type="button" onClick={handleAddSkill} className="rounded-l-none !py-2" variant="secondary">Add Skill</Button>
              </div>
              {skillsRequired.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {skillsRequired.map(skill => (
                    <span key={skill} className="flex items-center px-2.5 py-1 bg-accent text-secondary text-sm rounded-full font-medium">
                      {skill} <button type="button" onClick={() => handleRemoveSkill(skill)} className="ml-1.5 text-secondary hover:text-red-700 font-bold">&times;</button>
                    </span>
                  ))}
                </div>
              )}
            </div>
            {formError && <p className="text-sm text-red-600 bg-red-100 p-3 rounded-lg">{formError}</p>}
            <div className="pt-4 flex justify-end space-x-3">
                <Button type="button" variant="secondary" onClick={handleCloseCreateModal} disabled={isSubmitting}>Cancel</Button>
                <Button type="submit" variant="primary" isLoading={isSubmitting} disabled={isSubmitting || (clients.length === 0 && !isLoading) }>Create Project</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default ProjectManagement;
