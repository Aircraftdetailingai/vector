import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import Stripe from 'stripe';
import { sendQuoteSentEmail, sendQuoteViewedEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const debug = {
    timestamp: new Date().toISOString(),
    env: {},
    auth: {},
    stripe: {},
    supabase: {},
    user: {},
  };

  try {
    // 1. Environment variables
    const stripeKey = process.env.STRIPE_SECRET_KEY?.trim();
    debug.env = {
      STRIPE_SECRET_KEY: {
        exists: !!stripeKey,
        length: stripeKey?.length || 0,
        prefix: stripeKey?.substring(0, 15) || 'none',
        suffix: stripeKey?.substring(stripeKey?.length - 4) || 'none',
        hasNewline: stripeKey?.includes('\n') || stripeKey?.includes('\r'),
      },
      SUPABASE_URL: {
        exists: !!process.env.SUPABASE_URL,
        value: process.env.SUPABASE_URL?.substring(0, 30) + '...',
      },
      SUPABASE_SERVICE_ROLE_KEY: {
        exists: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      },
      SUPABASE_SERVICE_KEY: {
        exists: !!process.env.SUPABASE_SERVICE_KEY,
      },
      JWT_SECRET: {
        exists: !!process.env.JWT_SECRET,
        length: process.env.JWT_SECRET?.length || 0,
      },
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'not set',
      VERCEL_URL: process.env.VERCEL_URL || 'not set',
    };

    // 2. Auth - check both header and cookie
    const authHeader = request.headers.get('authorization');
    const cookieStore = await cookies();
    const authCookie = cookieStore.get('auth_token')?.value;

    debug.auth = {
      hasAuthHeader: !!authHeader,
      authHeaderPrefix: authHeader?.substring(0, 20) || 'none',
      hasCookie: !!authCookie,
      cookieLength: authCookie?.length || 0,
    };

    // Try to get user from cookie
    let user = null;
    if (authCookie) {
      user = await verifyToken(authCookie);
      debug.auth.userFromCookie = user ? { id: user.id, email: user.email } : 'invalid token';
    }
    if (!user && authHeader?.startsWith('Bearer ')) {
      user = await verifyToken(authHeader.slice(7));
      debug.auth.userFromHeader = user ? { id: user.id, email: user.email } : 'invalid token';
    }

    debug.user = user ? { id: user.id, email: user.email, role: user.role } : null;

    // 3. Stripe - test the key
    if (stripeKey) {
      try {
        const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' });

        // Get account info
        const account = await stripe.accounts.retrieve();
        debug.stripe.account = {
          id: account.id,
          email: account.email,
          display_name: account.settings?.dashboard?.display_name,
          type: account.type,
          charges_enabled: account.charges_enabled,
          payouts_enabled: account.payouts_enabled,
        };

        // Test Connect API - try to list connected accounts
        try {
          const connected = await stripe.accounts.list({ limit: 3 });
          debug.stripe.connect = {
            enabled: true,
            connectedAccounts: connected.data.length,
            accounts: connected.data.map(a => ({ id: a.id, email: a.email })),
          };
        } catch (connectErr) {
          debug.stripe.connect = {
            enabled: false,
            error: connectErr.message,
          };
        }

        // Test creating an account (without actually creating)
        try {
          // This will fail but we want to see the specific error
          const testAccount = await stripe.accounts.create({
            type: 'express',
            country: 'US',
            email: 'test-debug@example.com',
            capabilities: {
              card_payments: { requested: true },
              transfers: { requested: true },
            },
          });
          debug.stripe.createTest = {
            success: true,
            accountId: testAccount.id,
          };
          // Delete the test account
          await stripe.accounts.del(testAccount.id);
        } catch (createErr) {
          debug.stripe.createTest = {
            success: false,
            error: createErr.message,
            type: createErr.type,
            code: createErr.code,
          };
        }

      } catch (stripeErr) {
        debug.stripe.error = {
          message: stripeErr.message,
          type: stripeErr.type,
        };
      }
    }

    // 4. Supabase - test connection and query
    if (process.env.SUPABASE_URL) {
      try {
        const supabase = createClient(
          process.env.SUPABASE_URL,
          process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
        );

        // Test query
        const { data, error } = await supabase
          .from('detailers')
          .select('id, email, company, stripe_account_id')
          .limit(1);

        debug.supabase = {
          connected: true,
          querySuccess: !error,
          error: error?.message,
          sampleData: data?.[0] ? {
            hasId: !!data[0].id,
            hasEmail: !!data[0].email,
            hasStripeId: !!data[0].stripe_account_id,
          } : null,
        };

        // If we have a user, get their detailer record
        if (user?.id) {
          const { data: detailer, error: detailerErr } = await supabase
            .from('detailers')
            .select('id, email, company, stripe_account_id')
            .eq('id', user.id)
            .single();

          debug.supabase.currentUserDetailer = detailerErr
            ? { error: detailerErr.message, code: detailerErr.code }
            : detailer;
        }

      } catch (dbErr) {
        debug.supabase = {
          connected: false,
          error: dbErr.message,
        };
      }
    }

    return Response.json(debug, { status: 200 });

  } catch (err) {
    return Response.json({
      ...debug,
      fatalError: {
        message: err.message,
        stack: err.stack?.split('\n').slice(0, 5),
      },
    }, { status: 500 });
  }
}

// POST - Test email sending
export async function POST(request) {
  try {
    const { email, type } = await request.json();

    if (!email) {
      return Response.json({ error: 'Email required' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
    );

    // Get sample quote and detailer
    const { data: quote } = await supabase.from('quotes').select('*').limit(1).single();
    const { data: detailer } = await supabase.from('detailers').select('*').limit(1).single();

    if (!quote || !detailer) {
      return Response.json({ error: 'No data for testing' }, { status: 400 });
    }

    // Override for testing
    const testQuote = { ...quote, client_email: email, client_name: 'Test Customer' };
    const testDetailer = { ...detailer, email, name: 'Test Detailer', company: 'Test Aviation' };

    let result;
    if (type === 'viewed') {
      result = await sendQuoteViewedEmail({ quote: testQuote, detailer: testDetailer, viewedAt: new Date().toISOString() });
    } else {
      result = await sendQuoteSentEmail({ quote: testQuote, detailer: testDetailer });
    }

    return Response.json({ success: true, email, type: type || 'quote_sent', result });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
