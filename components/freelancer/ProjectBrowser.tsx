import React, { useState, useEffect } from 'react';
import { Project, ProjectStatus, Application, User, UserRole } from '../../types';
import { fetchProjectsAPI, submitApplicationAPI, fetchAllSkillsAPI, fetchUserApplicationsAPI } from '../../apiService';
import ProjectCard from '../shared/ProjectCard';
import Modal from '../shared/Modal';
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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [openProjects, fetchedSkills] = await Promise.all([
            fetchProjectsAPI({ status: ProjectStatus.OPEN }),
            fetchAllSkillsAPI()
        ]);
        setProjects(openProjects);
        setAllSkills(fetchedSkills.sort());

        if (user && user.role === UserRole.FREELANCER) {
          const userApplications = await fetchUserApplicationsAPI(user.id);
          setAppliedProjectIds(new Set(userApplications.map(app => app.projectId)));
        }
      } catch (err: any) {
        console.error("Failed to load project browser data:", err);
        setError(err.message || "Could not load projects. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };
    loadInitialData();
  }, [user]);

  const handleApplyClick = (project: Project) => {
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
  };

  const handleSubmitApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectForApplication || !user || !proposal || !bidAmount) return;
    setApplying(true);
    setError(null);
    try {
      await submitApplicationAPI({
        projectId: selectedProjectForApplication.id,
        freelancerId: user.id,
        proposal,
        bidAmount: Number(bidAmount),
        status: 'PendingAdminApproval', 
      });
      setAppliedProjectIds(prev => new Set(prev).add(selectedProjectForApplication.id));
      alert(`Application submitted for ${selectedProjectForApplication.title}`); 
      handleCloseApplyModal();
    } catch (error: any) {
      console.error("Failed to submit application", error);
      setError(error.message || "Failed to submit application. Please try again.");
      alert(error.message || "Failed to submit application. Please try again.");
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
            <div>
              <label htmlFor="proposal" className="block text-sm font-medium text-gray-700">Your Proposal</label>
              <textarea
                id="proposal"
                rows={5}
                value={proposal}
                onChange={(e) => setProposal(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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
                onChange={(e) => setBidAmount(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder={`Project budget is R ${selectedProjectForApplication.budget.toLocaleString()}`}
                required
                min="1"
              />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex justify-end space-x-3 pt-4">
              <Button type="button" variant="secondary" onClick={handleCloseApplyModal} disabled={applying}>Cancel</Button>
              <Button type="submit" variant="primary" isLoading={applying} disabled={applying}>Submit Application</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default ProjectBrowser;
