import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET() {
  let inviteOnly = process.env.INVITE_ONLY === 'true';

  try {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
    if (url && key) {
      const supabase = createClient(url, key);
      const { data } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'invite_only')
        .maybeSingle();
      if (data) inviteOnly = data.value === 'true';
    }
  } catch {
    // Table may not exist — use env var default
  }

  return Response.json({ invite_only: inviteOnly });
}
