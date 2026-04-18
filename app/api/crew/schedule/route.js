import { createClient } from '@supabase/supabase-js';
import { getAuthUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function getSupabase() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY);
}

async function getCrewUser(request) {
  const payload = await getAuthUser(request);
  if (!payload || payload.role !== 'crew') return null;
  return payload;
}

export async function GET(request) {
  const user = await getCrewUser(request);
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabase();

  // Get detailer's visibility window
  const { data: detailer } = await supabase
    .from('detailers')
    .select('crew_schedule_visibility_days')
    .eq('id', user.detailer_id)
    .single();

  const visibilityDays = detailer?.crew_schedule_visibility_days || 7;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const endDate = new Date(today);
  endDate.setDate(endDate.getDate() + visibilityDays);

  // Get job assignments for this crew member
  const { data: assignments, error: assignErr } = await supabase
    .from('job_assignments')
    .select('job_id')
    .eq('team_member_id', user.id);

  if (assignErr) {
    console.error('[crew/schedule] Assignment query error:', assignErr);
    return Response.json({ error: 'Failed to fetch schedule' }, { status: 500 });
  }

  const jobIds = (assignments || []).map(a => a.job_id).filter(Boolean);

  if (jobIds.length === 0) {
    return Response.json({ jobs: [], visibility_days: visibilityDays });
  }

  // Fetch jobs from quotes table within date range
  const { data: quoteJobs, error: quoteErr } = await supabase
    .from('quotes')
    .select('id, aircraft_model, aircraft_type, airport, scheduled_date, status, notes, tail_number')
    .eq('detailer_id', user.detailer_id)
    .in('id', jobIds)
    .gte('scheduled_date', today.toISOString().split('T')[0])
    .lte('scheduled_date', endDate.toISOString().split('T')[0])
    .in('status', ['accepted', 'paid', 'scheduled', 'in_progress'])
    .order('scheduled_date', { ascending: true });

  if (quoteErr) {
    console.error('[crew/schedule] Quote query error:', quoteErr);
  }

  // Also check jobs table
  const { data: directJobs, error: jobErr } = await supabase
    .from('jobs')
    .select('id, title, aircraft_model, aircraft_type, airport, scheduled_date, status, notes, tail_number, scheduled_time')
    .eq('detailer_id', user.detailer_id)
    .in('id', jobIds)
    .gte('scheduled_date', today.toISOString().split('T')[0])
    .lte('scheduled_date', endDate.toISOString().split('T')[0])
    .order('scheduled_date', { ascending: true });

  if (jobErr) {
    console.error('[crew/schedule] Jobs table query error:', jobErr);
  }

  const jobs = [
    ...(quoteJobs || []).map(j => ({
      id: j.id,
      title: j.aircraft_model || j.aircraft_type || 'Detail Job',
      aircraft_model: j.aircraft_model,
      tail_number: j.tail_number,
      airport: j.airport,
      scheduled_date: j.scheduled_date,
      scheduled_time: null,
      status: j.status,
      source: 'quote',
    })),
    ...(directJobs || []).map(j => ({
      id: j.id,
      title: j.title || j.aircraft_model || j.aircraft_type || 'Job',
      aircraft_model: j.aircraft_model,
      tail_number: j.tail_number,
      airport: j.airport,
      scheduled_date: j.scheduled_date,
      scheduled_time: j.scheduled_time,
      status: j.status,
      source: 'job',
    })),
  ];

  return Response.json({ jobs, visibility_days: visibilityDays });
}
