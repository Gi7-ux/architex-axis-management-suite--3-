import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Project, ProjectStatus, Application, UserRole, JobCard, JobCardStatus, TimeLog, User, MessageStatus, ManagedFile, Conversation, Message } from '../../types';
import { 
    fetchProjectDetailsAPI, fetchApplicationsForProjectAPI, fetchProjectFilesAPI, submitApplicationAPI,
    createJobCardAPI,
    updateJobCardAPI,
    deleteJobCardAPI,
    fetchJobCardsForProjectAPI,
    // NEW Time Log APIs:
    logTimeAPI,
    fetchTimeLogsForJobCardAPI,
    fetchTimeLogsForProjectAPI,
    updateTimeLogAPI,
    deleteTimeLogAPI,
    uploadFileAPI, deleteFileAPI, findOrCreateConversationAPI, sendMessageAPI, ApiError as ApiErrorType, // Import ApiErrorType
    CreateJobCardPayload, UpdateJobCardPayload, JobCardPHPResponse,
    LogTimePayload,
    UpdateTimeLogPayload,
    TimeLogPHPResponse,
    ProjectApplicationPHPResponse // Ensure this is imported if used by fetchApplicationsForProjectAPI
} from '../../apiService';
import { NAV_LINKS, getMockFileIconPath, formatDurationToHHMMSS } from '../../constants';
import LoadingSpinner from './shared/LoadingSpinner';
import Button from './shared/Button';
import { useAuth } from './AuthContext';
import Modal from './shared/Modal';
import ErrorMessage from './shared/ErrorMessage'; // Import ErrorMessage
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
  onSubmit: (logData: Omit<TimeLog, 'id'|'jobCardId'|'architectId'|'createdAt'|'durationMinutes'|'manualEntry'> & {startTime: string, endTime: string, notes?:string}) => void;
  jobCardTitle: string;
  initialError?: ApiErrorType | string | null; // For passing error state
}

const ManualTimeLogModal: React.FC<TimeLogModalProps> = ({isOpen, onClose, onSubmit, jobCardTitle, initialError}) => {
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [startTime, setStartTime] = useState('09:00');
    const [endTime, setEndTime] = useState('10:00');
    const [notes, setNotes] = useState('');
    const [modalError, setModalError] = useState<ApiErrorType | string | null>(initialError || null);

    useEffect(() => { // Sync error from parent if it changes (e.g. new submit attempt)
      setModalError(initialError || null);
    }, [initialError]);

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => { setDate(e.target.value); if(modalError) setModalError(null); };
    const handleStartTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => { setStartTime(e.target.value); if(modalError) setModalError(null); };
    const handleEndTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => { setEndTime(e.target.value); if(modalError) setModalError(null); };
    const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => { setNotes(e.target.value); if(modalError) setModalError(null); };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setModalError(null); // Clear error on new submit attempt
        const startDateTime = new Date(`${date}T${startTime}`);
        const endDateTime = new Date(`${date}T${endTime}`);
        if (endDateTime <= startDateTime) {
            setModalError("End time must be after start time.");
            return;
        }
        
        onSubmit({ 
            startTime: startDateTime.toISOString(), 
            endTime: endDateTime.toISOString(), 
            notes: notes || undefined,
        });
        // Keep modal open on error, close on success (handled by parent)
        // If onSubmit itself can throw and be caught here, can setModalError based on that too.
        // For now, assuming parent handles close on success.
    };
    
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Log Time Manually for: ${jobCardTitle}`} size="md">
            <form onSubmit={handleSubmit} className="space-y-4">
                <ErrorMessage error={modalError} />
                <div>
                    <label htmlFor="logDate" className="block text-sm font-medium text-gray-700">Date</label>
                    <input type="date" id="logDate" value={date} onChange={handleDateChange} required
                           className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"/>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="logStartTime" className="block text-sm font-medium text-gray-700">Start Time</label>
                        <input type="time" id="logStartTime" value={startTime} onChange={handleStartTimeChange} required
                               className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"/>
                    </div>
                    <div>
                        <label htmlFor="logEndTime" className="block text-sm font-medium text-gray-700">End Time</label>
                        <input type="time" id="logEndTime" value={endTime} onChange={handleEndTimeChange} required
                               className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"/>
                    </div>
                </div>
                <div>
                    <label htmlFor="logNotes" className="block text-sm font-medium text-gray-700">Notes (Optional)</label>
                    <textarea id="logNotes" value={notes} onChange={handleNotesChange} rows={3}
                              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"/>
                </div>
                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 mt-4">
                    <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
                    <Button type="submit" variant="primary" size="md">Log Time</Button>
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
                <div className="flex justify-between items-start mb-2">
                    <h4 className="text-lg font-semibold text-gray-800 flex-grow pr-2">{jobCard.title}</h4>
                    {isAdminView && (
                        <div className="flex-shrink-0 space-x-1">
                            <Button variant="ghost" size="xs" onClick={() => onEditJobCard(jobCard)} className="p-1 text-gray-500 hover:text-primary" aria-label="Edit Task">
                                <EditIcon className="w-4 h-4"/>
                            </Button>
                            <Button variant="ghost" size="xs" onClick={() => onDeleteJobCard(jobCard.id)} className="text-red-500 hover:text-red-700 p-1" aria-label="Delete Task">
                                <TrashIcon className="w-4 h-4"/>
                            </Button>
                        </div>
                    )}
                </div>
                <p className="text-sm text-gray-600 mb-3 line-clamp-2 h-10">{jobCard.description}</p>
                <div className="text-xs text-gray-500 space-y-1 mb-3">
                    {jobCard.assignedArchitectName && <div>Assigned: <span className="font-medium text-gray-700">{jobCard.assignedArchitectName}</span></div>}
                    {jobCard.estimatedTime && <div>Est. Time: <span className="font-medium text-gray-700">{jobCard.estimatedTime}h</span></div>}
                    <div className="font-semibold text-gray-700">Logged: {formatMinutesToHM(totalMinutesLogged)}</div>
                </div>
            </div>

            {jobCard.timeLogs && jobCard.timeLogs.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                    <h5 className="text-xs font-semibold text-gray-600 mb-1.5">Logged Time:</h5>
                    <ul className="space-y-1 max-h-24 overflow-y-auto text-xs">
                        {jobCard.timeLogs.map(log => (
                            <li key={log.id} className="text-gray-700 p-1.5 bg-gray-100 rounded-md">
                                {new Date(log.startTime).toLocaleDateString()} ({formatMinutesToHM(log.durationMinutes)})
                                {log.notes && <span className="italic truncate block text-gray-500" title={log.notes}> - {log.notes}</span>}
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
                        className="block w-full p-1.5 text-xs border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary bg-gray-50">
                        {Object.values(JobCardStatus).map(status => (
                            <option key={status} value={status}>{status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>
                        ))}
                    </select>
                </div>
                {canLogTime && isAssignedToCurrentUser && ( 
                    <div className="flex flex-wrap gap-2 items-center mt-2">
                        {!isTimerActiveForThisCard && !auth.activeTimerInfo && (
                            <Button size="sm" variant="outline" onClick={handleStartClick} leftIcon={<PlayIcon/>}>Start Timer</Button>
                        )}
                        {isTimerActiveForThisCard && (
                             <Button size="sm" variant="danger" onClick={handleStopClick} leftIcon={<StopIcon/>}>Stop Timer</Button>
                        )}
                        {!isTimerActiveForThisCard && auth.activeTimerInfo && ( // Another timer is active globally
                            <Button size="sm" variant="outline" disabled={true} leftIcon={<PlayIcon/>}>Start Timer</Button>
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
    initialError?: ApiErrorType | string | null;
}

const JobCardFormModal: React.FC<JobCardFormModalProps> = ({ isOpen, onClose, onSubmit, editingJobCard, projectAssignedFreelancerId, initialError }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [estimatedTime, setEstimatedTime] = useState<number | string>('');
    const [assignedArchitectId, setAssignedArchitectId] = useState<string | undefined>(projectAssignedFreelancerId);
    const [status, setStatus] = useState<JobCardStatus>(JobCardStatus.TODO);
    const [modalError, setModalError] = useState<ApiErrorType | string | null>(initialError || null);

    useEffect(() => {
        setModalError(initialError || null);
        if (isOpen) { // Reset form only when modal opens or editingJobCard changes
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
        }
    }, [editingJobCard, isOpen, projectAssignedFreelancerId, initialError]);

    const handleFormInputChange = (setter: React.Dispatch<React.SetStateAction<any>>) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setter(e.target.value);
        if (modalError) setModalError(null);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setModalError(null);
        if (!title.trim()) {
            setModalError("Title is required.");
            return;
        }
        onSubmit({ 
            title, 
            description, 
            estimatedTime: estimatedTime ? Number(estimatedTime) : undefined,
            assignedArchitectId: assignedArchitectId,
            status
        });
        // Parent handles close on success
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={editingJobCard ? "Edit Task" : "Add New Task"} size="lg">
            <form onSubmit={handleSubmit} className="space-y-4">
                <ErrorMessage error={modalError} />
                <div>
                    <label htmlFor="jcTitle" className="block text-sm font-medium text-gray-700">Title</label>
                    <input type="text" id="jcTitle" value={title} onChange={handleFormInputChange(setTitle)} required
                           className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"/>
                </div>
                <div>
                    <label htmlFor="jcDescription" className="block text-sm font-medium text-gray-700">Description</label>
                    <textarea id="jcDescription" value={description} onChange={handleFormInputChange(setDescription)} rows={3}
                              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"/>
                </div>
                <div>
                    <label htmlFor="jcEstTime" className="block text-sm font-medium text-gray-700">Estimated Time (hours)</label>
                    <input type="number" id="jcEstTime" value={estimatedTime} onChange={handleFormInputChange(setEstimatedTime)} min="0" step="0.5"
                           className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"/>
                </div>
                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 mt-4">
                    <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
                    <Button type="submit" variant="primary" size="md">{editingJobCard ? "Save Changes" : "Add Task"}</Button>
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
  const location = useLocation();
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState<ApiErrorType | string | null>(null); // Main page error
  const [currentTab, setCurrentTab] = useState<ProjectDetailTab>('details');

  // Modal specific error states
  const [applyError, setApplyError] = useState<ApiErrorType | string | null>(null);
  const [jobCardModalError, setJobCardModalError] = useState<ApiErrorType | string | null>(null);
  const [fileUploadError, setFileUploadError] = useState<ApiErrorType | string | null>(null);
  const [timeLogError, setTimeLogError] = useState<ApiErrorType | string | null>(null); // For ManualTimeLogModal or general time log actions

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
  const [isManualLogModalOpen, setIsManualLogModalOpenForCardId] = useState<string | null>(null); // Stores ID of job card to log time for



  const loadProjectDetails = useCallback(async () => {
    if (!projectId) { setPageError("Project ID is missing."); setIsLoading(false); return; }
    setIsLoading(true);
    setPageError(null);
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
        setPageError("Project not found.");
        setProject(null);
      }
    } catch (err) {
        console.error("Error loading project details:", err);
        if (err instanceof ApiErrorType) setPageError(err);
        else if (err instanceof Error) setPageError(err.message);
        else setPageError("Failed to load project details. Please try again.");
        setProject(null);
    } finally { setIsLoading(false); }
  }, [projectId, user]); // user dependency for hasApplied logic

  useEffect(() => { loadProjectDetails(); }, [loadProjectDetails, activeTimerInfo?.jobCardId]);
  
  const handleOpenJobCardModal = (jobCardToEdit: JobCard | null = null) => {
    setJobCardModalError(null); // Clear previous errors
    setEditingJobCard(jobCardToEdit);
    setIsJobCardModalOpen(true);
  };

  const handleJobCardFormSubmit = async (
      formData: Omit<JobCard, 'id' | 'createdAt' | 'updatedAt' | 'projectId' | 'status' | 'assignedArchitectName' | 'timeLogs' | 'actualTimeLogged'> & {status?: JobCardStatus}
    ) => {
    if (!project || !projectId) return;
    setJobCardModalError(null);
    try {
      if (editingJobCard) {
        const payload: UpdateJobCardPayload = { /* ... */ title: formData.title, description: formData.description || null, status: formData.status ? formData.status.toLowerCase().replace('_', '-') : undefined, assigned_freelancer_id: formData.assignedArchitectId ? parseInt(formData.assignedArchitectId, 10) : null, estimated_hours: formData.estimatedTime !== undefined ? Number(formData.estimatedTime) : null};
        await updateJobCardAPI(editingJobCard.id, payload);
      } else {
        const payload: CreateJobCardPayload = { /* ... */ project_id: parseInt(projectId, 10), title: formData.title, description: formData.description || null, status: formData.status ? formData.status.toLowerCase().replace('_', '-') : 'todo', assigned_freelancer_id: formData.assignedArchitectId ? parseInt(formData.assignedArchitectId, 10) : (project.assignedFreelancerId ? parseInt(project.assignedFreelancerId, 10) : null), estimated_hours: formData.estimatedTime !== undefined ? Number(formData.estimatedTime) : null};
        await createJobCardAPI(payload);
      }
      await loadProjectDetails(); // Refresh data
      setIsJobCardModalOpen(false); // Close modal on success
      setEditingJobCard(null);
    } catch (err) {
        console.error("Failed to save job card:", err);
        if (err instanceof ApiErrorType) setJobCardModalError(err);
        else if (err instanceof Error) setJobCardModalError(err.message);
        else setJobCardModalError("Failed to save job card.");
    }
  };

  const handleDeleteJobCard = async (jobCardId: string) => {
    if (!project || !projectId) return;
    if (window.confirm("Are you sure you want to delete this job card? This action cannot be undone.")) {
      setPageError(null);
      try {
        await deleteJobCardAPI(jobCardId);
        await loadProjectDetails(); // Refresh
      } catch (err) {
          console.error("Failed to delete job card:", err);
          if (err instanceof ApiErrorType) setPageError(err);
          else if (err instanceof Error) setPageError(err.message);
          else setPageError("Failed to delete job card.");
      }
    }
  };

  const handleJobCardStatusUpdate = async (jobCardId: string, newStatus: JobCardStatus) => {
    setPageError(null);
    try {
      const payload: UpdateJobCardPayload = { status: newStatus.toLowerCase().replace('_', '-') };
      await updateJobCardAPI(jobCardId, payload);
      loadProjectDetails(); // Refresh
    } catch (err) {
        console.error("Failed to update job card status:", err); 
        if (err instanceof ApiErrorType) setPageError(err);
        else if (err instanceof Error) setPageError(err.message);
        else setPageError("Failed to update status.");
    }
  };

  const handleOpenManualLogModal = (jobCardId: string) => {
    setTimeLogError(null); // Clear previous errors for this modal instance
    setIsManualLogModalOpenForCardId(jobCardId);
  };

  const handleTimeLogSubmit = async (
      jobCardIdToLog: string,
      logDataFromModal: Omit<TimeLog, 'id'|'jobCardId'|'architectId'|'createdAt'|'durationMinutes'|'manualEntry'> & {startTime: string, endTime: string, notes?:string}
  ) => {
    if (!user) return;
    setTimeLogError(null);
    const payload: LogTimePayload = { /* ... */ job_card_id: parseInt(jobCardIdToLog, 10), start_time: logDataFromModal.startTime, end_time: logDataFromModal.endTime, notes: logDataFromModal.notes || null };
    try {
      await logTimeAPI(payload);
      loadProjectDetails(); // Refresh
      setIsManualLogModalOpenForCardId(null); // Close modal on success
    } catch (err) {
        console.error("Failed to log time:", err);
        if (err instanceof ApiErrorType) setTimeLogError(err);
        else if (err instanceof Error) setTimeLogError(err.message);
        else setTimeLogError("Failed to log time.");
    }
  };

  const handleApplyClick = () => {
    if (!project) return;
    setApplyError(null); // Clear previous errors
    setBidAmount(project.budget * 0.9);
    setProposal('');
    setIsApplyModalOpen(true);
   };
  const handleCloseApplyModal = () => { setIsApplyModalOpen(false); setApplyError(null); /* Keep form data for re-edit? */ };

  const handleSubmitApplication = async (e: React.FormEvent) => { 
    e.preventDefault();
    if (!project || !user || !proposal || !bidAmount) {
        setApplyError("Proposal and Bid Amount are required.");
        return;
    }
    setApplying(true);
    setApplyError(null);
    try {
      await submitApplicationAPI({ project_id: parseInt(project.id, 10), proposal_text: proposal, bid_amount: Number(bidAmount) });
      setHasApplied(true);
      alert(`Application submitted for ${project.title}.`); // Keep alert for direct user feedback
      await loadProjectDetails(); 
      handleCloseApplyModal();
    } catch (err) {
        console.error("Failed to submit application:", err);
        if (err instanceof ApiErrorType) setApplyError(err);
        else if (err instanceof Error) setApplyError(err.message);
        else setApplyError("Failed to submit application. Please try again.");
    } finally { 
        setApplying(false); 
    }
  };

  const totalProjectMinutesLogged = project?.jobCards?.reduce((projectSum, jc) => 
    projectSum + (jc.timeLogs?.reduce((cardSum, log) => cardSum + log.durationMinutes, 0) || 0), 0) || 0;

  const handleOpenProjectChat = async () => {
    if (!project || !user) return;
    // Ensure all IDs are strings for findOrCreateConversationAPI if it expects string[]
    const participantIds = Array.from(new Set([
        String(user.id),
        String(project.clientId),
        project.assignedFreelancerId ? String(project.assignedFreelancerId) : undefined,
        project.adminCreatorId ? String(project.adminCreatorId) : undefined
    ].filter(Boolean) as string[]));
    
    setPageError(null);
    try {
        const conversation = await findOrCreateConversationAPI(participantIds, project.id); // Assuming backend handles project_id in this call
        navigate(NAV_LINKS.MESSAGES, { state: { conversationId: conversation.id }});
    } catch (err) {
        console.error("Chat creation/navigation error:", err);
        if (err instanceof ApiErrorType) setPageError(err);
        else if (err instanceof Error) setPageError(err.message);
        else setPageError("Could not open or create chat for this project.");
    }
  };
  
  const handleRequestStatusUpdate = async () => {
    if (!project || !user || user.role !== UserRole.CLIENT) return;
    const participantIds = [
        String(user.id),
        project.assignedFreelancerId ? String(project.assignedFreelancerId) : undefined,
        project.adminCreatorId ? String(project.adminCreatorId) : undefined
    ].filter(Boolean) as string[];
    try {
        const conversation = await findOrCreateConversationAPI(participantIds, project.id);
        await sendMessageAPI(conversation.id, {
            senderId: String(user.id), // Ensure senderId is string if API expects that
            content: `Client ${user.username} requests a status update for project '${project.title}'.`,
        });
        alert("Status update request sent via messages."); // Keep alert for direct feedback
        navigate(NAV_LINKS.MESSAGES, { state: { conversationId: conversation.id } });
    } catch (err) {
        console.error("Status update request error:", err);
        if (err instanceof ApiErrorType) setPageError(err);
        else if (err instanceof Error) setPageError(err.message);
        else setPageError("Failed to send status update request.");
    }
  };
  
  const handleFileUpload = async () => {
    if(!project || !user || !selectedFileForUpload) return;
    setIsSubmittingFile(true);
    const formData = new FormData();
    formData.append('file', selectedFileForUpload);
    formData.append('projectId', project.id);
    setFileUploadError(null);
    formData.append('uploaderId', String(user.id));

    try {
        await uploadFileAPI(project.id, formData);
        alert("File uploaded successfully."); // Keep alert for direct feedback
        await loadProjectDetails(); 
        setIsFileUploadModalOpen(false);
        setSelectedFileForUpload(null);
    } catch (err) {
        console.error("File upload failed:", err);
        if (err instanceof ApiErrorType) setFileUploadError(err);
        else if (err instanceof Error) setFileUploadError(err.message);
        else setFileUploadError("File upload failed.");
    } finally {
        setIsSubmittingFile(false);
    }
  };

  const handleFileDelete = async (fileId: string) => {
    if(window.confirm("Are you sure you want to delete this file? This action cannot be undone.")) {
        setPageError(null);
        try {
            await deleteFileAPI(fileId);
            await loadProjectDetails(); 
        } catch (err) {
            console.error("File deletion failed:", err);
            if (err instanceof ApiErrorType) setPageError(err);
            else if (err instanceof Error) setPageError(err.message);
            else setPageError("File deletion failed.");
        }
    }
  };

  const currentJobCardForManualLog = project?.jobCards?.find(jc => jc.id === isManualLogModalOpenForCardId);


  if (isLoading) return <div className="flex justify-center items-center h-[calc(100vh-4rem)]"><LoadingSpinner text="Loading project details..." size="lg" /></div>;
  // Display pageError if it exists (and not for initial loading if project is null)
  if (pageError && project) { /* Error occurred after initial load */ }
  else if (pageError && !project) { // Initial load error
    return <div className="container mx-auto p-4 md:p-6"><ErrorMessage error={pageError} /></div>;
  }
  if (!project) return <div className="p-6 text-center text-gray-600 text-xl bg-gray-50 rounded-lg">Project data could not be loaded or found.</div>;
  
  const getStatusColor = (status: ProjectStatus | string) => {
    switch (status) {
      case ProjectStatus.PENDING_APPROVAL: return 'text-orange-700 bg-orange-100 border-orange-300';
      case ProjectStatus.OPEN: return 'text-green-700 bg-green-100 border-green-300';
      case ProjectStatus.IN_PROGRESS: return 'text-yellow-700 bg-yellow-100 border-yellow-300';
      case ProjectStatus.COMPLETED: return 'text-blue-700 bg-blue-100 border-blue-300';
      case ProjectStatus.CANCELLED: return 'text-red-700 bg-red-100 border-red-300';
      default: return 'text-gray-700 bg-gray-100 border-gray-300';
    }
  };

  const tabButtonClasses = (tabName: ProjectDetailTab) => 
    `px-4 py-3 font-medium text-sm rounded-t-md transition-colors focus:outline-none -mb-px border-b-2
     ${currentTab === tabName 
        ? 'border-primary text-primary bg-white shadow-sm'
        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`;

  return (
    <div className="container mx-auto p-4 md:p-6">
      <Button
        onClick={() => location.state?.from ? navigate(location.state.from) : navigate(-1)}
        variant="ghost"
        size="sm"
        className="mb-6 text-gray-600 hover:text-primary"
        leftIcon={<ArrowLeftIcon />}
      >
        Back
      </Button>
      {pageError && <ErrorMessage error={pageError} />} {/* Display page-level action errors */}
      <div className="bg-white shadow-xl rounded-lg overflow-hidden">
        <div className="p-6 md:p-8 border-b border-gray-200">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-3">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 leading-tight mb-2 md:mb-0">{project.title}</h1>
            <span className={`px-3 py-1.5 text-xs font-semibold rounded-full border ${getStatusColor(project.status)}`}>
              {project.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </span>
          </div>
          
          <div className="mb-4 text-sm text-gray-500">
            Posted on: {new Date(project.createdAt).toLocaleDateString()} by {project.clientName || 'Unknown Client'}
            {project.adminCreatorId && ` (Managed by Admin ID: ${project.adminCreatorId})`}
          </div>

          {user?.role === UserRole.CLIENT && project.status === ProjectStatus.IN_PROGRESS && (
            <Button onClick={handleRequestStatusUpdate} variant="outline" size="sm" className="mb-4" leftIcon={<ChatBubbleLeftRightIcon className="w-4 h-4"/>}>
                Request Status Update
            </Button>
          )}

        </div>
        
        <div className="border-b border-gray-200 px-6 md:px-8 bg-gray-50">
            <nav className="flex space-x-1 flex-wrap -mb-px">
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
                    <h2 className="text-xl font-semibold text-gray-800 mb-3">Project Description</h2>
                    <p className="text-gray-700 text-base leading-relaxed mb-6 whitespace-pre-line bg-gray-50 p-4 rounded-md border border-gray-200">
                        {project.description}
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4 mb-6 text-gray-700">
                        <div><strong className="font-medium text-gray-500 block text-sm">Budget:</strong> <span className="text-base">R {project.budget.toLocaleString()}</span></div>
                        <div><strong className="font-medium text-gray-500 block text-sm">Deadline:</strong> <span className="text-base">{new Date(project.deadline).toLocaleDateString()}</span></div>
                        {project.assignedFreelancerName && (
                            <div><strong className="font-medium text-gray-500 block text-sm">Assigned To:</strong> <span className="text-base">{project.assignedFreelancerName}</span></div>
                        )}
                        <div><strong className="font-medium text-gray-500 block text-sm">Total Time Logged:</strong> <span className="text-base">{formatDurationToHHMMSS(totalProjectMinutesLogged * 60)}</span></div>
                    </div>
                    {project.skillsRequired && project.skillsRequired.length > 0 && (
                        <div className="mb-6">
                            <h3 className="text-lg font-semibold text-gray-800 mb-2">Skills Required</h3>
                            <div className="flex flex-wrap gap-2">
                            {project.skillsRequired.map(skill => (
                                <span key={skill} className="px-3 py-1 bg-primary-extralight text-primary text-xs font-semibold rounded-full border border-primary-light">{skill}</span>
                            ))}
                            </div>
                        </div>
                    )}
                    <ProjectProgressBar jobCards={project.jobCards} projectStatus={project.status} />
                    {user && user.role === UserRole.FREELANCER && project.status === ProjectStatus.OPEN && !hasApplied && (
                        <div className="mt-8 pt-6 border-t border-gray-200">
                            <Button variant="primary" size="lg" onClick={handleApplyClick} isLoading={applying} className="w-full sm:w-auto">
                                Apply for this Project
                            </Button>
                        </div>
                    )}
                    {user && user.role === UserRole.FREELANCER && hasApplied && (
                        <div className="mt-8 pt-6 border-t border-gray-200">
                            <p className="text-green-700 bg-green-100 p-3 rounded-md font-semibold border border-green-200">You have applied for this project.</p>
                        </div>
                    )}
                </>
            )}

            {currentTab === 'tasks' && (
                <>
                    <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-semibold text-gray-800">Project Tasks</h2>
                    {isAdminView && project.status !== ProjectStatus.COMPLETED && project.status !== ProjectStatus.CANCELLED && (
                        <Button onClick={() => handleOpenJobCardModal()} leftIcon={<PlusIcon/>} variant="primary" size="sm">
                            Add Task
                        </Button>
                    )}
                    </div>
                     {/* Error display for job card list actions can be here if needed, or rely on pageError above */}
                    {project.jobCards && project.jobCards.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {project.jobCards.map(jc => (
                        <JobCardDisplay 
                            key={jc.id} jobCard={jc} project={project}
                            isAssignedToCurrentUser={!!user && user.role === UserRole.FREELANCER && (jc.assignedArchitectId === String(user.id) || (!jc.assignedArchitectId && project.assignedFreelancerId === String(user.id)))}
                            isAdminView={isAdminView}
                            onStatusUpdate={handleJobCardStatusUpdate}
                            onTimeLog={() => handleOpenManualLogModal(jc.id)} // Updated to open modal
                            onEditJobCard={handleOpenJobCardModal}
                            onDeleteJobCard={handleDeleteJobCard}
                            activeTimerJobCardId={activeTimerInfo?.jobCardId}
                            onStartTimer={startGlobalTimer}
                            onStopTimer={stopGlobalTimerAndLog}
                        />
                        ))}
                    </div>
                    ) : (
                        <p className="text-gray-600 bg-gray-50 p-4 rounded-md border">No tasks have been added to this project yet. {isAdminView && project.status !== ProjectStatus.COMPLETED && project.status !== ProjectStatus.CANCELLED ? "You can add them now." : ""}</p>
                    )}
                </>
            )}

            {currentTab === 'messages' && (
                <div>
                    <h2 className="text-xl font-semibold text-gray-800 mb-4">Project Communication</h2>
                    <Button onClick={handleOpenProjectChat} leftIcon={<ChatBubbleLeftRightIcon />} variant="primary" size="md">Open Project Chat</Button>
                    <p className="text-sm text-gray-500 mt-2">This will open the main messaging interface for this project.</p>
                </div>
            )}

            {currentTab === 'files' && (
                 <div>
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-semibold text-gray-800">Project Files</h2>
                        {(user?.role === UserRole.ADMIN || String(user?.id) === project.clientId || String(user?.id) === project.assignedFreelancerId ) && project.status !== ProjectStatus.COMPLETED && project.status !== ProjectStatus.CANCELLED && (
                            <Button onClick={() => setIsFileUploadModalOpen(true)} variant="primary" size="sm" leftIcon={<UploadIcon />}>Upload File</Button>
                        )}
                    </div>
                    {projectFiles.length > 0 ? (
                        <ul className="space-y-3">
                            {projectFiles.map(file => (
                                <li key={file.id} className="flex items-center justify-between p-3 bg-white rounded-lg shadow-md border border-gray-200 hover:shadow-lg transition-shadow">
                                    <div className="flex items-center space-x-3 min-w-0">
                                        <img src={getMockFileIconPath(file.type)} alt={file.type} className="w-8 h-8 flex-shrink-0"/>
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-gray-800 truncate" title={file.name}>{file.name}</p>
                                            <p className="text-xs text-gray-500">
                                                Uploaded by {file.uploadedByName || 'Unknown User'} on {new Date(file.uploadedAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="space-x-2 flex-shrink-0">
                                        <Button asLink href={file.url} target="_blank" rel="noopener noreferrer" download={file.name} variant="ghost" size="sm" className="p-1 text-gray-600 hover:text-primary" leftIcon={<DownloadIcon/>}>
                                            <span className="hidden sm:inline ml-1">Download</span>
                                        </Button>
                                        {(isAdminView || String(user?.id) === file.uploadedBy) && project.status !== ProjectStatus.COMPLETED && project.status !== ProjectStatus.CANCELLED && (
                                            <Button variant="ghost" size="sm" onClick={() => handleFileDelete(file.id)} className="text-red-500 hover:text-red-700 p-1" leftIcon={<TrashIcon/>}>
                                                 <span className="hidden sm:inline ml-1">Delete</span>
                                            </Button>
                                        )}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-gray-600 bg-gray-50 p-4 rounded-md border">No files uploaded for this project yet.</p>
                    )}
                    <Modal isOpen={isFileUploadModalOpen} onClose={() => {setIsFileUploadModalOpen(false); setSelectedFileForUpload(null); setFileUploadError(null);}} title="Upload New File to Project">
                        <ErrorMessage error={fileUploadError} />
                        <input type="file" onChange={(e) => {setSelectedFileForUpload(e.target.files ? e.target.files[0] : null); setFileUploadError(null);}} className="mb-4 p-2 border border-gray-300 rounded-md w-full focus:ring-primary focus:border-primary"/>
                        {selectedFileForUpload && <p className="text-sm text-gray-600 mb-3">Selected: {selectedFileForUpload.name} ({(selectedFileForUpload.size / 1024).toFixed(2)} KB)</p>}
                        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 mt-4">
                            <Button variant="ghost" onClick={() => {setIsFileUploadModalOpen(false); setSelectedFileForUpload(null); setFileUploadError(null);}} disabled={isSubmittingFile}>Cancel</Button>
                            <Button onClick={handleFileUpload} disabled={!selectedFileForUpload || isSubmittingFile} isLoading={isSubmittingFile} variant="primary" size="md">Upload File</Button>
                        </div>
                    </Modal>
                </div>
            )}
            
            {isAdminView && currentTab === 'adminLogs' && allProjectTimeLogs.length > 0 && (
                <div className="mb-8 pt-6">
                    <h2 className="text-xl font-semibold text-gray-800 mb-4">Detailed Time Logs</h2>
                    <div className="overflow-x-auto max-h-[500px] bg-white p-1 rounded-md border border-gray-200 shadow-sm">
                        <table className="min-w-full text-sm">
                            <thead className="bg-gray-100 sticky top-0">
                                <tr>
                                    <th className="p-2.5 text-left font-semibold text-gray-600">Task</th>
                                    <th className="p-2.5 text-left font-semibold text-gray-600">Architect</th>
                                    <th className="p-2.5 text-left font-semibold text-gray-600">Start</th>
                                    <th className="p-2.5 text-left font-semibold text-gray-600">End</th>
                                    <th className="p-2.5 text-left font-semibold text-gray-600">Duration</th>
                                    <th className="p-2.5 text-left font-semibold text-gray-600">Notes</th>
                                    <th className="p-2.5 text-left font-semibold text-gray-600">Manual</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {allProjectTimeLogs.map(log => (
                                    <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="p-2.5 text-gray-700">{log.jobCardTitle}</td>
                                        <td className="p-2.5 text-gray-700">{log.architectName || log.architectId}</td>
                                        <td className="p-2.5 text-gray-700">{new Date(log.startTime).toLocaleString()}</td>
                                        <td className="p-2.5 text-gray-700">{new Date(log.endTime).toLocaleString()}</td>
                                        <td className="p-2.5 text-gray-700">{formatMinutesToHM(log.durationMinutes)}</td>
                                        <td className="p-2.5 text-gray-600 text-xs max-w-xs truncate" title={log.notes}>{log.notes || '-'}</td>
                                        <td className="p-2.5 text-gray-700">{log.manualEntry ? 'Yes' : 'No'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
            {isAdminView && currentTab === 'adminLogs' && allProjectTimeLogs.length === 0 && (
                <p className="text-gray-600 bg-gray-50 p-4 rounded-md border">No time logs recorded for this project yet.</p>
            )}


        </div>
      </div>

       {isApplyModalOpen && project && ( 
         <Modal isOpen={isApplyModalOpen} onClose={handleCloseApplyModal} title={`Apply for: ${project.title}`} size="lg">
          <form onSubmit={handleSubmitApplication} className="space-y-4">
            <ErrorMessage error={applyError} />
            <div><label htmlFor="proposal" className="block text-sm font-medium text-gray-700">Your Proposal</label>
              <textarea id="proposal" rows={5} value={proposal} onChange={(e) => {setProposal(e.target.value); if(applyError) setApplyError(null);}}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                placeholder="Explain why you are a good fit for this project..." required />
            </div>
            <div><label htmlFor="bidAmount" className="block text-sm font-medium text-gray-700">Your Bid Amount (R)</label>
              <input type="number" id="bidAmount" value={bidAmount} onChange={(e) => {setBidAmount(e.target.value); if(applyError) setApplyError(null);}}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                placeholder={`Project budget is R ${project.budget.toLocaleString()}`} required min="1" />
            </div>
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 mt-4">
              <Button type="button" variant="ghost" onClick={handleCloseApplyModal} disabled={applying}>Cancel</Button>
              <Button type="submit" variant="primary" size="md" isLoading={applying} disabled={applying}>Submit Application</Button>
            </div>
          </form>
        </Modal>
        )}

        {isAdminView && isJobCardModalOpen && project && ( 
            <JobCardFormModal 
                isOpen={isJobCardModalOpen}
                onClose={() => { setIsJobCardModalOpen(false); setEditingJobCard(null); setJobCardModalError(null); }}
                onSubmit={handleJobCardFormSubmit}
                editingJobCard={editingJobCard}
                projectAssignedFreelancerId={project?.assignedFreelancerId}
                initialError={jobCardModalError}
            />
        )}
        {isManualLogModalOpenForCardId && currentJobCardForManualLog && (
            <ManualTimeLogModal
                isOpen={!!isManualLogModalOpenForCardId}
                onClose={() => {setIsManualLogModalOpenForCardId(null); setTimeLogError(null);}}
                onSubmit={(logData) => handleTimeLogSubmit(isManualLogModalOpenForCardId, logData)}
                jobCardTitle={currentJobCardForManualLog.title}
                initialError={timeLogError}
            />
        )}
    </div>
  );
};

export { ProjectDetailsPage as default };