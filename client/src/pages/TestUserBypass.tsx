import React, { useEffect } from 'react';
import { useLocation } from 'wouter';
import { apiRequest } from '../lib/queryClient';

const TestUserBypass: React.FC = () => {
  const [, setLocation] = useLocation();

  useEffect(() => {
    const bypassLogin = async () => {
      try {
        console.log('🔄 Attempting test user bypass login...');
        
        const response = await apiRequest('POST', '/test/user-bypass');

        if (response.success) {
          console.log('✅ Test user bypass successful:', response.user);
          setLocation('/home');
        } else {
          console.error('❌ Test user bypass failed:', response.message);
          alert('Bypass failed: ' + response.message);
        }
      } catch (error) {
        console.error('❌ Test user bypass error:', error);
        alert('Bypass error: ' + error);
      }
    };

    bypassLogin();
  }, [setLocation]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-white/20">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-4">
            🔐 Test User Bypass
          </h1>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white/80 text-lg">
            Logging in as test user...
          </p>
          <div className="mt-6 text-white/60 text-sm">
            <p><strong>Name:</strong> Rishabh Kapoor</p>
            <p><strong>Phone:</strong> 8091273304</p>
            <p><strong>Student ID:</strong> gf202455815</p>
            <p><strong>College:</strong> Shoolini University</p>
            <p><strong>Hostel:</strong> GHS Boys Aryabhatta</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestUserBypass;
