import React, { useEffect, useState } from 'react';
import { 
  ShieldCheck, 
  Settings, 
  Users, 
  CreditCard, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  XCircle,
  TrendingDown,
  Database,
  Smartphone,
  ArrowDownLeft,
  Save
} from 'lucide-react';
import { db } from '../lib/firebase';
import { 
  collection, 
  query, 
  onSnapshot, 
  doc, 
  updateDoc, 
  addDoc, 
  deleteDoc, 
  Timestamp, 
  increment,
  writeBatch,
  getDocs,
  getDoc,
  where,
  setDoc
} from 'firebase/firestore';
import { GlassCard } from '../components/ui/GlassCard';
import { formatCurrency, cn } from '../lib/utils';
import { Plan, UserProfile, Transaction, SystemConfig } from '../types';

export const AdminPanel: React.FC = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [pendingWithdrawals, setPendingWithdrawals] = useState<Transaction[]>([]);
  const [pendingDeposits, setPendingDeposits] = useState<Transaction[]>([]);
  const [systemConfig, setSystemConfig] = useState<SystemConfig>({ depositNumber: '01889411602' });
  const [loading, setLoading] = useState(false);
  const [isAddingPlan, setIsAddingPlan] = useState(false);
  const [newPlan, setNewPlan] = useState({
    name: '',
    durationValue: 0,
    durationUnit: 'hours',
    roi: 0,
    minAmount: 0,
    maxAmount: 0,
    riskLevel: 'medium' as 'low' | 'medium' | 'high'
  });

  useEffect(() => {
    const unsubPlans = onSnapshot(collection(db, 'plans'), (snap) => {
      setPlans(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Plan)));
    });
    
    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      setUsers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserProfile)));
    });

    const qWithdraw = query(
      collection(db, 'transactions'), 
      where('type', '==', 'withdraw'), 
      where('status', '==', 'pending')
    );
    const unsubTx = onSnapshot(qWithdraw, (snap) => {
      setPendingWithdrawals(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction)));
    });

    const qDeposit = query(
      collection(db, 'transactions'), 
      where('type', '==', 'deposit'), 
      where('status', '==', 'pending')
    );
    const unsubDep = onSnapshot(qDeposit, (snap) => {
      setPendingDeposits(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction)));
    });

    const unsubConfig = onSnapshot(doc(db, 'system', 'config'), (snap) => {
      if (snap.exists()) {
        setSystemConfig(snap.data() as SystemConfig);
      }
    });

    return () => {
      unsubPlans();
      unsubUsers();
      unsubTx();
      unsubDep();
      unsubConfig();
    };
  }, []);

  const updateSystemConfig = async () => {
    try {
      await setDoc(doc(db, 'system', 'config'), systemConfig);
      alert('System configuration updated');
    } catch (err) {
      alert('Failed to update config');
    }
  };

  const approveDeposit = async (tx: Transaction) => {
    try {
      const batch = writeBatch(db);
      // 1. Approve transaction
      batch.update(doc(db, 'transactions', tx.id), { status: 'approved' });
      // 2. Credit user balance
      batch.update(doc(db, 'users', tx.userId), { balance: increment(tx.amount) });

      // 3. Referral Commission Logic (3 Levels: 5%, 2%, 1%)
      const userSnap = await getDoc(doc(db, 'users', tx.userId));
      if (userSnap.exists()) {
        const userData = userSnap.data() as UserProfile;
        let currentReferrerCode = userData.referredBy;
        
        // Level 1: 5%
        if (currentReferrerCode) {
          const q1 = query(collection(db, 'users'), where('referralCode', '==', currentReferrerCode));
          const snap1 = await getDocs(q1);
          if (!snap1.empty) {
            const ref1 = snap1.docs[0];
            const ref1Data = ref1.data() as UserProfile;
            const amount1 = tx.amount * 0.05;
            
            batch.update(ref1.ref, { balance: increment(amount1) });
            const refTx1 = doc(collection(db, 'transactions'));
            batch.set(refTx1, {
              userId: ref1.id,
              type: 'referral',
              amount: amount1,
              status: 'approved',
              time: Timestamp.now(),
              description: `Referral L1 Bonus from ${userData.phone}`
            });

            // Level 2: 2%
            if (ref1Data.referredBy) {
              const q2 = query(collection(db, 'users'), where('referralCode', '==', ref1Data.referredBy));
              const snap2 = await getDocs(q2);
              if (!snap2.empty) {
                const ref2 = snap2.docs[0];
                const ref2Data = ref2.data() as UserProfile;
                const amount2 = tx.amount * 0.02;
                
                batch.update(ref2.ref, { balance: increment(amount2) });
                const refTx2 = doc(collection(db, 'transactions'));
                batch.set(refTx2, {
                  userId: ref2.id,
                  type: 'referral',
                  amount: amount2,
                  status: 'approved',
                  time: Timestamp.now(),
                  description: `Referral L2 Bonus from ${userData.phone}`
                });

                // Level 3: 1%
                if (ref2Data.referredBy) {
                  const q3 = query(collection(db, 'users'), where('referralCode', '==', ref2Data.referredBy));
                  const snap3 = await getDocs(q3);
                  if (!snap3.empty) {
                    const ref3 = snap3.docs[0];
                    const amount3 = tx.amount * 0.01;
                    
                    batch.update(ref3.ref, { balance: increment(amount3) });
                    const refTx3 = doc(collection(db, 'transactions'));
                    batch.set(refTx3, {
                      userId: ref3.id,
                      type: 'referral',
                      amount: amount3,
                      status: 'approved',
                      time: Timestamp.now(),
                      description: `Referral L3 Bonus from ${userData.phone}`
                    });
                  }
                }
              }
            }
          }
        }
      }

      await batch.commit();
      alert('Deposit approved and commission distributed');
    } catch (err) {
      console.error("Approval error:", err);
      alert('Approval failed');
    }
  };

  const rejectDeposit = async (tx: Transaction) => {
    try {
      await updateDoc(doc(db, 'transactions', tx.id), { status: 'rejected' });
      alert('Deposit rejected');
    } catch (err) {
      alert('Rejection failed');
    }
  };

  const approveWithdrawal = async (tx: Transaction) => {
    try {
      await updateDoc(doc(db, 'transactions', tx.id), { status: 'approved' });
      alert('Withdrawal approved');
    } catch (err) {
      alert('Approval failed');
    }
  };

  const rejectWithdrawal = async (tx: Transaction) => {
    try {
      // Return balance to user
      await updateDoc(doc(db, 'users', tx.userId), {
        balance: increment(tx.amount)
      });
      await updateDoc(doc(db, 'transactions', tx.id), { status: 'rejected' });
      alert('Withdrawal rejected and balance returned');
    } catch (err) {
      alert('Rejection failed');
    }
  };

  const handleAddPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      let durationMs = 0;
      const val = Number(newPlan.durationValue);
      if (newPlan.durationUnit === 'hours') durationMs = val * 60 * 60 * 1000;
      else if (newPlan.durationUnit === 'days') durationMs = val * 24 * 60 * 60 * 1000;
      else if (newPlan.durationUnit === 'minutes') durationMs = val * 60 * 1000;

      const durationLabel = `${val} ${newPlan.durationUnit.charAt(0).toUpperCase() + newPlan.durationUnit.slice(1)}`;

      await addDoc(collection(db, 'plans'), {
        name: newPlan.name,
        durationLabel,
        durationMs,
        roi: Number(newPlan.roi),
        minAmount: Number(newPlan.minAmount),
        maxAmount: Number(newPlan.maxAmount),
        riskLevel: newPlan.riskLevel,
      });
      setIsAddingPlan(false);
      setNewPlan({
        name: '',
        durationValue: 0,
        durationUnit: 'hours',
        roi: 0,
        minAmount: 0,
        maxAmount: 0,
        riskLevel: 'medium'
      });
      alert('Plan added successfully');
    } catch (err) {
      alert('Failed to add plan');
    } finally {
      setLoading(false);
    }
  };

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const deletePlan = async (id: string) => {
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id);
      // Auto-reset after 3 seconds if not confirmed
      setTimeout(() => setConfirmDeleteId(null), 3000);
      return;
    }

    console.log("CRITICAL: Executing deletion for plan ID:", id);
    setLoading(true);
    try {
      const planRef = doc(db, 'plans', id);
      await deleteDoc(planRef);
      setConfirmDeleteId(null);
      alert('Protocol Decommissioned Successfully');
    } catch (err: any) {
      console.error("DELETION FAILURE:", err);
      alert(`Decommissioning Failed: ${err.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const seedPlans = async () => {
    setLoading(true);
    try {
      const defaultPlans = [
        { name: 'Micro Alpha', durationLabel: '2 Hours', durationMs: 7200000, roi: 1.5, minAmount: 1, maxAmount: 100, riskLevel: 'low' },
        { name: 'Beta Surge', durationLabel: '24 Hours', durationMs: 86400000, roi: 12.0, minAmount: 5, maxAmount: 500, riskLevel: 'medium' },
        { name: 'Gamma Prime', durationLabel: '7 Days', durationMs: 604800000, roi: 95.0, minAmount: 10, maxAmount: 5000, riskLevel: 'high' }
      ];
      
      for (const p of defaultPlans) {
        await addDoc(collection(db, 'plans'), p);
      }
      alert('Plans seeded successfully. Please refresh.');
    } catch (err) {
      alert('Failed to seed plans');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-10 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">System <span className="gradient-text">Overlord</span></h1>
          <p className="text-white/60">Core administrative protocols for NeoInvest AI.</p>
        </div>
        <div className="flex gap-4">
          <GlassCard className="p-2 flex items-center gap-4 bg-white/5 border-white/10" hover={false}>
            <div className="relative">
              <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-accent-blue" />
              <input 
                value={systemConfig.depositNumber}
                onChange={(e) => setSystemConfig({ ...systemConfig, depositNumber: e.target.value })}
                className="bg-black/40 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-xs font-mono focus:border-accent-blue outline-none w-40"
              />
            </div>
            <button 
              onClick={updateSystemConfig}
              className="p-2 bg-accent-blue/10 text-accent-blue rounded-lg hover:bg-accent-blue/20 transition-all"
            >
              <Save className="w-4 h-4" />
            </button>
          </GlassCard>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Pending Payouts */}
        <GlassCard className="p-8" hover={false}>
          <h3 className="text-xl font-bold mb-6 flex items-center">
            <CreditCard className="w-6 h-6 text-accent-purple mr-3" />
            Payout Authorization
          </h3>
          <div className="space-y-4">
            {pendingWithdrawals.length > 0 ? pendingWithdrawals.map(tx => (
              <div key={tx.id} className="p-4 bg-white/5 rounded-xl flex items-center justify-between border border-white/5">
                <div>
                  <p className="font-bold text-lg">{formatCurrency(tx.amount)}</p>
                  <p className="text-white/30 text-[10px] font-mono uppercase tracking-widest">{tx.method} &rarr; {tx.trxId}</p>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => approveWithdrawal(tx)}
                    className="p-3 bg-green-400/10 text-green-400 rounded-xl hover:bg-green-400/20 transition-all"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => rejectWithdrawal(tx)}
                    className="p-3 bg-red-400/10 text-red-400 rounded-xl hover:bg-red-400/20 transition-all"
                  >
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )) : (
              <p className="text-center py-10 text-white/10 uppercase tracking-widest text-[10px] font-bold">Safe: No Payouts Pending</p>
            )}
          </div>
        </GlassCard>

        {/* Pending Deposits */}
        <GlassCard className="p-8" hover={false}>
          <h3 className="text-xl font-bold mb-6 flex items-center text-accent-blue">
            <ArrowDownLeft className="w-6 h-6 mr-3" />
            Deposit Verification
          </h3>
          <div className="space-y-4">
            {pendingDeposits.length > 0 ? pendingDeposits.map(tx => (
              <div key={tx.id} className="p-4 bg-white/5 rounded-xl flex items-center justify-between border border-white/5">
                <div>
                  <p className="font-bold text-lg text-accent-blue">{formatCurrency(tx.amount)}</p>
                  <p className="text-white/30 text-[10px] font-mono uppercase tracking-widest">{tx.method} | TRX: {tx.trxId}</p>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => approveDeposit(tx)}
                    className="p-3 bg-accent-blue/10 text-accent-blue rounded-xl hover:bg-accent-blue/20 transition-all"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => rejectDeposit(tx)}
                    className="p-3 bg-white/5 text-white/20 rounded-xl hover:bg-red-400/10 hover:text-red-400 transition-all"
                  >
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )) : (
              <p className="text-center py-10 text-white/10 uppercase tracking-widest text-[10px] font-bold">Idle: No Deposits to Verify</p>
            )}
          </div>
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <GlassCard className="p-6">
            <Users className="w-6 h-6 text-accent-blue mb-4" />
            <p className="text-white/40 text-xs uppercase font-bold tracking-widest">Total Nodes</p>
            <h4 className="text-3xl font-bold">{users.length}</h4>
          </GlassCard>
          <GlassCard className="p-6">
            <TrendingDown className="w-6 h-6 text-accent-purple mb-4" />
            <p className="text-white/40 text-xs uppercase font-bold tracking-widest">Global Float</p>
            <h4 className="text-3xl font-bold">{formatCurrency(users.reduce((s, u) => s + u.balance, 0))}</h4>
          </GlassCard>
        </div>

      {/* Plan Management */}
      <GlassCard className="p-8" hover={false}>
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-2xl font-bold flex items-center">
            <Settings className="w-6 h-6 text-accent-purple mr-3" />
            Plan Protocols
          </h3>
          <div className="flex gap-4">
            <button 
              onClick={seedPlans}
              disabled={loading}
              className="text-[10px] font-bold uppercase tracking-widest text-white/40 hover:text-white transition-colors"
            >
              Seed Default Protocols
            </button>
            <button 
              onClick={() => setIsAddingPlan(!isAddingPlan)}
              className="btn-primary flex items-center px-4 py-2"
            >
              <Plus className="w-5 h-5 mr-1" /> Add Protocol
            </button>
          </div>
        </div>

        {isAddingPlan && (
          <form onSubmit={handleAddPlan} className="mb-10 p-6 bg-white/5 rounded-2xl space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input 
                placeholder="Plan Name" 
                className="glass-input" 
                value={newPlan.name} 
                onChange={e => setNewPlan({...newPlan, name: e.target.value})} 
                required 
              />
              <div className="flex gap-2">
                <input 
                  placeholder="Duration Value" 
                  type="number" 
                  className="glass-input flex-1" 
                  value={newPlan.durationValue || ''} 
                  onChange={e => setNewPlan({...newPlan, durationValue: parseInt(e.target.value)})} 
                  required 
                />
                <select 
                  className="glass-input w-32" 
                  value={newPlan.durationUnit} 
                  onChange={e => setNewPlan({...newPlan, durationUnit: e.target.value as any})}
                >
                  <option value="minutes" className="bg-black">Minutes</option>
                  <option value="hours" className="bg-black">Hours</option>
                  <option value="days" className="bg-black">Days</option>
                </select>
              </div>
              <input 
                placeholder="ROI %" 
                type="number" 
                step="0.01" 
                className="glass-input" 
                value={newPlan.roi || ''} 
                onChange={e => setNewPlan({...newPlan, roi: parseFloat(e.target.value)})} 
                required 
              />
              <input 
                placeholder="Min Amount" 
                type="number" 
                className="glass-input" 
                value={newPlan.minAmount || ''} 
                onChange={e => setNewPlan({...newPlan, minAmount: parseFloat(e.target.value)})} 
                required 
              />
              <input 
                placeholder="Max Amount" 
                type="number" 
                className="glass-input" 
                value={newPlan.maxAmount || ''} 
                onChange={e => setNewPlan({...newPlan, maxAmount: parseFloat(e.target.value)})} 
                required 
              />
              <select 
                className="glass-input" 
                value={newPlan.riskLevel} 
                onChange={e => setNewPlan({...newPlan, riskLevel: e.target.value as any})}
              >
                <option value="low" className="bg-black">Low Risk</option>
                <option value="medium" className="bg-black">Medium Risk</option>
                <option value="high" className="bg-black">High Risk</option>
              </select>
            </div>
            <div className="flex gap-4">
              <button type="submit" disabled={loading} className="btn-primary flex-1">
                {loading ? 'Creating...' : 'Deploy Protocol'}
              </button>
              <button type="button" onClick={() => setIsAddingPlan(false)} className="btn-primary flex-1 bg-white/5 border-white/10 text-white">
                Cancel
              </button>
            </div>
          </form>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map(plan => (
            <div key={plan.id} className="p-6 bg-white/5 rounded-2xl relative border border-white/5">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  console.log("Delete button clicked for ID:", plan.id);
                  deletePlan(plan.id);
                }}
                className={cn(
                  "absolute top-4 right-4 py-2 px-3 transition-all z-[100] rounded-lg font-extrabold text-[10px] uppercase flex items-center justify-center gap-2 border shadow-lg cursor-pointer",
                  confirmDeleteId === plan.id 
                    ? "bg-red-600 text-white border-red-400 scale-110 shadow-red-500/50" 
                    : "bg-red-500/20 text-red-500 border-red-500/30 hover:bg-red-500/40"
                )}
                title="Delete Protocol"
              >
                <div className="pointer-events-none flex items-center gap-2">
                  {confirmDeleteId === plan.id ? (
                    <span className="animate-pulse">CONFIRM?</span>
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </div>
              </button>
              <h4 className="text-xl font-bold mb-1">{plan.name}</h4>
              <p className="text-white/40 text-xs mb-4">{plan.durationLabel} | {plan.roi}% ROI</p>
              <div className="flex justify-between text-xs font-mono">
                <span>Min: {formatCurrency(plan.minAmount)}</span>
                <span>Max: {formatCurrency(plan.maxAmount)}</span>
              </div>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* User Management */}
      <GlassCard className="overflow-hidden" hover={false}>
        <div className="p-6 border-b border-white/5 flex justify-between items-center">
          <h3 className="text-xl font-bold">Registry Audit</h3>
          <button className="text-xs text-accent-blue font-bold tracking-widest uppercase">Export Logs</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-white/5 text-white/30 text-[10px] uppercase font-bold tracking-widest">
              <tr>
                <th className="px-6 py-4">Phone Identity</th>
                <th className="px-6 py-4">Liquidity</th>
                <th className="px-6 py-4">Code</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {users.map(u => (
                <tr key={u.id}>
                  <td className="px-6 py-4 font-bold">{u.phone}</td>
                  <td className="px-6 py-4 text-green-400">{formatCurrency(u.balance)}</td>
                  <td className="px-6 py-4 font-mono text-xs">{u.referralCode}</td>
                  <td className="px-6 py-4 uppercase text-[10px] tracking-widest font-bold">
                    <span className={u.role === 'admin' ? 'text-accent-purple' : 'text-white/40'}>{u.role}</span>
                  </td>
                  <td className="px-6 py-4">
                    <button 
                      onClick={async () => {
                        const newLevel = u.role === 'admin' ? 'user' : 'admin';
                        await updateDoc(doc(db, 'users', u.id), { role: newLevel });
                      }}
                      className="text-[10px] font-bold uppercase tracking-widest p-2 bg-white/5 rounded-lg hover:bg-white/10"
                    >
                      Toggle {u.role === 'admin' ? 'User' : 'Admin'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
};

// Admin Control Panel Component
