import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, LogIn, AlertCircle } from 'lucide-react';

export default function Login() {
  const { login, loading, error, setError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState('');
  const [loginMethod, setLoginMethod] = useState('EMAIL'); // 'EMAIL' or 'ACCOUNT_NUMBER'

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setError(null);

    // Validation
    if (!email || !password) {
      setFormError(
        loginMethod === 'EMAIL' 
          ? 'Please enter both your email address and password.' 
          : 'Please enter both your account number and password.'
      );
      return;
    }

    if (loginMethod === 'EMAIL') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        setFormError('Please enter a valid email address.');
        return;
      }
    } else {
      const accRegex = /^\d{5,20}$/;
      if (!accRegex.test(email)) {
        setFormError('Please enter a valid bank account number.');
        return;
      }
    }

    try {
      const success = await login(email, password);
      if (success) {
        // Redirect to dashboard (for customers) or check admin in App.jsx routing
        window.location.hash = '#/dashboard';
      }
    } catch (err) {
      console.error('Login action failed:', err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Subtle light background decorations */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-50 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center">
        <div className="flex justify-center mb-4">
          <span className="text-4xl bg-blue-50 p-3 rounded-2xl border border-blue-100 shadow-sm">🏦</span>
        </div>
        <h2 className="text-3xl font-black tracking-tight text-slate-900">
          Sign in to Apex Banking
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          Secure Electronic Transactions Portal
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4 sm:px-0">
        <div className="bg-white py-8 px-6 border border-slate-200/80 shadow-xl rounded-3xl sm:px-10">
          
          {/* Error alerts */}
          {(formError || error) && (
            <div className="mb-6 bg-rose-50 border border-rose-100 text-rose-700 rounded-2xl p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
              <div className="text-sm font-semibold">
                {formError || error}
              </div>
            </div>
          )}

          {/* Login Method Selector */}
          <div className="flex gap-2 mb-6 bg-slate-50 p-1.5 rounded-2xl border border-slate-100 font-bold">
            <button
              type="button"
              onClick={() => { setLoginMethod('EMAIL'); setEmail(''); setFormError(''); setError(null); }}
              className={`flex-1 py-2 text-xs rounded-xl transition-all ${
                loginMethod === 'EMAIL' 
                  ? 'bg-white shadow-sm text-slate-800 border border-slate-200/50' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Email / Gmail
            </button>
            <button
              type="button"
              onClick={() => { setLoginMethod('ACCOUNT_NUMBER'); setEmail(''); setFormError(''); setError(null); }}
              className={`flex-1 py-2 text-xs rounded-xl transition-all ${
                loginMethod === 'ACCOUNT_NUMBER' 
                  ? 'bg-white shadow-sm text-slate-800 border border-slate-200/50' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Account Number
            </button>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-bold text-slate-700">
                {loginMethod === 'EMAIL' ? 'Email Address' : 'Bank Account Number'}
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full px-4 py-3 border border-slate-200 rounded-xl shadow-sm placeholder-slate-400 bg-slate-50 text-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white sm:text-sm transition-all"
                  placeholder={loginMethod === 'EMAIL' ? 'name@example.com' : 'e.g. 1234567890'}
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-bold text-slate-700">
                Password
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-4 py-3 border border-slate-200 rounded-xl shadow-sm placeholder-slate-400 bg-slate-50 text-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white sm:text-sm transition-all"
                  placeholder="••••••••"
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-md hover:shadow-lg text-sm font-bold text-white bg-blue-600 hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Authenticating...
                  </>
                ) : (
                  <>
                    <LogIn className="w-5 h-5" />
                    Sign In
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Desired Layout: Register option below the login form */}
          <div className="mt-8 border-t border-slate-100 pt-6 text-center text-sm">
            <span className="text-slate-500">Don't have an account?</span>{' '}
            <a href="#/register" className="font-extrabold text-blue-600 hover:text-blue-500 transition-colors">
              Register
            </a>
          </div>

          <div className="mt-4 text-center">
            <a href="#/" className="text-xs font-semibold text-slate-400 hover:text-slate-600 transition-colors">
              ← Return to Main Page
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
