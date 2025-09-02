import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { showErrorToast, logError } from "@/lib/errorHandling";
import { Plus, Pencil, Trash2, Package, CheckCircle, XCircle, CreditCard, Truck, Wallet, Users, TrendingUp, Minus } from "lucide-react";

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: string;
  deliveryAddress: string;
  phone: string;
  paymentMethod: string;
  paymentStatus: string;
  createdAt: string;
  user?: {
    firstName: string;
    lastName: string;
  };
  orderItems: Array<{
    id: string;
    quantity: number;
    price: string;
    product: {
      id: string;
      name: string;
    };
  }>;
}

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: string;
  originalPrice: string | null;
  imageUrl: string | null;
  rating: string | null;
  reviewCount: number;
  isAvailable: boolean;
  isPopular: boolean;
  deliveryTime: number;
  createdAt: string;
  category: {
    id: string;
    name: string;
    color: string | null;
  } | null;
}

interface Category {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  isActive: boolean;
  createdAt: string;
}

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: 'user' | 'admin' | 'partner';
  isActive: boolean;
  createdAt: string;
  isAdmin?: boolean;
  zpointsBalance?: number;
}

interface Payment {
  id: string;
  orderId: string;
  amount: number;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  paymentMethod: string;
  transactionId?: string;
  paidAt?: string;
  createdAt: string;
  order?: {
    orderNumber: string;
    customerName: string;
  };
}

// Form schemas
const productFormSchema = z.object({
  name: z.string().min(1, "Product name is required").max(200),
  description: z.string().optional(),
  price: z.string().min(1, "Price is required").regex(/^\d+(\.\d{1,2})?$/, "Invalid price format"),
  originalPrice: z.string().optional().refine((val) => !val || /^\d+(\.\d{1,2})?$/.test(val), "Invalid price format"),
  imageUrl: z.string().optional(),
  categoryId: z.string().min(1, "Category is required"),
  isAvailable: z.boolean().default(true),
  isPopular: z.boolean().default(false),
  deliveryTime: z.number().min(1).default(15)
});

const categoryFormSchema = z.object({
  name: z.string().min(1, "Category name is required").max(100),
  description: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid color format").default("#6366F1"),
  isActive: z.boolean().default(true)
});

const notificationFormSchema = z.object({
  title: z.string().min(1, "Title is required").max(100),
  message: z.string().min(1, "Message is required").max(500),
  type: z.enum(['info', 'success', 'warning', 'error']).default('info'),
  target: z.enum(['all', 'customers', 'partners', 'admins']).default('all')
});

type ProductFormData = z.infer<typeof productFormSchema>;
type CategoryFormData = z.infer<typeof categoryFormSchema>;
type NotificationFormData = z.infer<typeof notificationFormSchema>;

const statusColors: Record<string, string> = {
  "placed": "bg-yellow-100 text-yellow-800 border-yellow-200",
  "accepted": "bg-blue-100 text-blue-800 border-blue-200", 
  "preparing": "bg-orange-100 text-orange-800 border-orange-200",
  "out_for_delivery": "bg-purple-100 text-purple-800 border-purple-200",
  "delivered": "bg-green-100 text-green-800 border-green-200",
  "cancelled": "bg-red-100 text-red-800 border-red-200"
};

const statusLabels: Record<string, string> = {
  "placed": "Pending",
  "accepted": "Accepted",
  "preparing": "Preparing", 
  "out_for_delivery": "Out for Delivery",
  "delivered": "Delivered",
  "cancelled": "Cancelled"
};

export default function AdminPanel() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("dashboard");
  const isAdmin = !!user?.isAdmin && !!isAuthenticated;

  // Early auth gate to prevent query churn and infinite loading
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-600 border-t-transparent"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-2">
          <h2 className="text-xl font-semibold">Please sign in</h2>
          <p className="text-muted-foreground">You must be logged in to access the admin panel.</p>
          <a href="/login" className="inline-block px-4 py-2 rounded bg-purple-600 text-white">Go to Login</a>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-2">
          <h2 className="text-xl font-semibold">Not authorized</h2>
          <p className="text-muted-foreground">Your account does not have admin access.</p>
          <a href="/" className="inline-block px-4 py-2 rounded bg-purple-600 text-white">Go Home</a>
        </div>
      </div>
    );
  }

  const { data: orders = [], isLoading: ordersLoading } = useQuery<Order[]>({
    queryKey: ['admin-orders'],
    queryFn: getQueryFn({ on401: "returnNull" }),
    select: (data) => data || [],
    refetchInterval: 120000, // Refetch every 2 minutes (reduced from 30 seconds)
    staleTime: 100000, // Data considered fresh for 1.5+ minutes
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
    enabled: isAdmin,
  });

  const { data: products = [], isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: getQueryFn({ on401: "returnNull" }),
    select: (data) => data || [],
    refetchInterval: 300000, // Refetch every 5 minutes
    staleTime: 250000, // Data considered fresh for 4+ minutes
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
    enabled: isAdmin,
  });

  const { data: categories = [], isLoading: categoriesLoading } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: getQueryFn({ on401: "returnNull" }),
    select: (data) => data || [],
    refetchInterval: 600000, // Refetch every 10 minutes
    staleTime: 500000, // Data considered fresh for 8+ minutes
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
    enabled: isAdmin,
  });

  const { data: users = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ['admin-users'],
    queryFn: getQueryFn({ on401: "returnNull" }),
    select: (data) => data || [],
    refetchInterval: 300000, // Refetch every 5 minutes (reduced from 1 minute)
    staleTime: 250000, // Data considered fresh for 4+ minutes
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
    enabled: isAdmin,
  });

  const { data: payments = [], isLoading: paymentsLoading } = useQuery<Payment[]>({
    queryKey: ['admin-payments'],
    queryFn: getQueryFn({ on401: "returnNull" }),
    select: (data) => data || [],
    refetchInterval: 120000, // Refetch every 2 minutes
    staleTime: 100000, // Data considered fresh for 100 seconds
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
    enabled: isAdmin,
  });

  // Ensure categories is always an array
  const safeCategories = Array.isArray(categories) ? categories : [];
  
  // Ensure orders is always an array
  const safeOrders = Array.isArray(orders) ? orders : [];
  
  // Ensure users is always an array
  const safeUsers = Array.isArray(users) ? users : [];
  
  // Ensure payments is always an array
  const safePayments = Array.isArray(payments) ? payments : [];
  
  // Ensure products is always an array
  const safeProducts = Array.isArray(products) ? products : [];

  // Dialog states
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [isNotificationDialogOpen, setIsNotificationDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  // Forms
  const productForm = useForm<ProductFormData, any, ProductFormData>({
    resolver: zodResolver(productFormSchema) as any,
    defaultValues: {
      name: "",
      description: "",
      price: "",
      originalPrice: "",
      imageUrl: "",
      categoryId: "",
      isAvailable: true,
      isPopular: false,
      deliveryTime: 15
    }
  });

  const categoryForm = useForm<CategoryFormData, any, CategoryFormData>({
    resolver: zodResolver(categoryFormSchema) as any,
    defaultValues: {
      name: "",
      description: "",
      icon: "",
      color: "#6366F1",
      isActive: true
    }
  });

  const notificationForm = useForm<NotificationFormData, any, NotificationFormData>({
    resolver: zodResolver(notificationFormSchema) as any,
    defaultValues: {
      title: "",
      message: "",
      type: "info",
      target: "all"
    }
  });

  const updateOrderStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      await apiRequest("POST", `/api/admin/orders/${orderId}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      toast({
        title: "Order updated",
        description: "Order status has been updated successfully",
      });
    },
    onError: (error) => {
      logError(error, 'AdminPanel - Update Order Status');
      showErrorToast(error, toast);
    },
  });

  // New order action mutations
  const acceptOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      await apiRequest("POST", `/api/orders/${orderId}/accept`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      toast({
        title: "Order accepted",
        description: "Order has been accepted successfully",
      });
    },
    onError: (error) => {
      logError(error, 'AdminPanel - Accept Order');
      showErrorToast(error, toast);
    },
  });

  const rejectOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      await apiRequest("POST", `/api/orders/${orderId}/reject`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      toast({
        title: "Order rejected",
        description: "Order has been rejected successfully",
      });
    },
    onError: (error) => {
      logError(error, 'AdminPanel - Reject Order');
      showErrorToast(error, toast);
    },
  });

  const markAsPaidMutation = useMutation({
    mutationFn: async (orderId: string) => {
      await apiRequest("POST", `/api/orders/${orderId}/mark-paid`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      toast({
        title: "Payment marked",
        description: "Order has been marked as paid",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to mark order as paid",
        variant: "destructive",
      });
    },
  });

  const deliverOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      await apiRequest("POST", `/api/orders/${orderId}/deliver`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      toast({
        title: "Order delivered",
        description: "Order has been marked as delivered",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to mark order as delivered",
        variant: "destructive",
      });
    },
  });

  // Product mutations
  const createProductMutation = useMutation({
    mutationFn: async (data: ProductFormData) => {
      await apiRequest("POST", "/api/products", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      setIsProductDialogOpen(false);
      productForm.reset();
      toast({
        title: "Product created",
        description: "Product has been created successfully",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to create product",
        variant: "destructive",
      });
    },
  });

  const updateProductMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ProductFormData }) => {
      await apiRequest("PUT", `/api/products/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      setIsProductDialogOpen(false);
      setEditingProduct(null);
      productForm.reset();
      toast({
        title: "Product updated",
        description: "Product has been updated successfully",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to update product",
        variant: "destructive",
      });
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/products/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      toast({
        title: "Product deleted",
        description: "Product has been deleted successfully",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to delete product",
        variant: "destructive",
      });
    },
  });

  // Category mutations
  const createCategoryMutation = useMutation({
    mutationFn: async (data: CategoryFormData) => {
      await apiRequest("POST", "/api/categories", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      setIsCategoryDialogOpen(false);
      categoryForm.reset();
      toast({
        title: "Category created",
        description: "Category has been created successfully",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to create category",
        variant: "destructive",
      });
    },
  });

  // Helper functions
  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    productForm.reset({
      name: product.name,
      description: product.description || "",
      price: product.price,
      originalPrice: product.originalPrice || "",
      imageUrl: product.imageUrl || "",
      categoryId: product.category?.id || "",
      isAvailable: product.isAvailable,
      isPopular: product.isPopular,
      deliveryTime: product.deliveryTime
    });
    setIsProductDialogOpen(true);
  };

  const handleProductSubmit: SubmitHandler<ProductFormData> = (data) => {
    if (editingProduct) {
      updateProductMutation.mutate({ id: editingProduct.id, data });
    } else {
      createProductMutation.mutate(data);
    }
  };

  const handleCategorySubmit: SubmitHandler<CategoryFormData> = (data) => {
    createCategoryMutation.mutate(data);
  };

  // User management mutations
  const deactivateUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      await apiRequest("PUT", `/api/admin/users/${userId}/deactivate`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({
        title: "User deactivated",
        description: "User has been deactivated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to deactivate user",
        variant: "destructive",
      });
    },
  });

  const activateUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      await apiRequest("PUT", `/api/admin/users/${userId}/activate`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({
        title: "User activated",
        description: "User has been activated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to activate user",
        variant: "destructive",
      });
    },
  });

  // Payment management mutations
  const confirmPaymentMutation = useMutation({
    mutationFn: async (paymentId: string) => {
      await apiRequest("PUT", `/api/admin/payments/${paymentId}/confirm`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/payments'] });
      toast({
        title: "Payment confirmed",
        description: "Payment has been confirmed successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to confirm payment",
        variant: "destructive",
      });
    },
  });

  const refundPaymentMutation = useMutation({
    mutationFn: async (paymentId: string) => {
      await apiRequest("PUT", `/api/admin/payments/${paymentId}/refund`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/payments'] });
      toast({
        title: "Refund processed",
        description: "Payment refund has been processed successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to process refund",
        variant: "destructive",
      });
    },
  });

  // Notification mutations
  const sendNotificationMutation = useMutation({
    mutationFn: async (data: NotificationFormData) => {
      await apiRequest("POST", "/api/admin/notifications", data);
    },
    onSuccess: () => {
      setIsNotificationDialogOpen(false);
      notificationForm.reset();
      toast({
        title: "Notification sent",
        description: "Notification has been sent successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to send notification",
        variant: "destructive",
      });
    },
  });

  // ZPoints mutations
  const creditZPointsMutation = useMutation({
    mutationFn: async ({ userId, amount, description }: { userId: string; amount: number; description: string }) => {
      await apiRequest("POST", `/api/users/${userId}/zpoints/credit`, { amount, description });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({
        title: "ZPoints credited",
        description: "ZPoints have been credited successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to credit ZPoints",
        variant: "destructive",
      });
    },
  });

  const debitZPointsMutation = useMutation({
    mutationFn: async ({ userId, amount, description }: { userId: string; amount: number; description: string }) => {
      await apiRequest("POST", `/api/users/${userId}/zpoints/debit`, { amount, description });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({
        title: "ZPoints debited",
        description: "ZPoints have been debited successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to debit ZPoints",
        variant: "destructive",
      });
    },
  });

  const resetProductForm = () => {
    setEditingProduct(null);
    productForm.reset();
  };

  // Calculate stats
  const totalOrders = safeOrders.length;
  const totalRevenue = safeOrders.reduce((sum, order) => sum + (Number(order.totalAmount) || 0), 0);
  const pendingOrders = safeOrders.filter(order => order.status === 'placed').length;
  const averageDeliveryTime = 18; // Mock value

  // Mock recent notifications data
  const recentNotifications = [
    {
      id: '1',
      title: 'System Maintenance',
      message: 'Scheduled maintenance on Sunday 2-4 AM',
      type: 'info' as const,
      target: 'all',
      createdAt: new Date().toISOString()
    },
    {
      id: '2',
      title: 'New Feature Available',
      message: 'Real-time order tracking is now live!',
      type: 'success' as const,
      target: 'customers',
      createdAt: new Date(Date.now() - 86400000).toISOString()
    }
  ];

  if (ordersLoading || usersLoading || paymentsLoading || productsLoading || categoriesLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-600 border-t-transparent"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header onCartClick={() => {}} />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-foreground mb-2" data-testid="text-admin-title">
              Admin Panel
            </h1>
            <p className="text-muted-foreground">Manage orders, products, users, payments, and view analytics</p>
          </div>
          
          {/* Manual Refresh Button */}
          <Button
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
              queryClient.invalidateQueries({ queryKey: ['admin-users'] });
              queryClient.invalidateQueries({ queryKey: ['admin-payments'] });
              queryClient.invalidateQueries({ queryKey: ['products'] });
              queryClient.invalidateQueries({ queryKey: ['categories'] });
              toast({
                title: "Data refreshed",
                description: "All data has been refreshed successfully",
              });
            }}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
            </svg>
            Refresh Data
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
                      <TabsList className="grid w-full max-w-md grid-cols-7">
              <TabsTrigger value="dashboard" data-testid="tab-dashboard">Dashboard</TabsTrigger>
              <TabsTrigger value="orders" data-testid="tab-orders">Orders</TabsTrigger>
              <TabsTrigger value="users" data-testid="tab-users">Users</TabsTrigger>
              <TabsTrigger value="payments" data-testid="tab-payments">Payments</TabsTrigger>
              <TabsTrigger value="zpoints" data-testid="tab-zpoints">ZPoints</TabsTrigger>
              <TabsTrigger value="products" data-testid="tab-products">Products</TabsTrigger>
              <TabsTrigger value="notifications" data-testid="tab-notifications">Notifications</TabsTrigger>
            </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                  <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"></path>
                  </svg>
                </CardHeader>
                <CardContent>
                  {usersLoading ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-purple-600 border-t-transparent"></div>
                      <span className="text-sm text-muted-foreground">Loading...</span>
                    </div>
                  ) : (
                    <>
                      <div className="text-2xl font-bold" data-testid="text-total-users">{safeUsers.length}</div>
                      <p className="text-xs text-muted-foreground">+5% from last month</p>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                  <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                  </svg>
                </CardHeader>
                <CardContent>
                  {ordersLoading ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-purple-600 border-t-transparent"></div>
                      <span className="text-sm text-muted-foreground">Loading...</span>
                    </div>
                  ) : (
                    <>
                      <div className="text-2xl font-bold" data-testid="text-total-orders">{totalOrders}</div>
                      <p className="text-xs text-muted-foreground">+12% from last month</p>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Revenue</CardTitle>
                  <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"></path>
                  </svg>
                </CardHeader>
                <CardContent>
                  {ordersLoading ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-purple-600 border-t-transparent"></div>
                      <span className="text-sm text-muted-foreground">Loading...</span>
                    </div>
                  ) : (
                    <>
                      <div className="text-2xl font-bold" data-testid="text-total-revenue">₹{totalRevenue.toFixed(0)}</div>
                      <p className="text-xs text-muted-foreground">+8% from last month</p>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
                  <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </CardHeader>
                <CardContent>
                  {paymentsLoading ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-purple-600 border-t-transparent"></div>
                      <span className="text-sm text-muted-foreground">Loading...</span>
                    </div>
                  ) : (
                    <>
                      <div className="text-2xl font-bold" data-testid="text-pending-payments">
                        {safePayments.filter(p => p.status === 'pending').length}
                      </div>
                      <p className="text-xs text-muted-foreground">Needs attention</p>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Orders</CardTitle>
                  <CardDescription>Latest order activities</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {safeOrders.slice(0, 5).map((order) => (
                      <div key={order.id} className="flex items-center justify-between py-2" data-testid={`recent-order-${order.id}`}>
                        <div className="flex items-center space-x-3">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span className="text-foreground">
                            Order #{order.orderNumber} - ₹{parseFloat(order.totalAmount).toFixed(0)}
                          </span>
                        </div>
                        <span className="text-muted-foreground text-sm">
                          {new Date(order.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Users</CardTitle>
                  <CardDescription>Latest user registrations</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                                          {safeUsers.slice(0, 5).map((user) => (
                      <div key={user.id} className="flex items-center justify-between py-2" data-testid={`recent-user-${user.id}`}>
                        <div className="flex items-center space-x-3">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <span className="text-foreground">
                            {user.firstName} {user.lastName}
                          </span>
                        </div>
                        <span className="text-muted-foreground text-sm">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders" className="mt-6">
            {ordersLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="bg-card rounded-xl p-6 border border-border">
                    <div className="flex items-center justify-between mb-4">
                      <div className="space-y-2">
                        <Skeleton className="h-5 w-32" />
                        <Skeleton className="h-4 w-48" />
                      </div>
                      <Skeleton className="h-8 w-20" />
                    </div>
                    <Skeleton className="h-20 w-full" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {safeOrders.map((order) => {
                  const statusColor = statusColors[order.status] || statusColors.placed;
                  const statusLabel = statusLabels[order.status] || order.status;
                  
                  return (
                    <div key={order.id} className="bg-card rounded-xl p-6 border border-border" data-testid={`admin-order-${order.id}`}>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-4">
                          <div>
                            <h3 className="font-semibold text-foreground" data-testid={`text-admin-order-number-${order.id}`}>
                              Order #{order.orderNumber}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              Customer: {order.user?.firstName} {order.user?.lastName}
                            </p>
                          </div>
                          <Badge variant="outline" className={statusColor} data-testid={`badge-admin-status-${order.id}`}>
                            {statusLabel}
                          </Badge>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-foreground">₹{parseFloat(order.totalAmount).toFixed(0)}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(order.createdAt).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: true
                            })}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div>
                          <h4 className="text-sm font-medium text-foreground mb-2">Items</h4>
                          <div className="space-y-1 text-sm text-muted-foreground">
                            {order.orderItems.map((item) => (
                              <div key={item.id}>
                                {item.quantity}× {item.product.name} (₹{(parseFloat(item.price) * item.quantity).toFixed(0)})
                              </div>
                            ))}
                          </div>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-foreground mb-2">Delivery Info</h4>
                          <div className="space-y-1 text-sm text-muted-foreground">
                            <div>{order.deliveryAddress}</div>
                            <div>Phone: {order.phone}</div>
                          </div>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-foreground mb-2">Payment</h4>
                          <div className="space-y-1 text-sm text-muted-foreground">
                            <div>{order.paymentMethod.toUpperCase()}</div>
                            <div className={`font-medium ${order.paymentStatus === 'paid' ? 'text-green-600' : 'text-red-600'}`}>
                              {order.paymentStatus === 'paid' ? 'Paid ✓' : 'Pending'}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {/* Order Status Actions */}
                        {order.status === 'pending' && (
                          <>
                            <Button
                              size="sm"
                              variant="default"
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => handleAcceptOrder(order.id)}
                              data-testid={`button-accept-${order.id}`}
                            >
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Accept Order
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleRejectOrder(order.id)}
                              data-testid={`button-reject-${order.id}`}
                            >
                              <XCircle className="w-4 h-4 mr-2" />
                              Reject Order
                            </Button>
                          </>
                        )}
                        
                        {order.status === 'accepted' && (
                          <>
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => updateOrderStatusMutation.mutate({ orderId: order.id, status: 'preparing' })}
                              data-testid={`button-preparing-${order.id}`}
                            >
                              Mark Preparing
                            </Button>
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => updateOrderStatusMutation.mutate({ orderId: order.id, status: 'out_for_delivery' })}
                              data-testid={`button-out-for-delivery-${order.id}`}
                            >
                              Out for Delivery
                            </Button>
                          </>
                        )}
                        
                        {order.status === 'out_for_delivery' && (
                          <Button
                            size="sm"
                            variant="default"
                            className="bg-purple-600 hover:bg-purple-700"
                            onClick={() => handleDeliverOrder(order.id)}
                            data-testid={`button-delivered-${order.id}`}
                          >
                            <Truck className="w-4 h-4 mr-2" />
                            Mark Delivered
                          </Button>
                        )}
                        
                        {/* Payment Actions */}
                        {order.paymentStatus === 'pending' && order.paymentMethod === 'cod' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-green-600 text-green-600 hover:bg-green-50"
                            onClick={() => handleMarkAsPaid(order.id)}
                            data-testid={`button-mark-paid-${order.id}`}
                          >
                            <CreditCard className="w-4 h-4 mr-2" />
                            Mark as Paid
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="mt-6">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">User Management</h2>
                  <p className="text-muted-foreground">Manage customers and delivery partners</p>
                </div>
              </div>

              {usersLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="bg-card rounded-xl p-6 border border-border">
                      <div className="flex items-center justify-between mb-4">
                        <div className="space-y-2">
                          <Skeleton className="h-5 w-32" />
                          <Skeleton className="h-4 w-48" />
                        </div>
                        <Skeleton className="h-8 w-20" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {safeUsers.map((user) => (
                    <div key={user.id} className="bg-card rounded-xl p-6 border border-border" data-testid={`admin-user-${user.id}`}>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-4">
                          <div>
                            <h3 className="font-semibold text-foreground" data-testid={`text-user-name-${user.id}`}>
                              {user.firstName} {user.lastName}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {user.email} • {user.phone}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge 
                              variant="outline" 
                              className={user.isActive ? "bg-green-100 text-green-800 border-green-200" : "bg-red-100 text-red-800 border-red-200"}
                              data-testid={`badge-user-status-${user.id}`}
                            >
                              {user.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                            <Badge 
                              variant="outline" 
                              className="bg-blue-100 text-blue-800 border-blue-200"
                              data-testid={`badge-user-role-${user.id}`}
                            >
                              {user.role}
                            </Badge>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">
                            Joined: {new Date(user.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {user.isActive ? (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeactivateUser(user.id)}
                            data-testid={`button-deactivate-${user.id}`}
                          >
                            Deactivate User
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleActivateUser(user.id)}
                            data-testid={`button-activate-${user.id}`}
                          >
                            Activate User
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Payments Tab */}
          <TabsContent value="payments" className="mt-6">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">Payment Management</h2>
                  <p className="text-muted-foreground">Track and manage all payments</p>
                </div>
              </div>

              {paymentsLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="bg-card rounded-xl p-6 border border-border">
                      <div className="flex items-center justify-between mb-4">
                        <div className="space-y-2">
                          <Skeleton className="h-5 w-32" />
                          <Skeleton className="h-4 w-48" />
                        </div>
                        <Skeleton className="h-8 w-20" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {safePayments.map((payment) => (
                    <div key={payment.id} className="bg-card rounded-xl p-6 border border-border" data-testid={`admin-payment-${payment.id}`}>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-4">
                          <div>
                            <h3 className="font-semibold text-foreground" data-testid={`text-payment-id-${payment.id}`}>
                              Payment #{payment.id.slice(-8)}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              Order: {payment.order?.orderNumber || payment.orderId} • {payment.paymentMethod.toUpperCase()}
                            </p>
                          </div>
                          <Badge 
                            variant="outline" 
                            className={
                              payment.status === 'completed' ? "bg-green-100 text-green-800 border-green-200" :
                              payment.status === 'pending' ? "bg-yellow-100 text-yellow-800 border-yellow-200" :
                              payment.status === 'failed' ? "bg-red-100 text-red-800 border-red-200" :
                              "bg-gray-100 text-gray-800 border-gray-200"
                            }
                            data-testid={`badge-payment-status-${payment.id}`}
                          >
                            {payment.status}
                          </Badge>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-foreground">₹{payment.amount.toFixed(0)}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(payment.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {payment.status === 'pending' && (
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleConfirmPayment(payment.id)}
                            data-testid={`button-confirm-payment-${payment.id}`}
                          >
                            Confirm Payment
                          </Button>
                        )}
                        {payment.status === 'completed' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRefundPayment(payment.id)}
                            data-testid={`button-refund-payment-${payment.id}`}
                          >
                            Process Refund
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Products Tab */}
          <TabsContent value="products" className="mt-6">
            <div className="space-y-6">
              {/* Header with actions */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">Product Management</h2>
                  <p className="text-muted-foreground">Manage your products and categories</p>
                </div>
                <div className="flex items-center gap-2">
                  <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" data-testid="button-add-category">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Category
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Create Category</DialogTitle>
                        <DialogDescription>
                          Add a new product category to organize your products.
                        </DialogDescription>
                      </DialogHeader>
                      <Form {...categoryForm}>
                        <form onSubmit={categoryForm.handleSubmit(handleCategorySubmit as any)} className="space-y-4">
                          <FormField
                            control={categoryForm.control}
                            name="name"
                            render={({ field }: any) => (
                              <FormItem>
                                <FormLabel>Category Name</FormLabel>
                                <FormControl>
                                  <Input placeholder="Enter category name" {...field} data-testid="input-category-name" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={categoryForm.control}
                            name="description"
                            render={({ field }: any) => (
                              <FormItem>
                                <FormLabel>Description</FormLabel>
                                <FormControl>
                                  <Textarea placeholder="Enter category description" {...field} data-testid="input-category-description" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={categoryForm.control}
                            name="icon"
                            render={({ field }: any) => (
                              <FormItem>
                                <FormLabel>Icon (optional)</FormLabel>
                                <FormControl>
                                  <Input placeholder="Enter icon name" {...field} data-testid="input-category-icon" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={categoryForm.control}
                            name="color"
                            render={({ field }: any) => (
                              <FormItem>
                                <FormLabel>Color</FormLabel>
                                <FormControl>
                                  <Input type="color" {...field} data-testid="input-category-color" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={categoryForm.control}
                            name="isActive"
                            render={({ field }: any) => (
                              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                <div className="space-y-0.5">
                                  <FormLabel>Active</FormLabel>
                                  <div className="text-sm text-muted-foreground">
                                    Category is visible to customers
                                  </div>
                                </div>
                                <FormControl>
                                  <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                    data-testid="switch-category-active"
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          <div className="flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={() => setIsCategoryDialogOpen(false)}>
                              Cancel
                            </Button>
                            <Button type="submit" disabled={createCategoryMutation.isPending} data-testid="button-save-category">
                              {createCategoryMutation.isPending ? "Creating..." : "Create Category"}
                            </Button>
                          </div>
                        </form>
                      </Form>
                    </DialogContent>
                  </Dialog>
                  
                  <Dialog open={isProductDialogOpen} onOpenChange={(open) => {
                    setIsProductDialogOpen(open);
                    if (!open) resetProductForm();
                  }}>
                    <DialogTrigger asChild>
                      <Button data-testid="button-add-product">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Product
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>{editingProduct ? 'Edit Product' : 'Create Product'}</DialogTitle>
                        <DialogDescription>
                          {editingProduct ? 'Update product details.' : 'Add a new product to your store.'}
                        </DialogDescription>
                      </DialogHeader>
                      <Form {...productForm}>
                        <form onSubmit={productForm.handleSubmit(handleProductSubmit as any)} className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                              control={productForm.control}
                              name="name"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Product Name</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Enter product name" {...field} data-testid="input-product-name" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={productForm.control}
                              name="categoryId"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Category</FormLabel>
                                  <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                      <SelectTrigger data-testid="select-product-category">
                                        <SelectValue placeholder="Select a category" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {safeCategories.map((category) => (
                                        <SelectItem key={category.id} value={category.id}>
                                          {category.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          
                          <FormField
                            control={productForm.control}
                            name="description"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Description</FormLabel>
                                <FormControl>
                                  <Textarea placeholder="Enter product description" {...field} data-testid="input-product-description" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <FormField
                              control={productForm.control}
                              name="price"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Price (₹)</FormLabel>
                                  <FormControl>
                                    <Input placeholder="0.00" {...field} data-testid="input-product-price" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={productForm.control}
                              name="originalPrice"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Original Price (₹)</FormLabel>
                                  <FormControl>
                                    <Input placeholder="0.00" {...field} data-testid="input-product-original-price" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={productForm.control}
                              name="deliveryTime"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Delivery Time (min)</FormLabel>
                                  <FormControl>
                                    <Input 
                                      type="number" 
                                      placeholder="15" 
                                      {...field} 
                                      onChange={(e) => field.onChange(parseInt(e.target.value) || 15)}
                                      data-testid="input-product-delivery-time"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          
                          <FormField
                            control={productForm.control}
                            name="imageUrl"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Image URL</FormLabel>
                                <FormControl>
                                  <Input placeholder="https://example.com/image.jpg" {...field} data-testid="input-product-image" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <div className="grid grid-cols-2 gap-4">
                            <FormField
                              control={productForm.control}
                              name="isAvailable"
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                  <div className="space-y-0.5">
                                    <FormLabel>Available</FormLabel>
                                    <div className="text-sm text-muted-foreground">
                                      Product is available for purchase
                                    </div>
                                  </div>
                                  <FormControl>
                                    <Switch
                                      checked={field.value}
                                      onCheckedChange={field.onChange}
                                      data-testid="switch-product-available"
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={productForm.control}
                              name="isPopular"
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                  <div className="space-y-0.5">
                                    <FormLabel>Popular</FormLabel>
                                    <div className="text-sm text-muted-foreground">
                                      Mark as popular product
                                    </div>
                                  </div>
                                  <FormControl>
                                    <Switch
                                      checked={field.value}
                                      onCheckedChange={field.onChange}
                                      data-testid="switch-product-popular"
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          </div>
                          
                          <div className="flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={() => {
                              setIsProductDialogOpen(false);
                              resetProductForm();
                            }}>
                              Cancel
                            </Button>
                            <Button 
                              type="submit" 
                              disabled={createProductMutation.isPending || updateProductMutation.isPending}
                              data-testid="button-save-product"
                            >
                              {editingProduct 
                                ? (updateProductMutation.isPending ? "Updating..." : "Update Product")
                                : (createProductMutation.isPending ? "Creating..." : "Create Product")
                              }
                            </Button>
                          </div>
                        </form>
                      </Form>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
              
              {/* Categories Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="w-5 h-5" />
                    Categories ({safeCategories.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {categoriesLoading ? (
                    <div className="flex gap-2">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <Skeleton key={i} className="h-20 w-32" />
                      ))}
                    </div>
                  ) : safeCategories && safeCategories.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {safeCategories.map((category) => (
                        <Badge 
                          key={category.id} 
                          variant="outline" 
                          className="px-3 py-2 text-sm"
                          style={{ borderColor: category.color || "#6366F1", color: category.color || "#6366F1" }}
                          data-testid={`badge-category-${category.id}`}
                        >
                          {category.icon && <span className="mr-1">{category.icon}</span>}
                          {category.name}
                          {!category.isActive && <span className="ml-1 text-muted-foreground">(Inactive)</span>}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No categories yet. Create your first category to organize products.</p>
                  )}
                </CardContent>
              </Card>
              
              {/* Products Section */}
              <Card>
                <CardHeader>
                  <CardTitle>Products ({safeProducts.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  {productsLoading ? (
                    <div className="space-y-4">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg">
                          <Skeleton className="h-16 w-16 rounded" />
                          <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-48" />
                            <Skeleton className="h-3 w-32" />
                          </div>
                          <Skeleton className="h-8 w-20" />
                        </div>
                      ))}
                    </div>
                                ) : safeProducts && safeProducts.length > 0 ? (
                <div className="space-y-4">
                  {safeProducts.map((product) => (
                        <div key={product.id} className="flex items-center space-x-4 p-4 border rounded-lg" data-testid={`product-${product.id}`}>
                          <div className="w-16 h-16 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                            {product.imageUrl ? (
                              <img 
                                src={product.imageUrl} 
                                alt={product.name} 
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gray-200">
                                <Package className="w-6 h-6 text-gray-400" />
                              </div>
                            )}
                          </div>
                          
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium text-foreground" data-testid={`text-product-name-${product.id}`}>
                                {product.name}
                              </h3>
                              {product.isPopular && (
                                <Badge variant="secondary" className="text-xs">Popular</Badge>
                              )}
                              {!product.isAvailable && (
                                <Badge variant="destructive" className="text-xs">Unavailable</Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {product.description || "No description"}
                            </p>
                            <div className="flex items-center gap-4 mt-1">
                              <span className="text-sm font-medium text-foreground">₹{parseFloat(product.price).toFixed(0)}</span>
                              {product.originalPrice && (
                                <span className="text-sm text-muted-foreground line-through">
                                  ₹{parseFloat(product.originalPrice).toFixed(0)}
                                </span>
                              )}
                              <span className="text-sm text-muted-foreground">
                                {product.category?.name || "No category"}
                              </span>
                              <span className="text-sm text-muted-foreground">
                                {product.deliveryTime} min
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => handleEditProduct(product)}
                              data-testid={`button-edit-${product.id}`}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => {
                                if (confirm('Are you sure you want to delete this product?')) {
                                  deleteProductMutation.mutate(product.id);
                                }
                              }}
                              disabled={deleteProductMutation.isPending}
                              data-testid={`button-delete-${product.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                      <h3 className="text-lg font-medium text-foreground mb-2">No products yet</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Start by creating your first product to begin selling.
                      </p>
                      <Button onClick={() => setIsProductDialogOpen(true)} data-testid="button-create-first-product">
                        <Plus className="w-4 h-4 mr-2" />
                        Create Your First Product
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ZPoints Tab */}
          <TabsContent value="zpoints" className="mt-6">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">ZPoints Management</h2>
                  <p className="text-muted-foreground">Manage user ZPoints balances and transactions</p>
                </div>
              </div>

              {/* ZPoints Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total ZPoints Issued</CardTitle>
                    <Wallet className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {users?.reduce((total, user) => total + (user.zpointsBalance || 0), 0) || 0} ZPoints
                    </div>
                    <p className="text-xs text-muted-foreground">Across all users</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Active Users with ZPoints</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {users?.filter(user => (user.zpointsBalance || 0) > 0).length || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">Users with balance</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Average Balance</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {users && users?.length > 0 ? Math.round(users.reduce((total, user) => total + (user.zpointsBalance || 0), 0) / users.length) : 0} ZPoints
                    </div>
                    <p className="text-xs text-muted-foreground">Per user</p>
                  </CardContent>
                </Card>
              </div>

              {/* User ZPoints Management */}
              <Card>
                <CardHeader>
                  <CardTitle>User ZPoints Management</CardTitle>
                  <CardDescription>View and manage ZPoints balances for all users</CardDescription>
                </CardHeader>
                <CardContent>
                                  {safeUsers && safeUsers.length > 0 ? (
                  <div className="space-y-4">
                    {safeUsers.map((user) => (
                        <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center space-x-4">
                            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                              <span className="text-purple-600 font-medium">
                                {user.firstName?.charAt(0) || user.email?.charAt(0) || 'U'}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium">
                                {user.firstName && user.lastName 
                                  ? `${user.firstName} ${user.lastName}` 
                                  : user.email}
                              </p>
                              <p className="text-sm text-muted-foreground">{user.email}</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-4">
                            <div className="text-right">
                              <p className="font-medium text-purple-600">
                                {user.zpointsBalance || 0} ZPoints
                              </p>
                              <p className="text-sm text-muted-foreground">
                                ≈ ₹{user.zpointsBalance || 0}
                              </p>
                            </div>
                            <div className="flex space-x-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  const amount = prompt('Enter ZPoints to credit:');
                                  if (amount && !isNaN(Number(amount))) {
                                    creditZPointsMutation.mutate({
                                      userId: user.id,
                                      amount: Number(amount),
                                      description: 'Admin credit'
                                    });
                                  }
                                }}
                              >
                                <Plus className="w-4 h-4 mr-1" />
                                Credit
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  const amount = prompt('Enter ZPoints to debit:');
                                  if (amount && !isNaN(Number(amount))) {
                                    debitZPointsMutation.mutate({
                                      userId: user.id,
                                      amount: Number(amount),
                                      description: 'Admin debit'
                                    });
                                  }
                                }}
                              >
                                <Minus className="w-4 h-4 mr-1" />
                                Debit
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Wallet className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                      <h3 className="text-lg font-medium text-foreground mb-2">No users found</h3>
                      <p className="text-muted-foreground">
                        No users are currently registered in the system.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="mt-6">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">Notification Management</h2>
                  <p className="text-muted-foreground">Send notifications to users and delivery partners</p>
                </div>
                <Dialog open={isNotificationDialogOpen} onOpenChange={setIsNotificationDialogOpen}>
                  <DialogTrigger asChild>
                    <Button data-testid="button-send-notification">
                      <Plus className="w-4 h-4 mr-2" />
                      Send Notification
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Send Notification</DialogTitle>
                      <DialogDescription>
                        Send a notification to users or delivery partners.
                      </DialogDescription>
                    </DialogHeader>
                    <Form {...notificationForm}>
                      <form onSubmit={notificationForm.handleSubmit(((data: NotificationFormData) => {
                        sendNotificationMutation.mutate(data);
                      }) as any)} className="space-y-4">
                        <FormField
                          control={notificationForm.control}
                          name="title"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Title</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter notification title" {...field} data-testid="input-notification-title" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={notificationForm.control}
                          name="message"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Message</FormLabel>
                              <FormControl>
                                <Textarea placeholder="Enter notification message" {...field} data-testid="input-notification-message" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={notificationForm.control}
                          name="type"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Type</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-notification-type">
                                    <SelectValue placeholder="Select notification type" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="info">Information</SelectItem>
                                  <SelectItem value="success">Success</SelectItem>
                                  <SelectItem value="warning">Warning</SelectItem>
                                  <SelectItem value="error">Error</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={notificationForm.control}
                          name="target"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Target</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-notification-target">
                                    <SelectValue placeholder="Select target audience" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="all">All Users</SelectItem>
                                  <SelectItem value="customers">Customers Only</SelectItem>
                                  <SelectItem value="partners">Delivery Partners Only</SelectItem>
                                  <SelectItem value="admins">Admins Only</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="flex justify-end gap-2">
                          <Button type="button" variant="outline" onClick={() => setIsNotificationDialogOpen(false)}>
                            Cancel
                          </Button>
                          <Button type="submit" disabled={sendNotificationMutation.isPending} data-testid="button-send-notification-submit">
                            {sendNotificationMutation.isPending ? "Sending..." : "Send Notification"}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Notifications</CardTitle>
                  <CardDescription>Recently sent notifications</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recentNotifications?.map((notification) => (
                      <div key={notification.id} className="flex items-center justify-between py-3 border-b last:border-b-0" data-testid={`notification-${notification.id}`}>
                        <div className="flex items-center space-x-3">
                          <div className={`w-2 h-2 rounded-full ${
                            (notification.type as string) === 'success' ? 'bg-green-500' :
                            (notification.type as string) === 'warning' ? 'bg-yellow-500' :
                            (notification.type as string) === 'error' ? 'bg-red-500' :
                            'bg-blue-500'
                          }`}></div>
                          <div>
                            <h4 className="font-medium text-foreground">{notification.title}</h4>
                            <p className="text-sm text-muted-foreground">{notification.message}</p>
                            <p className="text-xs text-muted-foreground">Sent to: {notification.target}</p>
                          </div>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {new Date(notification.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );

  // Handler functions for order actions
  const handleAcceptOrder = (orderId: string) => {
    acceptOrderMutation.mutate(orderId);
  };

  const handleRejectOrder = (orderId: string) => {
    const reason = prompt('Please provide a reason for rejecting this order:');
    if (reason !== null) {
      rejectOrderMutation.mutate(orderId);
    }
  };

  const handleMarkAsPaid = (orderId: string) => {
    if (confirm('Mark this order as paid?')) {
      markAsPaidMutation.mutate(orderId);
    }
  };

  const handleDeliverOrder = (orderId: string) => {
    if (confirm('Mark this order as delivered?')) {
      deliverOrderMutation.mutate(orderId);
    }
  };

  // User management handlers
  const handleDeactivateUser = (userId: string) => {
    if (confirm('Are you sure you want to deactivate this user?')) {
      deactivateUserMutation.mutate(userId);
    }
  };

  const handleActivateUser = (userId: string) => {
    if (confirm('Are you sure you want to activate this user?')) {
      activateUserMutation.mutate(userId);
    }
  };

  // Payment management handlers
  const handleConfirmPayment = (paymentId: string) => {
    if (confirm('Are you sure you want to confirm this payment?')) {
      confirmPaymentMutation.mutate(paymentId);
    }
  };

  const handleRefundPayment = (paymentId: string) => {
    if (confirm('Are you sure you want to process a refund for this payment?')) {
      refundPaymentMutation.mutate(paymentId);
    }
  };

}
