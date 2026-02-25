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
    .select('email')
    .eq('id', id)
    .eq('detailer_id', user.id)
    .single();

  if (!customer) {
    return Response.json({ error: 'Customer not found' }, { status: 404 });
  }

  // Two data sources: activity_log table + quote history (auto-derived)
  const email = customer.email.toLowerCase().trim();

  const [activityRes, quotesRes] = await Promise.all([
    // Explicit activity log entries
    supabase
      .from('customer_activity_log')
      .select('*')
      .eq('detailer_id', user.id)
      .eq('customer_email', email)
      .order('created_at', { ascending: false })
      .limit(100)
      .then(res => res)
      .catch(() => ({ data: [] })),

    // Auto-derive activity from quote status timestamps
    supabase
      .from('quotes')
      .select('id, aircraft_model, aircraft_type, total_price, status, created_at, sent_at, viewed_at, paid_at, completed_at, scheduled_date')
      .eq('detailer_id', user.id)
      .eq('client_email', email)
      .order('created_at', { ascending: false })
      .limit(50),
  ]);

  // Build unified timeline
  const timeline = [];

  // Add explicit activity log entries
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

  // Auto-derive events from quotes (these are always-available even without activity log table)
  const quotes = quotesRes.data || [];
  const loggedQuoteEvents = new Set(
    activityData
      .filter(a => a.quote_id)
      .map(a => `${a.quote_id}-${a.activity_type}`)
  );

  for (const q of quotes) {
    const aircraft = q.aircraft_model || q.aircraft_type || 'Aircraft';
    const amount = q.total_price ? `$${Number(q.total_price).toLocaleString()}` : '';

    // Quote created
    if (q.created_at && !loggedQuoteEvents.has(`${q.id}-quote_created`)) {
      timeline.push({
        id: `q-created-${q.id}`,
        type: 'quote_created',
        summary: `Quote created for ${aircraft} ${amount}`,
        details: { aircraft, amount: q.total_price },
        date: q.created_at,
        source: 'derived',
        quote_id: q.id,
      });
    }

    // Quote sent
    if (q.sent_at && !loggedQuoteEvents.has(`${q.id}-quote_sent`)) {
      timeline.push({
        id: `q-sent-${q.id}`,
        type: 'quote_sent',
        summary: `Quote sent for ${aircraft} ${amount}`,
        details: { aircraft, amount: q.total_price },
        date: q.sent_at,
        source: 'derived',
        quote_id: q.id,
      });
    }

    // Quote viewed
    if (q.viewed_at && !loggedQuoteEvents.has(`${q.id}-quote_viewed`)) {
      timeline.push({
        id: `q-viewed-${q.id}`,
        type: 'quote_viewed',
        summary: `Viewed quote for ${aircraft}`,
        details: { aircraft },
        date: q.viewed_at,
        source: 'derived',
        quote_id: q.id,
      });
    }

    // Payment received
    if (q.paid_at && !loggedQuoteEvents.has(`${q.id}-payment_received`)) {
      timeline.push({
        id: `q-paid-${q.id}`,
        type: 'payment_received',
        summary: `Payment received ${amount} for ${aircraft}`,
        details: { aircraft, amount: q.total_price },
        date: q.paid_at,
        source: 'derived',
        quote_id: q.id,
      });
    }

    // Job completed
    if (q.completed_at && !loggedQuoteEvents.has(`${q.id}-job_completed`)) {
      timeline.push({
        id: `q-completed-${q.id}`,
        type: 'job_completed',
        summary: `Job completed for ${aircraft}`,
        details: { aircraft, amount: q.total_price },
        date: q.completed_at,
        source: 'derived',
        quote_id: q.id,
      });
    }
  }

  // Deduplicate by type+date proximity (within 1 minute)
  const seen = new Set();
  const deduped = timeline.filter(item => {
    const key = `${item.type}-${item.quote_id || ''}-${Math.floor(new Date(item.date).getTime() / 60000)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Sort by date descending
  deduped.sort((a, b) => new Date(b.date) - new Date(a.date));

  return Response.json({ activity: deduped.slice(0, 100) });
}
