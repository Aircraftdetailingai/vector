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

  const { quote_display_preference } = await request.json();

  if (!['package', 'labor_products', 'full_breakdown'].includes(quote_display_preference)) {
    return new Response(JSON.stringify({ error: 'Invalid preference' }), { status: 400 });
  }

  const supabase = getSupabase();

  const { error } = await supabase
    .from('detailers')
    .update({ quote_display_preference })
    .eq('id', user.id);

  if (error) {
    console.error('Failed to update quote display preference:', error);
    return new Response(JSON.stringify({ error: 'Failed to update preference' }), { status: 500 });
  }

  return new Response(JSON.stringify({ success: true }), { status: 200 });
}
