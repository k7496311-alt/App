import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  ArrowDownLeft, 
  ArrowUpRight, 
  CreditCard, 
  History, 
  ShieldCheck, 
  Wallet as WalletIcon,
  Copy,
  Check
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { collection, addDoc, Timestamp, doc, updateDoc, increment, query, where, getDocs } from 'firebase/firestore';
import { GlassCard } from '../components/ui/GlassCard';
import { formatCurrency, cn } from '../lib/utils';

export const WalletPage: React.FC = () => {
  const { state } = useAuth();
  const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw'>('deposit');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const user = state.user!;

  const handleDeposit = async () => {
    if (!amount || loading) return;
    const depAmount = parseFloat(amount);
    
    setLoading(true);
    try {
      // For this demo, we'll auto-approve deposits. In real app, this would be a manual check.
      await updateDoc(doc(db, 'users', user.id), {
        balance: increment(depAmount)
      });

      await addDoc(collection(db, 'transactions'), {
        userId: user.id,
        type: 'deposit',
        amount: depAmount,
        time: Timestamp.now(),
        status: 'approved'
      });

      alert('Deposit successful!');
      setAmount('');
    } catch (err) {
      alert('Failed to deposit');
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async () => {
    if (!amount || loading) return;
    const withAmount = parseFloat(amount);

    if (user.balance < withAmount) {
      alert('Insufficient balance');
      return;
    }
    
    setLoading(true);
    try {
      // Deduct balance immediately
      await updateDoc(doc(db, 'users', user.id), {
        balance: increment(-withAmount)
      });

      // Create a pending transaction
      await addDoc(collection(db, 'transactions'), {
        userId: user.id,
        type: 'withdraw',
        amount: withAmount,
        time: Timestamp.now(),
        status: 'pending'
      });

      alert('Withdrawal request submitted for admin approval');
      setAmount('');
    } catch (err) {
      alert('Failed to submit withdrawal');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText('TRX78239048239048320498234'); // Dummy address
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-10 pb-20">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Left Side: Balance Card */}
        <div className="space-y-6">
          <h1 className="text-4xl font-bold tracking-tight">Financial <span className="gradient-text">Core</span></h1>
          
          <GlassCard className="p-8 relative overflow-hidden" hover={false}>
            <div className="absolute top-0 right-0 w-64 h-64 bg-accent-purple/10 rounded-full blur-3xl -mr-32 -mt-32" />
            
            <div className="flex items-center mb-10">
              <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center mr-4">
                <WalletIcon className="w-6 h-6 text-accent-blue" />
              </div>
              <div>
                <p className="text-white/40 text-sm uppercase tracking-widest font-bold">Total Liquid Balance</p>
                <h2 className="text-4xl font-bold">{formatCurrency(user.balance)}</h2>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-white/5 rounded-2xl">
                <p className="text-white/30 text-[10px] uppercase font-bold tracking-widest mb-1">Total Profits</p>
                <p className="text-white text-lg font-bold">{formatCurrency(1240.23)}</p>
              </div>
              <div className="p-4 bg-white/5 rounded-2xl">
                <p className="text-white/30 text-[10px] uppercase font-bold tracking-widest mb-1">Withdrawn</p>
                <p className="text-white text-lg font-bold">{formatCurrency(450.00)}</p>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <h3 className="text-lg font-bold mb-4 flex items-center">
              <ShieldCheck className="w-5 h-5 text-green-400 mr-2" />
              Secure Pay Bridge
            </h3>
            <div className="p-4 bg-white/5 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-white/40 text-[10px] uppercase tracking-widest font-bold mb-1">USDT (TRC20) ADDRESS</p>
                <p className="text-xs font-mono text-white/70">TRX782390...234</p>
              </div>
              <button 
                onClick={handleCopy}
                className="p-3 hover:bg-white/10 rounded-xl transition-all"
              >
                {copied ? <Check className="w-5 h-5 text-green-400" /> : <Copy className="w-5 h-5 text-white/40" />}
              </button>
            </div>
          </GlassCard>
        </div>

        {/* Right Side: Actions */}
        <GlassCard className="p-8" hover={false}>
          <div className="flex p-1 bg-white/5 rounded-2xl mb-8">
            <button 
              onClick={() => setActiveTab('deposit')}
              className={cn(
                "flex-1 py-3 rounded-xl text-sm font-bold flex items-center justify-center transition-all",
                activeTab === 'deposit' ? "bg-white/10 text-white shadow-xl" : "text-white/40 hover:text-white"
              )}
            >
              <ArrowDownLeft className="w-5 h-5 mr-2" /> Deposit
            </button>
            <button 
              onClick={() => setActiveTab('withdraw')}
              className={cn(
                "flex-1 py-3 rounded-xl text-sm font-bold flex items-center justify-center transition-all",
                activeTab === 'withdraw' ? "bg-white/10 text-white shadow-xl" : "text-white/40 hover:text-white"
              )}
            >
              <ArrowUpRight className="w-5 h-5 mr-2" /> Withdraw
            </button>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-white/30 uppercase tracking-widest ml-1">
                {activeTab === 'deposit' ? 'Refill Amount' : 'Transfer Amount'}
              </label>
              <div className="relative">
                <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-white/20" />
                <input 
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="glass-input w-full pl-14 py-5 text-2xl font-bold"
                />
                <span className="absolute right-6 top-1/2 -translate-y-1/2 text-white/20 font-bold uppercase tracking-widest text-xs">USDT</span>
              </div>
            </div>

            <div className="bg-white/5 p-5 rounded-2xl space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-white/40">Fee</span>
                <span className="text-white font-bold">0.00%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/40">Processor</span>
                <span className="text-white font-bold">Instantly AI</span>
              </div>
              <div className="pt-3 border-t border-white/10 flex justify-between">
                <span className="text-white font-bold">Total {activeTab === 'deposit' ? 'In' : 'Out'}</span>
                <span className="text-accent-blue font-bold">{formatCurrency(parseFloat(amount) || 0)}</span>
              </div>
            </div>

            <button 
              onClick={activeTab === 'deposit' ? handleDeposit : handleWithdraw}
              disabled={loading || !amount}
              className="w-full btn-primary py-5 text-xl tracking-tight"
            >
              {loading ? "Processing Securely..." : activeTab === 'deposit' ? 'Execute Deposit' : 'Request Withdrawal'}
            </button>

            <p className="text-center text-[10px] text-white/20 uppercase tracking-widest leading-relaxed">
              * Withdrawal requests are analyzed by the AI Security Engine. <br />
              Approvals typically happen within 1-4 hours cycle.
            </p>
          </div>
        </GlassCard>
      </div>
    </div>
  );
};
