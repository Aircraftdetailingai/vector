import { createClient } from '@supabase/supabase-js';
import { getAuthUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function getSupabase() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY);
}

export async function GET(request) {
  const user = await getAuthUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = getSupabase();

  const { data: rows, error } = await supabase
    .from('job_completion_data')
    .select('service_name, variance_pct, created_at')
    .eq('detailer_id', user.id)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[services/accuracy] query error:', error.message);
    return Response.json({ error: 'Failed to fetch accuracy data' }, { status: 500 });
  }

  // Group by service_name
  const groups = {};
  for (const row of rows || []) {
    if (!groups[row.service_name]) groups[row.service_name] = [];
    groups[row.service_name].push(row);
  }

  const accuracy = [];
  for (const [service_name, entries] of Object.entries(groups)) {
    // Only include services with 3+ completed jobs
    if (entries.length < 3) continue;

    const variances = entries.map(e => parseFloat(e.variance_pct) || 0);
    const avg_variance_pct = Math.round((variances.reduce((a, b) => a + b, 0) / variances.length) * 100) / 100;
    const absAvg = Math.abs(avg_variance_pct);

    // Determine badge
    let badge;
    if (absAvg < 10) badge = 'green';
    else if (absAvg <= 25) badge = 'amber';
    else badge = 'red';

    // Determine trend: compare avg of last 5 vs first 5
    let trend = 'stable';
    if (entries.length >= 5) {
      const first5 = variances.slice(0, 5);
      const last5 = variances.slice(-5);
      const avgFirst = first5.reduce((a, b) => a + Math.abs(b), 0) / first5.length;
      const avgLast = last5.reduce((a, b) => a + Math.abs(b), 0) / last5.length;

      if (avgLast < avgFirst - 2) trend = 'improving';
      else if (avgLast > avgFirst + 2) trend = 'worsening';
    }

    accuracy.push({
      service_name,
      avg_variance_pct,
      sample_size: entries.length,
      badge,
      trend,
    });
  }

  // Sort by sample size descending
  accuracy.sort((a, b) => b.sample_size - a.sample_size);

  return Response.json({ accuracy });
}
