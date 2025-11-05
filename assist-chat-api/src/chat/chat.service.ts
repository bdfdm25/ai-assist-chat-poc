import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Observable, Subject } from 'rxjs';

import { AIService } from '@ai/ai.service';
import { Message } from '../common/interfaces/message.interface';
import { MessageRole } from '../common/enums/message-role.enum';
import { ChatSession } from './interfaces/chat-session.interface';
import {
  MessageProcessingException,
  SessionNotFoundException,
} from '@common/exceptions/chat-service.exception';

/**
 * Result interface for processed messages
 */
interface ProcessedMessage {
  /** Unique identifier for the assistant's response message */
  messageId: string;
  /** Observable stream of response chunks */
  stream: Observable<string>;
  /** Session ID where the message was processed */
  sessionId: string;
}

/**
 * Configuration for ChatService
 */
interface ChatServiceConfig {
  /** Maximum number of messages to include in context */
  maxContextMessages: number;
  /** Maximum session age in minutes before cleanup */
  maxSessionAgeMinutes: number;
}

/**
 * Chat Service for managing conversations and message processing
 *
 * This service implements the core chat logic with:
 * - Session management with automatic cleanup
 * - Context window management
 * - Streaming responses from AI service
 * - System prompt injection
 *
 * Design Patterns:
 * - Repository Pattern: Sessions stored in memory (can be extended to database)
 * - Factory Pattern: Message and session creation
 * - Observer Pattern: Streaming responses via RxJS
 * - Template Method Pattern: Message processing workflow
 *
 * @example
 * ```typescript
 * const result = await chatService.processMessage('Hello', sessionId);
 * result.stream.subscribe(chunk => console.log(chunk));
 * ```
 */
@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  /** In-memory session storage (Repository pattern) */
  private readonly sessions = new Map<string, ChatSession>();

  /** Service configuration */
  private readonly config: ChatServiceConfig;

  /**
   * Creates a new ChatService instance
   *
   * @param {AIService} aiService - AI service for generating responses
   */
  constructor(private readonly aiService: AIService) {
    this.config = {
      maxContextMessages: 10,
      maxSessionAgeMinutes: 60,
    };

    this.logger.log(
      `Chat Service initialized: ` +
        `maxContext=${this.config.maxContextMessages}, ` +
        `maxAge=${this.config.maxSessionAgeMinutes}min`,
    );
  }

  /**
   * Processes a user message and generates an AI response
   *
   * This method:
   * 1. Creates or retrieves the session
   * 2. Adds the user message to the session
   * 3. Prepares conversation context
   * 4. Streams AI response
   * 5. Saves complete assistant message
   *
   * @param {string} messageContent - The user's message text
   * @param {string} [sessionId] - Optional session ID (creates new if not provided)
   * @returns {Promise<ProcessedMessage>} Object containing message ID and response stream
   * @throws {MessageProcessingException} When message processing fails
   *
   * @example
   * ```typescript
   * const { messageId, stream, sessionId } = await chatService.processMessage(
   *   'What is the weather?',
   *   'session-123'
   * );
   *
   * stream.subscribe({
   *   next: (chunk) => console.log(chunk),
   *   complete: () => console.log('Response complete')
   * });
   * ```
   */
  async processMessage(
    messageContent: string,
    sessionId?: string,
  ): Promise<ProcessedMessage> {
    try {
      // Create or retrieve session
      const actualSessionId = sessionId || this.createSession();
      const session = this.getOrCreateSession(actualSessionId);

      // Create and add user message
      const userMessage = this.createMessage(
        MessageRole.USER,
        messageContent,
        actualSessionId,
      );
      session.messages.push(userMessage);

      this.logger.log(
        `User message added to session ${actualSessionId} (${session.messages.length} total messages)`,
      );

      // Prepare context with recent messages
      const context = this.buildConversationContext(session);

      // Generate streaming response
      const stream = new Subject<string>();
      let assistantContent = '';
      const assistantMessageId = randomUUID();

      // Subscribe to AI stream
      this.aiService.streamCompletion(context).subscribe({
        next: (chunk: string) => {
          assistantContent += chunk;
          stream.next(chunk);
        },
        error: (error: Error) => {
          this.logger.error(
            `AI streaming error for session ${actualSessionId}: ${error.message}`,
          );
          stream.error(
            new MessageProcessingException(
              'Failed to generate AI response',
              error,
            ),
          );
        },
        complete: () => {
          // Save complete assistant message
          const assistantMessage = this.createMessage(
            MessageRole.ASSISTANT,
            assistantContent,
            actualSessionId,
            assistantMessageId,
          );
          session.messages.push(assistantMessage);
          session.updatedAt = new Date();

          this.logger.log(
            `Assistant message completed for session ${actualSessionId} ` +
              `(${assistantContent.length} characters)`,
          );
          stream.complete();
        },
      });

      return {
        messageId: assistantMessageId,
        stream: stream.asObservable(),
        sessionId: actualSessionId,
      };
    } catch (error) {
      this.logger.error(`Message processing failed: ${error.message}`);
      throw new MessageProcessingException('Failed to process message', error);
    }
  }

  /**
   * Creates a new message object (Factory pattern)
   *
   * @private
   * @param {MessageRole} role - Role of the message sender
   * @param {string} content - Message content
   * @param {string} sessionId - Session ID for the message
   * @param {string} [id] - Optional message ID (generates new if not provided)
   * @returns {Message} Created message object
   */
  private createMessage(
    role: MessageRole,
    content: string,
    sessionId: string,
    id?: string,
  ): Message {
    return {
      id: id || randomUUID(),
      role,
      content,
      timestamp: new Date(),
      sessionId,
    };
  }

  /**
   * Creates a new chat session (Factory pattern)
   *
   * @private
   * @returns {string} Generated session ID
   */
  private createSession(): string {
    const sessionId = randomUUID();
    const session: ChatSession = {
      id: sessionId,
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.sessions.set(sessionId, session);
    this.logger.log(`New session created: ${sessionId}`);
    return sessionId;
  }

  /**
   * Retrieves an existing session or creates a new one
   *
   * @private
   * @param {string} sessionId - Session ID to retrieve or create
   * @returns {ChatSession} The session object
   */
  private getOrCreateSession(sessionId: string): ChatSession {
    if (!this.sessions.has(sessionId)) {
      const session: ChatSession = {
        id: sessionId,
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.sessions.set(sessionId, session);
      this.logger.log(`Session created: ${sessionId}`);
    }
    return this.sessions.get(sessionId)!;
  }

  /**
   * Builds conversation context from session messages
   *
   * Includes:
   * - System prompt (always first)
   * - Last N messages based on configuration
   *
   * @private
   * @param {ChatSession} session - Session to build context from
   * @returns {Message[]} Array of messages for context
   */
  private buildConversationContext(session: ChatSession): Message[] {
    // Get recent messages for context
    const recentMessages = session.messages.slice(
      -this.config.maxContextMessages,
    );

    // Ensure system message is included
    const hasSystemMessage =
      recentMessages.length > 0 &&
      recentMessages[0].role === MessageRole.SYSTEM;

    if (!hasSystemMessage) {
      const systemMessage = this.createMessage(
        MessageRole.SYSTEM,
        this.getSystemPrompt(),
        session.id,
      );
      recentMessages.unshift(systemMessage);
    }

    this.logger.debug(
      `Built context with ${recentMessages.length} messages for session ${session.id}`,
    );

    return recentMessages;
  }

  /**
   * Gets the system prompt for the AI assistant
   *
   * Defines the assistant's role, behavior, and priorities.
   * Can be overridden or made configurable for different use cases.
   *
   * @private
   * @returns {string} System prompt text
   */
  private getSystemPrompt(): string {
    return `You are EstateAssist, a professional AI real estate agent specializing in residential and commercial properties.

Your role is to provide expert guidance on:
- Property valuations and market analysis
- Buying and selling processes
- Rental agreements and tenant relations
- Property investment strategies
- Mortgage and financing options
- Real estate market trends and insights
- Property inspection and maintenance advice
- Legal considerations in real estate transactions

Always prioritize:
1. Accuracy of information and current market data
2. Clear, professional communication
3. Ethical real estate practices
4. Client's best interests and financial well-being
5. Transparency about limitations and regulations

Communication style:
- Be knowledgeable yet approachable
- Explain complex real estate concepts in simple terms
- Provide specific, actionable advice when possible
- Ask clarifying questions to better understand the client's needs
- Acknowledge regional differences in real estate practices

If you don't have specific information about local regulations, market conditions, or pricing, clearly state this and recommend consulting with a licensed local real estate professional or legal advisor.`;
  }

  /**
   * Retrieves a session by ID
   *
   * @param {string} sessionId - Session ID to retrieve
   * @returns {ChatSession | undefined} Session object if found, undefined otherwise
   * @throws {SessionNotFoundException} When session is not found (can be enabled)
   *
   * @example
   * ```typescript
   * const session = chatService.getSession('session-123');
   * if (session) {
   *   console.log(`Found ${session.messages.length} messages`);
   * }
   * ```
   */
  getSession(sessionId: string): ChatSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Gets a session or throws an error if not found
   *
   * @param {string} sessionId - Session ID to retrieve
   * @returns {ChatSession} Session object
   * @throws {SessionNotFoundException} When session is not found
   *
   * @example
   * ```typescript
   * try {
   *   const session = chatService.getSessionOrFail('session-123');
   *   // Use session
   * } catch (error) {
   *   console.error('Session not found');
   * }
   * ```
   */
  getSessionOrFail(sessionId: string): ChatSession {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new SessionNotFoundException(sessionId);
    }
    return session;
  }

  /**
   * Retrieves all active sessions
   *
   * @returns {ChatSession[]} Array of all sessions
   *
   * @example
   * ```typescript
   * const sessions = chatService.getAllSessions();
   * console.log(`Total active sessions: ${sessions.length}`);
   * ```
   */
  getAllSessions(): ChatSession[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Gets the count of active sessions
   *
   * @returns {number} Number of active sessions
   *
   * @example
   * ```typescript
   * const count = chatService.getActiveSessionsCount();
   * console.log(`Active sessions: ${count}`);
   * ```
   */
  getActiveSessionsCount(): number {
    return this.sessions.size;
  }

  /**
   * Deletes a session by ID
   *
   * @param {string} sessionId - Session ID to delete
   * @returns {boolean} True if session was deleted, false if not found
   *
   * @example
   * ```typescript
   * const deleted = chatService.deleteSession('session-123');
   * if (deleted) {
   *   console.log('Session deleted successfully');
   * }
   * ```
   */
  deleteSession(sessionId: string): boolean {
    const deleted = this.sessions.delete(sessionId);
    if (deleted) {
      this.logger.log(`Session deleted: ${sessionId}`);
    }
    return deleted;
  }

  /**
   * Clears sessions older than specified age
   *
   * Useful for automatic cleanup of inactive sessions.
   * Should be called periodically (e.g., via cron job).
   *
   * @param {number} [maxAgeMinutes] - Maximum age in minutes (uses config default if not provided)
   * @returns {number} Number of sessions deleted
   *
   * @example
   * ```typescript
   * // Clear sessions older than 30 minutes
   * const deleted = chatService.clearOldSessions(30);
   * console.log(`Cleaned up ${deleted} old sessions`);
   * ```
   */
  clearOldSessions(
    maxAgeMinutes: number = this.config.maxSessionAgeMinutes,
  ): number {
    const now = Date.now();
    const maxAge = maxAgeMinutes * 60 * 1000;
    let deleted = 0;

    for (const [id, session] of this.sessions.entries()) {
      const sessionAge = now - session.updatedAt.getTime();
      if (sessionAge > maxAge) {
        this.sessions.delete(id);
        deleted++;
        this.logger.debug(
          `Deleted old session ${id} (age: ${Math.floor(sessionAge / 60000)}min)`,
        );
      }
    }

    if (deleted > 0) {
      this.logger.log(
        `Cleared ${deleted} old sessions (max age: ${maxAgeMinutes}min)`,
      );
    }

    return deleted;
  }
}
