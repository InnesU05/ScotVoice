'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Share, PlusSquare, MoreVertical, Smartphone, Download } from 'lucide-react';

export default function InstallGuidePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'ios' | 'android'>('ios');

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 font-sans p-4 pb-20">
      <div className="max-w-xl mx-auto pt-4">
        <button onClick={() => router.back()} className="flex items-center text-slate-400 hover:text-white mb-6 transition-colors">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </button>
        
        <h1 className="text-2xl font-bold text-white mb-2">Install App</h1>
        <p className="text-slate-400 text-sm mb-8">Add NessDial to your home screen for quick access without a browser.</p>

        {/* Device Toggle */}
        <div className="flex p-1 bg-slate-900 rounded-xl mb-8 border border-slate-800">
          <button 
            onClick={() => setActiveTab('ios')}
            className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all ${
              activeTab === 'ios' ? 'bg-slate-800 text-white shadow-sm ring-1 ring-white/5' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            iPhone (Safari)
          </button>
          <button 
            onClick={() => setActiveTab('android')}
            className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all ${
              activeTab === 'android' ? 'bg-slate-800 text-white shadow-sm ring-1 ring-white/5' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            Android (Chrome)
          </button>
        </div>

        {/* Steps */}
        <div className="space-y-4">
          
          {activeTab === 'ios' ? (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 flex items-start gap-4">
                <div className="h-8 w-8 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center font-bold shrink-0 text-sm">1</div>
                <div>
                  <p className="font-bold text-white text-sm mb-1">Tap the Share Button</p>
                  <p className="text-xs text-slate-400 mb-3">Look for the square icon with an arrow at the bottom of your screen.</p>
                  <div className="bg-slate-950 p-2 rounded-lg inline-block border border-slate-800">
                    <Share className="h-5 w-5 text-blue-500" />
                  </div>
                </div>
              </div>

              <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 flex items-start gap-4">
                <div className="h-8 w-8 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center font-bold shrink-0 text-sm">2</div>
                <div>
                  <p className="font-bold text-white text-sm mb-1">Scroll down & tap 'Add to Home Screen'</p>
                  <p className="text-xs text-slate-400 mb-3">You might need to scroll down a bit to find it.</p>
                  <div className="flex items-center gap-2 text-slate-300 text-xs font-medium bg-slate-950 px-3 py-2 rounded-lg border border-slate-800 w-fit">
                    <PlusSquare className="h-4 w-4" /> Add to Home Screen
                  </div>
                </div>
              </div>

              <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 flex items-start gap-4">
                <div className="h-8 w-8 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center font-bold shrink-0 text-sm">3</div>
                <div>
                  <p className="font-bold text-white text-sm mb-1">Tap 'Add'</p>
                  <p className="text-xs text-slate-400">Confirm by tapping Add in the top right corner.</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 flex items-start gap-4">
                <div className="h-8 w-8 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center font-bold shrink-0 text-sm">1</div>
                <div>
                  <p className="font-bold text-white text-sm mb-1">Tap the Menu Icon</p>
                  <p className="text-xs text-slate-400 mb-3">Look for the three dots in the top right corner of Chrome.</p>
                  <div className="bg-slate-950 p-2 rounded-lg inline-block border border-slate-800">
                    <MoreVertical className="h-5 w-5 text-green-500" />
                  </div>
                </div>
              </div>

              <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 flex items-start gap-4">
                <div className="h-8 w-8 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center font-bold shrink-0 text-sm">2</div>
                <div>
                  <p className="font-bold text-white text-sm mb-1">Tap 'Install App' or 'Add to Home screen'</p>
                  <p className="text-xs text-slate-400 mb-3">The wording depends on your Android version.</p>
                  <div className="flex items-center gap-2 text-slate-300 text-xs font-medium bg-slate-950 px-3 py-2 rounded-lg border border-slate-800 w-fit">
                    <Smartphone className="h-4 w-4" /> Install App
                  </div>
                </div>
              </div>

              <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 flex items-start gap-4">
                <div className="h-8 w-8 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center font-bold shrink-0 text-sm">3</div>
                <div>
                  <p className="font-bold text-white text-sm mb-1">Confirm Installation</p>
                  <p className="text-xs text-slate-400">Follow the prompt to add it to your home screen.</p>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}