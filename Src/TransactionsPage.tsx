import React, { useEffect, useState } from 'react';
import { 
  ArrowDownCircle, 
  ArrowUpCircle, 
  ArrowRightCircle, 
  Search,
  Filter,
  History,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { GlassCard } from '../components/ui/GlassCard';
import { formatCurrency, cn } from '../lib/utils';
import { Transaction } from '../types';

export const TransactionsPage: React.FC = () => {
  const { state } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filter, setFilter] = useState<'all' | 'deposit' | 'withdraw' | 'profit'>('all');
  const user = state.user!;

  useEffect(() => {
    let q = query(
      collection(db, 'transactions'), 
      where('userId', '==', user.id),
      orderBy('time', 'desc')
    );

    const unsub = onSnapshot(q, (snap) => {
      let data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
      if (filter !== 'all') {
        data = data.filter(tx => tx.type === filter);
      }
      setTransactions(data);
    });

    return unsub;
  }, [user.id, filter]);

  return (
    <div className="space-y-10 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Ledger <span className="gradient-text">History</span></h1>
          <p className="text-white/60">Comprehensive audit log of all protocol operations.</p>
        </div>
        
        <div className="flex p-1 bg-white/5 rounded-xl">
          {['all', 'deposit', 'withdraw', 'profit'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f as any)}
              className={cn(
                "px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all",
                filter === f ? "bg-neon-blue text-black" : "text-white/40 hover:text-white"
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <GlassCard className="overflow-hidden" hover={false}>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-white/5 text-white/30 text-[10px] uppercase font-bold tracking-widest">
              <tr>
                <th className="px-6 py-5">Operation</th>
                <th className="px-6 py-5">Time cycle</th>
                <th className="px-6 py-5">Magnitude</th>
                <th className="px-6 py-5">Status</th>
                <th className="px-6 py-5">Hash</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {transactions.length > 0 ? transactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-white/[0.02] transition-all">
                  <td className="px-6 py-5">
                    <div className="flex items-center">
                      <div className={cn(
                        "p-2 rounded-lg mr-3",
                        tx.type === 'deposit' ? "text-green-400 bg-green-400/5" :
                        tx.type === 'withdraw' ? "text-red-400 bg-red-400/5" : "text-neon-blue bg-neon-blue/5"
                      )}>
                        {tx.type === 'deposit' ? <ArrowDownCircle className="w-5 h-5" /> : 
                         tx.type === 'withdraw' ? <ArrowUpCircle className="w-5 h-5" /> : <ArrowRightCircle className="w-5 h-5" />}
                      </div>
                      <span className="font-bold capitalize">{tx.type}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-white/50 text-sm">
                    {tx.time.toDate().toLocaleString()}
                  </td>
                  <td className="px-6 py-5">
                    <span className={cn(
                      "font-bold",
                      tx.type === 'withdraw' ? "text-red-400" : "text-green-400"
                    )}>
                      {tx.type === 'withdraw' ? '-' : '+'}{formatCurrency(tx.amount)}
                    </span>
                  </td>
                  <td className="px-6 py-5 uppercase">
                    <div className={cn(
                      "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold",
                      tx.status === 'approved' ? "bg-green-400/10 text-green-400" :
                      tx.status === 'pending' ? "bg-yellow-400/10 text-yellow-400" : "bg-red-400/10 text-red-400"
                    )}>
                      {tx.status}
                    </div>
                  </td>
                  <td className="px-6 py-5 font-mono text-[10px] text-white/20">
                    {tx.id.substring(0, 12)}...
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center text-white/30">
                    <History className="w-12 h-12 mx-auto mb-4 opacity-10" />
                    <p>No operations found in this sector.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
};

// End of TransactionsPage Component

