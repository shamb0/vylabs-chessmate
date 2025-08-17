import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Chess, Piece } from 'chess.js';

interface GameStatePanelProps {
  fen: string;
}

// Helper to get Unicode symbols for pieces
const getPieceSymbol = (piece: Piece) => {
  const symbols: { [key: string]: string } = {
    p: '♙', r: '♖', n: '♘', b: '♗', q: '♕', k: '♔',
    P: '♟', R: '♜', N: '♞', B: '♝', Q: '♛', K: '♚',
  };
  return symbols[piece.type] || '';
};

// Function to calculate captured pieces
const getCapturedPieces = (fen: string) => {
  const game = new Chess(fen);
  const initialPieces = { w: { p: 8, r: 2, n: 2, b: 2, q: 1 }, b: { p: 8, r: 2, n: 2, b: 2, q: 1 } };
  const currentPieces: { [color: string]: { [piece: string]: number } } = { w: { p: 0, r: 0, n: 0, b: 0, q: 0 }, b: { p: 0, r: 0, n: 0, b: 0, q: 0 } };
  
  game.board().forEach(row => {
    row.forEach(square => {
      if (square) {
        currentPieces[square.color][square.type]++;
      }
    });
  });

  let whiteCaptured = '';
  let blackCaptured = '';

  for (const color of ['w', 'b'] as const) {
    for (const pieceType of ['p', 'r', 'n', 'b', 'q'] as const) {
      const capturedCount = initialPieces[color][pieceType] - currentPieces[color][pieceType];
      if (capturedCount > 0) {
        const pieceSymbol = getPieceSymbol({ type: pieceType, color: color });
        if (color === 'w') {
          blackCaptured += pieceSymbol.repeat(capturedCount) + ' ';
        } else {
          whiteCaptured += pieceSymbol.repeat(capturedCount) + ' ';
        }
      }
    }
  }

  return {
    whiteCaptured: whiteCaptured.trim() || '-',
    blackCaptured: blackCaptured.trim() || '-',
  };
};


/**
 * GameStatePanel Component
 * 
 * Displays the current state of the chess game, including the turn and captured pieces.
 * This component is generated from a Penpot design and styled using design tokens.
 * 
 * Design Source: Penpot file 'chessmate-panel-v1'
 * Penpot Object ID: 5cb3e3c9-c209-80cd-8006-a3e697e25650
 */
const GameStatePanel: React.FC<GameStatePanelProps> = ({ fen }) => {
  const game = new Chess(fen);
  const turn = game.turn() === 'w' ? 'White' : 'Black';
  const { whiteCaptured, blackCaptured } = getCapturedPieces(fen);

  return (
    <Card className="bg-card text-card-foreground border-none p-3 flex flex-col justify-center items-center gap-3">
      <CardHeader className="p-0">
        <CardTitle className="text-center text-[36px] font-bold">
          Game Status
        </CardTitle>
      </CardHeader>
      <CardContent className="text-[24px] font-bold space-y-2 p-0">
        <p className="text-center">Turn: <span className="text-primary">{turn}</span></p>
        <p className="text-center">White captured: {whiteCaptured}</p>
        <p className="text-center">Black captured: {blackCaptured}</p>
      </CardContent>
    </Card>
  );
};

export default GameStatePanel;