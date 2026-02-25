import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

// GET - Recalculate hours averages (called by cron nightly)
export async function GET(request) {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (token !== process.env.CRON_SECRET) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = getSupabase();
    if (!supabase) {
      return Response.json({ error: 'Database not configured' }, { status: 500 });
    }

    // Get all hours_log entries (actual DB columns)
    const { data: logs, error } = await supabase
      .from('hours_log')
      .select('aircraft_id, aircraft_model, service_type, actual_hours')
      .not('aircraft_id', 'is', null);

    if (error) {
      console.error('Failed to fetch hours logs:', error);
      return Response.json({ error: 'Failed to fetch logs' }, { status: 500 });
    }

    if (!logs || logs.length === 0) {
      return Response.json({ success: true, groups_processed: 0, message: 'No data to process' });
    }

    // Group by aircraft_id + service_type
    const groups = {};
    for (const log of logs) {
      if (!log.service_type) continue;
      const key = `${log.aircraft_id}::${log.service_type}`;
      if (!groups[key]) {
        groups[key] = {
          aircraft_id: log.aircraft_id,
          aircraft_model: log.aircraft_model,
          service_type: log.service_type,
          values: [],
        };
      }
      groups[key].values.push(parseFloat(log.actual_hours) || 0);
    }

    // Upsert into hours_averages with full computed stats
    let processed = 0;

    for (const group of Object.values(groups)) {
      const values = group.values.sort((a, b) => a - b);
      const count = values.length;
      const sum = values.reduce((a, b) => a + b, 0);
      const avg = sum / count;
      const min = values[0];
      const max = values[count - 1];
      const squaredDiffs = values.map(v => Math.pow(v - avg, 2));
      const stddev = Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / count);

      const row = {
        aircraft_id: group.aircraft_id,
        aircraft_model: group.aircraft_model,
        service_type: group.service_type,
        avg_actual_hours: Math.round(avg * 100) / 100,
        min_actual_hours: Math.round(min * 100) / 100,
        max_actual_hours: Math.round(max * 100) / 100,
        sample_count: count,
        stddev_hours: Math.round(stddev * 100) / 100,
        last_calculated_at: new Date().toISOString(),
      };

      const { error: upsertError } = await supabase
        .from('hours_averages')
        .upsert(row, {
          onConflict: 'aircraft_id,service_type',
        });

      if (upsertError) {
        console.error('Upsert error:', upsertError);
      } else {
        processed++;
      }
    }

    return Response.json({
      success: true,
      groups_processed: processed,
      total_logs: logs.length,
    });
  } catch (err) {
    console.error('Recalculate averages error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
