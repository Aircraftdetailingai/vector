import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const VALID_COLUMNS = [
  'ext_wash_hours',
  'int_detail_hours',
  'leather_hours',
  'carpet_hours',
  'wax_hours',
  'polish_hours',
  'ceramic_hours',
  'brightwork_hours',
];

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

// GET — average hours for a given column across all aircraft
export async function GET(request) {
  const url = new URL(request.url);
  const column = url.searchParams.get('column');

  if (!column || !VALID_COLUMNS.includes(column)) {
    return Response.json({ error: `Invalid column. Must be one of: ${VALID_COLUMNS.join(', ')}` }, { status: 400 });
  }

  const supabase = getSupabase();
  if (!supabase) return Response.json({ error: 'DB not configured' }, { status: 500 });

  const { data, error } = await supabase.rpc('get_column_average', { col_name: column }).single();

  // Fallback: if the RPC doesn't exist, do a raw query via select
  if (error) {
    // Use a manual approach: fetch all non-null values and compute average
    const { data: rows, error: fetchErr } = await supabase
      .from('aircraft_hours')
      .select(column)
      .not(column, 'is', null)
      .gt(column, 0);

    if (fetchErr) {
      return Response.json({ error: fetchErr.message }, { status: 500 });
    }

    const values = (rows || []).map(r => parseFloat(r[column])).filter(v => !isNaN(v) && v > 0);
    const count = values.length;
    const avg = count > 0 ? values.reduce((sum, v) => sum + v, 0) / count : 0;

    return Response.json({
      average_hours: Math.round(avg * 100) / 100,
      aircraft_count: count,
      column,
    });
  }

  return Response.json({
    average_hours: Math.round((data?.average_hours || 0) * 100) / 100,
    aircraft_count: data?.aircraft_count || 0,
    column,
  });
}
