import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";

export default function Login() {
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  
  useEffect(() => {
    console.log("Login page mounted");
  }, []);

  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
      
      console.log('Step 4: Navigating to home page...');
      
      // Force a page reload to ensure authentication state is updated
      window.location.href = '/';
      
      console.log('Step 5: Navigation complete!');
      
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center px-4">
      <div className="glass-card rounded-2xl p-8 w-full max-w-md text-white">
        <h1 className="text-3xl font-bold mb-2 text-center">Sign in to Zipzy</h1>
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
      </div>
    </div>
  );
}
