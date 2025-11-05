import { Test, TestingModule } from '@nestjs/testing';
import { AiController } from './ai.controller';
import { AIService } from './ai.service';
import { ConfigService } from '@nestjs/config';
import { CircuitBreakerService } from './circuit-breaker.service';

describe('AiController', () => {
  let controller: AiController;

  const mockAIService = {
    getCircuitBreakerStats: jest.fn(() => ({
      state: 'CLOSED',
      failureCount: 0,
      successCount: 0,
      lastFailureTime: null,
    })),
    resetCircuitBreaker: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(() => 'test-api-key'),
  };

  const mockCircuitBreakerService = {
    execute: jest.fn((fn) => fn()),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AiController],
      providers: [
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

    controller = module.get<AiController>(AiController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
