import { Component, effect, Signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatService } from '../../core/services/chat.service';
import { MessageListComponent } from './components/message-list/message-list.component';
import { MessageInputComponent } from './components/message-input/message-input.component';
import { ConnectionState } from '../../core/models/chat-state.model';
import { Message } from '../../core/models/message.model';

/**
 * Connection Status Configuration
 * Maps connection states to user-friendly display text
 */
interface ConnectionStatusConfig {
  readonly text: string;
  readonly cssClass: string;
}

/**
 * Connection Status Mapper
 * Strategy pattern implementation for connection status display
 */
const CONNECTION_STATUS_MAP: Record<ConnectionState, ConnectionStatusConfig> = {
  [ConnectionState.CONNECTED]: {
    text: 'Connected',
    cssClass: 'status-connected',
  },
  [ConnectionState.CONNECTING]: {
    text: 'Connecting...',
    cssClass: 'status-connecting',
  },
  [ConnectionState.RECONNECTING]: {
    text: 'Reconnecting...',
    cssClass: 'status-connecting',
  },
  [ConnectionState.DISCONNECTED]: {
    text: 'Disconnected',
    cssClass: 'status-error',
  },
  [ConnectionState.ERROR]: {
    text: 'Connection Error',
    cssClass: 'status-error',
  },
};

/**
 * Chat Component
 *
 * Main container component for the chat feature. Serves as a presentation layer
 * that delegates business logic to the ChatService while managing user interactions
 * and displaying chat state.
 *
 * Design Patterns Applied:
 * - Container/Presenter Pattern: Acts as smart container managing data flow
 * - Facade Pattern: Simplifies ChatService API for child components
 * - Strategy Pattern: Connection status display logic
 * - Delegation Pattern: Delegates all business logic to ChatService
 *
 * Responsibilities:
 * - Coordinate child components (MessageList, MessageInput)
 * - Handle user interactions (send, clear, error dismissal)
 * - Display connection status
 * - Expose chat state via signals
 *
 * Features:
 * - Real-time message display
 * - Connection status indicator
 * - Error notifications with dismissal
 * - Clear chat confirmation dialog
 * - Reactive UI updates via signals
 *
 * @example
 * ```html
 * <app-chat></app-chat>
 * ```
 */
@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, MessageListComponent, MessageInputComponent],
  templateUrl: './chat.component.html',
})
export class ChatComponent {
  // Public Signals - Exposed to Template
  /**
   * Signal containing all messages in the conversation
   * @readonly
   */
  public readonly messages: Signal<Message[]>;

  /**
   * Signal indicating if a response is being loaded
   * @readonly
   */
  public readonly isLoading: Signal<boolean>;

  /**
   * Signal containing current error message if any
   * @readonly
   */
  public readonly error: Signal<string | null>;

  /**
   * Signal containing WebSocket connection state
   * @readonly
   */
  public readonly connectionState: Signal<ConnectionState>;

  /**
   * Signal indicating if there are any messages
   * @readonly
   */
  public readonly hasMessages: Signal<boolean>;

  /**
   * ConnectionState enum exposed for template usage
   * @readonly
   */
  public readonly ConnectionState = ConnectionState;

  /**
   * Initializes the chat component and sets up signal bindings
   *
   * Establishes reactive data flow by binding component signals to
   * ChatService signals. Sets up effect for debugging message changes.
   *
   * @constructor
   * @param {ChatService} chatService - Injected chat service for business logic
   */
  constructor(public readonly chatService: ChatService) {
    this.messages = this.chatService.messages;
    this.isLoading = this.chatService.isLoading;
    this.error = this.chatService.error;
    this.connectionState = this.chatService.connectionState;
    this.hasMessages = this.chatService.hasMessages;

    this.setupDebugLogging();
  }

  /**
   * Sets up effect for debugging message changes in development
   * @private
   */
  private setupDebugLogging(): void {
    effect(() => {
      console.log('Messages updated:', this.messages().length);
    });
  }

  /**
   * Handles message send event from MessageInputComponent
   *
   * Event handler that delegates message sending to the ChatService.
   * Triggered when user submits a message through the input component.
   *
   * @public
   * @param {string} content - Message content entered by user
   * @returns {void}
   *
   * @example
   * ```html
   * <app-message-input (sendMessage)="onSendMessage($event)">
   * </app-message-input>
   * ```
   */
  public onSendMessage(content: string): void {
    this.chatService.sendMessage(content);
  }

  /**
   * Handles clear chat action with user confirmation
   *
   * Displays confirmation dialog before clearing all messages to prevent
   * accidental data loss. Implements defensive UX pattern.
   *
   * @public
   * @returns {void}
   *
   * @example
   * ```html
   * <button (click)="onClearChat()">Clear Chat</button>
   * ```
   */
  public onClearChat(): void {
    if (this.confirmClearAction()) {
      this.chatService.clearMessages();
    }
  }

  /**
   * Displays confirmation dialog for clear action
   *
   * @private
   * @returns {boolean} True if user confirmed, false otherwise
   */
  private confirmClearAction(): boolean {
    return confirm('Are you sure you want to clear all messages?');
  }

  /**
   * Handles error dismissal action
   *
   * Allows users to manually dismiss error notifications, improving UX by
   * giving users control over the error display state.
   *
   * @public
   * @returns {void}
   *
   * @example
   * ```html
   * <button (click)="onDismissError()">Dismiss</button>
   * ```
   */
  public onDismissError(): void {
    this.chatService.clearError();
  }

  /**
   * Gets human-readable connection status text
   *
   * Implements Strategy pattern by looking up display text from configuration
   * map based on current connection state. Provides consistent status messages.
   *
   * @public
   * @readonly
   * @returns {string} User-friendly connection status text
   *
   * @example
   * ```html
   * <span>{{ connectionStatusText }}</span>
   * <!-- Output: "Connected" | "Connecting..." | "Reconnecting..." | etc. -->
   * ```
   */
  public get connectionStatusText(): string {
    const state = this.connectionState();
    return this.getConnectionStatusConfig(state).text;
  }

  /**
   * Gets CSS class for connection status styling
   *
   * Implements Strategy pattern for dynamic styling based on connection state.
   * Returns appropriate CSS class for visual feedback.
   *
   * @public
   * @readonly
   * @returns {string} CSS class name for connection status
   *
   * @example
   * ```html
   * <div [ngClass]="connectionStatusClass">Status</div>
   * <!-- Class: "status-connected" | "status-connecting" | "status-error" -->
   * ```
   */
  public get connectionStatusClass(): string {
    const state = this.connectionState();
    return this.getConnectionStatusConfig(state).cssClass;
  }

  /**
   * Retrieves connection status configuration for given state
   *
   * @private
   * @param {ConnectionState} state - Current connection state
   * @returns {ConnectionStatusConfig} Configuration object with text and CSS class
   */
  private getConnectionStatusConfig(
    state: ConnectionState
  ): ConnectionStatusConfig {
    return (
      CONNECTION_STATUS_MAP[state] ?? {
        text: 'Unknown',
        cssClass: '',
      }
    );
  }
}
