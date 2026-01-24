import { initializeApp, getApps } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

// Firebase config from environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase app (client-side only)
let app = null;
let messaging = null;

export function getFirebaseApp() {
  if (typeof window === 'undefined') return null;

  if (!app && getApps().length === 0) {
    if (!firebaseConfig.apiKey) {
      console.log('Firebase not configured');
      return null;
    }
    app = initializeApp(firebaseConfig);
  } else if (!app) {
    app = getApps()[0];
  }

  return app;
}

export function getFirebaseMessaging() {
  if (typeof window === 'undefined') return null;

  const app = getFirebaseApp();
  if (!app) return null;

  if (!messaging) {
    try {
      messaging = getMessaging(app);
    } catch (error) {
      console.error('Failed to get messaging:', error);
      return null;
    }
  }

  return messaging;
}

/**
 * Request notification permission and get FCM token
 */
export async function requestNotificationPermission() {
  if (typeof window === 'undefined') return null;

  // Check if notifications are supported
  if (!('Notification' in window)) {
    console.log('Notifications not supported');
    return null;
  }

  // Check current permission
  if (Notification.permission === 'denied') {
    console.log('Notifications blocked by user');
    return null;
  }

  // Request permission if not granted
  if (Notification.permission !== 'granted') {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('Notification permission denied');
      return null;
    }
  }

  // Register service worker
  try {
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    console.log('Service worker registered:', registration);

    // Get FCM token
    const messaging = getFirebaseMessaging();
    if (!messaging) return null;

    const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
    if (!vapidKey) {
      console.log('VAPID key not configured');
      return null;
    }

    const token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: registration,
    });

    console.log('FCM token obtained:', token ? 'yes' : 'no');
    return token;
  } catch (error) {
    console.error('Failed to get FCM token:', error);
    return null;
  }
}

/**
 * Register FCM token with the server
 */
export async function registerFcmToken(token) {
  if (!token) return false;

  try {
    const authToken = localStorage.getItem('vector_token');
    const response = await fetch('/api/push/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ fcmToken: token }),
    });

    return response.ok;
  } catch (error) {
    console.error('Failed to register FCM token:', error);
    return false;
  }
}

/**
 * Set up foreground message handler
 */
export function onForegroundMessage(callback) {
  const messaging = getFirebaseMessaging();
  if (!messaging) return () => {};

  return onMessage(messaging, (payload) => {
    console.log('Foreground message received:', payload);
    callback(payload);
  });
}

/**
 * Initialize push notifications (request permission + register token)
 */
export async function initializePushNotifications() {
  const token = await requestNotificationPermission();
  if (token) {
    await registerFcmToken(token);
  }
  return token;
}
