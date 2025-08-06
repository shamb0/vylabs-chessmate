/**
 * ChessMate Event Bus (TypeScript)
 *
 * A centralized, Redis-backed event bus for inter-service communication.
 * It uses environment variables for configuration, making it Docker-friendly.
 *
 * @author Vyaakar Labs <heydev@vyaakar.co.in>
 * @location India
 * @license MIT
 */
import { EventEmitter } from 'events';
import Redis from 'ioredis';
import logger from '@/lib/logger';

class EventBus extends EventEmitter {
  private logger: typeof logger;
  private publisher: Redis;
  private subscriber: Redis;

  constructor() {
    super();
    this.logger = logger.child({ service: 'EventBus' });

    // Configuration now correctly uses environment variables for Docker networking
    const redisOptions = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      maxRetriesPerRequest: null, // Keep trying to connect
    };

    this.publisher = new Redis(redisOptions);
    this.subscriber = new Redis(redisOptions);

    this.subscriber.on('connect', () => {
      this.logger.info('Connected to Redis subscriber.');
      this.subscriber.subscribe('coaching:message_ready', (err, count) => {
        if (err) {
          this.logger.error('Failed to subscribe to Redis channels', { err });
        } else {
          this.logger.info(`Subscribed to ${count} Redis channels.`);
        }
      });
    });

    this.subscriber.on('message', (channel, message) => {
      try {
        const parsedMessage = JSON.parse(message);
        // Use the local emit for received messages
        this.emit(channel, parsedMessage);
        this.logger.info('Received Redis message and emitted locally', { channel });
      } catch (error) {
        this.logger.error('Error parsing Redis message', { channel, error });
      }
    });

    this.publisher.on('connect', () => {
      this.logger.info('Connected to Redis publisher.');
    });

    this.publisher.on('error', (err) => {
      this.logger.error('Redis publisher error', { err });
    });

    this.subscriber.on('error', (err) => {
      this.logger.error('Redis subscriber error', { err });
    });
  }

  // public enqueue(queue: string, data: any) {
  //   try {
  //     // Ensure ws object is not serialized
  //     if (data.ws) {
  //       data.ws_client = data.ws.id;
  //       delete data.ws;
  //     }
  //     this.publisher.rpush(queue, JSON.stringify(data));
  //     this.logger.info('Enqueued event to Redis list', { queue, type: data.type });
  //   } catch (error) {
  //     this.logger.error('Error enqueuing event to Redis', { queue, type: data.type, error });
  //   }
  // }


  public async enqueue(queue: string, data: any): Promise<number> {
    const traceId = `enqueue-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    
    try {
      this.logger.info('🔍 [REDIS_ENQUEUE] Starting enqueue operation', {
        traceId,
        queue,
        dataType: typeof data,
        dataKeys: Object.keys(data),
        redisConnected: this.publisher.status === 'ready'
      });

      // Ensure ws object is not serialized
      if (data.ws) {
        data.ws_client = data.ws.id;
        delete data.ws;
      }

      const jsonPayload = JSON.stringify(data);
      
      this.logger.info('🔍 [REDIS_ENQUEUE] About to call RPUSH', {
        traceId,
        queue,
        payloadSize: jsonPayload.length,
        payloadPreview: jsonPayload.substring(0, 100)
      });

      // 🔥 CRITICAL: Time the Redis operation and capture result
      const startTime = Date.now();
      const result = await this.publisher.rpush(queue, jsonPayload);
      const duration = Date.now() - startTime;
      
      this.logger.info('✅ [REDIS_ENQUEUE] RPUSH completed', {
        traceId,
        queue,
        result, // This should be the new queue length
        duration: `${duration}ms`,
        resultType: typeof result
      });

      // 🔍 VERIFICATION: Immediately check the queue length
      const verifyLength = await this.publisher.llen(queue);
      this.logger.info('🔍 [REDIS_VERIFY] Queue length verification', {
        traceId,
        queue,
        rpushResult: result,
        actualLength: verifyLength,
        lengthMatch: result === verifyLength
      });

      // 🔍 PEEK: Try to see the last item in the queue
      try {
        const lastItem = await this.publisher.lindex(queue, -1);
        this.logger.info('👀 [REDIS_PEEK] Last queue item', {
          traceId,
          queue,
          lastItemPreview: lastItem ? lastItem.substring(0, 50) : null,
          lastItemExists: !!lastItem
        });
      } catch (peekError: unknown) {
        const errorMessage = peekError instanceof Error ? peekError.message : String(peekError);
        this.logger.error('❌ [REDIS_PEEK] Failed to peek queue', {
          traceId,
          queue,
          error: errorMessage
        });
      }

      return result;

    } catch (error: any) {
      this.logger.error('❌ [REDIS_ENQUEUE] Enqueue operation failed', {
        traceId,
        queue,
        error: {
          message: error.message,
          code: error.code,
          command: error.command,
          stack: error.stack?.split('\n')[0]
        },
        redisStatus: this.publisher.status
      });
      
      // Don't throw - let the system continue but log the failure
      return 0;
    }
  }

  public publish(channel: string, data: any) {
    try {
      // Ensure ws object is not serialized
      if (data.ws) {
        data.ws_client = data.ws.id;
        delete data.ws;
      }
      this.publisher.publish(channel, JSON.stringify(data));
      this.logger.info('Published event to Redis channel', { channel, type: data.type });
    } catch (error) {
      this.logger.error('Error publishing event to Redis', { channel, type: data.type, error });
    }
  }

  public emit(event: string, ...args: any[]): boolean {
    // This is now for local, in-process events only
    return super.emit(event, ...args);
  }

  public get redis(): Redis {
    return this.publisher;
  }

  // Add queue length helper
  public async getQueueLength(queue: string): Promise<number> {
    try {
      const length = await this.publisher.llen(queue);
      this.logger.info('📏 [QUEUE_LENGTH] Queue length retrieved', { queue, length });
      return length;
    } catch (error: any) {
      this.logger.error('❌ [QUEUE_LENGTH] Failed to get queue length', { 
        queue, 
        error: error.message 
      });
      return -1;
    }
  }

  public async diagnoseRedisConnection(): Promise<void> {
    this.logger.info('🔍 [REDIS_DIAG] Starting Redis connection diagnostics');
    
    try {
      // Test basic connectivity
      const pingResult = await this.publisher.ping();
      this.logger.info('🏓 [REDIS_DIAG] PING result', { pingResult });

      // Test simple operations
      const testKey = `diagnostic_${Date.now()}`;
      
      // Test SET/GET
      await this.publisher.set(testKey, 'test_value');
      const getValue = await this.publisher.get(testKey);
      this.logger.info('📝 [REDIS_DIAG] SET/GET test', { 
        setValue: 'test_value', 
        getValue,
        match: getValue === 'test_value'
      });

      // Test LIST operations specifically
      const testQueue = `test_queue_${Date.now()}`;
      const pushResult = await this.publisher.rpush(testQueue, 'test_message');
      const queueLength = await this.publisher.llen(testQueue);
      const popResult = await this.publisher.lpop(testQueue);
      
      this.logger.info('📋 [REDIS_DIAG] LIST operations test', {
        pushResult,
        queueLength,
        popResult,
        allWorking: pushResult === 1 && queueLength === 1 && popResult === 'test_message'
      });

      // Cleanup
      await this.publisher.del(testKey);
      
      this.logger.info('✅ [REDIS_DIAG] Redis diagnostics completed successfully');
      
    } catch (error: any) {
      this.logger.error('❌ [REDIS_DIAG] Redis diagnostics failed', {
        error: error.message,
        redisStatus: this.publisher.status
      });
    }
  }


}

export default new EventBus();
