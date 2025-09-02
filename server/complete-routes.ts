import express from 'express';
import bcrypt from 'bcryptjs';
// Schema validation removed - using MongoDB storage instead
import { createTestUsers, getTestUserInfo } from './test-user-bypass';

// Import middleware
import { authenticateToken, optionalAuth } from './middleware/auth';
import { securityMiddleware } from './middleware/security';

// Import AI and additional services
import aiRoutes from './routes/aiRoutes';
import { aiChatbot } from './aiChatbot';
import { semanticSearch } from './semanticSearch';
import { budgetPlanner } from './budgetPlanner';
import { routeOptimization as routeOptimizer } from './routeOptimization';
import { voiceAI } from './voiceAI';
import { demandPrediction as demandPredictor } from './demandPrediction';
import { dispatchService } from './services/dispatchService';
import { haversineDistance as calculateDistance } from './services/distance';
import { paymentService } from './services/paymentService';
import { IntegratedOrderWorkflow } from './services/integratedOrderWorkflow';
import { locationTrackingService } from './services/locationTrackingService';
import { inventoryService } from './services/inventoryService';
import { notificationService } from './services/notificationService';
import { websocketService } from './services/websocketService';
import { partnerAssignmentService } from './services/partnerAssignmentService';
import { orderWorkflowService } from './services/orderWorkflowService';
import fs from 'fs';
import path from 'path';

// Create a comprehensive router
const router = express.Router();

// Initialize services with storage
// This will be set when the router is used in the main app
let isLocationServiceInitialized = false;
let isInventoryServiceInitialized = false;
let isNotificationServiceInitialized = false;
let isWebSocketIntegrationSetup = false;
let isPartnerAssignmentInitialized = false;

// Setup WebSocket integration with services
function setupWebSocketIntegration() {
  if (isWebSocketIntegrationSetup) return;
  isWebSocketIntegrationSetup = true;

  // Location tracking events
  locationTrackingService.on('locationUpdate', (data) => {
    websocketService.sendToUser(data.partnerId, {
      type: 'location_update',
      data
    });
    
    // Also send to customers tracking this order
    if (data.orderId) {
      websocketService.broadcast({
        type: 'order_location_update',
        orderId: data.orderId,
        location: data.location
      }, (conn) => !!conn.isPartner); // Send to customers only
    }
  });

  locationTrackingService.on('etaUpdate', (data) => {
    websocketService.broadcast({
      type: 'eta_update',
      orderId: data.orderId,
      eta: data.eta,
      location: data.location
    }, (conn) => !!conn.isPartner);
  });

  locationTrackingService.on('geofenceEntered', (data) => {
    if (data.orderId) {
      websocketService.broadcast({
        type: 'delivery_milestone',
        orderId: data.orderId,
        geofence: data.geofence.name,
        location: data.location
      });
    }
  });

  // Order workflow events
  orderWorkflowService.on('orderTransitioned', (data: any) => {
    // Send to customer
    websocketService.broadcast({
      type: 'order_status_update',
      orderId: data.orderId,
      status: data.to,
      message: `Order status updated to ${data.to}`,
      timestamp: new Date()
    }, (conn) => !!conn.isPartner);

    // Send to partners if order becomes available
    if (data.to === 'ready') {
      websocketService.sendToPartners({
        type: 'new_order_available',
        orderId: data.orderId,
        message: 'New order available for delivery'
      });
    }

    // Send to assigned partner
    if (data.metadata?.partnerId) {
      websocketService.sendToUser(data.metadata.partnerId, {
        type: 'order_status_update',
        orderId: data.orderId,
        status: data.to,
        message: `Order ${data.orderId} status: ${data.to}`
      });
    }
  });

  orderWorkflowService.on('inventoryShortage', (data: any) => {
    // Notify admins about inventory shortage
    websocketService.broadcast({
      type: 'inventory_alert',
      orderId: data.orderId,
      productId: data.productId,
      message: `Inventory shortage for product ${data.productId}`,
      severity: 'high'
    }, (conn) => !!conn.isPartner); // Send to partners/admins
  });

  // Inventory events
  inventoryService.on('stockAlert', (alert) => {
    websocketService.broadcast({
      type: 'stock_alert',
      alert,
      message: alert.message
    }, (conn) => conn.isPartner || false); // Send to partners/admins
  });

  inventoryService.on('stockReserved', (data) => {
    websocketService.broadcast({
      type: 'inventory_update',
      productId: data.productId,
      action: 'reserved',
      quantity: data.quantity,
      orderId: data.orderId
    }, (conn) => conn.isPartner || false);
  });

  // Notification events (for real-time push notifications)
  notificationService.on('pushNotification', (data) => {
    websocketService.sendToUser(data.userId, {
      type: 'push_notification',
      title: data.title,
      body: data.body,
      data: data.data
    });
  });

  notificationService.on('inAppNotification', (data) => {
    websocketService.sendToUser(data.userId, {
      type: 'notification',
      title: data.title,
      body: data.body,
      data: data.data,
      timestamp: new Date()
    });
  });

  // Partner assignment events
  partnerAssignmentService.on('partnerAssigned', (data) => {
    // Notify the assigned partner
    websocketService.sendToUser(data.partnerId, {
      type: 'partner_matched',
      orderId: data.orderId,
      assignment: data.assignment,
      message: `You have been assigned order ${data.orderId}`
    });

    // Notify customers about partner assignment
    websocketService.broadcast({
      type: 'order_assigned',
      orderId: data.orderId,
      partnerId: data.partnerId,
      partnerName: data.assignment.partnerName,
      estimatedDeliveryTime: data.assignment.estimatedDeliveryTime
    }, (conn) => !!conn.isPartner);
  });

  partnerAssignmentService.on('noPartnersAvailable', (data) => {
    // Notify admins about no available partners
    websocketService.broadcast({
      type: 'assignment_alert',
      orderId: data.orderId,
      message: 'No delivery partners available',
      severity: 'high'
    }, (conn) => conn.isPartner || false);
  });

  partnerAssignmentService.on('noPartnersInRange', (data) => {
    // Notify admins about no partners in range
    websocketService.broadcast({
      type: 'assignment_alert',
      orderId: data.orderId,
      message: `No partners within ${data.maxDistance}km`,
      severity: 'medium'
    }, (conn) => conn.isPartner || false);
  });

  console.log('✅ WebSocket integration with services setup complete');
}

// Compatibility aliases for frontend expectations
// These lightweight handlers map missing endpoints used by the frontend
// to existing services or return sensible placeholders to avoid 404s.

// Auth redirect helpers
router.get('/login', (_req: any, res: any) => {
  // Frontend sometimes uses window.location to /api/login
  return res.status(200).json({ ok: true, message: 'Use /auth/login (POST) or client login flow' });
});

router.get('/logout', (_req: any, res: any) => {
  return res.status(200).json({ ok: true, message: 'Use /auth/logout (POST) to logout' });
});

// Orders compatibility
router.post('/orders/:id/reject', authenticateToken, async (req: any, res: any) => {
  try {
    const orderId = req.params.id;
    if (!orderId) return res.status(400).json({ success: false, message: 'orderId required' });
    const reason = typeof req.body?.reason === 'string' && req.body.reason.trim().length > 0
      ? req.body.reason.trim()
      : 'rejected';
    const existing = await req.app.locals.storage.getOrderById(orderId);
    if (!existing) return res.status(404).json({ success: false, message: 'Order not found' });
    const updated = await req.app.locals.storage.updateOrderStatus(orderId, 'cancelled', { reason });
    await req.app.locals.storage.createOrderTracking({ orderId, status: 'cancelled', message: `Order cancelled: ${reason}` });
    return res.json({ success: true, orderId, status: updated?.status || 'cancelled' });
  } catch (e: any) {
    return res.status(400).json({ success: false, message: e?.message || 'Failed to cancel order' });
  }
});

router.post('/orders/:id/mark-paid', authenticateToken, async (req: any, res: any) => {
  try {
    const orderId = req.params.id;
    if (!orderId) return res.status(400).json({ success: false, message: 'orderId required' });
    const existing = await req.app.locals.storage.getOrderById(orderId);
    if (!existing) return res.status(404).json({ success: false, message: 'Order not found' });
    const updated = await req.app.locals.storage.updateOrderStatus(orderId, 'confirmed', { paidAt: new Date(), paymentStatus: 'completed' });
    await req.app.locals.storage.createOrderTracking({ orderId, status: 'confirmed', message: 'Payment confirmed' });
    return res.json({ success: true, orderId, status: updated?.status || 'confirmed' });
  } catch (e: any) {
    return res.status(400).json({ success: false, message: e?.message || 'Failed to mark paid' });
  }
});

router.post('/orders/:id/deliver', authenticateToken, async (req: any, res: any) => {
  try {
    const orderId = req.params.id;
    if (!orderId) return res.status(400).json({ success: false, message: 'orderId required' });
    const existing = await req.app.locals.storage.getOrderById(orderId);
    if (!existing) return res.status(404).json({ success: false, message: 'Order not found' });
    const updated = await req.app.locals.storage.updateOrderStatus(orderId, 'delivered');
    await req.app.locals.storage.createOrderTracking({ orderId, status: 'delivered', message: 'Order delivered successfully' });
    return res.json({ success: true, orderId, status: updated?.status || 'delivered' });
  } catch (e: any) {
    return res.status(400).json({ success: false, message: e?.message || 'Failed to deliver order' });
  }
});

// Dispatch compatibility
router.get('/dispatch/active', authenticateToken, async (req: any, res: any) => {
  // Source from storage: orders available for dispatch
  try {
    const orders = await req.app.locals.storage.getAvailableOrders();
    return res.json({ success: true, data: orders || [] });
  } catch (e) {
    return res.json({ success: true, data: [] });
  }
});

router.post('/dispatch/:id/accept', authenticateToken, async (req: any, res: any) => {
  try {
    const orderId = req.params.id;
    const partnerId = req.user?.id || 'partner';
    if (!orderId) return res.status(400).json({ success: false, message: 'orderId required' });
    const order = await req.app.locals.storage.getOrderById(orderId);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    // Assign in storage and mark status
    await req.app.locals.storage.assignOrderToPartner(orderId, partnerId);
    await req.app.locals.storage.createOrderTracking({ orderId, status: 'assigned', message: `Order assigned to partner ${partnerId}` });
    return res.json({ success: true, orderId });
  } catch (e: any) {
    return res.status(400).json({ success: false, message: e?.message || 'Failed to accept order' });
  }
});

// Deliveries compatibility
router.get('/deliveries/:orderId/location', authenticateToken, async (req: any, res: any) => {
  try {
    const orderId = req.params.orderId;
    if (!orderId) return res.status(400).json({ success: false, message: 'orderId required' });
    const order = await req.app.locals.storage.getOrderById(orderId);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (!order.assignedTo) return res.json({ success: true, location: null });
    const partner = await req.app.locals.storage.getDeliveryPartner(order.assignedTo);
    const location = partner?.currentLocation || null;
    return res.json({ success: true, location });
  } catch (e) {
    return res.json({ success: true, location: null });
  }
});

router.post('/deliveries/:orderId/messages', authenticateToken, async (req: any, res: any) => {
  try {
    const orderId = req.params.orderId;
    const content = typeof req.body?.content === 'string' ? req.body.content.trim() : '';
    if (!orderId) return res.status(400).json({ success: false, message: 'orderId required' });
    if (!content) return res.status(400).json({ success: false, message: 'content required' });
    const message = await req.app.locals.storage.addDeliveryMessage(orderId, req.user?.id || 'user', content);
    return res.json({ success: true, message });
  } catch (e: any) {
    return res.status(400).json({ success: false, message: e?.message || 'Failed to send message' });
  }
});

// Deliveries actions (aliases used by frontend component)
router.post('/deliveries/:orderId/pickup', authenticateToken, async (req: any, res: any) => {
  try {
    const orderId = req.params.orderId;
    if (!orderId) return res.status(400).json({ success: false, message: 'orderId required' });
    const order = await req.app.locals.storage.getOrderById(orderId);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    await req.app.locals.storage.updateOrderStatus(orderId, 'picked_up');
    await req.app.locals.storage.createOrderTracking({ orderId, status: 'picked_up', message: 'Order picked up' });
    return res.json({ success: true });
  } catch (e: any) {
    return res.status(400).json({ success: false, message: e?.message || 'Failed to mark pickup' });
  }
});

router.post('/deliveries/:orderId/complete', authenticateToken, async (req: any, res: any) => {
  try {
    const orderId = req.params.orderId;
    if (!orderId) return res.status(400).json({ success: false, message: 'orderId required' });
    const order = await req.app.locals.storage.getOrderById(orderId);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    await req.app.locals.storage.updateOrderStatus(orderId, 'delivered');
    await req.app.locals.storage.createOrderTracking({ orderId, status: 'delivered', message: 'Order delivered' });
    return res.json({ success: true });
  } catch (e: any) {
    return res.status(400).json({ success: false, message: e?.message || 'Failed to complete delivery' });
  }
});

// Conversations / AI chat compatibility
router.get('/conversations', authenticateToken, async (req: any, res: any) => {
  try {
    const convs = await req.app.locals.storage.listConversations(req.user?.id || 'user');
    return res.json({ success: true, data: convs });
  } catch (e) {
    return res.json({ success: true, data: [] });
  }
});

router.get('/conversations/:id/messages', authenticateToken, async (req: any, res: any) => {
  try {
    const msgs = await req.app.locals.storage.listConversationMessages(req.params.id);
    return res.json({ success: true, data: msgs });
  } catch (e) {
    return res.json({ success: true, data: [] });
  }
});

router.post('/conversations', authenticateToken, async (req: any, res: any) => {
  try {
    const title = typeof req.body?.title === 'string' ? req.body.title.trim() : undefined;
    const conv = await req.app.locals.storage.createConversation(req.user?.id || 'user', title);
    return res.json({ success: true, id: conv.id, conversation: conv });
  } catch (e: any) {
    return res.status(400).json({ success: false, message: e?.message || 'Failed to create conversation' });
  }
});

// Partner wallet (aliases for UI demo)
router.post('/partners/:partnerId/rewards/:rewardId/redeem', authenticateToken, async (req: any, res: any) => {
  try {
    const { partnerId, rewardId } = req.params;
    if (!partnerId || !rewardId) return res.status(400).json({ success: false, message: 'partnerId and rewardId required' });
    // In MVP, just acknowledge redemption
    return res.json({ success: true, partnerId, rewardId, redeemedAt: new Date().toISOString() });
  } catch (e: any) {
    return res.status(400).json({ success: false, message: e?.message || 'Failed to redeem reward' });
  }
});

router.post('/partners/:partnerId/withdraw', authenticateToken, async (req: any, res: any) => {
  try {
    const { partnerId } = req.params;
    const amount = Number(req.body?.amount || 0);
    if (!partnerId) return res.status(400).json({ success: false, message: 'partnerId required' });
    if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ success: false, message: 'valid amount required' });
    // In MVP, return success; storage balance tracking can be added later
    return res.json({ success: true, partnerId, amount, withdrawnAt: new Date().toISOString() });
  } catch (e: any) {
    return res.status(400).json({ success: false, message: e?.message || 'Failed to withdraw' });
  }
});

router.post('/ai/chat', async (req: any, res: any) => {
  try {
    const text = await aiChatbot.generateResponse(req.user?.id || 'user', req.body?.message || '', req.body?.conversationId || 'default');
    return res.json({ success: true, reply: text });
  } catch (e) {
    return res.status(200).json({ success: true, reply: "I'm having trouble right now. Please try again later." });
  }
});

// Search and demand compatibility
router.get('/search', async (req: any, res: any) => {
  try {
    const results = await semanticSearch.searchProducts((req.query?.q as string) || '', 10);
    return res.json({ success: true, data: results || [] });
  } catch (e) {
    return res.json({ success: true, data: [] });
  }
});

router.get('/demand/current', async (_req: any, res: any) => {
  try {
    const now = new Date();
    const prediction = await demandPredictor.predictDemand('main', now);
    return res.json({ success: true, data: prediction });
  } catch (e) {
    return res.json({ success: true, data: [] });
  }
});

// Apply security middleware to all routes
// Apply rate limiting to all routes
router.use((req, res, next) => {
  // Initialize services with storage on first request
  if (!isLocationServiceInitialized && req.app.locals.storage) {
    locationTrackingService.setStorage(req.app.locals.storage);
    isLocationServiceInitialized = true;
    console.log('✅ Location tracking service initialized with storage');
  }

  if (!isInventoryServiceInitialized && req.app.locals.storage) {
    inventoryService.setStorage(req.app.locals.storage);
    // Initialize inventory for all products asynchronously
    inventoryService.initializeAllProducts().catch(console.error);
    isInventoryServiceInitialized = true;
    console.log('✅ Inventory service initialized with storage');
  }

  if (!isNotificationServiceInitialized && req.app.locals.storage) {
    notificationService.setStorage(req.app.locals.storage);
    isNotificationServiceInitialized = true;
    console.log('✅ Notification service initialized with storage');
    
    // Connect services to WebSocket for real-time events
    setupWebSocketIntegration();
    
    // Initialize partner assignment service
    if (!isPartnerAssignmentInitialized) {
      partnerAssignmentService.setStorage(req.app.locals.storage);
      isPartnerAssignmentInitialized = true;
      console.log('✅ Partner assignment service initialized');
      
      // Set up auto-assignment interval
      setInterval(() => {
        partnerAssignmentService.autoAssignReadyOrders().catch(console.error);
      }, 30000); // Check every 30 seconds
    }
  }

  // Rate limiting is handled at app level, not per request
  next();
});

// ===== HEALTH CHECK =====
router.get('/health', (req: any, res: any) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    session: {
      hasSession: !!req.session,
      sessionId: req.sessionID,
      userId: req.session?.userId
    }
  });
});

// ===== AUTHENTICATION ROUTES =====

// User registration
router.post('/auth/signup', async (req: any, res: any) => {
  try {
    console.log('🔐 Signup request received:', { body: req.body });
    
    const { fullName, email, password, userId, landmark, phone, studentId } = req.body;
    
    if (!email || !password || !fullName || !userId || !landmark || !phone || !studentId) {
      return res.status(400).json({ 
        success: false, 
        message: 'All fields are required: fullName, email, password, userId, landmark, phone, studentId' 
      });
    }

    const existingUser = await req.app.locals.storage.getUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({ 
        success: false, 
        message: 'User with this email already exists.' 
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const [firstName, ...lastNameParts] = fullName.split(' ');
    const lastName = lastNameParts.join(' ') || '';

    const newUser = await req.app.locals.storage.createUser({
      id: userId,
      email,
      firstName,
      lastName,
      collegeId: userId,
      studentId,
      hostelAddress: landmark,
      phone,
      profileImageUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(fullName)}`,
    });

    await req.app.locals.storage.createUserCredential({
      userId: newUser.id,
      email,
      passwordHash: hashedPassword,
    });

    req.session.userId = newUser.id;
    
    console.log('✅ Signup successful:', {
      userId: newUser.id,
      email: newUser.email,
      sessionId: req.sessionID,
      sessionData: req.session
    });

    res.json({ 
      success: true, 
      message: 'Signup successful and logged in.', 
      user: newUser 
    });
  } catch (error: any) {
    console.error('❌ Signup error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Signup failed.' 
    });
  }
});

// User login
router.post('/auth/login', async (req: any, res: any) => {
  try {
    console.log('🔐 Login request received:', { body: req.body });
    
    const { email, userId, password } = req.body;
    
    if (!password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Password is required.' 
      });
    }

    const identifier = email || userId;
    if (!identifier) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email or User ID is required.' 
      });
    }

    const userCredentials = await req.app.locals.storage.getUserCredentials(identifier);
    if (!userCredentials) {
      console.log('❌ Login failed: Invalid credentials for identifier:', identifier);
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials.' 
      });
    }

    const isPasswordValid = await bcrypt.compare(password, userCredentials.passwordHash);
    if (!isPasswordValid) {
      console.log('❌ Login failed: Invalid password for user:', userCredentials.userId);
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials.' 
      });
    }

    const user = await req.app.locals.storage.getUserById(userCredentials.userId);
    if (!user) {
      console.log('❌ Login failed: User not found:', userCredentials.userId);
      return res.status(401).json({ 
        success: false, 
        message: 'User not found.' 
      });
    }

    req.session.userId = user.id;
    
    console.log('✅ Login successful:', {
      userId: user.id,
      email: user.email,
      sessionId: req.sessionID,
      sessionData: req.session
    });

    res.json({ 
      success: true, 
      message: 'Login successful.', 
      user 
    });
  } catch (error: any) {
    console.error('❌ Login error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Login failed.' 
    });
  }
});

// User logout
router.post('/auth/logout', (req: any, res: any) => {
  try {
    console.log('🔐 Logout request received');
    
    req.session.destroy((err: any) => {
      if (err) {
        console.error('❌ Logout error:', err);
        return res.status(500).json({ 
          success: false, 
          message: 'Logout failed.' 
        });
      }
      
      res.clearCookie('connect.sid');
      console.log('✅ Logout successful');
      
      res.json({ 
        success: true, 
        message: 'Logged out successfully.' 
      });
    });
  } catch (error: any) {
    console.error('❌ Logout error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Logout failed.' 
    });
  }
});

// Get current user
router.get('/auth/user', async (req: any, res: any) => {
  try {
    console.log('🔍 Get user request received');
    
    const userId = req.session?.userId;
    const sessionId = req.sessionID;
    
    console.log('🔍 Session info:', {
      sessionId,
      userId,
      sessionData: req.session,
      hasSession: !!req.session,
      cookie: req.headers.cookie
    });
    
    if (!userId) {
      console.log('❌ No userId in session - returning 401');
      return res.status(401).json({ 
        success: false, 
        message: 'Not authenticated' 
      });
    }

    const user = await req.app.locals.storage.getUserById(userId);
    if (!user) {
      console.log('❌ User not found in database - returning 401');
      return res.status(401).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    console.log('✅ User authenticated successfully:', { 
      userId, 
      userEmail: user.email 
    });
    
    res.json({ 
      success: true, 
      user 
    });
  } catch (error: any) {
    console.error('❌ Get user error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to get user' 
    });
  }
});

// ===== MAINTENANCE/UTILS (DEV) =====

// Dedupe user credentials (development utility)
router.post('/admin/maintenance/dedupe-credentials', async (req: any, res: any) => {
  try {
    if (!req.app?.locals?.storage?.dedupeUserCredentials) {
      return res.status(501).json({ success: false, message: 'Dedupe utility not available' });
    }
    const result = await req.app.locals.storage.dedupeUserCredentials();
    return res.json({ success: true, removed: result.removed });
  } catch (error: any) {
    console.error('❌ Dedupe credentials error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to dedupe' });
  }
});

// Simple auth health endpoint
router.get('/auth/health', (req: any, res: any) => {
  try {
    const userId = req.session?.userId;
    return res.json({
      success: true,
      session: {
        hasSession: !!req.session,
        userId: userId || null
      },
      authenticated: !!userId
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Health check failed' });
  }
});

// ===== ZPOINTS WALLET SYSTEM =====

// Get user ZPoints balance
router.get('/users/:userId/zpoints', authenticateToken, async (req: any, res: any) => {
  try {
    const { userId } = req.params;
    const requestingUserId = req.session?.userId;
    
    // Users can only access their own ZPoints balance
    if (requestingUserId !== userId && !req.session?.isAdmin) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const balance = await req.app.locals.storage.getUserZPointsBalance(userId);
    res.json({ success: true, balance });
  } catch (error: any) {
    console.error('Error fetching ZPoints balance:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch ZPoints balance' });
  }
});

// Credit ZPoints (admin only)
router.post('/users/:userId/zpoints/credit', authenticateToken, async (req: any, res: any) => {
  try {
    const { userId } = req.params;
    const { amount, description } = req.body;
    const adminId = req.session?.userId;

    // Only admins can credit ZPoints
    if (!req.session?.isAdmin) {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid amount' });
    }

    const result = await req.app.locals.storage.creditZPoints(userId, amount, description, adminId);
    
    // Send WebSocket notification to user
    if (req.app.locals.websocketService) {
      req.app.locals.websocketService.sendToUser(userId, {
        type: 'zpoints_balance_updated',
        data: {
          newBalance: result.newBalance,
          amount: amount,
          type: 'credit',
          description
        }
      });
    }

    res.json({ success: true, ...result });
  } catch (error: any) {
    console.error('Error crediting ZPoints:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to credit ZPoints' });
  }
});

// Debit ZPoints (admin only)
router.post('/users/:userId/zpoints/debit', authenticateToken, async (req: any, res: any) => {
  try {
    const { userId } = req.params;
    const { amount, description } = req.body;
    const adminId = req.session?.userId;

    // Only admins can debit ZPoints
    if (!req.session?.isAdmin) {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid amount' });
    }

    const result = await req.app.locals.storage.debitZPoints(userId, amount, description);
    
    // Send WebSocket notification to user
    if (req.app.locals.websocketService) {
      req.app.locals.websocketService.sendToUser(userId, {
        type: 'zpoints_balance_updated',
        data: {
          newBalance: result.newBalance,
          amount: amount,
          type: 'debit',
          description
        }
      });
    }

    res.json({ success: true, ...result });
  } catch (error: any) {
    console.error('Error debiting ZPoints:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to debit ZPoints' });
  }
});

// Get ZPoints transaction history
router.get('/users/:userId/zpoints/history', authenticateToken, async (req: any, res: any) => {
  try {
    const { userId } = req.params;
    const { limit = 50 } = req.query;
    const requestingUserId = req.session?.userId;
    
    // Users can only access their own transaction history
    if (requestingUserId !== userId && !req.session?.isAdmin) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const transactions = await req.app.locals.storage.getZPointsTransactionHistory(userId, parseInt(limit as string));
    res.json({ success: true, transactions });
  } catch (error: any) {
    console.error('Error fetching ZPoints history:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch ZPoints history' });
  }
});

// Pay order with ZPoints
router.post('/orders/:orderId/pay-with-zpoints', authenticateToken, async (req: any, res: any) => {
  try {
    const { orderId } = req.params;
    const userId = req.session?.userId;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const result = await req.app.locals.storage.payOrderWithZPoints(orderId, userId);
    
    // Send WebSocket notifications
    if (req.app.locals.websocketService) {
      // Notify user about ZPoints deduction
      req.app.locals.websocketService.sendToUser(userId, {
        type: 'zpoints_balance_updated',
        data: {
          newBalance: result.newBalance,
          amount: result.zpointsUsed,
          type: 'debit',
          description: `Payment for order ${orderId}`
        }
      });

      // Notify about order payment
      req.app.locals.websocketService.broadcast({
        type: 'order_payment_completed',
        orderId: orderId,
        paymentMethod: 'zpoints',
        amount: result.zpointsUsed
      }, (conn: any) => !!conn.isPartner);
    }

    res.json({ success: true, ...result });
  } catch (error: any) {
    console.error('Error paying with ZPoints:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to pay with ZPoints' });
  }
});

// ===== PRODUCTS & CATEGORIES =====

// Get categories
router.get('/categories', async (req: any, res: any) => {
  try {
    const categories = await req.app.locals.storage.getCategories();
    res.json({ success: true, categories });
  } catch (error: any) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch categories' });
  }
});

// Admin: create category
router.post('/categories', authenticateToken, async (req: any, res: any) => {
  try {
    if (req.user?.role !== 'admin') return res.status(403).json({ success: false, message: 'Admin only' });
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    if (!name) return res.status(400).json({ success: false, message: 'name required' });
    const category = await req.app.locals.storage.createCategory({ name, description: req.body?.description || '' });
    return res.json({ success: true, category });
  } catch (e: any) {
    return res.status(400).json({ success: false, message: e?.message || 'Failed to create category' });
  }
});

// Get products
router.get('/products', async (req: any, res: any) => {
  try {
    const { categoryId } = req.query;
    let products;
    
    if (categoryId) {
      products = await req.app.locals.storage.getProductsByCategory(categoryId as string);
    } else {
      products = await req.app.locals.storage.getProducts();
    }
    
    res.json({ success: true, products });
  } catch (error: any) {
    console.error('Error fetching products:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch products' });
  }
});

// Get single product
router.get('/products/:id', async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const product = await req.app.locals.storage.getProductById(id);
    
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    
    res.json({ success: true, product });
  } catch (error: any) {
    console.error('Error fetching product:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch product' });
  }
});

// Admin: create product
router.post('/products', authenticateToken, async (req: any, res: any) => {
  try {
    if (req.user?.role !== 'admin') return res.status(403).json({ success: false, message: 'Admin only' });
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    const price = Number(req.body?.price);
    const categoryId = typeof req.body?.categoryId === 'string' ? req.body.categoryId.trim() : '';
    if (!name || !categoryId || !Number.isFinite(price)) return res.status(400).json({ success: false, message: 'name, price, categoryId required' });
    const product = await req.app.locals.storage.createProduct({
      name,
      price,
      categoryId,
      description: req.body?.description || '',
      imageUrl: req.body?.imageUrl || '',
      isPopular: !!req.body?.isPopular
    });
    return res.json({ success: true, product });
  } catch (e: any) {
    return res.status(400).json({ success: false, message: e?.message || 'Failed to create product' });
  }
});

// Admin: update product
router.put('/products/:id', authenticateToken, async (req: any, res: any) => {
  try {
    if (req.user?.role !== 'admin') return res.status(403).json({ success: false, message: 'Admin only' });
    const id = req.params.id;
    if (!id) return res.status(400).json({ success: false, message: 'id required' });
    const updates: any = {};
    if (typeof req.body?.name === 'string') updates.name = req.body.name.trim();
    if (req.body?.price !== undefined) updates.price = Number(req.body.price);
    if (typeof req.body?.categoryId === 'string') updates.categoryId = req.body.categoryId.trim();
    if (typeof req.body?.description === 'string') updates.description = req.body.description;
    if (typeof req.body?.imageUrl === 'string') updates.imageUrl = req.body.imageUrl;
    if (req.body?.isPopular !== undefined) updates.isPopular = !!req.body.isPopular;
    const updated = await req.app.locals.storage.updateProduct(id, updates);
    if (!updated) return res.status(404).json({ success: false, message: 'Product not found' });
    return res.json({ success: true, product: updated });
  } catch (e: any) {
    return res.status(400).json({ success: false, message: e?.message || 'Failed to update product' });
  }
});

// Admin: delete product
router.delete('/products/:id', authenticateToken, async (req: any, res: any) => {
  try {
    if (req.user?.role !== 'admin') return res.status(403).json({ success: false, message: 'Admin only' });
    const id = req.params.id;
    if (!id) return res.status(400).json({ success: false, message: 'id required' });
    const ok = await req.app.locals.storage.deleteProduct(id);
    if (!ok) return res.status(404).json({ success: false, message: 'Product not found' });
    return res.json({ success: true });
  } catch (e: any) {
    return res.status(400).json({ success: false, message: e?.message || 'Failed to delete product' });
  }
});

// Admin: bulk delete by names
router.post('/products/delete-by-names', authenticateToken, async (req: any, res: any) => {
  try {
    if (req.user?.role !== 'admin') return res.status(403).json({ success: false, message: 'Admin only' });
    const names = (req.body?.names || []) as string[];
    if (!Array.isArray(names) || names.length === 0) return res.status(400).json({ success: false, message: 'names[] required' });
    const result = await req.app.locals.storage.deleteProductsByNames(names);
    return res.json({ success: true, ...result });
  } catch (e: any) {
    return res.status(400).json({ success: false, message: e?.message || 'Failed to delete products' });
  }
});

// Get product recommendations
router.get('/recommendations', async (req: any, res: any) => {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    // Get all products for recommendations
    const allProducts = await req.app.locals.storage.getProducts();
    
    // Sort by popularity first, then by other criteria
    const sortedProducts = allProducts.sort((a: any, b: any) => {
      // Popular products first
      if (a.isPopular && !b.isPopular) return -1;
      if (!a.isPopular && b.isPopular) return 1;
      
      // Then by price (lower first for better recommendations)
      return parseFloat(a.price) - parseFloat(b.price);
    });

    res.json({ success: true, items: sortedProducts });
  } catch (error: any) {
    console.error('Error fetching recommendations:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch recommendations' });
  }
});

// ===== CART OPERATIONS =====

// Get cart items
router.get('/cart', async (req: any, res: any) => {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const rawItems = await req.app.locals.storage.getCartItems(userId);
    // Enrich cart items with product details expected by frontend
    const cartItems = await Promise.all((rawItems || []).map(async (it: any) => {
      const product = await req.app.locals.storage.getProductById(it.productId);
      return {
        id: it.id,
        quantity: it.quantity,
        product: product ? {
          id: product.id,
          name: product.name,
          price: String(product.price),
          imageUrl: product.imageUrl || null,
          category: product.categoryId ? { id: product.categoryId, name: product.categoryName || 'General', color: product.categoryColor || null } : null
        } : { id: it.productId, name: 'Item', price: '0', imageUrl: null, category: null }
      };
    }));

    res.json({ success: true, cartItems });
  } catch (error: any) {
    console.error('Error fetching cart:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch cart' });
  }
});

// Add to cart
router.post('/cart/add', async (req: any, res: any) => {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const { productId, quantity } = req.body;
    if (!productId || !quantity) {
      return res.status(400).json({ success: false, message: 'Product ID and quantity are required' });
    }

    const cartItem = await req.app.locals.storage.addToCart({
      userId,
      productId,
      quantity: parseInt(quantity)
    });

    res.json({ success: true, cartItem });
  } catch (error: any) {
    console.error('Error adding to cart:', error);
    res.status(500).json({ success: false, message: 'Failed to add to cart' });
  }
});

// Update cart item
router.put('/cart/:id', async (req: any, res: any) => {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const { id } = req.params;
    const { quantity } = req.body;

    const cartItem = await req.app.locals.storage.updateCartItem(id, parseInt(quantity));
    res.json({ success: true, cartItem });
  } catch (error: any) {
    console.error('Error updating cart:', error);
    res.status(500).json({ success: false, message: 'Failed to update cart' });
  }
});

// Remove from cart
router.delete('/cart/:id', async (req: any, res: any) => {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const { id } = req.params;
    await req.app.locals.storage.removeFromCart(id);
    res.json({ success: true, message: 'Item removed from cart' });
  } catch (error: any) {
    console.error('Error removing from cart:', error);
    res.status(500).json({ success: false, message: 'Failed to remove from cart' });
  }
});

// Clear cart
router.delete('/cart', async (req: any, res: any) => {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    await req.app.locals.storage.clearCart(userId);
    res.json({ success: true, message: 'Cart cleared' });
  } catch (error: any) {
    console.error('Error clearing cart:', error);
    res.status(500).json({ success: false, message: 'Failed to clear cart' });
  }
});

// ===== ORDERS =====

// Get order tracking data (frontend expects this format)
router.get('/orders/:id/tracking', async (req: any, res: any) => {
  try {
    const { id } = req.params;
    
    // Get order details
    const order = await req.app.locals.storage.getOrderById(id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Get workflow status
    const workflow = new IntegratedOrderWorkflow(req.app.locals.storage);
    const workflowStatus = await workflow.getOrderWorkflowStatus(id);

    // Get location tracking session if exists
    const trackingSession = locationTrackingService.getTrackingSession(order.assignedTo || '', id);
    
    // Get partner location if assigned
    let partnerLocation = null;
    if (order.assignedTo) {
      const partnerLocationData = locationTrackingService.getPartnerLocation(order.assignedTo);
      if (partnerLocationData) {
        partnerLocation = partnerLocationData.location;
      }
    }

    // Create tracking timeline
    const tracking = [
      {
        id: `${id}-placed`,
        status: 'placed',
        message: 'Order has been placed successfully',
        createdAt: order.createdAt,
        location: null as any
      }
    ];

    if (order.paidAt) {
      tracking.push({
        id: `${id}-confirmed`,
        status: 'confirmed',
        message: 'Payment confirmed, order is being prepared',
        createdAt: order.paidAt,
        location: null as any
      });
    }

    if (order.acceptedAt) {
      tracking.push({
        id: `${id}-accepted`,
        status: 'accepted',
        message: 'Order has been accepted',
        createdAt: order.acceptedAt,
        location: null as any
      });
    }

    if (order.pickedUpAt) {
      tracking.push({
        id: `${id}-picked_up`,
        status: 'out_for_delivery',
        message: 'Order is out for delivery',
        createdAt: order.pickedUpAt,
        location: partnerLocation || null
      });
    }

    if (order.deliveredAt) {
      tracking.push({
        id: `${id}-delivered`,
        status: 'delivered',
        message: 'Order has been delivered successfully',
        createdAt: order.deliveredAt,
        location: partnerLocation || null
      });
    }

    // Add current location if partner is active
    if (partnerLocation && order.status === 'out_for_delivery') {
      tracking.push({
        id: `${id}-current`,
        status: 'location_update',
        message: 'Current delivery location',
        createdAt: new Date(),
        location: partnerLocation || null
      });
    }

    // Get delivery assignment info
    const delivery = order.assignedTo ? {
      deliveryPartnerId: order.assignedTo,
      assignedAt: order.acceptedAt,
      estimatedDeliveryTime: workflowStatus?.estimatedDeliveryTime || new Date(Date.now() + 30 * 60 * 1000),
      status: order.status
    } : null;

    res.json({
      success: true,
      order: {
        ...order,
        orderItems: order.items?.map((item: any) => ({
          id: item.productId,
          quantity: item.quantity,
          unitPrice: item.price,
          product: {
            id: item.productId,
            name: item.productName || `Product ${item.productId}`,
            imageUrl: `/products/${item.productId}.jpg`
          }
        })) || []
      },
      tracking,
      delivery
    });

  } catch (error: any) {
    console.error('Get order tracking error:', error);
    res.status(500).json({ success: false, message: 'Failed to get order tracking' });
  }
});

// Accept order (for delivery partners)
router.post('/orders/:id/accept', async (req: any, res: any) => {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const { id } = req.params;
    
    // Use workflow to assign partner
    const workflow = new IntegratedOrderWorkflow(req.app.locals.storage);
    const success = await workflow.handlePartnerAssignment(id, userId);
    
    if (success) {
      // Start location tracking
      const partnerLocation = locationTrackingService.getPartnerLocation(userId);
      if (partnerLocation) {
        await locationTrackingService.startTrackingSession(userId, id, partnerLocation.location);
      }

      res.json({
        success: true,
        message: 'Order accepted successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to accept order'
      });
    }

  } catch (error: any) {
    console.error('Accept order error:', error);
    res.status(500).json({ success: false, message: 'Failed to accept order' });
  }
});

// Update order status (for delivery partners)
router.post('/orders/:id/status', async (req: any, res: any) => {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const { id } = req.params;
    const { status, message, location } = req.body;

    if (!status) {
      return res.status(400).json({ success: false, message: 'Status is required' });
    }

    const workflow = new IntegratedOrderWorkflow(req.app.locals.storage);
    
    // Handle different status transitions
    let success = false;
    
    switch (status) {
      case 'preparing':
        success = await workflow.transitionOrder(id, 'preparing', 'manual', { message });
        break;
      case 'out_for_delivery':
        success = await workflow.handleOrderPickup(id, userId);
        break;
      case 'delivered':
        if (location) {
          await locationTrackingService.completeTrackingSession(userId, id, location);
        }
        success = await workflow.handleOrderDelivery(id, userId);
        break;
      default:
        success = await workflow.transitionOrder(id, status as any, 'manual', { message });
    }

    if (success) {
      res.json({
        success: true,
        message: 'Order status updated successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to update order status'
      });
    }

  } catch (error: any) {
    console.error('Update order status error:', error);
    res.status(500).json({ success: false, message: 'Failed to update order status' });
  }
});

// Update order location (for delivery partners)
router.post('/orders/:id/location', async (req: any, res: any) => {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const { id } = req.params;
    const { location } = req.body;

    if (!location || !location.lat || !location.lng) {
      return res.status(400).json({
        success: false,
        message: 'Valid location (lat, lng) is required'
      });
    }

    // Update partner location for this order
    await locationTrackingService.updatePartnerLocation({
      partnerId: userId,
      orderId: id,
      location: {
        lat: parseFloat(location.lat),
        lng: parseFloat(location.lng),
        timestamp: new Date(),
        address: location.address
      },
      status: 'delivering'
    });

    res.json({
      success: true,
      message: 'Location updated successfully'
    });

  } catch (error: any) {
    console.error('Update order location error:', error);
    res.status(500).json({ success: false, message: 'Failed to update location' });
  }
});

// Payment confirmation (webhook endpoint)
router.post('/payments/webhook', async (req: any, res: any) => {
  try {
    const { orderId, status, transactionId, amount } = req.body;

    if (!orderId) {
      return res.status(400).json({ success: false, message: 'Order ID is required' });
    }

    if (status === 'success') {
      // Payment confirmed - transition order through workflow
      const workflow = new IntegratedOrderWorkflow(req.app.locals.storage);
      
      // First confirm payment  
      const paymentConfirmed = await workflow.handlePaymentConfirmation(orderId);

      if (paymentConfirmed) {
        console.log(`💳 Payment confirmed for order ${orderId}`);
        
        // Update order payment status
        await req.app.locals.storage.updateOrderStatus(orderId, 'confirmed', {
          paymentStatus: 'completed',
          paidAt: new Date(),
          transactionId
        });

        // Transition to preparing status after payment
        setTimeout(async () => {
          try {
            await workflow.transitionOrder(orderId, 'preparing', 'automatic', {
              message: 'Order is being prepared'
            });
            
            // Transition to ready after preparation time
            setTimeout(async () => {
              try {
                await workflow.transitionOrder(orderId, 'ready', 'automatic', {
                  message: 'Order is ready for pickup'
                });
                console.log(`✅ Order ${orderId} is ready for delivery assignment`);
              } catch (error) {
                console.error(`❌ Failed to transition order ${orderId} to ready:`, error);
              }
            }, 5 * 60 * 1000); // 5 minutes preparation time
            
          } catch (error) {
            console.error(`❌ Failed to transition order ${orderId} to preparing:`, error);
          }
        }, 1000); // Small delay to ensure payment is processed

        res.json({
          success: true,
          message: 'Payment confirmed and order processing started'
        });

      } else {
        res.status(400).json({
          success: false,
          message: 'Failed to confirm payment'
        });
      }

    } else if (status === 'failed') {
      // Payment failed - mark order as failed
      await req.app.locals.storage.updateOrderStatus(orderId, 'failed', {
        paymentStatus: 'failed',
        failureReason: 'Payment failed'
      });

      res.json({
        success: true,
        message: 'Payment failure recorded'
      });

    } else {
      res.status(400).json({
        success: false,
        message: 'Invalid payment status'
      });
    }

  } catch (error: any) {
    console.error('Payment webhook error:', error);
    res.status(500).json({ success: false, message: 'Payment processing failed' });
  }
});

// Manual payment confirmation (for testing/admin)
router.post('/orders/:id/confirm-payment', async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { amount, paymentMethod } = req.body;

    const workflow = new IntegratedOrderWorkflow(req.app.locals.storage);
    
    const success = await workflow.handlePaymentConfirmation(id);

    if (success) {
      // Auto-transition to preparing
      setTimeout(async () => {
        await workflow.transitionOrder(id, 'preparing', 'automatic', {
          message: 'Order payment confirmed, now preparing'
        });
        
        // Then to ready
        setTimeout(async () => {
          await workflow.transitionOrder(id, 'ready', 'automatic', {
            message: 'Order ready for delivery'
          });
        }, 3000); // 3 second prep time for manual confirmation
        
      }, 1000);

      res.json({
        success: true,
        message: 'Payment confirmed manually'
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to confirm payment'
      });
    }

  } catch (error: any) {
    console.error('Manual payment confirmation error:', error);
    res.status(500).json({ success: false, message: 'Failed to confirm payment' });
  }
});

// Create order
router.post('/orders', async (req: any, res: any) => {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const { orderData, items } = req.body;
    
    if (!orderData || !items || !Array.isArray(items)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid order data. Order data and items array are required.' 
      });
    }

    // Basic validation for MongoDB storage
    if (!orderData || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid order data. Order data and items array are required.' 
      });
    }

    // Create order directly without notification service
    const orderId = await req.app.locals.storage.createOrder(orderData, items);

    // Initialize automated workflow for this order
    const workflow = new IntegratedOrderWorkflow(req.app.locals.storage);
    await workflow.initializeOrder(orderId, 'placed');

    res.json({ 
      success: true, 
      message: 'Order created successfully', 
      orderId,
      paymentMethod: orderData.paymentMethod 
    });
  } catch (error: any) {
    console.error('Error creating order:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to create order' 
    });
  }
});

// Get user orders
router.get('/orders', async (req: any, res: any) => {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const orders = await req.app.locals.storage.getOrdersByUser(userId);
    res.json({ success: true, orders });
  } catch (error: any) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch orders' });
  }
});

// Get single order
router.get('/orders/:id', async (req: any, res: any) => {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const { id } = req.params;
    const order = await req.app.locals.storage.getOrderById(id);
    
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Check if user owns this order or is admin
    if (order.customerId !== userId) {
      const user = await req.app.locals.storage.getUserById(userId);
      if (!user?.isAdmin) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
    }

    res.json({ success: true, order });
  } catch (error: any) {
    console.error('Error fetching order:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch order' });
  }
});

// ===== NOTIFICATIONS =====

// Get notifications
router.get('/notifications', async (req: any, res: any) => {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const notifications = await req.app.locals.storage.getNotificationsByUser(userId);
    res.json({ success: true, notifications });
  } catch (error: any) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch notifications' });
  }
});

// Mark notification as read
router.post('/notifications/:id/read', async (req: any, res: any) => {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const { id } = req.params;
    await req.app.locals.storage.markNotificationAsRead(id);
    res.json({ success: true, message: 'Notification marked as read' });
  } catch (error: any) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ success: false, message: 'Failed to mark notification as read' });
  }
});

// ===== ADMIN ROUTES =====

// Get admin profile
router.get('/admin/profile', async (req: any, res: any) => {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const user = await req.app.locals.storage.getUserById(userId);
    if (!user || !user.isAdmin) {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    res.json({ success: true, user });
  } catch (error: any) {
    console.error('Error fetching admin profile:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch admin profile' });
  }
});

// Get all users (admin)
router.get('/admin/users', async (req: any, res: any) => {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const user = await req.app.locals.storage.getUserById(userId);
    if (!user || !user.isAdmin) {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    const users = await req.app.locals.storage.getUsers();
    res.json({ success: true, users });
  } catch (error: any) {
    console.error('Error fetching admin users:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch admin users' });
  }
});

// Deactivate user (admin)
router.put('/admin/users/:userId/deactivate', async (req: any, res: any) => {
  try {
    const adminId = req.session?.userId;
    if (!adminId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const admin = await req.app.locals.storage.getUserById(adminId);
    if (!admin || !admin.isAdmin) {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    const { userId } = req.params;
    await req.app.locals.storage.updateUser(userId, { isActive: false });
    
    res.json({ success: true, message: 'User deactivated successfully' });
  } catch (error: any) {
    console.error('Error deactivating user:', error);
    res.status(500).json({ success: false, message: 'Failed to deactivate user' });
  }
});

// Activate user (admin)
router.put('/admin/users/:userId/activate', async (req: any, res: any) => {
  try {
    const adminId = req.session?.userId;
    if (!adminId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const admin = await req.app.locals.storage.getUserById(adminId);
    if (!admin || !admin.isAdmin) {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    const { userId } = req.params;
    await req.app.locals.storage.updateUser(userId, { isActive: true });
    
    res.json({ success: true, message: 'User activated successfully' });
  } catch (error: any) {
    console.error('Error activating user:', error);
    res.status(500).json({ success: false, message: 'Failed to activate user' });
  }
});

// Get all payments (admin)
router.get('/admin/payments', async (req: any, res: any) => {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const user = await req.app.locals.storage.getUserById(userId);
    if (!user || !user.isAdmin) {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    const payments = await req.app.locals.storage.getPayments();
    res.json({ success: true, payments });
  } catch (error: any) {
    console.error('Error fetching admin payments:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch admin payments' });
  }
});

// Confirm payment (admin)
router.put('/admin/payments/:paymentId/confirm', async (req: any, res: any) => {
  try {
    const adminId = req.session?.userId;
    if (!adminId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const admin = await req.app.locals.storage.getUserById(adminId);
    if (!admin || !admin.isAdmin) {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    const { paymentId } = req.params;
    await req.app.locals.storage.updatePayment(paymentId, { 
      status: 'completed', 
      paidAt: new Date() 
    });
    
    res.json({ success: true, message: 'Payment confirmed successfully' });
  } catch (error: any) {
    console.error('Error confirming payment:', error);
    res.status(500).json({ success: false, message: 'Failed to confirm payment' });
  }
});

// Refund payment (admin)
router.put('/admin/payments/:paymentId/refund', async (req: any, res: any) => {
  try {
    const adminId = req.session?.userId;
    if (!adminId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const admin = await req.app.locals.storage.getUserById(adminId);
    if (!admin || !admin.isAdmin) {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    const { paymentId } = req.params;
    await req.app.locals.storage.updatePayment(paymentId, { 
      status: 'refunded', 
      refundedAt: new Date() 
    });
    
    res.json({ success: true, message: 'Payment refunded successfully' });
  } catch (error: any) {
    console.error('Error refunding payment:', error);
    res.status(500).json({ success: false, message: 'Failed to refund payment' });
  }
});

// Send notification (admin)
router.post('/admin/notifications', async (req: any, res: any) => {
  try {
    const adminId = req.session?.userId;
    if (!adminId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const admin = await req.app.locals.storage.getUserById(adminId);
    if (!admin || !admin.isAdmin) {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    const { title, message, type, target } = req.body;
    
    // Create notification record
    const notification = await req.app.locals.storage.createNotification({
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title,
      message,
      type,
      target,
      sentBy: adminId,
      createdAt: new Date()
    });

    // Send via WebSocket to target users
    if (req.app.locals.websocketService) {
      const users = await req.app.locals.storage.getUsers();
      const targetUsers = users.filter((user: any) => {
        if (target === 'all') return true;
        if (target === 'customers') return user.role === 'user';
        if (target === 'partners') return user.role === 'partner';
        if (target === 'admins') return user.role === 'admin';
        return false;
      });

      targetUsers.forEach((user: any) => {
        req.app.locals.websocketService.sendToUser(user.id, {
          type: 'notification',
          data: {
            id: notification.id,
            title,
            message,
            type,
            createdAt: notification.createdAt
          }
        });
      });
    }
    
    res.json({ success: true, message: 'Notification sent successfully', notification });
  } catch (error: any) {
    console.error('Error sending notification:', error);
    res.status(500).json({ success: false, message: 'Failed to send notification' });
  }
});

// Get all orders (admin)
router.get('/admin/orders', async (req: any, res: any) => {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const user = await req.app.locals.storage.getUserById(userId);
    if (!user || !user.isAdmin) {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    const orders = await req.app.locals.storage.getOrders();
    res.json({ success: true, orders });
  } catch (error: any) {
    console.error('Error fetching admin orders:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch admin orders' });
  }
});

// Update order status (admin)
router.post('/admin/orders/:id/status', async (req: any, res: any) => {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const user = await req.app.locals.storage.getUserById(userId);
    if (!user || !user.isAdmin) {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    const { id } = req.params;
    const { status, assignedTo } = req.body;

    if (!status) {
      return res.status(400).json({ success: false, message: 'Status is required' });
    }

    await req.app.locals.storage.updateOrder(id, status);
    
    if (assignedTo) {
      await req.app.locals.storage.updateOrder(id, assignedTo);
    }

    res.json({ success: true, message: 'Order status updated successfully' });
  } catch (error: any) {
    console.error('Error updating order status:', error);
    res.status(500).json({ success: false, message: 'Failed to update order status' });
  }
});

// Assign order to delivery partner (admin)
router.post('/admin/orders/:id/assign', async (req: any, res: any) => {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const user = await req.app.locals.storage.getUserById(userId);
    if (!user || !user.isAdmin) {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    const { id } = req.params;
    const { partnerId } = req.body;

    if (!partnerId) {
      return res.status(400).json({ success: false, message: 'Partner ID is required' });
    }

    await req.app.locals.storage.updateOrder(id, partnerId);
    await req.app.locals.storage.updateOrder(id, 'assigned');

    res.json({ success: true, message: 'Order assigned successfully' });
  } catch (error: any) {
    console.error('Error assigning order:', error);
    res.status(500).json({ success: false, message: 'Failed to assign order' });
  }
});

// ===== DISPATCH & DELIVERY PARTNER ROUTES =====

// Get available orders for dispatch (frontend expects this)
router.get('/dispatch/available', async (req: any, res: any) => {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    // Get orders that are ready for assignment
    const orders = await req.app.locals.storage.getOrders();
    const availableOrders = orders
      .filter((order: any) => order.status === 'ready' && !order.assignedTo)
      .map((order: any) => ({
        orderId: order.id,
        amount: parseFloat(order.totalAmount),
        customerAddress: order.deliveryAddress,
        items: order.items?.map((item: any) => ({
          name: item.productName || `Product ${item.productId}`,
          quantity: item.quantity
        })) || [],
        expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes to accept
        createdAt: order.createdAt
      }));

    res.json({
      success: true,
      orders: availableOrders
    });

  } catch (error: any) {
    console.error('Get available dispatch orders error:', error);
    res.status(500).json({ success: false, message: 'Failed to get available orders' });
  }
});

// Get delivery partner's assigned orders
router.get('/delivery-partner/orders', async (req: any, res: any) => {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    // Get orders assigned to this partner
    const orders = await req.app.locals.storage.getOrders();
    const assignedOrders = orders
      .filter((order: any) => order.assignedTo === userId)
      .map((order: any) => ({
        id: order.id,
        orderNumber: order.id.slice(0, 8),
        status: order.status,
        totalAmount: order.totalAmount,
        deliveryAddress: order.deliveryAddress,
        customerId: order.customerId,
        createdAt: order.createdAt,
        orderItems: order.items?.map((item: any) => ({
          id: item.productId,
          productName: item.productName || `Product ${item.productId}`,
          quantity: item.quantity,
          price: item.price
        })) || []
      }));

    res.json({
      success: true,
      orders: assignedOrders
    });

  } catch (error: any) {
    console.error('Get delivery partner orders error:', error);
    res.status(500).json({ success: false, message: 'Failed to get assigned orders' });
  }
});

// Get delivery partner details
router.get('/delivery-partners/:id', async (req: any, res: any) => {
  try {
    const { id } = req.params;
    
    // Get partner details (for now, use user info)
    const partner = await req.app.locals.storage.getUserById(id);
    if (!partner) {
      return res.status(404).json({ success: false, message: 'Partner not found' });
    }

    // Get partner location
    const locationData = locationTrackingService.getPartnerLocation(id);
    
    res.json({
      success: true,
      partner: {
        id: partner.id,
        name: `${partner.firstName} ${partner.lastName}`,
        email: partner.email,
        phone: partner.phone,
        vehicleType: 'Walking', // Default for students
        rating: 4.8,
        currentLocation: locationData?.location || null,
        isOnline: !!locationData,
        totalDeliveries: 0 // Would come from delivery history
      }
    });

  } catch (error: any) {
    console.error('Get delivery partner error:', error);
    res.status(500).json({ success: false, message: 'Failed to get partner details' });
  }
});

// Get available orders for partners
router.get('/partner/orders/available', async (req: any, res: any) => {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const availableOrders = await req.app.locals.storage.getAvailableOrders();
    res.json({ success: true, orders: availableOrders });
  } catch (error: any) {
    console.error('Error fetching available orders:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch available orders' });
  }
});

// Accept order (partner)
router.post('/partner/orders/:id/accept', async (req: any, res: any) => {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const { id } = req.params;
    await req.app.locals.storage.updateOrder(id, userId);
    await req.app.locals.storage.updateOrder(id, 'accepted');

    res.json({ success: true, message: 'Order accepted successfully' });
  } catch (error: any) {
    console.error('Error accepting order:', error);
    res.status(500).json({ success: false, message: 'Failed to accept order' });
  }
});

// Update order status (partner)
router.post('/partner/orders/:id/status', async (req: any, res: any) => {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const { id } = req.params;
    const { status, location } = req.body;

    if (!status) {
      return res.status(400).json({ success: false, message: 'Status is required' });
    }

    await req.app.locals.storage.updateOrder(id, status);
    
    if (location) {
      await req.app.locals.storage.updateOrderLocation(id, location);
    }

    res.json({ success: true, message: 'Order status updated successfully' });
  } catch (error: any) {
    console.error('Error updating order status:', error);
    res.status(500).json({ success: false, message: 'Failed to update order status' });
  }
});

// Payment routes
router.post('/payment/generate-qr', async (req: any, res: any) => {
  try {
    const { orderId, amount } = req.body;
    
    if (!orderId || !amount) {
      return res.status(400).json({ error: 'Order ID and amount are required' });
    }

    const paymentDetails = {
      orderId,
      amount: parseFloat(amount),
      upiId: process.env.UPI_ID || 'zipzy.delivery@upi',
      merchantName: 'Zipzy Delivery',
      currency: 'INR'
    };

    const { qrCode, upiUrl } = await paymentService.generateUPIQR(paymentDetails);
    const instructions = paymentService.getPaymentInstructions(paymentDetails.amount);

    res.json({
      qrCode,
      upiUrl,
      instructions,
      orderId,
      amount: paymentDetails.amount
    });
  } catch (error: any) {
    console.error('Payment QR generation error:', error);
    res.status(500).json({ error: 'Failed to generate payment QR code' });
  }
});

// Authenticated variant (kept for clients that pass a session). The test script uses the dev route below.
router.post('/payment/confirm-auth', authenticateToken, async (req: any, res: any) => {
  try {
    const { orderId, amount } = req.body;
    const userId = (req.session as any).userId;
    
    if (!orderId || !amount) {
      return res.status(400).json({ error: 'Order ID and amount are required' });
    }

    // Confirm payment
    const paymentStatus = await paymentService.confirmPayment(orderId, userId);
    
    // Update order status to paid
    await req.app.locals.storage.updateOrderStatus(orderId, 'paid');
    
    // Assign delivery partner
    const availablePartners = await req.app.locals.storage.getAvailablePartners();
    if (availablePartners.length > 0) {
      const assignedPartner = availablePartners[0]; // Simple assignment
      await req.app.locals.storage.assignOrderToPartner(orderId, assignedPartner.id);
      
      // Generate settlement details
      const settlementDetails = paymentService.generateSettlementDetails(
        orderId, 
        20, // delivery fee
        assignedPartner.id
      );
      
      // Store settlement details
      await req.app.locals.storage.createSettlement(settlementDetails);
    }

    res.json({
      success: true,
      paymentStatus,
      message: 'Payment confirmed and order is being processed'
    });
  } catch (error: any) {
    console.error('Payment confirmation error:', error);
    res.status(500).json({ error: 'Failed to confirm payment' });
  }
});

// ===== TEST ENDPOINTS =====

// Test session
router.get('/auth/test-session', (req: any, res: any) => {
  res.json({
    success: true,
    session: {
      hasSession: !!req.session,
      sessionId: req.sessionID,
      userId: req.session?.userId,
      sessionData: req.session
    },
    cookies: req.headers.cookie
  });
});

// ===== TEST USER BYPASS ROUTES =====

// Create test users
router.post('/test/create-users', async (req: any, res: any) => {
  try {
    console.log('🔄 Creating test users...');
    const result = await createTestUsers(req.app.locals.storage);
    console.log('✅ Test users creation result:', result);
    res.json(result);
  } catch (error: any) {
    console.error('❌ Error creating test users:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get test user info
router.get('/test/user-info', (req: any, res: any) => {
  const info = getTestUserInfo();
  res.json({
    success: true,
    info,
    directLinks: {
      userLogin: `http://localhost:3000/login?email=${info.user.email}&password=${info.credentials.user.password}`,
      adminLogin: `http://localhost:3000/login?email=${info.admin.email}&password=${info.credentials.admin.password}`,
      userBypass: `http://localhost:3000/test/user-bypass`,
      adminBypass: `http://localhost:3000/test/admin-bypass`
    }
  });
});

// Direct user bypass login
router.post('/test/user-bypass', async (req: any, res: any) => {
  try {
    console.log('🔄 User bypass attempt...');
    
    // First, ensure test users exist
    await createTestUsers(req.app.locals.storage);
    
    const info = getTestUserInfo();
    console.log('📧 Looking for user email:', info.user.email);
    
    const user = await req.app.locals.storage.getUserByEmail(info.user.email);
    
    if (!user) {
      console.log('❌ User not found, creating...');
      // Create the user if not found
      await createTestUsers(req.app.locals.storage);
      const newUser = await req.app.locals.storage.getUserByEmail(info.user.email);
      
      if (!newUser) {
        return res.status(404).json({ 
          success: false, 
          message: 'Failed to create test user' 
        });
      }
      
      req.session.userId = newUser.id;
      console.log('✅ User bypass successful with new user');
      
      return res.json({ 
        success: true, 
        message: 'Test user logged in successfully',
        user: newUser,
        redirectTo: '/home'
      });
    }

    req.session.userId = user.id;
    console.log('✅ User bypass successful with existing user');
    
    res.json({ 
      success: true, 
      message: 'Test user logged in successfully',
      user,
      redirectTo: '/home'
    });
  } catch (error: any) {
    console.error('❌ User bypass error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Direct admin bypass login
router.post('/test/admin-bypass', async (req: any, res: any) => {
  try {
    console.log('🔄 Admin bypass attempt...');
    
    // First, ensure test users exist
    await createTestUsers(req.app.locals.storage);
    
    const info = getTestUserInfo();
    console.log('📧 Looking for admin email:', info.admin.email);
    
    const admin = await req.app.locals.storage.getUserByEmail(info.admin.email);
    
    if (!admin) {
      console.log('❌ Admin not found, creating...');
      // Create the admin if not found
      await createTestUsers(req.app.locals.storage);
      const newAdmin = await req.app.locals.storage.getUserByEmail(info.admin.email);
      
      if (!newAdmin) {
        return res.status(404).json({ 
          success: false, 
          message: 'Failed to create test admin user' 
        });
      }
      
      req.session.userId = newAdmin.id;
      console.log('✅ Admin bypass successful with new user');
      
      return res.json({ 
        success: true, 
        message: 'Test admin logged in successfully',
        user: newAdmin,
        redirectTo: '/admin'
      });
    }

    req.session.userId = admin.id;
    console.log('✅ Admin bypass successful with existing user');
    
    res.json({ 
      success: true, 
      message: 'Test admin logged in successfully',
      user: admin,
      redirectTo: '/admin'
    });
  } catch (error: any) {
    console.error('❌ Admin bypass error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===== AI ROUTES =====
router.use('/ai', aiRoutes);

// ===== AI CHATBOT ROUTES =====
router.post('/chatbot/query', async (req: any, res: any) => {
  try {
    const { message, userId } = req.body;
    const response = await aiChatbot.generateResponse(userId, message, 'default');
    res.json({ success: true, response });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===== SEMANTIC SEARCH ROUTES =====
router.post('/search/semantic', (req, res, next) => authenticateToken(req, res, next), async (req: any, res: any) => {
  try {
    const { query, limit = 10 } = req.body;
    const results = await (semanticSearch as any).search?.(query, limit) || [];
    res.json({ success: true, results });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===== BUDGET PLANNER ROUTES =====
router.post('/budget/plan', (req, res, next) => authenticateToken(req, res, next), async (req: any, res: any) => {
  try {
    const { income, expenses, goals } = req.body;
    const plan = await (budgetPlanner as any).createPlan?.(income, expenses, goals) || {};
    res.json({ success: true, plan });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===== ROUTE OPTIMIZATION ROUTES =====
router.post('/route/optimize-delivery', (req, res, next) => authenticateToken(req, res, next), async (req: any, res: any) => {
  try {
    const { locations, constraints } = req.body;
    const optimizedRoute = await (routeOptimizer as any).optimizeRoute?.(locations, constraints) || [];
    res.json({ success: true, route: optimizedRoute });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===== VOICE AI ROUTES =====
router.post('/voice/process', (req, res, next) => authenticateToken(req, res, next), async (req: any, res: any) => {
  try {
    const { audioData, userId } = req.body;
    const result = await (voiceAI as any).processAudio?.(audioData, userId) || {};
    res.json({ success: true, result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===== DEMAND PREDICTION ROUTES =====
router.post('/demand/predict', (req, res, next) => authenticateToken(req, res, next), async (req: any, res: any) => {
  try {
    const { historicalData, factors } = req.body;
    const prediction = await demandPredictor.predictDemand(historicalData, factors);
    res.json({ success: true, prediction });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===== DISPATCH SERVICE ROUTES =====
router.post('/dispatch/assign', authenticateToken, async (req: any, res: any) => {
  try {
    const { orderId, availablePartners } = req.body;
    const assignment = await (dispatchService as any).assignOrder?.(orderId, availablePartners) || null;
    res.json({ success: true, assignment });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===== DISTANCE CALCULATION ROUTES =====
router.post('/distance/calculate', authenticateToken, async (req: any, res: any) => {
  try {
    const { origin, destination } = req.body;
    const distance = await calculateDistance(origin, destination);
    res.json({ success: true, distance });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===== WEBSOCKET ENDPOINT =====
router.get('/ws', (req: any, res: any) => {
  // This endpoint is handled by the WebSocket service
  // The actual WebSocket upgrade happens in the main server
  res.status(400).json({ error: 'WebSocket endpoint - use WebSocket connection' });
});

// ===== ORDER WORKFLOW ROUTES =====

// Initialize order workflow
router.post('/workflow/initialize/:orderId', async (req: any, res: any) => {
  try {
    const { orderId } = req.params;
    const { initialStatus = 'placed' } = req.body;
    
    const workflow = new IntegratedOrderWorkflow(req.app.locals.storage);
    await workflow.initializeOrder(orderId, initialStatus);
    
    res.json({ 
      success: true, 
      message: 'Order workflow initialized successfully',
      orderId,
      initialStatus
    });
  } catch (error: any) {
    console.error('Workflow initialization error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to initialize workflow' 
    });
  }
});

// Transition order status
router.post('/workflow/transition/:orderId', async (req: any, res: any) => {
  try {
    const { orderId } = req.params;
    const { status, trigger = 'manual', metadata } = req.body;
    
    if (!status) {
      return res.status(400).json({ 
        success: false, 
        message: 'Status is required' 
      });
    }
    
    const workflow = new IntegratedOrderWorkflow(req.app.locals.storage);
    const success = await workflow.transitionOrder(orderId, status, trigger, metadata);
    
    if (success) {
      res.json({ 
        success: true, 
        message: 'Order status transitioned successfully',
        orderId,
        status,
        trigger
      });
    } else {
      res.status(400).json({ 
        success: false, 
        message: 'Invalid transition or conditions not met' 
      });
    }
  } catch (error: any) {
    console.error('Workflow transition error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to transition order' 
    });
  }
});

// Handle payment confirmation
router.post('/workflow/payment-confirmed/:orderId', async (req: any, res: any) => {
  try {
    const { orderId } = req.params;
    
    const workflow = new IntegratedOrderWorkflow(req.app.locals.storage);
    const success = await workflow.handlePaymentConfirmation(orderId);
    
    if (success) {
      res.json({ 
        success: true, 
        message: 'Payment confirmed and order workflow updated',
        orderId
      });
    } else {
      res.status(400).json({ 
        success: false, 
        message: 'Payment confirmation failed' 
      });
    }
  } catch (error: any) {
    console.error('Payment confirmation error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to confirm payment' 
    });
  }
});

// Handle partner assignment
router.post('/workflow/assign-partner/:orderId', async (req: any, res: any) => {
  try {
    const { orderId } = req.params;
    const { partnerId } = req.body;
    
    if (!partnerId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Partner ID is required' 
      });
    }
    
    const workflow = new IntegratedOrderWorkflow(req.app.locals.storage);
    const success = await workflow.handlePartnerAssignment(orderId, partnerId);
    
    if (success) {
      res.json({ 
        success: true, 
        message: 'Partner assigned successfully',
        orderId,
        partnerId
      });
    } else {
      res.status(400).json({ 
        success: false, 
        message: 'Partner assignment failed' 
      });
    }
  } catch (error: any) {
    console.error('Partner assignment error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to assign partner' 
    });
  }
});

// Handle order pickup
router.post('/workflow/pickup/:orderId', async (req: any, res: any) => {
  try {
    const { orderId } = req.params;
    const { partnerId } = req.body;
    
    if (!partnerId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Partner ID is required' 
      });
    }
    
    const workflow = new IntegratedOrderWorkflow(req.app.locals.storage);
    const success = await workflow.handleOrderPickup(orderId, partnerId);
    
    if (success) {
      res.json({ 
        success: true, 
        message: 'Order pickup confirmed',
        orderId,
        partnerId
      });
    } else {
      res.status(400).json({ 
        success: false, 
        message: 'Order pickup failed' 
      });
    }
  } catch (error: any) {
    console.error('Order pickup error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to confirm pickup' 
    });
  }
});

// Handle order delivery
router.post('/workflow/deliver/:orderId', async (req: any, res: any) => {
  try {
    const { orderId } = req.params;
    const { partnerId } = req.body;
    
    if (!partnerId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Partner ID is required' 
      });
    }
    
    const workflow = new IntegratedOrderWorkflow(req.app.locals.storage);
    const success = await workflow.handleOrderDelivery(orderId, partnerId);
    
    if (success) {
      res.json({ 
        success: true, 
        message: 'Order delivered successfully',
        orderId,
        partnerId
      });
    } else {
      res.status(400).json({ 
        success: false, 
        message: 'Order delivery failed' 
      });
    }
  } catch (error: any) {
    console.error('Order delivery error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to confirm delivery' 
    });
  }
});

// Handle order cancellation
router.post('/workflow/cancel/:orderId', async (req: any, res: any) => {
  try {
    const { orderId } = req.params;
    const { reason } = req.body;
    
    const workflow = new IntegratedOrderWorkflow(req.app.locals.storage);
    const success = await workflow.handleOrderCancellation(orderId, reason);
    
    if (success) {
      res.json({ 
        success: true, 
        message: 'Order cancelled successfully',
        orderId,
        reason
      });
    } else {
      res.status(400).json({ 
        success: false, 
        message: 'Order cancellation failed' 
      });
    }
  } catch (error: any) {
    console.error('Order cancellation error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to cancel order' 
    });
  }
});

// Get workflow status
router.get('/workflow/status/:orderId', async (req: any, res: any) => {
  try {
    const { orderId } = req.params;
    
    const workflow = new IntegratedOrderWorkflow(req.app.locals.storage);
    const status = await workflow.getOrderWorkflowStatus(orderId);
    
    if (status) {
      res.json({ 
        success: true, 
        status 
      });
    } else {
      res.status(404).json({ 
        success: false, 
        message: 'Order not found' 
      });
    }
  } catch (error: any) {
    console.error('Workflow status error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to get workflow status' 
    });
  }
});

// Get workflow statistics
router.get('/workflow/stats', async (req: any, res: any) => {
  try {
    const workflow = new IntegratedOrderWorkflow(req.app.locals.storage);
    const stats = await workflow.getWorkflowStats();
    
    res.json({ 
      success: true, 
      stats 
    });
  } catch (error: any) {
    console.error('Workflow stats error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to get workflow statistics' 
    });
  }
});

// ===== LOCATION TRACKING ROUTES =====

// Update partner location
router.post('/location/update', authenticateToken, async (req: any, res: any) => {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const { location, status, orderId, battery, speed } = req.body;
    
    if (!location || !location.lat || !location.lng) {
      return res.status(400).json({ 
        success: false, 
        message: 'Valid location (lat, lng) is required' 
      });
    }

    const locationUpdate = {
      partnerId: userId, // Use logged-in user as partner ID
      orderId,
      location: {
        lat: parseFloat(location.lat),
        lng: parseFloat(location.lng),
        accuracy: location.accuracy,
        timestamp: new Date(),
        address: location.address
      },
      status: status || 'online',
      battery,
      speed
    };

    await locationTrackingService.updatePartnerLocation(locationUpdate);

    res.json({
      success: true,
      message: 'Location updated successfully',
      timestamp: locationUpdate.location.timestamp
    });

  } catch (error: any) {
    console.error('Location update error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update location'
    });
  }
});

// Get partner location
router.get('/location/partner/:partnerId', async (req: any, res: any) => {
  try {
    const { partnerId } = req.params;
    const location = locationTrackingService.getPartnerLocation(partnerId);
    
    if (!location) {
      return res.status(404).json({
        success: false,
        message: 'Partner location not found'
      });
    }

    res.json({
      success: true,
      location
    });

  } catch (error: any) {
    console.error('Get partner location error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get partner location'
    });
  }
});

// Share customer location with delivery partner
router.post('/orders/:orderId/customer-location', authenticateToken, async (req: any, res: any) => {
  try {
    const { orderId } = req.params;
    const userId = req.session?.userId;
    const { location } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    if (!location || !location.lat || !location.lng) {
      return res.status(400).json({ 
        success: false, 
        message: 'Valid location (lat, lng) is required' 
      });
    }

    // Get order details
    const order = await req.app.locals.storage.getOrder(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Verify user owns this order
    if (order.customerId !== userId) {
      return res.status(403).json({ success: false, message: 'Not authorized to share location for this order' });
    }

    // Store customer location for the order
    await req.app.locals.storage.updateOrder(orderId, {
      customerLocation: {
        lat: parseFloat(location.lat),
        lng: parseFloat(location.lng),
        timestamp: new Date(),
        accuracy: location.accuracy
      }
    });

    // Send WebSocket notification to delivery partner if assigned
    if (order.assignedTo && req.app.locals.websocketService) {
      req.app.locals.websocketService.sendToUser(order.assignedTo, {
        type: 'customer_location_update',
        orderId: orderId,
        location: {
          lat: parseFloat(location.lat),
          lng: parseFloat(location.lng),
          timestamp: new Date()
        }
      });
    }

    res.json({
      success: true,
      message: 'Customer location shared successfully',
      timestamp: new Date()
    });

  } catch (error: any) {
    console.error('Customer location sharing error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to share customer location'
    });
  }
});

// Get customer location for delivery partner
router.get('/orders/:orderId/customer-location', authenticateToken, async (req: any, res: any) => {
  try {
    const { orderId } = req.params;
    const userId = req.session?.userId;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    // Get order details
    const order = await req.app.locals.storage.getOrder(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Verify user is the assigned delivery partner
    if (order.assignedTo !== userId) {
      return res.status(403).json({ success: false, message: 'Not authorized to view customer location' });
    }

    if (!order.customerLocation) {
      return res.status(404).json({ success: false, message: 'Customer location not available' });
    }

    res.json({
      success: true,
      location: order.customerLocation
    });

  } catch (error: any) {
    console.error('Get customer location error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get customer location'
    });
  }
});

// Get all active partners
router.get('/location/partners/active', async (req: any, res: any) => {
  try {
    const activePartners = locationTrackingService.getAllActivePartners();
    
    res.json({
      success: true,
      partners: activePartners,
      count: activePartners.length
    });

  } catch (error: any) {
    console.error('Get active partners error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get active partners'
    });
  }
});

// Get partners near location
router.post('/location/partners/nearby', async (req: any, res: any) => {
  try {
    const { location, radius = 5 } = req.body;
    
    if (!location || !location.lat || !location.lng) {
      return res.status(400).json({
        success: false,
        message: 'Valid location (lat, lng) is required'
      });
    }

    const nearbyPartners = locationTrackingService.getPartnersNearLocation(
      {
        lat: parseFloat(location.lat),
        lng: parseFloat(location.lng)
      },
      parseFloat(radius)
    );

    res.json({
      success: true,
      partners: nearbyPartners,
      count: nearbyPartners.length,
      radius: parseFloat(radius)
    });

  } catch (error: any) {
    console.error('Get nearby partners error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get nearby partners'
    });
  }
});

// Start tracking session
router.post('/location/tracking/start', authenticateToken, async (req: any, res: any) => {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const { orderId, location } = req.body;
    
    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: 'Order ID is required'
      });
    }

    if (!location || !location.lat || !location.lng) {
      return res.status(400).json({
        success: false,
        message: 'Valid starting location (lat, lng) is required'
      });
    }

    const startLocation = {
      lat: parseFloat(location.lat),
      lng: parseFloat(location.lng),
      timestamp: new Date(),
      address: location.address
    };

    const session = await locationTrackingService.startTrackingSession(
      userId,
      orderId,
      startLocation
    );

    res.json({
      success: true,
      message: 'Tracking session started',
      session
    });

  } catch (error: any) {
    console.error('Start tracking session error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to start tracking session'
    });
  }
});

// Complete tracking session
router.post('/location/tracking/complete', authenticateToken, async (req: any, res: any) => {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const { orderId, location } = req.body;
    
    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: 'Order ID is required'
      });
    }

    if (!location || !location.lat || !location.lng) {
      return res.status(400).json({
        success: false,
        message: 'Valid delivery location (lat, lng) is required'
      });
    }

    const deliveryLocation = {
      lat: parseFloat(location.lat),
      lng: parseFloat(location.lng),
      timestamp: new Date(),
      address: location.address
    };

    await locationTrackingService.completeTrackingSession(
      userId,
      orderId,
      deliveryLocation
    );

    res.json({
      success: true,
      message: 'Tracking session completed'
    });

  } catch (error: any) {
    console.error('Complete tracking session error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to complete tracking session'
    });
  }
});

// Get tracking session
router.get('/location/tracking/:partnerId/:orderId', async (req: any, res: any) => {
  try {
    const { partnerId, orderId } = req.params;
    const session = locationTrackingService.getTrackingSession(partnerId, orderId);
    
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Tracking session not found'
      });
    }

    res.json({
      success: true,
      session
    });

  } catch (error: any) {
    console.error('Get tracking session error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get tracking session'
    });
  }
});

// Get partner location history
router.get('/location/history/:partnerId', async (req: any, res: any) => {
  try {
    const { partnerId } = req.params;
    const { limit = 50 } = req.query;
    
    const history = locationTrackingService.getPartnerHistory(
      partnerId,
      parseInt(limit as string)
    );

    res.json({
      success: true,
      history,
      count: history.length
    });

  } catch (error: any) {
    console.error('Get location history error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get location history'
    });
  }
});

// Get tracking statistics
router.get('/location/stats', async (req: any, res: any) => {
  try {
    const stats = locationTrackingService.getTrackingStats();
    
    res.json({
      success: true,
      stats
    });

  } catch (error: any) {
    console.error('Get tracking stats error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get tracking statistics'
    });
  }
});

// ===== INVENTORY MANAGEMENT ROUTES =====

// Check product availability
router.get('/inventory/:productId/availability', async (req: any, res: any) => {
  try {
    const { productId } = req.params;
    const { quantity = 1 } = req.query;
    
    const stock = inventoryService.getStock(productId);
    const isAvailable = inventoryService.checkAvailability(productId, parseInt(quantity as string));
    
    res.json({
      success: true,
      productId,
      available: isAvailable,
      stock: stock ? {
        available: stock.availableStock,
        reserved: stock.reservedStock,
        total: stock.availableStock + stock.reservedStock
      } : null
    });

  } catch (error: any) {
    console.error('Check availability error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to check availability'
    });
  }
});

// Get inventory for a product
router.get('/inventory/:productId', async (req: any, res: any) => {
  try {
    const { productId } = req.params;
    const stock = inventoryService.getStock(productId);
    
    if (!stock) {
      return res.status(404).json({
        success: false,
        message: 'Product not found in inventory'
      });
    }

    res.json({
      success: true,
      inventory: stock
    });

  } catch (error: any) {
    console.error('Get inventory error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get inventory'
    });
  }
});

// Restock product (admin only)
router.post('/inventory/:productId/restock', async (req: any, res: any) => {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    // Check if user is admin
    const user = await req.app.locals.storage.getUserById(userId);
    if (!user || !user.isAdmin) {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    const { productId } = req.params;
    const { quantity, unitCost, batchNumber, expiryDate } = req.body;
    
    if (!quantity || quantity <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid quantity is required'
      });
    }

    const success = await inventoryService.restockProduct(
      productId,
      parseInt(quantity),
      unitCost ? parseFloat(unitCost) : undefined,
      batchNumber,
      expiryDate ? new Date(expiryDate) : undefined
    );

    if (success) {
      const updatedStock = inventoryService.getStock(productId);
      res.json({
        success: true,
        message: 'Product restocked successfully',
        inventory: updatedStock
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to restock product'
      });
    }

  } catch (error: any) {
    console.error('Restock error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to restock product'
    });
  }
});

// Adjust stock (admin only)
router.post('/inventory/:productId/adjust', async (req: any, res: any) => {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    // Check if user is admin
    const user = await req.app.locals.storage.getUserById(userId);
    if (!user || !user.isAdmin) {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    const { productId } = req.params;
    const { quantity, reason, type = 'adjustment' } = req.body;
    
    if (quantity === undefined || quantity === 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid quantity adjustment is required'
      });
    }

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Reason for adjustment is required'
      });
    }

    const success = await inventoryService.adjustStock(
      productId,
      parseInt(quantity),
      reason,
      type
    );

    if (success) {
      const updatedStock = inventoryService.getStock(productId);
      res.json({
        success: true,
        message: 'Stock adjusted successfully',
        inventory: updatedStock
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to adjust stock'
      });
    }

  } catch (error: any) {
    console.error('Stock adjustment error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to adjust stock'
    });
  }
});

// Get low stock items
router.get('/inventory/alerts/low-stock', async (req: any, res: any) => {
  try {
    const lowStockItems = inventoryService.getLowStockItems();
    
    res.json({
      success: true,
      lowStockItems: lowStockItems.map(({ productId, item }) => ({
        productId,
        availableStock: item.availableStock,
        lowStockThreshold: item.lowStockThreshold,
        lastRestocked: item.lastRestocked
      })),
      count: lowStockItems.length
    });

  } catch (error: any) {
    console.error('Get low stock items error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get low stock items'
    });
  }
});

// Get out of stock items
router.get('/inventory/alerts/out-of-stock', async (req: any, res: any) => {
  try {
    const outOfStockItems = inventoryService.getOutOfStockItems();
    
    res.json({
      success: true,
      outOfStockItems: outOfStockItems.map(({ productId, item }) => ({
        productId,
        availableStock: item.availableStock,
        reservedStock: item.reservedStock,
        lastRestocked: item.lastRestocked
      })),
      count: outOfStockItems.length
    });

  } catch (error: any) {
    console.error('Get out of stock items error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get out of stock items'
    });
  }
});

// Get all stock alerts
router.get('/inventory/alerts', async (req: any, res: any) => {
  try {
    const alerts = inventoryService.getStockAlerts();
    
    res.json({
      success: true,
      alerts,
      count: alerts.length
    });

  } catch (error: any) {
    console.error('Get stock alerts error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get stock alerts'
    });
  }
});

// Get stock movements for a product
router.get('/inventory/:productId/movements', async (req: any, res: any) => {
  try {
    const { productId } = req.params;
    const { limit = 50 } = req.query;
    
    const movements = inventoryService.getStockMovements(productId, parseInt(limit as string));
    
    res.json({
      success: true,
      movements,
      count: movements.length
    });

  } catch (error: any) {
    console.error('Get stock movements error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get stock movements'
    });
  }
});

// Generate inventory report (admin only)
router.get('/inventory/reports/summary', async (req: any, res: any) => {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    // Check if user is admin
    const user = await req.app.locals.storage.getUserById(userId);
    if (!user || !user.isAdmin) {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    const report = await inventoryService.generateInventoryReport();
    
    res.json({
      success: true,
      report
    });

  } catch (error: any) {
    console.error('Generate inventory report error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate inventory report'
    });
  }
});

// Get inventory statistics
router.get('/inventory/stats', async (req: any, res: any) => {
  try {
    const stats = inventoryService.getInventoryStats();
    
    res.json({
      success: true,
      stats
    });

  } catch (error: any) {
    console.error('Get inventory stats error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get inventory statistics'
    });
  }
});

// Reserve stock for order (internal use)
router.post('/inventory/reserve', async (req: any, res: any) => {
  try {
    const { productId, quantity, orderId } = req.body;
    
    if (!productId || !quantity) {
      return res.status(400).json({
        success: false,
        message: 'Product ID and quantity are required'
      });
    }

    const success = await inventoryService.reserveStock(productId, parseInt(quantity), orderId);
    
    if (success) {
      res.json({
        success: true,
        message: 'Stock reserved successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to reserve stock - insufficient quantity or product not found'
      });
    }

  } catch (error: any) {
    console.error('Reserve stock error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to reserve stock'
    });
  }
});

// ===== NOTIFICATION ROUTES =====

// Subscribe to push notifications
router.post('/notifications/subscribe-push', authenticateToken, async (req: any, res: any) => {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const { endpoint, keys, userAgent } = req.body;
    
    if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
      return res.status(400).json({
        success: false,
        message: 'Valid push subscription (endpoint, keys.p256dh, keys.auth) is required'
      });
    }

    const success = await notificationService.subscribeToPush(userId, {
      endpoint,
      keys,
      userAgent
    });

    if (success) {
      res.json({
        success: true,
        message: 'Successfully subscribed to push notifications'
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to subscribe to push notifications'
      });
    }

  } catch (error: any) {
    console.error('Push subscription error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to subscribe to push notifications'
    });
  }
});

// Unsubscribe from push notifications
router.post('/notifications/unsubscribe-push', authenticateToken, async (req: any, res: any) => {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const { endpoint } = req.body;
    
    if (!endpoint) {
      return res.status(400).json({
        success: false,
        message: 'Endpoint is required'
      });
    }

    const success = await notificationService.unsubscribeFromPush(userId, endpoint);

    if (success) {
      res.json({
        success: true,
        message: 'Successfully unsubscribed from push notifications'
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to unsubscribe from push notifications'
      });
    }

  } catch (error: any) {
    console.error('Push unsubscription error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to unsubscribe from push notifications'
    });
  }
});

// Get user notification preferences
router.get('/notifications/preferences', authenticateToken, async (req: any, res: any) => {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const preferences = await notificationService.getUserPreferences(userId);

    res.json({
      success: true,
      preferences
    });

  } catch (error: any) {
    console.error('Get notification preferences error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get notification preferences'
    });
  }
});

// Update user notification preferences
router.put('/notifications/preferences', authenticateToken, async (req: any, res: any) => {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const preferences = req.body;
    
    const success = await notificationService.updateUserPreferences(userId, preferences);

    if (success) {
      const updatedPreferences = await notificationService.getUserPreferences(userId);
      res.json({
        success: true,
        message: 'Notification preferences updated successfully',
        preferences: updatedPreferences
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to update notification preferences'
      });
    }

  } catch (error: any) {
    console.error('Update notification preferences error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update notification preferences'
    });
  }
});

// Send custom notification (admin only)
router.post('/notifications/send', async (req: any, res: any) => {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    // Check if user is admin
    const user = await req.app.locals.storage.getUserById(userId);
    if (!user || !user.isAdmin) {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    const { targetUserId, title, body, priority = 'medium', channels = ['push', 'in_app'], data } = req.body;
    
    if (!targetUserId || !title || !body) {
      return res.status(400).json({
        success: false,
        message: 'Target user ID, title, and body are required'
      });
    }

    const success = await notificationService.sendCustomNotification({
      userId: targetUserId,
      templateId: 'custom',
      title,
      body,
      priority,
      channels,
      data
    });

    if (success) {
      res.json({
        success: true,
        message: 'Notification sent successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to send notification'
      });
    }

  } catch (error: any) {
    console.error('Send custom notification error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to send notification'
    });
  }
});

// Get notification history
router.get('/notifications/history', authenticateToken, async (req: any, res: any) => {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const { limit = 50 } = req.query;
    const history = notificationService.getNotificationHistory(userId, parseInt(limit as string));

    res.json({
      success: true,
      history,
      count: history.length
    });

  } catch (error: any) {
    console.error('Get notification history error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get notification history'
    });
  }
});

// Get notification statistics (admin only)
router.get('/notifications/stats', async (req: any, res: any) => {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    // Check if user is admin
    const user = await req.app.locals.storage.getUserById(userId);
    if (!user || !user.isAdmin) {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    const stats = notificationService.getNotificationStats();

    res.json({
      success: true,
      stats
    });

  } catch (error: any) {
    console.error('Get notification stats error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get notification statistics'
    });
  }
});

// Test notification (development only)
router.post('/notifications/test', authenticateToken, async (req: any, res: any) => {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const success = await notificationService.sendNotification(
      userId,
      'order_placed',
      {
        orderNumber: 'TEST-' + Date.now(),
        totalAmount: '₹299'
      }
    );

    res.json({
      success,
      message: success ? 'Test notification sent' : 'Failed to send test notification'
    });

  } catch (error: any) {
    console.error('Test notification error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to send test notification'
    });
  }
});

// ===== PAYMENT ROUTES =====

// Generate UPI QR Code for payment
router.post('/payment/generate-qr', async (req: any, res: any) => {
  try {
    const { orderId, amount } = req.body;
    
    if (!orderId || !amount) {
      return res.status(400).json({ 
        success: false, 
        message: 'Order ID and amount are required' 
      });
    }

    const paymentDetails = {
      orderId,
      amount: parseFloat(amount),
      upiId: 'rishabhkap30@okicici',
      merchantName: 'Zipzy Delivery',
      currency: 'INR'
    };

    const { qrCode, upiUrl } = await paymentService.generateUPIQR(paymentDetails);
    const instructions = paymentService.getPaymentInstructions(amount);

    res.json({
      success: true,
      qrCode,
      upiUrl,
      instructions,
      paymentDetails
    });
  } catch (error: any) {
    console.error('Payment QR generation error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to generate payment QR code' 
    });
  }
});

// Confirm payment manually (MVP approach)
// Public dev-friendly confirmation used by test-workflow.js (no auth)
router.post('/payment/confirm', optionalAuth as any, async (req: any, res: any) => {
  try {
    const { orderId, amount } = req.body;
    const userId = req.session?.userId;
    
    if (!orderId || !amount) {
      return res.status(400).json({ 
        success: false, 
        message: 'Order ID and amount are required' 
      });
    }

    // Confirm payment (MVP - manual confirmation)
    const paymentStatus = await paymentService.confirmPayment(orderId, userId || 'anonymous');
    
    // Update order status to paid
    const order = await req.app.locals.storage.getOrderById(orderId);
    if (order) {
      await req.app.locals.storage.updateOrder(orderId, {
        ...order,
        status: 'paid',
        paymentStatus: 'completed',
        paidAt: new Date()
      });
    }

    // Initialize workflow and trigger payment confirmation
    const workflow = new IntegratedOrderWorkflow(req.app.locals.storage);
    await workflow.initializeOrder(orderId, 'placed');
    await workflow.handlePaymentConfirmation(orderId);

    res.json({
      success: true,
      paymentStatus,
      message: 'Payment confirmed and order workflow started'
    });
  } catch (error: any) {
    console.error('Payment confirmation error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to confirm payment' 
    });
  }
});

// Get payment status
router.get('/payment/status/:orderId', async (req: any, res: any) => {
  try {
    const { orderId } = req.params;
    const order = await req.app.locals.storage.getOrderById(orderId);
    
    if (!order) {
      return res.status(404).json({ 
        success: false, 
        message: 'Order not found' 
      });
    }

    res.json({
      success: true,
      paymentStatus: order.paymentStatus || 'pending',
      orderStatus: order.status,
      paidAt: order.paidAt
    });
  } catch (error: any) {
    console.error('Payment status error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to get payment status' 
    });
  }
});

export { router as completeRouter };

// Helper: apply images from CSV after seed (server/index.ts calls this)
export async function tryApplyImagesFromCsv(storage: any): Promise<void> {
  try {
    const candidates = [
      path.resolve(process.cwd(), 'products_with_images.csv'),
      path.resolve(process.cwd(), 'server', 'scripts', 'products_with_images.csv')
    ];
    let csvPath = '';
    for (const p of candidates) {
      if (fs.existsSync(p)) { csvPath = p; break; }
    }
    if (!csvPath) return;

    const text = fs.readFileSync(csvPath, 'utf-8');
    const lines = text.split(/\r?\n/).filter(Boolean);
    if (!lines.length) return;
    const header = lines.shift() as string;
    const cols = header.split(',');
    const idIdx = cols.indexOf('id');
    const nameIdx = cols.indexOf('name');
    const urlIdx = cols.indexOf('imageUrl');
    if (urlIdx < 0) return;

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;
      const parts = line.split(',');
      if (parts.length <= urlIdx) continue;

      const imageUrl = parts[urlIdx]?.trim();
      const id = idIdx >= 0 ? parts[idIdx]?.trim() : '';
      const name = nameIdx >= 0 ? parts[nameIdx]?.trim() : '';
      if (!imageUrl) continue;
      try {
        if (id) {
          await storage.updateProduct(id, { imageUrl });
        } else if (name && storage.updateProductByName) {
          await storage.updateProductByName(name, { imageUrl });
        }
      } catch {}
    }
  } catch {}
}

// Dev-only helper to trigger image CSV import without restart
router.post('/dev/import-images', async (req: any, res: any) => {
  try {
    await tryApplyImagesFromCsv(req.app.locals.storage);
    return res.json({ success: true });
  } catch (e: any) {
    return res.status(500).json({ success: false, message: e?.message || 'Import failed' });
  }
});
