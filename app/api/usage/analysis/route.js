import { getAuthUser } from '@/lib/auth';
import { getUpgradeAnalysis } from '@/lib/usage-tracking';

export const dynamic = 'force-dynamic';

// GET - Get upgrade analysis for current user
export async function GET(request) {
  const user = await getAuthUser(request);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  try {
    const analysis = await getUpgradeAnalysis(user.id);
    return new Response(JSON.stringify(analysis), { status: 200 });
  } catch (err) {
    console.error('Failed to get upgrade analysis:', err);
    return new Response(JSON.stringify({ error: 'Failed to analyze usage' }), { status: 500 });
  }
}
