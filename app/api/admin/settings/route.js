import { createClient } from '@supabase/supabase-js';
import { getAuthUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
  );
}

export async function GET(request) {
  const user = await getAuthUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (!user.is_admin) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const supabase = getSupabase();

  // Fetch all app settings
  let settings = {};
  try {
    const { data } = await supabase
      .from('app_settings')
      .select('key, value');
    if (data) {
      data.forEach(row => { settings[row.key] = row.value; });
    }
  } catch {
    // Table may not exist yet
  }

  // Merge with env var defaults
  const inviteOnly = settings.invite_only !== undefined
    ? settings.invite_only === 'true'
    : process.env.INVITE_ONLY === 'true';

  return Response.json({
    invite_only: inviteOnly,
  });
}

export async function POST(request) {
  const user = await getAuthUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (!user.is_admin) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json();
  const supabase = getSupabase();

  if (body.invite_only !== undefined) {
    const value = body.invite_only ? 'true' : 'false';
    try {
      await supabase
        .from('app_settings')
        .upsert({ key: 'invite_only', value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
    } catch {
      // Table may not exist — try insert
      try {
        await supabase
          .from('app_settings')
          .insert({ key: 'invite_only', value });
      } catch (e) {
        return Response.json({ error: 'Failed to save setting' }, { status: 500 });
      }
    }
  }

  return Response.json({ success: true });
}
