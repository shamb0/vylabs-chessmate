import { useState, useRef, useEffect, useCallback } from 'react';
import { Chess } from 'chess.js';
import { useWebSocket } from '@/WebSocketProvider';
import { logger } from '@/lib/logger';

export const useChessGame = () => {
  const [fen, setFen] = useState('start');
  const [isThinking, setIsThinking] = useState(false);
  const game = useRef(new Chess());
  const { sendMessage, lastMessage, readyState } = useWebSocket();

  useEffect(() => {
    if (lastMessage) {
      const message = JSON.parse(lastMessage.data);
      if (message.type === 'gameState' || message.type === 'gameStarted') {
        game.current.load(message.fen);
        setFen(game.current.fen());
      }
      // When a coaching message arrives, the AI is no longer "thinking".
      if (message.type === 'coaching:message_ready') {
        setIsThinking(false);
      }
    }
  }, [lastMessage]);

  const handlePieceDrop = useCallback((sourceSquare: string, targetSquare: string): boolean => {
    logger.info({ sourceSquare, targetSquare }, 'Piece dropped');
    console.log({ sourceSquare, targetSquare }, 'Piece dropped');

    const handleIllegalMove = () => {
      console.log('🚫 Move rejected as illegal by chess.js');
      logger.warn('Illegal move prevented');
      const legalMoves = game.current.moves({ verbose: true });
      const illegalMovePayload = {
        type: 'illegal_move',
        from: sourceSquare,
        to: targetSquare,
        fen: game.current.fen(),
        legalMoves: legalMoves.map(m => m.san),
      };
      console.log('♟️ Illegal Move Payload Created:', illegalMovePayload);
      sendMessage(JSON.stringify(illegalMovePayload));
      // Start thinking on illegal move
      setIsThinking(true);
      return false;
    };

    try {
      console.log(`Attempting move: ${sourceSquare} -> ${targetSquare}`);
      const move = game.current.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q', // always promote to a queen for simplicity
      });

      if (move === null) {
        return handleIllegalMove();
      }
      
      console.log('✅ Move accepted by chess.js:', move);
      const newFen = game.current.fen();
      setFen(newFen);

      const movePayload = {
        type: 'move',
        move: move.san,
        game: {
          fen: newFen,
        },
      };
      console.log('♟️ Move Payload Created:', movePayload);
      logger.info({ payload: movePayload }, 'Sending move to backend');
      sendMessage(JSON.stringify(movePayload));
      // Start thinking on legal move
      setIsThinking(true);

      return true;
    } catch (error) {
      logger.warn({ error: String(error) }, 'Invalid move attempted, treating as illegal move');
      console.log({ error: String(error) }, 'Invalid move attempted, treating as illegal move');
      return handleIllegalMove();
    }
  }, [sendMessage]);

  return { 
    fen, 
    handlePieceDrop, 
    game: game.current,
    isConnected: readyState === 1, // WebSocket.OPEN = 1
    readyState,
    turn: game.current.turn(),
    isThinking,
  };
};
