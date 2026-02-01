'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { 
  Settings, Phone, Edit2, Check, LogOut, Loader2, X, 
  User, CreditCard, RefreshCw, Play, Pause, Calendar, Clock
} from 'lucide-react';

export default function Dashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // Data
  const [user, setUser] = useState<any>(null);
  const [assistantData, setAssistantData] = useState<any>(null);
  const [businessName, setBusinessName] = useState("");
  const [calls, setCalls] = useState<any[]>([]);
  
  // UI
  const [isEditingName, setIsEditingName] = useState(false);
  const [newNameInput, setNewNameInput] = useState("");
  const [selectedVoice, setSelectedVoice] = useState("tradie");
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }
      setUser(user);

      const { data: profile } = await supabase.from('profiles').select('business_name').eq('id', user.id).single();
      if (profile) {
        setBusinessName(profile.business_name);
        setNewNameInput(profile.business_name);
      }

      const { data: assistant } = await supabase.from('assistants').select('*').eq('user_id', user.id).single();
      setAssistantData(assistant);

      const { data: callLogs } = await supabase.from('calls').select('*').eq('user_id', user.id).order('started_at', { ascending: false }).limit(20);
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

  // Audio Player Logic
  const toggleAudio = (id: string) => {
    const audio = document.getElementById(`audio-${id}`) as HTMLAudioElement;
    if (!audio) return;
    
    if (playingAudioId === id) {
      audio.pause();
      setPlayingAudioId(null);
    } else {
      // Pause others
      if (playingAudioId) {
        const prev = document.getElementById(`audio-${playingAudioId}`) as HTMLAudioElement;
        if (prev) prev.pause();
      }
      audio.play();
      setPlayingAudioId(id);
    }
  };

  if (loading) return (
    <div className="flex h-screen w-full items-center justify-center bg-[#0F172A]">
      <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-200 font-sans pb-20 selection:bg-blue-500/30">
      
      {/* --- HEADER --- */}
      <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-800 bg-[#0F172A]/80 px-6 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white font-bold shadow-lg shadow-blue-900/20">N</div>
          <span className="text-lg font-bold tracking-tight text-white">NessDial</span>
        </div>
        <button onClick={() => setIsSettingsOpen(true)} className="rounded-full p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-all">
          <Settings className="h-6 w-6" />
        </button>
      </header>

      <main className="mx-auto max-w-xl px-4 py-8 space-y-8">
        
        {/* 1. BUSINESS IDENTITY (Dark Card) */}
        <div className="relative overflow-hidden rounded-3xl bg-slate-900 p-6 shadow-xl border border-slate-800">
          <div className="absolute top-0 right-0 h-32 w-32 bg-blue-500/10 blur-3xl rounded-full pointer-events-none"></div>
          
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs font-bold text-blue-400 uppercase tracking-wider">Business Identity</h2>
              {isEditingName ? (
                 <div className="flex gap-3">
                   <button onClick={() => setIsEditingName(false)} className="text-xs text-slate-400 hover:text-white transition-colors">Cancel</button>
                   <button onClick={handleUpdateName} disabled={updating} className="text-xs text-blue-400 font-bold hover:text-blue-300 transition-colors">
                     {updating ? 'Saving...' : 'Save'}
                   </button>
                 </div>
              ) : (
                 <button onClick={() => setIsEditingName(true)} className="p-1 text-slate-500 hover:text-blue-400 transition-colors">
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
                  className="w-full bg-transparent text-2xl font-bold text-white border-b border-blue-500 focus:outline-none placeholder-slate-600"
                  autoFocus
                />
              ) : (
                <h1 className="text-3xl font-bold text-white tracking-tight">{businessName}</h1>
              )}
            </div>

            <div className="flex items-center gap-4 bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50">
              <div className="h-10 w-10 bg-blue-500/20 rounded-full flex items-center justify-center text-blue-400">
                <Phone className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium">Your AI Number</p>
                <p className="text-lg font-mono font-semibold text-white tracking-wide">
                  {assistantData?.twilio_phone_number || "Provisioning..."}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 2. ASSISTANT SWITCHER */}
        <div>
          <h2 className="mb-4 text-sm font-semibold text-slate-400 px-1">Active Persona</h2>
          <div className="grid grid-cols-1 gap-3">
            {[
              { id: 'tradie', icon: '🔨', name: 'Rab (Tradie)', desc: 'Casual, Scottish, Friendly' },
              { id: 'pro', icon: '💼', name: 'Claire (Pro)', desc: 'Formal, Polite, Efficient' },
              { id: 'coach', icon: '🔥', name: 'Calum (Coach)', desc: 'High Energy, Motivating' }
            ].map((voice) => (
              <button 
                key={voice.id}
                onClick={() => handleSwitchVoice(voice.id)}
                className={`relative group flex items-center gap-4 p-4 rounded-2xl border text-left transition-all duration-200 ${
                  selectedVoice === voice.id 
                  ? 'bg-blue-600 border-blue-500 shadow-lg shadow-blue-900/20' 
                  : 'bg-slate-900 border-slate-800 hover:border-slate-700 hover:bg-slate-800'
                }`}
              >
                <div className="h-12 w-12 rounded-xl bg-white/10 flex items-center justify-center text-2xl">
                  {voice.icon}
                </div>
                <div className="flex-1">
                  <p className={`font-bold text-sm ${selectedVoice === voice.id ? 'text-white' : 'text-slate-200'}`}>
                    {voice.name}
                  </p>
                  <p className={`text-xs ${selectedVoice === voice.id ? 'text-blue-100' : 'text-slate-500'}`}>
                    {voice.desc}
                  </p>
                </div>
                {selectedVoice === voice.id && (
                  <div className="bg-white/20 p-1 rounded-full">
                    <Check className="h-4 w-4 text-white" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* 3. CALL LOGS */}
        <div>
          <div className="flex items-center justify-between mb-4 px-1">
            <h2 className="text-sm font-semibold text-slate-400">Recent Activity</h2>
            <button onClick={() => window.location.reload()} className="text-xs text-blue-400 flex items-center gap-1 hover:text-blue-300 transition-colors">
              <RefreshCw className="h-3 w-3" /> Refresh
            </button>
          </div>
          
          {calls.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 bg-slate-900 rounded-3xl border border-slate-800 border-dashed">
               <div className="h-16 w-16 bg-slate-800 rounded-full flex items-center justify-center mb-4">
                 <Phone className="h-6 w-6 text-slate-600" />
               </div>
               <p className="text-slate-300 font-medium">No calls recorded yet</p>
               <p className="text-xs text-slate-500 mt-1">Make a test call to see it here.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {calls.map((call) => (
                <div key={call.id} className="group bg-slate-900 p-5 rounded-2xl border border-slate-800 hover:border-slate-700 transition-all shadow-sm">
                  
                  {/* Top Row: Info & Status */}
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                        call.status === 'completed' ? 'bg-green-500/10 text-green-400' : 'bg-slate-800 text-slate-500'
                      }`}>
                        <User className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">{call.customer_number}</p>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {new Date(call.started_at).toLocaleDateString()}</span>
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {new Date(call.started_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                        </div>
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wide ${
                       call.status === 'completed' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 
                       'bg-red-500/10 text-red-400 border border-red-500/20'
                    }`}>
                      {call.status}
                    </span>
                  </div>

                  {/* Summary Box */}
                  <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800/50 mb-3">
                    <p className="text-xs text-slate-400 leading-relaxed italic">
                      "{call.summary || "No summary provided."}"
                    </p>
                  </div>

                  {/* Audio Player (Custom UI) */}
                  {call.recording_url && (
                    <div className="flex items-center gap-3 mt-2">
                      <button 
                        onClick={() => toggleAudio(call.id)}
                        className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-600 text-white hover:bg-blue-500 transition-colors"
                      >
                        {playingAudioId === call.id ? <Pause className="h-3 w-3 fill-current" /> : <Play className="h-3 w-3 fill-current" />}
                      </button>
                      <div className="h-1 flex-1 bg-slate-800 rounded-full overflow-hidden">
                        <div className={`h-full bg-blue-500 w-1/3 ${playingAudioId === call.id ? 'animate-pulse' : ''}`}></div>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">
                         {call.duration_seconds}s
                      </span>
                      {/* Hidden Audio Element */}
                      <audio id={`audio-${call.id}`} src={call.recording_url} onEnded={() => setPlayingAudioId(null)} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* --- SETTINGS SLIDE-OUT (Dark Mode) --- */}
      <div 
        className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${isSettingsOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setIsSettingsOpen(false)}
      />
      <div 
        className={`fixed inset-y-0 right-0 z-50 w-full max-w-xs bg-slate-900 border-l border-slate-800 shadow-2xl transition-transform duration-300 ease-in-out ${isSettingsOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-slate-800 px-6 py-5">
            <h2 className="text-xl font-bold text-white">Settings</h2>
            <button onClick={() => setIsSettingsOpen(false)} className="rounded-full p-2 text-slate-400 hover:bg-slate-800 hover:text-white">
              <X className="h-6 w-6" />
            </button>
          </div>
          
          <div className="flex-1 px-6 py-6 space-y-2">
            <div className="flex w-full items-center gap-3 rounded-xl bg-slate-800/50 p-4 border border-slate-800">
              <User className="h-5 w-5 text-blue-400" />
              <div><p className="text-sm font-medium text-white">Profile</p><p className="text-xs text-slate-500">{user?.email}</p></div>
            </div>
            <div className="flex w-full items-center gap-3 rounded-xl bg-slate-800/50 p-4 border border-slate-800">
              <CreditCard className="h-5 w-5 text-blue-400" />
              <div><p className="text-sm font-medium text-white">Billing</p><p className="text-xs text-slate-500">Manage subscription</p></div>
            </div>
          </div>

          <div className="border-t border-slate-800 p-6">
            <button 
              onClick={handleSignOut}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm font-medium text-red-400 hover:bg-red-500/20 transition-colors"
            >
              <LogOut className="h-4 w-4" /> Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}