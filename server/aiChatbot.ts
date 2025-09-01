import { GoogleGenerativeAI } from "@google/generative-ai";
// Storage will be accessed via req.app.locals.storage
import { searchKb } from "./kb";
import type { InsertMessage, InsertConversation, Order, Product, Category } from "@shared/schema";

// Check for API key but don't throw immediately
const hasApiKey = !!process.env.GEMINI_API_KEY;

export class AIChatbotService {
  private client: GoogleGenerativeAI | null = null;

  constructor() {
    if (hasApiKey) {
      this.client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    }
  }

  private async getContextualData(userId: string) {
    // Get user's recent orders, cart items, and other relevant context
    // Note: This would need to be passed storage instance in production
    const [user, orders, cartItems, categories, products] = await Promise.all([
      Promise.resolve(null), // storage.getUser(userId),
      Promise.resolve([]), // storage.getOrders(userId),
      Promise.resolve([]), // storage.getCartItems(userId),
      Promise.resolve([]), // storage.getCategories(),
      Promise.resolve([]) // storage.getProducts()
    ]);

    return {
      user,
      orders: orders.slice(0, 5), // Latest 5 orders
      cartItems,
      categories,
      popularProducts: products.filter((p: any) => p.isPopular).slice(0, 10)
    };
  }

  private buildSystemPrompt(context: any, kbSnippets: string[]): string {
    const { user, orders, cartItems, categories, popularProducts } = context;
    
    return `You are Zipzy AI, a helpful customer support assistant for Zipzy - a campus delivery app for college students.

ABOUT ZIPZY:
- Campus delivery service for students
- Delivers food, groceries, stationery, and medicines
- 15-30 minute delivery times within campus
- Available categories: ${categories.map((c: Category) => c.name).join(', ')}

USER CONTEXT:
- Name: ${user?.firstName || 'Student'}
- Recent orders: ${orders.length}
- Current cart items: ${cartItems.length}

POPULAR PRODUCTS:
${popularProducts.map((p: Product) => `- ${p.name}: ₹${p.price}`).join('\n')}

RECENT ORDERS:
${orders.map((o: any) => `- Order #${o.id}: ${o.status} (₹${o.totalAmount})`).join('\n') || 'No recent orders'}

KNOWLEDGE BASE SNIPPETS (use as authoritative):
${kbSnippets.join('\n\n') || 'No KB available.'}

YOUR ROLE:
1. Help with product recommendations
2. Assist with order issues and tracking
3. Explain campus delivery policies
4. Answer questions about products and categories
5. Help with cart and checkout questions
6. Provide estimated delivery times
7. Handle complaints and feedback

GUIDELINES:
- Be friendly, helpful, and student-focused
- Use simple language appropriate for college students
- Suggest products from available categories
- Provide accurate delivery time estimates (15-30 minutes)
- If you can't help with something technical, suggest contacting human support
- Always be encouraging and positive
- Use emojis appropriately to be more engaging

DELIVERY POLICIES:
- Free delivery on orders above ₹199
- ₹20 delivery fee for orders below ₹199
- Campus-wide delivery available
- Payment options: UPI, Cards, Net Banking, Cash on Delivery
- Order tracking available once placed

Respond naturally and helpfully to user queries. Keep responses concise but informative.`;
  }

  async generateResponse(
    userId: string, 
    message: string, 
    conversationId: string
  ): Promise<string> {
    try {
      // Get contextual data
      const context = await this.getContextualData(userId);
      
      // Build system prompt with context
      // Pull relevant KB docs
      const kbDocs = await searchKb(message);
      const kbSnippets = kbDocs.map((d: any) => `Title: ${d.title}\n${d.content}`);
      const systemPrompt = this.buildSystemPrompt(context, kbSnippets);
      
      // Build full prompt with user message
      const fullPrompt = `${systemPrompt}

USER MESSAGE: ${message}

Respond as Zipzy AI assistant:`;

      // Check if AI client is available
      if (!this.client) {
        return "I'm sorry, AI chatbot functionality is not available at the moment. Please contact our support team for assistance.";
      }

      // Generate AI response
      const model = this.client.getGenerativeModel({ model: "gemini-pro" });
      const response = await model.generateContent(fullPrompt);
      
      const responseText = response.response?.text() || "I'm sorry, I couldn't process that request. Please try again or contact our support team.";
      
      return responseText;
    } catch (error) {
      console.error('AI Chatbot error:', error);
      
      // Fallback response with context
      try {
        const context = await this.getContextualData(userId);
        const latestUpdate = context.orders[0];
        
        let response = "I'm having trouble processing your request right now. Here's what I can tell you about your account:\n\n";
        
        // if (latestUpdate && latestUpdate.createdAt) {
        //   response += `⏰ Updated: ${new Date(latestUpdate.createdAt).toLocaleString()}\n`;
        // }
        
        response += `📦 Recent orders: ${context.orders.length}\n`;
        response += `🛒 Cart items: ${context.cartItems.length}\n`;
        response += `🏪 Available categories: ${context.categories.map((c: Category) => c.name).join(', ')}\n\n`;
        response += "Please try again in a moment or contact our support team for immediate assistance.";
        
        return response;
      } catch (fallbackError) {
        return "I'm experiencing technical difficulties. Please contact our support team for assistance.";
      }
    }
  }

  async handleOrderTracking(orderId: string, userId: string): Promise<string> {
    try {
      // const order = await storage.getOrder(orderId);
      // 
      // if (!order || order.userId !== userId) {
      //   return "I couldn't find that order. Please check your order number and try again.";
      // }
      // 
      // const tracking = await storage.getOrderTracking(orderId);
      // const latestUpdate = tracking[tracking.length - 1];
      // 
      // let response = `📦 **Order #${order.orderNumber}** Status: ${order.status.toUpperCase()}\n`;
      // response += `💰 Total: ₹${order.totalAmount}\n`;
      // response += `📍 Delivery Address: ${order.deliveryAddress}\n`;
      return "Order tracking is currently unavailable. Please check your order status in the app.";
    } catch (error) {
      console.error('Order tracking error:', error);
      return "I'm having trouble accessing your order information. Please try again or contact support.";
    }
  }

  async suggestProducts(query: string, categories: Category[], products: Product[]): Promise<string> {
    const relevantProducts = products.filter(p => 
      p.name.toLowerCase().includes(query.toLowerCase()) ||
      p.description?.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 5);

    if (relevantProducts.length === 0) {
      return `I couldn't find specific products matching "${query}". Here are some popular items you might like:\n\n` +
        products.filter(p => p.isPopular).slice(0, 3)
          .map(p => `🌟 **${p.name}** - ₹${p.price}\n   ${p.description}`)
          .join('\n\n');
    }

    return `Here are some great options for "${query}":\n\n` +
      relevantProducts
        .map(p => `${p.isPopular ? '🌟' : '📦'} **${p.name}** - ₹${p.price}${p.originalPrice ? ` (was ₹${p.originalPrice})` : ''}\n   ${p.description}\n   ⭐ ${p.rating}/5 (${p.reviewCount} reviews)`)
        .join('\n\n');
  }
}

export const aiChatbot = new AIChatbotService();