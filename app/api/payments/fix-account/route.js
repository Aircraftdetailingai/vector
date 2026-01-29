import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function getSupabase() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY);
}

export async function GET(request) {
  const supabase = getSupabase();

  // Update the detailer with the working test account
  const { data, error } = await supabase
    .from('detailers')
    .update({ stripe_account_id: 'acct_1SulfbE9Qo7bJV5q' })
    .eq('id', '9f2b9f6a-a104-4497-a5fc-735ab3a7c170')
    .select();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({
    success: true,
    detailerId: data[0]?.id,
    newStripeAccount: data[0]?.stripe_account_id
  });
}
