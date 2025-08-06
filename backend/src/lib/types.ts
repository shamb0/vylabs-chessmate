/**
 * Shared type definitions for the ChessMate backend services.
 *
 * @author Vyaakar Labs <heydev@vyaakar.co.in>
 * @location India
 * @license MIT
 */

export interface CoachingResponse {
  type: 'coaching:message_ready';
  ws_client: string;
  payload: {
    message: string;
    highlights?: any[];
  };
}
