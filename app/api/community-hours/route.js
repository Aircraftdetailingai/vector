import { createClient } from '@supabase/supabase-js';
import { getAuthUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

// GET - Fetch community average hours for a given aircraft make/model
// Uses rolling 12-month window, recency weighting, and 3 unique detailer minimum
export async function GET(request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabase();
    if (!supabase) return Response.json({ error: 'Database not configured' }, { status: 500 });

    const { searchParams } = new URL(request.url);
    const make = searchParams.get('make');
    const model = searchParams.get('model');

    if (!make || !model) {
      return Response.json({ error: 'make and model required' }, { status: 400 });
    }

    // Rolling 12-month window
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 365);

    const { data, error } = await supabase
      .from('hours_contributions')
      .select('service_type, contributed_hrs, detailer_hash, created_at')
      .ilike('make', make)
      .ilike('model', model)
      .in('status', ['accepted'])
      .gte('created_at', cutoff.toISOString());

    if (error) {
      console.error('Community hours query error:', error);
      return Response.json({ hours: {} });
    }

    const now = Date.now();
    const THIRTY_DAYS = 30 * 86400000;
    const NINETY_DAYS = 90 * 86400000;

    // Group by service_type
    const groups = {};
    for (const row of (data || [])) {
      if (!groups[row.service_type]) {
        groups[row.service_type] = { entries: [], detailers: new Set() };
      }
      groups[row.service_type].entries.push({
        hrs: parseFloat(row.contributed_hrs) || 0,
        created_at: row.created_at,
      });
      groups[row.service_type].detailers.add(row.detailer_hash);
    }

    // Only return groups with 3+ unique detailers
    const hours = {};
    for (const [serviceType, group] of Object.entries(groups)) {
      if (group.detailers.size >= 3) {
        // Recency-weighted average
        let weightedSum = 0;
        let totalWeight = 0;
        for (const entry of group.entries) {
          const age = now - new Date(entry.created_at).getTime();
          const weight = age <= THIRTY_DAYS ? 3 : age <= NINETY_DAYS ? 2 : 1;
          weightedSum += entry.hrs * weight;
          totalWeight += weight;
        }
        hours[serviceType] = {
          avg_hours: Math.round((weightedSum / totalWeight) * 100) / 100,
          sample_count: group.entries.length,
          unique_detailers: group.detailers.size,
        };
      }
    }

    return Response.json({ hours });
  } catch (err) {
    console.error('Community hours error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
