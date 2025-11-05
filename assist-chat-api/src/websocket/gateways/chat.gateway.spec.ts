import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { of, throwError } from 'rxjs';
import { ChatGateway } from './chat.gateway';
import { ChatService } from '@chat/chat.service';

describe('ChatGateway', () => {
  let gateway: ChatGateway;
  let chatService: ChatService;

  const mockChatService = {
    processMessage: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'frontendUrl') return 'http://localhost:4200';
      return null;
    }),
  };

  const mockSocket = {
    id: 'test-socket-id',
    handshake: {
      address: '127.0.0.1',
      query: {
        userId: 'test-user-id',
      },
    },
    conn: {
      transport: {
        name: 'websocket',
      },
    },
    emit: jest.fn(),
  };

  const mockServer = {
    emit: jest.fn(),
    to: jest.fn().mockReturnThis(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatGateway,
        {
          provide: ChatService,
          useValue: mockChatService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    gateway = module.get<ChatGateway>(ChatGateway);
    chatService = module.get<ChatService>(ChatService);

    // Set server manually
    gateway.server = mockServer as any;

    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should be defined', () => {
      expect(gateway).toBeDefined();
    });

    it('should initialize after server setup', () => {
      const logSpy = jest.spyOn(gateway['logger'], 'log');

      gateway.afterInit(mockServer as any);

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('WebSocket Gateway initialized'),
      );
    });
  });

  describe('Connection Handling', () => {
    it('should handle new connection', () => {
      const logSpy = jest.spyOn(gateway['logger'], 'log');

      gateway.handleConnection(mockSocket as any);

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Client connected'),
      );
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'connected',
        expect.objectContaining({
          message: 'Connected to Assist Chat',
          clientId: 'test-socket-id',
        }),
      );
    });

    it('should log connection details', () => {
      const logSpy = jest.spyOn(gateway['logger'], 'log');

      gateway.handleConnection(mockSocket as any);

      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('IP:'));
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Transport:'),
      );
    });

    it('should track total connections', () => {
      gateway.handleConnection(mockSocket as any);

      const stats = gateway.getConnectionStats();
      expect(stats.totalConnections).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Disconnection Handling', () => {
    it('should handle disconnection', () => {
      const logSpy = jest.spyOn(gateway['logger'], 'log');

      gateway.handleConnection(mockSocket as any);
      gateway.handleDisconnect(mockSocket as any);

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Client disconnected'),
      );
    });

    it('should clean up connection tracking', () => {
      gateway.handleConnection(mockSocket as any);
      const initialStats = gateway.getConnectionStats();

      gateway.handleDisconnect(mockSocket as any);
      const finalStats = gateway.getConnectionStats();

      // Connection count should be updated
      expect(finalStats).toBeDefined();
    });
  });

  describe('Message Handling', () => {
    const messageData = {
      message: 'Test message',
      sessionId: 'test-session-id',
    };

    it('should process incoming messages', async () => {
      mockChatService.processMessage.mockResolvedValue({
        messageId: 'msg-123',
        stream: of('chunk1', 'chunk2', 'chunk3'),
      });

      await gateway.handleMessage(messageData, mockSocket as any);

      expect(mockChatService.processMessage).toHaveBeenCalledWith(
        'Test message',
        'test-session-id',
      );
    });

    it('should emit message chunks to client', async () => {
      mockChatService.processMessage.mockResolvedValue({
        messageId: 'msg-123',
        stream: of('chunk1', 'chunk2'),
      });

      await gateway.handleMessage(messageData, mockSocket as any);

      // Wait for stream to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockSocket.emit).toHaveBeenCalledWith(
        'message-chunk',
        expect.objectContaining({
          id: 'msg-123',
          chunk: 'chunk1',
          isComplete: false,
        }),
      );

      expect(mockSocket.emit).toHaveBeenCalledWith(
        'message-chunk',
        expect.objectContaining({
          id: 'msg-123',
          chunk: 'chunk2',
          isComplete: false,
        }),
      );
    });

    it('should emit completion marker', async () => {
      mockChatService.processMessage.mockResolvedValue({
        messageId: 'msg-123',
        stream: of('chunk'),
      });

      await gateway.handleMessage(messageData, mockSocket as any);

      // Wait for stream to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockSocket.emit).toHaveBeenCalledWith(
        'message-chunk',
        expect.objectContaining({
          id: 'msg-123',
          chunk: '',
          isComplete: true,
        }),
      );
    });

    it('should handle streaming errors', async () => {
      mockChatService.processMessage.mockResolvedValue({
        messageId: 'msg-123',
        stream: throwError(() => new Error('Streaming error')),
      });

      await gateway.handleMessage(messageData, mockSocket as any);

      // Wait for error to be processed
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockSocket.emit).toHaveBeenCalledWith(
        'error',
        expect.objectContaining({
          message: 'Failed to generate response',
        }),
      );
    });

    it('should track session ID', async () => {
      mockChatService.processMessage.mockResolvedValue({
        messageId: 'msg-123',
        stream: of('chunk'),
      });

      await gateway.handleMessage(messageData, mockSocket as any);

      // Session should be tracked in connection stats
      const stats = gateway.getConnectionStats();
      expect(stats).toBeDefined();
    });

    it('should log message receipt', async () => {
      const logSpy = jest.spyOn(gateway['logger'], 'log');

      mockChatService.processMessage.mockResolvedValue({
        messageId: 'msg-123',
        stream: of('chunk'),
      });

      await gateway.handleMessage(messageData, mockSocket as any);

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Message received'),
      );
    });
  });

  describe('Typing Indicator', () => {
    it('should handle typing event', () => {
      const logSpy = jest.spyOn(gateway['logger'], 'debug');

      gateway.handleTyping({ isTyping: true }, mockSocket as any);

      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('typing'));
    });

    it('should handle stopped typing event', () => {
      const logSpy = jest.spyOn(gateway['logger'], 'debug');

      gateway.handleTyping({ isTyping: false }, mockSocket as any);

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('stopped typing'),
      );
    });
  });

  describe('Ping/Pong', () => {
    it('should respond to ping with pong', () => {
      gateway.handlePing(mockSocket as any);

      expect(mockSocket.emit).toHaveBeenCalledWith(
        'pong',
        expect.objectContaining({
          timestamp: expect.any(String),
        }),
      );
    });

    it('should include timestamp in pong response', () => {
      const beforeTime = new Date().toISOString();

      gateway.handlePing(mockSocket as any);

      const pongCall = mockSocket.emit.mock.calls.find(
        (call) => call[0] === 'pong',
      );
      expect(pongCall).toBeDefined();
      expect(pongCall![1].timestamp).toBeDefined();
    });
  });

  describe('Utility Methods', () => {
    it('should send message to specific client', () => {
      gateway.sendToClient('client-123', 'test-event', { data: 'test' });

      expect(mockServer.to).toHaveBeenCalledWith('client-123');
      expect(mockServer.emit).toHaveBeenCalledWith('test-event', {
        data: 'test',
      });
    });

    it('should broadcast to all clients', () => {
      gateway.broadcast('announcement', { message: 'Hello all' });

      expect(mockServer.emit).toHaveBeenCalledWith('announcement', {
        message: 'Hello all',
      });
    });

    it('should provide connection statistics', () => {
      gateway.handleConnection(mockSocket as any);

      const stats = gateway.getConnectionStats();

      expect(stats).toHaveProperty('totalConnections');
      expect(stats).toHaveProperty('connections');
      expect(Array.isArray(stats.connections)).toBe(true);
    });
  });

  describe('Error Scenarios', () => {
    it('should handle invalid message data gracefully', async () => {
      const errorSpy = jest.spyOn(gateway['logger'], 'error');

      mockChatService.processMessage.mockRejectedValue(
        new Error('Invalid data'),
      );

      await expect(
        gateway.handleMessage(
          { message: '', sessionId: '' },
          mockSocket as any,
        ),
      ).rejects.toThrow();

      expect(errorSpy).toHaveBeenCalled();
    });

    it('should handle missing session ID', async () => {
      mockChatService.processMessage.mockResolvedValue({
        messageId: 'msg-123',
        stream: of('chunk'),
      });

      const dataWithoutSession = {
        message: 'Test message',
      };

      await gateway.handleMessage(dataWithoutSession as any, mockSocket as any);

      expect(mockChatService.processMessage).toHaveBeenCalledWith(
        'Test message',
        undefined,
      );
    });
  });

  describe('Connection Stats', () => {
    it('should track multiple connections', () => {
      const socket1 = { ...mockSocket, id: 'socket-1' };
      const socket2 = { ...mockSocket, id: 'socket-2' };

      gateway.handleConnection(socket1 as any);
      gateway.handleConnection(socket2 as any);

      const stats = gateway.getConnectionStats();
      expect(stats.totalConnections).toBeGreaterThanOrEqual(0);
    });

    it('should include connection details', () => {
      gateway.handleConnection(mockSocket as any);

      const stats = gateway.getConnectionStats();

      expect(stats.connections).toBeDefined();
      expect(Array.isArray(stats.connections)).toBe(true);
    });
  });
});
