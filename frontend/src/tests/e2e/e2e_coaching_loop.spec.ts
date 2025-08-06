import { describe, it, expect } from 'vitest';
import WebSocket from 'ws';
import { Roarr as log } from 'roarr';
import { CoachingPayloadSchema } from '@/lib/schemas';

describe('Frontend to Backend E2E Coaching Loop', () => {
  it('should connect, start a game, make a move, and receive a valid coaching response', async () => {
    log.info({ testId: 'e2e-coaching' }, 'Starting coaching loop test');
    const wsUrl = 'ws://backend-node:8080';

    const ws = new WebSocket(wsUrl);

    const messagePromise = new Promise((resolve, reject) => {
      ws.on('message', (data: WebSocket.Data) => {
        try {
          const message = JSON.parse(data.toString());
          log.info({ message }, '[WS_EVENT] Received message');

          if (message.type === 'coaching:message_ready') {
            resolve(message);
          }
        } catch (error) {
          reject(error);
        }
      });
      ws.on('error', reject);
    });

    await new Promise((resolve) => ws.on('open', resolve));
    log.info('[WS_EVENT] open event');

    const move = 'e4';
    ws.send(JSON.stringify({ type: 'move', move }));
    log.info({ move }, '[WS_EVENT] Sent move to backend');

    const coachingMessage: any = await messagePromise;

    // Assert the overall message structure
    expect(coachingMessage).toHaveProperty('type', 'coaching:message_ready');
    expect(coachingMessage).toHaveProperty('ws_client');
    expect(coachingMessage).toHaveProperty('payload');

    // Validate the payload against the Zod schema
    const validation = CoachingPayloadSchema.safeParse(coachingMessage.payload);
    expect(validation.success, 'CoachingPayload validation failed').toBe(true);

    if (validation.success) {
      log.info({ payload: validation.data }, 'CoachingPayload validation successful');
      // Optional: Add more specific assertions on the validated data
      expect(validation.data.message.length).toBeGreaterThan(0);
      expect(['Novice', 'Developing', 'Expert']).toContain(validation.data.cognitiveStage);
    }

    ws.close();
  }, 120000);
});