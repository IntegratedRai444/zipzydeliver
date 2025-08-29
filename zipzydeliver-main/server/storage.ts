import {
  users,
  userCredentials,
  categories,
  products,
  cartItems,
  orders,
  orderItems,
  payments,
  notifications,
  conversations,
  messages,
  deliveryPartners,
  orderTracking,
  orderDeliveries,
  type User,
  type UpsertUser,
  type UserCredentials,
  type Category,
  type InsertCategory,
  type Product,
  type InsertProduct,
  type CartItem,
  type InsertCartItem,
  type Order,
  type InsertOrder,
  type OrderItem,
  type InsertOrderItem,
  type Payment,
  type InsertPayment,
  type Notification,
  type InsertNotification,
  type Conversation,
  type InsertConversation,
  type Message,
  type InsertMessage,
  type DeliveryPartner,
  type InsertDeliveryPartner,
  type OrderTracking,
  type InsertOrderTracking,
  type OrderDelivery,
  type InsertOrderDelivery,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql } from "drizzle-orm";

export interface IStorage {
  // User operations - required for Replit Auth
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserCredentialsByIdentifier(identifier: string): Promise<UserCredentials | undefined>;
  getCustomerOrderHistory(customerId: string): Promise<any[]>;
  
  // Category operations
  getCategories(): Promise<Category[]>;
  createCategory(category: InsertCategory): Promise<Category>;
  
  // Product operations
  getProducts(): Promise<(Product & { category: Category | null })[]>;
  getProductsByCategory(categoryId: string): Promise<(Product & { category: Category | null })[]>;
  getProduct(id: string): Promise<(Product & { category: Category | null }) | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: string, product: Partial<InsertProduct>): Promise<Product>;
  deleteProduct(id: string): Promise<void>;
  
  // Cart operations
  getCartItems(userId: string): Promise<(CartItem & { product: Product & { category: Category | null } })[]>;
  addToCart(cartItem: InsertCartItem): Promise<CartItem>;
  updateCartItem(id: string, quantity: number): Promise<CartItem>;
  removeFromCart(id: string): Promise<void>;
  clearCart(userId: string): Promise<void>;
  
  // Order operations
  createOrder(order: InsertOrder): Promise<Order>;
  createOrderItem(orderItem: InsertOrderItem): Promise<OrderItem>;
  addOrderItems(orderItemsData: InsertOrderItem[]): Promise<OrderItem[]>;
  getOrders(userId?: string): Promise<(Order & { orderItems: (OrderItem & { product: Product })[] })[]>;
  getUserOrders(userId: string): Promise<(Order & { orderItems: (OrderItem & { product: Product })[] })[]>;
  getOrder(id: string): Promise<(Order & { orderItems: (OrderItem & { product: Product })[] }) | undefined>;
  updateOrderStatus(id: string, status: string): Promise<Order>;
  updateOrderAssignment(orderId: string, assignedTo: string): Promise<Order>;
  updateOrderAcceptedAt(orderId: string): Promise<Order>;
  updateOrderDeliveredAt(orderId: string): Promise<Order>;
  updateOrderQrCodes(orderId: string, orderQrCode: string, paymentQrCode: string): Promise<Order>;
  generateOrderNumber(): Promise<string>;
  
  // Payment operations
  createPayment(payment: any): Promise<any>;
  updatePaymentStatus(orderId: string, status: string): Promise<any>;
  updateOrderPaymentStatus(orderId: string, status: string): Promise<Order>;
  
  // Notification operations
  createNotification(notification: any): Promise<any>;
  getNotificationsForUser(userId: string): Promise<any[]>;
  markNotificationAsRead(notificationId: string): Promise<void>;
  
  // Conversation operations
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  getConversation(id: string): Promise<Conversation | undefined>;
  getUserConversations(userId: string): Promise<Conversation[]>;
  updateConversation(id: string, updates: Partial<InsertConversation>): Promise<Conversation>;
  
  // Message operations
  createMessage(message: InsertMessage): Promise<Message>;
  getConversationMessages(conversationId: string, limit?: number): Promise<Message[]>;
  markMessagesAsRead(conversationId: string, userId: string): Promise<void>;
  createOrderMessage(message: Omit<InsertMessage, 'conversationId'> & { orderId: string }): Promise<Message>;
  getOrderMessages(orderId: string): Promise<Message[]>;
  
  // Delivery partner operations
  getDeliveryPartners(): Promise<DeliveryPartner[]>;
  getAvailableDeliveryPartners(): Promise<DeliveryPartner[]>;
  createDeliveryPartner(partner: InsertDeliveryPartner): Promise<DeliveryPartner>;
  getDeliveryPartnerBalance(partnerId: string): Promise<number>;
  updateDeliveryPartnerBalance(partnerId: string, amount: number): Promise<DeliveryPartner>;
  
  // Order tracking operations
  createOrderTracking(tracking: InsertOrderTracking): Promise<OrderTracking>;
  getOrderTracking(orderId: string): Promise<OrderTracking[]>;
  
  // Order delivery operations
  createOrderDelivery(delivery: InsertOrderDelivery): Promise<OrderDelivery>;
  assignDeliveryPartner(orderId: string, deliveryPartnerId: string): Promise<OrderDelivery>;
  getOrderDelivery(orderId: string): Promise<OrderDelivery | undefined>;
  
  // Partner matching and dispatch operations
  getAllPartners(): Promise<DeliveryPartner[]>;
  getDeliveryPartnerById(partnerId: string): Promise<DeliveryPartner | undefined>;
  getPartnerDeliveriesCount(partnerId: string, date: Date): Promise<number>;
  assignOrderToPartner(orderId: string, partnerId: string): Promise<void>;
  updatePartnerOnlineStatus(partnerId: string, isOnline: boolean): Promise<DeliveryPartner>;
  updatePartnerLocation(partnerId: string, location: any): Promise<boolean>;
  
  // Daily limit and wallet management
  checkDailyDeliveryLimit(partnerId: string): Promise<{ canDeliver: boolean; currentCount: number; maxAllowed: number }>;
  lockFundsInWallet(partnerId: string, amount: number, orderId: string): Promise<boolean>;
  releaseFundsToWallet(partnerId: string, amount: number, orderId: string): Promise<boolean>;
  
  // Rewards and ZPoints system
  issueZPointsReward(partnerId: string, orderId: string, isFirstOrder?: boolean): Promise<number>;
  checkFirstOrderEligibility(partnerId: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  // User operations - required for Replit Auth
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Local auth helpers (not in interface so we keep optional in routes)
  async getUserByEmail(email: string): Promise<User | undefined> {
    const [u] = await db.select().from(users).where(eq(users.email, email));
    return u;
  }

  async getUserByCollegeId(collegeId: string): Promise<User | undefined> {
    const [u] = await db.select().from(users).where(eq(users.collegeId, collegeId));
    return u;
  }

  async createUserCredentials(data: { userId: string; email: string; passwordHash: string }): Promise<UserCredentials> {
    const [row] = await db.insert(userCredentials).values({
      userId: data.userId,
      email: data.email,
      passwordHash: data.passwordHash,
    }).returning();
    return row as any;
  }

  async getUserCredentialsByEmail(email: string): Promise<UserCredentials | undefined> {
    const [row] = await db.select().from(userCredentials).where(eq(userCredentials.email, email));
    return row as any;
  }

  // Category operations
  async getCategories(): Promise<Category[]> {
    return await db.select().from(categories).where(eq(categories.isActive, true));
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const [newCategory] = await db.insert(categories).values(category).returning();
    return newCategory;
  }

  // Product operations
  async getProducts(): Promise<(Product & { category: Category | null })[]> {
    return await db
      .select()
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(eq(products.isAvailable, true))
      .then(rows => rows.map(row => ({ ...row.products, category: row.categories })));
  }

  async getProductsByCategory(categoryId: string): Promise<(Product & { category: Category | null })[]> {
    return await db
      .select()
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(and(eq(products.categoryId, categoryId), eq(products.isAvailable, true)))
      .then(rows => rows.map(row => ({ ...row.products, category: row.categories })));
  }

  async getProduct(id: string): Promise<(Product & { category: Category | null }) | undefined> {
    const result = await db
      .select()
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(eq(products.id, id));
    
    if (result.length === 0) return undefined;
    const row = result[0];
    return { ...row.products, category: row.categories };
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const [newProduct] = await db.insert(products).values(product).returning();
    return newProduct;
  }

  async updateProduct(id: string, product: Partial<InsertProduct>): Promise<Product> {
    const [updatedProduct] = await db
      .update(products)
      .set({ ...product, updatedAt: new Date() })
      .where(eq(products.id, id))
      .returning();
    return updatedProduct;
  }

  async deleteProduct(id: string): Promise<void> {
    await db.delete(products).where(eq(products.id, id));
  }

  // Cart operations
  async getCartItems(userId: string): Promise<(CartItem & { product: Product & { category: Category | null } })[]> {
    return await db
      .select()
      .from(cartItems)
      .innerJoin(products, eq(cartItems.productId, products.id))
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(eq(cartItems.userId, userId))
      .then(rows => rows.map(row => ({
        ...row.cart_items,
        product: { ...row.products, category: row.categories }
      })));
  }

  async addToCart(cartItem: InsertCartItem): Promise<CartItem> {
    // Check if item already exists in cart
    const existingItem = await db
      .select()
      .from(cartItems)
      .where(and(eq(cartItems.userId, cartItem.userId!), eq(cartItems.productId, cartItem.productId!)))
      .limit(1);

    if (existingItem.length > 0) {
      // Update quantity if item already exists
      const [updated] = await db
        .update(cartItems)
        .set({ 
          quantity: existingItem[0].quantity! + (cartItem.quantity || 1),
          updatedAt: new Date()
        })
        .where(eq(cartItems.id, existingItem[0].id))
        .returning();
      return updated;
    } else {
      // Add new item to cart
      const [newItem] = await db.insert(cartItems).values(cartItem).returning();
      return newItem;
    }
  }

  async updateCartItem(id: string, quantity: number): Promise<CartItem> {
    const [updated] = await db
      .update(cartItems)
      .set({ quantity, updatedAt: new Date() })
      .where(eq(cartItems.id, id))
      .returning();
    return updated;
  }

  async removeFromCart(id: string): Promise<void> {
    await db.delete(cartItems).where(eq(cartItems.id, id));
  }

  async clearCart(userId: string): Promise<void> {
    await db.delete(cartItems).where(eq(cartItems.userId, userId));
  }

  // Order operations
  async generateOrderNumber(): Promise<string> {
    const today = new Date();
    const dateStr = today.getFullYear().toString().slice(-2) + 
                   (today.getMonth() + 1).toString().padStart(2, '0') + 
                   today.getDate().toString().padStart(2, '0');
    
    // Get count of orders today
    const count = await db
      .select({ count: sql<number>`count(*)` })
      .from(orders)
      .where(sql`DATE(created_at) = CURRENT_DATE`)
      .then(result => result[0]?.count || 0);

    return `ZP${dateStr}${(count + 1).toString().padStart(4, '0')}`;
  }

  async createOrder(order: InsertOrder): Promise<Order> {
    const orderNumber = await this.generateOrderNumber();
    const [newOrder] = await db
      .insert(orders)
      .values({ ...order, orderNumber })
      .returning();
    return newOrder;
  }

  async addOrderItems(orderItemsData: InsertOrderItem[]): Promise<OrderItem[]> {
    return await db.insert(orderItems).values(orderItemsData).returning();
  }

  async getOrders(userId?: string): Promise<(Order & { orderItems: (OrderItem & { product: Product })[] })[]> {
    const ordersQuery = db
      .select()
      .from(orders)
      .orderBy(desc(orders.createdAt));

    const ordersResult = userId 
      ? await ordersQuery.where(eq(orders.userId, userId))
      : await ordersQuery;

    // Get order items for each order
    const ordersWithItems = await Promise.all(
      ordersResult.map(async (order) => {
        const items = await db
          .select()
          .from(orderItems)
          .innerJoin(products, eq(orderItems.productId, products.id))
          .where(eq(orderItems.orderId, order.id))
          .then(rows => rows.map(row => ({
            ...row.order_items,
            product: row.products
          })));
        
        return { ...order, orderItems: items };
      })
    );

    return ordersWithItems;
  }

  async getOrder(id: string): Promise<(Order & { orderItems: (OrderItem & { product: Product })[] }) | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    if (!order) return undefined;

    const items = await db
      .select()
      .from(orderItems)
      .innerJoin(products, eq(orderItems.productId, products.id))
      .where(eq(orderItems.orderId, id))
      .then(rows => rows.map(row => ({
        ...row.order_items,
        product: row.products
      })));

    return { ...order, orderItems: items };
  }

  async updateOrderStatus(id: string, status: string): Promise<Order> {
    const [updated] = await db
      .update(orders)
      .set({ status, updatedAt: new Date() })
      .where(eq(orders.id, id))
      .returning();
    return updated;
  }

  async updateOrderQrCodes(orderId: string, orderQrCode: string, paymentQrCode: string): Promise<Order> {
    const [updatedOrder] = await db
      .update(orders)
      .set({ orderQrCode, paymentQrCode, updatedAt: new Date() })
      .where(eq(orders.id, orderId))
      .returning();
    return updatedOrder;
  }

  async getUserOrders(userId: string): Promise<(Order & { orderItems: (OrderItem & { product: Product })[] })[]> {
    return this.getOrders(userId);
  }

  // Conversation operations
  async createConversation(conversation: InsertConversation): Promise<Conversation> {
    const [newConversation] = await db.insert(conversations).values(conversation).returning();
    return newConversation;
  }

  async getConversation(id: string): Promise<Conversation | undefined> {
    const [conversation] = await db.select().from(conversations).where(eq(conversations.id, id));
    return conversation;
  }

  async getUserConversations(userId: string): Promise<Conversation[]> {
    return await db
      .select()
      .from(conversations)
      .where(eq(conversations.userId, userId))
      .orderBy(desc(conversations.updatedAt));
  }

  async updateConversation(id: string, updates: Partial<InsertConversation>): Promise<Conversation> {
    const [updated] = await db
      .update(conversations)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(conversations.id, id))
      .returning();
    return updated;
  }

  // Message operations
  async createMessage(message: InsertMessage): Promise<Message> {
    const [newMessage] = await db.insert(messages).values(message).returning();
    return newMessage;
  }

  async getConversationMessages(conversationId: string, limit = 50): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(desc(messages.createdAt))
      .limit(limit)
      .then(rows => rows.reverse()); // Reverse to get chronological order
  }

  async markMessagesAsRead(conversationId: string, userId: string): Promise<void> {
    await db
      .update(messages)
      .set({ isRead: true })
      .where(
        and(
          eq(messages.conversationId, conversationId),
          eq(messages.senderId, userId)
        )
      );
  }

  async createOrderMessage(message: Omit<InsertMessage, 'conversationId'> & { orderId: string }): Promise<Message> {
    const [newMessage] = await db.insert(messages).values({
      ...message,
      conversationId: null, // Order messages don't need conversation ID
    }).returning();
    return newMessage;
  }

  async getOrderMessages(orderId: string): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(eq(messages.orderId, orderId))
      .orderBy(desc(messages.createdAt))
      .then(rows => rows.reverse()); // Reverse to get chronological order
  }

  // Delivery partner operations
  async getDeliveryPartners(): Promise<DeliveryPartner[]> {
    return await db.select().from(deliveryPartners).where(eq(deliveryPartners.isActive, true));
  }

  async getAvailableDeliveryPartners(): Promise<DeliveryPartner[]> {
    return await db
      .select()
      .from(deliveryPartners)
      .where(
        and(
          eq(deliveryPartners.isActive, true),
          eq(deliveryPartners.isOnline, true)
        )
      )
      .orderBy(desc(deliveryPartners.rating));
  }

  async createDeliveryPartner(partner: InsertDeliveryPartner): Promise<DeliveryPartner> {
    const [newPartner] = await db.insert(deliveryPartners).values(partner).returning();
    return newPartner;
  }

  async getDeliveryPartnerBalance(partnerId: string): Promise<number> {
    const [partner] = await db
      .select({ zpointsBalance: deliveryPartners.zpointsBalance })
      .from(deliveryPartners)
      .where(eq(deliveryPartners.id, partnerId));
    return partner?.zpointsBalance || 0;
  }

  async updateDeliveryPartnerBalance(partnerId: string, amount: number): Promise<DeliveryPartner> {
    const [updatedPartner] = await db
      .update(deliveryPartners)
      .set({ zpointsBalance: amount, updatedAt: new Date() })
      .where(eq(deliveryPartners.id, partnerId))
      .returning();
    return updatedPartner;
  }

  // Order tracking operations
  async createOrderTracking(tracking: InsertOrderTracking): Promise<OrderTracking> {
    const [newTracking] = await db.insert(orderTracking).values(tracking).returning();
    return newTracking;
  }

  async getOrderTracking(orderId: string): Promise<OrderTracking[]> {
    return await db
      .select()
      .from(orderTracking)
      .where(eq(orderTracking.orderId, orderId))
      .orderBy(orderTracking.createdAt);
  }

  // Order delivery operations
  async createOrderDelivery(delivery: InsertOrderDelivery): Promise<OrderDelivery> {
    const [newDelivery] = await db.insert(orderDeliveries).values(delivery).returning();
    return newDelivery;
  }

  async assignDeliveryPartner(orderId: string, deliveryPartnerId: string): Promise<OrderDelivery> {
    const [assignment] = await db
      .insert(orderDeliveries)
      .values({
        orderId,
        deliveryPartnerId,
        status: 'assigned',
      })
      .returning();
    return assignment;
  }

  async getOrderDelivery(orderId: string): Promise<OrderDelivery | undefined> {
    const [delivery] = await db
      .select()
      .from(orderDeliveries)
      .where(eq(orderDeliveries.orderId, orderId));
    return delivery;
  }

  // Partner matching and dispatch operations
  async getAllPartners(): Promise<DeliveryPartner[]> {
    return await db.select().from(deliveryPartners);
  }

  async getDeliveryPartnerById(partnerId: string): Promise<DeliveryPartner | undefined> {
    const [partner] = await db
      .select()
      .from(deliveryPartners)
      .where(eq(deliveryPartners.id, partnerId));
    return partner;
  }

  async getPartnerDeliveriesCount(partnerId: string, date: Date): Promise<number> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(orderDeliveries)
      .where(
        and(
          eq(orderDeliveries.deliveryPartnerId, partnerId),
          sql`${orderDeliveries.createdAt} >= ${startOfDay}`,
          sql`${orderDeliveries.createdAt} <= ${endOfDay}`
        )
      );
    
    return result[0]?.count || 0;
  }

  async checkDailyDeliveryLimit(partnerId: string): Promise<{ canDeliver: boolean; currentCount: number; maxAllowed: number }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const currentCount = await this.getPartnerDeliveriesCount(partnerId, today);
    
    // Get partner info to check if student
    const partner = await db
      .select({ isStudent: deliveryPartners.isStudent })
      .from(deliveryPartners)
      .where(eq(deliveryPartners.id, partnerId));
    
    const isStudent = partner[0]?.isStudent || false;
    const maxAllowed = isStudent ? 3 : 999; // Students: 3/day, others: unlimited
    
    return {
      canDeliver: currentCount < maxAllowed,
      currentCount,
      maxAllowed
    };
  }

  async assignOrderToPartner(orderId: string, partnerId: string): Promise<void> {
    // Update order status and assign partner
    await db
      .update(orders)
      .set({ 
        status: 'assigned',
        deliveredByPartnerId: partnerId,
        updatedAt: new Date()
      })
      .where(eq(orders.id, orderId));

    // Create order delivery record
    await db
      .insert(orderDeliveries)
      .values({
        orderId,
        deliveryPartnerId: partnerId,
        status: 'assigned',
        createdAt: new Date(),
        updatedAt: new Date()
      });
  }

  async updatePartnerOnlineStatus(partnerId: string, isOnline: boolean): Promise<DeliveryPartner> {
    const [updatedPartner] = await db
      .update(deliveryPartners)
      .set({ 
        isOnline, 
        updatedAt: new Date() 
      })
      .where(eq(deliveryPartners.id, partnerId))
      .returning();
    return updatedPartner;
  }

  async updatePartnerLocation(partnerId: string, location: any): Promise<boolean> {
    try {
      await db
        .update(deliveryPartners)
        .set({ 
          currentLocation: location, 
          updatedAt: new Date() 
        })
        .where(eq(deliveryPartners.id, partnerId));
      return true;
    } catch (error) {
      console.error('Error updating partner location:', error);
      return false;
    }
  }

  // Wallet management methods
  async lockFundsInWallet(partnerId: string, amount: number, orderId: string): Promise<boolean> {
    try {
      // Get current wallet balance
      const wallet = await db
        .select()
        .from(deliveryPartners)
        .where(eq(deliveryPartners.id, partnerId));
      
      if (!wallet[0]) return false;
      
      const currentBalance = wallet[0].zpointsBalance || 0;
      if (currentBalance < amount) return false;
      
      // Lock funds by reducing available balance
      await db
        .update(deliveryPartners)
        .set({ 
          zpointsBalance: currentBalance - amount,
          updatedAt: new Date() 
        })
        .where(eq(deliveryPartners.id, partnerId));
      
      // Create locked funds record (you might want to add a wallets table later)
      console.log(`Locked ${amount} funds for partner ${partnerId}, order ${orderId}`);
      
      return true;
    } catch (error) {
      console.error('Error locking funds:', error);
      return false;
    }
  }

  async releaseFundsToWallet(partnerId: string, amount: number, orderId: string): Promise<boolean> {
    try {
      // Release funds back to partner's wallet
      const wallet = await db
        .select()
        .from(deliveryPartners)
        .where(eq(deliveryPartners.id, partnerId));
      
      if (!wallet[0]) return false;
      
      const currentBalance = wallet[0].zpointsBalance || 0;
      
      await db
        .update(deliveryPartners)
        .set({ 
          zpointsBalance: currentBalance + amount,
          updatedAt: new Date() 
        })
        .where(eq(deliveryPartners.id, partnerId));
      
      console.log(`Released ${amount} funds to partner ${partnerId}, order ${orderId}`);
      
      return true;
    } catch (error) {
      console.error('Error releasing funds:', error);
      return false;
    }
  }

  // Rewards and ZPoints system
  async issueZPointsReward(partnerId: string, orderId: string, isFirstOrder: boolean = false): Promise<number> {
    try {
      let pointsToAward = 50; // Base points per delivery
      
      if (isFirstOrder) {
        pointsToAward += 200; // First order bonus
        console.log(`First order bonus: +200 ZPoints for partner ${partnerId}`);
      }
      
      // Get current balance
      const partner = await db
        .select()
        .from(deliveryPartners)
        .where(eq(deliveryPartners.id, partnerId));
      
      if (!partner[0]) return 0;
      
      const currentBalance = partner[0].zpointsBalance || 0;
      const newBalance = currentBalance + pointsToAward;
      
      // Update partner's ZPoints balance
      await db
        .update(deliveryPartners)
        .set({ 
          zpointsBalance: newBalance,
          updatedAt: new Date() 
        })
        .where(eq(deliveryPartners.id, partnerId));
      
      console.log(`Awarded ${pointsToAward} ZPoints to partner ${partnerId}, new balance: ${newBalance}`);
      
      return pointsToAward;
    } catch (error) {
      console.error('Error issuing ZPoints:', error);
      return 0;
    }
  }

  async checkFirstOrderEligibility(partnerId: string): Promise<boolean> {
    try {
      // Check if this is partner's first completed delivery
      const completedDeliveries = await db
        .select()
        .from(orderDeliveries)
        .where(
          and(
            eq(orderDeliveries.deliveryPartnerId, partnerId),
            eq(orderDeliveries.status, 'delivered')
          )
        );
      
      return completedDeliveries.length === 0;
    } catch (error) {
      console.error('Error checking first order eligibility:', error);
      return false;
    }
  }

  // Partner wallet methods
  async getPartnerWallet(partnerId: string): Promise<any> {
    try {
      const partner = await db
        .select()
        .from(deliveryPartners)
        .where(eq(deliveryPartners.id, partnerId));
      
      if (!partner[0]) return null;
      
              return {
          partnerId,
          availableBalance: partner[0].zpointsBalance || 0,
          lockedBalance: 0, // Will be calculated from active orders
          totalEarnings: 0, // Not stored in current schema
          pendingPayouts: 0 // Not stored in current schema
        };
    } catch (error) {
      console.error('Error fetching partner wallet:', error);
      return null;
    }
  }

  async getPartnerRewards(partnerId: string): Promise<any> {
    try {
      const partner = await db
        .select()
        .from(deliveryPartners)
        .where(eq(deliveryPartners.id, partnerId));
      
      if (!partner[0]) return null;
      
      return {
        partnerId,
        zpointsBalance: partner[0].zpointsBalance || 0,
        totalDeliveries: partner[0].totalDeliveries || 0,
        rating: partner[0].rating || 0,
        level: this.calculatePartnerLevel(partner[0].totalDeliveries || 0),
        nextLevelPoints: this.getNextLevelPoints(partner[0].totalDeliveries || 0)
      };
    } catch (error) {
      console.error('Error fetching partner rewards:', error);
      return null;
    }
  }

  async redeemZPoints(partnerId: string, points: number, rewardType: string): Promise<any> {
    try {
      const partner = await db
        .select()
        .from(deliveryPartners)
        .where(eq(deliveryPartners.id, partnerId));
      
      if (!partner[0]) return { success: false, message: 'Partner not found' };
      
      const currentBalance = partner[0].zpointsBalance || 0;
      if (currentBalance < points) {
        return { success: false, message: 'Insufficient ZPoints' };
      }
      
      const newBalance = currentBalance - points;
      
      await db
        .update(deliveryPartners)
        .set({ 
          zpointsBalance: newBalance,
          updatedAt: new Date() 
        })
        .where(eq(deliveryPartners.id, partnerId));
      
      return {
        success: true,
        redeemedPoints: points,
        newBalance,
        rewardType
      };
    } catch (error) {
      console.error('Error redeeming ZPoints:', error);
      return { success: false, message: 'Failed to redeem points' };
    }
  }

  async updatePartnerLocation(partnerId: string, lat: number, lng: number): Promise<boolean> {
    try {
              await db
          .update(deliveryPartners)
          .set({ 
            currentLocation: { lat, lng },
            updatedAt: new Date() 
          })
          .where(eq(deliveryPartners.id, partnerId));
      
      return true;
    } catch (error) {
      console.error('Error updating partner location:', error);
      return false;
    }
  }

  private calculatePartnerLevel(totalDeliveries: number): string {
    if (totalDeliveries >= 100) return 'Elite';
    if (totalDeliveries >= 50) return 'Gold';
    if (totalDeliveries >= 25) return 'Silver';
    if (totalDeliveries >= 10) return 'Bronze';
    return 'New';
  }

  private getNextLevelPoints(totalDeliveries: number): number {
    if (totalDeliveries < 10) return 10 - totalDeliveries;
    if (totalDeliveries < 25) return 25 - totalDeliveries;
    if (totalDeliveries < 50) return 50 - totalDeliveries;
    if (totalDeliveries < 100) return 100 - totalDeliveries;
    return 0; // Max level reached
  }

  // New order and payment methods
  async createOrderItem(orderItem: InsertOrderItem): Promise<OrderItem> {
    try {
      const [newOrderItem] = await db.insert(orderItems).values(orderItem).returning();
      return newOrderItem;
    } catch (error) {
      console.error('Error creating order item:', error);
      throw error;
    }
  }

  async updateOrderAssignment(orderId: string, assignedTo: string): Promise<Order> {
    try {
      const [updatedOrder] = await db
        .update(orders)
        .set({ 
          assignedTo,
          updatedAt: new Date() 
        })
        .where(eq(orders.id, orderId))
        .returning();
      return updatedOrder;
    } catch (error) {
      console.error('Error updating order assignment:', error);
      throw error;
    }
  }

  async updateOrderAcceptedAt(orderId: string): Promise<Order> {
    try {
      const [updatedOrder] = await db
        .update(orders)
        .set({ 
          acceptedAt: new Date(),
          updatedAt: new Date() 
        })
        .where(eq(orders.id, orderId))
        .returning();
      return updatedOrder;
    } catch (error) {
      console.error('Error updating order accepted at:', error);
      throw error;
    }
  }

  async updateOrderDeliveredAt(orderId: string): Promise<Order> {
    try {
      const [updatedOrder] = await db
        .update(orders)
        .set({ 
          deliveredAt: new Date(),
          updatedAt: new Date() 
        })
        .where(eq(orders.id, orderId))
        .returning();
      return updatedOrder;
    } catch (error) {
      console.error('Error updating order delivered at:', error);
      throw error;
    }
  }

  async createPayment(payment: any): Promise<any> {
    try {
      const [newPayment] = await db.insert(payments).values(payment).returning();
      return newPayment;
    } catch (error) {
      console.error('Error creating payment:', error);
      throw error;
    }
  }

  async updatePaymentStatus(orderId: string, status: string): Promise<any> {
    try {
      const [updatedPayment] = await db
        .update(payments)
        .set({ 
          status,
          paidAt: status === 'completed' ? new Date() : null,
          updatedAt: new Date() 
        })
        .where(eq(payments.orderId, orderId))
        .returning();
      return updatedPayment;
    } catch (error) {
      console.error('Error updating payment status:', error);
      throw error;
    }
  }

  async updateOrderPaymentStatus(orderId: string, status: string): Promise<Order> {
    try {
      const [updatedOrder] = await db
        .update(orders)
        .set({ 
          paymentStatus: status,
          updatedAt: new Date() 
        })
        .where(eq(orders.id, orderId))
        .returning();
      return updatedOrder;
    } catch (error) {
      console.error('Error updating order payment status:', error);
      throw error;
    }
  }

  async createNotification(notification: any): Promise<any> {
    try {
      const [newNotification] = await db.insert(notifications).values(notification).returning();
      return newNotification;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  async getNotificationsForUser(userId: string): Promise<any[]> {
    try {
      return await db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, userId))
        .orderBy(desc(notifications.createdAt));
    } catch (error) {
      console.error('Error getting notifications:', error);
      throw error;
    }
  }

  async markNotificationAsRead(notificationId: string): Promise<void> {
    try {
      await db
        .update(notifications)
        .set({ isRead: true })
        .where(eq(notifications.id, notificationId));
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email));
      return user;
    } catch (error) {
      console.error('Error getting user by email:', error);
      throw error;
    }
  }

  async getUserCredentialsByIdentifier(identifier: string): Promise<UserCredentials | undefined> {
    try {
      // Try to find by email first, then by userId
      const [credentials] = await db
        .select()
        .from(userCredentials)
        .where(eq(userCredentials.email, identifier));
      
      if (!credentials) {
        // If not found by email, try by userId
        const [userCreds] = await db
          .select()
          .from(userCredentials)
          .where(eq(userCredentials.userId, identifier));
        return userCreds;
      }
      
      return credentials;
    } catch (error) {
      console.error('Error getting user credentials by identifier:', error);
      throw error;
    }
  }

  async getCustomerOrderHistory(customerId: string): Promise<any[]> {
    try {
      return await db
        .select({
          orderId: orders.id,
          amount: orders.totalAmount,
          status: orders.status,
          createdAt: orders.createdAt
        })
        .from(orders)
        .where(eq(orders.customerId, customerId))
        .orderBy(desc(orders.createdAt))
        .limit(10); // Get last 10 orders
    } catch (error) {
      console.error('Error getting customer order history:', error);
      return []; // Return empty array on error
    }
  }
}

export const storage = new DatabaseStorage();
