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
  console.log('=== Stripe Connect Route Hit ===');
  console.log('ENV CHECK:', {
    STRIPE_SECRET_KEY: !!process.env.STRIPE_SECRET_KEY,
    SUPABASE_URL: !!process.env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'not set',
    VERCEL_URL: process.env.VERCEL_URL || 'not set',
  });

  try {
    // Check Stripe configuration
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    console.log('STRIPE KEY DEBUG:', {
      exists: !!stripeKey,
      length: stripeKey?.length || 0,
      prefix: stripeKey?.substring(0, 8) || 'none',
      suffix: stripeKey?.substring(stripeKey.length - 4) || 'none',
    });

    if (!stripeKey) {
      console.error('STRIPE_SECRET_KEY not configured');
      return Response.json({ error: 'Stripe not configured' }, { status: 500 });
    }

    if (!stripeKey.startsWith('sk_')) {
      console.error('STRIPE_SECRET_KEY has wrong format, should start with sk_');
      return Response.json({ error: 'Invalid Stripe key format' }, { status: 500 });
    }

    // Check Supabase configuration
    if (!process.env.SUPABASE_URL) {
      console.error('SUPABASE_URL not configured');
      return Response.json({ error: 'Database not configured' }, { status: 500 });
    }

    const stripe = new Stripe(stripeKey);
    console.log('Stripe client initialized successfully');

    // Get authenticated user
    let user;
    try {
      user = await getAuthUser(request);
      console.log('Auth result:', user ? `User ID: ${user.id}` : 'No user');
    } catch (authError) {
      console.error('Auth error:', authError);
      return Response.json({ error: 'Authentication failed' }, { status: 401 });
    }

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabase();

    // Fetch detailer info
    const { data: detailer, error: detailerError } = await supabase
      .from('detailers')
      .select('stripe_account_id, email, company')
      .eq('id', user.id)
      .single();

    console.log('Detailer query:', {
      found: !!detailer,
      error: detailerError?.message || null,
      email: detailer?.email || 'none'
    });

    if (detailerError && detailerError.code !== 'PGRST116') {
      console.error('Detailer fetch error:', detailerError);
      return Response.json({ error: 'Failed to fetch user data' }, { status: 500 });
    }

    let accountId = detailer?.stripe_account_id;
    console.log('Existing Stripe account:', accountId || 'none');

    // Create Stripe Connect account if doesn't exist
    if (!accountId) {
      console.log('Creating new Stripe Connect account...');
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
        metadata: {
          detailer_id: user.id,
        },
      });

      accountId = account.id;
      console.log('Created Stripe account:', accountId);

      // Save to database
      const { error: updateError } = await supabase
        .from('detailers')
        .update({ stripe_account_id: accountId })
        .eq('id', user.id);

      if (updateError) {
        console.error('Failed to save Stripe account ID:', updateError);
      } else {
        console.log('Saved Stripe account ID to database');
      }
    }

    // Generate Account Link for onboarding
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
    console.log('App URL:', appUrl);

    console.log('Creating account link...');
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${appUrl}/settings?stripe=refresh`,
      return_url: `${appUrl}/settings?stripe=success`,
      type: 'account_onboarding',
    });

    console.log('Account link created successfully');
    return Response.json({ url: accountLink.url }, { status: 200 });

  } catch (err) {
    console.error('Stripe Connect error:', err.message);
    console.error('Full error:', err);
    return Response.json({
      error: err.message || 'Unknown error',
      type: err.type || 'unknown'
    }, { status: 500 });
  }
}
