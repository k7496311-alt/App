import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  ArrowDownLeft, 
  CreditCard, 
  ShieldCheck, 
  Copy,
  Check,
  Smartphone,
  Banknote,
  Send,
  Info
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { collection, addDoc, Timestamp, doc, onSnapshot } from 'firebase/firestore';
import { GlassCard } from '../components/ui/GlassCard';
import { formatCurrency, cn } from '../lib/utils';

export const DepositPage: React.FC = () => {
  const { state } = useAuth();
  const [amount, setAmount] = useState('');
  const [trxId, setTrxId] = useState('');
  const [method, setMethod] = useState<'bkash' | 'nagad' | 'rocket'>('bkash');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [depositNumber, setDepositNumber] = useState('01889411602');
  const user = state.user!;

  useEffect(() => {
    // Sync deposit number from admin config
    const unsub = onSnapshot(doc(db, 'system', 'config'), (docSnap) => {
      if (docSnap.exists()) {
        setDepositNumber(docSnap.data().depositNumber || '01889411602');
      }
    });
    return unsub;
  }, []);

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !trxId || loading) return;
    
    setError('');
    const depAmount = parseFloat(amount);
    if (depAmount < 100 || depAmount > 25000) {
      setError('ডিপোজিট এমাউন্ট ১০০ থেকে ২৫,০০০ টাকার মধ্যে হতে হবে।');
      return;
    }
    
    setLoading(true);
    try {
      await addDoc(collection(db, 'transactions'), {
        userId: user.id,
        type: 'deposit',
        amount: depAmount,
        method: method,
        trxId: trxId,
        time: Timestamp.now(),
        status: 'pending',
        description: `Deposit via ${method.toUpperCase()}`
      });

      alert('ডিপোজিট রিকোয়েস্ট পাঠানো হয়েছে! এডমিন অ্যাপ্রুভালের জন্য অপেক্ষা করুন।');
      setAmount('');
      setTrxId('');
    } catch (err) {
      setError('ডিপোজিট রিকোয়েস্ট ব্যর্থ হয়েছে। আবার চেষ্টা করুন।');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(depositNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
        <h1 className="text-4xl font-bold tracking-tight">Refill <span className="gradient-text">Liquidity</span></h1>
        <p className="text-white/50 mt-2">Inject capital into your AI neural network via local gateways.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="space-y-6">
          <GlassCard className="p-8 relative overflow-hidden" hover={false}>
            <div className="absolute top-0 right-0 w-64 h-64 bg-accent-blue/5 rounded-full blur-3xl -mr-32 -mt-32" />
            <h3 className="text-lg font-bold mb-6 flex items-center">
              <Smartphone className="w-5 h-5 text-accent-blue mr-2" />
              Payment Protocol
            </h3>

            <div className="space-y-4">
              <div className="p-6 bg-white/5 rounded-2xl border border-white/10">
                <p className="text-white/40 text-[10px] uppercase tracking-widest font-bold mb-4">Transfer Destination</p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-mono font-bold text-white tracking-wider">{depositNumber}</p>
                    <p className="text-xs text-accent-blue font-bold uppercase mt-1">Personal (Send Money)</p>
                  </div>
                  <button 
                    onClick={handleCopy}
                    className="p-4 bg-white/5 hover:bg-white/10 rounded-2xl transition-all active:scale-95"
                  >
                    {copied ? <Check className="w-6 h-6 text-green-400" /> : <Copy className="w-6 h-6 text-white/40" />}
                  </button>
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
                        ? "border-accent-blue bg-accent-blue/10 scale-105" 
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

              <div className="p-4 bg-white/5 rounded-xl flex items-start">
                <Info className="w-5 h-5 text-accent-blue mr-3 flex-shrink-0 mt-0.5" />
                <p className="text-[10px] text-white/40 leading-relaxed uppercase font-medium">
                  Please send the amount first to the number above using the <span className="text-white">"SEND MONEY"</span> option. 
                  Then fill the form with your Transaction ID.
                </p>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <h3 className="text-lg font-bold mb-4 flex items-center">
              <ShieldCheck className="w-5 h-5 text-green-400 mr-2" />
              Verified Transaction
            </h3>
            <p className="text-xs text-white/40 leading-relaxed">
              Your transaction is verified through our AI gateway. Typical approval time: 5-15 minutes.
            </p>
          </GlassCard>
        </div>

        <GlassCard className="p-8" hover={false}>
          <form onSubmit={handleDeposit} className="space-y-8">
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
                <label className="text-[10px] uppercase font-bold tracking-widest text-white/30 ml-1">Capital Amount</label>
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
                <label className="text-[10px] uppercase font-bold tracking-widest text-white/30 ml-1">Transaction ID (TrxID)</label>
                <div className="relative">
                  <CreditCard className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-white/20" />
                  <input 
                    type="text"
                    required
                    value={trxId}
                    onChange={(e) => setTrxId(e.target.value)}
                    placeholder="8X92PJ0..."
                    className="glass-input w-full pl-16 py-5 font-mono text-lg"
                  />
                </div>
              </div>
            </div>

            <div className="p-6 bg-white/5 rounded-2xl border border-white/5 space-y-3">
              <div className="flex justify-between text-xs font-bold uppercase tracking-widest">
                <span className="text-white/30">Network Fee</span>
                <span className="text-green-400">FREE</span>
              </div>
              <div className="flex justify-between text-xs font-bold uppercase tracking-widest">
                <span className="text-white/30">Protocol</span>
                <span className="text-white">{method} Fast-pay</span>
              </div>
              <div className="pt-4 border-t border-white/10 flex justify-between items-baseline">
                <span className="text-sm font-bold text-white/50 uppercase tracking-widest">Total Credit</span>
                <span className="text-3xl font-bold text-accent-blue">{formatCurrency(parseFloat(amount) || 0)}</span>
              </div>
            </div>

            <button 
              type="submit"
              disabled={loading || !amount || !trxId}
              className="w-full btn-primary py-6 text-xl tracking-tight flex items-center justify-center group"
            >
              <Send className="w-5 h-5 mr-3 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
              {loading ? "Verifying..." : "Notify AI Engine"}
            </button>
          </form>
        </GlassCard>
      </div>
    </div>
  );
};
