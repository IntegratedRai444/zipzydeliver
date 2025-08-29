/**
 * Knowledge Base Service for AI Chatbot
 * Manages app policies, FAQs, and contextual information
 */

export interface KBEntry {
  id: string;
  category: 'policy' | 'faq' | 'feature' | 'general';
  title: string;
  content: string;
  keywords: string[];
  createdAt: Date;
  updatedAt: Date;
}

export class KBService {
  private static instance: KBService;
  private knowledgeBase: Map<string, KBEntry> = new Map();

  static getInstance(): KBService {
    if (!KBService.instance) {
      KBService.instance = new KBService();
    }
    return KBService.instance;
  }

  constructor() {
    this.seedInitialKnowledgeBase();
  }

  /**
   * Add a new knowledge base entry
   */
  addEntry(entry: Omit<KBEntry, 'id' | 'createdAt' | 'updatedAt'>): KBEntry {
    const id = `kb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();
    
    const newEntry: KBEntry = {
      ...entry,
      id,
      createdAt: now,
      updatedAt: now
    };

    this.knowledgeBase.set(id, newEntry);
    return newEntry;
  }

  /**
   * Get entry by ID
   */
  getEntry(id: string): KBEntry | undefined {
    return this.knowledgeBase.get(id);
  }

  /**
   * Search entries by keywords or content
   */
  searchEntries(query: string): KBEntry[] {
    const searchTerm = query.toLowerCase();
    
    return Array.from(this.knowledgeBase.values()).filter(entry => 
      entry.title.toLowerCase().includes(searchTerm) ||
      entry.content.toLowerCase().includes(searchTerm) ||
      entry.keywords.some(keyword => keyword.toLowerCase().includes(searchTerm))
    );
  }

  /**
   * Get entries by category
   */
  getEntriesByCategory(category: KBEntry['category']): KBEntry[] {
    return Array.from(this.knowledgeBase.values())
      .filter(entry => entry.category === category)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  /**
   * Get all entries
   */
  getAllEntries(): KBEntry[] {
    return Array.from(this.knowledgeBase.values())
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  /**
   * Update an existing entry
   */
  updateEntry(id: string, updates: Partial<Omit<KBEntry, 'id' | 'createdAt'>>): KBEntry | undefined {
    const entry = this.knowledgeBase.get(id);
    if (!entry) return undefined;

    const updatedEntry: KBEntry = {
      ...entry,
      ...updates,
      updatedAt: new Date()
    };

    this.knowledgeBase.set(id, updatedEntry);
    return updatedEntry;
  }

  /**
   * Delete an entry
   */
  deleteEntry(id: string): boolean {
    return this.knowledgeBase.delete(id);
  }

  /**
   * Seed initial knowledge base with app policies and FAQs
   */
  private seedInitialKnowledgeBase(): void {
    const initialEntries: Omit<KBEntry, 'id' | 'createdAt' | 'updatedAt'>[] = [
      {
        category: 'policy',
        title: 'Student Delivery Partner Policy',
        content: 'Students can earn money by delivering orders. Maximum 3 deliveries per day to prioritize studies. Students must be verified with college ID and email.',
        keywords: ['student', 'delivery', 'partner', 'policy', 'limit', 'verification']
      },
      {
        category: 'policy',
        title: 'Delivery Fees and Payment',
        content: 'Delivery fees vary by distance. Online payments are processed after delivery confirmation. Cash on delivery (COD) is available for eligible orders.',
        keywords: ['delivery', 'fees', 'payment', 'cod', 'online', 'confirmation']
      },
      {
        category: 'policy',
        title: 'Order Cancellation',
        content: 'Orders can be cancelled within 5 minutes of placement. After that, cancellation is subject to partner acceptance and may incur fees.',
        keywords: ['order', 'cancellation', 'fees', 'time', 'limit']
      },
      {
        category: 'faq',
        title: 'How does partner matching work?',
        content: 'The system finds nearby student partners first. If none available, it expands search radius and includes verified non-student partners. First to accept gets the order.',
        keywords: ['matching', 'partner', 'student', 'radius', 'accept', 'order']
      },
      {
        category: 'faq',
        title: 'What are ZPoints?',
        content: 'ZPoints are reward points earned by delivery partners. First order bonus: +200 points. Points can be redeemed for store discounts and cashback.',
        keywords: ['zpoints', 'rewards', 'bonus', 'discounts', 'cashback', 'partners']
      },
      {
        category: 'faq',
        title: 'How is delivery time calculated?',
        content: 'Delivery time depends on distance, partner availability, and order preparation time. Estimated times are shown when placing orders.',
        keywords: ['delivery', 'time', 'distance', 'availability', 'preparation', 'estimate']
      },
      {
        category: 'feature',
        title: 'Live Order Tracking',
        content: 'Track your order in real-time with live location updates from delivery partners. Get notifications for status changes and estimated arrival.',
        keywords: ['tracking', 'live', 'location', 'notifications', 'status', 'arrival']
      },
      {
        category: 'feature',
        title: 'Partner Communication',
        content: 'Chat directly with your delivery partner for special instructions, delivery preferences, or to coordinate pickup/delivery.',
        keywords: ['communication', 'chat', 'partner', 'instructions', 'coordination']
      },
      {
        category: 'general',
        title: 'Safety and Verification',
        content: 'All delivery partners are verified with government ID or college credentials. Orders are tracked and insured for your safety.',
        keywords: ['safety', 'verification', 'id', 'credentials', 'tracking', 'insurance']
      },
      {
        category: 'feature',
        title: 'Cart - Adding items',
        content: 'When a user taps Add to Cart, the item is added to their session cart and a high-contrast toast confirms the action. If the toast does not appear, refresh the page and try again. The cart icon at the bottom shows a View Cart button to open the cart panel.',
        keywords: ['cart', 'add to cart', 'toast', 'view cart', 'notification']
      },
      {
        category: 'faq',
        title: 'Item not visible in cart',
        content: 'If an item does not appear in the cart, check your network connection and try again. You may be logged out—log in again and retry. Items are stored in the session; switching browsers or devices may show an empty cart.',
        keywords: ['cart', 'missing item', 'session', 'logout', 'login']
      },
      {
        category: 'faq',
        title: 'How to view and edit cart',
        content: 'Use the View Cart button at the bottom to open the cart. In the cart panel you can change quantities or remove items before checkout.',
        keywords: ['view cart', 'edit cart', 'quantity', 'remove', 'checkout']
      },
      {
        category: 'policy',
        title: 'Checkout troubleshooting',
        content: 'If checkout fails, verify internet connectivity and payment method. Try again after a minute. If the error persists, contact support with your order number.',
        keywords: ['checkout', 'payment', 'error', 'support']
      }
    ];

    initialEntries.forEach(entry => this.addEntry(entry));
  }
}

export const kbService = KBService.getInstance();

// Add the missing method that was referenced
export async function seedKbIfEmpty(): Promise<void> {
  // This method is kept for backward compatibility
  console.log('KB seeding completed');
}

// Export the searchKb function that aiChatbot.ts is trying to import
export function searchKb(query: string) {
  return kbService.searchEntries(query);
}
