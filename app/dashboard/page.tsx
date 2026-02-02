'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
// FIX: Added 'Check' and 'LogOut' to the import list
import { 
  Settings, Phone, Edit2, Loader2, X, 
  User, CreditCard, RefreshCw, Play, Pause, Calendar, Clock,
  ChevronDown, ChevronUp, BrainCircuit, ChevronRight, Smartphone,
  HelpCircle, AlertCircle, Mail, Star, Download, Trash2, Zap, 
  PhoneForwarded, Check, LogOut 
} from 'lucide-react';

// --- CUSTOM AUDIO PLAYER COMPONENT (Unchanged) ---
function AudioPlayer({ src }: { src: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

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
  
  // Collapsible States
  const [isPersonaOpen, setIsPersonaOpen] = useState(false);
  const [isActivityOpen, setIsActivityOpen] = useState(false);

  // Data State
  const [user, setUser] = useState<any>(null);
  const [assistantData, setAssistantData] = useState<any>(null);
  const [businessName, setBusinessName] = useState("");
  const [userPhone, setUserPhone] = useState("");
  const [calls, setCalls] = useState<any[]>([]);
  const [usageStats, setUsageStats] = useState({ used: 0, limit: 200 }); // Default
  
  // UI State
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [newNameInput, setNewNameInput] = useState("");
  const [newPhoneInput, setNewPhoneInput] = useState("");
  const [selectedVoice, setSelectedVoice] = useState("tradie");

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }
      setUser(user);

      // Fetch Profile (including usage)
      const { data: profile } = await supabase
        .from('profiles')
        .select('business_name, business_phone, usage_minutes, monthly_usage_limit')
        .eq('id', user.id)
        .single();
        
      if (profile) {
        setBusinessName(profile.business_name || "");
        setNewNameInput(profile.business_name || "");
        setUserPhone(profile.business_phone || "");
        setNewPhoneInput(profile.business_phone || "");
        setUsageStats({
            used: profile.usage_minutes || 0,
            limit: profile.monthly_usage_limit || 200
        });
      }

      const { data: assistant } = await supabase.from('assistants').select('*').eq('user_id', user.id).single();
      setAssistantData(assistant);
      
      // Set active voice if found
      if (assistant?.active_voice_id) {
          setSelectedVoice(assistant.active_voice_id);
      }

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

  const handleUpdatePhone = async () => {
    if (!newPhoneInput.trim()) return;
    setUpdating(true);
    try {
      const res = await fetch('/api/update-agent', {
        method: 'POST',
        body: JSON.stringify({ userId: user.id, action: 'update_phone', payload: { phone: newPhoneInput } })
      });
      if (!res.ok) throw new Error('Failed');
      setUserPhone(newPhoneInput);
      setIsEditingPhone(false);
    } catch (err) { alert('Failed to update phone number'); }
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

  const handleDeleteCall = async (callId: string) => {
    if (!confirm('Are you sure you want to delete this call log? This cannot be undone.')) return;
    setCalls(calls.filter(c => c.id !== callId));
    try {
      const { error } = await supabase.from('calls').delete().eq('id', callId);
      if (error) throw error;
    } catch (err) {
      alert('Failed to delete call from database');
      window.location.reload(); 
    }
  };

  const handleSignOut = async () => {
    if (confirm("Are you sure you want to sign out?")) {
      await supabase.auth.signOut();
      router.push('/login');
    }
  };

  // Helper for Usage Bar
  const usagePercent = Math.min((usageStats.used / usageStats.limit) * 100, 100);
  const isUsageHigh = usagePercent > 80;

  if (loading) return (
    <div className="flex h-screen w-full items-center justify-center bg-[#020617]">
      <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 font-sans pb-20 selection:bg-blue-500/30">
      
      <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-800 bg-[#020617]/80 px-6 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="NessDial" className="h-8 w-8 rounded-lg shadow-lg shadow-blue-900/20" />
          <span className="text-lg font-bold tracking-tight text-white">NessDial</span>
        </div>
        <button onClick={() => setIsSettingsOpen(true)} className="rounded-full p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-all">
          <Settings className="h-6 w-6" />
        </button>
      </header>

      <main className="mx-auto max-w-xl px-4 py-8 space-y-8">
        
        {/* --- USAGE BAR --- */}
        <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-sm">
            <div className="flex justify-between items-end mb-2">
                <div className="flex items-center gap-2">
                    <Zap className={`h-4 w-4 ${isUsageHigh ? 'text-red-400' : 'text-blue-400'}`} />
                    <p className="text-xs font-bold text-slate-300 uppercase tracking-wider">Monthly Usage</p>
                </div>
                <p className="text-xs font-mono text-slate-400">
                    <span className={isUsageHigh ? 'text-white' : 'text-white'}>{Math.round(usageStats.used)}</span> 
                    <span className="opacity-50">/{usageStats.limit} mins</span>
                </p>
            </div>
            <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800/50">
                <div 
                    className={`h-full rounded-full transition-all duration-500 ${isUsageHigh ? 'bg-red-500' : 'bg-blue-500'}`} 
                    style={{ width: `${usagePercent}%` }}
                />
            </div>
            {isUsageHigh && (
                <p className="text-[10px] text-red-400 mt-2 text-right">
                    Approaching limit. Calls may be forwarded to voicemail soon.
                </p>
            )}
        </div>

        {/* Business Identity */}
        <div className="relative overflow-hidden rounded-3xl bg-slate-900 p-6 shadow-xl border border-slate-800">
          <div className="absolute top-0 right-0 h-32 w-32 bg-blue-500/10 blur-3xl rounded-full pointer-events-none"></div>
          
          <div className="relative z-10">
            {/* Name */}
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs font-bold text-blue-400 uppercase tracking-wider">Business Name</h2>
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

            {/* AI Number (Stacked on Mobile) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50 mb-4">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 bg-blue-500/20 rounded-full flex items-center justify-center text-blue-400 shrink-0">
                  <Phone className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-medium">Your AI Number</p>
                  <p className="text-lg font-mono font-semibold text-white tracking-wide">
                    {assistantData?.twilio_phone_number || "Provisioning..."}
                  </p>
                </div>
              </div>
              
              {/* UPDATED LINK */}
              <Link href="/dashboard/setup-guide">
                <button className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-blue-900/20">
                    <PhoneForwarded className="h-3.5 w-3.5" />
                    Connect Guide
                </button>
              </Link>
            </div>

            {/* User Number (Stacked on Mobile) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50">
              <div className="flex items-center gap-4 w-full">
                <div className="h-10 w-10 bg-purple-500/20 rounded-full flex items-center justify-center text-purple-400 shrink-0">
                  <Smartphone className="h-5 w-5" />
                </div>
                <div className="w-full">
                  <p className="text-xs text-slate-400 font-medium">Your Business Mobile</p>
                  {isEditingPhone ? (
                    <input 
                      type="tel"
                      value={newPhoneInput}
                      onChange={(e) => setNewPhoneInput(e.target.value)}
                      placeholder="+44 7700 900000"
                      className="w-full bg-transparent text-lg font-mono font-semibold text-white border-b border-purple-500 focus:outline-none"
                      autoFocus
                    />
                  ) : (
                    <p className="text-lg font-mono font-semibold text-white tracking-wide">
                      {userPhone || <span className="text-slate-600 text-sm italic">Add your number...</span>}
                    </p>
                  )}
                </div>
              </div>
              {isEditingPhone ? (
                 <div className="flex gap-2 self-end sm:self-center">
                   <button onClick={() => setIsEditingPhone(false)} className="text-xs text-slate-500 font-medium px-2 py-1">Cancel</button>
                   <button onClick={handleUpdatePhone} disabled={updating} className="text-xs text-purple-400 font-bold bg-purple-500/10 px-3 py-1 rounded-lg border border-purple-500/20">Save</button>
                 </div>
              ) : (
                 <button onClick={() => setIsEditingPhone(true)} className="self-end sm:self-center p-2 text-slate-500 hover:text-purple-400 transition-colors">
                   <Edit2 className="h-4 w-4" />
                 </button>
              )}
            </div>

          </div>
        </div>

        {/* Train AI Button */}
        <Link href="/dashboard/training" className="block mb-8">
          <div className="group w-full p-4 rounded-3xl bg-blue-600 hover:bg-blue-500 transition-all shadow-lg shadow-blue-900/20 flex items-center justify-between cursor-pointer border border-blue-500/50">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center text-white shrink-0">
                <BrainCircuit className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold text-white text-lg">Train Your AI</h3>
                <p className="text-blue-100 text-xs">Set opening hours & business info</p>
              </div>
            </div>
            <div className="bg-white/20 p-2 rounded-full group-hover:bg-white/30 transition-colors">
              <ChevronRight className="h-5 w-5 text-white" />
            </div>
          </div>
        </Link>

        {/* Active Persona (Collapsible) */}
        <div className="bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden shadow-sm transition-all">
          <button 
            onClick={() => setIsPersonaOpen(!isPersonaOpen)}
            className="w-full flex items-center justify-between p-6 hover:bg-slate-800/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-slate-800 flex items-center justify-center text-xl">
                {selectedVoice === 'tradie' ? '畑' : selectedVoice === 'pro' ? '直' : '櫨'}
              </div>
              <div className="text-left">
                <h2 className="text-sm font-bold text-white">Active Persona</h2>
                {!isPersonaOpen && (
                  <p className="text-xs text-slate-500">
                    Currently using <span className="text-blue-400">{selectedVoice === 'tradie' ? 'Rab' : selectedVoice === 'pro' ? 'Claire' : 'Calum'}</span>
                  </p>
                )}
              </div>
            </div>
            {isPersonaOpen ? <ChevronUp className="text-slate-500" /> : <ChevronDown className="text-slate-500" />}
          </button>

          {isPersonaOpen && (
            <div className="px-6 pb-6 pt-0 animate-in slide-in-from-top-2 duration-200">
              <div className="grid grid-cols-1 gap-3 mt-4">
                {[
                  { id: 'tradie', icon: '畑', name: 'Rab (Tradie)', desc: 'Casual, Scottish, Friendly' },
                  { id: 'pro', icon: '直', name: 'Claire (Pro)', desc: 'Formal, Polite, Efficient' },
                  { id: 'coach', icon: '櫨', name: 'Calum (Coach)', desc: 'High Energy, Motivating' }
                ].map((voice) => (
                  <button 
                    key={voice.id}
                    onClick={() => handleSwitchVoice(voice.id)}
                    className={`relative group flex items-center gap-4 p-4 rounded-2xl border text-left transition-all duration-200 ${
                      selectedVoice === voice.id 
                      ? 'bg-slate-800 border-slate-600 shadow-lg' 
                      : 'bg-slate-950 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                    }`}
                  >
                    <div className="h-12 w-12 rounded-xl bg-slate-800/50 flex items-center justify-center text-2xl">
                      {voice.icon}
                    </div>
                    <div className="flex-1">
                      <p className={`font-bold text-sm ${selectedVoice === voice.id ? 'text-white' : 'text-slate-300'}`}>
                        {voice.name}
                      </p>
                      <p className={`text-xs ${selectedVoice === voice.id ? 'text-blue-200' : 'text-slate-500'}`}>
                        {voice.desc}
                      </p>
                    </div>
                    {selectedVoice === voice.id && (
                      <div className="bg-green-500/20 p-1 rounded-full">
                        <Check className="h-4 w-4 text-green-400" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Call Logs (Collapsible) */}
        <div className="bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden shadow-sm transition-all">
          <button 
            onClick={() => setIsActivityOpen(!isActivityOpen)}
            className="w-full flex items-center justify-between p-6 hover:bg-slate-800/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-slate-800 flex items-center justify-center">
                <Phone className="h-4 w-4 text-slate-400" />
              </div>
              <div className="text-left">
                <h2 className="text-sm font-bold text-white">Recent Activity</h2>
                {!isActivityOpen && (
                  <p className="text-xs text-slate-500">
                    {calls.length > 0 ? `${calls.length} calls recorded` : 'No calls yet'}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span onClick={(e) => {e.stopPropagation(); window.location.reload()}} className="p-2 rounded-full hover:bg-slate-800 text-blue-400">
                <RefreshCw className="h-4 w-4" />
              </span>
              {isActivityOpen ? <ChevronUp className="text-slate-500" /> : <ChevronDown className="text-slate-500" />}
            </div>
          </button>
          
          {isActivityOpen && (
            <div className="px-6 pb-6 pt-0 animate-in slide-in-from-top-2 duration-200">
              {calls.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 rounded-2xl border border-slate-800 border-dashed bg-slate-950/50">
                   <p className="text-slate-400 font-medium text-sm">No calls recorded yet</p>
                   <p className="text-xs text-slate-600 mt-1">Make a test call to see it here.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {calls.map((call) => (
                    <div key={call.id} className="group bg-slate-800 p-5 rounded-3xl border border-slate-700 hover:border-slate-600 transition-all shadow-sm">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
                        <div className="flex items-center gap-4">
                          <div className={`h-12 w-12 rounded-2xl flex items-center justify-center shadow-inner ${
                            call.status === 'completed' ? 'bg-blue-500/10 text-blue-400' : 'bg-slate-900 text-slate-500'
                          }`}>
                            <User className="h-6 w-6" />
                          </div>
                          <div>
                            <p className="text-base font-bold text-white tracking-tight">{call.customer_number}</p>
                            <div className="flex items-center gap-3 text-xs text-slate-400 font-medium mt-0.5">
                              <span className="flex items-center gap-1.5"><Calendar className="h-3 w-3" /> {new Date(call.started_at).toLocaleDateString()}</span>
                              <span className="flex items-center gap-1.5"><Clock className="h-3 w-3" /> {new Date(call.started_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                            </div>
                          </div>
                        </div>
                        <div className="self-start flex items-center gap-2">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${
                             call.status === 'completed' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 
                             'bg-red-500/10 text-red-400 border-red-500/20'
                          }`}>
                            {call.status}
                          </span>
                          
                          {/* DELETE BUTTON (GDPR) */}
                          <button 
                            onClick={() => handleDeleteCall(call.id)}
                            className="p-1.5 rounded-lg bg-slate-700/50 hover:bg-red-500/20 hover:text-red-400 text-slate-500 transition-colors"
                            title="Delete Call Log"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/50">
                        <p className="text-xs text-slate-300 leading-relaxed">
                          {call.summary ? call.summary : <span className="italic opacity-50">No summary available.</span>}
                        </p>
                      </div>

                      {call.recording_url && (
                        <AudioPlayer src={call.recording_url} />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* --- SETTINGS SLIDE-OUT --- */}
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
          
          <div className="flex-1 px-6 py-6 space-y-4">
            
            {/* Account Group */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-1">Account</h3>
              <Link href="/dashboard/profile" onClick={() => setIsSettingsOpen(false)} className="flex w-full items-center gap-3 rounded-xl bg-slate-800/50 p-4 border border-slate-800 hover:bg-slate-800 hover:border-slate-700 transition-colors">
                <User className="h-5 w-5 text-blue-400" />
                <div><p className="text-sm font-medium text-white">Profile</p><p className="text-xs text-slate-500">{user?.email}</p></div>
              </Link>
              <Link href="/dashboard/billing" onClick={() => setIsSettingsOpen(false)} className="flex w-full items-center gap-3 rounded-xl bg-slate-800/50 p-4 border border-slate-800 hover:bg-slate-800 hover:border-slate-700 transition-colors">
                <CreditCard className="h-5 w-5 text-blue-400" />
                <div><p className="text-sm font-medium text-white">Billing</p><p className="text-xs text-slate-500">Manage subscription</p></div>
              </Link>
            </div>

            {/* Support Group */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-1">Support</h3>
              
              {/* UPDATED LINK */}
              <Link href="/dashboard/setup-guide" onClick={() => setIsSettingsOpen(false)} className="flex w-full items-center gap-3 rounded-xl bg-slate-800/50 p-4 border border-slate-800 hover:bg-slate-800 hover:border-slate-700 transition-colors">
                <PhoneForwarded className="h-5 w-5 text-green-400" />
                <div><p className="text-sm font-medium text-white">Setup Guide</p><p className="text-xs text-slate-500">How to connect</p></div>
              </Link>

              <Link href="/dashboard/contact" onClick={() => setIsSettingsOpen(false)} className="flex w-full items-center gap-3 rounded-xl bg-slate-800/50 p-4 border border-slate-800 hover:bg-slate-800 hover:border-slate-700 transition-colors">
                <Mail className="h-5 w-5 text-slate-400" />
                <div><p className="text-sm font-medium text-white">Contact Us</p><p className="text-xs text-slate-500">Get help</p></div>
              </Link>
              <Link href="/dashboard/install-guide" onClick={() => setIsSettingsOpen(false)} className="flex w-full items-center gap-3 rounded-xl bg-slate-800/50 p-4 border border-slate-800 hover:bg-slate-800 hover:border-slate-700 transition-colors">
                <Download className="h-5 w-5 text-blue-400" />
                <div><p className="text-sm font-medium text-white">Install App</p><p className="text-xs text-slate-500">Add to home screen</p></div>
              </Link>
            </div>

          </div>

          <div className="border-t border-slate-800 p-6 space-y-4">
            {/* Legal Links */}
            <div className="flex justify-center gap-4 text-[10px] text-slate-600 font-medium">
                <Link href="/terms" className="hover:text-slate-400 transition-colors">Terms of Service</Link>
                <Link href="/privacy" className="hover:text-slate-400 transition-colors">Privacy Policy</Link>
            </div>

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