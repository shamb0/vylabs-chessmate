import React from 'react';

interface TurnIndicatorProps {
  turn: 'w' | 'b';
}

const TurnIndicator: React.FC<TurnIndicatorProps> = ({ turn }) => {
  return (
    <div className="text-lg">
      Turn: {turn === 'w' ? 'White' : 'Black'}
    </div>
  );
};

export default TurnIndicator;