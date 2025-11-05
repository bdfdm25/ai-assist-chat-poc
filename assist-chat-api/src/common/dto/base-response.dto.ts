export class BaseResponseDto<T> {
  data: T;
  statusCode: number;
  timestamp: string;
  message?: string;

  constructor(data: T, message?: string) {
    this.data = data;
    this.statusCode = 200;
    this.timestamp = new Date().toISOString();
    this.message = message;
  }
}
