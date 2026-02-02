'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, Phone, Copy, CheckCircle, Smartphone, 
  Clock, AlertCircle, Loader2, PhoneForwarded
} from 'lucide-react';

export default function SetupGuidePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [device, setDevice] = useState<'iphone' | 'android'>('iphone');
  const [aiNumber, setAiNumber] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Fetch the AI Number from Database
  useEffect(() => {
    const fetchNumber = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push('/login'); return; }

        const { data: assistant } = await supabase
          .from('assistants')
          .select('twilio_phone_number')
          .eq('user_id', user.id)
          .single();

        if (assistant?.twilio_phone_number) {
            setAiNumber(assistant.twilio_phone_number);
        }
      } catch (error) {
        console.error("Error fetching number:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchNumber();
  }, [router]);

  // Helper to copy text
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  // --- GSM CODES ---
  // Code A: *004* (The "Magic" Link - Busy, Unreachable, Decline)
  const activationCode = aiNumber ? `*004*${aiNumber}#` : "Loading...";
  
  // Code B: **61* (The Timeout Rule - Sets ring time to 15s)
  // *11*15# sets the delay to 15 seconds
  const timeoutCode = aiNumber ? `**61*${aiNumber}*11*15#` : "Loading...";

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center bg-[#020617]">
      <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 font-sans pb-20 selection:bg-blue-500/30">
      
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#020617]/90 backdrop-blur-md border-b border-slate-800 px-4 pt-4 pb-2">
        <div className="max-w-xl mx-auto flex items-center gap-4 mb-4">
            <button 
                onClick={() => router.back()} 
                className="p-2 -ml-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
                <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-xl font-bold text-white">Connect Your AI</h1>
        </div>

        {/* Device Switcher */}
        <div className="max-w-xl mx-auto flex p-1 bg-slate-900 rounded-xl border border-slate-800">
            <button 
                onClick={() => setDevice('iphone')}
                className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
                device === 'iphone' ? 'bg-slate-800 text-white shadow-sm ring-1 ring-white/10' : 'text-slate-500 hover:text-slate-300'
                }`}
            >
                {device === 'iphone' && <span className="text-blue-400"></span>} iPhone
            </button>
            <button 
                onClick={() => setDevice('android')}
                className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
                device === 'android' ? 'bg-slate-800 text-white shadow-sm ring-1 ring-white/10' : 'text-slate-500 hover:text-slate-300'
                }`}
            >
                {device === 'android' && <Smartphone className="h-3 w-3 text-green-400" />} Android
            </button>
        </div>
      </div>

      <main className="max-w-xl mx-auto px-4 py-6 space-y-8">

        {/* --- STEP 1: THE MAGIC LINK --- */}
        <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-3 mb-3">
                <div className="h-8 w-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-blue-900/20">1</div>
                <h2 className="text-lg font-bold text-white">Enable "Decline to AI"</h2>
            </div>
            
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-3 opacity-10">
                    <PhoneForwarded className="h-24 w-24 text-blue-500" />
                </div>

                <p className="text-sm text-slate-400 mb-4 relative z-10">
                    This code links your phone to the AI. When you <strong>Decline</strong> a call, or if your phone is <strong>Dead/Unreachable</strong>, the AI will pick up instantly.
                </p>

                {/* Code Box */}
                <div 
                    onClick={() => handleCopy(activationCode, 'activate')}
                    className="relative z-10 group cursor-pointer bg-slate-950 border border-slate-800 hover:border-blue-500/50 rounded-xl p-4 flex items-center justify-between transition-all active:scale-[0.98]"
                >
                    <div className="flex flex-col">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Dial this code</span>
                        <code className="text-lg sm:text-xl font-mono font-bold text-white tracking-widest break-all">
                            {activationCode}
                        </code>
                    </div>
                    <div className={`p-2.5 rounded-xl transition-all duration-300 ${copiedCode === 'activate' ? 'bg-green-500 text-white scale-110' : 'bg-slate-800 text-slate-400 group-hover:text-white'}`}>
                        {copiedCode === 'activate' ? <CheckCircle className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
                    </div>
                </div>
                <p className="text-xs text-center text-slate-600 mt-2">Tap box to copy • Paste into Keypad • Press Call</p>
            </div>
        </section>

        {/* --- STEP 2: THE TIMEOUT RULE (15s) --- */}
        <section className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
            <div className="flex items-center gap-3 mb-3">
                <div className="h-8 w-8 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-purple-900/20">2</div>
                <h2 className="text-lg font-bold text-white">Set 15 Second Timeout</h2>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-3 opacity-10">
                    <Clock className="h-24 w-24 text-purple-500" />
                </div>

                <p className="text-sm text-slate-400 mb-4 relative z-10">
                    By default, your phone might ring for too long. This code forces the AI to answer if you don't pick up within <strong>15 seconds</strong>.
                </p>

                {/* Code Box */}
                <div 
                    onClick={() => handleCopy(timeoutCode, 'timeout')}
                    className="relative z-10 group cursor-pointer bg-slate-950 border border-slate-800 hover:border-purple-500/50 rounded-xl p-4 flex items-center justify-between transition-all active:scale-[0.98]"
                >
                    <div className="flex flex-col">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Dial this code</span>
                        <code className="text-lg sm:text-xl font-mono font-bold text-white tracking-widest break-all">
                            {timeoutCode}
                        </code>
                    </div>
                    <div className={`p-2.5 rounded-xl transition-all duration-300 ${copiedCode === 'timeout' ? 'bg-green-500 text-white scale-110' : 'bg-slate-800 text-slate-400 group-hover:text-white'}`}>
                        {copiedCode === 'timeout' ? <CheckCircle className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
                    </div>
                </div>
                <p className="text-xs text-center text-slate-600 mt-2">Tap box to copy • Paste into Keypad • Press Call</p>
            </div>
        </section>

        {/* --- STEP 3: TESTING --- */}
        <section className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
            <div className="bg-green-500/10 border border-green-500/20 p-6 rounded-2xl text-center">
                <h3 className="text-green-400 font-bold text-lg mb-2">Final Test</h3>
                <p className="text-sm text-green-200/70 mb-4 leading-relaxed">
                    Call your mobile from another phone. <br/>
                    <strong>1.</strong> Hit 'Decline' – NessDial should answer immediately.<br/>
                    <strong>2.</strong> Let it ring – NessDial should answer in 15s.
                </p>
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/20 text-green-400 rounded-lg text-xs font-bold uppercase tracking-wide">
                    <CheckCircle className="h-4 w-4" /> System Ready
                </div>
            </div>
        </section>

        {/* --- TROUBLESHOOTING --- */}
        <div className="pt-4 border-t border-slate-800">
            <button className="flex items-center gap-2 text-slate-500 hover:text-slate-300 text-sm mx-auto transition-colors">
                <AlertCircle className="h-4 w-4" />
                <span>Codes not working?</span>
            </button>
            <p className="text-xs text-slate-600 text-center mt-2 max-w-xs mx-auto">
                Some carriers (like Sky Mobile or MVNOs) block these codes. 
                {device === 'iphone' ? ' Go to Settings > Phone > Call Forwarding.' : ' Go to Phone App > Settings > Calling Accounts.'}
            </p>
        </div>

      </main>
    </div>
  );
}