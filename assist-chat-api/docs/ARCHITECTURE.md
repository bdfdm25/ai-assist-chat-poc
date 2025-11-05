# Architecture & Design Patterns Documentation

## Overview

This document describes the architecture, design patterns, and clean code principles applied in the Assist Chat API project.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Design Patterns](#design-patterns)
3. [Clean Code Principles](#clean-code-principles)
4. [Service Layer](#service-layer)
5. [Exception Handling](#exception-handling)
6. [Testing Strategy](#testing-strategy)

---

## Architecture Overview

### Layered Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Presentation Layer                    │
│  (Controllers, Gateways, DTOs, Validators)               │
├─────────────────────────────────────────────────────────┤
│                     Business Layer                       │
│  (Services, Domain Logic, Use Cases)                     │
├─────────────────────────────────────────────────────────┤
│                  Infrastructure Layer                    │
│  (External APIs, Circuit Breaker, Configuration)         │
└─────────────────────────────────────────────────────────┘
```

### Component Structure

```
src/
├── ai/                      # AI Service Domain
│   ├── ai.controller.ts     # HTTP endpoints for AI operations
│   ├── ai.service.ts        # Core AI business logic
│   ├── circuit-breaker.service.ts  # Resilience pattern
│   ├── interfaces/          # Type definitions
│   └── enums/              # Domain enums
│
├── chat/                    # Chat Service Domain
│   ├── chat.controller.ts   # HTTP endpoints for chat
│   ├── chat.service.ts      # Chat session management
│   └── interfaces/          # Chat-specific types
│
├── websocket/               # Real-time Communication
│   └── gateways/
│       └── chat.gateway.ts  # WebSocket gateway
│
└── common/                  # Shared Components
    ├── exceptions/          # Custom exceptions
    ├── filters/             # Exception filters
    ├── guards/              # Authentication/Authorization
    ├── interceptors/        # Cross-cutting concerns
    └── interfaces/          # Shared types
```

---

## Design Patterns

### 1. Circuit Breaker Pattern

**Location:** `src/ai/circuit-breaker.service.ts`

**Purpose:** Prevents cascading failures by monitoring and temporarily blocking requests when a threshold is reached.

**States:**

- **CLOSED:** Normal operation, requests pass through
- **OPEN:** Failure threshold reached, requests rejected immediately
- **HALF_OPEN:** Testing service recovery, allows limited requests

**Implementation:**

```typescript
class CircuitBreakerService {
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (this.shouldAttemptReset()) {
        this.transitionToHalfOpen();
      } else {
        throw new CircuitBreakerOpenException();
      }
    }
    // Execute with failure/success tracking
  }
}
```

**Configuration:**

- Failure Threshold: 5 consecutive failures
- Success Threshold: 2 successes in HALF_OPEN
- Timeout: 60 seconds

**Benefits:**

- Prevents cascade failures
- Gives failing services time to recover
- Provides fast-fail behavior
- Enables graceful degradation

---

### 2. Repository Pattern

**Location:** `src/chat/chat.service.ts`

**Purpose:** Abstracts data storage and retrieval, allowing easy switching between in-memory and database storage.

**Implementation:**

```typescript
class ChatService {
  private readonly sessions = new Map<string, ChatSession>();

  getSession(sessionId: string): ChatSession | undefined {
    return this.sessions.get(sessionId);
  }

  getAllSessions(): ChatSession[] {
    return Array.from(this.sessions.values());
  }
}
```

**Benefits:**

- Decouples business logic from storage mechanism
- Easy to test with mock repositories
- Can switch to database without changing business logic
- Centralized data access logic

---

### 3. Factory Pattern

**Location:** `src/chat/chat.service.ts`

**Purpose:** Centralize object creation with consistent initialization.

**Implementation:**

```typescript
class ChatService {
  private createMessage(
    role: MessageRole,
    content: string,
    sessionId: string,
    id?: string,
  ): Message {
    return {
      id: id || randomUUID(),
      role,
      content,
      timestamp: new Date(),
      sessionId,
    };
  }

  private createSession(): string {
    const sessionId = randomUUID();
    const session: ChatSession = {
      id: sessionId,
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.sessions.set(sessionId, session);
    return sessionId;
  }
}
```

**Benefits:**

- Consistent object creation
- Encapsulates creation logic
- Easy to modify initialization logic
- Reduces code duplication

---

### 4. Observer Pattern

**Location:** `src/ai/ai.service.ts`, `src/chat/chat.service.ts`

**Purpose:** Enable streaming responses using RxJS Observables.

**Implementation:**

```typescript
class AIService {
  streamCompletion(messages: Message[]): Observable<string> {
    const stream = new Subject<string>();

    // Emit chunks as they arrive
    for await (const chunk of completion) {
      stream.next(chunk.content);
    }

    stream.complete();
    return stream.asObservable();
  }
}
```

**Benefits:**

- Real-time data streaming
- Reactive programming model
- Easy to compose and transform streams
- Backpressure handling

---

### 5. Facade Pattern

**Location:** `src/ai/ai.service.ts`

**Purpose:** Simplifies OpenAI API interaction by providing a clean interface.

**Implementation:**

```typescript
class AIService {
  // Simple interface hiding complex OpenAI SDK
  streamCompletion(messages: Message[]): Observable<string> {
    // Hides: API key management, error handling,
    // retry logic, circuit breaker integration
  }

  generateCompletion(messages: Message[]): Promise<string> {
    // Simplified non-streaming interface
  }
}
```

**Benefits:**

- Simplified API surface
- Hides complex subsystem interactions
- Easy to swap AI providers
- Centralized configuration

---

### 6. Strategy Pattern

**Location:** `src/ai/ai.service.ts` (Retry Strategy)

**Purpose:** Encapsulate different retry strategies with exponential backoff.

**Implementation:**

```typescript
class AIService {
  private calculateRetryDelay(attempt: number): number {
    // Exponential backoff: 1s, 2s, 4s, capped at 10s
    return Math.min(1000 * Math.pow(2, attempt - 1), 10000);
  }

  private async streamWithRetry(
    messages: AIMessage[],
    stream: Subject<string>,
    attempt: number = 1,
  ): Promise<void> {
    try {
      await this.executeStream(messages, stream);
    } catch (error) {
      if (attempt < this.config.maxRetries) {
        const delay = this.calculateRetryDelay(attempt);
        await this.sleep(delay);
        return this.streamWithRetry(messages, stream, attempt + 1);
      }
      throw error;
    }
  }
}
```

**Benefits:**

- Flexible retry strategies
- Easy to modify backoff algorithm
- Testable retry logic
- Configurable behavior

---

### 7. Template Method Pattern

**Location:** `src/chat/chat.service.ts`

**Purpose:** Define the skeleton of message processing algorithm.

**Implementation:**

```typescript
class ChatService {
  async processMessage(
    messageContent: string,
    sessionId?: string,
  ): Promise<ProcessedMessage> {
    // 1. Session retrieval/creation
    const actualSessionId = sessionId || this.createSession();
    const session = this.getOrCreateSession(actualSessionId);

    // 2. User message creation and storage
    const userMessage = this.createMessage(
      MessageRole.USER,
      messageContent,
      actualSessionId,
    );
    session.messages.push(userMessage);

    // 3. Context building
    const context = this.buildConversationContext(session);

    // 4. AI response generation
    // 5. Assistant message storage
    // 6. Return stream
  }
}
```

**Benefits:**

- Consistent processing workflow
- Easy to extend steps
- Clear separation of concerns
- Testable individual steps

---

## Clean Code Principles

### 1. Single Responsibility Principle (SRP)

Each class has one reason to change:

- **CircuitBreakerService:** Only handles circuit breaker logic
- **AIService:** Only handles AI completion requests
- **ChatService:** Only handles chat session management
- **ChatGateway:** Only handles WebSocket communication

### 2. Open/Closed Principle (OCP)

Classes are open for extension but closed for modification:

- **CircuitBreakerService:** Configurable via constructor parameters
- **AIService:** Can extend to support multiple AI providers
- **Exception Hierarchy:** Easy to add new exception types

### 3. Liskov Substitution Principle (LSP)

Subtypes are substitutable for base types:

- All custom exceptions extend appropriate base classes
- Exception hierarchy maintains consistent behavior

### 4. Interface Segregation Principle (ISP)

Clients aren't forced to depend on unused interfaces:

- Separate interfaces for different concerns
- DTOs are minimal and focused

### 5. Dependency Inversion Principle (DIP)

Depend on abstractions, not concretions:

- Services depend on ConfigService interface
- Circuit breaker can be injected as dependency
- Easy to mock dependencies in tests

---

## Service Layer

### AIService

**Responsibilities:**

- OpenAI API integration
- Streaming and non-streaming completions
- Token estimation and context management
- Error handling and retry logic
- Circuit breaker integration

**Key Methods:**

```typescript
// Streaming completion
streamCompletion(messages: Message[]): Observable<string>

// Non-streaming completion
generateCompletion(messages: Message[]): Promise<string>

// Utility methods
estimateTokens(text: string): number
fitToContextWindow(messages: Message[], maxTokens: number): Message[]
```

**Error Handling:**

- `AIRateLimitException`: Rate limit exceeded (429)
- `AIAuthenticationException`: Auth failed (401)
- `AIUnexpectedErrorException`: Other API errors

---

### ChatService

**Responsibilities:**

- Session management
- Message processing workflow
- Context window management
- System prompt injection

**Key Methods:**

```typescript
// Process user message
processMessage(messageContent: string, sessionId?: string): Promise<ProcessedMessage>

// Session management
getSession(sessionId: string): ChatSession | undefined
getAllSessions(): ChatSession[]
deleteSession(sessionId: string): boolean
clearOldSessions(maxAgeMinutes: number): number
```

**Configuration:**

- Max Context Messages: 10
- Max Session Age: 60 minutes

---

### CircuitBreakerService

**Responsibilities:**

- Monitor operation failures
- Prevent cascade failures
- Automatic recovery testing

**Key Methods:**

```typescript
// Execute with protection
execute<T>(fn: () => Promise<T>): Promise<T>

// Monitoring
getState(): CircuitState
getStats(): CircuitBreakerStats

// Manual control
reset(): void
```

---

## Exception Handling

### Exception Hierarchy

```
Error
├── HttpException (NestJS)
│   ├── CircuitBreakerOpenException (503)
│   ├── CircuitBreakerTimeoutException (408)
│   └── AIServiceException (500)
│       ├── AIRateLimitException (429)
│       ├── AIAuthenticationException (401)
│       ├── AIConfigurationException (500)
│       └── AIUnexpectedErrorException (502)
│
└── ChatServiceException
    ├── SessionNotFoundException
    ├── InvalidMessageException
    └── MessageProcessingException
```

### Benefits

1. **Specific Error Types:** Clear indication of what went wrong
2. **Appropriate HTTP Status:** Correct status codes for REST API
3. **Detailed Messages:** Helpful error information for debugging
4. **Type Safety:** TypeScript type checking for error handling

---

## Testing Strategy

### Unit Tests

**Coverage:** All services, controllers, and utilities

**Approach:**

- Mock external dependencies
- Test individual methods in isolation
- Verify error handling paths
- Test edge cases and boundary conditions

**Example:**

```typescript
describe('CircuitBreakerService', () => {
  describe('CLOSED state', () => {
    it('should execute function successfully');
    it('should count failures');
    it('should open after threshold');
  });

  describe('OPEN state', () => {
    it('should reject immediately');
    it('should not call function');
    it('should transition to HALF_OPEN after timeout');
  });
});
```

### Integration Tests

**Coverage:** End-to-end workflows

**Approach:**

- Test complete request/response cycles
- Verify WebSocket communication
- Test error propagation
- Verify circuit breaker integration

---

## Configuration

### Environment Variables

```bash
# OpenAI Configuration
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4-turbo-preview
OPENAI_MAX_TOKENS=1000
OPENAI_TEMPERATURE=0.7

# Server Configuration
PORT=3000
FRONTEND_URL=http://localhost:4200

# Circuit Breaker Configuration (optional, has defaults)
CIRCUIT_BREAKER_FAILURE_THRESHOLD=5
CIRCUIT_BREAKER_SUCCESS_THRESHOLD=2
CIRCUIT_BREAKER_TIMEOUT=60000
```

### Configuration Management

- Centralized in `src/config/configuration.ts`
- Validated using `class-validator`
- Type-safe access via ConfigService
- Environment-specific overrides

---

## Performance Optimizations

### 1. Streaming Responses

- Reduces time-to-first-byte
- Better user experience for long responses
- Memory efficient for large completions

### 2. Circuit Breaker

- Fast-fail for unavailable services
- Reduces unnecessary API calls
- Prevents resource exhaustion

### 3. Context Window Management

- Limits tokens sent to API
- Reduces API costs
- Maintains conversation relevance

### 4. Exponential Backoff

- Intelligent retry strategy
- Reduces server load during failures
- Increases success rate for transient errors

---

## Security Considerations

### 1. API Key Management

- Never exposed in client code
- Stored in environment variables
- Not logged or transmitted

### 2. Input Validation

- DTO validation using `class-validator`
- Type checking at compile time
- Sanitization of user inputs

### 3. Rate Limiting

- Handles OpenAI rate limits gracefully
- Circuit breaker prevents abuse
- Configurable retry attempts

### 4. Error Messages

- Don't expose sensitive information
- Generic messages for clients
- Detailed logs for debugging

---

## Future Improvements

### Potential Enhancements

1. **Database Integration**
   - Replace in-memory session storage
   - Persist conversation history
   - Support for multiple instances

2. **Authentication & Authorization**
   - User authentication
   - Session ownership
   - Role-based access control

3. **Caching Layer**
   - Cache frequent queries
   - Reduce API calls
   - Improve response times

4. **Monitoring & Observability**
   - Metrics collection (Prometheus)
   - Distributed tracing (Jaeger)
   - Centralized logging (ELK Stack)

5. **Multiple AI Providers**
   - Abstract AI provider interface
   - Support for multiple models
   - Provider fallback strategy

6. **Advanced Features**
   - Conversation branching
   - Message editing
   - Context-aware suggestions
   - Conversation summaries

---

## Code Quality Metrics

### Metrics to Track

- **Test Coverage:** >80% for critical paths
- **Cyclomatic Complexity:** <10 per function
- **Lines per Function:** <50 lines
- **Class Size:** <300 lines
- **Dependency Depth:** <4 levels

### Tools

- **ESLint:** Code linting
- **Prettier:** Code formatting
- **Jest:** Unit testing
- **TypeScript:** Type checking
- **SonarQube:** Code quality analysis (optional)
