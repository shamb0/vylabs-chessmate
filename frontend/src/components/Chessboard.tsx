import React, { useEffect, useRef } from 'react';
import { Chessboard2 } from '@/lib/chessboard2';
import { logger } from '@/lib/logger';
import { CoachingPayload } from '@/lib/schemas';

interface ChessboardProps {
  position?: string;
  onDrop: (sourceSquare: string, targetSquare: string) => boolean;
  coachingData: CoachingPayload | null;
}

const Chessboard: React.FC<ChessboardProps> = ({ position = 'start', onDrop, coachingData }) => {
  const boardRef = useRef<HTMLDivElement>(null);
  const chessboardInstance = useRef<any>(null);
  
  // Store latest callback in ref - updated on every render
  const onDropRef = useRef(onDrop);
  
  // Keep ref current with latest callback
  useEffect(() => {
    logger.info('Updating onDrop ref with new callback');
    console.log('Updating onDrop ref with new callback');
    onDropRef.current = onDrop;
  }, [onDrop]);

  useEffect(() => {
    if (coachingData) {
      console.log('♟️ Chessboard Component received new high-value trace indicator:', coachingData);
      logger.info({ coachingData }, 'Chessboard received new coaching data');
    }
  }, [coachingData]);

  // Initialize library once with stable ref-based handler
  useEffect(() => {
    if (!boardRef.current || chessboardInstance.current) return;

    logger.info('Chessboard component mounted, creating board');
    console.log('Chessboard component mounted, creating board');
    chessboardInstance.current = new Chessboard2(boardRef.current, {
      position: position === 'start' ? 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1' : position,
      draggable: true,
      // Source: Official chessboard2 documentation example 2005
      // Sets the animation speed for the snapback effect to 500ms.
      snapbackSpeed: 2000,
      // Always calls latest callback via ref
      onDrop: (event: any) => {
        logger.info({ event }, 'Library onDrop triggered');
        console.log({ event }, 'Library onDrop triggered');
        
        // Defensive check for source and target properties
        if (!event || typeof event.source !== 'string' || typeof event.target !== 'string') {
          logger.error('Invalid onDrop event structure', { event });
          console.error('Invalid onDrop event structure', { event });
          return 'snapback'; // Prevent move
        }

        const { source, target } = event;
        logger.info('Calling latest ref callback with extracted source and target');
        console.log('Calling latest ref callback with extracted source and target');
        const isLegalMove = onDropRef.current(source, target);
        logger.info({ result: isLegalMove }, 'Callback returned');
        console.log({ result: isLegalMove }, 'Callback returned');
        
        // Source: Official chessboard2 documentation example 4005
        // If the move is not legal, return 'snapback' to visually
        // undo the move on the board.
        if (!isLegalMove) {
          return 'snapback';
        }
      }
    });

    return () => {
      if (chessboardInstance.current?.destroy) {
        logger.info('Chessboard component unmounted, destroying board');
        console.log('Chessboard component unmounted, destroying board');
        chessboardInstance.current.destroy();
        chessboardInstance.current = null;
      }
    };
  }, [position]); // Empty deps - initialize once only

  // Update position independently
  useEffect(() => {
    if (chessboardInstance.current && position) {
      const fen = position === 'start' 
        ? 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1' 
        : position;
      chessboardInstance.current.position(fen);
    }
  }, [position]);

  return <div ref={boardRef} style={{ width: '400px', height: '400px' }} />;
};

export default Chessboard;