import React, { useEffect, useState } from 'react';
import { 
  TrendingUp, 
  Wallet, 
  BarChart3, 
  Users as UsersIcon, 
  ArrowUpRight, 
  Clock,
  Zap,
  Activity,
  ArrowDownRight,
  BrainCircuit,
  Lightbulb,
  ShieldCheck,
  Target
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot, orderBy, limit, writeBatch, doc, increment, Timestamp, getDocs } from 'firebase/firestore';
import { GlassCard } from '../components/ui/GlassCard';
import { formatCurrency, cn } from '../lib/utils';
import { Investment, Transaction } from '../types';

const chartData = [
  { name: '01:00', profit: 400 },
  { name: '04:00', profit: 300 },
  { name: '08:00', profit: 900 },
  { name: '12:00', profit: 1200 },
  { name: '16:00', profit: 1500 },
  { name: '20:00', profit: 1800 },
  { name: '23:59', profit: 2400 },
];

export const Dashboard: React.FC = () => {
  const { state } = useAuth();
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [liveProfit, setLiveProfit] = useState(0);
  const [referralIncome, setReferralIncome] = useState(0);
  const user = state.user!;

  useEffect(() => {
    const qInv = query(
      collection(db, 'investments'), 
      where('userId', '==', user.id),
      orderBy('startTime', 'desc')
    );
    const qTx = query(
      collection(db, 'transactions'), 
      where('userId', '==', user.id),
      orderBy('time', 'desc'),
      limit(5)
    );

    const unsubInv = onSnapshot(qInv, (snap) => {
      setInvestments(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Investment)));
    });
    const unsubTx = onSnapshot(qTx, (snap) => {
      const allTxs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
      setTransactions(allTxs);
    });

    // Separate listener for referral income
    const qRef = query(
      collection(db, 'transactions'),
      where('userId', '==', user.id),
      where('type', '==', 'referral')
    );
    const unsubRef = onSnapshot(qRef, (snap) => {
      const total = snap.docs.reduce((sum, doc) => sum + (doc.data().amount || 0), 0);
      setReferralIncome(total);
    });

    return () => {
      unsubInv();
      unsubTx();
      unsubRef();
    };
  }, [user.id]);

  // Live Profit Counter Logic
  useEffect(() => {
    const activeInvs = investments.filter(inv => inv.status === 'active');
    if (activeInvs.length === 0) {
      setLiveProfit(0);
      return;
    }

    const interval = setInterval(() => {
      let accrual = 0;
      activeInvs.forEach(inv => {
        const totalProfit = (inv.amount * inv.roi) / 100;
        const durationSeconds = 24 * 3600; 
        const profitPerSecond = totalProfit / durationSeconds;
        
        const startTime = (inv.startTime as any)?.toDate?.()?.getTime() || Date.now();
        const now = Date.now();
        const elapsedSeconds = (now - startTime) / 1000;
        
        if (elapsedSeconds > 0 && elapsedSeconds < durationSeconds) {
          accrual += profitPerSecond * elapsedSeconds;
        } else if (elapsedSeconds >= durationSeconds) {
          accrual += totalProfit;
        }
      });
      setLiveProfit(accrual);
    }, 1000);

    return () => clearInterval(interval);
  }, [investments]);

  const activeInvestmentsList = investments.filter(inv => inv.status === 'active');
  const totalActiveAmount = activeInvestmentsList.reduce((sum, inv) => sum + inv.amount, 0);

  const StatCard = ({ label, value, icon: Icon, color, trend, subtitle }: any) => (
    <GlassCard className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-xl bg-${color}/10`}>
          <Icon className={`w-6 h-6 text-${color}`} />
        </div>
        {trend && (
          <div className={cn(
            "flex items-center text-[10px] font-bold px-2 py-1 rounded-full",
            trend > 0 ? "text-green-400 bg-green-400/5" : "text-red-400 bg-red-400/5"
          )}>
            {trend > 0 ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <div>
        <p className="text-white/40 text-[10px] uppercase tracking-[1px] font-bold mb-2">{label}</p>
        <h3 className="text-2xl font-bold tracking-tight mb-1">{value}</h3>
        {subtitle && <p className="text-[10px] text-white/20 font-mono italic">{subtitle}</p>}
      </div>
    </GlassCard>
  );

  return (
    <div className="space-y-8 pb-10">
      {/* Header with AI ROI Prediction */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Quantum <span className="gradient-text">Dashboard</span></h1>
          <p className="text-white/60">Live neural tracking of your financial entropy.</p>
        </div>

        <div className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/5">
          <div className="w-12 h-12 bg-accent-blue/10 rounded-full flex items-center justify-center relative">
            <div className="absolute inset-0 bg-accent-blue/20 rounded-full animate-ping opacity-20" />
            <BrainCircuit className="w-6 h-6 text-accent-blue" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold tracking-widest text-white/30">AI ROI Projection</p>
            <p className="text-lg font-bold text-accent-blue">+14.2% <span className="text-white/40 text-xs font-normal">Est. ROI</span></p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          label="Total Liquidity" 
          value={formatCurrency(user.balance)} 
          icon={Wallet} 
          trend={2.4}
          color="accent-blue" 
        />
        <StatCard 
          label="Active Load" 
          value={formatCurrency(totalActiveAmount)} 
          icon={Activity} 
          trend={12.1}
          color="accent-purple" 
        />
        <StatCard 
          label="Live Yield" 
          value={formatCurrency(liveProfit)} 
          icon={TrendingUp} 
          trend={5.7}
          color="accent-blue" 
          subtitle="Real-time profit titration"
        />
        <StatCard 
          label="Network Yield" 
          value={formatCurrency(referralIncome)} 
          icon={UsersIcon} 
          color="accent-purple" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Chart Section */}
        <div className="lg:col-span-2">
          <GlassCard className="p-8 h-full" hover={false}>
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-xl font-bold flex items-center">
                  <Zap className="w-5 h-5 text-accent-blue mr-2" />
                  Yield Trajectory
                </h3>
                <p className="text-white/50 text-sm">AI-analyzed profit trajectory</p>
              </div>
              <div className="flex gap-2">
                {['24H', '1W', '1M'].map(t => (
                  <button key={t} className={`px-4 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${t === '24H' ? 'bg-accent-blue text-black' : 'bg-white/5 text-white/40 hover:text-white'}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00D2FF" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#00D2FF" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    stroke="#ffffff20" 
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    dy={10}
                  />
                  <YAxis 
                    stroke="#ffffff20" 
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) => `$${val}`}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#050507', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                    itemStyle={{ color: '#00D2FF' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="profit" 
                    stroke="#00D2FF" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorProfit)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>
        </div>

        {/* AI Insight & Recent Pulses */}
        <div className="space-y-6">
          <GlassCard className="p-6 bg-gradient-to-br from-accent-blue/5 to-accent-purple/5 border-accent-blue/10" hover={false}>
            <h3 className="text-lg font-bold mb-4 flex items-center">
              <Lightbulb className="w-5 h-5 text-accent-blue mr-2" />
              AI Insight
            </h3>
            <p className="text-white/60 text-sm leading-relaxed mb-4">
              Your active protocol is showing 12% higher volatility than usual. The AI suggests diversifying into a "Medium Risk" plan to hedge against current market entropy.
            </p>
            <button className="w-full py-3 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all">
              Execute Optimization
            </button>
          </GlassCard>

          <GlassCard className="p-6" hover={false}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold">Recent Pulses</h3>
              <button className="text-accent-blue text-xs font-bold uppercase tracking-widest hover:underline">View All</button>
            </div>
            
            <div className="space-y-5">
              {transactions.length > 0 ? transactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between group">
                  <div className="flex items-center">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center mr-4 transition-all group-hover:scale-110",
                      tx.type === 'deposit' ? "bg-green-400/10 text-green-400" : 
                      tx.type === 'withdraw' ? "bg-red-400/10 text-red-400" : "bg-accent-blue/10 text-accent-blue"
                    )}>
                      {tx.type === 'deposit' ? <ArrowUpRight className="w-5 h-5" /> : <TrendingUp className="w-5 h-5" />}
                    </div>
                    <div>
                      <p className="font-bold text-sm capitalize">{tx.type}</p>
                      <p className="text-white/30 text-[10px] uppercase">{(tx.time as any)?.toDate?.()?.toLocaleTimeString() || 'Just now'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={cn(
                      "font-bold text-sm",
                      tx.type === 'withdraw' ? "text-red-400" : "text-green-400"
                    )}>
                      {tx.type === 'withdraw' ? '-' : '+'}{formatCurrency(tx.amount)}
                    </p>
                    <p className="text-white/20 text-[10px] uppercase tracking-wider">{tx.status}</p>
                  </div>
                </div>
              )) : (
                <div className="text-center py-10 text-white/30">
                  <Activity className="w-8 h-8 mx-auto mb-2 opacity-10" />
                  <p className="text-xs">No recent pulses detected.</p>
                </div>
              )}
            </div>
          </GlassCard>
        </div>
      </div>

      {/* Active Units */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold">Active Protocol Units</h3>
          <div className="flex items-center text-accent-blue text-xs font-bold gap-2">
            <Target className="w-4 h-4" />
            {activeInvestmentsList.length} UNITS RUNNING
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activeInvestmentsList.length > 0 ? activeInvestmentsList.map(inv => (
            <GlassCard key={inv.id} className="p-6 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-accent-blue/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-accent-blue/10 transition-all" />
              <div className="flex items-center justify-between mb-4">
                <div className="px-3 py-1 rounded-lg bg-accent-blue/10 text-accent-blue text-[10px] font-bold uppercase tracking-widest border border-accent-blue/10">
                  {inv.planName}
                </div>
                <div className="flex items-center text-white/50 text-[10px] font-bold uppercase tracking-widest">
                  <div className="w-1.5 h-1.5 bg-green-400 rounded-full mr-2 animate-pulse" />
                  Live Sync
                </div>
              </div>
              <h4 className="text-2xl font-bold mb-1">{formatCurrency(inv.amount)}</h4>
              <p className="text-white/40 text-xs mb-6">Target Yield: {formatCurrency(inv.profit)}</p>
              
              <div className="space-y-4">
                <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: '74%' }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    className="bg-gradient-to-r from-accent-blue to-accent-purple h-full rounded-full"
                  />
                </div>
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-white/30">
                  <span>Cycle progress</span>
                  <span className="text-white/60">74%</span>
                </div>
              </div>
            </GlassCard>
          )) : (
            <div className="lg:col-span-3 text-center py-12 glass-card border-dashed">
              <TrendingUp className="w-12 h-12 mx-auto mb-4 text-white/10" />
              <p className="text-white/40 text-sm">No active investments found. Start your journey today.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
