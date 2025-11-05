import { AiModule } from '@ai/ai.module';
import { ChatModule } from '@chat/chat.module';
import configuration from '@config/configuration';
import { validate } from '@config/env.validation';
import { HealthModule } from '@health/health.module';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { WebsocketModule } from '@websocket/websocket.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate,
      cache: true,
    }),

    // Rate limiting
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 10, // 10 requests per minute
      },
    ]),

    // Feature modules
    ChatModule,
    AiModule,
    WebsocketModule,
    HealthModule,
  ],
})
export class AppModule {}
