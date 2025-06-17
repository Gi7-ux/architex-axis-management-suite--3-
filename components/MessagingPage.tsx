import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate }from 'react-router-dom';
import { Conversation, Message, MessageStatus, UserRole, User } from '@/types';
import { useAuth } from '@/components/AuthContext';
import {
    fetchConversationsAPI, fetchMessagesAPI, sendMessageAPI, 
    updateMessageStatusAPI, deleteMessageAPI, findOrCreateConversationAPI,
    uploadFileAPI // For potential future chat file uploads
} from '@/apiService';
import { NAV_LINKS } from '@/constants'; // Removed getUserById
import Button from '@/components/shared/Button';
import { PaperAirplaneIcon, PaperClipIcon, CheckCircleIcon, XCircleIcon, TrashIcon, UserGroupIcon, ArrowLeftIcon, ChatBubbleLeftRightIcon } from '@/components/shared/IconComponents';
import Modal from '@/components/shared/Modal';
import LoadingSpinner from '@/components/shared/LoadingSpinner';


const formatMessageTimestamp = (isoString: string) => {
  const date = new Date(isoString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const MessagingPage: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessageContent, setNewMessageContent] = useState('');
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [isAttachFileModalOpen, setIsAttachFileModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const loadConversations = useCallback(async (selectConvId?: string) => {
    if (!user) return;
    setIsLoadingConversations(true);
    setError(null);
    try {
      const userConversations = await fetchConversationsAPI(user.id); // isAdmin flag was removed from API function signature
      setConversations(userConversations);
      if(selectConvId) {
        const toSelect = userConversations.find(c => c.id === selectConvId);
        if(toSelect) setSelectedConversation(toSelect);
      }
    } catch (err: any) {
      console.error("Failed to load conversations:", err);
      setError(err.message || "Could not load chats. Please try again.");
    } finally {
      setIsLoadingConversations(false);
    }
  }, [user]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Handle initial selection from navigation state (e.g., from ProjectDetailsPage)
  useEffect(() => {
    const handleInitialSelection = async () => {
        if (!user || conversations.length === 0 && !isLoadingConversations) return; // Wait for conversations or if no user

        const routeState = location.state as { projectId?: string; initialParticipantIds?: string[]; conversationId?: string } | undefined;

        if (routeState?.conversationId) {
            const directConv = conversations.find(c => c.id === routeState.conversationId);
            if (directConv) {
                setSelectedConversation(directConv);
                 navigate(location.pathname, { replace: true, state: {} }); // Clear state
            } else if (conversations.length > 0) { // If not found, but convos are loaded, select first or none
                // Potentially log warning if convId provided but not found
            }
        } else if (routeState?.projectId && routeState?.initialParticipantIds) {
            let projectConv = conversations.find(c => c.projectId === routeState.projectId);
            if (!projectConv) { // Conversation doesn't exist yet, try to create it
                try {
                    projectConv = await findOrCreateConversationAPI(routeState.initialParticipantIds, routeState.projectId);
                    // Add to list and select (or refetch all conversations for consistency)
                    await loadConversations(projectConv.id); // Reload and select
                } catch(err: any) {
                    setError(err.message || "Could not create or find chat for this project.");
                }
            } else {
                 setSelectedConversation(projectConv);
            }
            navigate(location.pathname, { replace: true, state: {} }); // Clear state
        }
    };
    if(!isLoadingConversations) handleInitialSelection(); // Only run if conversations are loaded
  }, [location.state, user, conversations, navigate, isLoadingConversations, loadConversations]);


  useEffect(() => {
    const loadMessages = async () => {
        if (selectedConversation && user) {
          setIsLoadingMessages(true);
          setError(null);
          try {
            const convMessages = await fetchMessagesAPI(selectedConversation.id); // userId and userRole removed from API call
            setMessages(convMessages);
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
  }, [selectedConversation, user]);

  const handleSendMessage = async () => {
    if (!newMessageContent.trim() || !selectedConversation || !user) return;
    setIsSendingMessage(true);
    setError(null);

    // Backend should determine final message status based on sender role and conversation context
    const messageData = {
        senderId: user.id,
        content: newMessageContent.trim(),
        // status: determinedStatus // Backend determines this
    };

    try {
        const sentMessage = await sendMessageAPI(selectedConversation.id, messageData);
        setMessages(prev => [...prev, sentMessage]); // Optimistic update
        setNewMessageContent('');
        // Update conversation list for last message snippet and timestamp
        const updatedConvIndex = conversations.findIndex(c => c.id === selectedConversation.id);
        if (updatedConvIndex !== -1) {
            const updatedConversations = [...conversations];
            updatedConversations[updatedConvIndex] = {
                ...updatedConversations[updatedConvIndex],
                lastMessageSnippet: sentMessage.content.substring(0, 50) + (sentMessage.content.length > 50 ? '...' : ''),
                lastMessageTimestamp: sentMessage.timestamp,
                updatedAt: sentMessage.timestamp,
            };
            updatedConversations.sort((a,b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
            setConversations(updatedConversations);
        }
    } catch (err: any) {
        console.error("Failed to send message:", err);
        setError(err.message || "Failed to send message.");
    } finally {
        setIsSendingMessage(false);
    }
  };

  const handleAdminMessageAction = async (messageId: string, action: 'approve' | 'reject' | 'delete') => {
    setError(null);
    try {
        let successMessageText = '';
        if (action === 'approve') {
            await updateMessageStatusAPI(messageId, MessageStatus.APPROVED);
            successMessageText = 'Message approved.';
        } else if (action === 'reject') {
            await updateMessageStatusAPI(messageId, MessageStatus.REJECTED_BY_ADMIN);
            successMessageText = 'Message rejected.';
        } else if (action === 'delete') {
            await deleteMessageAPI(messageId);
            successMessageText = 'Message deleted.';
        }
        
        if (selectedConversation && user) { // Reload messages for the current conversation
            const convMessages = await fetchMessagesAPI(selectedConversation.id);
            setMessages(convMessages);
            await loadConversations(selectedConversation.id); // Reload conversations to update snippets, etc.
            alert(successMessageText); // Simple notification
        }
    } catch (err: any) {
        console.error(`Error during admin message ${action}:`, err);
        setError(err.message || `Failed to ${action} message due to an error.`);
    }
  };

  const getConversationDisplayName = (conv: Conversation): string => {
    if (!user) return "Conversation";
    if (conv.projectTitle) return `Project: ${conv.projectTitle}`;
    
    // Ensure participantDetails is populated, or fallback
    const otherParticipants = conv.participantIds
        .filter(pid => pid !== user.id)
        .map(pid => conv.participantDetails?.[pid]?.name || `User...`); // Simplified fallback

    if (conv.isGroupChat || otherParticipants.length > 1) {
        return otherParticipants.length > 0 ? otherParticipants.join(', ') : "Group Chat";
    }
    return otherParticipants[0] || "Conversation";
  };

  const getOtherParticipantAvatar = (conv: Conversation): string | undefined => {
    if(!user || conv.isGroupChat || !conv.participantDetails) return undefined;
    const otherParticipantId = conv.participantIds.find(pid => pid !== user.id);
    return otherParticipantId ? conv.participantDetails[otherParticipantId]?.avatarUrl : undefined;
  };


  return (
    <div className="flex flex-col h-full overflow-hidden bg-gray-50 rounded-lg shadow-inner">
      {error && <div className="p-2 text-center text-red-600 bg-red-100">{error}</div>}
      {selectedConversation && (
        <div className="p-2 border-b md:hidden bg-white">
          <Button variant="ghost" onClick={() => setSelectedConversation(null)} leftIcon={<ArrowLeftIcon />}>
            Back to Chats
          </Button>
        </div>
      )}
      <div className="flex flex-1 overflow-hidden">
        <div className={`w-full md:w-1/3 lg:w-1/4 border-r border-gray-200 bg-white flex flex-col ${selectedConversation ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-4 border-b">
            <h2 className="text-xl font-semibold text-primary">Chats</h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            {isLoadingConversations && <LoadingSpinner text="Loading chats..." className="p-4" />}
            {!isLoadingConversations && conversations.length === 0 && <div className="p-4 text-center text-gray-500">No conversations yet.</div>}
            {conversations.map(conv => (
              <div
                key={conv.id}
                className={`p-3 hover:bg-primary-extralight cursor-pointer border-b border-gray-100 ${selectedConversation?.id === conv.id ? 'bg-accent' : ''}`}
                onClick={() => setSelectedConversation(conv)}
              >
                <div className="flex items-center space-x-3">
                  <img
                    src={conv.isGroupChat || conv.participantIds.length > 2 ? '/logo-silhouette.png' : getOtherParticipantAvatar(conv) || `https://ui-avatars.com/api/?name=${getConversationDisplayName(conv).replace(' ', '+')}&background=A6C4BD&color=2A5B53&rounded=true`}
                    alt="avatar"
                    className="w-10 h-10 rounded-full"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 truncate">{getConversationDisplayName(conv)}</p>
                    <p className="text-xs text-gray-500 truncate">{conv.lastMessageSnippet}</p>
                  </div>
                  <div className="text-xs text-gray-400 self-start">{conv.lastMessageTimestamp ? formatMessageTimestamp(conv.lastMessageTimestamp) : ''}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={`flex-1 flex flex-col bg-gray-100 ${!selectedConversation ? 'hidden md:flex md:items-center md:justify-center' : 'flex'}`}>
          {!selectedConversation ? (
            <div className="text-center text-gray-500">
              <ChatBubbleLeftRightIcon className="w-20 h-20 mx-auto mb-4 text-gray-300"/>
              <p>Select a conversation to start chatting.</p>
            </div>
          ) : (
            <>
              <div className="p-3 bg-white border-b border-gray-200 flex items-center space-x-3">
                 <img
                    src={selectedConversation.isGroupChat || selectedConversation.participantIds.length > 2 ? '/logo-silhouette.png' : getOtherParticipantAvatar(selectedConversation) || `https://ui-avatars.com/api/?name=${getConversationDisplayName(selectedConversation).replace(' ', '+')}&background=A6C4BD&color=2A5B53&rounded=true`}
                    alt="avatar"
                    className="w-9 h-9 rounded-full"
                  />
                <h3 className="text-lg font-semibold text-gray-700">{getConversationDisplayName(selectedConversation)}</h3>
              </div>
              <div className="flex-1 p-4 space-y-3 overflow-y-auto bg-gray-50">
                {isLoadingMessages && <LoadingSpinner text="Loading messages..." className="p-4"/>}
                {messages.map(msg => {
                  const isSender = msg.senderId === user?.id;
                  const senderDetails = selectedConversation.participantDetails?.[msg.senderId];
                  const senderName = senderDetails?.name || `User`;
                  return (
                    <div key={msg.id} className={`flex ${isSender ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-xs lg:max-w-md p-2.5 rounded-lg shadow ${isSender ? 'bg-primary text-white rounded-br-none' : 'bg-white text-gray-700 rounded-bl-none'}`}>
                        {!isSender && <p className="text-xs font-semibold mb-0.5" style={{color: isSender ? 'rgba(255,255,255,0.8)' : 'var(--color-secondary)'}}>{senderName}</p>}
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        <p className={`text-xs mt-1 ${isSender ? 'text-gray-200 text-right' : 'text-gray-400 text-left'}`}>{formatMessageTimestamp(msg.timestamp)}</p>
                        {user?.role === UserRole.ADMIN && msg.status !== MessageStatus.APPROVED && msg.status !== MessageStatus.SENT && (
                            <div className={`text-xs mt-1 p-1 rounded ${msg.status === MessageStatus.PENDING_ADMIN_APPROVAL ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                                Status: {msg.status}
                                {msg.status === MessageStatus.PENDING_ADMIN_APPROVAL && (
                                    <div className="flex space-x-1 mt-1">
                                        <Button size="sm" variant="ghost" onClick={() => handleAdminMessageAction(msg.id, 'approve')} className="!p-0.5 !text-xs !text-green-600"><CheckCircleIcon className="w-3.5 h-3.5"/></Button>
                                        <Button size="sm" variant="ghost" onClick={() => handleAdminMessageAction(msg.id, 'reject')} className="!p-0.5 !text-xs !text-orange-600"><XCircleIcon className="w-3.5 h-3.5"/></Button>
                                        <Button size="sm" variant="ghost" onClick={() => handleAdminMessageAction(msg.id, 'delete')} className="!p-0.5 !text-xs !text-red-600"><TrashIcon className="w-3.5 h-3.5"/></Button>
                                    </div>
                                )}
                            </div>
                        )}
                         {msg.status === MessageStatus.REJECTED_BY_ADMIN && msg.senderId === user?.id && (
                             <p className="text-xs text-red-500 italic mt-1">Admin rejected this message.</p>
                         )}
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
              <div className="p-3 bg-white border-t border-gray-200">
                <div className="flex items-center space-x-2">
                  <Button variant="ghost" onClick={() => setIsAttachFileModalOpen(true)} className="p-2">
                    <PaperClipIcon className="w-5 h-5 text-gray-500 hover:text-primary"/>
                  </Button>
                  <input
                    type="text"
                    value={newMessageContent}
                    onChange={(e) => setNewMessageContent(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSendMessage())}
                    placeholder="Type your message..."
                    className="flex-1 p-2.5 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary text-sm"
                    disabled={isSendingMessage}
                  />
                  <Button onClick={handleSendMessage} disabled={!newMessageContent.trim() || isSendingMessage} isLoading={isSendingMessage} className="p-2.5">
                    <PaperAirplaneIcon className="w-5 h-5"/>
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
        <Modal isOpen={isAttachFileModalOpen} onClose={() => setIsAttachFileModalOpen(false)} title="Attach File">
            <p className="text-gray-600">File upload in chat is not yet implemented. This is a placeholder.</p>
             {/* Example file input - actual upload logic with uploadFileAPI would be needed
             <input type="file" className="my-2"/> */}
            <div className="text-right mt-4">
                <Button onClick={() => setIsAttachFileModalOpen(false)}>Close</Button>
            </div>
        </Modal>
      </div>
    </div>
  );
};

export default MessagingPage;
