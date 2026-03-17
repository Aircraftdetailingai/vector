import { createClient } from '@supabase/supabase-js';
import { getAuthUser } from '@/lib/auth';
import { rgbToHex, generatePalettes } from '@/lib/color-utils';

export const dynamic = 'force-dynamic';

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
  );
}

function swatchToRgb(swatch) {
  if (swatch._r !== undefined) return [swatch._r, swatch._g, swatch._b];
  if (Array.isArray(swatch)) return swatch;
  return [swatch.r, swatch.g, swatch.b];
}

export async function POST(request) {
  try {
    const user = await getAuthUser(request);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { logo_url } = await request.json();
    if (!logo_url) return Response.json({ error: 'logo_url required' }, { status: 400 });

    const imgRes = await fetch(logo_url);
    if (!imgRes.ok) return Response.json({ error: 'Failed to fetch image' }, { status: 400 });

    const buffer = Buffer.from(await imgRes.arrayBuffer());

    const { getPalette } = await import('colorthief');
    const palette = await getPalette(buffer, 5);
    console.log('[extract-colors] palette count:', palette.length);

    const rgbPalette = palette.map(swatchToRgb);
    const rawColors = rgbPalette.map(([r, g, b]) => rgbToHex(r, g, b));
    console.log('[extract-colors] rawColors:', rawColors);

    // Pick best primary: filter out very dark/light, take most prominent
    const filtered = rgbPalette.filter(([r, g, b]) => {
      const l = (r + g + b) / 3;
      return l > 30 && l < 230;
    });
    const bestRgb = (filtered.length > 0 ? filtered : rgbPalette)[0];
    const primaryHex = rgbToHex(bestRgb[0], bestRgb[1], bestRgb[2]);

    // Generate 3 palette options from the primary color
    const palettes = generatePalettes(primaryHex);

    // Save raw colors to DB
    try {
      const supabase = getSupabase();
      await supabase
        .from('detailers')
        .update({ theme_colors: rawColors })
        .eq('id', user.id);
    } catch (e) {
      console.log('Failed to save theme_colors:', e.message);
    }

    return Response.json({ palettes, rawColors });
  } catch (err) {
    console.error('[extract-colors] error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
