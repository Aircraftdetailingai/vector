import { createClient } from '@supabase/supabase-js';
import { getAuthUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function getSupabase() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY);
}

export async function DELETE(request, { params }) {
  const user = await getAuthUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const supabase = getSupabase();

  // Delete assignments first
  await supabase.from('job_assignments').delete().eq('job_id', id);

  // Delete from jobs table
  const { error: jobErr } = await supabase
    .from('jobs')
    .delete()
    .eq('id', id)
    .eq('detailer_id', user.id);

  if (jobErr) {
    // Try deleting from quotes table (legacy jobs)
    const { error: quoteErr } = await supabase
      .from('quotes')
      .delete()
      .eq('id', id)
      .eq('detailer_id', user.id);
    if (quoteErr) return Response.json({ error: 'Failed to delete' }, { status: 500 });
  }

  return Response.json({ success: true });
}
