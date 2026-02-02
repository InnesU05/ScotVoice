'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, PhoneForwarded } from 'lucide-react';

export default function SetupGuidePage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 font-sans p-4 pb-20">
      <div className="max-w-xl mx-auto pt-4">
        <button onClick={() => router.back()} className="flex items-center text-slate-400 hover:text-white mb-6 transition-colors">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </button>
        
        <div className="flex items-center gap-3 mb-6">
            <div className="h-10 w-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-900/20">
                <PhoneForwarded className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-bold text-white">Connect Guide</h1>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center">
            <p className="text-slate-400">Loading activation instructions...</p>
        </div>
      </div>
    </div>
  );
}