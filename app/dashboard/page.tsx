'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { 
  Settings, 
  Phone, 
  Edit2, 
  Check, 
  LogOut, 
  Loader2,
  X,
  CreditCard,
  User,
  RefreshCw,
  PlayCircle
} from 'lucide-react';

export default function Dashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false); // Settings Slide State
  
  // Data State
  const [user, setUser] = useState<any>(null);
  const [assistantData, setAssistantData] = useState<any>(null);
  const [businessName, setBusinessName] = useState("");
  const [calls, setCalls] = useState<any[]>([]); // Real Call Logs
  
  // UI State
  const [isEditingName, setIsEditingName] = useState(false);
  const [newNameInput, setNewNameInput] = useState("");
  const [selectedVoice, setSelectedVoice] = useState("tradie");

  useEffect(() => {
    const fetchData = async () => {
      // 1. Get User
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUser(user);

      // 2. Get Profile
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

      // 4. Get Call Logs (Real Data)
      const { data: callLogs } = await supabase
        .from('calls')
        .select('*')
        .eq('user_id', user.id)
        .order('started_at', { ascending: false })
        .limit(10);
      
      if (callLogs) setCalls(callLogs);
      
      setLoading(false);
    };

    fetchData();
  }, [router]);

  // --- ACTIONS ---

  const handleUpdateName = async () => {
    if (!newNameInput.trim()) return;
    setUpdating(true);
    try {
      const res = await fetch('/api/update-agent', {
        method: 'POST',
        body: JSON.stringify({ userId: user.id, action: 'update_name', payload: { name: newNameInput } })
      });
      if (!res.ok) throw new Error('Failed');
      setBusinessName(newNameInput);
      setIsEditingName(false);
    } catch (err) { alert('Failed to update name'); }
    setUpdating(false);
  };

  const handleSwitchVoice = async (voiceId: string) => {
    if (updating) return;
    setUpdating(true);
    setSelectedVoice(voiceId);
    try {
      const res = await fetch('/api/update-agent', {
        method: 'POST',
        body: JSON.stringify({ userId: user.id, action: 'switch_voice', payload: { voiceId } })
      });
      if (!res.ok) throw new Error('Failed');
      alert(`Assistant switched to ${voiceId.toUpperCase()}!`);
    } catch (err) { alert('Failed to switch assistant'); }
    setUpdating(false);
  };

  const handleSignOut = async () => {
    if (confirm("Are you sure you want to sign out?")) {
      await supabase.auth.signOut();
      router.push('/login');
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
        
        {/* Settings Cog (Restored) */}
        <button 
          onClick={() => setIsSettingsOpen(true)}
          className="rounded-full p-2 text-gray-500 hover:bg-gray-100 transition-colors"
        >
          <Settings className="h-6 w-6" />
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
                 <button onClick={handleUpdateName} disabled={updating} className="text-xs text-blue-600 font-medium">{updating ? '...' : 'Save'}</button>
               </div>
            ) : (
               <button onClick={() => setIsEditingName(true)} className="p-1 text-gray-400 hover:text-blue-600">
                 <Edit2 className="h-4 w-4" />
               </button>
            )}
          </div>

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
            {['tradie', 'pro', 'coach'].map((voice) => (
              <button 
                key={voice}
                onClick={() => handleSwitchVoice(voice)}
                className={`relative flex items-center gap-4 p-4 rounded-2xl border text-left transition-all ${
                  selectedVoice === voice 
                  ? 'bg-black text-white border-black shadow-lg ring-2 ring-offset-2 ring-gray-200' 
                  : 'bg-white text-gray-600 border-gray-100 hover:border-gray-300'
                }`}
              >
                <div className="h-10 w-10 rounded-full bg-gray-700/50 flex items-center justify-center text-xl">
                  {voice === 'tradie' ? '🔨' : voice === 'pro' ? '💼' : '🔥'}
                </div>
                <div className="flex-1">
                  <p className="font-bold text-sm capitalize">{voice === 'tradie' ? 'Rab (Tradie)' : voice === 'pro' ? 'Claire (Pro)' : 'Calum (Coach)'}</p>
                </div>
                {selectedVoice === voice && <Check className="h-5 w-5 text-green-400" />}
              </button>
            ))}
          </div>
        </div>

        {/* 3. REAL CALL LOGS */}
        <div className="border-t border-gray-200 pt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900">Recent Call Log</h2>
            <button onClick={() => window.location.reload()} className="text-xs text-blue-600 flex items-center gap-1">
              <RefreshCw className="h-3 w-3" /> Refresh
            </button>
          </div>
          
          {calls.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 bg-white rounded-2xl border border-dashed border-gray-200">
               <div className="h-12 w-12 bg-gray-50 rounded-full flex items-center justify-center mb-3">
                 <Phone className="h-6 w-6 text-gray-300" />
               </div>
               <p className="text-sm font-medium text-gray-900">No calls recorded yet</p>
               <p className="text-xs text-gray-500 mt-1">Make a test call to see it here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {calls.map((call) => (
                <div key={call.id} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col gap-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-bold text-gray-900">{call.customer_number}</p>
                      <p className="text-xs text-gray-500">{new Date(call.started_at).toLocaleString()}</p>
                    </div>
                    <span className="text-xs font-medium px-2 py-1 bg-gray-100 rounded-full text-gray-600 capitalize">
                      {call.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 bg-gray-50 p-2 rounded-lg italic border border-gray-200">
                    "{call.summary}"
                  </p>
                  {call.recording_url && (
                    <a href={call.recording_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 flex items-center gap-1 hover:underline mt-1">
                      <PlayCircle className="h-3 w-3" /> Listen to Recording
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

      </main>

      {/* --- SLIDE-OUT SETTINGS --- */}
      <div 
        className={`fixed inset-0 z-40 bg-black/20 backdrop-blur-sm transition-opacity duration-300 ${isSettingsOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setIsSettingsOpen(false)}
      />
      <div 
        className={`fixed inset-y-0 right-0 z-50 w-full max-w-xs bg-white shadow-2xl transition-transform duration-300 ease-in-out ${isSettingsOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5">
            <h2 className="text-xl font-bold text-gray-900">Settings</h2>
            <button onClick={() => setIsSettingsOpen(false)} className="rounded-full p-2 text-gray-400 hover:bg-gray-100">
              <X className="h-6 w-6" />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-2">
            <button className="flex w-full items-center gap-3 rounded-xl bg-gray-50 p-4 text-left hover:bg-gray-100">
              <User className="h-5 w-5 text-gray-600" />
              <div><p className="text-sm font-medium">Profile</p><p className="text-xs text-gray-500">{user?.email}</p></div>
            </button>
            <button className="flex w-full items-center gap-3 rounded-xl bg-gray-50 p-4 text-left hover:bg-gray-100">
              <CreditCard className="h-5 w-5 text-gray-600" />
              <div><p className="text-sm font-medium">Billing</p><p className="text-xs text-gray-500">Manage subscription</p></div>
            </button>
          </div>

          <div className="border-t border-gray-100 p-6">
            <button 
              onClick={handleSignOut}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-600 hover:bg-red-100"
            >
              <LogOut className="h-4 w-4" /> Sign Out
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}