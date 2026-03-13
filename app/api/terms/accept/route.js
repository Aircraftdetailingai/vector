import { createClient } from '@supabase/supabase-js';
import { getAuthUser } from '@/lib/auth';
import { TERMS_VERSION } from '@/lib/terms';

export const dynamic = 'force-dynamic';

function getSupabase() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY);
}

export async function POST(request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabase();
    const now = new Date().toISOString();

    let updates = {
      terms_accepted_version: TERMS_VERSION,
      agreed_to_terms_at: now,
    };

    const { error } = await supabase
      .from('detailers')
      .update(updates)
      .eq('id', user.id);

    // Column-stripping retry
    if (error && error.message?.includes('column')) {
      delete updates.terms_accepted_version;
      await supabase
        .from('detailers')
        .update(updates)
        .eq('id', user.id);
    }

    return Response.json({ success: true, terms_version: TERMS_VERSION });
  } catch (err) {
    console.error('Terms accept error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
