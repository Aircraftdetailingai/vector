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

  const { default_labor_rate } = await request.json();

  if (typeof default_labor_rate !== 'number' || default_labor_rate < 0) {
    return new Response(JSON.stringify({ error: 'Invalid labor rate' }), { status: 400 });
  }

  const supabase = getSupabase();

  const { error } = await supabase
    .from('detailers')
    .update({ default_labor_rate })
    .eq('id', user.id);

  if (error) {
    console.error('Failed to update labor rate:', error);
    return new Response(JSON.stringify({ error: 'Failed to update labor rate' }), { status: 500 });
  }

  return new Response(JSON.stringify({ success: true }), { status: 200 });
}
