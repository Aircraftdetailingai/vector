import { createClient } from '@supabase/supabase-js';
import { getAuthUser } from '@/lib/auth';

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
    .select('airports_served')
    .eq('id', user.id)
    .single();

  return Response.json({ airports_served: data?.airports_served || [] });
}

export async function POST(request) {
  const user = await getAuthUser(request);
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { airports_served } = await request.json();
  const codes = (airports_served || [])
    .map(c => (c || '').toUpperCase().trim())
    .filter(c => c.length >= 3 && c.length <= 4);

  const supabase = getSupabase();
  const { error } = await supabase
    .from('detailers')
    .update({ airports_served: codes })
    .eq('id', user.id);

  if (error) {
    console.error('Failed to update airports served:', error);
    return Response.json({ error: 'Failed to update airports served' }, { status: 500 });
  }

  return Response.json({ success: true, airports_served: codes });
}
