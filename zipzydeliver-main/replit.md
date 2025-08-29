# Zipzy - Campus Delivery App

## Overview

Zipzy is a comprehensive campus delivery application designed specifically for colleges and universities. It provides students and staff with a quick and convenient way to order food, stationery, essentials, and other products for delivery directly to their campus location. The application solves the gap in campus-specific delivery services by offering a dedicated platform tailored to the unique needs of college communities.

The system features a full-stack architecture with React frontend, Express.js backend, PostgreSQL database using Drizzle ORM, and integrated authentication through Replit's OpenID Connect system. The platform supports role-based access with both student users and admin functionality for managing products, categories, and orders.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript for type safety and modern development practices
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query (React Query) for server state management and caching
- **UI Components**: Radix UI primitives with custom shadcn/ui components for consistent design
- **Styling**: Tailwind CSS with CSS variables for theming and responsive design
- **Build Tool**: Vite for fast development and optimized production builds

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules for modern JavaScript features
- **API Design**: RESTful API endpoints with structured error handling
- **Session Management**: Express sessions with PostgreSQL store for persistent user sessions
- **Middleware**: Custom logging, authentication, and error handling middleware

### Database Design
- **Database**: PostgreSQL with connection pooling via Neon serverless
- **ORM**: Drizzle ORM for type-safe database operations and schema management
- **Schema**: Well-structured relational design with proper foreign key relationships
- **Tables**: Users, categories, products, cart items, orders, order items, and sessions
- **Migrations**: Drizzle Kit for database schema migrations and version control

### Authentication & Authorization
- **Provider**: Replit OpenID Connect (OIDC) integration
- **Strategy**: Passport.js with custom OIDC strategy
- **Session Storage**: PostgreSQL-backed sessions with connect-pg-simple
- **User Management**: Automatic user creation/update on login with profile synchronization
- **Role-Based Access**: Admin users have elevated permissions for category and product management

### API Structure
- **Authentication Routes**: Login, logout, and user profile endpoints
- **Category Management**: CRUD operations for product categories (admin-only creation)
- **Product Management**: Full product lifecycle with category associations and admin controls
- **Shopping Cart**: Add, update, remove items with user-specific cart persistence
- **Order Processing**: Order creation, item management, and status tracking
- **Order-Specific Messaging**: Temporary chat system that only works during active orders
- **Admin Panel**: Order management and status updates for administrative users

### Temporary Chat System
- **Order-Based Messages**: Messages are tied to specific order IDs, creating temporary communication channels
- **Auto-Close Functionality**: Chat automatically closes when order status becomes 'delivered'
- **API Endpoints**: 
  - `POST /api/messages` - Send messages (blocked if order is delivered)
  - `GET /api/messages/:order_id` - Fetch all messages for an order
- **Security**: Only order participants (customer and delivery partner) can send/view messages
- **Chat History**: Messages remain viewable after delivery for reference, but new messages are blocked

### Data Models
- **Users**: Profile information, college/student IDs, contact details, and admin flags
- **Categories**: Product organization with customizable colors and icons
- **Products**: Detailed product information with pricing, images, and category relationships
- **Cart System**: User-specific cart items with quantity management
- **Orders**: Complete order tracking with items, pricing, delivery details, and status workflow

## External Dependencies

### Database Services
- **Neon Database**: Serverless PostgreSQL hosting with connection pooling
- **WebSocket Support**: Real-time database connections via ws library

### Authentication Services  
- **Replit Authentication**: OpenID Connect provider for user authentication
- **Session Management**: PostgreSQL-based session storage for persistence

### Development Tools
- **Vite**: Build tool with hot module replacement and development server
- **TypeScript**: Static type checking and enhanced developer experience
- **ESBuild**: Fast JavaScript bundler for production builds

### UI & Styling Libraries
- **Radix UI**: Accessible, unstyled UI primitives for complex components
- **Tailwind CSS**: Utility-first CSS framework for rapid styling
- **Lucide React**: Consistent icon library with React components
- **Class Variance Authority**: Type-safe component variant management

### State Management & API
- **TanStack Query**: Server state management with caching, background updates, and error handling
- **React Hook Form**: Form state management with validation
- **Zod**: Runtime type validation and schema parsing

### Additional Integrations
- **Date-fns**: Date manipulation and formatting utilities
- **Memoizee**: Function memoization for performance optimization
- **Nanoid**: Unique ID generation for various entities