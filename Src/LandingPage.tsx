import React from 'react';
import { motion } from 'motion/react';
import { TrendingUp, Shield, Zap, Banknote } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { GlassCard } from '../components/ui/GlassCard';

export const LandingPage: React.FC<{ onGetStarted: (isAdmin?: boolean) => void }> = ({ onGetStarted }) => {
  const [clickCount, setClickCount] = React.useState(0);
  
  const handleLogoClick = () => {
    const newCount = clickCount + 1;
    setClickCount(newCount);
    if (newCount >= 5) {
      alert('Admin Shield Activated. Please enter the portal.');
      onGetStarted(true);
      setClickCount(0);
    }
  };

  return (
    <div className="min-h-screen bg-mesh flex flex-col items-center justify-center p-6 bg-black">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <div 
          onClick={handleLogoClick}
          className="flex items-center justify-center mb-4 cursor-pointer active:scale-95 transition-all"
        >
          <Zap className="w-12 h-12 text-accent-blue mr-2" />
          <h1 className="text-5xl font-bold tracking-tight">
            NeoInvest <span className="gradient-text">AI</span>
          </h1>
        </div>
        <p className="text-white/60 text-lg max-w-md mx-auto">
          The future of decentralized growth is here. Maximize your digital assets with AI-driven strategies.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl w-full mb-12">
        <GlassCard className="p-6 text-center">
          <TrendingUp className="w-10 h-10 text-accent-blue mx-auto mb-4" />
          <h3 className="text-xl font-bold mb-2">High ROI</h3>
          <p className="text-white/50 text-sm">Experience industry-leading returns with our automated intelligence.</p>
        </GlassCard>
        
        <GlassCard className="p-6 text-center">
          <Shield className="w-10 h-10 text-accent-purple mx-auto mb-4" />
          <h3 className="text-xl font-bold mb-2">Secure</h3>
          <p className="text-white/50 text-sm">Advanced encryption and secure protocols to protect your capital.</p>
        </GlassCard>
        
        <GlassCard className="p-6 text-center">
          <Banknote className="w-10 h-10 text-accent-blue mx-auto mb-4" />
          <h3 className="text-xl font-bold mb-2">Quick Withdraw</h3>
          <p className="text-white/50 text-sm">Get access to your profits within hours of request approval.</p>
        </GlassCard>
      </div>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => onGetStarted(false)}
        className="btn-primary text-xl px-12 py-4"
      >
        Enter Portal
      </motion.button>
    </div>
  );
};
