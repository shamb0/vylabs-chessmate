import React from 'react';
import { Card } from '@/components/ui/card';
import ConversationPanel from './ConversationPanel';
import GameStatePanel from './GameStatePanel';
import CulturalContextPanel from './CulturalContextPanel';
import Chessboard from './Chessboard';
import { CoachingPayload } from '@/lib/schemas';

interface ChessGameLayoutProps {
  messageHistory: CoachingPayload[];
  coachingData: CoachingPayload | null;
  fen: string;
  handlePieceDrop: (sourceSquare: string, targetSquare: string) => boolean;
  isThinking: boolean;
}

const ChessGameLayout: React.FC<ChessGameLayoutProps> = ({
  messageHistory,
  coachingData,
  fen,
  handlePieceDrop,
  isThinking,
}) => {
  return (
    <div className="grid grid-cols-12 gap-4 p-4 h-full bg-background text-foreground">
      {/* Conversation Panel (Left) */}
      <Card className="col-span-3 h-full overflow-hidden flex flex-col">
        <ConversationPanel messageHistory={messageHistory} />
      </Card>

      {/* Chessboard and Game State (Center) */}
      <div className="col-span-6 flex flex-col gap-4 h-full">
        <div className="flex-grow relative flex items-center justify-center">
          <Chessboard
            position={fen}
            onDrop={handlePieceDrop}
            coachingData={coachingData}
            isThinking={isThinking}
          />
        </div>
        <Card>
          <GameStatePanel fen={fen} />
        </Card>
      </div>

      {/* Cultural Context Panel (Right) */}
      <Card className="col-span-3 h-full overflow-hidden">
        <CulturalContextPanel coachingData={coachingData} />
      </Card>
    </div>
  );
};

export default ChessGameLayout;
