import { Roarr } from 'roarr';

// This is the central logger for the frontend application.
// It is configured to align with the backend logging standards,
// using a 'service' key for context.
export const logger = Roarr.child({
  // The VITE_SERVICE_NAME is injected by the Docker environment via Vite.
  service: import.meta.env.VITE_SERVICE_NAME || 'chessmate-frontend',
});

logger.info('Frontend logger initialized.');
