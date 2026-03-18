import { createClient } from '@supabase/supabase-js';
import { getAuthUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function getSupabase() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY);
}

export async function POST(request) {
  const user = await getAuthUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = getSupabase();

  // Delete cached events
  await supabase
    .from('google_calendar_events')
    .delete()
    .eq('detailer_id', user.id);

  // Delete connection
  await supabase
    .from('google_calendar_connections')
    .delete()
    .eq('detailer_id', user.id);

  return Response.json({ success: true });
}
