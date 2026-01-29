"use client";
import { useState, useEffect } from 'react';

export default function DashboardStats() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tipCompleted, setTipCompleted] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      const token = localStorage.getItem('vector_token');
      if (!token) return;

      try {
        const res = await fetch('/api/dashboard/stats', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (err) {
        console.error('Failed to fetch stats:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const handleCompleteTip = async () => {
    if (!stats?.todaysTip || tipCompleted) return;

    const token = localStorage.getItem('vector_token');
    try {
      const res = await fetch('/api/tips', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ tipId: stats.todaysTip.id }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setTipCompleted(true);
          // Update points display
          setStats(prev => ({
            ...prev,
            points: {
              ...prev.points,
              total: prev.points.total + data.points,
              thisWeek: prev.points.thisWeek + data.points,
            },
          }));
        }
      }
    } catch (err) {
      console.error('Failed to complete tip:', err);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg p-4 shadow animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="grid grid-cols-3 gap-4">
          <div className="h-16 bg-gray-200 rounded"></div>
          <div className="h-16 bg-gray-200 rounded"></div>
          <div className="h-16 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-4 mb-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Points Card */}
        <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg p-4 text-white shadow">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-amber-100 text-sm">Points</p>
              <p className="text-2xl font-bold">{stats.points.total.toLocaleString()}</p>
              {stats.points.thisWeek > 0 && (
                <p className="text-amber-200 text-xs">+{stats.points.thisWeek} this week</p>
              )}
            </div>
            <span className="text-2xl opacity-75">&#9733;</span>
          </div>
        </div>

        {/* This Week Jobs */}
        <div className="bg-white rounded-lg p-4 shadow">
          <p className="text-gray-500 text-sm">This Week</p>
          <p className="text-2xl font-bold text-gray-900">{stats.thisWeek.jobs}</p>
          <p className="text-gray-400 text-xs">jobs completed</p>
        </div>

        {/* This Week Revenue */}
        <div className="bg-white rounded-lg p-4 shadow">
          <p className="text-gray-500 text-sm">Week Revenue</p>
          <p className="text-2xl font-bold text-green-600">${stats.thisWeek.booked.toLocaleString()}</p>
          <p className="text-gray-400 text-xs">{stats.thisWeek.quotes} quotes sent</p>
        </div>

        {/* Monthly Revenue */}
        <div className="bg-white rounded-lg p-4 shadow">
          <p className="text-gray-500 text-sm">Monthly Revenue</p>
          <p className="text-2xl font-bold text-gray-900">${stats.thisMonth.booked.toLocaleString()}</p>
          <p className="text-gray-400 text-xs">{stats.thisMonth.jobs} jobs</p>
        </div>
      </div>

      {/* Daily Tip Card */}
      {stats.tipsEnabled && stats.todaysTip && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              <span className="text-2xl">&#128161;</span>
              <div>
                <p className="text-sm text-blue-600 font-medium">Today's Tip</p>
                <p className="text-blue-900 font-semibold">{stats.todaysTip.title}</p>
                <p className="text-blue-700 text-sm mt-1">{getCategoryLabel(stats.todaysTip.category)}</p>
              </div>
            </div>
            {stats.todaysTip.actionable && !tipCompleted && (
              <button
                onClick={handleCompleteTip}
                className="px-3 py-1 bg-blue-500 text-white text-sm font-medium rounded hover:bg-blue-600"
              >
                +20 pts
              </button>
            )}
            {tipCompleted && (
              <span className="text-green-600 text-sm font-medium">&#10003; Done!</span>
            )}
          </div>
          {stats.todaysTip.actionLink && !tipCompleted && (
            <a
              href={stats.todaysTip.actionLink}
              className="inline-block mt-2 text-sm text-blue-600 hover:text-blue-700 underline"
            >
              {stats.todaysTip.action}
            </a>
          )}
        </div>
      )}

      {/* Tips Opt-in (if not yet set) */}
      {stats.tipsEnabled === null && <TipsOptIn onOptIn={() => {
        setStats(prev => ({ ...prev, tipsEnabled: true }));
      }} />}
    </div>
  );
}

function getCategoryLabel(category) {
  const labels = {
    pricing: 'Pricing Strategy',
    efficiency: 'Efficiency',
    marketing: 'Marketing',
    customer_service: 'Customer Service',
    operations: 'Operations',
    growth: 'Growth',
    profitability: 'Profitability',
  };
  return labels[category] || category;
}

function TipsOptIn({ onOptIn }) {
  const [loading, setLoading] = useState(false);

  const handleOptIn = async (enabled) => {
    setLoading(true);
    const token = localStorage.getItem('vector_token');

    try {
      await fetch('/api/notifications/preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ tipsEnabled: enabled }),
      });

      if (enabled) {
        onOptIn();
      }
    } catch (err) {
      console.error('Failed to update tip preference:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-4 text-white">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <span className="text-3xl">&#128161;</span>
          <div>
            <p className="font-semibold">Get Daily Business Tips</p>
            <p className="text-blue-100 text-sm">Earn points and grow your detailing business</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => handleOptIn(false)}
            disabled={loading}
            className="px-3 py-1 text-blue-200 text-sm hover:text-white"
          >
            Not now
          </button>
          <button
            onClick={() => handleOptIn(true)}
            disabled={loading}
            className="px-4 py-2 bg-white text-blue-600 font-medium rounded hover:bg-blue-50"
          >
            {loading ? 'Saving...' : 'Enable Tips'}
          </button>
        </div>
      </div>
    </div>
  );
}
