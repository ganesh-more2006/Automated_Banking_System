import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { 
  Users, 
  CreditCard, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Activity, 
  AlertTriangle,
  LayoutDashboard,
  FolderLock,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  Menu,
  ShieldCheck,
  TrendingUp,
  FileSpreadsheet,
  Settings,
  HelpCircle,
  ShieldAlert,
  Calendar,
  RotateCcw,
  Info,
  UserX,
  UserCheck
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, Legend, PieChart, Pie, Cell } from 'recharts';

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  
  // Navigation active tab
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Lists & stats state
  const [stats, setStats] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [kycSubmissions, setKycSubmissions] = useState([]);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [kycFilter, setKycFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  // Detail selection states
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedAccountTxs, setSelectedAccountTxs] = useState([]);
  const [selectedTx, setSelectedTx] = useState(null);
  const [selectedKyc, setSelectedKyc] = useState(null);
  
  // Modals & Action Forms
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState(null); // { title, message, onConfirm, reasonRequired, reasonLabel }
  const [actionReason, setActionReason] = useState('');
  
  // UI states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [resStats, resCusts, resAccs, resTxs, resAudits, resKyc] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/users'),
        api.get('/admin/accounts'),
        api.get('/admin/transactions'),
        api.get('/admin/audit-logs'),
        api.get('/admin/kyc')
      ]);
      
      setStats(resStats.data);
      setCustomers(resCusts.data);
      setAccounts(resAccs.data);
      setTransactions(resTxs.data);
      setAuditLogs(resAudits.data);
      setKycSubmissions(resKyc.data);
    } catch (err) {
      setError(err.message || 'Failed to load administrator records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && user.role === 'ADMIN') {
      loadData();
    }
  }, [user]);

  // Actions execution handler
  const executeAdminAction = async () => {
    if (!confirmConfig) return;
    setError(null);
    setSuccessMsg(null);
    
    if (confirmConfig.reasonRequired && !actionReason.trim()) {
      setError('Please provide a reason to perform this action.');
      return;
    }

    try {
      await confirmConfig.onConfirm(actionReason);
      setShowConfirmModal(false);
      setActionReason('');
      setConfirmConfig(null);
      loadData(); // reload all data
    } catch (err) {
      setError(err.message || 'Operation failed.');
    }
  };

  // Actions configuration builder
  const promptKYCUpdate = (kycId, newStatus) => {
    setConfirmConfig({
      title: `Update KYC to ${newStatus}`,
      message: `Are you sure you want to change the KYC verification status for Submission #${kycId} to ${newStatus}?`,
      reasonRequired: newStatus === 'REJECTED',
      reasonLabel: 'Rejection Reason Note',
      onConfirm: async (reason) => {
        if (newStatus === 'APPROVED') {
          await api.post(`/admin/kyc/${kycId}/approve`);
        } else {
          await api.post(`/admin/kyc/${kycId}/reject`, { rejection_reason: reason });
        }
        setSuccessMsg("KYC status updated successfully.");
      }
    });
    setShowConfirmModal(true);
  };

  const promptAccountStatusToggle = (accountNumber, currentStatus) => {
    const nextStatus = currentStatus === 'ACTIVE' ? 'FROZEN' : 'ACTIVE';
    setConfirmConfig({
      title: `${nextStatus === 'FROZEN' ? 'Freeze' : 'Unfreeze'} Account`,
      message: `Do you want to toggle bank account ${accountNumber} to ${nextStatus}? Frozen accounts cannot execute deposits, withdrawals, or transfers.`,
      reasonRequired: true,
      reasonLabel: 'Reason for Status Adjustment',
      onConfirm: async (reason) => {
        const res = await api.put(`/admin/accounts/${accountNumber}/status`, {
          status: nextStatus,
          reason: reason
        });
        setSuccessMsg(res.data.message);
      }
    });
    setShowConfirmModal(true);
  };

  const promptUserActivationToggle = (userId, currentActive) => {
    const nextStatus = currentActive ? 'SUSPENDED' : 'ACTIVE';
    setConfirmConfig({
      title: `${currentActive ? 'Suspend' : 'Reactivate'} Customer Account`,
      message: `Are you sure you want to change login access status for Customer #${userId} to ${nextStatus}? Suspended customer logins are blocked from the portal.`,
      reasonRequired: true,
      reasonLabel: 'Reason for Credentials Action',
      onConfirm: async (reason) => {
        const res = await api.put(`/admin/users/${userId}/status`, {
          status: nextStatus,
          reason: reason
        });
        setSuccessMsg(res.data.message);
      }
    });
    setShowConfirmModal(true);
  };

  const promptTransactionReversal = (referenceNumber) => {
    setConfirmConfig({
      title: 'Reverse Financial Transaction',
      message: `You are requesting a reversal for transaction reference: ${referenceNumber}. This will create an auditable offsetting adjustment transaction. Historical logs will not be deleted or modified.`,
      reasonRequired: true,
      reasonLabel: 'Administrative Reversal Reason',
      onConfirm: async (reason) => {
        const res = await api.post(`/admin/transactions/${referenceNumber}/reverse`, {
          reason: reason
        });
        setSuccessMsg(res.data.message);
      }
    });
    setShowConfirmModal(true);
  };

  const viewCustomerDetails = (cust) => {
    // Find customer's accounts and transactions
    const custAccounts = accounts.filter(a => a.user_id === cust.id);
    setSelectedCustomer({
      ...cust,
      accounts: custAccounts
    });
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(val);
  };

  if (!user || user.role !== 'ADMIN') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white border border-slate-200 rounded-3xl p-8 max-w-md w-full text-center space-y-4 shadow-lg">
          <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto animate-pulse" />
          <h3 className="text-xl font-bold text-slate-900">Access Denied</h3>
          <p className="text-slate-500 text-sm">
            You do not have administrative privileges to access this console portal.
          </p>
          <button 
            onClick={() => { window.location.hash = '#/dashboard'; }}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold transition-all shadow-sm"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Sidebar navigation options
  const sidebarItems = [
    { name: 'Dashboard', icon: LayoutDashboard },
    { name: 'Customers', icon: Users },
    { name: 'Accounts', icon: CreditCard },
    { name: 'Transactions', icon: FileSpreadsheet },
    { name: 'KYC Management', icon: ShieldCheck },
    { name: 'Fraud Monitoring', icon: AlertTriangle },
    { name: 'Audit Logs', icon: FolderLock }
  ];

  const COLORS = ['#3B82F6', '#EF4444', '#10B981'];

  // Apply filters in customer records
  const filteredCustomers = customers.filter(c => {
    const query = searchQuery.toLowerCase();
    const matchSearch = 
      c.full_name?.toLowerCase().includes(query) || 
      c.email?.toLowerCase().includes(query) || 
      c.phone?.includes(query) ||
      c.id.toString() === query;
      
    const matchKyc = kycFilter ? c.kyc_status === kycFilter : true;
    const matchStatus = statusFilter ? (statusFilter === 'ACTIVE' ? c.is_active : !c.is_active) : true;
    
    return matchSearch && matchKyc && matchStatus;
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-700 flex flex-col md:flex-row selection:bg-blue-600 selection:text-white">
      
      {/* Mobile Header */}
      <div className="md:hidden border-b border-slate-200 bg-white px-6 py-4 flex justify-between items-center z-50">
        <div className="flex items-center gap-2">
          <span className="text-xl">🏦</span>
          <span className="font-extrabold text-slate-900">APEX CONTROL</span>
        </div>
        <button 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 border border-slate-200 rounded-xl"
        >
          <Menu className="w-5 h-5 text-slate-700" />
        </button>
      </div>

      {/* Sidebar navigation */}
      <aside className={`w-64 bg-white border-r border-slate-200 flex flex-col fixed md:sticky top-0 bottom-0 left-0 z-40 transition-transform ${
        mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      }`}>
        <div className="h-16 px-6 border-b border-slate-200 hidden md:flex items-center gap-3">
          <span className="text-2xl">🏦</span>
          <span className="font-black text-slate-900 text-sm tracking-tight uppercase">APEX CONTROL CENTER</span>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.name;
            return (
              <button
                key={item.name}
                onClick={() => { setActiveTab(item.name); setMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                  isActive 
                    ? 'bg-blue-50 text-blue-600 border-l-4 border-blue-600' 
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                {item.name}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200 space-y-3">
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-extrabold flex items-center justify-center text-xs">A</div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-900 truncate">{user.email}</p>
              <p className="text-[9px] text-slate-400 font-black">SYSTEM ADMINISTRATOR</p>
            </div>
          </div>
          <button 
            onClick={logout}
            className="w-full py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-950 transition-colors"
          >
            Sign Out Portal
          </button>
        </div>
      </aside>

      {/* Main Panel Content */}
      <main className="flex-1 min-w-0 p-6 md:p-10 space-y-6">
        
        {/* Status Indicators */}
        <div className="space-y-3">
          {error && (
            <div className="bg-rose-50 border border-rose-100 text-rose-700 p-4 rounded-2xl flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0" />
              <span className="text-sm font-semibold">{error}</span>
            </div>
          )}
          {successMsg && (
            <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 p-4 rounded-2xl flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
              <span className="text-sm font-semibold">{successMsg}</span>
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <div className="w-10 h-10 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
            <span>Querying active databases...</span>
          </div>
        ) : (
          <>
            {/* VIEW 1: DASHBOARD OVERVIEW */}
            {activeTab === 'Dashboard' && stats && (
              <div className="space-y-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Total Customers */}
                  <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm flex items-start gap-4">
                    <div className="bg-blue-50 p-3 rounded-2xl text-blue-600"><Users className="w-6 h-6" /></div>
                    <div>
                      <span className="text-slate-400 text-xs font-bold uppercase tracking-wider block">Total Customers</span>
                      <span className="text-3xl font-black text-slate-900">{stats.kpis.total_customers}</span>
                    </div>
                  </div>

                  {/* Total Accounts */}
                  <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm flex items-start gap-4">
                    <div className="bg-indigo-50 p-3 rounded-2xl text-indigo-600"><CreditCard className="w-6 h-6" /></div>
                    <div>
                      <span className="text-slate-400 text-xs font-bold uppercase tracking-wider block">Total Accounts</span>
                      <span className="text-3xl font-black text-slate-900">{stats.kpis.total_accounts}</span>
                    </div>
                  </div>

                  {/* Total Deposits */}
                  <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm flex items-start gap-4">
                    <div className="bg-emerald-50 p-3 rounded-2xl text-emerald-600"><ArrowDownLeft className="w-6 h-6" /></div>
                    <div>
                      <span className="text-slate-400 text-xs font-bold uppercase tracking-wider block">Total Deposits</span>
                      <span className="text-2xl font-black text-slate-900">{formatCurrency(stats.kpis.total_deposits)}</span>
                    </div>
                  </div>

                  {/* Total Withdrawals */}
                  <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm flex items-start gap-4">
                    <div className="bg-rose-50 p-3 rounded-2xl text-rose-600"><ArrowUpRight className="w-6 h-6" /></div>
                    <div>
                      <span className="text-slate-400 text-xs font-bold uppercase tracking-wider block">Total Withdrawals</span>
                      <span className="text-2xl font-black text-slate-900">{formatCurrency(stats.kpis.total_withdrawals)}</span>
                    </div>
                  </div>

                  {/* Today's Activity */}
                  <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm flex items-start gap-4">
                    <div className="bg-amber-50 p-3 rounded-2xl text-amber-600"><Activity className="w-6 h-6" /></div>
                    <div>
                      <span className="text-slate-400 text-xs font-bold uppercase tracking-wider block">Today's Transactions</span>
                      <span className="text-3xl font-black text-slate-900">{stats.kpis.today_transactions}</span>
                    </div>
                  </div>

                  {/* Flagged Suspicious */}
                  <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm flex items-start gap-4">
                    <div className="bg-orange-50 p-3 rounded-2xl text-orange-600"><AlertTriangle className="w-6 h-6" /></div>
                    <div>
                      <span className="text-slate-400 text-xs font-bold uppercase tracking-wider block">Suspicious Logs</span>
                      <span className="text-3xl font-black text-slate-950">{stats.kpis.suspicious_transactions}</span>
                    </div>
                  </div>
                </div>

                {/* Analytical Graphs */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm lg:col-span-2">
                    <h4 className="text-base font-bold text-slate-900 mb-6">Aggregate Deposits vs Withdrawals</h4>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={stats.monthly_volume}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                          <XAxis dataKey="month" stroke="#94A3B8" fontSize={11} tickLine={false} />
                          <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="deposits" fill="#10B981" radius={[4, 4, 0, 0]} name="Deposits" />
                          <Bar dataKey="withdrawals" fill="#EF4444" radius={[4, 4, 0, 0]} name="Withdrawals" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm">
                    <h4 className="text-base font-bold text-slate-900 mb-6 font-semibold">Distribution Analysis</h4>
                    <div className="h-64 flex justify-center items-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={stats.type_distribution}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {stats.type_distribution.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend verticalAlign="bottom" height={36} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* Recent Account Applications / Accounts */}
                <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="text-base font-bold text-slate-900">Recent Customer Account Applications</h4>
                      <p className="text-slate-400 text-xs mt-0.5">Submitted customer bank account applications and active ledgers.</p>
                    </div>
                    <button
                      onClick={() => setActiveTab('Accounts')}
                      className="text-xs font-bold text-blue-600 hover:text-blue-500 transition-colors"
                    >
                      View All Accounts →
                    </button>
                  </div>

                  {accounts.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-sm bg-slate-50 border rounded-2xl">
                      No account applications registered yet.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-200 text-slate-400 text-xs font-bold uppercase tracking-wider">
                            <th className="py-3 pr-4">Customer Name</th>
                            <th className="py-3 px-4">Account Type</th>
                            <th className="py-3 px-4">Account Number</th>
                            <th className="py-3 px-4">IFSC</th>
                            <th className="py-3 px-4">Account Status</th>
                            <th className="py-3 px-4">KYC Status</th>
                            <th className="py-3 pl-4 text-right">Created Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                          {accounts.slice(0, 5).map(acc => (
                            <tr key={acc.account_number} className="hover:bg-slate-50/40 transition-colors">
                              <td className="py-3.5 pr-4 font-semibold text-slate-900">
                                {acc.customer_name}
                                <span className="block text-[10px] text-slate-400 font-normal">{acc.customer_email}</span>
                              </td>
                              <td className="py-3.5 px-4 font-bold text-slate-700">
                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase ${
                                  acc.account_type === 'SAVINGS' 
                                    ? 'bg-blue-50 text-blue-700 border border-blue-100' 
                                    : 'bg-purple-50 text-purple-700 border border-purple-100'
                                }`}>
                                  {acc.account_type}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 font-mono font-bold text-slate-950">{acc.account_number}</td>
                              <td className="py-3.5 px-4 font-mono text-xs text-slate-600 font-semibold">{acc.ifsc_code || 'APEX0000123'}</td>
                              <td className="py-3.5 px-4">
                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                                  acc.status === 'ACTIVE' 
                                    ? 'bg-emerald-50 border-emerald-100 text-emerald-700' 
                                    : acc.status === 'FROZEN'
                                    ? 'bg-orange-50 border-orange-100 text-orange-700 animate-pulse'
                                    : 'bg-slate-100 border-slate-200 text-slate-400'
                                }`}>
                                  {acc.status}
                                </span>
                              </td>
                              <td className="py-3.5 px-4">
                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                                  acc.kyc_status === 'APPROVED' 
                                    ? 'bg-emerald-50 border-emerald-100 text-emerald-700' 
                                    : acc.kyc_status === 'REJECTED' 
                                    ? 'bg-rose-50 border-rose-100 text-rose-700' 
                                    : 'bg-amber-50 border-amber-100 text-amber-700'
                                }`}>
                                  {acc.kyc_status || 'PENDING'}
                                </span>
                              </td>
                              <td className="py-3.5 pl-4 text-right text-slate-500 text-xs font-medium">
                                {acc.created_at ? new Date(acc.created_at).toLocaleDateString() : 'N/A'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* VIEW 2: COMPLETE CUSTOMERS MANAGEMENT */}
            {activeTab === 'Customers' && (
              <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">Customer Accounts</h3>
                    <p className="text-slate-400 text-xs mt-0.5">Control customer permissions, view transactions, and update profiles.</p>
                  </div>
                  
                  {/* Filters Panel */}
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input 
                        type="text"
                        placeholder="Search email, name..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 pr-4 py-2 border border-slate-200 bg-slate-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <select
                      value={kycFilter}
                      onChange={(e) => setKycFilter(e.target.value)}
                      className="px-3 py-2 border border-slate-200 bg-slate-50 text-slate-700 rounded-xl text-sm"
                    >
                      <option value="">All KYC Status</option>
                      <option value="PENDING">PENDING</option>
                      <option value="APPROVED">APPROVED</option>
                      <option value="REJECTED">REJECTED</option>
                    </select>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="px-3 py-2 border border-slate-200 bg-slate-50 text-slate-700 rounded-xl text-sm"
                    >
                      <option value="">All Login Status</option>
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="SUSPENDED">SUSPENDED</option>
                    </select>
                  </div>
                </div>

                {filteredCustomers.length === 0 ? (
                  <div className="text-center py-10 text-slate-400 text-sm bg-slate-50 border rounded-2xl">
                    No customers found matching filters.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-400 text-xs font-bold uppercase tracking-wider">
                          <th className="py-3 pr-4">Cust ID</th>
                          <th className="py-3 px-4">Full Name</th>
                          <th className="py-3 px-4">Email</th>
                          <th className="py-3 px-4">KYC</th>
                          <th className="py-3 px-4">Accounts</th>
                          <th className="py-3 px-4">Total Balance</th>
                          <th className="py-3 px-4">Last Login</th>
                          <th className="py-3 pl-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-sm">
                        {filteredCustomers.map(cust => (
                          <tr key={cust.id} className="hover:bg-slate-50/40 transition-colors">
                            <td className="py-3.5 pr-4 text-slate-400 font-mono text-xs">#{cust.id}</td>
                            <td className="py-3.5 px-4 font-semibold text-slate-900">{cust.full_name}</td>
                            <td className="py-3.5 px-4 text-slate-500">{cust.email}</td>
                            <td className="py-3.5 px-4">
                              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                                cust.kyc_status === 'APPROVED' 
                                  ? 'bg-emerald-50 border-emerald-100 text-emerald-700' 
                                  : cust.kyc_status === 'REJECTED' 
                                  ? 'bg-rose-50 border-rose-100 text-rose-700' 
                                  : 'bg-amber-50 border-amber-100 text-amber-700'
                              }`}>
                                {cust.kyc_status}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 font-bold text-slate-700">{cust.num_accounts}</td>
                            <td className="py-3.5 px-4 font-black text-slate-950">{formatCurrency(cust.total_balance)}</td>
                            <td className="py-3.5 px-4 text-slate-400 text-xs">
                              {cust.last_login ? new Date(cust.last_login).toLocaleString() : 'Never'}
                            </td>
                            <td className="py-3.5 pl-4 text-right space-x-2 whitespace-nowrap">
                              <button 
                                onClick={() => viewCustomerDetails(cust)}
                                className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all"
                              >
                                View File
                              </button>
                              <button
                                onClick={() => promptUserActivationToggle(cust.id, cust.is_active)}
                                className={`px-3 py-1 rounded-lg text-xs font-extrabold transition-all border ${
                                  cust.is_active 
                                    ? 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100' 
                                    : 'bg-emerald-600 text-white hover:bg-emerald-500'
                                }`}
                              >
                                {cust.is_active ? 'Suspend' : 'Activate'}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* VIEW 3: BANK ACCOUNTS MANAGEMENT */}
            {activeTab === 'Accounts' && (
              <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Registered Accounts</h3>
                  <p className="text-slate-400 text-xs mt-0.5">Freeze, freeze-unlock, or review activity ledgers.</p>
                </div>

                {accounts.length === 0 ? (
                  <div className="text-center py-10 text-slate-400 text-sm bg-slate-50 border rounded-2xl">
                    No accounts registered.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-400 text-xs font-bold uppercase tracking-wider">
                          <th className="py-3 pr-4">Customer Name</th>
                          <th className="py-3 px-4">Account Type</th>
                          <th className="py-3 px-4">Account Number</th>
                          <th className="py-3 px-4">IFSC</th>
                          <th className="py-3 px-4">Account Status</th>
                          <th className="py-3 px-4">KYC Status</th>
                          <th className="py-3 px-4">Created Date</th>
                          <th className="py-3 pl-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-sm">
                        {accounts.map(acc => (
                          <tr key={acc.account_number} className="hover:bg-slate-50/40 transition-colors">
                            <td className="py-3.5 pr-4 font-semibold text-slate-900">
                              <div>
                                {acc.customer_name}
                                <span className="block text-[10px] text-slate-400 font-normal">{acc.customer_email}</span>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 font-bold text-slate-700">
                              <span className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase ${
                                acc.account_type === 'SAVINGS' 
                                  ? 'bg-blue-50 text-blue-700 border border-blue-100' 
                                  : 'bg-purple-50 text-purple-700 border border-purple-100'
                              }`}>
                                {acc.account_type}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 font-mono font-bold text-slate-950">{acc.account_number}</td>
                            <td className="py-3.5 px-4 font-mono text-xs text-slate-600 font-semibold">{acc.ifsc_code || 'APEX0000123'}</td>
                            <td className="py-3.5 px-4">
                              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                                acc.status === 'ACTIVE' 
                                  ? 'bg-emerald-50 border-emerald-100 text-emerald-700' 
                                  : acc.status === 'FROZEN'
                                  ? 'bg-orange-50 border-orange-100 text-orange-700 animate-pulse'
                                  : 'bg-slate-100 border-slate-200 text-slate-400'
                              }`}>
                                {acc.status}
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                                acc.kyc_status === 'APPROVED' 
                                  ? 'bg-emerald-50 border-emerald-100 text-emerald-700' 
                                  : acc.kyc_status === 'REJECTED' 
                                  ? 'bg-rose-50 border-rose-100 text-rose-700' 
                                  : 'bg-amber-50 border-amber-100 text-amber-700'
                              }`}>
                                {acc.kyc_status || 'PENDING'}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-slate-500 text-xs font-medium">
                              {acc.created_at ? new Date(acc.created_at).toLocaleDateString() : 'N/A'}
                            </td>
                            <td className="py-3.5 pl-4 text-right whitespace-nowrap">
                              <button
                                onClick={() => promptAccountStatusToggle(acc.account_number, acc.status)}
                                className={`px-3 py-1 rounded-lg text-xs font-extrabold transition-all border ${
                                  acc.status === 'ACTIVE' 
                                    ? 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100' 
                                    : 'bg-emerald-600 text-white hover:bg-emerald-500'
                                }`}
                              >
                                {acc.status === 'ACTIVE' ? 'Freeze' : 'Activate'}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* VIEW 4: TRANSACTION MONITORING & REVERSALS */}
            {activeTab === 'Transactions' && (
              <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">Immutable Financial Logs</h3>
                    <p className="text-slate-400 text-xs mt-0.5">Transactions are immutable records. Reversals create countervailing ledger offsets.</p>
                  </div>
                </div>

                {transactions.length === 0 ? (
                  <div className="text-center py-10 text-slate-400 text-sm bg-slate-50 border rounded-2xl">
                    No transactions registered in system.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-400 text-xs font-bold uppercase tracking-wider">
                          <th className="py-3 pr-4">Reference</th>
                          <th className="py-3 px-4">Customer</th>
                          <th className="py-3 px-4">Sender</th>
                          <th className="py-3 px-4">Receiver</th>
                          <th className="py-3 px-4">Type</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4">Amount</th>
                          <th className="py-3 pl-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-sm">
                        {transactions.map(tx => {
                          const isReversal = tx.description?.includes('Reversal of');
                          return (
                            <tr key={tx.id} className="hover:bg-slate-50/40 transition-colors">
                              <td className="py-3.5 pr-4 font-mono text-xs text-slate-950 font-bold">{tx.reference_number}</td>
                              <td className="py-3.5 px-4 font-semibold">{tx.customer_name}</td>
                              <td className="py-3.5 px-4 font-mono text-slate-400 text-xs">{tx.sender_account || '-'}</td>
                              <td className="py-3.5 px-4 font-mono text-slate-400 text-xs">{tx.receiver_account || '-'}</td>
                              <td className="py-3.5 px-4">
                                <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase ${
                                  isReversal ? 'bg-orange-50 text-orange-700 border border-orange-200' : 'bg-slate-100 text-slate-700'
                                }`}>
                                  {tx.transaction_type}
                                </span>
                              </td>
                              <td className="py-3.5 px-4">
                                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                                  tx.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                                }`}>
                                  {tx.status}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 font-black text-slate-900">{formatCurrency(tx.amount)}</td>
                              <td className="py-3.5 pl-4 text-right">
                                {tx.status === 'COMPLETED' && !isReversal && (
                                  <button
                                    onClick={() => promptTransactionReversal(tx.reference_number)}
                                    className="text-xs text-orange-600 hover:text-orange-500 font-bold flex items-center gap-1 ml-auto"
                                    title="Process countervailing refund"
                                  >
                                    <RotateCcw className="w-3.5 h-3.5" /> Reverse
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* VIEW 5: KYC VERIFICATION DESK */}
            {activeTab === 'KYC Management' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">KYC Verification</h3>
                  <p className="text-slate-400 text-xs mt-0.5 font-bold">Manage customer identity verifications and compliance documents.</p>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white border border-slate-200 p-5 rounded-3xl shadow-sm flex items-start gap-4">
                    <div className="bg-amber-50 p-2.5 rounded-2xl text-amber-600">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block">Pending Review</span>
                      <span className="text-lg font-black text-slate-900">{kycSubmissions.filter(k => k.status === 'PENDING').length}</span>
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200 p-5 rounded-3xl shadow-sm flex items-start gap-4">
                    <div className="bg-emerald-50 p-2.5 rounded-2xl text-emerald-600">
                      <CheckCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block">Approved Submissions</span>
                      <span className="text-lg font-black text-slate-900">{kycSubmissions.filter(k => k.status === 'APPROVED').length}</span>
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200 p-5 rounded-3xl shadow-sm flex items-start gap-4">
                    <div className="bg-rose-50 p-2.5 rounded-2xl text-rose-600">
                      <XCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block">Rejected Submissions</span>
                      <span className="text-lg font-black text-slate-900">{kycSubmissions.filter(k => k.status === 'REJECTED').length}</span>
                    </div>
                  </div>
                </div>

                {/* Submissions Table */}
                <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm">
                  {kycSubmissions.length === 0 ? (
                    <div className="text-center py-10 text-slate-400 text-sm bg-slate-50 border rounded-2xl">
                      No KYC submissions recorded in system.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-200 text-slate-400 text-xs font-bold uppercase tracking-wider">
                            <th className="py-3 pr-4">Customer</th>
                            <th className="py-3 px-4">Document Type</th>
                            <th className="py-3 px-4">Submitted</th>
                            <th className="py-3 px-4">Status</th>
                            <th className="py-3 pl-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                          {kycSubmissions.map((kyc) => (
                            <tr key={kyc.id} className="hover:bg-slate-50/40 transition-colors">
                              <td className="py-3.5 pr-4">
                                <div className="font-semibold text-slate-900">{kyc.full_name}</div>
                                <div className="text-xs text-slate-400 font-mono">User ID: #{kyc.user_id}</div>
                              </td>
                              <td className="py-3.5 px-4 font-bold text-slate-700">{kyc.identity_document_type}</td>
                              <td className="py-3.5 px-4 text-slate-500">{new Date(kyc.submitted_at).toLocaleDateString()}</td>
                              <td className="py-3.5 px-4">
                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                                  kyc.status === 'APPROVED'
                                    ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
                                    : kyc.status === 'PENDING'
                                    ? 'bg-amber-50 border-amber-100 text-amber-700 animate-pulse'
                                    : 'bg-rose-50 border-rose-100 text-rose-700'
                                }`}>
                                  {kyc.status}
                                </span>
                              </td>
                              <td className="py-3.5 pl-4 text-right whitespace-nowrap">
                                <button
                                  onClick={() => setSelectedKyc(kyc)}
                                  className="text-xs text-blue-600 hover:text-blue-500 font-extrabold mr-3"
                                >
                                  View Details
                                </button>
                                {kyc.status === 'PENDING' && (
                                  <>
                                    <button
                                      onClick={() => promptKYCUpdate(kyc.id, 'APPROVED')}
                                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1 rounded-lg text-xs mr-2 transition-all shadow-sm"
                                    >
                                      Approve
                                    </button>
                                    <button
                                      onClick={() => promptKYCUpdate(kyc.id, 'REJECTED')}
                                      className="bg-rose-50 border border-rose-200 text-rose-700 font-bold px-3 py-1 rounded-lg text-xs hover:bg-rose-100 transition-all"
                                    >
                                      Reject
                                    </button>
                                  </>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* VIEW 6: FRAUD MONITORING & HIGH RISK ASSIGNMENTS */}
            {activeTab === 'Fraud Monitoring' && (
              <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                  <ShieldAlert className="w-8 h-8 text-orange-500" />
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">Suspicious Transaction Logs</h3>
                    <p className="text-slate-400 text-xs mt-0.5">High value operations (exceeding $5,000.00 USD) and failed transacting entries.</p>
                  </div>
                </div>

                {transactions.filter(t => parseFloat(t.amount) > 5000.00 || t.status === 'FAILED').length === 0 ? (
                  <div className="text-center py-10 text-slate-400 text-sm bg-slate-50 border rounded-2xl">
                    No anomalies found.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {transactions.filter(t => parseFloat(t.amount) > 5000.00 || t.status === 'FAILED').map(tx => (
                      <div key={tx.id} className="bg-orange-50/30 border border-orange-100 p-5 rounded-2xl flex justify-between items-center gap-4">
                        <div className="space-y-1">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black border ${
                            tx.status === 'FAILED' ? 'bg-rose-100 border-rose-200 text-rose-800' : 'bg-orange-100 border-orange-200 text-orange-800'
                          }`}>
                            {tx.status === 'FAILED' ? 'FAILED LOG' : 'HIGH VALUE ALERT'}
                          </span>
                          <h4 className="font-bold text-slate-900 text-sm mt-1">Ref: {tx.reference_number}</h4>
                          <p className="text-slate-500 text-xs">
                            Type: {tx.transaction_type} | Sender: {tx.sender_account || 'N/A'} | Receiver: {tx.receiver_account || 'N/A'}
                          </p>
                          <p className="text-slate-400 text-[10px]">{new Date(tx.timestamp).toLocaleString()}</p>
                        </div>
                        <span className="text-lg font-black text-slate-900">{formatCurrency(tx.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* VIEW 7: SYSTEM AUDIT LOGS */}
            {activeTab === 'Audit Logs' && (
              <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Security & Operational Auditing</h3>
                  <p className="text-slate-400 text-xs mt-0.5">Read-only historical logs tracing logins, logouts, administrative freezes, adjustments, and transactions.</p>
                </div>

                {auditLogs.length === 0 ? (
                  <div className="text-center py-10 text-slate-400 text-sm bg-slate-50 border rounded-2xl">
                    No audit records written.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-400 text-xs font-bold uppercase tracking-wider">
                          <th className="py-3 pr-4">Timestamp</th>
                          <th className="py-3 px-4">Actor</th>
                          <th className="py-3 px-4">Action</th>
                          <th className="py-3 px-4">Entity Type</th>
                          <th className="py-3 px-4">IP Address</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 pl-4">Description</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs font-mono">
                        {auditLogs.map(log => (
                          <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-3.5 pr-4 text-slate-400">{new Date(log.timestamp).toLocaleString()}</td>
                            <td className="py-3.5 px-4 text-slate-900 font-bold">User #{log.actor_id || 'Anon'}</td>
                            <td className="py-3.5 px-4 font-bold text-blue-600">{log.action}</td>
                            <td className="py-3.5 px-4 text-slate-500">{log.entity_type}</td>
                            <td className="py-3.5 px-4 text-slate-500">{log.ip_address || '-'}</td>
                            <td className="py-3.5 px-4">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                log.status === 'SUCCESS' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                              }`}>
                                {log.status}
                              </span>
                            </td>
                            <td className="py-3.5 pl-4 text-slate-600 font-sans max-w-sm truncate" title={log.description}>{log.description}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>

      {/* CONFIRMATION / ACTION FORM MODAL */}
      {showConfirmModal && confirmConfig && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 w-full max-w-md shadow-2xl relative">
            <h3 className="text-lg font-black text-slate-900 mb-2">{confirmConfig.title}</h3>
            <p className="text-sm text-slate-500 mb-4">{confirmConfig.message}</p>
            
            {confirmConfig.reasonRequired && (
              <div className="mb-4">
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">{confirmConfig.reasonLabel}</label>
                <textarea
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-200 bg-slate-50 text-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="Provide brief details to record in compliance audits..."
                  required
                />
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => { setShowConfirmModal(false); setConfirmConfig(null); setActionReason(''); }}
                className="flex-1 py-2.5 border border-slate-200 bg-slate-50 text-slate-500 font-bold rounded-xl text-sm transition-all"
              >
                Cancel
              </button>
              <button
                onClick={executeAdminAction}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-sm transition-all shadow-sm"
              >
                Confirm Action
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOMER DETAIL VIEW DRAWER / MODAL */}
      {selectedCustomer && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-end p-0 z-50">
          <div className="bg-white h-full w-full max-w-xl shadow-2xl border-l border-slate-200 flex flex-col animate-slide-in">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-900">{selectedCustomer.full_name}</h3>
                <p className="text-xs text-slate-400 font-mono">Customer ID: #{selectedCustomer.id} | Email: {selectedCustomer.email}</p>
              </div>
              <button 
                onClick={() => setSelectedCustomer(null)}
                className="text-xs text-slate-500 hover:text-slate-900 font-bold"
              >
                Close Drawer
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Profile Details */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Compliance Overview</h4>
                <div className="grid grid-cols-2 gap-4 text-sm bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <p><span className="text-slate-400 text-xs block">Phone</span> {selectedCustomer.phone}</p>
                  <p><span className="text-slate-400 text-xs block">DoB</span> {selectedCustomer.date_of_birth}</p>
                  <p className="col-span-2"><span className="text-slate-400 text-xs block">Address</span> {selectedCustomer.address}</p>
                  <p><span className="text-slate-400 text-xs block">PAN Identifier</span> <code className="font-mono">{selectedCustomer.pan_kyc_identifier}</code></p>
                  <p><span className="text-slate-400 text-xs block">Registration Date</span> {new Date(selectedCustomer.created_at).toLocaleDateString()}</p>
                </div>
              </div>

              {/* Accounts Owned */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Open Bank Accounts</h4>
                {selectedCustomer.accounts.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No bank accounts open for this customer.</p>
                ) : (
                  <div className="space-y-2">
                    {selectedCustomer.accounts.map(acc => (
                      <div key={acc.account_number} className="bg-white border border-slate-200 rounded-2xl p-4 flex justify-between items-center shadow-sm">
                        <div>
                          <span className="text-[9px] font-black text-slate-400 uppercase">{acc.account_type}</span>
                          <p className="font-mono text-sm text-slate-900 font-bold">{acc.account_number}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-black text-slate-950 block">{formatCurrency(acc.balance)}</span>
                          <span className="text-[10px] text-slate-400 font-bold uppercase">{acc.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* KYC DETAIL VIEW DRAWER / MODAL */}
      {selectedKyc && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-end p-0 z-50">
          <div className="bg-white h-full w-full max-w-xl shadow-2xl border-l border-slate-200 flex flex-col animate-slide-in">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-900">{selectedKyc.full_name}</h3>
                <p className="text-xs text-slate-400 font-mono">KYC ID: #{selectedKyc.id} | User ID: #{selectedKyc.user_id}</p>
              </div>
              <button 
                onClick={() => setSelectedKyc(null)}
                className="text-xs text-slate-500 hover:text-slate-900 font-bold"
              >
                Close Drawer
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Submission details */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Personal Details</h4>
                <div className="grid grid-cols-2 gap-4 text-sm bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <p><span className="text-slate-400 text-xs block">Full Name</span> {selectedKyc.full_name}</p>
                  <p><span className="text-slate-400 text-xs block">Date of Birth</span> {selectedKyc.date_of_birth}</p>
                  <p className="col-span-2"><span className="text-slate-400 text-xs block">Address</span> {selectedKyc.address}</p>
                  <p><span className="text-slate-400 text-xs block">City</span> {selectedKyc.city}</p>
                  <p><span className="text-slate-400 text-xs block">State</span> {selectedKyc.state}</p>
                  <p><span className="text-slate-400 text-xs block">Postal Code</span> {selectedKyc.postal_code}</p>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Identity Document</h4>
                <div className="grid grid-cols-2 gap-4 text-sm bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <p><span className="text-slate-400 text-xs block">Document Type</span> {selectedKyc.identity_document_type}</p>
                  <p><span className="text-slate-400 text-xs block">Document Number</span> <code className="font-mono">{selectedKyc.identity_document_number}</code></p>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Review State</h4>
                <div className="grid grid-cols-2 gap-4 text-sm bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <p><span className="text-slate-400 text-xs block">Verification Status</span> 
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                      selectedKyc.status === 'APPROVED' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : selectedKyc.status === 'PENDING' ? 'bg-amber-50 border-amber-100 text-amber-700' : 'bg-rose-50 border-rose-100 text-rose-700'
                    }`}>{selectedKyc.status}</span>
                  </p>
                  {selectedKyc.rejection_reason && (
                    <p className="col-span-2"><span className="text-slate-400 text-xs block">Rejection Reason</span> <span className="text-rose-700 font-bold">{selectedKyc.rejection_reason}</span></p>
                  )}
                  <p><span className="text-slate-400 text-xs block">Submitted At</span> {new Date(selectedKyc.submitted_at).toLocaleString()}</p>
                  {selectedKyc.reviewed_at && (
                    <>
                      <p><span className="text-slate-400 text-xs block">Reviewed At</span> {new Date(selectedKyc.reviewed_at).toLocaleString()}</p>
                      <p><span className="text-slate-400 text-xs block">Reviewed By</span> User #{selectedKyc.reviewed_by}</p>
                    </>
                  )}
                </div>
              </div>

              {selectedKyc.status === 'PENDING' && (
                <div className="flex gap-3 pt-4 border-t border-slate-100">
                  <button
                    onClick={() => { promptKYCUpdate(selectedKyc.id, 'APPROVED'); setSelectedKyc(null); }}
                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-sm transition-all shadow-sm"
                  >
                    Approve KYC
                  </button>
                  <button
                    onClick={() => { promptKYCUpdate(selectedKyc.id, 'REJECTED'); setSelectedKyc(null); }}
                    className="flex-1 py-2.5 bg-rose-50 border border-rose-200 text-rose-700 font-bold rounded-xl text-sm hover:bg-rose-100 transition-all"
                  >
                    Reject KYC
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
