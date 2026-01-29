import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function getSupabase() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY);
}

export async function GET(request) {
  const supabase = getSupabase();
  const targetId = '9f2b9f6a-a104-4497-a5fc-735ab3a7c170';
  const newAccountId = 'acct_1SulfbE9Qo7bJV5q';

  // First check current value
  const { data: before } = await supabase
    .from('detailers')
    .select('id, stripe_account_id')
    .eq('id', targetId)
    .single();

  // Update the detailer with the working test account
  const { data, error } = await supabase
    .from('detailers')
    .update({ stripe_account_id: newAccountId })
    .eq('id', targetId)
    .select();

  if (error) {
    return Response.json({ error: error.message, before }, { status: 500 });
  }

  // Verify the update
  const { data: after } = await supabase
    .from('detailers')
    .select('id, stripe_account_id')
    .eq('id', targetId)
    .single();

  return Response.json({
    success: after?.stripe_account_id === newAccountId,
    before: before?.stripe_account_id,
    updateReturned: data[0]?.stripe_account_id,
    after: after?.stripe_account_id,
    expected: newAccountId
  });
}
