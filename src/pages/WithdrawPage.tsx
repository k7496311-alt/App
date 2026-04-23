import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  ArrowUpRight, 
  CreditCard, 
  ShieldCheck, 
  Wallet as WalletIcon,
  Smartphone,
  Banknote,
  Navigation,
  Info,
  Clock
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { collection, addDoc, Timestamp, doc, updateDoc, increment } from 'firebase/firestore';
import { GlassCard } from '../components/ui/GlassCard';
import { formatCurrency, cn } from '../lib/utils';

export const WithdrawPage: React.FC = () => {
  const { state } = useAuth();
  const [amount, setAmount] = useState('');
  const [targetNumber, setTargetNumber] = useState('');
  const [method, setMethod] = useState<'bkash' | 'nagad' | 'rocket'>('bkash');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const user = state.user!;

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !targetNumber || loading) return;
    
    setError('');
    const withAmount = parseFloat(amount);
    if (withAmount < 100 || withAmount > 25000) {
      setError('উইথড্র এমাউন্ট ১০০ থেকে ২৫,০০০ টাকার মধ্যে হতে হবে।');
      return;
    }

    if (user.balance < withAmount) {
      setError('আপনার একাউন্টে পর্যাপ্ত ব্যালেন্স নেই।');
      return;
    }
    
    setLoading(true);
    try {
      // 1. Deduct balance immediately (lock it)
      await updateDoc(doc(db, 'users', user.id), {
        balance: increment(-withAmount)
      });

      // 2. Create pending record
      await addDoc(collection(db, 'transactions'), {
        userId: user.id,
        type: 'withdraw',
        amount: withAmount,
        method: method,
        trxId: targetNumber, // We store the target number here for easy admin view
        time: Timestamp.now(),
        status: 'pending',
        description: `Withdrawal to ${method.toUpperCase()} (${targetNumber})`
      });

      alert('উইথড্র রিকোয়েস্ট পাঠানো হয়েছে! অনুগ্রহ করে প্রসেসিং এর জন্য অপেক্ষা করুন।');
      setAmount('');
      setTargetNumber('');
    } catch (err) {
      setError('উইথড্র রিকোয়েস্ট ব্যর্থ হয়েছে। আবার চেষ্টা করুন।');
    } finally {
      setLoading(false);
    }
  };

  const methods = [
    { 
      id: 'bkash', 
      name: 'bKash', 
      logo: 'https://freepnglogo.com/images/all_img/1701543162bkash-app-logo-png.png',
      color: 'bg-[#D12053]' 
    },
    { 
      id: 'nagad', 
      name: 'Nagad', 
      logo: 'https://freepnglogo.com/images/all_img/1701625907nagad-logo-png.png',
      color: 'bg-[#F7941D]' 
    },
    { 
      id: 'rocket', 
      name: 'Rocket', 
      logo: 'https://freepnglogo.com/images/all_img/1701633513rocket-logo-png.png',
      color: 'bg-[#8C3494]' 
    },
  ];

  return (
    <div className="space-y-10 pb-20">
      <header>
        <h1 className="text-4xl font-bold tracking-tight">Extract <span className="gradient-text">Profits</span></h1>
        <p className="text-white/50 mt-2">Transfer your computational yields back to your local bank account.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="space-y-6">
          <GlassCard className="p-8 relative overflow-hidden" hover={false}>
            <div className="absolute top-0 right-0 w-64 h-64 bg-accent-purple/5 rounded-full blur-3xl -mr-32 -mt-32" />
            
            <div className="flex items-center mb-10">
              <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center mr-5">
                <WalletIcon className="w-7 h-7 text-accent-purple" />
              </div>
              <div>
                <p className="text-white/40 text-[10px] uppercase tracking-widest font-bold mb-1">Available to Extract</p>
                <h2 className="text-4xl font-bold">{formatCurrency(user.balance)}</h2>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              {methods.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMethod(m.id as any)}
                  className={cn(
                    "p-4 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-3 h-24",
                    method === m.id 
                      ? "border-accent-purple bg-accent-purple/10 scale-105" 
                      : "border-transparent bg-white/5 opacity-50 hover:opacity-100"
                  )}
                >
                  <div className="w-12 h-12 flex items-center justify-center">
                    <img 
                      src={m.logo} 
                      alt={m.name} 
                      className="max-w-full max-h-full object-contain"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest">{m.name}</span>
                </button>
              ))}
            </div>
          </GlassCard>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <GlassCard className="p-6">
              <Clock className="w-6 h-6 text-accent-blue mb-4" />
              <h4 className="font-bold mb-1">Process Cycle</h4>
              <p className="text-xs text-white/40">Approvals typically take 1-4 hours during peak hours.</p>
            </GlassCard>
            <GlassCard className="p-6">
              <ShieldCheck className="w-6 h-6 text-green-400 mb-4" />
              <h4 className="font-bold mb-1">Secure Bridge</h4>
              <p className="text-xs text-white/40">Encrypted transmission protocols ensure safe delivery.</p>
            </GlassCard>
          </div>
        </div>

        <GlassCard className="p-8" hover={false}>
          <form onSubmit={handleWithdraw} className="space-y-8">
            {user.balance < 100 && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-4 bg-orange-500/10 border border-orange-500/20 text-orange-500 rounded-xl text-sm font-bold flex items-start"
              >
                <Info className="w-5 h-5 mr-3 flex-shrink-0 mt-0.5" />
                <p>আপনার ব্যালেন্স ১০০ টাকার কম। উইথড্র করার জন্য আপনার একাউন্টে অন্তত ১০০ টাকা থাকতে হবে।</p>
              </motion.div>
            )}
            
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl text-sm font-bold flex items-center"
              >
                <Info className="w-5 h-5 mr-3 flex-shrink-0" />
                {error}
              </motion.div>
            )}
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold tracking-widest text-white/30 ml-1">Withdrawal Amount</label>
                <div className="relative">
                  <Banknote className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-white/20" />
                  <input 
                    type="number"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="glass-input w-full pl-16 py-6 text-3xl font-bold"
                  />
                  <span className="absolute right-6 top-1/2 -translate-y-1/2 text-white/20 font-bold uppercase tracking-widest text-sm">BDT</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold tracking-widest text-white/30 ml-1">Receiver Account ({method})</label>
                <div className="relative">
                  <Smartphone className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-white/20" />
                  <input 
                    type="tel"
                    required
                    value={targetNumber}
                    onChange={(e) => setTargetNumber(e.target.value)}
                    placeholder="01XXXXXXXXX"
                    className="glass-input w-full pl-16 py-5 font-mono text-lg"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white/5 p-6 rounded-2xl border border-white/5 space-y-4">
              <div className="flex justify-between items-center text-xs font-bold uppercase tracking-widest">
                <span className="text-white/30">Transfer Fee</span>
                <span className="text-white">0%</span>
              </div>
              <div className="flex justify-between items-center text-xs font-bold uppercase tracking-widest">
                <span className="text-white/30">Processing Protocol</span>
                <span className="text-accent-purple">Express Layer-2</span>
              </div>
              <div className="pt-4 border-t border-white/10 flex justify-between items-baseline">
                <span className="text-sm font-bold text-white/50 uppercase tracking-widest">Net Output</span>
                <span className="text-3xl font-bold text-accent-purple">{formatCurrency(parseFloat(amount) || 0)}</span>
              </div>
            </div>

            <button 
              type="submit"
              disabled={loading || !amount || !targetNumber || user.balance < 100}
              className={cn(
                "w-full py-6 text-xl tracking-tight flex items-center justify-center group rounded-2xl font-bold transition-all",
                user.balance < 100 
                  ? "bg-white/5 text-white/20 cursor-not-allowed border border-white/5" 
                  : "btn-primary bg-gradient-to-r from-accent-purple to-accent-blue"
              )}
            >
              <Navigation className="w-5 h-5 mr-3 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform rotate-45" />
              {user.balance < 100 ? "ব্যালেন্স অপর্যাপ্ত" : (loading ? "Extracting..." : "Execute Extract")}
            </button>
          </form>
        </GlassCard>
      </div>
    </div>
  );
};
