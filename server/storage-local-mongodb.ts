import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// MongoDB connection
const MONGODB_URI = process.env.MONGO_URL || 'mongodb://localhost:27017/zipzy';

// Connect to MongoDB
mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// User Schema
const userSchema = new mongoose.Schema({
  id: String,
  email: { type: String, required: true, unique: true },
  firstName: String,
  lastName: String,
  phone: String,
  address: String,
  role: { type: String, default: 'user' },
  isAdmin: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  zpointsBalance: { type: Number, default: 0 }, // ZPoints wallet balance
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// User Credentials Schema
const userCredentialSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

// Product Schema
const productSchema = new mongoose.Schema({
  id: String,
  name: String,
  description: String,
  price: Number,
  categoryId: String,
  imageUrl: String,
  isPopular: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

// Category Schema
const categorySchema = new mongoose.Schema({
  id: String,
  name: String,
  description: String,
  createdAt: { type: Date, default: Date.now }
});

// Order Schema - Extended to match frontend expectations
const orderSchema = new mongoose.Schema({
  id: String,
  customerId: String,
  assignedTo: String,
  status: { type: String, default: 'placed' },
  totalAmount: Number,
  deliveryAddress: String,
  deliveryInstructions: String,
  deliveryLocation: {
    lat: Number,
    lng: Number,
    address: String
  },
  customerLocation: {
    lat: Number,
    lng: Number,
    timestamp: Date,
    accuracy: Number
  },
  paymentMethod: { type: String, default: 'cod' },
  paymentStatus: { type: String, default: 'pending' },
  notes: String,
  items: [{
    productId: String,
    productName: String,
    quantity: Number,
    price: Number
  }],
  
  // Timeline tracking
  paidAt: Date,
  acceptedAt: Date,
  pickedUpAt: Date,
  deliveredAt: Date,
  cancelledAt: Date,
  cancellationReason: String,
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Cart Item Schema
const cartItemSchema = new mongoose.Schema({
  id: String,
  userId: String,
  productId: String,
  quantity: Number,
  createdAt: { type: Date, default: Date.now }
});

// Notification Schema
const notificationSchema = new mongoose.Schema({
  id: String,
  userId: String,
  type: String,
  title: String,
  message: String,
  data: mongoose.Schema.Types.Mixed,
  isRead: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

// Order Tracking Schema
const orderTrackingSchema = new mongoose.Schema({
  id: String,
  orderId: String,
  status: String,
  message: String,
  location: {
    lat: Number,
    lng: Number,
    address: String
  },
  deliveryPartnerId: String,
  createdAt: { type: Date, default: Date.now }
});

// Delivery Partner Schema
const deliveryPartnerSchema = new mongoose.Schema({
  id: String,
  userId: String,
  name: String,
  email: String,
  phone: String,
  vehicleType: String,
  isActive: { type: Boolean, default: true },
  isOnline: { type: Boolean, default: false },
  currentLocation: {
    lat: Number,
    lng: Number,
    address: String,
    timestamp: Date
  },
  rating: { type: Number, default: 5.0 },
  totalDeliveries: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

// Location History Schema
const locationHistorySchema = new mongoose.Schema({
  partnerId: String,
  location: {
    lat: Number,
    lng: Number,
    address: String,
    accuracy: Number
  },
  timestamp: { type: Date, default: Date.now },
  orderId: String,
  status: String
});

// Create models
const User = mongoose.model('User', userSchema);
const UserCredential = mongoose.model('UserCredential', userCredentialSchema);
const Product = mongoose.model('Product', productSchema);
const Category = mongoose.model('Category', categorySchema);
const Order = mongoose.model('Order', orderSchema);
const CartItem = mongoose.model('CartItem', cartItemSchema);
const Notification = mongoose.model('Notification', notificationSchema);
const OrderTracking = mongoose.model('OrderTracking', orderTrackingSchema);
const DeliveryPartner = mongoose.model('DeliveryPartner', deliveryPartnerSchema);
const LocationHistory = mongoose.model('LocationHistory', locationHistorySchema);

// Payment schema
const paymentSchema = new mongoose.Schema({
  id: String,
  orderId: String, // Changed from ObjectId to String to match our custom ID system
  amount: Number,
  status: { type: String, enum: ['pending', 'completed', 'failed', 'refunded'], default: 'pending' },
  paymentMethod: String,
  transactionId: String,
  paidAt: Date,
  refundedAt: Date,
  createdAt: { type: Date, default: Date.now }
});

const Payment = mongoose.model('Payment', paymentSchema);

// ZPoints Transaction Schema
const zpointsTransactionSchema = new mongoose.Schema({
  id: String,
  userId: String,
  type: { type: String, enum: ['credit', 'debit'], required: true },
  amount: { type: Number, required: true },
  balance: { type: Number, required: true }, // Balance after transaction
  description: String,
  orderId: String, // For order-related transactions
  adminId: String, // For admin-initiated transactions
  createdAt: { type: Date, default: Date.now }
});

const ZPointsTransaction = mongoose.model('ZPointsTransaction', zpointsTransactionSchema);

export class LocalMongoDBStorage {
  // User methods
  async createUser(userData: any) {
    const user = new User(userData);
    await user.save();
    return user;
  }

  async getUserById(id: string) {
    return await User.findOne({ id });
  }

  async getUserByEmail(email: string) {
    return await User.findOne({ email });
  }

  async createUserCredential(credentialData: any) {
    const credential = new UserCredential(credentialData);
    await credential.save();
    return credential;
  }

  async getUserCredentials(identifier: string) {
    return await UserCredential.findOne({
      $or: [{ email: identifier }, { userId: identifier }]
    });
  }

  // Product methods
  async getProducts() {
    return await Product.find();
  }

  async getProductById(id: string) {
    return await Product.findOne({ id });
  }

  async getProductsByCategory(categoryId: string) {
    return await Product.find({ categoryId });
  }

  // Category methods
  async getCategories() {
    return await Category.find();
  }

  // Order methods
  async createOrder(orderData: any, items: any[]) {
    const order = new Order({
      ...orderData,
      items
    });
    await order.save();
    return order.id;
  }

  async getOrders() {
    return await Order.find();
  }

  async getOrderById(id: string) {
    return await Order.findOne({ id });
  }

  async getOrdersByUser(userId: string) {
    return await Order.find({ customerId: userId });
  }

  async updateOrder(id: string, updates: any) {
    return await Order.findOneAndUpdate({ id }, updates, { new: true });
  }

  async updateOrderLocation(id: string, location: string) {
    return await Order.findOneAndUpdate({ id }, { deliveryLocation: location }, { new: true });
  }





  async storeTrackingSession(session: any) {
    // This would store the completed tracking session for analytics
    console.log(`💾 Storing tracking session:`, session);
  }

  // Inventory tracking methods
  async recordStockMovement(movement: any) {
    // This would store stock movement records
    console.log(`📊 Recording stock movement:`, movement);
  }

  // Order tracking methods
  async createOrderTracking(trackingData: any) {
    try {
      const tracking = new OrderTracking({
        id: trackingData.id || `track_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        orderId: trackingData.orderId,
        status: trackingData.status,
        message: trackingData.message,
        location: trackingData.location,
        deliveryPartnerId: trackingData.deliveryPartnerId
      });
      await tracking.save();
      console.log(`✅ Order tracking entry created:`, tracking.id);
      return tracking;
    } catch (error) {
      console.error('❌ Failed to create order tracking:', error);
      throw error;
    }
  }

  async getOrderTracking(orderId: string) {
    try {
      return await OrderTracking.find({ orderId }).sort({ createdAt: 1 });
    } catch (error) {
      console.error(`❌ Failed to get order tracking for ${orderId}:`, error);
      return [];
    }
  }

  // Delivery partner methods
  async createDeliveryPartner(partnerData: any) {
    try {
      const partner = new DeliveryPartner({
        id: partnerData.id || `partner_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ...partnerData
      });
      await partner.save();
      console.log(`✅ Delivery partner created:`, partner.id);
      return partner;
    } catch (error) {
      console.error('❌ Failed to create delivery partner:', error);
      throw error;
    }
  }

  async getDeliveryPartner(partnerId: string) {
    try {
      return await DeliveryPartner.findOne({ id: partnerId });
    } catch (error) {
      console.error(`❌ Failed to get delivery partner ${partnerId}:`, error);
      return null;
    }
  }

  async updateDeliveryPartner(partnerId: string, updates: any) {
    try {
      return await DeliveryPartner.findOneAndUpdate({ id: partnerId }, updates, { new: true });
    } catch (error) {
      console.error(`❌ Failed to update delivery partner ${partnerId}:`, error);
      throw error;
    }
  }

  async getAvailablePartners() {
    try {
      return await DeliveryPartner.find({ isActive: true, isOnline: true });
    } catch (error) {
      console.error('❌ Failed to get available partners:', error);
      return [];
    }
  }

  // Location tracking methods - Implementation with actual partner collection
  async updatePartnerLocation(partnerId: string, location: any, status: string) {
    try {
      // Update partner current location
      await DeliveryPartner.findOneAndUpdate(
        { id: partnerId },
        {
          currentLocation: {
            ...location,
            timestamp: new Date()
          },
          isOnline: true
        },
        { upsert: true }
      );

      // Store in location history
      const history = new LocationHistory({
        partnerId,
        location,
        timestamp: new Date(),
        status
      });
      await history.save();

      console.log(`📍 Partner ${partnerId} location updated`);
    } catch (error) {
      console.error(`❌ Failed to update partner location:`, error);
    }
  }

  async getPartnerLocationHistory(partnerId: string, limit: number = 50) {
    try {
      return await LocationHistory
        .find({ partnerId })
        .sort({ timestamp: -1 })
        .limit(limit);
    } catch (error) {
      console.error(`❌ Failed to get location history for ${partnerId}:`, error);
      return [];
    }
  }



  // Order assignment methods
  async assignOrderToPartner(orderId: string, partnerId: string) {
    try {
      const order = await Order.findOneAndUpdate(
        { id: orderId },
        {
          assignedTo: partnerId,
          acceptedAt: new Date(),
          status: 'assigned',
          updatedAt: new Date()
        },
        { new: true }
      );

      if (order) {
        console.log(`✅ Order ${orderId} assigned to partner ${partnerId}`);
      }

      return order;
    } catch (error) {
      console.error(`❌ Failed to assign order ${orderId} to partner ${partnerId}:`, error);
      throw error;
    }
  }

  // Enhanced order methods to support the new fields
  async updateOrderStatus(orderId: string, status: string, metadata?: any) {
    try {
      const updates: any = {
        status,
        updatedAt: new Date()
      };

      // Add timestamp fields based on status
      if (status === 'confirmed' && !metadata?.paidAt) {
        updates.paidAt = new Date();
        updates.paymentStatus = 'completed';
      } else if (status === 'assigned') {
        updates.acceptedAt = new Date();
      } else if (status === 'picked_up') {
        updates.pickedUpAt = new Date();
      } else if (status === 'delivered') {
        updates.deliveredAt = new Date();
      } else if (status === 'cancelled') {
        updates.cancelledAt = new Date();
        if (metadata?.reason) {
          updates.cancellationReason = metadata.reason;
        }
      }

      // Add any additional metadata
      if (metadata) {
        Object.assign(updates, metadata);
      }

      return await Order.findOneAndUpdate({ id: orderId }, updates, { new: true });
    } catch (error) {
      console.error(`❌ Failed to update order status for ${orderId}:`, error);
      throw error;
    }
  }

  async getAvailableOrders() {
    return await Order.find({ status: 'pending' });
  }

  // Cart methods
  async getCartItems(userId: string) {
    return await CartItem.find({ userId });
  }

  async addToCart(cartData: any) {
    const cartItem = new CartItem(cartData);
    await cartItem.save();
    return cartItem;
  }

  async updateCartItem(id: string, quantity: number) {
    return await CartItem.findOneAndUpdate({ id }, { quantity }, { new: true });
  }

  async removeFromCart(id: string) {
    return await CartItem.findOneAndDelete({ id });
  }

  async clearCart(userId: string) {
    return await CartItem.deleteMany({ userId });
  }

  // Notification methods
  async getNotificationsByUser(userId: string) {
    return await Notification.find({ userId });
  }

  async markNotificationAsRead(id: string) {
    return await Notification.findOneAndUpdate({ id }, { isRead: true }, { new: true });
  }

  // Seed data
  async seedData() {
    // Seed categories
    const categories = [
      { id: '1', name: 'Food & Beverages', description: 'Delicious food and drinks' },
      { id: '2', name: 'Electronics', description: 'Basic electronics and phone accessories' },
      { id: '3', name: 'Medicine & Health', description: 'Healthcare products and medicines' },
      { id: '4', name: 'Snacks & Beverages', description: 'Delicious snacks and refreshing drinks' },
      { id: '5', name: 'Books & Stationery', description: 'Educational materials and office supplies' }
    ];

    for (const category of categories) {
      await Category.findOneAndUpdate({ id: category.id }, category, { upsert: true });
    }

    // Seed products
    const products = [
      // Food & Beverages
      { id: '1', name: 'Pizza Margherita', description: 'Classic Italian pizza with fresh mozzarella', price: 299.99, categoryId: '1', imageUrl: 'Margherita_pizza_icon_b22e0f47-DfiUmKZj', isPopular: true },
      { id: '2', name: 'Burger Deluxe', description: 'Juicy beef burger with cheese and veggies', price: 199.99, categoryId: '1', imageUrl: 'Vegetarian_burger_icon_80f630fb-DLrgSNUP', isPopular: true },
      { id: '3', name: 'Chicken Biryani', description: 'Aromatic rice with tender chicken', price: 399.99, categoryId: '1', imageUrl: 'Chicken_biryani_dish_icon_1f76e2bc-C2gd80to', isPopular: true },
      { id: '4', name: 'Pasta Carbonara', description: 'Creamy pasta with bacon and parmesan', price: 249.99, categoryId: '1', imageUrl: 'Pasta_alfredo_creamy_3D_bb23a4b7-Bpn5jdK6' },
      { id: '5', name: 'Caesar Salad', description: 'Fresh greens with caesar dressing', price: 179.99, categoryId: '1', imageUrl: 'Fresh_yogurt_creamy_3D_13c4bbcb-BMNV-5YP' },
      { id: '6', name: 'Chocolate Cake', description: 'Rich chocolate cake with frosting', price: 149.99, categoryId: '1', imageUrl: 'Chocolate_bar_milk_3D_ba9d92e4-BPH2vWOb' },
      { id: '7', name: 'Coffee Latte', description: 'Smooth coffee with steamed milk', price: 99.99, categoryId: '1', imageUrl: 'Cappuccino_cup_foam_3D_655873bd-DcHzWf7B', isPopular: true },
      { id: '8', name: 'Green Tea', description: 'Refreshing green tea', price: 49.99, categoryId: '1', imageUrl: 'Green_tea_cup_3D_507e7adc-CqHMo-kT' },
      { id: '9', name: 'French Fries', description: 'Crispy golden fries', price: 89.99, categoryId: '1', imageUrl: 'Fresh_potatoes_brown_3D_9b7bc78b-K--DX13N' },
      { id: '10', name: 'Ice Cream Sundae', description: 'Vanilla ice cream with toppings', price: 129.99, categoryId: '1', imageUrl: 'Ice_cream_cup_vanilla_3D_57fda7dc-DArKXNnM' },
      { id: '11', name: 'Sandwich Club', description: 'Triple-decker sandwich with turkey', price: 199.99, categoryId: '1', imageUrl: 'Cheese_sandwich_grilled_3D_7e2e6bb3-CbsWnHwU' },
      { id: '12', name: 'Sushi Roll', description: 'Fresh salmon and avocado roll', price: 349.99, categoryId: '1', imageUrl: 'Masala_dosa_plate_3D_37f8cf83-CKelhOJJ' },
      { id: '13', name: 'Milkshake', description: 'Thick chocolate milkshake', price: 119.99, categoryId: '1', imageUrl: 'Chocolate_milkshake_glass_3D_90ce7b-CW9SXjkS' },
      { id: '14', name: 'Pancakes', description: 'Fluffy pancakes with maple syrup', price: 179.99, categoryId: '1', imageUrl: 'Granola_bar_healthy_3D_47a0d084-DsU5sIW3' },
      { id: '15', name: 'Chicken Wings', description: 'Spicy buffalo wings', price: 249.99, categoryId: '1', imageUrl: 'Mutton_biryani_tender_3D_cb583a6e-DL1SVMoA' },
      
      // Electronics - Basic Products & Accessories
      { id: '16', name: 'USB Cable', description: 'High-quality USB-C charging cable', price: 199.99, categoryId: '2', imageUrl: 'USB_charging_cable_3D_cdf3ba45-DaF9Gj3e', isPopular: true },
      { id: '17', name: 'Phone Charger', description: 'Fast charging adapter 18W', price: 299.99, categoryId: '2', imageUrl: 'Power_bank_black_3D_c180205c-BojVETwy' },
      { id: '18', name: 'Screen Protector', description: 'Tempered glass screen protector', price: 149.99, categoryId: '2', imageUrl: 'Screen_guard_tempered_3D_c51cb72a-2kCmjeip' },
      { id: '19', name: 'Phone Case', description: 'Shockproof phone case', price: 199.99, categoryId: '2', imageUrl: 'Phone_case_protective_3D_b8071670-lVAiZ3Cf' },
      { id: '20', name: 'Bluetooth Earbuds', description: 'Wireless bluetooth earbuds', price: 599.99, categoryId: '2', imageUrl: 'Bluetooth_earphones_wireless_3D_fda99d26-cpvO697c' },
      { id: '21', name: 'Memory Card', description: '32GB microSD memory card', price: 399.99, categoryId: '2', imageUrl: 'Memory_card_microSD_3D_439bedef-CSvzpil4' },
      { id: '22', name: 'Phone Stand', description: 'Adjustable phone holder stand', price: 149.99, categoryId: '2', imageUrl: 'HD_webcam_modern_3D_11022b83-CFzaQkIS' },
      { id: '23', name: 'Cable Organizer', description: 'Cable management clips pack', price: 99.99, categoryId: '2', imageUrl: 'USB_flash_drive_3D_0d429f44-Uf8r168w' },
      { id: '24', name: 'Power Bank', description: '10000mAh portable charger', price: 899.99, categoryId: '2', imageUrl: 'Power_bank_black_3D_c180205c-BojVETwy' },
      
      // Medicine & Health
      { id: '25', name: 'Paracetamol 500mg', description: 'Fever and pain relief tablets', price: 45.99, categoryId: '3', imageUrl: 'Medicine_tablets_icon_c85c69ea-Bied7eQ0' },
      { id: '26', name: 'Vitamin C Tablets', description: 'Immunity booster vitamin tablets', price: 199.99, categoryId: '3', imageUrl: 'Vitamin_C_bottle_icon_f5613c39-D8HZMZ-I' },
      { id: '27', name: 'First Aid Kit', description: 'Complete first aid kit for emergencies', price: 599.99, categoryId: '3', imageUrl: 'Band-aid_pack_icon_0716bc1e-CbqjXXXe' },
      { id: '28', name: 'Digital Thermometer', description: 'Accurate digital body thermometer', price: 299.99, categoryId: '3', imageUrl: 'Digital_thermometer_icon_2b6e0022-K0vfMB3X' },
      { id: '29', name: 'Hand Sanitizer', description: '500ml alcohol-based hand sanitizer', price: 89.99, categoryId: '3', imageUrl: 'Hand_sanitizer_bottle_icon_cef38fee-Bix59AvF' },
      { id: '30', name: 'Face Mask Pack', description: 'Pack of 50 disposable face masks', price: 149.99, categoryId: '3', imageUrl: 'Antiseptic_liquid_bottle_icon_0cd96992-BIEiYkx4' },
      { id: '31', name: 'Pain Relief Gel', description: 'Topical pain relief gel 50g', price: 179.99, categoryId: '3', imageUrl: 'Medicine_tablets_blister_3D_d963e477-D-7fnpwM' },
      { id: '32', name: 'Cough Syrup', description: 'Effective cough relief syrup 100ml', price: 129.99, categoryId: '3', imageUrl: 'Vitamin_C_bottle_3D_633c08c9-BAOA1e9C' },
      { id: '33', name: 'Bandage Roll', description: 'Sterile bandage roll 5m', price: 79.99, categoryId: '3', imageUrl: 'Band-aid_pack_medical_3D_0d7498fa-D-zJ8t8t' },
      { id: '34', name: 'Antiseptic Solution', description: 'Antiseptic solution 100ml', price: 99.99, categoryId: '3', imageUrl: 'Antiseptic_liquid_bottle_3D_cda7ec09-CNOJBC4q' },
      
      // Snacks & Beverages
      { id: '35', name: 'Potato Chips', description: 'Classic salted potato chips 100g', price: 49.99, categoryId: '4', imageUrl: 'Fresh_potatoes_brown_3D_9b7bc78b-K--DX13N' },
      { id: '36', name: 'Chocolate Bar', description: 'Rich dark chocolate bar 80g', price: 89.99, categoryId: '4', imageUrl: 'Chocolate_bar_milk_3D_ba9d92e4-BPH2vWOb' },
      { id: '37', name: 'Mixed Nuts', description: 'Premium mixed nuts 200g', price: 299.99, categoryId: '4', imageUrl: 'Coconut_water_natural_3D_975b1347-CaxNhmmk' },
      { id: '38', name: 'Popcorn', description: 'Butter flavored popcorn 150g', price: 69.99, categoryId: '4', imageUrl: 'Biscuit_pack_cream_3D_9a5aa14b-BK0Waj2C' },
      { id: '39', name: 'Energy Drink', description: 'High energy drink 250ml', price: 119.99, categoryId: '4', imageUrl: 'Energy_drink_can_3D_5d8b66d8-B5UZ7F4t' },
      { id: '40', name: 'Fruit Juice', description: 'Fresh orange juice 1L', price: 159.99, categoryId: '4', imageUrl: 'Orange_juice_glass_3D_506e022c-DLhvdOev' },
      { id: '41', name: 'Biscuits Pack', description: 'Assorted biscuits pack 500g', price: 89.99, categoryId: '4', imageUrl: 'Biscuit_pack_cream_3D_9a5aa14b-BK0Waj2C' },
      { id: '42', name: 'Dry Fruits', description: 'Premium dry fruits mix 250g', price: 399.99, categoryId: '4', imageUrl: 'Fresh_eggs_carton_3D_4f97b5d1-AFkf4jQp' },
      { id: '43', name: 'Soft Drink', description: 'Refreshing cola drink 2L', price: 99.99, categoryId: '4', imageUrl: 'Cold_coffee_glass_3D_6edx5772-DhxLl7ex' },
      { id: '44', name: 'Candy Pack', description: 'Assorted candies pack 200g', price: 79.99, categoryId: '4', imageUrl: 'Fresh_lime_water_3D_a8d24422-DLL6mHeX' },
      
      // Books & Stationery
      { id: '45', name: 'Notebook', description: 'Premium quality notebook A4 size', price: 199.99, categoryId: '5', imageUrl: 'Notebook_set_icon_81886216-BaGX-cfQ' },
      { id: '46', name: 'Pen Set', description: 'Set of 5 colorful gel pens', price: 149.99, categoryId: '5', imageUrl: 'Ballpoint_pens_icon_65c631ba-CNl8nnua' },
      { id: '47', name: 'Pencil Box', description: 'Metal pencil box with accessories', price: 299.99, categoryId: '5', imageUrl: 'Geometry_box_icon_089f1370-C_B-Zx38' },
      { id: '48', name: 'Stapler', description: 'Heavy duty stapler with staples', price: 179.99, categoryId: '5', imageUrl: 'A4_paper_stack_3D_14cb47f8-CMEODQnU' },
      { id: '49', name: 'Calculator', description: 'Scientific calculator for students', price: 599.99, categoryId: '5', imageUrl: 'Keyboard_mechanical_black_3D_d5a8746c-CL3tDwzv' },
      { id: '50', name: 'Sticky Notes', description: 'Colorful sticky notes pack', price: 89.99, categoryId: '5', imageUrl: 'Sticky_notes_icon_1861c2ca-BocU4ESK' }
    ];

    for (const product of products) {
      await Product.findOneAndUpdate({ id: product.id }, product, { upsert: true });
    }

    console.log('✅ MongoDB data seeded successfully');
  }

  // Seed comprehensive test data
  async seedAdminTestData() {
    try {
      console.log('🌱 Seeding comprehensive test data...');

      // Create comprehensive test users
      const testUsers = [
        {
          id: 'admin-1756623849620',
          email: 'rishabhkapoor@atomicmail.io',
          firstName: 'Rishabh',
          lastName: 'Kapoor',
          phone: '8091273304',
          collegeId: 'SU2024001',
          studentId: 'gf202455815',
          department: 'Computer Science',
          hostelAddress: 'GHS Boys Aryabhatta',
          isAdmin: true,
          zpointsBalance: 5000,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'user_123',
          email: 'john.doe@iitd.ac.in',
          firstName: 'John',
          lastName: 'Doe',
          phone: '+91-9876543210',
          collegeId: 'IITD2024001',
          studentId: '2024CS1001',
          department: 'Computer Science',
          hostelAddress: 'Hostel Block A, Room 101',
          isAdmin: false,
          zpointsBalance: 1500,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'user_456',
          email: 'jane.smith@iitd.ac.in',
          firstName: 'Jane',
          lastName: 'Smith',
          phone: '+91-9876543211',
          collegeId: 'IITD2024002',
          studentId: '2024EE1001',
          department: 'Electrical Engineering',
          hostelAddress: 'Hostel Block B, Room 205',
          isAdmin: false,
          zpointsBalance: 800,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'user_789',
          email: 'mike.wilson@iitd.ac.in',
          firstName: 'Mike',
          lastName: 'Wilson',
          phone: '+91-9876543212',
          collegeId: 'IITD2024003',
          studentId: '2024ME1001',
          department: 'Mechanical Engineering',
          hostelAddress: 'Hostel Block C, Room 310',
          isAdmin: false,
          zpointsBalance: 2000,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'partner_001',
          email: 'raj.kumar@zipzy.com',
          firstName: 'Raj',
          lastName: 'Kumar',
          phone: '+91-9876543213',
          isAdmin: false,
          zpointsBalance: 0,
          role: 'partner',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'partner_002',
          email: 'priya.sharma@zipzy.com',
          firstName: 'Priya',
          lastName: 'Sharma',
          phone: '+91-9876543214',
          isAdmin: false,
          zpointsBalance: 0,
          role: 'partner',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      for (const user of testUsers) {
        await User.findOneAndUpdate({ id: user.id }, user, { upsert: true });
      }

      // Create admin user credential
      const bcrypt = require('bcryptjs');
      const adminPasswordHash = await bcrypt.hash('rishabhkapoor@0444', 10);
      await UserCredential.findOneAndUpdate(
        { email: 'rishabhkapoor@atomicmail.io' },
        {
          userId: 'admin-1756623849620',
          email: 'rishabhkapoor@atomicmail.io',
          passwordHash: adminPasswordHash
        },
        { upsert: true }
      );

      // Create comprehensive test orders
      const testOrders = [
        {
          id: 'order_001',
          customerId: 'user_123',
          status: 'placed',
          totalAmount: 450,
          deliveryAddress: 'Hostel Block A, Room 101, IIT Delhi',
          paymentMethod: 'card',
          paymentStatus: 'pending',
          items: [
            { productId: '1', productName: 'Wireless Headphones', quantity: 1, price: 450 }
          ],
          customerLocation: {
            latitude: 28.5454,
            longitude: 77.1923,
            address: 'IIT Delhi Campus'
          },
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'order_002',
          customerId: 'user_456',
          status: 'accepted',
          totalAmount: 320,
          deliveryAddress: 'Hostel Block B, Room 205, IIT Delhi',
          paymentMethod: 'zpoints',
          paymentStatus: 'completed',
          assignedTo: 'partner_001',
          paidAt: new Date(Date.now() - 1800000), // 30 minutes ago
          acceptedAt: new Date(Date.now() - 1200000), // 20 minutes ago
          items: [
            { productId: '15', productName: 'Energy Drink', quantity: 2, price: 160 }
          ],
          createdAt: new Date(Date.now() - 3600000), // 1 hour ago
          updatedAt: new Date(Date.now() - 1200000)
        },
        {
          id: 'order_003',
          customerId: 'user_789',
          status: 'out_for_delivery',
          totalAmount: 180,
          deliveryAddress: 'Hostel Block C, Room 310, IIT Delhi',
          paymentMethod: 'cash',
          paymentStatus: 'pending',
          assignedTo: 'partner_002',
          acceptedAt: new Date(Date.now() - 2400000), // 40 minutes ago
          pickedUpAt: new Date(Date.now() - 600000), // 10 minutes ago
          items: [
            { productId: '25', productName: 'Paracetamol 500mg', quantity: 1, price: 45 },
            { productId: '26', productName: 'Band-Aid Strips', quantity: 1, price: 35 }
          ],
          createdAt: new Date(Date.now() - 4800000), // 2 hours ago
          updatedAt: new Date(Date.now() - 600000)
        },
        {
          id: 'order_004',
          customerId: 'user_123',
          status: 'delivered',
          totalAmount: 750,
          deliveryAddress: 'Hostel Block A, Room 101, IIT Delhi',
          paymentMethod: 'card',
          paymentStatus: 'completed',
          assignedTo: 'partner_001',
          paidAt: new Date(Date.now() - 86400000), // 1 day ago
          acceptedAt: new Date(Date.now() - 86400000),
          pickedUpAt: new Date(Date.now() - 86400000),
          deliveredAt: new Date(Date.now() - 86400000),
          items: [
            { productId: '5', productName: 'Laptop Stand', quantity: 1, price: 750 }
          ],
          createdAt: new Date(Date.now() - 86400000),
          updatedAt: new Date(Date.now() - 86400000)
        },
        {
          id: 'order_005',
          customerId: 'user_456',
          status: 'preparing',
          totalAmount: 280,
          deliveryAddress: 'Hostel Block B, Room 205, IIT Delhi',
          paymentMethod: 'zpoints',
          paymentStatus: 'completed',
          assignedTo: 'partner_002',
          paidAt: new Date(Date.now() - 900000), // 15 minutes ago
          acceptedAt: new Date(Date.now() - 900000),
          items: [
            { productId: '20', productName: 'Protein Bar', quantity: 4, price: 70 }
          ],
          createdAt: new Date(Date.now() - 1800000), // 30 minutes ago
          updatedAt: new Date(Date.now() - 900000)
        }
      ];

      for (const order of testOrders) {
        await Order.findOneAndUpdate({ id: order.id }, order, { upsert: true });
      }

      // Create comprehensive test payments
      const testPayments = [
        {
          id: 'payment_001',
          orderId: 'order_001',
          userId: 'user_123',
          amount: 450,
          method: 'card',
          status: 'pending',
          createdAt: new Date()
        },
        {
          id: 'payment_002',
          orderId: 'order_002',
          userId: 'user_456',
          amount: 320,
          method: 'zpoints',
          status: 'completed',
          transactionId: 'zpoints_txn_001',
          paidAt: new Date(Date.now() - 1800000),
          createdAt: new Date(Date.now() - 3600000)
        },
        {
          id: 'payment_003',
          orderId: 'order_003',
          userId: 'user_789',
          amount: 180,
          method: 'cash',
          status: 'pending',
          createdAt: new Date(Date.now() - 4800000)
        },
        {
          id: 'payment_004',
          orderId: 'order_004',
          userId: 'user_123',
          amount: 750,
          method: 'card',
          status: 'completed',
          transactionId: 'card_txn_001',
          paidAt: new Date(Date.now() - 86400000),
          createdAt: new Date(Date.now() - 86400000)
        },
        {
          id: 'payment_005',
          orderId: 'order_005',
          userId: 'user_456',
          amount: 280,
          method: 'zpoints',
          status: 'completed',
          transactionId: 'zpoints_txn_002',
          paidAt: new Date(Date.now() - 900000),
          createdAt: new Date(Date.now() - 1800000)
        }
      ];

      for (const payment of testPayments) {
        await Payment.findOneAndUpdate({ id: payment.id }, payment, { upsert: true });
      }

      // Create comprehensive ZPoints transaction history
      const zpointsTransactions = [
        {
          id: 'zpoints_txn_001',
          userId: 'user_123',
          amount: 1000,
          type: 'credit',
          description: 'Welcome bonus',
          createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 days ago
        },
        {
          id: 'zpoints_txn_002',
          userId: 'user_123',
          amount: 500,
          type: 'credit',
          description: 'Referral bonus',
          createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) // 5 days ago
        },
        {
          id: 'zpoints_txn_003',
          userId: 'user_123',
          amount: 750,
          type: 'debit',
          description: 'Payment for order order_004',
          orderId: 'order_004',
          createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000) // 1 day ago
        },
        {
          id: 'zpoints_txn_004',
          userId: 'user_456',
          amount: 800,
          type: 'credit',
          description: 'Welcome bonus',
          createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000) // 6 days ago
        },
        {
          id: 'zpoints_txn_005',
          userId: 'user_456',
          amount: 320,
          type: 'debit',
          description: 'Payment for order order_002',
          orderId: 'order_002',
          createdAt: new Date(Date.now() - 60 * 60 * 1000) // 1 hour ago
        },
        {
          id: 'zpoints_txn_006',
          userId: 'user_456',
          amount: 280,
          type: 'debit',
          description: 'Payment for order order_005',
          orderId: 'order_005',
          createdAt: new Date(Date.now() - 15 * 60 * 1000) // 15 minutes ago
        },
        {
          id: 'zpoints_txn_007',
          userId: 'user_789',
          amount: 2000,
          type: 'credit',
          description: 'Welcome bonus',
          createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000) // 4 days ago
        },
        {
          id: 'zpoints_txn_008',
          userId: 'user_789',
          amount: 300,
          type: 'credit',
          description: 'Feedback bonus',
          createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2 days ago
        }
      ];

      for (const transaction of zpointsTransactions) {
        await ZPointsTransaction.findOneAndUpdate({ id: transaction.id }, transaction, { upsert: true });
      }

      // Create delivery partner data
      const deliveryPartners = [
        {
          id: 'partner_001',
          userId: 'partner_001',
          isAvailable: true,
          currentLocation: {
            latitude: 28.5454,
            longitude: 77.1923,
            address: 'IIT Delhi Campus',
            timestamp: new Date()
          },
          rating: 4.8,
          totalDeliveries: 45,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'partner_002',
          userId: 'partner_002',
          isAvailable: true,
          currentLocation: {
            latitude: 28.5460,
            longitude: 77.1930,
            address: 'Near IIT Delhi Gate',
            timestamp: new Date()
          },
          rating: 4.6,
          totalDeliveries: 32,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      for (const partner of deliveryPartners) {
        await DeliveryPartner.findOneAndUpdate({ id: partner.id }, partner, { upsert: true });
      }

      // Create order tracking data
      const orderTracking = [
        {
          id: 'tracking_001',
          orderId: 'order_001',
          status: 'placed',
          message: 'Order placed successfully',
          createdAt: new Date()
        },
        {
          id: 'tracking_002',
          orderId: 'order_002',
          status: 'accepted',
          message: 'Order accepted by partner',
          createdAt: new Date(Date.now() - 1200000)
        },
        {
          id: 'tracking_003',
          orderId: 'order_003',
          status: 'out_for_delivery',
          message: 'Order picked up and out for delivery',
          location: {
            latitude: 28.5460,
            longitude: 77.1930,
            address: 'Near IIT Delhi Gate',
            timestamp: new Date(Date.now() - 600000)
          },
          createdAt: new Date(Date.now() - 600000)
        },
        {
          id: 'tracking_004',
          orderId: 'order_004',
          status: 'delivered',
          message: 'Order delivered successfully',
          actualDelivery: new Date(Date.now() - 86400000),
          createdAt: new Date(Date.now() - 86400000)
        },
        {
          id: 'tracking_005',
          orderId: 'order_005',
          status: 'preparing',
          message: 'Order is being prepared',
          createdAt: new Date(Date.now() - 900000)
        }
      ];

      for (const tracking of orderTracking) {
        await OrderTracking.findOneAndUpdate({ id: tracking.id }, tracking, { upsert: true });
      }

      console.log('✅ Comprehensive test data seeded successfully');
      console.log('📊 Data Summary:');
      console.log('   - 5 Test Users (3 customers, 2 partners)');
      console.log('   - 5 Test Orders (all statuses)');
      console.log('   - 5 Test Payments (all methods)');
      console.log('   - 8 ZPoints Transactions');
      console.log('   - 2 Delivery Partners');
      console.log('   - 5 Order Tracking Entries');
    } catch (error) {
      console.error('❌ Failed to seed admin test data:', error);
    }
  }

  // Admin methods
  async getUsers() {
    try {
      const users = await User.find({});
      return users.map(user => user.toObject());
    } catch (error) {
      console.error('Failed to get users:', error);
      return [];
    }
  }

  async updateUser(userId: string, updates: any) {
    try {
      const user = await User.findOneAndUpdate({ id: userId }, updates, { new: true });
      return user ? user.toObject() : null;
    } catch (error) {
      console.error('Failed to update user:', error);
      return null;
    }
  }

  async getPayments() {
    try {
      const payments = await Payment.find({});
      const paymentsWithOrderInfo = await Promise.all(
        payments.map(async (payment) => {
          const paymentObj = payment.toObject();
          if (paymentObj.orderId) {
            // Get order details separately since orderId is now a string
            const order = await Order.findOne({ id: paymentObj.orderId });
            if (order) {
              const user = await User.findOne({ id: order.customerId });
              (paymentObj as any).order = {
                orderNumber: order.id, // Use order.id as orderNumber
                customerName: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'Unknown Customer'
              };
            }
          }
          return paymentObj;
        })
      );
      return paymentsWithOrderInfo;
    } catch (error) {
      console.error('Failed to get payments:', error);
      return [];
    }
  }

  async updatePayment(paymentId: string, updates: any) {
    try {
      const payment = await Payment.findOneAndUpdate({ id: paymentId }, updates, { new: true });
      return payment ? payment.toObject() : null;
    } catch (error) {
      console.error('Failed to update payment:', error);
      return null;
    }
  }

  // Notification methods - Implementation
  async createNotification(notificationData: any) {
    try {
      const notification = new Notification(notificationData);
      await notification.save();
      return notification.toObject();
    } catch (error) {
      console.error('Failed to create notification:', error);
      throw error;
    }
  }

  // ZPoints methods
  async getUserZPointsBalance(userId: string) {
    try {
      const user = await User.findOne({ id: userId });
      return user ? user.zpointsBalance || 0 : 0;
    } catch (error) {
      console.error('Failed to get user ZPoints balance:', error);
      return 0;
    }
  }

  async creditZPoints(userId: string, amount: number, description: string, adminId?: string, orderId?: string) {
    try {
      const user = await User.findOne({ id: userId });
      if (!user) {
        throw new Error('User not found');
      }

      const currentBalance = user.zpointsBalance || 0;
      const newBalance = currentBalance + amount;

      // Update user balance
      await User.findOneAndUpdate({ id: userId }, { zpointsBalance: newBalance });

      // Create transaction record
      const transaction = new ZPointsTransaction({
        id: `zpt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        type: 'credit',
        amount,
        balance: newBalance,
        description,
        orderId,
        adminId
      });
      await transaction.save();

      return {
        success: true,
        newBalance,
        transaction: transaction.toObject()
      };
    } catch (error) {
      console.error('Failed to credit ZPoints:', error);
      throw error;
    }
  }

  async debitZPoints(userId: string, amount: number, description: string, orderId?: string) {
    try {
      const user = await User.findOne({ id: userId });
      if (!user) {
        throw new Error('User not found');
      }

      const currentBalance = user.zpointsBalance || 0;
      if (currentBalance < amount) {
        throw new Error('Insufficient ZPoints balance');
      }

      const newBalance = currentBalance - amount;

      // Update user balance
      await User.findOneAndUpdate({ id: userId }, { zpointsBalance: newBalance });

      // Create transaction record
      const transaction = new ZPointsTransaction({
        id: `zpt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        type: 'debit',
        amount,
        balance: newBalance,
        description,
        orderId
      });
      await transaction.save();

      return {
        success: true,
        newBalance,
        transaction: transaction.toObject()
      };
    } catch (error) {
      console.error('Failed to debit ZPoints:', error);
      throw error;
    }
  }

  async getZPointsTransactionHistory(userId: string, limit: number = 50) {
    try {
      const transactions = await ZPointsTransaction.find({ userId })
        .sort({ createdAt: -1 })
        .limit(limit);
      return transactions.map(t => t.toObject());
    } catch (error) {
      console.error('Failed to get ZPoints transaction history:', error);
      return [];
    }
  }

  async payOrderWithZPoints(orderId: string, userId: string) {
    try {
      const order = await Order.findOne({ id: orderId });
      if (!order) {
        throw new Error('Order not found');
      }

      if (order.customerId !== userId) {
        throw new Error('Order does not belong to user');
      }

      if (order.paymentStatus === 'completed') {
        throw new Error('Order already paid');
      }

      // Convert order amount to ZPoints (1 ZPoint = ₹1 for simplicity)
      const zpointsRequired = Math.ceil(order.totalAmount || 0);

      // Debit ZPoints
      const debitResult = await this.debitZPoints(
        userId, 
        zpointsRequired, 
        `Payment for order ${orderId}`,
        orderId
      );

      // Update order payment status
      await Order.findOneAndUpdate({ id: orderId }, {
        paymentStatus: 'completed',
        paymentMethod: 'zpoints',
        paidAt: new Date()
      });

      return {
        success: true,
        zpointsUsed: zpointsRequired,
        newBalance: debitResult.newBalance,
        order: await Order.findOne({ id: orderId })
      };
    } catch (error) {
      console.error('Failed to pay order with ZPoints:', error);
      throw error;
    }
  }
}
