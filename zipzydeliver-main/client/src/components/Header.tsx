import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";

interface CartItem {
  id: string;
  quantity: number;
}

interface HeaderProps {
  onCartClick: () => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
}

export default function Header({ onCartClick, searchQuery, onSearchChange }: HeaderProps) {
  const { user } = useAuth();
  const [location, setLocation] = useLocation();

  const { data: cartItems = [] } = useQuery<CartItem[]>({
    queryKey: ['/api/cart'],
    select: (data) => data || []
  });

  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  return (
    <header className="glass-intense shadow-lg sticky top-0 z-40 border-b border-purple-500/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-18">
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => setLocation("/")}
              className="flex items-center space-x-3 hover:scale-105 transition-all duration-300"
              data-testid="button-home"
            >
              <div className="btn-glow rounded-xl p-3">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
                </svg>
              </div>
              <span className="text-2xl font-bold gradient-text hidden sm:block">Zipzy</span>
            </button>
            
            <div className="hidden md:flex items-center space-x-2 bg-muted rounded-lg px-3 py-1 text-sm">
              <svg className="w-4 h-4 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
              </svg>
              <span className="text-muted-foreground" data-testid="text-campus">Tech University Campus</span>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Search Bar */}
            {onSearchChange && (
              <div className="hidden sm:flex relative">
                <Input 
                  type="text" 
                  placeholder="Search for over 1000+ products" 
                  value={searchQuery || ""}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="w-80 pl-10 pr-4 py-2 rounded-full border-2 border-gray-200 focus:border-purple-400 bg-gray-50 focus:bg-white transition-all"
                  data-testid="input-search"
                />
                <svg className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                </svg>
              </div>
            )}

            {/* Cart Icon */}
            <Button 
              variant="ghost" 
              size="sm" 
              className="relative"
              onClick={onCartClick}
              data-testid="button-cart"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4m15.6 0L5.4 5H7m0 8L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17M17 13v4a2 2 0 01-2 2H9a2 2 0 01-2-2v-4m8 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v4.01"></path>
              </svg>
              {totalItems > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                  data-testid="badge-cart-count"
                >
                  {totalItems}
                </Badge>
              )}
            </Button>

            {/* Profile Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center space-x-2" data-testid="button-profile">
                  <div className="w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                    {user?.firstName?.charAt(0) || user?.email?.charAt(0) || "U"}
                  </div>
                  <span className="hidden sm:block" data-testid="text-username">
                    {user?.firstName || "User"}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => setLocation("/profile")} data-testid="link-profile">
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLocation("/orders")} data-testid="link-orders">
                  Order History
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {user?.isAdmin && (
                  <>
                    <DropdownMenuItem onClick={() => setLocation("/admin")} data-testid="link-admin">
                      Admin Panel
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem onClick={handleLogout} className="text-destructive" data-testid="button-logout">
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}
