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

    // === Pass 1: Update hours_averages from hours_log ===
    const { data: logs, error } = await supabase
      .from('hours_log')
      .select('aircraft_id, aircraft_model, service_type, actual_hours')
      .not('aircraft_id', 'is', null);

    if (error) {
      console.error('Failed to fetch hours logs:', error);
      return Response.json({ error: 'Failed to fetch logs' }, { status: 500 });
    }

    let processed = 0;

    if (logs && logs.length > 0) {
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
          .upsert(row, { onConflict: 'aircraft_id,service_type' });

        if (!upsertError) processed++;
      }
    }

    // === Pass 2: Community averaging with improved statistical logic ===
    let communityUpdated = 0;
    let outliersFlagged = 0;

    try {
      // Rolling 12-month window
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 365);

      const { data: contributions, error: contribError } = await supabase
        .from('hours_contributions')
        .select('make, model, service_type, contributed_hrs, detailer_hash, created_at, aircraft_hours_default, status')
        .gte('created_at', cutoff.toISOString());

      if (!contribError && contributions && contributions.length > 0) {
        // Known service_type -> aircraft_hours column mapping
        const SERVICE_TO_COLUMN = {
          ext_wash_hours: 'maintenance_wash_hrs',
          leather_hours: 'leather_hrs',
          carpet_hours: 'carpet_hrs',
          wax_hours: 'wax_hrs',
          polish_hours: 'one_step_polish_hrs',
          ceramic_hours: 'ceramic_coating_hrs',
          decon_hours: 'decon_paint_hrs',
          spray_ceramic_hours: 'spray_ceramic_hrs',
        };

        const now = Date.now();
        const THIRTY_DAYS = 30 * 86400000;
        const NINETY_DAYS = 90 * 86400000;

        // Group all contributions by make + model + service_type
        const communityGroups = {};
        for (const c of contributions) {
          const key = `${(c.make || '').toLowerCase()}::${(c.model || '').toLowerCase()}::${c.service_type}`;
          if (!communityGroups[key]) {
            communityGroups[key] = {
              make: c.make,
              model: c.model,
              service_type: c.service_type,
              entries: [],
              detailers: new Set(),
              outlierCount: 0,
            };
          }
          communityGroups[key].entries.push({
            hrs: parseFloat(c.contributed_hrs) || 0,
            created_at: c.created_at,
            detailer_hash: c.detailer_hash,
            aircraft_hours_default: c.aircraft_hours_default ? parseFloat(c.aircraft_hours_default) : null,
            status: c.status,
          });
          communityGroups[key].detailers.add(c.detailer_hash);
        }

        for (const group of Object.values(communityGroups)) {
          const column = SERVICE_TO_COLUMN[group.service_type];
          if (!column) continue;

          // Fetch current platform default for this aircraft/service
          const { data: currentRow } = await supabase
            .from('aircraft_hours')
            .select(column)
            .ilike('make', group.make)
            .ilike('model', group.model)
            .limit(1)
            .single();

          if (!currentRow) continue;
          const platformDefault = parseFloat(currentRow[column]) || 0;
          if (platformDefault <= 0) continue;

          // Filter: only accepted entries (exclude outliers and rejected)
          // Also apply outlier rejection: reject >2x or <0.5x platform default
          const validEntries = [];
          const validDetailers = new Set();

          for (const entry of group.entries) {
            // Auto-flag outliers that haven't been flagged yet
            if (entry.status !== 'outlier' && entry.status !== 'rejected') {
              if (entry.hrs > platformDefault * 2 || entry.hrs < platformDefault * 0.5) {
                group.outlierCount++;
                outliersFlagged++;
                continue; // exclude from calculation
              }
              if (entry.status === 'accepted') {
                validEntries.push(entry);
                validDetailers.add(entry.detailer_hash);
              }
            } else if (entry.status === 'outlier') {
              group.outlierCount++;
            }
          }

          // Require 3+ unique detailers
          if (validDetailers.size < 3) continue;

          // Recency-weighted average: 30d=3x, 31-90d=2x, 91-365d=1x
          let weightedSum = 0;
          let totalWeight = 0;
          for (const entry of validEntries) {
            const age = now - new Date(entry.created_at).getTime();
            const weight = age <= THIRTY_DAYS ? 3 : age <= NINETY_DAYS ? 2 : 1;
            weightedSum += entry.hrs * weight;
            totalWeight += weight;
          }
          const weightedAvg = Math.round((weightedSum / totalWeight) * 100) / 100;

          // Only update if difference > 5%
          const diff = Math.abs(weightedAvg - platformDefault) / platformDefault;
          if (diff > 0.05) {
            await supabase
              .from('aircraft_hours')
              .update({ [column]: weightedAvg })
              .ilike('make', group.make)
              .ilike('model', group.model);

            // Log the update with full stats
            await supabase.from('hours_update_log').insert({
              make: group.make,
              model: group.model,
              service_type: group.service_type,
              old_hrs: platformDefault,
              new_hrs: weightedAvg,
              contribution_count: validEntries.length,
              unique_detailers: validDetailers.size,
              weighted_avg: weightedAvg,
            });

            communityUpdated++;
          }
        }
      }
    } catch (e) {
      console.error('Community averaging error:', e);
    }

    return Response.json({
      success: true,
      groups_processed: processed,
      total_logs: logs?.length || 0,
      community_updated: communityUpdated,
      outliers_flagged: outliersFlagged,
    });
  } catch (err) {
    console.error('Recalculate averages error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
