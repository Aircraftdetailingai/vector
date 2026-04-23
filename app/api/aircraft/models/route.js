import { createClient } from '@supabase/supabase-js';
import { getAuthUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

// Next.js wraps the global fetch with its Data Cache. supabase-js uses that
// wrapped fetch internally, so even `dynamic = 'force-dynamic'` + a cache-
// control: no-store response header can't prevent a cached Supabase response
// from being served inside the Function runtime (x-vercel-cache: MISS is
// misleading — the staleness is in the Function's own Data Cache, not the
// edge). Forcing { cache: 'no-store' } on supabase-js's internal fetch
// bypasses Next's Data Cache entirely. Without this, newly-inserted aircraft
// rows don't appear in the /models response until the next deploy warms a
// fresh Function instance — which is exactly what Brett hit today after 7
// new Gulfstream models were added.
function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY,
    { global: { fetch: (url, opts) => fetch(url, { ...opts, cache: 'no-store' }) } },
  );
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

  if (manufacturer) query = query.eq('manufacturer', manufacturer);
  if (category) query = query.eq('category', category);

  const { data, error } = await query;

  if (error) {
    return new Response(JSON.stringify({ error: 'Failed to fetch models' }), { status: 500 });
  }

  let models = (data || []).map(m => ({ ...m, custom: false }));

  // If authenticated, include custom aircraft models
  const user = await getAuthUser(request);
  if (user?.id) {
    let customQuery = supabase
      .from('custom_aircraft')
      .select('id, manufacturer, model, category')
      .eq('detailer_id', user.id)
      .order('model');

    if (manufacturer) customQuery = customQuery.eq('manufacturer', manufacturer);
    if (category) customQuery = customQuery.eq('category', category);

    const { data: customData } = await customQuery;

    if (customData) {
      models = [...models, ...customData.map(c => ({
        id: c.id, manufacturer: c.manufacturer, model: c.model,
        category: c.category, custom: true,
      }))];
    }
  }

  return new Response(JSON.stringify({ models }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store, max-age=0' },
  });
}
