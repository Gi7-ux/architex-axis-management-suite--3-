import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { JobCard, Project, JobCardStatus, UserRole, ProjectStatus, TimeLog } from '../../types';
import { fetchFreelancerJobCardsAPI, updateJobCardStatusAPI, addTimeLogAPI } from '../../apiService';
import { NAV_LINKS, formatDurationToHHMMSS } from '../../constants'; 
import { useAuth } from '../AuthContext';
import LoadingSpinner from '../shared/LoadingSpinner';
import Button from '../shared/Button';
import { ClockIcon, CheckCircleIcon, ListBulletIcon, PlayIcon, StopIcon, PlusIcon, EyeIcon } from '../shared/IconComponents';
import Modal from '../shared/Modal';


interface ManualTimeLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (log: Omit<TimeLog, 'id' | 'jobCardId' | 'architectId' | 'createdAt'>) => void;
  jobCardTitle: string;
}

const ManualTimeLogModal: React.FC<ManualTimeLogModalProps> = ({isOpen, onClose, onSubmit, jobCardTitle}) => {
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [startTime, setStartTime] = useState('09:00');
    const [endTime, setEndTime] = useState('10:00');
    const [notes, setNotes] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const startDateTime = new Date(`${date}T${startTime}`);
        const endDateTime = new Date(`${date}T${endTime}`);
        if (endDateTime <= startDateTime) {
            alert("End time must be after start time."); return;
        }
        const durationMinutes = (endDateTime.getTime() - startDateTime.getTime()) / (1000 * 60);
        
        onSubmit({ 
            startTime: startDateTime.toISOString(), endTime: endDateTime.toISOString(), 
            durationMinutes, notes, manualEntry: true 
        });
        onClose();
    };
    
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Log Time Manually for: ${jobCardTitle}`} size="md">
            <form onSubmit={handleSubmit} className="space-y-4">
                 <div>
                    <label htmlFor="logDateMyJC" className="block text-sm font-medium text-gray-700">Date</label>
                    <input type="date" id="logDateMyJC" value={date} onChange={e => setDate(e.target.value)} required
                           className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm"/>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="logStartTimeMyJC" className="block text-sm font-medium text-gray-700">Start Time</label>
                        <input type="time" id="logStartTimeMyJC" value={startTime} onChange={e => setStartTime(e.target.value)} required
                               className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm"/>
                    </div>
                    <div>
                        <label htmlFor="logEndTimeMyJC" className="block text-sm font-medium text-gray-700">End Time</label>
                        <input type="time" id="logEndTimeMyJC" value={endTime} onChange={e => setEndTime(e.target.value)} required
                               className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm"/>
                    </div>
                </div>
                <div>
                    <label htmlFor="logNotesMyJC" className="block text-sm font-medium text-gray-700">Notes (Optional)</label>
                    <textarea id="logNotesMyJC" value={notes} onChange={e => setNotes(e.target.value)} rows={3}
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


interface EnrichedJobCard extends JobCard {
  projectName: string; // Will need to be populated if API returns raw job cards
  projectStatus: ProjectStatus; // Same as above
}

const MyJobCards: React.FC = () => {
  const { user, activeTimerInfo, startGlobalTimer, stopGlobalTimerAndLog } = useAuth();
  const [assignedJobCards, setAssignedJobCards] = useState<EnrichedJobCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<JobCardStatus | 'All'>('All');
  const [manualLogTargetCard, setManualLogTargetCard] = useState<EnrichedJobCard | null>(null);
  const [error, setError] = useState<string | null>(null);


  const loadJobCards = useCallback(async () => {
    if (!user || user.role !== UserRole.FREELANCER) {
      setAssignedJobCards([]); setIsLoading(false); return;
    }
    setIsLoading(true);
    setError(null);
    try {
        let cards = await fetchFreelancerJobCardsAPI(user.id);
        // Assuming API returns EnrichedJobCard or we enrich it here if necessary
        // For now, assume API returns JobCard and we might need to fetch project details separately for name/status
        // Or the backend API for /users/{freelancerId}/jobcards already denormalizes this.
        // For this example, let's assume they are already enriched or the API handles it.

        cards.sort((a, b) => { 
            const statusOrder = [JobCardStatus.IN_PROGRESS, JobCardStatus.TODO, JobCardStatus.PENDING_REVIEW, JobCardStatus.COMPLETED];
            if (statusOrder.indexOf(a.status) !== statusOrder.indexOf(b.status)) {
                return statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status);
            }
            return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        });
        setAssignedJobCards(cards as EnrichedJobCard[]); // Cast if API returns base JobCard
    } catch (err: any) {
        console.error("Failed to load job cards:", err);
        setError(err.message || "Could not load your job cards. Please try again.");
    } finally {
        setIsLoading(false);
    }
  }, [user]);

  useEffect(() => { loadJobCards(); }, [loadJobCards, activeTimerInfo?.jobCardId]); // Reload if active timer changes

  const handleStatusUpdate = async (projectId: string, jobCardId: string, newStatus: JobCardStatus) => {
    try {
        await updateJobCardStatusAPI(projectId, jobCardId, newStatus);
        loadJobCards(); 
    } catch (err: any) {
        alert(err.message || "Error updating task status.");
        console.error("Failed to update status", err);
    }
  };

  const handleTimeLogSubmit = async (projectId: string, jobCardId: string, timeLogData: Omit<TimeLog, 'id'|'createdAt' | 'jobCardId' | 'architectId'>) => {
    if (!user) return;
    const fullTimeLogData: Omit<TimeLog, 'id'|'createdAt'> = {
        ...timeLogData, jobCardId: jobCardId, architectId: user.id,
    };
    try {
        await addTimeLogAPI(projectId, jobCardId, fullTimeLogData);
        loadJobCards(); 
    } catch (err: any) {
        alert(err.message || "Failed to log time.");
        console.error("Failed to log time", err);
    }
    setManualLogTargetCard(null);
  };

  const handleStartTimerClick = (jobCard: EnrichedJobCard) => {
    startGlobalTimer(jobCard.id, jobCard.title, jobCard.projectId);
  };

  const handleStopTimerClick = async () => { 
    const notes = prompt("Optional notes for this time entry (or leave blank):");
    await stopGlobalTimerAndLog(notes || undefined);
    // loadJobCards(); // AuthContext activeTimerInfo change triggers reload
  };
  
  const getStatusChip = (status: JobCardStatus, small: boolean = false) => {
    let colorClasses = '';
    switch (status) {
        case JobCardStatus.TODO: colorClasses = 'bg-gray-100 text-gray-700'; break;
        case JobCardStatus.IN_PROGRESS: colorClasses = 'bg-yellow-100 text-yellow-700 animate-pulse'; break;
        case JobCardStatus.PENDING_REVIEW: colorClasses = 'bg-purple-100 text-purple-700'; break;
        case JobCardStatus.COMPLETED: colorClasses = 'bg-green-100 text-green-700'; break;
        default: colorClasses = 'bg-gray-100 text-gray-700';
    }
    return <span className={`${small ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm'} font-semibold rounded-full ${colorClasses}`}>{status.replace(/([A-Z])/g, ' $1').trim()}</span>;
  };

  const filteredJobCards = assignedJobCards.filter(jc => filterStatus === 'All' || jc.status === filterStatus);

  if (isLoading && assignedJobCards.length === 0) return <LoadingSpinner text="Loading your assigned tasks..." className="p-6" />;
  if (!user || user.role !== UserRole.FREELANCER) return <p className="p-6 text-center text-red-500">Access denied.</p>;
  
  if (error) {
    return <p className="p-6 text-center text-red-500 bg-red-50 rounded-md">{error}</p>;
  }

  if (assignedJobCards.length === 0 && !isLoading) return (
    <div className="p-6 text-center">
        <ListBulletIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-700 mb-2">No Job Cards Assigned</h3>
        <p className="text-gray-500">You currently have no tasks assigned to you. Check back later or browse for projects.</p>
        <Link to={`${NAV_LINKS.DASHBOARD}/${NAV_LINKS.FREELANCER_BROWSE}`}>
            <Button variant="primary" className="mt-4">Browse Projects</Button>
        </Link>
    </div>
  );

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <h2 className="text-3xl font-bold text-gray-800 mb-4 sm:mb-0">My Job Cards</h2>
        <div className="flex items-center space-x-2">
            <label htmlFor="statusFilter" className="text-sm font-medium text-gray-700">Filter by status:</label>
            <select id="statusFilter" value={filterStatus} 
                    onChange={(e) => setFilterStatus(e.target.value as JobCardStatus | 'All')}
                    className="p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm">
                <option value="All">All Statuses</option>
                {Object.values(JobCardStatus).map(s => <option key={s} value={s}>{s.replace(/([A-Z])/g, ' $1').trim()}</option>)}
            </select>
        </div>
      </div>

      {!isLoading && filteredJobCards.length === 0 && !error && ( 
         <p className="text-center text-gray-500 py-8">No job cards match the current filter.</p> 
      )}

      <div className="space-y-4">
        {filteredJobCards.map(jc => {
          const totalMinutesLogged = jc.timeLogs?.reduce((sum, log) => sum + log.durationMinutes, 0) || 0;
          const isTimerActiveForThisCard = activeTimerInfo?.jobCardId === jc.id;
          const canLogTime = jc.projectStatus === ProjectStatus.IN_PROGRESS;

          return (
            <div key={jc.id} className="bg-white shadow-lg rounded-xl p-5 hover:shadow-xl transition-shadow">
              <div className="flex flex-col md:flex-row justify-between md:items-start gap-4">
                <div className="flex-grow">
                  <Link to={NAV_LINKS.PROJECT_DETAILS.replace(':id', jc.projectId)} className="text-xs text-blue-500 hover:underline">
                      Project: {jc.projectName || jc.projectId} {/* Display projectName if available */}
                  </Link>
                  <h3 className="text-lg font-semibold text-gray-800 mt-0.5 mb-1">{jc.title}</h3>
                  <p className="text-sm text-gray-600 mb-2 line-clamp-2">{jc.description}</p>
                   <div className="flex items-center space-x-2 text-xs text-gray-500 mb-3">
                      {getStatusChip(jc.status, true)}
                      <span>Est. Time: {jc.estimatedTime || 'N/A'}h</span>
                      <span>Logged: {formatDurationToHHMMSS(totalMinutesLogged * 60)}</span>
                       <Link to={NAV_LINKS.PROJECT_DETAILS.replace(':id', jc.projectId)} className="text-blue-500 hover:underline inline-flex items-center">
                         <EyeIcon className="w-3 h-3 mr-0.5"/> View Details
                       </Link>
                   </div>
                </div>
                <div className="md:w-52 flex-shrink-0 space-y-2">
                   <div>
                    <label htmlFor={`status-jc-${jc.id}`} className="block text-xs font-medium text-gray-600 mb-0.5">Task Status:</label>
                    <select id={`status-jc-${jc.id}`} value={jc.status}
                        onChange={(e) => handleStatusUpdate(jc.projectId, jc.id, e.target.value as JobCardStatus)}
                        className="block w-full p-2 text-sm border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                        disabled={!canLogTime && jc.status === JobCardStatus.COMPLETED}>
                        {Object.values(JobCardStatus).map(s => <option key={s} value={s}>{s.replace(/([A-Z])/g, ' $1').trim()}</option>)}
                    </select>
                   </div>
                   {canLogTime && (
                    <div className="space-y-1.5">
                        <div className="flex gap-1.5">
                            {!isTimerActiveForThisCard && !activeTimerInfo && (
                                <Button size="sm" variant="ghost" onClick={() => handleStartTimerClick(jc)} leftIcon={<PlayIcon/>} className="flex-1 justify-center">Start</Button>
                            )}
                            {isTimerActiveForThisCard && (
                                <Button size="sm" variant="danger" onClick={handleStopTimerClick} leftIcon={<StopIcon/>} className="flex-1 justify-center">Stop</Button>
                            )}
                            {activeTimerInfo && !isTimerActiveForThisCard && (
                                 <Button size="sm" variant="ghost" disabled={true} leftIcon={<PlayIcon/>} className="flex-1 justify-center">Start</Button>
                            )}
                        </div>
                        <Button size="sm" variant="secondary" onClick={() => setManualLogTargetCard(jc)} leftIcon={<PlusIcon/>} className="w-full justify-center">Log Manually</Button>
                    </div>
                   )}
                   {!canLogTime && jc.projectStatus !== ProjectStatus.IN_PROGRESS && (
                      <p className="text-xs text-red-500 mt-1">Project not in progress. Time logging disabled.</p>
                   )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {manualLogTargetCard && 
        <ManualTimeLogModal 
            isOpen={!!manualLogTargetCard}
            onClose={() => setManualLogTargetCard(null)}
            onSubmit={(logData) => handleTimeLogSubmit(manualLogTargetCard.projectId, manualLogTargetCard.id, logData)}
            jobCardTitle={manualLogTargetCard.title}
        />
      }
    </div>
  );
};

export { MyJobCards as default };
