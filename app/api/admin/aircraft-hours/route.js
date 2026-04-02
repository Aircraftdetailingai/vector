import { createClient } from '@supabase/supabase-js';
import { getAuthUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const ADMIN_EMAILS = ['brett@vectorav.ai', 'admin@vectorav.ai', 'brett@shinyjets.com', 'sales@shinyjets.com'];

function getSupabase() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY);
}

export async function POST(request) {
  const user = await getAuthUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  // Admin check
  const supabase = getSupabase();
  const { data: detailer } = await supabase.from('detailers').select('email').eq('id', user.id).single();
  if (!detailer || !ADMIN_EMAILS.includes(detailer.email?.toLowerCase())) {
    return Response.json({ error: 'Admin access required' }, { status: 403 });
  }

  const body = await request.json();
  const { id, ...updates } = body;
  if (!id) return Response.json({ error: 'Aircraft ID required' }, { status: 400 });

  // Only allow hours columns
  const allowed = ['ext_wash_hours', 'decon_hours', 'int_detail_hours', 'leather_hours', 'carpet_hours', 'wax_hours', 'polish_hours', 'ceramic_hours', 'spray_ceramic_hours', 'brightwork_hours'];
  const safeUpdates = {};
  for (const [key, val] of Object.entries(updates)) {
    if (allowed.includes(key)) safeUpdates[key] = parseFloat(val) || 0;
  }

  const { error } = await supabase.from('aircraft').update(safeUpdates).eq('id', id);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ success: true });
}
