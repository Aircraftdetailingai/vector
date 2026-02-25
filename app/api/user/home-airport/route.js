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
    .select('home_airport')
    .eq('id', user.id)
    .single();

  return Response.json({ home_airport: data?.home_airport || '' });
}

export async function POST(request) {
  const user = await getAuthUser(request);
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { home_airport } = await request.json();
  const code = (home_airport || '').toUpperCase().trim();

  if (code && (code.length < 3 || code.length > 4)) {
    return Response.json({ error: 'Airport code must be 3-4 characters' }, { status: 400 });
  }

  const supabase = getSupabase();
  const { error } = await supabase
    .from('detailers')
    .update({ home_airport: code || null })
    .eq('id', user.id);

  if (error) {
    console.error('Failed to update home airport:', error);
    return Response.json({ error: 'Failed to update home airport' }, { status: 500 });
  }

  return Response.json({ success: true, home_airport: code });
}
