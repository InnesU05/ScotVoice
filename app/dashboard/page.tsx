'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';
import { Loader2, Phone, LogOut } from 'lucide-react';

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('');
  const [purchasedNumber, setPurchasedNumber] = useState('');

  // 1. Check if user is already logged in on load
  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    checkUser();
  }, []);

  // 2. Handle Login / Signup
  const handleAuth = async (type: 'login' | 'signup') => {
    setLoading(true);
    setStatus('');
    
    const { error } = type === 'login' 
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password });

    if (error) {
      setStatus(`❌ Error: ${error.message}`);
    } else {
      setStatus(type === 'signup' ? '✅ Check your email for the confirmation link!' : '✅ Logged in!');
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  // 3. The Core Feature: Buy Number
  const handleProvision = async () => {
    if (!user) return;
    setLoading(true);
    setStatus('🔍 Searching for the best UK mobile number...');
    
    try {
      const res = await fetch('/api/provision-number', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            userId: user.id, 
            businessName: 'ScotVoice Demo' 
        }),
      });

      const data = await res.json();
      if (data.success) {
        setStatus(`✅ Success! We bought ${data.phoneNumber} and linked it to Vapi!`);
        setPurchasedNumber(data.phoneNumber);
      } else {
        setStatus(`❌ Error: ${data.error}`);
      }
    } catch (err) {
      setStatus('Failed to connect to server');
    }
    setLoading(false);
  };

  // --- RENDER ---

  // A. Public View (Login)
  if (!user) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-md p-8 bg-white rounded-xl shadow-lg border border-gray-200">
          <h1 className="text-2xl font-bold mb-6 text-center text-blue-900">ScotVoice Admin</h1>
          <div className="space-y-4">
            <input
              type="email"
              placeholder="Email"
              className="w-full p-3 border rounded-lg"
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              type="password"
              placeholder="Password"
              className="w-full p-3 border rounded-lg"
              onChange={(e) => setPassword(e.target.value)}
            />
            <div className="flex gap-2">
              <button 
                onClick={() => handleAuth('login')}
                className="flex-1 bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700 font-medium"
                disabled={loading}
              >
                Login
              </button>
              <button 
                onClick={() => handleAuth('signup')}
                className="flex-1 bg-gray-100 text-gray-800 p-3 rounded-lg hover:bg-gray-200 font-medium"
                disabled={loading}
              >
                Sign Up
              </button>
            </div>
            {status && <p className="text-sm text-center mt-4 text-red-600">{status}</p>}
          </div>
        </div>
      </main>
    );
  }

  // B. Private View (Dashboard)
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-white">
      <div className="absolute top-4 right-4">
        <button onClick={handleLogout} className="flex items-center gap-2 text-gray-500 hover:text-black">
          <LogOut size={16} /> Logout
        </button>
      </div>

      <div className="text-center space-y-6 max-w-2xl">
        <div className="inline-block p-4 bg-blue-50 rounded-full mb-4">
          <Phone className="w-12 h-12 text-blue-600" />
        </div>
        
        <h1 className="text-4xl font-bold text-gray-900">Your AI Receptionist</h1>
        <p className="text-xl text-gray-600">
          Welcome, <span className="font-semibold">{user.email}</span>.
        </p>

        {!purchasedNumber ? (
          <div className="mt-8 p-8 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50">
            <p className="mb-6 text-gray-500">You don't have a number yet.</p>
            <button 
              onClick={handleProvision}
              disabled={loading}
              className="px-8 py-4 bg-blue-600 text-white text-lg rounded-xl hover:bg-blue-700 shadow-lg hover:shadow-xl transition-all flex items-center gap-2 mx-auto"
            >
              {loading ? <Loader2 className="animate-spin" /> : 'Buy UK Mobile Number (£0)'}
            </button>
            <p className="mt-4 text-xs text-gray-400">Uses Developer Credits • No real charge</p>
          </div>
        ) : (
          <div className="mt-8 p-8 bg-green-50 border border-green-200 rounded-xl">
            <h2 className="text-2xl font-bold text-green-800 mb-2">Setup Complete!</h2>
            <p className="text-green-700 mb-4">Your AI is live on:</p>
            <div className="text-4xl font-mono font-bold text-gray-900 bg-white p-4 rounded-lg border border-green-200 shadow-sm">
              {purchasedNumber}
            </div>
            <p className="mt-6 text-sm text-gray-600">Call this number now to test your AI.</p>
          </div>
        )}

        {status && <p className="font-mono text-sm text-gray-500 bg-gray-100 p-2 rounded">{status}</p>}
      </div>
    </main>
  );
}