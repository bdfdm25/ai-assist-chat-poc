# Docker Setup Architecture

This document explains the Docker architecture and deployment strategy for the AI Assist Chat application.

## 📦 Container Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Docker Host                               │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │              assist-chat-network (Bridge)                   │ │
│  │                                                             │ │
│  │  ┌─────────────────────┐    ┌─────────────────────┐       │ │
│  │  │  assist-chat-api    │    │  assist-chat-app    │       │ │
│  │  │  (Backend)          │◄───┤  (Frontend)         │       │ │
│  │  │                     │    │                     │       │ │
│  │  │  Port: 3000         │    │  Port: 80 → 4200    │       │ │
│  │  │  Image: Node 20     │    │  Image: Nginx       │       │ │
│  │  │  Health: /health    │    │  Health: wget       │       │ │
│  │  │                     │    │  Depends: API       │       │ │
│  │  └─────────────────────┘    └─────────────────────┘       │ │
│  │           │                           │                     │ │
│  └───────────┼───────────────────────────┼─────────────────────┘ │
│              │                           │                       │
│              └───────────┬───────────────┘                       │
│                          │                                       │
└──────────────────────────┼───────────────────────────────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │  OpenAI API │
                    │  (External) │
                    └─────────────┘
```

## 🏗️ Multi-Stage Builds

### Backend (NestJS API)

```dockerfile
Stage 1: Builder
├── Base: node:20-alpine
├── Install ALL dependencies
├── Build TypeScript to JavaScript
└── Output: /dist directory

Stage 2: Production
├── Base: node:20-alpine
├── Install ONLY production dependencies
├── Copy built /dist from Stage 1
└── Run: node dist/main.js
```

**Benefits**:

- ✅ Smaller final image (no dev dependencies)
- ✅ Faster deployment
- ✅ Better security (fewer packages)
- ✅ Optimized for production

### Frontend (Angular App)

```dockerfile
Stage 1: Builder
├── Base: node:20-alpine
├── Install ALL dependencies
├── Build Angular app (ng build)
└── Output: /dist/assist-chat-app/browser

Stage 2: Nginx Server
├── Base: nginx:alpine
├── Copy built files from Stage 1
├── Copy custom nginx.conf
└── Serve static files on port 80
```

**Benefits**:

- ✅ Ultra-small final image (~25MB)
- ✅ High-performance static file serving
- ✅ Production-ready caching headers
- ✅ Angular routing support (SPA)

## 🔧 Docker Compose Configuration

### Service Dependencies

```yaml
app (Frontend)
├── depends_on: api
│   └── condition: service_healthy
└── networks: assist-chat-network

api (Backend)
├── healthcheck: GET /health
├── environment: OpenAI, Throttle, Circuit Breaker
└── networks: assist-chat-network
```

### Health Checks

**API Health Check**:

```yaml
test: wget --quiet --tries=1 --spider http://localhost:3000/health
interval: 30s
timeout: 10s
retries: 3
start_period: 40s
```

**App Health Check**:

```yaml
test: wget --quiet --tries=1 --spider http://localhost:80
interval: 30s
timeout: 10s
retries: 3
```

### Network Configuration

- **Type**: Bridge network
- **Name**: `assist-chat-network`
- **Isolation**: Services can only communicate within network
- **DNS**: Automatic service discovery (api, app)

## 📊 Resource Requirements

### Development

| Service | CPU  | Memory | Storage |
| ------- | ---- | ------ | ------- |
| API     | 0.5  | 512MB  | 100MB   |
| App     | 0.25 | 256MB  | 50MB    |

### Production (Recommended)

| Service | CPU | Memory | Storage |
| ------- | --- | ------ | ------- |
| API     | 1.0 | 1GB    | 200MB   |
| App     | 0.5 | 512MB  | 100MB   |

## 🚀 Deployment Workflow

### Local Development

```bash
# 1. Build images
docker-compose build

# 2. Start services
docker-compose up -d

# 3. View logs
docker-compose logs -f

# 4. Stop services
docker-compose down
```

### Production Deployment

```bash
# 1. Set production environment
export NODE_ENV=production

# 2. Build with no cache
docker-compose build --no-cache

# 3. Start services
docker-compose up -d

# 4. Verify health
curl http://localhost:3000/health
curl http://localhost:4200

# 5. Monitor logs
docker-compose logs -f --tail=100
```

## 🔒 Security Considerations

### Image Security

- ✅ Using Alpine Linux (minimal attack surface)
- ✅ Multi-stage builds (no dev dependencies in production)
- ✅ Non-root user execution (when possible)
- ✅ Specific version tags (not :latest)

### Network Security

- ✅ Internal bridge network (isolated)
- ✅ Only necessary ports exposed
- ✅ CORS configured in backend
- ✅ Security headers in Nginx

### Environment Variables

- ✅ Secrets via .env file (not in image)
- ✅ .env excluded from Git
- ✅ Separate .env.example for template
- ✅ No hardcoded credentials

## 📈 Scaling Strategies

### Horizontal Scaling

```yaml
# docker-compose.yml
services:
  api:
    deploy:
      replicas: 3
      restart_policy:
        condition: on-failure
```

### Load Balancing

Add Nginx reverse proxy:

```yaml
services:
  nginx-lb:
    image: nginx:alpine
    ports:
      - "80:80"
    depends_on:
      - api
    volumes:
      - ./nginx-lb.conf:/etc/nginx/nginx.conf
```

### Database Integration

For persistent data:

```yaml
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: chat
      POSTGRES_USER: chatuser
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

## 🐛 Debugging

### View Container Logs

```bash
# All services
docker-compose logs

# Specific service
docker-compose logs api
docker-compose logs app

# Follow logs
docker-compose logs -f

# Last 100 lines
docker-compose logs --tail=100
```

### Execute Commands in Container

```bash
# API container
docker-compose exec api sh
docker-compose exec api npm run test

# App container
docker-compose exec app sh
docker-compose exec app ls -la /usr/share/nginx/html
```

### Inspect Container

```bash
# View container details
docker inspect assist-chat-api

# View networks
docker network ls
docker network inspect poc-assist-chat_assist-chat-network

# View volumes
docker volume ls
```

### Rebuild Specific Service

```bash
# Rebuild API only
docker-compose up -d --build api

# Rebuild Frontend only
docker-compose up -d --build app
```

## 📦 Image Size Optimization

### Current Image Sizes

```bash
docker images | grep assist-chat

# Expected sizes:
# assist-chat-api:   ~150MB (Node 20 Alpine + app)
# assist-chat-app:   ~25MB  (Nginx Alpine + static files)
```

### Optimization Techniques Used

1. **Alpine Linux Base**: 5MB vs 150MB+ for full distros
2. **Multi-stage Builds**: Removes build tools from final image
3. **Production Dependencies Only**: No dev/test packages
4. **.dockerignore**: Excludes node_modules, tests, docs
5. **Layer Caching**: Copies package.json before source code

## 🔄 CI/CD Integration

### GitHub Actions Example

```yaml
name: Build and Deploy

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Build images
        run: docker-compose build

      - name: Run tests
        run: |
          docker-compose run api npm test
          docker-compose run app npm test

      - name: Push to registry
        run: |
          docker tag assist-chat-api registry/assist-chat-api:${{ github.sha }}
          docker push registry/assist-chat-api:${{ github.sha }}
```

## 📝 Environment Variables Reference

### API Container

| Variable           | Required | Default             | Description         |
| ------------------ | -------- | ------------------- | ------------------- |
| NODE_ENV           | No       | production          | Node environment    |
| API_PORT           | No       | 3000                | API port            |
| OPENAI_API_KEY     | **Yes**  | -                   | OpenAI API key      |
| OPENAI_MODEL       | No       | gpt-4-turbo-preview | Model to use        |
| OPENAI_MAX_TOKENS  | No       | 1000                | Max response tokens |
| OPENAI_TEMPERATURE | No       | 0.7                 | Response creativity |
| THROTTLE_TTL       | No       | 60                  | Rate limit window   |
| THROTTLE_LIMIT     | No       | 10                  | Requests per window |

### App Container

- No environment variables required
- Configuration baked into build
- Nginx serves static files only

## 🎯 Best Practices

### Development

- ✅ Use `docker-compose.override.yml` for local overrides
- ✅ Mount volumes for hot-reloading
- ✅ Use named volumes for persistence
- ✅ Keep .env file secure (never commit)

### Production

- ✅ Use specific version tags (not :latest)
- ✅ Implement health checks
- ✅ Set resource limits
- ✅ Use secrets management
- ✅ Enable logging aggregation
- ✅ Monitor container metrics

### Maintenance

- ✅ Regular security updates (base images)
- ✅ Prune unused images/containers
- ✅ Backup volumes regularly
- ✅ Document configuration changes

## 🔍 Monitoring

### Health Endpoints

```bash
# API health
curl http://localhost:3000/health

# Returns:
{
  "status": "ok",
  "info": {
    "server": { "status": "up" },
    "ai": { "status": "up" }
  }
}
```

### Container Stats

```bash
# Real-time stats
docker stats

# Specific container
docker stats assist-chat-api
```

### Log Aggregation

For production, consider:

- **ELK Stack**: Elasticsearch, Logstash, Kibana
- **Loki**: Lightweight log aggregation
- **CloudWatch**: AWS native solution
- **Datadog**: Full observability platform

---

## 📚 Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Reference](https://docs.docker.com/compose/)
- [Multi-stage Builds](https://docs.docker.com/build/building/multi-stage/)
- [Dockerfile Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Alpine Linux](https://alpinelinux.org/)
