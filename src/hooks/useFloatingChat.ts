import { useChat } from '../context/ChatContext';

export function useFloatingChat() {
  const { openChat } = useChat();
  
  const startChat = (phoneNumber: string) => {
    openChat(phoneNumber);
  };
  
  return { startChat };
}