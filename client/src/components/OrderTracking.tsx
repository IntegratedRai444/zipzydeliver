import React, { useState, useEffect } from 'react';
import { useParams } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { 
  MapPin, 
  Clock, 
  User, 
  Phone, 
  Truck, 
  CheckCircle, 
  AlertCircle,
  Navigation,
  Package,
  Map,
  Eye,
  EyeOff,
  Share2,
  Shield
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface OrderTracking {
  id: string;
  orderId: string;
  status: string;
  message: string;
  location: any;
  deliveryPartnerId: string | null;
  createdAt: string;
}

interface OrderDelivery {
  id: string;
  orderId: string;
  deliveryPartnerId: string;
  assignedAt: string;
  pickedUpAt: string | null;
  deliveredAt: string | null;
  status: string;
  estimatedDeliveryTime: number;
  actualDeliveryTime: number | null;
  deliveryNotes: string | null;
}

interface DeliveryPartner {
  id: string;
  name: string;
  phone: string;
  vehicleType: string;
  rating: number;
  currentLocation: any;
}

const statusConfig = {
  placed: { label: 'Order Placed', color: 'bg-blue-500', icon: Package },
  accepted: { label: 'Order Accepted', color: 'bg-yellow-500', icon: CheckCircle },
  preparing: { label: 'Preparing', color: 'bg-orange-500', icon: Clock },
  out_for_delivery: { label: 'Out for Delivery', color: 'bg-purple-500', icon: Truck },
  delivered: { label: 'Delivered', color: 'bg-green-500', icon: CheckCircle },
  cancelled: { label: 'Cancelled', color: 'bg-red-500', icon: AlertCircle },
};

export default function OrderTracking() {
  const { id } = useParams();
  const { toast } = useToast();
  const [isConnected, setIsConnected] = useState(false);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [customerLocation, setCustomerLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocationSharing, setIsLocationSharing] = useState(false);
  const [locationPermission, setLocationPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt');

  // Fetch order tracking data
  const { data: trackingData, refetch } = useQuery({
    queryKey: ['/api/orders', id, 'tracking'],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/orders/${id}/tracking`);
      return response;
    },
    refetchInterval: 10000, // Refetch every 10 seconds
  });

  // Fetch order details
  const { data: orderData } = useQuery({
    queryKey: ['/api/orders', id],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/orders/${id}`);
      return response;
    },
  });

  // Fetch delivery partner details if assigned
  const { data: partnerData } = useQuery({
    queryKey: ['/api/delivery-partners', trackingData?.delivery?.deliveryPartnerId],
    queryFn: async () => {
      if (!trackingData?.delivery?.deliveryPartnerId) return null;
      const responseData = await apiRequest('GET', `/api/delivery-partners/${trackingData.delivery.deliveryPartnerId}`);
      return responseData;
    },
    enabled: !!trackingData?.delivery?.deliveryPartnerId,
  });

  // Share customer location mutation
  const shareLocationMutation = useMutation({
    mutationFn: async ({ orderId, location }: { orderId: string; location: { lat: number; lng: number } }) => {
      return apiRequest('POST', `/api/orders/${orderId}/customer-location`, { location });
    },
    onSuccess: () => {
      toast({
        title: "Location Shared",
        description: "Your location has been shared with the delivery partner.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Share Location",
        description: error.message || "An error occurred while sharing location.",
        variant: "destructive",
      });
    },
  });

  // Get customer location
  const getCustomerLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setCustomerLocation(location);
          setLocationPermission('granted');
          
          // Share location with delivery partner
          if (id && isLocationSharing) {
            shareLocationMutation.mutate({ orderId: id, location });
          }
        },
        (error) => {
          console.error('Error getting location:', error);
          setLocationPermission('denied');
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

  // Start location sharing
  const startLocationSharing = () => {
    setIsLocationSharing(true);
    getCustomerLocation();
    
    // Set up continuous location updates
    if (navigator.geolocation && id) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setCustomerLocation(location);
          
          // Share updated location
          shareLocationMutation.mutate({ orderId: id, location });
        },
        (error) => {
          console.error('Error watching location:', error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 30000, // Update every 30 seconds
        }
      );

      // Store watch ID for cleanup
      return () => navigator.geolocation.clearWatch(watchId);
    }
  };

  // Stop location sharing
  const stopLocationSharing = () => {
    setIsLocationSharing(false);
    toast({
      title: "Location Sharing Stopped",
      description: "Your location is no longer being shared with the delivery partner.",
    });
  };

  useEffect(() => {
    if (!id) return;

    // Initialize WebSocket connection for real-time updates
    const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`;
    const websocket = new WebSocket(wsUrl);

    websocket.onopen = () => {
      setIsConnected(true);
      // Subscribe to order updates
      websocket.send(JSON.stringify({
        type: 'subscribe_order',
        orderId: id,
        userId: 'current-user-id', // This should come from auth context
        isPartner: false
      }));
    };

    websocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'order_status_update' || data.type === 'location_update') {
          // Refetch tracking data when we receive updates
          refetch();
        } else if (data.type === 'partner_request_location') {
          // Partner is requesting customer location
          toast({
            title: "Location Request",
            description: "Your delivery partner is requesting your location for better service.",
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
  }, [id, refetch]);

  if (!trackingData) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading order tracking...</p>
          </div>
        </div>
      </div>
    );
  }

  const { tracking, delivery } = trackingData;
  const order = orderData;
  const partner = partnerData;

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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Order Tracking
          </h1>
            <p className="text-gray-600 dark:text-gray-400">
            Track your order #{id?.slice(0, 8)} in real-time
            </p>
          </div>

        {/* Connection Status */}
        <div className="mb-6">
          <Badge variant={isConnected ? "default" : "destructive"}>
            {isConnected ? "Live Updates Active" : "Connecting..."}
          </Badge>
        </div>

        {/* Customer Location Sharing */}
        {delivery?.deliveryPartnerId && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Map className="w-5 h-5" />
                Location Sharing
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white mb-1">
                      Share Your Location
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Help your delivery partner find you faster by sharing your location
                    </p>
                  </div>
                  <Switch
                    checked={isLocationSharing}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        startLocationSharing();
                      } else {
                        stopLocationSharing();
                      }
                    }}
                  />
                </div>

                {locationPermission === 'denied' && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    <div>
                      <p className="text-sm font-medium text-red-800 dark:text-red-200">
                        Location Access Denied
                      </p>
                      <p className="text-xs text-red-600 dark:text-red-300">
                        Please enable location access in your browser settings
                      </p>
                    </div>
                  </div>
                )}

                {customerLocation && (
                  <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <MapPin className="w-5 h-5 text-green-600" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-green-800 dark:text-green-200">
                        Location Shared
                      </p>
                      <p className="text-xs text-green-600 dark:text-green-300">
                        📍 {customerLocation.lat.toFixed(4)}, {customerLocation.lng.toFixed(4)}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const url = `https://www.google.com/maps?q=${customerLocation.lat},${customerLocation.lng}`;
                        window.open(url, '_blank');
                      }}
                    >
                      <Navigation className="w-4 h-4" />
                    </Button>
                  </div>
                )}

                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Shield className="w-3 h-3" />
                  <span>Your location is only shared with your delivery partner</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Order Status Timeline */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Order Progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {tracking.map((track: OrderTracking, index: number) => (
                    <div key={track.id} className="flex items-start gap-4">
                      <div className={`w-3 h-3 rounded-full mt-2 ${getStatusColor(track.status)}`}></div>
                      <div className="flex-1">
                  <div className="flex items-center justify-between">
                          <h4 className="font-medium text-gray-900 dark:text-white">
                            {getStatusLabel(track.status)}
                          </h4>
                          <span className="text-sm text-gray-500">
                            {formatTime(track.createdAt)}
                          </span>
                  </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {track.message}
                        </p>
                        {track.location && (
                          <div className="mt-2 text-xs text-gray-500">
                            📍 {track.location.lat.toFixed(4)}, {track.location.lng.toFixed(4)}
                    </div>
                  )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Delivery Partner Info */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Delivery Partner
                </CardTitle>
              </CardHeader>
              <CardContent>
                {partner ? (
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
                        <User className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                          </div>
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          {partner.name}
                              </h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                          {partner.vehicleType}
                        </p>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="w-4 h-4 text-gray-500" />
                        <span className="text-gray-700 dark:text-gray-300">{partner.phone}</span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm">
                        <Truck className="w-4 h-4 text-gray-500" />
                        <span className="text-gray-700 dark:text-gray-300">
                          Rating: {partner.rating}/5.0
                        </span>
                      </div>

                      {delivery?.estimatedDeliveryTime && (
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="w-4 h-4 text-gray-500" />
                          <span className="text-gray-700 dark:text-gray-300">
                            ETA: {delivery.estimatedDeliveryTime} minutes
                          </span>
                        </div>
                      )}
                    </div>

                    {partner.currentLocation && (
                      <>
                        <Separator />
                        <div className="space-y-2">
                          <h5 className="text-sm font-medium text-gray-900 dark:text-white">
                            Current Location
                          </h5>
                          <div className="text-xs text-gray-600 dark:text-gray-400">
                            📍 {partner.currentLocation.lat.toFixed(4)}, {partner.currentLocation.lng.toFixed(4)}
                          </div>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="w-full"
                            onClick={() => {
                              // Open in maps app
                              const url = `https://www.google.com/maps?q=${partner.currentLocation.lat},${partner.currentLocation.lng}`;
                              window.open(url, '_blank');
                            }}
                          >
                            <Navigation className="w-4 h-4 mr-2" />
                            Open in Maps
                          </Button>
                        </div>
                      </>
                    )}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                    <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500 dark:text-gray-400">
                      Finding a delivery partner...
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Order Summary */}
            {order && (
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle className="text-lg">Order Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Order Total</span>
                      <span className="font-medium">₹{order.totalAmount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Delivery Fee</span>
                      <span className="font-medium">₹{order.deliveryFee || 20}</span>
                        </div>
                    <Separator />
                    <div className="flex justify-between font-medium">
                      <span>Total</span>
                      <span>₹{(parseFloat(order.totalAmount) + (order.deliveryFee || 20)).toFixed(2)}</span>
                      </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}