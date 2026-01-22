import { createClient } from '@supabase/supabase-js';

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
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

  const { data: quotes, error } = await supabase
    .from('quotes')
    .select('*')
    .gte('valid_until', nowISO)
    .lte('valid_until', in24h)
    .in('status', ['sent', 'viewed'])
    .is('expiration_warning_sent', null);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  let processed = 0;

  for (const quote of quotes || []) {
    try {
      const { data: detailer, error: detailerErr } = await supabase
        .from('detailers')
        .select('*')
        .eq('id', quote.detailer_id)
        .single();
      if (detailerErr || !detailer) {
        continue;
      }
      const settings = detailer.notification_settings || {};
      const plan = detailer.plan || 'starter';
      const quoteViewed = quote.status === 'viewed';
      // SMS to detailer if plan is pro or business and smsQuoteExpiring enabled
      if ((plan === 'pro' || plan === 'business') && settings.smsQuoteExpiring) {
        if (detailer.phone) {
          try {
            const accountSid = process.env.TWILIO_ACCOUNT_SID;
            const authToken = process.env.TWILIO_AUTH_TOKEN;
            const fromNumber = process.env.TWILIO_FROM_NUMBER;
            if (accountSid && authToken && fromNumber) {
              const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
              const basicAuth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
              const statusText = quoteViewed ? 'viewed' : 'not viewed';
              const body = `\u23F0 Quote for ${quote.client_name || ''}'s ${quote.aircraft_type || ''} expires in 24hrs. Status: ${statusText}`;
              await fetch(twilioUrl, {
                method: 'POST',
                headers: {
                  'Authorization': `Basic ${basicAuth}`,
                  'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: new URLSearchParams({
                  From: fromNumber,
                  To: detailer.phone,
                  Body: body
                }).toString()
              });
            }
          } catch (err) {
            // ignore sms errors
          }
        }
      }
      // SMS to client if plan is business and smsClientExpiration enabled
      if (plan === 'business' && settings.smsClientExpiration && quote.client_phone) {
        try {
          const accountSid = process.env.TWILIO_ACCOUNT_SID;
          const authToken = process.env.TWILIO_AUTH_TOKEN;
          const fromNumber = process.env.TWILIO_FROM_NUMBER;
          if (accountSid && authToken && fromNumber) {
            const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
            const basicAuth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
            const link = `https://app.aircraftdetailing.ai/q/${quote.share_link}`;
            const body = `Hi ${quote.client_name || ''}, your quote for the ${quote.aircraft_type || ''} expires tomorrow. ${link}`;
            await fetch(twilioUrl, {
              method: 'POST',
              headers: {
                'Authorization': `Basic ${basicAuth}`,
                'Content-Type': 'application/x-www-form-urlencoded'
              },
              body: new URLSearchParams({
                From: fromNumber,
                To: quote.client_phone,
                Body: body
              }).toString()
            });
          }
        } catch (err) {
          // ignore sms errors
        }
      }
      await supabase.from('quotes').update({ expiration_warning_sent: nowISO }).eq('id', quote.id);
      processed++;
    } catch (err) {
      // ignore errors
    }
  }
  return new Response(JSON.stringify({ processed }), { status: 200 });
}
