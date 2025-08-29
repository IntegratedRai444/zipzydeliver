import { Button } from "@/components/ui/button";

export default function Landing() {
  // Add debugging
  console.log("Landing page loaded");
  
  const handleLogin = async () => {
    console.log("Login button clicked");
    // Always take the user to our dedicated login screen first
    window.location.href = '/login';
  };

  return (
    <div className="min-h-screen bg-purple-800 bg-gradient-to-br from-purple-600 via-purple-700 to-teal-400 flex items-center justify-center px-4 relative overflow-hidden">
      {/* Add animated background elements */}
      <div className="absolute inset-0 bg-black bg-opacity-20"></div>
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-purple-800 via-purple-900 to-blue-900 animate-pulse"></div>
      
      <div className="text-center text-white relative z-10">
        <div className="mb-8">
          <div className="flex items-center justify-center mb-6">
            <div className="bg-white text-purple-600 rounded-full p-4">
              <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
              </svg>
            </div>
          </div>
          <h1 className="text-5xl font-bold mb-4">ZIPZY</h1>
          <p className="text-xl mb-8 max-w-2xl mx-auto">
            Lightning-fast delivery for college students. Food, groceries, medicines, and more - delivered to your campus in minutes! 💜 🚀
          </p>
        </div>
        
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-6">Why Choose ZIPZY?</h2>
          <p className="text-lg mb-4">Built specifically for college students, by college students</p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-center gap-4">
            <Button 
              onClick={() => window.location.href = '/login'}
              size="lg"
              className="bg-white text-purple-700 hover:bg-gray-100 font-semibold px-8 py-4 text-lg shadow-lg transform hover:scale-105 transition-all"
              data-testid="button-login"
            >
              Login
            </Button>
            <Button 
              onClick={() => window.location.href = '/signup'}
              size="lg"
              className="bg-purple-600 text-white hover:bg-purple-700 font-semibold px-8 py-4 text-lg shadow-lg transform hover:scale-105 transition-all"
              data-testid="button-signup"
            >
              Sign up
            </Button>
          </div>
          <div className="text-sm text-purple-200">Choose Login or Sign up to continue</div>
        </div>
      </div>
    </div>
  );
}
