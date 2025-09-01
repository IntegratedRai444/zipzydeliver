import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import cors from 'cors';
import { config } from 'dotenv';

// Load environment variables
config();

/**
 * Comprehensive Security Middleware for ZipzyDeliver
 */

// Rate limiting configuration
export const createRateLimiters = () => {
  // General API rate limiter
  const apiLimiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // limit each IP to 100 requests per windowMs
    message: {
      success: false,
      error: 'Too many requests from this IP, please try again later.',
      message: 'Rate limit exceeded'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: process.env.RATE_LIMIT_SKIP_SUCCESSFUL_REQUESTS === 'true',
    skipFailedRequests: process.env.RATE_LIMIT_SKIP_FAILED_REQUESTS === 'true',
    keyGenerator: (req) => {
      // Use X-Forwarded-For header if behind proxy, otherwise use IP
      return req.headers['x-forwarded-for'] as string || req.ip || 'unknown';
    }
  });

  // Stricter rate limiter for authentication endpoints
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 requests per windowMs
    message: {
      success: false,
      error: 'Too many authentication attempts, please try again later.',
      message: 'Authentication rate limit exceeded'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false,
    skipFailedRequests: false
  });

  // File upload rate limiter
  const uploadLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // limit each IP to 10 uploads per hour
    message: {
      success: false,
      error: 'Too many file uploads, please try again later.',
      message: 'Upload rate limit exceeded'
    },
    standardHeaders: true,
    legacyHeaders: false
  });

  return { apiLimiter, authLimiter, uploadLimiter };
};

// CORS configuration
export const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];
    
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: process.env.CORS_ALLOWED_METHODS?.split(',') || ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: process.env.CORS_ALLOWED_HEADERS?.split(',') || ['Content-Type', 'Authorization'],
  exposedHeaders: process.env.CORS_EXPOSED_HEADERS?.split(',') || ['X-Total-Count'],
  credentials: process.env.CORS_CREDENTIALS === 'true',
  maxAge: parseInt(process.env.CORS_MAX_AGE || '86400'),
  optionsSuccessStatus: 200
};

// Helmet configuration
export const helmetConfig = {
  contentSecurityPolicy: process.env.HELMET_CONTENT_SECURITY_POLICY === 'true' ? {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      fontSrc: ["'self'", "data:"],
      connectSrc: ["'self'", "https:"],
      frameAncestors: ["'none'"]
    }
  } : false,
  hidePoweredBy: process.env.HELMET_HIDE_POWERED_BY === 'true',
  hsts: process.env.HELMET_STRICT_TRANSPORT_SECURITY === 'true' ? {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  } : false,
  noSniff: process.env.HELMET_X_CONTENT_TYPE_OPTIONS === 'true',
  frameguard: process.env.HELMET_X_FRAME_OPTIONS === 'DENY' ? { action: 'deny' } : false,
  xssFilter: process.env.HELMET_X_XSS_PROTECTION === 'true'
};

// IP whitelisting middleware
export const ipWhitelist = (req: Request, res: Response, next: NextFunction) => {
  const allowedIPs = process.env.ALLOWED_IPS?.split(',') || [];
  const blockedIPs = process.env.BLOCKED_IPS?.split(',') || [];
  const clientIP = req.headers['x-forwarded-for'] as string || req.ip || req.connection.remoteAddress || '';

  // Check if IP is blocked
  if (blockedIPs.includes(clientIP)) {
    return res.status(403).json({
      success: false,
      error: 'Access denied',
      message: 'Your IP address is blocked'
    });
  }

  // If whitelist is configured, check if IP is allowed
  if (allowedIPs.length > 0 && !allowedIPs.includes(clientIP)) {
    return res.status(403).json({
      success: false,
      error: 'Access denied',
      message: 'Your IP address is not whitelisted'
    });
  }

  next();
};

// Request size limiting
export const requestSizeLimit = (req: Request, res: Response, next: NextFunction) => {
  const maxSize = parseInt(process.env.MAX_FILE_SIZE || '10485760'); // 10MB default
  
  if (req.headers['content-length'] && parseInt(req.headers['content-length']) > maxSize) {
    return res.status(413).json({
      success: false,
      error: 'Request too large',
      message: `Request size exceeds ${maxSize} bytes`
    });
  }

  next();
};

// Security logging middleware
export const securityLogger = (req: Request, res: Response, next: NextFunction) => {
  if (process.env.SECURITY_LOG_ENABLED === 'true') {
    const securityEvents = [
      'authentication_failure',
      'authorization_failure',
      'rate_limit_exceeded',
      'suspicious_activity'
    ];

    // Log suspicious activities
    const suspiciousPatterns = [
      /\.\.\//, // Directory traversal
      /<script/i, // XSS attempts
      /union\s+select/i, // SQL injection
      /eval\s*\(/i, // Code injection
    ];

    const userAgent = req.headers['user-agent'] || '';
    const url = req.url;
    const method = req.method;

    // Check for suspicious patterns
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(url) || pattern.test(userAgent)) {
        console.warn(`🚨 SECURITY ALERT: Suspicious activity detected`, {
          ip: req.ip,
          userAgent,
          url,
          method,
          timestamp: new Date().toISOString()
        });
        break;
      }
    }
  }

  next();
};

// File type validation middleware
export const validateFileType = (req: Request, res: Response, next: NextFunction) => {
  if ((req as any).file) {
    const allowedTypes = process.env.ALLOWED_FILE_TYPES?.split(',') || [];
    const fileType = (req as any).file.mimetype;

    if (!allowedTypes.includes(fileType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid file type',
        message: `File type ${fileType} is not allowed`
      });
    }
  }

  next();
};

// Session security middleware
export const sessionSecurity = (req: Request, res: Response, next: NextFunction) => {
  // Regenerate session ID on successful authentication
  if (req.session && (req.session as any).userId && !(req.session as any).regenerated) {
    req.session.regenerate((err) => {
      if (err) {
        console.error('Session regeneration error:', err);
      } else {
        (req.session as any).regenerated = true;
      }
    });
  }

  next();
};

// Export all security middleware
export const securityMiddleware = {
  createRateLimiters,
  corsOptions,
  helmetConfig,
  ipWhitelist,
  requestSizeLimit,
  securityLogger,
  validateFileType,
  sessionSecurity
};
