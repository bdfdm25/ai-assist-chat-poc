import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/send-message.dto';
import { MessageResponseDto } from './dto/message-response.dto';
import { lastValueFrom } from 'rxjs';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('sessions')
  getAllSessions() {
    const sessions = this.chatService.getAllSessions();
    return {
      count: sessions.length,
      sessions: sessions.map((s) => ({
        id: s.id,
        messageCount: s.messages.length,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
      })),
    };
  }

  @Get('sessions/:id')
  getSession(@Param('id') id: string) {
    const session = this.chatService.getSession(id);

    if (!session) {
      throw new NotFoundException(`Session ${id} not found`);
    }

    return session;
  }

  @Get('sessions/:id/messages')
  getSessionMessages(@Param('id') id: string): MessageResponseDto[] {
    const session = this.chatService.getSession(id);

    if (!session) {
      throw new NotFoundException(`Session ${id} not found`);
    }

    return session.messages.map((msg) => ({
      id: msg.id,
      role: msg.role,
      content: msg.content,
      timestamp: msg.timestamp,
      sessionId: msg.sessionId,
    }));
  }

  @Post('sessions/:id/messages')
  async sendMessage(@Param('id') id: string, @Body() dto: SendMessageDto) {
    const { messageId, stream } = await this.chatService.processMessage(
      dto.message,
      id,
    );

    // For HTTP endpoint, collect entire stream
    const chunks: string[] = [];

    await new Promise<void>((resolve, reject) => {
      stream.subscribe({
        next: (chunk) => chunks.push(chunk),
        error: reject,
        complete: () => resolve(),
      });
    });

    const response: MessageResponseDto = {
      id: messageId,
      role: 'assistant' as any,
      content: chunks.join(''),
      timestamp: new Date(),
      sessionId: id,
    };

    return response;
  }

  @Delete('sessions/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteSession(@Param('id') id: string) {
    const deleted = this.chatService.deleteSession(id);

    if (!deleted) {
      throw new NotFoundException(`Session ${id} not found`);
    }
  }

  @Post('cleanup')
  cleanupOldSessions(@Body() body?: { maxAgeMinutes?: number }) {
    const maxAge = body?.maxAgeMinutes || 60;
    const deleted = this.chatService.clearOldSessions(maxAge);
    return {
      deleted,
      maxAgeMinutes: maxAge,
    };
  }
}
