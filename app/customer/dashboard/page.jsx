"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CustomerDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [customer, setCustomer] = useState(null);
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedDetailer, setSelectedDetailer] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('customer_token');
    const user = localStorage.getItem('customer_user');

    if (!token) {
      router.push('/customer/login');
      return;
    }

    try {
      setCustomer(JSON.parse(user));
    } catch (e) {}

    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const token = localStorage.getItem('customer_token');
      const res = await fetch('/api/customer/dashboard', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        if (res.status === 401) {
          localStorage.removeItem('customer_token');
          localStorage.removeItem('customer_user');
          router.push('/customer/login');
          return;
        }
        throw new Error('Failed to fetch dashboard');
      }

      const data = await res.json();
      setData(data);
      setCustomer(data.customer);
    } catch (err) {
      console.error('Dashboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (detailerId) => {
    try {
      const token = localStorage.getItem('customer_token');
      const res = await fetch(`/api/customer/messages?detailer_id=${detailerId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch (err) {
      console.error('Messages error:', err);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedDetailer) return;

    setSendingMessage(true);
    try {
      const token = localStorage.getItem('customer_token');
      const res = await fetch('/api/customer/messages', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          detailer_id: selectedDetailer.id,
          message: newMessage,
        }),
      });

      if (res.ok) {
        setNewMessage('');
        fetchMessages(selectedDetailer.id);
      }
    } catch (err) {
      console.error('Send message error:', err);
    } finally {
      setSendingMessage(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('customer_token');
    localStorage.removeItem('customer_user');
    router.push('/customer/login');
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Not scheduled';
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount || 0);
  };

  const getStatusBadge = (status) => {
    const styles = {
      draft: 'bg-gray-100 text-gray-800',
      sent: 'bg-blue-100 text-blue-800',
      viewed: 'bg-purple-100 text-purple-800',
      paid: 'bg-green-100 text-green-800',
      scheduled: 'bg-amber-100 text-amber-800',
      in_progress: 'bg-indigo-100 text-indigo-800',
      completed: 'bg-emerald-100 text-emerald-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return styles[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full mx-auto"></div>
          <p className="mt-4 text-gray-500">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  // Get unique detailers from quotes
  const detailers = [];
  const seenIds = new Set();
  data?.activeQuotes?.concat(data?.completedJobs || []).forEach(q => {
    if (q.detailers && !seenIds.has(q.detailers.id)) {
      seenIds.add(q.detailers.id);
      detailers.push(q.detailers);
    }
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#0f172a] to-[#1e3a5f] text-white">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <span>&#9992;</span> Vector
              </h1>
              <p className="text-blue-200 text-sm mt-1">Customer Portal</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="font-medium">{customer?.name || 'Welcome'}</p>
                <p className="text-sm text-blue-200">{customer?.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="max-w-6xl mx-auto px-4 -mt-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Active Quotes</p>
            <p className="text-2xl font-bold text-amber-600">{data?.stats?.activeQuotes || 0}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Upcoming Jobs</p>
            <p className="text-2xl font-bold text-blue-600">{data?.stats?.upcomingAppointments || 0}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Completed Jobs</p>
            <p className="text-2xl font-bold text-green-600">{data?.stats?.completedJobs || 0}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Total Quotes</p>
            <p className="text-2xl font-bold">{data?.stats?.totalQuotes || 0}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-6xl mx-auto px-4 mt-6">
        <div className="flex border-b bg-white rounded-t-lg">
          {['overview', 'quotes', 'appointments', 'messages', 'receipts'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 font-medium capitalize border-b-2 -mb-px ${
                activeTab === tab
                  ? 'border-amber-500 text-amber-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Active Quotes */}
            {data?.activeQuotes?.length > 0 && (
              <div className="bg-white rounded-lg shadow">
                <div className="p-4 border-b">
                  <h2 className="font-semibold text-lg">Active Quotes</h2>
                </div>
                <div className="divide-y">
                  {data.activeQuotes.slice(0, 3).map(quote => (
                    <div key={quote.id} className="p-4 hover:bg-gray-50">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{quote.aircraft_type || 'Aircraft Detail'}</p>
                          <p className="text-sm text-gray-500">
                            From: {quote.detailers?.company_name}
                          </p>
                          <p className="text-sm text-gray-500">
                            {formatDate(quote.created_at)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold text-amber-600">
                            {formatCurrency(quote.total)}
                          </p>
                          <span className={`inline-block mt-1 px-2 py-1 rounded-full text-xs ${getStatusBadge(quote.status)}`}>
                            {quote.status}
                          </span>
                        </div>
                      </div>
                      {quote.status === 'sent' || quote.status === 'viewed' ? (
                        <a
                          href={`/q/${quote.share_link}`}
                          className="mt-3 inline-block px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 text-sm"
                        >
                          View & Pay Quote
                        </a>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upcoming Appointments */}
            {data?.upcomingJobs?.length > 0 && (
              <div className="bg-white rounded-lg shadow">
                <div className="p-4 border-b">
                  <h2 className="font-semibold text-lg">Upcoming Appointments</h2>
                </div>
                <div className="divide-y">
                  {data.upcomingJobs.slice(0, 3).map(job => (
                    <div key={job.id} className="p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{job.aircraft_type || 'Aircraft Detail'}</p>
                          <p className="text-sm text-gray-500">
                            {job.detailers?.company_name}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-blue-600">
                            {formatDate(job.scheduled_date)}
                          </p>
                          <span className={`inline-block mt-1 px-2 py-1 rounded-full text-xs ${getStatusBadge(job.status)}`}>
                            {job.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* No data state */}
            {!data?.activeQuotes?.length && !data?.upcomingJobs?.length && (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <div className="text-6xl mb-4">&#9992;</div>
                <h2 className="text-xl font-semibold text-gray-700">Welcome to Vector</h2>
                <p className="text-gray-500 mt-2">
                  Your quotes and appointments will appear here.
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'quotes' && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b">
              <h2 className="font-semibold text-lg">All Quotes</h2>
            </div>
            {data?.activeQuotes?.length > 0 || data?.completedJobs?.length > 0 ? (
              <div className="divide-y">
                {[...(data?.activeQuotes || []), ...(data?.completedJobs || [])].map(quote => (
                  <div key={quote.id} className="p-4 hover:bg-gray-50">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{quote.aircraft_type || 'Aircraft Detail'}</p>
                        <p className="text-sm text-gray-500">
                          {quote.detailers?.company_name} &bull; {formatDate(quote.created_at)}
                        </p>
                        {quote.tail_number && (
                          <p className="text-sm text-gray-400">Tail: {quote.tail_number}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold">{formatCurrency(quote.total)}</p>
                        <span className={`inline-block mt-1 px-2 py-1 rounded-full text-xs ${getStatusBadge(quote.status)}`}>
                          {quote.status}
                        </span>
                      </div>
                    </div>
                    {(quote.status === 'sent' || quote.status === 'viewed') && (
                      <a
                        href={`/q/${quote.share_link}`}
                        className="mt-3 inline-block px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 text-sm"
                      >
                        View & Pay
                      </a>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center text-gray-500">
                No quotes yet
              </div>
            )}
          </div>
        )}

        {activeTab === 'appointments' && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b">
              <h2 className="font-semibold text-lg">Appointments</h2>
            </div>
            {data?.upcomingJobs?.length > 0 ? (
              <div className="divide-y">
                {data.upcomingJobs.map(job => (
                  <div key={job.id} className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{job.aircraft_type || 'Aircraft Detail'}</p>
                        <p className="text-sm text-gray-500">{job.detailers?.company_name}</p>
                        {job.location && <p className="text-sm text-gray-400">{job.location}</p>}
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-lg text-blue-600">
                          {formatDate(job.scheduled_date)}
                        </p>
                        <span className={`inline-block mt-1 px-2 py-1 rounded-full text-xs ${getStatusBadge(job.status)}`}>
                          {job.status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center text-gray-500">
                No upcoming appointments
              </div>
            )}
          </div>
        )}

        {activeTab === 'messages' && (
          <div className="grid grid-cols-3 gap-6">
            {/* Detailer List */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-4 border-b">
                <h2 className="font-semibold">Detailers</h2>
              </div>
              <div className="divide-y">
                {detailers.length > 0 ? (
                  detailers.map(d => (
                    <button
                      key={d.id}
                      onClick={() => {
                        setSelectedDetailer(d);
                        fetchMessages(d.id);
                      }}
                      className={`w-full p-4 text-left hover:bg-gray-50 ${
                        selectedDetailer?.id === d.id ? 'bg-amber-50' : ''
                      }`}
                    >
                      <p className="font-medium">{d.company_name}</p>
                      <p className="text-sm text-gray-500">{d.email}</p>
                    </button>
                  ))
                ) : (
                  <div className="p-4 text-gray-500 text-sm">
                    No conversations yet
                  </div>
                )}
              </div>
            </div>

            {/* Messages */}
            <div className="col-span-2 bg-white rounded-lg shadow flex flex-col h-[500px]">
              {selectedDetailer ? (
                <>
                  <div className="p-4 border-b">
                    <h2 className="font-semibold">{selectedDetailer.company_name}</h2>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.length > 0 ? (
                      messages.map(msg => (
                        <div
                          key={msg.id}
                          className={`flex ${msg.sender === 'customer' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[70%] p-3 rounded-lg ${
                              msg.sender === 'customer'
                                ? 'bg-amber-500 text-white'
                                : 'bg-gray-100'
                            }`}
                          >
                            <p>{msg.message}</p>
                            <p className={`text-xs mt-1 ${
                              msg.sender === 'customer' ? 'text-amber-100' : 'text-gray-400'
                            }`}>
                              {new Date(msg.created_at).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center text-gray-500 py-8">
                        No messages yet. Start the conversation!
                      </div>
                    )}
                  </div>
                  <div className="p-4 border-t">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                        placeholder="Type a message..."
                        className="flex-1 border rounded-lg px-4 py-2"
                      />
                      <button
                        onClick={sendMessage}
                        disabled={sendingMessage || !newMessage.trim()}
                        className="px-6 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50"
                      >
                        Send
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-gray-500">
                  Select a detailer to view messages
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'receipts' && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b">
              <h2 className="font-semibold text-lg">Receipts & Invoices</h2>
            </div>
            {data?.receipts?.length > 0 ? (
              <div className="divide-y">
                {data.receipts.map(receipt => (
                  <div key={receipt.id} className="p-4 hover:bg-gray-50">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">Payment Receipt</p>
                        <p className="text-sm text-gray-500">
                          {formatDate(receipt.created_at)}
                        </p>
                        {receipt.stripe_payment_id && (
                          <p className="text-xs text-gray-400 font-mono">
                            {receipt.stripe_payment_id}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-green-600">
                          {formatCurrency(receipt.amount)}
                        </p>
                        <span className="inline-block mt-1 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                          Paid
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center text-gray-500">
                No receipts yet
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
