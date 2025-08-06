
import WebSocket from 'ws';
import logger from '@/lib/logger';
import { CoachingResponse } from '@/lib/types';

// Define interfaces for our WebSocket messages to ensure type safety
interface MoveEvent {
  type: 'move';
  move: string;
}

describe('ChessMate E2E WebSocket Test', () => {
  it('should receive a coaching message after sending a valid move', (done) => {
    const wsUrl = 'ws://backend-node:8080';
    logger.info(`[TEST] Connecting to WebSocket server at ${wsUrl}`);
    const ws = new WebSocket(wsUrl);

    ws.on('open', () => {
      logger.info('[TEST] WebSocket connection opened successfully.');
      const move: MoveEvent = { type: 'move', move: 'e4' };
      ws.send(JSON.stringify(move));
      logger.info('[TEST] Sent move to server:', { move });
    });

    ws.on('message', (data) => {
      const rawMessage = data.toString();
      logger.info('[TEST] Received raw message from server:', { rawMessage });
      try {
        const message: any = JSON.parse(rawMessage);

        if (message.type === 'gameState') {
          logger.info('[TEST] Ignoring initial gameState message.');
          return;
        }

        logger.info('[TEST] Received structured message:', { message });
        const coachingMessage = message as CoachingResponse;

        // Assertions for the coaching message
        expect(coachingMessage.type).toBe('coaching:message_ready');
        expect(coachingMessage.payload).toBeDefined();
        expect(typeof coachingMessage.payload.message).toBe('string');
        expect(coachingMessage.payload.message).not.toBe('');

        logger.info('[TEST] Coaching message validated successfully.');
        ws.close();
        done();
      } catch (err) {
        logger.error('[TEST] Error during message processing or assertion.', { error: err });
        done(err);
      }
    });

    ws.on('error', (error) => {
      logger.error('[TEST] WebSocket error occurred.', { error });
      done(error);
    });

    ws.on('close', () => {
      logger.info('[TEST] WebSocket connection closed.');
    });
  }, 60000);
});
