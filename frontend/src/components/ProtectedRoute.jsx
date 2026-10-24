import React, { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children }) {
  const { token, loading } = useAuth();

  useEffect(() => {
    if (!loading && !token) {
      window.location.hash = '#/login';
    }
  }, [token, loading]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400">
        <div className="w-10 h-10 border-4 border-slate-800 border-t-orange-500 rounded-full animate-spin mb-4"></div>
        <span>Verifying secure session credentials...</span>
      </div>
    );
  }

  if (!token) {
    return null;
  }

  return <>{children}</>;
}
