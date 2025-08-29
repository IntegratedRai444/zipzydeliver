import { useEffect, useState } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, CreditCard, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import type { Order, OrderItem, Product } from '@shared/schema';

export default function PaymentPage() {
  const { orderId } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'processing' | 'completed' | 'failed'>('pending');

  const { data: order, isLoading } = useQuery<Order & { orderItems: (OrderItem & { product: Product })[] }>({
    queryKey: ['/api/orders', orderId],
    enabled: !!orderId,
  });

  // Simulate payment processing for demo
  const handlePayment = async () => {
    setPaymentStatus('processing');
    
    // Simulate API call
    setTimeout(() => {
      const success = Math.random() > 0.1; // 90% success rate
      setPaymentStatus(success ? 'completed' : 'failed');
      
      if (success) {
        toast({
          title: "Payment Successful! 🎉",
          description: "Your payment has been processed successfully.",
        });
      } else {
        toast({
          title: "Payment Failed",
          description: "There was an issue processing your payment. Please try again.",
          variant: "destructive",
        });
      }
    }, 2000);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!order) {
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

  const getStatusIcon = () => {
    switch (paymentStatus) {
      case 'pending': return <Clock className="h-6 w-6 text-yellow-500" />;
      case 'processing': return <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full" />;
      case 'completed': return <CheckCircle className="h-6 w-6 text-green-500" />;
      case 'failed': return <AlertCircle className="h-6 w-6 text-red-500" />;
    }
  };

  const getStatusText = () => {
    switch (paymentStatus) {
      case 'pending': return 'Ready to Pay';
      case 'processing': return 'Processing Payment...';
      case 'completed': return 'Payment Completed';
      case 'failed': return 'Payment Failed';
    }
  };

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-2xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center space-x-4 mb-8">
          <Button
            variant="ghost"
            onClick={() => setLocation(`/orders/${orderId}`)}
            className="p-2"
            data-testid="back-button"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Payment</h1>
            <p className="text-muted-foreground">Complete payment for Order #{order.orderNumber}</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Payment Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-3">
                {getStatusIcon()}
                <span>{getStatusText()}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {paymentStatus === 'pending' && (
                <p className="text-muted-foreground">Review your order details and proceed with payment.</p>
              )}
              {paymentStatus === 'processing' && (
                <p className="text-muted-foreground">Please wait while we process your payment...</p>
              )}
              {paymentStatus === 'completed' && (
                <div className="space-y-2">
                  <p className="text-green-600 font-medium">Payment completed successfully!</p>
                  <p className="text-sm text-muted-foreground">You will receive a confirmation email shortly.</p>
                </div>
              )}
              {paymentStatus === 'failed' && (
                <div className="space-y-2">
                  <p className="text-red-600 font-medium">Payment failed. Please try again.</p>
                  <p className="text-sm text-muted-foreground">Check your payment details and try again.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Order Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
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
                    <p className="font-medium">₹{(parseFloat(item.price) * item.quantity).toFixed(2)}</p>
                  </div>
                ))}
                
                <Separator />
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>₹{(parseFloat(order.totalAmount) - parseFloat(order.deliveryFee || '0')).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Delivery Fee</span>
                    <span>₹{parseFloat(order.deliveryFee || '0').toFixed(2)}</span>
                  </div>
                  {order.zpointsUsed && order.zpointsUsed > 0 && (
                    <div className="flex justify-between text-purple-600">
                      <span>ZPoints Discount</span>
                      <span>-₹{order.zpointsUsed}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between text-lg font-semibold">
                    <span>Total Amount</span>
                    <span>₹{parseFloat(order.totalAmount).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment QR Code */}
          {order.paymentQrCode && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <CreditCard className="h-5 w-5" />
                  <span>Payment QR Code</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <img 
                  src={order.paymentQrCode} 
                  alt="Payment QR Code" 
                  className="mx-auto max-w-64 max-h-64 border rounded-lg"
                />
                <p className="text-sm text-muted-foreground mt-4">
                  Scan this QR code with your payment app to complete the transaction
                </p>
              </CardContent>
            </Card>
          )}

          {/* Payment Actions */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {paymentStatus === 'pending' && (
                  <Button
                    onClick={handlePayment}
                    className="w-full h-12 text-lg"
                    data-testid="proceed-payment"
                  >
                    Proceed with Payment • ₹{parseFloat(order.totalAmount).toFixed(2)}
                  </Button>
                )}
                
                {paymentStatus === 'processing' && (
                  <Button disabled className="w-full h-12 text-lg">
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Processing Payment...</span>
                    </div>
                  </Button>
                )}
                
                {paymentStatus === 'completed' && (
                  <Button
                    onClick={() => setLocation(`/orders/${orderId}`)}
                    className="w-full h-12 text-lg bg-green-600 hover:bg-green-700"
                  >
                    View Order Details
                  </Button>
                )}
                
                {paymentStatus === 'failed' && (
                  <div className="space-y-2">
                    <Button
                      onClick={() => setPaymentStatus('pending')}
                      className="w-full h-12 text-lg"
                    >
                      Try Again
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setLocation(`/orders/${orderId}`)}
                      className="w-full"
                    >
                      Back to Order
                    </Button>
                  </div>
                )}
                
                <p className="text-xs text-muted-foreground text-center">
                  By proceeding, you agree to our terms and conditions.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}