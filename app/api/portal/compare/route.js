import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
  );
}

// GET - Fetch comparable quotes for a customer
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');
  const ids = searchParams.get('ids'); // optional comma-separated quote IDs to compare

  if (!token) {
    return Response.json({ error: 'Token required' }, { status: 400 });
  }

  const supabase = getSupabase();

  // Fetch the primary quote by share_link
  const { data: quote, error } = await supabase
    .from('quotes')
    .select('*')
    .eq('share_link', token)
    .single();

  if (error || !quote) {
    return Response.json({ error: 'Quote not found' }, { status: 404 });
  }

  // Fetch detailer info
  const { data: detailer } = await supabase
    .from('detailers')
    .select('id, name, email, phone, company, plan, pass_fee_to_customer, quote_display_preference, stripe_account_id, currency')
    .eq('id', quote.detailer_id)
    .single();

  // Check Stripe connection
  let stripeConnected = false;
  if (detailer?.stripe_account_id && process.env.STRIPE_SECRET_KEY) {
    try {
      const Stripe = (await import('stripe')).default;
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
      const account = await stripe.accounts.retrieve(detailer.stripe_account_id);
      stripeConnected = account.charges_enabled && account.payouts_enabled;
    } catch (e) {}
  }

  // Fetch all comparable quotes for this customer from the same detailer
  const email = quote.customer_email || quote.client_email;
  let comparableQuotes = [];

  if (ids) {
    // Fetch specific quotes by IDs
    const idList = ids.split(',').filter(Boolean);
    const { data } = await supabase
      .from('quotes')
      .select('*')
      .eq('detailer_id', quote.detailer_id)
      .in('id', idList)
      .in('status', ['sent', 'viewed', 'paid', 'approved', 'scheduled', 'in_progress', 'completed']);

    comparableQuotes = data || [];
  } else if (email) {
    // Fetch all active quotes for this customer from this detailer
    const { data } = await supabase
      .from('quotes')
      .select('*')
      .eq('detailer_id', quote.detailer_id)
      .or(`customer_email.ilike.${email},client_email.ilike.${email}`)
      .in('status', ['sent', 'viewed', 'paid', 'approved', 'scheduled', 'in_progress', 'completed'])
      .order('created_at', { ascending: false })
      .limit(10);

    comparableQuotes = data || [];
  }

  // Ensure the primary quote is included
  if (!comparableQuotes.find(q => q.id === quote.id)) {
    comparableQuotes.unshift(quote);
  }

  // Remove sensitive fields from detailer
  const { stripe_account_id, ...detailerPublic } = detailer || {};

  return Response.json({
    quotes: comparableQuotes,
    primary_quote_id: quote.id,
    detailer: detailerPublic,
    stripe_connected: stripeConnected,
  });
}
