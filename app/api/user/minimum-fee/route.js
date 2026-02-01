import { createClient } from '@supabase/supabase-js';
import { getAuthUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

// GET - Get minimum call out fee settings
export async function GET(request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabase();
    if (!supabase) {
      return Response.json({ error: 'Database not configured' }, { status: 500 });
    }

    const { data: detailer, error } = await supabase
      .from('detailers')
      .select('minimum_callout_fee, minimum_fee_locations')
      .eq('id', user.id)
      .single();

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({
      minimum_callout_fee: detailer?.minimum_callout_fee || 0,
      minimum_fee_locations: detailer?.minimum_fee_locations || [],
    });

  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

// PUT - Update minimum call out fee settings
export async function PUT(request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabase();
    if (!supabase) {
      return Response.json({ error: 'Database not configured' }, { status: 500 });
    }

    const { minimum_callout_fee, minimum_fee_locations } = await request.json();

    const updates = {};
    if (minimum_callout_fee !== undefined) {
      updates.minimum_callout_fee = parseFloat(minimum_callout_fee) || 0;
    }
    if (minimum_fee_locations !== undefined) {
      updates.minimum_fee_locations = minimum_fee_locations;
    }

    const { error } = await supabase
      .from('detailers')
      .update(updates)
      .eq('id', user.id);

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ success: true });

  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
