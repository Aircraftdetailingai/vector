import { createClient } from '@supabase/supabase-js';
import { getAuthUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function getSupabase() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY);
}

export async function POST(request) {
  const user = await getAuthUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { order } = await request.json();
  if (!Array.isArray(order) || order.length === 0) {
    return Response.json({ error: 'order array required' }, { status: 400 });
  }

  const supabase = getSupabase();

  const updates = order.map((id, index) =>
    supabase.from('packages').update({ sort_order: index }).eq('id', id).eq('detailer_id', user.id)
  );

  const results = await Promise.all(updates);
  const failed = results.find(r => r.error);

  if (failed?.error) {
    if (failed.error.message?.includes('sort_order')) {
      return Response.json({ error: 'sort_order column missing' }, { status: 500 });
    }
    return Response.json({ error: failed.error.message }, { status: 500 });
  }

  return Response.json({ success: true });
}
