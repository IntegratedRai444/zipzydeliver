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

  const totalItems = Array.isArray(cartItems) 
    ? cartItems.reduce((sum, item) => sum + (item?.quantity || 0), 0)
    : 0;

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  return (
    <header className="bg-gradient-to-b from-[#0f0f19]/90 to-[#111222]/85 backdrop-blur-xl shadow-lg sticky top-0 z-40 border-b border-purple-500/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <div className="flex items-center space-x-6">
            <button 
              onClick={() => setLocation("/")}
              className="flex items-center space-x-3 hover:scale-105 transition-all duration-300 group"
              data-testid="button-home"
            >
              <div className="bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl p-3 shadow-lg group-hover:shadow-xl transition-all duration-300">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
                </svg>
              </div>
              <span className="text-3xl font-black bg-gradient-to-r from-purple-600 via-pink-600 to-purple-800 bg-clip-text text-transparent hidden sm:block">ZIPZY</span>
            </button>
            
            <div className="hidden md:flex items-center space-x-2 bg-gradient-to-r from-purple-900/20 to-pink-900/20 rounded-xl px-4 py-2 text-sm border border-purple-500/30">
              <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
              </svg>
              <span className="text-purple-700 font-medium" data-testid="text-campus">Tech University Campus</span>
            </div>
          </div>

          <div className="flex items-center space-x-6">
            {/* Search Bar */}
            {onSearchChange && (
              <div className="hidden sm:flex relative group">
                <Input 
                  type="text" 
                  placeholder="Search for over 1000+ products..." 
                  value={searchQuery || ""}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="w-96 pl-12 pr-4 py-3 rounded-xl border-2 border-purple-700/40 focus:border-purple-400 bg-[#1a1b2a] text-gray-200 placeholder:text-gray-400 focus:bg-[#1f2030] transition-all duration-300 shadow-sm group-hover:shadow-md"
                  data-testid="input-search"
                />
                <svg className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-purple-400 transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                </svg>
              </div>
            )}

            {/* Cart Icon */}
            <Button 
              variant="ghost" 
              size="sm" 
              className="relative p-3 hover:bg-white/5 rounded-xl transition-all duration-300 group"
              onClick={onCartClick}
              data-testid="button-cart"
            >
              <svg className="w-6 h-6 text-gray-300 group-hover:text-purple-300 transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4m15.6 0L5.4 5H7m0 8L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17M17 13v4a2 2 0 01-2 2H9a2 2 0 01-2-2v-4m8 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v4.01"></path>
              </svg>
              {totalItems > 0 && (
                <Badge 
                  className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-gradient-to-r from-red-500 to-pink-500 text-white border-2 border-white shadow-lg flex items-center justify-center text-xs font-bold"
                  data-testid="badge-cart-count"
                >
                  {totalItems}
                </Badge>
              )}
            </Button>

            {/* Profile Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center space-x-3 p-2 hover:bg-white/5 rounded-xl transition-all duration-300 group" data-testid="button-profile">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 text-white rounded-full flex items-center justify-center text-sm font-bold shadow-lg/20 group-hover:shadow-xl transition-all duration-300">
                    {user?.firstName?.charAt(0) || user?.email?.charAt(0) || "U"}
                  </div>
                  <div className="hidden sm:block text-left">
                    <div className="font-semibold text-gray-200" data-testid="text-username">
                      {user?.firstName || "User"}
                    </div>
                    <div className="text-xs text-gray-400">
                      {user?.email}
                    </div>
                  </div>
                  <svg className="w-4 h-4 text-gray-400 group-hover:text-purple-300 transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                  </svg>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-[#151626] border border-purple-700/40 rounded-xl shadow-xl">
                <div className="p-4 border-b border-purple-800/40">
                  <div className="font-semibold text-gray-200">{user?.firstName} {user?.lastName}</div>
                  <div className="text-sm text-gray-400">{user?.email}</div>
                </div>
                <DropdownMenuItem onClick={() => setLocation("/profile")} className="flex items-center space-x-3 p-3 hover:bg-purple-50 rounded-lg mx-2 my-1" data-testid="link-profile">
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                  </svg>
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLocation("/orders")} className="flex items-center space-x-3 p-3 hover:bg-purple-50 rounded-lg mx-2 my-1" data-testid="link-orders">
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
                  </svg>
                  <span>Order History</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLocation("/notifications")} className="flex items-center space-x-3 p-3 hover:bg-purple-50 rounded-lg mx-2 my-1" data-testid="link-notifications">
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-5 5v-5zM4.5 10.5a6 6 0 0112 0v4a2 2 0 002 2h.5a2 2 0 012 2v2a2 2 0 01-2 2H4a2 2 0 01-2-2v-2a2 2 0 012-2h.5a2 2 0 002-2v-4z"></path>
                  </svg>
                  <span>Notifications</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="my-2" />
                {/* Delivery Partner Menu Items */}
                {(user?.isDeliveryPartner || user?.role === 'delivery') && (
                  <>
                    <DropdownMenuSeparator className="my-2" />
                    <div className="px-4 py-2 text-xs font-medium text-purple-600 bg-purple-50 mx-2 rounded-lg">Delivery Partner</div>
                    <DropdownMenuItem onClick={() => setLocation("/partner/dashboard")} className="flex items-center space-x-3 p-3 hover:bg-purple-50 rounded-lg mx-2 my-1" data-testid="link-partner-dashboard">
                      <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                      </svg>
                      <span className="text-purple-600 font-medium">Partner Dashboard</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setLocation("/partner/queue")} className="flex items-center space-x-3 p-3 hover:bg-purple-50 rounded-lg mx-2 my-1" data-testid="link-partner-queue">
                      <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2H7a2 2 0 00-2 2v2m14 0V5a2 2 0 00-2-2H7a2 2 0 00-2 2v4"></path>
                      </svg>
                      <span>Order Queue</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setLocation("/partner/wallet")} className="flex items-center space-x-3 p-3 hover:bg-purple-50 rounded-lg mx-2 my-1" data-testid="link-partner-wallet">
                      <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path>
                      </svg>
                      <span>Partner Wallet</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setLocation("/partner/active-delivery")} className="flex items-center space-x-3 p-3 hover:bg-purple-50 rounded-lg mx-2 my-1" data-testid="link-active-delivery">
                      <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                      </svg>
                      <span>Active Delivery</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="my-2" />
                  </>
                )}
                
                {/* Admin Menu Items */}
                {user?.isAdmin && (
                  <>
                    <DropdownMenuItem onClick={() => setLocation("/admin")} className="flex items-center space-x-3 p-3 hover:bg-purple-50 rounded-lg mx-2 my-1" data-testid="link-admin">
                      <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
                      </svg>
                      <span className="text-purple-600 font-medium">Admin Panel</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setLocation("/admin/partner-assignment")} className="flex items-center space-x-3 p-3 hover:bg-purple-50 rounded-lg mx-2 my-1" data-testid="link-admin-partner-assignment">
                      <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                      </svg>
                      <span>Partner Assignment</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="my-2" />
                  </>
                )}
                <DropdownMenuItem onClick={handleLogout} className="flex items-center space-x-3 p-3 hover:bg-red-50 rounded-lg mx-2 my-1 text-red-600" data-testid="button-logout">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
                  </svg>
                  <span>Sign Out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}
