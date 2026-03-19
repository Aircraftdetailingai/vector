import { createClient } from '@supabase/supabase-js';
import { getAuthUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

// Extract place/CID from various Google Business Profile URL formats
function extractGoogleId(url) {
  if (!url) return null;
  // https://maps.google.com/?cid=XXXXXXXXX
  const cidMatch = url.match(/cid=(\d+)/);
  if (cidMatch) return { type: 'cid', id: cidMatch[1] };
  // https://www.google.com/maps/place/.../@lat,lng,.../data=...!1s0x...!...
  const placeMatch = url.match(/place\/([^/@]+)/);
  if (placeMatch) return { type: 'place', id: decodeURIComponent(placeMatch[1]) };
  // https://g.page/business-name
  const gpageMatch = url.match(/g\.page\/([^/?]+)/);
  if (gpageMatch) return { type: 'gpage', id: gpageMatch[1] };
  // Generic maps URL
  return { type: 'url', id: url };
}

// Fetch Google Business Profile page and extract review data
async function scrapeGoogleReviews(googleUrl) {
  // Use Google Maps place details via the page itself
  // We'll try fetching the page and extracting structured data
  try {
    const res = await fetch(googleUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
    });

    if (!res.ok) {
      return { error: `Failed to fetch Google page: ${res.status}` };
    }

    const html = await res.text();

    // Extract JSON-LD structured data
    const jsonLdMatches = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g);
    let businessData = null;

    if (jsonLdMatches) {
      for (const match of jsonLdMatches) {
        try {
          const json = match.replace(/<script type="application\/ld\+json">/, '').replace(/<\/script>/, '');
          const parsed = JSON.parse(json);
          if (parsed['@type'] === 'LocalBusiness' || parsed.aggregateRating || parsed.review) {
            businessData = parsed;
            break;
          }
        } catch {}
      }
    }

    // Try to extract from meta tags and page content as fallback
    const titleMatch = html.match(/<meta property="og:title" content="([^"]+)"/);
    const ratingMatch = html.match(/(\d+\.?\d*)\s*(?:star|★)/i) || html.match(/aria-label="(\d+\.?\d*)\s*stars?"/i);
    const reviewCountMatch = html.match(/(\d+)\s*(?:reviews?|Google reviews?)/i);

    // Extract individual reviews from page content
    const reviews = [];

    if (businessData?.review) {
      const reviewList = Array.isArray(businessData.review) ? businessData.review : [businessData.review];
      for (const r of reviewList) {
        reviews.push({
          reviewer_name: r.author?.name || r.author || 'Google User',
          rating: parseInt(r.reviewRating?.ratingValue) || 5,
          review_text: r.reviewBody || r.description || '',
          review_date: r.datePublished || '',
          google_review_id: `gr_${Buffer.from((r.author?.name || '') + (r.datePublished || '') + (r.reviewBody || '').slice(0, 50)).toString('base64').slice(0, 40)}`,
        });
      }
    }

    // If no structured data, try regex patterns for review blocks
    if (reviews.length === 0) {
      // Look for review patterns in the HTML
      const reviewBlocks = html.match(/class="[^"]*review[^"]*"[\s\S]*?(?=class="[^"]*review[^"]*"|$)/gi);
      if (reviewBlocks) {
        for (const block of reviewBlocks.slice(0, 20)) {
          const nameMatch = block.match(/aria-label="([^"]+)"/);
          const starMatch = block.match(/(\d)\s*star/i);
          const textMatch = block.match(/<span[^>]*>([^<]{20,})<\/span>/);
          if (nameMatch || starMatch) {
            reviews.push({
              reviewer_name: nameMatch?.[1] || 'Google User',
              rating: parseInt(starMatch?.[1]) || 5,
              review_text: textMatch?.[1] || '',
              review_date: '',
              google_review_id: `gr_${Buffer.from((nameMatch?.[1] || '') + (textMatch?.[1] || '').slice(0, 50)).toString('base64').slice(0, 40)}`,
            });
          }
        }
      }
    }

    return {
      business_name: businessData?.name || titleMatch?.[1] || null,
      overall_rating: businessData?.aggregateRating?.ratingValue
        ? parseFloat(businessData.aggregateRating.ratingValue)
        : ratingMatch ? parseFloat(ratingMatch[1]) : null,
      total_reviews: businessData?.aggregateRating?.reviewCount
        ? parseInt(businessData.aggregateRating.reviewCount)
        : reviewCountMatch ? parseInt(reviewCountMatch[1]) : null,
      reviews,
    };
  } catch (err) {
    return { error: `Scrape failed: ${err.message}` };
  }
}

// POST — import/sync Google reviews
export async function POST(request) {
  const user = await getAuthUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = getSupabase();
  if (!supabase) return Response.json({ error: 'DB not configured' }, { status: 500 });

  const { google_url } = await request.json();

  if (!google_url) {
    return Response.json({ error: 'Google Business Profile URL is required' }, { status: 400 });
  }

  // Verify URL looks like a Google Business URL
  if (!google_url.includes('google.com') && !google_url.includes('g.page') && !google_url.includes('goo.gl')) {
    return Response.json({ error: 'Invalid Google Business Profile URL' }, { status: 400 });
  }

  const result = await scrapeGoogleReviews(google_url);

  if (result.error) {
    return Response.json({ error: result.error }, { status: 400 });
  }

  // Upsert reviews into google_reviews table
  let imported = 0;
  for (const review of result.reviews) {
    const { error } = await supabase
      .from('google_reviews')
      .upsert({
        detailer_id: user.id,
        reviewer_name: review.reviewer_name,
        rating: review.rating,
        review_text: review.review_text,
        review_date: review.review_date,
        google_review_id: review.google_review_id,
        imported_at: new Date().toISOString(),
      }, { onConflict: 'detailer_id,google_review_id' });

    if (!error) imported++;
  }

  // Update last synced timestamp
  await supabase
    .from('detailers')
    .update({ google_reviews_last_synced: new Date().toISOString() })
    .eq('id', user.id);

  return Response.json({
    success: true,
    business_name: result.business_name,
    overall_rating: result.overall_rating,
    total_reviews: result.total_reviews,
    imported_count: imported,
    reviews_found: result.reviews.length,
  });
}

// GET — fetch stored Google reviews for current user
export async function GET(request) {
  const user = await getAuthUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = getSupabase();
  if (!supabase) return Response.json({ error: 'DB not configured' }, { status: 500 });

  const { data: reviews, error } = await supabase
    .from('google_reviews')
    .select('*')
    .eq('detailer_id', user.id)
    .order('imported_at', { ascending: false });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  // Get detailer's last sync time
  const { data: detailer } = await supabase
    .from('detailers')
    .select('google_business_url, google_reviews_last_synced')
    .eq('id', user.id)
    .single();

  const ratings = (reviews || []).map(r => r.rating).filter(Boolean);
  const avgRating = ratings.length > 0
    ? parseFloat((ratings.reduce((s, r) => s + r, 0) / ratings.length).toFixed(1))
    : 0;

  return Response.json({
    reviews: reviews || [],
    stats: {
      total: ratings.length,
      avgRating,
    },
    google_business_url: detailer?.google_business_url || null,
    last_synced: detailer?.google_reviews_last_synced || null,
  });
}
