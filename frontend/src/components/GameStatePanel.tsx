import React, { useMemo } from 'react';
import { Chess } from 'chess.js';
import TurnIndicator from './TurnIndicator';
import CapturedPieces from './CapturedPieces';

interface GameStatePanelProps {
  fen: string;
}

const GameStatePanel: React.FC<GameStatePanelProps> = ({ fen }) => {
  const game = useMemo(() => {
    if (fen === 'start') {
      return new Chess();
    }
    return new Chess(fen);
  }, [fen]);

  const turn = game.turn();
  
  const history = game.history({ verbose: true });
  const captured = {
    w: history.filter(move => move.captured && move.color === 'b').map(move => move.captured),
    b: history.filter(move => move.captured && move.color === 'w').map(move => move.captured),
  };

  return (
    <div className="w-full bg-card text-card-foreground p-2 rounded-lg shadow-sm">
      <h2 className="text-lg font-semibold text-center mb-2">Game Status</h2>
      <div className="flex justify-center">
        <TurnIndicator turn={turn} />
      </div>
      <CapturedPieces captured={captured} />
    </div>
  );
};

export default GameStatePanel;
