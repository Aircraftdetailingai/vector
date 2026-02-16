"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import SendQuoteModal from '../../components/SendQuoteModal.jsx';
import PushNotifications from '../../components/PushNotifications.jsx';
import PointsBadge from '../../components/PointsBadge.jsx';

const categoryLabels = {
  piston: 'Pistons',
  turboprop: 'Turboprops',
  light_jet: 'Light Jets',
  midsize_jet: 'Midsize Jets',
  super_midsize_jet: 'Super Midsize',
  large_jet: 'Large Jets',
  helicopter: 'Helicopters',
};

const categoryOrder = ['piston', 'turboprop', 'light_jet', 'midsize_jet', 'super_midsize_jet', 'large_jet', 'helicopter'];

// Stripe Connect Warning Banner Component
function StripeWarningBanner({ onConnect, loading, error, onClearError }) {
  return (
    <div className="bg-amber-100 border border-amber-300 rounded-lg p-4 mb-4">
      {error && (
        <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm flex justify-between items-start">
          <span>{error}</span>
          <button onClick={onClearError} className="ml-2 text-red-500 hover:text-red-700">&times;</button>
        </div>
      )}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <span className="text-amber-600 text-xl mr-3">&#9888;</span>
          <div>
            <p className="text-amber-800 font-medium">Stripe not connected</p>
            <p className="text-amber-700 text-sm">You cannot receive payments until you connect Stripe.</p>
          </div>
        </div>
        <button
          onClick={onConnect}
          disabled={loading}
          className="px-4 py-2 rounded bg-amber-500 text-white font-medium hover:bg-amber-600 disabled:opacity-50"
        >
          {loading ? 'Connecting...' : 'Connect Stripe'}
        </button>
      </div>
    </div>
  );
}

// Quick Stats Bar Component (inline, fast loading)
function QuickStats({ stats }) {
  if (!stats) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
      <div className="bg-white rounded-lg p-3 shadow">
        <p className="text-gray-500 text-xs">This Month</p>
        <p className="text-xl font-bold text-gray-900">${(stats.monthRevenue || 0).toLocaleString()}</p>
      </div>
      <div className="bg-white rounded-lg p-3 shadow">
        <p className="text-gray-500 text-xs">Jobs Done</p>
        <p className="text-xl font-bold text-blue-600">{stats.monthJobs || 0}</p>
      </div>
      <div className="bg-white rounded-lg p-3 shadow">
        <p className="text-gray-500 text-xs">Pending Quotes</p>
        <p className="text-xl font-bold text-amber-600">{stats.pendingQuotes || 0}</p>
      </div>
      <div className="bg-white rounded-lg p-3 shadow">
        <p className="text-gray-500 text-xs">Avg Job Value</p>
        <p className="text-xl font-bold text-green-600">${(stats.avgJobValue || 0).toFixed(0)}</p>
      </div>
    </div>
  );
}

// Recent Quotes Component
function RecentQuotes({ quotes, onViewQuote }) {
  if (!quotes || quotes.length === 0) {
    return (
      <div className="bg-white rounded-lg p-4 mb-4 shadow">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-semibold">Recent Quotes</h3>
          <a href="/quotes" className="text-sm text-amber-600 hover:underline">View All</a>
        </div>
        <p className="text-gray-500 text-sm">No quotes yet. Create your first quote below.</p>
      </div>
    );
  }

  const statusColors = {
    sent: 'bg-blue-100 text-blue-700',
    viewed: 'bg-purple-100 text-purple-700',
    accepted: 'bg-green-100 text-green-700',
    completed: 'bg-emerald-100 text-emerald-700',
    declined: 'bg-red-100 text-red-700',
    expired: 'bg-gray-100 text-gray-500',
  };

  return (
    <div className="bg-white rounded-lg p-4 mb-4 shadow">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-semibold">Recent Quotes</h3>
        <a href="/quotes" className="text-sm text-amber-600 hover:underline">View All</a>
      </div>
      <div className="space-y-2">
        {quotes.map((quote) => (
          <a
            key={quote.id}
            href={`/quotes/${quote.id}`}
            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="flex-1">
              <p className="font-medium text-gray-900">
                {quote.aircraft_name || 'Unknown Aircraft'}
              </p>
              <p className="text-sm text-gray-500">
                {quote.customer_name || quote.customer_email || 'No customer'}
                {quote.created_at && (
                  <span className="ml-2">
                    {new Date(quote.created_at).toLocaleDateString()}
                  </span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-xs px-2 py-1 rounded-full ${statusColors[quote.status] || 'bg-gray-100 text-gray-600'}`}>
                {quote.status || 'draft'}
              </span>
              <span className="font-bold text-gray-900">${(quote.total_price || 0).toFixed(0)}</span>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

// Quick Actions Component
function QuickActions() {
  return (
    <div className="bg-white rounded-lg p-4 mb-4 shadow">
      <h3 className="font-semibold mb-3">Quick Actions</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <a href="/products" className="flex flex-col items-center p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
          <span className="text-2xl mb-1">&#128230;</span>
          <span className="text-sm font-medium text-blue-900">Inventory</span>
        </a>
        <a href="/equipment" className="flex flex-col items-center p-3 bg-green-50 rounded-lg hover:bg-green-100 transition-colors">
          <span className="text-2xl mb-1">&#128295;</span>
          <span className="text-sm font-medium text-green-900">Equipment</span>
        </a>
        <a href="/growth" className="flex flex-col items-center p-3 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors">
          <span className="text-2xl mb-1">&#128200;</span>
          <span className="text-sm font-medium text-amber-900">Growth</span>
        </a>
        <a href="/settings/services" className="flex flex-col items-center p-3 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors">
          <span className="text-2xl mb-1">&#9881;</span>
          <span className="text-sm font-medium text-purple-900">Services</span>
        </a>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [availableServices, setAvailableServices] = useState([]);
  const [availablePackages, setAvailablePackages] = useState([]);
  const [manufacturers, setManufacturers] = useState([]);
  const [models, setModels] = useState([]);
  const [selectedManufacturer, setSelectedManufacturer] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [modelSearch, setModelSearch] = useState('');
  const [selectedAircraft, setSelectedAircraft] = useState(null);
  const [selectedServices, setSelectedServices] = useState({});
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [accessDifficulty, setAccessDifficulty] = useState(1.0);
  const [quoteNotes, setQuoteNotes] = useState('');
  const [isModalOpen, setModalOpen] = useState(false);
  const [stripeStatus, setStripeStatus] = useState({ connected: false, status: 'CHECKING' });
  const [stripeLoading, setStripeLoading] = useState(false);
  const [stripeError, setStripeError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [minimumFee, setMinimumFee] = useState(0);
  const [minimumFeeLocations, setMinimumFeeLocations] = useState([]);
  const [jobLocation, setJobLocation] = useState('');
  const [dailyTip, setDailyTip] = useState(null);
  const [tipDismissed, setTipDismissed] = useState(false);
  const [quickStats, setQuickStats] = useState(null);
  const [recentQuotes, setRecentQuotes] = useState([]);

  // Fetch manufacturers on mount
  useEffect(() => {
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
    fetchManufacturers();
  }, []);

  // Fetch models when manufacturer or category changes
  useEffect(() => {
    const fetchModels = async () => {
      const params = new URLSearchParams();
      if (selectedManufacturer) params.set('make', selectedManufacturer);
      if (selectedCategory) params.set('category', selectedCategory);

      try {
        const res = await fetch(`/api/aircraft/models?${params}`);
        if (res.ok) {
          const data = await res.json();
          setModels(data.models || []);
        }
      } catch (err) {
        console.error('Failed to fetch models:', err);
      }
    };

    fetchModels();
    setSelectedAircraft(null);
  }, [selectedManufacturer, selectedCategory]);

  useEffect(() => {
    const token = localStorage.getItem('vector_token');
    const stored = localStorage.getItem('vector_user');
    if (!token || !stored) {
      router.push('/');
      return;
    }
    setUser(JSON.parse(stored));
    setLoading(false);

    // Fetch all dashboard data in parallel
    const fetchDashboardData = async () => {
      const headers = { Authorization: `Bearer ${token}` };

      // All fetches in parallel for speed
      const [stripeRes, servicesRes, packagesRes, minFeeRes, tipRes, statsRes, quotesRes] = await Promise.allSettled([
        fetch('/api/stripe/status', { headers }),
        fetch('/api/services', { headers }),
        fetch('/api/packages', { headers }),
        fetch('/api/user/minimum-fee', { headers }),
        fetch('/api/tips', { headers }),
        fetch('/api/dashboard/stats', { headers }),
        fetch('/api/quotes?limit=5&sort=created_at&order=desc', { headers }),
      ]);

      // Process Stripe status
      if (stripeRes.status === 'fulfilled' && stripeRes.value.ok) {
        const data = await stripeRes.value.json();
        setStripeStatus(data);
      } else {
        // Fetch failed or returned error - assume not connected
        setStripeStatus({ connected: false, status: 'UNKNOWN' });
      }

      // Process services (new flat list)
      if (servicesRes.status === 'fulfilled' && servicesRes.value.ok) {
        const data = await servicesRes.value.json();
        setAvailableServices(data.services || []);
      }

      // Process packages
      if (packagesRes.status === 'fulfilled' && packagesRes.value.ok) {
        const data = await packagesRes.value.json();
        setAvailablePackages(data.packages || []);
      }

      // Process minimum fee
      if (minFeeRes.status === 'fulfilled' && minFeeRes.value.ok) {
        const data = await minFeeRes.value.json();
        setMinimumFee(data.minimum_callout_fee || 0);
        setMinimumFeeLocations(data.minimum_fee_locations || []);
      }

      // Process daily tip
      if (tipRes.status === 'fulfilled' && tipRes.value.ok) {
        const data = await tipRes.value.json();
        setDailyTip(data.todaysTip);
      }

      // Process quick stats
      if (statsRes.status === 'fulfilled' && statsRes.value.ok) {
        const data = await statsRes.value.json();
        setQuickStats(data);
      }

      // Process recent quotes
      if (quotesRes.status === 'fulfilled' && quotesRes.value.ok) {
        const data = await quotesRes.value.json();
        setRecentQuotes(data.quotes || []);
      }
    };

    fetchDashboardData().catch(err => console.error('Dashboard fetch error:', err));
  }, [router]);

  const handleConnectStripe = async () => {
    setStripeLoading(true);
    setStripeError(null);
    try {
      const token = localStorage.getItem('vector_token');
      if (!token) {
        setStripeError('Not logged in - please refresh and try again');
        return;
      }
      const res = await fetch('/api/stripe/connect', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else if (data.error) {
        const errorMsg = data.details ? `${data.error}: ${data.details}` : data.error;
        console.error('Stripe error:', errorMsg);
        setStripeError(errorMsg);
      } else {
        setStripeError('No redirect URL received - please try again');
      }
    } catch (err) {
      console.error('Failed to connect Stripe:', err);
      setStripeError(`Network error: ${err.message}`);
    } finally {
      setStripeLoading(false);
    }
  };

  const handleSelectAircraft = async (aircraft) => {
    try {
      const res = await fetch(`/api/aircraft/${aircraft.id}`);
      if (res.ok) {
        const data = await res.json();
        const fullAircraft = data.aircraft;
        setSelectedAircraft(fullAircraft);
        setSelectedServices({});
        setSelectedPackage(null);
        setAccessDifficulty(1.0);
        setQuoteNotes('');
        setJobLocation('');
      }
    } catch (err) {
      console.error('Failed to fetch aircraft details:', err);
    }
  };

  const toggleService = (serviceId) => {
    // Deselect any package when manually selecting services
    setSelectedPackage(null);
    setSelectedServices((prev) => ({ ...prev, [serviceId]: !prev[serviceId] }));
  };

  const selectPackage = (pkg) => {
    if (selectedPackage?.id === pkg.id) {
      // Deselect package
      setSelectedPackage(null);
      setSelectedServices({});
    } else {
      // Select package - auto-select its services
      setSelectedPackage(pkg);
      const newSelected = {};
      (pkg.service_ids || []).forEach(id => {
        newSelected[id] = true;
      });
      setSelectedServices(newSelected);
    }
  };

  // Get aircraft hours based on service type (interior vs exterior)
  const getHoursForService = (svc) => {
    if (!selectedAircraft) return 0;
    if (svc?.service_type === 'interior') {
      return selectedAircraft.interior_hours || 0;
    }
    return selectedAircraft.exterior_hours || 0;
  };

  // Calculate price for a single service: aircraft hours × hourly rate
  const getServicePrice = (svc) => {
    const hours = getHoursForService(svc);
    return hours * (svc.hourly_rate || 0);
  };

  // Calculate totals based on selected services or package
  const getSelectedServicesList = () => {
    return availableServices.filter(svc => selectedServices[svc.id]);
  };

  const totalHours = getSelectedServicesList().reduce((sum, svc) => sum + getHoursForService(svc), 0);

  const calculatedPrice = selectedPackage
    ? selectedPackage.price * accessDifficulty
    : getSelectedServicesList().reduce((sum, svc) => sum + getServicePrice(svc), 0) * accessDifficulty;

  // Calculate savings if using package
  const servicesTotal = selectedPackage
    ? getSelectedServicesList().reduce((sum, svc) => sum + getServicePrice(svc), 0)
    : 0;
  const packageSavings = selectedPackage ? Math.max(0, servicesTotal - selectedPackage.price) : 0;

  const minimumFeeApplies = () => {
    if (minimumFee <= 0) return false;
    if (calculatedPrice >= minimumFee) return false;
    if (minimumFeeLocations.length > 0) {
      if (!jobLocation) return false;
      const normalizedJob = jobLocation.toUpperCase().trim();
      return minimumFeeLocations.some(loc =>
        normalizedJob.includes(loc.toUpperCase().trim())
      );
    }
    return true;
  };

  const isMinimumApplied = minimumFeeApplies();
  const totalPrice = isMinimumApplied ? minimumFee : calculatedPrice;

  // Build line items for quote
  const lineItems = getSelectedServicesList().map(svc => ({
    service_id: svc.id,
    description: svc.name,
    service_type: svc.service_type || 'exterior',
    hours: getHoursForService(svc),
    rate: svc.hourly_rate || 0,
    amount: selectedPackage ? 0 : getServicePrice(svc) * accessDifficulty,
  }));

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

  const laborTotal = totalPrice * 0.7;
  const productsTotal = totalPrice * 0.3;

  const quoteData = selectedAircraft
    ? {
        aircraft: {
          id: selectedAircraft.id,
          name: `${selectedAircraft.manufacturer} ${selectedAircraft.model}`,
          category: selectedAircraft.category,
          surface_area_sqft: selectedAircraft.surface_area_sqft,
        },
        selectedServices: getSelectedServicesList(),
        selectedPackage,
        totalHours,
        totalPrice,
        calculatedPrice,
        isMinimumApplied,
        minimumFee: isMinimumApplied ? minimumFee : null,
        jobLocation,
        lineItems,
        laborTotal,
        productsTotal,
        accessDifficulty,
        packageSavings,
      }
    : null;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0f172a] to-[#1e3a5f] flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f172a] to-[#1e3a5f] p-4 text-gray-900">
      {/* Header */}
      <header className="flex justify-between items-center mb-4 text-white">
        <div className="flex items-center space-x-2 text-2xl font-bold">
          <span>&#9992;</span>
          <span>Vector</span>
          {user && <span className="text-lg font-medium">- {user.company}</span>}
        </div>
        <div className="flex items-center space-x-4 text-sm">
          <PointsBadge />
          <a href="/quotes" className="underline">Quotes</a>
          <a href="/calendar" className="underline">Calendar</a>
          <a href="/products" className="underline">Inventory</a>
          <a href="/equipment" className="underline">Equipment</a>
          <a href="/growth" className="underline text-amber-400">Growth</a>
          <a href="/settings" className="underline">Settings</a>
          <button onClick={handleLogout} className="underline">Logout</button>
        </div>
      </header>

      {/* Stripe Warning Banner */}
      {!stripeStatus.connected && stripeStatus.status !== 'CHECKING' && (
        <StripeWarningBanner
          onConnect={handleConnectStripe}
          loading={stripeLoading}
          error={stripeError}
          onClearError={() => setStripeError(null)}
        />
      )}

      {/* Push Notifications Banner */}
      <PushNotifications />

      {/* Quick Stats Bar */}
      <QuickStats stats={quickStats} />

      {/* Recent Quotes */}
      <RecentQuotes quotes={recentQuotes} />

      {/* Quick Actions */}
      <QuickActions />

      {/* Daily Tip - Small and dismissible */}
      {dailyTip && !tipDismissed && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>&#128161;</span>
            <span className="text-sm text-amber-800">
              <strong>{dailyTip.title}:</strong> {dailyTip.content}
            </span>
            {dailyTip.actionLink && (
              <a href={dailyTip.actionLink} className="text-sm text-amber-600 font-medium hover:underline ml-2">
                {dailyTip.action || 'Learn more'} &#8594;
              </a>
            )}
          </div>
          <button
            onClick={() => setTipDismissed(true)}
            className="text-amber-400 hover:text-amber-600 text-lg leading-none ml-2"
            title="Dismiss"
          >
            &#10005;
          </button>
        </div>
      )}

      {/* Services Configuration Prompt */}
      {user && availableServices.length === 0 && (
        <div className="bg-blue-100 border border-blue-300 rounded-lg p-4 mb-4 flex items-center justify-between">
          <div className="flex items-center">
            <span className="text-blue-600 text-xl mr-3">&#9432;</span>
            <div>
              <p className="text-blue-800 font-medium">Set up your service menu</p>
              <p className="text-blue-700 text-sm">Add services you offer to start building quotes.</p>
            </div>
          </div>
          <a
            href="/settings/services"
            className="px-4 py-2 rounded bg-blue-500 text-white font-medium hover:bg-blue-600"
          >
            Add Services
          </a>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-4">
        {/* Left column */}
        <div className="flex-1">
          {/* Aircraft Selection */}
          <div className="bg-white rounded-lg p-4 mb-4 shadow">
            <h3 className="font-semibold mb-3 text-lg">Select Aircraft</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {/* Manufacturer Dropdown */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Manufacturer</label>
                <select
                  value={selectedManufacturer}
                  onChange={(e) => setSelectedManufacturer(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                >
                  <option value="">All Manufacturers</option>
                  {manufacturers.map((mfr) => (
                    <option key={mfr} value={mfr}>{mfr}</option>
                  ))}
                </select>
              </div>

              {/* Category Dropdown */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                >
                  <option value="">All Categories</option>
                  {categoryOrder.map((cat) => (
                    <option key={cat} value={cat}>{categoryLabels[cat]}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Search Input */}
            <div className="mb-3">
              <input
                type="text"
                placeholder="Search models..."
                value={modelSearch}
                onChange={(e) => setModelSearch(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>

            {/* Models Grid */}
            {(() => {
              const filteredModels = models.filter(a => !modelSearch ||
                `${a.manufacturer} ${a.model}`.toLowerCase().includes(modelSearch.toLowerCase()));
              return (
                <>
                  {models.length > 0 && (
                    <p className="text-xs text-gray-500 mb-1">
                      {filteredModels.length} of {models.length} aircraft
                    </p>
                  )}
                  <div className="max-h-64 overflow-y-auto border rounded-lg">
                    {filteredModels.length === 0 ? (
                      <div className="p-4 text-gray-500 text-center">
                        {models.length === 0 ? 'Loading aircraft...' : 'No matches found'}
                      </div>
                    ) : (
                      <div className="divide-y">
                        {filteredModels.map((aircraft) => (
                      <div
                        key={aircraft.id}
                        onClick={() => handleSelectAircraft(aircraft)}
                        className={`p-3 cursor-pointer hover:bg-gray-50 flex justify-between items-center ${
                          selectedAircraft?.id === aircraft.id ? 'bg-amber-50 border-l-4 border-amber-500' : ''
                        }`}
                      >
                        <div>
                          <p className="font-medium">{aircraft.manufacturer} {aircraft.model}</p>
                          <p className="text-sm text-gray-500">{categoryLabels[aircraft.category]} • {aircraft.seats} seats</p>
                        </div>
                        {selectedAircraft?.id === aircraft.id && (
                          <span className="text-amber-500">&#10003;</span>
                        )}
                      </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              );
            })()}
          </div>

          {/* Aircraft Details & Surface Area */}
          {selectedAircraft && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-semibold text-blue-900">{selectedAircraft.manufacturer} {selectedAircraft.model}</h4>
                  <p className="text-blue-700 text-sm">{categoryLabels[selectedAircraft.category]}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-blue-600">Surface Area</p>
                  <p className="text-2xl font-bold text-blue-900">{selectedAircraft.surface_area_sqft?.toLocaleString()} sq ft</p>
                </div>
              </div>
              <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-blue-700">
                <div>Wingspan: {selectedAircraft.wingspan_ft} ft</div>
                <div>Length: {selectedAircraft.length_ft} ft</div>
                <div>Ext Hours: {selectedAircraft.exterior_hours || 0}h</div>
                <div>Int Hours: {selectedAircraft.interior_hours || 0}h</div>
              </div>
            </div>
          )}

          {/* Access Difficulty Multiplier */}
          {selectedAircraft && (
            <div className="bg-white rounded-lg p-4 mb-4 shadow">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-semibold">Access Difficulty</h3>
                <span className="text-lg font-bold text-amber-600">{accessDifficulty.toFixed(2)}x</span>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                Adjust for hangar access, location, or special requirements.
              </p>
              <div className="flex items-center space-x-2">
                {[
                  { value: 1.0, label: 'Standard', desc: 'Easy hangar access' },
                  { value: 1.15, label: 'Moderate', desc: 'Limited access' },
                  { value: 1.3, label: 'Difficult', desc: 'Remote or tight space' },
                  { value: 1.5, label: 'Extreme', desc: 'Special equipment needed' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setAccessDifficulty(opt.value)}
                    className={`flex-1 py-2 px-1 rounded text-xs font-medium transition-colors ${
                      accessDifficulty === opt.value
                        ? 'bg-amber-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Services section */}
          {selectedAircraft && (
            <div className="bg-white rounded-lg p-4 shadow">
              <h3 className="font-semibold text-lg mb-3">Services</h3>

              {availableServices.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-gray-500 mb-2">No services configured yet.</p>
                  <a href="/settings/services" className="text-amber-600 hover:underline text-sm">
                    Add services to get started
                  </a>
                </div>
              ) : (
                <div className="space-y-2">
                  {availableServices.map((svc) => {
                    const hours = getHoursForService(svc);
                    const price = getServicePrice(svc);
                    return (
                      <div
                        key={svc.id}
                        className={`flex items-center py-3 px-3 border rounded-lg cursor-pointer transition-colors ${
                          selectedServices[svc.id]
                            ? 'bg-amber-50 border-amber-300'
                            : 'hover:bg-gray-50 border-gray-200'
                        }`}
                        onClick={() => toggleService(svc.id)}
                      >
                        <input
                          type="checkbox"
                          checked={selectedServices[svc.id] || false}
                          onChange={() => toggleService(svc.id)}
                          className="w-5 h-5 rounded border-gray-300 text-amber-500 focus:ring-amber-500 mr-3"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div className="flex-1">
                          <span className="font-medium">{svc.name}</span>
                          <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded font-medium ${
                            svc.service_type === 'interior'
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            {svc.service_type === 'interior' ? 'INT' : 'EXT'}
                          </span>
                          {svc.description && (
                            <span className="text-xs text-gray-500 block">{svc.description}</span>
                          )}
                          <span className="text-xs text-gray-400">
                            {hours.toFixed(1)}h @ ${svc.hourly_rate}/hr
                          </span>
                        </div>
                        <span className="font-bold text-lg">${price.toFixed(0)}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Packages section */}
              {availablePackages.length > 0 && (
                <div className="mt-6">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <span>&#127873;</span> Or select a package
                  </h4>
                  <div className="space-y-2">
                    {availablePackages.map((pkg) => {
                      const pkgServices = availableServices.filter(s => (pkg.service_ids || []).includes(s.id));
                      const servicesValue = pkgServices.reduce((sum, s) => sum + getServicePrice(s), 0);
                      const savings = Math.max(0, servicesValue - pkg.price);

                      return (
                        <div
                          key={pkg.id}
                          className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                            selectedPackage?.id === pkg.id
                              ? 'bg-green-50 border-green-400'
                              : 'hover:bg-gray-50 border-gray-200'
                          }`}
                          onClick={() => selectPackage(pkg)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold">{pkg.name}</span>
                                {savings > 0 && (
                                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                                    Save ${savings.toFixed(0)}
                                  </span>
                                )}
                              </div>
                              {pkg.description && (
                                <p className="text-sm text-gray-500 mt-1">{pkg.description}</p>
                              )}
                              <p className="text-xs text-gray-400 mt-2">
                                Includes: {pkgServices.map(s => s.name).join(', ') || 'No services'}
                              </p>
                            </div>
                            <div className="text-right">
                              {savings > 0 && (
                                <span className="text-sm text-gray-400 line-through block">
                                  ${servicesValue.toFixed(0)}
                                </span>
                              )}
                              <span className="font-bold text-xl text-green-600">${pkg.price.toFixed(0)}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Job Location */}
          {selectedAircraft && (
            <div className="bg-white rounded-lg p-4 mt-4 shadow">
              <h3 className="font-semibold mb-2">Job Location</h3>
              <input
                type="text"
                value={jobLocation}
                onChange={(e) => setJobLocation(e.target.value)}
                placeholder="Enter airport code or location (e.g., KJFK)"
                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
              {minimumFee > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  {minimumFeeLocations.length > 0
                    ? `Minimum fee of $${minimumFee.toFixed(2)} applies at: ${minimumFeeLocations.join(', ')}`
                    : `Minimum call out fee: $${minimumFee.toFixed(2)}`
                  }
                </p>
              )}
            </div>
          )}

          {/* Quote Notes */}
          {selectedAircraft && (
            <div className="bg-white rounded-lg p-4 mt-4 shadow">
              <h3 className="font-semibold mb-2">Notes</h3>
              <textarea
                value={quoteNotes}
                onChange={(e) => setQuoteNotes(e.target.value)}
                placeholder="Add notes for this quote (visible to customer)..."
                rows={3}
                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 resize-none"
              />
            </div>
          )}
        </div>

        {/* Right column - Quote summary */}
        <div className="w-full lg:w-80">
          <div className="sticky top-4 bg-[#0f172a] text-white rounded-lg p-4 shadow-lg">
            <h3 className="text-lg font-semibold mb-3">Quote Summary</h3>
            {selectedAircraft ? (
              <>
                <p className="mb-1 font-medium">{selectedAircraft.manufacturer} {selectedAircraft.model}</p>
                <p className="text-sm text-gray-400 mb-3">{categoryLabels[selectedAircraft.category]}</p>

                {selectedPackage ? (
                  <div className="mb-3">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-amber-400 font-medium">{selectedPackage.name}</span>
                      <span>${selectedPackage.price.toFixed(0)}</span>
                    </div>
                    <ul className="space-y-1">
                      {getSelectedServicesList().map((svc) => (
                        <li key={svc.id} className="flex justify-between text-xs text-gray-400">
                          <span>{svc.name}</span>
                          <span className="text-gray-500">included</span>
                        </li>
                      ))}
                    </ul>
                    {packageSavings > 0 && (
                      <p className="text-xs text-green-400 mt-2">
                        You save ${packageSavings.toFixed(0)} with this package
                      </p>
                    )}
                  </div>
                ) : (
                  <ul className="mb-3 space-y-1">
                    {getSelectedServicesList().map((svc) => (
                      <li key={svc.id} className="flex justify-between text-sm">
                        <span className="text-gray-300">{svc.name}</span>
                        <span>${(getServicePrice(svc) * accessDifficulty).toFixed(0)}</span>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="border-t border-gray-600 pt-3 space-y-1">
                  <div className="flex justify-between text-sm text-gray-400">
                    <span>Est. Hours</span>
                    <span>{totalHours.toFixed(1)}h</span>
                  </div>
                  {accessDifficulty !== 1.0 && (
                    <div className="text-xs text-gray-500">
                      <span>Difficulty: {accessDifficulty.toFixed(2)}x</span>
                    </div>
                  )}
                  {isMinimumApplied && (
                    <>
                      <div className="flex justify-between text-sm text-gray-500 line-through">
                        <span>Subtotal</span>
                        <span>${calculatedPrice.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm text-amber-400">
                        <span>Minimum Fee Applied</span>
                        <span>+${(minimumFee - calculatedPrice).toFixed(2)}</span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between text-xl font-bold pt-1">
                    <span>Total</span>
                    <span>${totalPrice.toFixed(2)}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={openSendModal}
                  disabled={totalPrice === 0}
                  className="w-full mt-4 px-4 py-3 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 text-white font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Send to Client
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedAircraft(null);
                    setSelectedServices({});
                    setSelectedPackage(null);
                    setAccessDifficulty(1.0);
                    setQuoteNotes('');
                    setJobLocation('');
                    setModelSearch('');
                  }}
                  className="w-full mt-2 px-4 py-2 rounded-lg border border-gray-500 text-gray-300 hover:bg-gray-800 text-sm"
                >
                  Start New Quote
                </button>
              </>
            ) : (
              <div className="text-gray-400 text-center py-8">
                <p>Select an aircraft to build a quote</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {isModalOpen && quoteData && (
        <SendQuoteModal
          isOpen={isModalOpen}
          onClose={closeSendModal}
          quote={{
            aircraft: quoteData.aircraft,
            selectedServices: quoteData.selectedServices,
            selectedPackage: quoteData.selectedPackage,
            totalHours: totalHours,
            totalPrice: totalPrice,
            calculatedPrice: calculatedPrice,
            isMinimumApplied: isMinimumApplied,
            minimumFee: isMinimumApplied ? minimumFee : null,
            jobLocation: jobLocation,
            lineItems: lineItems,
            laborTotal: laborTotal,
            productsTotal: productsTotal,
            accessDifficulty: accessDifficulty,
            packageSavings: packageSavings,
            notes: quoteNotes,
          }}
          user={user}
        />
      )}
    </div>
  );
}
