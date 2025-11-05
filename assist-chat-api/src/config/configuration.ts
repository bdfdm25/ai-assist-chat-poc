export default () => ({
  port: parseInt(process.env.API_PORT || '3000'),
  nodeEnv: process.env.NODE_ENV || 'development',
  frontendUrl: process.env.APP || 'http://localhost:4200',
  
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
    maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '1000'),
    temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.7'),
  },
  
  throttle: {
    ttl: parseInt(process.env.THROTTLE_TTL || '60'),
    limit: parseInt(process.env.THROTTLE_LIMIT || '10'),
  },
  
  websocket: {
    cors: {
      origin: process.env.APP || 'http://localhost:4200',
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  },
});