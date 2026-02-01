import { createClient } from '@supabase/supabase-js';
import { getAuthUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

// Available rewards
const REWARDS = [
  {
    id: 'featured_1w',
    name: 'Featured Listing - 1 Week',
    description: 'Get your business featured at the top of search results for 1 week',
    points: 500,
    category: 'visibility',
  },
  {
    id: 'pro_month',
    name: 'Free Month of Pro',
    description: 'Upgrade to Pro plan for one month - includes SMS alerts and more',
    points: 1000,
    category: 'subscription',
  },
  {
    id: 'product_sample',
    name: 'Free Product Sample',
    description: 'Receive a sample of premium detailing products',
    points: 2500,
    category: 'products',
  },
  {
    id: 'coaching_call',
    name: '1-on-1 Business Coaching',
    description: '30-minute call with a detailing business expert',
    points: 5000,
    category: 'coaching',
  },
  {
    id: 'premium_listing',
    name: 'Premium Listing - 1 Month',
    description: 'Premium badge and top placement for 30 days',
    points: 3000,
    category: 'visibility',
  },
  {
    id: 'marketing_review',
    name: 'Marketing Review',
    description: 'Get your quotes and marketing materials reviewed by experts',
    points: 2000,
    category: 'coaching',
  },
];

// GET - Get rewards and redemption history
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

    // Get user's points
    const { data: detailer } = await supabase
      .from('detailers')
      .select('total_points, lifetime_points')
      .eq('id', user.id)
      .single();

    // Get redemption history
    const { data: redemptions } = await supabase
      .from('reward_redemptions')
      .select('*')
      .eq('detailer_id', user.id)
      .order('created_at', { ascending: false });

    return Response.json({
      rewards: REWARDS,
      points: {
        available: detailer?.total_points || 0,
        lifetime: detailer?.lifetime_points || 0,
      },
      redemptions: redemptions || [],
    });

  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

// POST - Redeem a reward
export async function POST(request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabase();
    if (!supabase) {
      return Response.json({ error: 'Database not configured' }, { status: 500 });
    }

    const { rewardId } = await request.json();

    // Find reward
    const reward = REWARDS.find(r => r.id === rewardId);
    if (!reward) {
      return Response.json({ error: 'Reward not found' }, { status: 404 });
    }

    // Check user has enough points
    const { data: detailer } = await supabase
      .from('detailers')
      .select('total_points, email, business_name')
      .eq('id', user.id)
      .single();

    if (!detailer || detailer.total_points < reward.points) {
      return Response.json({
        error: 'Not enough points',
        required: reward.points,
        available: detailer?.total_points || 0,
      }, { status: 400 });
    }

    // Create redemption record
    const { data: redemption, error: redemptionError } = await supabase
      .from('reward_redemptions')
      .insert({
        detailer_id: user.id,
        reward_id: reward.id,
        reward_name: reward.name,
        points_spent: reward.points,
        status: 'pending',
        metadata: {
          email: detailer.email,
          business_name: detailer.business_name,
        },
      })
      .select()
      .single();

    if (redemptionError) {
      // Table might not exist
      if (redemptionError.code === '42P01') {
        return Response.json({
          error: 'Rewards table not configured. Please run database migration.',
        }, { status: 500 });
      }
      return Response.json({ error: redemptionError.message }, { status: 500 });
    }

    // Deduct points
    await supabase
      .from('detailers')
      .update({
        total_points: detailer.total_points - reward.points,
      })
      .eq('id', user.id);

    // Log in points history
    await supabase
      .from('points_history')
      .insert({
        detailer_id: user.id,
        points: -reward.points,
        reason: 'redeem_reward',
        metadata: {
          rewardId: reward.id,
          rewardName: reward.name,
          redemptionId: redemption.id,
        },
      });

    return Response.json({
      success: true,
      redemption,
      newBalance: detailer.total_points - reward.points,
    });

  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
