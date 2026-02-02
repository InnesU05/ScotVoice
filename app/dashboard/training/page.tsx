'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, Save, Clock, FileText, MessageSquare, Loader2, Tag, HelpCircle
} from 'lucide-react';

export default function TrainingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<any>(null);
  
  // Training Data State
  const [openingHours, setOpeningHours] = useState('');
  const [businessDesc, setBusinessDesc] = useState('');
  const [services, setServices] = useState('');
  const [faqs, setFaqs] = useState('');

  // 1. Fetch Existing Data on Load
  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }
      setUser(user);

      const { data: profile } = await supabase
        .from('profiles')
        .select('business_description, opening_hours, services, faqs')
        .eq('id', user.id)
        .single();

      if (profile) {
        setBusinessDesc(profile.business_description || '');
        setOpeningHours(profile.opening_hours || '');
        setServices(profile.services || '');
        setFaqs(profile.faqs || '');
      }
      setLoading(false);
    };
    fetchData();
  }, [router]);

  // 2. Save Data to Supabase
  const handleSave = async () => {
    setSaving(true);
    try {
        const { error } = await supabase
            .from('profiles')
            .update({
                business_description: businessDesc,
                opening_hours: openingHours,
                services: services,
                faqs: faqs
            })
            .eq('id', user.id);

        if (error) throw error;
        alert('Training data saved! Your AI has been updated.');
    } catch (err) {
        alert('Failed to save training data.');
        console.error(err);
    } finally {
        setSaving(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 font-sans p-4 pb-20 selection:bg-blue-500/30">
      
      {/* Header */}
      <div className="max-w-2xl mx-auto mb-8 pt-4 flex items-center gap-4">
        <button 
          onClick={() => router.back()} 
          className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
            <h1 className="text-xl font-bold text-white">Train Your AI</h1>
            <p className="text-xs text-slate-400">Teach your receptionist how to handle your calls.</p>
        </div>
      </div>

      <main className="max-w-2xl mx-auto space-y-6">
        
        {/* Intro Card */}
        <div className="bg-blue-900/20 border border-blue-500/20 p-4 rounded-2xl flex gap-4">
          <div className="h-10 w-10 shrink-0 bg-blue-600 rounded-full flex items-center justify-center text-white">
            <MessageSquare className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-bold text-blue-400 text-sm">How this works</h3>
            <p className="text-xs text-blue-200/70 mt-1 leading-relaxed">
              Whatever you type below is instantly fed into your AI's brain. 
              Be clear and concise. If you change your prices or hours, update them here.
            </p>
          </div>
        </div>

        {/* 1. Business Description */}
        <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800">
          <div className="flex items-center gap-3 mb-4">
            <FileText className="h-5 w-5 text-purple-400" />
            <h2 className="text-sm font-bold text-white">What do you do?</h2>
          </div>
          <p className="text-xs text-slate-500 mb-3">Give a short summary of your business.</p>
          <textarea
            value={businessDesc}
            onChange={(e) => setBusinessDesc(e.target.value)}
            placeholder="e.g. We are NessDial Plumbing, a family-run business in Glasgow specialising in boiler repairs and emergency leaks."
            className="w-full h-24 bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm text-slate-200 focus:outline-none focus:border-purple-500 transition-colors resize-none placeholder-slate-600"
          />
        </div>

        {/* 2. Opening Hours */}
        <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800">
          <div className="flex items-center gap-3 mb-4">
            <Clock className="h-5 w-5 text-blue-400" />
            <h2 className="text-sm font-bold text-white">Opening Hours</h2>
          </div>
          <p className="text-xs text-slate-500 mb-3">When are you available?</p>
          <textarea
            value={openingHours}
            onChange={(e) => setOpeningHours(e.target.value)}
            placeholder="e.g. Monday-Friday 9am to 5pm. Closed Weekends. For emergencies call 07700..."
            className="w-full h-24 bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm text-slate-200 focus:outline-none focus:border-blue-500 transition-colors resize-none placeholder-slate-600"
          />
        </div>

        {/* 3. Services & Pricing (New) */}
        <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800">
          <div className="flex items-center gap-3 mb-4">
            <Tag className="h-5 w-5 text-green-400" />
            <h2 className="text-sm font-bold text-white">Services & Pricing</h2>
          </div>
          <p className="text-xs text-slate-500 mb-3">List your services and rough prices (optional).</p>
          <textarea
            value={services}
            onChange={(e) => setServices(e.target.value)}
            placeholder={"- Boiler Service: £80\n- Tap Washer Replacement: £50\n- Full Install: Quote only"}
            className="w-full h-32 bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm text-slate-200 focus:outline-none focus:border-green-500 transition-colors resize-none placeholder-slate-600"
          />
        </div>

        {/* 4. FAQs (New) */}
        <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800">
          <div className="flex items-center gap-3 mb-4">
            <HelpCircle className="h-5 w-5 text-yellow-400" />
            <h2 className="text-sm font-bold text-white">Common Questions (Q&A)</h2>
          </div>
          <p className="text-xs text-slate-500 mb-3">Teach the AI specific answers to common questions.</p>
          <textarea
            value={faqs}
            onChange={(e) => setFaqs(e.target.value)}
            placeholder={"Q: Do you charge for callouts?\nA: No, quotes are free.\n\nQ: Do you cover Edinburgh?\nA: Yes, mainly EH1 to EH10."}
            className="w-full h-32 bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm text-slate-200 focus:outline-none focus:border-yellow-500 transition-colors resize-none placeholder-slate-600"
          />
        </div>

        {/* Save Button */}
        <div className="sticky bottom-4">
            <button 
            onClick={handleSave}
            disabled={saving}
            className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl shadow-xl shadow-black/50 flex items-center justify-center gap-2 transition-all active:scale-[0.98] border border-blue-400/20"
            >
            {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
            {saving ? 'Updating AI...' : 'Save Training Data'}
            </button>
        </div>

      </main>
    </div>
  );
}