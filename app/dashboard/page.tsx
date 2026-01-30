'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';
import { Phone, LogOut, Loader2, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [myNumber, setMyNumber] = useState<string | null>(null);

  // 1. Auth & Data Fetching
  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }
      setUser(user);

      // Check if they already have a number
      const { data: assistant } = await supabase
        .from('assistants')
        .select('twilio_phone_number')
        .eq('user_id', user.id)
        .single();

      if (assistant) {
        setMyNumber(assistant.twilio_phone_number);
        setLoading(false);
      } else {
        // CRITICAL: If no number, force them to the Onboarding Wizard
        // This ensures they use the nice UI with play buttons
        router.push('/onboarding');
      }
    };
    checkUser();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <Loader2 className="animate-spin text-blue-500 w-10 h-10" />
      </div>
    );
  }

  // --- UI RENDER (Only shows if they have a number) ---
  return (
    <main className="min-h-screen bg-slate-50">
      {/* Top Navigation */}
      <nav className="bg-slate-900 text-white border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
             <div className="flex items-center gap-3">
               <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                 <Phone className="w-4 h-4 text-white" />
               </div>
               <span className="font-bold text-xl tracking-tight">NessDial</span>
             </div>
             <div className="flex items-center gap-6">
               <span className="hidden md:block text-slate-400 text-sm">{user?.email}</span>
               <button onClick={handleLogout} className="flex items-center gap-2 text-white hover:text-blue-400 transition text-sm font-medium">
                 <LogOut size={16} /> <span className="hidden sm:inline">Sign Out</span>
               </button>
             </div>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto p-4 md:p-8">
        {/* --- ACTIVE DASHBOARD --- */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100"
        >
          {/* Header Status */}
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-8 text-white text-center">
            <div className="w-20 h-20 bg-white/20 backdrop-blur rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
              <CheckCircle2 className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-3xl font-bold mb-2">System Active</h2>
            <p className="text-green-50 opacity-90">Your AI Receptionist is online and listening.</p>
          </div>

          <div className="p-8 md:p-12 text-center">
            <p className="text-slate-500 font-bold uppercase tracking-wider text-xs mb-4">Your Dedicated Number</p>
            <div className="inline-block bg-slate-900 text-white text-4xl md:text-5xl font-mono font-bold px-8 py-6 rounded-2xl shadow-lg mb-8 tracking-tight">
              {myNumber}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <h3 className="font-bold text-slate-900 mb-1">Missed Calls</h3>
                <p className="text-sm text-slate-500">Redirect your mobile's missed calls to this number.</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <h3 className="font-bold text-slate-900 mb-1">Test It Now</h3>
                <p className="text-sm text-slate-500">Call the number from your phone to hear your AI.</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </main>
  );
}