import { createClient } from '@supabase/supabase-js';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

function getSupabase() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY);
}

async function getUser(request) {
  const cookieStore = await cookies();
  const authCookie = cookieStore.get('auth_token')?.value;
  if (authCookie) {
    const user = await verifyToken(authCookie);
    if (user) return user;
  }
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return await verifyToken(authHeader.slice(7));
  }
  return null;
}

export async function GET(request) {
  const user = await getUser(request);
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabase();

  // Get detailer info
  const { data: detailer } = await supabase
    .from('detailers')
    .select('total_points, lifetime_points, tips_enabled')
    .eq('id', user.id)
    .single();

  // Time ranges
  const now = new Date();
  const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
  const monthAgo = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();

  // This week's stats
  const { data: weekQuotes } = await supabase
    .from('quotes')
    .select('id, total_price, status, paid_at')
    .eq('detailer_id', user.id)
    .gte('created_at', weekAgo);

  const { data: weekPoints } = await supabase
    .from('points_history')
    .select('points')
    .eq('detailer_id', user.id)
    .gte('created_at', weekAgo);

  // This month's stats
  const { data: monthQuotes } = await supabase
    .from('quotes')
    .select('id, total_price, status')
    .eq('detailer_id', user.id)
    .gte('created_at', monthAgo);

  // All time stats
  const { data: allQuotes } = await supabase
    .from('quotes')
    .select('id, total_price, status')
    .eq('detailer_id', user.id);

  // Calculate stats
  const weekPaidQuotes = weekQuotes?.filter(q => q.status === 'paid') || [];
  const monthPaidQuotes = monthQuotes?.filter(q => q.status === 'paid') || [];
  const allPaidQuotes = allQuotes?.filter(q => q.status === 'paid') || [];

  const weekBooked = weekPaidQuotes.reduce((sum, q) => sum + (q.total_price || 0), 0);
  const monthBooked = monthPaidQuotes.reduce((sum, q) => sum + (q.total_price || 0), 0);
  const allTimeBooked = allPaidQuotes.reduce((sum, q) => sum + (q.total_price || 0), 0);

  const weekPointsTotal = weekPoints?.reduce((sum, p) => sum + (p.points || 0), 0) || 0;

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
    points: {
      total: detailer?.total_points || 0,
      lifetime: detailer?.lifetime_points || 0,
      thisWeek: weekPointsTotal,
    },
    thisWeek: {
      jobs: weekPaidQuotes.length,
      booked: weekBooked,
      quotes: weekQuotes?.length || 0,
      points: weekPointsTotal,
    },
    thisMonth: {
      jobs: monthPaidQuotes.length,
      booked: monthBooked,
      quotes: monthQuotes?.length || 0,
    },
    allTime: {
      jobs: allPaidQuotes.length,
      booked: allTimeBooked,
      quotes: allQuotes?.length || 0,
    },
    tipsEnabled: detailer?.tips_enabled,
    todaysTip: detailer?.tips_enabled ? todaysTip : null,
  });
}
