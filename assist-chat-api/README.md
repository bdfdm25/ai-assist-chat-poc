# EstateAssist Chat API 🏠

A production-ready real estate AI assistant API built with NestJS, featuring streaming responses, circuit breaker pattern for resilience, and comprehensive error handling.

## 📋 Overview

EstateAssist is an intelligent chatbot API designed to provide expert guidance on real estate matters including property valuations, buying/selling processes, rental agreements, investment strategies, and market analysis. The API leverages OpenAI's GPT models to deliver knowledgeable, professional real estate advice through both HTTP REST endpoints and WebSocket connections.

### Key Features

- 🤖 **AI-Powered Real Estate Assistant** - Specialized in residential and commercial properties
- 🔄 **Streaming Responses** - Real-time message streaming via WebSocket and HTTP
- 🛡️ **Circuit Breaker Pattern** - Prevents cascading failures with automatic recovery
- 💬 **Session Management** - Maintains conversation context across multiple messages
- 🔐 **Type-Safe** - Built with TypeScript for enhanced reliability
- ✅ **Well-Tested** - 95 unit tests with 100% pass rate
- 📚 **Comprehensive Documentation** - JSDoc comments and architecture guides

### Tech Stack

- **Framework:** NestJS 11.x
- **Runtime:** Node.js 20.x
- **Language:** TypeScript 5.x
- **AI Provider:** OpenAI API (GPT-4 Turbo)
- **WebSocket:** Socket.IO
- **Testing:** Jest
- **Real-time:** RxJS

## 🏗️ Architecture

The project follows a clean, layered architecture with multiple design patterns:

- **Circuit Breaker Pattern** - For API resilience and failure prevention
- **Repository Pattern** - For session management and data access
- **Factory Pattern** - For consistent object creation
- **Observer Pattern** - For reactive streaming responses
- **Facade Pattern** - For simplified OpenAI API interaction
- **Strategy Pattern** - For configurable retry logic
- **Template Method Pattern** - For message processing workflow

For detailed architecture documentation, see [Architecture Guide](../docs/ARCHITECTURE.md).

## 📦 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** >= 20.0.0 (LTS recommended)
- **npm** >= 10.0.0 or **yarn** >= 1.22.0
- **OpenAI API Key** - [Get one here](https://platform.openai.com/api-keys)

## 🚀 Installation

### 1. Clone the Repository

```bash
git clone https://github.com/bdfdm25/ai-assist-chat-poc.git
cd ai-assist-chat-poc/poc-assist-chat/assist-chat-api
```

### 2. Install Dependencies

```bash
npm install
```

or with yarn:

```bash
yarn install
```

### 3. Environment Configuration

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

Edit the `.env` file with your configuration:

```env
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4-turbo-preview
OPENAI_MAX_TOKENS=1000
OPENAI_TEMPERATURE=0.7

# Server Configuration
PORT=3000
NODE_ENV=development

# Frontend Configuration (for CORS)
FRONTEND_URL=http://localhost:4200

# Circuit Breaker Configuration (Optional - has defaults)
CIRCUIT_BREAKER_FAILURE_THRESHOLD=5
CIRCUIT_BREAKER_SUCCESS_THRESHOLD=2
CIRCUIT_BREAKER_TIMEOUT=60000
```

**Important:** Replace `your_openai_api_key_here` with your actual OpenAI API key.

## 🏃 Running the Application

### Development Mode

Start the server in development mode with hot-reload:

```bash
npm run start:dev
```

The API will be available at `http://localhost:3000`

### Production Mode

Build and run the application in production mode:

```bash
# Build the application
npm run build

# Start the production server
npm run start:prod
```

### Debug Mode

Start with debugging enabled:

```bash
npm run start:debug
```

Then attach your debugger to `localhost:9229`

## 🧪 Testing

### Run All Tests

```bash
npm test
```

### Run Tests in Watch Mode

```bash
npm run test:watch
```

### Run Tests with Coverage

```bash
npm run test:cov
```

### Run E2E Tests

```bash
npm run test:e2e
```

**Test Results:**

- ✅ 95 unit tests passing
- ✅ 6 test suites
- ✅ 100% pass rate

## 📡 API Endpoints

### REST API

#### Health Check

```http
GET /health
```

#### AI Service Health

```http
GET /ai/health
```

#### Circuit Breaker Status

```http
GET /ai/circuit-breaker
```

#### Reset Circuit Breaker

```http
POST /ai/circuit-breaker/reset
```

#### Get All Sessions

```http
GET /chat/sessions
```

#### Get Session by ID

```http
GET /chat/sessions/:id
```

#### Get Session Messages

```http
GET /chat/sessions/:id/messages
```

#### Send Message (Non-Streaming)

```http
POST /chat/sessions/:id/messages
Content-Type: application/json

{
  "message": "What are the current market trends for residential properties?"
}
```

#### Delete Session

```http
DELETE /chat/sessions/:id
```

#### Cleanup Old Sessions

```http
POST /chat/cleanup
Content-Type: application/json

{
  "maxAgeMinutes": 60
}
```

### WebSocket API

Connect to the WebSocket server:

```javascript
const socket = io('http://localhost:3000', {
  transports: ['websocket', 'polling'],
});

// Listen for connection
socket.on('connected', (data) => {
  console.log('Connected:', data);
});

// Send a message
socket.emit('send-message', {
  message: 'What should I consider when buying my first investment property?',
  sessionId: 'optional-session-id',
});

// Receive message chunks (streaming)
socket.on('message-chunk', (data) => {
  console.log('Chunk:', data.chunk);
  if (data.isComplete) {
    console.log('Message complete:', data.id);
  }
});

// Handle errors
socket.on('error', (error) => {
  console.error('Error:', error);
});

// Ping/Pong for health check
socket.emit('ping');
socket.on('pong', (data) => {
  console.log('Pong:', data.timestamp);
});
```

## 📁 Project Structure

```
src/
├── ai/                           # AI Service Module
│   ├── ai.controller.ts          # AI endpoints
│   ├── ai.service.ts            # OpenAI integration
│   ├── circuit-breaker.service.ts # Circuit breaker implementation
│   ├── interfaces/               # Type definitions
│   └── enums/                    # Domain enums
│
├── chat/                         # Chat Service Module
│   ├── chat.controller.ts        # Chat endpoints
│   ├── chat.service.ts          # Session management
│   ├── dto/                      # Data transfer objects
│   └── interfaces/               # Chat-specific types
│
├── websocket/                    # WebSocket Module
│   └── gateways/
│       └── chat.gateway.ts       # WebSocket gateway
│
├── common/                       # Shared Components
│   ├── exceptions/               # Custom exceptions
│   ├── filters/                  # Exception filters
│   ├── guards/                   # Auth guards
│   ├── interceptors/            # Cross-cutting concerns
│   └── interfaces/               # Shared types
│
├── config/                       # Configuration
│   ├── configuration.ts          # App configuration
│   └── env.validation.ts         # Env validation
│
└── health/                       # Health Check Module
    ├── health.controller.ts      # Health endpoints
    └── health.module.ts          # Health module
```

## 🛠️ Development

### Code Quality

The project uses several tools to maintain code quality:

- **ESLint** - Code linting
- **Prettier** - Code formatting
- **TypeScript** - Type checking
- **Jest** - Unit testing

### Linting

```bash
# Run ESLint
npm run lint

# Auto-fix issues
npm run lint:fix
```

### Formatting

```bash
# Format code with Prettier
npm run format
```

## 🔧 Configuration

### Circuit Breaker

The circuit breaker protects against cascading failures:

- **Failure Threshold:** 5 failures trigger OPEN state
- **Success Threshold:** 2 successes close the circuit
- **Timeout:** 60 seconds before attempting reset
- **States:** CLOSED → OPEN → HALF_OPEN → CLOSED

### AI Service

- **Model:** GPT-4 Turbo Preview (configurable)
- **Max Tokens:** 1000 per response
- **Temperature:** 0.7 (balanced creativity/consistency)
- **Retry Strategy:** Exponential backoff (1s, 2s, 4s)
- **Max Retries:** 3 attempts

### Chat Service

- **Max Context Messages:** 10 messages per session
- **Session Cleanup:** 60 minutes of inactivity
- **System Prompt:** Real estate agent persona

## 🐛 Troubleshooting

### Common Issues

**1. OpenAI API Key Error**

```
Error: OpenAI API key is not configured
```

**Solution:** Ensure your `.env` file contains a valid `OPENAI_API_KEY`

**2. Port Already in Use**

```
Error: Port 3000 is already in use
```

**Solution:** Change the `PORT` in your `.env` file or kill the process using port 3000

**3. Module Not Found**

```
Error: Cannot find module '@ai/ai.service'
```

**Solution:** Run `npm install` to ensure all dependencies are installed

**4. Circuit Breaker Open**

```
Service temporarily unavailable due to repeated failures
```

**Solution:** Check OpenAI API status and your API key. Reset circuit breaker via `/ai/circuit-breaker/reset`

## 📚 Documentation

- [Architecture Guide](../docs/ARCHITECTURE.md) - Detailed architecture and design patterns

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👤 Author

**Breno Felicio**

- GitHub: [@bdfdm25](https://github.com/bdfdm25)
- Repository: [ai-assist-chat-poc](https://github.com/bdfdm25/ai-assist-chat-poc/assist-chat-api)

## 🙏 Acknowledgments

- [NestJS](https://nestjs.com/) - Progressive Node.js framework
- [OpenAI](https://openai.com/) - AI language models
- [Socket.IO](https://socket.io/) - Real-time communication
- [RxJS](https://rxjs.dev/) - Reactive programming

---

**Made with ❤️ using NestJS and OpenAI**
