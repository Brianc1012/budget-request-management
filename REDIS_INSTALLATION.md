# Redis Installation Guide for Windows

## Option 1: Manual Installation (Recommended for Development)

### Using Memurai (Redis for Windows)
1. Download Memurai Developer from: https://www.memurai.com/get-memurai
2. Run the installer
3. Memurai will automatically start as a Windows service on port 6379

### Using Redis from GitHub
1. Download the latest release from: https://github.com/tporadowski/redis/releases
2. Extract the ZIP file to a folder (e.g., C:\Redis)
3. Run `redis-server.exe` from the extracted folder
4. Redis will start on localhost:6379

## Option 2: Docker (if you have Docker installed)

```powershell
# Pull and run Redis container
docker run -d --name redis-stack -p 6379:6379 redis/redis-stack:latest

# Check if running
docker ps

# Stop Redis
docker stop redis-stack

# Start Redis again
docker start redis-stack
```

## Option 3: Windows Subsystem for Linux (WSL)

If you have WSL2 installed:

```bash
# In WSL terminal
sudo apt-get update
sudo apt-get install redis-server

# Start Redis
sudo service redis-server start

# Check status
sudo service redis-server status
```

## Verifying Redis Installation

After installing, verify Redis is running:

```powershell
# Test connection (if redis-cli is available)
redis-cli ping
# Should return: PONG

# Or use telnet
telnet localhost 6379
# Type: ping
# Should return: +PONG
```

## Current Status

The Budget Request API is configured to work **with or without Redis**:

- **With Redis**: Caching is enabled, improving performance for frequently accessed data
- **Without Redis**: Application runs normally but without caching (slower for repeated queries)

The application will automatically detect if Redis is unavailable and continue operating.

## Environment Configuration

Make sure your `.env` file has the correct Redis configuration:

```env
# Redis Cache
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=1
```

## Testing Redis Connection

Once Redis is installed, restart the API server:

```powershell
npm run dev:api
```

You should see:
- ✅ "Connected to Redis" - if Redis is running
- ⚠️  "Redis connection error" - if Redis is not available (app continues normally)

## Performance Impact

### With Redis Enabled:
- Budget requests: **~5ms** (cached)
- Department budgets: **~3ms** (cached)
- User permissions: **~2ms** (cached)

### Without Redis:
- Budget requests: **~50-100ms** (database query)
- Department budgets: **~30-80ms** (database query)
- User permissions: **~20-50ms** (database query)

## Next Steps

1. Choose an installation method above
2. Install Redis
3. Verify it's running on port 6379
4. Restart your API server: `npm run dev:api`
5. Check the console for "Connected to Redis" message
