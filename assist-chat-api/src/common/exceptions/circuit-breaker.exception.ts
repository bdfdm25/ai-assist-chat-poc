import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Exception thrown when the circuit breaker is in OPEN state
 * and rejects incoming requests to prevent cascade failures.
 *
 * @extends HttpException
 */
export class CircuitBreakerOpenException extends HttpException {
  /**
   * Creates a new CircuitBreakerOpenException
   *
   * @param {string} [message='Circuit breaker is open'] - Custom error message
   * @param {number} [failureCount=0] - Number of failures that triggered the circuit breaker
   */
  constructor(message?: string, failureCount?: number) {
    const defaultMessage =
      'Service temporarily unavailable due to repeated failures';
    const detailedMessage = failureCount
      ? `${defaultMessage} (${failureCount} failures detected)`
      : defaultMessage;

    super(
      {
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        message: message || detailedMessage,
        error: 'Circuit Breaker Open',
        timestamp: new Date().toISOString(),
      },
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  }
}

/**
 * Exception thrown when a circuit breaker operation times out
 *
 * @extends HttpException
 */
export class CircuitBreakerTimeoutException extends HttpException {
  /**
   * Creates a new CircuitBreakerTimeoutException
   *
   * @param {string} [message='Operation timeout'] - Custom error message
   */
  constructor(message?: string) {
    super(
      {
        statusCode: HttpStatus.REQUEST_TIMEOUT,
        message: message || 'Operation timeout',
        error: 'Circuit Breaker Timeout',
        timestamp: new Date().toISOString(),
      },
      HttpStatus.REQUEST_TIMEOUT,
    );
  }
}
