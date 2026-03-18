import { createClient } from '@supabase/supabase-js';
import { getAuthUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function getSupabase() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY);
}

export async function GET(request) {
  const user = await getAuthUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = getSupabase();
  const { data: conn } = await supabase
    .from('google_calendar_connections')
    .select('connected_at, last_sync_at, sync_enabled, push_enabled, calendar_id')
    .eq('detailer_id', user.id)
    .single();

  if (!conn) {
    return Response.json({ connected: false });
  }

  return Response.json({
    connected: true,
    connected_at: conn.connected_at,
    last_sync_at: conn.last_sync_at,
    sync_enabled: conn.sync_enabled,
    push_enabled: conn.push_enabled,
    calendar_id: conn.calendar_id,
  });
}
