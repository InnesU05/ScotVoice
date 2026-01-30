'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  Briefcase, UserCircle2, Dumbbell, CheckCircle2, 
  ArrowRight, Store, Loader2, Play, Pause, ShieldCheck, AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- CONFIG: Voice Data ---
const VOICES = [
  {
    id: 'tradie',
    name: 'Rab',
    label: 'The Tradie',
    desc: 'Direct, deep, friendly. Perfect for trades.',
    icon: <Briefcase className="w-5 h-5" />,
    audioSrc: '/audio/rab.mp3' 
  },
  {
    id: 'pro',
    name: 'Claire',
    label: 'The Professional',
    desc: 'Soft, polished, educated. Ideal for clinics.',
    icon: <UserCircle2 className="w-5 h-5" />,
    audioSrc: '/audio/claire.mp3'
  },
  {
    id: 'coach',
    name: 'Calum',
    label: 'The Coach',
    desc: 'High energy, fast, upbeat. Great for PTs.',
    icon: <Dumbbell className="w-5 h-5" />,
    audioSrc: '/audio/calum.mp3'
  }
];

export default function Onboarding() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Form State
  const [businessName, setBusinessName] = useState('');
  const [selectedVoice, setSelectedVoice] = useState('tradie');
  
  // Audio State
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // 1. Auth Check
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.push('/login');
      setUser(data.user);
    });
  }, []);

  // 2. Audio Logic
  const toggleAudio = (voiceId: string, src: string) => {
    if (playingVoice === voiceId) {
      audioRef.current?.pause();
      setPlayingVoice(null);
    } else {
      if (audioRef.current) audioRef.current.pause();
      audioRef.current = new Audio(src);
      audioRef.current.play();
      setPlayingVoice(voiceId);
      audioRef.current.onended = () => setPlayingVoice(null);
    }
  };

  // Helper to get active styles (Fixes Tailwind Purge Issue)
  const getCardStyle = (id: string, isSelected: boolean) => {
    const base = "relative w-full p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 group";
    if (!isSelected) return `${base} border-slate-100 hover:border-slate-300 hover:bg-slate-50`;
    
    switch (id) {
      case 'tradie': return `${base} border-blue-500 bg-blue-50 ring-1 ring-blue-500 shadow-md`;
      case 'pro': return `${base} border-purple-500 bg-purple-50 ring-1 ring-purple-500 shadow-md`;
      case 'coach': return `${base} border-teal-500 bg-teal-50 ring-1 ring-teal-500 shadow-md`;
      default: return base;
    }
  };

  const getIconStyle = (id: string, isSelected: boolean) => {
    const base = "w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-colors";
    if (!isSelected) return `${base} bg-slate-200 text-slate-400`;
    
    switch (id) {
      case 'tradie': return `${base} bg-blue-600 text-white`;
      case 'pro': return `${base} bg-purple-600 text-white`;
      case 'coach': return `${base} bg-teal-600 text-white`;
      default: return base;
    }
  };

  const getCheckColor = (id: string) => {
    switch (id) {
      case 'tradie': return "text-blue-600";
      case 'pro': return "text-purple-600";
      case 'coach': return "text-teal-600";
      default: return "text-blue-600";
    }
  };

  // 3. Checkout Logic (Refined)
  const handleCheckout = async () => {
    if (!user?.id) {
      setErrorMsg("User session not found. Please log in again.");
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          email: user.email,
          voiceId: selectedVoice,
          businessName: businessName
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        // Display the SPECIFIC database error to help debugging
        throw new Error(data.error || 'Checkout initialization failed');
      }

      if (data.url) {
        window.location.href = data.url; 
      } else {
        throw new Error('No checkout URL received from Stripe');
      }

    } catch (err: any) {
      console.error('Checkout Error:', err);
      setErrorMsg(err.message || 'Payment system busy. Try again.');
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 selection:bg-blue-500 selection:text-white">
      
      {/* Header / Logo */}
      <div className="absolute top-6 left-6 md:top-8 md:left-8 flex items-center gap-2 opacity-50">
        <div className="w-6 h-6 bg-white/20 rounded-md"></div>
        <span className="font-bold text-white tracking-tight">NessDial</span>
      </div>

      {/* Progress Indicator */}
      <div className="w-full max-w-lg mb-6 md:mb-8 mt-12 md:mt-0">
        <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 px-1">
          <span className={step >= 1 ? 'text-blue-400' : ''}>1. Details</span>
          <span className={step >= 2 ? 'text-blue-400' : ''}>2. Voice</span>
          <span className={step >= 3 ? 'text-blue-400' : ''}>3. Payment</span>
        </div>
        <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
          <motion.div 
            className="h-full bg-blue-500"
            initial={{ width: '0%' }}
            animate={{ width: step === 1 ? '33%' : step === 2 ? '66%' : '100%' }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
          />
        </div>
      </div>

      <motion.div 
        layout
        className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 relative"
      >
        <AnimatePresence mode="wait">
          
          {/* --- STEP 1: BUSINESS DETAILS --- */}
          {step === 1 && (
            <motion.div 
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-6 md:p-10"
            >
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mb-6">
                <Store size={24} />
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2">Let's get started.</h1>
              <p className="text-slate-500 mb-8 text-base md:text-lg">What is your business called? We use this to introduce you to callers.</p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Business Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Davie's Plumbing"
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none transition font-medium text-lg text-slate-900 placeholder:text-slate-300"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    autoFocus
                  />
                </div>
              </div>

              <button 
                onClick={() => businessName && setStep(2)}
                disabled={!businessName}
                className="mt-10 w-full py-4 bg-slate-900 text-white rounded-xl font-bold text-lg hover:bg-blue-600 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-blue-600/20"
              >
                Continue <ArrowRight size={18} />
              </button>
            </motion.div>
          )}

          {/* --- STEP 2: VOICE SELECTION --- */}
          {step === 2 && (
            <motion.div 
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-6 md:p-10"
            >
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-900 mb-2">Pick your Receptionist</h1>
                
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 flex gap-2 items-start mt-2">
                  <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                  <p className="text-blue-900 text-sm font-medium leading-tight">
                    You can <span className="font-bold underline">swap voices instantly</span> in your dashboard anytime.
                  </p>
                </div>
              </div>
              
              <div className="space-y-3">
                {VOICES.map((voice) => (
                  <div 
                    key={voice.id}
                    onClick={() => setSelectedVoice(voice.id)}
                    // FIXED: Using helper function for classes
                    className={getCardStyle(voice.id, selectedVoice === voice.id)}
                  >
                    <div className="flex items-start gap-4">
                      {/* Icon */}
                      <div className={getIconStyle(voice.id, selectedVoice === voice.id)}>
                        {voice.icon}
                      </div>

                      {/* Text */}
                      <div className="flex-1">
                        <div className="flex justify-between items-center mb-1">
                           <h3 className={`font-bold text-lg ${selectedVoice === voice.id ? 'text-slate-900' : 'text-slate-700'}`}>
                             {voice.name}
                           </h3>
                           {selectedVoice === voice.id && (
                             <CheckCircle2 className={`w-5 h-5 ${getCheckColor(voice.id)}`} />
                           )}
                        </div>
                        <p className="text-sm text-slate-500 leading-snug mb-3">{voice.desc}</p>
                        
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleAudio(voice.id, voice.audioSrc);
                          }}
                          className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wide px-3 py-2 rounded-lg transition
                            ${playingVoice === voice.id 
                              ? 'bg-red-100 text-red-600 hover:bg-red-200' 
                              : 'bg-white border border-slate-200 text-slate-600 hover:border-blue-400 hover:text-blue-600 shadow-sm'
                            }`}
                        >
                          {playingVoice === voice.id ? (
                            <><Pause size={12} className="fill-current animate-pulse" /> Stop</>
                          ) : (
                            <><Play size={12} className="fill-current" /> Hear Voice</>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Error Message Display */}
              {errorMsg && (
                <div className="mt-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2 animate-pulse border border-red-200">
                  <AlertCircle size={16} /> 
                  <span className="font-medium">Error: {errorMsg}</span>
                </div>
              )}

              {/* Trust Footer */}
              <div className="mt-8 pt-6 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-400 justify-center">
                 <ShieldCheck size={14} />
                 <span>Your number is reserved instantly after payment.</span>
              </div>

              <div className="mt-6 flex gap-3">
                <button 
                  onClick={() => setStep(1)} 
                  className="px-6 py-4 rounded-xl font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition"
                  disabled={loading}
                >
                  Back
                </button>
                <button 
                  onClick={handleCheckout}
                  disabled={loading}
                  className="flex-1 py-4 bg-slate-900 text-white rounded-xl font-bold text-lg hover:bg-blue-600 transition flex items-center justify-center gap-2 shadow-lg hover:shadow-blue-600/20 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {loading ? <Loader2 className="animate-spin" /> : 'Proceed to Checkout'}
                </button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </motion.div>
    </main>
  );
}