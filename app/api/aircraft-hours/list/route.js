import { createClient } from '@supabase/supabase-js';
import { getAuthUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

// Mirrors the d7b2d9e cache-bust pattern used on /api/aircraft/* — supabase-js
// uses Next's wrapped fetch internally, so any new aircraft_hours row would be
// invisible to a warm Function instance until { cache: 'no-store' } is forced.
function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY,
    { global: { fetch: (url, opts) => fetch(url, { ...opts, cache: 'no-store' }) } },
  );
}

// Picker source for the calibration-anchor selectors. The `aircraft` table
// driving /api/aircraft/manufacturers + /models does not share ids with
// aircraft_hours and most rows have no aircraft_hours match — using that
// endpoint would let detailers pick aircraft that fail the
// detailers.calibration_anchor_a/b FK to aircraft_hours.id. Listing rows
// here directly keeps the picker honest: every option resolves to a real
// FK target with reference hours we can compute against.
export async function GET(request) {
  const user = await getAuthUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('aircraft_hours')
    .select('id, make, model, maintenance_wash_hrs, one_step_polish_hrs, wax_hrs, ceramic_coating_hrs, leather_hrs, carpet_hrs')
    .order('make', { ascending: true })
    .order('model', { ascending: true });

  if (error) {
    console.error('[aircraft-hours/list] error:', error);
    return Response.json({ error: 'Failed to fetch aircraft hours' }, { status: 500 });
  }

  return new Response(JSON.stringify({ items: data || [] }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store, max-age=0' },
  });
}
