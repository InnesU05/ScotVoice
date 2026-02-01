'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { 
  Settings, Phone, Edit2, Check, LogOut, Loader2, X, 
  User, CreditCard, RefreshCw, Play, Pause, Calendar, Clock
} from 'lucide-react';

// --- CUSTOM AUDIO PLAYER COMPONENT ---
// This handles the interactive progress bar and seeking logic
function AudioPlayer({ src }: { src: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  // Format seconds into mm:ss
  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      // Pause all other audios on the page (optional nice-to-have)
      document.querySelectorAll('audio').forEach((el) => {
        if (el !== audio) (el as HTMLAudioElement).pause();
      });
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  return (
    <div className="w-full bg-slate-950/50 rounded-xl p-3 border border-slate-800/50 mt-3">
      <audio 
        ref={audioRef}
        src={src}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        onPause={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
      />
      
      <div className="flex items-center gap-3">
        <button 
          onClick={togglePlay}
          className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-full bg-blue-600 text-white hover:bg-blue-500 transition-all shadow-lg shadow-blue-900/20"
        >
          {isPlaying ? <Pause className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 fill-current ml-0.5" />}
        </button>

        <div className="flex-1 flex flex-col justify-center gap-1">
          {/* Draggable Range Slider */}
          <input 
            type="range"
            min="0"
            max={duration || 0}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500 hover:accent-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          />
          <div className="flex justify-between text-[10px] font-medium text-slate-500 font-mono">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // Data State
  const [user, setUser] = useState<any>(null);
  const [assistantData, setAssistantData] = useState<any>(null);
  const [businessName, setBusinessName] = useState("");
  const [calls, setCalls] = useState<any[]>([]);
  
  // UI State
  const [isEditingName, setIsEditingName] = useState(false);
  const [newNameInput, setNewNameInput] = useState("");
  const [selectedVoice, setSelectedVoice] = useState("tradie");

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

        {/* 3. CALL LOGS (Optimized for Mobile) */}
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
                <div key={call.id} className="group bg-slate-900 p-5 rounded-3xl border border-slate-800 hover:border-slate-700 transition-all shadow-sm">
                  
                  {/* Top Row: Flex on Desktop, Column on Mobile to fix "Cramped" look */}
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
                    
                    {/* Caller Info */}
                    <div className="flex items-center gap-4">
                      <div className={`h-12 w-12 rounded-2xl flex items-center justify-center shadow-inner ${
                        call.status === 'completed' ? 'bg-blue-500/10 text-blue-400' : 'bg-slate-800 text-slate-500'
                      }`}>
                        <User className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="text-base font-bold text-white tracking-tight">{call.customer_number}</p>
                        <div className="flex items-center gap-3 text-xs text-slate-500 font-medium mt-0.5">
                          <span className="flex items-center gap-1.5"><Calendar className="h-3 w-3" /> {new Date(call.started_at).toLocaleDateString()}</span>
                          <span className="flex items-center gap-1.5"><Clock className="h-3 w-3" /> {new Date(call.started_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                        </div>
                      </div>
                    </div>

                    {/* Status Badge (Moved to own line on very small screens, or right on bigger) */}
                    <div className="self-start">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${
                         call.status === 'completed' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 
                         'bg-red-500/10 text-red-400 border-red-500/20'
                      }`}>
                        {call.status}
                      </span>
                    </div>
                  </div>

                  {/* Summary Box */}
                  <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/50">
                    <p className="text-xs text-slate-400 leading-relaxed">
                      {call.summary ? call.summary : <span className="italic opacity-50">No summary available for this call.</span>}
                    </p>
                  </div>

                  {/* Audio Player (New Interactive Component) */}
                  {call.recording_url && (
                    <AudioPlayer src={call.recording_url} />
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