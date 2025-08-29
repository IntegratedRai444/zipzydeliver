import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: string;
  deliveryAddress: string;
  createdAt: string;
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

const statusColors: Record<string, string> = {
  "placed": "bg-yellow-100 text-yellow-800 border-yellow-200",
  "accepted": "bg-blue-100 text-blue-800 border-blue-200",
  "preparing": "bg-orange-100 text-orange-800 border-orange-200",
  "out_for_delivery": "bg-purple-100 text-purple-800 border-purple-200",
  "delivered": "bg-green-100 text-green-800 border-green-200",
  "cancelled": "bg-red-100 text-red-800 border-red-200"
};

const statusLabels: Record<string, string> = {
  "placed": "Placed",
  "accepted": "Accepted", 
  "preparing": "Preparing",
  "out_for_delivery": "On the way",
  "delivered": "Delivered",
  "cancelled": "Cancelled"
};

export default function OrderHistory() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
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
  }, [isAuthenticated, isLoading, toast]);

  const { data: orders = [], isLoading: ordersLoading } = useQuery<Order[]>({
    queryKey: ['/api/orders'],
    select: (data) => data || []
  });

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
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-2" data-testid="text-page-title">Order History</h1>
          <p className="text-muted-foreground">Track your past and current orders</p>
        </div>

        {ordersLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-card rounded-xl p-6 border border-border">
                <div className="flex items-center justify-between mb-4">
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-48" />
                  </div>
                  <div className="text-right space-y-2">
                    <Skeleton className="h-6 w-20" />
                    <Skeleton className="h-5 w-16" />
                  </div>
                </div>
                <Skeleton className="h-16 w-full" />
              </div>
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-muted-foreground mb-4">
              <svg className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
              </svg>
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">No orders yet</h3>
            <p className="text-muted-foreground mb-4">You haven't placed any orders. Start shopping to see your order history here.</p>
            <Button 
              onClick={() => window.location.href = '/'}
              className="bg-purple-600 hover:bg-purple-700 text-white"
              data-testid="button-start-shopping"
            >
              Start Shopping
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const statusColor = statusColors[order.status] || statusColors.placed;
              const statusLabel = statusLabels[order.status] || order.status;
              
              return (
                <div key={order.id} className="bg-card rounded-xl p-6 border border-border" data-testid={`order-${order.id}`}>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-foreground" data-testid={`text-order-number-${order.id}`}>
                        Order #{order.orderNumber}
                      </h3>
                      <p className="text-sm text-muted-foreground" data-testid={`text-order-date-${order.id}`}>
                        Placed on {new Date(order.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long', 
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge 
                        variant="outline" 
                        className={statusColor}
                        data-testid={`badge-status-${order.id}`}
                      >
                        {statusLabel}
                      </Badge>
                      <p className="text-lg font-bold text-foreground mt-1" data-testid={`text-order-total-${order.id}`}>
                        ₹{parseFloat(order.totalAmount).toFixed(0)}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    {order.orderItems.map((item) => (
                      <div key={item.id} className="flex justify-between text-sm" data-testid={`order-item-${item.id}`}>
                        <span className="text-muted-foreground">
                          {item.quantity}× {item.product.name}
                        </span>
                        <span className="text-foreground">
                          ₹{(parseFloat(item.price) * item.quantity).toFixed(0)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground" data-testid={`text-delivery-address-${order.id}`}>
                      {order.status === 'delivered' ? 'Delivered to:' : 'Delivering to:'} {order.deliveryAddress}
                    </p>
                    <div className="space-x-2">
                      {order.status === 'delivered' ? (
                        <Button variant="outline" size="sm" data-testid={`button-reorder-${order.id}`}>
                          Reorder
                        </Button>
                      ) : (
                        <Button variant="outline" size="sm" data-testid={`button-track-${order.id}`}>
                          Track Order
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
