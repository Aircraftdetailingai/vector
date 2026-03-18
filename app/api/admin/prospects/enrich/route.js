import { createClient } from '@supabase/supabase-js';
import { getAuthUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const ADMIN_EMAILS = [
  'brett@vectorav.ai',
  'admin@vectorav.ai',
  'brett@shinyjets.com',
];

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

async function isAdmin(request) {
  const user = await getAuthUser(request);
  if (!user) return false;
  return ADMIN_EMAILS.includes(user.email?.toLowerCase());
}

/**
 * Search Google Places for aviation businesses near an airport
 */
async function searchPlaces(query, apiKey) {
  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': 'places.displayName,places.nationalPhoneNumber,places.internationalPhoneNumber,places.websiteUri,places.formattedAddress',
    },
    body: JSON.stringify({ textQuery: query, maxResultCount: 5 }),
  });

  if (!res.ok) return [];
  const data = await res.json();
  return data.places || [];
}

/**
 * Try to extract email from a website URL
 */
async function scrapeEmail(websiteUrl) {
  try {
    const res = await fetch(websiteUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    // Simple email regex
    const match = html.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    return match ? match[0] : null;
  } catch {
    return null;
  }
}

// POST — enrich prospects with Google Places data
export async function POST(request) {
  if (!await isAdmin(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const supabase = getSupabase();
  if (!supabase) return Response.json({ error: 'DB not configured' }, { status: 500 });

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_PLACES_KEY;
  if (!apiKey) {
    return Response.json({ error: 'NEXT_PUBLIC_GOOGLE_PLACES_KEY not configured' }, { status: 500 });
  }

  const { prospect_ids } = await request.json();
  if (!prospect_ids?.length) {
    return Response.json({ error: 'No prospects selected' }, { status: 400 });
  }

  const { data: prospects, error } = await supabase
    .from('prospects')
    .select('*')
    .in('id', prospect_ids);

  if (error) return Response.json({ error: error.message }, { status: 500 });

  const results = { enriched: 0, skipped: 0 };

  for (const prospect of (prospects || [])) {
    const searchTerms = [
      prospect.airport_name ? `${prospect.airport_name} aircraft detailing` : null,
      prospect.fbo_name ? `${prospect.fbo_name} aviation` : null,
      prospect.airport_name ? `${prospect.airport_name} FBO` : null,
    ].filter(Boolean);

    let foundPhone = null;
    let foundEmail = null;
    let foundFbo = null;

    for (const term of searchTerms) {
      if (foundPhone && foundEmail) break;

      const places = await searchPlaces(term, apiKey);

      for (const place of places) {
        if (!foundPhone && place.nationalPhoneNumber) {
          foundPhone = place.nationalPhoneNumber;
        }
        if (!foundFbo && place.displayName?.text) {
          foundFbo = place.displayName.text;
        }
        if (!foundEmail && place.websiteUri) {
          foundEmail = await scrapeEmail(place.websiteUri);
        }
        if (foundPhone && foundEmail) break;
      }

      // Small delay between searches
      await new Promise(r => setTimeout(r, 200));
    }

    const updates = {};
    if (foundPhone && !prospect.phone) updates.phone = foundPhone;
    if (foundEmail && !prospect.email) updates.email = foundEmail;
    if (foundFbo && !prospect.fbo_name) updates.fbo_name = foundFbo;

    if (Object.keys(updates).length > 0) {
      await supabase.from('prospects').update(updates).eq('id', prospect.id);
      results.enriched++;
    } else {
      results.skipped++;
    }
  }

  return Response.json({ results });
}
