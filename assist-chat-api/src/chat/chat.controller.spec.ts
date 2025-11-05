import { Test, TestingModule } from '@nestjs/testing';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { AIService } from '../ai/ai.service';
import { ConfigService } from '@nestjs/config';
import { CircuitBreakerService } from '../ai/circuit-breaker.service';

describe('ChatController', () => {
  let controller: ChatController;

  const mockChatService = {
    processMessage: jest.fn(),
    getActiveSessionsCount: jest.fn(() => 5),
    cleanupOldSessions: jest.fn(),
  };

  const mockAIService = {
    getCircuitBreakerStats: jest.fn(),
    resetCircuitBreaker: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(() => 'test-value'),
  };

  const mockCircuitBreakerService = {
    execute: jest.fn((fn) => fn()),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChatController],
      providers: [
        {
          provide: ChatService,
          useValue: mockChatService,
        },
        {
          provide: AIService,
          useValue: mockAIService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: CircuitBreakerService,
          useValue: mockCircuitBreakerService,
        },
      ],
    }).compile();

    controller = module.get<ChatController>(ChatController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
