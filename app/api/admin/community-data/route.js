import { createClient } from '@supabase/supabase-js';
import { getAuthUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const ADMIN_EMAILS = ['brett@vectorav.ai', 'admin@vectorav.ai'];

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

const SERVICE_LABELS = {
  ext_wash_hours: 'Exterior Wash',
  leather_hours: 'Leather',
  carpet_hours: 'Carpet',
  wax_hours: 'Wax',
  polish_hours: 'Polish',
  ceramic_hours: 'Ceramic',
  decon_hours: 'Decon',
  spray_ceramic_hours: 'Spray Ceramic',
  int_detail_hours: 'Interior Detail',
  brightwork_hours: 'Brightwork',
};

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

// GET - Aggregated community data per aircraft/service for admin view
export async function GET(request) {
  try {
    const user = await getAuthUser(request);
    if (!user || !ADMIN_EMAILS.includes(user.email)) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabase();
    if (!supabase) return Response.json({ error: 'Database not configured' }, { status: 500 });

    // Rolling 12-month window
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 365);

    // Fetch all contributions in the window
    const { data: contributions, error } = await supabase
      .from('hours_contributions')
      .select('make, model, service_type, contributed_hrs, detailer_hash, created_at, status, aircraft_hours_default')
      .gte('created_at', cutoff.toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Community data query error:', error);
      return Response.json({ error: 'Failed to fetch data' }, { status: 500 });
    }

    // Fetch recent update logs
    const { data: updateLogs } = await supabase
      .from('hours_update_log')
      .select('make, model, service_type, old_hrs, new_hrs, contribution_count, unique_detailers, weighted_avg, updated_at')
      .order('updated_at', { ascending: false })
      .limit(100);

    // Build update log lookup
    const updateLogMap = {};
    for (const log of (updateLogs || [])) {
      const key = `${(log.make || '').toLowerCase()}::${(log.model || '').toLowerCase()}::${log.service_type}`;
      if (!updateLogMap[key]) updateLogMap[key] = log; // most recent
    }

    const now = Date.now();
    const THIRTY_DAYS = 30 * 86400000;
    const NINETY_DAYS = 90 * 86400000;

    // Group by make + model + service_type
    const groups = {};
    for (const c of (contributions || [])) {
      const key = `${(c.make || '').toLowerCase()}::${(c.model || '').toLowerCase()}::${c.service_type}`;
      if (!groups[key]) {
        groups[key] = {
          make: c.make,
          model: c.model,
          service_type: c.service_type,
          label: SERVICE_LABELS[c.service_type] || c.service_type,
          entries: [],
          detailers: new Set(),
          outlierCount: 0,
          platformDefault: c.aircraft_hours_default ? parseFloat(c.aircraft_hours_default) : null,
        };
      }
      groups[key].entries.push({
        hrs: parseFloat(c.contributed_hrs) || 0,
        created_at: c.created_at,
        status: c.status,
      });
      groups[key].detailers.add(c.detailer_hash);
      if (c.status === 'outlier') groups[key].outlierCount++;
      // Use latest non-null default
      if (!groups[key].platformDefault && c.aircraft_hours_default) {
        groups[key].platformDefault = parseFloat(c.aircraft_hours_default);
      }
    }

    // Fetch actual platform defaults from aircraft_hours for each unique make/model
    const aircraftKeys = new Set();
    for (const g of Object.values(groups)) {
      aircraftKeys.add(`${(g.make || '').toLowerCase()}::${(g.model || '').toLowerCase()}`);
    }

    const platformDefaults = {};
    for (const ak of aircraftKeys) {
      const [make, model] = ak.split('::');
      const { data: ahRow } = await supabase
        .from('aircraft_hours')
        .select('*')
        .ilike('make', make)
        .ilike('model', model)
        .limit(1)
        .single();
      if (ahRow) platformDefaults[ak] = ahRow;
    }

    // Build result rows
    const rows = [];
    for (const group of Object.values(groups)) {
      const ak = `${(group.make || '').toLowerCase()}::${(group.model || '').toLowerCase()}`;
      const ahRow = platformDefaults[ak];
      const column = SERVICE_TO_COLUMN[group.service_type];
      const currentDefault = (ahRow && column) ? (parseFloat(ahRow[column]) || 0) : (group.platformDefault || 0);

      // Count accepted entries only
      const acceptedEntries = group.entries.filter(e => e.status === 'accepted');

      // Recency-weighted average of accepted entries
      let weightedAvg = 0;
      if (acceptedEntries.length > 0) {
        let weightedSum = 0;
        let totalWeight = 0;
        for (const entry of acceptedEntries) {
          const age = now - new Date(entry.created_at).getTime();
          const weight = age <= THIRTY_DAYS ? 3 : age <= NINETY_DAYS ? 2 : 1;
          weightedSum += entry.hrs * weight;
          totalWeight += weight;
        }
        weightedAvg = Math.round((weightedSum / totalWeight) * 100) / 100;
      }

      const variance = currentDefault > 0
        ? Math.round(((weightedAvg - currentDefault) / currentDefault) * 100)
        : null;

      const logKey = `${(group.make || '').toLowerCase()}::${(group.model || '').toLowerCase()}::${group.service_type}`;
      const lastUpdate = updateLogMap[logKey];

      rows.push({
        make: group.make,
        model: group.model,
        service_type: group.service_type,
        label: group.label,
        contribution_count: group.entries.length,
        accepted_count: acceptedEntries.length,
        unique_detailers: group.detailers.size,
        community_avg: weightedAvg,
        platform_default: currentDefault,
        variance_pct: variance,
        outlier_count: group.outlierCount,
        active: group.detailers.size >= 3,
        last_updated: lastUpdate?.updated_at || null,
      });
    }

    // Sort by aircraft then service
    rows.sort((a, b) => {
      const ac = `${a.make} ${a.model}`.localeCompare(`${b.make} ${b.model}`);
      if (ac !== 0) return ac;
      return a.service_type.localeCompare(b.service_type);
    });

    // Summary stats
    const totalContributions = contributions?.length || 0;
    const totalOutliers = rows.reduce((s, r) => s + r.outlier_count, 0);
    const activeGroups = rows.filter(r => r.active).length;
    const uniqueAircraft = aircraftKeys.size;

    return Response.json({
      rows,
      stats: {
        total_contributions: totalContributions,
        total_outliers: totalOutliers,
        active_groups: activeGroups,
        unique_aircraft: uniqueAircraft,
      },
    });
  } catch (err) {
    console.error('Community data error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
