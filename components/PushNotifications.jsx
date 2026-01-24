"use client";
import { useState, useEffect } from 'react';
import { initializePushNotifications, onForegroundMessage } from '@/lib/firebase';

export default function PushNotifications() {
  const [permissionState, setPermissionState] = useState('default');
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Check if notifications are supported and get current state
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermissionState(Notification.permission);

      // Show banner if permission hasn't been asked yet
      if (Notification.permission === 'default') {
        // Delay showing banner to not be intrusive on first load
        const timer = setTimeout(() => setShowBanner(true), 3000);
        return () => clearTimeout(timer);
      }

      // If already granted, set up notifications silently
      if (Notification.permission === 'granted') {
        initializePushNotifications();
        setupForegroundHandler();
      }
    }
  }, []);

  const setupForegroundHandler = () => {
    onForegroundMessage((payload) => {
      // Show a toast notification for foreground messages
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
      // Permission denied or error
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
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 flex items-center justify-between">
      <div className="flex items-center">
        <span className="text-blue-500 text-xl mr-3">&#128276;</span>
        <div>
          <p className="text-blue-800 font-medium">Enable notifications</p>
          <p className="text-blue-700 text-sm">Get alerts when customers view or pay quotes.</p>
        </div>
      </div>
      <div className="flex space-x-2">
        <button
          onClick={handleDismiss}
          className="px-3 py-1 text-blue-600 text-sm hover:underline"
        >
          Later
        </button>
        <button
          onClick={handleEnableNotifications}
          className="px-4 py-2 rounded bg-blue-500 text-white font-medium hover:bg-blue-600 text-sm"
        >
          Enable
        </button>
      </div>
    </div>
  );
}
