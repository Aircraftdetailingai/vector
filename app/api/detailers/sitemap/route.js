import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

function toSlug(s) {
  return (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// Returns minimal list of all listed detailers for sitemap generation
export async function GET() {
  const supabase = getSupabase();
  if (!supabase) return Response.json({ detailers: [] }, { status: 500 });

  const { data, error } = await supabase
    .from('detailers')
    .select('id, company, slug, updated_at')
    .eq('listed_in_directory', true)
    .eq('status', 'active');

  // If slug column doesn't exist, retry without it
  let rows = data;
  if (error && error.message?.includes('slug')) {
    const fallback = await supabase
      .from('detailers')
      .select('id, company, updated_at')
      .eq('listed_in_directory', true)
      .eq('status', 'active');
    rows = fallback.data;
  }

  const detailers = (rows || []).map(d => ({
    slug: d.slug || toSlug(d.company) || d.id,
    updated_at: d.updated_at,
  }));

  return Response.json({ detailers }, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1800',
    },
  });
}
