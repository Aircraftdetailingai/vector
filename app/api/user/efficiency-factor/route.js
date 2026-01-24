import { createClient } from '@supabase/supabase-js';
import { getAuthUser } from '@/lib/auth';

function getSupabase() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY);
}

export async function POST(request) {
  const user = await getAuthUser(request);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const { efficiency_factor } = await request.json();

  if (typeof efficiency_factor !== 'number' || efficiency_factor < 0.5 || efficiency_factor > 1.5) {
    return new Response(JSON.stringify({ error: 'Invalid efficiency factor (must be 0.5-1.5)' }), { status: 400 });
  }

  const supabase = getSupabase();

  const { error } = await supabase
    .from('detailers')
    .update({ efficiency_factor })
    .eq('id', user.id);

  if (error) {
    console.error('Failed to update efficiency factor:', error);
    return new Response(JSON.stringify({ error: 'Failed to update efficiency factor' }), { status: 500 });
  }

  return new Response(JSON.stringify({ success: true }), { status: 200 });
}
