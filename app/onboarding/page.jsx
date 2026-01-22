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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem('vector_user');
    if (stored) {
      setUser(JSON.parse(stored));
    }
  }, []);

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
        </>
      );
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0f172a] to-[#1e3a5f] p-4">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-md p-6">
        {/* Progress bar */}
        <div className="flex justify-between mb-6">
          {[1, 2, 3].map((num) => (
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
            {loading ? 'Loading...' : step === 3 ? 'Start Quoting!' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  );
}
