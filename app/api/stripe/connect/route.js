import { createClient } from '@supabase/supabase-js';
import { getAuthUser } from '@/lib/auth';
import Stripe from 'stripe';

export const dynamic = 'force-dynamic';

function getSupabase() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY);
}

export async function POST(request) {
  // Check Stripe configuration first
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error('STRIPE_SECRET_KEY not configured');
    return new Response(JSON.stringify({ error: 'Stripe not configured. Please add STRIPE_SECRET_KEY to environment variables.' }), { status: 500 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  const user = await getAuthUser(request);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const supabase = getSupabase();

  try {
    // Fetch detailer info
    const { data: detailer } = await supabase
      .from('detailers')
      .select('stripe_account_id, email, company')
      .eq('id', user.id)
      .single();

    let accountId = detailer?.stripe_account_id;

    // Create Stripe Connect account if doesn't exist
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'US',
        email: detailer?.email || user.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: 'individual',
        business_profile: {
          name: detailer?.company || 'Aircraft Detailer',
          product_description: 'Aircraft detailing services',
          mcc: '7349', // Cleaning and maintenance services
        },
        metadata: {
          detailer_id: user.id,
        },
      });

      accountId = account.id;

      // Save to database
      await supabase
        .from('detailers')
        .update({ stripe_account_id: accountId })
        .eq('id', user.id);
    }

    // Generate Account Link for onboarding
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${appUrl}/settings?stripe=refresh`,
      return_url: `${appUrl}/settings?stripe=success`,
      type: 'account_onboarding',
    });

    return new Response(JSON.stringify({ url: accountLink.url }), { status: 200 });
  } catch (err) {
    console.error('Stripe Connect error:', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
