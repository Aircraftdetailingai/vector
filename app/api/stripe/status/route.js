import { createClient } from '@supabase/supabase-js';
import { getAuthUser } from '@/lib/auth';
import Stripe from 'stripe';

export const dynamic = 'force-dynamic';

function getSupabase() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY);
}

export async function GET(request) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return new Response(JSON.stringify({ connected: false, status: 'NOT_CONFIGURED', message: 'Stripe not configured' }), { status: 200 });
  }
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY?.trim());

  const user = await getAuthUser(request);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const supabase = getSupabase();

  try {
    // Fetch detailer's Stripe account ID
    const { data: detailer } = await supabase
      .from('detailers')
      .select('stripe_account_id')
      .eq('id', user.id)
      .single();

    if (!detailer?.stripe_account_id) {
      return new Response(JSON.stringify({
        connected: false,
        status: 'NOT_CONNECTED',
        message: 'Stripe not connected'
      }), { status: 200 });
    }

    // Retrieve account from Stripe
    const account = await stripe.accounts.retrieve(detailer.stripe_account_id);

    // Determine status
    let status = 'INCOMPLETE';
    if (account.charges_enabled && account.payouts_enabled) {
      status = 'ACTIVE';
    } else if (account.details_submitted) {
      status = 'PENDING';
    }

    return new Response(JSON.stringify({
      connected: true,
      status,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted,
      accountType: account.type,
      email: account.email,
    }), { status: 200 });
  } catch (err) {
    console.error('Stripe status error:', err);
    return new Response(JSON.stringify({
      connected: false,
      status: 'ERROR',
      message: err.message
    }), { status: 200 });
  }
}
