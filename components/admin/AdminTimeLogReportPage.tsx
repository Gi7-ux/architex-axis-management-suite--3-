import React, { useState, useEffect } from 'react';
import { TimeLog, Project, User, UserRole } from '../../types';
import { fetchAllProjectsWithTimeLogsAPI, fetchUsersAPI, fetchAllTimeLogsAPI } from '../../apiService';
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

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [fetchedLogs, fetchedProjects, fetchedUsers] = await Promise.all([
            fetchAllTimeLogsAPI(), // This API should ideally allow filtering on backend
            fetchAllProjectsWithTimeLogsAPI(), // To get project info for dropdowns, context
            fetchUsersAPI() // To get user names
        ]);
        
        setProjects(fetchedProjects);
        setUsers(fetchedUsers);

        // Enrich logs with names - ideally backend would do most of this
        const enrichedLogs: EnrichedTimeLog[] = fetchedLogs.map(log => {
            const project = fetchedProjects.find(p => p.jobCards?.some(jc => jc.id === log.jobCardId));
            const jobCard = project?.jobCards?.find(jc => jc.id === log.jobCardId);
            const architect = fetchedUsers.find(u => u.id === log.architectId);
            const client = project ? fetchedUsers.find(u => u.id === project.clientId) : undefined;
            return {
                ...log,
                projectName: project?.title,
                jobCardTitle: jobCard?.title,
                architectName: architect?.name,
                clientName: client?.name
            };
        });
        setAllTimeLogs(enrichedLogs);

      } catch (err: any) {
        console.error("Failed to load time log data:", err);
        setError(err.message || "Could not load time log reports.");
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const clients = users.filter(u => u.role === UserRole.CLIENT);
  const freelancers = users.filter(u => u.role === UserRole.FREELANCER);

  const filteredLogs = allTimeLogs.filter(log => {
    if (filterClient !== 'ALL' && (!log.clientName || projects.find(p=>p.title === log.projectName)?.clientId !== filterClient)) return false;
    if (filterProject !== 'ALL' && log.projectName !== projects.find(p=>p.id === filterProject)?.title) return false; // This mapping might be tricky if names aren't unique
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
          <input type="date" id="filterStartDate" value={filterStartDate} onChange={e => setFilterStartDate(e.target.value)} className="mt-1 block w-full p-2 border-gray-300 rounded-md shadow-sm"/>
        </div>
        <div>
          <label htmlFor="filterEndDate" className="block text-sm font-medium text-gray-700">End Date</label>
          <input type="date" id="filterEndDate" value={filterEndDate} onChange={e => setFilterEndDate(e.target.value)} className="mt-1 block w-full p-2 border-gray-300 rounded-md shadow-sm"/>
        </div>
      </div>

      {filteredLogs.length === 0 && !isLoading && (
          <p className="text-center text-gray-500 py-8">No time logs match the current filters or no time logs available.</p>
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
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {filteredLogs.map(log => (
                        <tr key={log.id} className="hover:bg-gray-50">
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-600">{new Date(log.startTime).toLocaleDateString()}</td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-600">{log.clientName || '-'}</td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-600">{log.projectName || '-'}</td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-600">{log.jobCardTitle || '-'}</td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-600">{log.architectName || '-'}</td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-600">{formatDurationToHHMMSS(log.durationMinutes * 60)}</td>
                            <td className="px-4 py-2 text-sm text-gray-600 max-w-xs truncate" title={log.notes}>{log.notes || '-'}</td>
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
