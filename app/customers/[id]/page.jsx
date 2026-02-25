"use client";
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import LoadingSpinner from '@/components/LoadingSpinner';

const ACTIVITY_CONFIG = {
  quote_created: { icon: '+', color: 'bg-blue-500', label: 'Quote Created' },
  quote_sent: { icon: '\u2192', color: 'bg-indigo-500', label: 'Quote Sent' },
  quote_viewed: { icon: '\u25C9', color: 'bg-purple-500', label: 'Quote Viewed' },
  quote_expired: { icon: '\u2717', color: 'bg-gray-500', label: 'Quote Expired' },
  payment_received: { icon: '$', color: 'bg-green-500', label: 'Payment Received' },
  payment_failed: { icon: '!', color: 'bg-red-500', label: 'Payment Failed' },
  refund_issued: { icon: '\u21A9', color: 'bg-red-400', label: 'Refund Issued' },
  job_completed: { icon: '\u2713', color: 'bg-emerald-500', label: 'Job Completed' },
  job_scheduled: { icon: '\uD83D\uDCC5', color: 'bg-amber-500', label: 'Job Scheduled' },
  invoice_created: { icon: '#', color: 'bg-blue-400', label: 'Invoice Created' },
  invoice_emailed: { icon: '\u2709', color: 'bg-blue-300', label: 'Invoice Emailed' },
  note_added: { icon: '\uD83D\uDCDD', color: 'bg-gray-400', label: 'Note Added' },
  feedback_received: { icon: '\u2605', color: 'bg-amber-400', label: 'Feedback Received' },
  customer_created: { icon: '\u263A', color: 'bg-teal-500', label: 'Customer Created' },
};

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const customerId = params.id;

  const [customer, setCustomer] = useState(null);
  const [notes, setNotes] = useState([]);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('activity');
  const [newNote, setNewNote] = useState('');
  const [noteSaving, setNoteSaving] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [quoteStats, setQuoteStats] = useState(null);

  const token = typeof window !== 'undefined' ? localStorage.getItem('vector_token') : null;
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  useEffect(() => {
    if (!token) { router.push('/login'); return; }
    loadAll();
  }, [customerId]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [custRes, notesRes, actRes] = await Promise.all([
        fetch(`/api/customers/${customerId}`, { headers }),
        fetch(`/api/customers/${customerId}/notes`, { headers }),
        fetch(`/api/customers/${customerId}/activity`, { headers }),
      ]);

      if (custRes.ok) {
        const data = await custRes.json();
        setCustomer(data.customer);
        setQuoteStats(data.stats || null);
      }
      if (notesRes.ok) {
        const data = await notesRes.json();
        setNotes(data.notes || []);
      }
      if (actRes.ok) {
        const data = await actRes.json();
        setActivity(data.activity || []);
      }
    } catch (err) {
      console.error('Load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const addNote = async () => {
    if (!newNote.trim()) return;
    setNoteSaving(true);
    try {
      const res = await fetch(`/api/customers/${customerId}/notes`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ content: newNote }),
      });
      if (res.ok) {
        const data = await res.json();
        setNotes(prev => [data.note, ...prev]);
        setNewNote('');
      }
    } catch (err) {
      console.error('Add note error:', err);
    } finally {
      setNoteSaving(false);
    }
  };

  const togglePin = async (note) => {
    try {
      const res = await fetch(`/api/customers/${customerId}/notes`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ note_id: note.id, pinned: !note.pinned }),
      });
      if (res.ok) {
        setNotes(prev => {
          const updated = prev.map(n => n.id === note.id ? { ...n, pinned: !n.pinned } : n);
          return updated.sort((a, b) => {
            if (a.pinned && !b.pinned) return -1;
            if (!a.pinned && b.pinned) return 1;
            return new Date(b.created_at) - new Date(a.created_at);
          });
        });
      }
    } catch (err) {
      console.error('Pin error:', err);
    }
  };

  const saveEdit = async () => {
    if (!editContent.trim() || !editingNote) return;
    try {
      const res = await fetch(`/api/customers/${customerId}/notes`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ note_id: editingNote, content: editContent }),
      });
      if (res.ok) {
        setNotes(prev => prev.map(n => n.id === editingNote ? { ...n, content: editContent.trim() } : n));
        setEditingNote(null);
        setEditContent('');
      }
    } catch (err) {
      console.error('Edit error:', err);
    }
  };

  const deleteNote = async (noteId) => {
    if (!confirm('Delete this note?')) return;
    try {
      const res = await fetch(`/api/customers/${customerId}/notes?note_id=${noteId}`, {
        method: 'DELETE',
        headers,
      });
      if (res.ok) {
        setNotes(prev => prev.filter(n => n.id !== noteId));
      }
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  const timeAgo = (dateStr) => {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return formatDate(dateStr);
  };

  // Group activity by date
  const groupedActivity = activity.reduce((acc, item) => {
    const date = formatDate(item.date);
    if (!acc[date]) acc[date] = [];
    acc[date].push(item);
    return acc;
  }, {});

  if (loading) {
    return <LoadingSpinner message="Loading customer..." />;
  }

  if (!customer) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0f172a] to-[#1e3a5f] flex items-center justify-center p-4">
        <div className="bg-white rounded-lg p-8 text-center max-w-sm">
          <p className="text-gray-500 mb-4">Customer not found</p>
          <a href="/customers" className="text-amber-600 hover:underline">Back to customers</a>
        </div>
      </div>
    );
  }

  const tags = Array.isArray(customer.tags) ? customer.tags : [];
  const pinnedNotes = notes.filter(n => n.pinned);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f172a] to-[#1e3a5f] p-4">
      {/* Header */}
      <header className="flex items-center gap-4 mb-6 text-white">
        <a href="/customers" className="text-2xl hover:text-amber-400">&larr;</a>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{customer.name || 'Customer'}</h1>
          <p className="text-sm text-white/60">{customer.email}</p>
        </div>
      </header>

      <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Info Card */}
        <div className="lg:col-span-1 space-y-4">
          {/* Contact Info */}
          <div className="bg-white rounded-lg shadow p-5">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Contact</h2>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-gray-400 w-5 text-center">&lt;@&gt;</span>
                <a href={`mailto:${customer.email}`} className="text-blue-600 hover:underline">{customer.email}</a>
              </div>
              {customer.phone && (
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 w-5 text-center">#</span>
                  <a href={`tel:${customer.phone}`} className="text-blue-600 hover:underline">{customer.phone}</a>
                </div>
              )}
              {customer.company_name && (
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 w-5 text-center">B</span>
                  <span className="text-gray-700">{customer.company_name}</span>
                </div>
              )}
            </div>
            {tags.length > 0 && (
              <div className="mt-3 pt-3 border-t flex flex-wrap gap-1.5">
                {tags.map(tag => (
                  <span key={tag} className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-300">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Quick Stats */}
          {quoteStats && (
            <div className="bg-white rounded-lg shadow p-5">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Stats</h2>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-gray-400">Total Quotes</p>
                  <p className="text-lg font-bold text-gray-900">{quoteStats.totalQuotes || 0}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Revenue</p>
                  <p className="text-lg font-bold text-green-600">${(quoteStats.totalRevenue || 0).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Completed</p>
                  <p className="text-lg font-bold text-emerald-600">{quoteStats.completedJobs || 0}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Last Service</p>
                  <p className="text-sm font-medium text-gray-700">{quoteStats.lastService ? formatDate(quoteStats.lastService) : '-'}</p>
                </div>
              </div>
            </div>
          )}

          {/* Pinned Notes */}
          {pinnedNotes.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <h2 className="text-sm font-semibold text-amber-800 mb-2 flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M5.5 16a3.5 3.5 0 01-.369-6.98 4 4 0 117.753-1.977A4.5 4.5 0 1113.5 16h-8z" />
                </svg>
                Pinned Notes
              </h2>
              <div className="space-y-2">
                {pinnedNotes.map(note => (
                  <div key={note.id} className="text-sm text-amber-900 bg-white/60 rounded p-2.5">
                    {note.content}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Tabs (Activity / Notes) */}
        <div className="lg:col-span-2">
          {/* Tabs */}
          <div className="flex gap-1 mb-4">
            {['activity', 'notes'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab
                    ? 'bg-white text-gray-900 shadow'
                    : 'text-white/60 hover:text-white hover:bg-white/10'
                }`}
              >
                {tab === 'activity' ? `Activity (${activity.length})` : `Notes (${notes.length})`}
              </button>
            ))}
          </div>

          {/* Activity Timeline */}
          {activeTab === 'activity' && (
            <div className="bg-white rounded-lg shadow">
              {activity.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-sm">
                  No activity yet. Events will appear here when you send quotes, receive payments, etc.
                </div>
              ) : (
                <div className="p-4">
                  {Object.entries(groupedActivity).map(([date, items]) => (
                    <div key={date} className="mb-6 last:mb-0">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 sticky top-0 bg-white">{date}</p>
                      <div className="relative pl-6 border-l-2 border-gray-100 space-y-4">
                        {items.map(item => {
                          const config = ACTIVITY_CONFIG[item.type] || { icon: '\u25CF', color: 'bg-gray-400', label: item.type };
                          return (
                            <div key={item.id} className="relative">
                              {/* Dot */}
                              <div className={`absolute -left-[25px] w-3 h-3 rounded-full ${config.color} ring-2 ring-white`} />
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <p className="text-sm text-gray-800">{item.summary}</p>
                                  <p className="text-xs text-gray-400 mt-0.5">{formatTime(item.date)}</p>
                                </div>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${config.color} text-white`}>
                                  {config.label}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          {activeTab === 'notes' && (
            <div className="space-y-4">
              {/* Add note */}
              <div className="bg-white rounded-lg shadow p-4">
                <textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Add a note about this customer..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-amber-400 focus:border-amber-400 outline-none resize-none"
                />
                <div className="flex justify-end mt-2">
                  <button
                    onClick={addNote}
                    disabled={noteSaving || !newNote.trim()}
                    className="px-4 py-2 bg-amber-500 text-white text-sm rounded-lg hover:bg-amber-600 disabled:opacity-50 font-medium"
                  >
                    {noteSaving ? 'Saving...' : 'Add Note'}
                  </button>
                </div>
              </div>

              {/* Notes list */}
              {notes.length === 0 ? (
                <div className="bg-white rounded-lg shadow p-8 text-center text-gray-400 text-sm">
                  No notes yet. Add one above to get started.
                </div>
              ) : (
                <div className="space-y-2">
                  {notes.map(note => (
                    <div key={note.id} className={`bg-white rounded-lg shadow p-4 ${note.pinned ? 'ring-2 ring-amber-300' : ''}`}>
                      {editingNote === note.id ? (
                        <div>
                          <textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 outline-none resize-none mb-2"
                          />
                          <div className="flex justify-end gap-2">
                            <button onClick={() => setEditingNote(null)} className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700">Cancel</button>
                            <button onClick={saveEdit} className="px-3 py-1.5 text-sm bg-amber-500 text-white rounded-lg hover:bg-amber-600">Save</button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="text-sm text-gray-800 whitespace-pre-wrap">{note.content}</p>
                          <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                            <p className="text-xs text-gray-400">
                              {timeAgo(note.created_at)}
                              {note.pinned && <span className="ml-2 text-amber-500 font-medium">Pinned</span>}
                            </p>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => togglePin(note)}
                                className={`p-1.5 rounded hover:bg-gray-100 text-xs ${note.pinned ? 'text-amber-500' : 'text-gray-400'}`}
                                title={note.pinned ? 'Unpin' : 'Pin'}
                              >
                                <svg className="w-4 h-4" fill={note.pinned ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => { setEditingNote(note.id); setEditContent(note.content); }}
                                className="p-1.5 rounded hover:bg-gray-100 text-gray-400 text-xs"
                                title="Edit"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => deleteNote(note.id)}
                                className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 text-xs"
                                title="Delete"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
