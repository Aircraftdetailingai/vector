import { createClient } from '@supabase/supabase-js';
import { getAuthUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const ADMIN_EMAILS = [
  'brett@vectorav.ai',
  'admin@vectorav.ai',
  'brett@shinyjets.com',
];

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

async function isAdmin(request) {
  const user = await getAuthUser(request);
  if (!user) return false;
  return ADMIN_EMAILS.includes(user.email?.toLowerCase());
}

// GET - List all inventory items
export async function GET(request) {
  try {
    if (!await isAdmin(request)) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabase();
    if (!supabase) return Response.json({ error: 'DB error' }, { status: 500 });

    const { data, error } = await supabase
      .from('reward_inventory')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      if (error.code === '42P01') {
        return Response.json({ items: [], needsMigration: true });
      }
      return Response.json({ error: error.message }, { status: 500 });
    }

    // Get redemption counts per reward
    const { data: redemptions } = await supabase
      .from('reward_redemptions')
      .select('reward_id');

    const redemptionCounts = {};
    (redemptions || []).forEach(r => {
      redemptionCounts[r.reward_id] = (redemptionCounts[r.reward_id] || 0) + 1;
    });

    const items = (data || []).map(item => ({
      ...item,
      redeemed_count: redemptionCounts[item.id] || 0,
    }));

    return Response.json({ items });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

// Parse reward_value — accept string or object, always return object
function parseRewardValue(val) {
  if (!val) return {};
  if (typeof val === 'object') return val;
  try { return JSON.parse(val); } catch { return {}; }
}

// POST - Create new inventory item
export async function POST(request) {
  try {
    if (!await isAdmin(request)) {
      console.error('[inventory POST] Unauthorized — isAdmin returned false');
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabase();
    if (!supabase) {
      console.error('[inventory POST] Supabase client failed to initialize');
      return Response.json({ error: 'DB error' }, { status: 500 });
    }

    const body = await request.json();

    if (!body.name || !String(body.name).trim()) {
      return Response.json({ error: 'Product name is required' }, { status: 400 });
    }

    const parsedPoints = parseInt(body.points_cost);
    const row = {
      name: String(body.name).trim(),
      description: body.description || '',
      image_url: body.image_url || null,
      points_cost: isNaN(parsedPoints) ? 0 : parsedPoints,
      quantity_available: parseInt(body.quantity_available) || 0,
      category: body.category || 'supplies',
      min_tier: body.min_tier || 'pro',
      reward_type: body.reward_type || 'physical',
      reward_value: parseRewardValue(body.reward_value),
      active: body.active !== false,
      featured: body.featured || false,
    };

    console.log('[inventory POST] inserting:', row.name, row.points_cost, 'pts');

    // Column-stripping retry
    let data, error;
    ({ data, error } = await supabase.from('reward_inventory').insert(row).select().single());

    if (error && error.code === '42P01') {
      return Response.json({ error: 'reward_inventory table not found. Run migration first.' }, { status: 500 });
    }

    if (error && error.message?.includes('column')) {
      console.warn('[inventory POST] column error, retrying:', error.message);
      delete row.featured;
      delete row.image_url;
      ({ data, error } = await supabase.from('reward_inventory').insert(row).select().single());
    }

    if (error) {
      console.error('[inventory POST] error:', error.message, error.code, error.details);
      return Response.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      console.error('[inventory POST] insert returned null data');
      return Response.json({ error: 'Insert succeeded but returned no data' }, { status: 500 });
    }

    console.log('[inventory POST] created:', data.id);
    return Response.json({ item: data });
  } catch (err) {
    console.error('[inventory POST] exception:', err.message, err.stack);
    return Response.json({ error: err.message }, { status: 500 });
  }
}

// PUT - Update inventory item
export async function PUT(request) {
  try {
    if (!await isAdmin(request)) {
      console.error('[inventory PUT] Unauthorized');
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabase();
    if (!supabase) return Response.json({ error: 'DB error' }, { status: 500 });

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) return Response.json({ error: 'ID required' }, { status: 400 });

    if (updates.points_cost !== undefined) {
      const p = parseInt(updates.points_cost);
      updates.points_cost = isNaN(p) ? 0 : p;
    }
    if (updates.quantity_available !== undefined) updates.quantity_available = parseInt(updates.quantity_available) || 0;
    if (updates.reward_value !== undefined) updates.reward_value = parseRewardValue(updates.reward_value);
    if (updates.name !== undefined) updates.name = String(updates.name).trim();

    console.log('[inventory PUT] id:', id);

    let data, error;
    ({ data, error } = await supabase.from('reward_inventory').update(updates).eq('id', id).select().single());

    if (error && error.message?.includes('column')) {
      const safeUpdates = { ...updates };
      delete safeUpdates.featured;
      delete safeUpdates.image_url;
      ({ data, error } = await supabase.from('reward_inventory').update(safeUpdates).eq('id', id).select().single());
    }

    if (error) {
      console.error('[inventory PUT] error:', error.message, error.code);
      return Response.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return Response.json({ error: 'Update returned no data — item may not exist' }, { status: 404 });
    }

    console.log('[inventory PUT] updated:', data.id);
    return Response.json({ item: data });
  } catch (err) {
    console.error('[inventory PUT] exception:', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
}

// DELETE - Remove inventory item
export async function DELETE(request) {
  try {
    if (!await isAdmin(request)) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabase();
    if (!supabase) return Response.json({ error: 'DB error' }, { status: 500 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return Response.json({ error: 'ID required' }, { status: 400 });

    const { error } = await supabase.from('reward_inventory').delete().eq('id', id);

    if (error) return Response.json({ error: error.message }, { status: 500 });

    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
