import admin from 'firebase-admin';

// Initialize Firebase Admin SDK (singleton)
if (!admin.apps.length) {
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
    ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
    : null;

  if (serviceAccount) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }
}

/**
 * Send push notification to a detailer
 */
export async function sendPushNotification({ fcmToken, title, body, data = {} }) {
  if (!fcmToken || !admin.apps.length) {
    console.log('Push notification skipped: no FCM token or Firebase not initialized');
    return { success: false, reason: 'not_configured' };
  }

  try {
    const message = {
      token: fcmToken,
      notification: {
        title,
        body,
      },
      data: {
        ...data,
        click_action: data.url || 'https://aviationdetailinghub.com/dashboard',
      },
      webpush: {
        fcmOptions: {
          link: data.url || 'https://aviationdetailinghub.com/dashboard',
        },
        notification: {
          icon: '/icon-192.png',
          badge: '/icon-72.png',
        },
      },
    };

    const response = await admin.messaging().send(message);
    console.log('Push notification sent:', response);
    return { success: true, messageId: response };
  } catch (error) {
    console.error('Failed to send push notification:', error);

    // If token is invalid, return specific error so we can clean it up
    if (error.code === 'messaging/invalid-registration-token' ||
        error.code === 'messaging/registration-token-not-registered') {
      return { success: false, reason: 'invalid_token', error };
    }

    return { success: false, reason: 'send_failed', error };
  }
}

/**
 * Send notification when quote is viewed
 */
export async function notifyQuoteViewed({ fcmToken, quote }) {
  const aircraftDisplay = quote.aircraft_model || quote.aircraft_type || 'Aircraft';
  const customerName = quote.client_name || 'Customer';

  return sendPushNotification({
    fcmToken,
    title: 'Quote Viewed',
    body: `${customerName} is viewing your quote for ${aircraftDisplay}`,
    data: {
      type: 'quote_viewed',
      quoteId: quote.id,
      url: `https://aviationdetailinghub.com/dashboard`,
    },
  });
}

/**
 * Send notification when quote is paid
 */
export async function notifyQuotePaid({ fcmToken, quote }) {
  const aircraftDisplay = quote.aircraft_model || quote.aircraft_type || 'Aircraft';
  const amount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(quote.total_price || 0);

  return sendPushNotification({
    fcmToken,
    title: 'Payment Received!',
    body: `${amount} received for ${aircraftDisplay}. Contact customer to schedule.`,
    data: {
      type: 'quote_paid',
      quoteId: quote.id,
      url: `https://aviationdetailinghub.com/dashboard`,
    },
  });
}

/**
 * Send notification when customer requests new quote
 */
export async function notifyNewQuoteRequest({ fcmToken, quote }) {
  const aircraftDisplay = quote.aircraft_model || quote.aircraft_type || 'Aircraft';
  const customerName = quote.client_name || 'Customer';

  return sendPushNotification({
    fcmToken,
    title: 'New Quote Requested',
    body: `${customerName} wants an updated quote for ${aircraftDisplay}`,
    data: {
      type: 'quote_request',
      quoteId: quote.id,
      url: `https://aviationdetailinghub.com/dashboard`,
    },
  });
}
