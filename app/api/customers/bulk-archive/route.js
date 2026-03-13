import { createClient } from '@supabase/supabase-js';
import { getAuthUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
  );
}

export async function POST(request) {
  try {
    const user = await getAuthUser(request);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { customerIds, archived } = await request.json();
    if (!customerIds?.length || typeof archived !== 'boolean') {
      return Response.json({ error: 'customerIds and archived boolean are required' }, { status: 400 });
    }

    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('customers')
      .update({ is_archived: archived })
      .eq('detailer_id', user.id)
      .in('id', customerIds)
      .select('id');

    if (error) {
      // Column might not exist yet
      if (error.message?.includes('is_archived')) {
        return Response.json({ error: 'Archive feature not configured. Add is_archived column to customers table.' }, { status: 500 });
      }
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ updated: data?.length || 0 });
  } catch (err) {
    console.error('Bulk archive error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
