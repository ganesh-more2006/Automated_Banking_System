import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { 
  Bell, 
  Check, 
  Trash2, 
  ArrowLeft,
  Calendar,
  AlertCircle,
  TrendingUp,
  CreditCard,
  UserCheck,
  ShieldCheck,
  ShieldAlert
} from 'lucide-react';

export default function Notifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const response = await api.get('/notifications');
      setNotifications(response.data);
    } catch (err) {
      setError(err.message || 'Failed to fetch notifications.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAsRead = async (notifId) => {
    try {
      await api.put(`/notifications/${notifId}/read`);
      setNotifications(prev => 
        prev.map(n => n.id === notifId ? { ...n, read_status: true } : n)
      );
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, read_status: true })));
    } catch (err) {
      console.error('Failed to mark all read:', err);
    }
  };

  const getNotifIcon = (type) => {
    switch (type) {
      case 'DEPOSIT_SUCCESS':
      case 'TRANSFER_RECEIVED':
        return <div className="bg-emerald-50 text-emerald-600 p-2.5 rounded-xl"><TrendingUp className="w-5 h-5" /></div>;
      case 'WITHDRAWAL_SUCCESS':
      case 'TRANSFER_SENT':
        return <div className="bg-blue-50 text-blue-600 p-2.5 rounded-xl"><Bell className="w-5 h-5" /></div>;
      case 'LOW_BALANCE':
        return <div className="bg-amber-50 text-amber-600 p-2.5 rounded-xl"><CreditCard className="w-5 h-5" /></div>;
      case 'KYC_APPROVED':
        return <div className="bg-emerald-50 text-emerald-600 p-2.5 rounded-xl"><ShieldCheck className="w-5 h-5" /></div>;
      case 'KYC_REJECTED':
      case 'ACCOUNT_FROZEN':
        return <div className="bg-rose-50 text-rose-600 p-2.5 rounded-xl"><ShieldAlert className="w-5 h-5" /></div>;
      default:
        return <div className="bg-slate-50 text-slate-600 p-2.5 rounded-xl"><Bell className="w-5 h-5" /></div>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-700 flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/95 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <button 
            onClick={() => { window.location.hash = '#/dashboard'; }}
            className="text-sm font-semibold text-slate-500 hover:text-slate-900 flex items-center gap-1.5 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Return to Dashboard
          </button>
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-blue-600 animate-swing" />
            <h1 className="text-base font-extrabold text-slate-900">Security & Alerts Inbox</h1>
          </div>
        </div>
      </header>

      {/* Main Inbox panel */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-6 py-10 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-900">Notifications</h2>
            <p className="text-slate-400 text-xs mt-0.5">Alerts regarding transaction executions, approvals, and security updates.</p>
          </div>
          
          {notifications.some(n => !n.read_status) && (
            <button
              onClick={handleMarkAllAsRead}
              className="text-xs bg-blue-50 hover:bg-blue-100/50 text-blue-700 px-3.5 py-2 rounded-xl font-bold border border-blue-100 transition-all flex items-center gap-1"
            >
              <Check className="w-3.5 h-3.5" /> Mark All Read
            </button>
          )}
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-100 text-rose-700 p-4 rounded-2xl flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
            <span className="text-sm font-semibold">{error}</span>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <div className="w-8 h-8 border-3 border-slate-200 border-t-blue-600 rounded-full animate-spin mb-3"></div>
            <span className="text-sm">Retrieving alert feeds...</span>
          </div>
        ) : notifications.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center text-slate-400 shadow-sm space-y-3">
            <Bell className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="text-base font-bold text-slate-700">Inbox is empty</h3>
            <p className="text-xs max-w-xs mx-auto">
              Transactions, transfers, balance notifications, and KYC compliance alerts will show up here.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {notifications.map(notif => (
              <div 
                key={notif.id}
                className={`bg-white border rounded-3xl p-5 shadow-sm transition-all flex items-start gap-4 hover:border-slate-300 relative ${
                  !notif.read_status ? 'border-blue-200/80 bg-blue-50/10' : 'border-slate-200/80'
                }`}
              >
                {/* Visual Unread dot */}
                {!notif.read_status && (
                  <span className="absolute top-4 right-4 w-2 h-2 rounded-full bg-blue-600"></span>
                )}

                {getNotifIcon(notif.type)}

                <div className="flex-1 space-y-1 pr-6">
                  <div className="flex items-center gap-2">
                    <h4 className="font-extrabold text-slate-900 text-sm">{notif.title}</h4>
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 uppercase">
                      {notif.type.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-slate-600 text-sm leading-relaxed">{notif.message}</p>
                  <div className="flex items-center gap-3 text-[10px] text-slate-400 font-semibold pt-1">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(notif.timestamp).toLocaleString()}
                    </span>
                    {!notif.read_status && (
                      <button 
                        onClick={() => handleMarkAsRead(notif.id)}
                        className="text-blue-600 hover:text-blue-500 font-bold uppercase tracking-wider"
                      >
                        Mark as read
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
