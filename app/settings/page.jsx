"use client";
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

const rateFields = [
  { key: 'exterior', label: 'Exterior Wash & Detail' },
  { key: 'interior', label: 'Interior Detail' },
  { key: 'brightwork', label: 'Brightwork Polish' },
  { key: 'ceramicCoating', label: 'Ceramic Coating' },
  { key: 'engineDetail', label: 'Engine Detail' },
];

function SettingsContent() {
  const params = useSearchParams();
  const [user, setUser] = useState(null);
  const [rates, setRates] = useState({
    exterior: 0,
    interior: 0,
    brightwork: 0,
    ceramicCoating: 0,
    engineDetail: 0,
  });
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

  useEffect(() => {
    const stored = localStorage.getItem('vector_user');
    if (stored) {
      const u = JSON.parse(stored);
      setUser(u);
      setRates({ ...u.rates });
      setPriceReminder(u.price_reminder_months || 6);
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
    }
  }, []);

  useEffect(() => {
    const upgrade = params.get('upgrade');
    if (upgrade === 'business') {
      const el = document.getElementById('smsClients');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  }, [params]);

  const saveRates = async () => {
    await fetch('/api/user/update-rates', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('vector_token')}`,
      },
      body: JSON.stringify({ rates }),
    });
    const newUser = { ...user, rates };
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
    <div className="min-h-screen bg-gradient-to-br from-[#0f172a] to-[#1e3a5f] p-4 text-gray-900">
      <header className="text-white flex items-center mb-4 space-x-2">
        <a href="/dashboard" className="text-2xl">&#8592;</a>
        <h1 className="text-2xl font-bold">Settings</h1>
      </header>
      <div className="space-y-4">
        {/* Plan banner */}
        <div className="bg-[#0f172a] text-white p-4 rounded">
          <h2 className="text-lg font-semibold mb-1">Current Plan</h2>
          <p className="capitalize mb-2">{user?.plan} - ${planPrice}/mo</p>
          {user?.plan !== 'business' && (
            <a href="/settings?upgrade=business" className="inline-block px-4 py-2 rounded bg-gradient-to-r from-amber-500 to-amber-600 text-white">Upgrade</a>
          )}
        </div>
        {/* Hourly rates */}
        <div className="bg-white p-4 rounded shadow">
          <h3 className="font-semibold mb-2">Hourly Rates</h3>
          {rateFields.map((f) => (
            <div key={f.key} className="flex items-center mb-2">
              <label className="w-48">{f.label}</label>
              <div className="flex items-center">
                <span className="mr-1">$</span>
                <input
                  type="number"
                  step="0.1"
                  value={rates[f.key] || 0}
                  onChange={(e) => setRates({ ...rates, [f.key]: parseFloat(e.target.value) || 0 })}
                  className="w-24 border rounded px-2 py-1"
                />
                <span className="ml-1">/hr</span>
              </div>
            </div>
          ))}
          <button onClick={saveRates} className="mt-2 px-4 py-2 rounded bg-gradient-to-r from-amber-500 to-amber-600 text-white">Save Rates</button>
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
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gradient-to-br from-[#0f172a] to-[#1e3a5f] p-4">Loading...</div>}>
      <SettingsContent />
    </Suspense>
  );
}
