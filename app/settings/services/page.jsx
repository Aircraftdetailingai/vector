"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ServicesPage() {
  const router = useRouter();
  const [categories, setCategories] = useState([]);
  const [services, setServices] = useState([]);
  const [defaults, setDefaults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [showDefaultsModal, setShowDefaultsModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingService, setEditingService] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [saving, setSaving] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newService, setNewService] = useState({
    service_name: '',
    category: '',
    hourly_rate: '75',
    default_hours: '1',
    requires_return_trip: false,
  });

  useEffect(() => {
    const token = localStorage.getItem('vector_token');
    if (!token) {
      router.push('/');
      return;
    }
    fetchData();
  }, [router]);

  const fetchData = async () => {
    const token = localStorage.getItem('vector_token');
    try {
      const [catRes, svcRes] = await Promise.all([
        fetch('/api/user/categories', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/user/services', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (catRes.ok) {
        const catData = await catRes.json();
        setCategories(catData.categories || []);
        setDefaults(catData.defaults || []);
      }
      if (svcRes.ok) {
        const svcData = await svcRes.json();
        setServices(svcData.services || []);
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getToken = () => localStorage.getItem('vector_token');

  // Category functions
  const addCategory = async () => {
    if (!newCategoryName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/user/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ name: newCategoryName }),
      });
      const data = await res.json();
      if (res.ok) {
        setCategories([...categories, data.category]);
        setNewCategoryName('');
        setShowCategoryModal(false);
      } else {
        alert('Failed to add category: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('Failed to add category:', err);
      alert('Failed to add category: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const updateCategory = async () => {
    if (!editingCategory?.name?.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/user/categories', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ id: editingCategory.id, name: editingCategory.name }),
      });
      if (res.ok) {
        const data = await res.json();
        setCategories(categories.map(c => c.id === data.category.id ? data.category : c));
        setEditingCategory(null);
      }
    } catch (err) {
      console.error('Failed to update category:', err);
    } finally {
      setSaving(false);
    }
  };

  const deleteCategory = async (cat) => {
    const catServices = services.filter(s => s.category === cat.key);
    if (catServices.length > 0) {
      if (!confirm(`Delete "${cat.name}" and all ${catServices.length} services in it?`)) return;
    } else {
      if (!confirm(`Delete category "${cat.name}"?`)) return;
    }

    try {
      // Delete all services in this category first
      for (const svc of catServices) {
        await fetch(`/api/user/services/${svc.id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${getToken()}` },
        });
      }
      // Delete category
      const res = await fetch(`/api/user/categories?id=${cat.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) {
        setCategories(categories.filter(c => c.id !== cat.id));
        setServices(services.filter(s => s.category !== cat.key));
      }
    } catch (err) {
      console.error('Failed to delete category:', err);
    }
  };

  // Service functions
  const addService = async () => {
    if (!newService.service_name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/user/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({
          ...newService,
          hourly_rate: parseFloat(newService.hourly_rate) || 75,
          default_hours: parseFloat(newService.default_hours) || 1,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setServices([...services, data.service]);
        setNewService({ service_name: '', category: selectedCategory || '', hourly_rate: '75', default_hours: '1', requires_return_trip: false });
        setShowServiceModal(false);
      } else {
        alert('Failed to add service: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('Failed to add service:', err);
      alert('Failed to add service: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const updateService = async () => {
    if (!editingService) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/user/services/${editingService.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify(editingService),
      });
      if (res.ok) {
        const data = await res.json();
        setServices(services.map(s => s.id === data.service.id ? data.service : s));
        setEditingService(null);
      }
    } catch (err) {
      console.error('Failed to update service:', err);
    } finally {
      setSaving(false);
    }
  };

  const deleteService = async (svc) => {
    if (!confirm(`Delete "${svc.service_name}"?`)) return;
    try {
      const res = await fetch(`/api/user/services/${svc.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) {
        setServices(services.filter(s => s.id !== svc.id));
      }
    } catch (err) {
      console.error('Failed to delete service:', err);
    }
  };

  const toggleService = async (svc) => {
    try {
      const res = await fetch(`/api/user/services/${svc.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ enabled: !svc.enabled }),
      });
      if (res.ok) {
        setServices(services.map(s => s.id === svc.id ? { ...s, enabled: !s.enabled } : s));
      }
    } catch (err) {
      console.error('Failed to toggle service:', err);
    }
  };

  // Import default services for a category
  const importDefaults = async (defaultCat) => {
    setSaving(true);
    try {
      // First create the category if it doesn't exist
      let cat = categories.find(c => c.key === defaultCat.key);
      let updatedCategories = [...categories];

      if (!cat) {
        const catRes = await fetch('/api/user/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
          body: JSON.stringify({ name: defaultCat.name }),
        });
        const catData = await catRes.json();
        if (catRes.ok) {
          cat = catData.category;
          updatedCategories = [...updatedCategories, cat];
          setCategories(updatedCategories);
        } else {
          alert('Failed to create category: ' + (catData.error || 'Unknown error'));
          setSaving(false);
          return;
        }
      }

      // Import services
      const res = await fetch('/api/user/services', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({
          services: defaultCat.services,
          categoryKey: cat?.key || defaultCat.key,
          clearExisting: false,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setServices([...services, ...(data.services || [])]);
        setShowDefaultsModal(false);
      } else {
        alert('Failed to import services: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('Failed to import defaults:', err);
      alert('Failed to import: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Group services by category
  const servicesByCategory = {};
  for (const svc of services) {
    const key = svc.category || 'other';
    if (!servicesByCategory[key]) servicesByCategory[key] = [];
    servicesByCategory[key].push(svc);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0f172a] to-[#1e3a5f] p-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg p-8 text-center">
            <p className="text-gray-500">Loading services...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f172a] to-[#1e3a5f] p-4">
      {/* Header */}
      <header className="flex justify-between items-center mb-6 text-white max-w-4xl mx-auto">
        <div className="flex items-center space-x-2 text-2xl font-bold">
          <span>&#9992;</span>
          <span>Vector</span>
          <span className="text-lg font-medium">- Services</span>
        </div>
        <div className="space-x-4 text-sm">
          <a href="/dashboard" className="underline">Dashboard</a>
          <a href="/settings" className="underline">Settings</a>
        </div>
      </header>

      <div className="max-w-4xl mx-auto space-y-4">
        {/* Top Actions */}
        <div className="bg-white rounded-lg p-4 shadow">
          <div className="flex flex-wrap justify-between items-center gap-4">
            <div>
              <h2 className="text-xl font-semibold">Service Menu</h2>
              <p className="text-sm text-gray-500">Create categories and add your services</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowDefaultsModal(true)}
                className="px-4 py-2 border border-amber-500 text-amber-600 rounded-lg hover:bg-amber-50"
              >
                Import Defaults
              </button>
              <button
                onClick={() => setShowCategoryModal(true)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                + Add Category
              </button>
            </div>
          </div>
        </div>

        {/* Categories and Services */}
        {categories.length === 0 ? (
          <div className="bg-white rounded-lg p-8 text-center">
            <p className="text-gray-500 text-lg">No categories yet</p>
            <p className="text-gray-400 text-sm mt-1">Add a category or import defaults to get started</p>
            <div className="flex justify-center gap-3 mt-4">
              <button
                onClick={() => setShowDefaultsModal(true)}
                className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600"
              >
                Import Suggested Defaults
              </button>
              <button
                onClick={() => setShowCategoryModal(true)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Create Custom Category
              </button>
            </div>
          </div>
        ) : (
          categories.map((cat) => (
            <div key={cat.id} className="bg-white rounded-lg shadow overflow-hidden">
              {/* Category Header */}
              <div className="bg-gray-50 px-4 py-3 border-b flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold text-gray-900">{cat.name}</h3>
                  <span className="text-xs text-gray-400">
                    {(servicesByCategory[cat.key] || []).length} services
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setSelectedCategory(cat.key);
                      setNewService({ ...newService, category: cat.key });
                      setShowServiceModal(true);
                    }}
                    className="text-sm px-3 py-1 text-amber-600 hover:bg-amber-50 rounded"
                  >
                    + Add Service
                  </button>
                  <button
                    onClick={() => setEditingCategory({ ...cat })}
                    className="p-1 text-gray-400 hover:text-gray-600"
                    title="Edit category"
                  >
                    &#9998;
                  </button>
                  <button
                    onClick={() => deleteCategory(cat)}
                    className="p-1 text-gray-400 hover:text-red-600"
                    title="Delete category"
                  >
                    &#128465;
                  </button>
                </div>
              </div>

              {/* Services in Category */}
              <div className="divide-y">
                {(servicesByCategory[cat.key] || []).length === 0 ? (
                  <div className="p-4 text-center text-gray-400 text-sm">
                    No services in this category yet
                  </div>
                ) : (
                  (servicesByCategory[cat.key] || []).map((svc) => (
                    <div key={svc.id} className={`p-4 ${svc.enabled ? '' : 'bg-gray-50 opacity-60'}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <input
                            type="checkbox"
                            checked={svc.enabled}
                            onChange={() => toggleService(svc)}
                            className="w-5 h-5 rounded border-gray-300 text-amber-500"
                          />
                          <div>
                            <p className="font-medium text-gray-900">{svc.service_name}</p>
                            <p className="text-sm text-gray-500">
                              ${svc.hourly_rate}/hr &bull; {svc.default_hours}h default
                              {svc.requires_return_trip && ' &bull; Return trip'}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => setEditingService({ ...svc })}
                            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                          >
                            &#9998;
                          </button>
                          <button
                            onClick={() => deleteService(svc)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                          >
                            &#128465;
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Category Modal */}
      {showCategoryModal && (
        <Modal onClose={() => setShowCategoryModal(false)}>
          <h3 className="text-lg font-semibold mb-4">Add Category</h3>
          <input
            type="text"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newCategoryName.trim() && !saving) {
                addCategory();
              }
            }}
            placeholder="e.g., Paint Correction"
            className="w-full border rounded-lg px-3 py-2 mb-4"
            autoFocus
          />
          <div className="flex justify-end gap-3">
            <button onClick={() => setShowCategoryModal(false)} className="px-4 py-2 border rounded-lg">Cancel</button>
            <button
              onClick={addCategory}
              disabled={saving || !newCategoryName.trim()}
              className="px-4 py-2 bg-amber-500 text-white rounded-lg disabled:opacity-50"
            >
              {saving ? 'Adding...' : 'Add Category'}
            </button>
          </div>
        </Modal>
      )}

      {/* Edit Category Modal */}
      {editingCategory && (
        <Modal onClose={() => setEditingCategory(null)}>
          <h3 className="text-lg font-semibold mb-4">Edit Category</h3>
          <input
            type="text"
            value={editingCategory.name}
            onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && editingCategory.name?.trim() && !saving) {
                updateCategory();
              }
            }}
            className="w-full border rounded-lg px-3 py-2 mb-4"
            autoFocus
          />
          <div className="flex justify-end gap-3">
            <button onClick={() => setEditingCategory(null)} className="px-4 py-2 border rounded-lg">Cancel</button>
            <button
              onClick={updateCategory}
              disabled={saving}
              className="px-4 py-2 bg-amber-500 text-white rounded-lg disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </Modal>
      )}

      {/* Add Service Modal */}
      {showServiceModal && (
        <Modal onClose={() => setShowServiceModal(false)}>
          <h3 className="text-lg font-semibold mb-4">Add Service</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Service Name *</label>
              <input
                type="text"
                value={newService.service_name}
                onChange={(e) => setNewService({ ...newService, service_name: e.target.value })}
                placeholder="e.g., Full Interior Detail"
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
                <option value="">Select category...</option>
                {categories.map(c => (
                  <option key={c.id} value={c.key}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hourly Rate ($)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={newService.hourly_rate}
                  onChange={(e) => {
                    if (e.target.value === '' || /^\d*\.?\d*$/.test(e.target.value)) {
                      setNewService({ ...newService, hourly_rate: e.target.value });
                    }
                  }}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Default Hours</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={newService.default_hours}
                  onChange={(e) => {
                    if (e.target.value === '' || /^\d*\.?\d*$/.test(e.target.value)) {
                      setNewService({ ...newService, default_hours: e.target.value });
                    }
                  }}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
            </div>
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
          <div className="flex justify-end gap-3 mt-6">
            <button onClick={() => setShowServiceModal(false)} className="px-4 py-2 border rounded-lg">Cancel</button>
            <button
              onClick={addService}
              disabled={saving || !newService.service_name}
              className="px-4 py-2 bg-amber-500 text-white rounded-lg disabled:opacity-50"
            >
              {saving ? 'Adding...' : 'Add Service'}
            </button>
          </div>
        </Modal>
      )}

      {/* Edit Service Modal */}
      {editingService && (
        <Modal onClose={() => setEditingService(null)}>
          <h3 className="text-lg font-semibold mb-4">Edit Service</h3>
          <div className="space-y-4">
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
                value={editingService.category}
                onChange={(e) => setEditingService({ ...editingService, category: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
              >
                {categories.map(c => (
                  <option key={c.id} value={c.key}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hourly Rate ($)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={editingService.hourly_rate}
                  onChange={(e) => {
                    if (e.target.value === '' || /^\d*\.?\d*$/.test(e.target.value)) {
                      setEditingService({ ...editingService, hourly_rate: e.target.value });
                    }
                  }}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Default Hours</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={editingService.default_hours}
                  onChange={(e) => {
                    if (e.target.value === '' || /^\d*\.?\d*$/.test(e.target.value)) {
                      setEditingService({ ...editingService, default_hours: e.target.value });
                    }
                  }}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
            </div>
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
          <div className="flex justify-end gap-3 mt-6">
            <button onClick={() => setEditingService(null)} className="px-4 py-2 border rounded-lg">Cancel</button>
            <button
              onClick={updateService}
              disabled={saving}
              className="px-4 py-2 bg-amber-500 text-white rounded-lg disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </Modal>
      )}

      {/* Import Defaults Modal */}
      {showDefaultsModal && (
        <Modal onClose={() => setShowDefaultsModal(false)} wide>
          <h3 className="text-lg font-semibold mb-2">Import Suggested Services</h3>
          <p className="text-gray-500 text-sm mb-4">Click a category to import its services. You can edit them after.</p>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {defaults.map((cat) => (
              <div key={cat.key} className="border rounded-lg p-4 hover:border-amber-400 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-semibold">{cat.name}</h4>
                    <p className="text-sm text-gray-500">{cat.services.length} services</p>
                  </div>
                  <button
                    onClick={() => importDefaults(cat)}
                    disabled={saving}
                    className="px-3 py-1 bg-amber-500 text-white text-sm rounded hover:bg-amber-600 disabled:opacity-50"
                  >
                    {saving ? 'Importing...' : 'Import'}
                  </button>
                </div>
                <div className="text-sm text-gray-600">
                  {cat.services.map(s => s.name).join(' • ')}
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-end mt-4">
            <button onClick={() => setShowDefaultsModal(false)} className="px-4 py-2 border rounded-lg">Close</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Modal({ children, onClose, wide }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className={`bg-white rounded-lg p-6 ${wide ? 'w-full max-w-2xl' : 'w-full max-w-md'}`}>
        {children}
      </div>
    </div>
  );
}
