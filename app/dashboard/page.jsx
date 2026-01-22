"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import SendQuoteModal from '../../components/SendQuoteModal.jsx';

const categories = ['Light Jets','Midsize Jets','Super Midsize','Large Cabin','Turboprops','Pistons','Helicopters'];

const aircraftData = {
  'Light Jets': [
    { name: 'Citation CJ2', exterior: 4, interior: 3 },
    { name: 'Citation CJ3', exterior: 4.5, interior: 3.5 },
    { name: 'Phenom 100', exterior: 3.5, interior: 2.5 },
    { name: 'Phenom 300', exterior: 5, interior: 4 },
    { name: 'HondaJet', exterior: 4, interior: 3 },
  ],
  'Midsize Jets': [
    { name: 'Citation XLS+', exterior: 6, interior: 5 },
    { name: 'Hawker 800XP', exterior: 6.5, interior: 5.5 },
    { name: 'Learjet 60', exterior: 6, interior: 5 },
  ],
  'Super Midsize': [
    { name: 'Citation Longitude', exterior: 9, interior: 8 },
    { name: 'Challenger 350', exterior: 9, interior: 8 },
    { name: 'Gulfstream G280', exterior: 8.5, interior: 7.5 },
  ],
  'Large Cabin': [
    { name: 'Challenger 650', exterior: 11, interior: 10 },
    { name: 'Gulfstream G550', exterior: 14, interior: 12 },
    { name: 'Gulfstream G650', exterior: 16, interior: 14 },
    { name: 'Global 6000', exterior: 15, interior: 13 },
  ],
  'Turboprops': [
    { name: 'King Air 250', exterior: 5, interior: 4 },
    { name: 'King Air 350', exterior: 6, interior: 5 },
    { name: 'Pilatus PC-12', exterior: 5, interior: 4 },
  ],
  'Pistons': [
    { name: 'Cirrus SR22', exterior: 2.5, interior: 2 },
    { name: 'Cessna 182', exterior: 2.5, interior: 2 },
    { name: 'Bonanza A36', exterior: 3, interior: 2.5 },
  ],
  'Helicopters': [
    { name: 'Bell 407', exterior: 3.5, interior: 2.5 },
    { name: 'EC130', exterior: 3.5, interior: 3 },
    { name: 'S-76', exterior: 5, interior: 4 },
  ],
};

const servicesList = [
  { key: 'exterior', label: 'Exterior Wash & Detail' },
  { key: 'interior', label: 'Interior Detail' },
  { key: 'brightwork', label: 'Brightwork Polish' },
  { key: 'ceramic', label: 'Ceramic Coating' },
  { key: 'engine', label: 'Engine Detail' },
];

const rateKeyMap = {
  exterior: 'exterior',
  interior: 'interior',
  brightwork: 'brightwork',
  ceramic: 'ceramicCoating',
  engine: 'engineDetail',
};

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(categories[0]);
  const [selectedAircraft, setSelectedAircraft] = useState(null);
  const [services, setServices] = useState({
    exterior: false,
    interior: false,
    brightwork: false,
    ceramic: false,
    engine: false,
  });
  const [hours, setHours] = useState({
    exterior: 0,
    interior: 0,
    brightwork: 0,
    ceramic: 0,
    engine: 0,
  });
  const [isModalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('vector_user');
    if (stored) {
      setUser(JSON.parse(stored));
    }
  }, []);

  useEffect(() => {
    if (selectedAircraft) {
      // Pre-select exterior & interior
      setServices((prev) => ({ ...prev, exterior: true, interior: true }));
      setHours((prev) => ({ ...prev, exterior: selectedAircraft.exterior, interior: selectedAircraft.interior }));
    }
  }, [selectedAircraft]);

  const toggleService = (key) => {
    setServices((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const updateHours = (key, value) => {
    setHours((prev) => ({ ...prev, [key]: parseFloat(value) || 0 }));
  };

  const computePrice = (key) => {
    if (!user) return 0;
    const rateKey = rateKeyMap[key];
    const rate = user.rates?.[rateKey] || 0;
    return (services[key] ? (hours[key] || 0) : 0) * rate;
  };

  const totalHours = servicesList.reduce((sum, svc) => {
    return sum + (services[svc.key] ? (hours[svc.key] || 0) : 0);
  }, 0);

  const totalPrice = servicesList.reduce((sum, svc) => {
    return sum + computePrice(svc.key);
  }, 0);

  const handleLogout = () => {
    localStorage.removeItem('vector_token');
    localStorage.removeItem('vector_user');
    router.push('/');
  };

  const openSendModal = () => {
    setModalOpen(true);
  };

  const closeSendModal = () => {
    setModalOpen(false);
  };

  const quoteData = selectedAircraft
    ? {
        aircraft: { name: selectedAircraft.name, category: selectedCategory },
        services,
        totalHours,
        totalPrice,
      }
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f172a] to-[#1e3a5f] p-4 text-gray-900">
      {/* Header */}
      <header className="flex justify-between items-center mb-4 text-white">
        <div className="flex items-center space-x-2 text-2xl font-bold">
          <span>✈️</span>
          <span>Vector</span>
          {user && <span className="text-lg font-medium">- {user.company}</span>}
        </div>
        <div className="space-x-4 text-sm">
          <a href="/settings" className="underline">Settings</a>
          <button onClick={handleLogout} className="underline">Logout</button>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row gap-4">
        {/* Left column */}
        <div className="flex-1">
          {/* Categories */}
          <div className="overflow-x-auto mb-4">
            <div className="flex space-x-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => {
                    setSelectedCategory(cat);
                    setSelectedAircraft(null);
                  }}
                  className={`px-4 py-2 rounded-full whitespace-nowrap ${
                    selectedCategory === cat
                      ? 'bg-amber-500 text-white'
                      : 'bg-white text-gray-800'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Aircraft Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            {aircraftData[selectedCategory].map((air) => (
              <div
                key={air.name}
                onClick={() => setSelectedAircraft(air)}
                className={`border rounded p-4 cursor-pointer ${
                  selectedAircraft?.name === air.name ? 'border-amber-500' : 'border-gray-300'
                }`}
              >
                <p className="font-semibold">{air.name}</p>
                <p className="text-sm text-gray-600">
                  Est. {air.exterior}/{air.interior} hrs base
                </p>
              </div>
            ))}
          </div>

          {/* Services section */}
          {selectedAircraft && (
            <div className="bg-white rounded p-4 shadow">
              <h3 className="font-semibold mb-2">Services</h3>
              {servicesList.map((svc) => (
                <div key={svc.key} className="flex items-center mb-2">
                  <input
                    type="checkbox"
                    checked={services[svc.key]}
                    onChange={() => toggleService(svc.key)}
                    className="mr-2"
                  />
                  <div className="flex-1">
                    <label className="font-medium">{svc.label}</label>
                  </div>
                  <input
                    type="number"
                    step="0.1"
                    value={hours[svc.key]}
                    onChange={(e) => updateHours(svc.key, e.target.value)}
                    disabled={!services[svc.key]}
                    className="w-20 border rounded px-2 py-1 mr-2 text-right"
                  />
                  <span className="w-24 text-right">
                    ${computePrice(svc.key).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right column - Quote summary */}
        <div className="w-full lg:w-80">
          <div className="sticky top-4 bg-[#0f172a] text-white rounded p-4">
            <h3 className="text-lg font-semibold mb-2">Quote Summary</h3>
            {selectedAircraft ? (
              <>
                <p className="mb-2">{selectedAircraft.name}</p>
                <ul className="mb-2">
                  {servicesList.map((svc) => (
                    services[svc.key] && (
                      <li key={svc.key} className="flex justify-between text-sm mb-1">
                        <span>{svc.label}</span>
                        <span>${computePrice(svc.key).toFixed(2)}</span>
                      </li>
                    )
                  ))}
                </ul>
                <div className="flex justify-between font-semibold border-t border-gray-600 pt-2">
                  <span>Total Hours</span>
                  <span>{totalHours.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-semibold mb-4">
                  <span>Total Price</span>
                  <span>${totalPrice.toFixed(2)}</span>
                </div>
                <button
                  type="button"
                  onClick={openSendModal}
                  className="w-full mt-2 px-4 py-2 rounded bg-gradient-to-r from-amber-500 to-amber-600 text-white"
                >
                  Send to Client
                </button>
              </>
            ) : (
              <p>Select an aircraft</p>
            )}
          </div>
        </div>
      </div>

      {isModalOpen && quoteData && (
        <SendQuoteModal
          isOpen={isModalOpen}
          onClose={closeSendModal}
          quote={{
            id: quoteData.id,
            share_link: quoteData.share_link,
            aircraft: quoteData.aircraft,
            services: services,
            totalHours: totalHours,
            totalPrice: totalPrice,
          }}
          user={user}
        />
      )}
    </div>
  );
}
