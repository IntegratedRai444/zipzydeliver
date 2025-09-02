import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useState, useEffect } from "react";
import { subscribeCartUpdated, emitCartUpdated } from "@/lib/cartEvents";
import PaymentMethods from "./PaymentMethods";

interface CartItem {
  id: string;
  quantity: number;
  product: {
    id: string;
    name: string;
    price: string;
    imageUrl: string | null;
    category: {
      name: string;
      color: string | null;
    } | null;
  };
}

interface CartSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CartSidebar({ isOpen, onClose }: CartSidebarProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showPaymentMethods, setShowPaymentMethods] = useState(false);

  const { data: cartItems = [], isLoading, refetch } = useQuery<CartItem[]>({
    queryKey: ['/api/cart'],
    select: (data) => data || []
  });

  // Ensure fresh data each time the drawer opens
  useEffect(() => {
    if (isOpen) {
      refetch();
    }
  }, [isOpen, refetch]);

  // Listen for cross-component/cart events
  useEffect(() => {
    const unsub = subscribeCartUpdated(() => {
      refetch();
    });
    return unsub;
  }, [refetch]);

  const updateQuantityMutation = useMutation({
    mutationFn: async ({ itemId, quantity }: { itemId: string; quantity: number }) => {
      await apiRequest("PUT", `/api/cart/${itemId}`, { quantity });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cart'] });
      try { emitCartUpdated(); } catch {}
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
        title: "Error",
        description: "Failed to update quantity",
        variant: "destructive",
      });
    },
  });

  const removeItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      await apiRequest("DELETE", `/api/cart/${itemId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cart'] });
      try { emitCartUpdated(); } catch {}
      toast({
        title: "Item removed",
        description: "Item has been removed from your cart",
      });
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
        title: "Error",
        description: "Failed to remove item",
        variant: "destructive",
      });
    },
  });

  const subtotal = Array.isArray(cartItems) 
    ? cartItems.reduce((sum, item) => sum + (parseFloat(item.product?.price || '0') * (item?.quantity || 0)), 0)
    : 0;
  const deliveryFee = subtotal > 0 ? 20 : 0;
  const total = subtotal + deliveryFee;

  const handleUpdateQuantity = (itemId: string, change: number) => {
    const item = cartItems.find(item => item.id === itemId);
    if (!item) return;

    const newQuantity = item.quantity + change;
    if (newQuantity <= 0) {
      removeItemMutation.mutate(itemId);
    } else {
      updateQuantityMutation.mutate({ itemId, quantity: newQuantity });
    }
  };

  const handleProceedToCheckout = () => {
    if (!Array.isArray(cartItems) || cartItems.length === 0) {
      toast({
        title: "Empty cart",
        description: "Add some items to your cart first",
        variant: "destructive",
      });
      return;
    }
    // Navigate to checkout page
    window.location.href = '/checkout';
  };

  // Remove old payment methods modal since we're using the new checkout page

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          onClick={onClose}
        />
      )}

      {/* Enhanced Sidebar - fullscreen on mobile/optionally desktop */}
      <div className={`fixed inset-0 z-50 w-full max-w-[100vw] bg-white md:inset-y-0 md:right-0 md:w-full md:max-w-md shadow-2xl transform transition-transform duration-300 border-l border-gray-200 ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}>
        <div className="flex flex-col h-full">
          {/* Enhanced Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-pink-50">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4m15.6 0L5.4 5H7m0 8L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17M17 13v4a2 2 0 01-2 2H9a2 2 0 01-2-2v-4m8 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v4.01"></path>
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-800" data-testid="text-cart-title">
                  Your Cart
                </h3>
                <p className="text-sm text-gray-600">{Array.isArray(cartItems) ? cartItems.length : 0} items</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl p-2" data-testid="button-close-cart">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {isLoading ? (
              <div className="space-y-6">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="flex items-center space-x-4 py-4 border-b border-gray-100">
                      <div className="w-20 h-20 bg-gray-200 rounded-xl"></div>
                      <div className="flex-1 space-y-3">
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (!Array.isArray(cartItems) || cartItems.length === 0) ? (
              <div className="text-center py-16">
                <div className="mb-6">
                  <div className="w-24 h-24 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-12 h-12 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M3 3h2l.4 2M7 13h10l4-8H5.4m15.6 0L5.4 5H7m0 8L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17M17 13v4a2 2 0 01-2 2H9a2 2 0 01-2-2v-4m8 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v4.01"></path>
                    </svg>
                  </div>
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">Your cart is empty</h3>
                <p className="text-gray-600 mb-6">Add some delicious products to get started</p>
                <Button onClick={onClose} className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl px-6 py-3" data-testid="button-continue-shopping">
                  Continue Shopping
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                {Array.isArray(cartItems) && cartItems.map((item) => (
                  <div key={item.id} className="bg-gray-50 rounded-xl p-4 border border-gray-100" data-testid={`cart-item-${item.id}`}>
                    <div className="flex items-center space-x-4">
                      <img 
                        src={(item.product && item.product.imageUrl) || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=80&h=80&fit=crop"}
                        alt={(item.product && item.product.name) || 'Item'} 
                        className="w-20 h-20 object-cover rounded-xl shadow-sm"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=80&h=80&fit=crop";
                        }}
                      />
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-800 mb-1" data-testid={`text-item-name-${item.id}`}>
                          {(item.product && item.product.name) || 'Item'}
                        </h4>
                        <p className="text-sm text-muted-foreground" data-testid={`text-item-price-${item.id}`}>
                          ₹{(item.product && item.product.price) || 0} each
                        </p>
                        <div className="flex items-center space-x-3 mt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUpdateQuantity(item.id, -1)}
                          disabled={updateQuantityMutation.isPending}
                          className="w-8 h-8 rounded-full p-0"
                          data-testid={`button-decrease-${item.id}`}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4"></path>
                          </svg>
                        </Button>
                        <span className="font-medium text-foreground w-8 text-center" data-testid={`text-quantity-${item.id}`}>
                          {item.quantity}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUpdateQuantity(item.id, 1)}
                          disabled={updateQuantityMutation.isPending}
                          className="w-8 h-8 rounded-full p-0"
                          data-testid={`button-increase-${item.id}`}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                          </svg>
                        </Button>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-foreground" data-testid={`text-item-total-${item.id}`}>
                        ₹{(parseFloat((item.product && item.product.price) || '0') * (item.quantity || 0)).toFixed(0)}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItemMutation.mutate(item.id)}
                        disabled={removeItemMutation.isPending}
                        className="text-destructive hover:text-destructive text-sm h-auto p-1 rounded-full"
                        aria-label="Remove item"
                        data-testid={`button-remove-${item.id}`}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {Array.isArray(cartItems) && cartItems.length > 0 && (
            <div className="p-6 border-t border-gray-200 bg-gradient-to-r from-purple-50 to-pink-50">
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span className="font-medium" data-testid="text-subtotal">₹{subtotal.toFixed(0)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Delivery Fee</span>
                  <span className="font-medium" data-testid="text-delivery-fee">₹{deliveryFee}</span>
                </div>
                <div className="border-t border-gray-200 pt-3">
                  <div className="flex justify-between font-bold text-gray-800 text-lg">
                    <span>Total</span>
                    <span data-testid="text-total">₹{total.toFixed(0)}</span>
                  </div>
                </div>
              </div>
              
              <Button 
                onClick={handleProceedToCheckout}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-3 rounded-xl shadow-lg transform hover:scale-105 transition-all duration-300"
                disabled={!Array.isArray(cartItems) || cartItems.length === 0}
                data-testid="button-checkout"
              >
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3"></path>
                  </svg>
                  <span>Proceed to Checkout</span>
                </div>
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
