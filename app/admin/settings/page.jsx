"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [inviteOnly, setInviteOnly] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('vector_token');
    if (!token) { router.push('/login'); return; }

    const user = JSON.parse(localStorage.getItem('vector_user') || '{}');
    if (!user.is_admin) { router.push('/dashboard'); return; }

    fetch('/api/admin/settings', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : Promise.reject('Failed to load'))
      .then(data => {
        setInviteOnly(data.invite_only);
      })
      .catch(e => setError(typeof e === 'string' ? e : e.message))
      .finally(() => setLoading(false));
  }, [router]);

  const handleToggle = async (value) => {
    setInviteOnly(value);
    setSaving(true);
    setSaveSuccess(false);
    try {
      const token = localStorage.getItem('vector_token');
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ invite_only: value }),
      });
      if (!res.ok) throw new Error('Failed to save');
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e) {
      setError(e.message);
      setInviteOnly(!value); // revert
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-v-charcoal">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <button onClick={() => router.push('/admin')} className="text-v-text-secondary hover:text-v-text-primary transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
          </button>
          <div>
            <h1 className="text-2xl font-heading text-v-text-primary tracking-wide">Admin Settings</h1>
            <p className="text-sm text-v-text-secondary mt-0.5">Platform-wide configuration</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-v-gold border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="bg-red-500/10 border border-red-500/30 rounded-sm p-6 text-center">
            <p className="text-red-400">{error}</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Signup Settings */}
            <div className="bg-v-surface border border-v-border rounded-sm p-6">
              <h2 className="text-xs font-medium uppercase tracking-widest text-v-gold mb-4 pb-2 border-b border-v-gold/20">Signup</h2>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-v-text-primary font-medium">Invite-only signup</p>
                  <p className="text-xs text-v-text-secondary mt-1">
                    {inviteOnly
                      ? 'Only users with a valid invite token can create an account.'
                      : 'Anyone can sign up without an invite token.'}
                  </p>
                </div>
                <button
                  onClick={() => handleToggle(!inviteOnly)}
                  disabled={saving}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    inviteOnly ? 'bg-v-gold' : 'bg-v-border'
                  } ${saving ? 'opacity-50' : ''}`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      inviteOnly ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {saveSuccess && (
                <div className="mt-4 bg-green-500/10 border border-green-500/30 rounded-sm px-4 py-2">
                  <p className="text-green-400 text-xs">Setting saved successfully</p>
                </div>
              )}
            </div>

            {/* Info */}
            <div className="bg-v-surface border border-v-border rounded-sm p-6">
              <h2 className="text-xs font-medium uppercase tracking-widest text-v-gold mb-4 pb-2 border-b border-v-gold/20">Info</h2>
              <div className="space-y-3 text-xs text-v-text-secondary">
                <p><strong className="text-v-text-primary">Invite-only ON:</strong> Users must have a valid beta invite token (from /admin/beta-invites) to sign up. The invite determines their plan and trial duration.</p>
                <p><strong className="text-v-text-primary">Invite-only OFF:</strong> Anyone can sign up with a free plan and a 14-day trial. Invite tokens still work and grant the specified plan/duration when used.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
