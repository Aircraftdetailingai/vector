"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [user, setUser] = useState(null);
  const [company, setCompany] = useState('');
  const [phone, setPhone] = useState('');
  const [priceReminder, setPriceReminder] = useState('6');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [rates, setRates] = useState({
    exterior: '',
    interior: '',
    brightwork: '',
    ceramicCoating: '',
    engineDetail: '',
  });
  const [baseline, setBaseline] = useState({
    annual_revenue: '',
    quote_time: '',
    conversion_rate: '',
    admin_hours: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('vector_token');
    const stored = localStorage.getItem('vector_user');
    if (!token || !stored) {
      router.push('/');
      return;
    }
    setUser(JSON.parse(stored));
  }, [router]);

  const handleNext = async () => {
    setError('');
    if (step === 1) {
      setStep(2);
    } else if (step === 2) {
      if (newPassword.length < 8) {
        setPasswordError('Password must be at least 8 characters');
        return;
      }
      if (newPassword !== confirmPassword) {
        setPasswordError('Passwords do not match');
        return;
      }
      setPasswordError('');
      setStep(3);
    } else if (step === 3) {
      setStep(4);
    } else if (step === 4) {
      if (!user) {
        setError('User not found');
        return;
      }
      setLoading(true);
      try {
        const res = await fetch('/api/auth/complete-onboarding', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            newPassword,
            company,
            phone,
            rates: {
              exterior: parseFloat(rates.exterior || 0),
              interior: parseFloat(rates.interior || 0),
              brightwork: parseFloat(rates.brightwork || 0),
              ceramicCoating: parseFloat(rates.ceramicCoating || 0),
              engineDetail: parseFloat(rates.engineDetail || 0),
            },
            priceReminderMonths: parseInt(priceReminder, 10),
          }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to complete onboarding');
        }
        const data = await res.json();
        localStorage.setItem('vector_user', JSON.stringify(data.user || data));

        // Save baseline data
        const token = localStorage.getItem('vector_token');
        if (baseline.annual_revenue || baseline.quote_time || baseline.conversion_rate || baseline.admin_hours) {
          await fetch('/api/roi/baseline', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              annual_revenue_estimate: baseline.annual_revenue,
              quote_creation_time_minutes: baseline.quote_time,
              quote_conversion_rate: baseline.conversion_rate,
              admin_hours_per_week: baseline.admin_hours,
            }),
          });
        }

        router.push('/dashboard');
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const renderStep = () => {
    if (step === 1) {
      return (
        <>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Company Name</label>
            <input
              type="text"
              className="w-full border rounded p-2"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Phone Number</label>
            <input
              type="text"
              className="w-full border rounded p-2"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <p className="text-xs text-gray-500 mt-1">For SMS notifications</p>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Price Review Reminder</label>
            <select
              className="w-full border rounded p-2"
              value={priceReminder}
              onChange={(e) => setPriceReminder(e.target.value)}
            >
              <option value="6">6 months</option>
              <option value="12">12 months</option>
            </select>
          </div>
        </>
      );
    }
    if (step === 2) {
      return (
        <>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">New Password</label>
            <input
              type="password"
              className="w-full border rounded p-2"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Confirm Password</label>
            <input
              type="password"
              className="w-full border rounded p-2"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
          {passwordError && <p className="text-red-500 text-sm mb-4">{passwordError}</p>}
        </>
      );
    }
    if (step === 3) {
      const labels = {
        exterior: 'Exterior Wash & Detail',
        interior: 'Interior Detail',
        brightwork: 'Brightwork Polish',
        ceramicCoating: 'Ceramic Coating',
        engineDetail: 'Engine Detail',
      };
      return (
        <>
          <p className="text-sm text-gray-600 mb-4">
            Set your hourly rates. You can adjust these anytime in Settings.
          </p>
          {Object.keys(labels).map((key) => (
            <div className="mb-4" key={key}>
              <label className="block text-sm font-medium mb-1">{labels[key]}</label>
              <div className="flex items-center">
                <span className="mr-2">$</span>
                <input
                  type="number"
                  className="flex-1 border rounded p-2"
                  value={rates[key]}
                  onChange={(e) => setRates({ ...rates, [key]: e.target.value })}
                />
                <span className="ml-2">/hr</span>
              </div>
            </div>
          ))}

          {/* Pro Tip Card */}
          <div className="mt-6 p-4 bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-lg">
            <div className="flex items-start gap-3">
              <span className="text-2xl">💰</span>
              <div>
                <p className="font-semibold text-amber-800 text-sm">Money Tip</p>
                <p className="text-sm text-amber-700 mt-1">
                  For recurring customers, bill every <strong>4 weeks</strong> instead of monthly.
                  4 weeks = 13 billing cycles/year vs 12 months = <strong>8% more annual revenue</strong>.
                  Most customers won't notice the difference!
                </p>
              </div>
            </div>
          </div>
        </>
      );
    }
    if (step === 4) {
      return (
        <>
          <div className="text-center mb-4">
            <span className="text-4xl">📊</span>
            <h2 className="text-lg font-semibold mt-2">Track Your ROI</h2>
            <p className="text-sm text-gray-600">
              Help us show you how much value Vector provides. These are estimates - we'll track the real numbers going forward.
            </p>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Current Annual Revenue (estimate)</label>
            <div className="flex items-center">
              <span className="mr-2">$</span>
              <input
                type="number"
                className="flex-1 border rounded p-2"
                placeholder="e.g., 150000"
                value={baseline.annual_revenue}
                onChange={(e) => setBaseline({ ...baseline, annual_revenue: e.target.value })}
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">How long to create a quote? (minutes)</label>
            <input
              type="number"
              className="w-full border rounded p-2"
              placeholder="e.g., 15"
              value={baseline.quote_time}
              onChange={(e) => setBaseline({ ...baseline, quote_time: e.target.value })}
            />
            <p className="text-xs text-gray-500 mt-1">Including looking up pricing, writing emails, etc.</p>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">What % of quotes become jobs?</label>
            <div className="flex items-center">
              <input
                type="number"
                className="flex-1 border rounded p-2"
                placeholder="e.g., 40"
                value={baseline.conversion_rate}
                onChange={(e) => setBaseline({ ...baseline, conversion_rate: e.target.value })}
              />
              <span className="ml-2">%</span>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Hours/week on admin tasks?</label>
            <input
              type="number"
              className="w-full border rounded p-2"
              placeholder="e.g., 8"
              value={baseline.admin_hours}
              onChange={(e) => setBaseline({ ...baseline, admin_hours: e.target.value })}
            />
            <p className="text-xs text-gray-500 mt-1">Quotes, invoicing, scheduling, follow-ups, etc.</p>
          </div>

          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
            <p className="text-sm text-emerald-700">
              <strong>Why we ask:</strong> We'll track your actual metrics and show you the ROI - time saved, extra revenue, and more. Most detailers see <strong>10-15x return</strong> on their Vector subscription.
            </p>
          </div>
        </>
      );
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0f172a] to-[#1e3a5f] p-4">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-md p-6">
        {/* Progress bar */}
        <div className="flex justify-between mb-6">
          {[1, 2, 3, 4].map((num) => (
            <div key={num} className="flex-1 mx-1">
              <div
                className={`h-2 rounded ${step >= num ? 'bg-amber-500' : 'bg-gray-200'}`}
              ></div>
              <div className="text-center text-xs mt-1 text-gray-600">{num}</div>
            </div>
          ))}
        </div>
        {error && <p className="text-red-500 mb-4">{error}</p>}
        {renderStep()}
        <div className="mt-6 flex justify-between">
          {step > 1 ? (
            <button
              onClick={handleBack}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md"
            >
              Back
            </button>
          ) : (
            <span></span>
          )}
          <button
            onClick={handleNext}
            disabled={loading}
            className="ml-auto px-4 py-2 rounded-md text-white bg-gradient-to-r from-amber-500 to-amber-600 disabled:opacity-50"
          >
            {loading ? 'Loading...' : step === 4 ? 'Start Quoting!' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  );
}
