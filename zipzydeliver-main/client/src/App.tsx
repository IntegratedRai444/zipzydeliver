import { useState, useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { CartProvider } from "@/hooks/useCart";
import Landing from "@/pages/Landing";
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

function Router() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);
  const [location, setLocation] = useLocation();
  
  // Add debugging
  console.log("Router render:", { isAuthenticated, isLoading, user, currentLocation: location });
  
  // Handle authentication state changes
  useEffect(() => {
    if (isAuthenticated && (location === '/login' || location === '/signup')) {
      console.log('User authenticated, redirecting from auth page to home...');
      setLocation('/');
    }
  }, [isAuthenticated, location, setLocation]);

  return (
    <>
      <Switch>
        {isLoading ? (
          <>
            <Route path="/" component={Landing} />
            <Route path="/login" component={Login} />
            <Route path="/signup" component={Signup} />
            <Route component={Landing} />
          </>
        ) : !isAuthenticated ? (
          <>
            <Route path="/" component={Landing} />
            <Route path="/login" component={Login} />
            <Route path="/signup" component={Signup} />
            <Route component={Landing} />
          </>
        ) : (
          <>
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
            <Route path="/admin" component={AdminPanel} />
            <Route path="/profile" component={Profile} />
            <Route path="/testing" component={TestingDashboard} />
            <Route path="/icons" component={IconGallery} />
            <Route path="/ai-dashboard" component={AIDashboard} />
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

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ErrorBoundary>
          <CartProvider>
            <div className="min-h-screen bg-background text-foreground bg-purple-900">
              <Toaster />
              <Router />
            </div>
          </CartProvider>
        </ErrorBoundary>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
