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
  AlertCircle,
  Map,
  Target,
  Route,
  Timer
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
  customerLocation?: {
    lat: number;
    lng: number;
    timestamp: Date;
  };
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

// Calculate distance between two points using Haversine formula
const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

// Calculate ETA based on distance and average speed
const calculateETA = (distance: number): number => {
  const averageSpeed = 20; // km/h for urban delivery
  return Math.ceil(distance / averageSpeed * 60); // minutes
};

export default function DeliveryPartnerDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

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

  // Get customer location for selected order
  const { data: customerLocation } = useQuery({
    queryKey: ['/api/orders', selectedOrder?.id, 'customer-location'],
    queryFn: async () => {
      if (!selectedOrder?.id) return null;
      const response = await apiRequest('GET', `/api/orders/${selectedOrder.id}/customer-location`);
      return response.location;
    },
    enabled: !!selectedOrder?.id && selectedOrder.status === 'out_for_delivery',
    refetchInterval: 10000, // Refetch every 10 seconds
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
        } else if (data.type === 'customer_location_update' && data.orderId === selectedOrder?.id) {
          // Customer location updated
          if (selectedOrder) {
            queryClient.invalidateQueries({ queryKey: ['/api/orders', selectedOrder.id, 'customer-location'] });
          }
          toast({
            title: "Customer Location Updated",
            description: "Customer location has been updated.",
          });
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
  }, [queryClient, refetchOrders, selectedOrder?.id]);

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

  // Calculate distance and ETA for selected order
  const getOrderMetrics = () => {
    if (!currentLocation || !customerLocation) return null;
    
    const distance = calculateDistance(
      currentLocation.lat,
      currentLocation.lng,
      customerLocation.lat,
      customerLocation.lng
    );
    
    const eta = calculateETA(distance);
    
    return { distance, eta };
  };

  const orderMetrics = getOrderMetrics();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4">
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Available Orders */}
          <div className="lg:col-span-1">
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
          <div className="lg:col-span-1">
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
                      <div 
                        key={order.id} 
                        className={`border rounded-lg p-4 space-y-3 cursor-pointer transition-colors ${
                          selectedOrder?.id === order.id ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20' : ''
                        }`}
                        onClick={() => setSelectedOrder(order)}
                      >
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
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateStatusMutation.mutate({ 
                                    orderId: order.id, 
                                    status: 'preparing',
                                    message: 'Order is being prepared'
                                  });
                                }}
                              >
                                Mark Preparing
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateStatusMutation.mutate({ 
                                    orderId: order.id, 
                                    status: 'out_for_delivery',
                                    message: 'Order picked up and out for delivery'
                                  });
                                }}
                              >
                                Out for Delivery
                              </Button>
                            </div>
                          )}
                          
                          {order.status === 'out_for_delivery' && (
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                updateStatusMutation.mutate({ 
                                  orderId: order.id, 
                                  status: 'delivered',
                                  message: 'Order delivered successfully'
                                });
                              }}
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

          {/* Customer Location Dashboard */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Customer Location
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedOrder && selectedOrder.status === 'out_for_delivery' ? (
                  <div className="space-y-4">
                    {customerLocation ? (
                      <>
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 text-sm">
                            <MapPin className="w-4 h-4 text-blue-600" />
                            <span className="text-gray-700 dark:text-gray-300">
                              📍 {customerLocation.lat.toFixed(4)}, {customerLocation.lng.toFixed(4)}
                            </span>
                          </div>

                          {orderMetrics && (
                            <>
                              <div className="flex items-center gap-2 text-sm">
                                <Route className="w-4 h-4 text-green-600" />
                                <span className="text-gray-700 dark:text-gray-300">
                                  Distance: {orderMetrics.distance.toFixed(1)} km
                                </span>
                              </div>

                              <div className="flex items-center gap-2 text-sm">
                                <Timer className="w-4 h-4 text-orange-600" />
                                <span className="text-gray-700 dark:text-gray-300">
                                  ETA: {orderMetrics.eta} minutes
                                </span>
                              </div>
                            </>
                          )}

                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1"
                              onClick={() => {
                                const url = `https://www.google.com/maps?q=${customerLocation.lat},${customerLocation.lng}`;
                                window.open(url, '_blank');
                              }}
                            >
                              <Navigation className="w-4 h-4 mr-2" />
                              Navigate
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1"
                              onClick={() => {
                                const url = `https://www.google.com/maps/dir/${currentLocation?.lat},${currentLocation?.lng}/${customerLocation.lat},${customerLocation.lng}`;
                                window.open(url, '_blank');
                              }}
                            >
                              <Route className="w-4 h-4 mr-2" />
                              Route
                            </Button>
                          </div>
                        </div>

                        <Separator />

                        <div className="text-xs text-gray-500">
                          <p>Last updated: {formatTime(customerLocation.timestamp)}</p>
                          <p>Customer location is being shared in real-time</p>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-8">
                        <Target className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-gray-500 dark:text-gray-400">
                          Waiting for customer location
                        </p>
                        <p className="text-sm text-gray-400 mt-1">
                          Customer will share location when ready
                        </p>
                      </div>
                    )}
                  </div>
                ) : selectedOrder ? (
                  <div className="text-center py-8">
                    <Clock className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500 dark:text-gray-400">
                      Select an order to view customer location
                    </p>
                    <p className="text-sm text-gray-400 mt-1">
                      Customer location will be available when order is out for delivery
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Map className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500 dark:text-gray-400">
                      No order selected
                    </p>
                    <p className="text-sm text-gray-400 mt-1">
                      Click on an order to view customer location
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
