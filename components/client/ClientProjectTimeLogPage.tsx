import React, { useState, useEffect, useContext } from 'react';
import { User, Project, TimeLog, UserRole } from '../../types';
import {
  fetchProjectsAPI,
  fetchClientProjectTimeLogsAPI,
  fetchUsersAPI // For fetching users to map architectId to name
} from '../../apiService';
import { AuthContext } from '../AuthContext';
// import { SomeSpinnerComponent } from '../shared/LoadingSpinner'; // Placeholder for a spinner

const ClientProjectTimeLogPage: React.FC = () => {
  const [projects, setProjects] = useState<Project[] | undefined>(undefined);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [timeLogs, setTimeLogs] = useState<TimeLog[] | undefined>(undefined);
  const [users, setUsers] = useState<User[]>([]); // To map architectId to freelancer name

  const [isLoadingProjects, setIsLoadingProjects] = useState<boolean>(true);
  const [isLoadingTimeLogs, setIsLoadingTimeLogs] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const auth = useContext(AuthContext);
  const clientId = auth?.user?.id;
  const clientRole = auth?.user?.role;

  // Effect to fetch initial data: projects and users (freelancers)
  useEffect(() => {
    if (!clientId) {
      setError("Client ID not found. Please log in again.");
      setIsLoadingProjects(false);
      return;
    }
    if (clientRole !== UserRole.CLIENT) {
      setError("Access Denied. This page is for clients only.");
      setIsLoadingProjects(false);
      return;
    }

    const loadInitialData = async () => {
      setIsLoadingProjects(true);
      setError(null);
      try {
        const [fetchedProjects, fetchedUsers] = await Promise.all([
          fetchProjectsAPI({ clientId: String(clientId) }),
          fetchUsersAPI(UserRole.FREELANCER) // Fetch only freelancers
        ]);
        setProjects(fetchedProjects);
        setUsers(fetchedUsers);
      } catch (err) {
        console.error("Error fetching initial data:", err);
        setError(err instanceof Error ? err.message : "An unknown error occurred while fetching projects or users.");
      } finally {
        setIsLoadingProjects(false);
      }
    };
    loadInitialData();
  }, [clientId, clientRole]);

  // Effect to fetch time logs when a project is selected
  useEffect(() => {
    if (!selectedProjectId || !clientId) {
      setTimeLogs([]); // Clear previous logs if no project is selected
      return;
    }

    const loadTimeLogs = async () => {
      setIsLoadingTimeLogs(true);
      setError(null); // Clear previous errors specific to time log fetching
      try {
        const fetchedTimeLogs = await fetchClientProjectTimeLogsAPI(String(clientId), selectedProjectId);
        setTimeLogs(fetchedTimeLogs);
      } catch (err) {
        console.error(`Error fetching time logs for project ${selectedProjectId}:`, err);
        setError(err instanceof Error ? err.message : `Failed to fetch time logs for project ${selectedProjectId}.`);
        setTimeLogs([]); // Clear time logs on error
      } finally {
        setIsLoadingTimeLogs(false);
      }
    };
    loadTimeLogs();
  }, [selectedProjectId, clientId]);

  // Helper function to get freelancer name
  const getFreelancerName = (architectId: string): string => {
    const user = users.find(u => u.id === architectId);
    return user ? user.name : `ID: ${architectId}`; // Fallback to ID if name not found
  };

  // Helper to get Job Card Title (placeholder for now)
  const getJobCardDisplayInfo = (jobCardId: string): string => {
    // In a real scenario, you might fetch job cards for the project
    // and find the title, or the API would include jobCardTitle in TimeLog.
    return `Job Card ID: ${jobCardId}`;
  };


  // Render early if role is incorrect (already handled by ProtectedView, but good for direct component use sense)
  if (clientRole !== UserRole.CLIENT && !auth?.isLoading) { // isLoading check to prevent flash of this message
    return <p>Access Denied. This page is for clients only.</p>;
  }

  if (isLoadingProjects) {
    return <p>Loading projects...</p>; // Replace with a proper spinner
  }

  if (error && !selectedProjectId) { // Show general errors if no project is selected yet, or project loading failed
    return <p>Error: {error}</p>;
  }

  // Defensive: treat undefined as loading/empty
  const safeProjects = projects ?? [];
  const safeTimeLogs = timeLogs ?? [];

  return (
    <div style={{ padding: '20px' }}>
      <h1>Project Time Logs</h1>

      <div style={{ marginBottom: '20px' }}>
        <label htmlFor="project-select" style={{ marginRight: '10px' }}>Select Project:</label>
        <select
          id="project-select"
          value={selectedProjectId || ''}
          onChange={e => setSelectedProjectId(e.target.value || null)}
          style={{ padding: '8px', minWidth: '200px', border: '1px solid #ccc', borderRadius: '4px' }}
          disabled={safeProjects.length === 0}
        >
          <option value="">-- Select a Project --</option>
          {safeProjects.map(project => (
            <option key={project.id} value={project.id}>{project.title}</option>
          ))}
        </select>
        {safeProjects.length === 0 && !isLoadingProjects && <p>You have no projects.</p>}
      </div>

      {selectedProjectId && (
        <section>
          <h2>Time Logs for: {safeProjects.find(p => p.id === selectedProjectId)?.title || ''}</h2>
          {isLoadingTimeLogs && <p>Loading time logs...</p> /* Replace with spinner */}
          {!isLoadingTimeLogs && error && <p>Error loading time logs: {error}</p>}
          {!isLoadingTimeLogs && !error && safeTimeLogs.length === 0 && (
            <p>No time logs have been recorded for this project yet.</p>
          )}
          {!isLoadingTimeLogs && !error && safeTimeLogs.length > 0 && (
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px' }}>
              <thead>
                <tr>
                  <th style={tableHeaderStyle}>Date</th>
                  <th style={tableHeaderStyle}>Freelancer</th>
                  <th style={tableHeaderStyle}>Job Card</th>
                  <th style={tableHeaderStyle}>Duration</th>
                  <th style={tableHeaderStyle}>Notes</th>
                </tr>
              </thead>
              <tbody>
                {safeTimeLogs.map(log => (
                  <tr key={log.id}>
                    <td style={tableCellStyle}>{new Date(log.startTime).toLocaleDateString()}</td>
                    <td style={tableCellStyle}>{getFreelancerName(log.architectId)}</td>
                    <td style={tableCellStyle}>{getJobCardDisplayInfo(log.jobCardId)}</td>
                    <td style={tableCellStyle}>{log.durationMinutes} min</td>
                    <td style={tableCellStyle}>{log.notes || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}
      {!selectedProjectId && !isLoadingProjects && safeProjects.length > 0 && (
        <p style={{ marginTop: '20px' }}>Please select a project to view its time logs.</p>
      )}
    </div>
  );
};

// Basic styles (can be moved to a CSS file or styled components later)
const tableHeaderStyle: React.CSSProperties = {
  borderBottom: '2px solid #ddd',
  padding: '10px',
  textAlign: 'left',
  backgroundColor: '#f9f9f9',
  fontWeight: 'bold',
};

const tableCellStyle: React.CSSProperties = {
  borderBottom: '1px solid #eee',
  padding: '10px',
  textAlign: 'left',
};

export default ClientProjectTimeLogPage;
