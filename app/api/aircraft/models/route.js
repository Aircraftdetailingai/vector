import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY);
}

export async function GET(request) {
  const supabase = getSupabase();
  const { searchParams } = new URL(request.url);
  const manufacturer = searchParams.get('manufacturer') || searchParams.get('make');
  const category = searchParams.get('category');

  let query = supabase
    .from('aircraft')
    .select('id, manufacturer, model, category, seats, surface_area_sqft')
    .order('model');

  if (manufacturer) {
    query = query.eq('manufacturer', manufacturer);
  }

  if (category) {
    query = query.eq('category', category);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Failed to fetch models:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch models' }), { status: 500 });
  }

  return new Response(JSON.stringify({ models: data }), { status: 200 });
}
