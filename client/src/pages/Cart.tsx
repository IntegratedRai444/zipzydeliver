import { useEffect } from "react";
import { subscribeCartUpdated } from "@/lib/cartEvents";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import Header from "@/components/Header";
// Drawer removed on this page; show full-page content only
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { getQueryFn } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

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

export default function Cart() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();

  // Redirect admin users to admin panel
  useEffect(() => {
    if (user?.isAdmin) {
      console.log('🚫 Admin user detected on cart page, redirecting to admin panel...');
      window.location.href = '/admin';
    }
  }, [user]);

  // Show loading while checking admin status
  if (user?.isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-muted-foreground">Redirecting to Admin Panel...</p>
        </div>
      </div>
    );
  }

  const { data: cartItems = [], isLoading: cartLoading } = useQuery<CartItem[]>({
    queryKey: ['/api/cart'],
    queryFn: getQueryFn({ on401: "returnNull" }),
    select: (data) => (data && Array.isArray((data as any).cartItems) ? (data as any).cartItems : []),
    refetchInterval: 300000, // Refetch every 5 minutes (reduced from 30 seconds)
    staleTime: 250000, // Data considered fresh for 4+ minutes
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
  });

  // Keep this view in sync with real-time cart updates from other components/tabs
  useEffect(() => {
    const unsub = subscribeCartUpdated(() => {
      // useQuery will refetch automatically via window event; 
      // we can force refresh by invalidating key if needed in the future
      window.requestAnimationFrame(() => {
        // noop; hook ensures re-render as cache updates
      });
    });
    return unsub;
  }, []);

  const handleStartShopping = () => setLocation('/');

  const isEmpty = !Array.isArray(cartItems) || cartItems.length === 0;
  const subtotal = Array.isArray(cartItems)
    ? cartItems.reduce((sum, it) => sum + (parseFloat(it.product?.price || '0') * (it.quantity || 0)), 0)
    : 0;
  const deliveryFee = subtotal > 0 ? 20 : 0;
  const total = subtotal + deliveryFee;

  const handleClearCart = async () => {
    try {
      await apiRequest('DELETE', '/api/cart');
      window.dispatchEvent(new CustomEvent('zipzy:cart-updated'));
      toast({ title: 'Cart cleared', description: 'Your cart is now empty.' });
      // Soft refresh by navigating to the same route
      setLocation('/cart');
    } catch (e: any) {
      toast({ title: 'Failed to clear cart', description: e?.message || 'Try again', variant: 'destructive' });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header onCartClick={() => setLocation('/cart')} />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {cartLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-600 border-t-transparent mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading your cart...</p>
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="mb-6">
              <svg className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M3 3h2l.4 2M7 13h10l4-8H5.4m15.6 0L5.4 5H7m0 8L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17M17 13v4a2 2 0 01-2 2H9a2 2 0 01-2-2v-4m8 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v4.01"></path>
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">Shopping Cart</h1>
            <p className="text-muted-foreground mb-6">
              {isEmpty
                ? "Your cart is empty. Add some items to get started!"
                : `You have ${cartItems.length} item${cartItems.length > 1 ? 's' : ''} in your cart`}
            </p>
            {isEmpty && (
              <Button 
                onClick={handleStartShopping}
                className="bg-purple-600 hover:bg-purple-700 text-white"
                data-testid="button-open-cart"
              >
                Start Shopping
              </Button>
            )}
          </div>
        )}
        {!cartLoading && !isEmpty && (
          <div className="mt-6 space-y-4 text-left">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-muted-foreground">You can remove items here and start fresh.</div>
              <Button variant="outline" onClick={handleClearCart} className="border-red-400/40 text-red-400 hover:bg-red-500/10">Clear Cart</Button>
            </div>
            {cartItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between bg-card border border-border rounded-xl p-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-purple-500/10 border border-purple-500/30 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4"/></svg>
                  </div>
                  <div>
                    <div className="font-semibold text-foreground">{item.product?.name || 'Item'}</div>
                    <div className="text-sm text-muted-foreground">Qty: {item.quantity}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="font-semibold">₹{(parseFloat(item.product?.price || '0') * (item.quantity || 0)).toFixed(2)}</div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive rounded-full"
                    onClick={async () => {
                      try {
                        await apiRequest('DELETE', `/api/cart/${item.id}`);
                        window.dispatchEvent(new CustomEvent('zipzy:cart-updated'));
                      } catch {}
                    }}
                    aria-label="Remove item"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
                  </Button>
                </div>
              </div>
            ))}

            {/* Totals + Checkout */}
            <div className="mt-4 border-t border-border pt-4">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Subtotal</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Delivery Fee</span>
                <span>₹{deliveryFee.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-lg font-semibold mt-2">
                <span>Total</span>
                <span className="text-purple-300">₹{total.toFixed(2)}</span>
              </div>
              <div className="mt-4 flex justify-end">
                <Button className="btn-glow text-white" onClick={() => setLocation('/checkout')}>
                  Proceed to Checkout
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* No bottom bar on cart page */}
    </div>
  );
}
