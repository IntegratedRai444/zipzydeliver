import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";

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
      await apiRequest("POST", "/api/cart/add", {
        productId: product.id,
        quantity: 1
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cart'] });
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

  // Always resolve to our local 3D icon set based on product name keywords
  const getImageUrl = () => {
    const keywordToIcon: Array<{ keywords: string[]; file: string }> = [
      { keywords: ['pizza'], file: 'Margherita_pizza_3D_c52eadee.png' },
      { keywords: ['biryani', 'mutton'], file: 'Chicken_biryani_bowl_3D_441a1a37.png' },
      { keywords: ['dosa'], file: 'Masala_dosa_plate_3D_37f8cf83.png' },
      { keywords: ['burger'], file: 'Vegetarian_burger_3D_79678194.png' },
      { keywords: ['paneer', 'masala', 'butter'], file: 'Paneer_butter_masala_3D_3198cabf.png' },
      { keywords: ['tikka', 'chicken'], file: 'Chicken_tikka_skewers_3D_8bbb3d4e.png' },
      { keywords: ['fried', 'rice'], file: 'Veg_fried_rice_3D_623e1b00.png' },
      { keywords: ['wrap'], file: 'Chicken_wrap_halved_3D_ccdd72d7.png' },
      { keywords: ['coffee'], file: 'Cold_coffee_glass_3D_6edc5772.png' },
      { keywords: ['orange', 'juice'], file: 'Orange_juice_glass_3D_506e022c.png' },
      { keywords: ['mango', 'smoothie'], file: 'Mango_smoothie_glass_3D_74760f4e.png' },
      { keywords: ['milkshake', 'chocolate'], file: 'Chocolate_milkshake_glass_3D_90dece7b.png' },
      { keywords: ['milk'], file: 'Fresh_milk_bottle_3D_1426faed.png' },
      { keywords: ['rice', 'basmati'], file: 'Basmati_rice_bag_3D_16898cc6.png' },
      { keywords: ['egg', 'eggs'], file: 'Fresh_eggs_carton_3D_4f97b5d1.png' },
      { keywords: ['oil'], file: 'Cooking_oil_bottle_3D_bde43972.png' },
      { keywords: ['bread'], file: 'Wheat_bread_loaf_3D_35d9d9fa.png' },
      { keywords: ['notebook', 'notes', 'paper'], file: 'Notebook_set_stack_3D_504a6548.png' },
      { keywords: ['pen', 'pens'], file: 'Ballpoint_pens_pack_3D_ab4ef8e3.png' },
      { keywords: ['highlighter'], file: 'Highlighter_set_colorful_3D_047f6011.png' },
      { keywords: ['geometry', 'box', 'calculator'], file: 'Geometry_box_complete_3D_3451204c.png' },
      { keywords: ['shampoo'], file: 'Shampoo_bottle_purple_3D_42a5da47.png' },
      { keywords: ['soap'], file: 'Soap_bar_white_3D_535ac7e1.png' },
      { keywords: ['toothpaste'], file: 'Toothpaste_tube_white_3D_9e095e9b.png' },
      { keywords: ['sanitizer'], file: 'Hand_sanitizer_pump_3D_bfb23cc2.png' },
      { keywords: ['thermometer'], file: 'Digital_thermometer_medical_3D_d4653a47.png' },
      { keywords: ['power', 'bank', 'charger', 'cable'], file: 'Power_bank_black_3D_c180205c.png' },
      { keywords: ['chips', 'snack'], file: 'Potato_chips_bag_3D_769fb315.png' },
      { keywords: ['pasta', 'alfredo'], file: 'Pasta_alfredo_creamy_3D_bb23a4b7.png' },
      { keywords: ['fish', 'curry'], file: 'Fish_curry_bowl_3D_3d07a1a9.png' }
    ];

    const name = product.name.toLowerCase();
    for (const mapping of keywordToIcon) {
      if (mapping.keywords.some(k => name.includes(k))) {
        return new URL(`../../../attached_assets/generated_images/${mapping.file}`, import.meta.url).href;
      }
    }

    // Default generic icon if no match
    return new URL(`../../../attached_assets/generated_images/Notebook_set_stack_3D_504a6548.png`, import.meta.url).href;
  };
  
  const imageUrl = getImageUrl();
  
  // Debug logging
  console.log(`Product: ${product.name}, Image URL: ${imageUrl}, Original: ${product.imageUrl}`);

  const categoryColor = product.category?.color || "#6366F1";
  const categoryName = product.category?.name || "General";

  // Calculate discount percentage if there's an original price
  const hasDiscount = product.originalPrice && parseFloat(product.originalPrice) > parseFloat(product.price);
  const discountPercent = hasDiscount 
    ? Math.round(((parseFloat(product.originalPrice!) - parseFloat(product.price)) / parseFloat(product.originalPrice!)) * 100)
    : 0;

  return (
    <div className="glass-card rounded-2xl overflow-hidden card-hover glow-purple card-tilt-shine" data-testid={`card-product-${product.id}`}
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
          <div className="aspect-[4/3] w-full relative">
            {/* Skeleton */}
            <div className="absolute inset-0 bg-white/5 animate-pulse" id={`skeleton-${product.id}`}></div>
            <img 
              src={imageUrl} 
              alt={product.name} 
              className="h-full w-full object-cover"
              onError={(e) => {
                console.warn(`Failed to load image for ${product.name}:`, imageUrl);
                (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop";
              }}
              onLoad={() => {
                console.log(`Successfully loaded image for ${product.name}:`, imageUrl);
                const el = document.getElementById(`skeleton-${product.id}`);
                if (el) el.style.display = 'none';
              }}
            />
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
