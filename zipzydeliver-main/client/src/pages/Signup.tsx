import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";

export default function Signup() {
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  
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
      console.error('Signup error:', err);
      setError(err.message || 'Failed to sign up');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center px-4">
      <div className="glass-card rounded-2xl p-8 w-full max-w-md text-white">
        <h1 className="text-3xl font-bold mb-2 text-center">Create your Zipzy account</h1>
        <p className="text-purple-200 mb-6 text-center">Sign up to start ordering on campus</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="text-purple-200">Full name</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </div>
          <div>
            <Label className="text-purple-200">Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <Label className="text-purple-200">Password</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-purple-200">User ID</Label>
              <Input value={userId} onChange={(e) => setUserId(e.target.value)} required />
            </div>
            <div>
              <Label className="text-purple-200">Student ID</Label>
              <Input value={studentId} onChange={(e) => setStudentId(e.target.value)} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-purple-200">Phone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} required />
            </div>
            <div>
              <Label className="text-purple-200">Location / Landmark</Label>
              <Input value={landmark} onChange={(e) => setLandmark(e.target.value)} required />
            </div>
          </div>
          {error && <div className="text-red-300 text-sm">{error}</div>}
          <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-700" disabled={loading}>
            {loading ? 'Creating account...' : 'Sign up'}
          </Button>
          <div className="text-sm text-center text-purple-200 mt-2">
            Already have an account? <a href="/login" className="underline">Login</a>
          </div>
          
          {/* Debug buttons */}
          <Button 
            type="button" 
            onClick={async () => {
              console.log('Testing auth endpoint...');
              try {
                const resp = await fetch('/api/auth/user');
                const data = await resp.json();
                console.log('Auth response:', data);
                alert(`Auth status: ${resp.status}, User: ${JSON.stringify(data)}`);
              } catch (err) {
                console.error('Auth test error:', err);
                alert('Auth test failed: ' + err);
              }
            }}
            className="w-full bg-gray-600 hover:bg-gray-700 mt-2"
          >
            Test Auth Status
          </Button>
          
          <Button 
            type="button" 
            onClick={async () => {
              console.log('Manual auth refetch...');
              try {
                if ((window as any).manualAuthRefetch) {
                  await (window as any).manualAuthRefetch();
                  alert('Manual refetch completed - check console');
                } else {
                  alert('Manual refetch not available');
                }
              } catch (err) {
                console.error('Manual refetch error:', err);
                alert('Manual refetch failed: ' + err);
              }
            }}
            className="w-full bg-blue-600 hover:bg-blue-700 mt-2"
          >
            Manual Auth Refetch
          </Button>
        </form>
      </div>
    </div>
  );
}
