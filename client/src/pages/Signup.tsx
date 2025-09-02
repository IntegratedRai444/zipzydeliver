import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQueryClient } from "@tanstack/react-query";
import { getErrorMessage, logError } from "@/lib/errorHandling";

export default function Signup() {
  const queryClient = useQueryClient();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [userId, setUserId] = useState("");
  const [landmark, setLandmark] = useState("");
  const [phone, setPhone] = useState("");
  const [studentId, setStudentId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // Form validation
    if (!fullName.trim()) {
      setError('Full name is required');
      return;
    }
    
    if (!email.trim()) {
      setError('Email is required');
      return;
    }
    
    if (!email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }
    
    if (!password) {
      setError('Password is required');
      return;
    }
    
    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }
    
    if (!userId.trim()) {
      setError('User ID is required');
      return;
    }
    
    if (!studentId.trim()) {
      setError('Student ID is required');
      return;
    }
    
    if (!phone.trim()) {
      setError('Phone number is required');
      return;
    }
    
    if (!landmark.trim()) {
      setError('Campus location is required');
      return;
    }
    
    setLoading(true);
    
    console.log('Starting signup process...');
    
    try {
      // Step 1: Sign up
      console.log('Step 1: Creating account...');
      const resp = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, fullName, userId, landmark, phone, studentId })
      });
      
      if (!resp.ok) {
        const errorData = await resp.json().catch(() => ({}));
        throw new Error(errorData.message || 'Signup failed');
      }
      
      console.log('Step 2: Account created, now logging in...');
      
      // Step 2: Auto-login
      const login = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      if (!login.ok) {
        const errorData = await login.json().catch(() => ({}));
        throw new Error(errorData.message || 'Login failed');
      }
      
      console.log('Step 3: Login successful, invalidating cache...');
      
      // Step 3: Invalidate the auth query to refetch user data
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      
      console.log('Step 4: Cache invalidated, waiting for update...');
      
      // Step 4: Add a longer delay to ensure the cache is updated
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log('Step 5: Navigating to home page...');
      
      // Step 5: Force a page reload to ensure authentication state is updated
      window.location.href = '/';
      
      console.log('Step 6: Navigation complete!');
      
    } catch (err: any) {
      logError(err, 'Signup');
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 flex items-center justify-center px-4 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 bg-black bg-opacity-30"></div>
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 animate-pulse"></div>
      
      {/* Floating Particles */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-purple-400 rounded-full animate-bounce"></div>
        <div className="absolute top-1/3 right-1/4 w-1 h-1 bg-pink-400 rounded-full animate-bounce animate-delay-1000"></div>
        <div className="absolute bottom-1/4 left-1/3 w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce animate-delay-2000"></div>
      </div>
      
      {/* Main Content */}
      <div className="relative z-10 w-full max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        
        {/* Left Side - Branding */}
        <div className="text-center lg:text-left text-white space-y-6">
          {/* Enhanced Logo */}
          <div className="flex items-center justify-center lg:justify-start mb-8">
            <div className="relative">
              <div className="bg-gradient-to-br from-white to-purple-100 text-purple-600 rounded-full p-6 shadow-2xl transform hover:scale-110 transition-transform duration-300">
                <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
                </svg>
              </div>
              <div className="absolute -inset-2 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full opacity-20 blur-lg animate-pulse"></div>
            </div>
          </div>
          
          {/* Enhanced Typography */}
          <div className="space-y-4">
            <h1 className="text-6xl lg:text-7xl font-black bg-gradient-to-r from-white via-purple-100 to-pink-100 bg-clip-text text-transparent animate-pulse">
              ZIPZY
            </h1>
            <p className="text-2xl lg:text-3xl font-semibold text-purple-100 leading-relaxed">
              Join the fastest delivery network
            </p>
            <p className="text-lg lg:text-xl text-purple-200 leading-relaxed max-w-lg">
              Create your account and start enjoying lightning-fast campus delivery! 🚀💜
            </p>
          </div>
          
          {/* Benefits */}
          <div className="hidden lg:block mt-8 space-y-3">
            <div className="flex items-center space-x-3 text-purple-200">
              <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm">⚡</span>
              </div>
              <span>Get started in minutes</span>
            </div>
            <div className="flex items-center space-x-3 text-purple-200">
              <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm">🎁</span>
              </div>
              <span>Earn rewards and discounts</span>
            </div>
            <div className="flex items-center space-x-3 text-purple-200">
              <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm">🔒</span>
              </div>
              <span>Secure and private</span>
            </div>
          </div>
        </div>
        
        {/* Right Side - Enhanced Signup Form */}
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 lg:p-10 shadow-2xl border border-white/20">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white mb-2">Join ZIPZY</h2>
            <p className="text-purple-200">Create your account to start ordering</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label className="text-purple-100 font-medium">Full name</Label>
              <Input 
                value={fullName} 
                onChange={(e) => setFullName(e.target.value)} 
                required 
                className="bg-white/20 border-white/30 text-white placeholder-purple-200 focus:bg-white/30 focus:border-purple-400 transition-all duration-300"
                placeholder="Enter your full name"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-purple-100 font-medium">Email</Label>
              <Input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
                className="bg-white/20 border-white/30 text-white placeholder-purple-200 focus:bg-white/30 focus:border-purple-400 transition-all duration-300"
                placeholder="Enter your email"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-purple-100 font-medium">Password</Label>
              <Input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
                minLength={6}
                className="bg-white/20 border-white/30 text-white placeholder-purple-200 focus:bg-white/30 focus:border-purple-400 transition-all duration-300"
                placeholder="Create a password (min 6 characters)"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-purple-100 font-medium">User ID</Label>
                <Input 
                  value={userId} 
                  onChange={(e) => setUserId(e.target.value)} 
                  required 
                  className="bg-white/20 border-white/30 text-white placeholder-purple-200 focus:bg-white/30 focus:border-purple-400 transition-all duration-300"
                  placeholder="Your ID"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-purple-100 font-medium">Student ID</Label>
                <Input 
                  value={studentId} 
                  onChange={(e) => setStudentId(e.target.value)} 
                  required 
                  className="bg-white/20 border-white/30 text-white placeholder-purple-200 focus:bg-white/30 focus:border-purple-400 transition-all duration-300"
                  placeholder="Student ID"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-purple-100 font-medium">Phone</Label>
                <Input 
                  value={phone} 
                  onChange={(e) => setPhone(e.target.value)} 
                  required 
                  className="bg-white/20 border-white/30 text-white placeholder-purple-200 focus:bg-white/30 focus:border-purple-400 transition-all duration-300"
                  placeholder="Phone number"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-purple-100 font-medium">Location</Label>
                <Input 
                  value={landmark} 
                  onChange={(e) => setLandmark(e.target.value)} 
                  required 
                  className="bg-white/20 border-white/30 text-white placeholder-purple-200 focus:bg-white/30 focus:border-purple-400 transition-all duration-300"
                  placeholder="Campus location"
                />
              </div>
            </div>
            
            {error && (
              <div className="bg-red-500/20 border border-red-400/50 rounded-lg p-3 text-red-200 text-sm">
                {error}
              </div>
            )}
            
            <Button 
              type="submit" 
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-3 rounded-xl transform hover:scale-105 transition-all duration-300 shadow-lg" 
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Creating account...</span>
                </div>
              ) : (
                'Create Account'
              )}
            </Button>
            
                         <div className="text-center space-y-4">
               <div>
                 <span className="text-purple-200">Already have an account? </span>
                 <a href="/login" className="text-purple-300 hover:text-white underline font-medium transition-colors duration-300">
                   Login
                 </a>
               </div>
               
               {/* Quick Access Links */}
               <div className="pt-4 border-t border-white/20">
                 <p className="text-purple-200 text-sm mb-3">Quick Access:</p>
                                   <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <a 
                      href="/login?email=rishabh.kapoor@test.com&password=test123" 
                      className="inline-flex items-center justify-center px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white text-sm font-medium rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg"
                    >
                      <span className="mr-2">👤</span>
                      Quick User Login
                    </a>
                    <a 
                      href="/login?email=rishabhkapoor@atomicmail.io&password=Rishabhkapoor@0444" 
                      className="inline-flex items-center justify-center px-4 py-2 bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white text-sm font-medium rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg"
                    >
                      <span className="mr-2">👨‍💼</span>
                      Quick Admin Login
                    </a>
                  </div>
               </div>
             </div>
          </form>
        </div>
      </div>
    </div>
  );
}
