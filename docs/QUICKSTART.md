# 🚀 Quick Start Guide

Get the AI Assist Chat application running in **under 2 minutes** using Docker!

## Prerequisites

- Docker installed ([Get Docker](https://docs.docker.com/get-docker/))
- OpenAI API Key ([Get one here](https://platform.openai.com/))

## 3 Simple Steps

### 1️⃣ Setup Environment

```bash
# Clone and navigate to project
cd poc-assist-chat

# Copy environment template
cp .env.example .env

# Add your OpenAI API key to .env
echo "OPENAI_API_KEY=sk-your-key-here" >> .env
```

### 2️⃣ Start Application

```bash
docker-compose up -d --build
```

This will:

- ✅ Build both API and Frontend containers
- ✅ Start the backend on port 3000
- ✅ Start the frontend on port 4200
- ✅ Set up networking between services

### 3️⃣ Open Browser

Visit: **http://localhost:4200**

That's it! 🎉

## Verify Everything is Running

```bash
# Check service status
docker-compose ps

# View logs
docker-compose logs -f

# Test API health
curl http://localhost:3000/health
```

## Stop Application

```bash
# Stop services
docker-compose down
```

## Troubleshooting

**Services won't start?**

```bash
docker-compose logs api   # Check API logs
docker-compose logs app   # Check frontend logs
```

**Port conflicts?**

```bash
# Check what's using ports 3000/4200
lsof -i :3000
lsof -i :4200
```

**Need to rebuild?**

```bash
docker-compose down
docker-compose up --build
```

## Next Steps

- 📖 Read the full [README.md](./README.md) for detailed documentation
- 🏗️ Architecture: See [ARCHITECTURE.md](./assist-chat-api/docs/ARCHITECTURE.md)

---

**Need help?** Open an issue in the repository.
