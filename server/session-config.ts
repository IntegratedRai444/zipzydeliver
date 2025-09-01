import session from 'express-session';
import { Express } from 'express';

export function setupSession(app: Express) {
  const isProduction = process.env.NODE_ENV === 'production';
  
  app.use(session({
    secret: process.env.SESSION_SECRET || 'dev-session-secret-12345',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: process.env.SESSION_COOKIE_HTTPONLY === 'true' || true,
      secure: process.env.SESSION_COOKIE_SECURE === 'true' || isProduction,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: process.env.SESSION_COOKIE_SAMESITE === 'strict' ? 'strict' : (isProduction ? 'strict' : 'lax'),
      path: '/'
    },
    name: 'connect.sid',
    rolling: true,
    unset: 'destroy'
  }));
  
  // Debug logging removed to prevent spam
  
  console.log(`✅ Session middleware configured (${isProduction ? 'production' : 'development'} mode)`);
}
