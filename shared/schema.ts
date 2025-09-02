// TypeScript interfaces for MongoDB-based schema
// These are type definitions for the application data models
import { z } from "zod";

// Zod schemas for validation

// Session interface
export interface Session {
  sid: string;
  sess: any;
  expire: Date;
}

// User interface
export interface User {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
  collegeId?: string;
  studentId?: string;
  department?: string;
  hostelAddress?: string;
  phone?: string;
  isAdmin?: boolean;
  isDeliveryPartner?: boolean;
  role?: string;
  createdAt: Date;
  updatedAt: Date;
}

// User credentials interface
export interface UserCredentials {
  id: string;
  userId: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
}

// Category interface
export interface Category {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  isActive?: boolean;
  createdAt: Date;
}

// Product interface
export interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  originalPrice?: number;
  imageUrl?: string;
  categoryId?: string;
  rating?: number;
  reviewCount?: number;
  isAvailable?: boolean;
  isPopular?: boolean;
  deliveryTime?: number;
  createdAt: Date;
  updatedAt: Date;
}

// Cart item interface
export interface CartItem {
  id: string;
  userId?: string;
  productId?: string;
  quantity: number;
  createdAt: Date;
  updatedAt: Date;
}

// Order interface
export interface Order {
  id: string;
  customerId: string;
  assignedTo?: string;
  status: string;
  totalAmount: number;
  deliveryAddress: string;
  deliveryInstructions?: string;
  deliveryLocation?: {
    lat: number;
    lng: number;
    address: string;
  };
  paymentMethod?: string;
  paymentStatus?: string;
  createdAt: Date;
  updatedAt: Date;
  acceptedAt?: Date;
  deliveredAt?: Date;
  notes?: string;
}

// Payment interface
export interface Payment {
  id: string;
  orderId: string;
  amount: number;
  method: string;
  status: string;
  transactionId?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ZPoints transaction interface
export interface ZPointsTransaction {
  id: string;
  userId: string;
  type: 'earn' | 'spend' | 'expire';
  points: number;
  description: string;
  orderId?: string;
  createdAt: Date;
}

// Delivery partner interface
export interface DeliveryPartner {
  id: string;
  userId: string;
  name: string;
  phone: string;
  vehicleType: string;
  vehicleNumber?: string;
  currentLocation?: {
    lat: number;
    lng: number;
    address: string;
  };
  isAvailable: boolean;
  rating: number;
  totalDeliveries: number;
  createdAt: Date;
  updatedAt: Date;
}

// Notification interface
export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  data?: any;
  createdAt: Date;
}

// Chat message interface
export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderType: 'user' | 'partner' | 'system';
  content: string;
  messageType: 'text' | 'image' | 'location' | 'status';
  isRead: boolean;
  createdAt: Date;
}

// Conversation interface
export interface Conversation {
  id: string;
  orderId: string;
  customerId: string;
  partnerId?: string;
  status: 'active' | 'closed';
  createdAt: Date;
  updatedAt: Date;
}

// Zod validation schemas
export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  profileImageUrl: z.string().optional(),
  collegeId: z.string().optional(),
  studentId: z.string().optional(),
  department: z.string().optional(),
  hostelAddress: z.string().optional(),
  phone: z.string().optional(),
  isAdmin: z.boolean().optional(),
  isDeliveryPartner: z.boolean().optional(),
  role: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const ProductSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  price: z.number(),
  originalPrice: z.number().optional(),
  imageUrl: z.string().optional(),
  categoryId: z.string().optional(),
  rating: z.number().optional(),
  reviewCount: z.number().optional(),
  isAvailable: z.boolean().optional(),
  isPopular: z.boolean().optional(),
  deliveryTime: z.number().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const OrderSchema = z.object({
  id: z.string(),
  customerId: z.string(),
  assignedTo: z.string().optional(),
  status: z.string(),
  totalAmount: z.number(),
  deliveryAddress: z.string(),
  deliveryInstructions: z.string().optional(),
  deliveryLocation: z.object({
    lat: z.number(),
    lng: z.number(),
    address: z.string(),
  }).optional(),
  paymentMethod: z.string().optional(),
  paymentStatus: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
  acceptedAt: z.date().optional(),
  deliveredAt: z.date().optional(),
  notes: z.string().optional(),
});

// Export types for use in other files
export type InsertUser = Omit<User, 'id' | 'createdAt' | 'updatedAt'>;
export type InsertProduct = Omit<Product, 'id' | 'createdAt' | 'updatedAt'>;
export type InsertOrder = Omit<Order, 'id' | 'createdAt' | 'updatedAt'>;
export type InsertMessage = Omit<ChatMessage, 'id' | 'createdAt'>;
export type InsertConversation = Omit<Conversation, 'id' | 'createdAt' | 'updatedAt'>;
