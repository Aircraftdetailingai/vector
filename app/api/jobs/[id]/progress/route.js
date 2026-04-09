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
  const { progress_percentage } = await request.json();

  const supabase = getSupabase();
  const val = Math.min(100, Math.max(0, parseInt(progress_percentage) || 0));

  // Try jobs table first
  const { error } = await supabase.from('jobs').update({ progress_percentage: val }).eq('id', id).eq('detailer_id', user.id);
  if (error) {
    // Try quotes table (legacy jobs)
    await supabase.from('quotes').update({ progress_percentage: val }).eq('id', id).eq('detailer_id', user.id);
  }

  return Response.json({ success: true, progress_percentage: val });
}
