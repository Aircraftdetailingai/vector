"use client";
import { useState, useEffect } from 'react';
import { initializePushNotifications, onForegroundMessage } from '@/lib/firebase';

export default function PushNotifications() {
  const [permissionState, setPermissionState] = useState('default');
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermissionState(Notification.permission);

      if (Notification.permission === 'default') {
        const timer = setTimeout(() => setShowBanner(true), 3000);
        return () => clearTimeout(timer);
      }

      if (Notification.permission === 'granted') {
        initializePushNotifications();
        setupForegroundHandler();
      }
    }
  }, []);

  const setupForegroundHandler = () => {
    onForegroundMessage((payload) => {
      if (Notification.permission === 'granted') {
        new Notification(payload.notification?.title || 'Vector', {
          body: payload.notification?.body,
          icon: '/icon-192.png',
        });
      }
    });
  };

  const handleEnableNotifications = async () => {
    const token = await initializePushNotifications();
    if (token) {
      setPermissionState('granted');
      setShowBanner(false);
      setupForegroundHandler();
    } else {
      setPermissionState(Notification.permission);
      setShowBanner(false);
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
  };

  if (!showBanner || permissionState !== 'default') {
    return null;
  }

  return (
    <div className="mx-4 sm:mx-8 mt-4 bg-v-surface border border-v-border rounded-sm p-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span className="text-v-gold text-xl">&#128276;</span>
        <div>
          <p className="text-v-text-primary font-medium text-sm">Enable push notifications</p>
          <p className="text-v-text-secondary text-xs">Get instant alerts when customers view or accept quotes.</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={handleDismiss}
          className="text-v-text-secondary text-xs hover:text-v-text-primary transition-colors"
        >
          Later
        </button>
        <button
          onClick={handleEnableNotifications}
          className="px-4 py-1.5 text-xs uppercase tracking-widest text-v-charcoal bg-v-gold hover:bg-v-gold-dim transition-colors font-medium"
        >
          Enable
        </button>
      </div>
    </div>
  );
}
