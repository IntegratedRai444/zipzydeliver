import express from 'express';
import { storage } from './storage';
import { orderNotificationService } from './orderNotifications';
import { WebSocketService } from './services/websocketService';
import { 
  insertOrderSchema, 
  insertOrderItemSchema, 
  insertUserCredentialsSchema 
} from '@shared/schema';
import bcrypt from 'bcryptjs';
import aiRoutes from './aiRoutes';

const app = express();
const wsService = new WebSocketService();

// Middleware
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Authentication endpoints
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { fullName, email, password, userId, landmark, phone, studentId } = req.body;
    if (!email || !password || !fullName || !userId || !landmark || !phone || !studentId) {
      return res.status(400).json({ success: false, message: 'All fields are required.' });
    }

    const existingUser = await storage.getUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({ success: false, message: 'User with this email already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [firstName, ...lastNameParts] = fullName.split(' ');
    const lastName = lastNameParts.join(' ');

    const newUser = await storage.upsertUser({
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

    await storage.createUserCredentials({
      userId: newUser.id,
      email,
      passwordHash: hashedPassword,
    });

    // Log in the user immediately after signup
    (req as any).session.userId = newUser.id;
    res.json({ success: true, message: 'Signup successful and logged in.', user: newUser });
  } catch (error: any) {
    console.error('Signup error:', error);
    res.status(500).json({ success: false, message: error.message || 'Signup failed.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier || !password) {
      return res.status(400).json({ success: false, message: 'Identifier and password are required.' });
    }

    const userCredentials = await storage.getUserCredentialsByIdentifier(identifier);
    if (!userCredentials) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const isPasswordValid = await bcrypt.compare(password, userCredentials.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const user = await storage.getUser(userCredentials.userId);
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found.' });
    }

    (req as any).session.userId = user.id;
    res.json({ success: true, message: 'Login successful.', user });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: error.message || 'Login failed.' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({ success: false, message: 'Logout failed.' });
    }
    res.clearCookie('connect.sid');
    res.json({ success: true, message: 'Logged out successfully.' });
  });
});

// Order endpoints
app.post('/api/orders', async (req, res) => {
  try {
    const { orderData, items } = req.body;
    
    if (!orderData || !items || !Array.isArray(items)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid order data. Order data and items array are required.' 
      });
    }

    // Validate order data
    const validatedOrderData = insertOrderSchema.parse(orderData);
    
    // Validate items
    for (const item of items) {
      insertOrderItemSchema.parse(item);
    }

    // Create order with notifications
    const orderId = await orderNotificationService.createOrder(validatedOrderData, items);

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

app.post('/api/orders/:id/accept', async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = (req as any).session?.userId;
    
    if (!adminId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    await orderNotificationService.acceptOrder(id, adminId);
    
    res.json({ success: true, message: 'Order accepted successfully' });
  } catch (error: any) {
    console.error('Error accepting order:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to accept order' 
    });
  }
});

app.post('/api/orders/:id/reject', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const adminId = (req as any).session?.userId;
    
    if (!adminId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    await orderNotificationService.rejectOrder(id, adminId, reason);
    
    res.json({ success: true, message: 'Order rejected successfully' });
  } catch (error: any) {
    console.error('Error rejecting order:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to reject order' 
    });
  }
});

app.post('/api/orders/:id/mark-paid', async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = (req as any).session?.userId;
    
    if (!adminId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    await orderNotificationService.markOrderPaid(id, adminId);
    
    res.json({ success: true, message: 'Order marked as paid successfully' });
  } catch (error: any) {
    console.error('Error marking order as paid:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to mark order as paid' 
    });
  }
});

app.post('/api/orders/:id/deliver', async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = (req as any).session?.userId;
    
    if (!adminId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    await orderNotificationService.deliverOrder(id, adminId);
    
    res.json({ success: true, message: 'Order marked as delivered successfully' });
  } catch (error: any) {
    console.error('Error delivering order:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to deliver order' 
    });
  }
});

// Order tracking endpoints
app.get('/api/orders/:id/tracking', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = (req as any).session?.userId;
    
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const order = await storage.getOrder(id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Check if user owns this order or is admin
    if (order.customerId !== userId) {
      const user = await storage.getUser(userId);
      if (!user?.isAdmin) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
    }

    const tracking = await storage.getOrderTracking(id);
    const orderDelivery = await storage.getOrderDelivery(id);
    
    res.json({ 
      success: true, 
      tracking,
      delivery: orderDelivery
    });
  } catch (error: any) {
    console.error('Error getting order tracking:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to get order tracking' 
    });
  }
});

// Delivery partner endpoints
app.post('/api/orders/:id/accept', async (req, res) => {
  try {
    const { id } = req.params;
    const partnerId = (req as any).session?.userId;
    
    if (!partnerId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    // Verify user is a delivery partner
    const partner = await storage.getDeliveryPartnerById(partnerId);
    if (!partner) {
      return res.status(403).json({ success: false, message: 'Access denied. Delivery partner required.' });
    }

    await orderNotificationService.acceptOrder(id, partnerId);
    
    res.json({ success: true, message: 'Order accepted successfully' });
  } catch (error: any) {
    console.error('Error accepting order:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to accept order' 
    });
  }
});

app.post('/api/orders/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, message, location } = req.body;
    const partnerId = (req as any).session?.userId;
    
    if (!partnerId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    // Verify user is a delivery partner
    const partner = await storage.getDeliveryPartnerById(partnerId);
    if (!partner) {
      return res.status(403).json({ success: false, message: 'Access denied. Delivery partner required.' });
    }

    await orderNotificationService.updateOrderStatus(id, status, partnerId, location, message);
    
    res.json({ success: true, message: 'Order status updated successfully' });
  } catch (error: any) {
    console.error('Error updating order status:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to update order status' 
    });
  }
});

app.post('/api/orders/:id/location', async (req, res) => {
  try {
    const { id } = req.params;
    const { location } = req.body;
    const partnerId = (req as any).session?.userId;
    
    if (!partnerId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    // Verify user is a delivery partner
    const partner = await storage.getDeliveryPartnerById(partnerId);
    if (!partner) {
      return res.status(403).json({ success: false, message: 'Access denied. Delivery partner required.' });
    }

    if (!location || !location.lat || !location.lng) {
      return res.status(400).json({ success: false, message: 'Invalid location data' });
    }

    await orderNotificationService.updateDeliveryLocation(id, partnerId, location);
    
    res.json({ success: true, message: 'Location updated successfully' });
  } catch (error: any) {
    console.error('Error updating location:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to update location' 
    });
  }
});

// Notification endpoints
app.get('/api/notifications', async (req, res) => {
  try {
    const userId = (req as any).session?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const notifications = await orderNotificationService.getNotificationsForUser(userId);
    
    res.json({ 
      success: true, 
      notifications 
    });
  } catch (error: any) {
    console.error('Error getting notifications:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to get notifications' 
    });
  }
});

app.post('/api/notifications/:id/read', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = (req as any).session?.userId;
    
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    await orderNotificationService.markNotificationAsRead(id);
    
    res.json({ success: true, message: 'Notification marked as read' });
  } catch (error: any) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to mark notification as read' 
    });
  }
});

// Existing endpoints (keeping the structure)
app.get('/api/categories', async (req, res) => {
  try {
    const categories = await storage.getCategories();
    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

app.get('/api/products', async (req, res) => {
  try {
    const { categoryId } = req.query;
    let products;
    
    if (categoryId) {
      products = await storage.getProductsByCategory(categoryId as string);
    } else {
      products = await storage.getProducts();
    }
    
    res.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const product = await storage.getProduct(id);
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    res.json(product);
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

app.get('/api/cart', async (req, res) => {
  try {
    const userId = (req as any).session?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const cartItems = await storage.getCartItems(userId);
    res.json(cartItems);
  } catch (error) {
    console.error('Error fetching cart:', error);
    res.status(500).json({ error: 'Failed to fetch cart' });
  }
});

app.post('/api/cart/add', async (req, res) => {
  try {
    const userId = (req as any).session?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { productId, quantity } = req.body;
    if (!productId || !quantity) {
      return res.status(400).json({ error: 'Product ID and quantity are required' });
    }

    const cartItem = await storage.addToCart({
      userId,
      productId,
      quantity,
    });

    res.json(cartItem);
  } catch (error) {
    console.error('Error adding to cart:', error);
    res.status(500).json({ error: 'Failed to add to cart' });
  }
});

app.put('/api/cart/:id', async (req, res) => {
  try {
    const userId = (req as any).session?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { id } = req.params;
    const { quantity } = req.body;
    
    if (quantity <= 0) {
      await storage.removeFromCart(id);
      res.json({ message: 'Item removed from cart' });
    } else {
      const cartItem = await storage.updateCartItem(id, quantity);
      res.json(cartItem);
    }
  } catch (error) {
    console.error('Error updating cart:', error);
    res.status(500).json({ error: 'Failed to update cart' });
  }
});

app.delete('/api/cart/:id', async (req, res) => {
  try {
    const userId = (req as any).session?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { id } = req.params;
    await storage.removeFromCart(id);
    
    res.json({ message: 'Item removed from cart' });
  } catch (error) {
    console.error('Error removing from cart:', error);
    res.status(500).json({ error: 'Failed to remove from cart' });
  }
});

app.delete('/api/cart', async (req, res) => {
  try {
    const userId = (req as any).session?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    await storage.clearCart(userId);
    
    res.json({ message: 'Cart cleared' });
  } catch (error: any) {
    console.error('Error clearing cart:', error);
    res.status(500).json({ error: 'Failed to clear cart' });
  }
});

// Admin endpoints
app.get('/api/admin/profile', async (req, res) => {
  try {
    const userId = (req as any).session?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const user = await storage.getUser(userId);
    if (!user || !user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Error fetching admin profile:', error);
    res.status(500).json({ error: 'Failed to fetch admin profile' });
  }
});

app.get('/api/admin/orders', async (req, res) => {
  try {
    const userId = (req as any).session?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const user = await storage.getUser(userId);
    if (!user || !user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const orders = await storage.getOrders();
    res.json({ orders });
  } catch (error: any) {
    console.error('Error fetching admin orders:', error);
    res.status(500).json({ error: 'Failed to fetch admin orders' });
  }
});

// Delivery partner endpoints
app.get('/api/delivery-partners/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const partner = await storage.getDeliveryPartnerById(id);
    
    if (!partner) {
      return res.status(404).json({ success: false, message: 'Delivery partner not found' });
    }

    res.json({ 
      success: true, 
      partner 
    });
  } catch (error) {
    console.error('Error fetching delivery partner:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to fetch delivery partner' 
    });
  }
});

// AI Features endpoints
app.get('/api/recommendations', async (req, res) => {
  try {
    const userId = (req as any).session?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Simple recommendation logic - get products from user's most ordered category
    const userOrders = await storage.getUserOrders(userId);
    const products = await storage.getProducts();
    
    // For now, return random products (in real app, implement ML-based recommendations)
    const shuffled = products.sort(() => 0.5 - Math.random());
    const recommendations = shuffled.slice(0, 6);
    
    res.json({ recommendations });
  } catch (error) {
    console.error('Error getting recommendations:', error);
    res.status(500).json({ error: 'Failed to get recommendations' });
  }
});

// Mount AI routes
app.use('/api/ai', aiRoutes);

export { app };
