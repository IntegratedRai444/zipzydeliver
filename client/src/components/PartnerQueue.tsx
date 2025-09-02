import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { MapPin, Clock, Package, User, Star, AlertCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface AvailableOrder {
  orderId: string;
  orderNumber: string;
  customerName: string;
  destination: {
    lat: number;
    lng: number;
    address: string;
  };
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  totalAmount: number;
  estimatedDeliveryTime: string;
  distance: number;
  expiresAt: Date;
  isStudentPriority: boolean;
}

interface PartnerQueueProps {
  onOrderAccept: (orderId: string) => void;
}

const PartnerQueue: React.FC<PartnerQueueProps> = ({ onOrderAccept }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch available orders from API
  const { data: availableOrders = [], isLoading } = useQuery<AvailableOrder[]>({
    queryKey: ['/api/dispatch/active'],
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', '/api/dispatch/active');
        if (Array.isArray(response)) {
          return response.map((dispatch: any) => ({
            orderId: dispatch.orderId,
            orderNumber: dispatch.orderNumber,
            customerName: dispatch.customerName,
            destination: dispatch.destination,
            items: dispatch.items,
            totalAmount: dispatch.totalAmount,
            estimatedDeliveryTime: dispatch.estimatedDeliveryTime,
            distance: dispatch.distance,
            expiresAt: new Date(dispatch.expiresAt),
            isStudentPriority: dispatch.isStudentPriority
          }));
        }
        return [];
      } catch (error) {
        console.error('Failed to fetch available orders:', error);
        return [];
      }
    },
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Accept order mutation
  const acceptOrder = useMutation({
    mutationFn: async (orderId: string) => {
      return apiRequest('POST', `/api/dispatch/${orderId}/accept`);
    },
    onSuccess: (data, orderId) => {
      toast({
        title: "Order Accepted!",
        description: `You have successfully accepted order #${orderId}`,
      });
      onOrderAccept(orderId);
      queryClient.invalidateQueries({ queryKey: ['/api/dispatch/active'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to accept order. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleAcceptOrder = (orderId: string) => {
    acceptOrder.mutate(orderId);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-8 text-destructive">
        <AlertCircle className="h-5 w-5 mr-2" />
        {error}
      </div>
    );
  }

  if (availableOrders.length === 0) {
    return (
      <div className="text-center p-8 text-muted-foreground">
        <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <h3 className="text-lg font-semibold mb-2">No Orders Available</h3>
        <p>Check back later for new delivery opportunities!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Available Orders</h2>
        <Badge variant="secondary" className="text-sm">
          {availableOrders.length} orders
        </Badge>
      </div>

      <div className="grid gap-4">
        {availableOrders.map((order) => (
          <Card key={order.orderId} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{order.orderNumber}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Customer: {order.customerName}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {order.isStudentPriority && (
                    <Badge variant="default" className="bg-green-100 text-green-800">
                      <Star className="h-3 w-3 mr-1" />
                      Student Priority
                    </Badge>
                  )}
                  <Badge variant="outline">
                    ₹{order.totalAmount}
                  </Badge>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-3">
              {/* Order Items */}
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Items:</h4>
                <div className="space-y-1">
                  {order.items.map((item, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span>{item.name} × {item.quantity}</span>
                      <span>₹{item.price}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Location & Time */}
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  <span>{order.destination.address}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>{order.estimatedDeliveryTime}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Package className="h-4 w-4" />
                  <span>{order.distance.toFixed(1)} km</span>
                </div>
              </div>

              {/* Expiry Warning */}
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Expires in: {Math.max(0, Math.floor((order.expiresAt.getTime() - Date.now()) / 60000))} min
                </div>
                <Button
                  onClick={() => handleAcceptOrder(order.orderId)}
                  disabled={acceptOrder.isPending}
                  className="bg-primary hover:bg-primary/90"
                >
                  {acceptOrder.isPending ? 'Accepting...' : 'Accept Order'}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default PartnerQueue;
