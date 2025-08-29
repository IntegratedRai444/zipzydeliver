import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import Header from "@/components/Header";
import CartSidebar from "@/components/CartSidebar";
import { Button } from "@/components/ui/button";

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
  const [isCartOpen, setIsCartOpen] = useState(true);
  const [, setLocation] = useLocation();

  const { data: cartItems = [] } = useQuery<CartItem[]>({
    queryKey: ['/api/cart'],
    select: (data) => data || []
  });

  // Redirect to home if cart is closed
  const handleCartClose = () => {
    setIsCartOpen(false);
    setLocation('/');
  };

  return (
    <div className="min-h-screen bg-background">
      <Header onCartClick={() => setIsCartOpen(true)} />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="text-center py-12">
          <div className="mb-6">
            <svg className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M3 3h2l.4 2M7 13h10l4-8H5.4m15.6 0L5.4 5H7m0 8L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17M17 13v4a2 2 0 01-2 2H9a2 2 0 01-2-2v-4m8 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v4.01"></path>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Shopping Cart</h1>
          <p className="text-muted-foreground mb-6">
            {cartItems.length === 0 
              ? "Your cart is empty. Add some items to get started!" 
              : `You have ${cartItems.length} item${cartItems.length > 1 ? 's' : ''} in your cart`
            }
          </p>
          <Button 
            onClick={() => setIsCartOpen(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white"
            data-testid="button-open-cart"
          >
            {cartItems.length === 0 ? "Start Shopping" : "View Cart"}
          </Button>
        </div>
      </main>

      <CartSidebar isOpen={isCartOpen} onClose={handleCartClose} />
    </div>
  );
}
