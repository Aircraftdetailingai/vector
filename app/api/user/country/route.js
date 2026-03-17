import { createClient } from '@supabase/supabase-js';
import { getAuthUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function getSupabase() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY);
}

export async function GET(request) {
  const user = await getAuthUser(request);
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabase();
  const { data } = await supabase
    .from('detailers')
    .select('country')
    .eq('id', user.id)
    .single();

  return Response.json({ country: data?.country || '' });
}

export async function POST(request) {
  const user = await getAuthUser(request);
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { country } = await request.json();
  const code = (country || '').toUpperCase().trim();

  const supabase = getSupabase();
  const { error } = await supabase
    .from('detailers')
    .update({ country: code || null })
    .eq('id', user.id);

  if (error) {
    return Response.json({ error: 'Failed to update country' }, { status: 500 });
  }

  return Response.json({ success: true, country: code });
}
