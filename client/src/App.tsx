import { useState, useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { CartProvider } from "@/hooks/useCart";

import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import Home from "@/pages/Home";
import Cart from "@/pages/Cart";
import OrderHistory from "@/pages/OrderHistory";
import AdminPanel from "@/pages/AdminPanel";
import Profile from "@/pages/Profile";
import NotFound from "@/pages/not-found";
import AIChatbot from "@/components/AIChatbot";
import Checkout from "@/components/Checkout";
import Inbox from "@/components/Inbox";
import OrderTracking from "@/pages/OrderTracking";
import PaymentPage from "@/pages/PaymentPage";
import DeliveryChat from "@/components/DeliveryChat";
import Driver from "@/pages/Driver";
import TestingDashboard from "@/components/TestingDashboard";
import IconGallery from "@/components/IconGallery";
import AIDashboard from "@/components/AIDashboard";
import ErrorBoundary from "@/components/ErrorBoundary";
import TestUserBypass from "@/pages/TestUserBypass";
import TestAdminBypass from "@/pages/TestAdminBypass";
import TestUserInfo from "@/pages/TestUserInfo";

// Import all the useful components
import DeliveryPartnerDashboard from "@/components/DeliveryPartnerDashboard";
import PartnerQueue from "@/components/PartnerQueue";
import EnhancedOrderTracking from "@/components/EnhancedOrderTracking";
import FCMNotifications from "@/components/FCMNotifications";
import AdminPartnerAssignment from "@/components/AdminPartnerAssignment";
import ActiveDelivery from "@/components/ActiveDelivery";
import PartnerWallet from "@/components/PartnerWallet";
import OrderStatusModal from "@/components/OrderStatusModal";
import NotificationsPage from "@/pages/NotificationsPage";

function Router({ isAuthenticated, isLoading, user }: { 
  isAuthenticated: boolean; 
  isLoading: boolean; 
  user: any; 
}) {
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);
  const [location, setLocation] = useLocation();
  
  // Handle authentication state changes
  useEffect(() => {
    if (isAuthenticated && (location === '/login' || location === '/signup')) {
      // Check if user is admin and redirect accordingly
      if (user?.isAdmin) {
        setLocation('/admin');
      } else {
        setLocation('/');
      }
    }
  }, [isAuthenticated, location, setLocation, user?.isAdmin]); // Only depend on isAdmin boolean, not the entire user object

  return (
    <>
      <Switch>
        {isLoading ? (
          <>
            <Route path="/" component={Login} />
            <Route path="/login" component={Login} />
            <Route path="/signup" component={Signup} />
            <Route component={Login} />
          </>
        ) : !isAuthenticated ? (
          <>
            <Route path="/" component={Login} />
            <Route path="/login" component={Login} />
            <Route path="/signup" component={Signup} />
            <Route path="/test-user-bypass" component={TestUserBypass} />
            <Route path="/test-admin-bypass" component={TestAdminBypass} />
            <Route path="/test-user-info" component={TestUserInfo} />
            <Route component={Login} />
          </>
        ) : (
          <>
            <Route path="/admin" component={AdminPanel} />
            <Route path="/" component={Home} />
            <Route path="/login" component={Home} />
            <Route path="/signup" component={Home} />
            <Route path="/cart" component={Cart} />
            <Route path="/checkout" component={Checkout} />
            <Route path="/inbox" component={Inbox} />
            <Route path="/orders" component={OrderHistory} />
            <Route path="/orders/:orderId" component={OrderTracking} />
            <Route path="/payment/:orderId" component={PaymentPage} />
            <Route path="/chat/delivery/:orderId" component={DeliveryChat} />
            <Route path="/driver" component={Driver} />
            <Route path="/profile" component={Profile} />
            <Route path="/testing" component={TestingDashboard} />
            <Route path="/icons" component={IconGallery} />
            <Route path="/ai-dashboard" component={AIDashboard} />
            
            {/* New routes for delivery partner features */}
            <Route path="/partner/dashboard" component={DeliveryPartnerDashboard} />
            <Route path="/partner/queue" component={() => <PartnerQueue onOrderAccept={(orderId) => console.log('Order accepted:', orderId)} />} />
            <Route path="/partner/wallet" component={() => <PartnerWallet partnerId="current" />} />
            <Route path="/partner/active-delivery" component={() => <ActiveDelivery 
              delivery={{
                orderId: 'mock',
                orderNumber: 'mock',
                customerName: 'mock',
                customerPhone: 'mock',
                pickupLocation: { lat: 0, lng: 0, address: 'mock', storeName: 'mock' },
                deliveryLocation: { lat: 0, lng: 0, address: 'mock' },
                items: [],
                totalAmount: 0,
                status: 'accepted',
                acceptedAt: new Date(),
                estimatedDeliveryTime: 'mock',
                currentStep: 0,
                totalSteps: 4
              }}
              onStatusUpdate={(status) => console.log('Status updated:', status)}
              onLocationUpdate={(lat, lng) => console.log('Location updated:', lat, lng)}
            />} />
            <Route path="/partner/notifications" component={() => <FCMNotifications partnerId="current" />} />
            
            {/* Enhanced order tracking */}
            <Route path="/orders/:orderId/enhanced" component={({ params }: any) => <EnhancedOrderTracking orderId={params.orderId} />} />
            
            {/* Admin partner assignment */}
            <Route path="/admin/partner-assignment" component={() => <AdminPartnerAssignment orderId="mock" />} />
            
            {/* Notifications page */}
            <Route path="/notifications" component={NotificationsPage} />
            
            <Route component={Home} />
          </>
        )}
      </Switch>
      
      {/* AI Chatbot - Only show when authenticated */}
      {isAuthenticated && (
        <AIChatbot 
          isOpen={isChatbotOpen} 
          onToggle={() => setIsChatbotOpen(!isChatbotOpen)} 
        />
      )}
    </>
  );
}

function AuthStateRouter() {
  const { isAuthenticated, isLoading, user } = useAuth();
  return (
    <Router 
      isAuthenticated={isAuthenticated}
      isLoading={isLoading}
      user={user}
    />
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ErrorBoundary>
          <CartProvider>
            <div className="min-h-screen bg-background text-foreground bg-purple-900">
              <Toaster />
              <AuthStateRouter />
            </div>
          </CartProvider>
        </ErrorBoundary>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
