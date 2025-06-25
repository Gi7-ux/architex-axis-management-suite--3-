import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../AuthContext'; // Adjusted path
import { getProjectsAPI, Project } from '../../apiService'; // Adjusted path
import LoadingSpinner from '../shared/LoadingSpinner'; // Adjusted path
import Button from '../shared/Button'; // Adjusted path
import { ChatBubbleLeftRightIcon, ChevronDownIcon, ChevronUpIcon, PaperAirplaneIcon, HandThumbUpIcon, HandThumbDownIcon, EyeIcon, EyeSlashIcon } from '../shared/IconComponents'; // Adjusted path

import {
    Project,
    MessageThread as ApiMessageThread, // Rename to avoid conflict with local interface if any
    ThreadMessage as ApiThreadMessage, // Rename
    fetchUserMessageThreadsAPI, // Will be used to find existing threads for a project
    fetchThreadMessagesAPI,
    sendThreadMessageAPI,
    SendThreadMessagePayload,
    moderateMessageAPI,
    ModerateMessagePayload,
    getProjectsAPI, // Already imported
} from '../../apiService'; // Adjusted path
import LoadingSpinner from '../shared/LoadingSpinner'; // Adjusted path
import Button from '../shared/Button'; // Adjusted path
import { ChatBubbleLeftRightIcon, PaperAirplaneIcon, HandThumbUpIcon, HandThumbDownIcon, UsersIcon, BuildingStorefrontIcon, UserGroupIcon } from '../shared/IconComponents'; // Adjusted path

// Use ApiMessageThread and ApiThreadMessage directly or create local versions if transformation is needed
type LocalMessageThread = ApiMessageThread; // Alias for clarity
type LocalThreadMessage = ApiThreadMessage;

const AdminProjectMessagingPage: React.FC = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // State for the three distinct thread types
  const [clientAdminFreelancerThread, setClientAdminFreelancerThread] = useState<LocalMessageThread | null>(null); // Type A
  const [adminClientThread, setAdminClientThread] = useState<LocalMessageThread | null>(null); // Type B
  const [adminFreelancerThread, setAdminFreelancerThread] = useState<LocalMessageThread | null>(null); // Type C

  const [messagesMap, setMessagesMap] = useState<Record<number, LocalThreadMessage[]>>({}); // thread.thread_id (number) -> messages
  const [newMessageContent, setNewMessageContent] = useState<Record<number, string>>({}); // thread.thread_id (number) -> content
  const [isLoadingThreads, setIsLoadingThreads] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState<Record<number, boolean>>({}); // thread.thread_id (number) -> boolean

  // This state is removed as visibility is now handled by distinct thread types or backend permissions.
  // const [freelancerCanViewClientChat, setFreelancerCanViewClientChat] = useState(true);

  const fetchProjects = useCallback(async () => {
    setIsLoadingProjects(true);
    setError(null);
    try {
      const fetchedProjects = await getProjectsAPI({ status: 'all' }); // Fetch all projects for admin
      setProjects(fetchedProjects);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch projects.');
      console.error("Failed to fetch projects:", err);
    } finally {
      setIsLoadingProjects(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleSelectProject = (project: Project) => {
    setSelectedProject(project);
    setAdminFreelancerThread(null);
    setAdminClientThread(null);
    setClientAdminFreelancerThread(null);
    setMessagesMap({});
    setNewMessageContent({});
    fetchProjectThreads(project.id);
  };

  const fetchProjectThreads = useCallback(async (projectId: number) => {
    setIsLoadingThreads(true);
    setError(null);
    try {
      // This API fetches all threads for the current user.
      // We need to filter them for the selected project and by type.
      // Or, ideally, a new backend endpoint like `get_project_message_threads_for_admin` would be better.
      // For now, we simulate finding/initializing them.
      const allUserThreads = await fetchUserMessageThreadsAPI();

      const cafThread = allUserThreads.find(t => t.project_id === projectId && t.type === 'project_client_admin_freelancer');
      setClientAdminFreelancerThread(cafThread || null); // Or a placeholder to initiate creation

      const acThread = allUserThreads.find(t => t.project_id === projectId && t.type === 'project_admin_client');
      setAdminClientThread(acThread || null);

      const afThread = allUserThreads.find(t => t.project_id === projectId && t.type === 'project_admin_freelancer');
      setAdminFreelancerThread(afThread || null);

    } catch (err: any) {
      setError(err.message || `Failed to fetch threads for project ${projectId}.`);
      console.error("Failed to fetch project threads:", err);
    } finally {
      setIsLoadingThreads(false);
    }
  }, []);

  const fetchMessagesForThread = useCallback(async (threadId: number) => {
    if (!threadId) return;
    setIsLoadingMessages(prev => ({ ...prev, [threadId]: true }));
    setError(null);
    try {
      const fetchedMessages = await fetchThreadMessagesAPI(threadId, { limit: 100 });
      setMessagesMap(prev => ({ ...prev, [threadId]: fetchedMessages }));
    } catch (err: any) {
      setError(err.message || `Failed to load messages for thread ${threadId}.`);
      console.error(`Failed to load messages for thread ${threadId}:`, err);
    } finally {
      setIsLoadingMessages(prev => ({ ...prev, [threadId]: false }));
    }
  }, []);

  useEffect(() => {
    if (clientAdminFreelancerThread?.thread_id && !messagesMap[clientAdminFreelancerThread.thread_id]) {
      fetchMessagesForThread(clientAdminFreelancerThread.thread_id);
    }
  }, [clientAdminFreelancerThread, messagesMap, fetchMessagesForThread]);

  useEffect(() => {
    if (adminClientThread?.thread_id && !messagesMap[adminClientThread.thread_id]) {
      fetchMessagesForThread(adminClientThread.thread_id);
    }
  }, [adminClientThread, messagesMap, fetchMessagesForThread]);

  useEffect(() => {
    if (adminFreelancerThread?.thread_id && !messagesMap[adminFreelancerThread.thread_id]) {
      fetchMessagesForThread(adminFreelancerThread.thread_id);
    }
  }, [adminFreelancerThread, messagesMap, fetchMessagesForThread]);

  const handleSendMessage = async (thread: LocalMessageThread | null, threadTypeHint: SendThreadMessagePayload['thread_type_hint']) => {
    if (!selectedProject || !user) return;
    const threadId = thread?.thread_id;
    const content = newMessageContent[threadId || 0]; // Use 0 as a temp key if threadId is null

    if (!content?.trim()) return;

    const payload: SendThreadMessagePayload = {
      project_id: selectedProject.id,
      content: content.trim(),
      thread_type_hint: threadTypeHint,
    };
    if (threadId) {
      payload.thread_id = threadId;
    }

    // For Admin-Client (Type B), the backend now handles freelancer visibility based on thread participation.
    // The `admin_client_message_freelancer_visibility` is primarily for initial thread creation by admin.
    // If sending to an existing Type B thread, this field is less relevant from frontend for *this specific message*.

    // Optimistic UI update
    const tempMessage: LocalThreadMessage = {
        id: Date.now(), // Temporary ID
        thread_id: threadId || 0, // Use actual or temporary
        sender_id: user.id,
        sender_username: user.username,
        content: content.trim(),
        sent_at: new Date().toISOString(),
        requires_approval: false, // Admin messages don't require approval
        approval_status: null,
    };

    if (threadId) {
        setMessagesMap(prev => ({ ...prev, [threadId]: [...(prev[threadId] || []), tempMessage] }));
    }
    setNewMessageContent(prev => ({ ...prev, [threadId || 0]: '' }));

    try {
      const response = await sendThreadMessageAPI(payload);
      // If a new thread was created, response.thread_id will be the new ID.
      // We need to update our local thread state and fetch messages for it.
      if (!threadId && response.thread_id) {
        fetchProjectThreads(selectedProject.id); // This will re-fetch all threads for the project
      } else if (threadId) {
        fetchMessagesForThread(threadId); // Refresh messages for the existing thread
      }
    } catch (err: any) {
      setError(err.message || `Failed to send message.`);
      // Revert optimistic update if needed, though often just showing error is enough
      if (threadId) {
        setMessagesMap(prev => ({ ...prev, [threadId]: prev[threadId]?.filter(m => m.id !== tempMessage.id) || [] }));
      }
      console.error("Send message error:", err);
    }
  };

  const handleApproveMessage = async (messageId: number, threadId: number) => {
    const payload: ModerateMessagePayload = { message_id: messageId, approval_status: 'approved' };
    try {
      await moderateMessageAPI(payload);
      fetchMessagesForThread(threadId); // Refresh messages to show updated status
    } catch (err: any) {
      setError(err.message || "Failed to approve message.");
      console.error("Approve message error:", err);
    }
  };

  const handleRejectMessage = async (messageId: number, threadId: number) => {
    const payload: ModerateMessagePayload = { message_id: messageId, approval_status: 'rejected' };
    try {
      await moderateMessageAPI(payload);
      fetchMessagesForThread(threadId); // Refresh messages
    } catch (err: any) {
      setError(err.message || "Failed to reject message.");
      console.error("Reject message error:", err);
    }));
  };

  const renderChatInterface = (
    thread: LocalMessageThread | null,
    threadTypeForDisplay: string,
    threadTypeHintApi: SendThreadMessagePayload['thread_type_hint']
  ) => {
    if (!selectedProject) return null;

    const threadExists = !!thread;
    const currentThreadId = thread?.thread_id || 0; // Use 0 or a unique temp key for new message input if thread is null

    if (isLoadingThreads && !threadExists) return <LoadingSpinner text={`Loading ${threadTypeForDisplay} chat...`} />;

    // If thread is null (doesn't exist yet), show a button to initiate it.
    if (!threadExists) {
      return (
        <div className="p-4 border rounded-lg shadow-sm text-center">
          <p className="text-gray-500 mb-2">No '{threadTypeForDisplay}' chat started for this project yet.</p>
          <Button
            onClick={() => handleSendMessage(null, threadTypeHintApi)}
            disabled={!selectedProject || !user}
            size="sm"
          >
            Start Chat: {threadTypeForDisplay}
          </Button>
        </div>
      );
    }

    // Thread exists, proceed to render chat.
    const currentMessages = messagesMap[currentThreadId] || [];
    const currentNewMessage = newMessageContent[currentThreadId] || '';

    return (
      <div className="flex flex-col h-full border rounded-lg shadow-sm">
        <div className="p-3 bg-slate-100 border-b rounded-t-lg flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold text-slate-700">
              {thread.title || threadTypeForDisplay}
              {thread.project_id && <span className="text-sm text-slate-500 ml-2">(Project: {selectedProject?.title})</span>}
            </h3>
          </div>
          {selectedProject && thread.project_id && (
            <Button
              variant="outline"
              size="xs"
              onClick={() => window.open(`/#/dashboard/projects/${selectedProject.id}/files`, '_blank')} // Assuming a conventional path
              title="Open project files in new tab"
            >
              Project Files
            </Button>
          )}
        </div>
        <div className="flex-grow p-4 space-y-3 overflow-y-auto bg-white min-h-[300px]">
          {isLoadingMessages[currentThreadId] && <LoadingSpinner text="Loading messages..." />}
          {!isLoadingMessages[currentThreadId] && currentMessages.length === 0 && <div className="text-center text-gray-400">No messages yet.</div>}
          {currentMessages.map(msg => (
            <div key={msg.id} className={`flex ${msg.sender_id === user!.id ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-lg p-2.5 rounded-lg shadow-sm ${msg.sender_id === user!.id ? 'bg-primary text-white rounded-br-none' : 'bg-slate-50 text-slate-700 rounded-bl-none'}`}>
                <p className="text-xs font-semibold mb-0.5 text-secondary-dark">{msg.sender_username}</p>
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                <p className={`text-xs mt-1 ${msg.sender_id === user!.id ? 'text-gray-200 text-right' : 'text-slate-400 text-left'}`}>{new Date(msg.sent_at).toLocaleTimeString()}</p>
                {/* Admin moderation UI for messages from others that require approval */}
                {msg.requires_approval && msg.sender_id !== user!.id && msg.approval_status === 'pending' && (
                  <div className="mt-2 pt-2 border-t border-slate-200">
                    <p className="text-xs text-amber-600 italic">This message requires your approval.</p>
                    <div className="flex space-x-2 mt-1">
                      <Button size="xs" variant="success" onClick={() => handleApproveMessage(msg.id, currentThreadId)} leftIcon={<HandThumbUpIcon />}>Approve</Button>
                      <Button size="xs" variant="danger" onClick={() => handleRejectMessage(msg.id, currentThreadId)} leftIcon={<HandThumbDownIcon />}>Reject</Button>
                    </div>
                  </div>
                )}
                 {msg.approval_status === 'rejected' && msg.sender_id !== user!.id && (
                     <p className="text-xs text-red-500 italic mt-1">You rejected this message.</p>
                 )}
                 {msg.approval_status === 'approved' && msg.requires_approval && msg.sender_id !== user!.id && (
                     <p className="text-xs text-green-500 italic mt-1">You approved this message.</p>
                 )}
              </div>
            </div>
          ))}
        </div>
        <div className="p-3 bg-slate-50 border-t rounded-b-lg">
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={currentNewMessage}
              onChange={(e) => setNewMessageContent(prev => ({ ...prev, [currentThreadId]: e.target.value }))}
              onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSendMessage(thread, threadTypeHintApi))}
              placeholder="Type your message..."
              className="flex-1 p-2 border border-slate-300 rounded-lg focus:ring-primary-dark focus:border-primary-dark text-sm"
            />
            <Button onClick={() => handleSendMessage(thread, threadTypeHintApi)} disabled={!currentNewMessage.trim()} className="p-2">
              <PaperAirplaneIcon className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    );
  };

  // Helper to get an icon for each thread type
  const getThreadIcon = (type: LocalMessageThread['type']) => {
    switch(type) {
        case 'project_client_admin_freelancer': return <UserGroupIcon className="w-5 h-5 mr-2 text-slate-500" />;
        case 'project_admin_client': return <BuildingStorefrontIcon className="w-5 h-5 mr-2 text-slate-500" />;
        case 'project_admin_freelancer': return <UsersIcon className="w-5 h-5 mr-2 text-slate-500" />;
        default: return <ChatBubbleLeftRightIcon className="w-5 h-5 mr-2 text-slate-500" />;
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-6">
      <h1 className="text-2xl font-semibold text-slate-800 mb-6">Admin Project Messaging</h1>
      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Project List */}
        <div className="md:col-span-1 bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold text-slate-700 mb-3">Select a Project</h2>
          {isLoadingProjects && <LoadingSpinner text="Loading projects..." />}
          {!isLoadingProjects && projects.length === 0 && <p className="text-slate-500">No projects found.</p>}
          <ul className="space-y-2 max-h-96 overflow-y-auto">
            {projects.map(p => (
              <li key={p.id}
                  onClick={() => handleSelectProject(p)}
                  className={`p-3 rounded-md cursor-pointer transition-colors
                              ${selectedProject?.id === p.id ? 'bg-primary text-white shadow-md' : 'bg-slate-50 hover:bg-primary-extralight text-slate-700'}`}>
                <p className="font-medium">{p.title}</p>
                <p className={`text-xs ${selectedProject?.id === p.id ? 'text-slate-200' : 'text-slate-500'}`}>Client: {p.client_username || 'N/A'} | Freelancer: {p.freelancer_username || 'N/A'}</p>
              </li>
            ))}
          </ul>
        </div>

        {/* Messaging Area */}
        <div className="md:col-span-2 space-y-6">
          {!selectedProject ? (
            <div className="bg-white p-6 rounded-lg shadow text-center text-slate-500">
              <ChatBubbleLeftRightIcon className="w-16 h-16 mx-auto text-slate-300 mb-4" />
              <p>Please select a project to view and manage messages.</p>
            </div>
          ) : (
            <>
              <div className="bg-white p-1 rounded-lg shadow">
                {renderChatInterface(adminFreelancerThread, "Admin-Freelancer")}
              </div>
              <div className="bg-white p-1 rounded-lg shadow">
                {renderChatInterface(adminClientThread, "Admin-Client")}
              </div>
              {/* Placeholder for Freelancer-Client pending approval messages view */}
              <div className="bg-white p-4 rounded-lg shadow">
                <h3 className="text-lg font-semibold text-slate-700 mb-2">Freelancer to Client (Pending Approval)</h3>
                <p className="text-slate-500 text-sm">
                  {/* TODO: List messages from 'project_freelancer_client' threads that have requires_approval=true and approval_status='pending' */}
                  Feature to view and moderate these messages will be here.
                </p>
              </div>
            <>
              <div className="bg-white p-1 rounded-lg shadow">
                <h4 className="text-md font-medium text-slate-600 p-3 flex items-center"><UserGroupIcon className="w-5 h-5 mr-2 text-slate-500" /> Client / Admin / Freelancer Chat</h4>
                {renderChatInterface(clientAdminFreelancerThread, "Client/Admin/Freelancer", 'project_client_admin_freelancer')}
              </div>
              <div className="bg-white p-1 rounded-lg shadow">
                 <h4 className="text-md font-medium text-slate-600 p-3 flex items-center"><BuildingStorefrontIcon className="w-5 h-5 mr-2 text-slate-500" /> Admin / Client Only Chat</h4>
                {renderChatInterface(adminClientThread, "Admin-Client", 'project_admin_client')}
              </div>
              <div className="bg-white p-1 rounded-lg shadow">
                <h4 className="text-md font-medium text-slate-600 p-3 flex items-center"><UsersIcon className="w-5 h-5 mr-2 text-slate-500" /> Admin / Freelancer Only Chat</h4>
                {renderChatInterface(adminFreelancerThread, "Admin-Freelancer", 'project_admin_freelancer')}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminProjectMessagingPage;
