import { Test, TestingModule } from '@nestjs/testing';
import { of, throwError, Subject } from 'rxjs';
import { ChatService } from './chat.service';
import { AIService } from '@ai/ai.service';
import { MessageRole } from '../common/enums/message-role.enum';

describe('ChatService', () => {
  let service: ChatService;
  let aiService: AIService;

  const mockAIService = {
    streamCompletion: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        {
          provide: AIService,
          useValue: mockAIService,
        },
      ],
    }).compile();

    service = module.get<ChatService>(ChatService);
    aiService = module.get<AIService>(AIService);

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should have AIService injected', () => {
      expect(aiService).toBeDefined();
    });
  });

  describe('processMessage', () => {
    it('should create new session if sessionId not provided', async () => {
      mockAIService.streamCompletion.mockReturnValue(of('AI response'));

      const result = await service.processMessage('Hello');

      expect(result.messageId).toBeDefined();
      expect(result.stream).toBeDefined();

      // Check that session was created
      const sessions = service.getAllSessions();
      expect(sessions.length).toBe(1);
    });

    it('should use existing session if sessionId provided', async () => {
      mockAIService.streamCompletion.mockReturnValue(of('AI response'));

      // First message creates session
      const result1 = await service.processMessage('Hello');
      const sessionId = service.getAllSessions()[0].id;

      // Second message uses same session
      const result2 = await service.processMessage('Follow up', sessionId);

      const sessions = service.getAllSessions();
      expect(sessions.length).toBe(1);
      expect(sessions[0].messages.length).toBeGreaterThan(2);
    });

    it('should add user message to session', async () => {
      mockAIService.streamCompletion.mockReturnValue(of('AI response'));

      await service.processMessage('Test message');

      const sessions = service.getAllSessions();
      const userMessage = sessions[0].messages.find(
        (m) => m.role === MessageRole.USER,
      );

      expect(userMessage).toBeDefined();
      expect(userMessage?.content).toBe('Test message');
    });

    it('should include system message in context', async () => {
      let capturedContext: any;
      mockAIService.streamCompletion.mockImplementation((context) => {
        capturedContext = context;
        return of('AI response');
      });

      await service.processMessage('Hello');

      expect(capturedContext).toBeDefined();
      expect(capturedContext[0].role).toBe(MessageRole.SYSTEM);
      expect(capturedContext[0].content).toContain('Assist');
    });

    it('should stream AI response correctly', (done) => {
      const chunks = ['Hello', ' ', 'World', '!'];
      const subject = new Subject<string>();
      mockAIService.streamCompletion.mockReturnValue(subject.asObservable());

      service.processMessage('Test').then((result) => {
        const receivedChunks: string[] = [];

        result.stream.subscribe({
          next: (chunk) => receivedChunks.push(chunk),
          complete: () => {
            expect(receivedChunks).toEqual(chunks);
            done();
          },
        });

        // Emit chunks after subscription
        chunks.forEach((chunk) => subject.next(chunk));
        subject.complete();
      });
    });

    it('should save complete assistant message after streaming', (done) => {
      mockAIService.streamCompletion.mockReturnValue(of('AI', ' ', 'response'));

      service.processMessage('Test').then((result) => {
        result.stream.subscribe({
          complete: () => {
            const sessions = service.getAllSessions();
            const assistantMessage = sessions[0].messages.find(
              (m) => m.role === MessageRole.ASSISTANT,
            );

            expect(assistantMessage).toBeDefined();
            expect(assistantMessage?.content).toBe('AI response');
            done();
          },
        });
      });
    });

    it('should handle AI service errors', (done) => {
      mockAIService.streamCompletion.mockReturnValue(
        throwError(() => new Error('AI service error')),
      );

      service.processMessage('Test').then((result) => {
        result.stream.subscribe({
          error: (error) => {
            expect(error.message).toBe('Failed to generate AI response');
            done();
          },
        });
      });
    });

    it('should return unique message IDs', async () => {
      mockAIService.streamCompletion.mockReturnValue(of('response'));

      const result1 = await service.processMessage('Message 1');
      const result2 = await service.processMessage('Message 2');

      expect(result1.messageId).not.toBe(result2.messageId);
    });

    it('should update session timestamp after message', (done) => {
      mockAIService.streamCompletion.mockReturnValue(of('response'));

      service.processMessage('Test').then((result) => {
        const sessions = service.getAllSessions();
        const initialTime = sessions[0].updatedAt.getTime();

        result.stream.subscribe({
          complete: () => {
            const updatedTime = sessions[0].updatedAt.getTime();
            expect(updatedTime).toBeGreaterThanOrEqual(initialTime);
            done();
          },
        });
      });
    });
  });

  describe('Session Management', () => {
    beforeEach(() => {
      mockAIService.streamCompletion.mockReturnValue(of('response'));
    });

    it('should retrieve session by ID', async () => {
      await service.processMessage('Test');
      const sessions = service.getAllSessions();
      const sessionId = sessions[0].id;

      const session = service.getSession(sessionId);

      expect(session).toBeDefined();
      expect(session?.id).toBe(sessionId);
    });

    it('should return undefined for non-existent session', () => {
      const session = service.getSession('non-existent-id');
      expect(session).toBeUndefined();
    });

    it('should retrieve all sessions', async () => {
      await service.processMessage('Message 1');
      await service.processMessage('Message 2');
      await service.processMessage('Message 3');

      const sessions = service.getAllSessions();
      expect(sessions.length).toBe(3);
    });

    it('should delete session successfully', async () => {
      await service.processMessage('Test');
      const sessionId = service.getAllSessions()[0].id;

      const deleted = service.deleteSession(sessionId);

      expect(deleted).toBe(true);
      expect(service.getAllSessions().length).toBe(0);
    });

    it('should return false when deleting non-existent session', () => {
      const deleted = service.deleteSession('non-existent-id');
      expect(deleted).toBe(false);
    });
  });

  describe('Context Management', () => {
    beforeEach(() => {
      mockAIService.streamCompletion.mockReturnValue(of('response'));
    });

    it('should limit context to MAX_CONTEXT_MESSAGES', async () => {
      let capturedContext: any;
      mockAIService.streamCompletion.mockImplementation((context) => {
        capturedContext = context;
        return of('response');
      });

      // Send 15 messages (more than MAX_CONTEXT_MESSAGES = 10)
      const result = await service.processMessage('First message');
      const sessionId = service.getAllSessions()[0].id;

      for (let i = 0; i < 14; i++) {
        await service.processMessage(`Message ${i}`, sessionId);
      }

      // Context should not exceed MAX + system message
      expect(capturedContext.length).toBeLessThanOrEqual(11);
    });

    it('should include system message in context', async () => {
      let capturedContext: any;
      mockAIService.streamCompletion.mockImplementation((context) => {
        capturedContext = context;
        return of('response');
      });

      await service.processMessage('Test');

      const systemMessage = capturedContext.find(
        (m: any) => m.role === MessageRole.SYSTEM,
      );
      expect(systemMessage).toBeDefined();
      expect(systemMessage.content).toContain('EstateAssist');
      expect(systemMessage.content).toContain('real estate');
    });

    it('should maintain message order in context', async () => {
      let capturedContext: any;
      mockAIService.streamCompletion.mockImplementation((context) => {
        capturedContext = context;
        return of('response');
      });

      const result = await service.processMessage('First');
      const sessionId = service.getAllSessions()[0].id;
      await service.processMessage('Second', sessionId);
      await service.processMessage('Third', sessionId);

      // Skip system message (first)
      expect(capturedContext[1].content).toBe('First');
      expect(capturedContext[3].content).toBe('Second');
    });
  });

  describe('Session Cleanup', () => {
    beforeEach(() => {
      mockAIService.streamCompletion.mockReturnValue(of('response'));
    });

    it('should clear old sessions based on age', async () => {
      // Create sessions
      await service.processMessage('Message 1');
      await service.processMessage('Message 2');
      await service.processMessage('Message 3');

      const sessions = service.getAllSessions();

      // Mock old timestamp for first two sessions
      const oldTime = new Date(Date.now() - 120 * 60 * 1000); // 120 minutes ago
      sessions[0].updatedAt = oldTime;
      sessions[1].updatedAt = oldTime;

      const deleted = service.clearOldSessions(60); // 60 minutes

      expect(deleted).toBe(2);
      expect(service.getAllSessions().length).toBe(1);
    });

    it('should not clear recent sessions', async () => {
      await service.processMessage('Recent message');

      const deleted = service.clearOldSessions(60);

      expect(deleted).toBe(0);
      expect(service.getAllSessions().length).toBe(1);
    });

    it('should return zero when no sessions to clear', () => {
      const deleted = service.clearOldSessions(60);
      expect(deleted).toBe(0);
    });

    it('should use default maxAge if not provided', async () => {
      await service.processMessage('Test');
      const sessions = service.getAllSessions();

      // Set to 2 hours old
      sessions[0].updatedAt = new Date(Date.now() - 120 * 60 * 1000);

      const deleted = service.clearOldSessions();

      expect(deleted).toBe(1);
    });
  });

  describe('Message Metadata', () => {
    beforeEach(() => {
      mockAIService.streamCompletion.mockReturnValue(of('response'));
    });

    it('should add timestamp to messages', async () => {
      const before = Date.now();
      await service.processMessage('Test');
      const after = Date.now();

      const sessions = service.getAllSessions();
      const message = sessions[0].messages[0];

      expect(message.timestamp.getTime()).toBeGreaterThanOrEqual(before);
      expect(message.timestamp.getTime()).toBeLessThanOrEqual(after);
    });

    it('should add unique IDs to messages', async () => {
      await service.processMessage('Test');
      const sessions = service.getAllSessions();

      const messages = sessions[0].messages;
      const ids = messages.map((m) => m.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should associate messages with session ID', async () => {
      await service.processMessage('Test');
      const sessions = service.getAllSessions();
      const sessionId = sessions[0].id;

      const userMessage = sessions[0].messages.find(
        (m) => m.role === MessageRole.USER,
      );

      expect(userMessage?.sessionId).toBe(sessionId);
    });
  });

  describe('Error Scenarios', () => {
    it('should handle empty message content', async () => {
      mockAIService.streamCompletion.mockReturnValue(of('response'));

      await service.processMessage('');

      const sessions = service.getAllSessions();
      expect(sessions[0].messages[0].content).toBe('');
    });

    it('should handle very long messages', async () => {
      mockAIService.streamCompletion.mockReturnValue(of('response'));

      const longMessage = 'a'.repeat(10000);
      await service.processMessage(longMessage);

      const sessions = service.getAllSessions();
      expect(sessions[0].messages[0].content).toBe(longMessage);
    });

    it('should handle special characters in messages', async () => {
      mockAIService.streamCompletion.mockReturnValue(of('response'));

      const specialMessage = '!@#$%^&*()_+{}:"<>?[];,./~`';
      await service.processMessage(specialMessage);

      const sessions = service.getAllSessions();
      expect(sessions[0].messages[0].content).toBe(specialMessage);
    });
  });
});
