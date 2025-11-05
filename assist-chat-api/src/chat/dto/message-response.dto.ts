import { MessageRole } from '@common/enums/message-role.enum';

export class MessageResponseDto {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  sessionId?: string;
}
