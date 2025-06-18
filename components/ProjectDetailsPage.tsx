import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Project, ProjectStatus, Application, UserRole, JobCard, JobCardStatus, TimeLog, User, MessageStatus, ManagedFile, Conversation, Message } from '../types';
import { 
    fetchProjectDetailsAPI, fetchApplicationsForProjectAPI, fetchProjectFilesAPI, submitApplicationAPI,
    createJobCardAPI,
    updateJobCardAPI,
    deleteJobCardAPI,
    fetchJobCardsForProjectAPI,
    logTimeAPI,
    fetchTimeLogsForJobCardAPI,
    fetchTimeLogsForProjectAPI,
    updateTimeLogAPI,
    deleteTimeLogAPI,
    uploadFileAPI, deleteFileAPI, findOrCreateConversationAPI, sendMessageAPI,
    CreateJobCardPayload, UpdateJobCardPayload, JobCardPHPResponse,
    LogTimePayload,
    UpdateTimeLogPayload,
    TimeLogPHPResponse,
    ProjectApplicationPHPResponse
} from '../apiService';
import { NAV_LINKS, getMockFileIconPath, formatDurationToHHMMSS } from '../constants';
import LoadingSpinner from './shared/LoadingSpinner';
import Button from './shared/Button';
import { useAuth } from '../contexts/AuthContext';
import Modal from './shared/Modal';
import { ClockIcon, CheckCircleIcon, PencilIcon as EditIcon, PlayIcon, StopIcon, PlusIcon, TrashIcon, ChatBubbleLeftRightIcon, FolderOpenIcon, PaperClipIcon, DownloadIcon, UploadIcon, EyeIcon, ArrowLeftIcon } from './shared/IconComponents'; 

// Helper to format minutes to HH:MM string (Could be moved to a utils file)
const formatMinutesToHM = (minutes: number): string => {
  if (minutes < 0) minutes = 0;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

interface TimeLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Updated onSubmit to match the data structure ProjectDetailsPage.handleTimeLogSubmit expects
  onSubmit: (logData: Omit<TimeLog, 'id'|'jobCardId'|'architectId'|'createdAt'|'durationMinutes'|'manualEntry'> & {startTime: string, endTime: string, notes?:string}) => void;
  jobCardTitle: string;
}

const ManualTimeLogModal: React.FC<TimeLogModalProps> = ({isOpen, onClose, onSubmit, jobCardTitle}) => {
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [startTime, setStartTime] = useState('09:00');
    const [endTime, setEndTime] = useState('10:00');
    const [notes, setNotes] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const startDateTime = new Date(`${date}T${startTime}`);
        const endDateTime = new Date(`${date}T${endTime}`);
        if (endDateTime <= startDateTime) {
            alert("End time must be after start time.");
            return;
        }
        // const durationMinutes = (endDateTime.getTime() - startDateTime.getTime()) / (1000 * 60); // Duration calculated by backend now
        
        onSubmit({ 
            startTime: startDateTime.toISOString(), 
            endTime: endDateTime.toISOString(), 
            notes: notes || undefined,
            // manualEntry and durationMinutes are not part of this specific payload structure for logTimeAPI
        });
        onClose(); 
    };
    
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Log Time Manually for: ${jobCardTitle}`} size="md">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="logDate" className="block text-sm font-medium text-gray-700">Date</label>
                    <input type="date" id="logDate" value={date} onChange={e => setDate(e.target.value)} required
                           className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm"/>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="logStartTime" className="block text-sm font-medium text-gray-700">Start Time</label>
                        <input type="time" id="logStartTime" value={startTime} onChange={e => setStartTime(e.target.value)} required
                               className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm"/>
                    </div>
                    <div>
                        <label htmlFor="logEndTime" className="block text-sm font-medium text-gray-700">End Time</label>
                        <input type="time" id="logEndTime" value={endTime} onChange={e => setEndTime(e.target.value)} required
                               className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm"/>
                    </div>
                </div>
                <div>
                    <label htmlFor="logNotes" className="block text-sm font-medium text-gray-700">Notes (Optional)</label>
                    <textarea id="logNotes" value={notes} onChange={e => setNotes(e.target.value)} rows={3}
                              className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm"/>
                </div>
                <div className="flex justify-end space-x-2 pt-2">
                    <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button type="submit" variant="primary">Log Time</Button>
                </div>
            </form>
        </Modal>
    );
};


interface JobCardDisplayProps {
  jobCard: JobCard;
  project: Project; 
  isAssignedToCurrentUser: boolean;
  isAdminView: boolean;
  onStatusUpdate: (jobCardId: string, newStatus: JobCardStatus) => void; // projectId removed
  onTimeLog: (jobCardId: string, logData: Omit<TimeLog, 'id'|'jobCardId'|'architectId'|'createdAt'|'durationMinutes'|'manualEntry'> & {startTime: string, endTime: string, notes?:string}) => void;
  onEditJobCard: (jobCard: JobCard) => void;
  onDeleteJobCard: (jobCardId: string) => void;
  activeTimerJobCardId?: string | null;
  onStartTimer: (jobCardId: string, jobCardTitle: string, projectId: string) => void;
  onStopTimer: (notes?: string) => Promise<void>;
}

const JobCardDisplay: React.FC<JobCardDisplayProps> = ({ 
    jobCard, project, isAssignedToCurrentUser, isAdminView, onStatusUpdate, onTimeLog,
    onEditJobCard, onDeleteJobCard, activeTimerJobCardId, onStartTimer, onStopTimer 
}) => {
    const [isManualLogModalOpen, setIsManualLogModalOpen] = useState(false);
    const totalMinutesLogged = jobCard.timeLogs?.reduce((sum, log) => sum + log.durationMinutes, 0) || 0;
    const auth = useAuth();

    const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      onStatusUpdate(jobCard.id, e.target.value as JobCardStatus); // Pass only jobCard.id
    };

    const handleManualTimeSubmit = (logDataFromModal: Omit<TimeLog, 'id'|'jobCardId'|'architectId'|'createdAt'|'durationMinutes'|'manualEntry'> & {startTime: string, endTime: string, notes?:string}) => {
        onTimeLog(jobCard.id, logDataFromModal); // Pass jobCard.id and the new logData structure
    };
    
    const isTimerActiveForThisCard = activeTimerJobCardId === jobCard.id;
    const canLogTime = project.status === ProjectStatus.IN_PROGRESS && isAssignedToCurrentUser;

    const handleStartClick = () => {
        onStartTimer(jobCard.id, jobCard.title, jobCard.projectId);
    };

    const handleStopClick = async () => {
        const notes = prompt("Optional notes for this time entry (or leave blank):");
        await onStopTimer(notes || undefined);
    };

    return (
        <div className="bg-white p-4 rounded-lg shadow-md border border-gray-200 hover:shadow-lg transition-shadow flex flex-col justify-between">
            <div>
                <div className="flex justify-between items-start mb-1">
                    <h4 className="text-md font-semibold text-gray-700 flex-grow pr-2">{jobCard.title}</h4>
                    {isAdminView && (
                        <div className="flex-shrink-0 space-x-1">
                            <Button variant="ghost" size="sm" onClick={() => onEditJobCard(jobCard)} className="p-1" aria-label="Edit Task">
                                <EditIcon className="w-3.5 h-3.5"/>
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => onDeleteJobCard(jobCard.id)} className="text-red-500 hover:text-red-700 p-1" aria-label="Delete Task">
                                <TrashIcon className="w-3.5 h-3.5"/>
                            </Button>
                        </div>
                    )}
                </div>
                <p className="text-sm text-gray-600 mb-2 line-clamp-2 h-10">{jobCard.description}</p>
                <div className="text-xs text-gray-500 space-y-1">
                    {jobCard.assignedArchitectName && <div>Assigned: {jobCard.assignedArchitectName}</div>}
                    {jobCard.estimatedTime && <div>Est. Time: {jobCard.estimatedTime}h</div>}
                    <div className="font-medium">Logged: {formatMinutesToHM(totalMinutesLogged)}</div>
                </div>
            </div>

            {jobCard.timeLogs && jobCard.timeLogs.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                    <h5 className="text-xs font-semibold text-gray-500 mb-1">Logged Time:</h5>
                    <ul className="space-y-1 max-h-20 overflow-y-auto text-xs">
                        {jobCard.timeLogs.map(log => (
                            <li key={log.id} className="text-gray-600 p-1 bg-gray-50 rounded">
                                {new Date(log.startTime).toLocaleDateString()} ({formatMinutesToHM(log.durationMinutes)})
                                {log.notes && <span className="italic truncate block" title={log.notes}> - {log.notes}</span>}
                                {/* Add Edit/Delete buttons here if implementing */}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {(isAssignedToCurrentUser || isAdminView) && ( 
              <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
                <div>
                    <label htmlFor={`status-${jobCard.id}`} className="block text-xs font-medium text-gray-600 mb-1">Status:</label>
                    <select id={`status-${jobCard.id}`} value={jobCard.status} onChange={handleStatusChange}
                        disabled={!isAdminView && !canLogTime && jobCard.status === JobCardStatus.COMPLETED} 
                        className="block w-full p-1.5 text-xs border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-gray-50">
                        {Object.values(JobCardStatus).map(status => (
                            <option key={status} value={status}>{status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>
                        ))}
                    </select>
                </div>
                {canLogTime && isAssignedToCurrentUser && ( 
                    <div className="flex flex-wrap gap-2 items-center">
                        {!isTimerActiveForThisCard && !auth.activeTimerInfo && (
                            <Button size="sm" variant="ghost" onClick={handleStartClick} leftIcon={<PlayIcon/>}>Start Timer</Button>
                        )}
                        {isTimerActiveForThisCard && (
                             <Button size="sm" variant="danger" onClick={handleStopClick} leftIcon={<StopIcon/>}>Stop Timer</Button>
                        )}
                        {!isTimerActiveForThisCard && auth.activeTimerInfo && (
                            <Button size="sm" variant="ghost" disabled={true} leftIcon={<PlayIcon/>}>Start Timer</Button>
                        )}
                        <Button size="sm" variant="secondary" onClick={() => setIsManualLogModalOpen(true)} leftIcon={<PlusIcon/>}>Log Manually</Button>
                    </div>
                )}
              </div>
            )}
            {isManualLogModalOpen && 
                <ManualTimeLogModal 
                    isOpen={isManualLogModalOpen} 
                    onClose={() => setIsManualLogModalOpen(false)}
                    onSubmit={handleManualTimeSubmit}
                    jobCardTitle={jobCard.title}
                />
            }
        </div>
    );
};


const ProjectProgressBar: React.FC<{ jobCards?: JobCard[], projectStatus: ProjectStatus }> = ({ jobCards, projectStatus }) => {
  if (projectStatus === ProjectStatus.PENDING_APPROVAL) {
      return <p className="text-sm text-orange-500 bg-orange-50 p-2 rounded-md">Project pending admin approval. Progress tracking will begin once approved and in progress.</p>;
  }
  if (!jobCards || jobCards.length === 0) {
    return <p className="text-sm text-gray-500">No tasks defined for progress tracking.</p>;
  }

  const completedCount = jobCards.filter(jc => jc.status === JobCardStatus.COMPLETED).length;
  const totalCount = jobCards.length;
  const progressPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="my-4">
      <div className="flex justify-between mb-1">
        <span className="text-sm font-medium text-blue-700">Task Completion Progress</span>
        <span className="text-sm font-medium text-blue-700">{progressPercentage}% ({completedCount}/{totalCount} tasks)</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
        <div 
          className="bg-blue-600 h-2.5 rounded-full transition-all duration-500 ease-out" 
          style={{ width: `${progressPercentage}%` }}
          aria-valuenow={progressPercentage} aria-valuemin={0} aria-valuemax={100}
        ></div>
      </div>
    </div>
  );
};

interface JobCardFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (jobCardData: Omit<JobCard, 'id' | 'createdAt' | 'updatedAt' | 'projectId' | 'status' | 'assignedArchitectName' | 'timeLogs' | 'actualTimeLogged'> & {status?: JobCardStatus}) => void;
    editingJobCard?: JobCard | null;
    projectAssignedFreelancerId?: string; 
}

const JobCardFormModal: React.FC<JobCardFormModalProps> = ({ isOpen, onClose, onSubmit, editingJobCard, projectAssignedFreelancerId }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [estimatedTime, setEstimatedTime] = useState<number | string>('');
    const [assignedArchitectId, setAssignedArchitectId] = useState<string | undefined>(projectAssignedFreelancerId);
    const [status, setStatus] = useState<JobCardStatus>(JobCardStatus.TODO);
    
    useEffect(() => {
        if (editingJobCard) {
            setTitle(editingJobCard.title);
            setDescription(editingJobCard.description);
            setEstimatedTime(editingJobCard.estimatedTime || '');
            setAssignedArchitectId(editingJobCard.assignedArchitectId || projectAssignedFreelancerId);
            setStatus(editingJobCard.status);
        } else {
            setTitle(''); setDescription(''); setEstimatedTime('');
            setAssignedArchitectId(projectAssignedFreelancerId);
            setStatus(JobCardStatus.TODO);
        }
    }, [editingJobCard, isOpen, projectAssignedFreelancerId]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) { alert("Title is required."); return; }
        onSubmit({ 
            title, 
            description, 
            estimatedTime: estimatedTime ? Number(estimatedTime) : undefined,
            assignedArchitectId: assignedArchitectId,
            status // Include status if it's part of the form
        });
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={editingJobCard ? "Edit Job Card" : "Add New Job Card"} size="lg">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="jcTitle" className="block text-sm font-medium text-gray-700">Title</label>
                    <input type="text" id="jcTitle" value={title} onChange={e => setTitle(e.target.value)} required
                           className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm"/>
                </div>
                <div>
                    <label htmlFor="jcDescription" className="block text-sm font-medium text-gray-700">Description</label>
                    <textarea id="jcDescription" value={description} onChange={e => setDescription(e.target.value)} rows={3}
                              className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm"/>
                </div>
                <div>
                    <label htmlFor="jcEstTime" className="block text-sm font-medium text-gray-700">Estimated Time (hours)</label>
                    <input type="number" id="jcEstTime" value={estimatedTime} onChange={e => setEstimatedTime(e.target.value)} min="0" step="0.5"
                           className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm"/>
                </div>
                {/* Simplified: Status not editable in this form directly for now, default or handled by onStatusUpdate */}
                <div className="flex justify-end space-x-2 pt-2">
                    <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button type="submit" variant="primary">{editingJobCard ? "Save Changes" : "Add Job Card"}</Button>
                </div>
            </form>
        </Modal>
    );
};

type ProjectDetailTab = 'details' | 'tasks' | 'messages' | 'files' | 'adminLogs';

const ProjectDetailsPage: React.FC = () => {
  const { id: projectId } = useParams<{ id: string }>();
  const auth = useAuth(); 
  const { user, activeTimerInfo, startGlobalTimer, stopGlobalTimerAndLog } = auth;
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState<ProjectDetailTab>('details');

  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [proposal, setProposal] = useState('');
  const [bidAmount, setBidAmount] = useState<number | string>('');
  const [applying, setApplying] = useState(false);
  const [hasApplied, setHasApplied] = useState(false);

  const [isJobCardModalOpen, setIsJobCardModalOpen] = useState(false);
  const [editingJobCard, setEditingJobCard] = useState<JobCard | null>(null);
  const isAdminView = user?.role === UserRole.ADMIN;

  const [projectFiles, setProjectFiles] = useState<ManagedFile[]>([]);
  const [isFileUploadModalOpen, setIsFileUploadModalOpen] = useState(false);
  const [selectedFileForUpload, setSelectedFileForUpload] = useState<File | null>(null);
  const [isSubmittingFile, setIsSubmittingFile] = useState(false);
  
  const [allProjectTimeLogs, setAllProjectTimeLogs] = useState<(TimeLog & { jobCardTitle?: string, architectName?: string })[]>([]);


  const loadProjectDetails = useCallback(async () => {
    if (!projectId) { setError("Project ID is missing."); setIsLoading(false); return; }
    setIsLoading(true);
    setError(null);
    try {
      const fetchedProjectCore = await fetchProjectDetailsAPI(projectId);

      if (fetchedProjectCore) {
        const jobCardsPHP: JobCardPHPResponse[] = await fetchJobCardsForProjectAPI(projectId);

        const mappedJobCards: JobCard[] = await Promise.all(jobCardsPHP.map(async (jcPHP) => {
            let timeLogsForThisCard: TimeLog[] = [];
            try {
                const timeLogsPHP: TimeLogPHPResponse[] = await fetchTimeLogsForJobCardAPI(jcPHP.id);
                timeLogsForThisCard = timeLogsPHP.map(tlPHP => ({
                    id: String(tlPHP.id),
                    jobCardId: String(tlPHP.job_card_id),
                    architectId: String(tlPHP.user_id),
                    startTime: tlPHP.start_time,
                    endTime: tlPHP.end_time,
                    durationMinutes: tlPHP.duration_minutes,
                    notes: tlPHP.notes || undefined,
                    manualEntry: false,
                    createdAt: tlPHP.created_at,
                    // logger_username can be stored on a temporary/display version of TimeLog if needed
                }));
            } catch (logError) {
                console.error(`Failed to fetch time logs for job card ${jcPHP.id}:`, logError);
            }

            let totalLoggedMinutesForCard = 0;
            timeLogsForThisCard.forEach(log => totalLoggedMinutesForCard += log.durationMinutes);

            let statusEnum: JobCardStatus;
            const backendStatus = jcPHP.status.toLowerCase().replace('-', '_'); // Normalize e.g. in-progress to in_progress
            switch (backendStatus) {
                case 'todo': statusEnum = JobCardStatus.TODO; break;
                case 'in_progress': statusEnum = JobCardStatus.IN_PROGRESS; break;
                case 'pending_review': statusEnum = JobCardStatus.PENDING_REVIEW; break;
                case 'completed': statusEnum = JobCardStatus.COMPLETED; break;
                default: statusEnum = JobCardStatus.TODO;
            }

            return {
                id: String(jcPHP.id),
                projectId: String(jcPHP.project_id),
                title: jcPHP.title,
                description: jcPHP.description || '',
                status: statusEnum,
                assignedArchitectId: jcPHP.assigned_freelancer_id ? String(jcPHP.assigned_freelancer_id) : undefined,
                assignedArchitectName: jcPHP.assigned_freelancer_username || undefined,
                estimatedTime: jcPHP.estimated_hours !== null ? Number(jcPHP.estimated_hours) : undefined,
                createdAt: jcPHP.created_at,
                updatedAt: jcPHP.updated_at,
                timeLogs: timeLogsForThisCard,
                actualTimeLogged: totalLoggedMinutesForCard / 60,
            };
        }));

        const fullProjectData: Project = {
            ...fetchedProjectCore,
            id: String(fetchedProjectCore.id),
            clientId: String(fetchedProjectCore.clientId),
            assignedFreelancerId: fetchedProjectCore.assignedFreelancerId ? String(fetchedProjectCore.assignedFreelancerId) : undefined,
            jobCards: mappedJobCards,
        };
        setProject(fullProjectData);

        if (user?.role === UserRole.ADMIN && fetchedProjectCore) {
            try {
                const projectTimeLogsPHP: TimeLogPHPResponse[] = await fetchTimeLogsForProjectAPI(projectId);
                const mappedProjectTimeLogs = projectTimeLogsPHP.map(tlPHP => ({
                    id: String(tlPHP.id),
                    jobCardId: String(tlPHP.job_card_id),
                    architectId: String(tlPHP.user_id),
                    architectName: tlPHP.logger_username,
                    jobCardTitle: tlPHP.job_card_title,
                    startTime: tlPHP.start_time,
                    endTime: tlPHP.end_time,
                    durationMinutes: tlPHP.duration_minutes,
                    notes: tlPHP.notes || undefined,
                    manualEntry: false,
                    createdAt: tlPHP.created_at,
                }));
                mappedProjectTimeLogs.sort((a,b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
                setAllProjectTimeLogs(mappedProjectTimeLogs);
            } catch (projectLogError) {
                console.error(`Failed to fetch all time logs for project ${projectId}:`, projectLogError);
            }
        }

        if (user && user.role === UserRole.FREELANCER) {
            const fetchedApplications = await fetchApplicationsForProjectAPI(projectId);
            const existingApplication = fetchedApplications.find(app => String(app.freelancer_id) === user.id);
            setHasApplied(!!existingApplication);
        }
        const fetchedFiles = await fetchProjectFilesAPI(projectId);
        setProjectFiles(fetchedFiles);

      } else {
        setError("Project not found.");
        setProject(null);
      }
    } catch (err: any) {
        console.error("Error loading project details:", err);
        setError(err.message || "Failed to load project details. Please try again.");
        setProject(null);
    } finally { setIsLoading(false); }
  }, [projectId, user]);

  useEffect(() => { loadProjectDetails(); }, [loadProjectDetails, activeTimerInfo?.jobCardId]);
  
  const handleOpenJobCardModal = (jobCardToEdit: JobCard | null = null) => {
    setEditingJobCard(jobCardToEdit);
    setIsJobCardModalOpen(true);
  };

  const handleJobCardFormSubmit = async (
      formData: Omit<JobCard, 'id' | 'createdAt' | 'updatedAt' | 'projectId' | 'status' | 'assignedArchitectName' | 'timeLogs' | 'actualTimeLogged'> & {status?: JobCardStatus}
    ) => {
    if (!project || !projectId) return;

    try {
      if (editingJobCard) { // UPDATE
        const payload: UpdateJobCardPayload = {
          title: formData.title,
          description: formData.description || null,
          status: formData.status ? formData.status.toLowerCase().replace('_', '-') : undefined, // Convert enum to backend string
          assigned_freelancer_id: formData.assignedArchitectId ? parseInt(formData.assignedArchitectId, 10) : null,
          estimated_hours: formData.estimatedTime !== undefined ? Number(formData.estimatedTime) : null,
        };
        await updateJobCardAPI(editingJobCard.id, payload);
      } else { // CREATE
        const payload: CreateJobCardPayload = {
          project_id: parseInt(projectId, 10),
          title: formData.title,
          description: formData.description || null,
          status: formData.status ? formData.status.toLowerCase().replace('_', '-') : 'todo',
          assigned_freelancer_id: formData.assignedArchitectId ?
                                    parseInt(formData.assignedArchitectId, 10) :
                                    (project.assignedFreelancerId ? parseInt(project.assignedFreelancerId, 10) : null),
          estimated_hours: formData.estimatedTime !== undefined ? Number(formData.estimatedTime) : null,
        };
        await createJobCardAPI(payload);
      }
      await loadProjectDetails();
    } catch (err: any) {
        console.error("Failed to save job card:", err);
        alert(err.message || "Failed to save job card.");
    }
    setIsJobCardModalOpen(false);
    setEditingJobCard(null);
  };

  const handleDeleteJobCard = async (jobCardId: string) => {
    if (!project || !projectId) return;
    if (window.confirm("Are you sure you want to delete this job card?")) {
      try {
        await deleteJobCardAPI(jobCardId);
        await loadProjectDetails();
      } catch (err: any) {
          console.error("Failed to delete job card:", err);
          alert(err.message || "Failed to delete job card.");
      }
    }
  };

  const handleJobCardStatusUpdate = async (jobCardId: string, newStatus: JobCardStatus) => {
    try {
      const payload: UpdateJobCardPayload = {
        status: newStatus.toLowerCase().replace('_', '-')
      };
      await updateJobCardAPI(jobCardId, payload);
      loadProjectDetails(); // Reload to reflect changes
    } catch (err: any) { 
        console.error("Failed to update job card status:", err); 
        alert(err.message || "Failed to update status.");
    }
  };

  const handleTimeLogSubmit = async (
      jobCardIdToLog: string,
      logDataFromModal: Omit<TimeLog, 'id'|'jobCardId'|'architectId'|'createdAt'|'durationMinutes'|'manualEntry'> & {startTime: string, endTime: string, notes?:string}
  ) => {
    if (!user) return;

    // Corrected payload to match LogTimePayload in apiService.ts
    const payload: LogTimePayload = {
      jobCardId: jobCardIdToLog, // Ensure this is a string
      startTime: logDataFromModal.startTime,
      endTime: logDataFromModal.endTime,
      notes: logDataFromModal.notes || undefined, // Use undefined for optional fields
      manualEntry: true // Assuming manual log modal implies manual entry
    };
    try {
      await logTimeAPI(payload);
      loadProjectDetails(); // Reload to reflect changes
    } catch (err: any) { 
        alert(err.message || "Failed to log time."); 
        console.error("Failed to log time:", err);
    }
  };

  const handleApplyClick = () => {
    if (!project) return;
    setBidAmount(project.budget * 0.9); setProposal(''); setIsApplyModalOpen(true);
   };
  const handleCloseApplyModal = () => { setIsApplyModalOpen(false); setProposal(''); setBidAmount(''); };
  const handleSubmitApplication = async (e: React.FormEvent) => { 
    e.preventDefault();
    if (!project || !user || !proposal || !bidAmount) return;
    setApplying(true);
    try {
      // submitApplicationAPI expects SubmitApplicationPayload
      // Assuming project.id is string, user.id (AuthUser) is number
      await submitApplicationAPI({
        project_id: parseInt(project.id, 10),
        proposal_text: proposal,
        bid_amount: Number(bidAmount)
      });
      setHasApplied(true);
      alert(`Application submitted for ${project.title}.`);
      await loadProjectDetails(); 
    } catch (err: any) {  
        alert(err.message || "Failed to submit application. Please try again."); 
        console.error("Failed to submit application:", err);
    } finally { 
        setApplying(false); 
        handleCloseApplyModal(); 
    }
  };

  const totalProjectMinutesLogged = project?.jobCards?.reduce((projectSum, jc) => 
    projectSum + (jc.timeLogs?.reduce((cardSum, log) => cardSum + log.durationMinutes, 0) || 0), 0) || 0;

  const handleOpenProjectChat = async () => {
    if (!project || !user) return;
    
    const participantIds = Array.from(new Set([
        user.id,
        project.clientId,
        project.assignedFreelancerId,
        project.adminCreatorId
    ].filter(Boolean)));
    
    try {
        const conversation = await findOrCreateConversationAPI(participantIds, project.id);
        navigate('/messages', { state: { conversationId: conversation.id }});
    } catch (err: any) {
        alert(err.message || "Could not open or create chat for this project.");
        console.error("Chat creation/navigation error:", err);
    }
  };
  
  const handleRequestStatusUpdate = async () => {
    if (!project || !user || user.role !== UserRole.CLIENT) return;
    
    const participantIds = [
        user.id,
        project.assignedFreelancerId,
        project.adminCreatorId
    ].filter(Boolean);

    try {
        const conversation = await findOrCreateConversationAPI(participantIds, project.id);
        await sendMessageAPI({
            conversation_id: conversation.id,
            content: `Client ${user.name} requests a status update for project '${project.title}'`,
        });
        alert("Status update request sent via messages.");
        navigate('/messages', { state: { conversationId: conversation.id } });
    } catch (err: any) {
        alert(err.message || "Failed to send status update request.");
        console.error("Status update request error:", err);
    }
  };
  
  const handleFileUpload = async () => {
    if(!project || !user || !selectedFileForUpload) return;
    setIsSubmittingFile(true);
    const formData = new FormData();
    formData.append('file', selectedFileForUpload);
    formData.append('projectId', project.id);
    formData.append('uploaderId', String(user.id)); // Ensure uploaderId is string if API expects that

    try {
        await uploadFileAPI(project.id, formData); // projectId is string here
        alert("File uploaded successfully.");
        await loadProjectDetails(); 
    } catch (err: any) {
        console.error("File upload failed:", err);
        alert(err.message || "File upload failed.");
    }
    setIsFileUploadModalOpen(false);
    setSelectedFileForUpload(null);
    setIsSubmittingFile(false);
  };

  const handleFileDelete = async (fileId: string) => {
    if(window.confirm("Are you sure you want to delete this file?")) {
        try {
            await deleteFileAPI(fileId);
            await loadProjectDetails(); 
        } catch (err: any) {
            console.error("File deletion failed:", err);
            alert(err.message || "File deletion failed.");
        }
    }
  };


  if (isLoading) return <div className="flex justify-center items-center h-[calc(100vh-4rem)]"><LoadingSpinner text="Loading project details..." size="lg" /></div>;
  if (error) return <div className="p-6 text-center text-red-500 text-xl">{error}</div>;
  if (!project) return <div className="p-6 text-center text-gray-500 text-xl">Project data could not be loaded or found.</div>;
  
  const getStatusColor = (status: ProjectStatus | string) => { // Allow string for backend statuses not in enum yet
    switch (status) {
      case ProjectStatus.PENDING_APPROVAL: return 'text-orange-600 bg-orange-100';
      case ProjectStatus.OPEN: return 'text-green-600 bg-green-100';
      case ProjectStatus.IN_PROGRESS: return 'text-yellow-600 bg-yellow-100';
      case ProjectStatus.COMPLETED: return 'text-blue-600 bg-blue-100';
      case ProjectStatus.CANCELLED: return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const tabButtonClasses = (tabName: ProjectDetailTab) => 
    `px-4 py-2.5 font-medium text-sm rounded-t-lg transition-colors focus:outline-none -mb-px border-b-2
     ${currentTab === tabName 
        ? 'border-primary text-primary bg-white' 
        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`;

  return (
    <div className="container mx-auto p-4 md:p-8">
      <Button onClick={() => navigate(-1)} variant="ghost" className="mb-6 text-sm" leftIcon={<ArrowLeftIcon />}>Back</Button>
      <div className="bg-white shadow-xl rounded-lg overflow-hidden">
        <div className="p-6 md:p-8 border-b border-gray-200">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-800 leading-tight">{project.title}</h1>
            <span className={`mt-2 md:mt-0 px-4 py-1.5 text-sm font-semibold rounded-full ${getStatusColor(project.status)}`}>
              {project.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </span>
          </div>
          
          <div className="mb-6 text-sm text-gray-500">
            Posted on: {new Date(project.createdAt).toLocaleDateString()} by {project.clientName || 'Unknown Client'}
            {project.adminCreatorId && ` (Managed by Admin ID: ${project.adminCreatorId})`}
          </div>

          {user?.role === UserRole.CLIENT && project.status === ProjectStatus.IN_PROGRESS && (
            <Button onClick={handleRequestStatusUpdate} variant="secondary" size="sm" className="mb-4" leftIcon={<ChatBubbleLeftRightIcon className="w-4 h-4"/>}>
                Request Status Update
            </Button>
          )}

        </div>
        
        <div className="border-b border-gray-200 px-6 md:px-8">
            <nav className="flex space-x-1 flex-wrap">
                <button onClick={() => setCurrentTab('details')} className={tabButtonClasses('details')}>Details</button>
                <button onClick={() => setCurrentTab('tasks')} className={tabButtonClasses('tasks')}>Tasks</button>
                <button onClick={() => setCurrentTab('messages')} className={tabButtonClasses('messages')}>Messages</button>
                <button onClick={() => setCurrentTab('files')} className={tabButtonClasses('files')}>Files</button>
                 {isAdminView && <button onClick={() => setCurrentTab('adminLogs')} className={tabButtonClasses('adminLogs')}>Time Logs</button>}
            </nav>
        </div>

        <div className="p-6 md:p-8">
            {currentTab === 'details' && (
                <>
                    <p className="text-gray-700 text-lg leading-relaxed mb-6 whitespace-pre-line bg-gray-50 p-4 rounded-md">
                        {project.description}
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-4 mb-6 text-gray-700">
                        <div><strong className="font-medium text-gray-500">Budget:</strong> R {project.budget.toLocaleString()}</div>
                        <div><strong className="font-medium text-gray-500">Deadline:</strong> {new Date(project.deadline).toLocaleDateString()}</div>
                        {project.assignedFreelancerName && (
                            <div><strong className="font-medium text-gray-500">Assigned To:</strong> {project.assignedFreelancerName}</div>
                        )}
                        <div><strong className="font-medium text-gray-500">Total Time Logged:</strong> {formatDurationToHHMMSS(totalProjectMinutesLogged * 60)}</div>
                    </div>
                    {project.skillsRequired && project.skillsRequired.length > 0 && (
                        <div className="mb-6">
                            <h4 className="text-sm font-semibold text-gray-500 uppercase mb-2">Skills Required</h4>
                            <div className="flex flex-wrap gap-2">
                            {project.skillsRequired.map(skill => (
                                <span key={skill} className="px-3 py-1 bg-accent text-secondary text-xs font-semibold rounded-full">{skill}</span>
                            ))}
                            </div>
                        </div>
                    )}
                    <ProjectProgressBar jobCards={project.jobCards} projectStatus={project.status} />
                    {user && user.role === UserRole.FREELANCER && project.status === ProjectStatus.OPEN && !hasApplied && (
                        <div className="mt-8 pt-6 border-t border-gray-200">
                            <Button variant="primary" size="lg" onClick={handleApplyClick} isLoading={applying}>
                                Apply for this Project
                            </Button>
                        </div>
                    )}
                    {user && user.role === UserRole.FREELANCER && hasApplied && (
                        <div className="mt-8 pt-6 border-t border-gray-200">
                            <p className="text-green-600 bg-green-50 p-3 rounded-md font-semibold">You have applied for this project.</p>
                        </div>
                    )}
                </>
            )}

            {currentTab === 'tasks' && (
                <>
                    <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-semibold text-gray-700">Project Tasks / Job Cards</h3>
                    {isAdminView && project.status !== ProjectStatus.COMPLETED && project.status !== ProjectStatus.CANCELLED && (
                        <Button onClick={() => handleOpenJobCardModal()} leftIcon={<PlusIcon/>} variant="primary" size="sm">
                            Add Job Card
                        </Button>
                    )}
                    </div>
                    {project.jobCards && project.jobCards.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {project.jobCards.map(jc => (
                        <JobCardDisplay 
                            key={jc.id} jobCard={jc} project={project}
                            isAssignedToCurrentUser={!!user && user.role === UserRole.FREELANCER && (jc.assignedArchitectId === String(user.id) || (!jc.assignedArchitectId && project.assignedFreelancerId === String(user.id)))}
                            isAdminView={isAdminView}
                            onStatusUpdate={handleJobCardStatusUpdate}
                            onTimeLog={handleTimeLogSubmit}
                            onEditJobCard={handleOpenJobCardModal}
                            onDeleteJobCard={handleDeleteJobCard}
                            activeTimerJobCardId={activeTimerInfo?.jobCardId}
                            onStartTimer={startGlobalTimer}
                            onStopTimer={stopGlobalTimerAndLog}
                        />
                        ))}
                    </div>
                    ) : (
                        <p className="text-gray-500">No job cards have been added to this project yet. {isAdminView && project.status !== ProjectStatus.COMPLETED && project.status !== ProjectStatus.CANCELLED ? "You can add them now." : ""}</p>
                    )}
                </>
            )}

            {currentTab === 'messages' && (
                <div>
                    <h3 className="text-xl font-semibold text-gray-700 mb-4">Project Communication</h3>
                    <Button onClick={handleOpenProjectChat} leftIcon={<ChatBubbleLeftRightIcon />}>Open Project Chat</Button>
                    <p className="text-xs text-gray-500 mt-2">This will open the main messaging interface, attempting to filter for this project.</p>
                </div>
            )}

            {currentTab === 'files' && (
                 <div>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-semibold text-gray-700">Project Files</h3>
                        {(user?.role === UserRole.ADMIN || String(user?.id) === project.clientId || String(user?.id) === project.assignedFreelancerId ) && project.status !== ProjectStatus.COMPLETED && project.status !== ProjectStatus.CANCELLED && (
                            <Button onClick={() => setIsFileUploadModalOpen(true)} variant="primary" size="sm" leftIcon={<UploadIcon />}>Upload File</Button>
                        )}
                    </div>
                    {projectFiles.length > 0 ? (
                        <ul className="space-y-3">
                            {projectFiles.map(file => (
                                <li key={file.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md border hover:shadow-sm">
                                    <div className="flex items-center space-x-3 min-w-0">
                                        <img src={getMockFileIconPath(file.type)} alt={file.type} className="w-7 h-7 flex-shrink-0"/>
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-gray-800 truncate" title={file.name}>{file.name}</p>
                                            <p className="text-xs text-gray-500">
                                                Uploaded by {file.uploadedByName || 'Unknown User'} on {new Date(file.uploadedAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="space-x-2 flex-shrink-0">
                                        <a href={file.url} target="_blank" rel="noopener noreferrer" download={file.name}>
                                          <Button variant="ghost" size="sm" className="p-1" leftIcon={<DownloadIcon className="w-4 h-4"/>}>
                                              <span className="hidden sm:inline">Download</span>
                                          </Button>
                                        </a>
                                        {(isAdminView || String(user?.id) === file.uploadedBy) && project.status !== ProjectStatus.COMPLETED && project.status !== ProjectStatus.CANCELLED && (
                                            <Button variant="ghost" size="sm" onClick={() => handleFileDelete(file.id)} className="text-red-500 hover:text-red-700 p-1" leftIcon={<TrashIcon className="w-4 h-4"/>}>
                                                 <span className="hidden sm:inline">Delete</span>
                                            </Button>
                                        )}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-gray-500">No files uploaded for this project yet.</p>
                    )}
                    <Modal isOpen={isFileUploadModalOpen} onClose={() => {setIsFileUploadModalOpen(false); setSelectedFileForUpload(null);}} title="Upload File">
                        <input type="file" onChange={(e) => setSelectedFileForUpload(e.target.files ? e.target.files[0] : null)} className="mb-4 p-2 border rounded w-full"/>
                        {selectedFileForUpload && <p className="text-sm text-gray-600 mb-2">Selected: {selectedFileForUpload.name}</p>}
                        <Button onClick={handleFileUpload} disabled={!selectedFileForUpload || isSubmittingFile} isLoading={isSubmittingFile} className="mt-4">Upload Selected File</Button>
                    </Modal>
                </div>
            )}
            
            {isAdminView && currentTab === 'adminLogs' && allProjectTimeLogs.length > 0 && (
                <div className="mb-8 pt-6 border-t border-gray-200">
                    <h3 className="text-xl font-semibold text-gray-700 mb-4">Detailed Time Logs for Project</h3>
                    <div className="overflow-x-auto max-h-96 bg-gray-50 p-2 rounded-md">
                        <table className="min-w-full text-sm">
                            <thead className="bg-gray-100">
                                <tr>
                                    <th className="p-2 text-left font-medium text-gray-600">Task</th>
                                    <th className="p-2 text-left font-medium text-gray-600">Architect</th>
                                    <th className="p-2 text-left font-medium text-gray-600">Start</th>
                                    <th className="p-2 text-left font-medium text-gray-600">End</th>
                                    <th className="p-2 text-left font-medium text-gray-600">Duration</th>
                                    <th className="p-2 text-left font-medium text-gray-600">Notes</th>
                                    <th className="p-2 text-left font-medium text-gray-600">Manual</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {allProjectTimeLogs.map(log => (
                                    <tr key={log.id} className="hover:bg-gray-100">
                                        <td className="p-2 text-gray-700">{log.jobCardTitle}</td>
                                        <td className="p-2 text-gray-700">{log.architectName || log.architectId}</td>
                                        <td className="p-2 text-gray-700">{new Date(log.startTime).toLocaleString()}</td>
                                        <td className="p-2 text-gray-700">{new Date(log.endTime).toLocaleString()}</td>
                                        <td className="p-2 text-gray-700">{formatMinutesToHM(log.durationMinutes)}</td>
                                        <td className="p-2 text-gray-700 text-xs max-w-xs truncate" title={log.notes}>{log.notes || '-'}</td>
                                        <td className="p-2 text-gray-700">{log.manualEntry ? 'Yes' : 'No'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
            {isAdminView && currentTab === 'adminLogs' && allProjectTimeLogs.length === 0 && (
                <p className="text-gray-500">No time logs recorded for this project yet.</p>
            )}


        </div>
      </div>

       {isApplyModalOpen && project && ( 
         <Modal isOpen={isApplyModalOpen} onClose={handleCloseApplyModal} title={`Apply for: ${project.title}`} size="lg">
          <form onSubmit={handleSubmitApplication} className="space-y-4">
            <div><label htmlFor="proposal" className="block text-sm font-medium text-gray-700">Your Proposal</label>
              <textarea id="proposal" rows={5} value={proposal} onChange={(e) => setProposal(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Explain why you are a good fit for this project..." required />
            </div>
            <div><label htmlFor="bidAmount" className="block text-sm font-medium text-gray-700">Your Bid Amount (R)</label>
              <input type="number" id="bidAmount" value={bidAmount} onChange={(e) => setBidAmount(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder={`Project budget is R ${project.budget.toLocaleString()}`} required min="1" />
            </div>
            <div className="flex justify-end space-x-3 pt-4">
              <Button type="button" variant="secondary" onClick={handleCloseApplyModal} disabled={applying}>Cancel</Button>
              <Button type="submit" variant="primary" isLoading={applying} disabled={applying}>Submit Application</Button>
            </div>
          </form>
        </Modal>
        )}

        {isAdminView && isJobCardModalOpen && project && ( 
            <JobCardFormModal 
                isOpen={isJobCardModalOpen}
                onClose={() => { setIsJobCardModalOpen(false); setEditingJobCard(null); }}
                onSubmit={handleJobCardFormSubmit}
                editingJobCard={editingJobCard}
                projectAssignedFreelancerId={project?.assignedFreelancerId}
            />
        )}
    </div>
  );
};

export { ProjectDetailsPage as default };