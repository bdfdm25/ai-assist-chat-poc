import {
  Component,
  Output,
  EventEmitter,
  Input,
  signal,
  WritableSignal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

/**
 * Placeholder Text Configuration
 * Defines placeholder messages for different input states
 */
interface PlaceholderConfig {
  readonly disabled: string;
  readonly loading: string;
  readonly default: string;
}

/**
 * Default placeholder configuration
 */
const DEFAULT_PLACEHOLDERS: PlaceholderConfig = {
  disabled: 'Connecting...',
  loading: 'AI is thinking...',
  default: 'Type your message... (Shift+Enter for new line)',
};

/**
 * Message Input Component
 *
 * Presentation component that provides a text input interface for users to send
 * chat messages. Handles keyboard shortcuts, input validation, and dynamic
 * placeholder text based on component state.
 *
 * Design Patterns Applied:
 * - Presentation Component Pattern: Emits events, parent handles business logic
 * - Strategy Pattern: Dynamic placeholder text based on state
 * - Command Pattern: Keyboard shortcuts trigger actions
 * - State Pattern: Input behavior changes based on disabled/loading state
 *
 * Responsibilities:
 * - Capture and validate user message input
 * - Handle keyboard shortcuts (Enter to send, Shift+Enter for newline)
 * - Emit message content to parent component
 * - Display context-appropriate placeholder text
 * - Clear input after successful submission
 *
 * Features:
 * - Signal-based reactive message content
 * - Enter key sends message (Shift+Enter for multiline)
 * - Auto-clear after send
 * - Dynamic placeholder based on state
 * - Input validation (no empty messages)
 * - Disabled state handling
 *
 * @example
 * ```html
 * <app-message-input
 *   [disabled]="!isConnected()"
 *   [isLoading]="isLoading()"
 *   (sendMessage)="onSendMessage($event)">
 * </app-message-input>
 * ```
 */
@Component({
  selector: 'app-message-input',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './message-input.component.html',
})
export class MessageInputComponent {
  /**
   * Flag indicating if input should be disabled
   * @input
   */
  @Input() public disabled = false;

  /**
   * Flag indicating if AI is processing a response
   * @input
   */
  @Input() public isLoading = false;

  /**
   * Event emitter for sending message content to parent
   * @output
   */
  @Output() public sendMessage = new EventEmitter<string>();

  /**
   * Signal containing current message input content
   * @private
   */
  public messageContent: WritableSignal<string> = signal('');

  /**
   * Handles form submission for sending messages
   *
   * Validates and processes message input. Trims whitespace, checks for
   * empty content and disabled state, emits message to parent if valid,
   * and clears input after successful submission.
   *
   * @public
   * @returns {void}
   *
   * @example
   * ```html
   * <form (ngSubmit)="onSubmit()">
   *   <textarea [(ngModel)]="messageContent"></textarea>
   * </form>
   * ```
   */
  public onSubmit(): void {
    const content = this.getTrimmedContent();

    if (this.isValidSubmission(content)) {
      this.emitMessage(content);
      this.clearInput();
    }
  }

  /**
   * Gets trimmed message content
   *
   * @private
   * @returns {string} Trimmed message content
   */
  private getTrimmedContent(): string {
    return this.messageContent().trim();
  }

  /**
   * Validates if message can be submitted
   *
   * @private
   * @param {string} content - Trimmed message content
   * @returns {boolean} True if content exists and input is not disabled
   */
  private isValidSubmission(content: string): boolean {
    return content.length > 0 && !this.disabled;
  }

  /**
   * Emits message to parent component
   *
   * @private
   * @param {string} content - Message content to emit
   * @returns {void}
   */
  private emitMessage(content: string): void {
    this.sendMessage.emit(content);
  }

  /**
   * Clears the message input field
   *
   * @private
   * @returns {void}
   */
  private clearInput(): void {
    this.messageContent.set('');
  }

  /**
   * Handles keyboard events for message submission
   *
   * Implements keyboard shortcut: Enter sends message, Shift+Enter allows
   * multiline input. Prevents default Enter behavior when sending.
   *
   * @public
   * @param {KeyboardEvent} event - Keyboard event from input element
   * @returns {void}
   *
   * @example
   * ```html
   * <textarea (keydown)="onKeyDown($event)"></textarea>
   * ```
   */
  public onKeyDown(event: KeyboardEvent): void {
    if (this.isSubmitKeyPressed(event)) {
      event.preventDefault();
      this.onSubmit();
    }
  }

  /**
   * Checks if Enter key was pressed without Shift modifier
   *
   * @private
   * @param {KeyboardEvent} event - Keyboard event to check
   * @returns {boolean} True if Enter without Shift
   */
  private isSubmitKeyPressed(event: KeyboardEvent): boolean {
    return event.key === 'Enter' && !event.shiftKey;
  }

  /**
   * Updates message content signal
   *
   * Called by two-way binding to update signal when user types.
   * Provides explicit signal update method for template binding.
   *
   * @public
   * @param {string} value - New message content value
   * @returns {void}
   *
   * @example
   * ```html
   * <textarea
   *   [value]="messageContent()"
   *   (input)="updateMessage($event.target.value)">
   * </textarea>
   * ```
   */
  public updateMessage(value: string): void {
    this.messageContent.set(value);
  }

  /**
   * Gets context-appropriate placeholder text
   *
   * Implements Strategy pattern by selecting placeholder text based on
   * current component state (disabled, loading, or default). Provides
   * user feedback about input availability.
   *
   * @public
   * @readonly
   * @returns {string} Placeholder text for current state
   *
   * @example
   * ```html
   * <textarea [placeholder]="placeholder"></textarea>
   * <!-- Output: "Connecting..." | "AI is thinking..." | "Type your message..." -->
   * ```
   */
  public get placeholder(): string {
    if (this.disabled) {
      return this.getDisabledPlaceholder();
    }
    if (this.isLoading) {
      return this.getLoadingPlaceholder();
    }
    return this.getDefaultPlaceholder();
  }

  /**
   * Gets placeholder text for disabled state
   *
   * @private
   * @returns {string} Disabled state placeholder
   */
  private getDisabledPlaceholder(): string {
    return DEFAULT_PLACEHOLDERS.disabled;
  }

  /**
   * Gets placeholder text for loading state
   *
   * @private
   * @returns {string} Loading state placeholder
   */
  private getLoadingPlaceholder(): string {
    return DEFAULT_PLACEHOLDERS.loading;
  }

  /**
   * Gets default placeholder text
   *
   * @private
   * @returns {string} Default state placeholder
   */
  private getDefaultPlaceholder(): string {
    return DEFAULT_PLACEHOLDERS.default;
  }
}
