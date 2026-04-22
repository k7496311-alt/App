import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Zap, Shield, Rocket, Target, Info, CheckCircle2, X } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, onSnapshot, addDoc, Timestamp, doc, updateDoc, increment, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { GlassCard } from '../components/ui/GlassCard';
import { formatCurrency, cn } from '../lib/utils';
import { Plan } from '../types';

export const PlansPage: React.FC = () => {
  const { state } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const user = state.user!;

  useEffect(() => {
    return onSnapshot(collection(db, 'plans'), (snap) => {
      setPlans(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Plan)));
    });
  }, []);

  const handleInvest = async () => {
    if (!selectedPlan || !amount || loading) return;
    const invAmount = parseFloat(amount);
    
    if (invAmount < selectedPlan.minAmount || invAmount > selectedPlan.maxAmount) {
      alert(`Amount must be between ${selectedPlan.minAmount} and ${selectedPlan.maxAmount}`);
      return;
    }
    
    if (user.balance < invAmount) {
      alert('Insufficient balance');
      return;
    }

    setLoading(true);
    try {
      const profit = (invAmount * selectedPlan.roi) / 100;
      
      // 1. Deduct balance
      await updateDoc(doc(db, 'users', user.id), {
        balance: increment(-invAmount)
      });

      // 2. Create investment
      await addDoc(collection(db, 'investments'), {
        userId: user.id,
        amount: invAmount,
        planId: selectedPlan.id,
        planName: selectedPlan.name,
        roi: selectedPlan.roi,
        profit: profit,
        startTime: Timestamp.now(),
        endTime: Timestamp.fromMillis(Date.now() + selectedPlan.durationMs),
        status: 'active'
      });

      // 3. Log transaction
      await addDoc(collection(db, 'transactions'), {
        userId: user.id,
        type: 'deposit',
        amount: invAmount,
        time: Timestamp.now(),
        status: 'approved'
      });

      // 4. Referral Commission Logic (3 Levels: 5%, 2%, 1%)
      if (user.referredBy) {
        let currentReferrerCode = user.referredBy;
        const commissions = [5, 2, 1];

        for (let i = 0; i < commissions.length; i++) {
          if (!currentReferrerCode) break;

          const refQ = query(collection(db, 'users'), where('referralCode', '==', currentReferrerCode));
          const refSnap = await getDocs(refQ);

          if (!refSnap.empty) {
            const referrerDoc = refSnap.docs[0];
            const referrerId = referrerDoc.id;
            const commissionAmount = (invAmount * commissions[i]) / 100;

            // Credit referrer
            const batch = writeBatch(db);
            batch.update(doc(db, 'users', referrerId), {
              balance: increment(commissionAmount)
            });

            // Log commission transaction
            const commTxRef = doc(collection(db, 'transactions'));
            batch.set(commTxRef, {
              userId: referrerId,
              type: 'referral',
              amount: commissionAmount,
              time: Timestamp.now(),
              status: 'approved',
              description: `L${i + 1} commission from ${user.phone}`
            });

            await batch.commit();

            // Prepare for next level
            currentReferrerCode = referrerDoc.data().referredBy;
          } else {
            break;
          }
        }
      }

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setSelectedPlan(null);
        setAmount('');
      }, 3000);

    } catch (err) {
      console.error(err);
      alert('Operation failed');
    } finally {
      setLoading(false);
    }
  };

  const PlanIcon = ({ level }: { level: string }) => {
    if (level === 'low') return <Shield className="w-6 h-6 text-green-400" />;
    if (level === 'medium') return <Zap className="w-6 h-6 text-accent-blue" />;
    return <Rocket className="w-6 h-6 text-accent-purple" />;
  };

  return (
    <div className="space-y-10 pb-20">
      <div className="text-center md:text-left">
        <h1 className="text-4xl font-bold mb-2">Investment <span className="gradient-text">Protocols</span></h1>
        <p className="text-white/60">Choose a computational trust model that fits your risk profile.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {plans.map((plan) => (
          <GlassCard key={plan.id} className="p-8 flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <div className="p-3 bg-white/5 rounded-2xl">
                <PlanIcon level={plan.riskLevel} />
              </div>
              <div className={cn(
                "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border",
                plan.riskLevel === 'low' ? "border-green-400/30 text-green-400 bg-green-400/5" :
                plan.riskLevel === 'medium' ? "border-accent-blue/30 text-accent-blue bg-accent-blue/5" :
                "border-accent-purple/30 text-accent-purple bg-accent-purple/5"
              )}>
                {plan.riskLevel} Risk
              </div>
            </div>

            <h3 className="text-2xl font-bold mb-1">{plan.name}</h3>
            <p className="text-white/40 text-sm mb-6">Duration: {plan.durationLabel}</p>

            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="p-4 bg-white/5 rounded-xl text-center">
                <p className="text-white/30 text-[10px] uppercase font-bold tracking-widest mb-1">ROI</p>
                <p className="text-accent-blue text-xl font-bold">{plan.roi}%</p>
              </div>
              <div className="p-4 bg-white/5 rounded-xl text-center">
                <p className="text-white/30 text-[10px] uppercase font-bold tracking-widest mb-1">Min</p>
                <p className="text-white text-xl font-bold">{formatCurrency(plan.minAmount).replace('.00', '')}</p>
              </div>
            </div>

            <button
              onClick={() => setSelectedPlan(plan)}
              className="w-full btn-primary mt-auto"
            >
              Initialize Node
            </button>
          </GlassCard>
        ))}
      </div>

      {/* Investment Modal */}
      {selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
            onClick={() => !loading && setSelectedPlan(null)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="w-full max-w-md glass-card p-8 relative z-10"
          >
            {success ? (
              <div className="text-center py-10">
                <div className="w-20 h-20 bg-green-400/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 className="w-10 h-10 text-green-400" />
                </div>
                <h3 className="text-2xl font-bold mb-2">Protocol Established</h3>
                <p className="text-white/50">Your investment node is now active and generating yield.</p>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center mb-8">
                  <h3 className="text-2xl font-bold">Invest in {selectedPlan.name}</h3>
                  <button onClick={() => setSelectedPlan(null)} className="text-white/30 hover:text-white">
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="p-4 bg-white/5 rounded-xl">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-white/50">Available Balance</span>
                      <span className="font-bold text-accent-blue">{formatCurrency(user.balance)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-white/50">ROI Multiplier</span>
                      <span className="font-bold">+{selectedPlan.roi}%</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-white/30 uppercase tracking-widest ml-1">Investment Amount</label>
                    <input 
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder={`Min: ${selectedPlan.minAmount}`}
                      className="glass-input w-full text-xl font-bold py-4"
                    />
                  </div>

                  <div className="bg-white/5 p-4 rounded-xl flex items-start">
                    <Info className="w-5 h-5 text-accent-blue mr-3 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-white/40 leading-relaxed">
                      By initiating this node, you agree to lock your capital for the protocol duration. 
                      Yield is calculated based on current AI market performance metrics.
                    </p>
                  </div>

                  <button
                    disabled={loading || !amount}
                    onClick={handleInvest}
                    className="w-full btn-primary py-4 text-lg"
                  >
                    {loading ? "Processing..." : "Confirm Protocol"}
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
};
