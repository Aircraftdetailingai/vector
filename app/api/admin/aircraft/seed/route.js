import { createClient } from '@supabase/supabase-js';
import { getAuthUser } from '@/lib/auth';
import { AIRCRAFT_DATA } from '@/lib/aircraft-data';

export const dynamic = 'force-dynamic';

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

// POST - Seed the aircraft database with all built-in aircraft data
export async function POST(request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabase();
    if (!supabase) {
      return Response.json({ error: 'Database not configured' }, { status: 500 });
    }

    // Upsert all aircraft (won't duplicate if manufacturer+model already exists)
    const batchSize = 50;
    let totalInserted = 0;

    for (let i = 0; i < AIRCRAFT_DATA.length; i += batchSize) {
      const batch = AIRCRAFT_DATA.slice(i, i + batchSize);
      const { data, error } = await supabase
        .from('aircraft')
        .upsert(batch, {
          onConflict: 'manufacturer,model',
          ignoreDuplicates: false,
        })
        .select('id');

      if (error) {
        console.error(`Batch ${i} error:`, error);
        return Response.json({
          error: error.message,
          inserted_so_far: totalInserted,
        }, { status: 500 });
      }

      totalInserted += data?.length || 0;
    }

    return Response.json({
      success: true,
      count: totalInserted,
      total_available: AIRCRAFT_DATA.length,
    });
  } catch (err) {
    console.error('Seed error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}

// GET - Return the count of available aircraft data
export async function GET() {
  const categories = {};
  for (const ac of AIRCRAFT_DATA) {
    categories[ac.category] = (categories[ac.category] || 0) + 1;
  }

  return Response.json({
    total: AIRCRAFT_DATA.length,
    categories,
  });
}
