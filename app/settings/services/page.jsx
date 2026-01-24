"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const SERVICE_CATEGORIES = [
  { value: 'exterior', label: 'Exterior' },
  { value: 'interior', label: 'Interior' },
  { value: 'carpet', label: 'Carpet' },
  { value: 'leather', label: 'Leather' },
  { value: 'engine', label: 'Engine' },
  { value: 'other', label: 'Other' },
];

export default function ServicesPage() {
  const router = useRouter();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingService, setEditingService] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newService, setNewService] = useState({
    service_name: '',
    category: 'exterior',
    hourly_rate: 75,
    default_hours: 1,
    requires_return_trip: false,
  });

  useEffect(() => {
    const token = localStorage.getItem('vector_token');
    if (!token) {
      router.push('/');
      return;
    }
    fetchServices(token);
  }, [router]);

  const fetchServices = async (token) => {
    try {
      const res = await fetch('/api/user/services', {
        headers: { Authorization: `Bearer ${token || localStorage.getItem('vector_token')}` },
      });
      if (res.ok) {
        const data = await res.json();
        setServices(data.services || []);
      }
    } catch (err) {
      console.error('Failed to fetch services:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleServiceEnabled = async (service) => {
    const token = localStorage.getItem('vector_token');
    try {
      const res = await fetch(`/api/user/services/${service.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ enabled: !service.enabled }),
      });
      if (res.ok) {
        setServices(services.map(s => s.id === service.id ? { ...s, enabled: !s.enabled } : s));
      }
    } catch (err) {
      console.error('Failed to toggle service:', err);
    }
  };

  const saveService = async (service) => {
    setSaving(true);
    const token = localStorage.getItem('vector_token');
    try {
      const res = await fetch(`/api/user/services/${service.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(service),
      });
      if (res.ok) {
        const data = await res.json();
        setServices(services.map(s => s.id === service.id ? data.service : s));
        setEditingService(null);
      }
    } catch (err) {
      console.error('Failed to save service:', err);
    } finally {
      setSaving(false);
    }
  };

  const addService = async () => {
    if (!newService.service_name || !newService.hourly_rate) return;
    setSaving(true);
    const token = localStorage.getItem('vector_token');
    try {
      const res = await fetch('/api/user/services', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newService),
      });
      if (res.ok) {
        const data = await res.json();
        setServices([...services, data.service]);
        setShowAddModal(false);
        setNewService({
          service_name: '',
          category: 'exterior',
          hourly_rate: 75,
          default_hours: 1,
          requires_return_trip: false,
        });
      }
    } catch (err) {
      console.error('Failed to add service:', err);
    } finally {
      setSaving(false);
    }
  };

  const deleteService = async (service) => {
    if (!service.is_custom) return;
    if (!confirm(`Delete "${service.service_name}"?`)) return;
    const token = localStorage.getItem('vector_token');
    try {
      const res = await fetch(`/api/user/services/${service.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setServices(services.filter(s => s.id !== service.id));
      }
    } catch (err) {
      console.error('Failed to delete service:', err);
    }
  };

  const getCategoryLabel = (value) => {
    return SERVICE_CATEGORIES.find(c => c.value === value)?.label || value;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg p-8 text-center">
        <p className="text-gray-500">Loading services...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white rounded-lg p-4 shadow">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold">Service Menu</h2>
            <p className="text-sm text-gray-500">Configure the services you offer with custom rates</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 text-white font-medium hover:opacity-90"
          >
            + Add Service
          </button>
        </div>
      </div>

      {/* Services List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {services.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p>No services configured yet.</p>
            <p className="text-sm mt-1">Add your first service to get started.</p>
          </div>
        ) : (
          <div className="divide-y">
            {services.map((service) => (
              <div
                key={service.id}
                className={`p-4 ${service.enabled ? '' : 'bg-gray-50 opacity-60'}`}
              >
                {editingService?.id === service.id ? (
                  /* Edit Mode */
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Service Name</label>
                        <input
                          type="text"
                          value={editingService.service_name}
                          onChange={(e) => setEditingService({ ...editingService, service_name: e.target.value })}
                          className="w-full border rounded-lg px-3 py-2"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                        <select
                          value={editingService.category || 'other'}
                          onChange={(e) => setEditingService({ ...editingService, category: e.target.value })}
                          className="w-full border rounded-lg px-3 py-2"
                        >
                          {SERVICE_CATEGORIES.map((cat) => (
                            <option key={cat.value} value={cat.value}>{cat.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Hourly Rate</label>
                        <div className="flex items-center">
                          <span className="text-gray-500 mr-1">$</span>
                          <input
                            type="number"
                            step="0.01"
                            value={editingService.hourly_rate}
                            onChange={(e) => setEditingService({ ...editingService, hourly_rate: parseFloat(e.target.value) || 0 })}
                            className="w-24 border rounded-lg px-3 py-2"
                          />
                          <span className="text-gray-500 ml-1">/hr</span>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Default Hours</label>
                        <input
                          type="number"
                          step="0.25"
                          value={editingService.default_hours}
                          onChange={(e) => setEditingService({ ...editingService, default_hours: parseFloat(e.target.value) || 0 })}
                          className="w-24 border rounded-lg px-3 py-2"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={editingService.requires_return_trip}
                          onChange={(e) => setEditingService({ ...editingService, requires_return_trip: e.target.checked })}
                          className="mr-2"
                        />
                        <span className="text-sm">Requires return trip</span>
                      </label>
                    </div>
                    <div className="flex justify-end space-x-3">
                      <button
                        onClick={() => setEditingService(null)}
                        className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => saveService(editingService)}
                        disabled={saving}
                        className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50"
                      >
                        {saving ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  </div>
                ) : (
                  /* View Mode */
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <input
                        type="checkbox"
                        checked={service.enabled}
                        onChange={() => toggleServiceEnabled(service)}
                        className="w-5 h-5 rounded border-gray-300 text-amber-500 focus:ring-amber-500"
                      />
                      <div>
                        <div className="flex items-center space-x-2">
                          <p className="font-medium">{service.service_name}</p>
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                            {getCategoryLabel(service.category)}
                          </span>
                          {service.is_custom && (
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Custom</span>
                          )}
                          {service.requires_return_trip && (
                            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded">Return trip</span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">
                          ${service.hourly_rate}/hr &bull; {service.default_hours}h default
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setEditingService({ ...service })}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                        title="Edit"
                      >
                        &#9998;
                      </button>
                      {service.is_custom && (
                        <button
                          onClick={() => deleteService(service)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                          title="Delete"
                        >
                          &#128465;
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Service Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Add Service</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Service Name *</label>
                <input
                  type="text"
                  value={newService.service_name}
                  onChange={(e) => setNewService({ ...newService, service_name: e.target.value })}
                  placeholder="e.g., Smoke Odor Removal"
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={newService.category}
                  onChange={(e) => setNewService({ ...newService, category: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  {SERVICE_CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hourly Rate *</label>
                  <div className="flex items-center">
                    <span className="mr-1">$</span>
                    <input
                      type="number"
                      step="0.01"
                      value={newService.hourly_rate}
                      onChange={(e) => setNewService({ ...newService, hourly_rate: parseFloat(e.target.value) || 0 })}
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Default Hours</label>
                  <input
                    type="number"
                    step="0.25"
                    value={newService.default_hours}
                    onChange={(e) => setNewService({ ...newService, default_hours: parseFloat(e.target.value) || 0 })}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
              </div>
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={newService.requires_return_trip}
                    onChange={(e) => setNewService({ ...newService, requires_return_trip: e.target.checked })}
                    className="mr-2"
                  />
                  <span className="text-sm">Requires return trip</span>
                </label>
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={addService}
                disabled={!newService.service_name || !newService.hourly_rate || saving}
                className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50"
              >
                {saving ? 'Adding...' : 'Add Service'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
