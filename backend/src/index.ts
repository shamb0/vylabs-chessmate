/**
 * ChessMate Backend Entrypoint (TypeScript)
 *
 * Initializes and orchestrates all backend services.
 *
 * @author Vyaakar Labs <heydev@vyaakar.co.in>
 * @location India
 * @license MIT
 */
import 'module-alias/register';
import 'dotenv/config';
import http from 'http';
import logger from '@/lib/logger';
import webSocketGateway from './WebSocketGateway';

async function main() {
  logger.info('Initializing ChessMate backend services...');

  const server = http.createServer((req, res) => {
    if (req.url === '/healthz' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('OK');
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
    }
  });

  await webSocketGateway.initialize(server);
  await webSocketGateway.healthcheckRedisConnection();

  server.listen(8080, '0.0.0.0', () => {
    logger.info(`
    /_/   ( o.o )
    > ^ <
   /  |    /   |
  `);
    logger.info('ChessMate backend services are running on port 8080.');
  });
}

async function shutdown(signal: string) {
  logger.info(`Received ${signal}. Shutting down gracefully...`);

  // Shut down services in reverse order of initialization
  await webSocketGateway.shutdown();
  

  logger.info('All services shut down. Exiting.');
  process.exit(0);
}

// Handle graceful shutdown
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

main().catch((error) => {
  logger.error('Failed to initialize backend services', { error });
  process.exit(1);
});
