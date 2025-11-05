import { Message } from '../../common/interfaces/message.interface';

export interface ChatSession {
  id: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}
