import { MessageRole } from '@common/enums/message-role.enum';

export interface AIMessage {
  role: MessageRole;
  content: string;
}

export interface AICompletionOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}
