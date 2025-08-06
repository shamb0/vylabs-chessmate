import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { logger } from '@/lib/logger';

// Add at the top of WebSocketProvider.tsx
if (import.meta.hot) {
  console.log(' [VITE_HMR] Hot module replacement is active');
  
  import.meta.hot.accept(() => {
    console.log(' [VITE_HMR] Module hot reloaded - WebSocket handlers may be affected');
  });
  
  import.meta.hot.dispose(() => {
    console.log(' [VITE_HMR] Module disposed - cleaning up WebSocket');
    if (websocketRef.current) {
      websocketRef.current.close();
    }
  });
}

interface WebSocketContextType {
  sendMessage: (message: string) => void;
  lastMessage: MessageEvent | null;
  readyState: number;
  connect: () => void;
  disconnect: () => void;
}

export const WebSocketContext = createContext<WebSocketContextType | null>(null);

interface WebSocketProviderProps {
  children: React.ReactNode;
  url?: string;
  reconnectAttempts?: number;
  reconnectDelay?: number;
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({
  children,
  url = 'ws://localhost:9000',
  reconnectAttempts = 5,
  reconnectDelay = 3000,
}) => {
  const [lastMessage, setLastMessage] = useState<MessageEvent | null>(null);
  const [readyState, setReadyState] = useState<number>(WebSocket.CONNECTING);
  
  const websocketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectCountRef = useRef<number>(0);
  const mountedRef = useRef<boolean>(true);
  const intentionalCloseRef = useRef<boolean>(false);

  // Create a ref to hold the onMessage handler. This solves the stale closure problem
  // by ensuring the event listener always calls the latest version of the handler.
  const onMessageHandlerRef = useRef<(event: MessageEvent) => void>();

  // This effect keeps the onMessage handler in the ref up-to-date with the latest
  // setLastMessage function from the component's state.
  useEffect(() => {
    onMessageHandlerRef.current = (event) => {
      if (!mountedRef.current) return;
      
      console.log('📨 WebSocket message received:', event.data);
      
      // ✅ EVIDENCE-BASED SOLUTION: Create new object with unique reference
      const messageWithUniqueRef = {
        data: event.data,
        type: event.type,
        timeStamp: event.timeStamp,
        origin: event.origin,
        timestamp: Date.now(),        // Ensure uniqueness
        id: crypto.randomUUID()       // Guarantee new reference
      } as unknown as MessageEvent;
      
      console.log(' [NEW_REFERENCE] Created new message object:', messageWithUniqueRef.id);
      setLastMessage(messageWithUniqueRef);
    };
  }); // This dependency array is intentionally removed to fix the stale closure.

  const connect = useCallback(() => {
    // Prevent multiple connections
    if (websocketRef.current?.readyState === WebSocket.OPEN || 
        websocketRef.current?.readyState === WebSocket.CONNECTING) {
      logger.info('WebSocket already connected or connecting, skipping...');
      console.log('🔌 WebSocket already connected or connecting, skipping...');
      return;
    }

    // Clear any existing reconnection timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    try {
      logger.info(`Attempting WebSocket connection to ${url}`);
      console.log(`🔌 Attempting WebSocket connection to ${url}`);
      
      const ws = new WebSocket(url);
      websocketRef.current = ws;
      setReadyState(WebSocket.CONNECTING);

      ws.onopen = () => {
        if (!mountedRef.current) return;
        
        logger.info('WebSocket connection established');
        console.log('✅ WebSocket connection established');
        setReadyState(WebSocket.OPEN);
        reconnectCountRef.current = 0; // Reset reconnect count on successful connection

        //  CRITICAL DIAGNOSTIC: Verify handler assignment immediately after connection
        console.log(' [HANDLER_ASSIGNMENT_CHECK] onmessage handler after onopen:', {
          handlerExists: !!ws.onmessage,
          handlerFunction: ws.onmessage?.toString().substring(0, 100),
          websocketReadyState: ws.readyState,
          timestamp: Date.now()
        });

        //  DIAGNOSTIC: Test the connection immediately
        setTimeout(() => {
          console.log(' [CONNECTION_TEST] Testing WebSocket responsiveness');
          if (ws.readyState === WebSocket.OPEN) {
            // Send a ping to verify bidirectional communication
            ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
          }
        }, 100);
      };

      //  DIAGNOSTIC: Log the exact moment of assignment
      console.log(' [HANDLER_ASSIGNMENT] About to assign onmessage handler');

      // Assign the handler from the ref. This ensures the latest handler is always used.
      ws.onmessage = (event) => {
        console.log(' [HANDLER_EXECUTED] onmessage handler fired!', { 
          data: event.data.substring(0, 50),
          timestamp: Date.now()
        });

        if (onMessageHandlerRef.current) {
          onMessageHandlerRef.current(event);
        }
      };

      //  DIAGNOSTIC: Verify assignment was successful
      console.log(' [HANDLER_ASSIGNMENT_VERIFY]', {
        handlerAssigned: !!ws.onmessage,
        handlerFunction: ws.onmessage?.toString().substring(0, 100),
        timestamp: Date.now()
      });

      //  DIAGNOSTIC: Check for handler overwriting after a delay
      setTimeout(() => {
        console.log(' [HANDLER_PERSISTENCE_CHECK] Handler after 1 second:', {
          handlerStillExists: !!ws.onmessage,
          handlerFunction: ws.onmessage?.toString().substring(0, 100),
          readyState: ws.readyState,
          timestamp: Date.now()
        });
      }, 1000);

      ws.onclose = (event) => {
        if (!mountedRef.current) return;
        
        logger.info('WebSocket connection closed', { 
          code: event.code, 
          reason: event.reason || 'No reason provided',
          wasClean: event.wasClean,
          intentional: intentionalCloseRef.current
        });
        console.log('🔌 WebSocket connection closed:', { 
          code: event.code, 
          reason: event.reason || 'No reason provided',
          wasClean: event.wasClean,
          intentional: intentionalCloseRef.current
        });
        
        setReadyState(WebSocket.CLOSED);
        websocketRef.current = null;

        // Only attempt reconnection if not intentionally closed and component is still mounted
        if (!intentionalCloseRef.current && 
            reconnectCountRef.current < reconnectAttempts &&
            mountedRef.current) {
          
          reconnectCountRef.current++;
          logger.info(`Attempting reconnection ${reconnectCountRef.current}/${reconnectAttempts} in ${reconnectDelay}ms`);
          console.log(`🔄 Attempting reconnection ${reconnectCountRef.current}/${reconnectAttempts} in ${reconnectDelay}ms`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            if (mountedRef.current) {
              connect();
            }
          }, reconnectDelay);
        }
      };

      ws.onerror = (error) => {
        if (!mountedRef.current) return;
        
        logger.error('WebSocket error occurred', { error });
        console.log('❌ WebSocket error occurred:', error);
        setReadyState(WebSocket.CLOSED);
      };

    } catch (error) {
      logger.error('Failed to create WebSocket connection', { error });
      console.log('❌ Failed to create WebSocket connection:', error);
      setReadyState(WebSocket.CLOSED);
    }
  }, [url, reconnectAttempts, reconnectDelay]);

  const disconnect = useCallback(() => {
    intentionalCloseRef.current = true;
    
    // Clear reconnection timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // Close WebSocket connection
    if (websocketRef.current) {
      const ws = websocketRef.current;
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        logger.info('Closing WebSocket connection intentionally');
        console.log('🔌 Closing WebSocket connection intentionally');
        ws.close(1000, 'Component unmounting'); // 1000 = normal closure
      }
      websocketRef.current = null;
    }
    
    setReadyState(WebSocket.CLOSED);
    reconnectCountRef.current = 0;
  }, []);

  const sendMessage = useCallback((message: string) => {
    const ws = websocketRef.current;
    
    if (!ws) {
      logger.warn('WebSocket not connected - cannot send message', { readyState: 'null', message });
      console.log('⚠️ WebSocket not connected - cannot send message. ReadyState: null, Message:', message);
      return;
    }
    
    if (ws.readyState !== WebSocket.OPEN) {
      logger.warn('WebSocket not ready - cannot send message', { 
        readyState: ws.readyState, 
        readyStateText: getReadyStateText(ws.readyState),
        message 
      });
      console.log('⚠️ WebSocket not ready - cannot send message. ReadyState:', ws.readyState, getReadyStateText(ws.readyState), 'Message:', message);
      return;
    }

    try {
      ws.send(message);
      // logger.debug('WebSocket message sent', { message });
      console.log('📤 WebSocket message sent:', message);
    } catch (error) {
      // logger.error('Failed to send WebSocket message', { error, message });
      console.log('❌ Failed to send WebSocket message:', error, 'Message:', message);
    }
  }, []);

  // Initialize connection on mount
  useEffect(() => {
    mountedRef.current = true;
    intentionalCloseRef.current = false;
    
    logger.info('WebSocketProvider mounting, initializing connection...');
    console.log('🔌 WebSocketProvider mounting, initializing connection...');
    
    // Small delay to handle React StrictMode double mounting
    const initTimeout = setTimeout(() => {
      if (mountedRef.current) {
        logger.info('WebSocketProvider initialization delay complete, connecting...');
        console.log('🔌 WebSocketProvider initialization delay complete, connecting...');
        connect();
      }
    }, 100);

    // Cleanup function
    return () => {
      logger.info('WebSocketProvider unmounting, cleaning up...');
      console.log('🔌 WebSocketProvider unmounting, cleaning up...');
      mountedRef.current = false;
      clearTimeout(initTimeout);
      disconnect();
    };
  }, [connect, disconnect]);

  const contextValue: WebSocketContextType = {
    sendMessage,
    lastMessage,
    readyState,
    connect,
    disconnect,
  };

  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = (): WebSocketContextType => {
  const context = useContext(WebSocketContext);
  if (!context) {
    console.log('❌ useWebSocket called outside WebSocketProvider context');
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  console.log('✅ useWebSocket context found, readyState:', context.readyState);
  return context;
};

// Helper function to get readable readyState text
function getReadyStateText(readyState: number): string {
  switch (readyState) {
    case WebSocket.CONNECTING: return '🔄 CONNECTING';
    case WebSocket.OPEN: return '✅ OPEN';
    case WebSocket.CLOSING: return '🔄 CLOSING';
    case WebSocket.CLOSED: return '❌ CLOSED';
    default: return '❓ UNKNOWN';
  }
}