import { getAuthUser } from '@/lib/auth';
import { getUsageStats } from '@/lib/usage-tracking';

export const dynamic = 'force-dynamic';

// GET - Get usage stats for current user
export async function GET(request) {
  const user = await getAuthUser(request);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  try {
    const stats = await getUsageStats(user.id);
    return new Response(JSON.stringify(stats), { status: 200 });
  } catch (err) {
    console.error('Failed to get usage stats:', err);
    return new Response(JSON.stringify({ error: 'Failed to get usage stats' }), { status: 500 });
  }
}
