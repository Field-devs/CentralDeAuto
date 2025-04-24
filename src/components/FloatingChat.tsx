import React, { useEffect, useRef, useState } from 'react';
import { X, Send, Minimize2, Maximize2, Phone, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

type Contact = {
  id: number;
  name?: string;
  phone_number: string;
  thumbnail?: string;
};

type Message = {
  id: number;
  content: string;
  created_at: string;
  message_type: 'incoming' | 'outgoing';
  sender?: {
    name?: string;
  };
};

type Conversation = {
  id: number;
  messages: Message[];
};

interface FloatingChatProps {
  initialPhone?: string;
}

const FloatingChat: React.FC<FloatingChatProps> = ({ initialPhone }) => {
  const [showChat, setShowChat] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [contact, setContact] = useState<Contact | null>(null);
  const [storageConversations, setStorageConversations] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authError, setAuthError] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (messagesEndRef.current && showChat && !minimized) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeConversation?.messages, showChat, minimized]);

  useEffect(() => {
    if (showChat && !minimized && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showChat, minimized]);

  useEffect(() => {
    const token = localStorage.getItem('chat_token');
    if (!token) {
      setAuthError(true);
      return;
    }

    if (initialPhone) {
      userInChat(initialPhone);
    }
  }, [initialPhone]);

  const userInChat = async (phoneNumber: string) => {
    try {
      setLoading(true);
      setError(null);
      setAuthError(false);
      
      const token = localStorage.getItem('chat_token');
      const baseURL = import.meta.env.VITE_CHAT_API_URL;
      const accountId = import.meta.env.VITE_CHAT_ACCOUNT_ID;

      if (!baseURL || !accountId) {
        throw new Error('Missing chat API configuration');
      }

      if (!token) {
        setAuthError(true);
        throw new Error('Authentication token not found');
      }

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'api_access_token': token,
      };

      const response = await fetch(`${baseURL}/api/v1/accounts/${accountId}/contacts/search?q=${phoneNumber}`, {
        method: 'GET',
        headers,
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }

      const result = await response.json();
      const user = result.payload?.[0];
      
      if (!user) {
        throw new Error('User not found');
      }

      setContact(user);

      const stored = storageConversations.find(sc => sc.user.id === user.id);
      if (stored) {
        openChat(stored.conversationId, stored.user);
        return;
      }

      const conversationsResponse = await fetch(
        `${baseURL}/api/v1/accounts/${accountId}/contacts/${user.id}/conversations`,
        { headers }
      );

      if (!conversationsResponse.ok) {
        throw new Error(`Failed to fetch conversations: ${conversationsResponse.status}`);
      }

      const convData = await conversationsResponse.json();

      if (convData.payload?.length) {
        const convId = convData.payload[0].id;
        const updated = [...storageConversations, { user, conversationId: convId }];
        setStorageConversations(updated);
        openChat(convId, user);
      } else {
        setShowChat(true);
        setMinimized(false);
      }
    } catch (error) {
      console.error('Error in userInChat:', error);
      setError(error instanceof Error ? error.message : 'Failed to connect to chat service');
    } finally {
      setLoading(false);
    }
  };

  const openChat = async (conversationId: number, user: Contact) => {
    try {
      setShowChat(true);
      setMinimized(false);
      setContact(user);
      setLoading(true);
      setError(null);
      setAuthError(false);

      const token = localStorage.getItem('chat_token');
      const baseURL = import.meta.env.VITE_CHAT_API_URL;
      const accountId = import.meta.env.VITE_CHAT_ACCOUNT_ID;

      if (!baseURL || !accountId) {
        throw new Error('Missing chat API configuration');
      }

      if (!token) {
        setAuthError(true);
        throw new Error('Authentication token not found');
      }

      const response = await fetch(
        `${baseURL}/api/v1/accounts/${accountId}/conversations/${conversationId}/messages`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'api_access_token': token,
          },
          credentials: 'include'
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch messages: ${response.status}`);
      }

      const messages = await response.json();
      setActiveConversation({ id: conversationId, messages: messages.payload || [] });
    } catch (error) {
      console.error('Error opening chat:', error);
      setError(error instanceof Error ? error.message : 'Failed to open chat');
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !activeConversation || !contact) return;

    try {
      setError(null);
      setAuthError(false);
      
      const token = localStorage.getItem('chat_token');
      const baseURL = import.meta.env.VITE_CHAT_API_URL;
      const accountId = import.meta.env.VITE_CHAT_ACCOUNT_ID;

      if (!baseURL || !accountId) {
        throw new Error('Missing chat API configuration');
      }

      if (!token) {
        setAuthError(true);
        throw new Error('Authentication token not found');
      }

      const tempMessage: Message = {
        id: Date.now(),
        content: newMessage,
        created_at: new Date().toISOString(),
        message_type: 'outgoing',
      };

      setActiveConversation({
        ...activeConversation,
        messages: [...activeConversation.messages, tempMessage]
      });
      
      setNewMessage('');

      const response = await fetch(
        `${baseURL}/api/v1/accounts/${accountId}/conversations/${activeConversation.id}/messages`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'api_access_token': token,
          },
          credentials: 'include',
          body: JSON.stringify({
            content: tempMessage.content,
            message_type: 'outgoing',
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      openChat(activeConversation.id, contact);
    } catch (error) {
      console.error('Error sending message:', error);
      setError(error instanceof Error ? error.message : 'Failed to send message');
    }
  };

  const toggleMinimize = () => {
    setMinimized(!minimized);
  };

  const formatTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return '';
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).userInChat = userInChat;
    }
    
    return () => {
      if (typeof window !== 'undefined') {
        delete (window as any).userInChat;
      }
    };
  }, [storageConversations]);

  if (!showChat) return null;

  if (authError) {
    return (
      <div className="fixed bottom-5 right-5 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-4 max-w-[300px]">
        <div className="flex items-center gap-2 text-red-500 mb-3">
          <AlertCircle className="w-5 h-5" />
          <span className="font-medium">Authentication Error</span>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
          Unable to access chat. Please ensure you are logged in and try again.
        </p>
        <button 
          onClick={() => setShowChat(false)}
          className="w-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
        >
          Close
        </button>
      </div>
    );
  }

  return (
    <div 
      className={`fixed z-[9999] transition-all duration-300 ${
        minimized 
          ? 'bottom-5 right-5 w-auto h-auto' 
          : 'bottom-5 right-5 w-[350px] h-[500px] md:w-[400px] md:h-[600px]'
      }`}
    >
      {minimized ? (
        <button 
          onClick={toggleMinimize}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-3 rounded-full shadow-lg hover:bg-blue-700 transition-colors"
        >
          <Phone className="w-5 h-5" />
          <span>{contact?.name || contact?.phone_number || 'Chat'}</span>
          <Maximize2 className="w-4 h-4 ml-1" />
        </button>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 flex flex-col h-full overflow-hidden">
          <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
            <div className="flex items-center gap-3">
              <div className="relative w-10 h-10 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                {contact?.thumbnail ? (
                  <img 
                    src={contact.thumbnail} 
                    alt="Avatar" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-lg font-semibold text-gray-500 dark:text-gray-400">
                    {contact?.name?.[0] || contact?.phone_number?.[0] || '?'}
                  </div>
                )}
              </div>
              <div>
                <div className="font-medium text-gray-900 dark:text-white">
                  {contact?.name || contact?.phone_number || 'Chat'}
                </div>
                {contact?.phone_number && !contact?.name && (
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {contact.phone_number}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={toggleMinimize}
                className="p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
                aria-label="Minimize"
              >
                <Minimize2 className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setShowChat(false)}
                className="p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex-grow overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900">
            {loading ? (
              <div className="flex justify-center items-center h-full">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center h-full text-red-500 dark:text-red-400 p-4 text-center">
                <p className="font-medium">Error</p>
                <p className="text-sm mt-1">{error}</p>
              </div>
            ) : activeConversation?.messages && activeConversation.messages.length > 0 ? (
              activeConversation.messages.map((msg, i) => (
                <div 
                  key={msg.id || i} 
                  className={`mb-4 max-w-[80%] ${
                    msg.message_type === 'outgoing' 
                      ? 'ml-auto' 
                      : 'mr-auto'
                  }`}
                >
                  <div 
                    className={`rounded-lg px-4 py-2 inline-block ${
                      msg.message_type === 'outgoing'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
                    }`}
                  >
                    {msg.content}
                  </div>
                  <div className={`text-xs mt-1 ${
                    msg.message_type === 'outgoing'
                      ? 'text-right text-gray-500 dark:text-gray-400'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}>
                    {formatTime(msg.created_at)}
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
                <p>Nenhuma mensagem ainda</p>
                <p className="text-sm mt-1">Envie uma mensagem para iniciar a conversa</p>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage();
              }}
              className="flex items-center gap-2"
            >
              <input
                ref={inputRef}
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Digite sua mensagem..."
                className="flex-grow px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
              <button
                type="submit"
                disabled={!newMessage.trim()}
                className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FloatingChat;

export const initChat = (phoneNumber: string) => {
  if (typeof window !== 'undefined' && (window as any).userInChat) {
    (window as any).userInChat(phoneNumber);
  } else {
    console.error('Chat function not available');
  }
};