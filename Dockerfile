# Multi-stage Dockerfile for ZipzyDeliver Production
FROM node:18-alpine AS base

# Install dependencies for native modules
RUN apk add --no-cache python3 make g++

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Build stage
FROM node:18-alpine AS builder

# Install dependencies for native modules
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:18-alpine AS production

# Install security updates
RUN apk update && apk upgrade && rm -rf /var/cache/apk/*

# Create app user with minimal permissions
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001 -G nodejs && \
    adduser -S redis -u 1002 -G nodejs

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Security: Remove unnecessary packages and files
RUN apk del --purge && \
    rm -rf /var/cache/apk/* /tmp/* /var/tmp/*

# Set working directory
WORKDIR /app

# Copy built application from builder stage
COPY --from=builder --chown=nextjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nextjs:nodejs /app/package*.json ./

# Install only production dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy environment file (will be overridden at runtime)
COPY --chown=nextjs:nodejs env.production .env

# Create necessary directories
RUN mkdir -p logs backups && chown -R nextjs:nodejs logs backups

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist/index.js"]
