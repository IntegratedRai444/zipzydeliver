import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { withErrorHandling, getErrorMessage, logError } from "@/lib/errorHandling";

export default function Login() {
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  
  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Handle URL parameters for pre-filled credentials
  useEffect(() => {
    console.log("Login page mounted");
    
    const urlParams = new URLSearchParams(window.location.search);
    const emailParam = urlParams.get('email');
    const passwordParam = urlParams.get('password');
    
    if (emailParam) {
      setEmail(emailParam);
    }
    if (passwordParam) {
      setPassword(passwordParam);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    
    console.log('Starting login process...');
    
    try {
      console.log('Step 1: Attempting login...');
      const resp = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email || undefined, userId: userId || undefined, password })
      });
      
      if (!resp.ok) {
        const j = await resp.json().catch(() => ({}));
        throw new Error(j?.message || 'Login failed');
      }
      
      console.log('Step 2: Login successful, invalidating cache...');
      
      // Invalidate the auth query to refetch user data
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      
      console.log('Step 3: Cache invalidated, waiting for update...');
      
      // Add a longer delay to ensure the cache is updated
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log('Step 4: Checking user role and navigating...');
      
      // Get user data to check if admin
      const userResp = await fetch('/api/auth/user');
      if (userResp.ok) {
        const userData = await userResp.json();
        const isAdmin = userData.user?.isAdmin || userData.user?.role === 'admin';
        
        if (isAdmin) {
          console.log('✅ Admin user detected, redirecting to admin panel...');
          window.location.href = '/admin';
        } else {
          console.log('✅ Regular user, redirecting to home page...');
          window.location.href = '/';
        }
      } else {
        console.log('⚠️ Could not fetch user data, redirecting to home...');
        window.location.href = '/';
      }
      
      console.log('Step 5: Navigation complete!');
      
    } catch (err: any) {
      logError(err, 'Login');
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-purple-700 to-teal-400 flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute inset-0 bg-black bg-opacity-20"></div>
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-purple-800 via-purple-900 to-blue-900 animate-pulse"></div>
      
      <div className="text-center text-white relative z-10 w-full max-w-md">
        {/* ZIPZY Logo and Branding */}
        <div className="mb-8">
          <div className="flex items-center justify-center mb-6">
            <div className="bg-white text-purple-600 rounded-full p-4">
              <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
              </svg>
            </div>
          </div>
          <h1 className="text-5xl font-bold mb-4">ZIPZY</h1>
          <p className="text-xl mb-6 max-w-2xl mx-auto">
            Lightning-fast delivery for college students. Food, groceries, medicines, and more - delivered to your campus in minutes! 💜🚀
          </p>
          <p className="text-lg mb-8">Built specifically for college students, by college students</p>
        </div>

        {/* Login Form */}
        <div className="glass-card rounded-2xl p-8 text-white">
          <h2 className="text-2xl font-bold mb-2 text-center">Sign in to ZIPZY</h2>
          <p className="text-purple-200 mb-6 text-center">Use your registered email and password</p>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <Label className="text-purple-200">User ID (preferred)</Label>
            <Input value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="Your ID (e.g., college ID)" />
          </div>
          <div>
            <Label className="text-purple-200">Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <Label className="text-purple-200">Password</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          {error && <div className="text-red-300 text-sm">{error}</div>}
          <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-700" disabled={loading}>
            {loading ? 'Signing in...' : 'Login'}
          </Button>
          <div className="text-sm text-center text-purple-200 mt-2">
            New here? <a href="/signup" className="underline">Create an account</a>
          </div>
        </form>

        {/* Quick Login Buttons for Testing */}
        <div className="mt-6 pt-6 border-t border-purple-300">
          <p className="text-sm text-purple-200 mb-3">Quick Login for Testing:</p>
          <div className="space-y-2">
            <Button 
              onClick={() => {
                setEmail('rishabhkapoor@atomicmail.io');
                setPassword('rishabhkapoor@0444');
              }}
              variant="outline" 
              size="sm" 
              className="w-full text-xs"
            >
              Admin Login (Rishabh Kapoor)
            </Button>
            <Button 
              onClick={() => {
                setEmail('john.doe@iitd.ac.in');
                setPassword('customer123');
              }}
              variant="outline" 
              size="sm" 
              className="w-full text-xs"
            >
              Customer Login
            </Button>
            <Button 
              onClick={() => {
                setEmail('raj.kumar@zipzy.com');
                setPassword('partner123');
              }}
              variant="outline" 
              size="sm" 
              className="w-full text-xs"
            >
              Partner Login
            </Button>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
