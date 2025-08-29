import express, { type Request, Response, NextFunction } from "express";
import { createServer } from "http";
import helmet from "helmet";
import compression from "compression";
import cors from "cors";
import { config } from 'dotenv';
import { resolve } from 'path';

// Add global error handlers
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Load .env file manually
config({ path: resolve(process.cwd(), '.env') });
import { app } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { seedKbIfEmpty } from "./kb";
import { websocketService } from "./services/websocketService";
import { ensureAdminUser } from "./adminSeed";
import { ensureAuthSchema } from "./schemaInit";

const app = express();
// Security & performance
app.use(helmet({
  contentSecurityPolicy: false,
}));
app.use(compression());
app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Basic health endpoints
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.get('/ready', (_req, res) => {
  // In a real deployment, check db/cache readiness here
  res.status(200).json({ ready: true });
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  try {
    log("🚀 Starting server...");
    
    // Ensure auth schema (user_credentials) exists
    await ensureAuthSchema();

    const server = createServer(app);
    log("✅ Routes registered successfully");
    
    // Initialize WebSocket service
    websocketService.initialize(server);
    log("✅ WebSocket service initialized");
    
    // Seed initial KB entries (non-blocking)
    seedKbIfEmpty().then(() => {
      log("✅ Knowledge base seeded");
    }).catch((error) => {
      log("⚠️ Knowledge base seeding failed, continuing without it:", error);
    });

    // Ensure the primary admin exists (non-blocking)
    ensureAdminUser({
      email: process.env.PRIMARY_ADMIN_EMAIL || 'rishabhkapoor@atomicmail.io',
      password: process.env.PRIMARY_ADMIN_PASSWORD || 'Rishabhkapoor@0444',
      firstName: 'Rishabh',
      lastName: 'Kapoor',
    }).then((u) => {
      if (u) log("✅ Primary admin ensured");
    }).catch((e) => log("⚠️ Admin seed failed", e));
    
    // Set up WebSocket cleanup interval
    setInterval(() => {
      websocketService.cleanupExpiredConnections();
    }, 60000); // Clean up every minute

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      res.status(status).json({ message });
      throw err;
    });

    // importantly only setup vite in development and after
    // setting up all the other routes so the catch-all route
    // doesn't interfere with the other routes
    if (app.get("env") === "development") {
      await setupVite(app, server);
      log("✅ Vite development server configured");
    } else {
      serveStatic(app);
      log("✅ Static files configured");
    }

    // Simple port binding with fallback to any available port
    const preferredPort = parseInt(process.env.PORT || '5000', 10);
    
    log(`🌐 Attempting to bind to port ${preferredPort}...`);
    
    const listenOptions: any = {
      port: preferredPort,
      host: "localhost",
    };

    // reusePort is not supported on Windows
    if (process.platform !== 'win32') {
      listenOptions.reusePort = true;
    }

    log(`🔧 Listen options:`, JSON.stringify(listenOptions, null, 2));
    
    // Add a timeout to catch hanging server
    const serverTimeout = setTimeout(() => {
      log(`⏰ Server startup timeout - server may be hanging`);
      process.exit(1);
    }, 10000); // 10 second timeout
    
    // Simple server startup
    server.listen(listenOptions, () => {
      clearTimeout(serverTimeout);
      const actualPort = (server.address() as any)?.port || preferredPort;
      const localUrl = `http://localhost:${actualPort}`;
      
      log(`🚀 Server is running!`);
      log(`📍 Local: ${localUrl}`);
      log(`📱 Open your browser and go to: ${localUrl}`);
      log(`🔗 API endpoints available at: ${localUrl}/api`);
      
      // Auto-open Chrome browser
      try {
        import('child_process').then(({ exec }) => {
          exec('start chrome "' + localUrl + '"', (error: any) => {
            if (error) {
              log(`⚠️ Failed to open Chrome: ${error.message}`);
              // Fallback to default browser
              exec('start "' + localUrl + '"', (fallbackError: any) => {
                if (fallbackError) {
                  log(`⚠️ Failed to open default browser: ${fallbackError.message}`);
                } else {
                  log(`✅ Opened in default browser`);
                }
              });
            } else {
              log(`✅ Opened Chrome browser to ${localUrl}`);
            }
          });
        }).catch((importError) => {
          log(`⚠️ Failed to import child_process: ${importError}`);
        });
      } catch (browserError) {
        log(`⚠️ Browser auto-open failed: ${browserError}`);
      }
      
      log(`✅ Server startup completed successfully`);
    }).on('error', (error) => {
      clearTimeout(serverTimeout);
      log(`❌ Server failed to start: ${(error as any).message}`);
      log(`❌ Error stack: ${(error as any).stack}`);
      
      if ((error as any).code === 'EADDRINUSE') {
        log(`💡 Port ${preferredPort} is busy. Try setting a different PORT in your .env file`);
        log(`💡 Example: PORT=5001 npm run dev`);
      }
      
      process.exit(1);
    });
  } catch (error) {
    log(`❌ Server startup failed: ${error}`);
    process.exit(1);
  }
})();
