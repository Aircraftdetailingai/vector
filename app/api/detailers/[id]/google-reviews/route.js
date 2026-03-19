import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

// GET — public endpoint: fetch Google reviews for a detailer
export async function GET(request, { params }) {
  const { id } = params;
  const supabase = getSupabase();
  if (!supabase) return Response.json({ error: 'DB not configured' }, { status: 500 });

  const { data: reviews } = await supabase
    .from('google_reviews')
    .select('id, reviewer_name, rating, review_text, review_date, imported_at')
    .eq('detailer_id', id)
    .order('imported_at', { ascending: false });

  const { data: detailer } = await supabase
    .from('detailers')
    .select('google_business_url, google_reviews_last_synced')
    .eq('id', id)
    .single();

  const ratings = (reviews || []).map(r => r.rating).filter(Boolean);
  const avgRating = ratings.length > 0
    ? parseFloat((ratings.reduce((s, r) => s + r, 0) / ratings.length).toFixed(1))
    : 0;

  return Response.json({
    reviews: reviews || [],
    stats: { total: ratings.length, avgRating },
    google_business_url: detailer?.google_business_url || null,
    last_synced: detailer?.google_reviews_last_synced || null,
  });
}
