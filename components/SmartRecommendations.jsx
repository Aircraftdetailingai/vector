"use client";
import { useState, useEffect } from 'react';

const typeIcons = {
  rate_increase: '💰',
  problem_customer: '⚠️',
  profitability: '📊',
  upsell: '📈',
  market_rate: '🎯',
  time_accuracy: '⏱️',
  payment_terms: '💳',
};

const typeColors = {
  rate_increase: 'bg-green-50 border-green-200',
  problem_customer: 'bg-red-50 border-red-200',
  profitability: 'bg-blue-50 border-blue-200',
  upsell: 'bg-purple-50 border-purple-200',
  market_rate: 'bg-amber-50 border-amber-200',
  time_accuracy: 'bg-orange-50 border-orange-200',
  payment_terms: 'bg-yellow-50 border-yellow-200',
};

export default function SmartRecommendations() {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actingOn, setActingOn] = useState(null);

  useEffect(() => {
    fetchRecommendations();
  }, []);

  const fetchRecommendations = async () => {
    try {
      const token = localStorage.getItem('vector_token');
      const res = await fetch('/api/recommendations', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setRecommendations(data.recommendations || []);
      }
    } catch (err) {
      console.error('Failed to fetch recommendations:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (recId, action) => {
    setActingOn(recId);
    try {
      const token = localStorage.getItem('vector_token');
      const res = await fetch('/api/recommendations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          recommendationId: recId,
          action,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        // Remove from list
        setRecommendations(recs => recs.filter(r => r.id !== recId));

        if (action === 'act' && data.pointsAwarded) {
          // Could show a toast here
        }
      }
    } catch (err) {
      console.error('Failed to update recommendation:', err);
    } finally {
      setActingOn(null);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg p-4 shadow mb-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xl">🧠</span>
          <h3 className="font-semibold">Smart Recommendations</h3>
        </div>
        <div className="animate-pulse space-y-2">
          <div className="h-16 bg-gray-100 rounded"></div>
          <div className="h-16 bg-gray-100 rounded"></div>
        </div>
      </div>
    );
  }

  if (recommendations.length === 0) {
    return (
      <div className="bg-white rounded-lg p-4 shadow mb-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xl">🧠</span>
          <h3 className="font-semibold">Smart Recommendations</h3>
        </div>
        <p className="text-gray-500 text-sm">
          Complete more jobs to get personalized business insights. We analyze your data to find opportunities to increase revenue.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg p-4 shadow mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">🧠</span>
          <h3 className="font-semibold">Smart Recommendations</h3>
        </div>
        <span className="text-xs text-gray-400">{recommendations.length} insights</span>
      </div>

      <div className="space-y-3">
        {recommendations.slice(0, 3).map((rec) => (
          <div
            key={rec.id}
            className={`border rounded-lg p-3 ${typeColors[rec.type] || 'bg-gray-50 border-gray-200'}`}
          >
            <div className="flex items-start gap-3">
              <span className="text-xl">{typeIcons[rec.type] || '💡'}</span>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-gray-900">{rec.title}</p>
                <p className="text-sm text-gray-600 mt-0.5">{rec.message}</p>

                <div className="flex items-center gap-2 mt-2">
                  <button
                    onClick={() => handleAction(rec.id, 'act')}
                    disabled={actingOn === rec.id}
                    className="px-3 py-1 text-xs font-medium bg-amber-500 text-white rounded hover:bg-amber-600 disabled:opacity-50"
                  >
                    {actingOn === rec.id ? 'Processing...' : 'Act on this (+50 pts)'}
                  </button>
                  <button
                    onClick={() => handleAction(rec.id, 'dismiss')}
                    disabled={actingOn === rec.id}
                    className="px-3 py-1 text-xs text-gray-500 hover:text-gray-700"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {recommendations.length > 3 && (
        <p className="text-xs text-gray-400 text-center mt-3">
          + {recommendations.length - 3} more recommendations
        </p>
      )}
    </div>
  );
}
