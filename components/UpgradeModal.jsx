"use client";
import { useState, useEffect } from 'react';
import { EquipmentTeaser } from './EquipmentROI';

export default function UpgradeModal({ isOpen, onClose, detailerId, existingServices = [] }) {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);

  useEffect(() => {
    if (isOpen && detailerId) {
      fetchAnalysis();
    }
  }, [isOpen, detailerId]);

  const fetchAnalysis = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('vector_token');
      const res = await fetch('/api/usage/analysis', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAnalysis(data);
      }
    } catch (err) {
      console.error('Failed to fetch upgrade analysis:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async () => {
    if (!analysis?.nextTier) return;
    setUpgrading(true);

    try {
      const token = localStorage.getItem('vector_token');
      const res = await fetch('/api/upgrade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ tier: analysis.nextTier }),
      });

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else if (data.error) {
        alert(data.error);
      }
    } catch (err) {
      console.error('Upgrade failed:', err);
      alert('Failed to start upgrade process');
    } finally {
      setUpgrading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-2xl">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-500">Analyzing your usage...</p>
          </div>
        ) : analysis ? (
          <>
            {/* Header */}
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {analysis.recommendation === 'strong' ? '🚀 Time to Upgrade!' :
                   analysis.recommendation === 'moderate' ? '📈 Consider Upgrading' :
                   '✨ Your Plan Status'}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Current plan: <span className="font-medium capitalize">{analysis.currentTier}</span>
                </p>
              </div>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">
                &times;
              </button>
            </div>

            {/* AI Message */}
            <div className={`p-4 rounded-lg mb-6 ${
              analysis.urgency === 'high' ? 'bg-red-50 border border-red-200' :
              analysis.urgency === 'medium' ? 'bg-amber-50 border border-amber-200' :
              'bg-blue-50 border border-blue-200'
            }`}>
              <p className={`font-medium ${
                analysis.urgency === 'high' ? 'text-red-800' :
                analysis.urgency === 'medium' ? 'text-amber-800' :
                'text-blue-800'
              }`}>
                {analysis.message}
              </p>
            </div>

            {/* Usage Stats */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Quotes This Month</p>
                <p className="text-2xl font-bold">
                  {analysis.stats.quotesThisMonth}
                  <span className="text-sm font-normal text-gray-500">
                    /{analysis.stats.quotesLimit === Infinity ? '∞' : analysis.stats.quotesLimit}
                  </span>
                </p>
                {analysis.quotesUsedPercent >= 80 && (
                  <div className="mt-2">
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${analysis.quotesUsedPercent >= 100 ? 'bg-red-500' : 'bg-amber-500'}`}
                        style={{ width: `${Math.min(100, analysis.quotesUsedPercent)}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Avg Monthly Revenue</p>
                <p className="text-2xl font-bold">${analysis.stats.avgMonthlyRevenue.toLocaleString()}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Current Fee Rate</p>
                <p className="text-2xl font-bold">{(analysis.stats.feeRate * 100).toFixed(0)}%</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Fees This Month</p>
                <p className="text-2xl font-bold">${analysis.stats.feesThisMonth.toFixed(2)}</p>
              </div>
            </div>

            {/* Upgrade Comparison */}
            {analysis.nextTier && analysis.savings && (
              <div className="border rounded-lg p-4 mb-6">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <p className="font-semibold text-lg">{analysis.savings.nextTierName}</p>
                    <p className="text-gray-500">${analysis.savings.nextTierPrice}/month</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Platform fee</p>
                    <p className="font-bold text-green-600">
                      {(analysis.savings.targetMonthlyFees / analysis.stats.avgMonthlyRevenue * 100).toFixed(0)}%
                      <span className="text-gray-400 text-sm ml-1">
                        (vs {(analysis.stats.feeRate * 100).toFixed(0)}%)
                      </span>
                    </p>
                  </div>
                </div>

                {analysis.savings.netMonthlySavings > 0 ? (
                  <>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                      <p className="text-green-800 font-medium">
                        You'd save <span className="text-xl font-bold">${analysis.savings.netMonthlySavings.toFixed(2)}</span>/month
                      </p>
                      <p className="text-green-600 text-sm">
                        That's ${(analysis.savings.netMonthlySavings * 12).toFixed(2)}/year!
                      </p>
                    </div>
                    {/* Equipment ROI Teaser */}
                    <EquipmentTeaser
                      monthlySavings={analysis.savings.netMonthlySavings}
                      existingServices={existingServices}
                    />
                  </>
                ) : (
                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <p className="text-gray-600 text-sm">
                      Upgrade pays for itself at ${analysis.savings.breakevenRevenue.toFixed(0)}/month revenue
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-3 border rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Maybe Later
              </button>
              {analysis.nextTier && (
                <button
                  onClick={handleUpgrade}
                  disabled={upgrading}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-lg font-semibold hover:opacity-90 disabled:opacity-50"
                >
                  {upgrading ? 'Processing...' : `Upgrade to ${analysis.savings?.nextTierName}`}
                </button>
              )}
            </div>
          </>
        ) : (
          <div className="text-center py-8">
            <p className="text-red-500">Failed to load upgrade analysis</p>
            <button onClick={onClose} className="mt-4 text-gray-600 underline">Close</button>
          </div>
        )}
      </div>
    </div>
  );
}
