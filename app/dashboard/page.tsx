'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';
import { 
  Phone, LogOut, Loader2, Briefcase, UserCircle2, 
  Dumbbell, CheckCircle2, AlertCircle, Play, Mic 
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [provisioning, setProvisioning] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState<'tradie' | 'pro' | 'coach'>('tradie');
  const [myNumber, setMyNumber] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState('');

  // 1. Auth & Data Fetching
  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }
      setUser(user);

      const { data: assistant } = await supabase
        .from('assistants')
        .select('twilio_phone_number')
        .eq('user_id', user.id)
        .single();

      if (assistant) setMyNumber(assistant.twilio_phone_number);
      setLoading(false);
    };
    checkUser();
  }, [router]);

  // 2. Logic
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const handleProvision = async () => {
    if (!user) return;
    setProvisioning(true);
    setStatusMessage('Connecting to Twilio & Vapi...');
    
    try {
      const res = await fetch('/api/provision-number', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            userId: user.id, 
            businessName: user.email?.split('@')[0] || 'My Business',
            voiceId: selectedVoice
        }),
      });

      const data = await res.json();
      if (data.success) {
        setMyNumber(data.phoneNumber);
        setStatusMessage('');
      } else {
        setStatusMessage(`Error: ${data.error}`);
      }
    } catch (err) {
      setStatusMessage('Connection failed.');
    }
    setProvisioning(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <Loader2 className="animate-spin text-blue-500 w-10 h-10" />
      </div>
    );
  }

  // --- UI RENDER ---
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
        
        {/* --- STATE 1: ACTIVE DASHBOARD --- */}
        {myNumber ? (
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
        ) : (
          /* --- STATE 2: SETUP WIZARD --- */
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="text-center mb-10">
              <h1 className="text-3xl font-bold text-slate-900">Let's set up your AI</h1>
              <p className="text-slate-500 mt-2">Choose your receptionist persona to get started.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {/* Card: Tradie */}
              <button 
                onClick={() => setSelectedVoice('tradie')}
                className={`relative group overflow-hidden rounded-3xl p-6 text-left transition-all duration-300 border-2 ${selectedVoice === 'tradie' ? 'border-blue-600 shadow-xl bg-white scale-105 z-10' : 'border-white bg-white hover:border-blue-200 shadow-sm opacity-70 hover:opacity-100'}`}
              >
                 <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-colors ${selectedVoice === 'tradie' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                   <Briefcase size={24} />
                 </div>
                 <h3 className="text-xl font-bold text-slate-900 mb-1">Rab</h3>
                 <p className="text-sm font-semibold text-blue-600 mb-4">The Tradie</p>
                 <p className="text-sm text-slate-500 leading-relaxed">Direct, deep voice. Perfect for plumbers, builders, and roofers. Uses "Pal" and "No bother".</p>
                 {selectedVoice === 'tradie' && <div className="absolute top-4 right-4 text-blue-600"><CheckCircle2 /></div>}
              </button>

              {/* Card: Pro */}
              <button 
                onClick={() => setSelectedVoice('pro')}
                className={`relative group overflow-hidden rounded-3xl p-6 text-left transition-all duration-300 border-2 ${selectedVoice === 'pro' ? 'border-purple-600 shadow-xl bg-white scale-105 z-10' : 'border-white bg-white hover:border-purple-200 shadow-sm opacity-70 hover:opacity-100'}`}
              >
                 <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-colors ${selectedVoice === 'pro' ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                   <UserCircle2 size={24} />
                 </div>
                 <h3 className="text-xl font-bold text-slate-900 mb-1">Claire</h3>
                 <p className="text-sm font-semibold text-purple-600 mb-4">The Professional</p>
                 <p className="text-sm text-slate-500 leading-relaxed">Soft, polished, educated accent. Ideal for clinics, law firms, and salons.</p>
                 {selectedVoice === 'pro' && <div className="absolute top-4 right-4 text-purple-600"><CheckCircle2 /></div>}
              </button>

              {/* Card: Coach */}
              <button 
                onClick={() => setSelectedVoice('coach')}
                className={`relative group overflow-hidden rounded-3xl p-6 text-left transition-all duration-300 border-2 ${selectedVoice === 'coach' ? 'border-teal-500 shadow-xl bg-white scale-105 z-10' : 'border-white bg-white hover:border-teal-200 shadow-sm opacity-70 hover:opacity-100'}`}
              >
                 <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-colors ${selectedVoice === 'coach' ? 'bg-teal-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                   <Dumbbell size={24} />
                 </div>
                 <h3 className="text-xl font-bold text-slate-900 mb-1">Calum</h3>
                 <p className="text-sm font-semibold text-teal-600 mb-4">The Coach</p>
                 <p className="text-sm text-slate-500 leading-relaxed">High energy, upbeat, and fast. Great for gyms, PTs, and dog walkers.</p>
                 {selectedVoice === 'coach' && <div className="absolute top-4 right-4 text-teal-500"><CheckCircle2 /></div>}
              </button>
            </div>

            {/* Action Bar */}
            <div className="bg-white p-8 rounded-3xl shadow-lg border border-slate-100">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Ready to Activate?</h3>
                  <p className="text-slate-500 text-sm">We'll use your Developer Credits to buy a UK Mobile Number.</p>
                  {statusMessage && (
                    <p className={`text-sm font-medium mt-2 ${statusMessage.includes('Error') ? 'text-red-600' : 'text-blue-600'}`}>
                      {statusMessage}
                    </p>
                  )}
                </div>

                <button 
                  onClick={handleProvision}
                  disabled={provisioning}
                  className="w-full md:w-auto px-8 py-4 bg-slate-900 text-white rounded-xl font-bold text-lg hover:bg-blue-600 transition shadow-xl hover:shadow-blue-600/20 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed min-w-[200px]"
                >
                  {provisioning ? <Loader2 className="animate-spin" /> : <><Phone size={20} /> Get Number</>}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </main>
  );
}