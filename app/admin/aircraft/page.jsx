"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const categories = [
  { value: 'piston', label: 'Piston' },
  { value: 'turboprop', label: 'Turboprop' },
  { value: 'light_jet', label: 'Light Jet' },
  { value: 'midsize_jet', label: 'Midsize Jet' },
  { value: 'super_midsize_jet', label: 'Super Midsize Jet' },
  { value: 'large_jet', label: 'Large Jet' },
  { value: 'helicopter', label: 'Helicopter' },
];

export default function AdminAircraftPage() {
  const router = useRouter();
  const [aircraft, setAircraft] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ category: '', manufacturer: '' });
  const [manufacturers, setManufacturers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingAircraft, setEditingAircraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [bulkImport, setBulkImport] = useState('');
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [importResult, setImportResult] = useState(null);

  const [formData, setFormData] = useState({
    manufacturer: '',
    model: '',
    category: 'piston',
    seats: '',
    wingspan_ft: '',
    length_ft: '',
    height_ft: '',
    surface_area_sqft: '',
    exterior_hours: '',
    interior_hours: '',
  });

  useEffect(() => {
    const token = localStorage.getItem('vector_token');
    if (!token) {
      router.push('/');
      return;
    }
    fetchAircraft();
    fetchManufacturers();
  }, []);

  const fetchAircraft = async () => {
    try {
      const token = localStorage.getItem('vector_token');
      const params = new URLSearchParams();
      if (filter.category) params.set('category', filter.category);
      if (filter.manufacturer) params.set('manufacturer', filter.manufacturer);

      const res = await fetch(`/api/admin/aircraft?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAircraft(data.aircraft || []);
      }
    } catch (err) {
      console.error('Failed to fetch aircraft:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchManufacturers = async () => {
    try {
      const res = await fetch('/api/aircraft/manufacturers');
      if (res.ok) {
        const data = await res.json();
        setManufacturers(data.manufacturers || []);
      }
    } catch (err) {
      console.error('Failed to fetch manufacturers:', err);
    }
  };

  useEffect(() => {
    fetchAircraft();
  }, [filter]);

  const openAddModal = () => {
    setEditingAircraft(null);
    setFormData({
      manufacturer: '',
      model: '',
      category: 'piston',
      seats: '',
      wingspan_ft: '',
      length_ft: '',
      height_ft: '',
      surface_area_sqft: '',
      exterior_hours: '',
      interior_hours: '',
    });
    setShowModal(true);
  };

  const openEditModal = (ac) => {
    setEditingAircraft(ac);
    setFormData({
      manufacturer: ac.manufacturer || '',
      model: ac.model || '',
      category: ac.category || 'piston',
      seats: ac.seats?.toString() || '',
      wingspan_ft: ac.wingspan_ft?.toString() || '',
      length_ft: ac.length_ft?.toString() || '',
      height_ft: ac.height_ft?.toString() || '',
      surface_area_sqft: ac.surface_area_sqft?.toString() || '',
      exterior_hours: ac.exterior_hours?.toString() || '',
      interior_hours: ac.interior_hours?.toString() || '',
    });
    setShowModal(true);
  };

  const saveAircraft = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('vector_token');
      const payload = {
        ...formData,
        seats: parseInt(formData.seats) || 0,
        wingspan_ft: parseFloat(formData.wingspan_ft) || 0,
        length_ft: parseFloat(formData.length_ft) || 0,
        height_ft: parseFloat(formData.height_ft) || 0,
        surface_area_sqft: parseFloat(formData.surface_area_sqft) || 0,
        exterior_hours: parseFloat(formData.exterior_hours) || 0,
        interior_hours: parseFloat(formData.interior_hours) || 0,
      };

      if (editingAircraft) {
        payload.id = editingAircraft.id;
      }

      const res = await fetch('/api/admin/aircraft', {
        method: editingAircraft ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setShowModal(false);
        fetchAircraft();
        fetchManufacturers();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to save');
      }
    } catch (err) {
      alert('Failed to save aircraft');
    } finally {
      setSaving(false);
    }
  };

  const deleteAircraft = async (id) => {
    if (!confirm('Delete this aircraft?')) return;

    try {
      const token = localStorage.getItem('vector_token');
      const res = await fetch(`/api/admin/aircraft?id=${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        fetchAircraft();
      }
    } catch (err) {
      alert('Failed to delete');
    }
  };

  const handleBulkImport = async () => {
    try {
      const lines = bulkImport.trim().split('\n');
      const aircraftList = [];

      for (const line of lines) {
        const parts = line.split(',').map(p => p.trim());
        if (parts.length >= 2) {
          aircraftList.push({
            manufacturer: parts[0],
            model: parts[1],
            category: parts[2] || 'piston',
            seats: parseInt(parts[3]) || 0,
            surface_area_sqft: parseFloat(parts[4]) || 0,
            exterior_hours: parseFloat(parts[5]) || 0,
            interior_hours: parseFloat(parts[6]) || 0,
          });
        }
      }

      if (aircraftList.length === 0) {
        alert('No valid aircraft found in input');
        return;
      }

      const token = localStorage.getItem('vector_token');
      const res = await fetch('/api/admin/aircraft', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ aircraft: aircraftList }),
      });

      if (res.ok) {
        const data = await res.json();
        setImportResult(`Successfully imported ${data.count} aircraft`);
        fetchAircraft();
        fetchManufacturers();
        setBulkImport('');
      } else {
        const data = await res.json();
        setImportResult(`Error: ${data.error}`);
      }
    } catch (err) {
      setImportResult(`Error: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <a href="/dashboard" className="text-2xl text-gray-600 hover:text-gray-900">&larr;</a>
            <h1 className="text-2xl font-bold">Aircraft Database</h1>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowBulkModal(true)}
              className="px-4 py-2 border rounded hover:bg-gray-50"
            >
              Bulk Import
            </button>
            <button
              onClick={openAddModal}
              className="px-4 py-2 bg-amber-500 text-white rounded hover:bg-amber-600"
            >
              + Add Aircraft
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-7xl mx-auto mb-4">
        <div className="bg-white rounded-lg shadow p-4 flex gap-4">
          <select
            value={filter.category}
            onChange={(e) => setFilter({ ...filter, category: e.target.value })}
            className="border rounded px-3 py-2"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.value} value={cat.value}>{cat.label}</option>
            ))}
          </select>
          <select
            value={filter.manufacturer}
            onChange={(e) => setFilter({ ...filter, manufacturer: e.target.value })}
            className="border rounded px-3 py-2"
          >
            <option value="">All Manufacturers</option>
            {manufacturers.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <span className="text-gray-500 self-center">{aircraft.length} aircraft</span>
        </div>
      </div>

      {/* Aircraft Table */}
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Manufacturer</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Model</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Seats</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Surface Area</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ext Hours</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Int Hours</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {aircraft.map((ac) => (
                  <tr key={ac.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{ac.manufacturer}</td>
                    <td className="px-4 py-3">{ac.model}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 bg-gray-100 rounded text-xs">
                        {categories.find(c => c.value === ac.category)?.label || ac.category}
                      </span>
                    </td>
                    <td className="px-4 py-3">{ac.seats || '-'}</td>
                    <td className="px-4 py-3">{ac.surface_area_sqft ? `${ac.surface_area_sqft} sqft` : '-'}</td>
                    <td className="px-4 py-3">{ac.exterior_hours || '-'}</td>
                    <td className="px-4 py-3">{ac.interior_hours || '-'}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => openEditModal(ac)}
                        className="text-blue-600 hover:underline text-sm mr-2"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteAircraft(ac.id)}
                        className="text-red-600 hover:underline text-sm"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">
              {editingAircraft ? 'Edit Aircraft' : 'Add Aircraft'}
            </h3>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Manufacturer *</label>
                  <input
                    type="text"
                    value={formData.manufacturer}
                    onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                    placeholder="Cessna"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Model *</label>
                  <input
                    type="text"
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                    placeholder="Citation CJ3"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  >
                    {categories.map((cat) => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Seats</label>
                  <input
                    type="number"
                    value={formData.seats}
                    onChange={(e) => setFormData({ ...formData, seats: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Wingspan (ft)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.wingspan_ft}
                    onChange={(e) => setFormData({ ...formData, wingspan_ft: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Length (ft)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.length_ft}
                    onChange={(e) => setFormData({ ...formData, length_ft: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Height (ft)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.height_ft}
                    onChange={(e) => setFormData({ ...formData, height_ft: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Surface Area (sqft)</label>
                <input
                  type="number"
                  value={formData.surface_area_sqft}
                  onChange={(e) => setFormData({ ...formData, surface_area_sqft: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Exterior Hours (default)</label>
                  <input
                    type="number"
                    step="0.25"
                    value={formData.exterior_hours}
                    onChange={(e) => setFormData({ ...formData, exterior_hours: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Interior Hours (default)</label>
                  <input
                    type="number"
                    step="0.25"
                    value={formData.interior_hours}
                    onChange={(e) => setFormData({ ...formData, interior_hours: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 border rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={saveAircraft}
                disabled={saving || !formData.manufacturer || !formData.model}
                className="px-4 py-2 bg-amber-500 text-white rounded hover:bg-amber-600 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
            <h3 className="text-lg font-semibold mb-4">Bulk Import Aircraft</h3>

            <p className="text-sm text-gray-600 mb-2">
              Paste aircraft data in CSV format. Each line should have:
            </p>
            <p className="text-xs font-mono bg-gray-100 p-2 rounded mb-4">
              Manufacturer, Model, Category, Seats, Surface Area, Ext Hours, Int Hours
            </p>

            <textarea
              value={bulkImport}
              onChange={(e) => setBulkImport(e.target.value)}
              className="w-full border rounded px-3 py-2 font-mono text-sm"
              rows={10}
              placeholder="Cessna, Citation CJ3, light_jet, 9, 650, 4, 5
Gulfstream, G650, large_jet, 19, 2400, 12, 16
..."
            />

            {importResult && (
              <div className={`mt-2 p-2 rounded text-sm ${
                importResult.startsWith('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
              }`}>
                {importResult}
              </div>
            )}

            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => {
                  setShowBulkModal(false);
                  setImportResult(null);
                }}
                className="px-4 py-2 border rounded hover:bg-gray-50"
              >
                Close
              </button>
              <button
                onClick={handleBulkImport}
                disabled={!bulkImport.trim()}
                className="px-4 py-2 bg-amber-500 text-white rounded hover:bg-amber-600 disabled:opacity-50"
              >
                Import
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
