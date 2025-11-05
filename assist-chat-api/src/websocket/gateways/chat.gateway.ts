import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  MessageBody,
  ConnectedSocket,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseFilters, UsePipes, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WsExceptionFilter } from '@common/filters/ws-exception.filter';
import { ChatService } from '@chat/chat.service';
import { SendMessageDto } from '@chat/dto/send-message.dto';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:4200',
    credentials: true,
  },
  transports: ['websocket', 'polling'],
  namespace: '/',
})
@UseFilters(WsExceptionFilter)
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    transform: true,
  }),
)
export class ChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);
  private activeConnections = new Map<string, string>(); // socketId -> sessionId

  constructor(
    private readonly chatService: ChatService,
    private readonly configService: ConfigService,
  ) {}

  afterInit(server: Server) {
    this.logger.log('🔌 WebSocket Gateway initialized');
    this.logger.log(
      `Accepting connections from: ${this.configService.get('frontendUrl')}`,
    );
  }

  handleConnection(client: Socket) {
    this.logger.log(`✅ Client connected: ${client.id}`);
    this.logger.log(`   IP: ${client.handshake.address}`);
    this.logger.log(`   Transport: ${client.conn.transport.name}`);
    this.logger.log(`   Total connections: ${this.activeConnections.size + 1}`);

    // Send welcome message
    client.emit('connected', {
      message: 'Connected to Assist Chat',
      clientId: client.id,
      timestamp: new Date().toISOString(),
    });
  }

  handleDisconnect(client: Socket) {
    const sessionId = this.activeConnections.get(client.id);
    this.activeConnections.delete(client.id);

    this.logger.log(`❌ Client disconnected: ${client.id}`);
    if (sessionId) {
      this.logger.log(`   Session: ${sessionId}`);
    }
    this.logger.log(`   Total connections: ${this.activeConnections.size}`);
  }

  @SubscribeMessage('send-message')
  async handleMessage(
    @MessageBody() data: SendMessageDto,
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    try {
      this.logger.log(`📨 Message received from ${client.id}`);
      this.logger.debug(`   Content: ${data.message.substring(0, 50)}...`);

      // Track session
      if (data.sessionId) {
        this.activeConnections.set(client.id, data.sessionId);
      }

      // Process message and get streaming observable
      const { messageId, stream } = await this.chatService.processMessage(
        data.message,
        data.sessionId,
      );

      this.logger.log(`🤖 Streaming response for message: ${messageId}`);

      // Stream chunks back to client
      stream.subscribe({
        next: (chunk: string) => {
          client.emit('message-chunk', {
            id: messageId,
            chunk,
            isComplete: false,
          });
        },
        error: (error: Error) => {
          this.logger.error(`Error streaming message: ${error.message}`);
          client.emit('error', {
            message: 'Failed to generate response',
            details: error.message,
          });
        },
        complete: () => {
          this.logger.log(`✅ Streaming complete for message: ${messageId}`);
          client.emit('message-chunk', {
            id: messageId,
            chunk: '',
            isComplete: true,
          });
        },
      });
    } catch (error) {
      this.logger.error(
        `Error handling message: ${error.message}`,
        error.stack,
      );
      throw new WsException('Failed to process message');
    }
  }

  @SubscribeMessage('typing')
  handleTyping(
    @MessageBody() data: { isTyping: boolean },
    @ConnectedSocket() client: Socket,
  ): void {
    // Broadcast typing indicator to other clients in the same session
    // For now, just log it
    this.logger.debug(
      `Client ${client.id} is ${data.isTyping ? 'typing' : 'stopped typing'}`,
    );
  }

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket): void {
    client.emit('pong', { timestamp: new Date().toISOString() });
  }

  // Utility method to send message to specific client
  sendToClient(clientId: string, event: string, data: any): void {
    this.server.to(clientId).emit(event, data);
  }

  // Utility method to broadcast to all clients
  broadcast(event: string, data: any): void {
    this.server.emit(event, data);
  }

  // Get connection stats
  getConnectionStats() {
    return {
      totalConnections: this.activeConnections.size,
      connections: Array.from(this.activeConnections.entries()).map(
        ([socketId, sessionId]) => ({
          socketId,
          sessionId,
        }),
      ),
    };
  }
}
