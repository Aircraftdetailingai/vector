import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
  );
}

// POST - Validate a promo code
export async function POST(request) {
  const { code } = await request.json();

  if (!code || typeof code !== 'string') {
    return new Response(JSON.stringify({ error: 'Code is required' }), { status: 400 });
  }

  const supabase = getSupabase();
  const normalizedCode = code.trim().toUpperCase();

  const { data: promo, error } = await supabase
    .from('promo_codes')
    .select('*')
    .eq('code', normalizedCode)
    .single();

  if (error || !promo) {
    return new Response(JSON.stringify({ error: 'Invalid promo code' }), { status: 404 });
  }

  // Check date validity
  const now = new Date().toISOString().slice(0, 10);
  if (promo.valid_from && now < promo.valid_from) {
    return new Response(JSON.stringify({ error: 'This promo code is not yet active' }), { status: 400 });
  }
  if (promo.valid_until && now > promo.valid_until) {
    return new Response(JSON.stringify({ error: 'This promo code has expired' }), { status: 400 });
  }

  // Check max uses
  if (promo.max_uses && promo.times_used >= promo.max_uses) {
    return new Response(JSON.stringify({ error: 'This promo code has been fully redeemed' }), { status: 400 });
  }

  // Build discount description
  let description = '';
  switch (promo.discount_type) {
    case 'first_month_free':
      description = 'First month free!';
      break;
    case 'percent_off':
      description = `${promo.discount_value}% off`;
      break;
    case 'flat_off':
      description = `$${promo.discount_value} off`;
      break;
    default:
      description = 'Discount applied';
  }

  return new Response(JSON.stringify({
    valid: true,
    code: promo.code,
    discount_type: promo.discount_type,
    discount_value: promo.discount_value,
    min_months: promo.min_months || 0,
    description,
  }), { status: 200 });
}
