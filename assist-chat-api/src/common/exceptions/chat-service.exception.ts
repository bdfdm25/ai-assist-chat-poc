import { WsException } from '@nestjs/websockets';

/**
 * Base exception for chat service related errors
 */
export class ChatServiceException extends Error {
  /**
   * Creates a new ChatServiceException
   *
   * @param {string} message - Error message
   */
  constructor(message: string) {
    super(message);
    this.name = 'ChatServiceException';
  }
}

/**
 * Exception thrown when a chat session is not found
 *
 * @extends ChatServiceException
 */
export class SessionNotFoundException extends ChatServiceException {
  /**
   * Creates a new SessionNotFoundException
   *
   * @param {string} sessionId - The ID of the session that was not found
   */
  constructor(sessionId: string) {
    super(`Session not found: ${sessionId}`);
    this.name = 'SessionNotFoundException';
  }
}

/**
 * Exception thrown when a chat message is invalid
 *
 * @extends WsException
 */
export class InvalidMessageException extends WsException {
  /**
   * Creates a new InvalidMessageException
   *
   * @param {string} [message='Invalid message format'] - Error message
   */
  constructor(message?: string) {
    super(message || 'Invalid message format');
  }
}

/**
 * Exception thrown when message processing fails
 *
 * @extends ChatServiceException
 */
export class MessageProcessingException extends ChatServiceException {
  /**
   * Creates a new MessageProcessingException
   *
   * @param {string} message - Error message
   * @param {Error} [originalError] - The original error that caused this exception
   */
  constructor(
    message: string,
    public readonly originalError?: Error,
  ) {
    super(message);
    this.name = 'MessageProcessingException';
  }
}
