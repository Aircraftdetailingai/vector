import { createClient } from '@supabase/supabase-js';
import { getAuthUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
  );
}

// GET - Activity timeline for a customer
export async function GET(request, { params }) {
  const user = await getAuthUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const supabase = getSupabase();

  // Get customer email
  const { data: customer } = await supabase
    .from('customers')
    .select('email, created_at')
    .eq('id', id)
    .eq('detailer_id', user.id)
    .single();

  if (!customer) {
    return Response.json({ error: 'Customer not found' }, { status: 404 });
  }

  const email = customer.email.toLowerCase().trim();

  // Fetch all data sources in parallel
  const [activityRes, quotesRes, feedbackRes, notesRes] = await Promise.all([
    // Explicit activity log entries
    supabase
      .from('customer_activity_log')
      .select('*')
      .eq('detailer_id', user.id)
      .eq('customer_email', email)
      .order('created_at', { ascending: false })
      .limit(200)
      .then(res => res)
      .catch(() => ({ data: [] })),

    // All quotes for this customer
    supabase
      .from('quotes')
      .select('id, aircraft_model, aircraft_type, total_price, status, created_at, sent_at, viewed_at, paid_at, completed_at, scheduled_date, valid_until, refunded_at, refund_amount, share_link')
      .eq('detailer_id', user.id)
      .eq('client_email', email)
      .order('created_at', { ascending: false })
      .limit(100),

    // Feedback from this customer
    supabase
      .from('feedback')
      .select('id, quote_id, rating, comment, created_at')
      .eq('detailer_id', user.id)
      .eq('customer_email', email)
      .order('created_at', { ascending: false })
      .limit(50)
      .then(res => res)
      .catch(() => ({ data: [] })),

    // Notes (for note_added events)
    supabase
      .from('customer_notes')
      .select('id, content, created_at')
      .eq('customer_id', id)
      .eq('detailer_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)
      .then(res => res)
      .catch(() => ({ data: [] })),
  ]);

  const timeline = [];

  // Explicit activity log entries
  const activityData = activityRes.data || [];
  for (const a of activityData) {
    timeline.push({
      id: `activity-${a.id}`,
      type: a.activity_type,
      summary: a.summary,
      details: a.details || {},
      date: a.created_at,
      source: 'log',
    });
  }

  // Track which events are already logged
  const loggedQuoteEvents = new Set(
    activityData
      .filter(a => a.quote_id)
      .map(a => `${a.quote_id}-${a.activity_type}`)
  );

  // Derive events from quotes
  const quotes = quotesRes.data || [];
  for (const q of quotes) {
    const aircraft = q.aircraft_model || q.aircraft_type || 'Aircraft';
    const amount = q.total_price ? `$${Number(q.total_price).toLocaleString()}` : '';

    if (q.created_at && !loggedQuoteEvents.has(`${q.id}-quote_created`)) {
      timeline.push({
        id: `q-created-${q.id}`,
        type: 'quote_created',
        summary: `Quote created for ${aircraft} ${amount}`,
        details: { aircraft, amount: q.total_price, quoteId: q.id },
        date: q.created_at,
        source: 'derived',
        quote_id: q.id,
      });
    }

    if (q.sent_at && !loggedQuoteEvents.has(`${q.id}-quote_sent`)) {
      timeline.push({
        id: `q-sent-${q.id}`,
        type: 'quote_sent',
        summary: `Quote sent for ${aircraft} ${amount}`,
        details: { aircraft, amount: q.total_price, quoteId: q.id },
        date: q.sent_at,
        source: 'derived',
        quote_id: q.id,
      });
    }

    if (q.viewed_at && !loggedQuoteEvents.has(`${q.id}-quote_viewed`)) {
      timeline.push({
        id: `q-viewed-${q.id}`,
        type: 'quote_viewed',
        summary: `Viewed quote for ${aircraft}`,
        details: { aircraft, quoteId: q.id },
        date: q.viewed_at,
        source: 'derived',
        quote_id: q.id,
      });
    }

    if (q.paid_at && !loggedQuoteEvents.has(`${q.id}-payment_received`)) {
      timeline.push({
        id: `q-paid-${q.id}`,
        type: 'payment_received',
        summary: `Payment received ${amount} for ${aircraft}`,
        details: { aircraft, amount: q.total_price, quoteId: q.id },
        date: q.paid_at,
        source: 'derived',
        quote_id: q.id,
      });
    }

    if (q.completed_at && !loggedQuoteEvents.has(`${q.id}-job_completed`)) {
      timeline.push({
        id: `q-completed-${q.id}`,
        type: 'job_completed',
        summary: `Job completed for ${aircraft} ${amount}`,
        details: { aircraft, amount: q.total_price, quoteId: q.id },
        date: q.completed_at,
        source: 'derived',
        quote_id: q.id,
      });
    }

    // Scheduled job
    if (q.scheduled_date && (q.status === 'paid' || q.status === 'scheduled' || q.status === 'in_progress')) {
      timeline.push({
        id: `q-scheduled-${q.id}`,
        type: 'job_scheduled',
        summary: `Job scheduled for ${aircraft}`,
        details: { aircraft, amount: q.total_price, quoteId: q.id, scheduledDate: q.scheduled_date },
        date: q.scheduled_date,
        source: 'derived',
        quote_id: q.id,
      });
    }

    // Quote expired
    if (q.status === 'expired' && q.valid_until) {
      timeline.push({
        id: `q-expired-${q.id}`,
        type: 'quote_expired',
        summary: `Quote expired for ${aircraft} ${amount}`,
        details: { aircraft, amount: q.total_price, quoteId: q.id },
        date: q.valid_until,
        source: 'derived',
        quote_id: q.id,
      });
    }

    // Refund issued
    if (q.refunded_at) {
      const refundAmt = q.refund_amount ? `$${Number(q.refund_amount).toLocaleString()}` : amount;
      timeline.push({
        id: `q-refund-${q.id}`,
        type: 'refund_issued',
        summary: `Refund issued ${refundAmt} for ${aircraft}`,
        details: { aircraft, amount: q.refund_amount || q.total_price, quoteId: q.id },
        date: q.refunded_at,
        source: 'derived',
        quote_id: q.id,
      });
    }
  }

  // Feedback events
  const feedbackData = feedbackRes.data || [];
  for (const f of feedbackData) {
    const stars = '\u2605'.repeat(f.rating || 0);
    timeline.push({
      id: `feedback-${f.id}`,
      type: 'feedback_received',
      summary: `Feedback received: ${stars}${f.comment ? ' - "' + f.comment.substring(0, 80) + '"' : ''}`,
      details: { rating: f.rating, comment: f.comment, quoteId: f.quote_id },
      date: f.created_at,
      source: 'derived',
    });
  }

  // Note events
  const notesData = notesRes.data || [];
  const loggedNoteIds = new Set(
    activityData.filter(a => a.activity_type === 'note_added').map(a => a.details?.note_id)
  );
  for (const n of notesData) {
    if (!loggedNoteIds.has(n.id)) {
      timeline.push({
        id: `note-${n.id}`,
        type: 'note_added',
        summary: `Note: "${n.content.substring(0, 100)}${n.content.length > 100 ? '...' : ''}"`,
        details: {},
        date: n.created_at,
        source: 'derived',
      });
    }
  }

  // Customer created event
  if (customer.created_at) {
    timeline.push({
      id: `customer-created`,
      type: 'customer_created',
      summary: 'Customer added',
      details: {},
      date: customer.created_at,
      source: 'derived',
    });
  }

  // Deduplicate by type+date proximity (within 1 minute)
  const seen = new Set();
  const deduped = timeline.filter(item => {
    const key = `${item.type}-${item.quote_id || item.id}-${Math.floor(new Date(item.date).getTime() / 60000)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  deduped.sort((a, b) => new Date(b.date) - new Date(a.date));

  return Response.json({ activity: deduped.slice(0, 200) });
}
