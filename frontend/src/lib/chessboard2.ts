// src/lib/chessboard2.ts
import '@chrisoakman/chessboard2';

declare global {
  interface Window {
    Chessboard2: any;
  }
}

export const Chessboard2 = window.Chessboard2;
