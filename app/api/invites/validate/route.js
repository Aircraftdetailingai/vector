import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token) {
    return Response.json({ valid: false, error: 'No token provided' }, { status: 400 });
  }

  const supabase = getSupabase();
  if (!supabase) {
    return Response.json({ valid: false, error: 'Server error' }, { status: 500 });
  }

  const { data: invite, error } = await supabase
    .from('beta_invites')
    .select('email, plan, duration_days, status')
    .eq('token', token)
    .single();

  if (error || !invite) {
    return Response.json({ valid: false, error: 'Invalid invite token' });
  }

  if (invite.status !== 'pending') {
    return Response.json({ valid: false, error: 'This invitation has already been used' });
  }

  return Response.json({
    valid: true,
    email: invite.email,
    plan: invite.plan,
    duration_days: invite.duration_days,
  });
}
