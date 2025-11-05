# Assist Chat App - Frontend

A modern, real-time chat application built with Angular 19 that provides an interactive interface for real estate assistance powered by AI. This application connects to the Assist Chat API backend to deliver streaming AI responses through WebSocket connections.

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Running the Application](#running-the-application)
- [Testing](#testing)
- [Project Structure](#project-structure)
- [Key Technologies](#key-technologies)
- [Configuration](#configuration)
- [Architecture](#architecture)
- [Troubleshooting](#troubleshooting)

## 🎯 Overview

The Assist Chat App is a responsive, real-time chat interface designed for real estate inquiries. It features a clean, modern UI with streaming responses, connection status indicators, and markdown support for rich content display.

**Live Demo:** Connect to backend running on `http://localhost:3000`

## ✨ Features

- **Real-time Streaming Responses** - AI responses stream in real-time as they're generated
- **WebSocket Communication** - Persistent connection with automatic reconnection
- **Connection Status Indicator** - Visual feedback for connection state
- **Markdown Support** - Rich text formatting in chat messages using marked.js
- **Signal-based State Management** - Reactive state updates using Angular Signals
- **Responsive Design** - Mobile-first design with Tailwind CSS
- **Message History** - Persistent conversation within session
- **Error Handling** - User-friendly error messages with retry capability
- **Accessibility** - Semantic HTML and ARIA attributes
- **Dark Mode Ready** - Styled for dark theme preferences

## 🛠 Tech Stack

- **Framework:** Angular 19.2.0 (Standalone Components)
- **Language:** TypeScript 5.7.2
- **Styling:** Tailwind CSS 3.4.18
- **Real-time:** Socket.IO Client 4.8.1
- **Markdown:** Marked 16.4.1
- **Testing:** Jest 29.7.0 with jest-preset-angular
- **Build Tool:** Angular CLI 19.2.15

## 📦 Prerequisites

Before running this application, ensure you have:

- **Node.js**: Version 18.14.x or higher (23.9.x recommended)
- **npm**: Version 9.x or higher (comes with Node.js)
- **Backend API**: The [Assist Chat API](../assist-chat-api) running on `http://localhost:3000`
- **Git**: For cloning the repository

### Verify Prerequisites

```bash
node --version    # Should be v18.14.x or higher
npm --version     # Should be 9.x or higher
```

## 🚀 Installation

### 1. Clone the Repository

```bash
git clone https://github.com/bdfdm25/ai-assist-chat-poc.git
cd ai-assist-chat-poc/assist-chat-app
```

### 2. Install Dependencies

```bash
npm install
```

This will install all required dependencies including:

- Angular framework and core libraries
- Socket.IO client for WebSocket connections
- Tailwind CSS for styling
- Marked for markdown rendering
- Jest for testing

**Note:** If you encounter peer dependency warnings, this is normal due to Angular 19 being newer than some dependencies expect.

### 3. Environment Configuration

The application is configured to connect to the backend at `http://localhost:3000` by default.

To change the backend URL, update:

```typescript
// src/environments/environment.ts
export const environment = {
  production: false,
  apiUrl: "http://localhost:3000", // Change this if needed
};
```

## 🏃‍♂️ Running the Application

### Development Server

Start the development server with live reload:

```bash
npm start
```

The application will be available at:

- **URL:** `http://localhost:4200`
- **Auto-reload:** Enabled (changes trigger automatic reload)

### Production Build

Build the application for production:

```bash
npm run build
```

Built files will be in the `dist/` directory. These files are optimized and minified for production deployment.

### Watch Mode

Build and watch for changes:

```bash
npm run watch
```

Useful for development alongside manual testing or integration with other tools.

## 🧪 Testing

The project uses Jest for unit testing with comprehensive test coverage.

### Run Tests

```bash
# Run all tests once
npm test

# Run tests in watch mode (auto-rerun on changes)
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

### Test Results

Current test metrics:

- **Total Tests:** 64 passing
- **Test Suites:** 6 passed
- **Coverage:** 82% overall
  - Services: 93% coverage
  - Components: 70-100% coverage

### Test Files

- `src/app/core/services/websocket.service.spec.ts` - WebSocket connection tests
- `src/app/core/services/chat.service.spec.ts` - Chat state management tests
- `src/app/features/chat/components/**/*.spec.ts` - Component tests

## 📁 Project Structure

```
assist-chat-app/
├── src/
│   ├── app/
│   │   ├── core/                      # Core functionality
│   │   │   ├── models/                # TypeScript interfaces and models
│   │   │   │   ├── chat-state.model.ts
│   │   │   │   └── message.model.ts
│   │   │   └── services/              # Business logic services
│   │   │       ├── chat.service.ts    # Chat state management
│   │   │       └── websocket.service.ts # WebSocket connection
│   │   ├── features/                  # Feature modules
│   │   │   └── chat/                  # Chat feature
│   │   │       ├── chat.component.ts  # Main chat container
│   │   │       └── components/        # Child components
│   │   │           ├── message-input/
│   │   │           ├── message-list/
│   │   │           └── message-item/
│   │   ├── app.component.ts           # Root component
│   │   ├── app.config.ts              # App configuration
│   │   └── app.routes.ts              # Routing configuration
│   ├── environments/                  # Environment configs
│   ├── index.html                     # Entry HTML
│   ├── main.ts                        # Bootstrap file
│   └── styles.css                     # Global styles
├── jest.config.js                     # Jest configuration
├── setup-jest.ts                      # Jest setup file
├── tailwind.config.js                 # Tailwind CSS config
├── tsconfig.json                      # TypeScript config
├── package.json                       # Dependencies
└── README.md                          # This file
```

## 🔑 Key Technologies

### Angular Signals

Modern reactive state management:

```typescript
// Readable signals
messages = this.messagesSignal.asReadonly();
isLoading = this.isLoadingSignal.asReadonly();

// Computed signals
hasMessages = computed(() => this.messages().length > 0);
isStreaming = computed(() => this.streamingMessageIdSignal() !== null);
```

### WebSocket with Socket.IO

Real-time bi-directional communication:

```typescript
// Auto-connecting service
this.wsService.messageChunk$.subscribe((chunk) => {
  this.handleMessageChunk(chunk);
});

// Automatic reconnection with exponential backoff
// Connection state tracking via signals
```

### Standalone Components

No NgModules required:

```typescript
@Component({
  selector: "app-chat",
  standalone: true,
  imports: [CommonModule, MessageListComponent, MessageInputComponent],
  templateUrl: "./chat.component.html",
})
export class ChatComponent {}
```

### Tailwind CSS

Utility-first styling:

```html
<div class="flex flex-col h-screen bg-gray-900">
  <div class="flex-1 overflow-y-auto p-4 space-y-4">
    <!-- Messages -->
  </div>
</div>
```

## ⚙️ Configuration

### API Endpoint

Configure the backend API URL in environment files:

```typescript
// src/environments/environment.ts (development)
export const environment = {
  production: false,
  apiUrl: "http://localhost:3000",
};

// src/environments/environment.prod.ts (production)
export const environment = {
  production: true,
  apiUrl: "https://your-production-api.com",
};
```

### WebSocket Configuration

WebSocket settings in `websocket.service.ts`:

```typescript
this.socket = io(environment.apiUrl, {
  transports: ["websocket", "polling"], // Fallback to polling if needed
  reconnection: false, // Manual reconnection control
  timeout: 10000, // 10 second timeout
});
```

### Reconnection Settings

```typescript
private readonly maxReconnectAttempts = 5;     // Max reconnection attempts
private reconnectDelay = 1000;                  // Initial delay: 1 second
// Exponential backoff: 1s, 2s, 4s, 8s, 16s
```

## 🏗 Architecture

### State Management Flow

```
User Action (sendMessage)
    ↓
ChatService updates signals
    ↓
WebSocketService emits message
    ↓
Backend processes request
    ↓
WebSocket receives chunks
    ↓
ChatService updates message signals
    ↓
Components react to signal changes
    ↓
UI updates automatically
```

### Component Hierarchy

```
AppComponent
  └── ChatComponent
      ├── ConnectionStatusComponent (inline)
      ├── MessageListComponent
      │   └── MessageItemComponent (repeated)
      └── MessageInputComponent
```

### Service Layer

- **WebSocketService**: Manages WebSocket connection, reconnection, and raw message handling
- **ChatService**: Business logic for chat state, message management, and streaming

### Data Flow

1. User types message → MessageInputComponent
2. Component calls ChatService.sendMessage()
3. ChatService updates local state (user message)
4. ChatService calls WebSocketService.sendMessage()
5. WebSocketService emits via Socket.IO
6. Backend processes and streams response
7. WebSocketService receives chunks
8. ChatService updates assistant message
9. Components automatically re-render via signals

## 🐛 Troubleshooting

### Cannot Connect to Backend

**Problem:** "Not connected to server" or "Connection error"

**Solutions:**

1. Verify backend is running: `curl http://localhost:3000/health`
2. Check backend logs for errors
3. Ensure no firewall blocking port 3000
4. Verify `environment.apiUrl` is correct
5. Check browser console for CORS errors

### Build Errors

**Problem:** TypeScript compilation errors

**Solutions:**

```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear Angular cache
rm -rf .angular/cache

# Rebuild
npm start
```

### Test Failures

**Problem:** Jest tests failing

**Solutions:**

```bash
# Clear Jest cache
npx jest --clearCache

# Reinstall test dependencies
npm install --save-dev jest @types/jest jest-preset-angular

# Run tests with verbose output
npm test -- --verbose
```

### Socket Connection Issues

**Problem:** WebSocket disconnects frequently

**Solutions:**

1. Check network stability
2. Review backend WebSocket configuration
3. Verify no proxy blocking WebSocket connections
4. Check browser console for connection errors
5. Backend should support CORS for Socket.IO

### Styling Not Applied

**Problem:** Tailwind CSS classes not working

**Solutions:**

```bash
# Rebuild Tailwind
npm run build

# Check tailwind.config.js includes correct paths
# Verify styles.css imports Tailwind directives
```

## 📝 Development Workflow

### Adding a New Feature

1. Create feature component:

   ```bash
   ng generate component features/your-feature
   ```

2. Add service if needed:

   ```bash
   ng generate service core/services/your-service
   ```

3. Update routes in `app.routes.ts`

4. Write tests alongside implementation

5. Update documentation

### Code Style

- Use TypeScript strict mode
- Follow Angular style guide
- Use signals for reactive state
- Prefer standalone components
- Write unit tests for services and components
- Use meaningful variable names
- Add JSDoc comments for public APIs

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👤 Author

**Breno Felicio**

- GitHub: [@bdfdm25](https://github.com/bdfdm25)
- Repository: [ai-assist-chat-poc](https://github.com/bdfdm25/ai-assist-chat-poc/assist-chat-app)

## 🔗 Related Documentation

- [Backend API Documentation](../assist-chat-api/README.md)
- [Angular Documentation](https://angular.dev)
- [Socket.IO Client Documentation](https://socket.io/docs/v4/client-api/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

---

## Quick Start Summary

```bash
# 1. Install dependencies
npm install

# 2. Start development server
npm start

# 3. Open browser
# Navigate to http://localhost:4200

# 4. Run tests (optional)
npm test

# 5. Build for production (optional)
npm run build
```

**Note:** Ensure the [backend API](../assist-chat-api) is running before starting the frontend application.
