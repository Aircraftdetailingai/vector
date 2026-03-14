import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

// GET — validate an invite token (public endpoint)
export async function GET(request) {
  const url = new URL(request.url);
  const token = url.searchParams.get('token');

  if (!token) {
    return Response.json({ valid: false, error: 'Token is required' }, { status: 400 });
  }

  const supabase = getSupabase();
  if (!supabase) return Response.json({ valid: false, error: 'Server error' }, { status: 500 });

  const { data, error } = await supabase
    .from('beta_invites')
    .select('email, plan, duration_days, status')
    .eq('token', token)
    .single();

  if (error || !data) {
    return Response.json({ valid: false, error: 'Invalid invite token' });
  }

  if (data.status !== 'pending') {
    return Response.json({ valid: false, error: data.status === 'used' ? 'This invite has already been used' : 'This invite has been revoked' });
  }

  return Response.json({
    valid: true,
    email: data.email,
    plan: data.plan,
    duration_days: data.duration_days,
  });
}
