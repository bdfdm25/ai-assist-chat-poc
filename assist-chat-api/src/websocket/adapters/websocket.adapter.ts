import { INestApplicationContext, Logger } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { ServerOptions } from 'socket.io';
import { ConfigService } from '@nestjs/config';

export class WebSocketAdapter extends IoAdapter {
  private readonly logger = new Logger(WebSocketAdapter.name);

  constructor(
    app: INestApplicationContext,
    private configService: ConfigService,
  ) {
    super(app);
  }

  createIOServer(port: number, options?: ServerOptions): any {
    const frontendUrl = this.configService.get<string>('frontendUrl');

    const serverOptions = {
      ...(options || {}),
      cors: {
        origin: frontendUrl,
        credentials: true,
        methods: ['GET', 'POST'],
      },
      transports: ['websocket', 'polling'],
      pingTimeout: 60000,
      pingInterval: 25000,
      connectTimeout: 45000,
    } as ServerOptions;

    const server = super.createIOServer(port, serverOptions);

    this.logger.log('WebSocket adapter configured');
    this.logger.log(`CORS origin: ${frontendUrl}`);

    return server;
  }
}
