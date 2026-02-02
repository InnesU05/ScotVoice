'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, CreditCard, CheckCircle, ExternalLink, Loader2 } from 'lucide-react';

export default function BillingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleManageSubscription = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not logged in");

      const res = await fetch('/api/portal', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url; // Redirect to Stripe
      } else {
        alert(data.error || "Could not load billing portal.");
      }
    } catch (err) {
      alert("Failed to load billing portal.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 font-sans p-4 pb-20">
      <div className="max-w-xl mx-auto pt-4">
        <button onClick={() => router.back()} className="flex items-center text-slate-400 hover:text-white mb-6 transition-colors">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </button>
        
        <h1 className="text-2xl font-bold text-white mb-8">Billing & Subscription</h1>

        <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-6 rounded-2xl border border-slate-700 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <CreditCard className="h-32 w-32 text-white" />
          </div>
          
          <div className="relative z-10">
            <span className="bg-green-500/20 text-green-400 text-xs font-bold px-3 py-1 rounded-full border border-green-500/30">ACTIVE</span>
            <h2 className="text-2xl font-bold text-white mt-4">Pro Plan</h2>
            <p className="text-slate-400 text-sm mt-1">£20.00 / month</p>
            
            <div className="mt-6 space-y-2">
              <div className="flex items-center gap-2 text-sm text-slate-300">
                <CheckCircle className="h-4 w-4 text-blue-400" /> Unlimited Calls
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-300">
                <CheckCircle className="h-4 w-4 text-blue-400" /> All Personas (Rab, Claire, Calum)
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-300">
                <CheckCircle className="h-4 w-4 text-blue-400" /> 24/7 Support
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <button 
            disabled={loading}
            onClick={handleManageSubscription}
            className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl border border-slate-700 flex items-center justify-center gap-2 transition-all"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><ExternalLink className="h-4 w-4" /> Manage Subscription</>}
          </button>
          <p className="text-center text-xs text-slate-500 mt-4">
            Payments are securely processed by Stripe.
          </p>
        </div>
      </div>
    </div>
  );
}