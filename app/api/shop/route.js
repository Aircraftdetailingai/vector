import { createClient } from '@supabase/supabase-js';
import { getAuthUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

const PRODUCT_CATEGORIES = [
  { key: 'polish', name: 'Polish & Compound' },
  { key: 'ceramic', name: 'Ceramic Coatings' },
  { key: 'wax', name: 'Wax & Sealant' },
  { key: 'cleaner', name: 'Cleaners' },
  { key: 'interior', name: 'Interior Care' },
  { key: 'leather', name: 'Leather Care' },
  { key: 'microfiber', name: 'Microfiber & Towels' },
  { key: 'pads', name: 'Pads & Applicators' },
  { key: 'tools', name: 'Tools' },
  { key: 'machines', name: 'Machines & Polishers' },
  { key: 'kits', name: 'Kits & Bundles' },
  { key: 'accessories', name: 'Accessories' },
];

// GET - Browse products
export async function GET(request) {
  try {
    const supabase = getSupabase();
    if (!supabase) {
      return Response.json({ error: 'Database not configured' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const featured = searchParams.get('featured');
    const vendorId = searchParams.get('vendor');

    let query = supabase
      .from('vendor_products')
      .select(`
        *,
        vendors (id, company_name, logo, commission_tier)
      `)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (category) {
      query = query.eq('category', category);
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    if (featured === 'true') {
      // Featured products from pro/partner vendors
      query = query.in('vendors.commission_tier', ['pro', 'partner']);
    }

    if (vendorId) {
      query = query.eq('vendor_id', vendorId);
    }

    const { data: products, error } = await query.limit(100);

    if (error) {
      if (error.code === '42P01') {
        return Response.json({ products: [], categories: PRODUCT_CATEGORIES });
      }
      return Response.json({ error: error.message }, { status: 500 });
    }

    // Track views if user is logged in
    const user = await getAuthUser(request);
    if (user && products?.length > 0) {
      // Increment view counts (fire and forget)
      const productIds = products.map(p => p.id);
      supabase
        .from('vendor_products')
        .update({ views: supabase.raw('views + 1') })
        .in('id', productIds)
        .then(() => {});
    }

    return Response.json({
      products: products || [],
      categories: PRODUCT_CATEGORIES,
    });

  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
