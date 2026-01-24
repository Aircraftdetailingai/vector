import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function getSupabase() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY);
}

async function getStripe() {
  const Stripe = (await import('stripe')).default;
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

// Handle Stripe Connect OAuth callback
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

  // Handle OAuth errors
  if (error) {
    console.error('Stripe OAuth error:', error, errorDescription);
    return Response.redirect(`${appUrl}/settings?stripe=error&message=${encodeURIComponent(errorDescription || error)}`);
  }

  if (!code || !state) {
    return Response.redirect(`${appUrl}/settings?stripe=error&message=Missing+authorization+code`);
  }

  try {
    // Decode and validate state
    const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
    const { userId, timestamp } = stateData;

    // Check if state is expired (15 min timeout)
    if (Date.now() - timestamp > 15 * 60 * 1000) {
      return Response.redirect(`${appUrl}/settings?stripe=error&message=Authorization+expired`);
    }

    if (!userId) {
      return Response.redirect(`${appUrl}/settings?stripe=error&message=Invalid+state`);
    }

    // Exchange code for access token
    const stripe = await getStripe();
    const response = await stripe.oauth.token({
      grant_type: 'authorization_code',
      code: code,
    });

    const stripeAccountId = response.stripe_user_id;

    if (!stripeAccountId) {
      console.error('No stripe_user_id in OAuth response:', response);
      return Response.redirect(`${appUrl}/settings?stripe=error&message=Failed+to+connect+account`);
    }

    // Save stripe_account_id to detailers table
    const supabase = getSupabase();
    const { error: updateError } = await supabase
      .from('detailers')
      .update({
        stripe_account_id: stripeAccountId,
        stripe_connected_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (updateError) {
      console.error('Failed to save Stripe account ID:', updateError);
      return Response.redirect(`${appUrl}/settings?stripe=error&message=Failed+to+save+connection`);
    }

    // Success - redirect back to settings
    return Response.redirect(`${appUrl}/settings?stripe=success`);
  } catch (err) {
    console.error('Stripe OAuth callback error:', err);
    return Response.redirect(`${appUrl}/settings?stripe=error&message=${encodeURIComponent(err.message)}`);
  }
}
