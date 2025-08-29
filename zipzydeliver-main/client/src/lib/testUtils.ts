// Test utilities and mock data for E2E testing framework

export interface MockOrder {
  id: string;
  orderNumber: string;
  status: 'placed' | 'accepted' | 'preparing' | 'out_for_delivery' | 'delivered';
  customerName: string;
  customerPhone: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  totalAmount: number;
  estimatedDeliveryTime: string;
  pickupLocation: {
    lat: number;
    lng: number;
    address: string;
    storeName: string;
  };
  deliveryLocation: {
    lat: number;
    lng: number;
    address: string;
  };
  partner?: {
    id: string;
    name: string;
    phone: string;
    isStudent: boolean;
    currentLocation: {
      lat: number;
      lng: number;
    };
    rating: number;
  };
  createdAt: Date;
}

export interface MockPartner {
  id: string;
  name: string;
  phone: string;
  email: string;
  isStudent: boolean;
  isOnline: boolean;
  currentLocation: {
    lat: number;
    lng: number;
  };
  rating: number;
  totalDeliveries: number;
  zpointsBalance: number;
  dailyDeliveries: number;
  maxDailyDeliveries: number;
}

export interface MockProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  category: string;
  isPopular: boolean;
  rating: number;
  reviewCount: number;
}

// Mock data for testing
export const mockOrders: MockOrder[] = [
  {
    id: 'order-1',
    orderNumber: '#ZP001',
    status: 'placed',
    customerName: 'Riya Sharma',
    customerPhone: '+91 98765 43210',
    items: [
      { name: 'Chicken Biryani', quantity: 1, price: 180 },
      { name: 'Coke', quantity: 1, price: 30 }
    ],
    totalAmount: 210,
    estimatedDeliveryTime: '20-25 min',
    pickupLocation: {
      lat: 28.7041,
      lng: 77.1025,
      address: 'Food Court, Block A',
      storeName: 'Spice Garden Restaurant'
    },
    deliveryLocation: {
      lat: 28.7045,
      lng: 77.1030,
      address: 'Hostel Block A, Room 205'
    },
    createdAt: new Date()
  },
  {
    id: 'order-2',
    orderNumber: '#ZP002',
    status: 'accepted',
    customerName: 'Arjun Patel',
    customerPhone: '+91 87654 32109',
    items: [
      { name: 'Veg Thali', quantity: 1, price: 120 },
      { name: 'Lassi', quantity: 1, price: 40 }
    ],
    totalAmount: 160,
    estimatedDeliveryTime: '15-20 min',
    pickupLocation: {
      lat: 28.7042,
      lng: 77.1026,
      address: 'Cafeteria, Block B',
      storeName: 'Green Garden'
    },
    deliveryLocation: {
      lat: 28.7046,
      lng: 77.1031,
      address: 'Library Building, Ground Floor'
    },
    partner: {
      id: 'partner-1',
      name: 'Arjun Singh',
      phone: '+91 76543 21098',
      isStudent: true,
      currentLocation: {
        lat: 28.7042,
        lng: 77.1026
      },
      rating: 4.8
    },
    createdAt: new Date(Date.now() - 300000) // 5 minutes ago
  }
];

export const mockPartners: MockPartner[] = [
  {
    id: 'partner-1',
    name: 'Arjun Singh',
    phone: '+91 76543 21098',
    email: 'arjun.singh@student.edu',
    isStudent: true,
    isOnline: true,
    currentLocation: {
      lat: 28.7042,
      lng: 77.1026
    },
    rating: 4.8,
    totalDeliveries: 45,
    zpointsBalance: 1250,
    dailyDeliveries: 2,
    maxDailyDeliveries: 3
  },
  {
    id: 'partner-2',
    name: 'Priya Verma',
    phone: '+91 65432 10987',
    email: 'priya.verma@student.edu',
    isStudent: true,
    isOnline: true,
    currentLocation: {
      lat: 28.7040,
      lng: 77.1024
    },
    rating: 4.9,
    totalDeliveries: 67,
    zpointsBalance: 2100,
    dailyDeliveries: 1,
    maxDailyDeliveries: 3
  },
  {
    id: 'partner-3',
    name: 'Rajesh Kumar',
    phone: '+91 54321 09876',
    email: 'rajesh.kumar@delivery.com',
    isStudent: false,
    isOnline: true,
    currentLocation: {
      lat: 28.7045,
      lng: 77.1029
    },
    rating: 4.6,
    totalDeliveries: 89,
    zpointsBalance: 0,
    dailyDeliveries: 0,
    maxDailyDeliveries: 10
  }
];

export const mockProducts: MockProduct[] = [
  {
    id: 'product-1',
    name: 'Chicken Biryani',
    description: 'Aromatic rice dish with tender chicken and spices',
    price: 180,
    imageUrl: '/assets/chicken-biryani.png',
    category: 'Food',
    isPopular: true,
    rating: 4.7,
    reviewCount: 156
  },
  {
    id: 'product-2',
    name: 'Veg Thali',
    description: 'Complete vegetarian meal with variety of dishes',
    price: 120,
    imageUrl: '/assets/veg-thali.png',
    category: 'Food',
    isPopular: true,
    rating: 4.5,
    reviewCount: 98
  },
  {
    id: 'product-3',
    name: 'Coke',
    description: 'Refreshing carbonated soft drink',
    price: 30,
    imageUrl: '/assets/coke.png',
    category: 'Beverages',
    isPopular: false,
    rating: 4.2,
    reviewCount: 45
  }
];

// Test scenario configurations
export const testConfigs = {
  userOrderFlow: {
    timeout: 300000, // 5 minutes
    retryAttempts: 3,
    stepDelay: 1000, // 1 second between steps
  },
  partnerDeliveryFlow: {
    timeout: 360000, // 6 minutes
    retryAttempts: 3,
    stepDelay: 1500, // 1.5 seconds between steps
  },
  realTimeTracking: {
    timeout: 180000, // 3 minutes
    retryAttempts: 2,
    stepDelay: 500, // 0.5 seconds between steps
  },
  aiChatbotFlow: {
    timeout: 180000, // 3 minutes
    retryAttempts: 2,
    stepDelay: 800, // 0.8 seconds between steps
  }
};

// Test validation functions
export const validateOrderCreation = (order: any): boolean => {
  return (
    order &&
    order.id &&
    order.orderNumber &&
    order.status === 'placed' &&
    order.items &&
    order.items.length > 0 &&
    order.totalAmount > 0
  );
};

export const validatePartnerAssignment = (order: any): boolean => {
  return (
    order &&
    order.partner &&
    order.partner.id &&
    order.status === 'accepted'
  );
};

export const validateDeliveryCompletion = (order: any): boolean => {
  return (
    order &&
    order.status === 'delivered' &&
    order.partner &&
    order.partner.id
  );
};

export const validateLocationUpdate = (location: any): boolean => {
  return (
    location &&
    typeof location.lat === 'number' &&
    typeof location.lng === 'number' &&
    location.lat >= -90 &&
    location.lat <= 90 &&
    location.lng >= -180 &&
    location.lng <= 180
  );
};

// Mock API responses for testing
export const mockApiResponses = {
  products: {
    success: true,
    data: mockProducts,
    message: 'Products fetched successfully'
  },
  orders: {
    success: true,
    data: mockOrders,
    message: 'Orders fetched successfully'
  },
  partners: {
    success: true,
    data: mockPartners,
    message: 'Partners fetched successfully'
  },
  cart: {
    success: true,
    data: {
      items: mockProducts.slice(0, 2).map(p => ({ ...p, quantity: 1 })),
      totalItems: 2,
      totalAmount: 300
    },
    message: 'Cart fetched successfully'
  }
};

// Test data generators
export const generateTestOrder = (overrides: Partial<MockOrder> = {}): MockOrder => {
  const baseOrder: MockOrder = {
    id: `test-order-${Date.now()}`,
    orderNumber: `#ZP${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
    status: 'placed',
    customerName: 'Test Customer',
    customerPhone: '+91 99999 99999',
    items: [
      { name: 'Test Product', quantity: 1, price: 100 }
    ],
    totalAmount: 100,
    estimatedDeliveryTime: '20-25 min',
    pickupLocation: {
      lat: 28.7041,
      lng: 77.1025,
      address: 'Test Pickup Location',
      storeName: 'Test Store'
    },
    deliveryLocation: {
      lat: 28.7045,
      lng: 77.1030,
      address: 'Test Delivery Location'
    },
    createdAt: new Date()
  };

  return { ...baseOrder, ...overrides };
};

export const generateTestPartner = (overrides: Partial<MockPartner> = {}): MockPartner => {
  const basePartner: MockPartner = {
    id: `test-partner-${Date.now()}`,
    name: 'Test Partner',
    phone: '+91 88888 88888',
    email: 'test.partner@test.com',
    isStudent: true,
    isOnline: true,
    currentLocation: {
      lat: 28.7040,
      lng: 77.1020
    },
    rating: 4.5,
    totalDeliveries: 10,
    zpointsBalance: 500,
    dailyDeliveries: 0,
    maxDailyDeliveries: 3
  };

  return { ...basePartner, ...overrides };
};

// Test environment utilities
export const isTestEnvironment = (): boolean => {
  return process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development';
};

export const getTestTimeout = (scenarioType: keyof typeof testConfigs): number => {
  return testConfigs[scenarioType].timeout;
};

export const delay = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

// Test result formatter
export const formatTestResult = (result: any): string => {
  return JSON.stringify(result, null, 2);
};

// Test performance metrics
export const calculateTestMetrics = (startTime: number, endTime: number, steps: number) => {
  const duration = endTime - startTime;
  const averageStepTime = duration / steps;
  
  return {
    totalDuration: duration,
    averageStepTime,
    stepsPerSecond: steps / (duration / 1000),
    performance: duration < 5000 ? 'excellent' : duration < 10000 ? 'good' : 'needs-improvement'
  };
};
