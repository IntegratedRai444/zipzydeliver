// MongoDB-compatible schema types for Zipzy client
export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
  collegeId?: string;
  studentId?: string;
  department?: string;
  hostelAddress?: string;
  phone?: string;
  isAdmin: boolean;
  isDeliveryPartner?: boolean;
  role?: string;
  zpointsBalance: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  isActive: boolean;
  createdAt: Date;
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  originalPrice?: number;
  imageUrl?: string;
  categoryId: string;
  rating?: number;
  reviewCount?: number;
  isAvailable: boolean;
  isPopular: boolean;
  deliveryTime?: number; // in minutes
  createdAt: Date;
  updatedAt: Date;
}

export interface CartItem {
  id: string;
  userId: string;
  productId: string;
  quantity: number;
  product?: Product;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  price: number;
  unitPrice: number;
  product?: Product;
  createdAt: Date;
}

export interface Order {
  id: string;
  customerId: string;
  assignedTo?: string;
  status: 'pending' | 'accepted' | 'preparing' | 'out_for_delivery' | 'delivered' | 'cancelled';
  totalAmount: number;
  items: OrderItem[];
  customerLocation?: Location;
  deliveryAddress?: string;
  paymentStatus: 'pending' | 'completed' | 'failed';
  paymentMethod: 'card' | 'cash' | 'zpoints';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Location {
  latitude: number;
  longitude: number;
  address?: string;
  timestamp: Date;
}

export interface OrderTracking {
  id: string;
  orderId: string;
  status: string;
  message?: string;
  location?: Location;
  estimatedDelivery?: Date;
  actualDelivery?: Date;
  createdAt: Date;
}

export interface OrderDelivery {
  id: string;
  orderId: string;
  partnerId: string;
  pickupTime?: Date;
  deliveryTime?: Date;
  status: 'assigned' | 'picked_up' | 'in_transit' | 'delivered';
  createdAt: Date;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  timestamp: Date;
  isRead: boolean;
  senderType?: 'user' | 'bot' | 'partner' | 'admin';
  createdAt?: Date;
}

export interface Conversation {
  id: string;
  participants: string[];
  lastMessage?: Message;
  type?: 'support' | 'delivery' | 'general';
  status?: 'active' | 'closed' | 'pending';
  createdAt: Date;
  updatedAt: Date;
}

export interface Payment {
  id: string;
  orderId: string;
  userId: string;
  amount: number;
  method: 'card' | 'cash' | 'zpoints';
  status: 'pending' | 'completed' | 'failed';
  transactionId?: string;
  createdAt: Date;
}

export interface ZPointsTransaction {
  id: string;
  userId: string;
  amount: number;
  type: 'credit' | 'debit';
  description: string;
  orderId?: string;
  createdAt: Date;
}

export interface DeliveryPartner {
  id: string;
  userId: string;
  isAvailable: boolean;
  currentLocation?: Location;
  rating?: number;
  totalDeliveries: number;
  createdAt: Date;
  updatedAt: Date;
}
