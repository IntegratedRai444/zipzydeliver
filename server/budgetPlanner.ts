import { db } from './db';

export interface BudgetConstraint {
  maxAmount: number;
  preferredCategories?: string[];
  excludeCategories?: string[];
  mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night';
}

export interface BudgetPlan {
  planId: string;
  userId: string;
  budget: BudgetConstraint;
  suggestedItems: Array<{
    product: any;
    quantity: number;
    totalCost: number;
    reason: string;
  }>;
  totalCost: number;
  remainingBudget: number;
  savings: number;
  estimatedCalories?: number;
  estimatedNutrition?: {
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
  };
}

export class BudgetPlannerService {
  constructor() {}

  // Generate budget plan based on constraints
  async generateBudgetPlan(
    userId: string,
    budget: BudgetConstraint
  ): Promise<BudgetPlan> {
    try {
      const allProducts = await db.getProducts();
      
      // Filter products based on constraints
      let eligibleProducts = allProducts.filter((product: any) => {
        // Price filter
        if (product.price > budget.maxAmount) return false;
        
        // Category exclusions
        if (budget.excludeCategories && product.category?.name) {
          if (budget.excludeCategories.includes(product.category.name.toLowerCase())) {
            return false;
          }
        }
        
        // Category preferences
        if (budget.preferredCategories && product.category?.name) {
          if (!budget.preferredCategories.includes(product.category.name.toLowerCase())) {
            return false;
          }
        }
        
        return true;
      });

      // Sort by value for money (price vs popularity/rating)
      eligibleProducts.sort((a: any, b: any) => {
        const aValue = (a.isPopular ? 1.5 : 1) * (a.rating || 3) / a.price;
        const bValue = (b.isPopular ? 1.5 : 1) * (b.rating || 3) / b.price;
        return bValue - aValue;
      });

      // Build budget plan
      const suggestedItems: BudgetPlan['suggestedItems'] = [];
      let totalCost = 0;
      let remainingBudget = budget.maxAmount;

      for (const product of eligibleProducts) {
        if (totalCost >= budget.maxAmount) break;
        
        // Calculate optimal quantity
        const maxQuantity = Math.floor(remainingBudget / product.price);
        if (maxQuantity <= 0) continue;
        
        // Limit quantity based on product type
        let optimalQuantity = Math.min(maxQuantity, this.getOptimalQuantity(product, budget));
        
        if (optimalQuantity > 0) {
          const itemCost = product.price * optimalQuantity;
          if (totalCost + itemCost <= budget.maxAmount) {
            suggestedItems.push({
              product,
              quantity: optimalQuantity,
              totalCost: itemCost,
              reason: this.generateReason(product, budget)
            });
            
            totalCost += itemCost;
            remainingBudget -= itemCost;
          }
        }
      }

      // Calculate savings
      const savings = Math.max(0, budget.maxAmount - totalCost);

      // Generate plan ID
      const planId = `plan_${userId}_${Date.now()}`;

      return {
        planId,
        userId,
        budget,
        suggestedItems,
        totalCost,
        remainingBudget,
        savings,
        estimatedCalories: this.estimateCalories(suggestedItems),
        estimatedNutrition: this.estimateNutrition(suggestedItems)
      };

    } catch (error) {
      console.error('Budget plan generation error:', error);
      throw error;
    }
  }

  // Get optimal quantity based on product type and meal context
  private getOptimalQuantity(product: any, budget: BudgetConstraint): number {
    const productName = product.name.toLowerCase();
    const category = product.category?.name?.toLowerCase() || '';
    
    // Meal-based quantity logic
    if (budget.mealType === 'breakfast') {
      if (category.includes('beverage')) return 1;
      if (category.includes('snack') || category.includes('food')) return 1;
    }
    
    if (budget.mealType === 'lunch' || budget.mealType === 'dinner') {
      if (category.includes('food')) return 1;
      if (category.includes('beverage')) return 1;
      if (category.includes('snack')) return 2;
    }
    
    if (budget.mealType === 'snack') {
      if (category.includes('snack')) return 2;
      if (category.includes('beverage')) return 1;
      if (category.includes('food')) return 1;
    }

    // Default quantities based on category
    if (category.includes('beverage')) return 1;
    if (category.includes('snack')) return 2;
    if (category.includes('food')) return 1;
    if (category.includes('stationery')) return 1;
    
    return 1;
  }

  // Generate reason for suggesting an item
  private generateReason(product: any, budget: BudgetConstraint): string {
    const reasons = [];
    
    if (product.isPopular) {
      reasons.push('Popular choice');
    }
    
    if (product.rating && product.rating >= 4) {
      reasons.push('Highly rated');
    }
    
    if (budget.preferredCategories && product.category?.name) {
      if (budget.preferredCategories.includes(product.category.name.toLowerCase())) {
        reasons.push('Matches your preferences');
      }
    }
    
    if (budget.mealType && product.category?.name) {
      if (budget.mealType === 'breakfast' && product.category.name.toLowerCase().includes('breakfast')) {
        reasons.push('Perfect for breakfast');
      } else if (budget.mealType === 'lunch' && product.category.name.toLowerCase().includes('lunch')) {
        reasons.push('Great lunch option');
      } else if (budget.mealType === 'dinner' && product.category.name.toLowerCase().includes('dinner')) {
        reasons.push('Ideal for dinner');
      }
    }
    
    if (reasons.length === 0) {
      reasons.push('Good value for money');
    }
    
    return reasons.join(', ');
  }

  // Estimate total calories for the plan
  private estimateCalories(items: BudgetPlan['suggestedItems']): number {
    let totalCalories = 0;
    
    for (const item of items) {
      // Mock calorie estimation based on product category
      const category = item.product.category?.name?.toLowerCase() || '';
      let caloriesPerUnit = 0;
      
      if (category.includes('snack')) caloriesPerUnit = 150;
      else if (category.includes('beverage')) caloriesPerUnit = 120;
      else if (category.includes('food')) caloriesPerUnit = 300;
      else if (category.includes('dessert')) caloriesPerUnit = 200;
      else caloriesPerUnit = 100;
      
      totalCalories += caloriesPerUnit * item.quantity;
    }
    
    return totalCalories;
  }

  // Estimate nutrition values
  private estimateNutrition(items: BudgetPlan['suggestedItems']): BudgetPlan['estimatedNutrition'] {
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFat = 0;
    let totalFiber = 0;
    
    for (const item of items) {
      const category = item.product.category?.name?.toLowerCase() || '';
      let nutrition = { protein: 0, carbs: 0, fat: 0, fiber: 0 };
      
      // Mock nutrition values based on category
      if (category.includes('snack')) {
        nutrition = { protein: 3, carbs: 15, fat: 8, fiber: 1 };
      } else if (category.includes('beverage')) {
        nutrition = { protein: 1, carbs: 25, fat: 0, fiber: 0 };
      } else if (category.includes('food')) {
        nutrition = { protein: 15, carbs: 45, fat: 12, fiber: 3 };
      } else if (category.includes('dessert')) {
        nutrition = { protein: 2, carbs: 30, fat: 10, fiber: 1 };
      }
      
      totalProtein += nutrition.protein * item.quantity;
      totalCarbs += nutrition.carbs * item.quantity;
      totalFat += nutrition.fat * item.quantity;
      totalFiber += nutrition.fiber * item.quantity;
    }
    
    return {
      protein: Math.round(totalProtein),
      carbs: Math.round(totalCarbs),
      fat: Math.round(totalFat),
      fiber: Math.round(totalFiber)
    };
  }

  // Get budget-friendly alternatives for a specific product
  async getBudgetAlternatives(
    productId: string,
    maxPrice: number
  ): Promise<any[]> {
    try {
      const targetProduct = await db.getProduct(productId);
      if (!targetProduct) return [];
      
      const allProducts = await db.getProducts();
      const category = targetProduct.category?.name;
      
      // Find alternatives in same category with lower price
      const alternatives = allProducts
                .filter((p: any) =>
          p.id !== productId && 
          p.price <= maxPrice &&
          p.category?.name === category
        )
        .sort((a: any, b: any) => a.price - b.price)
        .slice(0, 5);
      
      return alternatives;
      
    } catch (error) {
      console.error('Budget alternatives error:', error);
      return [];
    }
  }

  // Analyze spending patterns and suggest budget optimization
  async analyzeSpendingPatterns(userId: string): Promise<{
    totalSpent: number;
    averageOrderValue: number;
    topCategories: Array<{ category: string; amount: number; percentage: number }>;
    budgetRecommendations: string[];
  }> {
    try {
      const userOrders = await db.getOrders(userId);
      let totalSpent = 0;
      const categorySpending = new Map<string, number>();
      
      // Calculate spending by category
      for (const order of userOrders) {
        const orderDetails = await db.getOrder(order.id);
        const items = (orderDetails?.items as any[]) || [];
        
        for (const item of items) {
          const product = await db.getProduct(item.productId);
          if (product) {
            const category = product.category?.name || 'Uncategorized';
            const amount = (product.price * item.quantity) || 0;
            
            categorySpending.set(category, (categorySpending.get(category) || 0) + amount);
            totalSpent += amount;
          }
        }
      }
      
      // Calculate top categories
      const topCategories = Array.from(categorySpending.entries())
        .map(([category, amount]) => ({
          category,
          amount,
          percentage: Math.round((amount / totalSpent) * 100)
        }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5);
      
      // Generate budget recommendations
      const recommendations = this.generateBudgetRecommendations(topCategories, totalSpent);
      
      return {
        totalSpent,
        averageOrderValue: userOrders.length > 0 ? totalSpent / userOrders.length : 0,
        topCategories,
        budgetRecommendations: recommendations
      };
      
    } catch (error) {
      console.error('Spending analysis error:', error);
      return {
        totalSpent: 0,
        averageOrderValue: 0,
        topCategories: [],
        budgetRecommendations: []
      };
    }
  }

  // Generate personalized budget recommendations
  private generateBudgetRecommendations(
    topCategories: Array<{ category: string; amount: number; percentage: number }>,
    totalSpent: number
  ): string[] {
    const recommendations = [];
    
    // High spending category recommendations
    const highSpendingCategory = topCategories.find(cat => cat.percentage > 40);
    if (highSpendingCategory) {
      recommendations.push(
        `Consider reducing spending on ${highSpendingCategory.category} (${highSpendingCategory.percentage}% of total)`
      );
    }
    
    // General recommendations
    if (totalSpent > 1000) {
      recommendations.push('Your total spending is high. Consider setting a weekly budget limit.');
    }
    
    if (topCategories.length > 0) {
      const topCategory = topCategories[0];
      recommendations.push(
        `Try exploring alternatives in ${topCategory.category} to find better deals`
      );
    }
    
    recommendations.push('Use our budget planner to optimize your orders');
    recommendations.push('Consider bulk ordering for frequently purchased items');
    
    return recommendations;
  }
}

export const budgetPlanner = new BudgetPlannerService();
