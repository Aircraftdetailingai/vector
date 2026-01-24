import { createClient } from '@supabase/supabase-js';
import { notifyQuoteViewed } from '@/lib/push';

function getSupabase() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY);
}

export async function GET(request, { params }) {
  const supabase = getSupabase();
  const { shareLink } = params;
  // fetch quote by share link
  const { data: quote, error } = await supabase
    .from('quotes')
    .select('*')
    .eq('share_link', shareLink)
    .single();
  if (error || !quote) {
    return new Response(JSON.stringify({ error: 'Quote not found' }), { status: 404 });
  }

  // fetch detailer info including FCM token for push notifications and display preference
  const { data: detailer } = await supabase
    .from('detailers')
    .select('id, name, email, phone, company, stripe_account_id, fcm_token, quote_display_preference')
    .eq('id', quote.detailer_id)
    .single();

  // capture viewer info and update as viewed (only if not already paid)
  if (quote.status !== 'paid' && quote.status !== 'approved') {
    const isFirstView = quote.status === 'sent';
    const viewerIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null;
    const viewerDevice = request.headers.get('user-agent') || null;
    await supabase
      .from('quotes')
      .update({
        status: 'viewed',
        viewed_at: new Date().toISOString(),
        viewer_ip: viewerIp,
        viewer_device: viewerDevice
      })
      .eq('id', quote.id);

    // Send push notification on first view
    if (isFirstView && detailer?.fcm_token) {
      notifyQuoteViewed({ fcmToken: detailer.fcm_token, quote }).catch(console.error);
    }
  }

  // Remove sensitive data from response
  const { fcm_token, ...detailerPublic } = detailer || {};
  return new Response(JSON.stringify({ quote, detailer: detailerPublic }), { status: 200 });
}
