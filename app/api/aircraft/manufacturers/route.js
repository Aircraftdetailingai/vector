import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY);
}

export async function GET() {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('aircraft')
    .select('manufacturer')
    .order('manufacturer');

  if (error) {
    console.error('Failed to fetch manufacturers:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch manufacturers' }), { status: 500 });
  }

  // Get unique manufacturers
  const manufacturers = [...new Set(data.map(a => a.manufacturer))];

  return new Response(JSON.stringify({ manufacturers }), { status: 200 });
}
