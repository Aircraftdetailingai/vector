import { createClient } from '@supabase/supabase-js';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY,
  );
}

async function getCrewUser(request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const payload = await verifyToken(authHeader.slice(7));
  if (!payload || payload.role !== 'crew') return null;
  return payload;
}

// GET — pending and accepted assignments for the crew member
export async function GET(request) {
  const user = await getCrewUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('job_assignments')
    .select('id, job_id, team_member_id, detailer_id, status, accepted_at, declined_at, notified_at, notes, created_at, jobs(*)')
    .eq('team_member_id', user.id)
    .in('status', ['pending', 'accepted'])
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[crew/assignments] GET error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }

  const assignments = (data || []).map((a) => ({
    id: a.id,
    job_id: a.job_id,
    team_member_id: a.team_member_id,
    detailer_id: a.detailer_id,
    status: a.status,
    accepted_at: a.accepted_at,
    declined_at: a.declined_at,
    notified_at: a.notified_at,
    notes: a.notes,
    created_at: a.created_at,
    job: a.jobs || null,
  }));

  return Response.json({ assignments });
}

// PATCH — accept or decline an assignment
export async function PATCH(request) {
  const user = await getCrewUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = getSupabase();

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { assignment_id, action } = body || {};
  if (!assignment_id || !['accept', 'decline'].includes(action)) {
    return Response.json({ error: 'assignment_id and valid action are required' }, { status: 400 });
  }

  // Verify this assignment belongs to the crew member
  const { data: existing, error: fetchErr } = await supabase
    .from('job_assignments')
    .select('id, job_id, team_member_id, detailer_id')
    .eq('id', assignment_id)
    .single();

  if (fetchErr || !existing) {
    return Response.json({ error: 'Assignment not found' }, { status: 404 });
  }

  if (existing.team_member_id !== user.id) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const now = new Date().toISOString();
  const update =
    action === 'accept'
      ? { status: 'accepted', accepted_at: now }
      : { status: 'declined', declined_at: now };

  const { error: updateErr } = await supabase
    .from('job_assignments')
    .update(update)
    .eq('id', assignment_id);

  if (updateErr) {
    console.error('[crew/assignments] update error:', updateErr);
    return Response.json({ error: updateErr.message }, { status: 500 });
  }

  // Log activity
  try {
    await supabase.from('crew_activity_log').insert({
      detailer_id: existing.detailer_id,
      team_member_id: user.id,
      team_member_name: user.name || null,
      job_id: existing.job_id,
      action_type: action === 'accept' ? 'assignment_accepted' : 'assignment_declined',
      action_details: {
        assignment_id,
        job_id: existing.job_id,
      },
    });
  } catch (logErr) {
    console.error('[crew/assignments] activity log error:', logErr);
  }

  return Response.json({ success: true });
}
