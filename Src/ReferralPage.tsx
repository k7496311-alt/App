import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Users, 
  UserPlus, 
  Link as LinkIcon, 
  Copy, 
  Check, 
  Trophy,
  BarChart3,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { GlassCard } from '../components/ui/GlassCard';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { formatCurrency } from '../lib/utils';
import { UserProfile, Transaction } from '../types';

export const ReferralPage: React.FC = () => {
  const { state } = useAuth();
  const [copied, setCopied] = useState(false);
  const [referralStats, setReferralStats] = useState({
    totalEarned: 0,
    level1Count: 0,
    level2Count: 0,
    level3Count: 0,
    level1Earned: 0,
    level2Earned: 0,
    level3Earned: 0,
  });
  const [network, setNetwork] = useState<UserProfile[]>([]);
  const user = state.user!;

  useEffect(() => {
    // 1. Fetch referral earnings
    const qEarnings = query(
      collection(db, 'transactions'),
      where('userId', '==', user.id),
      where('type', '==', 'referral')
    );

    const unsubEarnings = onSnapshot(qEarnings, (snap) => {
      const txs = snap.docs.map(doc => doc.data() as Transaction);
      const total = txs.reduce((sum, tx) => sum + tx.amount, 0);
      
      const l1 = txs.filter(tx => tx.description?.includes('L1')).reduce((sum, tx) => sum + tx.amount, 0);
      const l2 = txs.filter(tx => tx.description?.includes('L2')).reduce((sum, tx) => sum + tx.amount, 0);
      const l3 = txs.filter(tx => tx.description?.includes('L3')).reduce((sum, tx) => sum + tx.amount, 0);

      setReferralStats(prev => ({
        ...prev,
        totalEarned: total,
        level1Earned: l1,
        level2Earned: l2,
        level3Earned: l3
      }));
    });

    // 2. Fetch network members (Level 1)
    const qNetwork = query(
      collection(db, 'users'),
      where('referredBy', '==', user.referralCode)
    );

    const unsubNetwork = onSnapshot(qNetwork, (snap) => {
      const members = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserProfile));
      setNetwork(members);
      setReferralStats(prev => ({ ...prev, level1Count: members.length }));
    });

    return () => {
      unsubEarnings();
      unsubNetwork();
    };
  }, [user.id, user.referralCode]);

  const handleCopy = () => {
    navigator.clipboard.writeText(user.referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const LevelCard = ({ level, commission, color, count, earned }: any) => (
    <GlassCard className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h4 className={`text-xl font-bold text-${color}`}>Level {level}</h4>
        <div className={`px-3 py-1 rounded-full bg-${color}/10 text-${color} text-xs font-bold`}>
          {commission}% Commission
        </div>
      </div>
      <div className="flex justify-between items-end">
        <div>
          <p className="text-white/40 text-xs uppercase tracking-widest font-bold mb-1">Total Users</p>
          <p className="text-2xl font-bold">{count}</p>
        </div>
        <div className="text-right">
          <p className="text-white/40 text-xs uppercase tracking-widest font-bold mb-1">Earned</p>
          <p className="text-2xl font-bold text-white">{formatCurrency(earned)}</p>
        </div>
      </div>
    </GlassCard>
  );

  return (
    <div className="space-y-10 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Growth <span className="gradient-text">Network</span></h1>
          <p className="text-white/60">Expand the NeoInvest ecosystem and earn protocol rewards.</p>
        </div>
        <div className="flex gap-4">
          <GlassCard className="px-6 py-4 flex items-center" hover={false}>
            <Trophy className="w-6 h-6 text-yellow-500 mr-3" />
            <div>
              <p className="text-white/30 text-[10px] uppercase font-bold tracking-widest">Total Earned</p>
              <p className="text-lg font-bold">{formatCurrency(referralStats.totalEarned)}</p>
            </div>
          </GlassCard>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <GlassCard className="p-8" hover={false}>
          <h3 className="text-2xl font-bold mb-6 flex items-center">
            <LinkIcon className="w-6 h-6 text-accent-blue mr-3" />
            Your Referral Hub
          </h3>
          
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-white/30 uppercase tracking-widest ml-1">Referral Code</label>
              <div className="relative">
                <input 
                  type="text" 
                  readOnly 
                  value={user.referralCode}
                  className="glass-input w-full pr-14 py-4 text-xl font-mono tracking-widest text-accent-blue"
                />
                <button 
                  onClick={handleCopy}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-3 hover:bg-white/10 rounded-xl transition-all"
                >
                  {copied ? <Check className="w-5 h-5 text-green-400" /> : <Copy className="w-5 h-5 text-white/40" />}
                </button>
              </div>
            </div>

            <div className="p-6 bg-white/5 rounded-2xl border border-white/5">
              <div className="flex items-start mb-4">
                <div className="p-3 bg-accent-blue/10 rounded-xl mr-4">
                  <BarChart3 className="w-6 h-6 text-accent-blue" />
                </div>
                <div>
                  <h4 className="font-bold">Commission Logic</h4>
                  <p className="text-white/40 text-sm">Automated tiered reward system</p>
                </div>
              </div>
              <ul className="space-y-3">
                {[
                  { l: 1, p: 5, d: 'Direct recruits into the system' },
                  { l: 2, p: 2, d: 'Secondary network growth' },
                  { l: 3, p: 1, d: 'Tertiary ecosystem expansion' }
                ].map((tier) => (
                  <li key={tier.l} className="flex items-center justify-between text-sm py-2 border-b border-white/5 last:border-0">
                    <span className="text-white/60">Level {tier.l}</span>
                    <span className="font-bold text-accent-blue">{tier.p}%</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </GlassCard>

        <div className="space-y-6">
          <LevelCard level={1} commission={5} color="accent-blue" count={referralStats.level1Count} earned={referralStats.level1Earned} />
          <LevelCard level={2} commission={2} color="accent-purple" count={referralStats.level2Count} earned={referralStats.level2Earned} />
          <LevelCard level={3} commission={1} color="accent-blue" count={referralStats.level3Count} earned={referralStats.level3Earned} />
        </div>
      </div>

      <div>
        <h3 className="text-2xl font-bold mb-6 flex items-center">
          <Users className="w-6 h-6 text-white/40 mr-3" />
          Recently Joined Pathfinders (L1)
        </h3>
        <GlassCard className="overflow-hidden" hover={false}>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-white/5 text-white/30 text-[10px] uppercase font-bold tracking-widest">
                <tr>
                  <th className="px-6 py-4">User Identity</th>
                  <th className="px-6 py-4">Join Cycle</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Tier</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {network.length > 0 ? network.map(member => (
                  <tr key={member.id}>
                    <td className="px-6 py-4 font-bold">{member.phone.replace(/.(?=.{4})/g, '*')}</td>
                    <td className="px-6 py-4 text-white/50 text-sm">{member.createdAt.toDate().toLocaleDateString()}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-0.5 bg-green-400/10 text-green-400 text-[10px] font-bold uppercase rounded">Active</span>
                    </td>
                    <td className="px-6 py-4 font-bold text-accent-blue">LEVEL 1</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-white/30">
                      <UserPlus className="w-10 h-10 mx-auto mb-3 opacity-10" />
                      <p>No network members found. Share your code to expand.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </GlassCard>
      </div>
    </div>
  );
};
