export enum MessageRole {
  USER = 'user',
  ASSISTANT = 'assistant',
  SYSTEM = 'system',
}

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
  sessionId?: string;
}

export interface MessageChunk {
  id: string;
  chunk: string;
  isComplete: boolean;
}
