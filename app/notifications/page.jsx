"use client";
import { useState, useEffect, useCallback, useMemo } from 'react';
import AppShell from '@/components/AppShell';
import NotificationRow from '@/components/NotificationRow';

const FILTER_TABS = [
  { key: 'all', label: 'All', types: null },
  { key: 'quotes', label: 'Quotes', types: ['quote_sent', 'quote_viewed', 'quote_accepted', 'quote_expired', 'followup_needed'] },
  { key: 'payments', label: 'Payments', types: ['payment_received', 'invoice_requested'] },
  { key: 'bookings', label: 'Bookings', types: ['job_scheduled', 'job_reminder', 'booking_reminder'] },
  { key: 'staffing', label: 'Staffing', types: ['staffing_alert'] },
  { key: 'system', label: 'System', types: ['system'] },
];

const PAGE_SIZE = 20;

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const getToken = () => localStorage.getItem('vector_token');

  const fetchNotifications = useCallback(async (offset = 0, append = false) => {
    try {
      const token = getToken();
      if (!token) {
        window.location.href = '/login';
        return;
      }

      if (offset === 0) setLoading(true);
      else setLoadingMore(true);

      const tab = FILTER_TABS.find(t => t.key === filter);
      const typeParam = tab?.types ? `&type=${tab.types.join(',')}` : '';
      const res = await fetch(`/api/notifications?limit=${PAGE_SIZE}&offset=${offset}${typeParam}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('Failed to fetch');

      const data = await res.json();
      setNotifications(prev => append ? [...prev, ...(data.notifications || [])] : (data.notifications || []));
      setTotal(data.total || 0);
      setHasMore(data.hasMore || false);
      setUnreadCount(data.unreadCount || 0);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchNotifications(0, false);
  }, [fetchNotifications]);

  const handleLoadMore = () => {
    fetchNotifications(notifications.length, true);
  };

  const handleClick = async (n) => {
    if (!n.read) {
      try {
        const token = getToken();
        await fetch('/api/notifications', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ id: n.id }),
        });
        setNotifications(prev => prev.map(item => item.id === n.id ? { ...item, read: true } : item));
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch {}
    }
    if (n.link) window.location.href = n.link;
  };

  const markAllRead = async () => {
    try {
      const token = getToken();
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ markAll: true }),
      });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {}
  };

  const deleteAllRead = async () => {
    try {
      const token = getToken();
      await fetch('/api/notifications', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications(prev => prev.filter(n => !n.read));
      fetchNotifications(0, false);
    } catch {}
  };

  const changeFilter = (key) => {
    setFilter(key);
    setNotifications([]);
  };

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <a href="/dashboard" className="text-v-text-secondary hover:text-v-text-primary transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </a>
            <h1 className="font-heading text-v-text-primary font-light text-sm uppercase" style={{ letterSpacing: '0.15em' }}>
              Notifications
            </h1>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex flex-wrap gap-2 mb-4">
          {FILTER_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => changeFilter(tab.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                filter === tab.key
                  ? 'bg-v-gold text-v-charcoal'
                  : 'bg-v-surface text-v-text-secondary border border-v-border hover:border-v-text-secondary'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Bulk actions */}
        {notifications.length > 0 && (
          <div className="flex items-center justify-between mb-4 px-1">
            <p className="text-v-text-secondary text-xs">
              {unreadCount > 0 ? `${unreadCount} unread` : 'All read'}
              {total > 0 && ` · ${total} total`}
            </p>
            <div className="flex gap-4">
              {unreadCount > 0 && (
                <button onClick={markAllRead} className="text-xs text-v-gold hover:text-v-gold-dim">
                  Mark all read
                </button>
              )}
              <button onClick={deleteAllRead} className="text-xs text-red-400 hover:text-red-300">
                Delete all read
              </button>
            </div>
          </div>
        )}

        {/* Notification list */}
        <div className="bg-v-surface border border-v-border rounded-sm overflow-hidden">
          {loading ? (
            <div className="py-20 text-center">
              <div className="inline-block w-6 h-6 border-2 border-v-gold border-t-transparent rounded-full animate-spin" />
              <p className="text-v-text-secondary text-sm mt-3">Loading notifications...</p>
            </div>
          ) : error ? (
            <div className="py-20 text-center">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-20 text-center">
              <span className="text-5xl text-v-gold block mb-4">&#10003;</span>
              <p className="text-v-text-secondary text-sm">You're all caught up</p>
            </div>
          ) : (
            <>
              {notifications.map(n => (
                <NotificationRow
                  key={n.id}
                  notification={n}
                  compact={false}
                  onClick={() => handleClick(n)}
                />
              ))}
            </>
          )}
        </div>

        {/* Load more */}
        {hasMore && !loading && (
          <div className="text-center mt-4">
            <button
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="px-6 py-2.5 text-sm text-v-gold hover:text-v-gold-dim border border-v-border rounded-sm hover:border-v-gold/30 transition-colors disabled:opacity-50"
            >
              {loadingMore ? 'Loading...' : 'Load more'}
            </button>
          </div>
        )}
      </div>
    </AppShell>
  );
}
