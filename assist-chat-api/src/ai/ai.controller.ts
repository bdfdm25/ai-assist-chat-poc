import { MessageRole } from '@common/enums/message-role.enum';
import { Message } from '@common/interfaces/message.interface';
import { Body, Controller, Get, Post } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { AIService } from './ai.service';

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AIService) {}

  @Get('health')
  async testConnection() {
    const isHealthy = await this.aiService.testConnection();
    return {
      status: isHealthy ? 'healthy' : 'unhealthy',
      model: 'gpt-4-turbo-preview',
    };
  }

  @Get('circuit-breaker')
  getCircuitBreakerStats() {
    return this.aiService.getCircuitBreakerStats();
  }

  @Post('circuit-breaker/reset')
  resetCircuitBreaker() {
    this.aiService.resetCircuitBreaker();
    return { message: 'Circuit breaker reset' };
  }

  @Post('test')
  async testCompletion(@Body() body: { message: string }) {
    const messages: Message[] = [
      {
        id: randomUUID(),
        role: MessageRole.USER,
        content: body.message,
        timestamp: new Date(),
      },
    ];

    const response = await this.aiService.generateCompletion(messages);
    return { response };
  }
}
