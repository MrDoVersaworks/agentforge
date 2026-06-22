'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Settings, Shield } from 'lucide-react';

interface GlobalSettings {
  [key: string]: unknown;
  google_analytics_id: string;
  termly_uuid: string;
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<GlobalSettings>({ google_analytics_id: '', termly_uuid: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const token = typeof window !== 'undefined' ? (localStorage.getItem('access_token') ? localStorage.getItem('access_token') : (sessionStorage.getItem('token') ? sessionStorage.getItem('token') : '')) : '';
        const resObj = await fetch('/api/admin/settings', { headers: { Authorization: `Bearer ${token}` } });
        if (!resObj.ok) throw new Error('Failed to fetch');
        const res = await resObj.json();
        setSettings(res.data ? res.data : { google_analytics_id: '', termly_uuid: '' });
      } catch (err) {
        toast.error('Failed to load settings');
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const token = typeof window !== 'undefined' ? (localStorage.getItem('access_token') ? localStorage.getItem('access_token') : (sessionStorage.getItem('token') ? sessionStorage.getItem('token') : '')) : '';
      const resObj = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(settings)
      });
      if (!resObj.ok) throw new Error('Failed to save');
      toast.success('Global settings updated successfully');
    } catch (err) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#05050a]">
        <div className="w-8 h-8 border-4 border-[#6c5ce7] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const inputClass = "w-full bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-lg p-2.5 text-[var(--admin-text)] focus:border-[#6c5ce7] focus:ring-1 focus:ring-[#6c5ce7] outline-none transition-colors";
  const labelClass = "block text-sm font-medium text-[#8a99ad] mb-1.5";

  return (
    <div className="min-h-screen bg-[#05050a] text-[var(--admin-text)] p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="border-b border-[rgba(108,92,231,0.25)] pb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="w-6 h-6 text-[#6c5ce7]" />
            Global Platform Settings
          </h1>
          <p className="text-[#8a99ad] mt-2">Manage infrastructure, legal, and analytics integrations.</p>
        </header>

        <form onSubmit={handleSave} className="space-y-8">
          <section className="bg-[rgba(10,15,30,0.8)] border border-[rgba(108,92,231,0.15)] rounded-xl p-6 shadow-sm">
            <h2 className="text-xl font-semibold flex items-center gap-2 mb-6">
              <Shield className="w-5 h-5 text-blue-500" /> Legal & Analytics
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className={labelClass}>Google Analytics ID (GA4)</label>
                <input 
                  type="text"
                  value={settings.google_analytics_id ? settings.google_analytics_id : ''}
                  onChange={(e) => setSettings({...settings, google_analytics_id: e.target.value})}
                  placeholder="G-XXXXXXXXXX" 
                  className={inputClass} 
                />
                <p className="text-xs text-[#8a99ad] mt-1">Your GA4 Measurement ID.</p>
              </div>
              <div>
                <label className={labelClass}>Termly UUID</label>
                <input 
                  type="text"
                  value={settings.termly_uuid ? settings.termly_uuid : ''}
                  onChange={(e) => setSettings({...settings, termly_uuid: e.target.value})}
                  placeholder="UUID..." 
                  className={inputClass} 
                />
                <p className="text-xs text-[#8a99ad] mt-1">Cookie consent banner UUID.</p>
              </div>
            </div>
          </section>

          <button 
            type="submit" 
            disabled={saving}
            className="px-8 py-3 bg-[#6c5ce7] hover:bg-[#5a4bcf] disabled:opacity-50 text-[var(--admin-text)] rounded-lg font-semibold shadow-lg shadow-[#6c5ce7]/25 transition-all"
          >
            {saving ? 'Saving...' : 'Save Global Settings'}
          </button>
        </form>
      </div>
    </div>
  );
}
