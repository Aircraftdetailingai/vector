import { createClient } from '@supabase/supabase-js';
import { getAuthUser } from '@/lib/auth';
import { getAllCurrencies, CURRENCY_MAP } from '@/lib/currency';

export const dynamic = 'force-dynamic';

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

// GET - Get user's currency preference
export async function GET(request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabase();
    if (!supabase) {
      return Response.json({ error: 'Database not configured' }, { status: 500 });
    }

    const { data: detailer } = await supabase
      .from('detailers')
      .select('preferred_currency')
      .eq('id', user.id)
      .single();

    const currentCurrency = detailer?.preferred_currency || 'USD';
    const currencyInfo = CURRENCY_MAP[currentCurrency] || CURRENCY_MAP.USD;
    const currencies = getAllCurrencies();

    return Response.json({
      currency: currentCurrency,
      currencyInfo,
      currencies,
    });

  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

// POST - Update user's currency preference
export async function POST(request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabase();
    if (!supabase) {
      return Response.json({ error: 'Database not configured' }, { status: 500 });
    }

    const { currency } = await request.json();

    // Validate currency
    const currencyInfo = CURRENCY_MAP[currency];
    if (!currencyInfo) {
      return Response.json({ error: 'Invalid currency code' }, { status: 400 });
    }

    const { error } = await supabase
      .from('detailers')
      .update({ preferred_currency: currency })
      .eq('id', user.id);

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({
      success: true,
      currency,
      currencyInfo,
    });

  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
