import { createClient } from '@supabase/supabase-js';
import { getAuthUser } from '@/lib/auth';
import Stripe from 'stripe';

export const dynamic = 'force-dynamic';

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
  );
}

export async function POST(request) {
  console.log('=== Stripe Connect Route ===');

  try {
    // Get and validate Stripe key
    const stripeKey = process.env.STRIPE_SECRET_KEY?.trim();

    console.log('Key check:', {
      exists: !!stripeKey,
      length: stripeKey?.length || 0,
      prefix: stripeKey?.substring(0, 10) || 'none',
    });

    if (!stripeKey) {
      return Response.json({ error: 'STRIPE_SECRET_KEY not configured' }, { status: 500 });
    }

    if (!stripeKey.startsWith('sk_')) {
      return Response.json({ error: 'Invalid key format - must start with sk_' }, { status: 500 });
    }

    // Initialize Stripe with explicit config
    const stripe = new Stripe(stripeKey, {
      apiVersion: '2023-10-16',
      maxNetworkRetries: 0,
      timeout: 30000,
    });

    // Get authenticated user
    const user = await getAuthUser(request);
    console.log('User:', user?.id || 'none');

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check Supabase
    if (!process.env.SUPABASE_URL) {
      return Response.json({ error: 'SUPABASE_URL not configured' }, { status: 500 });
    }

    const supabase = getSupabase();

    // Fetch detailer
    const { data: detailer, error: dbError } = await supabase
      .from('detailers')
      .select('stripe_account_id, email, company')
      .eq('id', user.id)
      .single();

    if (dbError && dbError.code !== 'PGRST116') {
      console.error('DB error:', dbError);
      return Response.json({ error: 'Database error: ' + dbError.message }, { status: 500 });
    }

    console.log('Detailer:', { found: !!detailer, hasStripe: !!detailer?.stripe_account_id });

    let accountId = detailer?.stripe_account_id;

    // Create Stripe account if needed
    if (!accountId) {
      console.log('Creating Stripe Connect account...');
      try {
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
            mcc: '7349',
          },
          metadata: { detailer_id: user.id },
        });

        accountId = account.id;
        console.log('Created account:', accountId);

        // Save to DB
        await supabase
          .from('detailers')
          .update({ stripe_account_id: accountId })
          .eq('id', user.id);

      } catch (stripeErr) {
        console.error('Stripe account create error:', {
          message: stripeErr.message,
          type: stripeErr.type,
          code: stripeErr.code,
        });
        return Response.json({
          error: 'Failed to create Stripe account',
          details: stripeErr.message,
          type: stripeErr.type,
          code: stripeErr.code,
        }, { status: 500 });
      }
    }

    // Create account link
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

    console.log('Creating account link for:', accountId, 'redirect to:', appUrl);

    try {
      const accountLink = await stripe.accountLinks.create({
        account: accountId,
        refresh_url: `${appUrl}/settings?stripe=refresh`,
        return_url: `${appUrl}/settings?stripe=success`,
        type: 'account_onboarding',
      });

      console.log('Account link created');
      return Response.json({ url: accountLink.url }, { status: 200 });

    } catch (linkErr) {
      console.error('Account link error:', {
        message: linkErr.message,
        type: linkErr.type,
        code: linkErr.code,
      });
      return Response.json({
        error: 'Failed to create onboarding link',
        details: linkErr.message,
        type: linkErr.type,
        code: linkErr.code,
      }, { status: 500 });
    }

  } catch (err) {
    console.error('Unhandled error:', err);
    return Response.json({
      error: err.message || 'Unknown error',
      type: err.type || 'unknown',
      code: err.code || 'unknown',
    }, { status: 500 });
  }
}
