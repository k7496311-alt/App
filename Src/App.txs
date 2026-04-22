import React, { useEffect, useState } from 'react';
import { 
  LayoutDashboard, 
  Wallet, 
  TrendingUp, 
  Users, 
  LogOut, 
  ShieldCheck, 
  Menu, 
  X,
  CreditCard,
  History
} from 'lucide-react';
import { useAuth } from './contexts/AuthContext';
import { LandingPage } from './pages/LandingPage';
import { AuthPage } from './pages/AuthPage';
import { Dashboard } from './pages/Dashboard';
import { PlansPage } from './pages/PlansPage';
import { WalletPage } from './pages/WalletPage';
import { DepositPage } from './pages/DepositPage';
import { WithdrawPage } from './pages/WithdrawPage';
import { ReferralPage } from './pages/ReferralPage';
import { AdminPanel } from './pages/AdminPanel';
import { TransactionsPage } from './pages/TransactionsPage';
import { collection, query, where, getDocs, Timestamp, writeBatch, doc, increment } from 'firebase/firestore';
import { db } from './lib/firebase';
import { Investment } from './types';
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';

type View = 'dashboard' | 'plans' | 'deposit' | 'withdraw' | 'referral' | 'admin' | 'transactions';

export default function App() {
  const { state, logout } = useAuth();
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [showLanding, setShowLanding] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [adminClickCount, setAdminClickCount] = useState(0);
  const [isAdminLogin, setIsAdminLogin] = useState(false);

  const user = state.user;
  const userId = user?.id;

  const handleAdminTrigger = () => {
    if (user?.role === 'admin') {
      const newCount = adminClickCount + 1;
      setAdminClickCount(newCount);
      if (newCount >= 5) {
        setCurrentView('admin');
        setAdminClickCount(0);
        alert('Admin Panel Activated');
      }
    }
  };

  useEffect(() => {
    if (!userId) return;

    const checkProfits = async () => {
      try {
        const q = query(
          collection(db, 'investments'),
          where('userId', '==', userId),
          where('status', '==', 'active'),
          where('endTime', '<=', Timestamp.now())
        );

        const snapshot = await getDocs(q);
        if (snapshot.empty) return;

        const results = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Investment));
        const batch = writeBatch(db);
        let totalCredit = 0;

        for (const inv of results) {
          // 1. Mark completed
          batch.update(doc(db, 'investments', inv.id), { status: 'completed' });
          
          // 2. Original amount + profit
          totalCredit += (inv.amount + inv.profit);

          // 3. Log profit transaction
          const txRef = doc(collection(db, 'transactions'));
          batch.set(txRef, {
            userId: userId,
            type: 'profit',
            amount: inv.profit,
            time: Timestamp.now(),
            status: 'approved',
            description: `Auto-settlement: ${inv.planName}`
          });
        }

        // Apply total credit to user balance
        batch.update(doc(db, 'users', userId), { 
          balance: increment(totalCredit) 
        });

        await batch.commit();
        console.log(`Auto-settled ${results.length} investments for ${totalCredit}`);
      } catch (error) {
        console.error("Profit settlement error:", error);
      }
    };

    checkProfits();
    const interval = setInterval(checkProfits, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, [userId]);

  if (state.loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-neon-blue/20 border-t-neon-blue rounded-full animate-spin" />
      </div>
    );
  }

  if (!state.user) {
    if (showLanding) return <LandingPage onGetStarted={(isAdmin?: boolean) => {
      setShowLanding(false);
      setIsAdminLogin(isAdmin || false);
    }} />;
    return <AuthPage 
      isAdminMode={isAdminLogin} 
      onBack={() => {
        setShowLanding(true);
        setIsAdminLogin(false);
      }} 
    />;
  }

  const NavItem = ({ view, icon: Icon, label }: { view: View; icon: any; label: string }) => (
    <button
      onClick={() => {
        setCurrentView(view);
        setIsSidebarOpen(false);
      }}
      className={`w-full flex items-center px-6 py-4 rounded-xl transition-all ${
        currentView === view 
          ? 'text-white bg-white/5 border border-white/10' 
          : 'text-white/40 hover:text-white hover:bg-white/5'
      }`}
    >
      <Icon className="w-5 h-5 mr-4" />
      <span className="font-medium tracking-wide">{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-black text-white flex overflow-hidden">
      {/* Sidebar Mobile Toggle */}
      <button 
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="lg:hidden fixed top-6 right-6 z-50 p-2 glass-card rounded-xl"
      >
        {isSidebarOpen ? <X /> : <Menu />}
      </button>

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-40 w-72 glass-card rounded-none border-y-0 border-l-0
        transform transition-transform duration-300 lg:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-8">
          <div 
            onClick={handleAdminTrigger}
            className="flex items-center mb-8 cursor-pointer active:scale-95 transition-transform"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-accent-blue to-accent-purple rounded-lg mr-3 shadow-[0_0_15px_rgba(0,210,255,0.3)]" />
            <h1 className="text-xl font-extrabold tracking-tighter">NeoInvest <span className="gradient-text">AI</span></h1>
          </div>

          <div className="space-y-1 -mx-2">
            <NavItem view="dashboard" icon={LayoutDashboard} label="Dashboard" />
            <NavItem view="plans" icon={TrendingUp} label="Invest Plans" />
            <NavItem view="deposit" icon={ArrowDownLeft} label="Deposit" />
            <NavItem view="withdraw" icon={ArrowUpRight} label="Withdraw" />
            <NavItem view="transactions" icon={History} label="Transactions" />
            <NavItem view="referral" icon={Users} label="Referral" />
            {state.user.role === 'admin' && (
              <NavItem view="admin" icon={ShieldCheck} label="Admin Control" />
            )}
          </div>
        </div>

        <div className="absolute bottom-0 w-full p-8 space-y-4">
          <button
            onClick={() => logout()}
            className="w-full flex items-center px-6 py-4 text-red-400 hover:bg-red-400/10 rounded-xl transition-all"
          >
            <LogOut className="w-5 h-5 mr-4" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 h-screen overflow-y-auto bg-mesh relative p-6 lg:p-10">
        <div className="bg-blob -top-24 -right-24" />
        <div className="bg-blob -bottom-24 -left-24 opacity-50" />
        <div className="max-w-7xl mx-auto relative z-10">
          {currentView === 'dashboard' && <Dashboard />}
          {currentView === 'plans' && <PlansPage />}
          {currentView === 'deposit' && <DepositPage />}
          {currentView === 'withdraw' && <WithdrawPage />}
          {currentView === 'transactions' && <TransactionsPage />}
          {currentView === 'referral' && <ReferralPage />}
          {currentView === 'admin' && state.user.role === 'admin' && <AdminPanel />}
        </div>
      </main>
    </div>
  );
}
