import React, { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "../contexts/AuthContext"; // Path adjusted
import {
  MessageThread,
  ThreadMessage,
  SendThreadMessagePayload,
  fetchUserMessageThreadsAPI,
  fetchThreadMessagesAPI,
  sendThreadMessageAPI,
  // For "New Chat" modal to find users
  getMessageableUsersAPI, // Use the new API for DM restrictions
  MessageableUser as UserToChatWith, // Use the new type
} from "../apiService"; // Path adjusted
import { useNavigate, useLocation } from "react-router-dom";
import Button from "./shared/Button"; // Path adjusted
import {
  PaperAirplaneIcon,
  ArrowLeftIcon,
  ChatBubbleLeftRightIcon,
  UsersIcon,
  ClockIcon, // For pending status
  CheckCircleIcon, // For approved status
  XCircleIcon, // For rejected status
} from "./shared/IconComponents"; // Path adjusted
import LoadingSpinner from "./shared/LoadingSpinner"; // Path adjusted
import Modal from "./shared/Modal"; // Path adjusted


// AdminUserView was for admin user management, renaming for clarity for "new chat user list"
// Using UserToChatWith (imported as AdminUserView and aliased)

// Conversation interface is replaced by MessageThread from apiService.ts

const formatMessageTimestamp = (isoString: string | null | undefined): string => {
  if (!isoString) return '';
  const date = new Date(isoString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const MessagingPage: React.FC = () => {
  const { user } = useAuth();
  // const navigate = useNavigate(); // Not currently used
  // const location = useLocation(); // Not currently used

  const [threads, setThreads] = useState<MessageThread[]>([]);
  const [selectedThread, setSelectedThread] = useState<MessageThread | null>(null);
  const [messages, setMessages] = useState<ThreadMessage[]>([]); // Updated type
  const [newMessageContent, setNewMessageContent] = useState('');
  const [isLoadingThreads, setIsLoadingThreads] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isCreateChatModalOpen, setIsCreateChatModalOpen] = useState(false);
  const [usersForNewChat, setUsersForNewChat] = useState<UserToChatWith[]>([]); // Updated type
  const [searchTermForNewChat, setSearchTermForNewChat] = useState('');
  const [isCreatingChat, setIsCreatingChat] = useState(false);


  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const loadThreads = useCallback(async (selectThreadId?: number) => {
    if (!user) return;
    setIsLoadingThreads(true); setError(null);
    try {
      const userThreads = await fetchUserMessageThreadsAPI();
      // Sorting logic can remain similar if last_message_at and created_at are available
      userThreads.sort((a, b) => {
        const aTimestamp = a.last_message_at ? new Date(a.last_message_at).getTime() : new Date(a.created_at).getTime();
        const bTimestamp = b.last_message_at ? new Date(b.last_message_at).getTime() : new Date(b.created_at).getTime();
        return bTimestamp - aTimestamp;
      });
      setThreads(userThreads);
      if (selectThreadId) {
        const toSelect = userThreads.find(t => t.thread_id === selectThreadId);
        if (toSelect) setSelectedThread(toSelect);
      } else if (userThreads.length > 0 && !selectedThread) {
        // setSelectedThread(userThreads[0]); // Optionally auto-select first thread
      }
    } catch (err: any) {
      console.error("Failed to load threads:", err);
      setError(err.message || "Could not load your chats. Please try again.");
    } finally {
      setIsLoadingThreads(false);
    }
  }, [user, selectedThread]);

  useEffect(() => {
    loadThreads();
  }, [loadThreads]);

  useEffect(() => {
    const loadMessages = async () => {
      if (selectedThread && user) {
        setIsLoadingMessages(true); setError(null);
        try {
          // The fetchThreadMessagesAPI now handles marking messages as read on backend
          const threadMessages = await fetchThreadMessagesAPI(selectedThread.thread_id, { limit: 100 });
          setMessages(threadMessages);

          // If unread_count was positive, refresh threads list to get updated unread_count
          if (selectedThread.unread_count > 0) {
            loadThreads(selectedThread.thread_id); // Reload threads to reflect new unread counts
          }
        } catch (err: any) {
          console.error("Failed to load messages:", err);
          setError(err.message || "Could not load messages for this chat.");
        } finally {
          setIsLoadingMessages(false);
        }
      } else {
        setMessages([]);
      }
    };
    loadMessages();
  }, [selectedThread, user, loadThreads]);


  const handleSendMessage = async () => {
    if (!newMessageContent.trim() || !selectedThread || !user) return;
    setIsSendingMessage(true); setError(null);

    const payload: SendThreadMessagePayload = {
      thread_id: selectedThread.thread_id,
      content: newMessageContent.trim(),
      // project_id and thread_type_hint are not needed when sending to an existing thread_id
    };

    try {
      const response = await sendThreadMessageAPI(payload);
      // Add the new message optimistically if backend doesn't return full message object
      // Or better, backend returns the created message object
      const optimisticMessage: ThreadMessage = {
        id: response.message_id || Date.now(), // Use actual ID from response, fallback for optimism
        thread_id: selectedThread.thread_id,
        sender_id: user.id,
        sender_username: user.username,
        // sender_avatar_url: user.avatarUrl, // If available on user object
        content: newMessageContent.trim(),
        sent_at: new Date().toISOString(),
        requires_approval: response.requires_approval || false,
        approval_status: response.approval_status || null,
      };
      setMessages(prev => [...prev, optimisticMessage]);
      setNewMessageContent('');
      // Reload threads to update last message preview and sorting
      loadThreads(selectedThread.thread_id);
    } catch (err: any) {
      console.error("Failed to send message:", err);
      setError(err.message || "Failed to send message.");
    } finally {
      setIsSendingMessage(false);
    }
  };

  const getThreadDisplayName = (thread: MessageThread): string => {
    if (!user) return "Chat";
    if (thread.title) return thread.title; // Use custom thread title if available (e.g. for project threads)

    // For 'direct' threads, generate name from other participants
    if (thread.type === 'direct') {
      const otherParticipants = thread.participants.filter(p => p.id !== user.id);
      if (otherParticipants.length > 0) {
        return otherParticipants.map(p => p.username).join(', ');
      }
      return "Chat with Yourself"; // Should not happen often
    }
    return thread.project_title ? `Project: ${thread.project_title}` : "Chat"; // Fallback for project threads without custom title
  };

  const getOtherParticipantAvatarName = (thread: MessageThread): string => {
    if (!user) return "C";
    const otherParticipants = thread.participants.filter(p => p.id !== user.id);
    if (otherParticipants.length === 1) {
      return otherParticipants[0].username;
    }
    if (thread.participants.length > 1) return "Group"; // For group DMs or project chats
    return thread.title || "Chat"; // Fallback
  };

  const handleOpenCreateChatModal = async () => {
    setIsCreateChatModalOpen(true);
    setSearchTermForNewChat('');
    setIsLoadingThreads(true); // Re-use for loading user list state
    setError(null);
    try {
      // Call getMessageableUsersAPI - backend handles filtering based on user role
      const messageableUsers = await getMessageableUsersAPI();
      if (user) {
        // Filter out the current user from the list of messageable users
        setUsersForNewChat(messageableUsers.filter(u => u.id !== user.id));
      } else {
        setUsersForNewChat(messageableUsers); // Should not happen if page is protected
      }
    } catch (err: any) {
      setError(err.message || "Could not load users to start a new chat.");
      console.error("Error fetching messageable users:", err);
    } finally {
      setIsLoadingThreads(false);
    }
  };

  const handleSelectUserForNewChat = async (recipient: UserToChatWith) => {
    setIsCreateChatModalOpen(false);
    if (!user) { setError("You must be logged in."); return; }
    setIsCreatingChat(true); setError(null);

    // Validate if non-admin user is trying to DM a non-admin (though list should be pre-filtered)
    if ((user.role === 'freelancer' || user.role === 'client') && recipient.role !== 'admin') {
        setError("Freelancers and Clients can only initiate direct messages with Admins.");
        setIsCreatingChat(false);
        return;
    }

    try {
      const payload: SendThreadMessagePayload = {
        target_user_ids: [recipient.id], // recipient.id is number, API expects number[]
        thread_type_hint: 'direct',
        // Sending an initial message is optional; backend can create empty thread too.
        // For this example, let's assume an initial message is not strictly required to create the thread.
        // If content is required, add: content: `Chat started with ${recipient.username}`
      };
      const response = await sendThreadMessageAPI(payload);
      // After successfully creating/finding the thread, load all threads again and select the new/found one.
      loadThreads(response.thread_id);
    } catch (err: any) {
      setError(err.message || "Could not start or find chat.");
      console.error("Error selecting user for new chat:", err);
    } finally {
      setIsCreatingChat(false);
    }
  };

  const filteredUsersForNewChat = usersForNewChat.filter(u =>
    u.username.toLowerCase().includes(searchTermForNewChat.toLowerCase()) ||
    (u.email && u.email.toLowerCase().includes(searchTermForNewChat.toLowerCase()))
  );


  return (
    <div className="flex flex-col h-full overflow-hidden bg-gray-50 rounded-lg shadow-inner">
      {error && <div className="p-2 text-center text-red-600 bg-red-100 border-b">{error} <Button variant="ghost" size="sm" onClick={() => setError(null)} className="ml-2 !text-red-600">Dismiss</Button></div>}

      <div className="flex flex-1 overflow-hidden">
        {/* Threads List Pane */}
        <div className={`w-full md:w-1/3 lg:w-1/4 border-r border-gray-200 bg-white flex flex-col ${selectedThread && 'hidden md:flex'}`}>
          <div className="p-3 border-b flex justify-between items-center">
            <h2 className="text-xl font-semibold text-primary">Chats</h2>
            <Button size="sm" variant="outline" onClick={handleOpenCreateChatModal} leftIcon={<UsersIcon />} disabled={isCreatingChat || isLoadingThreads}>
              New Chat
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {isLoadingThreads && threads.length === 0 && <LoadingSpinner text="Loading chats..." className="p-4" />}
            {!isLoadingThreads && threads.length === 0 && <div className="p-4 text-center text-gray-500">No chats yet. Start one with "New Chat".</div>}
            {threads.map(thread => (
              <div
                key={thread.thread_id}
                className={`p-3 hover:bg-primary-extralight cursor-pointer border-b border-gray-100
                            ${selectedThread?.thread_id === thread.thread_id ? 'bg-accent' : ''}
                            ${thread.unread_count > 0 ? 'font-semibold' : ''}`}
                onClick={() => setSelectedThread(thread)}
              >
                <div className="flex items-center space-x-3">
                  <img
                    src={thread.participants.find(p => p.id !== user?.id)?.avatar_url || `https://ui-avatars.com/api/?name=${getOtherParticipantAvatarName(thread).replace(/\s+/g, '+')}&background=A6C4BD&color=2A5B53&rounded=true&font-size=0.5`}
                    alt="avatar"
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center">
                      <p className={`text-sm ${thread.unread_count > 0 ? 'text-primary' : 'text-gray-800'} truncate`}>
                        {getThreadDisplayName(thread)}
                      </p>
                      {thread.unread_count > 0 && (
                        <span className="ml-2 text-xs bg-accent text-primary-dark font-bold px-1.5 py-0.5 rounded-full">
                          {thread.unread_count}
                        </span>
                      )}
                    </div>
                    <p className={`text-xs ${thread.unread_count > 0 ? 'text-primary-dark' : 'text-gray-500'} truncate`}>
                      {thread.last_message_sender_id === user?.id ? 'You: ' : ''}{thread.last_message_snippet || 'No messages yet.'}
                    </p>
                  </div>
                  <div className="text-xs text-gray-400 self-start">{formatMessageTimestamp(thread.last_message_at)}</div>
                </div>
              </div>
            ))}
            {isCreatingChat && <LoadingSpinner text="Starting chat..." className="p-4" />}
          </div>
        </div>

        {/* Message Display Pane */}
        <div className={`flex-1 flex flex-col bg-gray-100 ${!selectedThread ? 'hidden md:flex md:items-center md:justify-center' : 'flex'}`}>
          {selectedThread && (
            <div className="p-2 border-b md:hidden bg-white sticky top-0 z-10">
              <Button variant="ghost" onClick={() => setSelectedThread(null)} leftIcon={<ArrowLeftIcon />}>
                Back to Chats
              </Button>
            </div>
          )}
          {!selectedThread ? (
            <div className="text-center text-gray-500 p-5">
              <ChatBubbleLeftRightIcon className="w-20 h-20 mx-auto mb-4 text-gray-300" />
              <p>Select a chat to view messages or create a new one.</p>
            </div>
          ) : (
            <>
              <div className="p-3 bg-white border-b border-gray-200 flex items-center space-x-3 sticky top-0 z-10 md:static">
                <img
                  src={selectedThread.participants.find(p => p.id !== user?.id)?.avatar_url || `https://ui-avatars.com/api/?name=${getOtherParticipantAvatarName(selectedThread).replace(/\s+/g, '+')}&background=A6C4BD&color=2A5B53&rounded=true&font-size=0.5`}
                  alt="avatar"
                  className="w-9 h-9 rounded-full object-cover"
                />
                <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-700">{getThreadDisplayName(selectedThread)}</h3>
                    {selectedThread.project_id && selectedThread.type !== 'direct' && (
                         <p className="text-xs text-gray-500">Project: {selectedThread.project_title || `ID ${selectedThread.project_id}`}</p>
                    )}
                </div>
                {selectedThread.project_id && selectedThread.type !== 'direct' && (
                     <Button
                        variant="outline"
                        size="xs"
                        onClick={() => window.open(`/#/dashboard/projects/${selectedThread.project_id}/files`, '_blank')}
                        title="Open project files in new tab"
                    >
                        Project Files
                    </Button>
                )}
              </div>
              <div className="flex-1 p-4 space-y-3 overflow-y-auto bg-gray-50 min-h-[300px]">
                {isLoadingMessages && <LoadingSpinner text="Loading messages..." className="p-4" />}
                {!isLoadingMessages && messages.length === 0 && <div className="text-center text-gray-400 p-4">No messages yet. Send one to start the conversation!</div>}
                {messages.map(msg => {
                  const isSender = msg.sender_id === user?.id;
                  let approvalText = '';
                  if (isSender && msg.requires_approval) {
                    if (msg.approval_status === 'pending') approvalText = '(Pending Approval)';
                    else if (msg.approval_status === 'rejected') approvalText = '(Rejected by Admin)';
                  }

                  return (
                    <div key={msg.id} className={`flex ${isSender ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-xs lg:max-w-md p-2.5 rounded-lg shadow ${isSender ? 'bg-primary text-white rounded-br-none' : 'bg-white text-gray-700 rounded-bl-none'}`}>
                        {!isSender && <p className="text-xs font-semibold mb-0.5 text-secondary">{msg.sender_username}</p>}
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        <div className="flex justify-between items-center mt-1">
                          <p className={`text-xs ${isSender ? 'text-gray-200' : 'text-gray-400'}`}>{formatMessageTimestamp(msg.sent_at)}</p>
                          {approvalText && (
                            <span className={`text-xs italic ml-2 ${msg.approval_status === 'rejected' ? 'text-red-300' : 'text-gray-300'}`}>
                              {msg.approval_status === 'pending' && <ClockIcon className="inline w-3 h-3 mr-1" />}
                              {msg.approval_status === 'rejected' && <XCircleIcon className="inline w-3 h-3 mr-1" />}
                              {approvalText}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
              <div className="p-3 bg-white border-t border-gray-200 sticky bottom-0 z-10">
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={newMessageContent}
                    onChange={(e) => setNewMessageContent(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSendMessage())}
                    placeholder="Type your message..."
                    className="flex-1 p-2.5 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary text-sm"
                    disabled={isSendingMessage || isLoadingMessages}
                  />
                  <Button onClick={handleSendMessage} disabled={!newMessageContent.trim() || isSendingMessage || isLoadingMessages} isLoading={isSendingMessage} className="p-2.5">
                    <PaperAirplaneIcon className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Create New Chat Modal (for Direct Messages) */}
        <Modal isOpen={isCreateChatModalOpen} onClose={() => setIsCreateChatModalOpen(false)} title="Start a New Direct Chat">
            <input
                type="text"
                placeholder="Search users by name or email..."
                value={searchTermForNewChat}
                onChange={(e) => setSearchTermForNewChat(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md mb-3"
            />
            {isLoadingThreads && <LoadingSpinner text="Loading users..." />} {/* Re-using isLoadingThreads */}
            <div className="max-h-60 overflow-y-auto">
                {filteredUsersForNewChat.length === 0 && !isLoadingThreads && <p className="text-gray-500">No users found.</p>}
                {filteredUsersForNewChat.map(u => (
                    <div key={u.id}
                         className="p-2 hover:bg-gray-100 cursor-pointer rounded-md flex items-center space-x-2"
                         onClick={() => handleSelectUserForNewChat(u)}>
                        <img
                            src={u.avatarUrl || `https://ui-avatars.com/api/?name=${u.username.replace(/\s+/g, '+')}&background=random&color=fff&rounded=true&size=32`}
                            alt={u.username}
                            className="w-8 h-8 rounded-full object-cover"
                        />
                        <div>
                            <p className="font-medium">{u.username}</p>
                            <p className="text-sm text-gray-500">{u.email}</p>
                        </div>
                    </div>
                ))}
            </div>
            <div className="text-right mt-4">
                <Button variant="secondary" onClick={() => setIsCreateChatModalOpen(false)}>Cancel</Button>
            </div>
        </Modal>
      </div>
    </div>
  );
};

export default MessagingPage;
