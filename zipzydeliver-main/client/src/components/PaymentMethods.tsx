import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useAuth } from "@/hooks/useAuth";

interface CartItem {
  id: string;
  quantity: number;
  product: {
    id: string;
    name: string;
    price: string;
  };
}

interface PaymentMethodsProps {
  isOpen: boolean;
  onClose: () => void;
  onBack: () => void;
  cartItems: CartItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
}

export default function PaymentMethods({ 
  isOpen, 
  onClose, 
  onBack, 
  cartItems, 
  subtotal, 
  deliveryFee, 
  total 
}: PaymentMethodsProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [paymentMethod, setPaymentMethod] = useState("upi");
  const [deliveryAddress, setDeliveryAddress] = useState(user?.hostelAddress || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [notes, setNotes] = useState("");

  const createOrderMutation = useMutation({
    mutationFn: async () => {
      const orderData = {
        totalAmount: total,
        deliveryFee,
        deliveryAddress,
        phone,
        paymentMethod,
        paymentStatus: "paid", // Mock payment as successful
        notes,
        items: cartItems.map(item => ({
          productId: item.product.id,
          quantity: item.quantity,
          price: item.product.price
        }))
      };

      const response = await apiRequest("POST", "/api/orders", orderData);
      return response.json();
    },
    onSuccess: (order) => {
      queryClient.invalidateQueries({ queryKey: ['/api/cart'] });
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      toast({
        title: "Order placed successfully!",
        description: `Order #${order.orderNumber} has been placed and will be delivered in 15-30 minutes.`,
        variant: "default",
      });
      onClose();
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
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
      toast({
        title: "Order failed",
        description: "Failed to place order. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handlePlaceOrder = () => {
    if (!deliveryAddress.trim()) {
      toast({
        title: "Missing delivery address",
        description: "Please enter your delivery address",
        variant: "destructive",
      });
      return;
    }

    if (!phone.trim()) {
      toast({
        title: "Missing phone number",
        description: "Please enter your phone number",
        variant: "destructive",
      });
      return;
    }

    createOrderMutation.mutate();
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 right-0 z-50 w-full max-w-md bg-card shadow-2xl transform transition-transform duration-300 border-l border-border ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}>
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="sm" onClick={onBack} data-testid="button-back">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
                </svg>
              </Button>
              <h3 className="text-lg font-semibold text-foreground">Payment Methods</h3>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} data-testid="button-close-payment">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {/* Order Summary */}
            <div className="bg-muted rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium">Deliver to</span>
                <span className="font-bold text-foreground">₹{total}</span>
              </div>
              <p className="text-sm text-muted-foreground">Order amount</p>
            </div>

            {/* Delivery Information */}
            <div className="space-y-4">
              <h4 className="font-medium text-foreground">Delivery Information</h4>
              <div>
                <Label htmlFor="address">Delivery Address *</Label>
                <Textarea
                  id="address"
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  placeholder="Enter your hostel/room address"
                  className="mt-1"
                  data-testid="input-address"
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="mt-1"
                  data-testid="input-phone"
                />
              </div>
            </div>

            {/* UPI Payment */}
            <div className="space-y-4">
              <h4 className="font-medium text-foreground">UPI</h4>
              <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
                <div className="flex items-center space-x-3 p-3 border border-border rounded-lg">
                  <RadioGroupItem value="gpay" id="gpay" />
                  <img src="https://cdn.iconscout.com/icon/free/png-256/google-pay-3388901-2817895.png" alt="GPay" className="w-8 h-8" />
                  <label htmlFor="gpay" className="text-sm font-medium">GPay</label>
                </div>
                <div className="flex items-center space-x-3 p-3 border border-border rounded-lg">
                  <RadioGroupItem value="paytm" id="paytm" />
                  <img src="https://cdn.iconscout.com/icon/free/png-256/paytm-226448.png" alt="Paytm" className="w-8 h-8" />
                  <label htmlFor="paytm" className="text-sm font-medium">Paytm</label>
                </div>
              </RadioGroup>
              <Button variant="outline" className="w-full" data-testid="button-other-upi">
                Other UPI Options
              </Button>
            </div>

            {/* Cards */}
            <div className="space-y-4">
              <h4 className="font-medium text-foreground">Cards</h4>
              <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
                <div className="flex items-center justify-between p-3 border border-border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <RadioGroupItem value="card" id="card" />
                    <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path>
                    </svg>
                    <label htmlFor="card" className="text-sm font-medium">Credit / Debit Cards</label>
                  </div>
                  <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                  </svg>
                </div>
              </RadioGroup>
            </div>

            {/* Net Banking */}
            <div className="space-y-4">
              <h4 className="font-medium text-foreground">Net Banking</h4>
              <div className="grid grid-cols-4 gap-3">
                {["SBI", "HDFC", "ICICI", "Axis"].map((bank) => (
                  <button
                    key={bank}
                    className="p-3 border border-border rounded-lg hover:bg-muted transition-colors"
                    onClick={() => setPaymentMethod("netbanking")}
                    data-testid={`button-bank-${bank.toLowerCase()}`}
                  >
                    <div className="w-8 h-8 bg-blue-100 rounded-full mx-auto mb-2 flex items-center justify-center">
                      <span className="text-xs font-bold text-blue-600">{bank}</span>
                    </div>
                  </button>
                ))}
              </div>
              <Button variant="outline" className="w-full" data-testid="button-other-banks">
                Other Banks
              </Button>
            </div>

            {/* Special Notes */}
            <div>
              <Label htmlFor="notes">Special Instructions (Optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any special delivery instructions..."
                className="mt-1"
                rows={3}
                data-testid="input-notes"
              />
            </div>
          </div>

          {/* Order Summary Footer */}
          <div className="p-4 border-t border-border bg-muted/30">
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span data-testid="text-checkout-subtotal">₹{subtotal.toFixed(0)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Delivery Fee</span>
                <span data-testid="text-checkout-delivery">₹{deliveryFee}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <span data-testid="text-checkout-total">₹{total.toFixed(0)}</span>
              </div>
            </div>
            
            <Button 
              onClick={handlePlaceOrder}
              disabled={createOrderMutation.isPending || !deliveryAddress.trim() || !phone.trim()}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium"
              data-testid="button-place-order"
            >
              {createOrderMutation.isPending ? "Placing Order..." : "Place Order"}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
