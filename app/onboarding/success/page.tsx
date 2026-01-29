'use client';
import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Loader2, CheckCircle2, Phone, ArrowRight, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';

// 1. The Logic Component (Handles the Search Params)
function SuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  
  const [status, setStatus] = useState('Verifying your payment...');
  const [purchasedNumber, setPurchasedNumber] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const runProvisioning = async () => {
      if (!sessionId) return;

      // 1. Get User
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
         setError("Please log in to finish setup.");
         setLoading(false);
         return;
      }

      // 2. Get their saved choices (Business Name & Voice)
      const { data: profile } = await supabase
        .from('profiles')
        .select('business_name, selected_voice')
        .eq('id', user.id)
        .single();

      if (!profile) {
        setError('Could not retrieve setup details.');
        setLoading(false);
        return;
      }

      setStatus('Securing your UK Mobile Number...');

      // 3. Call Provisioning API
      try {
        const res = await fetch('/api/provision-number', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            businessName: profile.business_name,
            voiceId: profile.selected_voice
          }),
        });

        const data = await res.json();
        
        if (data.success) {
          setPurchasedNumber(data.phoneNumber);
          setLoading(false);
          // Mark onboarding as complete in DB
          await supabase.from('profiles').update({ onboarding_complete: true }).eq('id', user.id);
          
          // Trigger Confetti Effect
          confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
        } else {
          setError(data.error || 'Provisioning failed.');
          setLoading(false);
        }

      } catch (err) {
        setError('Connection failed. Please contact support.');
        setLoading(false);
      }
    };

    // Run once on mount
    runProvisioning();
  }, [sessionId]);

  if (loading) {
    return (
      <div className="py-10">
        <div className="relative w-20 h-20 mx-auto mb-8">
          <div className="absolute inset-0 border-4 border-slate-100 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
          <Sparkles className="absolute inset-0 m-auto text-blue-600 animate-pulse" size={24} />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Setting Up Your AI...</h2>
        <p className="text-slate-500 animate-pulse font-medium">{status}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-6">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Phone className="w-10 h-10 text-red-600" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Something went wrong</h1>
        <p className="text-red-500 mb-8">{error}</p>
        <button onClick={() => window.location.reload()} className="text-blue-600 font-bold hover:underline">Try Again</button>
      </div>
    );
  }

  return (
    <div className="py-6">
      <motion.div 
        initial={{ scale: 0 }} 
        animate={{ scale: 1 }}
        transition={{ type: "spring" }} // FIXED: Moved 'type' inside transition prop
        className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6"
      >
        <CheckCircle2 className="w-10 h-10 text-green-600" />
      </motion.div>
      
      <h1 className="text-3xl font-bold text-slate-900 mb-2">You're Live!</h1>
      <p className="text-slate-500 mb-8">Your receptionist is active and ready.</p>

      <div className="bg-slate-50 rounded-2xl p-6 mb-8 border border-slate-200">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Your New Mobile Number</p>
        <p className="text-3xl font-mono font-bold text-slate-900 tracking-tight">{purchasedNumber}</p>
      </div>

      <button 
        onClick={() => router.push('/dashboard')}
        className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold text-lg hover:bg-blue-600 transition flex items-center justify-center gap-2 shadow-lg transform active:scale-[0.98]"
      >
        Go to Dashboard <ArrowRight size={18} />
      </button>
    </div>
  );
}

// 2. The Main Page Component (Wraps Logic in Suspense)
export default function SuccessPage() {
  return (
    <main className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md bg-white rounded-3xl p-10 text-center shadow-2xl overflow-hidden relative"
      >
        {/* Decorative Blur */}
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 to-purple-500"></div>

        {/* SUSPENSE BOUNDARY IS CRITICAL FOR BUILD */}
        <Suspense fallback={
          <div className="py-10">
             <Loader2 className="w-10 h-10 text-blue-600 animate-spin mx-auto" />
             <p className="text-slate-500 mt-4">Loading payment data...</p>
          </div>
        }>
          <SuccessContent />
        </Suspense>
        
      </motion.div>
    </main>
  );
}