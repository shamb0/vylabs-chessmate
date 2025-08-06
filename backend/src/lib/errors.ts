/**
 * ChessMate Custom Errors
 *
 * Defines a hierarchy of custom error classes for consistent, structured
 * error handling across the application, as per the coding standards.
 *
 * @author Vyaakar Labs <heydev@vyaakar.co.in>
 * @location India
 * @license MIT
 */

export class GameError extends Error {
  public readonly code: string;
  public readonly context: object;

  constructor(message: string, code: string, context: object = {}) {
    super(message);
    this.name = 'GameError';
    this.code = code;
    this.context = context;
  }
}

export class ValidationError extends GameError {
  constructor(message: string, context: object = {}) {
    super(message, 'VALIDATION_ERROR', context);
    this.name = 'ValidationError';
  }
}
