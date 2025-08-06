import React from 'react';
import ReactDOM from 'react-dom/client';
import { Roarr } from 'roarr';
import '@roarr/browser-log-writer';
import '@/index.css';
import App from '@/App';
import reportWebVitals from '@/reportWebVitals';
import ErrorBoundary from '@/components/ErrorBoundary';

// Add graceful SIGTERM handling for Docker
if (typeof process !== 'undefined') {
  process.on('SIGTERM', () => {
    Roarr.info('Received SIGTERM, initiating graceful shutdown.');
    process.exit(0);
  });
}

// High-value trace to confirm file execution
Roarr.info({
  context: {
    file: 'index.tsx',
    timestamp: new Date().toISOString(),
  },
}, 'Application entry point reached');

console.log({
  context: {
    file: 'index.tsx',
    timestamp: new Date().toISOString(),
  },
}, 'Application entry point reached');

// Global error handler to catch silent startup errors
window.onerror = (message, source, lineno, colno, error) => {
  Roarr.error({
    context: {
      message: String(message),
      source,
      lineno,
      colno,
      error: error ? error.stack : 'N/A',
    },
  }, 'A global error was caught');
  return true;
};

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

// TEMPORARILY REMOVE STRICT MODE FOR TESTING
// React.StrictMode causes double-mounting in development which can trigger
// WebSocket connect/disconnect cycles if cleanup isn't handled properly
Roarr.info('Rendering React root WITHOUT StrictMode for WebSocket stability testing...');
root.render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
Roarr.info('React root render command issued.');

reportWebVitals();