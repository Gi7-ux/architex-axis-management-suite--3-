
import React from 'react';
import { Project, ProjectStatus } from '../../types';
import Button from './Button';
import { EyeIcon } from './IconComponents';
import { useNavigate } from 'react-router-dom';
import { NAV_LINKS } from '../../constants';

interface ProjectCardProps {
  project: Project;
  onViewDetails?: (project: Project) => void;
  onApply?: (project: Project) => void; 
  showApplyButton?: boolean;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project, onViewDetails, onApply, showApplyButton }) => {
  const navigate = useNavigate();
  
  const getStatusClass = (status: ProjectStatus) => {
    switch (status) {
      case ProjectStatus.PENDING_APPROVAL: return 'bg-orange-100 text-orange-700 border-orange-300';
      case ProjectStatus.OPEN: return 'bg-green-100 text-green-700 border-green-300';
      case ProjectStatus.IN_PROGRESS: return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case ProjectStatus.COMPLETED: return 'bg-blue-100 text-blue-700 border-blue-300';
      case ProjectStatus.CANCELLED: return 'bg-red-100 text-red-700 border-red-300';
      default: return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const handleViewDetails = () => {
    if (onViewDetails) {
      onViewDetails(project);
    } else {
      navigate(NAV_LINKS.PROJECT_DETAILS.replace(':id', project.id));
    }
  };

  return (
    <div className="bg-white shadow-lg rounded-xl overflow-hidden hover:shadow-2xl transition-shadow duration-300 flex flex-col border border-gray-200 hover:border-primary-light">
      <div className="p-6 flex-grow">
        <div className="flex justify-between items-start mb-3">
          <h3 className="text-xl font-semibold text-primary leading-tight">{project.title}</h3>
          <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${getStatusClass(project.status)}`}>
            {project.status}
          </span>
        </div>
        <p className="text-gray-600 text-sm mb-4 line-clamp-3">{project.description}</p>
        
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm mb-4">
          <div>
            <span className="font-medium text-gray-500">Budget:</span>
            <span className="text-gray-700 ml-1">R {project.budget.toLocaleString()}</span>
          </div>
          <div>
            <span className="font-medium text-gray-500">Deadline:</span>
            <span className="text-gray-700 ml-1">{new Date(project.deadline).toLocaleDateString()}</span>
          </div>
          {project.clientName && (
            <div>
              <span className="font-medium text-gray-500">Client:</span>
              <span className="text-gray-700 ml-1">{project.clientName}</span>
            </div>
          )}
          {project.assignedFreelancerName && (
            <div>
              <span className="font-medium text-gray-500">Freelancer:</span>
              <span className="text-gray-700 ml-1">{project.assignedFreelancerName}</span>
            </div>
          )}
        </div>

        {project.skillsRequired && project.skillsRequired.length > 0 && (
          <div className="mb-4">
            <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">Skills Required</h4>
            <div className="flex flex-wrap gap-2">
              {project.skillsRequired.map(skill => (
                <span key={skill} className="px-2.5 py-1 bg-accent text-secondary text-xs rounded-full font-medium">{skill}</span>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3">
        <Button variant="outline" size="sm" onClick={handleViewDetails} leftIcon={<EyeIcon className="w-4 h-4"/>}>
          View Details
        </Button>
        {showApplyButton && onApply && project.status === ProjectStatus.OPEN && (
          <Button variant="primary" size="sm" onClick={() => onApply(project)}>
            Apply Now
          </Button>
        )}
      </div>
    </div>
  );
};

export default ProjectCard;