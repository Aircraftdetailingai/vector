import { createClient } from '@supabase/supabase-js';
import { getAuthUser } from '@/lib/auth';

function getSupabase() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
}

export async function POST(request, { params }) {
  const supabase = getSupabase();
  const user = await getAuthUser(request);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }
  const { id } = params;
  const { clientName, clientPhone, clientEmail } = await request.json();
  const { data: quote, error: qErr } = await supabase.from('quotes').select('*').eq('id', id).single();
  if (qErr || !quote) {
    return new Response(JSON.stringify({ error: 'Quote not found' }), { status: 404 });
  }
  if (quote.detailer_id !== user.id) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
  }
  const now = new Date().toISOString();
  const { data: updated, error: updErr } = await supabase
    .from('quotes')
    .update({
      client_name: clientName,
      client_phone: clientPhone,
      client_email: clientEmail,
      status: 'sent',
      sent_at: now
    })
    .eq('id', id)
    .select()
    .single();
  if (updErr) {
    return new Response(JSON.stringify({ error: updErr.message }), { status: 500 });
  }
  const { data: detailer } = await supabase.from('detailers').select('plan, notification_settings').eq('id', user.id).single();
  const quoteLink = `${process.env.NEXT_PUBLIC_APP_URL || ''}/q/${quote.share_link}`;
  let smsSent = false;
  if (detailer && detailer.plan === 'business' && clientPhone) {
    try {
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      const fromNumber = process.env.TWILIO_FROM_NUMBER;
      const bodyParams = new URLSearchParams({
        From: fromNumber || '',
        To: clientPhone,
        Body: `Your quote is ready: ${quoteLink}`
      }).toString();
      await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`)
        },
        body: bodyParams
      });
      smsSent = true;
      const followups = [];
      const threeDay = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
      followups.push({ quote_id: id, client_phone: clientPhone, followup_type: '3day', scheduled_for: threeDay });
      const settings = (detailer.notification_settings || {});
      if (!('disable7day' in settings) || settings.disable7day !== true) {
        const sevenDay = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
        followups.push({ quote_id: id, client_phone: clientPhone, followup_type: '7day', scheduled_for: sevenDay });
      }
      await supabase.from('scheduled_followups').insert(followups);
    } catch (e) {
      // ignore SMS errors
    }
  }
  if (clientEmail) {
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'no-reply@aircraftdetailing.ai',
          to: clientEmail,
          subject: 'Your quote is ready',
          text: `Hello${clientName ? ' ' + clientName : ''},\nPlease view your quote at: ${quoteLink}`
        })
      });
    } catch (e) {
      // ignore email errors
    }
  }
  return new Response(JSON.stringify({ success: true, quoteLink, smsSent }), { status: 200 });
}
