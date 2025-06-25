import React, { useState, useEffect, useCallback } from 'react';
import { TimeLog, Project, User, UserRole, JobCard } from '../../types'; // Added JobCard
import {
  fetchAllProjectsWithTimeLogsAPI,
  fetchUsersAPI,
  fetchAllTimeLogsAPI,
  adminDeleteTimeLogAPI, // Import delete API
  adminUpdateTimeLogAPI, // Import update API
} from '../../apiService';
import LoadingSpinner from '../shared/LoadingSpinner';
import { formatDurationToHHMMSS } from '../../constants';

interface EnrichedTimeLog extends TimeLog {
  projectName?: string;
  jobCardTitle?: string;
  clientName?: string;
  architectName?: string;
}

const AdminTimeLogReportPage: React.FC = () => {
  const [allTimeLogs, setAllTimeLogs] = useState<EnrichedTimeLog[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [filterClient, setFilterClient] = useState<string>('ALL');
  const [filterProject, setFilterProject] = useState<string>('ALL');
  const [filterFreelancer, setFilterFreelancer] = useState<string>('ALL');
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');

  // State for editing
  const [editingTimeLog, setEditingTimeLog] = useState<EnrichedTimeLog | null>(null);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  // Edit form field states
  const [editDate, setEditDate] = useState<string>('');
  const [editStartTime, setEditStartTime] = useState<string>('');
  const [editEndTime, setEditEndTime] = useState<string>('');
  const [editNotes, setEditNotes] = useState<string>('');
  const [editJobCardId, setEditJobCardId] = useState<string>(''); // Admin can edit this
  const [editArchitectId, setEditArchitectId] = useState<string>(''); // Admin can edit this
  // Add a state to trigger re-fetch
  const [dataVersion, setDataVersion] = useState<number>(0);


  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [fetchedLogs, fetchedProjects, fetchedUsers] = await Promise.all([
        fetchAllTimeLogsAPI(),
        fetchAllProjectsWithTimeLogsAPI(),
        fetchUsersAPI()
      ]);

      setProjects(fetchedProjects);
      setUsers(fetchedUsers);

      const enrichedLogs: EnrichedTimeLog[] = fetchedLogs.map(log => {
        const projectDetails = fetchedProjects.find(p => p.jobCards?.some(jc => jc.id === log.jobCardId));
        const jobCardDetails = projectDetails?.jobCards?.find(jc => jc.id === log.jobCardId);
        const architectDetails = fetchedUsers.find(u => u.id === log.architectId);
        const clientDetails = projectDetails ? fetchedUsers.find(u => u.id === projectDetails.clientId) : undefined;
        return {
          ...log,
          projectName: projectDetails?.title,
          jobCardTitle: jobCardDetails?.title,
          architectName: architectDetails?.name,
          clientName: clientDetails?.name
        };
      });
      setAllTimeLogs(enrichedLogs);

    } catch (err: any) {
      console.error("Failed to load time log data:", err);
      setError(err.message || "Could not load time log reports.");
    } finally {
      setIsLoading(false);
    }
  }, []); // Keep original loadData dependency

  useEffect(() => {
    loadData();
  }, [dataVersion, loadData]); // Re-fetch when dataVersion changes or loadData definition changes (though it shouldn't)


  const handleDeleteTimeLog = async (timeLogId: string) => {
    if (window.confirm('Are you sure you want to delete this time log?')) {
      try {
        await adminDeleteTimeLogAPI(timeLogId);
        setDataVersion(prev => prev + 1); // Trigger re-fetch
        alert('Time log deleted successfully.');
      } catch (err: any) {
        console.error('Error deleting time log:', err);
        setError(err.message || 'Failed to delete time log.');
        alert(`Error: ${err.message || 'Failed to delete time log.'}`);
      }
    }
  };

  const handleOpenEditModal = (timeLog: EnrichedTimeLog) => {
    setEditingTimeLog(timeLog);
    const startDate = new Date(timeLog.startTime);
    const endDate = new Date(timeLog.endTime);
    setEditDate(startDate.toISOString().split('T')[0]);
    setEditStartTime(`${startDate.getHours().toString().padStart(2, '0')}:${startDate.getMinutes().toString().padStart(2, '0')}`);
    setEditEndTime(`${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`);
    setEditNotes(timeLog.notes || '');
    setEditJobCardId(timeLog.jobCardId);
    setEditArchitectId(timeLog.architectId);
    setShowEditModal(true);
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setEditingTimeLog(null);
    // Optionally reset edit form fields here if not reset on open
  };

  // NOTE: The duplicated loadData definition was removed here.
  // The correct one is the useCallback defined earlier, which is used in the useEffect hook.

  const handleUpdateEditedTimeLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTimeLog) {
      setError("No time log selected for editing.");
      return;
    }

    if (!editDate || !editStartTime || !editEndTime || !editJobCardId || !editArchitectId) {
      alert("Please ensure Date, Start Time, End Time, Job Card ID, and Architect ID are filled.");
      return;
    }

    const newStartTimeISO = new Date(`${editDate}T${editStartTime}:00`).toISOString();
    const newEndTimeISO = new Date(`${editDate}T${editEndTime}:00`).toISOString();

    if (new Date(newEndTimeISO) <= new Date(newStartTimeISO)) {
      alert("End time must be after start time.");
      return;
    }

    const durationMinutes = Math.round((new Date(newEndTimeISO).getTime() - new Date(newStartTimeISO).getTime()) / (1000 * 60));
    if (durationMinutes <= 0 && !(editStartTime === editEndTime)) { // Allow 0 if start and end are same, for some edge cases.
      alert("Duration must be positive or start/end times must be identical for zero duration.");
      return;
    }

    const updates: Partial<Omit<TimeLog, 'id' | 'createdAt'>> = {
      startTime: newStartTimeISO,
      endTime: newEndTimeISO,
      durationMinutes, // This is now calculated
      notes: editNotes,
      jobCardId: editJobCardId,
      architectId: editArchitectId,
      // manualEntry is not directly editable here, assume it's preserved or backend handles if it's part of TimeLog Omit
    };

    try {
      await adminUpdateTimeLogAPI(editingTimeLog.id, updates);
      setDataVersion(prev => prev + 1); // Trigger re-fetch
      handleCloseEditModal();
      alert('Time log updated successfully.');
    } catch (err: any) {
      console.error('Error updating time log:', err);
      // setError(err.message || 'Failed to update time log.'); // This would show global error
      alert(`Error updating time log: ${err.message || 'Failed to update time log.'}`); // Simple alert for now
    }
  };

  const clients = users.filter(u => u.role === UserRole.CLIENT);
  const freelancers = users.filter(u => u.role === UserRole.FREELANCER);

  const filteredLogs = allTimeLogs.filter(log => {
    if (filterClient !== 'ALL' && (!log.clientName || projects.find(p => p.title === log.projectName)?.clientId !== filterClient)) return false;
    if (filterProject !== 'ALL' && log.projectName !== projects.find(p => p.id === filterProject)?.title) return false; // This mapping might be tricky if names aren't unique
    if (filterFreelancer !== 'ALL' && log.architectId !== filterFreelancer) return false;
    if (filterStartDate && new Date(log.startTime) < new Date(filterStartDate)) return false;
    if (filterEndDate && new Date(log.startTime) > new Date(new Date(filterEndDate).setDate(new Date(filterEndDate).getDate() + 1))) return false; // Include whole end day
    return true;
  });


  if (isLoading) {
    return <LoadingSpinner text="Loading time log reports..." className="p-6 h-64 flex items-center justify-center" />;
  }
  if (error) {
    return <p className="p-6 text-center text-red-500 bg-red-100 rounded-md">{error}</p>;
  }

  return (
    <div className="p-4 md:p-6 bg-white shadow-xl rounded-lg">
      <h2 className="text-2xl font-semibold text-gray-700 mb-6">Time Log Reports</h2>

      <div className="mb-6 p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 border rounded-md bg-gray-50">
        <div>
          <label htmlFor="filterClient" className="block text-sm font-medium text-gray-700">Client</label>
          <select id="filterClient" value={filterClient} onChange={e => setFilterClient(e.target.value)} className="mt-1 block w-full p-2 border-gray-300 rounded-md shadow-sm">
            <option value="ALL">All Clients</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="filterProject" className="block text-sm font-medium text-gray-700">Project</label>
          <select id="filterProject" value={filterProject} onChange={e => setFilterProject(e.target.value)} className="mt-1 block w-full p-2 border-gray-300 rounded-md shadow-sm">
            <option value="ALL">All Projects</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="filterFreelancer" className="block text-sm font-medium text-gray-700">Freelancer</label>
          <select id="filterFreelancer" value={filterFreelancer} onChange={e => setFilterFreelancer(e.target.value)} className="mt-1 block w-full p-2 border-gray-300 rounded-md shadow-sm">
            <option value="ALL">All Freelancers</option>
            {freelancers.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="filterStartDate" className="block text-sm font-medium text-gray-700">Start Date</label>
          <input type="date" id="filterStartDate" value={filterStartDate} onChange={e => setFilterStartDate(e.target.value)} className="mt-1 block w-full p-2 border-gray-300 rounded-md shadow-sm" />
        </div>
        <div>
          <label htmlFor="filterEndDate" className="block text-sm font-medium text-gray-700">End Date</label>
          <input type="date" id="filterEndDate" value={filterEndDate} onChange={e => setFilterEndDate(e.target.value)} className="mt-1 block w-full p-2 border-gray-300 rounded-md shadow-sm" />
        </div>
      </div>

      {filteredLogs.length === 0 && !isLoading && (
        <p className="text-center text-gray-500 py-8">No time logs match the current filters or no time logs available.</p>
      )}

      {showEditModal && editingTimeLog && (
        <div role="dialog" aria-modal="true" style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '8px', boxShadow: '0 4px 15px rgba(0,0,0,0.2)', width: '90%', maxWidth: '500px' }}>
            <h3 className="text-xl font-semibold mb-4">Edit Time Log</h3>
            <form onSubmit={handleUpdateEditedTimeLog}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label htmlFor="editDate" className="block text-sm font-medium text-gray-700">Date</label>
                  <input type="date" id="editDate" value={editDate} onChange={e => setEditDate(e.target.value)} required className="mt-1 block w-full p-2 border-gray-300 rounded-md shadow-sm" />
                </div>
                <div> {/* Placeholder div for alignment if needed, or more fields */} </div>
                <div>
                  <label htmlFor="editStartTime" className="block text-sm font-medium text-gray-700">Start Time</label>
                  <input type="time" id="editStartTime" value={editStartTime} onChange={e => setEditStartTime(e.target.value)} required className="mt-1 block w-full p-2 border-gray-300 rounded-md shadow-sm" />
                </div>
                <div>
                  <label htmlFor="editEndTime" className="block text-sm font-medium text-gray-700">End Time</label>
                  <input type="time" id="editEndTime" value={editEndTime} onChange={e => setEditEndTime(e.target.value)} required className="mt-1 block w-full p-2 border-gray-300 rounded-md shadow-sm" />
                </div>
                <div>
                  <label htmlFor="editJobCardId" className="block text-sm font-medium text-gray-700">Job Card ID</label>
                  <input type="text" id="editJobCardId" value={editJobCardId} onChange={e => setEditJobCardId(e.target.value)} required className="mt-1 block w-full p-2 border-gray-300 rounded-md shadow-sm" />
                  <p className="text-xs text-gray-500 mt-1">Caution: Ensure this ID is valid.</p>
                </div>
                <div>
                  <label htmlFor="editArchitectId" className="block text-sm font-medium text-gray-700">Architect ID</label>
                  <input type="text" id="editArchitectId" value={editArchitectId} onChange={e => setEditArchitectId(e.target.value)} required className="mt-1 block w-full p-2 border-gray-300 rounded-md shadow-sm" />
                  <p className="text-xs text-gray-500 mt-1">Caution: Ensure this ID is valid.</p>
                </div>
              </div>
              <div className="mb-4">
                <label htmlFor="editNotes" className="block text-sm font-medium text-gray-700">Notes</label>
                <textarea id="editNotes" value={editNotes} onChange={e => setEditNotes(e.target.value)} rows={3} className="mt-1 block w-full p-2 border-gray-300 rounded-md shadow-sm"></textarea>
              </div>
              <div className="flex justify-end space-x-3">
                <button type="button" onClick={handleCloseEditModal} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-md">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {filteredLogs.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Project</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Task</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Freelancer</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredLogs.map(log => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-600">{new Date(log.startTime).toLocaleDateString()}</td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-600">{log.clientName || '-'}</td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-600">{log.projectName || '-'}</td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-600">{log.jobCardTitle || `ID: ${log.jobCardId}`}</td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-600">{log.architectName || `ID: ${log.architectId}`}</td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-600">{formatDurationToHHMMSS(log.durationMinutes * 60)}</td>
                  <td className="px-4 py-2 text-sm text-gray-600 max-w-xs truncate" title={log.notes}>{log.notes || '-'}</td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => handleOpenEditModal(log)}
                      className="text-indigo-600 hover:text-indigo-900 mr-3 px-2 py-1 border border-indigo-600 rounded-md text-xs"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteTimeLog(log.id)}
                      className="text-red-600 hover:text-red-900 px-2 py-1 border border-red-600 rounded-md text-xs"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminTimeLogReportPage;
