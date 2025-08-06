/**
 * ChessMate Logger (TypeScript)
 *
 * Configures a structured, centralized logger using Winston.
 * Adheres to the project's coding standards for high-value, low-noise logging.
 *
 * @author Vyaakar Labs <heydev@vyaakar.co.in>
 * @location India
 * @license MIT
 */
import winston from 'winston';

const logFormat = winston.format.printf(({ level, message, timestamp, service, ...metadata }) => {
  let msg = `${timestamp} [${service}] ${level}: ${message}`;
  if (Object.keys(metadata).length > 0) {
    msg += ` ${JSON.stringify(metadata)}`;
  }
  return msg;
});

const logger: winston.Logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({
      format: () => new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
    }),
    winston.format.colorize(),
    winston.format.splat(),
    logFormat
  ),
  defaultMeta: { service: process.env.SERVICE_NAME || 'chessmate-backend' },
  transports: [
    new winston.transports.Console(),
  ],
});

export default logger;
