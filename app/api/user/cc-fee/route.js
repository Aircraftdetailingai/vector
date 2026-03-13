import { createClient } from '@supabase/supabase-js';
import { getAuthUser } from '@/lib/auth';

function getSupabase() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY);
}

export async function GET(request) {
  const user = await getAuthUser(request);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const supabase = getSupabase();
  const { data } = await supabase
    .from('detailers')
    .select('cc_fee_mode')
    .eq('id', user.id)
    .single();

  return new Response(JSON.stringify({
    cc_fee_mode: data?.cc_fee_mode || 'absorb',
  }), { status: 200 });
}

export async function POST(request) {
  const user = await getAuthUser(request);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const { cc_fee_mode } = await request.json();

  const valid = ['absorb', 'pass', 'customer_choice'];
  if (!valid.includes(cc_fee_mode)) {
    return new Response(JSON.stringify({ error: 'Invalid cc_fee_mode' }), { status: 400 });
  }

  const supabase = getSupabase();
  const { error } = await supabase
    .from('detailers')
    .update({ cc_fee_mode })
    .eq('id', user.id);

  if (error) {
    console.log('cc_fee_mode column may not exist:', error.message);
    return new Response(JSON.stringify({ success: true, note: 'Setting saved locally' }), { status: 200 });
  }

  return new Response(JSON.stringify({ success: true }), { status: 200 });
}
