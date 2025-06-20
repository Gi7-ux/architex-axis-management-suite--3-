import React, { useState, useEffect, useContext } from 'react'; // Removed unused 'useContext' if AuthContext import changes to useAuth hook
import { User, JobCard, TimeLog } from '../../types';
import {
  fetchFreelancerJobCardsAPI,
  fetchMyTimeLogsAPI,
<<<<<<< Updated upstream
  // addTimeLogAPI, // Will be handled by AuthContext's stopGlobalTimerAndLog
=======
  addTimeLogAPI, // Will be handled by AuthContext's stopGlobalTimerAndLog
>>>>>>> Stashed changes
  deleteTimeLogAPI, // Keep for future direct delete on this page
  updateTimeLogAPI  // Keep for future direct edit on this page
} from '../../apiService';
// import { AuthContext } from '../AuthContext'; // No longer directly used, useAuth hook instead
import { useAuth } from '../AuthContext'; // Import useAuth

const FreelancerTimeTrackingPage: React.FC = () => {
  const [jobCards, setJobCards] = useState<JobCard[]>([]);
  const [timeLogs, setTimeLogs] = useState<TimeLog[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true); // For page data loading
  const [isProcessingLog, setIsProcessingLog] = useState<boolean>(false); // For log submission spinner
  const [error, setError] = useState<string | null>(null);
  // const [activeTimer, setActiveTimer] = useState<{ jobCardId: string, startTime: Date } | null>(null); // REMOVED - Use global timer from AuthContext
  const [manualLogJobCardId, setManualLogJobCardId] = useState<string | null>(null);

  const { user, activeTimerInfo, startGlobalTimer, stopGlobalTimerAndLog, isLoading: isAuthLoading } = useAuth(); // Get global timer state and functions
  const freelancerId = user?.id;


  // State for manual log form
  const [manualDate, setManualDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [manualStartTime, setManualStartTime] = useState<string>('09:00');
  const [manualEndTime, setManualEndTime] = useState<string>('17:00');
  const [manualNotes, setManualNotes] = useState<string>('');


  // const auth = useContext(AuthContext); // REMOVED
  // const freelancerId = auth?.user?.id; // Now from useAuth().user.id

  useEffect(() => {
    if (!freelancerId && !isAuthLoading) { // Wait for auth to load
      setError("User ID not found. Please ensure you are logged in.");
      setIsLoading(false);
      return;
    }
    if(freelancerId){
      const fetchData = async () => {
        setIsLoading(true);
        setError(null);
        try {
          // Fetch job cards and existing time logs when freelancerId is available
          const [fetchedJobCards, fetchedTimeLogs] = await Promise.all([
<<<<<<< Updated upstream
            fetchFreelancerJobCardsAPI(freelancerId),
            fetchMyTimeLogsAPI(freelancerId) // Consider filtering by activeTimerInfo.jobCardId if needed
=======
            fetchFreelancerJobCardsAPI(String(freelancerId)),
            fetchMyTimeLogsAPI(String(freelancerId)) // Consider filtering by activeTimerInfo.jobCardId if needed
>>>>>>> Stashed changes
          ]);
          setJobCards(fetchedJobCards);
          setTimeLogs(fetchedTimeLogs);
        } catch (err) {
          console.error("Error fetching page data:", err);
          setError(err instanceof Error ? err.message : "An unknown error occurred while fetching data.");
        } finally {
          setIsLoading(false);
        }
      };
      fetchData();
    }
  }, [freelancerId, isAuthLoading]);

  // Effect to refresh time logs if a global timer was stopped elsewhere
  useEffect(() => {
    if (freelancerId && !activeTimerInfo && !isLoading) { // If timer was running and now it's not
        const refreshLogs = async () => {
            // This could be more sophisticated, e.g. checking if the last log was recent
            // For now, just re-fetch if timer becomes null
            // console.log("Global timer stopped, refreshing logs on tracking page.");
            // setIsProcessingLog(true); // Show a brief loading state for logs
            try {
<<<<<<< Updated upstream
                const fetchedTimeLogs = await fetchMyTimeLogsAPI(freelancerId);
=======
                const fetchedTimeLogs = await fetchMyTimeLogsAPI(String(freelancerId));
>>>>>>> Stashed changes
                setTimeLogs(fetchedTimeLogs);
            } catch (err) {
                console.error("Error refreshing time logs:", err);
                // setError("Failed to refresh time logs after timer stop.");
            } finally {
                // setIsProcessingLog(false);
            }
        };
        // Only run if there was an active timer previously (requires more complex state tracking or rely on other signals)
        // This simple version might over-fetch. For now, this is disabled to prevent over-fetching.
        // A better approach might be an event bus or callback from AuthContext.
        // refreshLogs();
    }
  }, [activeTimerInfo, freelancerId, isLoading]);

  // Helper functions for rendering
  const getProjectTitle = (projectId: string): string => {
    // This is a placeholder. Ideally, project data would be more readily available.
    // For now, we don't have a list of all projects on this page.
    // We could enhance JobCard type or fetch projects if this becomes critical.
    // Consider if jobCards fetched could include projectTitle directly from backend.
    return `Project ID: ${projectId}`;
  };

  const getJobCardTitle = (jobCardId: string): string => {
    const card = jobCards.find(jc => jc.id === jobCardId);
    return card ? card.title : 'Unknown Job Card';
  };

  const calculateTotalTimeForJobCard = (jobCardId: string): string => {
    const totalMinutes = timeLogs
      .filter(log => log.jobCardId === jobCardId)
      .reduce((sum, log) => sum + log.durationMinutes, 0);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}h ${minutes}m`;
  };

  const handleStartTimer = (jobCard: JobCard) => { // Takes full JobCard object
    if (activeTimerInfo) {
      alert("Another timer is already active globally. Please stop it before starting a new one.");
      return;
    }
    if (!freelancerId) {
      alert("User ID not found. Cannot start timer.");
      return;
    }
    // Use AuthContext to start the global timer
    startGlobalTimer(jobCard.id, jobCard.title, jobCard.projectId);
  };

  const handlePageStopTimer = async () => {
    if (!activeTimerInfo || !freelancerId) {
      setError("No active timer to stop or user ID not found.");
      return;
    }
    const notes = prompt("Optional notes for this time entry (or leave blank):");
    setIsProcessingLog(true);
    try {
      await stopGlobalTimerAndLog(notes || undefined); // stopGlobalTimerAndLog handles API call and clearing activeTimerInfo
      // Refresh time logs after stopping
<<<<<<< Updated upstream
      const fetchedTimeLogs = await fetchMyTimeLogsAPI(freelancerId);
=======
      const fetchedTimeLogs = await fetchMyTimeLogsAPI(String(freelancerId)); // Convert freelancerId to string
>>>>>>> Stashed changes
      setTimeLogs(fetchedTimeLogs);
      // alert("Timer stopped and time logged successfully!"); // Already handled by global timer logic potentially
    } catch (err) {
      console.error("Error stopping timer from page:", err);
      setError(err instanceof Error ? err.message : "Failed to stop and log time.");
      alert(`Error: ${err instanceof Error ? err.message : "Failed to stop and log time."}`);
    } finally {
      setIsProcessingLog(false);
    }
  };

  const handleOpenManualLog = (jobCardId: string) => {
    setManualLogJobCardId(jobCardId);
    // Reset form fields when opening
    setManualDate(new Date().toISOString().split('T')[0]);
    setManualStartTime('09:00');
    setManualEndTime('17:00');
    setManualNotes('');
  };

  const handleCloseManualLog = () => {
    setManualLogJobCardId(null);
  };

  const handleManualLogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualLogJobCardId || !freelancerId) {
      alert("Error: Job card ID or freelancer ID is missing.");
      return;
    }

    if (!manualDate || !manualStartTime || !manualEndTime) {
      alert("Please fill in date, start time, and end time.");
      return;
    }

    const startTimeISO = new Date(`${manualDate}T${manualStartTime}:00`).toISOString();
    const endTimeISO = new Date(`${manualDate}T${manualEndTime}:00`).toISOString();

    if (new Date(endTimeISO) <= new Date(startTimeISO)) {
      alert("End time must be after start time.");
      return;
    }

    const durationMinutes = Math.round((new Date(endTimeISO).getTime() - new Date(startTimeISO).getTime()) / (1000 * 60));
    if (durationMinutes <= 0) {
        alert("Duration must be positive.");
        return;
    }

    const jobCard = jobCards.find(jc => jc.id === manualLogJobCardId);
    if (!jobCard) {
      alert(`Project ID for Job Card ${manualLogJobCardId} not found.`);
      setError(`Project ID for Job Card ${manualLogJobCardId} not found.`);
      return;
    }
    const projectId = jobCard.projectId;

    const newLogData: Omit<TimeLog, 'id' | 'createdAt'> = {
      jobCardId: manualLogJobCardId,
<<<<<<< Updated upstream
      architectId: freelancerId,
=======
      architectId: String(freelancerId),
>>>>>>> Stashed changes
      startTime: startTimeISO,
      endTime: endTimeISO,
      durationMinutes,
      notes: manualNotes || undefined,
      manualEntry: true,
    };

    setIsLoading(true);
    try {
<<<<<<< Updated upstream
      await addTimeLogAPI(projectId, manualLogJobCardId, newLogData);
      handleCloseManualLog();
      const fetchedTimeLogs = await fetchMyTimeLogsAPI(freelancerId);
=======
      await addTimeLogAPI(projectId, manualLogJobCardId, newLogData); // Corrected: Call addTimeLogAPI directly
      handleCloseManualLog();
      const fetchedTimeLogs = await fetchMyTimeLogsAPI(String(freelancerId));
>>>>>>> Stashed changes
      setTimeLogs(fetchedTimeLogs);
      alert("Manual time log added successfully!");
    } catch (err) {
      console.error("Error adding manual time log:", err);
      setError(err instanceof Error ? err.message : "Failed to add manual log.");
      alert(`Error: ${err instanceof Error ? err.message : "Failed to add manual log."}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Combined loading state check
  if (isLoading || (isAuthLoading && !freelancerId)) return <p>Loading page data...</p>;
  if (error) return <p>Error: {error}</p>;

  return (
    <div style={{ padding: '20px' }}>
      <h1>My Time Logs</h1>

      <section>
        <h2>Job Cards</h2>
        {jobCards.length === 0 && !isLoading ? (
          <p>No job cards assigned to you yet.</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {jobCards.map(card => (
              <li key={card.id} style={{ marginBottom: '20px', padding: '10px', border: '1px solid #ccc' }}>
                <h3>{card.title} ({getProjectTitle(card.projectId)})</h3>
                {/* <p>{getProjectTitle(card.projectId)}</p> */}
                <p>Total Time Logged: {calculateTotalTimeForJobCard(card.id)}</p>
                <button
                  onClick={() => activeTimerInfo?.jobCardId === card.id ? handlePageStopTimer() : handleStartTimer(card)}
                  style={{
                    marginRight: '10px',
                    backgroundColor: activeTimerInfo?.jobCardId === card.id ? 'red' : (activeTimerInfo ? '#ccc' : 'green'), // Grey out if other timer active
                    color: 'white',
                    cursor: activeTimerInfo && activeTimerInfo.jobCardId !== card.id ? 'not-allowed' : 'pointer'
                  }}
                  disabled={(activeTimerInfo && activeTimerInfo.jobCardId !== card.id) || isProcessingLog}
                >
                  {activeTimerInfo?.jobCardId === card.id
                    ? (isProcessingLog ? 'Logging...' : 'Stop Timer')
                    : 'Start Timer'}
                </button>
                <button
                  onClick={() => handleOpenManualLog(card.id)}
                  disabled={!!activeTimerInfo || !!manualLogJobCardId || isProcessingLog}
                >
                  Log Time Manually
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {manualLogJobCardId && (
        <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', backgroundColor: 'white', padding: '30px', border: '1px solid #ccc', boxShadow: '0 4px 8px rgba(0,0,0,0.1)', zIndex: 1000 }}>
          <h3>Log Time Manually for: {getJobCardTitle(manualLogJobCardId)}</h3>
          <form onSubmit={handleManualLogSubmit}>
            <div style={{ marginBottom: '10px' }}>
              <label htmlFor="manualDate">Date: </label>
              <input type="date" id="manualDate" value={manualDate} onChange={e => setManualDate(e.target.value)} required style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }} />
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label htmlFor="manualStartTime">Start Time: </label>
              <input type="time" id="manualStartTime" value={manualStartTime} onChange={e => setManualStartTime(e.target.value)} required style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }} />
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label htmlFor="manualEndTime">End Time: </label>
              <input type="time" id="manualEndTime" value={manualEndTime} onChange={e => setManualEndTime(e.target.value)} required style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }} />
            </div>
            <div style={{ marginBottom: '15px' }}>
              <label htmlFor="manualNotes">Notes (Optional): </label>
              <textarea id="manualNotes" value={manualNotes} onChange={e => setManualNotes(e.target.value)} rows={3} style={{ width: 'calc(100% - 18px)', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }} />
            </div>
            <div style={{ textAlign: 'right' }}>
              <button type="button" onClick={handleCloseManualLog} style={{ marginRight: '10px', padding: '10px 15px', backgroundColor: '#eee', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
              <button type="submit" disabled={isProcessingLog} style={{ padding: '10px 15px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                {isProcessingLog ? 'Submitting...' : 'Submit Log'}
              </button>
            </div>
          </form>
        </div>
      )}
      {manualLogJobCardId && <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 999 }} onClick={handleCloseManualLog}></div> /* Modal Backdrop */}


      <section style={{ marginTop: '30px' }}>
        <h2>My Logged Time Entries</h2>
        {timeLogs.length === 0 ? (
          <p>You have not logged any time yet.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={tableHeaderStyle}>Date</th>
                <th style={tableHeaderStyle}>Project</th>
                <th style={tableHeaderStyle}>Job Card</th>
                <th style={tableHeaderStyle}>Start Time</th>
                <th style={tableHeaderStyle}>End Time</th>
                <th style={tableHeaderStyle}>Duration</th>
                <th style={tableHeaderStyle}>Notes</th>
                <th style={tableHeaderStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {timeLogs.map(log => (
                <tr key={log.id}>
                  <td style={tableCellStyle}>{new Date(log.startTime).toLocaleDateString()}</td>
                  <td style={tableCellStyle}>{getProjectTitle(jobCards.find(jc => jc.id === log.jobCardId)?.projectId || 'N/A')}</td>
                  <td style={tableCellStyle}>{getJobCardTitle(log.jobCardId)}</td>
                  <td style={tableCellStyle}>{new Date(log.startTime).toLocaleTimeString()}</td>
                  <td style={tableCellStyle}>{new Date(log.endTime).toLocaleTimeString()}</td>
                  <td style={tableCellStyle}>{log.durationMinutes} min</td>
                  <td style={tableCellStyle}>{log.notes || '-'}</td>
                  <td style={tableCellStyle}>
                    <button onClick={() => alert('Edit log ' + log.id)} style={{ marginRight: '5px' }}>Edit</button>
                    <button onClick={() => alert('Delete log ' + log.id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
};

// Basic styles (can be moved to a CSS file or styled components later)
const tableHeaderStyle: React.CSSProperties = {
  borderBottom: '2px solid #ddd',
  padding: '8px',
  textAlign: 'left',
  backgroundColor: '#f7f7f7',
};

const tableCellStyle: React.CSSProperties = {
  borderBottom: '1px solid #eee',
  padding: '8px',
  textAlign: 'left',
};

export default FreelancerTimeTrackingPage;
