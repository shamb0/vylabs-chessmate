import React, { useState, useEffect } from 'react';
import { WebSocketProvider, useWebSocket } from '@/WebSocketProvider';
import { logger } from '@/lib/logger';
import { useChessGame } from '@/hooks/useChessGame';
import './index.css'

import { CoachingPayload, CoachingPayloadSchema } from '@/lib/schemas';
import ChessGameLayout from './components/ChessGameLayout';

const App: React.FC = () => {
  logger.info('ChessMate App component rendering...');
  console.log('🎮 ChessMate App component rendering...');

  const [coachingData, setCoachingData] = useState<CoachingPayload | null>(null);
  const [messageHistory, setMessageHistory] = useState<CoachingPayload[]>([]);
  const { fen, handlePieceDrop, isConnected, readyState, isThinking } = useChessGame();
  const { lastMessage } = useWebSocket(); 
  const renderCount = React.useRef(0);
  renderCount.current++;

  console.log(' [RENDER_DIAGNOSTIC]', {
    renderNumber: renderCount.current,
    lastMessageId: lastMessage?.id || 'none',
    timestamp: Date.now()
  });

  if (fen) {
    console.log({ FEN: fen });
  }
  
  useEffect(() => {
    console.log('✅ [SUCCESS_INDICATOR] useEffect triggered successfully', {
      messageId: lastMessage?.id,
      messageData: lastMessage?.data?.substring(0, 50)
    });

    if (lastMessage) {
      try {
        const message = JSON.parse(lastMessage.data);
        console.log('📨 App received message:', message);
        
        if (message.type === 'coaching:message_ready') {
          const validation = CoachingPayloadSchema.safeParse(message.payload);
          if (validation.success) {
            const newPayload = validation.data;
            setCoachingData(newPayload);
            setMessageHistory(prevHistory => [...prevHistory, newPayload]);
            // ✅ High-value trace indicator
            console.log('🎨 [UI_UPDATE] CoachingPanel state updated with new payload:', newPayload);
            console.log('✅ Coaching data validated and set');
          } else {
            logger.error({ error: validation.error }, 'Coaching payload validation failed');
            console.log('❌ Coaching payload validation failed:', validation.error);
            // Handle legacy string message for backward compatibility
            if (typeof message.payload.message === 'string') {
              const legacyPayload = {
                message: message.payload.message,
                cognitiveStage: 'Developing',
              };
              setCoachingData(legacyPayload);
              setMessageHistory(prevHistory => [...prevHistory, legacyPayload]);
              console.log('✅ Using legacy coaching message format');
            }
          }
        }
      } catch (error) {
        logger.error({ error }, 'Failed to parse WebSocket message');
        console.log('❌ Failed to parse WebSocket message:', error);
      }
    }
  }, [lastMessage]);

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      <header className="p-4 border-b border-border bg-card">
        <h1 className="text-3xl font-bold text-center text-foreground">ChessMate: The Cognitive Co-Pilot</h1>
        <div className={`p-3 text-center mt-3 rounded-lg border transition-colors ${
          isConnected 
            ? 'border-green-400/30 bg-green-400/10 text-green-400' 
            : 'border-red-400/30 bg-red-400/10 text-red-400'
        }`}>
          Connection Status: {isConnected ? '✅ Connected' : '❌ Disconnected'} (ReadyState: {readyState})
        </div>
      </header>
      <main className="flex-grow overflow-hidden">
        <ChessGameLayout
          messageHistory={messageHistory}
          coachingData={coachingData}
          fen={fen}
          handlePieceDrop={handlePieceDrop}
          isThinking={isThinking}
        />
      </main>
    </div>
  );
}

const WrappedApp: React.FC = () => {
  return (
    <WebSocketProvider>
      <App />
    </WebSocketProvider>
  );
};

export default WrappedApp;
