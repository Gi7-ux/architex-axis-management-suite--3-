import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate }from 'react-router-dom';
// Removed old Conversation, Message, MessageStatus types
import { User } from '../../types'; // UserRole removed as it's not used directly here, User for auth context
import { useAuth } from './AuthContext';
import {
    // New Messaging APIs
    findOrCreateConversationAPI,
    fetchUserConversationsAPI,
    fetchConversationMessagesAPI,
    sendMessageAPI,
    markConversationAsReadAPI,
    // New Messaging Types
    ConversationPreviewPHP,
    MessagePHP,
    SendMessagePayload,
    FindOrCreateConversationResponse,
    // Other APIs needed
    adminFetchAllUsersAPI, AdminUserView, ApiError // ApiError might be useful for typed catch blocks
} from '../../apiService';
// NAV_LINKS might not be needed anymore if navigation is simplified
// import { NAV_LINKS } from '../../constants';
import Button from './shared/Button';
// Adjusted icons
import { PaperAirplaneIcon, PaperClipIcon, ArrowLeftIcon, ChatBubbleLeftRightIcon, UserPlusIcon } from './shared/IconComponents';
import Modal from './shared/Modal';
import LoadingSpinner from '../shared/LoadingSpinner'; // Corrected path


const formatMessageTimestamp = (isoString: string | null): string => {
  if (!isoString) return '';
  const date = new Date(isoString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const MessagingPage: React.FC = () => {
  const { user } = useAuth();
  // location and navigate might be used less if project-based chat initiation is removed
  // const location = useLocation();
  // const navigate = useNavigate();

  const [conversations, setConversations] = useState<ConversationPreviewPHP[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<ConversationPreviewPHP | null>(null);
  const [messages, setMessages] = useState<MessagePHP[]>([]);
  const [newMessageContent, setNewMessageContent] = useState('');
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  // const [isAttachFileModalOpen, setIsAttachFileModalOpen] = useState(false); // File uploads deferred
  const [error, setError] = useState<string | null>(null);

  const [isCreateConversationModalOpen, setIsCreateConversationModalOpen] = useState(false);
  const [usersForNewConversation, setUsersForNewConversation] = useState<AdminUserView[]>([]);
  const [searchTermForNewConversation, setSearchTermForNewConversation] = useState('');
  const [isCreatingConversation, setIsCreatingConversation] = useState(false);


  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const loadConversations = useCallback(async (selectConvId?: number) => {
    if (!user) return;
    setIsLoadingConversations(true); setError(null);
    try {
      const userConversations = await fetchUserConversationsAPI();
      userConversations.sort((a, b) => {
          if (a.last_message_at === null && b.last_message_at === null) return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          if (a.last_message_at === null) return 1;
          if (b.last_message_at === null) return -1;
          return new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime();
      });
      setConversations(userConversations);
      if (selectConvId) {
        const toSelect = userConversations.find(c => c.conversation_id === selectConvId);
        if (toSelect) setSelectedConversation(toSelect);
      } else if (userConversations.length > 0 && !selectedConversation) {
        // Optionally select the first conversation if none is selected
        // setSelectedConversation(userConversations[0]);
      }
    } catch (err:any) {
      console.error("Failed to load conversations:", err);
      setError(err.message || "Could not load chats. Please try again.");
    } finally {
      setIsLoadingConversations(false);
    }
  }, [user, selectedConversation]); // Added selectedConversation to deps to potentially auto-select first if current is null

  useEffect(() => {
    loadConversations();
  }, [loadConversations]); // Initial load

  // Removed useEffect for location.state handling (project-based chat initiation)

  useEffect(() => {
    const loadMessages = async () => {
      if (selectedConversation && user) {
        setIsLoadingMessages(true); setError(null);
        try {
          const convMessages = await fetchConversationMessagesAPI(selectedConversation.conversation_id, { limit: 100 }); // Increased limit
          setMessages(convMessages);

          if (selectedConversation.unread_message_count > 0) {
            await markConversationAsReadAPI(selectedConversation.conversation_id);
            // Update unread count locally for immediate UI feedback
            const convIdx = conversations.findIndex(c => c.conversation_id === selectedConversation.conversation_id);
            if (convIdx !== -1) {
                const newConversations = [...conversations];
                newConversations[convIdx] = {...newConversations[convIdx], unread_message_count: 0};
                setConversations(newConversations);
            }
          }
        } catch (err:any) {
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConversation, user]); // Removed 'conversations' from dep array to avoid loop with unread update


  const handleSendMessage = async () => {
    if (!newMessageContent.trim() || !selectedConversation || !user) return;
    setIsSendingMessage(true); setError(null);
    const payload: SendMessagePayload = {
      conversation_id: selectedConversation.conversation_id,
      content: newMessageContent.trim(),
    };
    try {
      const sentMessage = await sendMessageAPI(payload);
      setMessages(prev => [...prev, sentMessage]);
      setNewMessageContent('');
      // Reload conversations to update last message preview and sorting
      await loadConversations(selectedConversation.conversation_id);
    } catch (err:any) {
      console.error("Failed to send message:", err);
      setError(err.message || "Failed to send message.");
    } finally {
      setIsSendingMessage(false);
    }
  };

  // Removed handleAdminMessageAction as admin moderation is simplified/removed for now

  const getConversationDisplayName = (conv: ConversationPreviewPHP): string => {
    if (!user) return "Conversation";
    
    // For 1-on-1 chats, display the other participant's name
    const otherParticipants = conv.participants.filter(p => p.id !== user.id);
    if (otherParticipants.length === 1) {
      return otherParticipants[0].username;
    }
    // Fallback for group chats or unexpected scenarios (though backend primarily creates 1-on-1)
    if (conv.participants.length > 1) {
      return conv.participants.map(p => p.username).join(', ');
    }
    return "Conversation"; // Should ideally not happen with valid data
  };

  const getOtherParticipantAvatarName = (conv: ConversationPreviewPHP): string => {
    if (!user) return "C"; // Fallback for Conversation
    const otherParticipants = conv.participants.filter(p => p.id !== user.id);
    if (otherParticipants.length === 1) {
      return otherParticipants[0].username;
    }
    return "Group"; // Fallback for group or self-chat
  };


  const handleOpenCreateConversationModal = async () => {
      setIsCreateConversationModalOpen(true);
      setSearchTermForNewConversation('');
      setIsLoadingConversations(true); // Use conversation loader for user list loading
      try {
          const allUsers = await adminFetchAllUsersAPI();
          if(user) {
            setUsersForNewConversation(allUsers.filter(u => u.id !== user.id));
          } else {
            setUsersForNewConversation(allUsers);
          }
      } catch (err) {
          setError("Could not load users to start a new chat.");
      } finally {
        setIsLoadingConversations(false);
      }
  };

  const handleSelectUserForNewConversation = async (recipient: AdminUserView) => {
      setIsCreateConversationModalOpen(false);
      if (!user) { setError("You must be logged in."); return; }
      setIsCreatingConversation(true); setError(null);
      try {
          const response = await findOrCreateConversationAPI(recipient.id);
          // Refresh conversation list and select the new/found one
          // setSelectedConversation(null); // Deselect current to ensure useEffect for messages re-triggers correctly if same ID
          await loadConversations(response.conversation_id); // This will also set selectedConversation if found
          // The loadConversations should ideally handle setting the selectedConversation
          // If not, manual find and set might be needed, but it's better if loadConversations does it.
      } catch (err:any) {
          setError(err.message || "Could not start or find conversation.");
      } finally {
        setIsCreatingConversation(false);
      }
  };

  const filteredUsersForNewConvo = usersForNewConversation.filter(u =>
      u.username.toLowerCase().includes(searchTermForNewConversation.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTermForNewConversation.toLowerCase())
  );


  return (
    <div className="flex flex-col h-full overflow-hidden bg-gray-50 rounded-lg shadow-inner">
      {error && <div className="p-2 text-center text-red-600 bg-red-100 border-b">{error} <Button variant="ghost" size="sm" onClick={() => setError(null)} className="ml-2 !text-red-600">Dismiss</Button></div>}

      <div className="flex flex-1 overflow-hidden">
        {/* Conversations List Pane */}
        <div className={`w-full md:w-1/3 lg:w-1/4 border-r border-gray-200 bg-white flex flex-col ${selectedConversation && 'hidden md:flex'}`}>
          <div className="p-3 border-b flex justify-between items-center">
            <h2 className="text-xl font-semibold text-primary">Chats</h2>
            <Button size="sm" variant="outline" onClick={handleOpenCreateConversationModal} leftIcon={<UserPlusIcon />} disabled={isCreatingConversation || isLoadingConversations}>
              New Chat
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {isLoadingConversations && conversations.length === 0 && <LoadingSpinner text="Loading chats..." className="p-4" />}
            {!isLoadingConversations && conversations.length === 0 && <div className="p-4 text-center text-gray-500">No conversations yet. Start one with "New Chat".</div>}
            {conversations.map(conv => (
              <div
                key={conv.conversation_id}
                className={`p-3 hover:bg-primary-extralight cursor-pointer border-b border-gray-100
                            ${selectedConversation?.conversation_id === conv.conversation_id ? 'bg-accent' : ''}
                            ${conv.unread_message_count > 0 ? 'font-semibold' : ''}`}
                onClick={() => setSelectedConversation(conv)}
              >
                <div className="flex items-center space-x-3">
                  <img
                    src={`https://ui-avatars.com/api/?name=${getOtherParticipantAvatarName(conv).replace(/\s+/g, '+')}&background=A6C4BD&color=2A5B53&rounded=true&font-size=0.5`}
                    alt="avatar"
                    className="w-10 h-10 rounded-full"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center">
                        <p className={`text-sm ${conv.unread_message_count > 0 ? 'text-primary' : 'text-gray-800'} truncate`}>
                            {getConversationDisplayName(conv)}
                        </p>
                        {conv.unread_message_count > 0 && (
                            <span className="ml-2 text-xs bg-accent text-primary-dark font-bold px-1.5 py-0.5 rounded-full">
                                {conv.unread_message_count}
                            </span>
                        )}
                    </div>
                    <p className={`text-xs ${conv.unread_message_count > 0 ? 'text-primary-dark' : 'text-gray-500'} truncate`}>
                        {conv.last_message_sender_id === user?.id ? 'You: ' : ''}{conv.last_message_snippet || 'No messages yet.'}
                    </p>
                  </div>
                  <div className="text-xs text-gray-400 self-start">{formatMessageTimestamp(conv.last_message_at)}</div>
                </div>
              </div>
            ))}
             {isCreatingConversation && <LoadingSpinner text="Starting chat..." className="p-4"/>}
          </div>
        </div>

        {/* Message Display Pane */}
        <div className={`flex-1 flex flex-col bg-gray-100 ${!selectedConversation ? 'hidden md:flex md:items-center md:justify-center' : 'flex'}`}>
          {selectedConversation && (
            <div className="p-2 border-b md:hidden bg-white sticky top-0 z-10"> {/* Mobile: Back button bar */}
              <Button variant="ghost" onClick={() => setSelectedConversation(null)} leftIcon={<ArrowLeftIcon />}>
                Back to Chats
              </Button>
            </div>
          )}
          {!selectedConversation ? (
            <div className="text-center text-gray-500 p-5">
              <ChatBubbleLeftRightIcon className="w-20 h-20 mx-auto mb-4 text-gray-300"/>
              <p>Select a conversation to start chatting or create a new one.</p>
            </div>
          ) : (
            <>
              <div className="p-3 bg-white border-b border-gray-200 flex items-center space-x-3 sticky top-0 z-10 md:static"> {/* Header for selected chat */}
                 <img
                    src={`https://ui-avatars.com/api/?name=${getOtherParticipantAvatarName(selectedConversation).replace(/\s+/g, '+')}&background=A6C4BD&color=2A5B53&rounded=true&font-size=0.5`}
                    alt="avatar"
                    className="w-9 h-9 rounded-full"
                  />
                <h3 className="text-lg font-semibold text-gray-700">{getConversationDisplayName(selectedConversation)}</h3>
              </div>
              <div className="flex-1 p-4 space-y-3 overflow-y-auto bg-gray-50">
                {isLoadingMessages && <LoadingSpinner text="Loading messages..." className="p-4"/>}
                {!isLoadingMessages && messages.length === 0 && <div className="text-center text-gray-400 p-4">No messages yet. Send one to start the conversation!</div>}
                {messages.map(msg => {
                  const isSender = msg.sender_id === user?.id;
                  return (
                    <div key={msg.id} className={`flex ${isSender ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-xs lg:max-w-md p-2.5 rounded-lg shadow ${isSender ? 'bg-primary text-white rounded-br-none' : 'bg-white text-gray-700 rounded-bl-none'}`}>
                        {!isSender && <p className="text-xs font-semibold mb-0.5 text-secondary">{msg.sender_username}</p>}
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        <p className={`text-xs mt-1 ${isSender ? 'text-gray-200 text-right' : 'text-gray-400 text-left'}`}>{formatMessageTimestamp(msg.created_at)}</p>
                        {/* Admin moderation UI removed */}
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
              <div className="p-3 bg-white border-t border-gray-200 sticky bottom-0 z-10"> {/* Message Input Area */}
                <div className="flex items-center space-x-2">
                  {/* File attach button (placeholder for now)
                  <Button variant="ghost" onClick={() => alert("File attachment not implemented yet.")} className="p-2">
                    <PaperClipIcon className="w-5 h-5 text-gray-500 hover:text-primary"/>
                  </Button>
                  */}
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
                    <PaperAirplaneIcon className="w-5 h-5"/>
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Create New Conversation Modal */}
        <Modal isOpen={isCreateConversationModalOpen} onClose={() => setIsCreateConversationModalOpen(false)} title="Start a New Chat">
            <input
                type="text"
                placeholder="Search users by name or email..."
                value={searchTermForNewConversation}
                onChange={(e) => setSearchTermForNewConversation(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md mb-3"
            />
            {isLoadingConversations && <LoadingSpinner text="Loading users..." />}
            <div className="max-h-60 overflow-y-auto">
                {filteredUsersForNewConvo.length === 0 && !isLoadingConversations && <p className="text-gray-500">No users found matching your search.</p>}
                {filteredUsersForNewConvo.map(u => (
                    <div key={u.id}
                         className="p-2 hover:bg-gray-100 cursor-pointer rounded-md flex items-center space-x-2"
                         onClick={() => handleSelectUserForNewConversation(u)}>
                        <img
                            src={`https://ui-avatars.com/api/?name=${u.username.replace(/\s+/g, '+')}&background=random&color=fff&rounded=true&size=32`}
                            alt={u.username}
                            className="w-8 h-8 rounded-full"
                        />
                        <div>
                            <p className="font-medium">{u.username}</p>
                            <p className="text-sm text-gray-500">{u.email}</p>
                        </div>
                    </div>
                ))}
            </div>
            <div className="text-right mt-4">
                <Button variant="secondary" onClick={() => setIsCreateConversationModalOpen(false)}>Cancel</Button>
            </div>
        </Modal>

        {/* Attach file modal (placeholder) - can be removed if not part of this phase
        <Modal isOpen={isAttachFileModalOpen} onClose={() => setIsAttachFileModalOpen(false)} title="Attach File">
            <p className="text-gray-600">File upload in chat is not yet implemented. This is a placeholder.</p>
            <div className="text-right mt-4">
                <Button onClick={() => setIsAttachFileModalOpen(false)}>Close</Button>
            </div>
        </Modal>
        */}
      </div>
    </div>
  );
};

export default MessagingPage;
