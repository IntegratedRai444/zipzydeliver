import React, { useEffect } from 'react';
import { useLocation } from 'wouter';
import { apiRequest } from '../lib/queryClient';

const TestAdminBypass: React.FC = () => {
  const [, setLocation] = useLocation();

  useEffect(() => {
    const bypassLogin = async () => {
      try {
        console.log('🔄 Attempting test admin bypass login...');
        
        const response = await apiRequest('POST', '/test/admin-bypass');

        if (response.success) {
          console.log('✅ Test admin bypass successful:', response.user);
          setLocation('/admin');
        } else {
          console.error('❌ Test admin bypass failed:', response.message);
          alert('Bypass failed: ' + response.message);
        }
      } catch (error) {
        console.error('❌ Test admin bypass error:', error);
        alert('Bypass error: ' + error);
      }
    };

    bypassLogin();
  }, [setLocation]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-900 via-purple-900 to-indigo-900 flex items-center justify-center">
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-white/20">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-4">
            👑 Test Admin Bypass
          </h1>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white/80 text-lg">
            Logging in as admin...
          </p>
          <div className="mt-6 text-white/60 text-sm">
            <p><strong>Name:</strong> Rishabh Kapoor (Admin)</p>
            <p><strong>Phone:</strong> 8091273304</p>
            <p><strong>Student ID:</strong> gf202455815</p>
            <p><strong>College:</strong> Shoolini University</p>
            <p><strong>Hostel:</strong> GHS Boys Aryabhatta</p>
            <p><strong>Role:</strong> Administrator</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestAdminBypass;
