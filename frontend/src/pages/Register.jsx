import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserPlus, AlertCircle, CheckCircle } from 'lucide-react';

export default function Register() {
  const { register, loading, error, setError } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [dob, setDob] = useState('');
  const [address, setAddress] = useState('');
  const [panKyc, setPanKyc] = useState('');
  
  const [formError, setFormError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setError(null);

    // Client-side validations
    if (!fullName || !email || !password) {
      setFormError('Please fill out all required fields: Full Name, Email, and Password.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setFormError('Please enter a valid email address.');
      return;
    }

    if (password.length < 8) {
      setFormError('Password must be at least 8 characters long.');
      return;
    }

    // Password complexity check (matching backend validators)
    if (!/[A-Z]/.test(password)) {
      setFormError('Password must contain at least one uppercase letter.');
      return;
    }
    if (!/[a-z]/.test(password)) {
      setFormError('Password must contain at least one lowercase letter.');
      return;
    }
    if (!/\d/.test(password)) {
      setFormError('Password must contain at least one digit.');
      return;
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      setFormError('Password must contain at least one special character (e.g. !, @, #, $, etc.).');
      return;
    }

    const payload = {
      email,
      password,
      full_name: fullName,
      phone: phone || null,
      date_of_birth: dob || null,
      address: address || null,
      pan_kyc_identifier: panKyc || null,
    };

    try {
      const ok = await register(payload);
      if (ok) {
        setSuccess(true);
      }
    } catch (err) {
      console.error('Registration action failed:', err);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-blue-50 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
          <div className="bg-white py-8 px-6 border border-slate-200 shadow-xl rounded-3xl sm:px-10 text-center space-y-6">
            <div className="flex justify-center">
              <CheckCircle className="w-16 h-16 text-emerald-500" />
            </div>
            <h2 className="text-2xl font-black text-slate-900">Registration Successful!</h2>
            <p className="text-slate-500 text-sm">
              Your customer credentials have been created, and your default KYC profile has been initialized in PENDING state.
            </p>
            <button
              onClick={() => { window.location.hash = '#/login'; }}
              className="w-full py-3 px-4 border border-transparent rounded-xl shadow-md text-sm font-bold text-white bg-blue-600 hover:bg-blue-500 transition-all"
            >
              Sign In to Your Account
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-50 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center">
        <div className="flex justify-center mb-4">
          <span className="text-4xl bg-blue-50 p-3 rounded-2xl border border-blue-100 shadow-sm">🏦</span>
        </div>
        <h2 className="text-3xl font-black tracking-tight text-slate-900">
          Create Banking Profile
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          Configure Your Customer Credentials
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl relative z-10 px-4 sm:px-0">
        <div className="bg-white py-8 px-6 border border-slate-200 shadow-xl rounded-3xl sm:px-10">
          
          {(formError || error) && (
            <div className="mb-6 bg-rose-50 border border-rose-100 text-rose-700 rounded-2xl p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
              <div className="text-sm font-semibold">
                {formError || error}
              </div>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-700">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="mt-1 block w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white sm:text-sm transition-all"
                  placeholder="John Doe"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 block w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white sm:text-sm transition-all"
                  placeholder="john@example.com"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700">
                  Password <span className="text-rose-500">*</span>
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 block w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white sm:text-sm transition-all"
                  placeholder="••••••••"
                  disabled={loading}
                />
                <span className="text-xs text-slate-400 mt-1 block">
                  Min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char.
                </span>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700">
                  Phone Number
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="mt-1 block w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white sm:text-sm transition-all"
                  placeholder="+1 (555) 123-4567"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700">
                  Date of Birth
                </label>
                <input
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="mt-1 block w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white sm:text-sm transition-all"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700">
                  PAN/KYC Identifier
                </label>
                <input
                  type="text"
                  value={panKyc}
                  onChange={(e) => setPanKyc(e.target.value)}
                  className="mt-1 block w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white sm:text-sm transition-all"
                  placeholder="ABCDE1234F"
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700">
                Residential Address
              </label>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                rows={2}
                className="mt-1 block w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white sm:text-sm transition-all"
                placeholder="123 Financial District, New York, NY"
                disabled={loading}
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-md text-sm font-bold text-white bg-blue-600 hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Registering Profile...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-5 h-5" />
                    Register Account
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Desired Layout: Login option below the register form */}
          <div className="mt-8 border-t border-slate-100 pt-6 text-center text-sm">
            <span className="text-slate-500">Already have an account?</span>{' '}
            <a href="#/login" className="font-extrabold text-blue-600 hover:text-blue-500 transition-colors">
              Login
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
