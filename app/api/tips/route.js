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

// Business tips database
const BUSINESS_TIPS = [
  {
    id: 1,
    category: 'pricing',
    title: 'Review Your Pricing Quarterly',
    content: 'Set a calendar reminder to review your pricing every 3 months. Material costs, fuel prices, and demand all change. A 5% increase on all quotes can significantly boost your annual revenue.',
    actionable: true,
    action: 'Review your service prices now',
    points: 20,
  },
  {
    id: 2,
    category: 'efficiency',
    title: 'Track Your Product Usage',
    content: 'Log the products you use on each job. Over time, you\'ll see exactly how much each detail costs you in materials - helping you price more accurately and identify waste.',
    actionable: true,
    action: 'Add your products to the inventory',
    actionLink: '/products',
    points: 20,
  },
  {
    id: 3,
    category: 'marketing',
    title: 'Before & After Photos',
    content: 'Take before and after photos of every job. These are gold for your social media and website. Customers love seeing real results.',
    actionable: false,
    points: 20,
  },
  {
    id: 4,
    category: 'customer_service',
    title: 'Follow Up After Every Job',
    content: 'Send a quick thank you message 24 hours after completing a job. Ask if they\'re happy and if there\'s anything else you can help with. This simple touch leads to repeat business.',
    actionable: false,
    points: 20,
  },
  {
    id: 5,
    category: 'operations',
    title: 'Build Your Product Inventory',
    content: 'Keep track of all your detailing products - polish, compound, ceramic coatings, cleaners. Knowing your exact costs helps you price jobs profitably.',
    actionable: true,
    action: 'Set up your product inventory',
    actionLink: '/products',
    points: 20,
  },
  {
    id: 6,
    category: 'growth',
    title: 'Ask for Referrals',
    content: 'Happy customers are your best marketers. After a successful job, ask if they know any other aircraft owners who might need your services. Consider a referral discount.',
    actionable: false,
    points: 20,
  },
  {
    id: 7,
    category: 'pricing',
    title: 'Charge for Travel Time',
    content: 'If you travel to hangars, factor in your travel time and fuel costs. A simple mileage charge ensures you\'re not losing money on distant jobs.',
    actionable: false,
    points: 20,
  },
  {
    id: 8,
    category: 'efficiency',
    title: 'Batch Similar Jobs',
    content: 'When possible, schedule similar aircraft types back-to-back. You\'ll be faster and more efficient when you\'re in the zone with one type of work.',
    actionable: false,
    points: 20,
  },
  {
    id: 9,
    category: 'profitability',
    title: 'Know Your Hourly Rate',
    content: 'Calculate your true hourly rate: (Quote - Materials - Travel) / Hours Worked. Track this for every job to see which services are most profitable.',
    actionable: true,
    action: 'Set your labor rate in settings',
    actionLink: '/settings',
    points: 20,
  },
  {
    id: 10,
    category: 'customer_service',
    title: 'Send Quotes Within 24 Hours',
    content: 'Speed wins. Customers appreciate quick responses. Aim to send quotes within 24 hours of inquiry - the faster you respond, the more likely you\'ll win the job.',
    actionable: false,
    points: 20,
  },
  {
    id: 11,
    category: 'pricing',
    title: '4-Week Billing = 8% More Revenue',
    content: 'Bill monthly customers every 4 weeks instead of monthly. 4 weeks = 13 billing cycles/year vs 12 months = 8% more annual revenue. Most customers won\'t notice the difference.',
    actionable: false,
    points: 20,
    proTip: true,
  },
  {
    id: 12,
    category: 'growth',
    title: 'Offer Maintenance Plans',
    content: 'Recurring customers are the foundation of a stable business. Offer a monthly or 4-week maintenance wash plan at a slight discount. Predictable income beats one-off jobs.',
    actionable: false,
    points: 20,
  },
  {
    id: 13,
    category: 'profitability',
    title: 'Upsell Ceramic Coating',
    content: 'Ceramic coating has the highest profit margin of any service. After every exterior detail, mention how ceramic coating can protect their investment for 2+ years.',
    actionable: false,
    points: 20,
  },
  {
    id: 14,
    category: 'operations',
    title: 'Document Everything',
    content: 'Take photos before you start every job. This protects you from false damage claims and helps you show customers exactly what you fixed.',
    actionable: false,
    points: 20,
  },
];

// GET - Get today's tip or a specific tip
export async function GET(request) {
  const user = await getUser(request);
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabase();
  const { searchParams } = new URL(request.url);
  const tipId = searchParams.get('id');

  // Get user's completed tips
  const { data: completedTips } = await supabase
    .from('points_history')
    .select('metadata')
    .eq('detailer_id', user.id)
    .eq('reason', 'complete_tip_task');

  const completedTipIds = (completedTips || [])
    .map(t => t.metadata?.tipId)
    .filter(Boolean);

  if (tipId) {
    const tip = BUSINESS_TIPS.find(t => t.id === parseInt(tipId));
    if (!tip) {
      return Response.json({ error: 'Tip not found' }, { status: 404 });
    }
    return Response.json({
      tip,
      completed: completedTipIds.includes(tip.id),
    });
  }

  // Get today's tip based on day of year
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
  const tipIndex = dayOfYear % BUSINESS_TIPS.length;
  const todaysTip = BUSINESS_TIPS[tipIndex];

  // Get all tips with completion status
  const allTips = BUSINESS_TIPS.map(tip => ({
    ...tip,
    completed: completedTipIds.includes(tip.id),
  }));

  return Response.json({
    todaysTip: {
      ...todaysTip,
      completed: completedTipIds.includes(todaysTip.id),
    },
    allTips,
    completedCount: completedTipIds.length,
    totalTips: BUSINESS_TIPS.length,
  });
}

// POST - Mark tip as completed
export async function POST(request) {
  const user = await getUser(request);
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabase();
  const { tipId } = await request.json();

  const tip = BUSINESS_TIPS.find(t => t.id === tipId);
  if (!tip) {
    return Response.json({ error: 'Tip not found' }, { status: 404 });
  }

  // Check if already completed
  const { data: existing } = await supabase
    .from('points_history')
    .select('id')
    .eq('detailer_id', user.id)
    .eq('reason', 'complete_tip_task')
    .contains('metadata', { tipId })
    .limit(1);

  if (existing?.length > 0) {
    return Response.json({ error: 'Tip already completed', points: 0 });
  }

  // Award points
  const points = tip.points || 20;

  await supabase
    .from('points_history')
    .insert({
      detailer_id: user.id,
      points,
      reason: 'complete_tip_task',
      metadata: { tipId, tipTitle: tip.title },
    });

  // Update totals
  const { data: detailer } = await supabase
    .from('detailers')
    .select('total_points, lifetime_points')
    .eq('id', user.id)
    .single();

  await supabase
    .from('detailers')
    .update({
      total_points: (detailer?.total_points || 0) + points,
      lifetime_points: (detailer?.lifetime_points || 0) + points,
    })
    .eq('id', user.id);

  return Response.json({
    success: true,
    points,
    tipId,
  });
}
