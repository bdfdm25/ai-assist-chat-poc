import { computed, Injectable, OnDestroy, signal, Signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { ConnectionState, initialChatState } from '../models/chat-state.model';
import { Message, MessageChunk, MessageRole } from '../models/message.model';
import { WebSocketService } from './websocket.service';

/**
 * Message Factory Interface
 * Defines the contract for creating different types of messages
 */
interface MessageFactory {
  createUserMessage(content: string, sessionId?: string): Message;
  createAssistantMessage(sessionId?: string): Message;
}

/**
 * Chat Service
 *
 * Manages chat state, message flow, and business logic for the chat feature.
 * Serves as a facade over the WebSocket service, providing a clean API for
 * chat operations while handling the complexity of streaming messages and
 * state management.
 *
 * Design Patterns Applied:
 * - Facade Pattern: Simplifies WebSocket interaction for chat operations
 * - Observer Pattern: Reactive state updates via Angular signals
 * - Factory Pattern: Message creation through factory methods
 * - Repository Pattern: Message collection management
 *
 * Responsibilities:
 * - Message state management (CRUD operations)
 * - Streaming message handling
 * - Session management
 * - Error state management
 * - Connection state delegation
 *
 * Features:
 * - Real-time message streaming
 * - Automatic message placeholder creation
 * - Session-based conversation tracking
 * - Optimistic UI updates
 * - Comprehensive error handling
 *
 * @example
 * ```typescript
 * constructor(private chatService: ChatService) {
 *   // Send a message
 *   this.chatService.sendMessage('Hello!');
 *
 *   // Access messages via signals
 *   effect(() => {
 *     console.log('Messages:', this.chatService.messages());
 *     console.log('Loading:', this.chatService.isLoading());
 *   });
 * }
 * ```
 */
@Injectable({
  providedIn: 'root',
})
export class ChatService implements OnDestroy, MessageFactory {
  // Subscriptions Management
  private readonly subscriptions = new Subscription();

  // State Management - Private Writable Signals
  private readonly messagesSignal = signal<Message[]>(
    initialChatState.messages
  );
  private readonly isLoadingSignal = signal<boolean>(
    initialChatState.isLoading
  );
  private readonly errorSignal = signal<string | null>(initialChatState.error);
  private readonly sessionIdSignal = signal<string | null>(
    initialChatState.sessionId
  );
  private readonly streamingMessageIdSignal = signal<string | null>(null);

  // State Management - Public Readonly Signals
  /**
   * Array of all messages in the conversation
   * @readonly
   */
  public readonly messages = this.messagesSignal.asReadonly();

  /**
   * Loading state indicator (true when waiting for response)
   * @readonly
   */
  public readonly isLoading = this.isLoadingSignal.asReadonly();

  /**
   * Current error message if any error occurred
   * @readonly
   */
  public readonly error = this.errorSignal.asReadonly();

  /**
   * Current session identifier for conversation continuity
   * @readonly
   */
  public readonly sessionId = this.sessionIdSignal.asReadonly();

  /**
   * WebSocket connection state (delegated from WebSocketService)
   * @readonly
   */
  public readonly connectionState: Signal<ConnectionState>;

  // Computed Signals - Derived State
  /**
   * Indicates whether there are any messages in the conversation
   * @readonly
   */
  public readonly hasMessages = computed(() => this.messages().length > 0);

  /**
   * Returns the most recent message in the conversation, or null if empty
   * @readonly
   */
  public readonly lastMessage = computed(() => {
    const msgs = this.messages();
    return msgs.length > 0 ? msgs[msgs.length - 1] : null;
  });

  /**
   * Indicates whether a message is currently being streamed
   * @readonly
   */
  public readonly isStreaming = computed(
    () => this.streamingMessageIdSignal() !== null
  );

  /**
   * Initializes the chat service and sets up event subscriptions
   *
   * @constructor
   * @param {WebSocketService} wsService - WebSocket service for real-time communication
   */
  constructor(private readonly wsService: WebSocketService) {
    this.connectionState = this.wsService.connectionState;
    this.initializeEventHandlers();
  }

  /**
   * Initializes event handlers for WebSocket events
   *
   * Sets up subscriptions for message chunks and errors from the WebSocket
   * service. All subscriptions are tracked for proper cleanup.
   *
   * @private
   * @returns {void}
   */
  private initializeEventHandlers(): void {
    this.subscribeToMessageChunks();
    this.subscribeToErrors();
  }

  /**
   * Subscribes to incoming message chunks from WebSocket
   * @private
   */
  private subscribeToMessageChunks(): void {
    const messageSubscription = this.wsService.messageChunk$.subscribe(
      (chunk: MessageChunk) => this.handleMessageChunk(chunk)
    );
    this.subscriptions.add(messageSubscription);
  }

  /**
   * Subscribes to error events from WebSocket
   * @private
   */
  private subscribeToErrors(): void {
    const errorSubscription = this.wsService.error$.subscribe((error: string) =>
      this.handleError(error)
    );
    this.subscriptions.add(errorSubscription);
  }

  /**
   * Handles incoming error from WebSocket
   *
   * @private
   * @param {string} error - Error message from WebSocket
   */
  private handleError(error: string): void {
    this.errorSignal.set(error);
    this.isLoadingSignal.set(false);
  }

  /**
   * Sends a user message and initiates AI response
   *
   * Implements optimistic UI update pattern by immediately adding the user
   * message to the state and creating a placeholder for the assistant's
   * response. The actual response will be streamed in real-time through
   * WebSocket message chunks.
   *
   * Flow:
   * 1. Validate message content
   * 2. Clear any previous errors
   * 3. Create and add user message
   * 4. Create assistant message placeholder
   * 5. Update loading state
   * 6. Send message via WebSocket
   *
   * @public
   * @param {string} content - Message content to send
   * @returns {void}
   *
   * @example
   * ```typescript
   * // Send a simple message
   * this.chatService.sendMessage('What is the average home price?');
   *
   * // Empty or whitespace-only messages are ignored
   * this.chatService.sendMessage('   '); // No effect
   * ```
   */
  public sendMessage(content: string): void {
    if (this.isMessageEmpty(content)) {
      return;
    }

    this.prepareForNewMessage();
    this.addUserMessage(content);
    this.addAssistantPlaceholder();
    this.transmitMessage(content);
  }

  /**
   * Checks if message content is empty or whitespace
   * @private
   */
  private isMessageEmpty(content: string): boolean {
    return !content.trim();
  }

  /**
   * Prepares state for new message by clearing errors
   * @private
   */
  private prepareForNewMessage(): void {
    this.errorSignal.set(null);
  }

  /**
   * Adds user message to the conversation
   * @private
   * @param {string} content - Message content
   */
  private addUserMessage(content: string): void {
    const userMessage = this.createUserMessage(content.trim());
    this.appendMessage(userMessage);
  }

  /**
   * Creates a user message instance (Factory Method)
   *
   * Implements the Factory pattern for consistent message creation with
   * proper initialization of all required fields.
   *
   * @public
   * @param {string} content - Message content
   * @param {string} [sessionId] - Optional session ID (uses current if not provided)
   * @returns {Message} Newly created user message
   */
  public createUserMessage(content: string, sessionId?: string): Message {
    return {
      id: this.generateUniqueId(),
      role: MessageRole.USER,
      content,
      timestamp: new Date(),
      sessionId: sessionId ?? this.sessionId() ?? undefined,
    };
  }

  /**
   * Creates an assistant message placeholder (Factory Method)
   *
   * Creates an empty message that will be populated as chunks arrive.
   * Marked as streaming to indicate it's being actively updated.
   *
   * @public
   * @param {string} [sessionId] - Optional session ID (uses current if not provided)
   * @returns {Message} Newly created assistant message placeholder
   */
  public createAssistantMessage(sessionId?: string): Message {
    return {
      id: this.generateUniqueId(),
      role: MessageRole.ASSISTANT,
      content: '',
      timestamp: new Date(),
      isStreaming: true,
      sessionId: sessionId ?? this.sessionId() ?? undefined,
    };
  }

  /**
   * Appends a message to the conversation
   * @private
   * @param {Message} message - Message to append
   */
  private appendMessage(message: Message): void {
    this.messagesSignal.update((messages) => [...messages, message]);
  }

  /**
   * Adds assistant message placeholder and updates state
   * @private
   */
  private addAssistantPlaceholder(): void {
    const assistantMessage = this.createAssistantMessage();
    this.appendMessage(assistantMessage);
    this.streamingMessageIdSignal.set(assistantMessage.id);
    this.isLoadingSignal.set(true);
  }

  /**
   * Transmits message through WebSocket
   * @private
   * @param {string} content - Message content to transmit
   */
  private transmitMessage(content: string): void {
    this.wsService.sendMessage(content, this.sessionId() ?? undefined);
  }

  /**
   * Handles incoming message chunks from the server
   *
   * Processes streaming message chunks by updating the corresponding
   * assistant message in real-time. Implements incremental content
   * update for smooth user experience.
   *
   * Chunk Processing:
   * 1. Validate streaming message exists
   * 2. Find and update the message with new content
   * 3. Update streaming status based on completion
   * 4. Clear loading state when complete
   *
   * @private
   * @param {MessageChunk} chunk - Incoming message chunk from server
   * @returns {void}
   */
  private handleMessageChunk(chunk: MessageChunk): void {
    const streamingId = this.streamingMessageIdSignal();

    if (!this.isValidStreamingMessage(streamingId)) {
      this.logInvalidChunk();
      return;
    }

    this.updateStreamingMessage(streamingId!, chunk);

    if (chunk.isComplete) {
      this.finalizeStreamingMessage();
    }
  }

  /**
   * Validates if there's an active streaming message
   * @private
   */
  private isValidStreamingMessage(streamingId: string | null): boolean {
    return streamingId !== null;
  }

  /**
   * Logs warning when chunk received without active streaming message
   * @private
   */
  private logInvalidChunk(): void {
    console.warn('Received chunk but no streaming message ID');
  }

  /**
   * Updates the streaming message with new content
   *
   * @private
   * @param {string} streamingId - ID of the streaming message
   * @param {MessageChunk} chunk - Chunk data to append
   */
  private updateStreamingMessage(
    streamingId: string,
    chunk: MessageChunk
  ): void {
    this.messagesSignal.update((messages) =>
      messages.map((msg) =>
        msg.id === streamingId ? this.appendChunkToMessage(msg, chunk) : msg
      )
    );
  }

  /**
   * Appends chunk content to message
   *
   * @private
   * @param {Message} message - Message to update
   * @param {MessageChunk} chunk - Chunk to append
   * @returns {Message} Updated message
   */
  private appendChunkToMessage(message: Message, chunk: MessageChunk): Message {
    return {
      ...message,
      content: message.content + chunk.chunk,
      isStreaming: !chunk.isComplete,
    };
  }

  /**
   * Finalizes streaming message when complete
   * @private
   */
  private finalizeStreamingMessage(): void {
    this.streamingMessageIdSignal.set(null);
    this.isLoadingSignal.set(false);
  }

  /**
   * Clears all messages and resets chat state
   *
   * Performs a complete reset of the chat session, including messages,
   * session ID, and any error states. Useful for starting a new conversation.
   *
   * @public
   * @returns {void}
   *
   * @example
   * ```typescript
   * // Clear chat history
   * this.chatService.clearMessages();
   * ```
   */
  public clearMessages(): void {
    this.messagesSignal.set([]);
    this.sessionIdSignal.set(null);
    this.errorSignal.set(null);
  }

  /**
   * Clears the current error state
   *
   * Allows users to dismiss error messages without affecting other state.
   *
   * @public
   * @returns {void}
   *
   * @example
   * ```typescript
   * // Dismiss error notification
   * this.chatService.clearError();
   * ```
   */
  public clearError(): void {
    this.errorSignal.set(null);
  }

  /**
   * Generates a unique identifier for messages
   *
   * Creates a collision-resistant ID using timestamp and random string.
   * Format: {timestamp}-{random-alphanumeric}
   *
   * @private
   * @returns {string} Unique identifier
   *
   * @example
   * ```typescript
   * // Example output: "1699132800000-k3j4h5g6f"
   * const id = this.generateUniqueId();
   * ```
   */
  private generateUniqueId(): string {
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 11);
    return `${timestamp}-${randomSuffix}`;
  }

  /**
   * Angular lifecycle hook for cleanup
   *
   * Called when the service is destroyed. Unsubscribes from all
   * WebSocket event streams to prevent memory leaks.
   *
   * @public
   * @returns {void}
   */
  public ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }
}
