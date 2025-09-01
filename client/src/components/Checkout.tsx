import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useCart } from '@/hooks/useCart';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { 
  CreditCard, 
  Smartphone, 
  MapPin, 
  Package, 
  CheckCircle,
  QrCode,
  IndianRupee,
  Wallet
} from 'lucide-react';

interface CheckoutForm {
  paymentMethod: 'cod' | 'upi' | 'zpoints';
  deliveryAddress: string;
  deliveryInstructions: string;
  phone: string;
}

export default function Checkout() {
  const { user } = useAuth();
  const { cartItems, total, clearCart } = useCart();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch user's ZPoints balance
  const { data: zpointsBalance = 0 } = useQuery({
    queryKey: ['/api/users', user?.id, 'zpoints'],
    queryFn: async () => {
      if (!user?.id) return 0;
      const response = await apiRequest('GET', `/api/users/${user.id}/zpoints`);
      return response.balance || 0;
    },
    enabled: !!user?.id,
  });

  const canPayWithZPoints = zpointsBalance >= total;
  const [formData, setFormData] = useState<CheckoutForm>({
    paymentMethod: 'cod',
    deliveryAddress: user?.hostelAddress || '',
    deliveryInstructions: '',
    phone: user?.phone || '',
  });

  const handleInputChange = (field: keyof CheckoutForm, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to place an order.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.deliveryAddress.trim()) {
      toast({
        title: "Delivery Address Required",
        description: "Please enter your delivery address.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.phone.trim()) {
      toast({
        title: "Phone Number Required",
        description: "Please enter your phone number.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Prepare order data
      const orderData = {
        customerId: user.id,
        totalAmount: total,
        deliveryAddress: formData.deliveryAddress,
        deliveryInstructions: formData.deliveryInstructions,
        paymentMethod: formData.paymentMethod,
        paymentStatus: 'pending',
      };

      // Prepare order items
      const items = cartItems.map(item => ({
        productId: item.product.id,
        productName: item.product.name,
        quantity: item.quantity,
        unitPrice: item.product.price,
        totalPrice: item.product.price * item.quantity,
      }));

      // Create order
      const responseData = await apiRequest('POST', '/api/orders', {
        orderData,
        items,
      });

      if (responseData.success) {
        const orderId = responseData.orderId;

        // If paying with ZPoints, process payment immediately
        if (formData.paymentMethod === 'zpoints') {
          try {
            const paymentResponse = await apiRequest('POST', `/api/orders/${orderId}/pay-with-zpoints`);
            if (paymentResponse.success) {
              toast({
                title: "Order Placed & Paid Successfully!",
                description: `Order #${orderId.slice(0, 8)} paid with ${paymentResponse.zpointsUsed} ZPoints. New balance: ${paymentResponse.newBalance} ZPoints`,
                variant: "default",
              });
            } else {
              throw new Error(paymentResponse.message || 'Failed to process ZPoints payment');
            }
          } catch (paymentError: any) {
            toast({
              title: "Order Placed but Payment Failed",
              description: `Order #${orderId.slice(0, 8)} created but ZPoints payment failed: ${paymentError.message}`,
              variant: "destructive",
            });
          }
        } else {
          toast({
            title: "Order Placed Successfully!",
            description: `Your order #${orderId.slice(0, 8)} has been created.`,
            variant: "default",
          });
        }

        // Clear cart
        clearCart();
        
        // Redirect to orders page or show success message
        window.location.href = '/orders';
      } else {
        throw new Error(responseData.message || 'Failed to place order');
      }
    } catch (error: any) {
      console.error('Error placing order:', error);
      toast({
        title: "Order Failed",
        description: error.message || "An unexpected error occurred while placing your order.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPaymentIcon = (method: string) => {
    switch (method) {
      case 'cod':
        return <IndianRupee className="w-5 h-5" />;
      case 'upi':
        return <Smartphone className="w-5 h-5" />;
      default:
        return <CreditCard className="w-5 h-5" />;
    }
  };

  const getPaymentDescription = (method: string) => {
    switch (method) {
      case 'cod':
        return 'Pay when you receive your order';
      case 'upi':
        return 'Pay instantly with UPI';
      case 'zpoints':
        return 'Pay with your ZPoints balance';
      default:
        return '';
    }
  };

  if (!cartItems.length) {
    return (
      <Card className="glass-card">
        <CardContent className="p-8 text-center">
          <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-600 mb-2">Your Cart is Empty</h3>
          <p className="text-gray-500 mb-4">Add some items to your cart to proceed with checkout.</p>
          <Button onClick={() => window.location.href = '/'}>
            Continue Shopping
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold gradient-text mb-2">Checkout</h1>
        <p className="text-gray-600">Complete your order and choose payment method</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Order Summary */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Order Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {Array.isArray(cartItems) && cartItems.map((item: any) => (
              <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Package className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-medium">{item.product.name}</p>
                    <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                  </div>
                </div>
                <p className="font-semibold">₹{item.product.price * item.quantity}</p>
              </div>
            ))}
            
            <div className="border-t pt-4">
              <div className="flex items-center justify-between text-lg font-semibold">
                <span>Total Amount:</span>
                <span className="text-purple-600">₹{total}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Checkout Form */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              Complete Order
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Payment Method */}
              <div className="space-y-3">
                <Label className="text-base font-medium">Payment Method</Label>
                <RadioGroup
                  value={formData.paymentMethod}
                  onValueChange={(value: 'cod' | 'upi' | 'zpoints') => handleInputChange('paymentMethod', value)}
                  className="grid grid-cols-3 gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="cod" id="cod" />
                    <Label htmlFor="cod" className="flex items-center gap-2 cursor-pointer">
                      <IndianRupee className="w-4 h-4" />
                      Cash on Delivery
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="upi" id="upi" />
                    <Label htmlFor="upi" className="flex items-center gap-2 cursor-pointer">
                      <Smartphone className="w-4 h-4" />
                      UPI Payment
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem 
                      value="zpoints" 
                      id="zpoints" 
                      disabled={!canPayWithZPoints}
                    />
                    <Label 
                      htmlFor="zpoints" 
                      className={`flex items-center gap-2 cursor-pointer ${!canPayWithZPoints ? 'opacity-50' : ''}`}
                    >
                      <Wallet className="w-4 h-4" />
                      ZPoints ({zpointsBalance})
                    </Label>
                  </div>
                </RadioGroup>
                
                {formData.paymentMethod === 'cod' && (
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-700">
                      💡 Pay with cash when your order is delivered. No upfront payment required.
                    </p>
                  </div>
                )}
                
                {formData.paymentMethod === 'upi' && (
                  <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center gap-3">
                      <QrCode className="w-8 h-8 text-green-600" />
                      <div>
                        <p className="text-sm font-medium text-green-700">UPI ID: zipzy@upi</p>
                        <p className="text-xs text-green-600">Scan QR code or use UPI ID to pay ₹{total}</p>
                      </div>
                    </div>
                  </div>
                )}

                {formData.paymentMethod === 'zpoints' && (
                  <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                    <div className="flex items-center gap-3">
                      <Wallet className="w-8 h-8 text-purple-600" />
                      <div>
                        <p className="text-sm font-medium text-purple-700">
                          Pay with ZPoints: {total} ZPoints
                        </p>
                        <p className="text-xs text-purple-600">
                          Current balance: {zpointsBalance} ZPoints | Remaining: {zpointsBalance - total} ZPoints
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {!canPayWithZPoints && (
                  <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                    <p className="text-sm text-yellow-700">
                      ⚠️ Insufficient ZPoints. You need {total} ZPoints but have {zpointsBalance}. 
                      Contact admin to get more ZPoints or choose another payment method.
                    </p>
                  </div>
                )}
              </div>

              {/* Delivery Address */}
              <div className="space-y-2">
                <Label htmlFor="deliveryAddress" className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Delivery Address
                </Label>
                <Textarea
                  id="deliveryAddress"
                  value={formData.deliveryAddress}
                  onChange={(e) => handleInputChange('deliveryAddress', e.target.value)}
                  placeholder="Enter your hostel address, room number, or landmark"
                  className="min-h-[80px]"
                  required
                />
              </div>

              {/* Delivery Instructions */}
              <div className="space-y-2">
                <Label htmlFor="deliveryInstructions">Delivery Instructions (Optional)</Label>
                <Textarea
                  id="deliveryInstructions"
                  value={formData.deliveryInstructions}
                  onChange={(e) => handleInputChange('deliveryInstructions', e.target.value)}
                  placeholder="Any special instructions for delivery..."
                  className="min-h-[60px]"
                />
              </div>

              {/* Phone Number */}
              <div className="space-y-2">
                <Label htmlFor="phone" className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4" />
                  Phone Number
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="Enter your phone number"
                  required
                />
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full btn-glow"
                disabled={isSubmitting}
                size="lg"
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Placing Order...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5" />
                    Place Order - ₹{total}
                  </div>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
