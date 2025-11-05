import { Module } from '@nestjs/common';
import { AIService } from './ai.service';
import { CircuitBreakerService } from './circuit-breaker.service';
import { AiController } from './ai.controller';

@Module({
  controllers: [AiController],
  providers: [AIService, CircuitBreakerService],
  exports: [AIService],
})
export class AiModule {}
