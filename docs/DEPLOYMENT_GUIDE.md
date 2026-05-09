# Deployment Guide - Grades Management System

## Pre-Deployment Checklist

### 1. Environment Setup
- [ ] MongoDB URI configured in `.env`
- [ ] Node.js version >= 14
- [ ] npm or yarn installed
- [ ] Git repository updated

### 2. Code Verification
```bash
# Pull latest changes
git pull origin main

# Install dependencies
npm install

# Build the project
npm run build

# Expected: No errors, dist/ folder created
```

### 3. Database Preparation
```bash
# Option A: Initialize on app startup (automatic)
npm start
# Grades will be created if missing

# Option B: Manual seed before deployment
MONGODB_URI=mongodb://... npm run seed:grades

# Option C: Seed from deployed app
# After app is running, database is pre-populated
```

---

## Deployment Steps

### Local Development

```bash
# 1. Start development server
npm run dev

# 2. Test endpoints
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/admin/grades

# 3. Check Swagger docs
# Visit: http://localhost:3000/api-docs
```

### Staging Environment

```bash
# 1. Build production version
npm run build

# 2. Export dist folder to staging server
scp -r dist/ user@staging:/app/dist

# 3. Run seed script
MONGODB_URI=mongodb://staging... npm run seed:grades

# 4. Start application
npm start

# 5. Verify endpoints
curl -H "Authorization: Bearer TOKEN" \
  https://staging.api.com/admin/grades
```

### Production Environment

```bash
# 1. Ensure MongoDB backup exists
mongodump --uri "mongodb://..." --out ./backup-$(date +%s)

# 2. Build production code
npm run build

# 3. Deploy to production
# - Copy dist folder
# - Update .env with production MongoDB URI
# - Restart application (PM2, Docker, etc.)

# 4. Initialize grades on first deployment
# The GradeInitializerService will run automatically
# Check logs: npm run pm2:logs mon-etoile-backend

# 5. Verify deployment
curl -H "Authorization: Bearer PROD_TOKEN" \
  https://api.production.com/admin/grades

# Expected response: Array of 9 grades
```

---

## Using PM2 (if applicable)

### Initial Setup
```bash
# Start with PM2
npm run pm2:start

# Check status
npm run pm2:status

# View logs
npm run pm2:logs
```

### After Deployment
```bash
# Restart application
npm run pm2:restart

# Reload with zero downtime
npm run pm2:reload

# Monitor
npm run pm2:monit
```

---

## Verification Steps

### 1. Health Check - Endpoints

```bash
# Authentication required, so first get a token
TOKEN=your_jwt_token_here

# Test 1: Get all grades
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/admin/grades
# Expected: Array with 9 objects

# Test 2: Get single grade
GRADE_ID=$(curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/admin/grades | jq -r '.[0]._id')

curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/admin/grades/$GRADE_ID
# Expected: Single grade object

# Test 3: List consultation choices
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/admin/consultation-choices
# Expected: Array of available choices

# Test 4: Update next grade (test error handling)
curl -X PATCH \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"nextGradeId":"invalid-id"}' \
  http://localhost:3000/admin/grades/$GRADE_ID
# Expected: 400 Bad Request
```

### 2. Database Verification

```bash
# Connect to MongoDB
mongo "mongodb://..."

# Use the database
use your_db_name

# Verify grades exist
db.gradeconfigs.find().count()
# Expected: 9

# Check specific grade
db.gradeconfigs.findOne({grade: "ASPIRANT"})
# Expected: Document with all fields

# Verify hierarchy chain
db.gradeconfigs.find({}, {grade: 1, nextGradeId: 1}).sort({level: 1})
# Expected: Each grade points to next, except last
```

### 3. Application Logs

```bash
# Check for initialization messages
npm run pm2:logs | grep -i "grade"

# Expected messages:
# "🚀 Initializing grade configurations..."
# "✅ Grade initialization completed. Found 9 grades."
```

### 4. Authorization Test

```bash
# Test with non-admin user (should fail)
curl -H "Authorization: Bearer USER_TOKEN" \
  http://localhost:3000/admin/grades
# Expected: 403 Forbidden

# Test with admin user (should succeed)
curl -H "Authorization: Bearer ADMIN_TOKEN" \
  http://localhost:3000/admin/grades
# Expected: 200 OK with grades
```

---

## Troubleshooting Deployment Issues

### Issue: Build Fails
```bash
# Solution 1: Clear node_modules and rebuild
rm -rf node_modules package-lock.json
npm install
npm run build

# Solution 2: Check TypeScript version
npm list typescript
# Should be >= 5.0

# Solution 3: Check Node version
node --version
# Should be >= 14.0
```

### Issue: Grades Not Initializing
```bash
# Check MongoDB connection
# Verify MONGODB_URI in .env

# Run manual seed
npm run seed:grades

# Check MongoDB directly
mongo "mongodb://..." --eval "db.gradeconfigs.count()"
```

### Issue: Authorization Fails
```bash
# Verify user has correct role
# User must have role: "ADMIN" or "SUPER_ADMIN"

# Check token validity
# Ensure JWT token is valid and not expired

# Verify header format
# Should be: Authorization: Bearer token_here
```

### Issue: Port Already in Use
```bash
# Find process on port 3000
lsof -i :3000  # Unix/Mac
netstat -ano | findstr :3000  # Windows

# Kill process and restart
kill -9 <PID>
npm start
```

### Issue: MongoDB Connection Timeout
```bash
# Verify connection string
# mongodb://user:pass@host:port/db

# Test connection
mongo "mongodb://your-connection-string"

# Check network access
# Ensure IP is whitelisted in MongoDB Atlas

# Increase timeout
# MONGODB_URI=mongodb://...?connectTimeoutMS=10000
```

---

## Performance Optimization

### Database Indexing
The grades schema automatically creates indexes for:
- `grade` field (unique)
- `level` field (unique)

For better performance with consultation choices:
```bash
# In MongoDB, run:
db.rubriques.createIndex({ "consultationChoices._id": 1 })
```

### Query Optimization
Currently, fetching all grades (9 documents) is extremely fast.
Consultation choices query iterates through rubriques - consider:

```typescript
// Optional: Add caching in service
private consultationChoicesCache = null;
private cacheTTL = 5 * 60 * 1000; // 5 minutes

async getAvailableConsultationChoices(user: User) {
  // Return cache if fresh
  if (this.consultationChoicesCache && /* check TTL */) {
    return this.consultationChoicesCache;
  }
  // Otherwise fetch and cache
}
```

### API Response Caching
Consider adding caching headers for GET requests:
```typescript
@Get('grades')
@CacheKey('all_grades')
@CacheTTL(300) // 5 minutes
async getAllGradeConfigs() {
  // ...
}
```

---

## Monitoring & Maintenance

### Health Checks
```bash
# Add to monitoring system
curl http://localhost:3000/admin/grades \
  -H "Authorization: Bearer HEALTH_CHECK_TOKEN"

# Expected: 200 response with grades
```

### Logging Strategy
Ensure the following are logged:
- Grade initialization attempts
- Authorization failures
- Cycle detection attempts
- Database errors
- API endpoint access (optional)

Check logs location:
```bash
npm run pm2:logs
# Or check application log files
tail -f logs/application.log
```

### Backup Strategy
```bash
# Daily backup of grades
mongodump -d your_db_name -c gradeconfigs \
  -o ./backups/grades_$(date +%Y%m%d)

# Weekly full backup
mongodump -d your_db_name \
  -o ./backups/full_$(date +%Y%m%d)
```

---

## Rollback Procedure

If significant issues occur after deployment:

### 1. Immediate Rollback
```bash
# Stop application
npm run pm2:stop

# Revert to previous version
git checkout previous-version
npm install --production
npm run build

# Restart
npm run pm2:start
```

### 2. Database Rollback
```bash
# If grades were corrupted
mongorestore ./backup-timestamp/

# Or reset grades via seed
SEED_RESET=true npm run seed:grades
```

### 3. Monitor Rollback
```bash
# Check logs for errors
npm run pm2:logs

# Verify endpoints
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:3000/admin/grades
```

---

## Post-Deployment Checklist

- [ ] All 6 endpoints responding correctly
- [ ] Authentication requiring valid tokens
- [ ] Authorization allowing only admins
- [ ] Database contains 9 grades
- [ ] Logs show no errors
- [ ] Swagger documentation accessible
- [ ] Monitoring alerts configured
- [ ] Backups scheduled
- [ ] Team notified of deployment
- [ ] Documentation updated

---

## Support Contacts

- **Backend Team:** @backend-team
- **Incident Channel:** #incidents-backend

---

## Deployment Timeline

```
Estimated Times:
- Build: 30-60 seconds
- Seed database: 5-10 seconds
- Health checks: 20-30 seconds
- Total downtime: < 2 minutes (if zero-downtime reload)
```

---

## Success Indicators

✅ Deployment successful if:
1. No build errors
db.gradeconfigs.find({}, {grade: 1}).sort({level: 1})
4. Authorization check working
5. Logs show initialization success
6. Monitoring shows healthy status

---

**Version:** 1.0
**Last Updated:** February 14, 2026
**Status:** Ready for Deployment

