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

// Point values for different actions
const POINT_VALUES = {
  BOOKING_PER_DOLLAR: 2,
  COMPLETE_PROFILE: 50,
  FIRST_QUOTE_SENT: 25,
  FIRST_PAYMENT: 100,
  LOG_PRODUCT_USAGE: 10,
  COMPLETE_TIP_TASK: 20,
  DAILY_LOGIN: 5,
};

// GET - Get user's points and history
export async function GET(request) {
  const user = await getUser(request);
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabase();

  // Get detailer points
  const { data: detailer } = await supabase
    .from('detailers')
    .select('total_points, lifetime_points')
    .eq('id', user.id)
    .single();

  // Get points history (last 50)
  const { data: history } = await supabase
    .from('points_history')
    .select('*')
    .eq('detailer_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50);

  // Get this week's stats
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: weekStats } = await supabase
    .from('points_history')
    .select('points')
    .eq('detailer_id', user.id)
    .gte('created_at', weekAgo);

  const weekPoints = weekStats?.reduce((sum, h) => sum + (h.points || 0), 0) || 0;

  // Get this week's bookings
  const { data: weekQuotes } = await supabase
    .from('quotes')
    .select('total_price')
    .eq('detailer_id', user.id)
    .eq('status', 'paid')
    .gte('paid_at', weekAgo);

  const weekBooked = weekQuotes?.reduce((sum, q) => sum + (q.total_price || 0), 0) || 0;
  const weekJobs = weekQuotes?.length || 0;

  return Response.json({
    totalPoints: detailer?.total_points || 0,
    lifetimePoints: detailer?.lifetime_points || 0,
    history: history || [],
    weekStats: {
      points: weekPoints,
      booked: weekBooked,
      jobs: weekJobs,
    },
    pointValues: POINT_VALUES,
  });
}

// POST - Award points
export async function POST(request) {
  const user = await getUser(request);
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabase();
  const { reason, points: customPoints, metadata } = await request.json();

  // Determine points based on reason
  let points = customPoints;
  if (!points) {
    switch (reason) {
      case 'complete_profile': points = POINT_VALUES.COMPLETE_PROFILE; break;
      case 'first_quote_sent': points = POINT_VALUES.FIRST_QUOTE_SENT; break;
      case 'first_payment': points = POINT_VALUES.FIRST_PAYMENT; break;
      case 'log_product_usage': points = POINT_VALUES.LOG_PRODUCT_USAGE; break;
      case 'complete_tip_task': points = POINT_VALUES.COMPLETE_TIP_TASK; break;
      case 'daily_login': points = POINT_VALUES.DAILY_LOGIN; break;
      default: return Response.json({ error: 'Invalid reason' }, { status: 400 });
    }
  }

  // Check for duplicate milestone awards
  if (['complete_profile', 'first_quote_sent', 'first_payment'].includes(reason)) {
    const { data: existing } = await supabase
      .from('points_history')
      .select('id')
      .eq('detailer_id', user.id)
      .eq('reason', reason)
      .limit(1);

    if (existing?.length > 0) {
      return Response.json({ error: 'Already awarded', points: 0 }, { status: 200 });
    }
  }

  // Insert points history
  const { error: historyError } = await supabase
    .from('points_history')
    .insert({
      detailer_id: user.id,
      points,
      reason,
      metadata: metadata || {},
    });

  if (historyError) {
    console.error('Points history error:', historyError);
  }

  // Update detailer totals
  const { data: detailer } = await supabase
    .from('detailers')
    .select('total_points, lifetime_points')
    .eq('id', user.id)
    .single();

  const newTotal = (detailer?.total_points || 0) + points;
  const newLifetime = (detailer?.lifetime_points || 0) + points;

  await supabase
    .from('detailers')
    .update({
      total_points: newTotal,
      lifetime_points: newLifetime,
    })
    .eq('id', user.id);

  return Response.json({
    success: true,
    points,
    reason,
    newTotal,
    newLifetime,
  });
}
