"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const LOCATION_TYPES = [
  { value: 'mobile_rig', label: 'Mobile Rig', icon: '🚐' },
  { value: 'hangar', label: 'Hangar', icon: '✈️' },
  { value: 'fbo', label: 'FBO', icon: '🏢' },
  { value: 'repair_station', label: 'Repair Station', icon: '🔧' },
  { value: 'charter', label: 'Charter Operation', icon: '🛩️' },
  { value: 'part_91', label: 'Part 91', icon: '📋' },
  { value: 'shop', label: 'Shop / Warehouse', icon: '🏪' },
  { value: 'other', label: 'Other', icon: '📦' },
];

const TEMPLATES = [
  { label: 'Mobile Operation', description: 'Single mobile rig setup', items: [{ name: 'Mobile Rig', location_type: 'mobile_rig' }] },
  { label: 'Fixed Location', description: 'Hangar or shop-based', items: [{ name: 'Main Hangar', location_type: 'hangar' }] },
  { label: 'Mixed Operation', description: 'Mobile + fixed location', items: [{ name: 'Mobile Rig', location_type: 'mobile_rig' }, { name: 'Main Hangar', location_type: 'hangar' }] },
];

export default function LocationsPage() {
  const router = useRouter();
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [formData, setFormData] = useState({
    name: '', location_type: 'other', airport_icao: '', address: '', notes: '',
  });

  const getToken = () => localStorage.getItem('vector_token');

  useEffect(() => {
    if (!getToken()) { router.push('/login'); return; }
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    try {
      const res = await fetch('/api/locations', { headers: { Authorization: `Bearer ${getToken()}` } });
      if (res.ok) {
        const data = await res.json();
        setLocations(data.locations || []);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2500); };

  const openAdd = () => {
    setEditing(null);
    setFormData({ name: '', location_type: 'other', airport_icao: '', address: '', notes: '' });
    setShowModal(true);
  };

  const openEdit = (loc) => {
    setEditing(loc);
    setFormData({
      name: loc.name || '',
      location_type: loc.location_type || 'other',
      airport_icao: loc.airport_icao || '',
      address: loc.address || '',
      notes: loc.notes || '',
    });
    setShowModal(true);
  };

  const saveLocation = async () => {
    if (!formData.name.trim()) return;
    setSaving(true);
    try {
      const method = editing ? 'PUT' : 'POST';
      const body = editing ? { id: editing.id, ...formData } : formData;
      const res = await fetch('/api/locations', {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        await fetchLocations();
        setShowModal(false);
        showToast(editing ? 'Location updated' : 'Location added');
      }
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const deleteLocation = async (id) => {
    const res = await fetch(`/api/locations?id=${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (res.ok) {
      setLocations(prev => prev.filter(l => l.id !== id));
      showToast('Location removed');
    }
  };

  const applyTemplate = async (template) => {
    setSaving(true);
    try {
      for (const item of template.items) {
        await fetch('/api/locations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
          body: JSON.stringify(item),
        });
      }
      await fetchLocations();
      showToast(`"${template.label}" template applied`);
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const getTypeInfo = (type) => LOCATION_TYPES.find(t => t.value === type) || LOCATION_TYPES[LOCATION_TYPES.length - 1];

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-2 border-v-gold border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="max-w-3xl">
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-green-900/90 border border-green-500/50 text-green-200 px-4 py-2 rounded-lg shadow-lg text-sm">
          {toast}
        </div>
      )}

      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold text-white">Locations</h2>
          <p className="text-sm text-v-text-secondary">Manage inventory across multiple locations</p>
        </div>
        <button onClick={openAdd} className="px-4 py-2 bg-v-gold text-white rounded-lg hover:bg-v-gold-dim text-sm font-medium">
          + Add Location
        </button>
      </div>

      {/* Quick templates when no locations exist */}
      {locations.length === 0 && (
        <div className="bg-v-surface border border-v-border/40 rounded-lg p-6 mb-6">
          <h3 className="text-sm font-medium text-white mb-1">Quick Setup</h3>
          <p className="text-xs text-v-text-secondary mb-4">Choose a template to get started quickly</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {TEMPLATES.map(t => (
              <button
                key={t.label}
                onClick={() => applyTemplate(t)}
                disabled={saving}
                className="p-4 bg-v-charcoal border border-v-border rounded-lg hover:border-v-gold hover:bg-v-gold/5 transition-all text-left disabled:opacity-50"
              >
                <p className="font-medium text-white text-sm">{t.label}</p>
                <p className="text-xs text-v-text-secondary mt-1">{t.description}</p>
                <div className="flex gap-1 mt-2">
                  {t.items.map((item, i) => {
                    const info = getTypeInfo(item.location_type);
                    return <span key={i} className="text-xs bg-v-surface px-2 py-0.5 rounded">{info.icon} {item.name}</span>;
                  })}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Location cards */}
      <div className="space-y-3">
        {locations.map(loc => {
          const info = getTypeInfo(loc.location_type);
          return (
            <div key={loc.id} className="bg-v-surface border border-v-border/40 rounded-lg p-4 hover:border-v-gold/30 transition-all">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{info.icon}</span>
                  <div>
                    <h3 className="font-medium text-white">{loc.name}</h3>
                    <p className="text-xs text-v-text-secondary">{info.label}</p>
                    {loc.airport_icao && (
                      <span className="inline-block mt-1 px-2 py-0.5 bg-blue-900/30 text-blue-400 rounded text-[10px] font-mono">
                        {loc.airport_icao}
                      </span>
                    )}
                    {loc.address && <p className="text-xs text-gray-500 mt-1">{loc.address}</p>}
                    {loc.notes && <p className="text-xs text-gray-600 mt-1 italic">{loc.notes}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!loc.active && (
                    <span className="px-2 py-0.5 bg-red-900/30 text-red-400 rounded text-[10px]">Inactive</span>
                  )}
                  <button onClick={() => openEdit(loc)} className="p-1.5 text-v-text-secondary hover:text-blue-400 hover:bg-blue-900/20 rounded text-sm">
                    &#9998;
                  </button>
                  <button onClick={() => deleteLocation(loc.id)} className="p-1.5 text-v-text-secondary hover:text-red-400 hover:bg-red-900/20 rounded text-sm">
                    &#128465;
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {locations.length > 0 && (
        <p className="text-xs text-gray-600 mt-4">
          Assign products and equipment to locations from the Products and Equipment pages.
        </p>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
          <div className="bg-v-surface border border-v-border rounded-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-white mb-4">{editing ? 'Edit Location' : 'Add Location'}</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-v-text-secondary mb-1">Name *</label>
                <input
                  value={formData.name}
                  onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                  className="w-full bg-v-charcoal border border-v-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-v-gold"
                  placeholder="e.g. Main Hangar, Mobile Rig 1"
                />
              </div>

              <div>
                <label className="block text-xs text-v-text-secondary mb-1">Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {LOCATION_TYPES.map(t => (
                    <button
                      key={t.value}
                      onClick={() => setFormData(p => ({ ...p, location_type: t.value }))}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all ${
                        formData.location_type === t.value
                          ? 'border-v-gold bg-v-gold/10 text-v-gold'
                          : 'border-v-border text-v-text-secondary hover:border-v-gold/30'
                      }`}
                    >
                      <span>{t.icon}</span>
                      <span>{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs text-v-text-secondary mb-1">Airport ICAO (optional)</label>
                <input
                  value={formData.airport_icao}
                  onChange={e => setFormData(p => ({ ...p, airport_icao: e.target.value.toUpperCase() }))}
                  className="w-full bg-v-charcoal border border-v-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-v-gold font-mono"
                  placeholder="KJFK"
                  maxLength={4}
                />
              </div>

              <div>
                <label className="block text-xs text-v-text-secondary mb-1">Address (optional)</label>
                <input
                  value={formData.address}
                  onChange={e => setFormData(p => ({ ...p, address: e.target.value }))}
                  className="w-full bg-v-charcoal border border-v-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-v-gold"
                  placeholder="123 Airport Rd, Hangar B"
                />
              </div>

              <div>
                <label className="block text-xs text-v-text-secondary mb-1">Notes (optional)</label>
                <textarea
                  value={formData.notes}
                  onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))}
                  className="w-full bg-v-charcoal border border-v-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-v-gold resize-none"
                  rows={2}
                  placeholder="Access codes, hours, etc."
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border border-v-border text-v-text-secondary rounded-lg hover:bg-white/5 text-sm">
                Cancel
              </button>
              <button onClick={saveLocation} disabled={saving || !formData.name.trim()} className="flex-1 px-4 py-2 bg-v-gold text-white rounded-lg hover:bg-v-gold-dim text-sm font-medium disabled:opacity-50">
                {saving ? 'Saving...' : editing ? 'Update' : 'Add Location'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
