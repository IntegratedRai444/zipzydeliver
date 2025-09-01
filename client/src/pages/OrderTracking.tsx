import { useEffect, useState } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Package, Clock, CheckCircle, Truck, MapPin, QrCode, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Map from '@/components/Map';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import type { Order, OrderItem, Product, OrderTracking as OrderTrackingType, OrderDelivery } from '@/types/schema';

interface OrderTrackingData {
  order: Order & { orderItems: (OrderItem & { product: Product })[] };
  tracking: OrderTrackingType[];
  delivery: OrderDelivery | null;
}

export default function OrderTracking() {
  const { orderId } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [showOrderQr, setShowOrderQr] = useState(false);
  const [showPaymentQr, setShowPaymentQr] = useState(false);

  const { data, isLoading } = useQuery<OrderTrackingData>({
    queryKey: ['/api/orders', orderId, 'tracking'],
    enabled: !!orderId,
    refetchInterval: 5000, // live polling for status/location updates
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!data || !data.order) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Order Not Found</h2>
          <p className="text-muted-foreground mb-4">The order you're looking for doesn't exist.</p>
          <Button onClick={() => setLocation('/orders')}>View All Orders</Button>
        </div>
      </div>
    );
  }

  const { order, tracking, delivery } = data;
  const latestLoc = [...(tracking || [])].reverse().find(t => (t as any).location?.lat && (t as any).location?.lng) as any;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'placed': return <Package className="h-5 w-5" />;
      case 'accepted': return <CheckCircle className="h-5 w-5" />;
      case 'preparing': return <Clock className="h-5 w-5" />;
      case 'out_for_delivery': return <Truck className="h-5 w-5" />;
      case 'delivered': return <CheckCircle className="h-5 w-5" />;
      default: return <Package className="h-5 w-5" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'placed': return 'bg-blue-500';
      case 'accepted': return 'bg-green-500';
      case 'preparing': return 'bg-yellow-500';
      case 'out_for_delivery': return 'bg-purple-500';
      case 'delivered': return 'bg-green-600';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center space-x-4 mb-8">
          <Button
            variant="ghost"
            onClick={() => setLocation('/orders')}
            className="p-2"
            data-testid="back-button"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Order #{order.id}</h1>
            <p className="text-muted-foreground">Track your order status and details</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Order Status & QR Codes */}
          <div className="space-y-6">
            {/* Order Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Order Status</span>
                  <Badge className={getStatusColor(order.status)} variant="secondary">
                    {order.status.replace('_', ' ').toUpperCase()}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {tracking?.map((track, index) => (
                    <div key={track.id} className="flex items-start space-x-3">
                      <div className={`p-2 rounded-full text-white ${getStatusColor(track.status)}`}>
                        {getStatusIcon(track.status)}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium">{track.status.replace('_', ' ').toUpperCase()}</h4>
                        <p className="text-sm text-muted-foreground">{track.message}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(track.createdAt!).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* QR Codes */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Access</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Button
                    variant="outline"
                    onClick={() => setShowOrderQr(!showOrderQr)}
                    className="flex flex-col items-center p-4 h-auto"
                  >
                    <QrCode className="h-6 w-6 mb-2" />
                    <span>Order QR</span>
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={() => setShowPaymentQr(!showPaymentQr)}
                    className="flex flex-col items-center p-4 h-auto"
                  >
                    <CreditCard className="h-6 w-6 mb-2" />
                    <span>Payment QR</span>
                  </Button>
                </div>
                
                {showOrderQr && order.id && (
                  <div className="text-center p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">Order Tracking QR Code</h4>
                    <img 
                                              src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=ORDER_${order.id}`} 
                      alt="Order QR Code" 
                      className="mx-auto max-w-48 max-h-48"
                    />
                    <p className="text-sm text-muted-foreground mt-2">
                      Scan to quickly access this order
                    </p>
                  </div>
                )}
                
                {showPaymentQr && order.id && (
                  <div className="text-center p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">Payment QR Code</h4>
                    <img 
                                              src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=PAYMENT_${order.id}`} 
                      alt="Payment QR Code" 
                      className="mx-auto max-w-48 max-h-48"
                    />
                    <p className="text-sm text-muted-foreground mt-2">
                      Scan to make payment for this order
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Order Details */}
          <div className="space-y-6">
            {/* Order Items */}
            <Card>
              <CardHeader>
                <CardTitle>Order Items</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {order.orderItems.map((item) => (
                    <div key={item.id} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <img
                          src={item.product.imageUrl || '/placeholder.jpg'}
                          alt={item.product.name}
                          className="w-12 h-12 object-cover rounded"
                        />
                        <div>
                          <h4 className="font-medium text-sm">{item.product.name}</h4>
                          <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                        </div>
                      </div>
                      <p className="font-medium">₹{((item.unitPrice || 0) * item.quantity).toFixed(2)}</p>
                    </div>
                  ))}
                  
                  <Separator />
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span>₹{((order.totalAmount || 0) - 20).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Delivery Fee</span>
                      <span>₹20.00</span>
                    </div>
                    {false && (
                      <div className="flex justify-between text-purple-600">
                        <span>ZPoints Used</span>
                        <span>-₹0</span>
                      </div>
                    )}
                    <Separator />
                    <div className="flex justify-between text-lg font-semibold">
                      <span>Total</span>
                      <span>₹{(order.totalAmount || 0).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Delivery Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MapPin className="h-5 w-5" />
                  <span>Delivery Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium">Delivery Address</h4>
                  <p className="text-sm text-muted-foreground">{order.deliveryAddress}</p>
                </div>
                <div>
                  <h4 className="font-medium">Phone</h4>
                  <p className="text-sm text-muted-foreground">+91 8091273304</p>
                </div>
                <div>
                  <h4 className="font-medium">Payment Method</h4>
                  <p className="text-sm text-muted-foreground capitalize">
                    {order.paymentMethod === 'zpoints' ? 'ZPoints Pay' : order.paymentMethod.replace('_', ' ')}
                  </p>
                </div>
                {order.notes && (
                  <div>
                    <h4 className="font-medium">Special Instructions</h4>
                    <p className="text-sm text-muted-foreground">{order.notes}</p>
                  </div>
                )}
                {latestLoc?.location?.lat && latestLoc?.location?.lng && (
                  <div>
                    <h4 className="font-medium mb-2">Live Location</h4>
                    <Map lat={latestLoc.location.lat} lng={latestLoc.location.lng} height="260px" apiKey={import.meta.env.VITE_MAPS_KEY || 'public'} />
                    {latestLoc.location.address && (
                      <p className="text-sm text-muted-foreground mt-2">{latestLoc.location.address}</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Chat with Delivery Partner */}
            {delivery && order.status !== 'delivered' && (
              <Card>
                <CardContent className="pt-6">
                  <Button
                    onClick={() => setLocation(`/chat/delivery/${order.id}`)}
                    className="w-full"
                    variant="outline"
                  >
                    Chat with Delivery Partner
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}