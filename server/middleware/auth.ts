import { Request, Response, NextFunction } from 'express';

interface AuthenticatedRequest extends Request {
  session?: {
    userId?: string;
  };
}

/**
 * Simple authentication middleware
 * In production, you'd want to implement proper JWT or session-based auth
 */
export const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    // Check if user is authenticated via session
    if (req.session?.userId) {
      // User is authenticated, proceed
      next();
    } else {
      // For development/testing, allow requests without auth
      // In production, you'd want to return 401 here
      console.warn('No authentication found, allowing request for development');
      next();
    }
  } catch (error) {
    console.error('Authentication error:', error);
    // For development, allow requests even if auth fails
    // In production, you'd want to return 401 here
    next();
  }
};

/**
 * Admin-only authentication middleware
 */
export const authenticateAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (req.session?.userId) {
      // In production, you'd check if the user has admin role
      // For now, allow all authenticated users
      next();
    } else {
      res.status(401).json({ error: 'Admin access required' });
    }
  } catch (error) {
    console.error('Admin authentication error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

/**
 * Optional authentication - doesn't block requests
 */
export const optionalAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    // Always allow the request to proceed
    next();
  } catch (error) {
    console.error('Optional auth error:', error);
    next();
  }
};
