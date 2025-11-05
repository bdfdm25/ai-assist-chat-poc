import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { WebSocketService } from './websocket.service';
import { Socket } from 'socket.io-client';
import { ConnectionState } from '../models/chat-state.model';

// Mock environment
jest.mock('../../../environments/environment.prod', () => ({
  environment: {
    apiUrl: 'http://localhost:3000',
  },
}));

// Mock socket.io-client
jest.mock('socket.io-client', () => ({
  io: jest.fn(),
}));

describe('WebSocketService', () => {
  let service: WebSocketService;
  let mockSocket: Partial<Socket>;
  let mockIo: jest.Mock;

  beforeEach(() => {
    // Create mock socket instance
    mockSocket = {
      connected: false,
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn(),
      disconnect: jest.fn(),
      connect: jest.fn(() => mockSocket as Socket),
    };

    // Mock io function
    mockIo = require('socket.io-client').io as jest.Mock;
    mockIo.mockReturnValue(mockSocket);

    TestBed.configureTestingModule({
      providers: [WebSocketService],
    });

    service = TestBed.inject(WebSocketService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  describe('initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should auto-connect on initialization', () => {
      // Service connects automatically in constructor
      expect(service.connectionState()).toBe(ConnectionState.CONNECTING);
      expect(mockIo).toHaveBeenCalled();
    });

    it('should have messageChunk$ observable', () => {
      expect(service.messageChunk$).toBeDefined();
      expect(typeof service.messageChunk$.subscribe).toBe('function');
    });

    it('should have error$ observable', () => {
      expect(service.error$).toBeDefined();
      expect(typeof service.error$.subscribe).toBe('function');
    });
  });

  describe('connect()', () => {
    it('should create socket connection with correct URL', () => {
      service.connect();

      expect(mockIo).toHaveBeenCalledWith('http://localhost:3000', {
        transports: ['websocket', 'polling'],
        reconnection: false,
        timeout: 10000,
      });
    });

    it('should set connection state to connecting', () => {
      service.connect();

      expect(service.connectionState()).toBe(ConnectionState.CONNECTING);
    });

    it('should register socket event listeners', () => {
      service.connect();

      expect(mockSocket.on).toHaveBeenCalledWith(
        'connect',
        expect.any(Function)
      );
      expect(mockSocket.on).toHaveBeenCalledWith(
        'disconnect',
        expect.any(Function)
      );
      expect(mockSocket.on).toHaveBeenCalledWith(
        'connect_error',
        expect.any(Function)
      );
      expect(mockSocket.on).toHaveBeenCalledWith(
        'message-chunk',
        expect.any(Function)
      );
      expect(mockSocket.on).toHaveBeenCalledWith('error', expect.any(Function));
    });

    it('should not create multiple connections if already connected', () => {
      mockSocket.connected = true;
      service.connect();
      service.connect();

      expect(mockIo).toHaveBeenCalledTimes(1);
    });
  });

  describe('socket events', () => {
    beforeEach(() => {
      service.connect();
    });

    it('should update connection state on connect event', () => {
      const connectCallback = (mockSocket.on as jest.Mock).mock.calls.find(
        (call) => call[0] === 'connect'
      )?.[1];

      connectCallback?.();

      expect(service.connectionState()).toBe(ConnectionState.CONNECTED);
    });

    it('should emit messageChunk on message-chunk event', (done) => {
      const testChunk = { content: 'test message', done: false };
      const messageChunkCallback = (mockSocket.on as jest.Mock).mock.calls.find(
        (call) => call[0] === 'message-chunk'
      )?.[1];

      service.messageChunk$.subscribe((chunk) => {
        expect(chunk).toEqual(testChunk);
        done();
      });

      messageChunkCallback?.(testChunk);
    });

    it('should emit error on error event', (done) => {
      const testError = { message: 'Connection error' };
      const errorCallback = (mockSocket.on as jest.Mock).mock.calls.find(
        (call) => call[0] === 'error'
      )?.[1];

      service.error$.subscribe((error) => {
        expect(error).toBe('Connection error');
        done();
      });

      errorCallback?.(testError);
    });

    it('should handle disconnect event and update state to reconnecting', () => {
      const disconnectCallback = (mockSocket.on as jest.Mock).mock.calls.find(
        (call) => call[0] === 'disconnect'
      )?.[1];

      disconnectCallback?.('io server disconnect');

      expect(service.connectionState()).toBe(ConnectionState.RECONNECTING);
    });
  });

  describe('sendMessage()', () => {
    beforeEach(() => {
      service.connect();
      mockSocket.connected = true;
    });

    it('should emit message through socket when connected', () => {
      const testMessage = 'Hello, world!';
      const sessionId = 'test-session-123';
      service.sendMessage(testMessage, sessionId);

      expect(mockSocket.emit).toHaveBeenCalledWith('send-message', {
        message: testMessage,
        sessionId,
      });
    });

    it('should emit message without sessionId when not provided', () => {
      const testMessage = 'Hello, world!';
      service.sendMessage(testMessage);

      expect(mockSocket.emit).toHaveBeenCalledWith('send-message', {
        message: testMessage,
        sessionId: undefined,
      });
    });

    it('should not emit message when disconnected', (done) => {
      mockSocket.connected = false;

      service.error$.subscribe((error) => {
        expect(error).toBe('Not connected to server');
        expect(mockSocket.emit).not.toHaveBeenCalled();
        done();
      });

      service.sendMessage('test');
    });
  });

  describe('disconnect()', () => {
    beforeEach(() => {
      service.connect();
    });

    it('should disconnect socket', () => {
      service.disconnect();

      expect(mockSocket.disconnect).toHaveBeenCalled();
    });

    it('should update connection state to disconnected', () => {
      service.disconnect();

      expect(service.connectionState()).toBe(ConnectionState.DISCONNECTED);
    });

    it('should clear reconnection timeout', fakeAsync(() => {
      // Trigger disconnect to start reconnection
      const disconnectCallback = (mockSocket.on as jest.Mock).mock.calls.find(
        (call) => call[0] === 'disconnect'
      )?.[1];
      disconnectCallback?.('io server disconnect');

      // Now explicitly disconnect
      service.disconnect();

      // Advance timers - reconnection should not happen
      const connectCallsBefore = (mockSocket.connect as jest.Mock).mock.calls
        .length;
      tick(5000);
      const connectCallsAfter = (mockSocket.connect as jest.Mock).mock.calls
        .length;

      expect(connectCallsAfter).toBe(connectCallsBefore);
    }));
  });

  describe('reconnection logic', () => {
    it('should set reconnecting state on disconnect', () => {
      const disconnectCallback = (mockSocket.on as jest.Mock).mock.calls.find(
        (call) => call[0] === 'disconnect'
      )?.[1];

      disconnectCallback?.('io server disconnect');
      expect(service.connectionState()).toBe(ConnectionState.RECONNECTING);
    });

    it('should reset to connected state after successful reconnection', () => {
      const connectCallback = (mockSocket.on as jest.Mock).mock.calls.find(
        (call) => call[0] === 'connect'
      )?.[1];

      // Simulate successful connection
      connectCallback?.();
      expect(service.connectionState()).toBe(ConnectionState.CONNECTED);
    });

    it('should update to error state after max reconnection attempts', () => {
      const connectErrorCallback = (mockSocket.on as jest.Mock).mock.calls.find(
        (call) => call[0] === 'connect_error'
      )?.[1];

      // Trigger 6 failed connection attempts (max is 5)
      for (let i = 0; i < 6; i++) {
        connectErrorCallback?.(new Error('Connection failed'));
      }

      expect(service.connectionState()).toBe(ConnectionState.ERROR);
    });
  });

  describe('error handling', () => {
    beforeEach(() => {
      service.connect();
    });

    it('should handle socket connection errors and set reconnecting state', () => {
      const connectErrorCallback = (mockSocket.on as jest.Mock).mock.calls.find(
        (call) => call[0] === 'connect_error'
      )?.[1];

      connectErrorCallback?.(new Error('Connection failed'));

      expect(service.connectionState()).toBe(ConnectionState.RECONNECTING);
    });

    it('should emit error message on connection error', (done) => {
      const connectErrorCallback = (mockSocket.on as jest.Mock).mock.calls.find(
        (call) => call[0] === 'connect_error'
      )?.[1];

      service.error$.subscribe((error) => {
        expect(error).toContain('Connection error');
        done();
      });

      connectErrorCallback?.(new Error('Network timeout'));
    });

    it('should handle message errors', (done) => {
      const errorCallback = (mockSocket.on as jest.Mock).mock.calls.find(
        (call) => call[0] === 'error'
      )?.[1];

      service.error$.subscribe((error) => {
        expect(error).toBe('Message processing failed');
        done();
      });

      errorCallback?.({ message: 'Message processing failed' });
    });

    it('should emit error message when max reconnection attempts reached', (done) => {
      const connectErrorCallback = (mockSocket.on as jest.Mock).mock.calls.find(
        (call) => call[0] === 'connect_error'
      )?.[1];

      service.error$.subscribe((error) => {
        if (error.includes('Failed to reconnect')) {
          expect(error).toBe('Failed to reconnect to server');
          done();
        }
      });

      // Trigger 6 failed connection attempts (max is 5)
      for (let i = 0; i < 6; i++) {
        connectErrorCallback?.(new Error('Connection failed'));
      }
    });
  });
});
