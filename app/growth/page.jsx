"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import EquipmentROI, { EquipmentCard } from '@/components/EquipmentROI';

export default function GrowthPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [services, setServices] = useState([]);
  const [addingService, setAddingService] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('vector_token');
    if (!token) {
      router.push('/');
      return;
    }
    fetchData(token);
  }, [router]);

  const fetchData = async (token) => {
    try {
      const [equipRes, servicesRes] = await Promise.all([
        fetch('/api/equipment', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('/api/user/services', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (equipRes.ok) {
        const equipData = await equipRes.json();
        setData(equipData);
      }

      if (servicesRes.ok) {
        const servicesData = await servicesRes.json();
        setServices(servicesData.services || []);
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddService = async (service) => {
    setAddingService(service.name);
    const token = localStorage.getItem('vector_token');

    try {
      const res = await fetch('/api/user/services', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          service_name: service.name,
          category: service.name.toLowerCase().includes('exterior') ? 'exterior' : 'interior',
          hourly_rate: service.suggestedRate,
          default_hours: 1,
          description: service.description,
        }),
      });

      if (res.ok) {
        // Refresh services
        const servicesRes = await fetch('/api/user/services', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (servicesRes.ok) {
          const data = await servicesRes.json();
          setServices(data.services || []);
        }
        alert(`"${service.name}" added to your services!`);
      }
    } catch (err) {
      console.error('Failed to add service:', err);
      alert('Failed to add service');
    } finally {
      setAddingService(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0f172a] to-[#1e3a5f] flex items-center justify-center">
        <div className="text-white text-xl">Loading growth opportunities...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f172a] to-[#1e3a5f] p-4">
      {/* Header */}
      <header className="text-white flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <a href="/dashboard" className="text-2xl">←</a>
          <h1 className="text-2xl font-bold">Growth Center</h1>
        </div>
        <a
          href="/settings/services"
          className="text-sm text-amber-400 hover:text-amber-300"
        >
          Manage Services →
        </a>
      </header>

      {/* Savings Summary */}
      {data?.monthlySavings > 0 && (
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl p-6 mb-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm">Your Monthly Savings</p>
              <p className="text-4xl font-bold">${data.monthlySavings.toFixed(0)}</p>
              <p className="text-green-200 text-sm mt-1">
                from your {data.currentTier} plan
              </p>
            </div>
            <div className="text-right">
              <p className="text-green-100 text-sm">Annual</p>
              <p className="text-2xl font-bold">${(data.monthlySavings * 12).toFixed(0)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Growth Funnel Visualization */}
      <div className="bg-white rounded-xl p-6 mb-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">📈 The Growth Loop</h2>
        <div className="flex items-center justify-between text-center text-sm">
          <div className="flex-1">
            <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-2">
              <span className="text-xl">💰</span>
            </div>
            <p className="font-medium">Save Money</p>
            <p className="text-gray-500 text-xs">Upgrade tier</p>
          </div>
          <div className="text-gray-300 text-2xl">→</div>
          <div className="flex-1">
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-2">
              <span className="text-xl">🛠️</span>
            </div>
            <p className="font-medium">Buy Equipment</p>
            <p className="text-gray-500 text-xs">Use savings</p>
          </div>
          <div className="text-gray-300 text-2xl">→</div>
          <div className="flex-1">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-2">
              <span className="text-xl">✨</span>
            </div>
            <p className="font-medium">Add Services</p>
            <p className="text-gray-500 text-xs">Expand menu</p>
          </div>
          <div className="text-gray-300 text-2xl">→</div>
          <div className="flex-1">
            <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-2">
              <span className="text-xl">🚀</span>
            </div>
            <p className="font-medium">Earn More</p>
            <p className="text-gray-500 text-xs">New revenue</p>
          </div>
        </div>
      </div>

      {/* Equipment Recommendations */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white mb-4">🛒 Equipment That Pays for Itself</h2>
        {data?.recommendations?.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {data.recommendations.slice(0, 6).map((equip) => (
              <EquipmentCard
                key={equip.id}
                equipment={equip}
                onAddService={handleAddService}
              />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl p-8 text-center">
            <p className="text-gray-500">You've already added all recommended services!</p>
            <a href="/settings/services" className="text-amber-600 underline mt-2 inline-block">
              Manage your services
            </a>
          </div>
        )}
      </div>

      {/* Current Services */}
      <div className="bg-white rounded-xl p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Your Active Services</h2>
        {services.filter(s => s.enabled).length === 0 ? (
          <p className="text-gray-500">No services configured yet.</p>
        ) : (
          <div className="grid gap-2">
            {services.filter(s => s.enabled).map((svc) => (
              <div key={svc.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="font-medium">{svc.service_name}</span>
                <span className="text-gray-500">${svc.hourly_rate}/hr</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
