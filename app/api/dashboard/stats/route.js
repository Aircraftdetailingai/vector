import { createClient } from '@supabase/supabase-js';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

async function getUser(request) {
  try {
    const cookieStore = await cookies();
    const authCookie = cookieStore.get('auth_token')?.value;
    if (authCookie) {
      const user = await verifyToken(authCookie);
      if (user) return user;
    }
  } catch (e) {}
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return await verifyToken(authHeader.slice(7));
  }
  return null;
}

export async function GET(request) {
  try {
    const user = await getUser(request);
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabase();
    if (!supabase) {
      return Response.json({ error: 'Database not configured' }, { status: 500 });
    }

    // Get detailer info
    const { data: detailer } = await supabase
      .from('detailers')
      .select('total_points, lifetime_points, tips_enabled')
      .eq('id', user.id)
      .single();

    // Time ranges
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
    const monthAgo = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();

    // Fetch all data in parallel for speed
    const [weekQuotesRes, weekPointsRes, monthQuotesRes, allQuotesRes, pendingRes] = await Promise.all([
      // This week's quotes
      supabase
        .from('quotes')
        .select('id, total_price, status, paid_at')
        .eq('detailer_id', user.id)
        .gte('created_at', weekAgo),

      // This week's points
      supabase
        .from('points_history')
        .select('points')
        .eq('detailer_id', user.id)
        .gte('created_at', weekAgo),

      // This month's quotes (from start of month)
      supabase
        .from('quotes')
        .select('id, total_price, status')
        .eq('detailer_id', user.id)
        .gte('created_at', startOfMonth),

      // All time stats
      supabase
        .from('quotes')
        .select('id, total_price, status')
        .eq('detailer_id', user.id),

      // Pending quotes (sent but not accepted/paid)
      supabase
        .from('quotes')
        .select('id')
        .eq('detailer_id', user.id)
        .in('status', ['sent', 'viewed']),
    ]);

    const weekQuotes = weekQuotesRes.data || [];
    const weekPoints = weekPointsRes.data || [];
    const monthQuotes = monthQuotesRes.data || [];
    const allQuotes = allQuotesRes.data || [];
    const pendingQuotes = pendingRes.data || [];

    // Calculate stats
    const weekPaidQuotes = weekQuotes.filter(q => q.status === 'paid' || q.status === 'completed');
    const monthPaidQuotes = monthQuotes.filter(q => q.status === 'paid' || q.status === 'completed');
    const monthCompletedQuotes = monthQuotes.filter(q => q.status === 'completed');
    const allPaidQuotes = allQuotes.filter(q => q.status === 'paid' || q.status === 'completed');

    const weekBooked = weekPaidQuotes.reduce((sum, q) => sum + (parseFloat(q.total_price) || 0), 0);
    const monthBooked = monthPaidQuotes.reduce((sum, q) => sum + (parseFloat(q.total_price) || 0), 0);
    const allTimeBooked = allPaidQuotes.reduce((sum, q) => sum + (parseFloat(q.total_price) || 0), 0);

    const weekPointsTotal = weekPoints.reduce((sum, p) => sum + (p.points || 0), 0);

    // Calculate average job value
    const avgJobValue = allPaidQuotes.length > 0
      ? allTimeBooked / allPaidQuotes.length
      : 0;

    // Get today's tip
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
    const tips = [
      { id: 1, title: 'Review Your Pricing Quarterly', category: 'pricing' },
      { id: 2, title: 'Track Your Product Usage', category: 'efficiency' },
      { id: 3, title: 'Before & After Photos', category: 'marketing' },
      { id: 4, title: 'Follow Up After Every Job', category: 'customer_service' },
      { id: 5, title: 'Build Your Product Inventory', category: 'operations' },
    ];
    const todaysTip = tips[dayOfYear % tips.length];

    return Response.json({
      // Quick stats format (for dashboard quick stats bar)
      monthRevenue: monthBooked,
      monthJobs: monthCompletedQuotes.length,
      pendingQuotes: pendingQuotes.length,
      avgJobValue: avgJobValue,

      // Legacy format (for backwards compatibility)
      points: {
        total: detailer?.total_points || 0,
        lifetime: detailer?.lifetime_points || 0,
        thisWeek: weekPointsTotal,
      },
      thisWeek: {
        jobs: weekPaidQuotes.length,
        booked: weekBooked,
        quotes: weekQuotes.length,
        points: weekPointsTotal,
      },
      thisMonth: {
        jobs: monthPaidQuotes.length,
        booked: monthBooked,
        quotes: monthQuotes.length,
      },
      allTime: {
        jobs: allPaidQuotes.length,
        booked: allTimeBooked,
        quotes: allQuotes.length,
      },
      tipsEnabled: detailer?.tips_enabled,
      todaysTip: detailer?.tips_enabled ? todaysTip : null,
    });

  } catch (err) {
    console.error('Dashboard stats error:', err);
    return Response.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
