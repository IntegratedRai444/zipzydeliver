# 🚨 DEPLOYMENT CHECKLIST - MUST READ BEFORE DEPLOYING!

## ⚠️ CRITICAL SECURITY CHECKS

### 1. Environment Variables
- [ ] **NEVER commit real API keys or database credentials to Git**
- [ ] Replace all placeholder values in `env.production`
- [ ] Generate a strong random SESSION_SECRET (at least 32 characters)
- [ ] Update CORS_ORIGIN with your actual production domain
- [ ] Update ISSUER_URL with your actual production domain
- [ ] Update REPLIT_DOMAINS with your actual production domain

### 2. Database Security
- [ ] Use production database (not development/test databases)
- [ ] Ensure database has proper SSL/TLS enabled
- [ ] Use strong database passwords
- [ ] Limit database access to production servers only

### 3. API Keys & Secrets
- [ ] Replace GEMINI_API_KEY with your actual key
- [ ] Replace LOCATION_API_KEY with your actual key
- [ ] Update MONGO_URL with production MongoDB credentials
- [ ] Update DATABASE_URL with production PostgreSQL credentials

## 🔧 TECHNICAL CHECKS

### 4. Build Process
- [ ] Run `npm run build` locally first to test
- [ ] Ensure `dist/` directory is created successfully
- [ ] Check that all server files are bundled correctly
- [ ] Verify frontend assets are built properly

### 5. Dependencies
- [ ] Run `npm ci --only=production` to install production deps
- [ ] Ensure all production dependencies are in `dependencies` (not `devDependencies`)
- [ ] Check for any missing peer dependencies

### 6. Server Configuration
- [ ] Verify server can start with production environment
- [ ] Check that all required ports are available
- [ ] Ensure proper error handling and logging
- [ ] Test health check endpoints

## 🌐 PRODUCTION SETUP

### 7. Domain & SSL
- [ ] Configure your production domain
- [ ] Set up SSL certificates (HTTPS)
- [ ] Update DNS records
- [ ] Test domain resolution

### 8. Server Environment
- [ ] Use production-grade server (not development machine)
- [ ] Set up proper firewall rules
- [ ] Configure reverse proxy if needed (nginx/Apache)
- [ ] Set up monitoring and logging

### 9. Process Management
- [ ] Use PM2 or similar process manager
- [ ] Set up auto-restart on crashes
- [ ] Configure log rotation
- [ ] Set up health monitoring

## 🧪 TESTING

### 10. Pre-Deployment Tests
- [ ] Test all API endpoints
- [ ] Verify authentication works
- [ ] Test database connections
- [ ] Check WebSocket functionality
- [ ] Test file uploads/downloads

### 11. Post-Deployment Tests
- [ ] Verify application is accessible
- [ ] Test all major user flows
- [ ] Check error handling
- [ ] Monitor performance metrics
- [ ] Test backup/restore procedures

## 📋 COMMON MISTAKES TO AVOID

❌ **NEVER deploy with development environment variables**
❌ **NEVER commit real credentials to version control**
❌ **NEVER use development databases in production**
❌ **NEVER skip SSL/HTTPS setup**
❌ **NEVER forget to set NODE_ENV=production**
❌ **NEVER use weak session secrets**
❌ **NEVER expose internal server ports**

## 🚀 DEPLOYMENT COMMANDS

```bash
# 1. Build the application
npm run build

# 2. Install production dependencies
npm ci --only=production

# 3. Start the production server
npm start

# 4. Or use the deployment script
./deploy.sh production
```

## 📞 SUPPORT

If you encounter issues during deployment:
1. Check the logs in `./logs/` directory
2. Verify all environment variables are set correctly
3. Ensure all prerequisites are installed
4. Check server resource usage (CPU, memory, disk)
5. Verify network connectivity and firewall rules
