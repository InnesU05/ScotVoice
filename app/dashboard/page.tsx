'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { 
  Settings, 
  Phone, 
  Edit2, 
  Check, 
  User, 
  LogOut, 
  Loader2,
  Mic,
  Briefcase
} from 'lucide-react';

export default function Dashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  
  // Data State
  const [user, setUser] = useState<any>(null);
  const [assistantData, setAssistantData] = useState<any>(null);
  const [businessName, setBusinessName] = useState("");
  
  // UI State
  const [isEditingName, setIsEditingName] = useState(false);
  const [newNameInput, setNewNameInput] = useState("");
  const [selectedVoice, setSelectedVoice] = useState(""); // 'tradie', 'coach', 'pro'

  useEffect(() => {
    const fetchData = async () => {
      // 1. Get User
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUser(user);

      // 2. Get Profile (Business Name)
      const { data: profile } = await supabase
        .from('profiles')
        .select('business_name')
        .eq('id', user.id)
        .single();

      if (profile) {
        setBusinessName(profile.business_name);
        setNewNameInput(profile.business_name);
      }

      // 3. Get Assistant Details
      const { data: assistant } = await supabase
        .from('assistants')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      setAssistantData(assistant);

      // 4. Determine Current Voice (Naive check based on Assistant ID would be harder, 
      // so we might default or store it. For now, we will highlight based on user interaction or default to 'tradie')
      //Ideally, we store 'voice_id' in DB. Since we don't, we will default to 'tradie' visually or leave blank.
      setSelectedVoice('tradie'); // Default visual selection
      
      setLoading(false);
    };

    fetchData();
  }, [router]);

  // --- HANDLERS ---

  const handleUpdateName = async () => {
    if (!newNameInput.trim()) return;
    setUpdating(true);
    
    try {
      const res = await fetch('/api/update-agent', {
        method: 'POST',
        body: JSON.stringify({
          userId: user.id,
          action: 'update_name',
          payload: { name: newNameInput }
        })
      });
      
      if (!res.ok) throw new Error('Update failed');
      
      setBusinessName(newNameInput);
      setIsEditingName(false);
    } catch (err) {
      alert('Failed to update business name.');
    } finally {
      setUpdating(false);
    }
  };

  const handleSwitchVoice = async (voiceId: string) => {
    if (updating) return;
    setUpdating(true);
    setSelectedVoice(voiceId); // Optimistic UI update

    try {
      const res = await fetch('/api/update-agent', {
        method: 'POST',
        body: JSON.stringify({
          userId: user.id,
          action: 'switch_voice',
          payload: { voiceId }
        })
      });
      
      if (!res.ok) throw new Error('Switch failed');
      
      alert(`Assistant switched to ${voiceId.toUpperCase()}! Call your number to test.`);
    } catch (err) {
      alert('Failed to switch assistant.');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) return (
    <div className="flex h-screen w-full items-center justify-center bg-gray-50">
      <Loader2 className="h-8 w-8 animate-spin text-black" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F9FAFB] text-gray-900 font-sans pb-20">
      
      {/* --- HEADER --- */}
      <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-gray-100 bg-white/80 px-6 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-black text-white font-bold">N</div>
          <span className="text-lg font-semibold tracking-tight">NessDial</span>
        </div>
        <button onClick={async () => { await supabase.auth.signOut(); router.push('/login'); }}>
            <LogOut className="h-5 w-5 text-gray-400 hover:text-red-500" />
        </button>
      </header>

      <main className="mx-auto max-w-lg px-4 py-8">
        
        {/* 1. BUSINESS IDENTITY CARD */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 mb-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Business Identity</h2>
            {isEditingName ? (
               <div className="flex gap-2">
                 <button onClick={() => setIsEditingName(false)} className="text-xs text-red-500 font-medium">Cancel</button>
                 <button onClick={handleUpdateName} disabled={updating} className="text-xs text-blue-600 font-medium">
                   {updating ? 'Saving...' : 'Save'}
                 </button>
               </div>
            ) : (
               <button onClick={() => setIsEditingName(true)} className="p-1 text-gray-400 hover:text-blue-600">
                 <Edit2 className="h-4 w-4" />
               </button>
            )}
          </div>

          {/* Business Name Input/Display */}
          <div className="mb-6">
            {isEditingName ? (
              <input 
                type="text" 
                value={newNameInput}
                onChange={(e) => setNewNameInput(e.target.value)}
                className="w-full text-2xl font-bold text-gray-900 border-b-2 border-blue-500 focus:outline-none bg-transparent"
                autoFocus
              />
            ) : (
              <h1 className="text-2xl font-bold text-gray-900">{businessName}</h1>
            )}
          </div>

          {/* Phone Number Display */}
          <div className="flex items-center gap-3 bg-gray-50 p-4 rounded-xl border border-gray-100">
            <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center text-green-600">
              <Phone className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Your AI Number</p>
              <p className="text-lg font-mono font-semibold text-gray-900 tracking-wide">
                {assistantData?.twilio_phone_number || "Provisioning..."}
              </p>
            </div>
          </div>
        </div>

        {/* 2. ASSISTANT SWITCHER */}
        <div className="mb-8">
          <h2 className="mb-4 text-sm font-semibold text-gray-900">Active Assistant</h2>
          <div className="grid grid-cols-1 gap-3">
            
            {/* CARD: TRADIE */}
            <button 
              onClick={() => handleSwitchVoice('tradie')}
              className={`relative flex items-center gap-4 p-4 rounded-2xl border text-left transition-all ${
                selectedVoice === 'tradie' 
                ? 'bg-black text-white border-black shadow-lg ring-2 ring-offset-2 ring-gray-200' 
                : 'bg-white text-gray-600 border-gray-100 hover:border-gray-300'
              }`}
            >
              <div className="h-10 w-10 rounded-full bg-gray-700/50 flex items-center justify-center text-xl">🔨</div>
              <div className="flex-1">
                <p className="font-bold text-sm">Rab (The Tradie)</p>
                <p className={`text-xs ${selectedVoice === 'tradie' ? 'text-gray-300' : 'text-gray-400'}`}>Casual, Scottish, Friendly</p>
              </div>
              {selectedVoice === 'tradie' && <Check className="h-5 w-5 text-green-400" />}
            </button>

            {/* CARD: PRO */}
            <button 
              onClick={() => handleSwitchVoice('pro')}
              className={`relative flex items-center gap-4 p-4 rounded-2xl border text-left transition-all ${
                selectedVoice === 'pro' 
                ? 'bg-black text-white border-black shadow-lg ring-2 ring-offset-2 ring-gray-200' 
                : 'bg-white text-gray-600 border-gray-100 hover:border-gray-300'
              }`}
            >
              <div className="h-10 w-10 rounded-full bg-gray-700/50 flex items-center justify-center text-xl">💼</div>
              <div className="flex-1">
                <p className="font-bold text-sm">Claire (The Pro)</p>
                <p className={`text-xs ${selectedVoice === 'pro' ? 'text-gray-300' : 'text-gray-400'}`}>Formal, Polite, Efficient</p>
              </div>
              {selectedVoice === 'pro' && <Check className="h-5 w-5 text-green-400" />}
            </button>

            {/* CARD: COACH */}
            <button 
              onClick={() => handleSwitchVoice('coach')}
              className={`relative flex items-center gap-4 p-4 rounded-2xl border text-left transition-all ${
                selectedVoice === 'coach' 
                ? 'bg-black text-white border-black shadow-lg ring-2 ring-offset-2 ring-gray-200' 
                : 'bg-white text-gray-600 border-gray-100 hover:border-gray-300'
              }`}
            >
              <div className="h-10 w-10 rounded-full bg-gray-700/50 flex items-center justify-center text-xl">🔥</div>
              <div className="flex-1">
                <p className="font-bold text-sm">Calum (The Coach)</p>
                <p className={`text-xs ${selectedVoice === 'coach' ? 'text-gray-300' : 'text-gray-400'}`}>High Energy, Motivating</p>
              </div>
              {selectedVoice === 'coach' && <Check className="h-5 w-5 text-green-400" />}
            </button>

          </div>
          {updating && <p className="text-center text-xs text-blue-600 mt-2 animate-pulse">Updating AI Assistant...</p>}
        </div>

        {/* 3. RECENT ACTIVITY (Placeholder for Real Data) */}
        <div className="border-t border-gray-200 pt-6">
          <h2 className="mb-4 text-sm font-semibold text-gray-900">Recent Call Log</h2>
          {/* TODO: Connect this to a real 'calls' table in Supabase.
              For now, we show an empty state to avoid "fake stats".
          */}
          <div className="flex flex-col items-center justify-center py-10 bg-white rounded-2xl border border-dashed border-gray-200">
             <div className="h-12 w-12 bg-gray-50 rounded-full flex items-center justify-center mb-3">
               <Phone className="h-6 w-6 text-gray-300" />
             </div>
             <p className="text-sm font-medium text-gray-900">No calls recorded yet</p>
             <p className="text-xs text-gray-500 mt-1">Call your number to see activity here.</p>
          </div>
        </div>

      </main>
    </div>
  );
}