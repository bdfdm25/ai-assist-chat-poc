import { MessageRole } from '@common/enums/message-role.enum';

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  sessionId?: string;
}
