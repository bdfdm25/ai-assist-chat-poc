import { Logger } from '@nestjs/common';
import { CircuitState } from './enums/circuit-state.enum';
import { CircuitBreakerOpenException } from '@common/exceptions/circuit-breaker.exception';

/**
 * Configuration interface for CircuitBreakerService
 */
interface CircuitBreakerConfig {
  /** Number of failures before opening the circuit */
  failureThreshold: number;
  /** Number of successes required to close the circuit from HALF_OPEN state */
  successThreshold: number;
  /** Time in milliseconds before attempting to reset from OPEN to HALF_OPEN */
  timeout: number;
}

/**
 * Statistics interface for circuit breaker monitoring
 */
export interface CircuitBreakerStats {
  /** Current state of the circuit breaker */
  state: CircuitState;
  /** Current count of consecutive failures */
  failureCount: number;
  /** Current count of consecutive successes in HALF_OPEN state */
  successCount: number;
  /** Timestamp of the last failure (null if no failures) */
  lastFailureTime: number | null;
}

/**
 * Circuit Breaker Service implementing the Circuit Breaker Pattern
 *
 * This service prevents cascading failures by monitoring operation failures
 * and temporarily blocking requests when a threshold is reached.
 *
 * Design Pattern: Circuit Breaker Pattern
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Failure threshold reached, requests are rejected immediately
 * - HALF_OPEN: Testing if service recovered, allows limited requests
 *
 * @example
 * ```typescript
 * const result = await circuitBreaker.execute(async () => {
 *   return await externalService.call();
 * });
 * ```
 */
export class CircuitBreakerService {
  private readonly logger = new Logger(CircuitBreakerService.name);

  /** Current state of the circuit breaker */
  private state: CircuitState = CircuitState.CLOSED;

  /** Count of consecutive failures */
  private failureCount = 0;

  /** Count of consecutive successes in HALF_OPEN state */
  private successCount = 0;

  /** Timestamp of the last failure occurrence */
  private lastFailureTime: number | null = null;

  /** Configuration for circuit breaker thresholds and timeouts */
  private readonly config: CircuitBreakerConfig;

  /**
   * Creates a new CircuitBreakerService with default or custom configuration
   *
   * @param {Partial<CircuitBreakerConfig>} [config] - Optional custom configuration
   */
  constructor(config?: Partial<CircuitBreakerConfig>) {
    this.config = {
      failureThreshold: config?.failureThreshold ?? 5,
      successThreshold: config?.successThreshold ?? 2,
      timeout: config?.timeout ?? 60000, // 60 seconds
    };

    this.logger.log(
      `Circuit Breaker initialized: ` +
        `failureThreshold=${this.config.failureThreshold}, ` +
        `successThreshold=${this.config.successThreshold}, ` +
        `timeout=${this.config.timeout}ms`,
    );
  }

  /**
   * Executes a function with circuit breaker protection
   *
   * This method implements the core circuit breaker logic:
   * - In CLOSED state: executes the function normally
   * - In OPEN state: rejects immediately or attempts HALF_OPEN transition
   * - In HALF_OPEN state: allows request through to test service recovery
   *
   * @template T - The return type of the function to execute
   * @param {() => Promise<T>} fn - Async function to execute with protection
   * @returns {Promise<T>} Result of the function execution
   * @throws {CircuitBreakerOpenException} When circuit is OPEN and timeout not elapsed
   * @throws {Error} Any error thrown by the executed function
   *
   * @example
   * ```typescript
   * const result = await circuitBreaker.execute(async () => {
   *   return await apiClient.fetchData();
   * });
   * ```
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (this.shouldAttemptReset()) {
        this.logger.log('Circuit breaker: Attempting reset (HALF_OPEN)');
        this.transitionToHalfOpen();
      } else {
        this.logger.error('Circuit breaker is OPEN - rejecting request');
        throw new CircuitBreakerOpenException(undefined, this.failureCount);
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Handles successful execution of protected function
   *
   * Resets failure count and transitions circuit from HALF_OPEN to CLOSED
   * when success threshold is met.
   *
   * @private
   */
  private onSuccess(): void {
    this.failureCount = 0;

    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;

      if (this.successCount >= this.config.successThreshold) {
        this.logger.log('Circuit breaker: CLOSED (threshold met)');
        this.transitionToClosed();
      }
    }
  }

  /**
   * Handles failed execution of protected function
   *
   * Increments failure count and transitions circuit to OPEN state
   * when failure threshold is reached.
   *
   * @private
   */
  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    this.successCount = 0;

    if (this.failureCount >= this.config.failureThreshold) {
      this.logger.error(
        `Circuit breaker: OPEN (${this.failureCount} failures)`,
      );
      this.transitionToOpen();
    }
  }

  /**
   * Determines if circuit breaker should attempt reset from OPEN to HALF_OPEN
   *
   * @private
   * @returns {boolean} True if timeout has elapsed since last failure
   */
  private shouldAttemptReset(): boolean {
    return (
      this.lastFailureTime !== null &&
      Date.now() - this.lastFailureTime >= this.config.timeout
    );
  }

  /**
   * Transitions circuit breaker to CLOSED state
   *
   * @private
   */
  private transitionToClosed(): void {
    this.state = CircuitState.CLOSED;
    this.successCount = 0;
  }

  /**
   * Transitions circuit breaker to OPEN state
   *
   * @private
   */
  private transitionToOpen(): void {
    this.state = CircuitState.OPEN;
  }

  /**
   * Transitions circuit breaker to HALF_OPEN state
   *
   * @private
   */
  private transitionToHalfOpen(): void {
    this.state = CircuitState.HALF_OPEN;
  }

  /**
   * Gets the current state of the circuit breaker
   *
   * @returns {CircuitState} Current circuit breaker state (CLOSED, OPEN, or HALF_OPEN)
   *
   * @example
   * ```typescript
   * if (circuitBreaker.getState() === CircuitState.OPEN) {
   *   console.log('Service is unavailable');
   * }
   * ```
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Gets comprehensive statistics about circuit breaker state
   *
   * @returns {CircuitBreakerStats} Object containing state, counts, and timestamps
   *
   * @example
   * ```typescript
   * const stats = circuitBreaker.getStats();
   * console.log(`State: ${stats.state}, Failures: ${stats.failureCount}`);
   * ```
   */
  getStats(): CircuitBreakerStats {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
    };
  }

  /**
   * Manually resets the circuit breaker to CLOSED state
   *
   * This method should be used when you want to force-reset the circuit breaker,
   * typically after confirming that the underlying service has recovered.
   *
   * @example
   * ```typescript
   * // After manual service verification
   * circuitBreaker.reset();
   * ```
   */
  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
    this.logger.log('Circuit breaker manually reset');
  }
}
