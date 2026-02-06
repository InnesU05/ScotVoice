'use client';
import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Loader2, CheckCircle2, Phone, ArrowRight, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';

// 1. The Logic Component
function SuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [status, setStatus] = useState('Waiting for automation...');
  const [purchasedNumber, setPurchasedNumber] = useState('');
  const [loading, setLoading] = useState(true);
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    const checkProvisioning = async () => {
      // 1. Get User
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return; // Wait for auth

      // 2. Check for the Agent Number in DB
      const { data: agent } = await supabase
        .from('agents')
        .select('twilio_phone_number')
        .eq('user_id', user.id)
        .single();

      if (agent?.twilio_phone_number) {
        // SUCCESS! Found the number
        setPurchasedNumber(agent.twilio_phone_number);
        setLoading(false);
        setStatus('Ready!');
        
        // Mark onboarding complete
        await supabase.from('profiles').update({ onboarding_complete: true }).eq('id', user.id);
        
        // Party time
        confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
        clearInterval(intervalId); // Stop checking
      } else {
        // Still waiting... update status text occasionally
        setAttempts(prev => prev + 1);
        setStatus(prev => prev === 'Securing your UK Mobile Number...' ? 'Finalizing setup...' : 'Securing your UK Mobile Number...');
      }
    };

    // Run immediately, then every 3 seconds
    checkProvisioning();
    intervalId = setInterval(checkProvisioning, 3000);

    // Stop after 60 seconds (20 checks) to prevent infinite loops
    const timeoutId = setTimeout(() => {
      clearInterval(intervalId);
      if (loading) {
         // Even if it times out, we let them go to dashboard to check there
         setLoading(false); 
      }
    }, 60000);

    return () => {
      clearInterval(intervalId);
      clearTimeout(timeoutId);
    };
  }, []);

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
        {attempts > 5 && <p className="text-xs text-slate-400 mt-4">This usually takes about 10-15 seconds...</p>}
      </div>
    );
  }

  // If we finished (or timed out but want to show dashboard link anyway)
  return (
    <div className="py-6">
      <motion.div 
        initial={{ scale: 0 }} 
        animate={{ scale: 1 }}
        transition={{ type: "spring" }} 
        className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6"
      >
        <CheckCircle2 className="w-10 h-10 text-green-600" />
      </motion.div>
      
      <h1 className="text-3xl font-bold text-slate-900 mb-2">You're Live!</h1>
      <p className="text-slate-500 mb-8">Your receptionist is active and ready.</p>

      {purchasedNumber ? (
        <div className="bg-slate-50 rounded-2xl p-6 mb-8 border border-slate-200">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Your New Mobile Number</p>
          <p className="text-3xl font-mono font-bold text-slate-900 tracking-tight">{purchasedNumber}</p>
        </div>
      ) : (
        <div className="bg-yellow-50 rounded-2xl p-6 mb-8 border border-yellow-200">
           <p className="text-yellow-700 font-medium">Setup is taking a little longer than usual, but it's running in the background.</p>
        </div>
      )}

      <button 
        onClick={() => router.push('/dashboard')}
        className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold text-lg hover:bg-blue-600 transition flex items-center justify-center gap-2 shadow-lg transform active:scale-[0.98]"
      >
        Go to Dashboard <ArrowRight size={18} />
      </button>
    </div>
  );
}

// 2. The Main Page Component
export default function SuccessPage() {
  return (
    <main className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md bg-white rounded-3xl p-10 text-center shadow-2xl overflow-hidden relative"
      >
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 to-purple-500"></div>
        <Suspense fallback={
          <div className="py-10">
             <Loader2 className="w-10 h-10 text-blue-600 animate-spin mx-auto" />
             <p className="text-slate-500 mt-4">Checking setup status...</p>
          </div>
        }>
          <SuccessContent />
        </Suspense>
      </motion.div>
    </main>
  );
}