'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { 
  Settings, 
  Phone, 
  Clock, 
  TrendingUp, 
  MoreVertical, 
  Play, 
  User, 
  Activity,
  X,
  CreditCard,
  LogOut,
  ChevronRight
} from 'lucide-react';

export default function Dashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [recentCalls, setRecentCalls] = useState<any[]>([]);
  
  // Dummy Stats (We will link these to real Vapi data later)
  const stats = [
    { label: 'Total Calls', value: '12', change: '+20%', icon: Phone, color: 'bg-blue-500/10 text-blue-600' },
    { label: 'Minutes Used', value: '48m', change: '+12%', icon: Clock, color: 'bg-green-500/10 text-green-600' },
    { label: 'Leads Capture', value: '5', change: '+5%', icon: TrendingUp, color: 'bg-purple-500/10 text-purple-600' },
  ];

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUser(user);
      
      // Fetch recent calls (Mocking this for now, but ready for Supabase 'calls' table)
      // In a real scenario, you'd fetch from your 'calls' table here.
      setRecentCalls([
        { id: 1, name: 'Unknown Caller', status: 'Completed', duration: '2m 14s', time: '10:42 AM' },
        { id: 2, name: 'Dave Smith', status: 'Missed', duration: '0s', time: 'Yesterday' },
        { id: 3, name: '+44 7700 900077', status: 'Voicemail', duration: '45s', time: 'Mon' },
      ]);
      
      setLoading(false);
    };

    checkUser();
  }, [router]);

  if (loading) return (
    <div className="flex h-screen w-full items-center justify-center bg-gray-50">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-black"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F9FAFB] text-gray-900 font-sans">
      
      {/* --- HEADER --- */}
      <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-gray-100 bg-white/80 px-6 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-black text-white font-bold">
            N
          </div>
          <span className="text-lg font-semibold tracking-tight">NessDial</span>
        </div>
        
        <button 
          onClick={() => setIsSettingsOpen(true)}
          className="rounded-full p-2 text-gray-500 hover:bg-gray-100 transition-colors"
        >
          <Settings className="h-6 w-6" />
        </button>
      </header>

      {/* --- MAIN CONTENT --- */}
      <main className="mx-auto max-w-4xl px-4 py-8 pb-24">
        
        {/* WELCOME */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Overview
          </h1>
          <p className="text-sm text-gray-500">
            Welcome back, {user?.email}
          </p>
        </div>

        {/* KPI CARDS (Mobile: Stacked, Desktop: Grid) */}
        <div className="grid gap-4 sm:grid-cols-3 mb-8">
          {stats.map((stat, i) => (
            <div key={i} className="relative overflow-hidden rounded-2xl bg-white p-6 shadow-sm border border-gray-100 transition-all hover:shadow-md">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">{stat.label}</p>
                  <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900">{stat.value}</p>
                </div>
                <div className={`rounded-xl p-3 ${stat.color}`}>
                  <stat.icon className="h-6 w-6" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-xs font-medium text-green-600">
                <span>{stat.change} from last week</span>
              </div>
            </div>
          ))}
        </div>

        {/* ACTION GRID */}
        <div className="mb-8">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            <button className="flex flex-col items-center justify-center gap-3 rounded-2xl bg-black p-6 text-white shadow-lg shadow-gray-200 transition-transform active:scale-95">
              <Play className="h-6 w-6 fill-current" />
              <span className="text-sm font-medium">Test Call</span>
            </button>
            <button className="flex flex-col items-center justify-center gap-3 rounded-2xl bg-white p-6 text-gray-900 shadow-sm border border-gray-100 transition-transform active:scale-95 hover:bg-gray-50">
              <Activity className="h-6 w-6 text-blue-600" />
              <span className="text-sm font-medium">Live Monitor</span>
            </button>
          </div>
        </div>

        {/* RECENT ACTIVITY LIST */}
        <div className="rounded-3xl bg-white p-6 shadow-sm border border-gray-100">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Recent Calls</h2>
            <button className="text-sm font-medium text-blue-600 hover:text-blue-700">View All</button>
          </div>
          
          <div className="space-y-1">
            {recentCalls.map((call) => (
              <div key={call.id} className="group flex items-center justify-between rounded-xl p-3 hover:bg-gray-50 transition-colors cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
                    call.status === 'Missed' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'
                  }`}>
                    <Phone className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{call.name}</p>
                    <p className="text-xs text-gray-500">{call.time} • {call.duration}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    call.status === 'Completed' ? 'bg-green-100 text-green-800' :
                    call.status === 'Missed' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {call.status}
                  </span>
                  <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-gray-500" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* --- SETTINGS SLIDE-OVER --- */}
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 z-40 bg-black/20 backdrop-blur-sm transition-opacity duration-300 ${
          isSettingsOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsSettingsOpen(false)}
      />

      {/* Slide-out Panel */}
      <div 
        className={`fixed inset-y-0 right-0 z-50 w-full max-w-sm bg-white shadow-2xl transition-transform duration-300 ease-in-out ${
          isSettingsOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5">
            <h2 className="text-xl font-bold text-gray-900">Settings</h2>
            <button 
              onClick={() => setIsSettingsOpen(false)}
              className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Content (Placeholder for now) */}
          <div className="flex-1 overflow-y-auto px-6 py-6">
            <div className="space-y-6">
              
              {/* Profile Section */}
              <section>
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">Account</h3>
                <div className="space-y-2">
                  <button className="flex w-full items-center gap-3 rounded-xl bg-gray-50 p-4 text-left transition-colors hover:bg-gray-100">
                    <User className="h-5 w-5 text-gray-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Profile Details</p>
                      <p className="text-xs text-gray-500">Update name & email</p>
                    </div>
                  </button>
                  <button className="flex w-full items-center gap-3 rounded-xl bg-gray-50 p-4 text-left transition-colors hover:bg-gray-100">
                    <CreditCard className="h-5 w-5 text-gray-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Subscription</p>
                      <p className="text-xs text-gray-500">Manage plan & billing</p>
                    </div>
                  </button>
                </div>
              </section>

              {/* Assistant Settings */}
              <section>
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">Assistant</h3>
                <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
                  <p className="text-sm text-gray-500">
                    AI Persona settings will go here.
                  </p>
                </div>
              </section>

            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-100 p-6">
            <button 
              onClick={async () => {
                await supabase.auth.signOut();
                router.push('/login');
              }}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white p-4 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 hover:border-red-100"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}