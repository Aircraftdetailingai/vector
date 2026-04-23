import { createClient } from '@supabase/supabase-js';
import { getAuthUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

// See app/api/aircraft/models/route.js for the full rationale. Short version:
// supabase-js calls Next's fetch-with-Data-Cache under the hood, so a
// newly-added manufacturer won't appear until the Function instance is warmed
// fresh unless we force { cache: 'no-store' } on the internal fetch here.
function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY,
    { global: { fetch: (url, opts) => fetch(url, { ...opts, cache: 'no-store' }) } },
  );
}

export async function GET(request) {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('aircraft')
    .select('manufacturer')
    .order('manufacturer');

  if (error) {
    return new Response(JSON.stringify({ error: 'Failed to fetch manufacturers' }), { status: 500 });
  }

  const manufacturers = new Set(data.map(a => a.manufacturer));

  // If authenticated, include custom aircraft manufacturers
  const user = await getAuthUser(request);
  if (user?.id) {
    const { data: custom } = await supabase
      .from('custom_aircraft')
      .select('manufacturer')
      .eq('detailer_id', user.id);

    if (custom) {
      for (const c of custom) manufacturers.add(c.manufacturer);
    }
  }

  const sorted = [...manufacturers].sort((a, b) => a.localeCompare(b));
  return new Response(JSON.stringify({ manufacturers: sorted }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store, max-age=0' },
  });
}
