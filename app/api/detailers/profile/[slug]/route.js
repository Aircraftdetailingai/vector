import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

const PROFILE_FIELDS = [
  'id', 'company', 'name', 'logo_url', 'plan', 'home_airport',
  'directory_description', 'certifications', 'verified_finish',
  'insurance_verified', 'insurance_insurer', 'insurance_expiry_date',
  'has_online_booking', 'stripe_account_id', 'stripe_publishable_key',
  'website_url', 'phone', 'country', 'theme_primary',
].join(', ');

// Slug → detailer profile lookup
// Tries: slug column → company-derived slug → company name match
async function findDetailer(supabase, slug) {
  // Try slug column first (column-not-found graceful)
  const { data: slugRow, error: slugErr } = await supabase
    .from('detailers')
    .select(PROFILE_FIELDS)
    .eq('slug', slug)
    .eq('listed_in_directory', true)
    .eq('status', 'active')
    .maybeSingle();

  if (!slugErr && slugRow) return slugRow;

  // Try company name match: "shiny-jets" → "shiny jets"
  const normalized = slug.replace(/-/g, ' ');
  const { data: nameMatch } = await supabase
    .from('detailers')
    .select(PROFILE_FIELDS)
    .ilike('company', normalized)
    .eq('listed_in_directory', true)
    .eq('status', 'active')
    .maybeSingle();

  if (nameMatch) return nameMatch;

  // Wildcard fallback
  const { data: wildcard } = await supabase
    .from('detailers')
    .select(PROFILE_FIELDS)
    .ilike('company', `%${normalized}%`)
    .eq('listed_in_directory', true)
    .eq('status', 'active')
    .limit(1);

  return wildcard?.[0] || null;
}

export async function GET(request, { params }) {
  const { slug } = await params;
  if (!slug) return Response.json({ error: 'Slug required' }, { status: 400 });

  const supabase = getSupabase();
  if (!supabase) return Response.json({ error: 'Database not configured' }, { status: 500 });

  const detailer = await findDetailer(supabase, slug);
  if (!detailer) {
    return Response.json({ error: 'Detailer not found' }, { status: 404 });
  }

  // Fetch services for this detailer
  const { data: services } = await supabase
    .from('services')
    .select('name, description, hourly_rate')
    .eq('detailer_id', detailer.id)
    .eq('is_active', true)
    .order('name');

  // Fetch review stats
  const [vectorResult, googleResult] = await Promise.all([
    supabase.from('feedback').select('rating').eq('detailer_id', detailer.id).eq('is_public', true),
    supabase.from('google_reviews').select('rating').eq('detailer_id', detailer.id),
  ]);

  const vectorReviews = vectorResult.data || [];
  const googleReviews = googleResult.data || [];
  const totalCount = vectorReviews.length + googleReviews.length;
  const totalSum = [...vectorReviews, ...googleReviews].reduce((s, r) => s + (r.rating || 0), 0);
  const avgRating = totalCount > 0 ? parseFloat((totalSum / totalCount).toFixed(1)) : null;

  return Response.json({
    detailer: {
      id: detailer.id,
      company: detailer.company,
      name: detailer.name,
      logo_url: detailer.logo_url,
      plan: detailer.plan,
      home_airport: detailer.home_airport,
      country: detailer.country,
      description: detailer.directory_description,
      certifications: detailer.certifications || [],
      verified_finish: !!detailer.verified_finish,
      insured: !!detailer.insurance_verified,
      insurer: detailer.insurance_insurer,
      online_booking: !!(detailer.stripe_account_id || detailer.stripe_publishable_key || detailer.has_online_booking),
      website_url: detailer.website_url,
      phone: detailer.phone,
      theme_primary: detailer.theme_primary || '#0081b8',
      services: (services || []).map(s => ({ name: s.name, description: s.description })),
      review_count: totalCount,
      avg_rating: avgRating,
      slug,
    },
  }, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
    },
  });
}
