export interface AIResponse {
  content: string;
  tokensUsed?: number;
  model?: string;
  finishReason?: string;
}