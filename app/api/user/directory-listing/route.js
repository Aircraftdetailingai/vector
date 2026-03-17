import { createClient } from '@supabase/supabase-js';
import { getAuthUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function getSupabase() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY);
}

export async function POST(request) {
  const user = await getAuthUser(request);
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { listed_in_directory } = await request.json();

  const supabase = getSupabase();
  const { error } = await supabase
    .from('detailers')
    .update({ listed_in_directory: !!listed_in_directory })
    .eq('id', user.id);

  if (error) {
    console.error('Failed to update directory listing:', error);
    return Response.json({ error: 'Failed to update directory listing' }, { status: 500 });
  }

  return Response.json({ success: true, listed_in_directory: !!listed_in_directory });
}
