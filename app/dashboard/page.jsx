"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const categories = ['Light Jets','Midsize Jets','Super Midsize','Large Cabin','Turboprops','Pistons','Helicopters'];

const aircraftData = {
  'Light Jets': [
    { name:'Citation CJ2', exterior:4, interior:3 },
    { name:'Citation CJ3', exterior:4.5, interior:3.5 },
    { name:'Phenom 100', exterior:3.5, interior:2.5 },
    { name:'Phenom 300', exterior:5, interior:4 },
    { name:'HondaJet', exterior:4, interior:3 },
  ],
  'Midsize Jets': [
    { name:'Citation XLS+', exterior:6, interior:5 },
    { name:'Hawker 800XP', exterior:6.5, interior:5.5 },
    { name:'Learjet 60', exterior:6, interior:5 },
  ],
  'Super Midsize': [
    { name:'Citation Longitude', exterior:9, interior:8 },
    { name:'Challenger 350', exterior:9, interior:8 },
    { name:'Gulfstream G280', exterior:8.5, interior:7.5 },
  ],
  'Large Cabin': [
    { name:'Challenger 650', exterior:11, interior:10 },
    { name:'Gulfstream G550', exterior:14, interior:12 },
    { name:'Gulfstream G650', exterior:16, interior:14 },
    { name:'Global 6000', exterior:15, interior:13 },
  ],
  'Turboprops': [
    { name:'King Air 250', exterior:5, interior:4 },
    { name:'King Air 350', exterior:6, interior:5 },
    { name:'Pilatus PC-12', exterior:5, interior:4 },
  ],
  'Pistons': [
    { name:'Cirrus SR22', exterior:2.5, interior:2 },
    { name:'Cessna 182', exterior:2.5, interior:2 },
    { name:'Bonanza A36', exterior:3, interior:2.5 },
  ],
  'Helicopters': [
    { name:'Bell 407', exterior:3.5, interior:2.5 },
    { name:'EC130', exterior:3.5, interior:3 },
    { name:'S-76', exterior:5, interior:4 },
  ],
};

const servicesList = [
  { key:'exterior', label:'Exterior Wash & Detail' },
  { key:'interior', label:'Interior Detail' },
  { key:'brightwork', label:'Brightwork Polish' },
  { key:'ceramicCoating', label:'Ceramic Coating' },
  { key:'engineDetail', label:'Engine Detail' },
];

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(categories[0]);
  const [selectedAircraft, setSelectedAircraft] = useState(null);
  const [services, setServices] = useState({
    exterior: true,
    interior: true,
    brightwork: false,
    ceramicCoating: false,
    engineDetail: false,
  });
  const [hours, setHours] = useState({
    exterior: 0,
    interior: 0,
    brightwork: 0,
    ceramicCoating: 0,
    engineDetail: 0,
  });

  useEffect(() => {
    const stored = localStorage.getItem('vector_user');
    if (stored) {
      setUser(JSON.parse(stored));
    }
  }, []);

  useEffect(() => {
    if (selectedAircraft) {
      setHours((prev) => ({
        ...prev,
        exterior: selectedAircraft.exterior,
        interior: selectedAircraft.interior,
      }));
    }
  }, [selectedAircraft]);

  const handleLogout = () => {
    localStorage.removeItem('vector_token');
    localStorage.removeItem('vector_user');
    router.push('/');
  };

  const selectAircraft = (aircraft) => {
    setSelectedAircraft(aircraft);
    setServices({
      exterior: true,
      interior: true,
      brightwork: false,
      ceramicCoating: false,
      engineDetail: false,
    });
  };

  const rates = user?.rates || {};

  const computePrice = (serviceKey) => {
    const rate = rates[serviceKey] || 0;
    const hrs = parseFloat(hours[serviceKey] || 0);
    return hrs * rate;
  };

  const totalHours = Object.keys(services).reduce((sum, key) => {
    if (services[key]) {
      return sum + parseFloat(hours[key] || 0);
    }
    return sum;
  }, 0);

  const totalPrice = Object.keys(services).reduce((sum, key) => {
    if (services[key]) {
      return sum + computePrice(key);
    }
    return sum;
  }, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f172a] to-[#1e3a5f] text-gray-800">
      <header className="flex justify-between items-center p-4 bg-white shadow">
        <div className="flex items-center space-x-2">
          <span className="text-2xl">✈️</span>
          <span className="font-bold text-xl text-[#1e3a5f]">Vector</span>
          {user && <span className="ml-2 text-gray-600">{user.company || user.name}</span>}
        </div>
        <div className="flex items-center space-x-4">
          <a href="/settings" className="text-[#1e3a5f] hover:underline">Settings</a>
          <button onClick={handleLogout} className="text-[#1e3a5f] hover:underline">Logout</button>
        </div>
      </header>
      <div className="p-4 flex flex-col lg:flex-row gap-4">
        <div className="lg:w-2/3 space-y-4">
          <div className="flex overflow-x-auto space-x-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-full border whitespace-nowrap ${selectedCategory === cat ? 'bg-amber-500 text-white' : 'bg-white text-gray-700'}`}
              >
                {cat}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {aircraftData[selectedCategory].map((air) => (
              <div
                key={air.name}
                onClick={() => selectAircraft(air)}
                className={`border rounded p-4 cursor-pointer ${selectedAircraft?.name === air.name ? 'ring-2 ring-amber-500' : 'bg-white'}`}
              >
                <h3 className="font-semibold text-[#1e3a5f]">{air.name}</h3>
                <p className="text-sm text-gray-600">
                  Est. {air.exterior}h ext / {air.interior}h int
                </p>
              </div>
            ))}
          </div>
          {selectedAircraft && (
            <div className="mt-4 bg-white rounded p-4 shadow">
              <h3 className="font-semibold text-[#1e3a5f] mb-4">Services</h3>
              {servicesList.map((svc) => (
                <div key={svc.key} className="flex items-center justify-between mb-3">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      className="mr-2"
                      checked={services[svc.key]}
                      onChange={(e) =>
                        setServices({ ...services, [svc.key]: e.target.checked })
                      }
                    />
                    <span>{svc.label}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      className="w-20 border rounded p-1"
                      value={hours[svc.key]}
                      onChange={(e) =>
                        setHours({ ...hours, [svc.key]: e.target.value })
                      }
                    />
                    <span className="text-sm text-gray-500">hrs</span>
                    <span className="w-24 text-right">
                      ${computePrice(svc.key).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="lg:w-1/3">
          <div className="sticky top-4 bg-[#0f172a] text-white rounded p-4">
            <h3 className="text-lg font-semibold mb-2">Quote Summary</h3>
            {selectedAircraft ? (
              <>
                <p className="mb-2">{selectedAircraft.name}</p>
                <ul className="mb-2">
                  {servicesList.map(
                    (svc) =>
                      services[svc.key] && (
                        <li
                          key={svc.key}
                          className="flex justify-between text-sm mb-1"
                        >
                          <span>{svc.label}</span>
                          <span>${computePrice(svc.key).toFixed(2)}</span>
                        </li>
                      )
                  )}
                </ul>
                <div className="flex justify-between font-semibold border-t border-gray-600 pt-2">
                  <span>Total Hours</span>
                  <span>{totalHours.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Total Price</span>
                  <span>${totalPrice.toFixed(2)}</span>
                </div>
              </>
            ) : (
              <p>Select an aircraft</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
