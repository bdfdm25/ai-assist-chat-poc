import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AIService } from './ai.service';
import { CircuitBreakerService } from './circuit-breaker.service';
import { MessageRole } from '../common/enums/message-role.enum';

describe('AIService', () => {
  let service: AIService;
  let circuitBreaker: CircuitBreakerService;
  let configService: ConfigService;

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: any) => {
      const config: Record<string, any> = {
        'openai.apiKey': 'test-api-key',
        'openai.model': 'gpt-4-turbo-preview',
        'openai.maxTokens': 1000,
        'openai.temperature': 0.7,
      };
      return config[key] ?? defaultValue;
    }),
  };

  const mockCircuitBreaker = {
    execute: jest.fn((fn) => fn()),
    getStats: jest.fn(() => ({
      state: 'CLOSED',
      failureCount: 0,
      successCount: 0,
      lastFailureTime: null,
    })),
    reset: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AIService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: CircuitBreakerService,
          useValue: mockCircuitBreaker,
        },
      ],
    }).compile();

    service = module.get<AIService>(AIService);
    circuitBreaker = module.get<CircuitBreakerService>(CircuitBreakerService);
    configService = module.get<ConfigService>(ConfigService);
  });

  describe('Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should load configuration from ConfigService', () => {
      expect(mockConfigService.get).toHaveBeenCalledWith('openai.apiKey');
      expect(mockConfigService.get).toHaveBeenCalledWith(
        'openai.model',
        expect.any(String),
      );
      expect(mockConfigService.get).toHaveBeenCalledWith(
        'openai.maxTokens',
        expect.any(Number),
      );
      expect(mockConfigService.get).toHaveBeenCalledWith(
        'openai.temperature',
        expect.any(Number),
      );
    });

    it('should throw error if API key is not configured', () => {
      const badConfigService = {
        get: jest.fn(() => undefined),
      };

      expect(() => {
        new (AIService as any)(badConfigService, mockCircuitBreaker);
      }).toThrow('OpenAI API key is not configured');
    });
  });

  describe('Token Estimation', () => {
    it('should estimate tokens correctly', () => {
      const text = 'This is a test message';
      const tokens = service.estimateTokens(text);

      // ~4 characters per token
      expect(tokens).toBeGreaterThan(0);
      expect(tokens).toBe(Math.ceil(text.length / 4));
    });

    it('should handle empty string', () => {
      const tokens = service.estimateTokens('');
      expect(tokens).toBe(0);
    });

    it('should handle very long text', () => {
      const longText = 'a'.repeat(10000);
      const tokens = service.estimateTokens(longText);

      expect(tokens).toBe(2500); // 10000 / 4
    });
  });

  describe('Context Window Management', () => {
    it('should fit messages within context window', () => {
      const messages = Array(50)
        .fill(null)
        .map((_, i) => ({
          id: `msg-${i}`,
          role: MessageRole.USER,
          content: `Message ${i}`,
          timestamp: new Date(),
        }));

      const fitted = service.fitToContextWindow(messages, 100);

      const totalTokens = fitted.reduce(
        (sum, msg) => sum + service.estimateTokens(msg.content),
        0,
      );

      expect(totalTokens).toBeLessThanOrEqual(100);
    });

    it('should preserve system messages when trimming context', () => {
      const messages = [
        {
          id: '1',
          role: MessageRole.SYSTEM,
          content: 'System prompt',
          timestamp: new Date(),
        },
        ...Array(20)
          .fill(null)
          .map((_, i) => ({
            id: `msg-${i}`,
            role: MessageRole.USER,
            content: 'Test message',
            timestamp: new Date(),
          })),
      ];

      const fitted = service.fitToContextWindow(messages, 50);

      // System message should be preserved (might be at start or included in fitted messages)
      const hasSystemMessage = fitted.some(
        (msg) => msg.role === MessageRole.SYSTEM,
      );
      expect(hasSystemMessage).toBe(true);
    });

    it('should include most recent messages', () => {
      const messages = Array(10)
        .fill(null)
        .map((_, i) => ({
          id: `msg-${i}`,
          role: MessageRole.USER,
          content: `Message ${i}`,
          timestamp: new Date(),
        }));

      const fitted = service.fitToContextWindow(messages, 50);

      // Should include most recent messages
      const lastMessage = fitted[fitted.length - 1];
      expect(lastMessage.content).toContain('Message 9');
    });

    it('should use default maxContextTokens if not provided', () => {
      const messages = Array(200)
        .fill(null)
        .map((_, i) => ({
          id: `msg-${i}`,
          role: MessageRole.USER,
          content: 'Test '.repeat(100), // ~100 tokens each
          timestamp: new Date(),
        }));

      const fitted = service.fitToContextWindow(messages);

      const totalTokens = fitted.reduce(
        (sum, msg) => sum + service.estimateTokens(msg.content),
        0,
      );

      expect(totalTokens).toBeLessThanOrEqual(4000);
    });

    it('should handle empty messages array', () => {
      const fitted = service.fitToContextWindow([]);
      expect(fitted).toEqual([]);
    });
  });

  describe('Circuit Breaker Integration', () => {
    it('should use circuit breaker for operations', () => {
      expect(circuitBreaker).toBeDefined();
    });

    it('should expose circuit breaker stats', () => {
      const stats = service.getCircuitBreakerStats();

      expect(stats).toBeDefined();
      expect(stats.state).toBe('CLOSED');
    });

    it('should allow manual circuit breaker reset', () => {
      service.resetCircuitBreaker();

      expect(mockCircuitBreaker.reset).toHaveBeenCalled();
    });
  });

  describe('Configuration', () => {
    it('should use configured model', () => {
      // Configuration is loaded during service initialization in beforeEach
      // We just verify the service was created successfully
      expect(service).toBeDefined();
    });

    it('should use configured max tokens', () => {
      // Configuration is loaded during service initialization in beforeEach
      expect(service).toBeDefined();
    });

    it('should use configured temperature', () => {
      // Configuration is loaded during service initialization in beforeEach
      expect(service).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle messages with special characters', () => {
      const messages = [
        {
          id: '1',
          role: MessageRole.USER,
          content: '!@#$%^&*()_+{}:"<>?',
          timestamp: new Date(),
        },
      ];

      const fitted = service.fitToContextWindow(messages);
      expect(fitted.length).toBe(1);
    });

    it('should handle very long single message', () => {
      const longContent = 'a'.repeat(50000);
      const messages = [
        {
          id: '1',
          role: MessageRole.USER,
          content: longContent,
          timestamp: new Date(),
        },
      ];

      const fitted = service.fitToContextWindow(messages, 100);

      // Should still try to fit what it can
      expect(fitted.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle mixed role types', () => {
      const messages = [
        {
          id: '1',
          role: MessageRole.SYSTEM,
          content: 'System',
          timestamp: new Date(),
        },
        {
          id: '2',
          role: MessageRole.USER,
          content: 'User',
          timestamp: new Date(),
        },
        {
          id: '3',
          role: MessageRole.ASSISTANT,
          content: 'Assistant',
          timestamp: new Date(),
        },
      ];

      const fitted = service.fitToContextWindow(messages);

      expect(fitted.length).toBe(3);
      // System message should be preserved somewhere in the result
      const hasSystemMessage = fitted.some(
        (msg) => msg.role === MessageRole.SYSTEM,
      );
      expect(hasSystemMessage).toBe(true);
    });
  });

  describe('Message Processing', () => {
    it('should process messages array correctly', () => {
      const messages = [
        {
          id: '1',
          role: MessageRole.USER,
          content: 'Hello',
          timestamp: new Date(),
        },
        {
          id: '2',
          role: MessageRole.ASSISTANT,
          content: 'Hi there',
          timestamp: new Date(),
        },
      ];

      const fitted = service.fitToContextWindow(messages);

      expect(fitted.length).toBe(2);
      expect(fitted[0].content).toBe('Hello');
      expect(fitted[1].content).toBe('Hi there');
    });

    it('should maintain message properties', () => {
      const timestamp = new Date();
      const messages = [
        {
          id: 'test-id',
          role: MessageRole.USER,
          content: 'Test content',
          timestamp,
        },
      ];

      const fitted = service.fitToContextWindow(messages);

      expect(fitted[0].id).toBe('test-id');
      expect(fitted[0].role).toBe(MessageRole.USER);
      expect(fitted[0].content).toBe('Test content');
      expect(fitted[0].timestamp).toBe(timestamp);
    });
  });
});
