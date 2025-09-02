import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { emitCartUpdated } from "@/lib/cartEvents";
import {
  Utensils,
  Coffee,
  CupSoda,
  Pizza,
  IceCream,
  Candy,
  ShoppingBasket,
  Pill,
  Thermometer,
  BatteryCharging,
  Plug,
  Headphones,
  HardDrive,
  Calculator as CalcIcon,
  Book,
  PenLine,
  StickyNote
} from "lucide-react";

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

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const addToCartMutation = useMutation({
    mutationFn: async () => {
      // optimistic update: add a lightweight item to cache
      queryClient.setQueryData<any>(['/api/cart'], (prev) => {
        const list = Array.isArray(prev) ? prev : (prev?.cartItems || []);
        const cartItems = Array.isArray(prev) ? prev : (prev?.cartItems || []);
        const next = [...cartItems, { id: `tmp_${product.id}_${Date.now()}`, quantity: 1, product }];
        return Array.isArray(prev) ? next : { ...(prev || {}), cartItems: next };
      });
      await apiRequest("POST", "/api/cart/add", {
        productId: product.id,
        quantity: 1
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cart'] });
      try { emitCartUpdated(); } catch {}
      toast({
        title: "Added to cart",
        description: `${product.name} has been added to your cart`,
        variant: "default",
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
        description: "Failed to add item to cart",
        variant: "destructive",
      });
    },
  });

  // Icon-only representation instead of images
  const getIconForProduct = () => {
    const name = (product.name || '').toLowerCase();
    const category = (product.category?.name || '').toLowerCase();

    // Food & drinks
    if (/(pizza|margherita)/.test(name)) return Pizza;
    if (/(burger|sandwich)/.test(name)) return Utensils;
    if (/(salad|caesar)/.test(name)) return Utensils;
    if (/(coffee|latte|cappuccino)/.test(name)) return Coffee;
    if (/(tea|juice|soda|soft drink|energy)/.test(name)) return CupSoda;
    if (/(fries|chips)/.test(name)) return Candy;
    if (/(cake|chocolate|candy)/.test(name)) return Candy;
    if (/(ice cream|sundae)/.test(name)) return IceCream;
    if (/(soup|noodle|ramen)/.test(name)) return Utensils;
    if (/(popcorn)/.test(name)) return Candy;
    if (/(grocery|snack)/.test(category)) return ShoppingBasket;

    // Medicine & health
    if (/(paracetamol|tablet|vitamin|medicine)/.test(name)) return Pill;
    if (/(thermometer|temperature)/.test(name)) return Thermometer;
    if (/(sanitizer|hand)/.test(name)) return Pill;

    // Electronics
    if (/(charger|power bank|battery)/.test(name)) return BatteryCharging;
    if (/(usb|cable|plug)/.test(name)) return Plug;
    if (/(earbud|headphone)/.test(name)) return Headphones;
    if (/(memory|hard ?drive|card)/.test(name)) return HardDrive;

    // Stationery
    if (/(calculator)/.test(name)) return CalcIcon;
    if (/(notebook|book)/.test(name)) return Book;
    if (/(pen|pencil)/.test(name)) return PenLine;
    if (/(sticky|note)/.test(name)) return StickyNote;

    // Category fallbacks
    if (category.includes('electronics')) return BatteryCharging;
    if (category.includes('medicine') || category.includes('health')) return Pill;
    if (category.includes('stationery') || category.includes('book')) return Book;
    if (category.includes('beverage') || category.includes('food')) return Utensils;

    return Utensils;
  };

  const Icon = getIconForProduct();

  const categoryColor = product.category?.color || "#6366F1";
  const categoryName = product.category?.name || "General";

  // Calculate discount percentage if there's an original price
  const hasDiscount = product.originalPrice && parseFloat(product.originalPrice) > parseFloat(product.price);
  const discountPercent = hasDiscount 
    ? Math.round(((parseFloat(product.originalPrice!) - parseFloat(product.price)) / parseFloat(product.originalPrice!)) * 100)
    : 0;

  return (
    <div className="glass-card relative rounded-2xl card-hover glow-purple card-tilt-shine" data-testid={`card-product-${product.id}`}
      onMouseMove={(e) => {
        const target = e.currentTarget as HTMLDivElement;
        const rect = target.getBoundingClientRect();
        const mx = ((e.clientX - rect.left) / rect.width) * 100;
        const my = ((e.clientY - rect.top) / rect.height) * 100;
        target.style.setProperty('--mx', `${mx}%`);
        target.style.setProperty('--my', `${my}%`);
      }}
    >
      <div className="relative">
        <div className="relative w-full overflow-hidden rounded-md">
          <div className="aspect-[4/3] w-full relative flex items-center justify-center bg-gradient-to-br from-purple-500/10 to-blue-500/10">
            <div className="absolute inset-0 bg-white/5 animate-pulse" id={`skeleton-${product.id}`}></div>
            <div className="relative z-10 flex items-center justify-center w-full h-full">
              <div className="icon-card tilt-hover w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-2xl glass-card card-tilt-shine flex items-center justify-center">
                <div className="icon-stack">
                  <div className="icon-accent">
                    <Icon className="w-16 h-16 text-blue-400/60 spin-slow" />
                  </div>
                  <Icon className="w-12 h-12 sm:w-14 sm:h-14 text-purple-300" />
                </div>
                {product.isPopular && (
                  <div className="icon-badge">
                    <svg className="w-4 h-4 text-purple-500" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M12 2l2.39 4.84L20 7.27l-3.64 3.55L17.77 16 12 13.27 6.23 16l1.41-5.18L4 7.27l5.61-.43L12 2z" />
                    </svg>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Discount Badge */}
        {hasDiscount && (
          <div className="absolute top-3 left-3 bg-red-500/90 backdrop-blur-md text-white px-3 py-1.5 rounded-lg text-xs font-bold border border-red-400/30 pulse-glow">
            {discountPercent}% OFF
          </div>
        )}
        
        {/* Popular Badge */}
        {product.isPopular && (
          <div className="absolute top-3 right-3 bg-orange-500/90 backdrop-blur-md text-white px-3 py-1.5 rounded-lg text-xs font-bold border border-orange-400/30">
            🔥 POPULAR
          </div>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-semibold text-foreground line-clamp-1" data-testid={`text-product-name-${product.id}`}>
            {product.name}
          </h4>
          <Badge 
            variant="secondary" 
            className="text-xs"
            style={{ backgroundColor: `${categoryColor}20`, color: categoryColor }}
            data-testid={`badge-category-${product.id}`}
          >
            {categoryName}
          </Badge>
        </div>
        
        {product.description && (
          <p className="text-muted-foreground text-sm mb-3 line-clamp-2" data-testid={`text-description-${product.id}`}>
            {product.description}
          </p>
        )}
        
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <span className="text-lg font-bold text-foreground" data-testid={`text-price-${product.id}`}>
              ₹{product.price}
            </span>
            {hasDiscount && (
              <span className="text-sm text-muted-foreground line-through">
                ₹{product.originalPrice}
              </span>
            )}
          </div>
          {product.rating && (
            <div className="flex items-center text-sm text-muted-foreground">
              <svg className="w-4 h-4 text-yellow-400 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
              </svg>
              <span data-testid={`text-rating-${product.id}`}>
                {parseFloat(product.rating).toFixed(1)} ({product.reviewCount})
              </span>
            </div>
          )}
        </div>
        
        <Button 
          onClick={() => addToCartMutation.mutate()}
          disabled={addToCartMutation.isPending}
          className="w-full btn-glow text-white font-medium hover:scale-105 transition-all duration-300"
          data-testid={`button-add-to-cart-${product.id}`}
        >
          {addToCartMutation.isPending ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Adding...
            </span>
          ) : (
            "Add to Cart"
          )}
        </Button>
      </div>
    </div>
  );
}
