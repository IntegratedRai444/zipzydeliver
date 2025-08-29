import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import Header from "@/components/Header";
import CategoryGrid from "@/components/CategoryGrid";
import ProductCard from "@/components/ProductCard";
import CartSidebar from "@/components/CartSidebar";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: string;
  originalPrice?: string | null;
  imageUrl: string | null;
  rating: string | null;
  reviewCount: number;
  isPopular: boolean;
  category: {
    id: string;
    name: string;
    color: string | null;
  } | null;
}

export default function Home() {
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [sortBy, setSortBy] = useState("popular");
  const [searchQuery, setSearchQuery] = useState("");
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Get cart items for bottom cart summary
  const { data: cartItems = [] } = useQuery<{id: string; quantity: number}[]>({
    queryKey: ['/api/cart'],
    select: (data) => data || []
  });

  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  // Recommendations
  const { data: recommendations = { items: [] as Product[] }, isLoading: recLoading } = useQuery<{ items: Product[]}>({
    queryKey: ['/api/recommendations'],
  });

  const { data: products = [], isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ['/api/products', selectedCategory && { category: selectedCategory }].filter(Boolean),
    select: (data) => {
      let filtered = data;

      // Filter by search query
      if (searchQuery) {
        filtered = filtered.filter(product => 
          product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          product.description?.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }

      // Sort products
      switch (sortBy) {
        case 'price-low':
          return filtered.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
        case 'price-high':
          return filtered.sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
        case 'rating':
          return filtered.sort((a, b) => parseFloat(b.rating || '0') - parseFloat(a.rating || '0'));
        case 'popular':
        default:
          return filtered.sort((a, b) => {
            if (a.isPopular && !b.isPopular) return -1;
            if (!a.isPopular && b.isPopular) return 1;
            return 0;
          });
      }
    }
  });

  return (
    <div className="min-h-screen bg-background">
      <Header 
        onCartClick={() => setIsCartOpen(true)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />
      
      <main className="container mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8 py-6">
        {/* Welcome Banner with Advanced Dark Theme */}
        <div className="glass-intense rounded-2xl p-8 mb-6 text-white relative overflow-hidden glow-purple">
          <div className="flex flex-col sm:flex-row items-center justify-between relative z-10">
            <div>
              <h2 className="text-3xl font-bold mb-3 gradient-text" data-testid="text-welcome">
                Welcome back, {user?.firstName || "Student"}!
              </h2>
              <p className="text-gray-300 text-lg">Lightning-fast delivery across your campus in 15-30 minutes</p>
            </div>
            <div className="mt-6 sm:mt-0">
              <div className="glass-card rounded-xl px-6 py-4 text-center pulse-glow">
                <div className="text-3xl font-bold gradient-text" data-testid="text-delivery-time">15</div>
                <div className="text-sm text-gray-400 mt-1">min delivery</div>
              </div>
            </div>
          </div>
          {/* Floating decoration elements */}
          <div className="absolute -right-12 -top-12 w-32 h-32 bg-purple-500/10 rounded-full blur-xl float-animation"></div>
          <div className="absolute -left-8 -bottom-8 w-24 h-24 bg-teal-500/10 rounded-full blur-lg float-animation" style={{animationDelay: '2s'}}></div>
        </div>

        {/* Enhanced Promotional Banners */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="glass-card rounded-2xl p-6 relative overflow-hidden card-hover neon-border">
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-2xl font-bold text-orange-400 mb-2">60% OFF</h3>
                  <p className="text-gray-300 text-sm mb-3">First order discount</p>
                  <span className="bg-orange-500/20 border border-orange-400/30 px-3 py-1 rounded-full text-xs font-medium text-orange-300">LIMITED TIME</span>
                </div>
                <div className="text-4xl opacity-20">🔥</div>
              </div>
            </div>
            <div className="absolute -right-6 -top-6 w-24 h-24 bg-orange-500/10 rounded-full blur-xl"></div>
            <div className="absolute -right-8 -bottom-8 w-28 h-28 bg-red-500/5 rounded-full blur-2xl"></div>
          </div>
          
          <div className="glass-card rounded-2xl p-6 relative overflow-hidden card-hover neon-border">
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-cyan-400 mb-2">Free Delivery</h3>
                  <p className="text-gray-300 text-sm mb-3">On orders above ₹199</p>
                  <span className="bg-cyan-500/20 border border-cyan-400/30 px-3 py-1 rounded-full text-xs font-medium text-cyan-300">CAMPUS WIDE</span>
                </div>
                <div className="text-4xl opacity-20">🚚</div>
              </div>
            </div>
            <div className="absolute -right-6 -top-6 w-20 h-20 bg-blue-500/10 rounded-full blur-xl"></div>
            <div className="absolute -right-8 -bottom-8 w-24 h-24 bg-cyan-500/5 rounded-full blur-2xl"></div>
          </div>
        </div>

        {/* Categories */}
        <CategoryGrid onCategorySelect={setSelectedCategory} selectedCategory={selectedCategory} />

        {/* Recommended for you */}
        <div className="mb-8 mt-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground">Recommended for you</h3>
          </div>
          {recLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-card rounded-xl border border-border p-4">
                  <Skeleton className="w-full h-48 mb-4" />
                  <Skeleton className="h-4 w-3/4 mb-2" />
                  <Skeleton className="h-3 w-full mb-3" />
                  <Skeleton className="h-6 w-1/2" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {(recommendations.items || []).slice(0, 8).map((p: any) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground">
              {selectedCategory ? "Filtered Products" : "Popular Items"}
            </h3>
            <div className="flex items-center space-x-2">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-48" data-testid="select-sort">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="popular">Most Popular</SelectItem>
                  <SelectItem value="price-low">Price: Low to High</SelectItem>
                  <SelectItem value="price-high">Price: High to Low</SelectItem>
                  <SelectItem value="rating">Highest Rated</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Products Grid */}
        {productsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-card rounded-xl border border-border p-4">
                <Skeleton className="w-full h-48 mb-4" />
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-3 w-full mb-3" />
                <Skeleton className="h-6 w-1/2" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
            {products.length > 0 ? (
              products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))
            ) : (
              <div className="col-span-full text-center py-12">
                <div className="text-muted-foreground mb-4">
                  <svg className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6 4h6m-6 4h6M7 8h10a2 2 0 012 2v6a2 2 0 01-2 2H7a2 2 0 01-2-2v-6a2 2 0 012-2z"></path>
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-foreground mb-2">No products found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery 
                    ? `No products match "${searchQuery}"`
                    : selectedCategory 
                    ? "No products in this category" 
                    : "No products available"
                  }
                </p>
                {(selectedCategory || searchQuery) && (
                  <button 
                    onClick={() => {
                      setSelectedCategory("");
                      setSearchQuery("");
                    }}
                    className="text-primary hover:underline"
                    data-testid="button-clear-filters"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Bottom Cart Summary */}
      {totalItems > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-30">
          <div className="max-w-7xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="bg-purple-100 p-2 rounded-lg">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4m15.6 0L5.4 5H7m0 8L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17M17 13v4a2 2 0 01-2 2H9a2 2 0 01-2-2v-4m8 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v4.01"></path>
                  </svg>
                </div>
                <div>
                  <div className="font-semibold text-foreground">{totalItems} Items</div>
                  <div className="text-sm text-muted-foreground">Added to cart</div>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Button 
                  onClick={() => setIsCartOpen(true)}
                  variant="outline"
                  className="border-purple-600 text-purple-600 hover:bg-purple-50 px-4 py-2 rounded-lg font-medium"
                  data-testid="button-view-cart-bottom"
                >
                  View Cart
                </Button>
                <Button 
                  onClick={() => window.location.href = '/checkout'}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg font-medium"
                  data-testid="button-checkout-bottom"
                >
                  Checkout
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <CartSidebar isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </div>
  );
}
