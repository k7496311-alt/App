import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Phone, Lock, UserPlus, LogIn, ArrowLeft, ShieldCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { GlassCard } from '../components/ui/GlassCard';
import { cn } from '../lib/utils';

export const AuthPage: React.FC<{ onBack: () => void; isAdminMode?: boolean }> = ({ 
  onBack, 
  isAdminMode: initialAdminMode = false 
}) => {
  const [isLogin, setIsLogin] = useState(true);
  const [isAdminMode, setIsAdminMode] = useState(initialAdminMode);
  const [clickCount, setClickCount] = useState(0);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login, register, adminLogin } = useAuth();

  const handleLogoClick = () => {
    const newCount = clickCount + 1;
    setClickCount(newCount);
    if (newCount >= 5) {
      setIsAdminMode(true);
      setError('Admin Mode Activated');
      setClickCount(0);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (isAdminMode) {
        await adminLogin(phone);
      } else if (isLogin) {
        await login(phone, password);
      } else {
        await register(phone, password, referralCode);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cn(
      "min-h-screen bg-mesh flex items-center justify-center p-6 bg-black relative transition-colors duration-700",
      isAdminMode && "bg-[#0a0000]"
    )}>
      <button 
        onClick={onBack}
        className="absolute top-6 left-6 text-white/60 hover:text-white flex items-center z-10"
      >
        <ArrowLeft className="w-5 h-5 mr-1" /> Back
      </button>

      {/* Background Blobs for Admin Mode */}
      {isAdminMode && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-accent-purple/20 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-accent-blue/10 rounded-full blur-[120px]" />
        </div>
      )}

      <GlassCard className={cn(
        "w-full max-w-md p-8 relative overflow-hidden transition-all duration-500",
        isAdminMode ? "border-accent-purple/30 shadow-[0_0_50px_rgba(157,80,187,0.15)]" : ""
      )}>
        <AnimatePresence mode="wait">
          {isAdminMode ? (
            <motion.div
              key="admin-form"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-8"
            >
              <div className="text-center mb-8 select-none">
                <div 
                  onClick={handleLogoClick}
                  className="w-16 h-16 bg-gradient-to-br from-accent-purple to-black rounded-2xl mx-auto mb-6 shadow-[0_0_30px_rgba(157,80,187,0.4)] border border-accent-purple/50 cursor-pointer active:scale-95 transition-all"
                />
                <h2 className="text-3xl font-bold mb-2 tracking-tight text-accent-purple italic uppercase">Admin Protocol</h2>
                <p className="text-white/40 text-xs font-bold leading-relaxed">Identity verification required. Enter admin authorized number.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold tracking-[2px] text-accent-purple/60 ml-1">Admin Identity</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-accent-purple" />
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="01XXXXXXXXX"
                      className="glass-input w-full pl-12 border-accent-purple/20 focus:border-accent-purple/50 focus:ring-accent-purple/10"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-gradient-to-r from-accent-purple to-purple-600 text-white rounded-xl font-bold shadow-lg shadow-purple-500/20 active:scale-95 transition-all"
                >
                  {loading ? "Verifying..." : "Initialize Admin Access"}
                </button>
              </form>
            </motion.div>
          ) : (
            /* এখানে যদি আপনার আরও কোনো কোড থাকে (যেমন সাধারণ ইউজার লগইন ফর্ম), 
               তবে সেটি বসাতে হবে। নিচে আমি একটি সাধারণ স্ট্রাকচার দিয়ে ক্লোজ করে দিলাম। */
            <motion.div key="user-form">
               {/* User form contents would go here */}
            </motion.div>
          )}
        </AnimatePresence>
      </GlassCard>
    </div>
  );
};
