import { createClient } from '@supabase/supabase-js';
import { getAuthUser } from '@/lib/auth';
import { nanoid } from 'nanoid';

function getSupabase() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
}

export async function GET(request) {
  const supabase = getSupabase();
  const user = await getAuthUser(request);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }
  const { data, error } = await supabase
    .from('quotes')
    .select('*')
    .eq('detailer_id', user.id)
    .order('created_at', { ascending: false });
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
  return new Response(JSON.stringify(data), { status: 200 });
}

export async function POST(request) {
  const supabase = getSupabase();
  const user = await getAuthUser(request);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }
  const body = await request.json();
  const {
    aircraft_type,
    aircraft_model,
    aircraft_id,
    surface_area_sqft,
    services,
    base_hours,
    total_hours,
    total_price,
    notes,
    line_items,
    labor_total,
    products_total,
    efficiency_factor,
    access_difficulty
  } = body;
  if (!aircraft_type || !services) {
    return new Response(JSON.stringify({ error: 'Missing fields' }), { status: 400 });
  }
  const shareLink = nanoid(8);
  const validUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('quotes')
    .insert({
      detailer_id: user.id,
      aircraft_type,
      aircraft_model,
      aircraft_id: aircraft_id || null,
      surface_area_sqft: surface_area_sqft || null,
      services,
      base_hours: base_hours || 0,
      total_hours,
      total_price,
      notes,
      share_link: shareLink,
      valid_until: validUntil,
      line_items: line_items || [],
      labor_total: labor_total || 0,
      products_total: products_total || 0,
      efficiency_factor: efficiency_factor || 1.0,
      access_difficulty: access_difficulty || 1.0,
    })
    .select()
    .single();
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
  return new Response(JSON.stringify(data), { status: 201 });
}
