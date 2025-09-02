import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getErrorMessage, logError } from "@/lib/errorHandling";
import { motion } from "framer-motion";

export default function Login() {
  const queryClient = useQueryClient();
  
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
    
    // Form validation
    if (!email && !userId) {
      setError('Please provide either email or user ID');
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
    
    if (loading) return; // prevent double submit
    setLoading(true);
    
    console.log('Starting login process...');
    
    try {
      console.log('Step 1: Attempting login...');
      const resp = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: email || undefined, userId: userId || undefined, password })
      });
      
      if (!resp.ok) {
        const j = await resp.json().catch(() => ({}));
        throw new Error(j?.message || 'Login failed');
      }
      
      console.log('Step 2: Login successful, redirecting...');
      // Fast redirect; React Query will hydrate user after navigation
      window.location.href = '/';
      return;
      
    } catch (err: any) {
      logError(err, 'Login');
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center px-4 relative overflow-hidden font-['Inter']">
      {/* Advanced Background Elements */}
      <div className="absolute inset-0 bg-black bg-opacity-40"></div>
      
      {/* Animated Gradient Mesh */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 animate-pulse"></div>
      
      {/* Floating Geometric Shapes */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div 
          className="absolute top-1/4 left-1/4 w-3 h-3 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full opacity-60"
          animate={{ 
            y: [-20, 20, -20],
            x: [-10, 10, -10],
            scale: [1, 1.2, 1]
          }}
          transition={{ 
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div 
          className="absolute top-1/3 right-1/4 w-2 h-2 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-full opacity-50"
          animate={{ 
            y: [20, -20, 20],
            x: [10, -10, 10],
            scale: [1, 1.3, 1]
          }}
          transition={{ 
            duration: 5,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div 
          className="absolute bottom-1/4 left-1/3 w-4 h-4 bg-gradient-to-r from-indigo-400 to-purple-400 rounded-full opacity-40"
          animate={{ 
            y: [-15, 15, -15],
            x: [-15, 15, -15],
            scale: [1, 1.1, 1]
          }}
          transition={{ 
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div 
          className="absolute top-1/2 right-1/3 w-2.5 h-2.5 bg-gradient-to-r from-pink-400 to-rose-400 rounded-full opacity-45"
          animate={{ 
            y: [15, -15, 15],
            x: [-5, 5, -5],
            scale: [1, 1.4, 1]
          }}
          transition={{ 
            duration: 4.5,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </div>
      
             {/* Main Content Container */}
       <motion.div 
         initial={{ opacity: 0, y: 20 }}
         animate={{ opacity: 1, y: 0 }}
         transition={{ duration: 0.8 }}
         className="relative z-10 w-full max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center"
       >
         
         {/* Left Side - Advanced Branding */}
         <motion.div 
           initial={{ opacity: 0, x: -50 }}
           animate={{ opacity: 1, x: 0 }}
           transition={{ duration: 0.8, delay: 0.2 }}
           className="text-center lg:text-left text-white space-y-8"
         >
           {/* Advanced Logo */}
           <div className="flex items-center justify-center lg:justify-start mb-12">
             <motion.div 
               className="relative"
               whileHover={{ scale: 1.05 }}
               transition={{ duration: 0.3 }}
             >
               <div className="bg-gradient-to-br from-white via-slate-100 to-purple-50 text-slate-700 rounded-2xl p-8 shadow-2xl backdrop-blur-xl border border-white/20">
                 <svg className="w-20 h-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
                 </svg>
               </div>
               <div className="absolute -inset-4 bg-gradient-to-r from-purple-500/30 to-pink-500/30 rounded-2xl opacity-30 blur-2xl animate-pulse"></div>
             </motion.div>
           </div>
           
           {/* Advanced Typography */}
           <div className="space-y-6">
             <motion.h1 
               initial={{ opacity: 0, scale: 0.9 }}
               animate={{ opacity: 1, scale: 1 }}
               transition={{ duration: 0.8, delay: 0.4 }}
               className="text-7xl lg:text-8xl font-black bg-gradient-to-r from-white via-slate-100 to-purple-200 bg-clip-text text-transparent tracking-tight"
             >
               ZIPZY
             </motion.h1>
             <motion.p 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               transition={{ duration: 0.8, delay: 0.6 }}
               className="text-3xl lg:text-4xl font-light text-slate-200 leading-tight"
             >
               Lightning-fast delivery for college students
             </motion.p>
             <motion.p 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               transition={{ duration: 0.8, delay: 0.8 }}
               className="text-xl lg:text-2xl text-slate-300 leading-relaxed max-w-lg font-light"
             >
               Food, groceries, medicines, and more - delivered to your campus in minutes! 💜🚀
             </motion.p>
             <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               transition={{ duration: 0.8, delay: 1.0 }}
               className="flex items-center justify-center lg:justify-start space-x-6 text-slate-300"
             >
               <div className="flex items-center space-x-3">
                 <div className="w-3 h-3 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full animate-pulse"></div>
                 <span className="text-sm font-medium">Instant Delivery</span>
               </div>
               <div className="flex items-center space-x-3">
                 <div className="w-3 h-3 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-full animate-pulse"></div>
                 <span className="text-sm font-medium">Campus Focused</span>
               </div>
             </motion.div>
           </div>
           
           {/* Advanced Features */}
           <motion.div 
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             transition={{ duration: 0.8, delay: 1.2 }}
             className="hidden lg:block mt-12 space-y-4"
           >
             <div className="flex items-center space-x-4 text-slate-300">
               <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
                 <span className="text-white text-lg">⚡</span>
               </div>
               <span className="font-medium">Lightning-fast delivery within minutes</span>
             </div>
             <div className="flex items-center space-x-4 text-slate-300">
               <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg">
                 <span className="text-white text-lg">🎓</span>
               </div>
               <span className="font-medium">Built specifically for college students</span>
             </div>
             <div className="flex items-center space-x-4 text-slate-300">
               <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center shadow-lg">
                 <span className="text-white text-lg">🛡️</span>
               </div>
               <span className="font-medium">Secure and reliable service</span>
             </div>
           </motion.div>
         </motion.div>
        
                 {/* Right Side - Advanced Login Form */}
         <motion.div 
           initial={{ opacity: 0, x: 50 }}
           animate={{ opacity: 1, x: 0 }}
           transition={{ duration: 0.8, delay: 0.4 }}
           className="bg-white/5 backdrop-blur-2xl rounded-3xl p-10 lg:p-12 shadow-2xl border border-white/10"
         >
           <div className="text-center mb-10">
             <motion.h2 
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ duration: 0.6, delay: 0.6 }}
               className="text-4xl font-bold text-white mb-3 tracking-tight"
             >
               Welcome Back!
             </motion.h2>
             <motion.p 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               transition={{ duration: 0.6, delay: 0.8 }}
               className="text-slate-300 text-lg font-light"
             >
               Sign in to your ZIPZY account
             </motion.p>
           </div>
           
           <motion.form 
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             transition={{ duration: 0.8, delay: 1.0 }}
             onSubmit={handleLogin} 
             className="space-y-8"
           >
             <div className="space-y-3">
               <Label className="text-slate-200 font-medium text-sm tracking-wide">User ID (preferred)</Label>
               <Input 
                 value={userId} 
                 onChange={(e) => setUserId(e.target.value)} 
                 placeholder="Your ID (e.g., college ID)" 
                 className="bg-white/10 border-white/20 text-white placeholder-slate-400 focus:bg-white/15 focus:border-purple-400/50 transition-all duration-300 rounded-xl h-14 text-lg"
               />
             </div>
             
             <div className="space-y-3">
               <Label className="text-slate-200 font-medium text-sm tracking-wide">Email</Label>
               <Input 
                 type="email" 
                 value={email} 
                 onChange={(e) => setEmail(e.target.value)} 
                 required 
                 className="bg-white/10 border-white/20 text-white placeholder-slate-400 focus:bg-white/15 focus:border-purple-400/50 transition-all duration-300 rounded-xl h-14 text-lg"
                 placeholder="Enter your email"
               />
          </div>
             
             <div className="space-y-3">
               <Label className="text-slate-200 font-medium text-sm tracking-wide">Password</Label>
               <Input 
                 type="password" 
                 value={password} 
                 onChange={(e) => setPassword(e.target.value)} 
                 required 
                 className="bg-white/10 border-white/20 text-white placeholder-slate-400 focus:bg-white/15 focus:border-purple-400/50 transition-all duration-300 rounded-xl h-14 text-lg"
                 placeholder="Enter your password"
               />
          </div>
             
             {error && (
               <motion.div 
                 initial={{ opacity: 0, scale: 0.95 }}
                 animate={{ opacity: 1, scale: 1 }}
                 className="bg-red-500/10 border border-red-400/30 rounded-xl p-4 text-red-200 text-sm backdrop-blur-sm"
               >
                 {error}
               </motion.div>
             )}
             
             <motion.div
               whileHover={{ scale: 1.02 }}
               whileTap={{ scale: 0.98 }}
             >
               <Button 
                 type="submit" 
                 className="w-full bg-gradient-to-r from-slate-700 via-purple-600 to-slate-700 hover:from-slate-600 hover:via-purple-500 hover:to-slate-600 text-white font-semibold py-4 rounded-xl transition-all duration-300 shadow-xl text-lg h-14" 
                 disabled={loading}
               >
                 {loading ? (
                   <div className="flex items-center space-x-3">
                     <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                     <span>Signing in...</span>
          </div>
                 ) : (
                   'Sign In'
                 )}
          </Button>
             </motion.div>
             
             <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               transition={{ duration: 0.8, delay: 1.2 }}
               className="text-center space-y-6"
             >
               <div>
                 <span className="text-slate-300">New here? </span>
                 <a href="/signup" className="text-purple-300 hover:text-white underline font-medium transition-colors duration-300">
                   Create an account
                 </a>
          </div>
               
               {/* Advanced Quick Access Links */}
               <div className="pt-6 border-t border-white/10">
                 <p className="text-slate-300 text-sm mb-4 font-medium tracking-wide">Quick Access:</p>
                 <div className="flex flex-col sm:flex-row gap-4 justify-center">
                   <motion.a 
                     whileHover={{ scale: 1.05 }}
                     whileTap={{ scale: 0.95 }}
                     href="/login?email=rishabh.kapoor@test.com&password=test123" 
                     className="inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-500 hover:to-slate-600 text-white text-sm font-medium rounded-xl transition-all duration-300 shadow-lg border border-white/10"
                   >
                     <span className="mr-3 text-lg">👤</span>
                     Quick User Login
                   </motion.a>
                   <motion.a 
                     whileHover={{ scale: 1.05 }}
                     whileTap={{ scale: 0.95 }}
                     href="/login?email=rishabhkapoor@atomicmail.io&password=Rishabhkapoor@0444" 
                     className="inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-500 hover:to-slate-600 text-white text-sm font-medium rounded-xl transition-all duration-300 shadow-lg border border-white/10"
                   >
                     <span className="mr-3 text-lg">👨‍💼</span>
                     Quick Admin Login
                   </motion.a>
      </div>
               </div>
             </motion.div>
           </motion.form>
         </motion.div>
       </motion.div>
    </div>
  );
}
