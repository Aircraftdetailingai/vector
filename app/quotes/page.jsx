"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const statusColors = {
  draft: 'bg-gray-100 text-gray-700',
  sent: 'bg-blue-100 text-blue-700',
  viewed: 'bg-amber-100 text-amber-700',
  paid: 'bg-green-100 text-green-700',
  approved: 'bg-green-100 text-green-700',
  completed: 'bg-purple-100 text-purple-700',
  expired: 'bg-red-100 text-red-700',
};

const statusLabels = {
  draft: 'Draft',
  sent: 'Sent',
  viewed: 'Viewed',
  paid: 'Paid',
  approved: 'Approved',
  completed: 'Completed',
  expired: 'Expired',
};

export default function QuotesPage() {
  const router = useRouter();
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [completeModal, setCompleteModal] = useState(null);
  const [completionData, setCompletionData] = useState({
    actual_hours: '',
    product_cost: '',
    notes: '',
  });
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('vector_token');
    if (!token) {
      router.push('/');
      return;
    }

    const fetchQuotes = async () => {
      try {
        const res = await fetch('/api/quotes', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setQuotes(data || []);
        }
      } catch (err) {
        console.error('Failed to fetch quotes:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchQuotes();
  }, [router]);

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getStatus = (quote) => {
    if (quote.status === 'completed') return 'completed';
    if (quote.status === 'paid' || quote.status === 'approved') return 'paid';
    if (new Date() > new Date(quote.valid_until)) return 'expired';
    return quote.status || 'draft';
  };

  const openCompleteModal = (quote) => {
    setCompleteModal(quote);
    setCompletionData({
      actual_hours: quote.total_hours?.toString() || '',
      product_cost: '',
      notes: '',
    });
  };

  const completeJob = async () => {
    if (!completionData.actual_hours || !completeModal) return;
    setCompleting(true);

    try {
      const token = localStorage.getItem('vector_token');
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          quote_id: completeModal.id,
          actual_hours: parseFloat(completionData.actual_hours),
          product_cost: parseFloat(completionData.product_cost) || 0,
          notes: completionData.notes,
        }),
      });

      if (res.ok) {
        // Update quote status locally
        setQuotes(quotes.map(q =>
          q.id === completeModal.id ? { ...q, status: 'completed' } : q
        ));
        setCompleteModal(null);
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to complete job');
      }
    } catch (err) {
      alert('Failed to complete job');
    } finally {
      setCompleting(false);
    }
  };

  const filteredQuotes = quotes.filter((q) => {
    const status = getStatus(q);
    if (filter === 'all') return true;
    if (filter === 'active') return ['sent', 'viewed'].includes(status);
    if (filter === 'paid') return status === 'paid';
    if (filter === 'completed') return status === 'completed';
    if (filter === 'expired') return status === 'expired';
    return true;
  });

  const stats = {
    total: quotes.length,
    active: quotes.filter(q => ['sent', 'viewed'].includes(getStatus(q))).length,
    paid: quotes.filter(q => getStatus(q) === 'paid').length,
    completed: quotes.filter(q => getStatus(q) === 'completed').length,
    revenue: quotes.filter(q => ['paid', 'completed'].includes(getStatus(q))).reduce((sum, q) => sum + (q.total_price || 0), 0),
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0f172a] to-[#1e3a5f] flex items-center justify-center">
        <div className="text-white text-xl">Loading quotes...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f172a] to-[#1e3a5f] p-4">
      {/* Header */}
      <header className="flex justify-between items-center mb-6 text-white">
        <div className="flex items-center space-x-4">
          <a href="/dashboard" className="text-2xl hover:text-amber-400">&#8592;</a>
          <h1 className="text-2xl font-bold">Quote History</h1>
        </div>
        <a
          href="/dashboard"
          className="px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 text-white font-medium hover:opacity-90"
        >
          New Quote
        </a>
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-lg p-4 shadow">
          <p className="text-gray-500 text-sm">Total</p>
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow">
          <p className="text-gray-500 text-sm">Active</p>
          <p className="text-2xl font-bold text-amber-600">{stats.active}</p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow">
          <p className="text-gray-500 text-sm">Paid</p>
          <p className="text-2xl font-bold text-green-600">{stats.paid}</p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow">
          <p className="text-gray-500 text-sm">Completed</p>
          <p className="text-2xl font-bold text-purple-600">{stats.completed}</p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow">
          <p className="text-gray-500 text-sm">Revenue</p>
          <p className="text-2xl font-bold text-blue-600">${stats.revenue.toLocaleString()}</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex space-x-2 mb-4 overflow-x-auto">
        {['all', 'active', 'paid', 'completed', 'expired'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg font-medium text-sm ${
              filter === f
                ? 'bg-amber-500 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Quotes List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {filteredQuotes.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p>No quotes found</p>
          </div>
        ) : (
          <div className="divide-y">
            {filteredQuotes.map((quote) => {
              const status = getStatus(quote);
              return (
                <div key={quote.id} className="p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <p className="font-semibold text-gray-900">
                          {quote.aircraft_model || quote.aircraft_type}
                        </p>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[status]}`}>
                          {statusLabels[status]}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">
                        {quote.client_name && `${quote.client_name} • `}
                        Created {formatDate(quote.created_at)}
                        {quote.valid_until && ` • Valid until ${formatDate(quote.valid_until)}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900">
                        ${(quote.total_price || 0).toFixed(2)}
                      </p>
                      <p className="text-sm text-gray-500">
                        {quote.total_hours?.toFixed(1)} hrs
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 flex space-x-3 text-sm">
                    {quote.share_link && (
                      <>
                        <a
                          href={`/q/${quote.share_link}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          View Quote
                        </a>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(`${window.location.origin}/q/${quote.share_link}`);
                          }}
                          className="text-gray-600 hover:text-gray-900"
                        >
                          Copy Link
                        </button>
                      </>
                    )}
                    {status === 'paid' && (
                      <button
                        onClick={() => openCompleteModal(quote)}
                        className="text-purple-600 hover:text-purple-800 font-medium"
                      >
                        Complete Job
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Complete Job Modal */}
      {completeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Complete Job</h3>
            <p className="text-gray-600 mb-4">
              {completeModal.aircraft_model || completeModal.aircraft_type}
              {completeModal.client_name && ` - ${completeModal.client_name}`}
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Actual Hours Worked *</label>
                <input
                  type="number"
                  step="0.25"
                  value={completionData.actual_hours}
                  onChange={(e) => setCompletionData({ ...completionData, actual_hours: e.target.value })}
                  placeholder={`Estimated: ${completeModal.total_hours?.toFixed(1) || '0'}`}
                  className="w-full border rounded px-3 py-2"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Quote estimate: {completeModal.total_hours?.toFixed(1) || '0'} hours
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Product/Material Cost</label>
                <div className="flex items-center">
                  <span className="mr-1">$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={completionData.product_cost}
                    onChange={(e) => setCompletionData({ ...completionData, product_cost: e.target.value })}
                    placeholder="0.00"
                    className="w-32 border rounded px-3 py-2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Notes (optional)</label>
                <textarea
                  value={completionData.notes}
                  onChange={(e) => setCompletionData({ ...completionData, notes: e.target.value })}
                  placeholder="Any notes about this job..."
                  className="w-full border rounded px-3 py-2"
                  rows={2}
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setCompleteModal(null)}
                className="px-4 py-2 border rounded text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={completeJob}
                disabled={!completionData.actual_hours || completing}
                className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
              >
                {completing ? 'Saving...' : 'Complete Job'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
