import { EventEmitter } from 'events';

export interface InventoryItem {
  productId: string;
  availableStock: number;
  reservedStock: number;
  lowStockThreshold: number;
  outOfStockThreshold: number;
  lastRestocked: Date;
  lastSold: Date;
  totalSold: number;
  unitCost: number;
  supplier?: string;
  expiryDate?: Date;
  batchNumber?: string;
}

export interface StockMovement {
  id: string;
  productId: string;
  type: 'restock' | 'sale' | 'adjustment' | 'reservation' | 'release_reservation' | 'expired' | 'damaged';
  quantity: number;
  reason: string;
  orderId?: string;
  userId?: string;
  timestamp: Date;
  batchNumber?: string;
  cost?: number;
}

export interface StockAlert {
  productId: string;
  productName: string;
  alertType: 'low_stock' | 'out_of_stock' | 'expiring_soon' | 'overstocked';
  currentStock: number;
  threshold: number;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  createdAt: Date;
}

export interface InventoryReport {
  totalProducts: number;
  totalValue: number;
  lowStockItems: number;
  outOfStockItems: number;
  totalMovements: number;
  topSellingProducts: Array<{
    productId: string;
    name: string;
    totalSold: number;
    revenue: number;
  }>;
  stockAlerts: StockAlert[];
  lastUpdated: Date;
}

export class InventoryService extends EventEmitter {
  private inventory: Map<string, InventoryItem> = new Map();
  private stockMovements: StockMovement[] = [];
  private stockAlerts: Map<string, StockAlert> = new Map();
  private storage: any;

  constructor(storage: any) {
    super();
    this.storage = storage;
    this.startPeriodicChecks();
  }

  /**
   * Set storage instance
   */
  setStorage(storage: any): void {
    this.storage = storage;
    console.log('📦 Inventory service storage updated');
  }

  /**
   * Initialize inventory for a product
   */
  async initializeProduct(
    productId: string,
    initialStock: number = 0,
    lowStockThreshold: number = 10,
    unitCost: number = 0
  ): Promise<void> {
    try {
      const inventoryItem: InventoryItem = {
        productId,
        availableStock: initialStock,
        reservedStock: 0,
        lowStockThreshold,
        outOfStockThreshold: 0,
        lastRestocked: new Date(),
        lastSold: new Date(),
        totalSold: 0,
        unitCost
      };

      this.inventory.set(productId, inventoryItem);

      // Record initial stock movement
      if (initialStock > 0) {
        await this.recordStockMovement({
          productId,
          type: 'restock',
          quantity: initialStock,
          reason: 'Initial stock setup',
          cost: unitCost * initialStock
        });
      }

      console.log(`📦 Initialized inventory for product ${productId} with ${initialStock} units`);

    } catch (error) {
      console.error(`❌ Failed to initialize product ${productId}:`, error);
      throw error;
    }
  }

  /**
   * Check product availability
   */
  checkAvailability(productId: string, requestedQuantity: number = 1): boolean {
    const item = this.inventory.get(productId);
    if (!item) return false;
    
    return item.availableStock >= requestedQuantity;
  }

  /**
   * Reserve stock for an order
   */
  async reserveStock(productId: string, quantity: number, orderId?: string): Promise<boolean> {
    try {
      const item = this.inventory.get(productId);
      if (!item) {
        console.warn(`❌ Product ${productId} not found in inventory`);
        return false;
      }

      if (item.availableStock < quantity) {
        console.warn(`❌ Insufficient stock for product ${productId}. Available: ${item.availableStock}, Requested: ${quantity}`);
        return false;
      }

      // Move stock from available to reserved
      item.availableStock -= quantity;
      item.reservedStock += quantity;

      // Record stock movement
      await this.recordStockMovement({
        productId,
        type: 'reservation',
        quantity,
        reason: orderId ? `Reserved for order ${orderId}` : 'Stock reservation',
        orderId
      });

      console.log(`✅ Reserved ${quantity} units of product ${productId}${orderId ? ` for order ${orderId}` : ''}`);

      // Check for low stock alerts
      await this.checkStockLevels(productId);

      this.emit('stockReserved', { productId, quantity, orderId });
      return true;

    } catch (error) {
      console.error(`❌ Failed to reserve stock for product ${productId}:`, error);
      return false;
    }
  }

  /**
   * Release reserved stock (e.g., when order is cancelled)
   */
  async releaseReservation(productId: string, quantity: number, orderId?: string): Promise<boolean> {
    try {
      const item = this.inventory.get(productId);
      if (!item) return false;

      if (item.reservedStock < quantity) {
        console.warn(`❌ Cannot release more than reserved. Reserved: ${item.reservedStock}, Requested: ${quantity}`);
        return false;
      }

      // Move stock from reserved back to available
      item.reservedStock -= quantity;
      item.availableStock += quantity;

      // Record stock movement
      await this.recordStockMovement({
        productId,
        type: 'release_reservation',
        quantity,
        reason: orderId ? `Released reservation for cancelled order ${orderId}` : 'Reservation released',
        orderId
      });

      console.log(`✅ Released ${quantity} units of reserved stock for product ${productId}`);

      this.emit('reservationReleased', { productId, quantity, orderId });
      return true;

    } catch (error) {
      console.error(`❌ Failed to release reservation for product ${productId}:`, error);
      return false;
    }
  }

  /**
   * Confirm sale (move from reserved to sold)
   */
  async confirmSale(productId: string, quantity: number, orderId?: string): Promise<boolean> {
    try {
      const item = this.inventory.get(productId);
      if (!item) return false;

      if (item.reservedStock < quantity) {
        console.warn(`❌ Cannot confirm sale for more than reserved. Reserved: ${item.reservedStock}, Requested: ${quantity}`);
        return false;
      }

      // Remove from reserved stock (it's now sold)
      item.reservedStock -= quantity;
      item.totalSold += quantity;
      item.lastSold = new Date();

      // Get product info for revenue calculation
      const product = await this.storage?.getProductById?.(productId);
      const revenue = product ? parseFloat(product.price) * quantity : 0;

      // Record stock movement
      await this.recordStockMovement({
        productId,
        type: 'sale',
        quantity,
        reason: orderId ? `Sale confirmed for order ${orderId}` : 'Product sale',
        orderId
      });

      console.log(`✅ Confirmed sale of ${quantity} units for product ${productId}`);

      this.emit('saleConfirmed', { 
        productId, 
        quantity, 
        orderId, 
        revenue,
        totalSold: item.totalSold 
      });

      return true;

    } catch (error) {
      console.error(`❌ Failed to confirm sale for product ${productId}:`, error);
      return false;
    }
  }

  /**
   * Restock product
   */
  async restockProduct(
    productId: string,
    quantity: number,
    unitCost?: number,
    batchNumber?: string,
    expiryDate?: Date
  ): Promise<boolean> {
    try {
      let item = this.inventory.get(productId);
      
      if (!item) {
        // Initialize if product doesn't exist
        await this.initializeProduct(productId, 0, 10, unitCost || 0);
        item = this.inventory.get(productId)!;
      }

      // Add to available stock
      item.availableStock += quantity;
      item.lastRestocked = new Date();
      
      if (unitCost !== undefined) {
        item.unitCost = unitCost;
      }
      
      if (expiryDate) {
        item.expiryDate = expiryDate;
      }
      
      if (batchNumber) {
        item.batchNumber = batchNumber;
      }

      // Record stock movement
      await this.recordStockMovement({
        productId,
        type: 'restock',
        quantity,
        reason: `Product restocked${batchNumber ? ` (Batch: ${batchNumber})` : ''}`,
        cost: unitCost ? unitCost * quantity : undefined,
        batchNumber
      });

      console.log(`✅ Restocked ${quantity} units of product ${productId}`);

      // Remove any out-of-stock alerts
      const alertKey = `${productId}-out_of_stock`;
      if (this.stockAlerts.has(alertKey)) {
        this.stockAlerts.delete(alertKey);
        this.emit('alertResolved', { productId, alertType: 'out_of_stock' });
      }

      this.emit('productRestocked', { 
        productId, 
        quantity, 
        newStock: item.availableStock,
        batchNumber,
        expiryDate
      });

      return true;

    } catch (error) {
      console.error(`❌ Failed to restock product ${productId}:`, error);
      return false;
    }
  }

  /**
   * Adjust stock (for corrections, damaged goods, etc.)
   */
  async adjustStock(
    productId: string,
    quantity: number,
    reason: string,
    type: 'adjustment' | 'damaged' | 'expired' = 'adjustment'
  ): Promise<boolean> {
    try {
      const item = this.inventory.get(productId);
      if (!item) return false;

      const oldStock = item.availableStock;
      item.availableStock = Math.max(0, item.availableStock + quantity);

      // Record stock movement
      await this.recordStockMovement({
        productId,
        type,
        quantity: Math.abs(quantity),
        reason: `${reason} (${quantity > 0 ? 'increase' : 'decrease'})`
      });

      console.log(`✅ Adjusted stock for product ${productId}: ${oldStock} → ${item.availableStock} (${quantity > 0 ? '+' : ''}${quantity})`);

      // Check for stock level alerts
      await this.checkStockLevels(productId);

      this.emit('stockAdjusted', { 
        productId, 
        oldStock, 
        newStock: item.availableStock, 
        adjustment: quantity,
        reason,
        type
      });

      return true;

    } catch (error) {
      console.error(`❌ Failed to adjust stock for product ${productId}:`, error);
      return false;
    }
  }

  /**
   * Get current stock for a product
   */
  getStock(productId: string): InventoryItem | null {
    return this.inventory.get(productId) || null;
  }

  /**
   * Get low stock items
   */
  getLowStockItems(): Array<{ productId: string; item: InventoryItem }> {
    const lowStockItems: Array<{ productId: string; item: InventoryItem }> = [];
    
    for (const [productId, item] of Array.from(this.inventory.entries())) {
      if (item.availableStock <= item.lowStockThreshold && item.availableStock > item.outOfStockThreshold) {
        lowStockItems.push({ productId, item });
      }
    }
    
    return lowStockItems;
  }

  /**
   * Get out of stock items
   */
  getOutOfStockItems(): Array<{ productId: string; item: InventoryItem }> {
    const outOfStockItems: Array<{ productId: string; item: InventoryItem }> = [];
    
    for (const [productId, item] of Array.from(this.inventory.entries())) {
      if (item.availableStock <= item.outOfStockThreshold) {
        outOfStockItems.push({ productId, item });
      }
    }
    
    return outOfStockItems;
  }

  /**
   * Get stock alerts
   */
  getStockAlerts(): StockAlert[] {
    return Array.from(this.stockAlerts.values());
  }

  /**
   * Check stock levels and generate alerts
   */
  private async checkStockLevels(productId: string): Promise<void> {
    const item = this.inventory.get(productId);
    if (!item) return;

    const product = await this.storage?.getProductById?.(productId);
    const productName = product?.name || `Product ${productId}`;

    // Remove existing alerts for this product
    const existingAlerts = Array.from(this.stockAlerts.keys())
      .filter(key => key.startsWith(`${productId}-`));
    existingAlerts.forEach(key => this.stockAlerts.delete(key));

    // Check for out of stock
    if (item.availableStock <= item.outOfStockThreshold) {
      const alert: StockAlert = {
        productId,
        productName,
        alertType: 'out_of_stock',
        currentStock: item.availableStock,
        threshold: item.outOfStockThreshold,
        message: `${productName} is out of stock (${item.availableStock} remaining)`,
        severity: 'critical',
        createdAt: new Date()
      };
      
      this.stockAlerts.set(`${productId}-out_of_stock`, alert);
      this.emit('stockAlert', alert);
    }
    // Check for low stock
    else if (item.availableStock <= item.lowStockThreshold) {
      const alert: StockAlert = {
        productId,
        productName,
        alertType: 'low_stock',
        currentStock: item.availableStock,
        threshold: item.lowStockThreshold,
        message: `${productName} is running low (${item.availableStock} remaining)`,
        severity: 'high',
        createdAt: new Date()
      };
      
      this.stockAlerts.set(`${productId}-low_stock`, alert);
      this.emit('stockAlert', alert);
    }

    // Check for expiring products
    if (item.expiryDate) {
      const daysUntilExpiry = Math.ceil((item.expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      
      if (daysUntilExpiry <= 7 && daysUntilExpiry > 0) {
        const alert: StockAlert = {
          productId,
          productName,
          alertType: 'expiring_soon',
          currentStock: item.availableStock,
          threshold: 7,
          message: `${productName} expires in ${daysUntilExpiry} days`,
          severity: 'medium',
          createdAt: new Date()
        };
        
        this.stockAlerts.set(`${productId}-expiring_soon`, alert);
        this.emit('stockAlert', alert);
      }
    }
  }

  /**
   * Record stock movement
   */
  private async recordStockMovement(movement: Omit<StockMovement, 'id' | 'timestamp'>): Promise<void> {
    const stockMovement: StockMovement = {
      ...movement,
      id: `mov_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date()
    };

    this.stockMovements.push(stockMovement);

    // Keep only last 1000 movements in memory
    if (this.stockMovements.length > 1000) {
      this.stockMovements.shift();
    }

    // Store in database if available
    if (this.storage?.recordStockMovement) {
      await this.storage.recordStockMovement(stockMovement);
    }

    this.emit('stockMovement', stockMovement);
  }

  /**
   * Get stock movements for a product
   */
  getStockMovements(productId: string, limit: number = 50): StockMovement[] {
    return this.stockMovements
      .filter(movement => movement.productId === productId)
      .slice(-limit)
      .reverse();
  }

  /**
   * Generate inventory report
   */
  async generateInventoryReport(): Promise<InventoryReport> {
    const lowStockItems = this.getLowStockItems();
    const outOfStockItems = this.getOutOfStockItems();
    const stockAlerts = this.getStockAlerts();

    // Calculate total value
    let totalValue = 0;
    for (const [, item] of Array.from(this.inventory.entries())) {
      totalValue += (item.availableStock + item.reservedStock) * item.unitCost;
    }

    // Get top selling products
    const topSellingProducts = Array.from(this.inventory.entries())
      .map(([productId, item]) => ({
        productId,
        name: `Product ${productId}`, // Would get from storage in real implementation
        totalSold: item.totalSold,
        revenue: item.totalSold * item.unitCost
      }))
      .sort((a, b) => b.totalSold - a.totalSold)
      .slice(0, 10);

    return {
      totalProducts: this.inventory.size,
      totalValue,
      lowStockItems: lowStockItems.length,
      outOfStockItems: outOfStockItems.length,
      totalMovements: this.stockMovements.length,
      topSellingProducts,
      stockAlerts,
      lastUpdated: new Date()
    };
  }

  /**
   * Start periodic checks for expiring products and stock levels
   */
  private startPeriodicChecks(): void {
    // Check every hour
    setInterval(async () => {
      console.log('🔍 Running periodic inventory checks...');
      
      for (const [productId] of Array.from(this.inventory.entries())) {
        await this.checkStockLevels(productId);
      }
    }, 60 * 60 * 1000); // 1 hour
  }

  /**
   * Get inventory statistics
   */
  getInventoryStats(): any {
    const totalProducts = this.inventory.size;
    const totalStock = Array.from(this.inventory.values())
      .reduce((sum, item) => sum + item.availableStock + item.reservedStock, 0);
    const totalValue = Array.from(this.inventory.values())
      .reduce((sum, item) => sum + (item.availableStock + item.reservedStock) * item.unitCost, 0);

    return {
      totalProducts,
      totalStock,
      totalValue,
      lowStockAlerts: this.getLowStockItems().length,
      outOfStockAlerts: this.getOutOfStockItems().length,
      totalAlerts: this.stockAlerts.size,
      totalMovements: this.stockMovements.length
    };
  }

  /**
   * Initialize inventory for all existing products
   */
  async initializeAllProducts(): Promise<void> {
    try {
      if (!this.storage?.getProducts) return;
      
      const products = await this.storage.getProducts();
      console.log(`📦 Initializing inventory for ${products.length} products...`);
      
      for (const product of products) {
        if (!this.inventory.has(product.id)) {
          await this.initializeProduct(
            product.id,
            Math.floor(Math.random() * 50) + 10, // Random initial stock 10-60
            10, // Low stock threshold
            parseFloat(product.price) * 0.6 // Unit cost (60% of selling price)
          );
        }
      }
      
      console.log(`✅ Inventory initialized for ${this.inventory.size} products`);
    } catch (error) {
      console.error('❌ Failed to initialize inventory for all products:', error);
    }
  }
}

export const inventoryService = new InventoryService(null);
