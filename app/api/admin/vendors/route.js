import { createClient } from '@supabase/supabase-js';
import { getAuthUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

// Admin emails (hardcoded for now)
const ADMIN_EMAILS = [
  'brett@aircraftdetailing.ai',
  'admin@aircraftdetailing.ai',
  'brett@shinyjets.com',
];

async function isAdmin(request) {
  const user = await getAuthUser(request);
  if (!user) return false;
  return ADMIN_EMAILS.includes(user.email?.toLowerCase());
}

// GET - Get all vendors and pending products
export async function GET(request) {
  try {
    if (!await isAdmin(request)) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabase();
    if (!supabase) {
      return Response.json({ error: 'Database not configured' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const view = searchParams.get('view') || 'vendors';

    if (view === 'products') {
      // Get pending products
      const { data: products, error } = await supabase
        .from('vendor_products')
        .select(`
          *,
          vendors (id, company_name, email)
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) {
        return Response.json({ error: error.message }, { status: 500 });
      }

      return Response.json({ products: products || [] });
    }

    // Get vendors
    const { data: vendors, error } = await supabase
      .from('vendors')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      if (error.code === '42P01') {
        return Response.json({ vendors: [], pendingCount: 0 });
      }
      return Response.json({ error: error.message }, { status: 500 });
    }

    // Get pending product count
    const { count: pendingProducts } = await supabase
      .from('vendor_products')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending');

    // Calculate platform stats
    const { data: allProducts } = await supabase
      .from('vendor_products')
      .select('price, views, clicks, sales');

    const { data: allOrders } = await supabase
      .from('vendor_orders')
      .select('total, commission');

    const totalRevenue = allOrders?.reduce((sum, o) => sum + (o.total || 0), 0) || 0;
    const totalCommission = allOrders?.reduce((sum, o) => sum + (o.commission || 0), 0) || 0;

    return Response.json({
      vendors: (vendors || []).map(v => ({ ...v, password: undefined })),
      pendingVendors: vendors?.filter(v => v.status === 'pending').length || 0,
      pendingProducts: pendingProducts || 0,
      stats: {
        totalVendors: vendors?.length || 0,
        activeVendors: vendors?.filter(v => v.status === 'active').length || 0,
        totalProducts: allProducts?.length || 0,
        totalRevenue,
        totalCommission,
      },
    });

  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

// PUT - Update vendor or product status
export async function PUT(request) {
  try {
    if (!await isAdmin(request)) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabase();
    if (!supabase) {
      return Response.json({ error: 'Database not configured' }, { status: 500 });
    }

    const { type, id, status, commission_tier } = await request.json();

    if (!type || !id) {
      return Response.json({ error: 'Type and ID required' }, { status: 400 });
    }

    if (type === 'vendor') {
      const updates = {};
      if (status) updates.status = status;
      if (commission_tier) updates.commission_tier = commission_tier;

      const { data: vendor, error } = await supabase
        .from('vendors')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return Response.json({ error: error.message }, { status: 500 });
      }

      return Response.json({
        success: true,
        vendor: { ...vendor, password: undefined },
      });
    }

    if (type === 'product') {
      const { data: product, error } = await supabase
        .from('vendor_products')
        .update({ status })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return Response.json({ error: error.message }, { status: 500 });
      }

      return Response.json({ success: true, product });
    }

    return Response.json({ error: 'Invalid type' }, { status: 400 });

  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
