import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { Observable, Subject } from 'rxjs';
import { Message } from '@common/interfaces/message.interface';
import { CircuitBreakerService } from './circuit-breaker.service';
import { AIMessage } from './interfaces/ai-message.interface';
import {
  AIAuthenticationException,
  AIConfigurationException,
  AIRateLimitException,
  AIUnexpectedErrorException,
} from '@common/exceptions/ai-service.exception';
import { CircuitBreakerStats } from './circuit-breaker.service';

/**
 * Configuration interface for AI Service
 */
interface AIServiceConfig {
  /** OpenAI API key */
  apiKey: string;
  /** Model to use for completions */
  model: string;
  /** Maximum tokens to generate */
  maxTokens: number;
  /** Temperature for response randomness (0-2) */
  temperature: number;
  /** Maximum number of retry attempts */
  maxRetries: number;
  /** Maximum context window size in tokens */
  defaultContextWindow: number;
}

/**
 * AI Service for handling OpenAI chat completions
 *
 * This service provides an abstraction layer over OpenAI API with:
 * - Circuit breaker protection for resilience
 * - Automatic retry mechanism with exponential backoff
 * - Streaming and non-streaming completion support
 * - Token estimation and context window management
 * - Comprehensive error handling
 *
 * Design Patterns:
 * - Facade Pattern: Simplifies OpenAI API interaction
 * - Strategy Pattern: Configurable retry and backoff strategies
 * - Observer Pattern: Streaming responses via RxJS Observables
 *
 * @example
 * ```typescript
 * const messages = [{ role: 'user', content: 'Hello' }];
 * const stream = aiService.streamCompletion(messages);
 * stream.subscribe(chunk => console.log(chunk));
 * ```
 */
@Injectable()
export class AIService {
  private readonly logger = new Logger(AIService.name);

  /** OpenAI client instance */
  private readonly openai: OpenAI;

  /** Service configuration */
  private readonly config: AIServiceConfig;

  /**
   * Creates a new AIService instance
   *
   * Initializes the OpenAI client and loads configuration from environment variables.
   * Throws AIConfigurationException if API key is missing.
   *
   * @param {ConfigService} configService - NestJS configuration service
   * @param {CircuitBreakerService} circuitBreaker - Circuit breaker for resilience
   * @throws {AIConfigurationException} When API key is not configured
   */
  constructor(
    private readonly configService: ConfigService,
    private readonly circuitBreaker: CircuitBreakerService,
  ) {
    const apiKey = this.configService.get<string>('openai.apiKey');

    if (!apiKey) {
      throw new AIConfigurationException('OpenAI API key is not configured');
    }

    // Initialize configuration
    this.config = {
      apiKey,
      model: this.configService.get<string>(
        'openai.model',
        'gpt-4-turbo-preview',
      ),
      maxTokens: this.configService.get<number>('openai.maxTokens', 1000),
      temperature: this.configService.get<number>('openai.temperature', 0.7),
      maxRetries: 3,
      defaultContextWindow: 4000,
    };

    // Initialize OpenAI client
    this.openai = new OpenAI({
      apiKey: this.config.apiKey,
    });

    this.logger.log(`AI Service initialized with model: ${this.config.model}`);
    this.logger.debug(
      `Configuration: maxTokens=${this.config.maxTokens}, ` +
        `temperature=${this.config.temperature}, ` +
        `maxRetries=${this.config.maxRetries}`,
    );
  }

  /**
   * Creates a streaming completion from OpenAI with the given messages
   *
   * Returns an Observable that emits string chunks as they arrive from OpenAI.
   * Includes circuit breaker protection and automatic retry logic.
   *
   * @param {Message[]} messages - Array of messages for the conversation context
   * @returns {Observable<string>} Observable stream of response chunks
   *
   * @example
   * ```typescript
   * const messages = [{ role: 'user', content: 'Tell me a story' }];
   * aiService.streamCompletion(messages).subscribe({
   *   next: (chunk) => console.log(chunk),
   *   error: (err) => console.error(err),
   *   complete: () => console.log('Done')
   * });
   * ```
   */
  streamCompletion(messages: Message[]): Observable<string> {
    const stream = new Subject<string>();

    // Convert messages to OpenAI format
    const openaiMessages: AIMessage[] = messages.map((msg: AIMessage) => ({
      role: msg.role,
      content: msg.content,
    }));

    this.logger.log(
      `Starting stream completion for ${messages.length} messages`,
    );
    this.logger.debug(
      `Model: ${this.config.model}, Max tokens: ${this.config.maxTokens}`,
    );

    // Execute with circuit breaker protection
    this.circuitBreaker
      .execute(() => this.streamWithRetry(openaiMessages, stream))
      .catch((error) => {
        this.logger.error(
          `Circuit breaker rejected or error: ${error.message}`,
        );
        stream.error(error);
      });

    return stream.asObservable();
  }

  /**
   * Attempts to stream with automatic retry on failure
   *
   * Implements exponential backoff retry strategy for transient failures.
   *
   * @private
   * @param {AIMessage[]} messages - Messages to send to OpenAI
   * @param {Subject<string>} stream - RxJS subject to emit chunks
   * @param {number} [attempt=1] - Current attempt number
   * @returns {Promise<void>}
   * @throws {Error} When max retries exceeded
   */
  private async streamWithRetry(
    messages: AIMessage[],
    stream: Subject<string>,
    attempt: number = 1,
  ): Promise<void> {
    try {
      await this.executeStream(messages, stream);
    } catch (error) {
      this.logger.error(`Stream attempt ${attempt} failed: ${error.message}`);

      if (attempt < this.config.maxRetries) {
        const delay = this.calculateRetryDelay(attempt);
        this.logger.log(
          `Retrying in ${delay}ms (attempt ${attempt + 1}/${this.config.maxRetries})`,
        );

        await this.sleep(delay);
        return this.streamWithRetry(messages, stream, attempt + 1);
      }

      throw error;
    }
  }

  /**
   * Executes the actual streaming request to OpenAI
   *
   * Handles the streaming response and emits chunks via the provided Subject.
   * Implements detailed error handling for various OpenAI API errors.
   *
   * @private
   * @param {AIMessage[]} messages - Messages to send to OpenAI
   * @param {Subject<string>} stream - RxJS subject to emit chunks
   * @returns {Promise<void>}
   * @throws {AIRateLimitException} When rate limit is exceeded
   * @throws {AIAuthenticationException} When authentication fails
   * @throws {AIUnexpectedErrorException} For other API errors
   */
  private async executeStream(
    messages: AIMessage[],
    stream: Subject<string>,
  ): Promise<void> {
    try {
      const completion = await this.openai.chat.completions.create({
        model: this.config.model,
        messages: messages,
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
        stream: true,
      });

      let totalTokens = 0;
      let chunks = 0;

      for await (const chunk of completion) {
        const content = chunk.choices[0]?.delta?.content;

        if (content) {
          stream.next(content);
          chunks++;
        }

        // Estimate tokens (rough approximation)
        if (content) {
          totalTokens += Math.ceil(content.length / 4);
        }

        // Check for finish reason
        if (chunk.choices[0]?.finish_reason) {
          this.logger.log(`Stream finished: ${chunk.choices[0].finish_reason}`);
          this.logger.debug(
            `Total chunks: ${chunks}, Estimated tokens: ${totalTokens}`,
          );
          break;
        }
      }

      stream.complete();
    } catch (error) {
      this.handleOpenAIError(error);
    }
  }

  /**
   * Handles and transforms OpenAI API errors into domain-specific exceptions
   *
   * @private
   * @param {any} error - Error from OpenAI API
   * @throws {AIRateLimitException} For 429 status codes
   * @throws {AIAuthenticationException} For 401 status codes
   * @throws {AIUnexpectedErrorException} For other API errors
   */
  private handleOpenAIError(error: any): never {
    this.logger.error(`OpenAI API error: ${error.message}`, error.stack);

    // Handle specific OpenAI errors
    if (error.response) {
      const status = error.response.status;
      const message = error.response.data?.error?.message || error.message;

      switch (status) {
        case 429:
          throw new AIRateLimitException(message);
        case 401:
          throw new AIAuthenticationException(message);
        case 500:
        case 502:
        case 503:
          throw new AIUnexpectedErrorException(message, status);
        default:
          throw new AIUnexpectedErrorException(message, status);
      }
    }

    throw error;
  }

  /**
   * Generates a non-streaming completion from OpenAI
   *
   * Returns the complete response as a single string.
   * Includes circuit breaker protection.
   *
   * @param {Message[]} messages - Array of messages for conversation context
   * @returns {Promise<string>} Complete response text
   *
   * @example
   * ```typescript
   * const messages = [{ role: 'user', content: 'Hello' }];
   * const response = await aiService.generateCompletion(messages);
   * console.log(response);
   * ```
   */
  async generateCompletion(messages: Message[]): Promise<string> {
    const openaiMessages: AIMessage[] = messages.map((msg: AIMessage) => ({
      role: msg.role,
      content: msg.content,
    }));

    this.logger.log('Generating non-streaming completion');

    try {
      const completion = await this.circuitBreaker.execute(() =>
        this.openai.chat.completions.create({
          model: this.config.model,
          messages: openaiMessages,
          max_tokens: this.config.maxTokens,
          temperature: this.config.temperature,
          stream: false,
        }),
      );

      const content = completion.choices[0]?.message?.content || '';

      this.logger.log(`Completion generated: ${content.length} characters`);
      this.logger.debug(`Tokens used: ${completion.usage?.total_tokens}`);

      return content;
    } catch (error) {
      this.logger.error(`Error generating completion: ${error.message}`);
      throw error;
    }
  }

  /**
   * Tests the connection to OpenAI API
   *
   * Attempts to retrieve a model to verify API key and connectivity.
   *
   * @returns {Promise<boolean>} True if connection successful, false otherwise
   *
   * @example
   * ```typescript
   * const isConnected = await aiService.testConnection();
   * if (!isConnected) {
   *   console.error('Failed to connect to OpenAI');
   * }
   * ```
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.openai.models.retrieve('gpt-3.5-turbo');
      this.logger.log('✅ OpenAI connection test successful');
      return true;
    } catch (error) {
      this.logger.error(`❌ OpenAI connection test failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Gets circuit breaker statistics
   *
   * @returns {CircuitBreakerStats} Current circuit breaker statistics
   *
   * @example
   * ```typescript
   * const stats = aiService.getCircuitBreakerStats();
   * console.log(`Circuit state: ${stats.state}`);
   * ```
   */
  getCircuitBreakerStats(): CircuitBreakerStats {
    return this.circuitBreaker.getStats();
  }

  /**
   * Manually resets the circuit breaker
   *
   * @example
   * ```typescript
   * aiService.resetCircuitBreaker();
   * ```
   */
  resetCircuitBreaker(): void {
    this.circuitBreaker.reset();
  }

  /**
   * Calculates retry delay using exponential backoff
   *
   * Implements exponential backoff strategy: 1s, 2s, 4s, etc.
   * Maximum delay is capped at 10 seconds.
   *
   * @private
   * @param {number} attempt - Current attempt number (1-based)
   * @returns {number} Delay in milliseconds
   */
  private calculateRetryDelay(attempt: number): number {
    // Exponential backoff: 1s, 2s, 4s, capped at 10s
    return Math.min(1000 * Math.pow(2, attempt - 1), 10000);
  }

  /**
   * Utility method to sleep for specified milliseconds
   *
   * @private
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise<void>}
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Estimates token count for given text
   *
   * Uses a rough approximation of ~4 characters per token.
   * For more accurate counting, consider using a proper tokenizer library.
   *
   * @param {string} text - Text to estimate tokens for
   * @returns {number} Estimated token count
   *
   * @example
   * ```typescript
   * const tokens = aiService.estimateTokens('Hello, world!');
   * console.log(`Estimated tokens: ${tokens}`);
   * ```
   */
  estimateTokens(text: string): number {
    // Rough estimation: ~4 characters per token
    // Note: This is an approximation. For accurate counting, use tiktoken library
    return Math.ceil(text.length / 4);
  }

  /**
   * Fits messages to context window by removing older messages
   *
   * Ensures messages fit within the token limit by:
   * 1. Always preserving system messages
   * 2. Keeping most recent messages
   * 3. Removing oldest messages first when exceeding limit
   *
   * @param {Message[]} messages - Array of messages to fit
   * @param {number} [maxContextTokens=4000] - Maximum tokens allowed
   * @returns {Message[]} Fitted messages array
   *
   * @example
   * ```typescript
   * const messages = [...]; // Long conversation
   * const fitted = aiService.fitToContextWindow(messages, 2000);
   * console.log(`Reduced from ${messages.length} to ${fitted.length} messages`);
   * ```
   */
  fitToContextWindow(
    messages: Message[],
    maxContextTokens: number = this.config.defaultContextWindow,
  ): Message[] {
    let totalTokens = 0;
    const fittedMessages: Message[] = [];

    // Always include system message if present
    const systemMessage = messages.find((m) => m.role === 'system');
    if (systemMessage) {
      totalTokens += this.estimateTokens(systemMessage.content);
      fittedMessages.push(systemMessage);
    }

    // Add messages from most recent, working backwards
    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i];

      if (message.role === 'system') continue; // Already added

      const messageTokens = this.estimateTokens(message.content);

      if (totalTokens + messageTokens > maxContextTokens) {
        this.logger.warn(
          `Context window limit reached. Truncating older messages.`,
        );
        break;
      }

      totalTokens += messageTokens;
      fittedMessages.unshift(message);
    }

    this.logger.debug(
      `Context window: ${totalTokens}/${maxContextTokens} tokens`,
    );

    return fittedMessages;
  }
}
