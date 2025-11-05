import { ArgumentsHost, Catch, Logger } from '@nestjs/common';
import { BaseWsExceptionFilter, WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';

@Catch()
export class WsExceptionFilter extends BaseWsExceptionFilter {
  private readonly logger = new Logger(WsExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const client = host.switchToWs().getClient<Socket>();

    const error =
      exception instanceof WsException
        ? exception.getError()
        : 'Internal server error';

    const errorMessage =
      typeof error === 'string' ? error : (error as any).message;

    this.logger.error(
      `WebSocket error for client ${client.id}`,
      errorMessage,
      exception instanceof Error ? exception.stack : '',
    );

    client.emit('error', {
      message: errorMessage,
      timestamp: new Date().toISOString(),
    });
  }
}
