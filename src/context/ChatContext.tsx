import React, { createContext, useContext, useState, ReactNode } from 'react';
import FloatingChat from '../components/FloatingChat';

interface ChatContextType {
  openChat: (phoneNumber: string) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [phoneNumber, setPhoneNumber] = useState<string | undefined>(undefined);

  const openChat = (phone: string) => {
    setPhoneNumber(phone);
  };

  return (
    <ChatContext.Provider value={{ openChat }}>
      {children}
      <FloatingChat initialPhone={phoneNumber} />
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}