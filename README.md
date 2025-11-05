# 🤖 AI Assist Chat - PoC

A modern, real-time AI chat application built with NestJS and Angular, featuring WebSocket communication, streaming responses, and circuit breaker patterns for resilient AI integration.

[![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=flat&logo=nestjs&logoColor=white)](https://nestjs.com/)
[![Angular](https://img.shields.io/badge/Angular-DD0031?style=flat&logo=angular&logoColor=white)](https://angular.io/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat&logo=docker&logoColor=white)](https://www.docker.com/)
[![OpenAI](https://img.shields.io/badge/OpenAI-412991?style=flat&logo=openai&logoColor=white)](https://openai.com/)

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Quick Start with Docker](#quick-start-with-docker)
- [Local Development Setup](#local-development-setup)
- [Project Structure](#project-structure)
- [API Documentation](#api-documentation)
- [Testing](#testing)
- [Configuration](#configuration)
- [Troubleshooting](#troubleshooting)
- [License](#license)

---

## 🎯 Overview

This proof-of-concept demonstrates a production-ready AI chat application with:

- **Real-time Communication**: WebSocket-based chat with streaming AI responses
- **Resilient Architecture**: Circuit breaker pattern for AI service fault tolerance
- **Modern Frontend**: Angular 19 with Signals for reactive state management
- **Enterprise Backend**: NestJS with comprehensive error handling and monitoring
- **Clean Code**: Refactored codebase following SOLID principles and design patterns
- **Comprehensive Testing**: 82% code coverage with Jest

## ✨ Features

### Frontend (Angular)

- 🔄 **Real-time Chat**: Instant message delivery via WebSocket
- 📝 **Streaming Responses**: Token-by-token AI response streaming
- 🎨 **Modern UI**: Tailwind CSS with responsive design
- ⚡ **Reactive State**: Angular Signals for optimal performance
- 🔌 **Auto-reconnection**: Exponential backoff reconnection strategy
- 📱 **Responsive Design**: Mobile-first approach
- ♿ **Accessibility**: WCAG compliant components
- 🧪 **Well Tested**: 64 passing tests with 82% coverage

### Backend (NestJS)

- 🤖 **OpenAI Integration**: GPT-4 powered conversations
- 🛡️ **Circuit Breaker**: Automatic failure detection and recovery
- 🚦 **Rate Limiting**: Request throttling to prevent abuse
- 📊 **Health Checks**: Comprehensive system monitoring
- 🔒 **CORS Protection**: Secure cross-origin resource sharing
- 📝 **Structured Logging**: Interceptor-based request/response logging
- 🎯 **DTO Validation**: Class-validator for input validation
- 🧪 **Unit Tested**: Extensive test coverage

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Client (Browser)                     │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │            Angular App (Port 4200)                    │  │
│  │                                                       │  │
│  │  - ChatComponent (Container)                         │  │
│  │  - MessageList/Input/Item (Presenters)              │  │
│  │  - ChatService (Facade)                             │  │
│  │  - WebSocketService (Communication)                  │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ WebSocket (Socket.IO)
                            │ HTTP
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    NestJS API (Port 3000)                    │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                  WebSocket Gateway                    │  │
│  │         (Real-time Message Streaming)                │  │
│  └──────────────────────────────────────────────────────┘  │
│                            │                                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                    Chat Service                       │  │
│  │         (Business Logic & Orchestration)             │  │
│  └──────────────────────────────────────────────────────┘  │
│                            │                                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                    AI Service                         │  │
│  │         (OpenAI Integration & Streaming)             │  │
│  └──────────────────────────────────────────────────────┘  │
│                            │                                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Circuit Breaker Service                  │  │
│  │         (Fault Tolerance & Resilience)               │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTPS
                            ▼
                  ┌─────────────────┐
                  │   OpenAI API    │
                  │   (GPT-4)       │
                  └─────────────────┘
```

### Design Patterns Implemented

**Frontend**:

- Container/Presenter Pattern
- Facade Pattern
- Observer Pattern
- Strategy Pattern
- Factory Pattern
- Repository Pattern

**Backend**:

- Circuit Breaker Pattern
- Repository Pattern
- Factory Pattern
- Decorator Pattern (NestJS)
- Strategy Pattern
- Observer Pattern

## 🛠️ Tech Stack

### Frontend

| Technology       | Version | Purpose              |
| ---------------- | ------- | -------------------- |
| Angular          | 19.2.0  | Framework            |
| TypeScript       | 5.7.2   | Language             |
| RxJS             | 7.8.0   | Reactive Programming |
| Socket.IO Client | 4.8.1   | WebSocket Client     |
| Tailwind CSS     | 3.4.18  | Styling              |
| Jest             | 29.7.0  | Testing              |
| Marked           | 16.4.1  | Markdown Rendering   |

### Backend

| Technology      | Version | Purpose          |
| --------------- | ------- | ---------------- |
| NestJS          | 11.0.1  | Framework        |
| TypeScript      | 5.7.3   | Language         |
| Socket.IO       | 4.8.1   | WebSocket Server |
| OpenAI SDK      | 6.7.0   | AI Integration   |
| Class Validator | 0.14.2  | Input Validation |
| Jest            | 29.7.0  | Testing          |

### DevOps

| Technology     | Version   | Purpose                    |
| -------------- | --------- | -------------------------- |
| Docker         | Latest    | Containerization           |
| Docker Compose | 3.8       | Multi-container Management |
| Nginx          | Alpine    | Frontend Serving           |
| Node.js        | 20 Alpine | Runtime                    |

---

## 📦 Prerequisites

### For Docker Setup (Recommended)

- **Docker**: Version 20.10 or higher
- **Docker Compose**: Version 2.0 or higher
- **OpenAI API Key**: Get one at [OpenAI Platform](https://platform.openai.com/)

### For Local Development

- **Node.js**: Version 20.x LTS
- **npm**: Version 10.x or higher
- **OpenAI API Key**: Get one at [OpenAI Platform](https://platform.openai.com/)

### Verify Installations

```bash
# Docker
docker --version          # Should be 20.10+
docker-compose --version  # Should be 2.0+

# Node.js (for local development)
node --version            # Should be v20.x
npm --version             # Should be 10.x+
```

---

## 🚀 Quick Start with Docker

The easiest way to run the entire application stack is using Docker Compose.

### Step 1: Clone the Repository

```bash
git clone <repository-url>
cd poc-assist-chat
```

### Step 2: Set Up Environment Variables

```bash
# Copy the example environment file
cp .env.example .env

# Edit the .env file and add your OpenAI API key
nano .env  # or use your preferred editor
```

**Required Environment Variable**:

```env
OPENAI_API_KEY=sk-your-actual-openai-api-key-here
```

### Step 3: Build and Start Services

```bash
# Build and start all services
docker-compose up --build

# Or run in detached mode (background)
docker-compose up -d --build
```

### Step 4: Access the Application

- **Frontend**: http://localhost:4200
- **Backend API**: http://localhost:3000
- **Health Check**: http://localhost:3000/health

### Step 5: Stop Services

```bash
# Stop services (keeps containers)
docker-compose stop

# Stop and remove containers
docker-compose down

# Stop and remove containers + volumes
docker-compose down -v
```

### Docker Commands Reference

```bash
# View logs
docker-compose logs              # All services
docker-compose logs api          # API only
docker-compose logs app          # Frontend only
docker-compose logs -f           # Follow logs in real-time

# Restart services
docker-compose restart           # All services
docker-compose restart api       # API only

# Check service status
docker-compose ps

# Rebuild after code changes
docker-compose up --build

# Remove everything (clean slate)
docker-compose down --rmi all --volumes
```

---

## 💻 Local Development Setup

For development with hot-reloading and debugging capabilities.

### Backend API Setup

```bash
# Navigate to API directory
cd assist-chat-api

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env and add your OpenAI API key
nano .env

# Start development server (with hot-reload)
npm run start:dev

# API will be available at http://localhost:3000
```

### Frontend App Setup

```bash
# Open a new terminal
cd assist-chat-app

# Install dependencies
npm install

# Start development server
npm start

# App will be available at http://localhost:4200
```

### Development Scripts

#### Backend (assist-chat-api)

```bash
npm run start          # Start production
npm run start:dev      # Start with hot-reload
npm run start:debug    # Start with debugging
npm run build          # Build for production
npm run test           # Run tests
npm run test:watch     # Run tests in watch mode
npm run test:cov       # Run tests with coverage
npm run lint           # Lint code
npm run format         # Format code with Prettier
```

#### Frontend (assist-chat-app)

```bash
npm start              # Start dev server
npm run build          # Build for production
npm run watch          # Build and watch for changes
npm test               # Run tests
npm run test:watch     # Run tests in watch mode
npm run test:coverage  # Run tests with coverage
```

---

## 📁 Project Structure

```
poc-assist-chat/
├── assist-chat-api/              # NestJS Backend
│   ├── src/
│   │   ├── ai/                   # AI Service & Circuit Breaker
│   │   │   ├── ai.service.ts
│   │   │   ├── circuit-breaker.service.ts
│   │   │   ├── enums/
│   │   │   └── interfaces/
│   │   ├── chat/                 # Chat Module
│   │   │   ├── chat.service.ts
│   │   │   ├── chat.controller.ts
│   │   │   └── dto/
│   │   ├── websocket/            # WebSocket Gateway
│   │   │   ├── gateways/
│   │   │   └── adapters/
│   │   ├── common/               # Shared Resources
│   │   │   ├── filters/
│   │   │   ├── interceptors/
│   │   │   ├── guards/
│   │   │   └── exceptions/
│   │   ├── config/               # Configuration
│   │   ├── health/               # Health Checks
│   │   └── main.ts
│   ├── test/                     # E2E Tests
│   ├── docs/                     # API Documentation
│   ├── Dockerfile
│   ├── .env.example
│   └── package.json
│
├── assist-chat-app/              # Angular Frontend
│   ├── src/
│   │   ├── app/
│   │   │   ├── core/             # Services & Models
│   │   │   │   ├── services/
│   │   │   │   │   ├── websocket.service.ts
│   │   │   │   │   └── chat.service.ts
│   │   │   │   └── models/
│   │   │   ├── features/         # Feature Modules
│   │   │   │   └── chat/
│   │   │   │       ├── chat.component.ts
│   │   │   │       └── components/
│   │   │   │           ├── message-list/
│   │   │   │           ├── message-input/
│   │   │   │           └── message-item/
│   │   │   └── shared/           # Shared Components
│   │   └── environments/         # Environment Config
│   ├── coverage/                 # Test Coverage Reports
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── README.md                 # Frontend Documentation
│   ├── TESTING.md                # Testing Documentation
│   ├── REFACTORING_SUMMARY.md    # Refactoring Details
│   └── package.json
│
├── docker-compose.yml            # Docker Compose Configuration
├── .env.example                  # Environment Variables Template
├── .gitignore                    # Git Ignore Rules
└── README.md                     # This file
```

---

## 📚 API Documentation

### WebSocket Events

#### Client → Server

**`sendMessage`**

```typescript
{
  content: string;      // Message content
  sessionId?: string;   // Optional session identifier
}
```

#### Server → Client

**`messageChunk`**

```typescript
{
  content: string; // Partial response content
  sessionId: string; // Session identifier
  isComplete: boolean; // Whether response is complete
  timestamp: number; // Unix timestamp
}
```

**`error`**

```typescript
{
  message: string;      // Error message
  code?: string;        // Error code
  timestamp: number;    // Unix timestamp
}
```

### REST Endpoints

**Health Check**

```bash
GET /health
Response: { status: 'ok', info: {...}, error: {}, details: {...} }
```

---

## 🧪 Testing

### Run All Tests

```bash
# Backend tests
cd assist-chat-api
npm test                # Run all tests
npm run test:watch      # Watch mode
npm run test:cov        # With coverage

# Frontend tests
cd assist-chat-app
npm test                # Run all tests
npm run test:watch      # Watch mode
npm run test:coverage   # With coverage
```

### Test Coverage

**Frontend Coverage**: 82%

- Services: 93%
- Components: 70-100%
- 64 tests passing

**Backend Coverage**: Comprehensive unit tests for:

- AI Service
- Circuit Breaker
- Chat Service
- Controllers
- Filters and Interceptors

### View Coverage Reports

```bash
# Frontend
cd assist-chat-app
npm run test:coverage
open coverage/lcov-report/index.html

# Backend
cd assist-chat-api
npm run test:cov
open coverage/lcov-report/index.html
```

---

## ⚙️ Configuration

### Environment Variables

#### Backend (assist-chat-api/.env)

**Required**:

```env
OPENAI_API_KEY=sk-your-key-here    # Your OpenAI API key
```

**Optional** (with defaults):

```env
# Server
API_PORT=3000
NODE_ENV=development

# CORS
APP=http://localhost:4200

# OpenAI
OPENAI_MODEL=gpt-4-turbo-preview
OPENAI_MAX_TOKENS=1000
OPENAI_TEMPERATURE=0.7

# Rate Limiting
THROTTLE_TTL=60                    # Seconds
THROTTLE_LIMIT=10                  # Requests per TTL

# Circuit Breaker
CIRCUIT_BREAKER_FAILURE_THRESHOLD=5
CIRCUIT_BREAKER_SUCCESS_THRESHOLD=2
CIRCUIT_BREAKER_TIMEOUT=60000      # Milliseconds
```

#### Frontend (assist-chat-app/src/environments/)

**development** (`environment.ts`):

```typescript
export const environment = {
  production: false,
  apiUrl: "http://localhost:3000",
  websocketUrl: "http://localhost:3000",
};
```

**production** (`environment.prod.ts`):

```typescript
export const environment = {
  production: true,
  apiUrl: "http://localhost:3000",
  websocketUrl: "http://localhost:3000",
};
```

### Docker Compose Configuration

The `docker-compose.yml` file uses a `.env` file in the root directory:

```env
# .env (root level)
OPENAI_API_KEY=sk-your-key-here
OPENAI_MODEL=gpt-4-turbo-preview
OPENAI_MAX_TOKENS=1000
OPENAI_TEMPERATURE=0.7
```

---

## 🔧 Troubleshooting

### Docker Issues

**Problem**: Containers won't start

```bash
# Check logs
docker-compose logs

# Restart services
docker-compose restart

# Clean rebuild
docker-compose down
docker-compose up --build
```

**Problem**: Port already in use

```bash
# Check what's using the port
lsof -i :3000  # Backend
lsof -i :4200  # Frontend

# Kill the process or change ports in docker-compose.yml
```

**Problem**: Changes not reflecting

```bash
# Rebuild specific service
docker-compose up --build api   # Backend
docker-compose up --build app   # Frontend
```

### API Issues

**Problem**: OpenAI API errors

- Verify your API key in `.env`
- Check your OpenAI account has credits
- Review API rate limits

**Problem**: WebSocket connection fails

- Ensure backend is running on port 3000
- Check CORS settings in `main.ts`
- Verify firewall isn't blocking WebSocket

**Problem**: Health check fails

```bash
# Check health endpoint directly
curl http://localhost:3000/health

# Check container health
docker ps
```

### Frontend Issues

**Problem**: Can't connect to backend

- Verify backend is running
- Check `environment.ts` URLs
- Ensure ports match docker-compose config

**Problem**: Build errors

```bash
# Clear cache and rebuild
rm -rf .angular node_modules
npm install
npm start
```

**Problem**: WebSocket reconnection issues

- Check browser console for errors
- Verify WebSocket URL in environment
- Review network tab for connection attempts

### Common Error Messages

**"Cannot find module"**

```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

**"Port already in use"**

```bash
# Find and kill process
npx kill-port 3000  # Backend
npx kill-port 4200  # Frontend
```

**"OpenAI API key not found"**

- Ensure `.env` file exists
- Verify `OPENAI_API_KEY` is set
- Restart services after updating .env

---

## 📖 Additional Documentation

- **Frontend Details**: [assist-chat-app/README.md](./assist-chat-app/README.md)
- **API Architecture**: [assist-chat-api/docs/ARCHITECTURE.md](./assist-chat-api/docs/ARCHITECTURE.md)

---

## 🎯 Key Features Explained

### Circuit Breaker Pattern

The backend implements a circuit breaker for OpenAI API calls:

- **CLOSED**: Normal operation
- **OPEN**: Fails fast after threshold exceeded
- **HALF_OPEN**: Tests if service recovered

### WebSocket Reconnection

The frontend implements exponential backoff:

- Initial delay: 1 second
- Maximum attempts: 5
- Exponential backoff: 2^attempt seconds

### Message Streaming

Real-time token-by-token response streaming:

- Chunks sent via WebSocket
- Progressive UI updates
- Complete/incomplete flags

### State Management

Angular Signals for reactive state:

- Zero boilerplate
- Automatic change detection
- Computed values
- Effects for side effects

---

## 🙏 Acknowledgments

- **NestJS** - Progressive Node.js framework
- **Angular** - The modern web developer's platform
- **OpenAI** - AI models and API
- **Socket.IO** - Real-time communication library

---

## 📧 Contact

For questions or support, please open an issue in the repository.

---

**Built with ❤️ using NestJS, Angular, and OpenAI**
