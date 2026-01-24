import { createClient } from '@supabase/supabase-js';
import { getAuthUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function getSupabase() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY);
}

async function getStripe() {
  const Stripe = (await import('stripe')).default;
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

export async function GET(request) {
  const supabase = getSupabase();
  const stripe = await getStripe();

  const user = await getAuthUser(request);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

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

    // Verify with Stripe API
    const account = await stripe.accounts.retrieve(detailer.stripe_account_id);

    const status = account.charges_enabled && account.payouts_enabled
      ? 'ACTIVE'
      : account.details_submitted
        ? 'PENDING'
        : 'INCOMPLETE';

    return new Response(JSON.stringify({
      connected: true,
      status,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted,
      accountType: account.type,
      // Mask bank account info
      bankAccount: account.external_accounts?.data?.[0]
        ? `****${account.external_accounts.data[0].last4}`
        : null
    }), { status: 200 });
  } catch (err) {
    console.error('Stripe status check error:', err);
    return new Response(JSON.stringify({
      connected: false,
      status: 'ERROR',
      message: err.message
    }), { status: 200 });
  }
}
