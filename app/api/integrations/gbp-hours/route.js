import { getAuthUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

export async function POST(request) {
  const user = await getAuthUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { url } = await request.json();
  if (!url) return Response.json({ error: 'URL required' }, { status: 400 });

  try {
    // Fetch the Google Business Profile page
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
    });

    if (!res.ok) {
      return Response.json({ error: `Failed to fetch page: ${res.status}` }, { status: 400 });
    }

    const html = await res.text();

    // Try to find structured data (JSON-LD) first
    const hours = parseStructuredData(html) || parseHtmlHours(html);

    if (!hours) {
      return Response.json({
        error: 'Could not find business hours on this page. Try pasting the direct Google Maps link for your business.',
      }, { status: 400 });
    }

    return Response.json({ hours });
  } catch (err) {
    return Response.json({ error: 'Failed to import: ' + err.message }, { status: 500 });
  }
}

function parseStructuredData(html) {
  // Look for JSON-LD with openingHoursSpecification
  const ldMatches = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi);
  if (!ldMatches) return null;

  for (const match of ldMatches) {
    const jsonStr = match.replace(/<script[^>]*>/, '').replace(/<\/script>/, '');
    try {
      const data = JSON.parse(jsonStr);
      const specs = data.openingHoursSpecification || data['@graph']?.[0]?.openingHoursSpecification;
      if (specs && Array.isArray(specs)) {
        return specsToSchedule(specs);
      }
    } catch {}
  }
  return null;
}

function specsToSchedule(specs) {
  const schedule = { '0': null, '1': null, '2': null, '3': null, '4': null, '5': null, '6': null };

  for (const spec of specs) {
    const days = Array.isArray(spec.dayOfWeek) ? spec.dayOfWeek : [spec.dayOfWeek];
    const opens = spec.opens || '08:00';
    const closes = spec.closes || '17:00';

    for (const day of days) {
      const dayLower = (day || '').toLowerCase().replace('http://schema.org/', '').replace('https://schema.org/', '');
      const idx = DAY_NAMES.indexOf(dayLower);
      if (idx !== -1) {
        schedule[String(idx)] = { start: opens.slice(0, 5), end: closes.slice(0, 5) };
      }
    }
  }

  return schedule;
}

function parseHtmlHours(html) {
  // Fallback: look for common patterns like "Monday 8:00 AM – 5:00 PM"
  const schedule = { '0': null, '1': null, '2': null, '3': null, '4': null, '5': null, '6': null };
  let found = false;

  for (let i = 0; i < DAY_NAMES.length; i++) {
    const dayName = DAY_NAMES[i];
    const capitalDay = dayName.charAt(0).toUpperCase() + dayName.slice(1);

    // Match patterns like "Monday 8:00 AM – 5:00 PM" or "Monday: 8AM-5PM"
    const patterns = [
      new RegExp(`${capitalDay}[:\\s]+?(\\d{1,2}):?(\\d{2})?\\s*(AM|PM)?\\s*[–\\-to]+\\s*(\\d{1,2}):?(\\d{2})?\\s*(AM|PM)`, 'i'),
      new RegExp(`${capitalDay}[:\\s]+?Closed`, 'i'),
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match) {
        if (match[0].toLowerCase().includes('closed')) {
          schedule[String(i)] = null;
        } else {
          const startH = parseInt(match[1]);
          const startM = match[2] || '00';
          const startAP = (match[3] || 'AM').toUpperCase();
          const endH = parseInt(match[4]);
          const endM = match[5] || '00';
          const endAP = (match[6] || 'PM').toUpperCase();

          const start24 = to24(startH, startM, startAP);
          const end24 = to24(endH, endM, endAP);
          schedule[String(i)] = { start: start24, end: end24 };
        }
        found = true;
        break;
      }
    }
  }

  return found ? schedule : null;
}

function to24(h, m, ap) {
  let hour = h;
  if (ap === 'PM' && hour !== 12) hour += 12;
  if (ap === 'AM' && hour === 12) hour = 0;
  return `${String(hour).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
