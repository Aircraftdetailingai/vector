import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

/**
 * Returns the current signup mode.
 * Priority: DB app_settings override > INVITE_ONLY env var > default false
 */
export async function GET() {
  // Default from env var (false if not set)
  let inviteOnly = process.env.INVITE_ONLY === 'true';

  // Check DB override
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'invite_only')
        .maybeSingle();

      if (data) {
        inviteOnly = data.value === 'true';
      }
    } catch {
      // Table may not exist yet — fall back to env var
    }
  }

  return Response.json({ invite_only: inviteOnly });
}
