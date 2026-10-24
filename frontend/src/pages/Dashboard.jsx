import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { 
  Plus, 
  ArrowUpRight, 
  ArrowDownLeft, 
  RefreshCw, 
  Send, 
  FileSpreadsheet, 
  AlertCircle, 
  CheckCircle,
  PiggyBank,
  TrendingUp,
  BarChart3,
  TrendingDown,
  User,
  Bell,
  ShieldCheck
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, Legend } from 'recharts';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [activeAccount, setActiveAccount] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [unreadNotifsCount, setUnreadNotifsCount] = useState(0);
  
  // Modals & Forms states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createAccountStep, setCreateAccountStep] = useState('SELECT_TYPE'); // 'SELECT_TYPE' or 'FORM'
  const [newAccType, setNewAccType] = useState('SAVINGS');
  const [newAccIfsc, setNewAccIfsc] = useState('APEX0000123');
  const [ifscValidationError, setIfscValidationError] = useState(null);
  
  const [showTxModal, setShowTxModal] = useState(false); 
  const [txType, setTxType] = useState('DEPOSIT'); 
  const [txAmount, setTxAmount] = useState('');
  const [txDesc, setTxDesc] = useState('');
  const [pinVerificationStep, setPinVerificationStep] = useState(false);
  const [txPin, setTxPin] = useState('');
  
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferTarget, setTransferTarget] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferDesc, setTransferDesc] = useState('');
  
  // UI states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/banking/accounts');
      setAccounts(response.data);
      
      if (response.data.length > 0) {
        if (!activeAccount) {
          setActiveAccount(response.data[0]);
        } else {
          const updatedActive = response.data.find(a => a.account_number === activeAccount.account_number);
          setActiveAccount(updatedActive || response.data[0]);
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to retrieve accounts.');
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async (accNum) => {
    if (!accNum) return;
    try {
      const response = await api.get(`/banking/accounts/${accNum}/transactions`);
      setTransactions(response.data);
    } catch (err) {
      console.error('Failed to retrieve transactions:', err);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const response = await api.get('/notifications');
      const unread = response.data.filter(n => !n.read_status).length;
      setUnreadNotifsCount(unread);
    } catch (err) {
      console.error('Failed to fetch unread notification count:', err);
    }
  };

  useEffect(() => {
    fetchAccounts();
    fetchUnreadCount();
  }, []);

  useEffect(() => {
    if (activeAccount) {
      fetchTransactions(activeAccount.account_number);
    }
  }, [activeAccount]);

  const handleCreateAccount = async (e) => {
    e.preventDefault();
    const ifscCode = newAccIfsc || 'APEX0000123';
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifscCode)) {
      setIfscValidationError("IFSC Code must be 11 characters in the format ABCD0123456.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await api.post('/banking/accounts', { 
        account_type: newAccType, 
        currency: 'INR',
        ifsc_code: ifscCode
      });
      setSuccessMsg(`Successfully opened a new ${newAccType} account!`);
      setShowCreateModal(false);
      setCreateAccountStep('SELECT_TYPE');
      setNewAccIfsc('APEX0000123');
      setIfscValidationError(null);
      fetchAccounts();
      fetchUnreadCount();
    } catch (err) {
      setError(err.message || 'Account creation failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleTransactionSubmit = async (e) => {
    e.preventDefault();
    if (!activeAccount) return;

    if (!pinVerificationStep) {
      if (!txAmount || parseFloat(txAmount) <= 0) {
        setError('Please enter a valid transaction amount.');
        return;
      }
      setPinVerificationStep(true);
      return;
    }

    if (txPin.length !== 6) {
      setError('Please enter your 6-digit transaction PIN.');
      return;
    }
    
    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    
    const url = `/banking/accounts/${activeAccount.account_number}/${txType.toLowerCase()}`;
    try {
      await api.post(url, {
        amount: parseFloat(txAmount),
        description: txDesc || undefined,
        pin: txPin
      });
      
      setSuccessMsg(`Successfully completed ${txType.toLowerCase()} of ₹${txAmount}.`);
      setShowTxModal(false);
      setPinVerificationStep(false);
      setTxAmount('');
      setTxDesc('');
      setTxPin('');
      fetchAccounts();
      fetchUnreadCount();
    } catch (err) {
      setError(err.message || 'Transaction execution failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleTransferSubmit = async (e) => {
    e.preventDefault();
    if (!activeAccount) return;
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    const url = `/banking/accounts/${activeAccount.account_number}/transfer`;
    try {
      await api.post(url, {
        receiver_account_number: transferTarget,
        amount: parseFloat(transferAmount),
        description: transferDesc || undefined
      });

      setSuccessMsg(`Successfully transferred ₹${transferAmount} to account ${transferTarget}.`);
      setShowTransferModal(false);
      setTransferTarget('');
      setTransferAmount('');
      setTransferDesc('');
      fetchAccounts();
      fetchUnreadCount();
    } catch (err) {
      setError(err.message || 'Transfer failed.');
    } finally {
      setLoading(false);
    }
  };

  // Aggregated Summary Statistics
  const getStats = () => {
    let deposits = 0;
    let withdrawals = 0;
    let transfers = 0;
    
    transactions.forEach(tx => {
      const amt = parseFloat(tx.amount);
      if (tx.transaction_type === 'DEPOSIT') {
        deposits += amt;
      } else if (tx.transaction_type === 'WITHDRAWAL') {
        withdrawals += amt;
      } else if (tx.transaction_type === 'TRANSFER') {
        if (tx.sender_account_number === activeAccount?.account_number) {
          transfers += amt; // outflow transfer
        } else {
          deposits += amt;  // inflow transfer
        }
      }
    });

    return { deposits, withdrawals, transfers };
  };

  // Recharts Dataset
  const getChartData = () => {
    const dailyData = {};
    transactions.slice().reverse().forEach(tx => {
      const date = new Date(tx.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (!dailyData[date]) {
        dailyData[date] = { date, Inflows: 0, Outflows: 0 };
      }
      const amt = parseFloat(tx.amount);
      if (tx.transaction_type === 'DEPOSIT') {
        dailyData[date].Inflows += amt;
      } else if (tx.transaction_type === 'WITHDRAWAL') {
        dailyData[date].Outflows += amt;
      } else if (tx.transaction_type === 'TRANSFER') {
        if (tx.sender_account_number === activeAccount?.account_number) {
          dailyData[date].Outflows += amt;
        } else {
          dailyData[date].Inflows += amt;
        }
      }
    });
    return Object.values(dailyData);
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(val);
  };

  const { deposits, withdrawals, transfers } = getStats();
  const chartData = getChartData();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-700 flex flex-col selection:bg-blue-600 selection:text-white">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/95 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🏦</span>
            <span className="font-extrabold text-xl tracking-tight text-blue-600">
              APEX ONLINE BANKING
            </span>
          </div>
          <div className="flex items-center gap-5">
            {user?.role === 'ADMIN' && (
              <a href="#/admin" className="text-xs bg-red-50 border border-red-200 px-3 py-1 rounded-full text-red-700 font-extrabold">
                Admin Console
              </a>
            )}
            
            {/* Notification Bell */}
            <a href="#/notifications" className="relative p-2.5 hover:bg-slate-100 rounded-xl transition-all text-slate-500 hover:text-blue-600">
              <Bell className="w-5 h-5" />
              {unreadNotifsCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-rose-500 text-white rounded-full flex items-center justify-center text-[9px] font-black">
                  {unreadNotifsCount}
                </span>
              )}
            </a>

            <a href="#/profile" className="text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors flex items-center gap-1">
              <User className="w-4 h-4 text-slate-400" /> Profile Setup
            </a>

            <a href="#/kyc" className="text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors flex items-center gap-1">
              <ShieldCheck className="w-4 h-4 text-slate-400" /> KYC Verification
            </a>
            
            <button 
              onClick={logout} 
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl border border-slate-200 text-sm font-bold transition-all shadow-sm"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* System Warnings / Alerts */}
        <div className="lg:col-span-3 space-y-3">
          {error && (
            <div className="bg-rose-50 border border-rose-100 text-rose-700 p-4 rounded-2xl flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
              <span className="text-sm font-semibold">{error}</span>
            </div>
          )}
          {successMsg && (
            <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 p-4 rounded-2xl flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
              <span className="text-sm font-semibold">{successMsg}</span>
            </div>
          )}
          {!user?.is_pin_set && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 p-5 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm">
              <div className="space-y-1">
                <h4 className="font-extrabold text-sm flex items-center gap-2">
                  <span>🔒</span> Set Transaction PIN
                </h4>
                <p className="text-xs text-amber-600 font-semibold leading-relaxed">
                  A 6-digit Transaction PIN is required to authorize deposits and withdrawals. Please configure it to secure your account.
                </p>
              </div>
              <a
                href="#/profile"
                className="bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all whitespace-nowrap"
              >
                Set Transaction PIN
              </a>
            </div>
          )}
        </div>

        {/* Financial Accounts & Ledger (Left 2/3) */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Account Overview Grid */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <PiggyBank className="w-5 h-5 text-blue-600" />
                My Financial Accounts
              </h2>
              <button 
                onClick={() => {
                  setCreateAccountStep('SELECT_TYPE');
                  setNewAccIfsc('APEX0000123');
                  setIfscValidationError(null);
                  setShowCreateModal(true);
                }}
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-2 rounded-xl text-sm flex items-center gap-1.5 transition-all shadow-sm"
              >
                <Plus className="w-4 h-4" /> Create Bank Account
              </button>
            </div>

            {accounts.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center text-slate-400 shadow-sm">
                No accounts open. Please click "Create Bank Account" to get started.
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {accounts.map((acc) => (
                  <div 
                    key={acc.id}
                    onClick={() => setActiveAccount(acc)}
                    className={`cursor-pointer bg-white border rounded-3xl p-6 relative overflow-hidden transition-all group ${
                      activeAccount?.account_number === acc.account_number 
                        ? 'border-blue-500 ring-1 ring-blue-500 shadow-md' 
                        : 'border-slate-200/80 hover:border-slate-300 shadow-sm'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{acc.account_type}</span>
                        <h3 className="text-lg font-mono font-bold text-slate-800 tracking-wide mt-0.5">{acc.account_number}</h3>
                        <span className="text-[10px] text-slate-400 font-mono block">IFSC: {acc.ifsc_code}</span>
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        acc.status === 'ACTIVE' 
                          ? 'bg-emerald-50 text-emerald-700' 
                          : acc.status === 'FROZEN' 
                          ? 'bg-orange-50 text-orange-700' 
                          : 'bg-slate-100 text-slate-400'
                      }`}>
                        {acc.status}
                      </span>
                    </div>
                    <div className="mt-6 flex justify-between items-end">
                      <div>
                        <span className="text-xs text-slate-400 block">Available Balance</span>
                        <span className="text-2xl font-black text-slate-900">{formatCurrency(acc.balance)}</span>
                      </div>
                      <a 
                        href={`#/statement?account=${acc.account_number}`}
                        className="bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-600 p-2.5 rounded-xl transition-all"
                        onClick={(e) => e.stopPropagation()}
                        title="View Statement"
                      >
                        <FileSpreadsheet className="w-5 h-5" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* [ Account Details ] */}
          {activeAccount && (
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
              <h3 className="text-base font-extrabold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
                <span>📋</span> [ Account Details ]
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-xs text-slate-400 block font-bold uppercase tracking-wider">Customer Name</span>
                  <span className="font-semibold text-slate-800">{user?.profile?.full_name || 'Valued Customer'}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block font-bold uppercase tracking-wider">Account Number</span>
                  <span className="font-mono font-bold text-slate-900">{activeAccount.account_number}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block font-bold uppercase tracking-wider">Account Type</span>
                  <span className="font-semibold text-slate-800">{activeAccount.account_type}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block font-bold uppercase tracking-wider">IFSC Code</span>
                  <span className="font-mono font-bold text-slate-900">{activeAccount.ifsc_code}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block font-bold uppercase tracking-wider">Current Balance</span>
                  <span className="font-black text-slate-900">₹{activeAccount.balance}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block font-bold uppercase tracking-wider">Status</span>
                  <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    activeAccount.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-orange-50 text-orange-700 border border-orange-100'
                  }`}>{activeAccount.status}</span>
                </div>
              </div>
            </div>
          )}

          {/* Dynamic Summary Cards */}
          {activeAccount && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white border border-slate-200 p-5 rounded-3xl shadow-sm flex items-start gap-4">
                <div className="bg-emerald-50 p-2.5 rounded-2xl text-emerald-600">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block">Total Deposits</span>
                  <span className="text-lg font-black text-slate-900">{formatCurrency(deposits)}</span>
                </div>
              </div>

              <div className="bg-white border border-slate-200 p-5 rounded-3xl shadow-sm flex items-start gap-4">
                <div className="bg-rose-50 p-2.5 rounded-2xl text-rose-600">
                  <TrendingDown className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block">Withdrawals</span>
                  <span className="text-lg font-black text-slate-900">{formatCurrency(withdrawals)}</span>
                </div>
              </div>

              <div className="bg-white border border-slate-200 p-5 rounded-3xl shadow-sm flex items-start gap-4">
                <div className="bg-blue-50 p-2.5 rounded-2xl text-blue-600">
                  <Send className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block">Transfers</span>
                  <span className="text-lg font-black text-slate-900">{formatCurrency(transfers)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Monthly Transaction Chart using Recharts */}
          {activeAccount && (
            <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm">
              <h3 className="text-base font-bold text-slate-900 mb-6 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-blue-600" />
                Monthly Flow Activity
              </h3>
              
              {chartData.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-sm">
                  Inflows and outflows will appear here as soon as transactions are processed.
                </div>
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis dataKey="date" stroke="#94A3B8" fontSize={12} tickLine={false} />
                      <YAxis stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="Inflows" fill="#10B981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Outflows" fill="#F43F5E" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}

          {/* Transaction Ledger List */}
          {activeAccount && (
            <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Recent Transactions</h3>
                  <p className="text-slate-400 text-xs font-mono mt-0.5">Account: {activeAccount.account_number}</p>
                </div>
                <button 
                  onClick={() => fetchTransactions(activeAccount.account_number)}
                  className="text-slate-400 hover:text-slate-700 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              {transactions.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-sm bg-slate-50 border border-slate-100 rounded-2xl">
                  No transactions recorded on this account.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-400 text-xs font-bold uppercase tracking-wider">
                        <th className="py-3 pr-4">Timestamp</th>
                        <th className="py-3 px-4">Reference</th>
                        <th className="py-3 px-4">Description</th>
                        <th className="py-3 px-4">Type</th>
                        <th className="py-3 pl-4 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {transactions.slice(0, 10).map((tx) => {
                        const isOutflow = 
                          tx.transaction_type === 'WITHDRAWAL' || 
                          (tx.transaction_type === 'TRANSFER' && tx.sender_account_number === activeAccount.account_number);
                        
                        return (
                          <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-3.5 pr-4 text-slate-500 text-xs">{new Date(tx.timestamp).toLocaleString()}</td>
                            <td className="py-3.5 px-4 font-mono text-slate-500 text-xs">{tx.reference_number}</td>
                            <td className="py-3.5 px-4 text-slate-800 font-semibold">{tx.description || '-'}</td>
                            <td className="py-3.5 px-4">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                isOutflow ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'
                              }`}>
                                {isOutflow ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownLeft className="w-3 h-3" />}
                                {tx.transaction_type}
                              </span>
                            </td>
                            <td className={`py-3.5 pl-4 text-right font-bold ${
                              isOutflow ? 'text-rose-600' : 'text-emerald-600'
                            }`}>
                              {isOutflow ? '-' : '+'}{formatCurrency(tx.amount)}
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
        </div>

        {/* Column 3: Quick Action Widgets (Right 1/3) */}
        {activeAccount && (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
              <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-4">
                Transact Portal
              </h3>
              
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => { setTxType('DEPOSIT'); setShowTxModal(true); }}
                  className="bg-slate-50 border border-slate-200 hover:border-blue-200 hover:bg-slate-100/50 p-4 rounded-2xl text-center transition-all flex flex-col items-center gap-2"
                >
                  <ArrowDownLeft className="w-6 h-6 text-emerald-600" />
                  <span className="text-xs font-bold text-slate-700">Deposit Funds</span>
                </button>

                <button
                  onClick={() => { setTxType('WITHDRAWAL'); setShowTxModal(true); }}
                  className="bg-slate-50 border border-slate-200 hover:border-blue-200 hover:bg-slate-100/50 p-4 rounded-2xl text-center transition-all flex flex-col items-center gap-2"
                >
                  <ArrowUpRight className="w-6 h-6 text-rose-600" />
                  <span className="text-xs font-bold text-slate-700">Withdraw Funds</span>
                </button>

                <button
                  onClick={() => setShowTransferModal(true)}
                  className="col-span-2 bg-slate-50 border border-slate-200 hover:border-blue-200 hover:bg-slate-100/50 p-4 rounded-2xl text-center transition-all flex flex-col items-center gap-2"
                >
                  <Send className="w-6 h-6 text-blue-600" />
                  <span className="text-xs font-bold text-slate-700">Send / Transfer Money</span>
                </button>

                <a
                  href={`#/statement?account=${activeAccount.account_number}`}
                  className="col-span-2 bg-slate-50 border border-slate-200 hover:border-blue-200 hover:bg-slate-100/50 p-4 rounded-2xl text-center transition-all flex flex-col items-center gap-2"
                >
                  <FileSpreadsheet className="w-6 h-6 text-slate-600" />
                  <span className="text-xs font-bold text-slate-700">View Full Account Statement</span>
                </a>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* REALISTIC ACCOUNT OPENING MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 w-full max-w-lg shadow-2xl relative my-8">
            
            {/* STAGE 1: SELECT ACCOUNT TYPE */}
            {createAccountStep === 'SELECT_TYPE' ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-xl font-black text-slate-900">Create Bank Account</h3>
                    <p className="text-xs text-slate-500 mt-0.5 font-bold">Select Account Type</p>
                  </div>
                  <button
                    onClick={() => { setShowCreateModal(false); setCreateAccountStep('SELECT_TYPE'); }}
                    className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors font-bold text-lg leading-none"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Savings Account Card */}
                  <div 
                    onClick={() => {
                      setNewAccType('SAVINGS');
                      setCreateAccountStep('FORM');
                    }}
                    className="border-2 border-slate-200 hover:border-blue-500 rounded-2xl p-5 bg-white transition-all hover:shadow-md cursor-pointer group"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl">
                          🏦
                        </div>
                        <div>
                          <h4 className="font-extrabold text-slate-900 text-base group-hover:text-blue-600 transition-colors">Savings Account</h4>
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                            Personal Banking
                          </span>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed mb-4">
                      Ideal for personal savings, daily transactions, and interest earnings with zero minimum balance opening.
                    </p>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setNewAccType('SAVINGS');
                        setCreateAccountStep('FORM');
                      }}
                      className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all text-sm shadow-sm flex items-center justify-center gap-1.5"
                    >
                      <span>Select</span>
                    </button>
                  </div>

                  {/* Current Account Card */}
                  <div 
                    onClick={() => {
                      setNewAccType('CURRENT');
                      setCreateAccountStep('FORM');
                    }}
                    className="border-2 border-slate-200 hover:border-purple-500 rounded-2xl p-5 bg-white transition-all hover:shadow-md cursor-pointer group"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center text-xl">
                          💼
                        </div>
                        <div>
                          <h4 className="font-extrabold text-slate-900 text-base group-hover:text-purple-600 transition-colors">Current Account</h4>
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-purple-50 text-purple-700">
                            Business Banking
                          </span>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed mb-4">
                      Designed for businesses, traders, and commercial use. High transaction limits with seamless commercial operations.
                    </p>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setNewAccType('CURRENT');
                        setCreateAccountStep('FORM');
                      }}
                      className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition-all text-sm shadow-sm flex items-center justify-center gap-1.5"
                    >
                      <span>Select</span>
                    </button>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => { setShowCreateModal(false); setCreateAccountStep('SELECT_TYPE'); }}
                    className="w-full py-2.5 border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold rounded-xl transition-all text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              /* STAGE 2: CORRESPONDING ACCOUNT FORM */
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-xl font-black text-slate-900">
                      {newAccType === 'SAVINGS' ? 'Savings Account Form' : 'Current Account Form'}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {newAccType === 'SAVINGS' ? 'Fill out the form to open your Savings Account' : 'Fill out the form to open your Current Account'}
                    </p>
                  </div>
                  <button
                    onClick={() => { setShowCreateModal(false); setCreateAccountStep('SELECT_TYPE'); }}
                    className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors font-bold text-lg leading-none"
                  >
                    ✕
                  </button>
                </div>

                {/* Selected Type Badge & Switch */}
                <div className={`p-3 rounded-2xl border flex items-center justify-between ${
                  newAccType === 'SAVINGS'
                    ? 'bg-blue-50/60 border-blue-200 text-blue-900'
                    : 'bg-purple-50/60 border-purple-200 text-purple-900'
                }`}>
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl">{newAccType === 'SAVINGS' ? '🏦' : '💼'}</span>
                    <div>
                      <span className="text-xs font-black uppercase tracking-wider block">Selected Account</span>
                      <span className="text-sm font-extrabold">{newAccType === 'SAVINGS' ? 'Savings Account' : 'Current Account'}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCreateAccountStep('SELECT_TYPE')}
                    className="text-xs font-bold underline hover:opacity-80 transition-opacity"
                  >
                    Change
                  </button>
                </div>

                <form onSubmit={handleCreateAccount} className="space-y-5">
                  {/* Applicant Overview Details */}
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400 font-semibold">Applicant Name:</span>
                      <span className="font-bold text-slate-800">{user?.profile?.full_name || 'Valued Customer'}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400 font-semibold">Registered Email:</span>
                      <span className="font-mono text-slate-700">{user?.email}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400 font-semibold">Account Currency:</span>
                      <span className="font-bold text-slate-800">INR (₹ - Indian Rupee)</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400 font-semibold">Opening Balance:</span>
                      <span className="font-bold text-emerald-600">₹0.00 (Zero Minimum Balance)</span>
                    </div>
                  </div>

                  {/* Branch & IFSC Code */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                      Bank Branch IFSC Code
                    </label>
                    <input
                      type="text"
                      required
                      value={newAccIfsc}
                      onChange={(e) => {
                        const val = e.target.value.toUpperCase();
                        setNewAccIfsc(val);
                        if (val.length === 11 && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(val)) {
                          setIfscValidationError("IFSC Code must be 11 characters in the format ABCD0123456.");
                        } else {
                          setIfscValidationError(null);
                        }
                      }}
                      maxLength={11}
                      className="w-full px-4 py-2.5 border border-slate-200 bg-slate-50 text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                      placeholder="e.g. APEX0000123"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      Default branch: <span className="font-mono font-bold text-slate-600">APEX0000123</span> (Apex Central Branch)
                    </p>
                    {ifscValidationError && (
                      <p className="text-rose-600 text-[11px] font-bold mt-1">
                        {ifscValidationError}
                      </p>
                    )}
                  </div>

                  {/* Declaration Note */}
                  <div className="flex items-start gap-2.5 text-xs text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <input
                      type="checkbox"
                      id="account-declaration"
                      required
                      defaultChecked
                      className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="account-declaration" className="cursor-pointer leading-relaxed">
                      I hereby apply to open a new <strong className="text-slate-800">{newAccType === 'SAVINGS' ? 'Savings Account' : 'Current Account'}</strong> and confirm the information is accurate under standard banking regulations.
                    </label>
                  </div>

                  {/* Form Buttons */}
                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setCreateAccountStep('SELECT_TYPE')}
                      className="flex-1 py-2.5 border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold rounded-xl transition-all text-sm"
                    >
                      ← Back
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-sm text-sm disabled:opacity-50"
                    >
                      {loading ? 'Submitting...' : 'Submit Application'}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      )}

      {/* DEPOSIT / WITHDRAWAL MODAL */}
      {showTxModal && activeAccount && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900 mb-1">
              {!user?.is_pin_set ? 'Transaction PIN Required' : (pinVerificationStep ? 'Confirm Transaction' : (txType === 'DEPOSIT' ? 'Deposit Funds' : 'Withdraw Funds'))}
            </h3>
            <p className="text-xs text-slate-400 font-mono mb-4">Account: {activeAccount.account_number}</p>
            
            {!user?.is_pin_set ? (
              <div className="space-y-4">
                <p className="text-sm text-slate-600 leading-relaxed text-center">
                  Please set your Transaction PIN before performing this transaction.
                </p>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowTxModal(false)}
                    className="flex-1 py-2.5 border border-slate-200 bg-slate-50 text-slate-500 font-bold rounded-xl transition-all"
                  >
                    Cancel
                  </button>
                  <a
                    href="#/profile"
                    onClick={() => setShowTxModal(false)}
                    className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-center font-bold rounded-xl transition-all shadow-sm flex items-center justify-center"
                  >
                    Set Transaction PIN
                  </a>
                </div>
              </div>
            ) : (
              <form onSubmit={handleTransactionSubmit} className="space-y-4">
                {!pinVerificationStep ? (
                  <>
                    <div>
                      <label className="block text-sm font-bold text-slate-500 mb-1">Amount (₹)</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={txAmount}
                        onChange={(e) => setTxAmount(e.target.value)}
                        className="w-full px-4 py-2.5 border border-slate-200 bg-slate-50 text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="0.00"
                        min="0.01"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-500 mb-1">Description (Optional)</label>
                      <input
                        type="text"
                        value={txDesc}
                        onChange={(e) => setTxDesc(e.target.value)}
                        className="w-full px-4 py-2.5 border border-slate-200 bg-slate-50 text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder={txType === 'DEPOSIT' ? 'ATM Cash Deposit' : 'ATM Withdrawal'}
                      />
                    </div>
                    <div className="flex gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => { setShowTxModal(false); setPinVerificationStep(false); setTxPin(''); }}
                        className="flex-1 py-2.5 border border-slate-200 bg-slate-50 text-slate-500 font-bold rounded-xl transition-all"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all"
                      >
                        Continue
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-sm">
                      <div className="flex justify-between py-1">
                        <span className="text-slate-400 font-semibold">Transaction Type:</span>
                        <span className="font-extrabold text-slate-700 uppercase">{txType}</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-slate-400 font-semibold">Amount:</span>
                        <span className="font-extrabold text-blue-600">₹{txAmount}</span>
                      </div>
                      {txDesc && (
                        <div className="flex justify-between py-1">
                          <span className="text-slate-400 font-semibold">Description:</span>
                          <span className="font-extrabold text-slate-700">{txDesc}</span>
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-500 mb-1 text-center">Enter Transaction PIN</label>
                      <input
                        type="password"
                        pattern="\d*"
                        maxLength={6}
                        required
                        value={txPin}
                        onChange={(e) => setTxPin(e.target.value.replace(/\D/g, ''))}
                        className="w-full px-4 py-3 border border-slate-200 bg-slate-50 text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 tracking-widest font-mono text-center text-lg"
                        placeholder="••••••"
                        autoFocus
                      />
                    </div>
                    <div className="flex gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => { setPinVerificationStep(false); setTxPin(''); }}
                        className="flex-1 py-2.5 border border-slate-200 bg-slate-50 text-slate-500 font-bold rounded-xl transition-all"
                      >
                        Back
                      </button>
                      <button
                        type="submit"
                        disabled={loading}
                        className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all disabled:opacity-50"
                      >
                        {loading ? 'Confirming...' : 'Confirm'}
                      </button>
                    </div>
                  </>
                )}
              </form>
            )}
          </div>
        </div>
      )}

      {/* TRANSFER MODAL */}
      {showTransferModal && activeAccount && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900 mb-1">Fund Transfer</h3>
            <p className="text-xs text-slate-400 font-mono mb-4">From Account: {activeAccount.account_number}</p>
            <form onSubmit={handleTransferSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-500 mb-1">Recipient Account Number</label>
                <input
                  type="text"
                  required
                  value={transferTarget}
                  onChange={(e) => setTransferTarget(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 bg-slate-50 text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  placeholder="Enter 10-digit number"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-500 mb-1">Amount (USD)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 bg-slate-50 text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                  min="0.01"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-500 mb-1">Description (Optional)</label>
                <input
                  type="text"
                  value={transferDesc}
                  onChange={(e) => setTransferDesc(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 bg-slate-50 text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Rent transfer"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="flex-1 py-2.5 border border-slate-200 bg-slate-50 text-slate-500 font-bold rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all"
                >
                  Execute Transfer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
