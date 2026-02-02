'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, CreditCard, CheckCircle, ExternalLink } from 'lucide-react';

export default function BillingPage() {
  const router = useRouter();

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
            <p className="text-slate-400 text-sm mt-1">£25.00 / month</p>
            
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
            className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl border border-slate-700 flex items-center justify-center gap-2 transition-all"
            onClick={() => alert('This would open the Stripe Customer Portal.')}
          >
            Manage Subscription <ExternalLink className="h-4 w-4" />
          </button>
          <p className="text-center text-xs text-slate-500 mt-4">
            Payments are securely processed by Stripe.
          </p>
        </div>
      </div>
    </div>
  );
}