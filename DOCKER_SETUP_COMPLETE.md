# Complete Docker PostgreSQL Setup - All Services Configured ✅

## Summary of Changes

All services in the Survey Platform have been configured to use **Docker PostgreSQL on port 5433**.

### Issues Fixed

1. ✅ **macOS Gatekeeper Warning** - "Apple could not verify AuthService is free of malware"
   - Removed quarantine attributes from all compiled binaries
   - Created `clear-quarantine.sh` script for future use

2. ✅ **PostgreSQL Port Conflict** - Port 5432 occupied by PostgreSQL 17
   - Configured Docker PostgreSQL to use port **5433**
   - Updated all service configurations

3. ✅ **Database Connection Issues** - Password authentication failures
   - Created/updated .env files for all services
   - Standardized database credentials across all services

## Services Configured

### 1. AuthService (.NET/C#)
**Location:** `/AuthService`
**Port:** 5171
**Database:** PostgreSQL (5433)

**Configuration:**
- `.env` - Updated to port 5433
- `docker/docker-compose.yml` - Updated port mapping

**Start Command:**
```bash
cd AuthService
dotnet run
```

**Expected Output:**
```
info: Microsoft.Hosting.Lifetime[14]
      Now listening on: http://localhost:5171
```

### 2. ParticipantsManagementService (Go)
**Location:** `/ParticipantsManagementService`
**Port:** 8081
**Database:** PostgreSQL (5433)

**Configuration:**
- `.env` - Created with correct settings

**Start Commands:**
```bash
cd ParticipantsManagementService

# Option 1: Run directly
go run main.go

# Option 2: Build and run
go build -o ParticipantsManagementService main.go
./ParticipantsManagementService
```

**Expected Output:**
```
2025/11/13 19:20:16 Connecting to database: host=localhost dbname=SurveyDb user=postgres port=5433 sslmode=disable
2025/11/13 19:20:16 Database migration completed successfully!
2025/11/13 19:20:16 Starting Participant Service on port 8081
 │               http://127.0.0.1:8081               │
```

### 3. SurveyManagementService (Go)
**Location:** `/SurveyManagementService`
**Port:** 3001
**Database:** PostgreSQL (5433)

**Configuration:**
- `.env` - Updated to port 5433

**Start Commands:**
```bash
cd SurveyManagementService

# Option 1: Run directly
go run main.go

# Option 2: Build and run
go build -o SurveyManagementService main.go
./SurveyManagementService
```

### 4. Frontend (Next.js)
**Location:** `/frontend`
**Port:** 3000

**Start Command:**
```bash
cd frontend
npm install  # if not done already
npm run dev
```

## Docker PostgreSQL Configuration

### Container Details
- **Container Name:** survey-postgres
- **Image:** postgres:15
- **Host Port:** 5433
- **Container Port:** 5432
- **Database:** SurveyDb
- **Username:** postgres
- **Password:** postgres123

### Docker Commands

**Start PostgreSQL:**
```bash
cd AuthService/docker
docker-compose up -d postgres
```

**Stop PostgreSQL:**
```bash
cd AuthService/docker
docker-compose down
```

**Check Status:**
```bash
docker ps | grep postgres
```

**View Logs:**
```bash
docker logs survey-postgres -f
```

**Restart Container:**
```bash
cd AuthService/docker
docker-compose restart postgres
```

### Test Database Connection
```bash
PGPASSWORD=postgres123 psql -h localhost -p 5433 -U postgres -d SurveyDb
```

## Starting All Services

### Step 1: Start Docker PostgreSQL
```bash
cd AuthService/docker
docker-compose up -d postgres

# Wait for PostgreSQL to be ready (check health)
docker ps | grep postgres
# Should show: (healthy)
```

### Step 2: Start Backend Services

**Terminal 1 - AuthService:**
```bash
cd AuthService
dotnet run
```

**Terminal 2 - ParticipantsManagementService:**
```bash
cd ParticipantsManagementService
go run main.go
```

**Terminal 3 - SurveyManagementService:**
```bash
cd SurveyManagementService
go run main.go
```

**Terminal 4 - Frontend:**
```bash
cd frontend
npm run dev
```

## Service URLs

Once all services are running:

| Service | URL | Purpose |
|---------|-----|---------|
| Frontend | http://localhost:3000 | User interface |
| SurveyManagementService | http://localhost:3001 | Survey CRUD operations |
| AuthService | http://localhost:5171 | Authentication & authorization |
| ParticipantsManagementService | http://localhost:8081 | Participant management |
| PostgreSQL | localhost:5433 | Database |
| pgAdmin (optional) | http://localhost:8080 | Database management UI |

## Troubleshooting

### macOS Gatekeeper Issues

If you see "Apple could not verify... is free of malware" warnings:

**For AuthService:**
```bash
cd AuthService
./clear-quarantine.sh
```

**For Go Services:**
```bash
# For ParticipantsManagementService
cd ParticipantsManagementService
xattr -c ParticipantsManagementService

# For SurveyManagementService
cd SurveyManagementService
xattr -c SurveyManagementService
```

**After any build:**
```bash
find bin obj -type f -exec xattr -c {} \; 2>/dev/null  # For .NET
xattr -c ./ServiceName  # For Go binaries
```

### Database Connection Issues

**Check if PostgreSQL is running:**
```bash
pg_isready -h localhost -p 5433
# Should output: localhost:5433 - accepting connections
```

**Check Docker container:**
```bash
docker ps | grep postgres
# Should show: Up X minutes (healthy)
```

**View database logs:**
```bash
docker logs survey-postgres --tail 50
```

**Restart PostgreSQL:**
```bash
cd AuthService/docker
docker-compose restart postgres
sleep 3
pg_isready -h localhost -p 5433
```

### Port Already in Use

**Check what's using a port:**
```bash
lsof -i :5433  # For PostgreSQL
lsof -i :5171  # For AuthService
lsof -i :8081  # For ParticipantsManagementService
lsof -i :3001  # For SurveyManagementService
lsof -i :3000  # For Frontend
```

**Kill a process using a port:**
```bash
kill -9 $(lsof -t -i:PORT_NUMBER)
```

### Environment Variable Issues

**Verify .env files exist and are correct:**
```bash
# AuthService
cat AuthService/.env | grep CONNECTION_STRING

# ParticipantsManagementService
cat ParticipantsManagementService/.env | grep DB_PORT

# SurveyManagementService
cat SurveyManagementService/.env | grep DB_PORT
```

All should show port **5433**.

### Database Reset

If you need to start with a fresh database:
```bash
cd AuthService/docker
docker-compose down -v  # This removes volumes (DATA WILL BE LOST!)
docker-compose up -d postgres
```

## Additional Configuration

### Optional: pgAdmin for Database Management

To start pgAdmin:
```bash
cd AuthService/docker
docker-compose up -d pgadmin
```

Access at: http://localhost:8080
- **Email:** admin@survey.com
- **Password:** admin123

To connect to the database in pgAdmin:
1. Right-click "Servers" → "Register" → "Server"
2. General tab: Name = "Survey DB"
3. Connection tab:
   - Host: host.docker.internal (Mac) or docker.host.internal (Windows)
   - Port: 5432 (use container internal port)
   - Database: SurveyDb
   - Username: postgres
   - Password: postgres123

### Using PostgreSQL 17 Instead (Port 5432)

If you want to stop the PostgreSQL 17 installation and use port 5432:

1. Find PostgreSQL 17 process:
```bash
ps aux | grep postgres | grep 5432
```

2. Stop it (requires admin access):
```bash
sudo kill <PID>
```

3. Update docker-compose.yml:
```yaml
ports:
  - "5432:5432"  # Change from 5433:5432
```

4. Update all .env files to use port 5432

5. Restart Docker PostgreSQL

## Files Modified

### Created Files
- `AuthService/clear-quarantine.sh` - Script to fix Gatekeeper issues
- `AuthService/DOCKER_POSTGRES_SETUP.md` - Docker PostgreSQL guide
- `ParticipantsManagementService/.env` - Database configuration
- `DOCKER_SETUP_COMPLETE.md` - This file

### Modified Files
- `AuthService/.env` - Updated port to 5433
- `AuthService/docker/docker-compose.yml` - Updated port mapping
- `SurveyManagementService/.env` - Updated port to 5433

## Quick Reference

### Daily Development Workflow

1. **Start your day:**
```bash
# Start Docker PostgreSQL
cd AuthService/docker && docker-compose up -d postgres

# Verify it's healthy
docker ps | grep postgres
```

2. **Start services in separate terminals:**
```bash
# Terminal 1: AuthService
cd AuthService && dotnet run

# Terminal 2: ParticipantsManagementService  
cd ParticipantsManagementService && go run main.go

# Terminal 3: SurveyManagementService
cd SurveyManagementService && go run main.go

# Terminal 4: Frontend
cd frontend && npm run dev
```

3. **Access the application:**
   - Open browser: http://localhost:3000

4. **End your day:**
```bash
# Stop all services (Ctrl+C in each terminal)
# Optionally stop PostgreSQL to free resources:
cd AuthService/docker && docker-compose down
```

## Summary

✅ All services configured for Docker PostgreSQL on port 5433
✅ macOS Gatekeeper issues resolved
✅ Database credentials standardized across all services
✅ Documentation and helper scripts created
✅ Ready for development!

## Support

If you encounter any issues not covered in this guide:
1. Check the service logs for error messages
2. Verify Docker PostgreSQL is running and healthy
3. Confirm .env files have correct port (5433)
4. Ensure no port conflicts with other applications
5. Try restarting the affected service

For persistent issues, check:
- Docker daemon is running
- PostgreSQL container has enough resources
- Network connectivity between services
- Firewall settings allowing local connections

