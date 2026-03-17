import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function GET(request) {
  const supabase = getSupabase();
  if (!supabase) {
    return Response.json({ error: 'Database not configured' }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const country = searchParams.get('country') || '';
  const airport = searchParams.get('airport') || '';
  const search = searchParams.get('search') || '';

  let query = supabase
    .from('detailers')
    .select('id, name, company, country, home_airport, preferred_currency, plan')
    .eq('listed_in_directory', true)
    .eq('status', 'active')
    .in('plan', ['pro', 'business', 'enterprise']);

  if (country) {
    query = query.eq('country', country.toUpperCase());
  }

  if (airport) {
    query = query.ilike('home_airport', `%${airport.toUpperCase()}%`);
  }

  if (search) {
    query = query.or(`name.ilike.%${search}%,company.ilike.%${search}%`);
  }

  query = query.order('company', { ascending: true });

  const { data, error } = await query;

  if (error) {
    console.error('Directory query error:', error);
    return Response.json({ error: 'Failed to fetch directory' }, { status: 500 });
  }

  return Response.json({ detailers: data || [] });
}
