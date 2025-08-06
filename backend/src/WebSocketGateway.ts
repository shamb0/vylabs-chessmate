/**
 * ChessMate WebSocket Gateway (TypeScript)
 *
 * Manages WebSocket connections, client lifecycle, and message routing.
 *
 * @author Vyaakar Labs <heydev@vyaakar.co.in>
 * @location India
 * @license MIT
 */
import { WebSocketServer, WebSocket, VerifyClientCallbackSync } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import http from 'http';
import logger from '@/lib/logger';
import eventBus from './EventBus';
import { CoachingResponse } from './lib/types';

// Augment the WebSocket type to include our custom ID
interface Client extends WebSocket {
  id: string;
}

class WebSocketGateway {
  private logger: typeof logger;
  private wss: WebSocketServer | null = null;
  private eventBus: typeof eventBus;

  constructor() {
    this.logger = logger.child({ service: 'WebSocketGateway' });
    this.eventBus = eventBus;
  }

  public initialize(server: http.Server): Promise<void> {    
    return new Promise((resolve) => {
      this.logger.info('Initializing WebSocketGateway...');
      this.wss = new WebSocketServer({ 
        server,
        clientTracking: true,
        perMessageDeflate: false,
        verifyClient: ((info) => {
          this.logger.info('WebSocket connection attempt', { 
            origin: info.origin, 
            host: info.req.headers.host,
            secure: info.secure
          });
          return true;
        }) as VerifyClientCallbackSync        
      });

      console.log('🔌 [DIAGNOSTIC] WebSocket Server Configuration:', {
        serverPort: server.listening ? (server.address() as any)?.port : 'Not listening',
        serverAddress: server.address(),
        serverListening: server.listening,
        wssOptions: {
          clientTracking: true,
          perMessageDeflate: false,
        },
        timestamp: new Date().toISOString()
      });

      // Log when server starts listening
      server.on('listening', () => {
        const address = server.address();
        console.log('🔌 [DIAGNOSTIC] HTTP Server listening:', {
          address: address,
          port: (address as any)?.port,
          timestamp: new Date().toISOString()
        });
      });

      // Add WebSocket server event logging
      this.wss.on('listening', () => {
        console.log('🔌 [DIAGNOSTIC] WebSocket Server is listening');
      });

      this.wss.on('error', (error) => {
        console.log('❌ [DIAGNOSTIC] WebSocket Server error:', error);
      });

      console.log('🔌 [DIAGNOSTIC] WebSocket Server created successfully');
      
      this.wss.on('connection', (ws: Client) => {
        ws.id = uuidv4();
        this.logger.info('Client connected', { clientId: ws.id });

        this.eventBus.publish('client:connected', { ws_client: ws.id });
        this.eventBus.emit('client:connected', { ws });

        ws.on('message', async (message: any) => {
          // 🔥 ENHANCED: Add diagnostic logging (minimal addition)
          console.log('🔌 MESSAGE HANDLER CALLED!', { 
            clientId: ws.id, 
            messageType: typeof message,
            messageLength: message.length 
          });

          this.logger.info('Message received from client', {
            clientId: ws.id,
            message: JSON.stringify(message).substring(0, 200)
          });

          try {
            const data = JSON.parse(message);
            
            this.logger.info('[BACKEND] Parsed message:', {
              type: data.type,
              clientId: ws.id,
              data: data
            });

            // Add client ID for ADK service
            data.ws_client = ws.id;

            // Determine the correct work queue based on message type
            const queue = data.type === 'illegal_move' 
              ? 'illegal_move_work_queue' 
              : 'coaching_work_queue';

            this.eventBus.enqueue(queue, data);

            // 🔍 DIAGNOSTIC: Check queue length after enqueue (minimal addition)
            const queueLength = await this.eventBus.getQueueLength(queue);
            this.logger.info('Message enqueued to Redis work queue', { 
              queue, 
              clientId: ws.id,
              queueLength 
            });

          } catch (error: any) {
            this.logger.error('Failed to parse message', {
              clientId: ws.id,
              error: { message: error.message },
            });
            ws.send(JSON.stringify({ type: 'error', message: 'Invalid JSON format' }));
          }
        });

        console.log('🔌 [DIAGNOSTIC] Message handler registered for client:', {
          clientId: ws.id,
          listenerCount: ws.listenerCount('message'),
          hasMessageHandler: ws.listeners('message').length > 0,
          readyState: ws.readyState,
          timestamp: new Date().toISOString()
        });

        // Test if WebSocket can receive any events at all
        ws.on('ping', (data) => {
          console.log('🔌 [DIAGNOSTIC] Ping received:', { clientId: ws.id, data: data.toString() });
        });

        ws.on('pong', (data) => {
          console.log('🔌 [DIAGNOSTIC] Pong received:', { clientId: ws.id, data: data.toString() });
        });

        // Send a test message immediately after connection
        setTimeout(() => {
          if (ws.readyState === WebSocket.OPEN) {
            console.log('🔌 [DIAGNOSTIC] Sending test message to client:', ws.id);
            ws.send(JSON.stringify({
              type: 'server_test',
              message: 'Hello from server',
              timestamp: new Date().toISOString()
            }));
          }
        }, 1000);

        ws.on('close', (code: number, reason: Buffer) => {
          const reasonStr = reason.toString();
          this.logger.info('Client disconnected', {
            clientId: ws.id,
            closeCode: code,
            reason: reasonStr,
          });
          this.eventBus.publish('client:disconnected', {
            ws_client: ws.id,
            code,
            reason: reasonStr,
          });
          this.eventBus.emit('client:disconnected', {
            ws,
            code,
            reason: reasonStr,
          });
        });
      });      

      this.eventBus.on('coaching:message_ready', (message: CoachingResponse) => {
        this.wss?.clients.forEach((client: WebSocket) => {
          const wsClient = client as Client;
          if (wsClient.id === message.ws_client && wsClient.readyState === WebSocket.OPEN) {
            wsClient.send(JSON.stringify(message));
          }
        });
      });

      this.eventBus.on('server:message', ({ ws, message }: { ws: Client; message: object }) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(message));
        }
      });

      this.eventBus.on('game:started', ({ ws, gameState }: { ws: Client; gameState: object }) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'gameStarted', ...gameState }));
        }
      });
      this.logger.info('WebSocketGateway event listeners initialized.');
      resolve();
    });
  }

  public async healthcheckRedisConnection(): Promise<void> {
    await this.eventBus.diagnoseRedisConnection();
  }
  
  public async shutdown(): Promise<void> {
    this.logger.info('Shutting down WebSocketGateway...');
    return new Promise((resolve) => {
      if (this.wss) {
        this.wss.close(() => {
          this.logger.info('WebSocket server closed.');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}

export default new WebSocketGateway();
