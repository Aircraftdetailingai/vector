import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    global: { fetch: (u, opts) => fetch(u, { ...opts, cache: 'no-store' }) },
  });
}

// POST — customer-facing terms acceptance for an invoice. Public route
// authorized by share_link match (the same pattern the existing
// /api/invoices/[id]/checkout uses). Stamps the invoice with the acceptance
// timestamp + the platform-terms version id the customer agreed to. The
// version id is verified against the currently-active row server-side so a
// stale client can't paper over a version bump.
export async function POST(request, { params }) {
  try {
    const supabase = getSupabase();
    if (!supabase) return Response.json({ error: 'Database not configured' }, { status: 500 });

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { share_link, platform_terms_version_id } = body || {};

    if (!share_link) {
      return Response.json({ error: 'share_link is required' }, { status: 400 });
    }

    // Verify the invoice + share_link pair.
    const { data: invoice, error: invErr } = await supabase
      .from('invoices')
      .select('id, share_link')
      .eq('id', id)
      .eq('share_link', share_link)
      .single();
    if (invErr || !invoice) {
      return Response.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Look up the currently-active platform terms version. If the client
    // sent a different id, prefer the active one — never trust the client.
    const { data: active } = await supabase
      .from('platform_legal_versions')
      .select('id, version')
      .eq('is_active', true)
      .order('effective_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    const versionId = active?.id || platform_terms_version_id || null;

    const { error: updateErr } = await supabase
      .from('invoices')
      .update({
        customer_terms_accepted_at: new Date().toISOString(),
        customer_terms_version_id: versionId,
      })
      .eq('id', id);
    if (updateErr) {
      console.error('[invoices/accept-terms] update failed:', updateErr.message);
      return Response.json({ error: 'Failed to record terms acceptance' }, { status: 500 });
    }

    return Response.json({ success: true, customer_terms_version_id: versionId });
  } catch (err) {
    console.error('[invoices/accept-terms] error:', err?.message || err);
    return Response.json({ error: 'Failed to record terms acceptance' }, { status: 500 });
  }
}
