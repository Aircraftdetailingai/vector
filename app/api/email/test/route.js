import { createClient } from '@supabase/supabase-js';
import {
  sendQuoteSentEmail,
  sendQuoteViewedEmail,
  sendPaymentReceivedEmail,
  sendPaymentConfirmedEmail,
} from '@/lib/email';

export const dynamic = 'force-dynamic';

function getSupabase() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY);
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'all';
  const email = searchParams.get('email');

  if (!email) {
    return Response.json({
      error: 'Email parameter required',
      usage: '/api/email/test?email=test@example.com&type=quote_sent',
      types: ['quote_sent', 'quote_viewed', 'payment_received', 'payment_confirmed', 'all'],
    }, { status: 400 });
  }

  const supabase = getSupabase();

  // Get a sample quote and detailer
  const { data: quote } = await supabase
    .from('quotes')
    .select('*')
    .limit(1)
    .single();

  const { data: detailer } = await supabase
    .from('detailers')
    .select('*')
    .limit(1)
    .single();

  if (!quote || !detailer) {
    return Response.json({ error: 'No quote or detailer found for testing' }, { status: 400 });
  }

  // Override emails for testing
  const testQuote = {
    ...quote,
    client_email: email,
    client_name: 'Test Customer',
  };

  const testDetailer = {
    ...detailer,
    email: email,
    name: 'Test Detailer',
    company: 'Test Aviation Detailing',
  };

  const results = {};

  try {
    if (type === 'quote_sent' || type === 'all') {
      results.quote_sent = await sendQuoteSentEmail({
        quote: testQuote,
        detailer: testDetailer,
      });
    }

    if (type === 'quote_viewed' || type === 'all') {
      results.quote_viewed = await sendQuoteViewedEmail({
        quote: testQuote,
        detailer: testDetailer,
        viewedAt: new Date().toISOString(),
      });
    }

    if (type === 'payment_received' || type === 'all') {
      results.payment_received = await sendPaymentReceivedEmail({
        quote: testQuote,
        detailer: testDetailer,
      });
    }

    if (type === 'payment_confirmed' || type === 'all') {
      results.payment_confirmed = await sendPaymentConfirmedEmail({
        quote: testQuote,
        detailer: testDetailer,
      });
    }

    return Response.json({
      success: true,
      sentTo: email,
      type,
      results,
    });

  } catch (err) {
    return Response.json({
      error: err.message,
      results,
    }, { status: 500 });
  }
}
