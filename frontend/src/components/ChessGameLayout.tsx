import React from 'react';

interface ChessGameLayoutProps {
  conversationPanel: React.ReactNode;
  gameStatePanel: React.ReactNode;
  culturalContextPanel: React.ReactNode;
  chessboard: React.ReactNode;
}

const ChessGameLayout: React.FC<ChessGameLayoutProps> = ({
  conversationPanel,
  gameStatePanel,
  culturalContextPanel,
  chessboard,
}) => {
  return (
    <div className="grid grid-cols-3 gap-6 p-6 h-[calc(100vh-200px)] bg-background text-foreground">
      {/* Conversation Panel (Left) */}
      <div className="lg:col-span-3 h-full">
        {conversationPanel}
      </div>

      {/* Chessboard and Game State (Center) */}
      <div className="lg:col-span-6 flex flex-col gap-4">
        <div className="flex-grow relative flex items-center justify-center">
          {chessboard}
        </div>
        {gameStatePanel}
      </div>

      {/* Cultural Context Panel (Right) */}
      <div className="lg:col-span-3 h-full">
        {culturalContextPanel}
      </div>
    </div>
  );
};

export default ChessGameLayout;