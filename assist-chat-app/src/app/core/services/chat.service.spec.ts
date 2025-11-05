import { TestBed } from '@angular/core/testing';
import { ChatService } from './chat.service';
import { WebSocketService } from './websocket.service';
import { of, Subject } from 'rxjs';
import { MessageRole } from '../models/message.model';
import { ConnectionState } from '../models/chat-state.model';

describe('ChatService', () => {
  let service: ChatService;
  let mockWebSocketService: any;
  let mockMessageChunkSubject: Subject<any>;
  let mockErrorSubject: Subject<string>;

  beforeEach(() => {
    mockMessageChunkSubject = new Subject();
    mockErrorSubject = new Subject();

    // Create signal-like mock function
    const connectionStateSignal: any = jest.fn(() => ConnectionState.CONNECTED);

    mockWebSocketService = {
      sendMessage: jest.fn(),
      messageChunk$: mockMessageChunkSubject.asObservable(),
      error$: mockErrorSubject.asObservable(),
      connectionState: connectionStateSignal,
      isConnected: jest.fn(() => true),
    };

    TestBed.configureTestingModule({
      providers: [
        ChatService,
        { provide: WebSocketService, useValue: mockWebSocketService },
      ],
    });

    service = TestBed.inject(ChatService);
  });

  afterEach(() => {
    mockMessageChunkSubject.complete();
    mockErrorSubject.complete();
  });

  describe('initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should initialize with empty messages', () => {
      expect(service.messages()).toEqual([]);
    });

    it('should initialize with loading false', () => {
      expect(service.isLoading()).toBe(false);
    });

    it('should initialize with no error', () => {
      expect(service.error()).toBeNull();
    });

    it('should initialize with no session ID', () => {
      expect(service.sessionId()).toBeNull();
    });
  });

  describe('computed signals', () => {
    it('should compute hasMessages correctly when empty', () => {
      expect(service.hasMessages()).toBe(false);
    });

    it('should compute hasMessages correctly when has messages', () => {
      service.sendMessage('Hello');
      expect(service.hasMessages()).toBe(true);
    });

    it('should compute isStreaming correctly when not streaming', () => {
      expect(service.isStreaming()).toBe(false);
    });

    it('should compute isStreaming correctly when streaming', () => {
      service.sendMessage('Test');
      mockMessageChunkSubject.next({ content: 'chunk', done: false });
      expect(service.isStreaming()).toBe(true);
    });
  });

  describe('sendMessage()', () => {
    it('should add user message and assistant placeholder to messages array', () => {
      const testMessage = 'Hello, assistant!';
      service.sendMessage(testMessage);

      const messages = service.messages();
      expect(messages.length).toBe(2); // User + Assistant placeholder
      expect(messages[0].content).toBe(testMessage);
      expect(messages[0].role).toBe(MessageRole.USER);
      expect(messages[1].role).toBe(MessageRole.ASSISTANT);
      expect(messages[1].content).toBe(''); // Empty placeholder
    });

    it('should set loading state to true', () => {
      service.sendMessage('Test');
      expect(service.isLoading()).toBe(true);
    });

    it('should call webSocketService.sendMessage with correct parameters', () => {
      const testMessage = 'Test message';
      service.sendMessage(testMessage);

      expect(mockWebSocketService.sendMessage).toHaveBeenCalledWith(
        testMessage,
        undefined
      );
    });

    it('should send sessionId as undefined when not available', () => {
      service.sendMessage('Test message');

      expect(mockWebSocketService.sendMessage).toHaveBeenCalledWith(
        'Test message',
        undefined
      );
    });

    it('should send message even when not connected (WebSocket handles connection)', () => {
      mockWebSocketService.isConnected.mockReturnValue(false);

      service.sendMessage('Test');

      // Service still sends the message, WebSocket handles connection issues
      expect(mockWebSocketService.sendMessage).toHaveBeenCalled();
    });

    it('should clear previous error when sending new message', () => {
      // Set an error first
      mockErrorSubject.next('Previous error');

      // Send a new message
      service.sendMessage('New message');

      expect(service.error()).toBeNull();
    });
  });

  describe('message chunk handling', () => {
    beforeEach(() => {
      service.sendMessage('Test question');
    });

    it('should create assistant message placeholder on send', () => {
      const messages = service.messages();
      expect(messages.length).toBe(2); // User + Assistant placeholder
      expect(messages[0].role).toBe(MessageRole.USER);
      expect(messages[1].role).toBe(MessageRole.ASSISTANT);
      expect(messages[1].content).toBe(''); // Empty initially
      expect(messages[1].isStreaming).toBe(true);
    });

    it('should append content on message chunks', () => {
      mockMessageChunkSubject.next({ chunk: 'Hello', isComplete: false });
      mockMessageChunkSubject.next({ chunk: ' World', isComplete: false });

      const messages = service.messages();
      expect(messages[1].content).toBe('Hello World');
    });

    it('should set loading to false when stream is complete', () => {
      mockMessageChunkSubject.next({ chunk: 'Complete', isComplete: true });

      expect(service.isLoading()).toBe(false);
    });

    it('should clear streaming message ID when complete', () => {
      mockMessageChunkSubject.next({ chunk: 'Test', isComplete: false });
      expect(service.isStreaming()).toBe(true);

      mockMessageChunkSubject.next({ chunk: '', isComplete: true });
      expect(service.isStreaming()).toBe(false);
    });

    it('should mark message as not streaming when complete', () => {
      mockMessageChunkSubject.next({ chunk: 'Test', isComplete: false });
      expect(service.messages()[1].isStreaming).toBe(true);

      mockMessageChunkSubject.next({ chunk: '', isComplete: true });
      expect(service.messages()[1].isStreaming).toBe(false);
    });

    it('should handle multiple messages correctly', () => {
      // Complete first message
      mockMessageChunkSubject.next({
        chunk: 'First response',
        isComplete: true,
      });

      // Second message
      service.sendMessage('Second question');
      mockMessageChunkSubject.next({
        chunk: 'Second response',
        isComplete: true,
      });

      const messages = service.messages();
      expect(messages.length).toBe(4); // User1, Assistant1, User2, Assistant2
      expect(messages[0].content).toBe('Test question');
      expect(messages[1].content).toBe('First response');
      expect(messages[2].content).toBe('Second question');
      expect(messages[3].content).toBe('Second response');
    });
  });

  describe('error handling', () => {
    it('should set error signal when error event occurs', () => {
      const errorMessage = 'Connection timeout';
      mockErrorSubject.next(errorMessage);

      expect(service.error()).toBe(errorMessage);
    });

    it('should set loading to false on error', () => {
      service.sendMessage('Test');
      expect(service.isLoading()).toBe(true);

      mockErrorSubject.next('Error occurred');
      expect(service.isLoading()).toBe(false);
    });
  });

  describe('clearMessages()', () => {
    it('should clear all messages', () => {
      service.sendMessage('Test');
      expect(service.messages().length).toBeGreaterThan(0);

      service.clearMessages();
      expect(service.messages()).toEqual([]);
    });

    it('should reset session ID', () => {
      service.clearMessages();
      expect(service.sessionId()).toBeNull();
    });

    it('should clear error', () => {
      mockErrorSubject.next('Error');
      expect(service.error()).not.toBeNull();

      service.clearMessages();
      expect(service.error()).toBeNull();
    });
  });

  describe('signals', () => {
    it('should expose messages signal', () => {
      service.sendMessage('Test');

      const messages = service.messages();
      expect(messages.length).toBeGreaterThan(0);
    });

    it('should expose error signal', () => {
      mockErrorSubject.next('Test error');

      expect(service.error()).toBe('Test error');
    });

    it('should expose connectionState signal', () => {
      expect(service.connectionState()).toBe(ConnectionState.CONNECTED);
    });
  });
});
