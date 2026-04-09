import { createClient } from '@supabase/supabase-js';
import { getAuthUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function getSupabase() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY);
}

export async function POST(request, { params }) {
  const user = await getAuthUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const body = await request.json();
  const supabase = getSupabase();

  const updates = {};
  if (body.progress_percentage !== undefined) {
    updates.progress_percentage = Math.min(100, Math.max(0, parseInt(body.progress_percentage) || 0));
  }
  if (body.share_progress_with_customer !== undefined) {
    updates.share_progress_with_customer = !!body.share_progress_with_customer;
  }

  if (Object.keys(updates).length === 0) return Response.json({ error: 'Nothing to update' }, { status: 400 });

  // Try jobs table first
  const { error } = await supabase.from('jobs').update(updates).eq('id', id).eq('detailer_id', user.id);
  if (error) {
    // Try quotes table (legacy jobs)
    await supabase.from('quotes').update({ progress_percentage: val }).eq('id', id).eq('detailer_id', user.id);
  }

  return Response.json({ success: true, progress_percentage: val });
}
