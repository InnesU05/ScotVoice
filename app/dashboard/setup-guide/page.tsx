'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase'; // ✅ Fixed Import
import { Phone, CheckCircle, ArrowRight, HelpCircle, Smartphone, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function SetupGuide() {
  const [loading, setLoading] = useState(true);
  const [aiNumber, setAiNumber] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'generic' | 'ee' | 'o2' | 'vodafone' | 'three'>('generic');

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: assistant } = await supabase
        .from('assistants')
        .select('twilio_phone_number') 
        .eq('user_id', user.id)
        .single();

      if (assistant?.twilio_phone_number) {
        setAiNumber(assistant.twilio_phone_number);
      }
      setLoading(false);
    }
    loadData();
  }, []);

  if (loading) return <div className="p-8 text-slate-500">Loading setup details...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      
      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Connect Your Phone</h1>
        <p className="text-slate-500">
          To let your AI answer calls, you simply forward your missed calls to the dedicated number below.
        </p>
      </div>

      {/* STEP 1: YOUR NUMBER */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">1</span>
            Your AI Receptionist Number
          </h2>
        </div>
        <div className="p-8 text-center">
            {!aiNumber ? (
                <div className="py-6">
                    <p className="text-slate-600 mb-4">You haven't claimed a number yet.</p>
                    <Link href="/dashboard" className="inline-flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 transition-colors font-medium">
                        Claim Number on Dashboard <ArrowRight className="h-4 w-4" />
                    </Link>
                </div>
            ) : (
                <div className="relative inline-block group">
                    <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-2">Forward calls to this line</p>
                    <div className="text-3xl md:text-5xl font-mono font-bold text-slate-900 tracking-tight mb-3 bg-slate-100 px-6 py-4 rounded-xl border border-slate-200">
                        {aiNumber}
                    </div>
                    <div className="flex items-center justify-center gap-2 text-sm text-green-600 font-medium">
                        <CheckCircle className="h-4 w-4" /> Active & Ready for Calls
                    </div>
                </div>
            )}
        </div>
      </div>

      {/* STEP 2: NETWORK INSTRUCTIONS */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">2</span>
            Activate Call Forwarding
          </h2>
        </div>
        
        <div className="p-6">
            <p className="text-slate-600 mb-6">
                Choose your mobile network provider below for specific instructions.
            </p>

            {/* TABS */}
            <div className="flex flex-wrap gap-2 mb-6 border-b border-slate-200 pb-1">
                {['generic', 'ee', 'o2', 'vodafone', 'three'].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab as any)}
                        className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors border-b-2 ${
                            activeTab === tab 
                            ? 'border-blue-600 text-blue-600 bg-blue-50/50' 
                            : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                        }`}
                    >
                        {tab === 'generic' ? 'General / Other' : tab.toUpperCase()}
                    </button>
                ))}
            </div>

            {/* CONTENT */}
            {aiNumber && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    
                    {/* GENERIC / O2 / THREE (Standard GSM) */}
                    {(activeTab === 'generic' || activeTab === 'o2' || activeTab === 'three') && (
                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="bg-blue-50 border border-blue-100 p-5 rounded-xl">
                                <h3 className="font-bold text-blue-900 mb-2 flex items-center gap-2">
                                    <Smartphone className="h-4 w-4" /> Option A: If Busy / Declined
                                </h3>
                                <p className="text-sm text-blue-700 mb-3">Forward calls when you press 'Decline' or are on another call.</p>
                                <code className="block bg-white px-4 py-3 rounded-lg border border-blue-200 text-blue-800 font-mono text-center text-lg select-all cursor-pointer hover:border-blue-400 transition-colors">
                                    *67*{aiNumber}#
                                </code>
                                <p className="text-xs text-blue-500 mt-2 text-center">Dial this & press Call</p>
                            </div>

                            <div className="bg-blue-50 border border-blue-100 p-5 rounded-xl">
                                <h3 className="font-bold text-blue-900 mb-2 flex items-center gap-2">
                                    <Smartphone className="h-4 w-4" /> Option B: If Unanswered
                                </h3>
                                <p className="text-sm text-blue-700 mb-3">Forward calls if you don't pick up after 15-20 seconds.</p>
                                <code className="block bg-white px-4 py-3 rounded-lg border border-blue-200 text-blue-800 font-mono text-center text-lg select-all cursor-pointer hover:border-blue-400 transition-colors">
                                    *61*{aiNumber}#
                                </code>
                                <p className="text-xs text-blue-500 mt-2 text-center">Dial this & press Call</p>
                            </div>
                        </div>
                    )}

                    {/* EE SPECIFIC */}
                    {activeTab === 'ee' && (
                        <div className="bg-slate-50 border border-slate-200 p-6 rounded-xl">
                            <h3 className="font-bold text-slate-900 mb-4">EE Call Forwarding</h3>
                            <div className="space-y-4">
                                <div className="flex gap-3">
                                    <div className="bg-slate-200 text-slate-700 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0">1</div>
                                    <p className="text-sm text-slate-700">Dial <strong>150</strong> from your EE phone.</p>
                                </div>
                                <div className="flex gap-3">
                                    <div className="bg-slate-200 text-slate-700 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0">2</div>
                                    <p className="text-sm text-slate-700">Select <strong>Option 1</strong>, then <strong>Option 2</strong>.</p>
                                </div>
                                <div className="flex gap-3">
                                    <div className="bg-slate-200 text-slate-700 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0">3</div>
                                    <p className="text-sm text-slate-700">Enter your AI Number when prompted: <strong>{aiNumber}</strong></p>
                                </div>
                                <div className="mt-4 p-3 bg-yellow-50 text-yellow-800 text-sm rounded-lg border border-yellow-100 flex gap-2">
                                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                                    <p>Note: EE sometimes disables GSM codes (`*67*`) for newer accounts. Using the 150 menu is the most reliable method.</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* VODAFONE SPECIFIC */}
                    {activeTab === 'vodafone' && (
                        <div className="bg-slate-50 border border-slate-200 p-6 rounded-xl">
                            <h3 className="font-bold text-slate-900 mb-4">Vodafone Call Forwarding</h3>
                            <p className="text-sm text-slate-600 mb-4">Vodafone supports standard GSM codes, but sometimes requires a slightly different format for "Unanswered" calls to set the delay time.</p>
                            
                            <div className="bg-white p-4 rounded-lg border border-slate-200 mb-4">
                                <p className="text-xs font-bold text-slate-500 uppercase mb-1">Forward if Unanswered (20 seconds)</p>
                                <code className="block text-lg font-mono text-slate-900 mb-1 select-all">*61*{aiNumber}*10*20#</code>
                            </div>
                             <div className="bg-white p-4 rounded-lg border border-slate-200">
                                <p className="text-xs font-bold text-slate-500 uppercase mb-1">Forward if Busy / Declined</p>
                                <code className="block text-lg font-mono text-slate-900 mb-1 select-all">*67*{aiNumber}#</code>
                            </div>
                        </div>
                    )}

                </div>
            )}
        </div>
      </div>

      {/* FOOTER NOTE */}
      <div className="flex items-start gap-3 bg-slate-50 p-4 rounded-lg border border-slate-200">
        <HelpCircle className="h-5 w-5 text-slate-400 shrink-0 mt-0.5" />
        <p className="text-sm text-slate-600">
            <strong>How to test:</strong> After setting this up, call your mobile from another phone and decline the call. It should ring through to your AI Receptionist.
        </p>
      </div>
    </div>
  );
}