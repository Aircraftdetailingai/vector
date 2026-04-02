"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const HOUR_COLS = [
  { key: 'ext_wash_hours', label: 'Wash' },
  { key: 'decon_hours', label: 'Decon' },
  { key: 'int_detail_hours', label: 'Interior' },
  { key: 'leather_hours', label: 'Leather' },
  { key: 'carpet_hours', label: 'Carpet' },
  { key: 'wax_hours', label: 'Wax' },
  { key: 'polish_hours', label: 'Polish' },
  { key: 'ceramic_hours', label: 'Ceramic' },
  { key: 'spray_ceramic_hours', label: 'Spray Cer.' },
  { key: 'brightwork_hours', label: 'Bright' },
];

export default function AircraftHoursEditor() {
  const router = useRouter();
  const [aircraft, setAircraft] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [saving, setSaving] = useState({});
  const [dirty, setDirty] = useState({});
  const [toast, setToast] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('vector_token');
    const user = JSON.parse(localStorage.getItem('vector_user') || '{}');
    if (!token || !user.is_admin) { router.push('/dashboard'); return; }

    fetch('/api/aircraft/models', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : { models: [] })
      .then(d => setAircraft(d.models || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [router]);

  const handleChange = (id, col, value) => {
    setAircraft(prev => prev.map(a => a.id === id ? { ...a, [col]: value } : a));
    setDirty(prev => ({ ...prev, [id]: true }));
  };

  const handleSave = async (ac) => {
    setSaving(prev => ({ ...prev, [ac.id]: true }));
    const token = localStorage.getItem('vector_token');
    const updates = {};
    HOUR_COLS.forEach(c => { updates[c.key] = parseFloat(ac[c.key]) || 0; });

    try {
      const res = await fetch('/api/admin/aircraft-hours', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: ac.id, ...updates }),
      });
      if (res.ok) {
        setDirty(prev => ({ ...prev, [ac.id]: false }));
        setToast(`Saved ${ac.manufacturer} ${ac.model}`);
        setTimeout(() => setToast(''), 2000);
      }
    } catch {}
    setSaving(prev => ({ ...prev, [ac.id]: false }));
  };

  const filtered = filter
    ? aircraft.filter(a => a.manufacturer?.toLowerCase().includes(filter.toLowerCase()) || a.model?.toLowerCase().includes(filter.toLowerCase()))
    : aircraft;

  if (loading) return <div className="min-h-screen bg-v-charcoal flex items-center justify-center text-white">Loading...</div>;

  return (
    <div className="min-h-screen bg-v-charcoal p-4 text-white">
      {toast && <div className="fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded z-50 text-sm">{toast}</div>}

      <div className="flex items-center justify-between mb-6">
        <div>
          <a href="/admin" className="text-v-text-secondary text-xs hover:text-white">&larr; Admin</a>
          <h1 className="text-2xl font-light mt-1">Aircraft Hours Editor</h1>
          <p className="text-v-text-secondary text-xs mt-1">{filtered.length} aircraft</p>
        </div>
        <input type="text" value={filter} onChange={e => setFilter(e.target.value)}
          placeholder="Filter by manufacturer or model..."
          className="bg-v-surface border border-v-border rounded px-3 py-2 text-sm w-64 text-white placeholder-v-text-secondary/50 outline-none focus:border-v-gold" />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="border-b border-v-border">
              <th className="text-left py-2 px-2 text-v-text-secondary font-normal sticky left-0 bg-v-charcoal z-10 min-w-[180px]">Aircraft</th>
              {HOUR_COLS.map(c => (
                <th key={c.key} className="text-center py-2 px-1 text-v-text-secondary font-normal min-w-[70px]">{c.label}</th>
              ))}
              <th className="text-center py-2 px-2 min-w-[60px]"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(ac => (
              <tr key={ac.id} className={`border-b border-v-border/30 hover:bg-white/[0.02] ${dirty[ac.id] ? 'bg-v-gold/5' : ''}`}>
                <td className="py-1.5 px-2 sticky left-0 bg-v-charcoal z-10">
                  <span className="text-white text-xs font-medium">{ac.manufacturer}</span>
                  <span className="text-v-text-secondary ml-1">{ac.model}</span>
                </td>
                {HOUR_COLS.map(c => (
                  <td key={c.key} className="py-1 px-1">
                    <input type="number" step="0.1" min="0"
                      value={ac[c.key] || ''}
                      onChange={e => handleChange(ac.id, c.key, e.target.value)}
                      className="w-full bg-transparent border border-transparent hover:border-v-border focus:border-v-gold rounded px-1.5 py-1 text-center text-xs text-white outline-none font-mono" />
                  </td>
                ))}
                <td className="py-1 px-2 text-center">
                  {dirty[ac.id] && (
                    <button onClick={() => handleSave(ac)} disabled={saving[ac.id]}
                      className="text-[9px] uppercase tracking-wider text-v-gold hover:text-v-gold-dim disabled:opacity-50">
                      {saving[ac.id] ? '...' : 'Save'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
