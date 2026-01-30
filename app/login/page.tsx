'use client';
import { useState, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import { Phone, Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Check if the URL has ?view=signup
  const defaultToSignup = searchParams.get('view') === 'signup';

  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(defaultToSignup); // Initialize based on URL
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      if (isSignUp) {
        // Sign Up Logic
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${location.origin}/dashboard` }
        });
        
        if (error) throw error;

        // Check if we got a session immediately
        if (data.session) {
          router.push('/dashboard');
        } else {
          setMessage('✅ Check your email to confirm your account!');
        }

      } else {
        // Sign In Logic
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-md bg-white/95 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl overflow-hidden"
    >
      <div className="p-8 md:p-10">
        <Link href="/" className="inline-flex items-center text-slate-500 hover:text-blue-600 mb-8 transition text-sm font-medium group">
           <ArrowLeft size={16} className="mr-2 group-hover:-translate-x-1 transition-transform" /> Back to Home
        </Link>

        <div className="text-center mb-8">
           <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg shadow-blue-600/30">
             <Phone className="w-7 h-7 text-white" />
           </div>
           <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
             {isSignUp ? 'Join NessDial' : 'Welcome Back'}
           </h1>
           <p className="text-slate-500 mt-2 text-lg">
             {isSignUp ? 'Automate your admin in minutes.' : 'Sign in to your dashboard.'}
           </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Email Address</label>
            <input
              type="email"
              placeholder="you@business.com"
              required
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition font-medium text-slate-900" // Added text-slate-900
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
             <label className="block text-sm font-semibold text-slate-700 mb-2">Password</label>
            <input
              type="password"
              placeholder="••••••••"
              required
              minLength={6}
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition font-medium text-slate-900" // Added text-slate-900
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2 border border-red-100">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500" /> {error}
            </div>
          )}
          
          {message && (
            <div className="p-3 bg-green-50 text-green-700 text-sm rounded-lg flex items-center gap-2 border border-green-100">
              <CheckCircle2 size={16} /> {message}
            </div>
          )}

          <button 
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold text-lg hover:bg-blue-600 transition shadow-lg hover:shadow-blue-600/20 flex items-center justify-center transform active:scale-[0.98]"
          >
            {loading ? <Loader2 className="animate-spin" /> : (isSignUp ? 'Create Account' : 'Sign In')} {/* Removed Free */}
          </button>
        </form>

        <div className="mt-8 text-center pt-6 border-t border-slate-100">
          <button 
            onClick={() => { setIsSignUp(!isSignUp); setError(''); setMessage(''); }}
            className="text-slate-500 hover:text-slate-900 text-sm font-medium transition"
          >
            {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
          </button>
        </div>
      </div>
      
      {/* Bottom decorative bar */}
      <div className="h-2 w-full bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600"></div>
    </motion.div>
  );
}

export default function Login() {
  return (
    <main className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden bg-slate-900">
      {/* --- BACKGROUND EFFECTS --- */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10">
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-blue-600/30 rounded-full blur-3xl mix-blend-screen opacity-50 animate-pulse"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-purple-600/20 rounded-full blur-3xl mix-blend-screen opacity-50"></div>
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
      </div>

      <Suspense fallback={<div className="w-full max-w-md h-[600px] bg-white/10 rounded-3xl animate-pulse" />}>
        <LoginContent />
      </Suspense>
    </main>
  );
}