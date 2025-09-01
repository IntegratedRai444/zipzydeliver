import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { ArrowLeft, MapPin, CreditCard, Wallet, Smartphone, HandCoins, Zap } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Separator } from './ui/separator';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import type { CartItem, Product, Category } from '@/types/schema';

export function CheckoutPage() {
  const [, setLocation] = useLocation();
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('upi');
  const [notes, setNotes] = useState('');
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Get cart items
  const { data: cartItems = [] } = useQuery<(CartItem & { product: Product & { category: Category | null } })[]>({
    queryKey: ['/api/cart'],
  });

  // Calculate totals
  const subtotal = Array.isArray(cartItems) 
    ? cartItems.reduce((sum, item) => sum + ((item.product?.price || 0) * (item?.quantity || 0)), 0)
    : 0;
  const deliveryFee = subtotal >= 199 ? 0 : 20;
  const total = subtotal + deliveryFee;

  // Checkout mutation
  const checkoutMutation = useMutation({
    mutationFn: async (orderData: any) => {
      return apiRequest('POST', '/api/orders/checkout', orderData);
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/cart'] });
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      toast({
        title: "Order Placed Successfully! 🎉",
        description: `Your order #${data.orderNumber} has been placed and will be delivered in 15-30 minutes.`,
      });
      setLocation(`/orders/${data.id}`);
    },
    onError: (error: any) => {
      console.error('Checkout error:', error);
      toast({
        title: "Checkout Failed",
        description: error.message || "Failed to place order. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleCheckout = () => {
    if (!deliveryAddress.trim()) {
      toast({
        title: "Address Required",
        description: "Please enter your delivery address.",
        variant: "destructive",
      });
      return;
    }

    if (!phone.trim()) {
      toast({
        title: "Phone Required", 
        description: "Please enter your phone number.",
        variant: "destructive",
      });
      return;
    }

    const orderData = {
      deliveryAddress,
      phone,
      paymentMethod,
      notes,
    };

    checkoutMutation.mutate(orderData);
  };

  // Redirect if cart is empty
  useEffect(() => {
    if (cartItems.length === 0) {
      setLocation('/');
    }
  }, [cartItems, setLocation]);

  if (cartItems.length === 0) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center space-x-4 mb-8">
          <Button
            variant="ghost"
            onClick={() => setLocation('/cart')}
            className="p-2"
            data-testid="back-button"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Checkout</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Order Details */}
          <div className="space-y-6">
            {/* Order Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <span>Order Summary</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Array.isArray(cartItems) && cartItems.map((item) => (
                    <div key={item.id} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <img
                          src={item.product.imageUrl || '/placeholder.jpg'}
                          alt={item.product.name}
                          className="w-12 h-12 object-cover rounded"
                        />
                        <div>
                          <h4 className="font-medium text-sm">{item.product.name}</h4>
                          <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                        </div>
                      </div>
                      <p className="font-medium">₹{((item.product.price || 0) * item.quantity).toFixed(2)}</p>
                    </div>
                  ))}
                  
                  <Separator />
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span>₹{subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Delivery Fee</span>
                      <span>{deliveryFee === 0 ? 'FREE' : `₹${deliveryFee.toFixed(2)}`}</span>
                    </div>
                    {subtotal < 199 && (
                      <p className="text-sm text-amber-600">Add ₹{(199 - subtotal).toFixed(2)} more for free delivery!</p>
                    )}
                    <Separator />
                    <div className="flex justify-between text-lg font-semibold">
                      <span>Total</span>
                      <span>₹{total.toFixed(2)}</span>
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
                  <Label htmlFor="address">Delivery Address *</Label>
                  <Textarea
                    id="address"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    placeholder="Enter your hostel/college address with room number..."
                    className="mt-2"
                    rows={3}
                    data-testid="delivery-address"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 9876543210"
                    className="mt-2"
                    data-testid="phone-number"
                  />
                </div>
                <div>
                  <Label htmlFor="notes">Special Instructions (Optional)</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Any special delivery instructions..."
                    className="mt-2"
                    rows={2}
                    data-testid="special-notes"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Payment */}
          <div className="space-y-6">
            {/* Payment Method */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <CreditCard className="h-5 w-5" />
                  <span>Payment Method</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <RadioGroup
                  value={paymentMethod}
                  onValueChange={setPaymentMethod}
                  className="space-y-4"
                  data-testid="payment-methods"
                >
                  <div className="flex items-center space-x-3 p-3 border rounded-lg">
                    <RadioGroupItem value="upi" id="upi" />
                    <Label htmlFor="upi" className="flex items-center space-x-2 cursor-pointer flex-1">
                      <Smartphone className="h-5 w-5 text-green-600" />
                      <div>
                        <div className="font-medium">UPI</div>
                        <div className="text-sm text-gray-500">PhonePe, GPay, Paytm</div>
                      </div>
                    </Label>
                  </div>

                  <div className="flex items-center space-x-3 p-3 border rounded-lg">
                    <RadioGroupItem value="card" id="card" />
                    <Label htmlFor="card" className="flex items-center space-x-2 cursor-pointer flex-1">
                      <CreditCard className="h-5 w-5 text-blue-600" />
                      <div>
                        <div className="font-medium">Credit/Debit Card</div>
                        <div className="text-sm text-gray-500">Visa, Mastercard, RuPay</div>
                      </div>
                    </Label>
                  </div>

                  <div className="flex items-center space-x-3 p-3 border rounded-lg">
                    <RadioGroupItem value="net_banking" id="net_banking" />
                    <Label htmlFor="net_banking" className="flex items-center space-x-2 cursor-pointer flex-1">
                      <Wallet className="h-5 w-5 text-purple-600" />
                      <div>
                        <div className="font-medium">Net Banking</div>
                        <div className="text-sm text-gray-500">All major banks</div>
                      </div>
                    </Label>
                  </div>

                  <div className="flex items-center space-x-3 p-3 border rounded-lg">
                    <RadioGroupItem value="cod" id="cod" />
                    <Label htmlFor="cod" className="flex items-center space-x-2 cursor-pointer flex-1">
                      <HandCoins className="h-5 w-5 text-orange-600" />
                      <div>
                        <div className="font-medium">Cash on Delivery</div>
                        <div className="text-sm text-gray-500">Pay when you receive</div>
                      </div>
                    </Label>
                  </div>

                  <div className="flex items-center space-x-3 p-3 border rounded-lg bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20">
                    <RadioGroupItem value="zpoints" id="zpoints" />
                    <Label htmlFor="zpoints" className="flex items-center space-x-2 cursor-pointer flex-1">
                      <Zap className="h-5 w-5 text-purple-600" />
                      <div>
                        <div className="font-medium text-purple-800 dark:text-purple-300">ZPoints Pay</div>
                        <div className="text-sm text-purple-600 dark:text-purple-400">Partner pays upfront, you pay later</div>
                      </div>
                    </Label>
                    <div className="bg-purple-100 dark:bg-purple-800 text-purple-800 dark:text-purple-200 px-2 py-1 rounded text-xs font-bold">
                      NEW
                    </div>
                  </div>
                </RadioGroup>
              </CardContent>
            </Card>

            {/* Place Order */}
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                    <h3 className="font-medium text-green-800 dark:text-green-400">Campus Delivery Promise</h3>
                    <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                      ✓ 15-30 minute delivery within campus
                      <br />
                      ✓ Real-time order tracking
                      <br />
                      ✓ Direct chat with delivery partner
                    </p>
                  </div>
                  
                  <Button
                    onClick={handleCheckout}
                    disabled={checkoutMutation.isPending}
                    className="w-full h-12 text-lg"
                    data-testid="place-order-button"
                  >
                    {checkoutMutation.isPending ? (
                      <span className="flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Processing...</span>
                      </span>
                    ) : (
                      `Place Order • ₹${total.toFixed(2)}`
                    )}
                  </Button>
                  
                  <p className="text-xs text-gray-500 text-center">
                    By placing this order, you agree to our terms and conditions.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CheckoutPage;