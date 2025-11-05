import { Message } from './message.model';

export enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  ERROR = 'error',
}

export interface ChatState {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  connectionState: ConnectionState;
  sessionId: string | null;
}

export const initialChatState: ChatState = {
  messages: [],
  isLoading: false,
  error: null,
  connectionState: ConnectionState.DISCONNECTED,
  sessionId: null,
};
