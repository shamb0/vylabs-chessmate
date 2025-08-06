import React from 'react';

interface CapturedPiecesProps {
  captured: {
    w: string[];
    b: string[];
  };
}

const CapturedPieces: React.FC<CapturedPiecesProps> = ({ captured }) => {
  const pieceToUnicode: { [key: string]: string } = {
    p: '♙', n: '♘', b: '♗', r: '♖', q: '♕',
    P: '♟', N: '♞', B: '♝', R: '♜', Q: '♛',
  };

  return (
    <div>
      <div>
        <strong>White captured:</strong>
        <span style={{ marginLeft: '10px', fontSize: '20px' }}>
          {captured.b.map(piece => pieceToUnicode[piece]).join(' ')}
        </span>
      </div>
      <div>
        <strong>Black captured:</strong>
        <span style={{ marginLeft: '10px', fontSize: '20px' }}>
          {captured.w.map(piece => pieceToUnicode[piece]).join(' ')}
        </span>
      </div>
    </div>
  );
};

export default CapturedPieces;
