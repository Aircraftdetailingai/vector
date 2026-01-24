import { getAuthUser } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import { getUpgradeAnalysis } from '@/lib/usage-tracking';
import { getEquipmentRecommendations } from '@/lib/equipment-recommendations';

export const dynamic = 'force-dynamic';

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
  );
}

// GET - Get equipment recommendations based on user's savings potential
export async function GET(request) {
  const user = await getAuthUser(request);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const supabase = getSupabase();

  try {
    // Get user's current services
    const { data: services } = await supabase
      .from('detailer_services')
      .select('service_name, service_key')
      .eq('detailer_id', user.id)
      .eq('enabled', true);

    // Get upgrade analysis to determine savings
    const analysis = await getUpgradeAnalysis(user.id);
    const monthlySavings = analysis.savings?.netMonthlySavings || 0;

    // Get recommendations
    const recommendations = getEquipmentRecommendations(
      Math.max(monthlySavings, 50), // Show recommendations even with minimal savings
      services || []
    );

    return new Response(JSON.stringify({
      recommendations,
      monthlySavings,
      currentTier: analysis.currentTier,
    }), { status: 200 });
  } catch (err) {
    console.error('Failed to get equipment recommendations:', err);
    return new Response(JSON.stringify({ error: 'Failed to get recommendations' }), { status: 500 });
  }
}
