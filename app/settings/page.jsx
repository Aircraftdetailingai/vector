"use client";
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

function SettingsContent() {
  const router = useRouter();
  const params = useSearchParams();
  const [user, setUser] = useState(null);
  const [laborRate, setLaborRate] = useState(25);
  const [emailNotifs, setEmailNotifs] = useState({
    quoteCreated: false,
    quoteSent: false,
    weeklySummary: false,
    priceReview: false,
  });
  const [smsAlerts, setSmsAlerts] = useState({
    quoteViewed: false,
    quoteExpiring: false,
  });
  const [smsClient, setSmsClient] = useState({
    quoteDelivery: false,
    followup3: false,
    followup7: false,
    expiration: false,
  });
  const [priceReminder, setPriceReminder] = useState(6);
  const [quoteDisplayPref, setQuoteDisplayPref] = useState('package');
  const [efficiencyFactor, setEfficiencyFactor] = useState(1.0);
  const [stripeStatus, setStripeStatus] = useState({ connected: false, status: 'UNKNOWN' });
  const [stripeLoading, setStripeLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('vector_token');
    const stored = localStorage.getItem('vector_user');
    if (!token || !stored) {
      router.push('/');
      return;
    }
    const u = JSON.parse(stored);
    setUser(u);
    setPriceReminder(u.price_reminder_months || 6);
    setQuoteDisplayPref(u.quote_display_preference || 'package');
    setEfficiencyFactor(u.efficiency_factor || 1.0);
    setLaborRate(u.default_labor_rate || 25);
      setEmailNotifs({
        quoteCreated: u.notification_settings?.quoteCreated || false,
        quoteSent: u.notification_settings?.quoteSent || false,
        weeklySummary: u.notification_settings?.weeklySummary || false,
        priceReview: u.notification_settings?.priceReview || false,
      });
      setSmsAlerts({
        quoteViewed: u.notification_settings?.quoteViewed || false,
        quoteExpiring: u.notification_settings?.quoteExpiring || false,
      });
      setSmsClient({
        quoteDelivery: u.notification_settings?.quoteDelivery || false,
        followup3: u.notification_settings?.followup3 || false,
        followup7: u.notification_settings?.followup7 || false,
        expiration: u.notification_settings?.expiration || false,
      });
  }, [router]);

  const [stripeError, setStripeError] = useState(null);

  useEffect(() => {
    const upgrade = params.get('upgrade');
    if (upgrade === 'business') {
      const el = document.getElementById('smsClients');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }

    // Check for Stripe callback
    const stripeParam = params.get('stripe');
    if (stripeParam === 'success') {
      // Refresh Stripe status
      checkStripeStatus();
    } else if (stripeParam === 'refresh') {
      // User needs to restart onboarding - trigger connect again
      handleConnectStripe();
    } else if (stripeParam === 'error') {
      const message = params.get('message');
      setStripeError(message || 'Failed to connect Stripe');
    }
  }, [params]);

  const checkStripeStatus = async () => {
    try {
      const token = localStorage.getItem('vector_token');
      const res = await fetch('/api/stripe/status', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setStripeStatus(data);
      }
    } catch (err) {
      console.log('Failed to check Stripe status:', err);
    }
  };

  useEffect(() => {
    checkStripeStatus();
  }, []);

  const handleConnectStripe = async () => {
    setStripeLoading(true);
    setStripeError(null);
    try {
      const token = localStorage.getItem('vector_token');
      const res = await fetch('/api/stripe/connect', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      console.log('Stripe connect response:', data);
      if (data.url) {
        window.location.href = data.url;
      } else if (data.error) {
        setStripeError(data.error);
      } else {
        setStripeError('No redirect URL received from Stripe');
      }
    } catch (err) {
      console.error('Failed to connect Stripe:', err);
      setStripeError(err.message || 'Failed to connect to Stripe');
    } finally {
      setStripeLoading(false);
    }
  };

  const saveQuoteDisplayPref = async (pref) => {
    await fetch('/api/user/quote-display', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('vector_token')}`,
      },
      body: JSON.stringify({ quote_display_preference: pref }),
    });
    const newUser = { ...user, quote_display_preference: pref };
    localStorage.setItem('vector_user', JSON.stringify(newUser));
    setUser(newUser);
  };

  const saveEfficiencyFactor = async (factor) => {
    await fetch('/api/user/efficiency-factor', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('vector_token')}`,
      },
      body: JSON.stringify({ efficiency_factor: factor }),
    });
    const newUser = { ...user, efficiency_factor: factor };
    localStorage.setItem('vector_user', JSON.stringify(newUser));
    setUser(newUser);
  };

  const saveLaborRate = async (rate) => {
    await fetch('/api/user/labor-rate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('vector_token')}`,
      },
      body: JSON.stringify({ default_labor_rate: rate }),
    });
    const newUser = { ...user, default_labor_rate: rate };
    localStorage.setItem('vector_user', JSON.stringify(newUser));
    setUser(newUser);
  };

  const saveNotifications = async (settings) => {
    await fetch('/api/user/notification-settings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('vector_token')}`,
      },
      body: JSON.stringify(settings),
    });
    const newUser = { ...user, notification_settings: settings, price_reminder_months: priceReminder };
    localStorage.setItem('vector_user', JSON.stringify(newUser));
    setUser(newUser);
  };

  const planPrice = user?.plan === 'starter' ? '29.95' : user?.plan === 'pro' ? '49.95' : '79.95';

  return (
    <div className="space-y-4">
        {/* Plan banner */}
        <div className="bg-[#0f172a] text-white p-4 rounded">
          <h2 className="text-lg font-semibold mb-1">Current Plan</h2>
          <p className="capitalize mb-2">{user?.plan} - ${planPrice}/mo</p>
          {user?.plan !== 'business' && (
            <a href="/settings?upgrade=business" className="inline-block px-4 py-2 rounded bg-gradient-to-r from-amber-500 to-amber-600 text-white">Upgrade</a>
          )}
        </div>

        {/* Stripe Connect */}
        <div className="bg-white p-4 rounded shadow">
          <h3 className="font-semibold mb-2">Stripe Payments</h3>
          {stripeError && (
            <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
              {stripeError}
              <button onClick={() => setStripeError(null)} className="ml-2 text-red-500 hover:text-red-700">&times;</button>
            </div>
          )}
          {stripeStatus.connected && stripeStatus.status === 'ACTIVE' ? (
            <div>
              <div className="flex items-center mb-2">
                <span className="text-green-500 mr-2">&#10003;</span>
                <span className="text-green-700 font-medium">Connected</span>
              </div>
              {stripeStatus.bankAccount && (
                <p className="text-sm text-gray-600 mb-2">Account: {stripeStatus.bankAccount}</p>
              )}
              <p className="text-sm text-gray-500 mb-3">Status: Active - You can receive payments</p>
              <a
                href="https://dashboard.stripe.com"
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 text-sm underline"
              >
                Manage in Stripe Dashboard
              </a>
            </div>
          ) : stripeStatus.connected && stripeStatus.status === 'PENDING' ? (
            <div>
              <div className="flex items-center mb-2">
                <span className="text-amber-500 mr-2">&#9888;</span>
                <span className="text-amber-700 font-medium">Pending Verification</span>
              </div>
              <p className="text-sm text-gray-600 mb-3">Your Stripe account is being reviewed. This usually takes 1-2 business days.</p>
              <button
                onClick={handleConnectStripe}
                disabled={stripeLoading}
                className="px-4 py-2 rounded bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50"
              >
                {stripeLoading ? 'Loading...' : 'Complete Setup'}
              </button>
            </div>
          ) : (
            <div>
              <div className="flex items-center mb-2">
                <span className="text-red-500 mr-2">&#10007;</span>
                <span className="text-red-700 font-medium">Not Connected</span>
              </div>
              <p className="text-sm text-gray-600 mb-3">Connect Stripe to receive payments for your quotes.</p>
              <button
                onClick={handleConnectStripe}
                disabled={stripeLoading}
                className="px-4 py-2 rounded bg-gradient-to-r from-amber-500 to-amber-600 text-white hover:opacity-90 disabled:opacity-50"
              >
                {stripeLoading ? 'Connecting...' : 'Connect Stripe'}
              </button>
            </div>
          )}
        </div>

        {/* Efficiency Factor */}
        <div className="bg-white p-4 rounded shadow">
          <h3 className="font-semibold mb-2">Efficiency Factor</h3>
          <p className="text-sm text-gray-600 mb-3">
            Adjust estimated hours based on your team's speed. 1.0 = standard, 0.8 = 20% faster, 1.2 = 20% slower.
          </p>
          <div className="flex items-center space-x-4">
            <input
              type="range"
              min="0.5"
              max="1.5"
              step="0.05"
              value={efficiencyFactor}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setEfficiencyFactor(val);
                saveEfficiencyFactor(val);
              }}
              className="flex-1"
            />
            <div className="w-20 text-center">
              <span className="text-2xl font-bold">{efficiencyFactor.toFixed(2)}</span>
              <p className="text-xs text-gray-500">
                {efficiencyFactor < 1 ? `${Math.round((1 - efficiencyFactor) * 100)}% faster` :
                 efficiencyFactor > 1 ? `${Math.round((efficiencyFactor - 1) * 100)}% slower` : 'Standard'}
              </p>
            </div>
          </div>
          <div className="mt-3 flex justify-between text-xs text-gray-400">
            <span>Faster (0.5x)</span>
            <span>Standard (1.0x)</span>
            <span>Slower (1.5x)</span>
          </div>
        </div>

        {/* Default Labor Rate for Profitability */}
        <div className="bg-white p-4 rounded shadow">
          <h3 className="font-semibold mb-2">Default Labor Rate</h3>
          <p className="text-sm text-gray-600 mb-3">
            Your internal labor cost per hour. Used for profitability tracking after job completion.
          </p>
          <div className="flex items-center space-x-2">
            <span className="text-gray-500">$</span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={laborRate}
              onChange={(e) => {
                const val = parseFloat(e.target.value) || 0;
                setLaborRate(val);
              }}
              onBlur={(e) => {
                const val = parseFloat(e.target.value) || 0;
                saveLaborRate(val);
              }}
              className="w-24 border rounded px-3 py-2"
            />
            <span className="text-gray-500">/hr</span>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            This is your cost (wages, overhead), not what you charge customers.
          </p>
        </div>

        {/* Quote Display Preference */}
        <div className="bg-white p-4 rounded shadow">
          <h3 className="font-semibold mb-2">Quote Display for Customers</h3>
          <p className="text-sm text-gray-600 mb-3">Choose what pricing details customers see on their quotes.</p>
          <div className="space-y-3">
            {[
              { value: 'package', label: 'Package Price Only', desc: 'Customer sees single total price (recommended)' },
              { value: 'labor_products', label: 'Labor + Products', desc: 'Shows two line items: labor and products/materials' },
              { value: 'full_breakdown', label: 'Full Breakdown', desc: 'Shows all service line items with individual pricing' },
            ].map((option) => (
              <label
                key={option.value}
                className={`flex items-start p-3 border rounded-lg cursor-pointer transition-colors ${
                  quoteDisplayPref === option.value ? 'border-amber-500 bg-amber-50' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="quoteDisplay"
                  value={option.value}
                  checked={quoteDisplayPref === option.value}
                  onChange={(e) => {
                    setQuoteDisplayPref(e.target.value);
                    saveQuoteDisplayPref(e.target.value);
                  }}
                  className="mt-1 mr-3"
                />
                <div>
                  <p className="font-medium">{option.label}</p>
                  <p className="text-sm text-gray-500">{option.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Email Notifications */}
        <div className="bg-white p-4 rounded shadow">
          <h3 className="font-semibold mb-2">Email Notifications</h3>
          {[
            { key: 'quoteCreated', label: 'Quote created confirmation' },
            { key: 'quoteSent', label: 'Quote sent confirmation' },
            { key: 'weeklySummary', label: 'Weekly summary' },
            { key: 'priceReview', label: 'Price review reminders' },
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between mb-2">
              <span>{item.label}</span>
              <input
                type="checkbox"
                checked={emailNotifs[item.key]}
                onChange={(e) => {
                  const newSettings = { ...emailNotifs, [item.key]: e.target.checked };
                  setEmailNotifs(newSettings);
                  saveNotifications({ ...user?.notification_settings, ...newSettings, ...smsAlerts, ...smsClient });
                }}
              />
            </div>
          ))}
        </div>
        {/* SMS Alerts to You */}
        <div className="bg-white p-4 rounded shadow">
          <h3 className="font-semibold mb-2">SMS Alerts to You</h3>
          {user?.plan === 'starter' && (
            <div className="text-center py-4">
              <p className="mb-2">SMS alerts are available on Pro plans.</p>
              <a href="/settings?upgrade=pro" className="px-4 py-2 rounded bg-gradient-to-r from-amber-500 to-amber-600 text-white">Upgrade to Pro</a>
            </div>
          )}
          {user && user.plan !== 'starter' && (
            [
              { key: 'quoteViewed', label: 'Quote viewed alert' },
              { key: 'quoteExpiring', label: 'Quote expiring soon' },
            ].map((item) => (
              <div key={item.key} className="flex items-center justify-between mb-2">
                <span>{item.label}</span>
                <input
                  type="checkbox"
                  checked={smsAlerts[item.key]}
                  onChange={(e) => {
                    const newSettings = { ...smsAlerts, [item.key]: e.target.checked };
                    setSmsAlerts(newSettings);
                    saveNotifications({ ...user?.notification_settings, ...emailNotifs, ...newSettings, ...smsClient });
                  }}
                />
              </div>
            ))
          )}
        </div>
        {/* SMS to Your Clients */}
        <div id="smsClients" className="bg-white p-4 rounded shadow">
          <h3 className="font-semibold mb-2">SMS to Your Clients</h3>
          {user?.plan !== 'business' && (
            <div className="text-center py-4">
              <p className="mb-2">Texting clients is available on the Business plan.</p>
              <a href="/settings?upgrade=business" className="px-4 py-2 rounded bg-gradient-to-r from-amber-500 to-amber-600 text-white">Upgrade to Business</a>
            </div>
          )}
          {user?.plan === 'business' && (
            [
              { key: 'quoteDelivery', label: 'Quote delivery via SMS' },
              { key: 'followup3', label: '3-day follow-up' },
              { key: 'followup7', label: '7-day follow-up' },
              { key: 'expiration', label: 'Expiration warning to client' },
            ].map((item) => (
              <div key={item.key} className="flex items-center justify-between mb-2">
                <span>{item.label}</span>
                <input
                  type="checkbox"
                  checked={smsClient[item.key]}
                  onChange={(e) => {
                    const newSettings = { ...smsClient, [item.key]: e.target.checked };
                    setSmsClient(newSettings);
                    saveNotifications({ ...user?.notification_settings, ...emailNotifs, ...smsAlerts, ...newSettings });
                  }}
                />
              </div>
            ))
          )}
        </div>
        {/* Account Section */}
        <div className="bg-white p-4 rounded shadow">
          <h3 className="font-semibold mb-2">Account</h3>
          <p className="mb-2">Email: {user?.email}</p>
          <a href="#" className="text-blue-600 underline mb-2 inline-block">Change Password</a>
          <div className="mt-2">
            <label className="block mb-1">Price Review Reminder</label>
            <select
              value={priceReminder}
              onChange={(e) => {
                setPriceReminder(parseInt(e.target.value));
                saveNotifications({ ...user?.notification_settings, priceReviewMonths: parseInt(e.target.value) });
              }}
              className="border rounded px-2 py-1"
            >
              <option value={6}>Every 6 months</option>
              <option value={12}>Every 12 months</option>
            </select>
          </div>
        </div>
      </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="text-gray-500 p-4">Loading...</div>}>
      <SettingsContent />
    </Suspense>
  );
}
