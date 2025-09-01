import { db } from './db';

// Simple keyword-based semantic search implementation
// In production, this would use actual embeddings from OpenAI/Google AI
export class SemanticSearchService {
  private productKeywords: Map<string, string[]> = new Map();
  private searchIndex: Map<string, string[]> = new Map();

  constructor() {
    this.buildSearchIndex();
  }

  private buildSearchIndex() {
    // Build keyword mappings for products
    const keywordMappings = [
      { keywords: ['snack', 'chips', 'crisps', 'munch'], category: 'snacks' },
      { keywords: ['beverage', 'drink', 'juice', 'soda', 'water'], category: 'beverages' },
      { keywords: ['stationery', 'pen', 'pencil', 'notebook', 'paper'], category: 'stationery' },
      { keywords: ['food', 'meal', 'lunch', 'dinner', 'breakfast'], category: 'food' },
      { keywords: ['dessert', 'sweet', 'chocolate', 'candy'], category: 'desserts' },
      { keywords: ['health', 'vitamin', 'supplement', 'organic'], category: 'health' },
      { keywords: ['electronics', 'phone', 'charger', 'cable'], category: 'electronics' },
      { keywords: ['clothing', 'shirt', 'dress', 'shoes'], category: 'clothing' },
      { keywords: ['book', 'magazine', 'novel', 'textbook'], category: 'books' },
      { keywords: ['toy', 'game', 'puzzle', 'entertainment'], category: 'toys' }
    ];

    keywordMappings.forEach(mapping => {
      mapping.keywords.forEach(keyword => {
        this.searchIndex.set(keyword.toLowerCase(), [mapping.category]);
      });
    });
  }

  async searchProducts(query: string, limit: number = 10): Promise<any[]> {
    try {
      const queryLower = query.toLowerCase();
      const words = queryLower.split(/\s+/).filter(word => word.length > 2);
      
      // Get all products
      const allProducts = await db.getProducts();
      
      // Score products based on query relevance
      const scoredProducts = allProducts.map((product: any) => {
        let score = 0;
        const productName = product.name.toLowerCase();
        const productDesc = (product.description || '').toLowerCase();
        const productCategory = (product.category?.name || '').toLowerCase();
        
        // Exact name match
        if (productName.includes(queryLower)) score += 10;
        
        // Partial name match
        if (productName.includes(words[0])) score += 5;
        
        // Description match
        if (productDesc.includes(queryLower)) score += 3;
        
        // Category match
        if (productCategory.includes(queryLower)) score += 2;
        
        // Keyword category match
        for (const word of words) {
          const categories = this.searchIndex.get(word) || [];
          if (categories.includes(productCategory)) score += 2;
        }
        
        // Popularity bonus
        if (product.isPopular) score += 1;
        
        return { product, score };
      });
      
      // Sort by score and return top results
      return scoredProducts
        .filter((item: any) => item.score > 0)
        .sort((a: any, b: any) => b.score - a.score)
        .slice(0, limit)
        .map((item: any) => item.product);
        
    } catch (error) {
      console.error('Semantic search error:', error);
      return [];
    }
  }

  async getSearchSuggestions(query: string, limit: number = 5): Promise<string[]> {
    try {
      const queryLower = query.toLowerCase();
      const suggestions = new Set<string>();
      
      // Get all products for suggestions
      const allProducts = await db.getProducts();
      
      // Find products that match the query
      for (const product of allProducts) {
        const productName = product.name.toLowerCase();
        if (productName.includes(queryLower) && suggestions.size < limit) {
          suggestions.add(product.name);
        }
      }
      
      // Add category suggestions
              const categories = Array.from(new Set(allProducts.map((p: any) => p.category?.name).filter(Boolean)));
      for (const category of categories) {
        if ((category as string).toLowerCase().includes(queryLower) && suggestions.size < limit) {
          suggestions.add(`Category: ${category}`);
        }
      }
      
      return Array.from(suggestions).slice(0, limit);
      
    } catch (error) {
      console.error('Search suggestions error:', error);
      return [];
    }
  }
}

export const semanticSearch = new SemanticSearchService();
