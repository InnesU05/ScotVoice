'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Save, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

export default function TrainingPage() {
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  const [formData, setFormData] = useState({
    business_name: '',
    // agent_name removed as requested
    business_description: '',
    opening_hours: '',
    services: '',
    faqs: ''
  });

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push('/login');

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profile) {
        setFormData({
          business_name: profile.business_name || '',
          // No agent_name fetch
          business_description: profile.business_description || '',
          opening_hours: profile.opening_hours || '',
          services: profile.services || '',
          faqs: profile.faqs || ''
        });
      }
      setLoading(false);
    }
    loadData();
  }, [router]);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // 1. Save Training Data to Database
      const { error: dbError } = await supabase
        .from('profiles')
        .update(formData)
        .eq('id', user.id);

      if (dbError) throw dbError;

      // 2. Refresh Agent
      const response = await fetch('/api/update-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, action: 'update_prompt' })
      });

      if (!response.ok) throw new Error('Failed to update agent configuration');

      setMessage({ type: 'success', text: 'Training data saved successfully!' });
      router.refresh();

    } catch (error: any) {
      console.error(error);
      setMessage({ type: 'error', text: error.message || "Failed to save" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-slate-500">Loading training data...</div>;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Train Your AI</h1>
          <p className="text-slate-500">Update your business details instantly.</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {message && (
        <div className={`p-4 rounded-lg mb-6 flex items-center gap-2 ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {message.type === 'success' ? <CheckCircle className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
          {message.text}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Business Name</label>
          <input
            type="text"
            value={formData.business_name}
            onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
            className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">What do you do? (Business Description)</label>
          <textarea
            rows={3}
            value={formData.business_description}
            onChange={(e) => setFormData({ ...formData, business_description: e.target.value })}
            className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Services & Prices</label>
          <textarea
            rows={4}
            value={formData.services}
            onChange={(e) => setFormData({ ...formData, services: e.target.value })}
            className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Opening Hours</label>
          <input
            type="text"
            value={formData.opening_hours}
            onChange={(e) => setFormData({ ...formData, opening_hours: e.target.value })}
            className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">FAQs (Knowledge Base)</label>
          <textarea
            rows={3}
            value={formData.faqs}
            onChange={(e) => setFormData({ ...formData, faqs: e.target.value })}
            className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
    </div>
  );
}