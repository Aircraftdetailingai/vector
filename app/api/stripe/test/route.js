import Stripe from 'stripe';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const results = {
    step1_env: null,
    step2_init: null,
    step3_api: null,
    error: null,
  };

  try {
    // Step 1: Check environment variable
    const key = process.env.STRIPE_SECRET_KEY;
    results.step1_env = {
      exists: !!key,
      length: key?.length || 0,
      first10: key?.substring(0, 10) || 'none',
      last4: key?.substring(key?.length - 4) || 'none',
      hasSpaces: key?.includes(' ') || false,
      hasNewline: key?.includes('\n') || key?.includes('\r') || false,
      hasQuotes: key?.startsWith('"') || key?.startsWith("'") || false,
      trimmedLength: key?.trim()?.length || 0,
    };

    if (!key) {
      return Response.json({ ...results, error: 'No STRIPE_SECRET_KEY' }, { status: 500 });
    }

    // Step 2: Initialize Stripe
    console.log('Initializing Stripe with key length:', key.length);
    const stripe = new Stripe(key.trim(), {
      apiVersion: '2023-10-16',
      maxNetworkRetries: 0, // Don't retry - fail fast
      timeout: 10000, // 10 second timeout
    });
    results.step2_init = { success: true };

    // Step 3: Make a simple API call
    console.log('Testing Stripe API call...');
    const accounts = await stripe.accounts.list({ limit: 1 });
    results.step3_api = {
      success: true,
      hasData: !!accounts.data,
      count: accounts.data?.length || 0,
    };

    return Response.json({
      success: true,
      message: 'Stripe connection working!',
      ...results,
    }, { status: 200 });

  } catch (err) {
    console.error('Stripe test error:', err);
    results.error = {
      message: err.message,
      type: err.type || 'unknown',
      code: err.code || 'unknown',
      statusCode: err.statusCode || 'unknown',
      raw: err.raw?.message || null,
    };
    return Response.json(results, { status: 500 });
  }
}
