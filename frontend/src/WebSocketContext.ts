import { createContext } from 'react';

interface WebSocketContextType {
  sendMessage: (message: string) => void;
  lastMessage: MessageEvent | null;
  connectionStatus: 'connecting' | 'connected' | 'disconnected';
}

export const WebSocketContext = createContext<WebSocketContextType | null>(null);
