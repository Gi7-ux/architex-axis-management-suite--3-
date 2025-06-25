import React, { useState, useEffect } from 'react';
import { Project, ProjectStatus, UserRole } from '../../types';
import {
    fetchProjectsAPI,
    submitApplicationAPI,
    fetchAllSkillsAPI,
    fetchFreelancerApplicationsAPI, // Use this instead of fetchUserApplicationsAPI
    FreelancerApplicationResponseItem, // Type for the response
    SubmitApplicationPayload, // Type for submitting application
    ApiError // Ensure ApiError is imported if used in catch blocks
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
    // interface RawPhpProject { // Removed, use ProjectPHPResponse from apiService
    //   id: number;
    //   title: string;
    //   description: string;
    //   client_id: number;
    //   freelancer_id: number | null;
    //   status: string;
    //   created_at: string;
    //   updated_at: string;
    // }

    const loadInitialData = async () => {
      setIsLoading(true);
      setError(null);
      let errorMessages: string[] = [];

      // Fetch projects
      try {
        // Fetch projects - no status filter for now, new API doesn't support it yet
        const rawProjects: RawPhpProject[] = await fetchProjectsAPI();

        // Map rawProjects to the frontend Project type
        const mappedProjects: Project[] = rawProjects.map((rawProject): Project => ({
          id: String(rawProject.id), // ProjectPHPResponse has id as number
          title: rawProject.title,
          description: rawProject.description,
          clientId: String(rawProject.client_id), // ProjectPHPResponse has client_id as number
          assignedFreelancerId: rawProject.freelancer_id ? String(rawProject.freelancer_id) : undefined, // ProjectPHPResponse has freelancer_id as number | null
          status: rawProject.status as ProjectStatus, // ProjectPHPResponse has status as string
          createdAt: rawProject.createdAt, // Corrected to camelCase
          deadline: rawProject.deadline, // ProjectPHPResponse should have this from Project base
          clientName: rawProject.client_username || `Client ${rawProject.client_id}`, // Use client_username if available
          budget: rawProject.budget, // ProjectPHPResponse should have this from Project base
          skillsRequired: rawProject.skills_required ? rawProject.skills_required.map(s => s.name) : [], // Map skills if present
          jobCards: [], // Placeholder, or fetch separately
          adminCreatorId: rawProject.adminCreatorId, // If ProjectPHPResponse includes it
          isArchived: rawProject.isArchived || false, // If ProjectPHPResponse includes it
          assignedFreelancerName: rawProject.freelancer_username || (rawProject.freelancer_id ? `Freelancer ${rawProject.freelancer_id}` : undefined), // Use freelancer_username
        }));
        setProjects(mappedProjects);
      } catch (projError: any) {
        console.error("Failed to load projects:", projError);
        setError(projError.message || "Could not load projects.");
        setProjects([]);
      }

      // Fetch all skills
      try {
        const fetchedSkills = await fetchAllSkillsAPI();
        setAllSkills(fetchedSkills.map(skill => skill.name).sort());
      } catch (skillError: any) {
        console.warn("fetchAllSkillsAPI failed, using empty skills list:", skillError);
        // setError(prevError => prevError ? `${prevError} Could not load skills.` : "Could not load skills."); // Optionally append
        setAllSkills([]);
      }

      // Fetch user applications if freelancer
      if (user && user.role === UserRole.FREELANCER) {
        try {
          const freelancerApps: FreelancerApplicationResponseItem[] = await fetchFreelancerApplicationsAPI();
          setAppliedProjectIds(new Set(freelancerApps.map(app => String(app.project_id))));
        } catch (appError: any) {
          console.warn("fetchFreelancerApplicationsAPI failed:", appError);
          // setError(prevError => prevError ? `${prevError} Could not load applications.` : "Could not load applications."); // Optionally append
          setAppliedProjectIds(new Set());
        }
      }

      if (errorMessages.length > 0) {
        setError(errorMessages.join(' '));
      }

    } catch (err: any) { // Catch any unexpected errors from the overall process
        console.error("Unexpected error in loadInitialData:", err);
        setError(err.message || "An unexpected error occurred.");
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
    if (!selectedProjectForApplication || !user || !proposal || bidAmount === '') return; // Check bidAmount for empty string too
    setApplying(true);
    setError(null); // Clear previous modal errors
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
      
      {error && <p className="mb-4 text-sm text-red-600 bg-red-100 p-3 rounded-lg">{error}</p>}

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

      {!isLoading && filteredProjects.length === 0 && !error &&(
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
