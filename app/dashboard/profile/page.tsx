'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, User, Mail, Smartphone, Building2, Loader2 } from 'lucide-react';

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    email: '',
    business_name: '',
    business_phone: ''
  });

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }
      setUser(user);

      const { data: profile } = await supabase
        .from('profiles')
        .select('business_name, business_phone')
        .eq('id', user.id)
        .single();

      setFormData({
        email: user.email || '',
        business_name: profile?.business_name || '',
        business_phone: profile?.business_phone || ''
      });
      setLoading(false);
    };
    fetchData();
  }, [router]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          business_name: formData.business_name,
          business_phone: formData.business_phone
        })
        .eq('id', user.id);

      if (error) throw error;
      alert('Profile updated successfully!');
    } catch (err) {
      alert('Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-[#020617] flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>;

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 font-sans p-4 pb-20">
      <div className="max-w-xl mx-auto pt-4">
        <button onClick={() => router.back()} className="flex items-center text-slate-400 hover:text-white mb-6 transition-colors">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </button>
        
        <h1 className="text-2xl font-bold text-white mb-8">Your Profile</h1>

        <div className="space-y-6">
          <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-4">
            
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Email Address</label>
              <div className="flex items-center gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800 text-slate-400">
                <Mail className="h-4 w-4" />
                <span>{formData.email}</span>
                <span className="text-xs bg-slate-800 px-2 py-1 rounded ml-auto">Read-only</span>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Business Name</label>
              <div className="flex items-center gap-3 bg-slate-950 px-3 rounded-xl border border-slate-800 focus-within:border-blue-500 transition-colors">
                <Building2 className="h-4 w-4 text-blue-500" />
                <input 
                  type="text" 
                  value={formData.business_name}
                  onChange={(e) => setFormData({...formData, business_name: e.target.value})}
                  className="bg-transparent py-3 w-full outline-none text-white placeholder-slate-600"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Business Mobile</label>
              <div className="flex items-center gap-3 bg-slate-950 px-3 rounded-xl border border-slate-800 focus-within:border-purple-500 transition-colors">
                <Smartphone className="h-4 w-4 text-purple-500" />
                <input 
                  type="tel" 
                  value={formData.business_phone}
                  onChange={(e) => setFormData({...formData, business_phone: e.target.value})}
                  className="bg-transparent py-3 w-full outline-none text-white placeholder-slate-600"
                  placeholder="+44 7..."
                />
              </div>
            </div>

          </div>

          <button 
            onClick={handleSave}
            disabled={saving}
            className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2 transition-all"
          >
            {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}