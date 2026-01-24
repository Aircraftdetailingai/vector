import { createClient } from '@supabase/supabase-js';
import { getAuthUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function getSupabase() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY);
}

// Generate Stripe Connect OAuth URL for Standard accounts
export async function POST(request) {
  const user = await getAuthUser(request);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const supabase = getSupabase();

  try {
    // Fetch detailer info for pre-filling
    const { data: detailer } = await supabase
      .from('detailers')
      .select('stripe_account_id, email, company')
      .eq('id', user.id)
      .single();

    // If already connected, return status
    if (detailer?.stripe_account_id) {
      return new Response(JSON.stringify({
        error: 'Already connected',
        connected: true
      }), { status: 400 });
    }

    // Build OAuth URL for Stripe Connect Standard
    const clientId = process.env.STRIPE_CLIENT_ID;
    if (!clientId) {
      console.error('STRIPE_CLIENT_ID not configured');
      return new Response(JSON.stringify({ error: 'Stripe not configured' }), { status: 500 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

    const redirectUri = `${appUrl}/api/stripe/callback`;

    // Create state token to prevent CSRF (store user ID for callback)
    const state = Buffer.from(JSON.stringify({
      userId: user.id,
      timestamp: Date.now()
    })).toString('base64');

    // Build Stripe OAuth URL
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      scope: 'read_write',
      redirect_uri: redirectUri,
      state: state,
      // Pre-fill user info
      'stripe_user[email]': detailer?.email || '',
      'stripe_user[business_name]': detailer?.company || '',
      'stripe_user[business_type]': 'sole_prop',
      'stripe_user[product_description]': 'Aircraft detailing services',
    });

    const oauthUrl = `https://connect.stripe.com/oauth/authorize?${params.toString()}`;

    return new Response(JSON.stringify({ url: oauthUrl }), { status: 200 });
  } catch (err) {
    console.error('Stripe Connect OAuth error:', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
