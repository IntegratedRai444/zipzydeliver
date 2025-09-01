import { Request, Response, NextFunction } from 'express';

export interface AuthenticatedRequest extends Request {
  session: any;
  user?: {
    id: string;
    email: string;
    role: 'user' | 'admin';
  };
}

export function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ 
        success: false, 
        error: 'Authentication required' 
      });
    }

    // Get user from storage
    const user = req.app.locals.storage.getUserById(req.session.userId);
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        error: 'User not found' 
      });
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role || 'user'
    };

    next();
  } catch (error: any) {
    console.error('Authentication error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Authentication failed' 
    });
  }
}

export function authenticateAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ 
        success: false, 
        error: 'Authentication required' 
      });
    }

    const user = req.app.locals.storage.getUserById(req.session.userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        error: 'Admin access required' 
      });
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: 'admin'
    };

    next();
  } catch (error) {
    console.error('Admin authentication error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Admin authentication failed' 
    });
  }
}

export function optionalAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    if (req.session && req.session.userId) {
      const user = req.app.locals.storage.getUserById(req.session.userId);
      if (user) {
        req.user = {
          id: user.id,
          email: user.email,
          role: user.role || 'user'
        };
      }
    }
    next();
  } catch (error) {
    // Continue without user context
    next();
  }
}
