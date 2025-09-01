# 🚀 ZipzyDeliver Backend API Routes

## 📋 Complete Route Summary

### 🔐 Authentication Routes
- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile

### 👥 User Management Routes
- `GET /api/users` - Get all users (admin only)
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user (admin only)

### 🛍️ Product Routes
- `GET /api/products` - Get all products
- `GET /api/products/:id` - Get product by ID
- `POST /api/products` - Create product (admin only)
- `PUT /api/products/:id` - Update product (admin only)
- `DELETE /api/products/:id` - Delete product (admin only)
- `GET /api/products/popular` - Get popular products
- `GET /api/products/search` - Search products

### 📦 Order Routes
- `GET /api/orders` - Get user orders
- `GET /api/orders/:id` - Get order by ID
- `POST /api/orders` - Create new order
- `PUT /api/orders/:id` - Update order status
- `DELETE /api/orders/:id` - Cancel order
- `GET /api/orders/track/:id` - Track order

### 🛒 Cart Routes
- `GET /api/cart` - Get user cart
- `POST /api/cart/add` - Add item to cart
- `PUT /api/cart/update` - Update cart item
- `DELETE /api/cart/remove/:id` - Remove item from cart
- `DELETE /api/cart/clear` - Clear cart

### 🏷️ Category Routes
- `GET /api/categories` - Get all categories
- `GET /api/categories/:id` - Get category by ID
- `POST /api/categories` - Create category (admin only)
- `PUT /api/categories/:id` - Update category (admin only)
- `DELETE /api/categories/:id` - Delete category (admin only)

### 🔔 Notification Routes
- `GET /api/notifications` - Get user notifications
- `PUT /api/notifications/:id/read` - Mark notification as read
- `DELETE /api/notifications/:id` - Delete notification

### 🧪 Test Routes (Development Only)
- `GET /api/test/user-info` - Get test user information
- `POST /api/test/user-bypass` - Bypass login for test user
- `POST /api/test/admin-bypass` - Bypass login for test admin

### 🤖 AI Routes (Protected)
- `POST /api/ai/demand/daily` - Daily demand prediction
- `POST /api/ai/demand/hourly` - Hourly demand prediction
- `POST /api/ai/demand/weather-impact` - Weather impact analysis
- `POST /api/ai/route/optimize` - Route optimization
- `POST /api/ai/route/partner-assignment` - Partner assignment optimization
- `POST /api/ai/nlp/analyze-feedback` - Customer feedback analysis
- `POST /api/ai/nlp/generate-response` - Generate smart responses
- `POST /api/ai/analytics/daily-report` - Generate daily reports
- `POST /api/ai/analytics/customer-segments` - Customer segmentation
- `POST /api/ai/recommend/products` - Product recommendations

### 💬 AI Chatbot Routes (Protected)
- `POST /api/chatbot/query` - Process chatbot messages

### 🔍 Semantic Search Routes (Protected)
- `POST /api/search/semantic` - Semantic search functionality

### 💰 Budget Planner Routes (Protected)
- `POST /api/budget/plan` - Create budget plans

### 🛣️ Route Optimization Routes (Protected)
- `POST /api/route/optimize-delivery` - Optimize delivery routes

### 🎤 Voice AI Routes (Protected)
- `POST /api/voice/process` - Process voice commands

### 📊 Demand Prediction Routes (Protected)
- `POST /api/demand/predict` - Predict demand patterns

### 🚚 Dispatch Service Routes (Protected)
- `POST /api/dispatch/assign` - Assign orders to delivery partners

### 📏 Distance Calculation Routes (Protected)
- `POST /api/distance/calculate` - Calculate distances between locations

### 🔌 WebSocket Routes
- `GET /api/ws` - WebSocket connection endpoint

### 🏥 Health Check Routes
- `GET /api/health` - Server health check

## 🔒 Authentication Requirements

### Public Routes (No Auth Required)
- `POST /api/auth/signup`
- `POST /api/auth/login`
- `GET /api/health`
- `GET /api/products` (read-only)
- `GET /api/categories` (read-only)

### Protected Routes (Auth Required)
- All user management routes
- All order management routes
- All cart operations
- All AI/ML routes
- All admin routes

### Admin Only Routes
- User deletion
- Product creation/update/deletion
- Category management
- System analytics

## 🛡️ Security Features

- **Session-based authentication**
- **Rate limiting** on all routes
- **Input validation** and sanitization
- **CORS protection**
- **Helmet security headers**
- **SQL injection protection**
- **XSS protection**

## 📝 Usage Examples

### Authentication
```bash
# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}'

# Get profile (requires session)
curl -X GET http://localhost:5000/api/auth/profile \
  -H "Cookie: connect.sid=YOUR_SESSION_ID"
```

### AI Services
```bash
# Demand prediction
curl -X POST http://localhost:5000/api/ai/demand/daily \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=YOUR_SESSION_ID" \
  -d '{"historicalData":[...],"factors":[...]}'

# Route optimization
curl -X POST http://localhost:5000/api/route/optimize-delivery \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=YOUR_SESSION_ID" \
  -d '{"locations":[...],"constraints":{...}}'
```

## 🚀 Development Notes

- All routes are prefixed with `/api`
- Session cookies are used for authentication
- Error responses follow standard HTTP status codes
- All responses include a `success` boolean field
- Protected routes return 401 if not authenticated
- Admin routes return 403 if user is not admin

## 📊 Response Format

### Success Response
```json
{
  "success": true,
  "data": {...},
  "message": "Operation successful"
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

---

**Total Routes: 50+ endpoints**
**Status: ✅ All routes properly configured and secured**
