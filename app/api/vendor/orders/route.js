import { createClient } from '@supabase/supabase-js';
import { getVendorUser } from '@/lib/vendorAuth';

export const dynamic = 'force-dynamic';

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

// GET - Get vendor's orders
export async function GET(request) {
  try {
    const vendor = await getVendorUser(request);
    if (!vendor) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabase();
    if (!supabase) {
      return Response.json({ error: 'Database not configured' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    let query = supabase
      .from('vendor_orders')
      .select(`
        *,
        vendor_products (name, sku, images)
      `)
      .eq('vendor_id', vendor.id)
      .order('created_at', { ascending: false });

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data: orders, error } = await query;

    if (error) {
      if (error.code === '42P01') {
        return Response.json({ orders: [] });
      }
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ orders: orders || [] });

  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

// PUT - Update order status
export async function PUT(request) {
  try {
    const vendor = await getVendorUser(request);
    if (!vendor) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabase();
    if (!supabase) {
      return Response.json({ error: 'Database not configured' }, { status: 500 });
    }

    const { id, status, tracking_number, notes } = await request.json();

    if (!id) {
      return Response.json({ error: 'Order ID required' }, { status: 400 });
    }

    const updates = {};
    if (status) updates.status = status;
    if (tracking_number) updates.tracking_number = tracking_number;
    if (notes !== undefined) updates.notes = notes;

    if (status === 'shipped') {
      updates.shipped_at = new Date().toISOString();
    }
    if (status === 'delivered') {
      updates.delivered_at = new Date().toISOString();
    }

    const { data: order, error } = await supabase
      .from('vendor_orders')
      .update(updates)
      .eq('id', id)
      .eq('vendor_id', vendor.id)
      .select()
      .single();

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ order });

  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
