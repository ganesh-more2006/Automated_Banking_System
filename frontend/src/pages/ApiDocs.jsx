import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { 
  Activity, 
  Database, 
  TrendingUp, 
  Cpu, 
  RefreshCw,
  Lock,
  Wallet,
  BookOpen,
  ArrowLeft,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';

export default function ApiDocs() {
  const [healthStatus, setHealthStatus] = useState(null);
  const [mlHealth, setMlHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [responseTime, setResponseTime] = useState(null);
  const [lastChecked, setLastChecked] = useState(null);

  const fetchApiStatus = async () => {
    setLoading(true);
    setError(null);
    const start = performance.now();
    try {
      const res = await api.get('/health');
      const end = performance.now();
      setResponseTime(Math.round(end - start));
      setHealthStatus(res.data);
      setLastChecked(new Date().toLocaleTimeString());
      
      // Fetch ML health status
      try {
        const mlRes = await api.get('/ml/health');
        setMlHealth(mlRes.data);
      } catch {
        setMlHealth({ status: 'not_ready', model_loaded: false, model_version: 'N/A' });
      }
    } catch (err) {
      setError(err.message || 'API backend offline');
      setHealthStatus(null);
      setMlHealth(null);
      setLastChecked(new Date().toLocaleTimeString());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApiStatus();
  }, []);

  const getDocsUrl = (docsPath) => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/v1';
    return apiUrl.replace('/api/v1', docsPath);
  };

  const platformCards = [
    {
      title: "Authentication",
      description: "Secure identity and access management",
      icon: Lock
    },
    {
      title: "Banking Services",
      description: "Account and transaction management",
      icon: Wallet
    },
    {
      title: "Analytics",
      description: "Financial insights and reporting",
      icon: TrendingUp
    },
    {
      title: "Machine Learning",
      description: "Fraud detection and risk analysis",
      icon: Cpu
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-700 flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/95 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <button 
            onClick={() => { window.location.hash = '#/'; }}
            className="text-sm font-semibold text-slate-500 hover:text-slate-900 flex items-center gap-1.5 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Return to Welcome
          </button>
          
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-600" />
            <span className="font-extrabold text-base text-slate-900 tracking-tight">DEVELOPER COMPLIANCE HUB</span>
          </div>
        </div>
      </header>

      {/* Hero Banner */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-10 space-y-10">
        <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-blue-50 rounded-full blur-[90px] pointer-events-none"></div>
          
          <div className="space-y-3 relative z-10">
            <span className="px-3 py-1 rounded-full border border-blue-100 bg-blue-50 text-blue-700 text-xs font-black tracking-widest uppercase">
              APEX BANKING API
            </span>
            <h1 className="text-3xl font-black text-slate-950">Interactive API Documentation</h1>
            <p className="text-slate-500 text-sm max-w-xl leading-relaxed">
              Explore and understand the APIs powering the Automated Banking Management System.
            </p>
            <div className="flex flex-wrap gap-2 text-xs font-bold pt-2">
              <span className="bg-slate-100 px-3 py-1 rounded-lg">API Version: 1.0.0</span>
              <span className="bg-slate-100 px-3 py-1 rounded-lg">Framework: FastAPI</span>
              <span className="bg-slate-100 px-3 py-1 rounded-lg">Type: REST API</span>
            </div>
          </div>

          <div className="flex gap-3 relative z-10 shrink-0 w-full md:w-auto">
            <a 
              href={getDocsUrl('/docs')} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="flex-1 md:flex-none text-center bg-blue-600 hover:bg-blue-500 text-white font-extrabold px-5 py-3 rounded-xl text-sm transition-all shadow-sm flex items-center justify-center gap-1.5"
            >
              Open API Documentation <ExternalLink className="w-4 h-4" />
            </a>
            <a 
              href={getDocsUrl('/redoc')} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="flex-1 md:flex-none text-center bg-slate-100 border border-slate-200 hover:bg-slate-200 text-slate-700 font-extrabold px-5 py-3 rounded-xl text-sm transition-all flex items-center justify-center gap-1.5"
            >
              Open ReDoc <ChevronRight className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* Real-time Status Panel */}
        <div className="grid md:grid-cols-3 gap-6">
          {/* Health Inspector Card */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-extrabold text-slate-900 border-b border-slate-100 pb-3 flex items-center justify-between">
              <span>🖥️ System Live Status</span>
              <button 
                onClick={fetchApiStatus}
                disabled={loading}
                className="text-slate-400 hover:text-blue-600 transition-colors"
                title="Refresh Status"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </h3>

            {loading ? (
              <div className="text-slate-400 text-xs py-4 flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-slate-300 border-t-blue-600 rounded-full animate-spin"></span>
                Querying API...
              </div>
            ) : error ? (
              <div className="space-y-1 py-2">
                <div className="text-rose-600 font-bold text-sm flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                  ● API Offline
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">Could not reach the FastAPI service. Ensure backend is running.</p>
              </div>
            ) : healthStatus ? (
              <div className="space-y-3 text-xs">
                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                  <span className="text-slate-400 font-bold uppercase tracking-wider">API Server</span>
                  <span className="text-emerald-700 font-bold flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    API Online
                  </span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                  <span className="text-slate-400 font-bold uppercase tracking-wider">Database Link</span>
                  <span className={`font-bold flex items-center gap-1 ${healthStatus.database === 'connected' ? 'text-emerald-700' : 'text-rose-700'}`}>
                    <span className={`w-2 h-2 rounded-full ${healthStatus.database === 'connected' ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                    {healthStatus.database === 'connected' ? 'Connected' : 'Unavailable'}
                  </span>
                </div>
                {responseTime !== null && (
                  <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                    <span className="text-slate-400 font-bold uppercase tracking-wider">Response Latency</span>
                    <span className="font-mono text-slate-700 font-bold">{responseTime} ms</span>
                  </div>
                )}
                <div className="text-[10px] text-slate-400 text-right font-mono">Last Checked: {lastChecked}</div>
              </div>
            ) : null}
          </div>

          {/* Machine Learning Status Card */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-extrabold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <span>🤖 Machine Learning</span>
            </h3>
            
            {loading ? (
              <div className="text-slate-400 text-xs py-4 flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-slate-300 border-t-blue-600 rounded-full animate-spin"></span>
                Evaluating loader states...
              </div>
            ) : mlHealth ? (
              <div className="space-y-3 text-xs">
                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                  <span className="text-slate-400 font-bold uppercase tracking-wider">Model Status</span>
                  <span className={`px-2.5 py-0.5 rounded-full font-extrabold border text-[10px] ${
                    mlHealth.model_loaded 
                      ? 'bg-emerald-50 border-emerald-100 text-emerald-700' 
                      : 'bg-amber-50 border-amber-200 text-amber-700'
                  }`}>
                    {mlHealth.model_loaded ? 'ML Integration Ready' : 'Model Not Loaded'}
                  </span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                  <span className="text-slate-400 font-bold uppercase tracking-wider">ML Version</span>
                  <span className="font-mono text-slate-700 font-bold">{mlHealth.model_version}</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                  <span className="text-slate-400 font-bold uppercase tracking-wider">Prediction API</span>
                  <span className="font-bold text-slate-700">{mlHealth.model_loaded ? 'Available' : 'Rules-Only Fallback'}</span>
                </div>
                <div className="text-[10px] text-slate-400 text-right leading-relaxed italic">
                  Local joblib isolation forest engine.
                </div>
              </div>
            ) : (
              <div className="text-slate-400 text-xs py-2 italic leading-relaxed">
                Could not connect to ML services. Ensure backend server is active.
              </div>
            )}
          </div>

          {/* Model Compliance Card */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-3 flex flex-col justify-between">
            <div className="space-y-2">
              <h3 className="text-sm font-extrabold text-slate-900 border-b border-slate-100 pb-3">
                ⚖️ ML Readiness Info
              </h3>
              <p className="text-slate-500 text-xs leading-relaxed">
                This project features offline anomaly classifications. When a model file is compiled and loaded locally, risk calculations assess velocities, thresholds, and accounts age weights.
              </p>
            </div>
            <span className="text-[10px] bg-blue-50 border border-blue-100 text-blue-800 font-black px-3 py-1 rounded-lg text-center tracking-widest uppercase mt-4">
              INTEGRATION READY
            </span>
          </div>
        </div>

        {/* API Platform Section */}
        <div className="bg-white border border-slate-200 rounded-3xl p-8 md:p-10 shadow-sm space-y-8">
          <div>
            <h2 className="text-2xl font-black text-slate-950">API Platform</h2>
            <p className="text-slate-400 text-sm mt-1">
              Secure and scalable APIs powering the Automated Banking Management System.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {platformCards.map((card, idx) => {
              const Icon = card.icon;
              return (
                <div key={idx} className="bg-slate-50 border border-slate-100 p-6 rounded-3xl flex items-start gap-4 hover:border-blue-200 hover:shadow-md transition-all group">
                  <div className="bg-blue-50 text-blue-600 p-3.5 rounded-2xl shrink-0 group-hover:scale-105 transition-transform">
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="space-y-1 pt-1">
                    <h3 className="font-extrabold text-slate-900 text-base">{card.title}</h3>
                    <p className="text-slate-500 text-sm leading-relaxed">{card.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
