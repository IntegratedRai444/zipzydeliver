import React, { useState, useEffect } from 'react';
import { apiRequest } from '../lib/queryClient';

const TestUserInfo: React.FC = () => {
  const [userInfo, setUserInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const response = await apiRequest('GET', '/api/test/user-info');
        setUserInfo(response);
      } catch (error) {
        console.error('Error fetching user info:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserInfo();
  }, []);

  const createTestUsers = async () => {
    try {
      setLoading(true);
      const response = await apiRequest('POST', '/api/test/create-users', {});
      
      if (response.success) {
        alert('Test users created successfully!');
        window.location.reload();
      } else {
        alert('Failed to create test users: ' + response.error);
      }
    } catch (error) {
      alert('Error creating test users: ' + error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-white/20">
          <h1 className="text-4xl font-bold text-white mb-8 text-center">
            🧪 Test User Information
          </h1>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Test User Info */}
            <div className="bg-white/5 rounded-xl p-6">
              <h2 className="text-2xl font-bold text-white mb-4">👤 Test User</h2>
              <div className="space-y-2 text-white/80">
                <p><strong>Name:</strong> {userInfo?.info?.user?.firstName} {userInfo?.info?.user?.lastName}</p>
                <p><strong>Email:</strong> {userInfo?.info?.user?.email}</p>
                <p><strong>Phone:</strong> {userInfo?.info?.user?.phone}</p>
                <p><strong>Student ID:</strong> {userInfo?.info?.user?.studentId}</p>
                <p><strong>College:</strong> {userInfo?.info?.user?.college}</p>
                <p><strong>Hostel:</strong> {userInfo?.info?.user?.hostel}</p>
                <p><strong>Password:</strong> {userInfo?.credentials?.user?.password}</p>
              </div>
            </div>

            {/* Test Admin Info */}
            <div className="bg-white/5 rounded-xl p-6">
              <h2 className="text-2xl font-bold text-white mb-4">👑 Test Admin</h2>
              <div className="space-y-2 text-white/80">
                <p><strong>Name:</strong> {userInfo?.info?.admin?.firstName} {userInfo?.info?.admin?.lastName}</p>
                <p><strong>Email:</strong> {userInfo?.info?.admin?.email}</p>
                <p><strong>Phone:</strong> {userInfo?.info?.admin?.phone}</p>
                <p><strong>Student ID:</strong> {userInfo?.info?.admin?.studentId}</p>
                <p><strong>College:</strong> {userInfo?.info?.admin?.college}</p>
                <p><strong>Hostel:</strong> {userInfo?.info?.admin?.hostel}</p>
                <p><strong>Password:</strong> {userInfo?.credentials?.admin?.password}</p>
              </div>
            </div>
          </div>

          {/* Direct Links */}
          <div className="mt-8 bg-white/5 rounded-xl p-6">
            <h2 className="text-2xl font-bold text-white mb-4">🔗 Direct Access Links</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <a
                href={userInfo?.directLinks?.userBypass}
                className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg text-center transition-colors"
              >
                🚀 Direct User Login
              </a>
              <a
                href={userInfo?.directLinks?.adminBypass}
                className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg text-center transition-colors"
              >
                👑 Direct Admin Login
              </a>
              <a
                href={userInfo?.directLinks?.userLogin}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg text-center transition-colors"
              >
                📝 User Login Page (Pre-filled)
              </a>
              <a
                href={userInfo?.directLinks?.adminLogin}
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-lg text-center transition-colors"
              >
                📝 Admin Login Page (Pre-filled)
              </a>
            </div>
          </div>

          {/* Create Test Users Button */}
          <div className="mt-8 text-center">
            <button
              onClick={createTestUsers}
              disabled={loading}
              className="bg-yellow-600 hover:bg-yellow-700 disabled:bg-yellow-800 text-white font-bold py-3 px-8 rounded-lg transition-colors"
            >
              {loading ? 'Creating...' : '🔄 Create Test Users'}
            </button>
          </div>

          {/* Instructions */}
          <div className="mt-8 bg-white/5 rounded-xl p-6">
            <h2 className="text-2xl font-bold text-white mb-4">📋 Instructions</h2>
            <div className="text-white/80 space-y-2">
              <p>1. <strong>Direct Login:</strong> Click the bypass links to automatically log in without entering credentials</p>
              <p>2. <strong>Pre-filled Login:</strong> Use the login page links to access the login form with pre-filled credentials</p>
              <p>3. <strong>Create Users:</strong> If test users don't exist, click "Create Test Users" to set them up</p>
              <p>4. <strong>User Access:</strong> Regular user can access home page and order features</p>
              <p>5. <strong>Admin Access:</strong> Admin can access admin panel and manage orders</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestUserInfo;
