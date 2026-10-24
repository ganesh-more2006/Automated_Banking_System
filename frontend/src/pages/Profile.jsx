import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  FileText, 
  ShieldAlert, 
  LogOut, 
  Lock, 
  UserCheck,
  ShieldCheck
} from 'lucide-react';

export default function Profile() {
  const { user, logout } = useAuth();
  const [testResult, setTestResult] = useState(null);
  const [testing, setTesting] = useState(false);
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinError, setPinError] = useState(null);
  const [pinSuccess, setPinSuccess] = useState(null);
  const [pinLoading, setPinLoading] = useState(false);

  const handlePINSubmit = async (e) => {
    e.preventDefault();
    setPinError(null);
    setPinSuccess(null);

    if (!/^\d{6}$/.test(pin)) {
      setPinError('Transaction PIN must be exactly 6 digits.');
      return;
    }
    if (pin !== confirmPin) {
      setPinError('PIN confirmation does not match.');
      return;
    }

    setPinLoading(true);
    try {
      await api.post('/auth/set-pin', { pin, confirm_pin: confirmPin });
      setPinSuccess('Transaction PIN set successfully!');
      setPin('');
      setConfirmPin('');
      if (user) {
        user.is_pin_set = true;
      }
    } catch (err) {
      setPinError(err.message || 'Failed to set transaction PIN.');
    } finally {
      setPinLoading(false);
    }
  };

  const runRoleAccessTest = async (endpoint) => {
    setTesting(true);
    setTestResult(null);
    try {
      const url = `/auth/${endpoint}`;
      const response = await api.get(url);
      setTestResult({
        status: 'success',
        endpoint: url,
        message: response.data.message || 'Access granted.'
      });
    } catch (err) {
      setTestResult({
        status: 'error',
        endpoint: `/auth/${endpoint}`,
        message: err.message || 'Access Denied: Insufficient privileges.'
      });
    } finally {
      setTesting(false);
    }
  };

  if (!user) return null;

  const profile = user.profile || {};

  return (
    <div className="min-h-screen bg-slate-50 text-slate-700 flex flex-col">
      {/* Nav */}
      <header className="border-b border-slate-200 bg-white/95 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🏦</span>
            <span className="font-extrabold text-xl tracking-tight text-slate-900">APEX PORTAL</span>
          </div>
          <div className="flex items-center gap-4">
            <a 
              href="#/dashboard"
              className="text-slate-500 hover:text-slate-900 transition-colors text-sm font-semibold"
            >
              Customer
            </a>
            <span className="text-xs bg-blue-50 border border-blue-100 px-3 py-1 rounded-full text-blue-700 font-extrabold flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-blue-600" />
              {user.role}
            </span>
            <button 
              onClick={logout} 
              className="text-slate-500 hover:text-slate-900 transition-colors flex items-center gap-1.5 text-sm font-semibold"
            >
              <LogOut className="w-4 h-4 text-slate-400" />
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-6 py-12 space-y-8">
        
        {/* Banner */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden shadow-sm">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full blur-[80px] pointer-events-none"></div>
          <div className="flex items-center gap-5 relative z-10">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 text-2xl font-black shrink-0 shadow-sm">
              {profile.full_name ? profile.full_name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900">{profile.full_name || 'System User'}</h1>
              <p className="text-slate-500 text-sm flex items-center gap-1.5 mt-1">
                <Mail className="w-4 h-4 text-slate-400" />
                {user.email}
              </p>
            </div>
          </div>

          <div className="flex gap-3 relative z-10">
            <a href="#/kyc" className={`px-4 py-1.5 rounded-full border text-xs font-black uppercase tracking-wider ${
              profile.kyc_status === 'APPROVED' 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100' 
                : profile.kyc_status === 'REJECTED' 
                ? 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100' 
                : 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100'
            } transition-colors`}>
              KYC: {profile.kyc_status || 'NOT_SUBMITTED'}
            </a>
            <span className={`px-4 py-1.5 rounded-full border text-xs font-black uppercase tracking-wider ${
              profile.profile_status === 'ACTIVE' 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                : 'bg-rose-50 border-rose-200 text-rose-700'
            }`}>
              Status: {profile.profile_status || 'ACTIVE'}
            </span>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          
          {/* Profile Details Column (2/3 width) */}
          <div className="md:col-span-2 space-y-6">
            <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm">
              <h2 className="text-xl font-extrabold text-slate-900 mb-6 border-b border-slate-100 pb-4">
                Customer Profile Information
              </h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="flex gap-4 items-start">
                  <User className="w-5 h-5 text-slate-400 mt-1 shrink-0" />
                  <div>
                    <label className="text-slate-400 text-xs font-bold uppercase tracking-wider">Full Name</label>
                    <p className="text-slate-800 font-semibold">{profile.full_name || 'N/A'}</p>
                  </div>
                </div>

                <div className="flex gap-4 items-start">
                  <Phone className="w-5 h-5 text-slate-400 mt-1 shrink-0" />
                  <div>
                    <label className="text-slate-400 text-xs font-bold uppercase tracking-wider">Phone Number</label>
                    <p className="text-slate-800 font-semibold">{profile.phone || 'N/A'}</p>
                  </div>
                </div>

                <div className="flex gap-4 items-start">
                  <Calendar className="w-5 h-5 text-slate-400 mt-1 shrink-0" />
                  <div>
                    <label className="text-slate-400 text-xs font-bold uppercase tracking-wider">Date of Birth</label>
                    <p className="text-slate-800 font-semibold">{profile.date_of_birth || 'N/A'}</p>
                  </div>
                </div>

                <div className="flex gap-4 items-start">
                  <FileText className="w-5 h-5 text-slate-400 mt-1 shrink-0" />
                  <div>
                    <label className="text-slate-400 text-xs font-bold uppercase tracking-wider">PAN/KYC Identifier</label>
                    <p className="text-slate-800 font-mono font-semibold">{profile.pan_kyc_identifier || 'N/A'}</p>
                  </div>
                </div>

                <div className="flex gap-4 items-start sm:col-span-2">
                  <MapPin className="w-5 h-5 text-slate-400 mt-1 shrink-0" />
                  <div>
                    <label className="text-slate-400 text-xs font-bold uppercase tracking-wider">Residential Address</label>
                    <p className="text-slate-800 font-semibold">{profile.address || 'N/A'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Transaction PIN Setup Card */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm mt-6">
              <h2 className="text-xl font-extrabold text-slate-900 mb-2">
                Transaction PIN Protection
              </h2>
              <p className="text-slate-500 text-sm mb-6">
                Set a 6-digit numeric PIN to secure deposits and withdrawals.
              </p>

              <div className="mb-6">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                  user?.is_pin_set 
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                    : 'bg-amber-50 border-amber-200 text-amber-700'
                }`}>
                  {user?.is_pin_set ? '✓ Transaction PIN Configured' : '⚠ Transaction PIN Not Set'}
                </span>
              </div>

              {pinError && (
                <div className="mb-4 p-3.5 bg-rose-50 border border-rose-100 text-rose-700 text-xs font-semibold rounded-xl">
                  {pinError}
                </div>
              )}

              {pinSuccess && (
                <div className="mb-4 p-4 bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-semibold rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-sm">
                  <span>{pinSuccess}</span>
                  <a
                    href="#/dashboard"
                    className="inline-block bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-[10px] uppercase tracking-wider px-3.5 py-1.5 rounded-lg text-center whitespace-nowrap transition-all shadow-sm"
                  >
                    Go to Customer Dashboard
                  </a>
                </div>
              )}

              <form onSubmit={handlePINSubmit} className="space-y-4 max-w-sm">
                <div>
                  <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">
                    New 6-Digit PIN
                  </label>
                  <input
                    type="password"
                    pattern="\d*"
                    maxLength={6}
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="••••••"
                    className="w-full px-4 py-2.5 border border-slate-200 bg-slate-50 text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 tracking-widest font-mono text-center text-lg"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">
                    Confirm 6-Digit PIN
                  </label>
                  <input
                    type="password"
                    pattern="\d*"
                    maxLength={6}
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="••••••"
                    className="w-full px-4 py-2.5 border border-slate-200 bg-slate-50 text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 tracking-widest font-mono text-center text-lg"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={pinLoading}
                  className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-sm disabled:opacity-50"
                >
                  {pinLoading ? 'Saving...' : 'Save Transaction PIN'}
                </button>
              </form>
            </div>
          </div>

          {/* Security & Access Control Panel (1/3 width) */}
          <div className="md:col-span-1 space-y-6">
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
              
              {/* Header */}
              <div className="space-y-2 border-b border-slate-100 pb-4">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-blue-600" />
                  Security & Access Control
                </h3>
                <p className="text-slate-500 text-[11px] leading-relaxed">
                  Enterprise-style role-based protection keeps customer and administrative operations securely separated.
                </p>
              </div>

              {/* Session Status */}
              <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Session Status</span>
                  <span className="text-emerald-700 font-extrabold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Authenticated
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-slate-200/50">
                  <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Active Role</span>
                  <span className="text-blue-700 font-extrabold uppercase bg-blue-50 border border-blue-100 px-2 py-0.5 rounded text-[10px]">
                    {user?.role}
                  </span>
                </div>
              </div>

              {/* Role Access Visualization */}
              <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl space-y-4">
                <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 text-center">Access Control Model</div>
                
                <div className="flex flex-col items-center">
                  <span className="bg-blue-600 text-white font-extrabold text-[9px] px-3 py-1 rounded-full uppercase tracking-wider">
                    Authenticated User
                  </span>
                  <div className="h-4 w-0.5 bg-slate-300 my-1"></div>
                  <div className="w-full flex justify-between gap-2">
                    {/* Customer Branch */}
                    <div className="flex-1 flex flex-col items-center">
                      <span className={`font-extrabold text-[9px] px-2 py-0.5 rounded-md border ${
                        user?.role === 'CUSTOMER' 
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-700 font-black shadow-sm ring-2 ring-emerald-100'
                          : 'bg-slate-100 border-slate-200 text-slate-400'
                      }`}>
                        CUSTOMER
                      </span>
                      <div className="h-3 w-0.5 bg-slate-200 my-0.5"></div>
                      <span className="text-[9px] text-slate-500 font-semibold">Customer Portal</span>
                    </div>
                    
                    {/* Admin Branch */}
                    <div className="flex-1 flex flex-col items-center">
                      <span className={`font-extrabold text-[9px] px-2 py-0.5 rounded-md border ${
                        user?.role === 'ADMIN' 
                          ? 'bg-amber-50 border-amber-200 text-amber-700 font-black shadow-sm ring-2 ring-amber-100'
                          : 'bg-slate-100 border-slate-200 text-slate-400'
                      }`}>
                        ADMIN
                      </span>
                      <div className="h-3 w-0.5 bg-slate-200 my-0.5"></div>
                      <span className="text-[9px] text-slate-500 font-semibold">Admin Portal</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 4 Professional Cards */}
              <div className="space-y-4 pt-2">
                <div className="flex gap-3 items-start">
                  <div className="bg-blue-50 text-blue-600 p-2 rounded-xl shrink-0">
                    <Lock className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-extrabold text-slate-900">Authentication</h4>
                    <p className="text-[10px] text-slate-400 leading-relaxed mt-0.5">Authenticated users must provide a valid session before accessing protected resources.</p>
                  </div>
                </div>

                <div className="flex gap-3 items-start">
                  <div className="bg-blue-50 text-blue-600 p-2 rounded-xl shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-extrabold text-slate-900">Customer Access</h4>
                    <p className="text-[10px] text-slate-400 leading-relaxed mt-0.5">Customers can access their own banking information and transactions.</p>
                  </div>
                </div>

                <div className="flex gap-3 items-start">
                  <div className="bg-blue-50 text-blue-600 p-2 rounded-xl shrink-0">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-extrabold text-slate-900">Admin Access</h4>
                    <p className="text-[10px] text-slate-400 leading-relaxed mt-0.5">Administrative features are restricted to authorized admin roles.</p>
                  </div>
                </div>

                <div className="flex gap-3 items-start">
                  <div className="bg-blue-50 text-blue-600 p-2 rounded-xl shrink-0">
                    <ShieldAlert className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-extrabold text-slate-900">Access Protection</h4>
                    <p className="text-[10px] text-slate-400 leading-relaxed mt-0.5">Unauthorized requests are rejected by backend authorization.</p>
                  </div>
                </div>
              </div>

              {/* Access Control Status */}
              <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-2xl space-y-2 text-[10px] font-bold text-blue-800">
                <div className="flex items-center gap-1.5 font-extrabold">✓ Authentication configured</div>
                <div className="flex items-center gap-1.5 font-extrabold">✓ Role-based authorization configured</div>
                <div className="flex items-center gap-1.5 font-extrabold">✓ Protected routes enabled</div>
              </div>

            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
