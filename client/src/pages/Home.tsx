import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { useState, useEffect } from "react";
import Header from "@/components/Header";
import { Rocket, Timer, ShieldCheck, Truck, Coins } from "lucide-react";
import CategoryGrid from "@/components/CategoryGrid";
import ProductCard from "@/components/ProductCard";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/lib/errorHandling";

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

  // Redirect admin users to admin panel
  useEffect(() => {
    if (user?.isAdmin) {
      console.log('🚫 Admin user detected on customer page, redirecting to admin panel...');
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

  // Get cart items for bottom cart summary (unwrap server shape { success, cartItems })
  const { data: cartItems = [], error: cartError, isLoading: cartLoading } = useQuery<{ cartItems: {id: string; quantity: number}[] } | null>({
    queryKey: ['/api/cart'],
    queryFn: getQueryFn({ on401: "returnNull" }),
    select: (data) => (data && Array.isArray((data as any).cartItems) ? (data as any).cartItems : []),
    refetchInterval: 300000, // Refetch every 5 minutes (reduced from 30 seconds)
    staleTime: 250000, // Data considered fresh for 4+ minutes
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
  });

  const totalItems = Array.isArray(cartItems) 
    ? cartItems.reduce((sum, item) => sum + (item?.quantity || 0), 0)
    : 0;

  // Recommendations
  const { data: recommendations = { items: [] as Product[] }, isLoading: recLoading, error: recError } = useQuery<{ items: Product[]}>({
    queryKey: ['/api/recommendations'],
    queryFn: getQueryFn({ on401: "returnNull" }),
    refetchInterval: 300000, // Refetch every 5 minutes
    staleTime: 250000, // Data considered fresh for 4+ minutes
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
  });

  const { data: products = [], isLoading: productsLoading, error: productsError } = useQuery<{ products: Product[] }>({
    queryKey: ['/api/products', selectedCategory && { categoryId: selectedCategory }].filter(Boolean),
    select: (data) => {
      const list: Product[] = (data as any)?.products || [];
      let filtered = list;

      // Filter by search query
      if (searchQuery) {
        filtered = filtered.filter(product => 
          product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          product.description?.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }

      // Deduplicate by name+price (guards seeded duplicates)
      const seen = new Set<string>();
      filtered = filtered.filter((p) => {
        const key = `${(p.name || '').toLowerCase()}|${p.price}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      // Sort products
      switch (sortBy) {
        case 'price-low':
          return filtered.sort((a, b) => parseFloat(a.price as any) - parseFloat(b.price as any));
        case 'price-high':
          return filtered.sort((a, b) => parseFloat(b.price as any) - parseFloat(a.price as any));
        case 'rating':
          return filtered.sort((a, b) => parseFloat((b.rating as any) || '0') - parseFloat((a.rating as any) || '0'));
        case 'popular':
        default:
          return filtered.sort((a, b) => {
            if (a.isPopular && !b.isPopular) return -1;
            if (!a.isPopular && b.isPopular) return 1;
            return 0;
          });
      }
    },
    queryFn: getQueryFn({ on401: "returnNull" }),
    refetchInterval: 300000, // Refetch every 5 minutes
    staleTime: 250000, // Data considered fresh for 4+ minutes
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
  });

  return (
    <div className="min-h-screen bg-background">
      <Header 
        onCartClick={() => { window.location.href = '/cart'; }}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />
      
      <main className="container mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8 py-6 main-3d"
        onMouseMove={(e) => {
          const target = e.currentTarget as HTMLDivElement;
          const rect = target.getBoundingClientRect();
          const mx = ((e.clientX - rect.left) / rect.width) * 100;
          const my = ((e.clientY - rect.top) / rect.height) * 100;
          target.style.setProperty('--mx', `${mx}%`);
          target.style.setProperty('--my', `${my}%`);
        }}
      >
        {/* Hero Section */}
        <section className="relative rounded-3xl overflow-hidden mb-8 border border-purple-500/20 glow-purple">
          <div className="relative z-10 px-6 sm:px-10 py-10 sm:py-14 grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div>
              <span className="inline-flex items-center gap-2 text-xs font-medium px-3 py-1 rounded-full bg-purple-500/15 border border-purple-400/30 text-purple-300">
                <Rocket className="w-3.5 h-3.5" /> Zipzy Campus Delivery
              </span>
              <h1 className="mt-4 text-4xl sm:text-5xl font-extrabold leading-tight">
                <span className="gradient-text-soft">Lightning-fast</span> delivery on campus.
              </h1>
              <p className="mt-4 text-gray-300 text-base sm:text-lg max-w-xl">
                Order food, snacks, stationery, and essentials. Track in real-time. Delivered in minutes.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Button className="btn-glow text-white px-6 py-5">
                  Order Now
                </Button>
                <Button variant="outline" className="border-purple-400/40 text-purple-300 hover:bg-white/5">
                  Track Order
                </Button>
              </div>
              <div className="mt-6 grid grid-cols-3 gap-3 text-xs text-gray-300">
                <div className="flex items-center gap-2"><Timer className="w-4 h-4 text-purple-300" /> 15–30 min ETA</div>
                <div className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-purple-300" /> Secure Payments</div>
                <div className="flex items-center gap-2"><Truck className="w-4 h-4 text-purple-300" /> Live Tracking</div>
              </div>
            </div>
            <div className="relative hidden lg:block">
              <div className="absolute -top-10 -left-10 w-48 h-48 bg-purple-500/20 blur-3xl rounded-full"></div>
              <div className="absolute -bottom-10 -right-10 w-64 h-64 bg-blue-500/20 blur-3xl rounded-full"></div>
              <div className="relative">
                <div className="icon-card tilt-hover w-64 h-64 mx-auto rounded-3xl glass-card card-tilt-shine flex items-center justify-center">
                  <div className="icon-stack">
                    <Truck className="icon-accent w-28 h-28 text-blue-300/50" />
                    <Rocket className="w-20 h-20 text-purple-200" />
                  </div>
                </div>
                <div className="mt-4 text-center text-sm text-gray-300">
                  Campus-wide delivery with Zipzy Credits <Coins className="inline w-4 h-4 ml-1 text-yellow-300" />
                </div>
              </div>
            </div>
          </div>
          {/* Hero background */}
          <div className="absolute inset-0 -z-0 bg-gradient-to-br from-purple-900/40 via-purple-800/20 to-blue-900/30">
            <div className="absolute right-0 top-0 w-64 h-64 bg-purple-500/20 rounded-full blur-[100px]"></div>
            <div className="absolute left-10 bottom-0 w-72 h-72 bg-blue-500/20 rounded-full blur-[110px]"></div>
          </div>
        </section>

        {/* Order Flow removed as requested */}

        {/* Feature Highlights */}
        <section className="mb-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass-card p-5 rounded-2xl flex items-start gap-3">
            <div className="p-2 rounded-lg bg-purple-500/15 border border-purple-400/30"><Timer className="w-5 h-5 text-purple-300" /></div>
            <div>
              <div className="font-semibold">Fast Delivery</div>
              <p className="text-sm text-muted-foreground">Average <span className="text-purple-300">15–30 min</span> on campus</p>
            </div>
          </div>
          <div className="glass-card p-5 rounded-2xl flex items-start gap-3">
            <div className="p-2 rounded-lg bg-purple-500/15 border border-purple-400/30"><ShieldCheck className="w-5 h-5 text-purple-300" /></div>
            <div>
              <div className="font-semibold">Secure & Reliable</div>
              <p className="text-sm text-muted-foreground">Protected payments and verified partners</p>
            </div>
          </div>
          <div className="glass-card p-5 rounded-2xl flex items-start gap-3">
            <div className="p-2 rounded-lg bg-purple-500/15 border border-purple-400/30"><Truck className="w-5 h-5 text-purple-300" /></div>
            <div>
              <div className="font-semibold">Live Tracking</div>
              <p className="text-sm text-muted-foreground">Track your order in real-time</p>
            </div>
          </div>
          <div className="glass-card p-5 rounded-2xl flex items-start gap-3">
            <div className="p-2 rounded-lg bg-purple-500/15 border border-purple-400/30"><Coins className="w-5 h-5 text-yellow-300" /></div>
            <div>
              <div className="font-semibold">Zipzy Credits</div>
              <p className="text-sm text-muted-foreground">Earn rewards and redeem on orders</p>
            </div>
          </div>
        </section>

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
          <Button
            onClick={() => {
              // Refresh recommendations and products
              window.location.reload();
            }}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
            </svg>
            Refresh
          </Button>
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
          ) : recError ? (
            <div className="text-center py-8">
              <div className="text-red-500 mb-4">
                <svg className="h-12 w-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                </svg>
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">Failed to load recommendations</h3>
              <p className="text-sm text-muted-foreground mb-4">{getErrorMessage(recError)}</p>
              <Button onClick={() => window.location.reload()} variant="outline">Try Again</Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {(recommendations.items || []).map((p: any) => (
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
            {(products as any[]).length > 0 ? (
              // Avoid showing items already displayed in "Recommended"
              (products as any[])
                .filter((p: any) => !(recommendations?.items || []).some((r: any) => r.id === p.id))
                .map((product: any) => (
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

        {/* Bottom CTA */}
        <section className="relative rounded-2xl overflow-hidden border border-purple-500/20 glass-intense glow-purple mb-10">
          <div className="relative z-10 px-6 sm:px-10 py-8 sm:py-10 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="text-2xl sm:text-3xl font-bold">
                Hungry? Need Stationery? We got you.
              </h3>
              <p className="text-gray-300 mt-2">Place your order now and get it delivered in minutes.</p>
            </div>
            <div className="flex items-center gap-3">
              <Button className="btn-glow text-white px-6 py-5">Order Now</Button>
              <Button variant="outline" className="border-purple-400/40 text-purple-300 hover:bg-white/5">View Menu</Button>
            </div>
          </div>
          <div className="absolute inset-0 -z-0 bg-gradient-to-r from-purple-900/30 via-transparent to-blue-900/30"></div>
        </section>
      </main>

      {/* Bottom Cart Summary removed from Home to avoid distraction */}
      {/* CartSidebar removed from Home; use /cart page instead */}
    </div>
  );
}
