import { createClient } from '@supabase/supabase-js';
import { getAuthUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY,
    { global: { fetch: (u, opts) => fetch(u, { ...opts, cache: 'no-store' }) } },
  );
}

export async function GET(request) {
  const user = await getAuthUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = getSupabase();
  const detailerId = user.detailer_id || user.id;

  const { data: warning } = await supabase
    .from('airport_limit_warnings')
    .select('plan_at_warning, airport_count_at_warning, airport_limit_at_warning, deadline_at, enforced_at, airports_deactivated')
    .eq('detailer_id', detailerId)
    .maybeSingle();

  return new Response(JSON.stringify({ warning: warning || null }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store, max-age=0' },
  });
}
