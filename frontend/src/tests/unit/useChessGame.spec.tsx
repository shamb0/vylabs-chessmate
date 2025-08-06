import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { useChessGame } from '@/hooks/useChessGame';
import { WebSocketProvider } from '@/WebSocketProvider';
import { webSocket } from '@/mocks/handlers'; // Import the WebSocket mock


describe('useChessGame Hook', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should send a valid move to the WebSocket server in SAN format', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <WebSocketProvider url="ws://localhost:8088">{children}</WebSocketProvider>
    );

    const { result } = renderHook(() => useChessGame(), { wrapper });

    // 1. Wait for the WebSocket client to connect.
    await webSocket.connected;

    // 2. Prepare to intercept messages sent from the client.
    const clientMessagePromise = new Promise((resolve) => {
      webSocket.on('message', (message) => {
        resolve(message);
      });
    });

    // 3. Trigger the action that sends a message.
    act(() => {
      result.current.handlePieceDrop('e2', 'e4');
    });

    // 4. Assert that the server received the correct message.
    await expect(clientMessagePromise).resolves.toBe(
      JSON.stringify({ type: 'move', move: 'e4' })
    );
  });
});