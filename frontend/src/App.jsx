import React, { useState, useEffect } from 'react';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import Dashboard from './pages/Dashboard';
import Statement from './pages/Statement';
import AdminDashboard from './pages/AdminDashboard';
import Notifications from './pages/Notifications';
import ApiDocs from './pages/ApiDocs';
import Kyc from './pages/Kyc';

function AppContent() {
  const [currentPath, setCurrentPath] = useState(window.location.hash || '#/');

  useEffect(() => {
    const handleHashChange = () => {
      setCurrentPath(window.location.hash || '#/');
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  // Flexibly renders page layouts, supporting query parameters
  const renderRoute = () => {
    if (currentPath === '#/') {
      return <LandingPage />;
    }
    if (currentPath === '#/api-docs') {
      return <ApiDocs />;
    }
    if (currentPath === '#/login') {
      return <Login />;
    }
    if (currentPath === '#/register') {
      return <Register />;
    }
    if (currentPath === '#/profile') {
      return (
        <ProtectedRoute>
          <Profile />
        </ProtectedRoute>
      );
    }
    if (currentPath === '#/dashboard') {
      return (
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      );
    }
    if (currentPath === '#/notifications') {
      return (
        <ProtectedRoute>
          <Notifications />
        </ProtectedRoute>
      );
    }
    if (currentPath === '#/admin') {
      return (
        <ProtectedRoute>
          <AdminDashboard />
        </ProtectedRoute>
      );
    }
    if (currentPath === '#/kyc') {
      return (
        <ProtectedRoute>
          <Kyc />
        </ProtectedRoute>
      );
    }
    if (currentPath.startsWith('#/statement')) {
      return (
        <ProtectedRoute>
          <Statement />
        </ProtectedRoute>
      );
    }

    return (
      <div className="min-h-screen bg-slate-50 text-slate-700 flex flex-col items-center justify-center">
        <h1 className="text-4xl font-extrabold mb-4 text-slate-900">404 - Page Not Found</h1>
        <a href="#/" className="text-blue-600 hover:underline font-semibold">
          Return to Landing Page
        </a>
      </div>
    );
  };

  return renderRoute();
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
