import React from 'react';
import { MessageCircle } from 'lucide-react';
import { useFloatingChat } from '../hooks/useFloatingChat';

interface ChatButtonProps {
  phoneNumber: string;
  className?: string;
  children?: React.ReactNode;
}

const ChatButton: React.FC<ChatButtonProps> = ({ phoneNumber, className, children }) => {
  const { startChat } = useFloatingChat();
  
  return (
    <button
      onClick={() => startChat(phoneNumber)}
      className={`inline-flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors ${className || ''}`}
    >
      <MessageCircle className="w-4 h-4" />
      {children || 'Iniciar Chat'}
    </button>
  );
};

export default ChatButton;