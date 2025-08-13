import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Chess } from 'chess.js';

interface GameStatePanelProps {
  fen: string;
}

/**
 * GameStatePanel Component
 * 
 * Displays the current state of the chess game, including the turn and captured pieces.
 * This component is generated from a Penpot design and styled using design tokens.
 * 
 * Design Source: Penpot file 'chessmate-panel-v1'
 * Theme: Vintage
 */
const GameStatePanel: React.FC<GameStatePanelProps> = ({ fen }) => {
  // The fen prop is now guaranteed to be valid by the useChessGame hook.
  // No guard clause is needed here.
  const game = new Chess(fen);
  const turn = game.turn() === 'w' ? 'White' : 'Black';

  // TODO: Implement logic to calculate captured pieces from FEN or game state.
  const whiteCaptured = '-';
  const blackCaptured = '-';

  // Note: The CSS custom variables are defined in the theme files (e.g., themes/vintage.css)
  // and are mapped from our design tokens.
  return (
    <Card className="bg-[var(--panel-background-default)] text-[var(--panel-text-body)] border-none">
      <CardHeader>
        <CardTitle className="text-[var(--panel-text-header)] text-center text-2xl font-normal">
          Game Status
        </CardTitle>
      </CardHeader>
      <CardContent className="text-2xl font-normal space-y-2">
        <p>Turn: {turn}</p>
        <p>White captured: {whiteCaptured}</p>
        <p>Black captured: {blackCaptured}</p>
      </CardContent>
    </Card>
  );
};

export default GameStatePanel;
