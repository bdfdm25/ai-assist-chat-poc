import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Controller('health')
export class HealthController {
  constructor(private configService: ConfigService) {}

  @Get()
  check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: this.configService.get('nodeEnv'),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    };
  }

  @Get('ready')
  ready() {
    const openaiKey = this.configService.get('openai.apiKey');

    return {
      status: openaiKey ? 'ready' : 'not_ready',
      checks: {
        openai: !!openaiKey,
      },
    };
  }
}
