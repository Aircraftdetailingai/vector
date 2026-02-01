import { createClient } from '@supabase/supabase-js';
import { getVendorUser } from '@/lib/vendorAuth';

export const dynamic = 'force-dynamic';

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

const COMMISSION_RATES = {
  basic: 0.10,   // 10% to Vector
  pro: 0.25,     // 25% to Vector
  partner: 0.60, // 60% to Vector
};

// GET - Get vendor dashboard data
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

    // Get vendor info
    const { data: vendorData } = await supabase
      .from('vendors')
      .select('*')
      .eq('id', vendor.id)
      .single();

    // Get products
    const { data: products } = await supabase
      .from('vendor_products')
      .select('*')
      .eq('vendor_id', vendor.id);

    // Get orders
    const { data: orders } = await supabase
      .from('vendor_orders')
      .select('*')
      .eq('vendor_id', vendor.id)
      .order('created_at', { ascending: false });

    // Calculate stats
    const totalProducts = products?.length || 0;
    const activeProducts = products?.filter(p => p.status === 'active').length || 0;
    const pendingProducts = products?.filter(p => p.status === 'pending').length || 0;

    const totalSales = orders?.reduce((sum, o) => sum + (o.total || 0), 0) || 0;
    const commissionRate = COMMISSION_RATES[vendorData?.commission_tier] || 0.10;
    const vendorEarnings = totalSales * (1 - commissionRate);
    const commissionPaid = totalSales * commissionRate;

    const pendingOrders = orders?.filter(o => o.status === 'pending').length || 0;
    const totalOrders = orders?.length || 0;

    const totalViews = products?.reduce((sum, p) => sum + (p.views || 0), 0) || 0;
    const totalClicks = products?.reduce((sum, p) => sum + (p.clicks || 0), 0) || 0;

    // Top products by sales
    const topProducts = [...(products || [])]
      .sort((a, b) => (b.sales || 0) - (a.sales || 0))
      .slice(0, 5);

    // Recent orders
    const recentOrders = (orders || []).slice(0, 10);

    // Get payout balance
    const { data: payouts } = await supabase
      .from('vendor_payouts')
      .select('amount')
      .eq('vendor_id', vendor.id)
      .eq('status', 'completed');

    const totalPaidOut = payouts?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
    const currentBalance = vendorEarnings - totalPaidOut;

    return Response.json({
      vendor: {
        id: vendorData?.id,
        company_name: vendorData?.company_name,
        email: vendorData?.email,
        commission_tier: vendorData?.commission_tier || 'basic',
        status: vendorData?.status,
        logo: vendorData?.logo,
      },
      stats: {
        totalProducts,
        activeProducts,
        pendingProducts,
        totalSales,
        vendorEarnings,
        commissionPaid,
        commissionRate: commissionRate * 100,
        pendingOrders,
        totalOrders,
        totalViews,
        totalClicks,
        conversionRate: totalClicks > 0 ? ((orders?.length || 0) / totalClicks * 100).toFixed(1) : 0,
        currentBalance,
        totalPaidOut,
      },
      topProducts,
      recentOrders,
      tierBenefits: getTierBenefits(vendorData?.commission_tier || 'basic'),
    });

  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

function getTierBenefits(tier) {
  const tiers = {
    basic: {
      name: 'Basic',
      commission: 10,
      benefits: [
        'Product listing in catalog',
        'Basic sales stats',
        'Standard placement',
      ],
    },
    pro: {
      name: 'Pro',
      commission: 25,
      benefits: [
        'Featured badge on products',
        'Full analytics dashboard',
        'Monthly email feature to detailers',
        'Priority in search results',
      ],
    },
    partner: {
      name: 'Partner',
      commission: 60,
      benefits: [
        'Category exclusivity option',
        'Homepage featured product',
        'Co-branded email campaigns',
        'API access for inventory sync',
        'Dedicated account manager',
        'Bonus points on products for detailers',
      ],
    },
  };
  return tiers[tier] || tiers.basic;
}
