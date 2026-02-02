'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Send, MessageSquare } from 'lucide-react';

export default function ContactPage() {
  const router = useRouter();
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSent(true);
    // Here you would connect to an API to send the email
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 font-sans p-4 pb-20">
      <div className="max-w-xl mx-auto pt-4">
        <button onClick={() => router.back()} className="flex items-center text-slate-400 hover:text-white mb-6 transition-colors">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </button>
        
        <h1 className="text-2xl font-bold text-white mb-2">Contact Support</h1>
        <p className="text-slate-400 text-sm mb-8">Having trouble? Send us a message and we'll help you out.</p>

        {sent ? (
          <div className="bg-green-500/10 border border-green-500/20 p-8 rounded-2xl text-center">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4 text-white">
              <Send className="h-8 w-8" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Message Sent!</h2>
            <p className="text-slate-400">We'll get back to you shortly.</p>
            <button onClick={() => router.back()} className="mt-6 text-green-400 font-bold hover:underline">Return to Dashboard</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Subject</label>
                <input type="text" required className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none" placeholder="e.g. Issue with my number" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Message</label>
                <textarea required rows={5} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none resize-none" placeholder="Describe your issue..." />
              </div>
            </div>

            <button type="submit" className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2 transition-all">
              <Send className="h-5 w-5" /> Send Message
            </button>
          </form>
        )}
        
        <div className="mt-8 text-center">
            <p className="text-slate-500 text-sm">Or email us directly at <a href="mailto:hello@nessdial.ai" className="text-blue-400 hover:underline">hello@nessdial.ai</a></p>
        </div>
      </div>
    </div>
  );
}