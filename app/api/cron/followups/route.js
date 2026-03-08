import { createClient } from '@supabase/supabase-js';
import { sendFollowup3DaySms, sendFollowup7DaySms } from '@/lib/sms';
import { hasPremiumAccess } from '@/lib/pricing-tiers';

export async function POST(request) {
  // Verify CRON_SECRET from Authorization header
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (token !== process.env.CRON_SECRET) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const now = new Date();
  const nowISO = now.toISOString();

  const { data: followups, error } = await supabase
    .from('scheduled_followups')
    .select('*')
    .lte('scheduled_for', nowISO)
    .is('sent_at', null)
    .is('cancelled_at', null);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  let processed = 0;

  for (const followup of followups || []) {
    try {
      // Fetch quote
      const { data: quote, error: quoteErr } = await supabase
        .from('quotes')
        .select('*')
        .eq('id', followup.quote_id)
        .single();
      if (quoteErr || !quote) {
        continue;
      }
      // Fetch detailer
      const { data: detailer, error: detailerErr } = await supabase
        .from('detailers')
        .select('*')
        .eq('id', quote.detailer_id)
        .single();
      if (detailerErr || !detailer) {
        continue;
      }
      // Cancel if quote accepted or expired
      if (quote.status === 'accepted' || quote.status === 'expired') {
        await supabase.from('scheduled_followups').update({ cancelled_at: nowISO, cancel_reason: quote.status }).eq('id', followup.id);
        continue;
      }
      // SMS temporarily disabled pending 10DLC approval
      await supabase.from('scheduled_followups').update({ cancelled_at: nowISO, cancel_reason: 'sms_disabled_10dlc' }).eq('id', followup.id);
      skipped++;
    } catch (err) {
      // continue on error
    }
  }
  return new Response(JSON.stringify({ processed }), { status: 200 });
}
