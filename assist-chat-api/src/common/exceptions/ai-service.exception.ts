import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Base exception for AI service related errors
 *
 * @extends HttpException
 */
export class AIServiceException extends HttpException {
  /**
   * Creates a new AIServiceException
   *
   * @param {string} message - Error message
   * @param {HttpStatus} [status=HttpStatus.INTERNAL_SERVER_ERROR] - HTTP status code
   */
  constructor(
    message: string,
    status: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR,
  ) {
    super(
      {
        statusCode: status,
        message,
        error: 'AI Service Error',
        timestamp: new Date().toISOString(),
      },
      status,
    );
  }
}

/**
 * Exception thrown when AI service rate limit is exceeded
 *
 * @extends AIServiceException
 */
export class AIRateLimitException extends AIServiceException {
  /**
   * Creates a new AIRateLimitException
   *
   * @param {string} [message='Rate limit exceeded'] - Custom error message
   */
  constructor(message?: string) {
    super(
      message || 'AI service rate limit exceeded. Please try again later.',
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}

/**
 * Exception thrown when AI service authentication fails
 *
 * @extends AIServiceException
 */
export class AIAuthenticationException extends AIServiceException {
  /**
   * Creates a new AIAuthenticationException
   *
   * @param {string} [message='Authentication failed'] - Custom error message
   */
  constructor(message?: string) {
    super(
      message || 'AI service authentication failed',
      HttpStatus.UNAUTHORIZED,
    );
  }
}

/**
 * Exception thrown when AI service configuration is invalid
 *
 * @extends AIServiceException
 */
export class AIConfigurationException extends AIServiceException {
  /**
   * Creates a new AIConfigurationException
   *
   * @param {string} message - Error message describing the configuration issue
   */
  constructor(message: string) {
    super(
      `AI service configuration error: ${message}`,
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}

/**
 * Exception thrown when AI service encounters an unexpected error
 *
 * @extends AIServiceException
 */
export class AIUnexpectedErrorException extends AIServiceException {
  /**
   * Creates a new AIUnexpectedErrorException
   *
   * @param {string} message - Error message
   * @param {number} [statusCode] - HTTP status code from AI service
   */
  constructor(message: string, statusCode?: number) {
    super(
      `AI service error${statusCode ? ` (${statusCode})` : ''}: ${message}`,
      HttpStatus.BAD_GATEWAY,
    );
  }
}
