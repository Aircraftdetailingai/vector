import { getAuthUser } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

// GET - Fetch saved scripts
export async function GET(request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabase();
    if (!supabase) {
      return Response.json({ scripts: [] });
    }

    const { data, error } = await supabase
      .from('sales_scripts')
      .select('*')
      .eq('detailer_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Failed to fetch scripts:', error);
      return Response.json({ scripts: [] });
    }

    return Response.json({ scripts: data || [] });
  } catch (err) {
    console.error('Sales assistant GET error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
