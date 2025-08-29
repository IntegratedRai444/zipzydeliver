import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { MapPin, Clock, Package, User, Phone, MessageCircle, Navigation, Car } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import Map from './Map';

interface EnhancedOrderTrackingProps {
  orderId: string;
}

interface OrderTrackingData {
  orderId: string;
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
  actualDeliveryTime?: string;
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
    vehicleInfo?: string;
    rating: number;
    totalDeliveries: number;
  };
  timeline: Array<{
    status: string;
    timestamp: Date;
    description: string;
    location?: {
      lat: number;
      lng: number;
    };
  }>;
  createdAt: Date;
  acceptedAt?: Date;
  preparingAt?: Date;
  outForDeliveryAt?: Date;
  deliveredAt?: Date;
}

export const EnhancedOrderTracking: React.FC<EnhancedOrderTrackingProps> = ({ orderId }) => {
  const { user } = useAuth();
  const [orderData, setOrderData] = useState<OrderTrackingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [estimatedTimeLeft, setEstimatedTimeLeft] = useState<string>('');
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Mock data for demonstration - replace with actual API calls
  useEffect(() => {
    const mockOrderData: OrderTrackingData = {
      orderId: 'order_1',
      orderNumber: '#ZP001',
      status: 'out_for_delivery',
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
      partner: {
        id: 'partner_1',
        name: 'Arjun Patel',
        phone: '+91 98765 12345',
        isStudent: true,
        currentLocation: {
          lat: 28.7042,
          lng: 77.1027
        },
        vehicleInfo: 'Walking',
        rating: 4.8,
        totalDeliveries: 156
      },
      timeline: [
        {
          status: 'placed',
          timestamp: new Date(Date.now() - 45 * 60 * 1000), // 45 minutes ago
          description: 'Order placed successfully',
          location: {
            lat: 28.7045,
            lng: 77.1030
          }
        },
        {
          status: 'accepted',
          timestamp: new Date(Date.now() - 40 * 60 * 1000), // 40 minutes ago
          description: 'Order accepted by Arjun Patel',
          location: {
            lat: 28.7041,
            lng: 77.1025
          }
        },
        {
          status: 'preparing',
          timestamp: new Date(Date.now() - 35 * 60 * 1000), // 35 minutes ago
          description: 'Order is being prepared',
          location: {
            lat: 28.7041,
            lng: 77.1025
          }
        },
        {
          status: 'out_for_delivery',
          timestamp: new Date(Date.now() - 10 * 60 * 1000), // 10 minutes ago
          description: 'Arjun is on the way with your order',
          location: {
            lat: 28.7042,
            lng: 77.1027
          }
        }
      ],
      createdAt: new Date(Date.now() - 45 * 60 * 1000),
      acceptedAt: new Date(Date.now() - 40 * 60 * 1000),
      preparingAt: new Date(Date.now() - 35 * 60 * 1000),
      outForDeliveryAt: new Date(Date.now() - 10 * 60 * 1000)
    };

    setOrderData(mockOrderData);
    setLoading(false);
  }, [orderId]);

  // Calculate current step and progress
  useEffect(() => {
    if (orderData) {
      const steps = ['placed', 'accepted', 'preparing', 'out_for_delivery', 'delivered'];
      const currentStepIndex = steps.indexOf(orderData.status);
      setCurrentStep(currentStepIndex);
    }
  }, [orderData]);

  // Update estimated time left
  useEffect(() => {
    if (orderData && orderData.status === 'out_for_delivery' && orderData.partner) {
      const updateTimeLeft = () => {
        if (orderData.outForDeliveryAt) {
          const elapsed = Date.now() - orderData.outForDeliveryAt.getTime();
          const estimatedTotal = 25 * 60 * 1000; // 25 minutes in milliseconds
          const remaining = Math.max(0, estimatedTotal - elapsed);
          
          if (remaining > 0) {
            const minutes = Math.floor(remaining / (1000 * 60));
            const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
            setEstimatedTimeLeft(`${minutes}m ${seconds}s`);
          } else {
            setEstimatedTimeLeft('Arriving soon!');
          }
        }
      };

      updateTimeLeft();
      intervalRef.current = setInterval(updateTimeLeft, 1000);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [orderData]);

  const getStatusBadgeColor = (status: string): string => {
    switch (status) {
      case 'placed': return 'bg-blue-100 text-blue-800';
      case 'accepted': return 'bg-yellow-100 text-yellow-800';
      case 'preparing': return 'bg-purple-100 text-purple-800';
      case 'out_for_delivery': return 'bg-green-100 text-green-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'placed': return <Package className="h-4 w-4" />;
      case 'accepted': return <User className="h-4 w-4" />;
      case 'preparing': return <Clock className="h-4 w-4" />;
      case 'out_for_delivery': return <Navigation className="h-4 w-4" />;
      case 'delivered': return <Package className="h-4 w-4" />;
      default: return <Package className="h-4 w-4" />;
    }
  };

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'placed': return 'Order Placed';
      case 'accepted': return 'Order Accepted';
      case 'preparing': return 'Preparing';
      case 'out_for_delivery': return 'Out for Delivery';
      case 'delivered': return 'Delivered';
      default: return status;
    }
  };

  const handleContactPartner = () => {
    if (orderData?.partner) {
      window.open(`tel:${orderData.partner.phone}`, '_self');
    }
  };

  const handleChatWithPartner = () => {
    // Implement chat functionality
    console.log('Opening chat with partner');
  };

  if (loading) {
    return (
      <div className="w-full max-w-6xl mx-auto p-6">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (error || !orderData) {
    return (
      <div className="w-full max-w-6xl mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-red-600">
              <p>{error || 'Failed to load order details'}</p>
              <Button onClick={() => window.location.reload()} className="mt-4">
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Package className="h-5 w-5" />
                <span>Order Tracking</span>
                <Badge variant="outline" className="font-mono">
                  {orderData.orderNumber}
                </Badge>
              </CardTitle>
              <div className="flex items-center space-x-2 mt-2">
                <Badge className={getStatusBadgeColor(orderData.status)}>
                  {getStatusLabel(orderData.status)}
                </Badge>
                <span className="text-sm text-gray-500">
                  Placed at {orderData.createdAt.toLocaleTimeString()}
                </span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600">
                <Clock className="h-4 w-4 inline mr-1" />
                Est. delivery: {orderData.estimatedDeliveryTime}
              </div>
              {orderData.status === 'out_for_delivery' && (
                <div className="text-sm font-medium text-green-600">
                  Arriving in: {estimatedTimeLeft}
                </div>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Progress Bar */}
      <Card>
        <CardHeader>
          <CardTitle>Delivery Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Step {currentStep + 1} of 5</span>
              <span>{Math.round(((currentStep + 1) / 5) * 100)}% Complete</span>
            </div>
            <Progress value={((currentStep + 1) / 5) * 100} className="h-3" />
            <div className="grid grid-cols-5 gap-2 text-xs">
              {['Placed', 'Accepted', 'Preparing', 'On Way', 'Delivered'].map((step, index) => (
                <div key={step} className={`text-center ${index <= currentStep ? 'text-blue-600 font-medium' : 'text-gray-400'}`}>
                  {step}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Live Map */}
      {orderData.partner && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MapPin className="h-5 w-5" />
              <span>Live Tracking</span>
              {orderData.status === 'out_for_delivery' && (
                <Badge className="bg-green-100 text-green-800 animate-pulse">
                  Live
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-96 rounded-lg overflow-hidden border">
              <Map
                lat={orderData.deliveryLocation.lat}
                lng={orderData.deliveryLocation.lng}
                height="400px"
                apiKey=""
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Partner Information */}
      {orderData.partner && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="h-5 w-5" />
              <span>Your Delivery Partner</span>
              {orderData.partner.isStudent && (
                <Badge className="bg-green-100 text-green-800">
                  Student Partner
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <User className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{orderData.partner.name}</h3>
                    <p className="text-sm text-gray-600">{orderData.partner.phone}</p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Car className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">{orderData.partner.vehicleInfo}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Package className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">{orderData.partner.totalDeliveries} deliveries completed</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm">Rating: ⭐ {orderData.partner.rating}/5</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex space-x-2">
                  <Button
                    onClick={handleContactPartner}
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                  >
                    <Phone className="h-4 w-4 mr-2" />
                    Call Partner
                  </Button>
                  <Button
                    onClick={handleChatWithPartner}
                    variant="outline"
                    className="flex-1 border-green-500 text-green-600 hover:bg-green-50"
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Chat
                  </Button>
                </div>

                {orderData.status === 'out_for_delivery' && (
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <div className="flex items-center space-x-2 text-green-800">
                      <Navigation className="h-4 w-4" />
                      <span className="font-medium">Partner is on the way!</span>
                    </div>
                    <p className="text-sm text-green-600 mt-1">
                      Estimated arrival: {estimatedTimeLeft}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Order Details */}
      <Card>
        <CardHeader>
          <CardTitle>Order Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="space-y-2">
                <div className="text-sm font-medium">Order Items:</div>
                {orderData.items.map((item, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span>{item.name} x{item.quantity}</span>
                    <span>₹{item.price}</span>
                  </div>
                ))}
                <div className="border-t pt-2">
                  <div className="flex justify-between font-medium">
                    <span>Total:</span>
                    <span>₹{orderData.totalAmount}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <div className="text-sm font-medium mb-2">Pickup Location:</div>
                <div className="flex items-center space-x-2">
                  <MapPin className="h-4 w-4 text-gray-500" />
                  <div>
                    <div className="font-medium">{orderData.pickupLocation.storeName}</div>
                    <div className="text-sm text-gray-600">{orderData.pickupLocation.address}</div>
                  </div>
                </div>
              </div>

              <div>
                <div className="text-sm font-medium mb-2">Delivery Location:</div>
                <div className="flex items-center space-x-2">
                  <MapPin className="h-4 w-4 text-gray-500" />
                  <div>
                    <div className="font-medium">{orderData.customerName}</div>
                    <div className="text-sm text-gray-600">{orderData.deliveryLocation.address}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Delivery Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {orderData.timeline.map((event, index) => (
              <div key={index} className="flex items-start space-x-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  index <= currentStep ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-500'
                }`}>
                  {getStatusIcon(event.status)}
                </div>
                <div className="flex-1">
                  <div className="font-medium">{event.description}</div>
                  <div className="text-sm text-gray-500">
                    {event.timestamp.toLocaleString()}
                  </div>
                  {event.location && (
                    <div className="text-xs text-gray-400 mt-1">
                      📍 {event.location.lat.toFixed(4)}, {event.location.lng.toFixed(4)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
