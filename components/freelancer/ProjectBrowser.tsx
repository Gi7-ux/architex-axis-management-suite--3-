import React, { useState, useEffect } from 'react';
import { Project, ProjectStatus, UserRole } from '../../types'; // Removed Application as it's not directly used for type here
import {
    fetchProjectsAPI,
    submitApplicationAPI,
    fetchAllSkillsAPI,
    fetchFreelancerApplicationsAPI,
    FreelancerApplicationResponseItem,
    SubmitApplicationPayload,
    ApiError as ApiErrorType // Import and alias ApiError
} from '../../apiService';
import ProjectCard from '../shared/ProjectCard';
import Modal from '../shared/Modal';
import ErrorMessage from '../shared/ErrorMessage'; // Import ErrorMessage
import Button from '../shared/Button';
import LoadingSpinner from '../shared/LoadingSpinner';
import { useAuth } from '../AuthContext';

const ProjectBrowser: React.FC = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [allSkills, setAllSkills] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProjectForApplication, setSelectedProjectForApplication] = useState<Project | null>(null);
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [proposal, setProposal] = useState('');
  const [bidAmount, setBidAmount] = useState<number | string>('');
  const [applying, setApplying] = useState(false);
  const [appliedProjectIds, setAppliedProjectIds] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSkills, setFilterSkills] = useState<string[]>([]);
  const [pageError, setPageError] = useState<ApiErrorType | string | null>(null); // Renamed for clarity
  const [applyModalError, setApplyModalError] = useState<ApiErrorType | string | null>(null); // New state for modal

  useEffect(() => {
    // Define the raw project data type from PHP
    interface RawPhpProject {
      id: number;
      title: string;
      description: string;
      client_id: number;
      freelancer_id: number | null;
      status: string;
      created_at: string;
      updated_at: string;
      // budget, skillsRequired etc. are not in the basic PHP response yet
    }

    const loadInitialData = async () => {
      setIsLoading(true);
      setPageError(null); // Clear page-level error
      let errorMessages: string[] = []; // Keep this for aggregating initial load errors

      try {
        const rawProjects: RawPhpProject[] = await fetchProjectsAPI();

        // Map rawProjects to the frontend Project type
        const mappedProjects: Project[] = rawProjects.map((rawProject): Project => ({
          id: String(rawProject.id), // Convert number to string
          title: rawProject.title,
          description: rawProject.description,
          clientId: String(rawProject.client_id), // Convert number to string and camelCase
          freelancerId: rawProject.freelancer_id ? String(rawProject.freelancer_id) : undefined,
          status: rawProject.status as ProjectStatus, // Assume status string matches ProjectStatus enum values
          createdAt: rawProject.created_at,
          updatedAt: rawProject.updated_at,
          // Provide default/placeholder values for other fields expected by Project type
          clientName: `Client ${rawProject.client_id}`, // Placeholder
          budget: 0, // Placeholder - not in PHP response
          currency: 'USD', // Placeholder
          skillsRequired: [], // Placeholder - not in PHP response
          paymentType: 'fixed', // Placeholder
          experienceLevel: 'intermediate', // Placeholder
          duration: 'unknown', // Placeholder
          isFeatured: false, // Placeholder
          jobCards: [], // Placeholder
          adminCreatorId: undefined, // Placeholder
          isArchived: false, // Placeholder
          assignedFreelancerName: rawProject.freelancer_id ? `Freelancer ${rawProject.freelancer_id}` : undefined, // Placeholder
        }));
        setProjects(mappedProjects);

      } catch (projError: any) {
        console.error("Failed to load projects:", projError);
        errorMessages.push(projError.message || "Could not load projects.");
        setProjects([]); // Clear projects on error
      }

      // Fetch all skills
      try {
        const fetchedSkills = await fetchAllSkillsAPI();
        setAllSkills(fetchedSkills.sort());
      } catch (skillError: any) {
        console.warn("fetchAllSkillsAPI failed, using empty skills list:", skillError);
        // errorMessages.push("Could not load skills filter."); // Optionally inform user
        setAllSkills([]); // Default to empty list
      }

      // Fetch user applications if freelancer
      if (user && user.role === UserRole.FREELANCER) {
        try {
          // Use new API for freelancer's applications
          const freelancerApps: FreelancerApplicationResponseItem[] = await fetchFreelancerApplicationsAPI();
          setAppliedProjectIds(new Set(freelancerApps.map(app => String(app.project_id)))); // Ensure project_id is string if Project.id is string
        } catch (appError: any) {
          console.warn("fetchFreelancerApplicationsAPI failed:", appError);
          // errorMessages.push("Could not load your application statuses."); // Optionally inform user
          setAppliedProjectIds(new Set()); // Default to empty set
        }
      }

      if (errorMessages.length > 0) {
        setPageError(errorMessages.join(' ')); // Use pageError for initial load issues
      }

    } catch (err) {
        console.error("Unexpected error in loadInitialData:", err);
        if (err instanceof ApiErrorType) setPageError(err);
        else if (err instanceof Error) setPageError(err.message);
        else setPageError("An unexpected error occurred during initial data load.");
    } finally {
      setIsLoading(false);
    }
    };
    loadInitialData();
  }, [user]);

  const handleApplyClick = (project: Project) => {
    setApplyModalError(null); // Clear modal error on open
    setSelectedProjectForApplication(project);
    setBidAmount(project.budget * 0.9); 
    setProposal('');
    setIsApplyModalOpen(true);
  };

  const handleCloseApplyModal = () => {
    setIsApplyModalOpen(false);
    setSelectedProjectForApplication(null);
    setProposal('');
    setBidAmount('');
    setApplyModalError(null); // Clear error on close
  };

  const handleSubmitApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectForApplication || !user || !proposal || bidAmount === '') {
        setApplyModalError("Proposal and Bid Amount are required.");
        return;
    }
    setApplying(true);
    setApplyModalError(null);
    try {
      const payload: SubmitApplicationPayload = {
        project_id: parseInt(selectedProjectForApplication.id, 10),
        proposal_text: proposal,
        bid_amount: Number(bidAmount)
      };
      await submitApplicationAPI(payload);
      setAppliedProjectIds(prev => new Set(prev).add(selectedProjectForApplication.id));
      alert(`Application submitted for ${selectedProjectForApplication.title}`); // Keep alert for immediate user feedback
      handleCloseApplyModal();
    } catch (err) {
      console.error("Failed to submit application", err);
      if (err instanceof ApiErrorType) {
        setApplyModalError(err);
      } else if (err instanceof Error) {
        setApplyModalError(err.message);
      } else {
        setApplyModalError("An unexpected error occurred. Please try again.");
      }
    } finally {
      setApplying(false);
    }
  };

  const handleSkillToggle = (skill: string) => {
    setFilterSkills(prev => 
      prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]
    );
  };

  const filteredProjects = projects.filter(project => {
    const matchesSearchTerm = project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              project.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSkills = filterSkills.length === 0 || filterSkills.every(skill => project.skillsRequired.includes(skill));
    return matchesSearchTerm && matchesSkills;
  });


  if (isLoading && projects.length === 0) {
    return <LoadingSpinner text="Loading available projects..." className="p-6" />;
  }

  return (
    <div className="p-4 md:p-6">
      <h2 className="text-3xl font-bold text-gray-800 mb-6">Browse Projects</h2>
      
      <ErrorMessage error={pageError} /> {/* Display page-level errors */}

      <div className="mb-6 p-4 bg-white shadow rounded-lg">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input 
              type="text"
              placeholder="Search by title or description..."
              className="p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Filter by skills:</label>
                {allSkills.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                        {allSkills.map(skill => (
                            <Button 
                                key={skill}
                                size="sm"
                                variant={filterSkills.includes(skill) ? 'primary' : 'secondary'}
                                onClick={() => handleSkillToggle(skill)}
                                className="text-xs"
                            >
                                {skill}
                            </Button>
                        ))}
                    </div>
                ) : <p className="text-xs text-gray-500">No skills available for filtering.</p>}
            </div>
        </div>
      </div>

      {!isLoading && filteredProjects.length === 0 && !pageError &&(
        <p className="text-center text-gray-500 py-10">No projects match your criteria or no open projects available at the moment.</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProjects.map((project) => (
          <ProjectCard 
            key={project.id} 
            project={project} 
            showApplyButton={user?.role === UserRole.FREELANCER && !appliedProjectIds.has(project.id)}
            onApply={user?.role === UserRole.FREELANCER ? handleApplyClick : undefined}
          />
        ))}
      </div>

      {selectedProjectForApplication && (
        <Modal isOpen={isApplyModalOpen} onClose={handleCloseApplyModal} title={`Apply for: ${selectedProjectForApplication.title}`} size="lg">
          <form onSubmit={handleSubmitApplication} className="space-y-4">
            <ErrorMessage error={applyModalError} /> {/* Display modal-specific error */}
            <div>
              <label htmlFor="proposal" className="block text-sm font-medium text-gray-700">Your Proposal</label>
              <textarea
                id="proposal"
                rows={5}
                value={proposal}
                onChange={(e) => {setProposal(e.target.value); if(applyModalError) setApplyModalError(null);}}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                placeholder="Explain why you are a good fit for this project..."
                required
              />
            </div>
            <div>
              <label htmlFor="bidAmount" className="block text-sm font-medium text-gray-700">Your Bid Amount (R)</label>
              <input
                type="number"
                id="bidAmount"
                value={bidAmount}
                onChange={(e) => {setBidAmount(e.target.value); if(applyModalError) setApplyModalError(null);}}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                placeholder={`Project budget is R ${selectedProjectForApplication.budget.toLocaleString()}`}
                required
                min="1"
              />
            </div>
            {/* Removed inline error, ErrorMessage component handles it */}
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 mt-4">
              <Button type="button" variant="ghost" onClick={handleCloseApplyModal} disabled={applying}>Cancel</Button>
              <Button type="submit" variant="primary" size="md" isLoading={applying} disabled={applying}>Submit Application</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default ProjectBrowser;
