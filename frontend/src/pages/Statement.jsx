import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { 
  FileText, 
  Printer, 
  ArrowLeft, 
  ArrowUpRight, 
  ArrowDownLeft, 
  AlertCircle 
} from 'lucide-react';

export default function Statement() {
  const [statement, setStatement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Parse account number from hash, e.g., #/statement?account=1234567890
  const getAccountNumber = () => {
    const hash = window.location.hash;
    const parts = hash.split('account=');
    return parts.length > 1 ? parts[1] : null;
  };

  const fetchStatement = async () => {
    const accNum = getAccountNumber();
    if (!accNum) {
      setError('Invalid URL: Missing account number parameter.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/banking/accounts/${accNum}/statement`);
      setStatement(response.data);
    } catch (err) {
      setError(err.message || 'Failed to retrieve statement.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatement();
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(val);
  };

  const formatTimestamp = (ts) => {
    return new Date(ts).toLocaleString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-400 flex flex-col justify-center items-center">
        <div className="w-10 h-10 border-4 border-slate-800 border-t-orange-500 rounded-full animate-spin mb-4"></div>
        <span>Generating account statement ledger...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-center items-center p-6">
        <div className="bg-rose-950/30 border border-rose-900/50 p-6 rounded-3xl max-w-md w-full text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
          <h3 className="text-xl font-bold">Statement Generation Failed</h3>
          <p className="text-slate-400 text-sm">{error}</p>
          <button 
            onClick={() => { window.location.hash = '#/dashboard'; }}
            className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-xl text-sm transition-all"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const { account, total_deposits, total_withdrawals, transactions } = statement;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 py-10 px-4 md:px-8 selection:bg-orange-500 selection:text-white">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Actions bar (hidden during print) */}
        <div className="flex items-center justify-between print:hidden">
          <button 
            onClick={() => { window.location.hash = '#/dashboard'; }}
            className="flex items-center gap-1.5 text-sm font-semibold text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </button>
          <button
            onClick={handlePrint}
            className="bg-orange-600 hover:bg-orange-500 text-white font-bold px-4 py-2 rounded-xl text-sm flex items-center gap-1.5 transition-all shadow-md"
          >
            <Printer className="w-4 h-4" /> Print Statement
          </button>
        </div>

        {/* Statement Sheet */}
        <div className="bg-white text-slate-900 rounded-3xl p-8 md:p-12 shadow-2xl space-y-8 print:shadow-none print:p-0">
          
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-slate-200 pb-8">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🏦</span>
              <div>
                <h1 className="font-extrabold text-xl tracking-tight text-slate-950">APEX BANKING</h1>
                <p className="text-slate-500 text-xs uppercase tracking-wider">Official Bank Account Statement</p>
              </div>
            </div>
            <div className="text-left md:text-right text-sm text-slate-500 space-y-1">
              <p><strong className="text-slate-800">Date Generated:</strong> {new Date().toLocaleDateString()}</p>
              <p><strong className="text-slate-800">Statement ID:</strong> STMT-{account.account_number}-{new Date().getFullYear()}</p>
            </div>
          </div>

          {/* Accounts Summary info */}
          <div className="grid md:grid-cols-2 gap-8 border-b border-slate-200 pb-8">
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Account Details</h3>
              <div className="space-y-1.5 text-sm">
                <p><strong className="text-slate-700">Account Holder ID:</strong> Customer #{account.user_id}</p>
                <p><strong className="text-slate-700">Account Number:</strong> {account.account_number}</p>
                <p><strong className="text-slate-700">Account Type:</strong> {account.account_type}</p>
                <p><strong className="text-slate-700">Currency:</strong> {account.currency}</p>
              </div>
            </div>

            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Summary Metrics</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <span className="text-xs text-slate-500 block">Total Inflows</span>
                  <span className="text-lg font-bold text-emerald-600">{formatCurrency(total_deposits)}</span>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <span className="text-xs text-slate-500 block">Total Outflows</span>
                  <span className="text-lg font-bold text-rose-600">{formatCurrency(total_withdrawals)}</span>
                </div>
                <div className="col-span-2 bg-orange-50/50 p-4 rounded-2xl border border-orange-100/50">
                  <span className="text-xs text-slate-500 block">Closing Balance</span>
                  <span className="text-xl font-black text-slate-900">{formatCurrency(account.balance)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Ledger Table */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Transaction Ledger</h3>
            {transactions.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-sm bg-slate-50 border rounded-2xl">
                No transactions recorded on this account.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 text-xs font-bold uppercase tracking-wider">
                      <th className="py-3 pr-4">Timestamp</th>
                      <th className="py-3 px-4">Reference ID</th>
                      <th className="py-3 px-4">Description</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 pl-4 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {transactions.map((tx) => {
                      const isOutflow = 
                        tx.transaction_type === 'WITHDRAWAL' || 
                        (tx.transaction_type === 'TRANSFER' && tx.sender_account_number === account.account_number);
                      
                      return (
                        <tr key={tx.id}>
                          <td className="py-3.5 pr-4 text-slate-500 text-xs">{formatTimestamp(tx.timestamp)}</td>
                          <td className="py-3.5 px-4 font-mono text-slate-600 text-xs">{tx.reference_number}</td>
                          <td className="py-3.5 px-4 text-slate-800 font-semibold">{tx.description || '-'}</td>
                          <td className="py-3.5 px-4">
                            <span className={`inline-flex items-center gap-0.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${
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

          {/* Footer disclosure */}
          <div className="border-t border-slate-100 pt-8 text-center text-xs text-slate-400">
            <p>This statement has been electronically generated and is a legally valid transaction history representation.</p>
            <p className="mt-1">© {new Date().getFullYear()} Apex Banking Inc. All rights reserved.</p>
          </div>

        </div>
      </div>
    </div>
  );
}
