import { CommonModule } from '@angular/common';
import {
  AfterViewChecked,
  Component,
  effect,
  ElementRef,
  Input,
  ViewChild,
} from '@angular/core';
import { Message } from '../../../../core/models/message.model';
import { MessageItemComponent } from '../message-item/message-item.component';

/**
 * Message List Component
 *
 * Presentation component responsible for displaying a scrollable list of chat messages
 * and automatically scrolling to the newest message when messages are added.
 *
 * Design Patterns Applied:
 * - Presentation Component Pattern: Pure display logic with input-based data
 * - Observer Pattern: Uses Angular effects to react to message changes
 * - TrackBy Pattern: Optimizes *ngFor rendering with trackBy function
 *
 * Responsibilities:
 * - Render list of messages using MessageItemComponent
 * - Auto-scroll to bottom when new messages arrive
 * - Optimize rendering performance with trackBy
 * - Handle scroll errors gracefully
 *
 * Features:
 * - Automatic scroll-to-bottom on new messages
 * - Efficient list rendering with trackBy
 * - Graceful error handling for scroll operations
 * - Responsive message container
 *
 * @example
 * ```html
 * <app-message-list [messages]="messages()"></app-message-list>
 * ```
 */
@Component({
  selector: 'app-message-list',
  standalone: true,
  imports: [CommonModule, MessageItemComponent],
  templateUrl: './message-list.component.html',
})
export class MessageListComponent implements AfterViewChecked {
  /**
   * Array of messages to display
   * @input
   */
  @Input() public messages: Message[] = [];

  /**
   * Reference to scrollable message container element
   * @private
   */
  @ViewChild('messageContainer') private messageContainer?: ElementRef;

  /**
   * Flag indicating if component should scroll on next view check
   * @private
   */
  private shouldScroll = true;

  /**
   * Initializes the message list component and sets up auto-scroll behavior
   *
   * Creates an effect that monitors message array changes and triggers
   * auto-scroll when new messages are detected.
   *
   * @constructor
   */
  constructor() {
    this.setupAutoScrollEffect();
  }

  /**
   * Sets up effect to trigger scroll when messages change
   *
   * Uses Angular effect to reactively detect when messages array is updated,
   * setting scroll flag when messages are present.
   *
   * @private
   * @returns {void}
   */
  private setupAutoScrollEffect(): void {
    effect(() => {
      if (this.hasMessages()) {
        this.shouldScroll = true;
      }
    });
  }

  /**
   * Checks if there are any messages to display
   *
   * @private
   * @returns {boolean} True if messages array is not empty
   */
  private hasMessages(): boolean {
    return this.messages.length > 0;
  }

  /**
   * Lifecycle hook called after Angular checks component's views
   *
   * Implements AfterViewChecked to perform scroll operation after view
   * has been updated with new messages. Ensures DOM is ready before scrolling.
   *
   * @public
   * @returns {void}
   */
  public ngAfterViewChecked(): void {
    if (this.shouldPerformScroll()) {
      this.executeScroll();
      this.disableScrollFlag();
    }
  }

  /**
   * Checks if scroll operation should be performed
   *
   * @private
   * @returns {boolean} True if scroll flag is set
   */
  private shouldPerformScroll(): boolean {
    return this.shouldScroll;
  }

  /**
   * Executes the scroll operation
   *
   * @private
   * @returns {void}
   */
  private executeScroll(): void {
    this.scrollToBottom();
  }

  /**
   * Disables the scroll flag after scroll is performed
   *
   * @private
   * @returns {void}
   */
  private disableScrollFlag(): void {
    this.shouldScroll = false;
  }

  /**
   * Scrolls message container to bottom to show newest message
   *
   * Performs scroll operation with error handling to gracefully handle
   * cases where container element is not available or scroll fails.
   *
   * @private
   * @returns {void}
   */
  private scrollToBottom(): void {
    if (this.isContainerAvailable()) {
      this.performScrollOperation();
    }
  }

  /**
   * Checks if message container element is available
   *
   * @private
   * @returns {boolean} True if messageContainer ViewChild is defined
   */
  private isContainerAvailable(): boolean {
    return this.messageContainer !== undefined;
  }

  /**
   * Performs the actual scroll operation with error handling
   *
   * Sets the scrollTop property to scrollHeight to scroll to bottom.
   * Wraps operation in try-catch for graceful error handling.
   *
   * @private
   * @returns {void}
   */
  private performScrollOperation(): void {
    try {
      this.setContainerScrollToBottom();
    } catch (err) {
      this.handleScrollError(err);
    }
  }

  /**
   * Sets container scroll position to bottom
   *
   * @private
   * @returns {void}
   */
  private setContainerScrollToBottom(): void {
    if (this.messageContainer) {
      this.messageContainer.nativeElement.scrollTop =
        this.messageContainer.nativeElement.scrollHeight;
    }
  }

  /**
   * Handles errors during scroll operation
   *
   * @private
   * @param {unknown} err - Error object from scroll operation
   * @returns {void}
   */
  private handleScrollError(err: unknown): void {
    console.error('Error scrolling to bottom:', err);
  }

  /**
   * TrackBy function for *ngFor optimization
   *
   * Provides unique identifier for each message to help Angular
   * efficiently track and update list items. Improves rendering
   * performance by avoiding unnecessary DOM manipulations.
   *
   * @public
   * @param {number} index - Index of item in array (unused)
   * @param {Message} message - Message object to track
   * @returns {string} Unique message ID
   *
   * @example
   * ```html
   * <div *ngFor="let msg of messages; trackBy: trackByMessageId">
   *   <app-message-item [message]="msg"></app-message-item>
   * </div>
   * ```
   */
  public trackByMessageId(index: number, message: Message): string {
    return message.id;
  }
}
