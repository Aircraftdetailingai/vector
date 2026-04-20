import { createClient } from '@supabase/supabase-js';
import { getAuthUser } from '@/lib/auth';
import { getAvailableModes, detectKeyMode, getStripeKey } from '@/lib/stripe';

export const dynamic = 'force-dynamic';

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
  );
}

// GET - Get current stripe mode
export async function GET(request) {
  const user = await getAuthUser(request);
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabase();
  const { data: detailer } = await supabase
    .from('detailers')
    .select('stripe_mode')
    .eq('id', user.id)
    .single();

  const modes = getAvailableModes();
  const currentMode = detailer?.stripe_mode || 'test';

  // Detect what the active key actually is
  const activeKey = getStripeKey(currentMode);
  const activeKeyMode = detectKeyMode(activeKey);

  return Response.json({
    stripe_mode: currentMode,
    active_key_mode: activeKeyMode,
    available: modes,
  });
}

// POST - Update stripe mode
export async function POST(request) {
  const user = await getAuthUser(request);
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { stripe_mode } = body;

  if (!stripe_mode || !['test', 'live'].includes(stripe_mode)) {
    return Response.json({ error: 'Invalid mode. Must be "test" or "live".' }, { status: 400 });
  }

  // Verify the key for the requested mode exists
  const key = getStripeKey(stripe_mode);
  if (!key) {
    return Response.json({
      error: `No Stripe key configured for ${stripe_mode} mode`,
    }, { status: 400 });
  }

  const supabase = getSupabase();

  // Fail fast on any error. The previous column-stripping retry would
  // silently drop the stripe_mode field and return { success: true }, which
  // masked real DB errors and made the UI look like it had saved when it
  // hadn't. stripe_mode is a real column (migration-backed) — if the update
  // fails, the caller needs to know.
  const { error } = await supabase
    .from('detailers')
    .update({ stripe_mode })
    .eq('id', user.id);

  if (error) {
    console.error('[user/stripe-mode] Failed to save stripe_mode for detailer', user.id, error.message);
    return Response.json({ error: 'Failed to save Stripe mode', details: error.message }, { status: 500 });
  }

  return Response.json({ success: true, stripe_mode });
}
