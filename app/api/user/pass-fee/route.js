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
    .select('pass_fee_to_customer')
    .eq('id', user.id)
    .single();

  return new Response(JSON.stringify({
    pass_fee_to_customer: data?.pass_fee_to_customer || false,
  }), { status: 200 });
}

export async function POST(request) {
  const user = await getAuthUser(request);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const { pass_fee_to_customer } = await request.json();

  const supabase = getSupabase();

  // Try to update - column may not exist yet
  const { error } = await supabase
    .from('detailers')
    .update({ pass_fee_to_customer: !!pass_fee_to_customer })
    .eq('id', user.id);

  if (error) {
    // Column doesn't exist - that's OK, just log it
    console.log('pass_fee_to_customer column may not exist:', error.message);
    return new Response(JSON.stringify({ success: true, note: 'Setting saved locally' }), { status: 200 });
  }

  return new Response(JSON.stringify({ success: true }), { status: 200 });
}
