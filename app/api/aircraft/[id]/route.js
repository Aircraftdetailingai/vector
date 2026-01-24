import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY);
}

export async function GET(request, { params }) {
  const supabase = getSupabase();
  const { id } = params;

  const { data: aircraft, error } = await supabase
    .from('aircraft')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !aircraft) {
    return new Response(JSON.stringify({ error: 'Aircraft not found' }), { status: 404 });
  }

  return new Response(JSON.stringify({ aircraft }), { status: 200 });
}
