import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Message, MessageRole } from '../../../../core/models/message.model';

/**
 * Time Formatting Configuration
 * Defines options for time display formatting
 */
interface TimeFormatConfig {
  readonly hour: '2-digit' | 'numeric';
  readonly minute: '2-digit' | 'numeric';
}

/**
 * Default time format configuration
 */
const DEFAULT_TIME_FORMAT: TimeFormatConfig = {
  hour: '2-digit',
  minute: '2-digit',
};

/**
 * Message Item Component
 *
 * Presentation component responsible for rendering a single chat message
 * with appropriate styling and metadata based on message role (user or assistant).
 *
 * Design Patterns Applied:
 * - Presentation Component Pattern: Pure display logic with input-based data
 * - Strategy Pattern: Different rendering based on message role
 * - Decorator Pattern: Adds formatted timestamp to message data
 *
 * Responsibilities:
 * - Render message content with role-appropriate styling
 * - Display formatted timestamp
 * - Provide role-checking utilities for template
 * - Expose MessageRole enum for template usage
 *
 * Features:
 * - Role-based message styling (user vs assistant)
 * - Localized time formatting
 * - Computed properties for role checking
 * - Clean separation of display logic
 *
 * @example
 * ```html
 * <app-message-item [message]="message"></app-message-item>
 * ```
 */
@Component({
  selector: 'app-message-item',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './message-item.component.html',
})
export class MessageItemComponent {
  /**
   * Message object to display
   * @input
   * @required
   */
  @Input() public message!: Message;

  /**
   * MessageRole enum exposed for template usage
   * Allows template to access MessageRole.USER and MessageRole.ASSISTANT
   * @readonly
   */
  public readonly MessageRole = MessageRole;

  /**
   * Checks if message is from user
   *
   * Utility getter for template to determine if message should be
   * styled and positioned as a user message.
   *
   * @public
   * @readonly
   * @returns {boolean} True if message role is USER
   *
   * @example
   * ```html
   * <div [ngClass]="{'user-message': isUser}">
   *   {{ message.content }}
   * </div>
   * ```
   */
  public get isUser(): boolean {
    return this.checkIfUserMessage();
  }

  /**
   * Determines if message role is USER
   *
   * @private
   * @returns {boolean} True if message is from user
   */
  private checkIfUserMessage(): boolean {
    return this.message.role === MessageRole.USER;
  }

  /**
   * Checks if message is from assistant
   *
   * Utility getter for template to determine if message should be
   * styled and positioned as an assistant message.
   *
   * @public
   * @readonly
   * @returns {boolean} True if message role is ASSISTANT
   *
   * @example
   * ```html
   * <div [ngClass]="{'assistant-message': isAssistant}">
   *   {{ message.content }}
   * </div>
   * ```
   */
  public get isAssistant(): boolean {
    return this.checkIfAssistantMessage();
  }

  /**
   * Determines if message role is ASSISTANT
   *
   * @private
   * @returns {boolean} True if message is from assistant
   */
  private checkIfAssistantMessage(): boolean {
    return this.message.role === MessageRole.ASSISTANT;
  }

  /**
   * Gets formatted time string from message timestamp
   *
   * Converts message timestamp to localized time string in 12-hour format
   * with 2-digit hours and minutes. Provides consistent time display across
   * all messages.
   *
   * @public
   * @readonly
   * @returns {string} Formatted time string (e.g., "02:45 PM")
   *
   * @example
   * ```html
   * <span class="timestamp">{{ formattedTime }}</span>
   * <!-- Output: "02:45 PM" -->
   * ```
   */
  public get formattedTime(): string {
    return this.formatMessageTimestamp();
  }

  /**
   * Formats message timestamp to locale time string
   *
   * @private
   * @returns {string} Localized time string
   */
  private formatMessageTimestamp(): string {
    const date = this.createDateFromTimestamp();
    return this.formatTimeString(date);
  }

  /**
   * Creates Date object from message timestamp
   *
   * @private
   * @returns {Date} Date object representing message timestamp
   */
  private createDateFromTimestamp(): Date {
    return new Date(this.message.timestamp);
  }

  /**
   * Formats Date object to locale time string
   *
   * @private
   * @param {Date} date - Date object to format
   * @returns {string} Formatted time string
   */
  private formatTimeString(date: Date): string {
    return date.toLocaleTimeString('en-US', DEFAULT_TIME_FORMAT);
  }
}
