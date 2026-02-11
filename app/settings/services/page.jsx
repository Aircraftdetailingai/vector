"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const DEFAULT_SERVICES = [
  { name: 'Maintenance Wash', description: 'Regular exterior wash to maintain appearance', price: 800, hours: 2 },
  { name: 'Decon Wash', description: 'Deep clean with iron remover and clay bar', price: 1200, hours: 3 },
  { name: 'One-Step Polish', description: 'Light polish to remove minor swirls', price: 1500, hours: 4 },
  { name: 'Wax Application', description: 'Protective wax coating', price: 600, hours: 1.5 },
  { name: 'Spray Ceramic', description: 'Ceramic spray sealant for 3-6 month protection', price: 400, hours: 1 },
  { name: 'Ceramic Coating', description: 'Professional ceramic coating, 2+ year protection', price: 3500, hours: 8 },
  { name: 'Vacuum & Wipe Down', description: 'Interior vacuum and surface wipe', price: 400, hours: 1 },
  { name: 'Carpet Extraction', description: 'Deep carpet and upholstery cleaning', price: 600, hours: 2 },
  { name: 'Leather Clean & Condition', description: 'Full leather treatment', price: 500, hours: 1.5 },
  { name: 'Polish Brightwork', description: 'Metal and chrome polishing', price: 800, hours: 2 },
];

export default function ServicesPage() {
  const router = useRouter();
  const [services, setServices] = useState([]);
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('services');
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [showPackageModal, setShowPackageModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [editingPackage, setEditingPackage] = useState(null);
  const [saving, setSaving] = useState(false);

  const [newService, setNewService] = useState({
    name: '',
    description: '',
    price: '',
    hours: '',
  });

  const [newPackage, setNewPackage] = useState({
    name: '',
    description: '',
    price: '',
    service_ids: [],
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
      const [svcRes, pkgRes] = await Promise.all([
        fetch('/api/services', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/packages', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (svcRes.ok) {
        const data = await svcRes.json();
        setServices(data.services || []);
      }
      if (pkgRes.ok) {
        const data = await pkgRes.json();
        setPackages(data.packages || []);
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getToken = () => localStorage.getItem('vector_token');

  // Service functions
  const addService = async () => {
    if (!newService.name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({
          name: newService.name,
          description: newService.description,
          price: parseFloat(newService.price) || 0,
          hours: parseFloat(newService.hours) || 1,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setServices([...services, data.service]);
        setNewService({ name: '', description: '', price: '', hours: '' });
        setShowServiceModal(false);
      } else {
        alert('Failed to add service: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('Failed to add service:', err);
    } finally {
      setSaving(false);
    }
  };

  const updateService = async () => {
    if (!editingService) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/services/${editingService.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({
          name: editingService.name,
          description: editingService.description,
          price: parseFloat(editingService.price) || 0,
          hours: parseFloat(editingService.hours) || 1,
        }),
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
    if (!confirm(`Delete "${svc.name}"?`)) return;
    try {
      const res = await fetch(`/api/services/${svc.id}`, {
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

  // Package functions
  const addPackage = async () => {
    if (!newPackage.name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/packages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({
          name: newPackage.name,
          description: newPackage.description,
          price: parseFloat(newPackage.price) || 0,
          service_ids: newPackage.service_ids,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setPackages([...packages, data.package]);
        setNewPackage({ name: '', description: '', price: '', service_ids: [] });
        setShowPackageModal(false);
      } else {
        alert('Failed to add package: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('Failed to add package:', err);
    } finally {
      setSaving(false);
    }
  };

  const updatePackage = async () => {
    if (!editingPackage) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/packages/${editingPackage.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({
          name: editingPackage.name,
          description: editingPackage.description,
          price: parseFloat(editingPackage.price) || 0,
          service_ids: editingPackage.service_ids || [],
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setPackages(packages.map(p => p.id === data.package.id ? data.package : p));
        setEditingPackage(null);
      }
    } catch (err) {
      console.error('Failed to update package:', err);
    } finally {
      setSaving(false);
    }
  };

  const deletePackage = async (pkg) => {
    if (!confirm(`Delete package "${pkg.name}"?`)) return;
    try {
      const res = await fetch(`/api/packages/${pkg.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) {
        setPackages(packages.filter(p => p.id !== pkg.id));
      }
    } catch (err) {
      console.error('Failed to delete package:', err);
    }
  };

  // Import defaults
  const importDefaults = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/services/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ services: DEFAULT_SERVICES }),
      });
      const data = await res.json();
      if (res.ok) {
        setServices([...services, ...(data.services || [])]);
        setShowImportModal(false);
      } else {
        alert('Failed to import: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('Failed to import:', err);
    } finally {
      setSaving(false);
    }
  };

  // Calculate package total from services
  const getPackageServicesTotal = (serviceIds) => {
    return services
      .filter(s => serviceIds.includes(s.id))
      .reduce((sum, s) => sum + (s.price || 0), 0);
  };

  const getPackageServiceNames = (serviceIds) => {
    return services
      .filter(s => serviceIds.includes(s.id))
      .map(s => s.name)
      .join(', ');
  };

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
        {/* Tabs */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('services')}
              className={`flex-1 px-6 py-3 text-sm font-medium ${
                activeTab === 'services'
                  ? 'bg-amber-50 text-amber-600 border-b-2 border-amber-500'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Services ({services.length})
            </button>
            <button
              onClick={() => setActiveTab('packages')}
              className={`flex-1 px-6 py-3 text-sm font-medium ${
                activeTab === 'packages'
                  ? 'bg-amber-50 text-amber-600 border-b-2 border-amber-500'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Packages ({packages.length})
            </button>
          </div>

          {/* Services Tab */}
          {activeTab === 'services' && (
            <div className="p-4">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 className="text-lg font-semibold">Your Services</h2>
                  <p className="text-sm text-gray-500">Add individual services you offer</p>
                </div>
                <div className="flex gap-2">
                  {services.length === 0 && (
                    <button
                      onClick={() => setShowImportModal(true)}
                      className="px-4 py-2 border border-amber-500 text-amber-600 rounded-lg hover:bg-amber-50"
                    >
                      Import Defaults
                    </button>
                  )}
                  <button
                    onClick={() => setShowServiceModal(true)}
                    className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600"
                  >
                    + Add Service
                  </button>
                </div>
              </div>

              {services.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-lg">
                  <p className="text-gray-500 text-lg mb-2">No services yet</p>
                  <p className="text-gray-400 text-sm mb-4">Add your first service or import suggested defaults</p>
                  <div className="flex justify-center gap-3">
                    <button
                      onClick={() => setShowImportModal(true)}
                      className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600"
                    >
                      Import Suggested Services
                    </button>
                    <button
                      onClick={() => setShowServiceModal(true)}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Add Custom Service
                    </button>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-4 py-3 text-sm font-medium text-gray-700">Service Name</th>
                        <th className="text-right px-4 py-3 text-sm font-medium text-gray-700">Price</th>
                        <th className="text-right px-4 py-3 text-sm font-medium text-gray-700">Hours</th>
                        <th className="text-right px-4 py-3 text-sm font-medium text-gray-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {services.map((svc) => (
                        <tr key={svc.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <p className="font-medium text-gray-900">{svc.name}</p>
                            {svc.description && (
                              <p className="text-sm text-gray-500 truncate max-w-md">{svc.description}</p>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-green-600">
                            ${(svc.price || 0).toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-right text-gray-600">
                            {svc.hours || 1} hrs
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => setEditingService({ ...svc })}
                              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                              title="Edit"
                            >
                              &#9998;
                            </button>
                            <button
                              onClick={() => deleteService(svc)}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                              title="Delete"
                            >
                              &#128465;
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Packages Tab */}
          {activeTab === 'packages' && (
            <div className="p-4">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 className="text-lg font-semibold">Service Packages</h2>
                  <p className="text-sm text-gray-500">Bundle services together at a package price</p>
                </div>
                <button
                  onClick={() => setShowPackageModal(true)}
                  disabled={services.length === 0}
                  className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  + Create Package
                </button>
              </div>

              {services.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-lg">
                  <p className="text-gray-500 mb-2">Add services first before creating packages</p>
                  <button
                    onClick={() => setActiveTab('services')}
                    className="text-amber-600 hover:underline"
                  >
                    Go to Services
                  </button>
                </div>
              ) : packages.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-lg">
                  <p className="text-gray-500 text-lg mb-2">No packages yet</p>
                  <p className="text-gray-400 text-sm mb-4">Create a package to bundle services at a discount</p>
                  <button
                    onClick={() => setShowPackageModal(true)}
                    className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600"
                  >
                    Create Your First Package
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {packages.map((pkg) => {
                    const servicesTotal = getPackageServicesTotal(pkg.service_ids || []);
                    const discount = servicesTotal > 0 ? Math.round((1 - pkg.price / servicesTotal) * 100) : 0;
                    return (
                      <div key={pkg.id} className="border rounded-lg p-4 hover:border-amber-300 transition-colors">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-lg">{pkg.name}</h3>
                              {discount > 0 && (
                                <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                                  {discount}% off
                                </span>
                              )}
                            </div>
                            {pkg.description && (
                              <p className="text-sm text-gray-500 mt-1">{pkg.description}</p>
                            )}
                            <p className="text-sm text-gray-400 mt-2">
                              Includes: {getPackageServiceNames(pkg.service_ids || []) || 'No services'}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-green-600">${(pkg.price || 0).toLocaleString()}</p>
                            {servicesTotal > pkg.price && (
                              <p className="text-sm text-gray-400 line-through">${servicesTotal.toLocaleString()}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex justify-end gap-2 mt-3 pt-3 border-t">
                          <button
                            onClick={() => setEditingPackage({ ...pkg })}
                            className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deletePackage(pkg)}
                            className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Add Service Modal */}
      {showServiceModal && (
        <Modal onClose={() => setShowServiceModal(false)}>
          <h3 className="text-lg font-semibold mb-4">Add Service</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Service Name *</label>
              <input
                type="text"
                value={newService.name}
                onChange={(e) => setNewService({ ...newService, name: e.target.value })}
                placeholder="e.g., Full Interior Detail"
                className="w-full border rounded-lg px-3 py-2"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={newService.description}
                onChange={(e) => setNewService({ ...newService, description: e.target.value })}
                placeholder="What's included in this service?"
                className="w-full border rounded-lg px-3 py-2"
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Price ($)</label>
                <input
                  type="number"
                  value={newService.price}
                  onChange={(e) => setNewService({ ...newService, price: e.target.value })}
                  placeholder="0"
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Est. Hours</label>
                <input
                  type="number"
                  step="0.5"
                  value={newService.hours}
                  onChange={(e) => setNewService({ ...newService, hours: e.target.value })}
                  placeholder="1"
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button onClick={() => setShowServiceModal(false)} className="px-4 py-2 border rounded-lg">Cancel</button>
            <button
              onClick={addService}
              disabled={saving || !newService.name}
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
                value={editingService.name}
                onChange={(e) => setEditingService({ ...editingService, name: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={editingService.description || ''}
                onChange={(e) => setEditingService({ ...editingService, description: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Price ($)</label>
                <input
                  type="number"
                  value={editingService.price}
                  onChange={(e) => setEditingService({ ...editingService, price: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Est. Hours</label>
                <input
                  type="number"
                  step="0.5"
                  value={editingService.hours}
                  onChange={(e) => setEditingService({ ...editingService, hours: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
            </div>
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

      {/* Create Package Modal */}
      {showPackageModal && (
        <Modal onClose={() => setShowPackageModal(false)} wide>
          <h3 className="text-lg font-semibold mb-4">Create Package</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Package Name *</label>
              <input
                type="text"
                value={newPackage.name}
                onChange={(e) => setNewPackage({ ...newPackage, name: e.target.value })}
                placeholder="e.g., Gold Package"
                className="w-full border rounded-lg px-3 py-2"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={newPackage.description}
                onChange={(e) => setNewPackage({ ...newPackage, description: e.target.value })}
                placeholder="What's included in this package?"
                className="w-full border rounded-lg px-3 py-2"
                rows={2}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Services</label>
              <div className="max-h-48 overflow-y-auto border rounded-lg p-2 space-y-1">
                {services.map((svc) => (
                  <label key={svc.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newPackage.service_ids.includes(svc.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setNewPackage({ ...newPackage, service_ids: [...newPackage.service_ids, svc.id] });
                        } else {
                          setNewPackage({ ...newPackage, service_ids: newPackage.service_ids.filter(id => id !== svc.id) });
                        }
                      }}
                      className="w-4 h-4 text-amber-500"
                    />
                    <span className="flex-1">{svc.name}</span>
                    <span className="text-gray-500">${svc.price}</span>
                  </label>
                ))}
              </div>
              {newPackage.service_ids.length > 0 && (
                <p className="text-sm text-gray-500 mt-2">
                  Services total: ${getPackageServicesTotal(newPackage.service_ids).toLocaleString()}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Package Price ($)</label>
              <input
                type="number"
                value={newPackage.price}
                onChange={(e) => setNewPackage({ ...newPackage, price: e.target.value })}
                placeholder={getPackageServicesTotal(newPackage.service_ids).toString()}
                className="w-full border rounded-lg px-3 py-2"
              />
              <p className="text-xs text-gray-400 mt-1">Set lower than services total to offer a discount</p>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button onClick={() => setShowPackageModal(false)} className="px-4 py-2 border rounded-lg">Cancel</button>
            <button
              onClick={addPackage}
              disabled={saving || !newPackage.name || newPackage.service_ids.length === 0}
              className="px-4 py-2 bg-amber-500 text-white rounded-lg disabled:opacity-50"
            >
              {saving ? 'Creating...' : 'Create Package'}
            </button>
          </div>
        </Modal>
      )}

      {/* Edit Package Modal */}
      {editingPackage && (
        <Modal onClose={() => setEditingPackage(null)} wide>
          <h3 className="text-lg font-semibold mb-4">Edit Package</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Package Name</label>
              <input
                type="text"
                value={editingPackage.name}
                onChange={(e) => setEditingPackage({ ...editingPackage, name: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={editingPackage.description || ''}
                onChange={(e) => setEditingPackage({ ...editingPackage, description: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
                rows={2}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Services</label>
              <div className="max-h-48 overflow-y-auto border rounded-lg p-2 space-y-1">
                {services.map((svc) => (
                  <label key={svc.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={(editingPackage.service_ids || []).includes(svc.id)}
                      onChange={(e) => {
                        const ids = editingPackage.service_ids || [];
                        if (e.target.checked) {
                          setEditingPackage({ ...editingPackage, service_ids: [...ids, svc.id] });
                        } else {
                          setEditingPackage({ ...editingPackage, service_ids: ids.filter(id => id !== svc.id) });
                        }
                      }}
                      className="w-4 h-4 text-amber-500"
                    />
                    <span className="flex-1">{svc.name}</span>
                    <span className="text-gray-500">${svc.price}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Package Price ($)</label>
              <input
                type="number"
                value={editingPackage.price}
                onChange={(e) => setEditingPackage({ ...editingPackage, price: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button onClick={() => setEditingPackage(null)} className="px-4 py-2 border rounded-lg">Cancel</button>
            <button
              onClick={updatePackage}
              disabled={saving}
              className="px-4 py-2 bg-amber-500 text-white rounded-lg disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </Modal>
      )}

      {/* Import Defaults Modal */}
      {showImportModal && (
        <Modal onClose={() => setShowImportModal(false)} wide>
          <h3 className="text-lg font-semibold mb-2">Import Suggested Services</h3>
          <p className="text-gray-500 text-sm mb-4">These are common aircraft detailing services. You can edit or delete them after importing.</p>
          <div className="max-h-[50vh] overflow-y-auto border rounded-lg divide-y">
            {DEFAULT_SERVICES.map((svc, i) => (
              <div key={i} className="p-3 flex justify-between items-center">
                <div>
                  <p className="font-medium">{svc.name}</p>
                  <p className="text-sm text-gray-500">{svc.description}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-green-600">${svc.price}</p>
                  <p className="text-xs text-gray-400">{svc.hours} hrs</p>
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <button onClick={() => setShowImportModal(false)} className="px-4 py-2 border rounded-lg">Cancel</button>
            <button
              onClick={importDefaults}
              disabled={saving}
              className="px-4 py-2 bg-amber-500 text-white rounded-lg disabled:opacity-50"
            >
              {saving ? 'Importing...' : 'Import All Services'}
            </button>
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
