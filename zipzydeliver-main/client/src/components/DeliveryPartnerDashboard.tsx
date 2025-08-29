import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Package, 
  MapPin, 
  Clock, 
  User, 
  Phone, 
  Truck, 
  CheckCircle,
  Navigation,
  AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: string;
  deliveryAddress: string;
  customerId: string;
  createdAt: string;
  orderItems: Array<{
    id: string;
    productName: string;
    quantity: number;
    price: string;
  }>;
}

interface AvailableOrder {
  orderId: string;
  amount: number;
  customerAddress: string;
  items: Array<{ name: string; quantity: number }>;
  expiresAt: Date;
}

const statusConfig = {
  placed: { label: 'New Order', color: 'bg-blue-500', icon: Package },
  accepted: { label: 'Accepted', color: 'bg-yellow-500', icon: Clock },
  preparing: { label: 'Preparing', color: 'bg-orange-500', icon: Clock },
  out_for_delivery: { label: 'Out for Delivery', color: 'bg-purple-500', icon: Truck },
  delivered: { label: 'Delivered', color: 'bg-green-500', icon: CheckCircle },
};

export default function DeliveryPartnerDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Get available orders (dispatch results)
  const { data: availableOrders = [] } = useQuery({
    queryKey: ['/api/dispatch/available'],
    queryFn: async () => {
      // This would come from the dispatch service
      // For now, return mock data
      return [];
    },
    refetchInterval: 5000, // Refetch every 5 seconds
  });

  // Get assigned orders
  const { data: assignedOrders = [], refetch: refetchOrders } = useQuery({
    queryKey: ['/api/delivery-partner/orders'],
    queryFn: async () => {
      // This would fetch orders assigned to the current partner
      // For now, return mock data
      return [];
    },
  });

  // Accept order mutation
  const acceptOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      return apiRequest('POST', `/api/orders/${orderId}/accept`);
    },
    onSuccess: () => {
      toast({
        title: "Order Accepted",
        description: "You have successfully accepted the order.",
      });
      refetchOrders();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Accept Order",
        description: error.message || "An error occurred while accepting the order.",
        variant: "destructive",
      });
    },
  });

  // Update order status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, status, message }: { orderId: string; status: string; message?: string }) => {
      return apiRequest('POST', `/api/orders/${orderId}/status`, { status, message });
    },
    onSuccess: () => {
      toast({
        title: "Status Updated",
        description: "Order status has been updated successfully.",
      });
      refetchOrders();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Update Status",
        description: error.message || "An error occurred while updating the status.",
        variant: "destructive",
      });
    },
  });

  // Update location mutation
  const updateLocationMutation = useMutation({
    mutationFn: async ({ orderId, location }: { orderId: string; location: { lat: number; lng: number } }) => {
      return apiRequest('POST', `/api/orders/${orderId}/location`, { location });
    },
    onSuccess: () => {
      toast({
        title: "Location Updated",
        description: "Your location has been shared with the customer.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Update Location",
        description: error.message || "An error occurred while updating location.",
        variant: "destructive",
      });
    },
  });

  // Get current location
  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setCurrentLocation(location);
          
          // Update location for all assigned orders
          assignedOrders.forEach((order: Order) => {
            updateLocationMutation.mutate({ orderId: order.id, location });
          });
        },
        (error) => {
          console.error('Error getting location:', error);
          toast({
            title: "Location Error",
            description: "Unable to get your current location. Please check your browser settings.",
            variant: "destructive",
          });
        }
      );
    } else {
      toast({
        title: "Location Not Supported",
        description: "Geolocation is not supported by this browser.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    // Initialize WebSocket connection
    const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`;
    const websocket = new WebSocket(wsUrl);

    websocket.onopen = () => {
      setIsConnected(true);
      // Authenticate as delivery partner
      websocket.send(JSON.stringify({
        type: 'partner_auth',
        partnerId: 'current-partner-id', // This should come from auth context
      }));
    };

    websocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'partner_matched') {
          // New order available
          queryClient.invalidateQueries({ queryKey: ['/api/dispatch/available'] });
        } else if (data.type === 'order_accepted') {
          // Order accepted successfully
          refetchOrders();
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    websocket.onclose = () => {
      setIsConnected(false);
    };

    websocket.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsConnected(false);
    };

    setWs(websocket);

    return () => {
      websocket.close();
    };
  }, [queryClient, refetchOrders]);

  const getStatusIcon = (status: string) => {
    const config = statusConfig[status as keyof typeof statusConfig];
    return config ? React.createElement(config.icon, { className: 'w-5 h-5' }) : <Package className="w-5 h-5" />;
  };

  const getStatusColor = (status: string) => {
    const config = statusConfig[status as keyof typeof statusConfig];
    return config ? config.color : 'bg-gray-500';
  };

  const getStatusLabel = (status: string) => {
    const config = statusConfig[status as keyof typeof statusConfig];
    return config ? config.label : status;
  };

  const formatTime = (timeString: string) => {
    return new Date(timeString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Delivery Partner Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage your deliveries and track orders in real-time
          </p>
        </div>

        {/* Connection Status */}
        <div className="mb-6 flex items-center gap-4">
          <Badge variant={isConnected ? "default" : "destructive"}>
            {isConnected ? "Live Updates Active" : "Connecting..."}
          </Badge>
          
          <Button
            variant="outline"
            size="sm"
            onClick={getCurrentLocation}
            disabled={updateLocationMutation.isPending}
          >
            <MapPin className="w-4 h-4 mr-2" />
            {updateLocationMutation.isPending ? "Updating..." : "Share Location"}
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Available Orders */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Available Orders
                </CardTitle>
              </CardHeader>
              <CardContent>
                {availableOrders.length > 0 ? (
                  <div className="space-y-4">
                    {availableOrders.map((order: AvailableOrder) => (
                      <div key={order.orderId} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">Order #{order.orderId.slice(0, 8)}</h4>
                          <Badge variant="secondary">₹{order.amount}</Badge>
                        </div>
                        
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          <p><strong>Address:</strong> {order.customerAddress}</p>
                          <p><strong>Items:</strong> {order.items.map(item => `${item.name} (x${item.quantity})`).join(', ')}</p>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">
                            Expires in {Math.max(0, Math.floor((new Date(order.expiresAt).getTime() - Date.now()) / 1000 / 60))}m
                          </span>
                          <Button
                            size="sm"
                            onClick={() => acceptOrderMutation.mutate(order.orderId)}
                            disabled={acceptOrderMutation.isPending}
                          >
                            {acceptOrderMutation.isPending ? "Accepting..." : "Accept Order"}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500 dark:text-gray-400">
                      No orders available at the moment
                    </p>
                    <p className="text-sm text-gray-400 mt-1">
                      New orders will appear here automatically
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Assigned Orders */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="w-5 h-5" />
                  My Deliveries
                </CardTitle>
              </CardHeader>
              <CardContent>
                {assignedOrders.length > 0 ? (
                  <div className="space-y-4">
                    {assignedOrders.map((order: Order) => (
                      <div key={order.id} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">Order #{order.orderNumber}</h4>
                          <Badge className={getStatusColor(order.status)}>
                            {getStatusLabel(order.status)}
                          </Badge>
                        </div>
                        
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          <p><strong>Amount:</strong> ₹{order.totalAmount}</p>
                          <p><strong>Address:</strong> {order.deliveryAddress}</p>
                          <p><strong>Items:</strong> {order.orderItems.map(item => `${item.productName} (x${item.quantity})`).join(', ')}</p>
                        </div>

                        <div className="space-y-2">
                          {order.status === 'accepted' && (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateStatusMutation.mutate({ 
                                  orderId: order.id, 
                                  status: 'preparing',
                                  message: 'Order is being prepared'
                                })}
                              >
                                Mark Preparing
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateStatusMutation.mutate({ 
                                  orderId: order.id, 
                                  status: 'out_for_delivery',
                                  message: 'Order picked up and out for delivery'
                                })}
                              >
                                Out for Delivery
                              </Button>
                            </div>
                          )}
                          
                          {order.status === 'out_for_delivery' && (
                            <Button
                              size="sm"
                              onClick={() => updateStatusMutation.mutate({ 
                                orderId: order.id, 
                                status: 'delivered',
                                message: 'Order delivered successfully'
                              })}
                            >
                              Mark Delivered
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Truck className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500 dark:text-gray-400">
                      No assigned orders
                    </p>
                    <p className="text-sm text-gray-400 mt-1">
                      Accept orders from the available orders list
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Current Location Display */}
        {currentLocation && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Current Location
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  📍 {currentLocation.lat.toFixed(6)}, {currentLocation.lng.toFixed(6)}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const url = `https://www.google.com/maps?q=${currentLocation.lat},${currentLocation.lng}`;
                    window.open(url, '_blank');
                  }}
                >
                  <Navigation className="w-4 h-4 mr-2" />
                  Open in Maps
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
