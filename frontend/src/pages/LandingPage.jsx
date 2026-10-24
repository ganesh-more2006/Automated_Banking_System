import React, { useState, useEffect } from 'react';
import { getHealth } from '../services/api';
import { 
  ShieldCheck, 
  Activity, 
  Database, 
  TrendingUp, 
  Cpu, 
  Layers, 
  AlertTriangle, 
  RefreshCw,
  Lock,
  Wallet,
  Coins,
  Send,
  Clock,
  BarChart3,
  ShieldAlert,
  Users,
  FolderLock,
  FileDown,
  BookOpen,
  ExternalLink
} from 'lucide-react';

export default function LandingPage() {
  const [healthStatus, setHealthStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [lastChecked, setLastChecked] = useState(null);
  const [responseTime, setResponseTime] = useState(null);

  const fetchSystemHealth = async () => {
    setLoading(true);
    setError(null);
    const start = performance.now();
    try {
      const data = await getHealth();
      const end = performance.now();
      setResponseTime(Math.round(end - start));
      setHealthStatus(data);
      setLastChecked(new Date().toLocaleTimeString());
    } catch (err) {
      setError(err.message || 'Failed to connect to API backend');
      setHealthStatus(null);
      setResponseTime(null);
      setLastChecked(new Date().toLocaleTimeString());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSystemHealth();
  }, []);

  const getDocsUrl = () => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/v1';
    return apiUrl.replace('/api/v1', '/docs');
  };

  const features = [
    {
      title: "Secure Authentication",
      description: "Identity checks powered by securely hashed user credentials, validation guards, and JWT access tokens.",
      icon: Lock,
      status: "AVAILABLE"
    },
    {
      title: "Bank Account Management",
      description: "Seamless checking and savings account creation, balance tracking, and activation/freeze administrative toggles.",
      icon: Wallet,
      status: "AVAILABLE"
    },
    {
      title: "Deposits & Withdrawals",
      description: "Real-time money ledger updates with automated transaction entry logging and balance alerts.",
      icon: Coins,
      status: "AVAILABLE"
    },
    {
      title: "Fund Transfers",
      description: "Secure customer-to-customer atomic money transfers with complete transaction rollback safety guards.",
      icon: Send,
      status: "AVAILABLE"
    },
    {
      title: "Transaction History",
      description: "Immutable transaction logs tracking references, timestamps, sender/receiver numbers, and descriptions.",
      icon: Clock,
      status: "AVAILABLE"
    },
    {
      title: "Financial Analytics",
      description: "Interactive reports detailing monthly volume trends and transactional distribution charts.",
      icon: BarChart3,
      status: "COMING SOON"
    },
    {
      title: "Fraud Detection",
      description: "Local Machine Learning fraud classification pipeline evaluating transaction risk factors offline.",
      icon: ShieldAlert,
      status: "COMING SOON"
    },
    {
      title: "Admin Management",
      description: "Centralized administrator console control desk for KYC validation and account operations auditing.",
      icon: Users,
      status: "AVAILABLE"
    },
    {
      title: "Audit Logging",
      description: "Persistent read-only catalog tracing security and account operational actions.",
      icon: FolderLock,
      status: "AVAILABLE"
    },
    {
      title: "Statement Export",
      description: "Dynamic printable ledger statement document generation for external compliance reporting.",
      icon: FileDown,
      status: "AVAILABLE"
    }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-700 selection:bg-blue-600 selection:text-white">
      {/* Header / Nav */}
      <header className="border-b border-slate-200 bg-white/95 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <button 
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex items-center gap-3"
          >
            <span className="text-2xl">🏦</span>
            <span className="font-extrabold text-xl tracking-tight text-blue-600">
              APEX BANKING
            </span>
          </button>
          <div className="flex items-center gap-6">
            <button 
              onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
              className="text-slate-500 hover:text-blue-600 transition-colors text-sm font-semibold"
            >
              Features
            </button>
            <button 
              onClick={() => setShowStatusModal(true)}
              className="text-slate-500 hover:text-blue-600 transition-colors text-sm font-semibold flex items-center gap-1.5"
            >
              <span className={`w-2 h-2 rounded-full ${healthStatus ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></span>
              Live Status
            </button>
            <a 
              href="#/login" 
              className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-xl text-sm font-bold text-white shadow-sm transition-all"
            >
              Launch Portal
            </a>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="relative overflow-hidden py-24 md:py-32">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-100/40 rounded-full blur-[100px] pointer-events-none"></div>

          <div className="max-w-5xl mx-auto px-6 text-center relative z-10">
            <span className="px-3.5 py-1 rounded-full border border-blue-200 bg-blue-50 text-blue-700 text-xs font-bold tracking-wider uppercase mb-6 inline-block">
              Core Banking Core Active
            </span>
            <h1 className="text-4xl md:text-6xl font-black tracking-tight text-slate-900 mb-6 leading-tight">
              Automated Banking <br />
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Management System
              </span>
            </h1>
            <p className="text-lg md:text-xl text-slate-500 max-w-3xl mx-auto mb-10 leading-relaxed">
              Experience a high-performance banking foundation powered by a FastAPI core, 
              React UI interface, SQLAlchemy ORM, and integrated AI-driven modules.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <button 
                onClick={() => {
                  document.getElementById('system-status')?.scrollIntoView({ behavior: 'smooth' });
                  fetchSystemHealth();
                }}
                className="bg-slate-800 hover:bg-slate-700 text-white px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2"
              >
                Check API Status <Layers className="w-5 h-5 text-blue-400" />
              </button>
              <a 
                href="#/api-docs" 
                className="bg-white border border-slate-200 hover:border-slate-300 text-slate-700 px-6 py-3 rounded-xl font-bold shadow-sm transition-all flex items-center gap-2"
              >
                Interactive API Docs <ShieldCheck className="w-5 h-5 text-emerald-500" />
              </a>
            </div>
          </div>
        </section>

        {/* Improved Features Section */}
        <section id="features" className="py-20 bg-white border-y border-slate-200">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-black tracking-tight text-slate-900 mb-4">Core Platform Capabilities</h2>
              <p className="text-slate-500 max-w-2xl mx-auto">Built from the ground up for high reliability, security audits, and modern SaaS banking transactions.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feat, i) => {
                const Icon = feat.icon;
                const isAvailable = feat.status === 'AVAILABLE';
                return (
                  <div key={i} className="bg-slate-50 p-6 rounded-3xl border border-slate-100 hover:border-blue-200 hover:shadow-md transition-all group relative">
                    <span className={`absolute top-4 right-4 text-[9px] font-black px-2.5 py-0.5 rounded-full border ${
                      isAvailable 
                        ? 'bg-emerald-50 border-emerald-100 text-emerald-700' 
                        : 'bg-slate-100 border-slate-200 text-slate-400'
                    }`}>
                      {feat.status}
                    </span>
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mb-6 group-hover:scale-105 transition-transform">
                      <Icon className="w-5 h-5" />
                    </div>
                    <h3 className="text-base font-extrabold text-slate-900 mb-2">{feat.title}</h3>
                    <p className="text-slate-500 leading-relaxed text-xs">
                      {feat.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Real-time Health Monitor / API Test Section */}
        <section id="system-status" className="py-20 bg-slate-50 border-t border-slate-200">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
              
              {/* Left Column: API Documentation Preview Card */}
              <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm flex flex-col justify-between hover:border-slate-300 hover:shadow-md transition-all duration-300 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/5 rounded-full blur-[60px] pointer-events-none"></div>
                
                <div className="space-y-6">
                  {/* Header and Large Icon */}
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-sm shrink-0">
                      <BookOpen className="w-7 h-7" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <h2 className="text-lg font-black text-slate-950">Interactive API Documentation</h2>
                        <span className="flex h-2.5 w-2.5 relative">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                        </span>
                      </div>
                      <p className="text-slate-500 text-xs leading-relaxed">
                        Explore and understand the APIs powering the Automated Banking Management System.
                      </p>
                    </div>
                  </div>

                  {/* Three Small Info Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="bg-slate-50 border border-slate-100 p-3.5 rounded-2xl flex flex-col items-center text-center space-y-1 hover:bg-white hover:border-blue-200 transition-all">
                      <span className="text-base">🔐</span>
                      <span className="text-xs font-extrabold text-slate-900">Authentication</span>
                      <span className="text-[10px] text-slate-400">Secure API access</span>
                    </div>
                    
                    <div className="bg-slate-50 border border-slate-100 p-3.5 rounded-2xl flex flex-col items-center text-center space-y-1 hover:bg-white hover:border-blue-200 transition-all">
                      <span className="text-base">🏦</span>
                      <span className="text-xs font-extrabold text-slate-900">Banking APIs</span>
                      <span className="text-[10px] text-slate-400">Accounts & txs</span>
                    </div>

                    <div className="bg-slate-50 border border-slate-100 p-3.5 rounded-2xl flex flex-col items-center text-center space-y-1 hover:bg-white hover:border-blue-200 transition-all relative">
                      <span className="absolute -top-1.5 right-1.5 text-[8px] bg-slate-100 border border-slate-200 font-extrabold px-1.5 py-0.5 rounded-full text-slate-400 scale-90">Planned</span>
                      <span className="text-base">🤖</span>
                      <span className="text-xs font-extrabold text-slate-900">ML Ready</span>
                      <span className="text-[10px] text-slate-400">Fraud detection</span>
                    </div>
                  </div>

                  {/* Status Indicator */}
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-500 bg-slate-50/50 px-4 py-2.5 rounded-xl border border-slate-100 w-fit">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    API Documentation Available
                  </div>
                </div>

                {/* Two Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-slate-100 mt-6">
                  <a 
                    href={getDocsUrl()} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="flex-1 text-center bg-blue-600 hover:bg-blue-500 text-white font-extrabold px-5 py-2.5 rounded-xl text-xs transition-all shadow-sm flex items-center justify-center gap-1.5"
                  >
                    Open Swagger UI <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <a 
                    href="#/api-docs" 
                    className="flex-1 text-center bg-slate-100 border border-slate-200 hover:bg-slate-200 text-slate-700 font-extrabold px-5 py-2.5 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5"
                  >
                    View API Overview <BookOpen className="w-3.5 h-3.5 text-slate-500" />
                  </a>
                </div>
              </div>

              {/* Right Column: Powerful Banking Infrastructure */}
              <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm flex flex-col justify-between hover:border-slate-300 hover:shadow-md transition-all duration-300">
                <div className="space-y-6">
                  {/* Header */}
                  <div>
                    <h3 className="text-lg font-black text-slate-950">Powerful Banking Infrastructure</h3>
                    <p className="text-slate-500 text-xs leading-relaxed mt-1">
                      Secure, scalable technology powering your complete digital banking experience.
                    </p>
                  </div>

                  {/* 3 High-Level Cards */}
                  <div className="space-y-4">
                    {/* Card 1 */}
                    <div className="flex gap-4 items-start bg-slate-50 p-4 rounded-2xl border border-slate-100 hover:border-blue-100 hover:bg-white transition-all group">
                      <div className="bg-blue-50 text-blue-600 p-2.5 rounded-xl shrink-0">
                        <Lock className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-extrabold text-slate-900">Secure & Reliable</h4>
                        <p className="text-[10px] text-slate-400 leading-relaxed mt-0.5">Built with modern authentication and protected access controls.</p>
                      </div>
                    </div>

                    {/* Card 2 */}
                    <div className="flex gap-4 items-start bg-slate-50 p-4 rounded-2xl border border-slate-100 hover:border-blue-100 hover:bg-white transition-all group">
                      <div className="bg-blue-50 text-blue-600 p-2.5 rounded-xl shrink-0">
                        <Wallet className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-extrabold text-slate-900">Banking Operations</h4>
                        <p className="text-[10px] text-slate-400 leading-relaxed mt-0.5">Manage accounts, transactions, transfers and financial activity.</p>
                      </div>
                    </div>

                    {/* Card 3 */}
                    <div className="flex gap-4 items-start bg-slate-50 p-4 rounded-2xl border border-slate-100 hover:border-blue-100 hover:bg-white transition-all group">
                      <div className="bg-blue-50 text-blue-600 p-2.5 rounded-xl shrink-0">
                        <Cpu className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-extrabold text-slate-900">Intelligent Monitoring</h4>
                        <p className="text-[10px] text-slate-400 leading-relaxed mt-0.5">Advanced analytics and machine-learning-ready fraud monitoring.</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* System Link Status and Refresh */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-100 mt-6 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-slate-500">
                    <span>System Link:</span>
                    {loading ? (
                      <span className="text-slate-400">Verifying...</span>
                    ) : error ? (
                      <span className="text-rose-600 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>Offline</span>
                    ) : healthStatus ? (
                      <span className="text-emerald-700 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>Online</span>
                    ) : (
                      <span className="text-slate-400">Offline</span>
                    )}
                  </div>
                  <button 
                    onClick={fetchSystemHealth}
                    disabled={loading}
                    className="text-blue-600 hover:text-blue-500 text-[10px] font-black flex items-center gap-1 uppercase tracking-wider"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                    Recheck Status
                  </button>
                </div>
              </div>

            </div>
          </div>
        </section>
      </main>

      {/* Live Status Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-sm w-full space-y-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-black text-slate-900">Live Status Inspector</h3>
                <p className="text-slate-400 text-xs mt-0.5">Real-time health check console</p>
              </div>
              <button 
                onClick={() => setShowStatusModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center text-sm border-b border-slate-100 pb-3">
                <span className="text-slate-500 font-semibold">Web Frontend</span>
                <span className="flex items-center gap-1.5 font-bold text-emerald-600">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  Online
                </span>
              </div>
              
              <div className="flex justify-between items-center text-sm border-b border-slate-100 pb-3">
                <span className="text-slate-500 font-semibold">Backend API</span>
                <span className={`flex items-center gap-1.5 font-bold ${healthStatus ? 'text-emerald-600' : 'text-rose-600'}`}>
                  <span className={`w-2 h-2 rounded-full ${healthStatus ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                  {healthStatus ? 'Online' : 'Offline'}
                </span>
              </div>

              <div className="flex justify-between items-center text-sm border-b border-slate-100 pb-3">
                <span className="text-slate-500 font-semibold">Database Engine</span>
                <span className={`flex items-center gap-1.5 font-bold ${healthStatus?.database === 'connected' ? 'text-emerald-600' : 'text-rose-600'}`}>
                  <span className={`w-2 h-2 rounded-full ${healthStatus?.database === 'connected' ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                  {healthStatus?.database === 'connected' ? 'Connected' : 'Unavailable'}
                </span>
              </div>

              {responseTime !== null && (
                <div className="flex justify-between items-center text-sm border-b border-slate-100 pb-3">
                  <span className="text-slate-500 font-semibold">Response Time</span>
                  <span className="font-mono text-slate-700 font-bold">{responseTime} ms</span>
                </div>
              )}

              {lastChecked && (
                <div className="flex justify-between items-center text-xs text-slate-400 pt-1">
                  <span>Last Checked</span>
                  <span className="font-mono">{lastChecked}</span>
                </div>
              )}
            </div>

            <button 
              onClick={fetchSystemHealth}
              disabled={loading}
              className="w-full py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh Check
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-8">
        <div className="max-w-7xl mx-auto px-6 text-center text-slate-400 text-sm">
          <p>© 2026 Automated Banking Management System. Designed for portfolio demonstration.</p>
        </div>
      </footer>
    </div>
  );
}
