import { computed, Injectable, OnDestroy, signal } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { io, Socket } from 'socket.io-client';

import { environment } from '../../../environments/environment.prod';
import { ConnectionState } from '../models/chat-state.model';
import { MessageChunk } from '../models/message.model';

/**
 * WebSocket Service Configuration Interface
 * Defines configurable parameters for WebSocket connection behavior
 */
interface WebSocketConfig {
  readonly maxReconnectAttempts: number;
  readonly initialReconnectDelay: number;
  readonly connectionTimeout: number;
  readonly transports: readonly string[];
}

/**
 * Default WebSocket Configuration
 * Implements sensible defaults following 12-factor app principles
 */
const DEFAULT_WEBSOCKET_CONFIG: WebSocketConfig = {
  maxReconnectAttempts: 5,
  initialReconnectDelay: 1000,
  connectionTimeout: 10000,
  transports: ['websocket', 'polling'],
};

/**
 * WebSocket Service
 *
 * Manages real-time bidirectional communication with the backend server using Socket.IO.
 * Implements the Observer pattern for event notifications and provides automatic
 * reconnection with exponential backoff strategy.
 *
 * Design Patterns Applied:
 * - Observer Pattern: Event-driven communication via RxJS Subjects
 * - Singleton Pattern: Provided in root with single instance
 * - Strategy Pattern: Configurable reconnection strategy
 * - State Pattern: Connection state management via signals
 *
 * Features:
 * - Automatic connection on service initialization
 * - Exponential backoff reconnection strategy
 * - Connection state tracking via Angular signals
 * - Event streaming via RxJS observables
 * - Graceful error handling and recovery
 *
 * @example
 * ```typescript
 * constructor(private wsService: WebSocketService) {
 *   // Subscribe to message chunks
 *   this.wsService.messageChunk$.subscribe(chunk => {
 *     console.log('Received chunk:', chunk);
 *   });
 *
 *   // Check connection state
 *   if (this.wsService.isConnected()) {
 *     this.wsService.sendMessage('Hello', sessionId);
 *   }
 * }
 * ```
 */
@Injectable({
  providedIn: 'root',
})
export class WebSocketService implements OnDestroy {
  // Connection Configuration
  private readonly config: WebSocketConfig = DEFAULT_WEBSOCKET_CONFIG;

  // Socket Instance
  private socket: Socket | null = null;

  // Reconnection State
  private reconnectAttempts = 0;
  private reconnectTimeoutId: ReturnType<typeof setTimeout> | null = null;

  // Reactive State Management - Private Signals
  private readonly connectionStateSignal = signal<ConnectionState>(
    ConnectionState.DISCONNECTED
  );

  // Reactive State Management - Public Readonly Signals
  /**
   * Current connection state as a readonly signal
   * @readonly
   */
  public readonly connectionState = this.connectionStateSignal.asReadonly();

  // Computed Signals for Derived State
  /**
   * Computed signal indicating if WebSocket is currently connected
   * @readonly
   */
  public readonly isConnected = computed(
    () => this.connectionState() === ConnectionState.CONNECTED
  );

  /**
   * Computed signal indicating if connection is in progress
   * @readonly
   */
  public readonly isConnecting = computed(
    () =>
      this.connectionState() === ConnectionState.CONNECTING ||
      this.connectionState() === ConnectionState.RECONNECTING
  );

  // Event Streams - Private Subjects
  private readonly messageChunkSubject = new Subject<MessageChunk>();
  private readonly errorSubject = new Subject<string>();

  // Event Streams - Public Observables
  /**
   * Observable stream of message chunks received from the server
   * @readonly
   */
  public readonly messageChunk$: Observable<MessageChunk> =
    this.messageChunkSubject.asObservable();

  /**
   * Observable stream of error messages
   * @readonly
   */
  public readonly error$: Observable<string> = this.errorSubject.asObservable();

  /**
   * Initializes the WebSocket service and establishes connection
   *
   * @constructor
   */
  constructor() {
    this.connect();
  }

  /**
   * Establishes WebSocket connection to the server
   *
   * Implements idempotent connection logic - if already connected, the method
   * returns early without creating a duplicate connection. Uses Socket.IO client
   * with configurable transports and manual reconnection handling.
   *
   * Connection Flow:
   * 1. Check if already connected (idempotency)
   * 2. Update connection state to CONNECTING
   * 3. Create Socket.IO instance with configuration
   * 4. Set up event listeners for lifecycle and messages
   *
   * @public
   * @returns {void}
   *
   * @example
   * ```typescript
   * // Manually reconnect after disconnect
   * this.wsService.connect();
   * ```
   */
  public connect(): void {
    if (this.socket?.connected) {
      console.log('WebSocket already connected');
      return;
    }

    this.transitionToConnecting();
    this.createSocketInstance();
    this.setupEventListeners();
  }

  /**
   * Transitions connection state to CONNECTING
   * @private
   */
  private transitionToConnecting(): void {
    this.connectionStateSignal.set(ConnectionState.CONNECTING);
  }

  /**
   * Creates a new Socket.IO instance with configuration
   * @private
   */
  private createSocketInstance(): void {
    this.socket = io(environment.apiUrl, {
      transports: [...this.config.transports],
      reconnection: false, // Manual reconnection control
      timeout: this.config.connectionTimeout,
    });
  }

  /**
   * Sets up event listeners for Socket.IO events
   *
   * Registers handlers for connection lifecycle events (connect, disconnect,
   * connect_error) and message events (message-chunk, error). Implements the
   * Observer pattern by forwarding events to RxJS subjects.
   *
   * Event Handlers:
   * - connect: Successful connection established
   * - disconnect: Connection lost
   * - connect_error: Connection attempt failed
   * - message-chunk: Incoming message data
   * - error: Server-side error messages
   *
   * @private
   * @returns {void}
   */
  private setupEventListeners(): void {
    if (!this.socket) {
      return;
    }

    this.registerConnectionHandlers();
    this.registerMessageHandlers();
  }

  /**
   * Registers connection lifecycle event handlers
   * @private
   */
  private registerConnectionHandlers(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => this.onConnect());
    this.socket.on('disconnect', (reason: string) => this.onDisconnect(reason));
    this.socket.on('connect_error', (error: Error) =>
      this.onConnectionError(error)
    );
  }

  /**
   * Registers message event handlers
   * @private
   */
  private registerMessageHandlers(): void {
    if (!this.socket) return;

    this.socket.on('message-chunk', (data: MessageChunk) =>
      this.onMessageChunk(data)
    );
    this.socket.on('error', (error: { message: string }) =>
      this.onError(error)
    );
  }

  /**
   * Handles successful connection event
   * @private
   */
  private onConnect(): void {
    console.log('✅ WebSocket connected:', this.socket?.id);
    this.connectionStateSignal.set(ConnectionState.CONNECTED);
    this.resetReconnectionState();
  }

  /**
   * Handles disconnection event
   *
   * @private
   * @param {string} reason - Reason for disconnection
   */
  private onDisconnect(reason: string): void {
    console.log('❌ WebSocket disconnected:', reason);
    this.connectionStateSignal.set(ConnectionState.DISCONNECTED);

    if (this.isServerInitiatedDisconnect(reason)) {
      this.initiateReconnection();
    }
  }

  /**
   * Checks if disconnect was initiated by server
   * @private
   */
  private isServerInitiatedDisconnect(reason: string): boolean {
    return reason === 'io server disconnect';
  }

  /**
   * Handles connection error event
   *
   * @private
   * @param {Error} error - Connection error object
   */
  private onConnectionError(error: Error): void {
    console.error('WebSocket connection error:', error);
    this.connectionStateSignal.set(ConnectionState.ERROR);
    this.errorSubject.next(`Connection error: ${error.message}`);
    this.initiateReconnection();
  }

  /**
   * Handles incoming message chunk event
   *
   * @private
   * @param {MessageChunk} data - Message chunk data from server
   */
  private onMessageChunk(data: MessageChunk): void {
    this.messageChunkSubject.next(data);
  }

  /**
   * Handles error event from server
   *
   * @private
   * @param {object} error - Error object with message property
   */
  private onError(error: { message: string }): void {
    console.error('WebSocket error:', error);
    this.errorSubject.next(error.message);
  }

  /**
   * Initiates reconnection attempt with exponential backoff
   *
   * Implements exponential backoff strategy to avoid overwhelming the server
   * with reconnection attempts. After max attempts, transitions to ERROR state.
   *
   * Backoff Formula: delay = initialDelay * 2^(attempt - 1)
   * Example: 1s, 2s, 4s, 8s, 16s
   *
   * @private
   * @returns {void}
   */
  private initiateReconnection(): void {
    if (this.hasExceededMaxReconnectAttempts()) {
      this.handleMaxReconnectAttemptsExceeded();
      return;
    }

    this.incrementReconnectAttempts();
    this.transitionToReconnecting();
    this.scheduleReconnection();
  }

  /**
   * Checks if max reconnection attempts have been exceeded
   * @private
   */
  private hasExceededMaxReconnectAttempts(): boolean {
    return this.reconnectAttempts >= this.config.maxReconnectAttempts;
  }

  /**
   * Handles scenario when max reconnection attempts are exceeded
   * @private
   */
  private handleMaxReconnectAttemptsExceeded(): void {
    console.error('Max reconnection attempts reached');
    this.connectionStateSignal.set(ConnectionState.ERROR);
    this.errorSubject.next('Failed to reconnect to server');
  }

  /**
   * Increments reconnection attempt counter
   * @private
   */
  private incrementReconnectAttempts(): void {
    this.reconnectAttempts++;
  }

  /**
   * Transitions connection state to RECONNECTING
   * @private
   */
  private transitionToReconnecting(): void {
    this.connectionStateSignal.set(ConnectionState.RECONNECTING);
  }

  /**
   * Schedules reconnection attempt with exponential backoff delay
   * @private
   */
  private scheduleReconnection(): void {
    const delay = this.calculateBackoffDelay();
    console.log(
      `Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`
    );

    this.reconnectTimeoutId = setTimeout(() => {
      this.connect();
    }, delay);
  }

  /**
   * Calculates exponential backoff delay
   *
   * @private
   * @returns {number} Delay in milliseconds
   */
  private calculateBackoffDelay(): number {
    return (
      this.config.initialReconnectDelay *
      Math.pow(2, this.reconnectAttempts - 1)
    );
  }

  /**
   * Resets reconnection state after successful connection
   * @private
   */
  private resetReconnectionState(): void {
    this.reconnectAttempts = 0;
    this.clearReconnectionTimeout();
  }

  /**
   * Clears any pending reconnection timeout
   * @private
   */
  private clearReconnectionTimeout(): void {
    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }
  }

  /**
   * Sends a message to the server via WebSocket
   *
   * Validates connection state before sending. If not connected, emits an
   * error event instead of throwing an exception (fail-safe behavior).
   *
   * @public
   * @param {string} message - Message content to send
   * @param {string} [sessionId] - Optional session identifier for message routing
   * @returns {void}
   *
   * @example
   * ```typescript
   * // Send message without session
   * this.wsService.sendMessage('Hello, assistant!');
   *
   * // Send message with session ID
   * this.wsService.sendMessage('Continue conversation', 'session-123');
   * ```
   */
  public sendMessage(message: string, sessionId?: string): void {
    if (!this.isSocketConnected()) {
      this.errorSubject.next('Not connected to server');
      return;
    }

    this.emitMessage(message, sessionId);
  }

  /**
   * Checks if socket is connected
   * @private
   */
  private isSocketConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  /**
   * Emits message through socket
   *
   * @private
   * @param {string} message - Message content
   * @param {string} [sessionId] - Optional session ID
   */
  private emitMessage(message: string, sessionId?: string): void {
    this.socket?.emit('send-message', {
      message,
      sessionId,
    });
  }

  /**
   * Disconnects from WebSocket server
   *
   * Performs graceful shutdown by clearing reconnection attempts and
   * closing the socket connection. Updates connection state to DISCONNECTED.
   *
   * @public
   * @returns {void}
   *
   * @example
   * ```typescript
   * // Disconnect when component is destroyed
   * ngOnDestroy() {
   *   this.wsService.disconnect();
   * }
   * ```
   */
  public disconnect(): void {
    this.clearReconnectionTimeout();
    this.closeSocket();
    this.transitionToDisconnected();
  }

  /**
   * Closes socket connection if exists
   * @private
   */
  private closeSocket(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  /**
   * Transitions connection state to DISCONNECTED
   * @private
   */
  private transitionToDisconnected(): void {
    this.connectionStateSignal.set(ConnectionState.DISCONNECTED);
  }

  /**
   * Angular lifecycle hook for cleanup
   *
   * Called when the service is destroyed. Ensures graceful shutdown of
   * WebSocket connection and cleanup of resources.
   *
   * @public
   * @returns {void}
   */
  public ngOnDestroy(): void {
    this.disconnect();
    this.completeSubjects();
  }

  /**
   * Completes all RxJS subjects to prevent memory leaks
   * @private
   */
  private completeSubjects(): void {
    this.messageChunkSubject.complete();
    this.errorSubject.complete();
  }
}
