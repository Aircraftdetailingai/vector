"use client";
import { useState, useEffect, useRef, useCallback } from 'react';
import NotificationRow from './NotificationRow';

function groupByTime(notifications) {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());

  const groups = { today: [], thisWeek: [], earlier: [] };
  for (const n of notifications) {
    const d = new Date(n.created_at);
    if (d >= todayStart) groups.today.push(n);
    else if (d >= weekStart) groups.thisWeek.push(n);
    else groups.earlier.push(n);
  }
  return groups;
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const ref = useRef(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const token = localStorage.getItem('vector_token');
      if (!token) return;
      const res = await fetch('/api/notifications?limit=20', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch {}
  }, []);

  // Poll every 30s + on mount
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const markAsRead = async (id) => {
    try {
      const token = localStorage.getItem('vector_token');
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id }),
      });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch {}
  };

  const markAllRead = async () => {
    try {
      const token = localStorage.getItem('vector_token');
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ markAll: true }),
      });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {}
  };

  const handleClick = (n) => {
    if (!n.read) markAsRead(n.id);
    if (n.link) window.location.href = n.link;
    setOpen(false);
  };

  const groups = groupByTime(notifications);

  const renderGroup = (label, items) => {
    if (items.length === 0) return null;
    return (
      <div key={label}>
        <div className="px-4 py-1.5 text-[10px] uppercase tracking-widest text-v-text-secondary/70 bg-v-charcoal/50 sticky top-0 z-10 font-medium">
          {label}
        </div>
        {items.map((n) => (
          <NotificationRow
            key={n.id}
            notification={n}
            compact
            onClick={() => handleClick(n)}
          />
        ))}
      </div>
    );
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => { setOpen(prev => !prev); if (!open) fetchNotifications(); }}
        className="relative p-2 rounded-lg hover:bg-white/10 transition-colors"
        aria-label="Notifications"
      >
        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full px-1">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-v-surface rounded border border-v-border shadow-2xl z-50 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-v-border">
            <h3 className="text-sm font-medium text-v-text-primary">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs text-v-gold hover:text-v-gold-dim"
              >
                Mark all as read
              </button>
            )}
          </div>

          {/* Grouped list */}
          <div className="overflow-y-auto flex-1 max-h-[480px]">
            {notifications.length === 0 ? (
              <div className="py-12 text-center text-v-text-secondary text-sm">
                No notifications yet
              </div>
            ) : (
              <>
                {renderGroup('Today', groups.today)}
                {renderGroup('This Week', groups.thisWeek)}
                {renderGroup('Earlier', groups.earlier)}
              </>
            )}
          </div>

          {/* Footer */}
          <a
            href="/notifications"
            className="block text-center py-3 text-xs text-v-gold hover:text-v-gold-dim border-t border-v-border"
            onClick={() => setOpen(false)}
          >
            View all notifications
          </a>
        </div>
      )}
    </div>
  );
}
