import { createClient } from '@supabase/supabase-js';
import { getAuthUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function getSupabase() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY);
}

export async function GET(request, { params }) {
  const user = await getAuthUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const supabase = getSupabase();

  const { data: job, error } = await supabase
    .from('jobs')
    .select('*')
    .eq('id', id)
    .eq('detailer_id', user.id)
    .single();

  if (error || !job) return Response.json({ error: 'Job not found' }, { status: 404 });

  // Parse services JSON if needed
  let services = [];
  if (job.services) {
    try { services = typeof job.services === 'string' ? JSON.parse(job.services) : job.services; } catch {}
  }

  // Get assignments
  let crew = [];
  try {
    const { data: assignments } = await supabase
      .from('job_assignments')
      .select('team_member_id')
      .eq('job_id', id);
    if (assignments?.length) {
      const ids = assignments.map(a => a.team_member_id);
      const { data: members } = await supabase.from('team_members').select('id, name, role').in('id', ids);
      crew = members || [];
    }
  } catch {}

  return Response.json({
    ...job,
    client_name: job.customer_name,
    client_email: job.customer_email,
    aircraft_model: job.aircraft_model,
    aircraft_type: job.aircraft_make,
    services: Array.isArray(services) ? services.map(s => typeof s === 'string' ? { name: s } : s) : [],
    assigned_crew: crew,
    _source: 'jobs_table',
  });
}
