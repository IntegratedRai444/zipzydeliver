import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
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
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Plus, Pencil, Trash2, Package, CheckCircle, XCircle, CreditCard, Truck } from "lucide-react";

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

type ProductFormData = z.infer<typeof productFormSchema>;
type CategoryFormData = z.infer<typeof categoryFormSchema>;

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
  const [activeTab, setActiveTab] = useState("orders");

  // Redirect if not authenticated or not admin
  useEffect(() => {
    if (!isLoading && (!isAuthenticated || !user?.isAdmin)) {
      toast({
        title: "Unauthorized",
        description: "Admin access required. Redirecting...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = isAuthenticated ? "/" : "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, user?.isAdmin, toast]);

  const { data: orders = [], isLoading: ordersLoading } = useQuery<Order[]>({
    queryKey: ['/api/orders'],
    select: (data) => data || []
  });

  const { data: products = [], isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ['/api/products'],
    select: (data) => data || []
  });

  const { data: categories = [], isLoading: categoriesLoading } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
    select: (data) => data || []
  });

  // Dialog states
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  // Forms
  const productForm = useForm<ProductFormData>({
    resolver: zodResolver(productFormSchema),
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

  const categoryForm = useForm<CategoryFormData>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      name: "",
      description: "",
      icon: "",
      color: "#6366F1",
      isActive: true
    }
  });

  const updateOrderStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      await apiRequest("PUT", `/api/orders/${orderId}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      toast({
        title: "Order updated",
        description: "Order status has been updated successfully",
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
        description: "Failed to update order status",
        variant: "destructive",
      });
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
      toast({
        title: "Error",
        description: "Failed to accept order",
        variant: "destructive",
      });
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
      toast({
        title: "Error",
        description: "Failed to reject order",
        variant: "destructive",
      });
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

  const handleProductSubmit = (data: ProductFormData) => {
    if (editingProduct) {
      updateProductMutation.mutate({ id: editingProduct.id, data });
    } else {
      createProductMutation.mutate(data);
    }
  };

  const handleCategorySubmit = (data: CategoryFormData) => {
    createCategoryMutation.mutate(data);
  };

  const resetProductForm = () => {
    setEditingProduct(null);
    productForm.reset();
  };

  // Calculate stats
  const totalOrders = orders.length;
  const totalRevenue = orders.reduce((sum, order) => sum + parseFloat(order.totalAmount), 0);
  const pendingOrders = orders.filter(order => order.status === 'placed').length;
  const averageDeliveryTime = 18; // Mock value

  if (isLoading) {
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
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-2" data-testid="text-admin-title">
            Admin Panel
          </h1>
          <p className="text-muted-foreground">Manage orders, products, and view analytics</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="orders" data-testid="tab-orders">Orders</TabsTrigger>
            <TabsTrigger value="products" data-testid="tab-products">Products</TabsTrigger>
            <TabsTrigger value="analytics" data-testid="tab-analytics">Analytics</TabsTrigger>
          </TabsList>

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
                {orders.map((order) => {
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
                        <form onSubmit={categoryForm.handleSubmit(handleCategorySubmit)} className="space-y-4">
                          <FormField
                            control={categoryForm.control}
                            name="name"
                            render={({ field }) => (
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
                            render={({ field }) => (
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
                            render={({ field }) => (
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
                            render={({ field }) => (
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
                            render={({ field }) => (
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
                        <form onSubmit={productForm.handleSubmit(handleProductSubmit)} className="space-y-4">
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
                                      {categories.map((category) => (
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
                    Categories ({categories.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {categoriesLoading ? (
                    <div className="flex gap-2">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <Skeleton key={i} className="h-20 w-32" />
                      ))}
                    </div>
                  ) : categories.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {categories.map((category) => (
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
                  <CardTitle>Products ({products.length})</CardTitle>
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
                  ) : products.length > 0 ? (
                    <div className="space-y-4">
                      {products.map((product) => (
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
                      <p className="text-muted-foreground mb-4">
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

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                  <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                  </svg>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-total-orders">{totalOrders}</div>
                  <p className="text-xs text-muted-foreground">+12% from last month</p>
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
                  <div className="text-2xl font-bold" data-testid="text-total-revenue">₹{totalRevenue.toFixed(0)}</div>
                  <p className="text-xs text-muted-foreground">+8% from last month</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
                  <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-pending-orders">{pendingOrders}</div>
                  <p className="text-xs text-muted-foreground">Needs immediate attention</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg. Delivery Time</CardTitle>
                  <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                  </svg>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-avg-delivery">{averageDeliveryTime} min</div>
                  <p className="text-xs text-muted-foreground">-2 min from last month</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest order and system activities</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {orders.slice(0, 5).map((order) => (
                    <div key={order.id} className="flex items-center justify-between py-2" data-testid={`activity-${order.id}`}>
                      <div className="flex items-center space-x-3">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-foreground">
                          Order #{order.orderNumber} {statusLabels[order.status]?.toLowerCase() || order.status}
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
}
