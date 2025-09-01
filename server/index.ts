import express, { type Request, Response, NextFunction } from "express";
import { createServer } from "http";
import helmet from "helmet";
import compression from "compression";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { config } from 'dotenv';
import { resolve } from 'path';
import { getAvailablePort } from './utils/portUtils';

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

// Import modules with error handling
let setupVite: any, serveStatic: any, log: any;
let seedKbIfEmpty: any;
let websocketService: any;
let setupSession: any;
let completeRouter: any;
let LocalMongoDBStorage: any;
let createTestUsers: any;

// Additional services
let aiChatbot: any;
let semanticSearch: any;
let budgetPlanner: any;
let routeOptimizer: any;
let voiceAI: any;
let demandPredictor: any;
let dispatchService: any;
let distanceService: any;
let pythonAIIntegration: any;

// Initialize modules function
async function initializeModules() {
  // Vite is not needed for backend server
  setupVite = () => {};
  serveStatic = () => {};
  log = (message: string) => console.log(`[${new Date().toLocaleTimeString()}] ${message}`);

  try {
    const kbModule = await import("./kb");
    seedKbIfEmpty = kbModule.seedKbIfEmpty;
  } catch (error) {
    console.error('❌ Failed to import kb module:', error);
    seedKbIfEmpty = () => Promise.resolve();
  }

  try {
    const wsModule = await import("./services/websocketService");
    websocketService = wsModule.websocketService;
  } catch (error) {
    console.error('❌ Failed to import websocket service:', error);
    websocketService = { initialize: () => {}, cleanupExpiredConnections: () => {} };
  }

  try {
    const sessionModule = await import("./session-config");
    setupSession = sessionModule.setupSession;
  } catch (error) {
    console.error('❌ Failed to import session config:', error);
    process.exit(1);
  }

  try {
    const routesModule = await import("./complete-routes");
    completeRouter = routesModule.completeRouter;
  } catch (error) {
    console.error('❌ Failed to import complete routes:', error);
    process.exit(1);
  }

  try {
    const storageModule = await import("./storage-local-mongodb");
    LocalMongoDBStorage = storageModule.LocalMongoDBStorage;
  } catch (error) {
    console.error('❌ Failed to import MongoDB storage:', error);
    process.exit(1);
  }

  try {
    const testModule = await import("./test-user-bypass");
    createTestUsers = testModule.createTestUsers;
  } catch (error) {
    console.error('❌ Failed to import test user bypass:', error);
    createTestUsers = () => Promise.resolve();
  }

  // Import additional services
  try {
    const aiChatbotModule = await import("./aiChatbot");
    aiChatbot = aiChatbotModule.aiChatbot;
  } catch (error) {
    console.error('❌ Failed to import AI chatbot:', error);
    aiChatbot = { processMessage: () => Promise.resolve('Service unavailable') };
  }

  try {
    const semanticSearchModule = await import("./semanticSearch");
    semanticSearch = semanticSearchModule.semanticSearch;
  } catch (error) {
    console.error('❌ Failed to import semantic search:', error);
    semanticSearch = { search: () => Promise.resolve([]) };
  }

  try {
    const budgetPlannerModule = await import("./budgetPlanner");
    budgetPlanner = budgetPlannerModule.budgetPlanner;
  } catch (error) {
    console.error('❌ Failed to import budget planner:', error);
    budgetPlanner = { createPlan: () => Promise.resolve({}) };
  }

  try {
    const routeOptimizerModule = await import("./routeOptimization");
    routeOptimizer = routeOptimizerModule.routeOptimization;
  } catch (error) {
    console.error('❌ Failed to import route optimizer:', error);
    routeOptimizer = { optimizeRoute: () => Promise.resolve([]) };
  }

  try {
    const voiceAIModule = await import("./voiceAI");
    voiceAI = voiceAIModule.voiceAI;
  } catch (error) {
    console.error('❌ Failed to import voice AI:', error);
    voiceAI = { processAudio: () => Promise.resolve('Service unavailable') };
  }

  try {
    const demandPredictorModule = await import("./demandPrediction");
    demandPredictor = demandPredictorModule.demandPrediction;
  } catch (error) {
    console.error('❌ Failed to import demand predictor:', error);
    demandPredictor = { predictDemand: () => Promise.resolve({}) };
  }

  try {
    const dispatchServiceModule = await import("./services/dispatchService");
    dispatchService = dispatchServiceModule.dispatchService;
  } catch (error) {
    console.error('❌ Failed to import dispatch service:', error);
    dispatchService = { assignOrder: () => Promise.resolve({}) };
  }

  try {
    const distanceServiceModule = await import("./services/distance");
    distanceService = distanceServiceModule.haversineDistance;
  } catch (error) {
    console.error('❌ Failed to import distance service:', error);
    distanceService = () => Promise.resolve(0);
  }

  try {
    const pythonAIIntegrationModule = await import("./services/pythonAIIntegration");
    pythonAIIntegration = pythonAIIntegrationModule.pythonAIIntegration;
  } catch (error) {
    console.error('❌ Failed to import Python AI integration:', error);
    pythonAIIntegration = { predictDailyDemand: () => Promise.resolve({}) };
  }
}

// Create the main app
const app = express();

// Security & performance
app.use(helmet({
  contentSecurityPolicy: false,
}));
app.use(compression());

// Rate limiting for production security
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.',
    message: 'Rate limit exceeded'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

app.use(cors({
  origin: process.env.CORS_ORIGIN || true,
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// These will be set up after modules are initialized

// Basic health endpoints
app.get('/health', (_req, res) => {
  res.status(200).json({ 
    status: 'ok',
    database: 'Local MongoDB',
    timestamp: new Date().toISOString()
  });
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
    // Initialize all modules first
    await initializeModules();
    
    log("🚀 Starting server with MongoDB...");
    
    // Setup session middleware (after modules are loaded)
    setupSession(app);
    
    // Use MongoDB storage with error handling
    try {
      app.locals.storage = new LocalMongoDBStorage();
      log("✅ MongoDB storage initialized");
    } catch (error) {
      console.error('❌ Failed to initialize MongoDB storage:', error);
      process.exit(1);
    }
    
    // Use the comprehensive router for API routes
    app.use('/api', completeRouter);
    
    // Seed test users (non-blocking)
    createTestUsers(app.locals.storage).then(() => {
      log("✅ Test users ready");
    }).catch((error: any) => {
      log("⚠️ Test users creation failed:", error);
    });

    // Seed products and categories (non-blocking)
    app.locals.storage.seedData().then(() => {
      log("✅ Products and categories seeded");
      
      // Seed admin test data
      return app.locals.storage.seedAdminTestData();
    }).then(() => {
      log("✅ Admin test data seeded");
    }).catch((error: any) => {
      log("⚠️ Data seeding failed:", error);
    });

    const server = createServer(app);
    log("✅ Routes registered successfully");
    
    // Initialize WebSocket service
    await websocketService.initialize(server);
    log("✅ WebSocket service initialized");
    
    // Seed initial KB entries (non-blocking)
    seedKbIfEmpty().then(() => {
      log("✅ Knowledge base seeded");
    }).catch((error: any) => {
      log("⚠️ Knowledge base seeding failed, continuing without it:", error);
    });
    
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

    // Dynamic port selection to avoid conflicts
    const preferredPort = parseInt(process.env.PORT || '5001', 10);
    const actualPort = await getAvailablePort(preferredPort, preferredPort + 10);
    
    log(`🌐 Attempting to bind to port ${actualPort} (preferred: ${preferredPort})...`);
    
    const listenOptions: any = {
      port: actualPort,
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
      log(`🧪 Test user info: ${localUrl}/test/user-info`);
      
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
