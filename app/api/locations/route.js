import { createClient } from '@supabase/supabase-js';
import { getAuthUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

// Returns { allowed, limit, current, plan } — allowed=true when the detailer
// can have one more active location. Reads limits from plan_limits at
// runtime so plan tiers can be retuned without a code change. Existing
// over-limit detailers (Pristine Jets) are NOT trimmed here; the cron
// handles their 30-day grace period. We only block NEW active additions.
async function checkAirportLimit(supabase, detailerId) {
  const { data: detailer } = await supabase
    .from('detailers')
    .select('plan')
    .eq('id', detailerId)
    .maybeSingle();
  const plan = detailer?.plan || 'free';

  const { data: limitRow } = await supabase
    .from('plan_limits')
    .select('airport_limit')
    .eq('plan', plan)
    .maybeSingle();
  const limit = limitRow?.airport_limit;
  if (typeof limit !== 'number') {
    // Plan missing from plan_limits — allow through and let the cron log it.
    return { allowed: true, limit: null, current: 0, plan };
  }

  const { count } = await supabase
    .from('detailer_locations')
    .select('id', { count: 'exact', head: true })
    .eq('detailer_id', detailerId)
    .eq('active', true);

  return { allowed: (count || 0) < limit, limit, current: count || 0, plan };
}

function airportLimitResponse({ limit, current, plan }) {
  return Response.json({
    error: 'airport_limit_reached',
    limit,
    current,
    plan,
    upgrade_url: 'https://pricing.shinyjets.com',
  }, { status: 403 });
}

// GET - List all locations for detailer
export async function GET(request) {
  const user = await getAuthUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = getSupabase();
  if (!supabase) return Response.json({ error: 'DB not configured' }, { status: 500 });

  const { data, error } = await supabase
    .from('detailer_locations')
    .select('*')
    .eq('detailer_id', user.detailer_id || user.id)
    .order('created_at', { ascending: true });

  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ locations: data || [] });
}

// POST - Create a new location
export async function POST(request) {
  const user = await getAuthUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = getSupabase();
  if (!supabase) return Response.json({ error: 'DB not configured' }, { status: 500 });

  const body = await request.json();
  const { name, location_type, airport_icao, address, notes } = body;

  if (!name) return Response.json({ error: 'Name required' }, { status: 400 });

  const detailerId = user.detailer_id || user.id;

  // New rows default to active=true at the DB layer, so this insert counts
  // against the plan limit. Block before insert.
  const check = await checkAirportLimit(supabase, detailerId);
  if (!check.allowed) return airportLimitResponse(check);

  const { data, error } = await supabase
    .from('detailer_locations')
    .insert({
      detailer_id: detailerId,
      name,
      location_type: location_type || 'other',
      airport_icao: airport_icao || null,
      address: address || null,
      notes: notes || null,
    })
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ location: data }, { status: 201 });
}

// PUT - Update a location
export async function PUT(request) {
  const user = await getAuthUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = getSupabase();
  if (!supabase) return Response.json({ error: 'DB not configured' }, { status: 500 });

  const body = await request.json();
  const { id, name, location_type, airport_icao, address, notes, active } = body;

  if (!id) return Response.json({ error: 'Location ID required' }, { status: 400 });

  const detailerId = user.detailer_id || user.id;

  // Reactivating an inactive row counts as a new active addition. Look up
  // the current row to know whether this PUT actually flips active false→true.
  if (active === true) {
    const { data: existing } = await supabase
      .from('detailer_locations')
      .select('active')
      .eq('id', id)
      .eq('detailer_id', detailerId)
      .maybeSingle();
    if (existing && existing.active === false) {
      const check = await checkAirportLimit(supabase, detailerId);
      if (!check.allowed) return airportLimitResponse(check);
    }
  }

  const updates = {};
  if (name !== undefined) updates.name = name;
  if (location_type !== undefined) updates.location_type = location_type;
  if (airport_icao !== undefined) updates.airport_icao = airport_icao || null;
  if (address !== undefined) updates.address = address || null;
  if (notes !== undefined) updates.notes = notes || null;
  if (active !== undefined) updates.active = active;

  const { data, error } = await supabase
    .from('detailer_locations')
    .update(updates)
    .eq('id', id)
    .eq('detailer_id', detailerId)
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ location: data });
}

// DELETE - Remove a location
export async function DELETE(request) {
  const user = await getAuthUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = getSupabase();
  if (!supabase) return Response.json({ error: 'DB not configured' }, { status: 500 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) return Response.json({ error: 'Location ID required' }, { status: 400 });

  // Unlink products and equipment first
  await supabase.from('products').update({ location_id: null }).eq('location_id', id);
  await supabase.from('equipment').update({ location_id: null }).eq('location_id', id);

  const { error } = await supabase
    .from('detailer_locations')
    .delete()
    .eq('id', id)
    .eq('detailer_id', user.detailer_id || user.id);

  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ success: true });
}
